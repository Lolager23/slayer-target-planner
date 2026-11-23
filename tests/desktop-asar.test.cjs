const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const asar=require('@electron/asar');
test('package validation uses physical archive stats under Electron without disabling virtual helper reads',async()=>{
 const scratch=path.resolve('.desktop-build/asar-tests');fs.mkdirSync(scratch,{recursive:true});
 const root=fs.mkdtempSync(path.join(scratch,'case-')),install=path.join(root,'Planner'),data=path.join(root,'data'),input=path.join(root,'source');
 for(const p of [path.join(install,'resources'),data,input])fs.mkdirSync(p,{recursive:true});
 const exe=path.join(install,'Slayer Target Planner.exe'),archive=path.join(install,'resources','app.asar');fs.writeFileSync(exe,'fixture executable');
 for(const f of ['updates.cjs','update-feed.cjs','apply-update.ps1'])fs.copyFileSync(path.resolve('desktop',f),path.join(input,f));
 await asar.createPackage(input,archive);
 const virtual={...fs,statSync(file,...args){return file===archive?{isFile:()=>false,isDirectory:()=>true}:fs.statSync(file,...args);}},m={exports:{}};
 vm.runInNewContext(fs.readFileSync('desktop/updates.cjs','utf8'),{module:m,process:{...process,versions:{...process.versions,electron:'fixture'}},__dirname:path.resolve('desktop'),require:n=>n==='node:fs'?virtual:n==='original-fs'?fs:n==='./update-feed.cjs'?require('../desktop/update-feed.cjs'):require(n)});
 assert.equal(m.exports.installLocation(exe,data),install);
 if(process.platform!=='win32')return;
 const script=path.join(root,'verify-electron.cjs');fs.writeFileSync(script,String.raw`
const {app}=require('electron'),assert=require('node:assert/strict'),fs=require('node:fs'),physical=require('original-fs');
const [archive,exe,data]=process.argv.slice(2);app.setPath('userData',data);app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 assert.equal(fs.statSync(archive).isFile(),false);assert.equal(physical.statSync(archive).isFile(),true);
 assert.ok(fs.readFileSync(archive+'/apply-update.ps1','utf8').includes('SLAYER_UPDATE_JOB'));
 const {installLocation,PortableUpdater,launchHelper}=require(archive+'/updates.cjs');assert.equal(installLocation(exe,data),require('node:path').dirname(exe));
 const u=new PortableUpdater({version:'4.0.1',platform:'win32',packaged:true,userData:data,executable:exe,latest:async()=>null});
 await u.initialize();assert.notEqual(u.snapshot().phase,'error',u.snapshot().message);await u.check();assert.equal(u.snapshot().phase,'up-to-date');
 const path=require('node:path'),id='a'.repeat(32),job=path.join(data,'updates',id);fs.mkdirSync(job,{recursive:true});
 const config=path.join(job,'job.json');fs.writeFileSync(config,JSON.stringify({schema:1,id,version:'4.1.1',parentPid:process.pid,restart:false,size:0,sha256:'0'.repeat(64)}));
 await assert.rejects(launchHelper(config),/Invalid update job/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(job,'result.json'),'utf8').replace(/^\uFEFF/,'')).status,'failed');
 console.log('REAL_ELECTRON_ASAR_UPDATE_CHECK_PASSED');app.exit(0);
}).catch(error=>{console.error(error.stack);app.exit(1);});
`);
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const out=spawnSync(path.resolve('node_modules/electron/dist/electron.exe'),[script,archive,exe,data],{env,encoding:'utf8',timeout:20000,windowsHide:true});
 assert.equal(out.status,0,out.stderr||String(out.error));assert.match(out.stdout,/REAL_ELECTRON_ASAR_UPDATE_CHECK_PASSED/);
});
