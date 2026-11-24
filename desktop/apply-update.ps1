$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$jobFile=$env:SLAYER_UPDATE_JOB
$jobRoot=$null;$stage=$null;$backup=$null;$install=$null;$oldMoved=$false;$newMoved=$false;$failedCopy=$null;$stageCreated=$false;$rolledBack=$false
function NormalPath([string]$value){return [IO.Path]::GetFullPath($value).TrimEnd([IO.Path]::DirectorySeparatorChar)}
function AssertNoLinks([string]$value){
 $current=NormalPath $value
 while($current){
  if(Test-Path -LiteralPath $current){if((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Linked update/install paths are not supported.'}}
  $parent=[IO.Path]::GetDirectoryName($current);if($parent -eq $current){break};$current=$parent
 }
}
function Below([string]$root,[string]$value){return (NormalPath $value).StartsWith((NormalPath $root)+'\',[StringComparison]::OrdinalIgnoreCase)}
function FileHash([string]$file){
 $stream=[IO.File]::OpenRead($file);$sha=[Security.Cryptography.SHA256]::Create()
 try{return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose();$sha.Dispose()}
}
function SafeRelative([string]$value){
 if(-not $value -or $value.Contains('\') -or $value.StartsWith('/') -or $value -match '[\x00-\x1f<>:"|?*]'){throw 'Unsafe archive path.'}
 foreach($part in $value.Split('/')){if(-not $part -or $part -in @('.','..') -or $part.EndsWith('.') -or $part.EndsWith(' ') -or $part -match '^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)'){throw 'Unsafe archive filename.'}}
 return $value
}
function RunningInstall{
 if(-not $install){return $false}
 return [bool](Get-Process -Name 'Slayer Target Planner' -ErrorAction SilentlyContinue | Where-Object {$_.Path -and (Below $install $_.Path)})
}
function SaveResult([string]$status,[string]$message){
 if($jobRoot){@{status=$status;message=$message;version=$config.version;backup=$backup} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $jobRoot 'result.json') -Encoding UTF8}
}
try{
 if(-not $jobFile -or [IO.Path]::GetFileName($jobFile) -ne 'job.json'){throw 'Missing update job.'}
 $jobRoot=NormalPath ([IO.Path]::GetDirectoryName($jobFile));AssertNoLinks $jobRoot
 $config=Get-Content -LiteralPath $jobFile -Raw -Encoding UTF8 | ConvertFrom-Json
 if($config.schema -ne 1 -or $config.id -notmatch '^[a-f0-9]{32}$' -or [IO.Path]::GetFileName($jobRoot) -ne $config.id -or $config.version -notmatch '^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$' -or $config.sha256 -notmatch '^[a-f0-9]{64}$' -or $config.size -le 0 -or $config.size -gt 536870912 -or $config.parentPid -le 0 -or $config.restart -isnot [bool]){throw 'Invalid update job.'}
 $data=NormalPath $config.userData;$install=NormalPath $config.installDir;AssertNoLinks $data;AssertNoLinks $install
 if((NormalPath (Join-Path $data ('updates\'+$config.id))) -ne $jobRoot){throw 'Update job is outside application update storage.'}
 $forbidden=@([IO.Path]::GetPathRoot($install).TrimEnd('\'),$env:USERPROFILE,$env:SystemRoot,$env:ProgramFiles,${env:ProgramFiles(x86)},$env:ProgramData,[Environment]::GetFolderPath('DesktopDirectory'),[Environment]::GetFolderPath('MyDocuments'))
 if($forbidden -contains $install -or $install -eq $data -or (Below $data $install) -or (Below $install $data)){throw 'The installation must be a separate application folder.'}
 if(-not(Test-Path -LiteralPath (Join-Path $install 'Slayer Target Planner.exe') -PathType Leaf) -or -not(Test-Path -LiteralPath (Join-Path $install 'resources\app.asar') -PathType Leaf)){throw 'The original portable installation is missing.'}
 $archivePath=Join-Path $jobRoot 'package.zip';AssertNoLinks $archivePath
 if((Get-Item -LiteralPath $archivePath).Length -ne $config.size -or (FileHash $archivePath) -ne $config.sha256){throw 'The staged ZIP failed SHA-256 or size verification.'}
 # Confirm that the bundled helper actually executed before the app closes.
 # Write atomically so the launcher cannot read a partially written acknowledgement.
 $ready=Join-Path $jobRoot 'helper-ready.json';$readyTemporary=$ready+'.tmp'
 AssertNoLinks $ready;AssertNoLinks $readyTemporary
 if((Test-Path -LiteralPath $ready) -or (Test-Path -LiteralPath $readyTemporary)){throw 'Updater startup acknowledgement already exists.'}
 @{schema=1;id=$config.id;version=$config.version;parentPid=$config.parentPid;pid=$PID} | ConvertTo-Json | Set-Content -LiteralPath $readyTemporary -Encoding UTF8
 [IO.File]::Move($readyTemporary,$ready)
 $parent=[IO.Path]::GetDirectoryName($install)
 $stage=NormalPath (Join-Path $parent ('.stp-update-'+$config.id));$backup=NormalPath (Join-Path $parent ('.stp-previous-'+$config.id));$failedCopy=NormalPath (Join-Path $parent ('.stp-failed-'+$config.id))
 foreach($target in @($stage,$backup,$failedCopy)){if([IO.Path]::GetDirectoryName($target) -ne $parent -or $target -eq $install -or (Test-Path -LiteralPath $target)){throw 'Update staging/backup path is not empty.'};AssertNoLinks $target}
 $archive=[IO.Compression.ZipFile]::OpenRead($archivePath)
 try{
  if($archive.Entries.Count -gt 10000){throw 'The update archive has too many entries.'}
  $expectedRoot='Slayer Target Planner '+$config.version+' - Windows';$seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase);$files=@();[long]$expanded=0
  foreach($entry in $archive.Entries){
   $name=$entry.FullName.TrimEnd('/');[void](SafeRelative $name)
   if(-not $seen.Add($name)){throw 'Duplicate archive path.'}
   if($name -ne $expectedRoot -and -not $name.StartsWith($expectedRoot+'/',[StringComparison]::Ordinal)){throw 'The update has an unexpected package folder.'}
   if((($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960 -or ($entry.ExternalAttributes -band 1024)){throw 'Links are not allowed in an update.'}
   if(-not $entry.Name){continue}
   if($name -eq $expectedRoot){throw 'The package root must be a directory.'}
   $relative=$name.Substring($expectedRoot.Length+1);$expanded+=$entry.Length
   if($expanded -gt 2147483648 -or $entry.Length -gt 536870912){throw 'The expanded update is too large.'}
   $target=NormalPath (Join-Path $stage $relative.Replace('/','\'));if(-not(Below $stage $target)){throw 'Archive path escaped staging.'}
   $files+=@{entry=$entry;relative=$relative;target=$target}
  }
  [void](New-Item -ItemType Directory -Path $stage);$stageCreated=$true
  foreach($file in $files){
   [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($file.target))
   $inputStream=$file.entry.Open();$outputStream=[IO.File]::Open($file.target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write)
   try{
    $buffer=New-Object byte[] 65536;[long]$written=0
    while(($read=$inputStream.Read($buffer,0,$buffer.Length)) -gt 0){$written+=$read;if($written -gt $file.entry.Length){throw 'Expanded file exceeds its declared size.'};$outputStream.Write($buffer,0,$read)}
    if($written -ne $file.entry.Length){throw 'Expanded file is truncated.'}
   }finally{$inputStream.Dispose();$outputStream.Dispose()}
  }
 }finally{$archive.Dispose()}
 $manifest=Get-Content -LiteralPath (Join-Path $stage 'resources\update-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
 if($manifest.schema -ne 1 -or $manifest.version -cne $config.version -or $manifest.platform -cne 'win32' -or $manifest.arch -cne 'x64' -or $manifest.repository -cne 'Lolager23/slayer-target-planner'){throw 'The downloaded package has the wrong version or platform.'}
 foreach($required in @('Slayer Target Planner.exe','resources\app.asar','resources\update-manifest.json')){if(-not(Test-Path -LiteralPath (Join-Path $stage $required) -PathType Leaf)){throw 'The downloaded application is incomplete.'}}
 $hashes=@{}
 foreach($line in Get-Content -LiteralPath (Join-Path $stage 'resources\SHA256SUMS.txt') -Encoding UTF8){
  if($line -notmatch '^([a-f0-9]{64})  (.+)$'){throw 'Invalid application checksum manifest.'}
  $sha=$Matches[1];$relative=SafeRelative $Matches[2];if($hashes.ContainsKey($relative)){throw 'Duplicate application checksum.'}
  $target=NormalPath (Join-Path $stage $relative.Replace('/','\'));if(-not(Below $stage $target) -or -not(Test-Path -LiteralPath $target -PathType Leaf) -or (FileHash $target) -ne $sha){throw 'An application file failed checksum verification.'};$hashes[$relative]=$sha
 }
 foreach($file in $files){if($file.relative -ne 'resources/SHA256SUMS.txt' -and -not $hashes.ContainsKey($file.relative)){throw 'An application file is missing from the checksum manifest.'}}
 $deadline=[DateTime]::UtcNow.AddSeconds(120)
 while((Get-Process -Id $config.parentPid -ErrorAction SilentlyContinue) -or (RunningInstall)){
  if([DateTime]::UtcNow -gt $deadline){throw 'The app is still running. The update was not installed.'};Start-Sleep -Milliseconds 250
 }
 AssertNoLinks $install;AssertNoLinks $stage;AssertNoLinks $backup
 Move-Item -LiteralPath $install -Destination $backup;$oldMoved=$true
 Move-Item -LiteralPath $stage -Destination $install;$newMoved=$true
 # Keep sharing files out of the launcher's top-level runtime files.
 $shareName='Slayer Target Planner '+$config.version+' - Windows.zip'
 $shareRoot=Join-Path $install 'share'
 [void][IO.Directory]::CreateDirectory($shareRoot)
 $shareZip=NormalPath (Join-Path $shareRoot $shareName)
 if(-not(Below $install $shareZip) -or (Test-Path -LiteralPath $shareZip)){throw 'Unexpected sharing ZIP destination.'}
 [IO.File]::Copy($archivePath,$shareZip,$false)
 [IO.File]::WriteAllText(($shareZip+'.sha256.txt'),($config.sha256+'  '+$shareName+[Environment]::NewLine))
 if($config.restart){
  # The installer is hidden; the interactive planner must reopen normally.
  $launched=Start-Process -FilePath (Join-Path $install 'Slayer Target Planner.exe') -ArgumentList ('--slayer-updated='+$config.id) -WorkingDirectory $install -WindowStyle Normal -PassThru
  $health=Join-Path $jobRoot 'healthy.json';$deadline=[DateTime]::UtcNow.AddSeconds(45)
  while(-not(Test-Path -LiteralPath $health)){
   if($launched.HasExited){throw 'The updated application exited before startup completed.'}
   if([DateTime]::UtcNow -gt $deadline){throw 'The updated application did not confirm startup; its previous copy was retained.'};Start-Sleep -Milliseconds 250;$launched.Refresh()
  }
  $confirmed=Get-Content -LiteralPath $health -Raw -Encoding UTF8 | ConvertFrom-Json
  if($confirmed.version -cne $config.version){throw 'Updated application startup confirmation has the wrong version.'}
 }
 # Keep the previous complete copy, including any user-added files, outside the
 # Desktop when the storage volume permits the move. Never delete that copy.
 $savedBackup=Join-Path $jobRoot 'previous'
 try{if(-not(Below $jobRoot $savedBackup) -or (Test-Path -LiteralPath $savedBackup)){throw 'Backup storage is not empty.'};AssertNoLinks $savedBackup;Move-Item -LiteralPath $backup -Destination $savedBackup;$backup=$savedBackup}catch{}
 SaveResult 'installed' 'Update installed. The previous application copy is retained for recovery.'
 # Cache cleanup is optional; a locked download must not undo a valid install.
 try{if((NormalPath $archivePath) -eq (NormalPath (Join-Path $jobRoot 'package.zip')) -and (Below $jobRoot $archivePath)){Remove-Item -LiteralPath $archivePath -Force}}catch{}
}catch{
 $reason=$_.Exception.Message
 if($oldMoved -and (Test-Path -LiteralPath $backup) -and -not(RunningInstall)){
  try{
   AssertNoLinks $install;AssertNoLinks $backup
   if($newMoved -and (Test-Path -LiteralPath $install)){if([IO.Path]::GetDirectoryName($failedCopy) -ne [IO.Path]::GetDirectoryName($install) -or (Test-Path -LiteralPath $failedCopy)){throw 'Unsafe rollback destination.'};Move-Item -LiteralPath $install -Destination $failedCopy}
   if(-not(Test-Path -LiteralPath $install)){Move-Item -LiteralPath $backup -Destination $install;$rolledBack=$true;$backup=$null}
  }catch{$reason+=' Rollback needs manual review; both copies were retained.'}
 }
 SaveResult 'failed' $reason
 if($stageCreated -and -not $newMoved -and (Test-Path -LiteralPath $stage)){
  try{if([IO.Path]::GetDirectoryName($stage) -ne [IO.Path]::GetDirectoryName($install) -or [IO.Path]::GetFileName($stage) -cne ('.stp-update-'+$config.id)){throw 'Unsafe staging cleanup.'};AssertNoLinks $stage;if(Get-ChildItem -LiteralPath $stage -Recurse -Force | Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}){throw 'Linked staging contents.'};Remove-Item -LiteralPath $stage -Recurse -Force}catch{}
 }
 if($config.restart -and -not(RunningInstall) -and ($rolledBack -or -not $oldMoved -and (Test-Path -LiteralPath (Join-Path $install 'Slayer Target Planner.exe')))){try{Start-Process -FilePath (Join-Path $install 'Slayer Target Planner.exe') -WorkingDirectory $install -WindowStyle Normal}catch{}}
 exit 1
}
