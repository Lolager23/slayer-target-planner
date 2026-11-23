const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{buildSync}=require('esbuild');
function ui(){const m={exports:{}},code=buildSync({entryPoints:['src/ui/updates.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;new Function('module','exports',code)(m,m.exports);return m.exports;}
const {DesktopUpdates,renderUpdateBanner,renderUpdateSettings}=ui();
const state={phase:'ready',enabled:true,currentVersion:'4.0.0',latestVersion:'4.0.1',progress:100,message:'Verified update ready.',releaseUrl:'https://github.com/Lolager23/slayer-target-planner/releases'};

test('update controls show progress, restart, opt-out, recovery and the installed major version',()=>{
 const settings=renderUpdateSettings(state),ready=renderUpdateBanner(state),progress=renderUpdateBanner({...state,phase:'downloading',progress:42});
 assert.match(settings,/4\.0\.0/);assert.match(settings,/automatic-app-updates/);assert.match(settings,/Check for updates/);assert.match(settings,/previous application copy/);assert.match(ready,/Restart and update/);assert.match(progress,/value="42"/);
 assert.equal(renderUpdateBanner({...state,phase:'up-to-date'}),'');assert.equal(renderUpdateSettings(undefined),'');
 const off=renderUpdateBanner({...state,enabled:false});assert.match(off,/installation on close is off/);assert.doesNotMatch(off,/Or close normally/);
 assert.match(renderUpdateSettings({...state,phase:'error',message:'<untrusted>'}),/&lt;untrusted&gt;/);
});
test('an initial state response cannot overwrite a newer event and update choices are separate from characters',async()=>{
 let callback,resolveInitial,changes=0;const calls=[],bridge={onUpdateState:fn=>{callback=fn;return ()=>{};},updates:(action,value)=>{calls.push([action,value]);return action==='state'?new Promise(resolve=>resolveInitial=resolve):Promise.resolve({...state,enabled:value??true});}};
 const controller=new DesktopUpdates(bridge,()=>changes++);callback({...state,phase:'downloading',progress:42});resolveInitial({...state,phase:'idle'});await Promise.resolve();assert.equal(controller.state.phase,'downloading');assert.equal(controller.state.progress,42);
 await controller.action('enabled',false);assert.equal(controller.state.enabled,false);await controller.action('check');await controller.action('restart');assert.deepEqual(calls.map(c=>c[0]),['state','enabled','check','restart']);assert.ok(changes>=4);
});
function mainHarness(){
 const handlers={},events={},calls=[],window={webContents:{}},updater={snapshot:()=>state,check:async manual=>{calls.push(['check',manual]);return state;},setEnabled:async value=>{calls.push(['enabled',value]);return state;},install:async restart=>{calls.push(['install',restart]);updater.shouldInstallOnQuit=()=>false;},shouldInstallOnQuit:()=>true};
 const electron={app:{setName(){},setAppUserModelId(){},requestSingleInstanceLock:()=>true,on:(key,value)=>events[key]=value,whenReady:()=>({then(){}}),quit:()=>calls.push(['quit'])},BrowserWindow:function(){},dialog:{},shell:{},session:{},ipcMain:{handle:(name,fn)=>handlers[name]=fn}};
 const source=fs.readFileSync('desktop/main.cjs','utf8')+'\nmainWindow=globalThis.testWindow;updater=globalThis.testUpdater;';
 vm.runInNewContext(source,{testWindow:window,testUpdater:updater,__dirname:'/app',require:name=>name==='electron'?electron:name==='./navigation.cjs'?require('../desktop/navigation.cjs'):name.startsWith('./')?{}:require(name)});
 const event={sender:window.webContents,senderFrame:{url:require('node:url').pathToFileURL('/app/web/index.html').href}};return {handlers,events,calls,event,updater};
}
test('native IPC accepts only the packaged main frame and a fixed set of update actions',async()=>{
 const h=mainHarness(),invoke=h.handlers['app-update'];
 for(const event of [{sender:{},senderFrame:h.event.senderFrame},{sender:h.event.sender,senderFrame:{url:'https://evil.invalid'}},{sender:h.event.sender,senderFrame:{url:'file:///app/web/index.html?override=1'}}])await assert.rejects(invoke(event,'restart'),/Unknown request/);
 assert.equal(h.calls.length,0);assert.equal((await invoke(h.event,'state')).currentVersion,'4.0.0');await invoke(h.event,'check');await invoke(h.event,'enabled',false);await assert.rejects(invoke(h.event,'arbitrary-command','C:/anything'),/Unknown update action/);await invoke(h.event,'restart');assert.deepEqual(h.calls,[['check',true],['enabled',false],['install',true],['quit']]);
});
test('normal exit queues the ready helper once and preload excludes Electron IPC event objects',async()=>{
 const h=mainHarness();let prevented=0;h.events['before-quit']({preventDefault:()=>prevented++});await Promise.resolve();assert.equal(prevented,1);assert.deepEqual(h.calls,[['install',false],['quit']]);h.events['before-quit']({preventDefault:()=>prevented++});assert.equal(prevented,1);
 let exposed,listener;const ipcRenderer={invoke:async(...args)=>args,on:(channel,fn)=>{assert.equal(channel,'app-update-state');listener=fn;},removeListener:(channel,fn)=>assert.equal(fn,listener)};
 vm.runInNewContext(fs.readFileSync('desktop/preload.cjs','utf8'),{require:()=>({contextBridge:{exposeInMainWorld:(key,value)=>exposed=value},ipcRenderer})});
 let received;const unsubscribe=exposed.onUpdateState(value=>received=value);listener({privateIpcEvent:true},state);assert.equal(received,state);unsubscribe();assert.equal(Object.isFrozen(exposed),true);
});
test('restart IPC keeps the app open if the installer does not acknowledge startup',async()=>{
 const h=mainHarness();h.updater.install=async()=>{throw Error('Installer did not confirm startup.');};
 await assert.rejects(h.handlers['app-update'](h.event,'restart'),/did not confirm/);assert.equal(h.calls.some(call=>call[0]==='quit'),false);
});
test('the hidden native helper starts outside the application directory without changing execution policy',async()=>{
 const path=require('node:path'),{EventEmitter}=require('node:events');let captured,unreferenced=false;const m={exports:{}};
 const directory=fs.mkdtempSync(path.resolve('.desktop-build/updater-tests/handoff-mock-')),job=path.join(directory,'job.json'),config={id:'a'.repeat(32),version:'4.1.1',parentPid:123};fs.writeFileSync(job,JSON.stringify(config));
 const spawn=(executable,args,options)=>{captured={executable,args,options};const child=new EventEmitter();child.unref=()=>unreferenced=true;child.kill=()=>{};queueMicrotask(()=>{child.emit('spawn');});setTimeout(()=>{fs.writeFileSync(path.join(directory,'helper-process.json'),JSON.stringify({pid:456}));fs.writeFileSync(path.join(directory,'helper-ready.json'),JSON.stringify({schema:1,...config,pid:456}));child.emit('exit',0);},20);return child;};
 vm.runInNewContext(fs.readFileSync('desktop/updates.cjs','utf8'),{module:m,process,Buffer,setTimeout,clearTimeout,setInterval,clearInterval,__dirname:path.resolve('desktop'),require:name=>name==='node:child_process'?{spawn}:name==='./update-feed.cjs'?require('../desktop/update-feed.cjs'):require(name)});
 await m.exports.launchHelper(job);
 assert.equal(captured.options.cwd,path.dirname(job));assert.equal(captured.options.windowsHide,true);assert.notEqual(captured.options.detached,true);assert.equal(captured.options.env.SLAYER_UPDATE_JOB,job);assert.equal(captured.args.includes('-ExecutionPolicy'),false);assert.match(captured.args.at(-1),/Start-Process.*-WindowStyle Hidden/);assert.equal(unreferenced,true);
});
test('a spawned helper without acknowledgement times out instead of allowing the app to close',async()=>{
 const path=require('node:path'),{EventEmitter}=require('node:events'),m={exports:{}};let spawned,killed=false,unreferenced=false;
 const didSpawn=new Promise(resolve=>spawned=resolve),directory=fs.mkdtempSync(path.resolve('.desktop-build/updater-tests/no-handoff-')),job=path.join(directory,'job.json');fs.writeFileSync(job,JSON.stringify({id:'b'.repeat(32),version:'4.1.1',parentPid:123}));
 const spawn=()=>{const child=new EventEmitter();child.kill=()=>killed=true;child.unref=()=>unreferenced=true;queueMicrotask(()=>{child.emit('spawn');spawned();});return child;};
 vm.runInNewContext(fs.readFileSync('desktop/updates.cjs','utf8'),{module:m,process,Buffer,setTimeout:(fn,delay)=>setTimeout(fn,delay===30000?40:delay),clearTimeout,setInterval,clearInterval,__dirname:path.resolve('desktop'),require:name=>name==='node:child_process'?{spawn}:name==='./update-feed.cjs'?require('../desktop/update-feed.cjs'):require(name)});
 const rejected=assert.rejects(m.exports.launchHelper(job),/did not confirm startup within 30 seconds/);
 await didSpawn;assert.equal(unreferenced,false,'spawning alone is not a successful handoff');await rejected;assert.equal(killed,true);assert.equal(unreferenced,true);
});
