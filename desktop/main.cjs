'use strict';

const {app, BrowserWindow, dialog, shell, session, ipcMain} = require('electron');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {allowedExternal, sameDocument} = require('./navigation.cjs');

app.setName('Slayer Target Planner');
app.setAppUserModelId('OwenWelch.SlayerTargetPlanner');
let mainWindow;
let updater;
let normalWindowState=null;
const {compactWindow}=require('./compact.cjs');
ipcMain.handle('compact-mode',(event,enabled,pin)=>{
  const expected=pathToFileURL(path.join(__dirname,'web','index.html')).href;
  if(!mainWindow||event.sender!==mainWindow.webContents||!sameDocument(event.senderFrame.url,expected))throw Error('Unknown request source.');
  normalWindowState=compactWindow(mainWindow,enabled,pin,normalWindowState);
});
const {lookup}=require('./hiscores.cjs');
const {findCharacterExports}=require('./character-exports.cjs');
ipcMain.handle('character-exports',async(event,mode)=>{
  const expected=pathToFileURL(path.join(__dirname,'web','index.html')).href;
  if(!mainWindow||event.sender!==mainWindow.webContents||!sameDocument(event.senderFrame.url,expected))throw Error('Unknown request source.');
  return findCharacterExports({home:app.getPath('home'),chooseFolder:async options=>{
    const selected=await dialog.showOpenDialog(mainWindow,options);
    return selected.canceled?null:selected.filePaths[0];
  }},mode);
});
ipcMain.handle('public-hiscores',async(event,name)=>{
  const expected=pathToFileURL(path.join(__dirname,'web','index.html')).href;
  if(!mainWindow||event.sender!==mainWindow.webContents||!sameDocument(event.senderFrame.url,expected))throw Error('Unknown request source.');
  return lookup(name);
});
ipcMain.handle('app-update',async(event,action,value)=>{
  const expected=pathToFileURL(path.join(__dirname,'web','index.html')).href;
  if(!mainWindow||event.sender!==mainWindow.webContents||!sameDocument(event.senderFrame.url,expected)||!updater)throw Error('Unknown request source.');
  if(action==='state')return updater.snapshot();
  if(action==='check')return updater.check(true);
  if(action==='enabled')return updater.setEnabled(value);
  if(action==='restart'){await updater.install(true);app.quit();return updater.snapshot();}
  throw Error('Unknown update action.');
});

function openSource(url) {
  if (allowedExternal(url)) {
    shell.openExternal(url).catch(() => dialog.showErrorBox('Cannot open link', 'Open this source from your web browser instead.'));
  }
}

function revealWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show(); mainWindow.focus();
  return mainWindow.isVisible() && !mainWindow.isMinimized();
}

function createWindow() {
  const documentPath = path.join(__dirname, 'web', 'index.html');
  const documentUrl = pathToFileURL(documentPath).href;
  mainWindow = new BrowserWindow({
    title: 'Slayer Target Planner', width: 1440, height: 980,
    minWidth: 420, minHeight: 620, backgroundColor: '#0c1512',
    icon: path.join(__dirname, 'assets', 'icon.ico'), show: false,
    autoHideMenuBar: true,
    webPreferences: {preload:path.join(__dirname,'preload.cjs'),nodeIntegration: false, contextIsolation: true, sandbox: true,
      webSecurity: true, devTools: false, spellcheck: false},
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    openSource(url);
    return {action: 'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!sameDocument(url, documentUrl)) {event.preventDefault(); openSource(url);}
  });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.webContents.on('did-fail-load', (_event, code) => {
    if (code !== -3) dialog.showErrorBox('Planner could not load', 'Extract the entire ZIP into a folder, then run Slayer Target Planner.exe from that folder.');
  });
  mainWindow.once('ready-to-show', () => {if (revealWindow()) void updater.healthy(process.argv);});
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadFile(documentPath);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    revealWindow();
  });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    const {PortableUpdater}=require('./updates.cjs');
    updater=new PortableUpdater({version:app.getVersion(),platform:process.platform,packaged:app.isPackaged,userData:app.getPath('userData'),executable:process.execPath,notify:state=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('app-update-state',state);}});
    createWindow();
    void updater.initialize().then(()=>updater.check());
  });
  app.on('before-quit',event=>{
    if(!updater?.shouldInstallOnQuit())return;
    event.preventDefault();updater.install(false).then(()=>app.quit(),()=>app.quit());
  });
  app.on('window-all-closed', () => app.quit());
}
