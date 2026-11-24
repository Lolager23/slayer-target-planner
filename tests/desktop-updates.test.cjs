const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const feed=require('../desktop/update-feed.cjs'),{PortableUpdater,installLocation,launchHelper}=require('../desktop/updates.cjs');
const scratch=path.resolve('.desktop-build/updater-tests');fs.mkdirSync(scratch,{recursive:true});
function fixture(){const root=fs.mkdtempSync(path.join(scratch,'case-')),install=path.join(root,'Planner'),data=path.join(root,'character-data');fs.mkdirSync(path.join(install,'resources'),{recursive:true});fs.mkdirSync(data);fs.writeFileSync(path.join(install,'Slayer Target Planner.exe'),'old-exe');fs.writeFileSync(path.join(install,'resources','app.asar'),'old-app');fs.writeFileSync(path.join(install,'my-notes.txt'),'keep this');fs.writeFileSync(path.join(data,'character-backup.json'),'private fixture facts');return {root,install,data,executable:path.join(install,'Slayer Target Planner.exe')};}
function release(version='4.0.1',body=Buffer.from('synthetic ZIP')){return {draft:false,prerelease:false,tag_name:'v'+version,assets:[{state:'uploaded',name:'Slayer.Target.Planner.'+version+'.-.Windows.zip',browser_download_url:'https://github.com/Lolager23/slayer-target-planner/releases/download/v'+version+'/Slayer.Target.Planner.'+version+'.-.Windows.zip',digest:'sha256:'+crypto.createHash('sha256').update(body).digest('hex'),size:body.length}]};}
const choice=()=>feed.selectRelease(release(),'4.0.0');
function updater(f,extra={}){const events=[];return {events,app:new PortableUpdater({version:'4.0.0',platform:'win32',packaged:true,userData:f.data,executable:f.executable,notify:s=>events.push(s),latest:async()=>choice(),download:async(r,file,progress)=>{await fsp.writeFile(file,'synthetic ZIP');progress(30);progress(100);},launch:async()=>{},...extra})};}

test('release selection orders semantic versions and ignores older, equal, draft and prerelease builds',()=>{
 assert.equal(feed.newer('4.0.0','3.99.99'),true);assert.equal(feed.newer('4.0.10','4.0.9'),true);assert.equal(feed.newer('4.0.0','4.0.0'),false);
 for(const value of ['4.0.0-beta','v04.0.0','4.1','v4.0.0/evil','4.0.0.1','9999999.0.0'])assert.throws(()=>feed.version(value));
 assert.equal(feed.selectRelease(release('3.0.27'),'4.0.0'),null);assert.equal(feed.selectRelease({...release(),draft:true},'4.0.0'),null);assert.equal(feed.selectRelease({...release(),prerelease:true},'4.0.0'),null);assert.equal(choice().version,'4.0.1');
});
test('automatic updates require one exact Windows archive, official repository address, digest and bounded size',()=>{
 for(const mutate of [r=>r.assets=[],r=>r.assets.push({...r.assets[0]}),r=>r.assets[0].digest=null,r=>r.assets[0].size=feed.MAX_ARCHIVE+1,r=>r.assets[0].browser_download_url=r.assets[0].browser_download_url.replace('Lolager23/','someone/'),r=>r.assets[0].browser_download_url=r.assets[0].browser_download_url.replace('https:','http:')]){const r=release();mutate(r);assert.throws(()=>feed.selectRelease(r,'4.0.0'));}
 for(const url of ['https://github.com.evil.invalid/file','https://user:secret@github.com/file','https://release-assets.githubusercontent.com:444/file','file:///C:/file','https://api.github.com/user','https://github.com/Lolager23/other/releases/download/v4.0.1/a.zip'])assert.throws(()=>feed.trustedUrl(url));
});
test('feed checks use the public fixed endpoint, cap response size and handle offline/rate-limit/no-release responses',async()=>{
 let seen;const found=await feed.latest('4.0.0',async(url,options)=>{seen={url,options};return new Response(JSON.stringify(release()));});assert.equal(found.version,'4.0.1');assert.equal(seen.url,feed.FEED);assert.equal(seen.options.credentials,'omit');assert.equal(seen.options.headers.Authorization,undefined);
 assert.equal(await feed.latest('4.0.0',async()=>new Response('',{status:404})),null);
 await assert.rejects(feed.latest('4.0.0',async()=>new Response('',{status:403})),/HTTP 403/);
 await assert.rejects(feed.latest('4.0.0',async()=>new Response('x'.repeat(2*1024*1024+1))),/too large/);
 await assert.rejects(feed.latest('4.0.0',async()=>{throw Error('offline fixture');}),/offline/);
});
test('downloads follow only trusted redirects, verify SHA-256/size and discard a failed partial file',async()=>{
 const f=fixture(),file=path.join(f.root,'download.zip'),body=Buffer.from('synthetic ZIP'),r=choice(),progress=[];let calls=0;
 await feed.download(r,file,n=>progress.push(n),async()=>++calls===1?new Response('',{status:302,headers:{location:'https://release-assets.githubusercontent.com/fixture'}}):new Response(body));
 assert.deepEqual(fs.readFileSync(file),body);assert.equal(calls,2);assert.equal(progress.at(-1),100);
 const wrong=path.join(f.root,'wrong.zip');await assert.rejects(feed.download({...r,sha256:'0'.repeat(64)},wrong,()=>{},async()=>new Response(body)),/verification/);assert.equal(fs.existsSync(wrong),false);
 await assert.rejects(feed.download(r,wrong,()=>{},async()=>new Response(Buffer.alloc(body.length+1))),/larger/);assert.equal(fs.existsSync(wrong),false);
 await assert.rejects(feed.download(r,wrong,()=>{},async()=>new Response('',{status:302,headers:{location:'https://evil.invalid/update.zip'}})),/trusted/);
 const interrupted=new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1]));controller.error(Error('Synthetic interrupted stream.'));}});
 await assert.rejects(feed.download(r,wrong,()=>{},async()=>new Response(interrupted)),/Synthetic interrupted/);assert.equal(fs.existsSync(wrong),false);
});
test('startup checks run once at a time, stage a verified download and restore it after a new process/session',async()=>{
 const f=fixture();let finish,calls=0;const t=updater(f,{latest:()=>{calls++;return new Promise(resolve=>finish=resolve);}});await t.app.initialize();const a=t.app.check(),b=t.app.check();assert.equal(a,b);assert.equal(calls,1);finish(choice());await a;
 assert.equal(t.app.state.phase,'ready');assert.equal(t.app.shouldInstallOnQuit(),true);assert.ok(t.events.some(s=>s.phase==='downloading'&&s.progress===30));
 const next=updater(f);await next.app.initialize();assert.equal(next.app.state.phase,'ready');assert.equal(next.app.state.latestVersion,'4.0.1');assert.equal(next.events.some(s=>s.phase==='downloading'),false);assert.equal(fs.readFileSync(path.join(f.data,'character-backup.json'),'utf8'),'private fixture facts');
});
test('automatic update choice persists, manual checking still works while off and never auto-installs while off',async()=>{
 const f=fixture(),t=updater(f);await t.app.initialize();await t.app.setEnabled(false);await t.app.check();assert.equal(t.events.some(s=>s.phase==='checking'),false);
 await t.app.check(true);assert.equal(t.app.state.phase,'ready');assert.equal(t.app.shouldInstallOnQuit(),false);assert.match(t.app.state.message,/off/);
 const next=updater(f);await next.app.initialize();assert.equal(next.app.state.enabled,false);assert.equal(next.app.shouldInstallOnQuit(),false);
});
test('install job uses only native-owned paths, waits for app exit, and is queued once with explicit restart preference',async()=>{
 const f=fixture();let file;const t=updater(f,{launch:async value=>{file=value;}});await t.app.initialize();await t.app.check();await t.app.install(true);const job=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(job.installDir,f.install);assert.equal(job.userData,f.data);assert.equal(job.parentPid,process.pid);assert.equal(job.restart,true);assert.equal(job.sha256,choice().sha256);assert.equal(t.app.state.phase,'installing');assert.equal(t.app.shouldInstallOnQuit(),false);await assert.rejects(t.app.install(true),/No verified/);
});
test('development builds do not contact GitHub; errors leave the installed app intact and remain retryable',async()=>{
 const f=fixture(),dev=updater(f,{packaged:false,latest:async()=>{throw Error('must not run');}});await dev.app.initialize();await dev.app.check(true);assert.equal(dev.app.state.phase,'unsupported');
 const t=updater(f,{latest:async()=>{throw Error('offline fixture');}});await t.app.initialize();await t.app.check();assert.equal(t.app.state.phase,'error');assert.equal(fs.readFileSync(f.executable,'utf8'),'old-exe');t.app.options.latest=async()=>null;await t.app.check(true);assert.equal(t.app.state.phase,'up-to-date');
});
test('a failed helper result pauses automatic retry and supports UTF-8 BOM output from Windows PowerShell',async()=>{
 const f=fixture(),t=updater(f);await t.app.initialize();await t.app.check();const job=path.join(f.data,'updates',t.app.pending.id);fs.writeFileSync(path.join(job,'result.json'),'\ufeff'+JSON.stringify({status:'failed',message:'The staged ZIP failed SHA-256 or size verification.'}));
 let calls=0;const next=updater(f,{latest:async()=>{calls++;return null;}});await next.app.initialize();await next.app.check();assert.equal(calls,0);assert.equal(next.app.state.phase,'error');assert.match(next.app.state.message,/staged ZIP failed SHA-256/);await next.app.check(true);assert.equal(calls,1);
});
test('path validation rejects shared character storage, critical roots, wrong executables and linked installs',()=>{
 const f=fixture();assert.equal(installLocation(f.executable,f.data),f.install);assert.throws(()=>installLocation(path.join(f.install,'Other.exe'),f.data));assert.throws(()=>installLocation(f.executable,f.install));
 if(process.platform==='win32'){const link=path.join(f.root,'linked');fs.symlinkSync(f.install,link,'junction');assert.throws(()=>installLocation(path.join(link,'Slayer Target Planner.exe'),f.data),/Linked/);}
});
test('a helper launch failure keeps the old app and a manual check can rearm the verified update',async()=>{
 const f=fixture(),t=updater(f,{launch:async()=>{throw Error('Synthetic missing helper.');}});await t.app.initialize();await t.app.check();
 await assert.rejects(t.app.install(true),/Synthetic missing/);assert.equal(t.app.state.phase,'error');assert.equal(t.app.shouldInstallOnQuit(),false);assert.equal(fs.readFileSync(f.executable,'utf8'),'old-exe');
 await t.app.check(true);assert.equal(t.app.state.phase,'ready');t.app.options.launch=async()=>{};await t.app.install(false);assert.equal(t.app.state.phase,'installing');
});

function applyFixture(scenario){
 const f=fixture(),id=crypto.randomBytes(16).toString('hex'),job=path.join(f.data,'updates',id);fs.mkdirSync(job,{recursive:true});
 const script=String.raw`import sys,json,hashlib
from pathlib import Path
from zipfile import ZipFile,ZipInfo
job=Path(sys.argv[1]);scenario=sys.argv[2];root='Slayer Target Planner 4.0.1 - Windows/'
files={'Slayer Target Planner.exe':b'new-exe','resources/app.asar':b'new-app','resources/update-manifest.json':json.dumps({'schema':1,'version':'4.0.1' if scenario!='wrong-version' else '9.0.0','platform':'win32','arch':'x64','repository':'Lolager23/slayer-target-planner'}).encode()}
sums=''.join(hashlib.sha256(value).hexdigest()+'  '+name+'\n' for name,value in files.items()).encode()
if scenario=='file-corrupt':files['resources/app.asar']=b'bad-app'
files['resources/SHA256SUMS.txt']=sums
with ZipFile(job/'package.zip','w') as z:
 for name,value in files.items():z.writestr(root+name,value)
 if scenario=='traversal':z.writestr(root+'../escape.txt',b'no')
 if scenario=='duplicate':z.writestr(root+'RESOURCES/APP.ASAR',b'no')
 if scenario=='unlisted':z.writestr(root+'extra.exe',b'no')
 if scenario=='symlink':
  entry=ZipInfo(root+'link');entry.create_system=3;entry.external_attr=0o120777<<16;z.writestr(entry,b'outside')
`;
 const created=spawnSync('python',['-c',script,job,scenario],{encoding:'utf8'});assert.equal(created.status,0,created.stderr);
 const archive=fs.readFileSync(path.join(job,'package.zip')),config={schema:1,id,parentPid:2147483647,installDir:f.install,userData:f.data,version:'4.0.1',sha256:crypto.createHash('sha256').update(archive).digest('hex'),size:archive.length,restart:false};if(scenario==='zip-corrupt')config.sha256='0'.repeat(64);
 const file=path.join(job,'job.json');fs.writeFileSync(file,JSON.stringify(config));return {...f,job,file,config};
}
function apply(job,prefix='',interrupt=false){
 let source=fs.readFileSync(path.join(__dirname,'../desktop/apply-update.ps1'),'utf8');
 if(interrupt)source=source.replace('Move-Item -LiteralPath $stage -Destination $install;',"throw 'Synthetic interruption between folder renames.';Move-Item -LiteralPath $stage -Destination $install;");
 const result=spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-Command',prefix+'\n'+source],{env:{...process.env,SLAYER_UPDATE_JOB:job.file},encoding:'utf8',timeout:20000,windowsHide:true});
 const status=JSON.parse(fs.readFileSync(path.join(job.job,'result.json'),'utf8').replace(/^\uFEFF/,''));return {result,status};
}

test('Windows helper installs a complete checksum-verified fixture and retains old app, extra files and character storage',{skip:process.platform!=='win32'},()=>{
 const f=applyFixture('good'),out=apply(f);assert.equal(out.result.status,0,JSON.stringify(out));assert.equal(out.status.status,'installed');assert.equal(fs.readFileSync(path.join(f.install,'resources/app.asar'),'utf8'),'new-app');assert.equal(fs.readFileSync(path.join(f.job,'previous','my-notes.txt'),'utf8'),'keep this');assert.equal(fs.readFileSync(path.join(f.data,'character-backup.json'),'utf8'),'private fixture facts');
 const zip=path.join(f.install,'share','Slayer Target Planner 4.0.1 - Windows.zip');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex'),f.config.sha256);assert.ok(fs.readFileSync(zip+'.sha256.txt','utf8').startsWith(f.config.sha256));assert.equal(fs.existsSync(path.join(f.install,path.basename(zip))),false);
});
test('Windows helper refuses corrupt ZIP/files, wrong version, traversal, duplicates, symlinks and unlisted files before replacing anything',{skip:process.platform!=='win32'},()=>{
 const expected={'zip-corrupt':/SHA-256/,'file-corrupt':/checksum/,'wrong-version':/wrong version/,'traversal':/Unsafe archive/,'duplicate':/Duplicate archive/,'symlink':/Links are not allowed/,'unlisted':/missing from the checksum/};
 for(const scenario of Object.keys(expected)){const f=applyFixture(scenario),out=apply(f);assert.equal(out.result.status,1,scenario+JSON.stringify(out));assert.equal(out.status.status,'failed',scenario);assert.match(out.status.message,expected[scenario],scenario);assert.equal(fs.readFileSync(f.executable,'utf8'),'old-exe',scenario);assert.equal(fs.readFileSync(path.join(f.install,'my-notes.txt'),'utf8'),'keep this');assert.equal(fs.existsSync(path.join(f.root,'escape.txt')),false);}
});
test('Windows helper restores the original folder after an injected interruption between renames',{skip:process.platform!=='win32'},()=>{
 const f=applyFixture('good'),out=apply(f,'',true);assert.equal(out.result.status,1);assert.match(out.status.message,/Synthetic interruption/);assert.equal(fs.readFileSync(f.executable,'utf8'),'old-exe');assert.equal(fs.readFileSync(path.join(f.install,'my-notes.txt'),'utf8'),'keep this');assert.equal(fs.readFileSync(path.join(f.data,'character-backup.json'),'utf8'),'private fixture facts');
});
test('Windows helper rolls back a failed relaunch; process launching is a mocked boundary',{skip:process.platform!=='win32'},()=>{
 const f=applyFixture('good');f.config.restart=true;fs.writeFileSync(f.file,JSON.stringify(f.config));
 const prefix=String.raw`$script:launches=@();function Start-Process {param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle,[switch]$PassThru);$script:launches+=@{style=$WindowStyle;directory=$WorkingDirectory};[IO.File]::WriteAllText((Join-Path $jobRoot 'launches.json'),(ConvertTo-Json $script:launches));if($script:launches.Count -eq 1){throw 'Synthetic relaunch failure.'}}`;
 const out=apply(f,prefix);assert.equal(out.result.status,1);assert.match(out.status.message,/Synthetic relaunch/);assert.equal(fs.readFileSync(f.executable,'utf8'),'old-exe');
 const launches=JSON.parse(fs.readFileSync(path.join(f.job,'launches.json'),'utf8'));assert.equal(launches.length,2);assert.deepEqual(launches.map(l=>l.style),['Normal','Normal']);assert.ok(launches.every(l=>l.directory===f.install));
});
test('Windows helper accepts an acknowledged new version; process launching is a mocked boundary',{skip:process.platform!=='win32'},()=>{
 const f=applyFixture('good');f.config.restart=true;fs.writeFileSync(f.file,JSON.stringify(f.config));
 const out=apply(f,"function Start-Process {param($FilePath,$ArgumentList,$WorkingDirectory,$WindowStyle,[switch]$PassThru);if($WindowStyle -ne 'Normal'){throw 'The interactive planner must launch normally.'};[IO.File]::WriteAllText((Join-Path $jobRoot 'healthy.json'),('{\"version\":\"'+$config.version+'\"}'));return [pscustomobject]@{HasExited=$false}}");
 assert.equal(out.result.status,0,JSON.stringify(out));assert.equal(out.status.status,'installed');assert.equal(fs.readFileSync(f.executable,'utf8'),'new-exe');
});

async function helperResult(f){
 const deadline=Date.now()+15000;
 while(Date.now()<deadline){
  try{return JSON.parse(fs.readFileSync(path.join(f.job,'result.json'),'utf8').replace(/^\uFEFF/,''));}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw Error('The real Windows update helper did not finish the disposable fixture.');
}
test('production Windows launcher receives a fresh helper acknowledgement and completes its isolated install',{skip:process.platform!=='win32'},async()=>{
 const f=applyFixture('good');
 fs.writeFileSync(path.join(f.job,'helper-ready.json'),JSON.stringify({schema:1,id:'stale'}));
 fs.writeFileSync(path.join(f.job,'result.json'),JSON.stringify({status:'failed',message:'stale failure'}));
 fs.writeFileSync(path.join(f.job,'healthy.json'),JSON.stringify({version:'stale'}));
 await launchHelper(f.file);
 const ready=JSON.parse(fs.readFileSync(path.join(f.job,'helper-ready.json'),'utf8').replace(/^\uFEFF/,''));
 assert.equal(ready.id,f.config.id);assert.equal(ready.version,f.config.version);assert.equal(ready.parentPid,f.config.parentPid);assert.ok(ready.pid>0);
 assert.equal(fs.existsSync(path.join(f.job,'healthy.json')),false);
 assert.equal((await helperResult(f)).status,'installed');assert.equal(fs.readFileSync(f.executable,'utf8'),'new-exe');assert.equal(fs.readFileSync(path.join(f.data,'character-backup.json'),'utf8'),'private fixture facts');
});
test('production launcher reports pre-handoff validation failure instead of telling the app to quit',{skip:process.platform!=='win32'},async()=>{
 const f=applyFixture('zip-corrupt');
 await assert.rejects(launchHelper(f.file),/SHA-256 or size verification/);
 assert.equal(fs.existsSync(path.join(f.job,'helper-ready.json')),false);assert.equal(fs.readFileSync(f.executable,'utf8'),'old-exe');
});
test('the acknowledged Windows helper survives its real launcher parent exiting and then installs',{skip:process.platform!=='win32'},async()=>{
 const f=applyFixture('good'),script=String.raw`
const fs=require('node:fs'),{launchHelper}=require(process.argv[1]),file=process.argv[2];
const config=JSON.parse(fs.readFileSync(file,'utf8'));config.parentPid=process.pid;fs.writeFileSync(file,JSON.stringify(config));
launchHelper(file).then(()=>{console.log('HELPER_ACKNOWLEDGED');},error=>{console.error(error);process.exitCode=1;});
`;
 const out=spawnSync(process.execPath,['-e',script,path.resolve('desktop/updates.cjs'),f.file],{encoding:'utf8',timeout:15000,windowsHide:true});
 assert.equal(out.status,0,out.stderr||String(out.error));assert.match(out.stdout,/HELPER_ACKNOWLEDGED/);
 assert.equal((await helperResult(f)).status,'installed');assert.equal(fs.readFileSync(f.executable,'utf8'),'new-exe');assert.equal(fs.readFileSync(path.join(f.data,'character-backup.json'),'utf8'),'private fixture facts');
});
