'use strict';
const fs=require('node:fs');
// Electron's node:fs presents app.asar as a virtual directory. Validate the
// physical archive, while retaining virtual fs reads for our bundled helper.
const physicalFs=process.versions.electron?require('original-fs'):fs;
const fsp=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const os=require('node:os');
const {spawn}=require('node:child_process');
const feed=require('./update-feed.cjs');
const JOB=/^[a-f0-9]{32}$/;
function noLinks(directory){
 let current=path.resolve(directory);
 while(true){if(fs.lstatSync(current).isSymbolicLink())throw Error('Linked update/install paths are not supported.');const parent=path.dirname(current);if(parent===current)break;current=parent;}
 return path.resolve(directory);
}
function installLocation(executable,userData){
 if(path.basename(executable)!=='Slayer Target Planner.exe')throw Error('Run the portable Slayer Target Planner executable to update it.');
 const root=noLinks(path.dirname(executable)),data=noLinks(userData),prefix=path.sep;
 const critical=[path.parse(root).root,os.homedir(),...['Desktop','Documents','Downloads'].map(name=>path.join(os.homedir(),name)),process.env.SystemRoot,process.env.ProgramFiles,process.env.ProgramData].filter(Boolean).map(value=>path.resolve(value).toLowerCase());
 if(critical.includes(root.toLowerCase())||root===data||root.startsWith(data+prefix)||data.startsWith(root+prefix))throw Error('The app folder and character storage must be separate.');
 const archive=path.join(root,'resources','app.asar');
 if(physicalFs.lstatSync(archive).isSymbolicLink())throw Error('Linked application archives are not supported.');
 if(!physicalFs.statSync(archive).isFile())throw Error('The application archive resources/app.asar is missing or incomplete. Keep the complete extracted folder together.');
 return root;
}
async function atomicJson(file,value){const temporary=file+'.'+randomUUID()+'.tmp';await fsp.writeFile(temporary,JSON.stringify(value),{flag:'wx'});await fsp.rename(temporary,file);}
async function launchHelper(configuration){
 const powershell=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const directory=path.dirname(configuration),config=JSON.parse(await fsp.readFile(configuration,'utf8'));
 for(const name of ['helper-ready.json','helper-ready.json.tmp','helper-process.json','helper-process.json.tmp','helper.ps1','result.json','healthy.json']){
  const file=path.join(directory,name);
  try{noLinks(file);if(!fs.lstatSync(file).isFile())throw Error('Invalid updater handoff file.');await fsp.unlink(file);}catch(error){if(error.code!=='ENOENT')throw error;}
 }
 // Fixed bundled code; paths come from a data-only job file, never a command string.
 const script=fs.readFileSync(path.join(__dirname,'apply-update.ps1'),'utf8');
 const helper=path.join(directory,'helper.ps1');await fsp.writeFile(helper,script,{flag:'wx'});
 // A detached PowerShell can exit without executing; an attached one can die
 // with its parent's console. Windows Start-Process gives the helper its own
 // hidden lifetime. The short encoded command reads only our fixed bundled copy.
 const command=Buffer.from('& ([scriptblock]::Create([IO.File]::ReadAllText($env:SLAYER_UPDATE_SCRIPT)))','utf16le').toString('base64');
 const bootstrap="$ErrorActionPreference='Stop';$helper=Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand','"+command+"') -WindowStyle Hidden -PassThru;$file=Join-Path ([IO.Path]::GetDirectoryName($env:SLAYER_UPDATE_JOB)) 'helper-process.json';[IO.File]::WriteAllText(($file+'.tmp'),('{\"pid\":'+$helper.Id+'}'));[IO.File]::Move(($file+'.tmp'),$file)";
 return new Promise((resolve,reject)=>{
  const child=spawn(powershell,['-NoProfile','-NonInteractive','-Command',bootstrap],{cwd:directory,windowsHide:true,stdio:'ignore',env:{...process.env,SLAYER_UPDATE_JOB:configuration,SLAYER_UPDATE_SCRIPT:helper}});
  let settled=false,timer,poll;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);clearInterval(poll);child.unref();error?reject(error):resolve();};
  const inspect=async(exited=false,code)=>{
   try{
    let result;try{result=JSON.parse((await fsp.readFile(path.join(directory,'result.json'),'utf8')).replace(/^\uFEFF/,''));}catch(error){if(error.code!=='ENOENT')throw error;}
    if(result?.status==='failed')throw Error(String(result.message||'The installer failed before startup.').slice(0,300));
    const launched=JSON.parse(await fsp.readFile(path.join(directory,'helper-process.json'),'utf8'));
    const ready=JSON.parse((await fsp.readFile(path.join(directory,'helper-ready.json'),'utf8')).replace(/^\uFEFF/,''));
    if(!Number.isSafeInteger(launched.pid)||launched.pid<1||ready.schema!==1||ready.id!==config.id||ready.version!==config.version||ready.parentPid!==config.parentPid||ready.pid!==launched.pid)throw Error('The installer startup acknowledgement is invalid.');
    finish();
   }catch(error){if(error.code!=='ENOENT')finish(error);else if(exited)finish(Error('The installer exited before confirming startup (exit '+code+'). The app has not been closed.'));}
  };
  child.once('error',finish);child.once('exit',code=>{void inspect(code!==0,code);});
  poll=setInterval(()=>{if(!settled)void inspect();},100);
  timer=setTimeout(()=>{child.kill();finish(Error('The installer did not confirm startup within 30 seconds. The app has not been closed.'));},30000);
 });
}
class PortableUpdater{
 constructor(options){
  this.options=options;this.root=path.join(options.userData,'updates');this.pendingFile=path.join(this.root,'pending.json');this.settingsFile=path.join(this.root,'settings.json');this.pending=null;this.running=null;this.quitHandled=false;this.retryRequired=false;
  this.state={phase:options.platform==='win32'&&options.packaged?'idle':'unsupported',enabled:true,currentVersion:options.version,message:'Updates are available in the packaged Windows application.',releaseUrl:feed.RELEASES};
 }
 publish(change){this.state={...this.state,...change};this.options.notify?.(this.snapshot());}
 snapshot(){return {...this.state};}
 async initialize(){
  if(this.state.phase==='unsupported')return this.snapshot();
  try{
   installLocation(this.options.executable,this.options.userData);await fsp.mkdir(this.root,{recursive:true});noLinks(this.root);
   try{const settings=JSON.parse(await fsp.readFile(this.settingsFile,'utf8'));if(typeof settings.enabled!=='boolean')throw Error('Invalid update preference.');this.state.enabled=settings.enabled;}catch(error){if(error.code!=='ENOENT')throw Error('Could not read the automatic-update preference.');}
   try{
    const pending=JSON.parse(await fsp.readFile(this.pendingFile,'utf8'));
    if(!JOB.test(pending.id)||!/^\d+\.\d+\.\d+$/.test(pending.release?.version)||!Number.isSafeInteger(pending.release?.size)||pending.release.size<1||pending.release.size>feed.MAX_ARCHIVE||!(/^[a-f0-9]{64}$/).test(pending.release?.sha256))throw Error('Invalid staged update record.');
    if(feed.newer(pending.release.version,this.options.version)){
     const job=path.join(this.root,pending.id);noLinks(job);const archive=path.join(job,'package.zip');
     try{const previous=JSON.parse((await fsp.readFile(path.join(job,'result.json'),'utf8')).replace(/^\uFEFF/,''));if(previous.status==='failed'){this.retryRequired=true;this.publish({phase:'error',message:'The previous update did not complete. '+String(previous.message||'The installer reported a failure.').slice(0,240)+' Your previous copy was retained. Check for updates to retry, or open GitHub releases.'});return this.snapshot();}}catch(error){if(error.code!=='ENOENT')throw error;}
     if(!fs.lstatSync(archive).isFile()||fs.lstatSync(archive).isSymbolicLink())throw Error('The staged update archive is missing.');
     this.pending=pending;this.publish({phase:'ready',latestVersion:pending.release.version,progress:100,message:this.state.enabled?'Update ready. Install when closing, or restart and update now.':'Update ready. Restart and update to install; automatic installation on close is off.'});
    }else await fsp.unlink(this.pendingFile);
   }catch(error){if(error.code!=='ENOENT')throw Error('The staged update could not be restored. Check for updates again.');}
   if(!this.pending)this.publish({phase:this.state.enabled?'idle':'disabled',message:this.state.enabled?'Checks GitHub for a newer stable release at startup.':'Automatic startup updates are off.'});
  }catch(error){this.publish({phase:'error',message:error.message});}
  return this.snapshot();
 }
 async setEnabled(enabled){
  if(typeof enabled!=='boolean')throw Error('Invalid automatic-update preference.');
  if(this.state.phase==='unsupported')return this.snapshot();
  await atomicJson(this.settingsFile,{enabled});this.publish({enabled});
  if(this.pending)this.publish({message:enabled?'Update ready. Install when closing, or restart and update now.':'Update ready. Restart and update to install; automatic installation on close is off.'});
  if(!enabled){this.abort?.abort();if(!this.pending)this.publish({phase:'disabled',message:'Automatic startup updates are off.'});}
  else if(!this.pending)void this.check();
  return this.snapshot();
 }
 check(manual=false){
  if(this.running)return this.running;
  if(manual&&this.pending&&this.state.phase==='error'){this.quitHandled=false;this.publish({phase:'ready',message:'The verified update is ready to retry. Restart and update, or open GitHub releases.'});}
  if(this.state.phase==='unsupported'||this.pending||!manual&&(!this.state.enabled||this.retryRequired))return Promise.resolve(this.snapshot());
  this.retryRequired=false;
  this.running=this.performCheck().finally(()=>{this.running=null;});return this.running;
 }
 async performCheck(){
  this.abort=new AbortController();this.publish({phase:'checking',progress:0,message:'Checking the latest stable GitHub release…'});
  try{
   installLocation(this.options.executable,this.options.userData);
   const release=await (this.options.latest||feed.latest)(this.options.version,this.options.fetcher,this.abort.signal);
   if(this.abort.signal.aborted)throw Error('Update check cancelled.');
   if(!release){this.publish({phase:'up-to-date',message:'This version is up to date.'});return this.snapshot();}
   const install=installLocation(this.options.executable,this.options.userData),probe=path.join(path.dirname(install),'.stp-permission-'+randomUUID());
   try{const handle=await fsp.open(probe,'wx');await handle.close();await fsp.unlink(probe);}catch{throw Error('The application parent folder is not writable. Move the complete portable app to a writable folder, then check again.');}
   const partial=path.join(this.root,'download.part');
   if(fs.existsSync(partial)){noLinks(partial);if(!fs.lstatSync(partial).isFile())throw Error('The update download cache is not an ordinary file.');await fsp.unlink(partial);}
   this.publish({phase:'downloading',latestVersion:release.version,releaseUrl:release.releaseUrl,message:'Downloading and verifying '+release.version+'…'});
   let previous=-1;await (this.options.download||feed.download)(release,partial,percent=>{if(percent!==previous){previous=percent;this.publish({progress:percent});}},this.options.fetcher,this.abort.signal);
   const id=randomUUID().replaceAll('-',''),job=path.join(this.root,id);await fsp.mkdir(job);noLinks(job);await fsp.rename(partial,path.join(job,'package.zip'));
   this.pending={id,release};await atomicJson(this.pendingFile,this.pending);
   this.publish({phase:'ready',progress:100,message:this.state.enabled?'Update verified. It will install when you close the app. You can also restart and update now.':'Update verified. Restart and update to install; automatic installation on close is off.'});
  }catch(error){this.publish({phase:!this.state.enabled&&this.abort.signal.aborted?'disabled':'error',message:!this.state.enabled&&this.abort.signal.aborted?'Automatic updates are off.':String(error.message||'Update check failed.').slice(0,300)});}
  return this.snapshot();
 }
 shouldInstallOnQuit(){return !!this.pending&&this.state.enabled&&!this.quitHandled&&this.state.phase==='ready';}
 async healthy(args){
  const id=args.find(value=>/^--slayer-updated=[a-f0-9]{32}$/.test(value))?.split('=')[1];if(!id)return;
  try{const job=path.join(this.root,id);noLinks(job);const config=JSON.parse(await fsp.readFile(path.join(job,'job.json'),'utf8'));if(config.version===this.options.version&&path.resolve(config.installDir)===path.dirname(this.options.executable))await atomicJson(path.join(job,'healthy.json'),{version:this.options.version});}catch{/* The helper retains its rollback copy if startup cannot be confirmed. */}
 }
 async install(restart){
  if(!this.pending||this.state.phase!=='ready'||this.quitHandled)throw Error('No verified update is ready to install.');
  this.quitHandled=true;
  this.publish({phase:'installing',message:'Preparing to close and install the verified update…'});
  try{
   const installDir=installLocation(this.options.executable,this.options.userData),job=path.join(this.root,this.pending.id);noLinks(job);
   const configuration=path.join(job,'job.json');
   await atomicJson(configuration,{schema:1,id:this.pending.id,parentPid:process.pid,installDir,userData:this.options.userData,version:this.pending.release.version,sha256:this.pending.release.sha256,size:this.pending.release.size,restart:restart===true});
   await (this.options.launch||launchHelper)(configuration);
   this.publish({phase:'installing',message:'Closing the app to install the verified update…'});return true;
  }catch(error){this.publish({phase:'error',message:'Could not start the updater. The installed app was kept. '+error.message});throw error;}
 }
}
module.exports={PortableUpdater,installLocation,noLinks,launchHelper};
