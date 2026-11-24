import {renderHuntPicker,openHuntPicker,setHuntCreature} from './hunt-picker';
import {version as APP_VERSION} from '../../package.json';
import {DesktopUpdates,renderUpdateBanner,renderUpdateSettings,type UpdateBridge} from './updates';
import {CalculationWorker} from './calculation-worker';
import {calculationCache} from '../state/calculation-cache';
import {setTeleport,TELEPORTS,teleportState,travelIdentity} from '../state/travel';
import {requestCharacterDeletion} from './character-delete';
import {persistCharacterRemoval} from '../state/character-removal';
import {enhanceSelectionSurfaces,installSelectionSurfaces} from './selection-surfaces';
import {selectCreatureGear,resetCreatureGear,gearAffectedMasters,type GearSelection} from '../combat/gear-selection';
import type {CombatResult} from '../combat/types';
import type {Family} from '../guide/types';
import {MethodPreview} from './method-preview';
import {renderMethodCombatStatus} from './method-combat';
import {renderSimulationTotals,exampleWorkloadText} from './simulation-totals';
import {locationPoolKeys,locationAccess,setLocationAccess,clearLocationAccess} from '../rules/location-pool';
import {renderExtensionRewards} from './extension-rewards';
import {ActionNotice,focusCorrection,type NoticeLevel} from './action-notice';
import {captureAction,feedbackFix,type ActionOrigin,type FeedbackFix} from './action-feedback';
import {renderKonarLocations} from './konar-locations';
import {groupExportFolders} from '../state/export-folders';
import type {ExportDiscoveryView} from './export-discovery';
import {renderCharacterSetup,requestCharacter,requestFirstLaunch} from './character-setup';
import {renderFirstHunt} from './first-hunt';
import {newCharacter,acceptSetupDefaults} from '../state/onboarding';
import {parseAccountExports,applyAccountExports,type AccountExportPreview} from '../state/account-exports';
import {practiceCharacter,practicePlans,applyPracticeHunt} from '../state/first-hunt';
import {factCard,rewardCards} from './fact-cards';
import {resetAccessChecklist,visibleQuestNames,visibleFactKeys,renderSpecialAccess} from './account-import';
import {resolveAccess} from '../rules/access';
import {GUIDE_KEY,GUIDE} from '../guide';
import type {GuideCombat} from '../combat/guide';
import {GearInspector} from './gear-inspector';
import {CombatCacheStore,combatIdentity} from '../combat/cache';
import type {GuideState} from '../guide/types';
import {renderBank,type BankView} from './bank';
import {loadDisplay,saveDisplay,applyDisplay,renderSettings,type DisplaySettings} from './settings';
import {emptyBank,defaultCombat,ownedQuantities,applyBankSnapshots,parseBankImport,parseCharacterLevels,type BankPreview} from '../state/bank';
import type {BankKind} from '../combat/types';
import {canonicalInventoryId} from '../combat/item-ids';
import {offerTimeLabel,renderBoostEstimate} from './strategy-summary';
import {creatureIcon,creatureName,assignmentName,creatureOptions} from './creature-art';
import {enhanceCreaturePickers} from './creature-picker';
import {interfaceIcon} from './interface-icons';
import {renderCreatureGuide,changeGuide,chooseGuideLocation,guideState} from './creature-guide';
import {renderHuntNav,renderLookup,renderForecast,renderTaskHistory,renderTimingSuggestion} from './hunt-tools';
import {saveHuntDialog,applyHunt,deleteHuntDialog,reviewBlocks,recordTaskDialog,applyTimingDialog,type HuntContext} from './hunt-actions';
import {History} from '../state/history';
import {renderQuestImport,renderAreaAccess,questLabel} from './account-import';
import {preserveView} from './view';
import {renderQuestPoints,questPointSummary} from './quest-points';
import {configuredMethod} from '../combat/priority';
import {setTaskExtension} from '../state/task-extensions';
import {renderTargetExtensions,renderExtensionAdvice} from './task-extensions';
import {requiredTargetUnlocks} from '../analysis/target-unlocks';
import {canShowAvailableMaster,renderTargetUnlockWarning,renderMasterStatus,renderUnlockHuntNotice,renderPlanCosts} from './master-availability';
import {canRankPlan,recommendedPlan,renderRecommendationMetric} from './planner-ranking';
import {renderTargetRateCell,targetRateDescription} from './target-rate';
import {renderSkipPolicy} from './skip-policy';
import {renderPlanIssues,planIssueTooltip,renderUnavailableHunt} from './plan-issues';
import {renderMortimerRules,renderMortimerSummary} from './mortimer-rules';
import {loadShowUnavailable,saveShowUnavailable} from './visibility';
import {requestRate,measuredRateLabel} from './rate-dialog';
import {THEMES,loadTheme,themeId,applyTheme,saveTheme} from './themes';
import {catalogue as data,MORTIMER_VERSION,VARIANT_VERSION,withDefaultMaxedProfile,knownAccessKeys,customProfileCount,MAX_CUSTOM_PROFILES,MAXED_PROFILE_ID,newProfile,defaultMethod,clone,migrateV1,importProfiles,rebaseProfiles,exportProfiles,validateProfile,STORAGE,blockSlots,AREA_RULES,relevantQuests,questState,parseQuestImport,applyQuestImport,type QuestPreview} from '../core';
import type {Profile,Plan,Simulation,Method,Requirement} from '../domain/types';
declare const WORKER_SOURCE:string;
declare global {interface Window {slayerDesktop?:Partial<UpdateBridge>&{characterExports?:(mode:'auto'|'choose')=>Promise<{source:'automatic'|'selected';folder:string;files:{name:string;text:string}[]}|null>;hiscores:(name:string)=>Promise<string>;compact?:(enabled:boolean,pin:boolean)=>Promise<void>}}}
const $=(id:string)=>document.getElementById(id)!;
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const pct=(v:number|null)=>v===null?'—':(v*100).toFixed(2)+'%';
const num=(v:number|null,d=2)=>v===null?'Unavailable':v.toFixed(d);
const time=(h:number|null)=>{if(h===null||!Number.isFinite(h))return 'Unavailable';const n=Math.round(h*60);return n<60?n+' min':Math.floor(n/60)+'h '+n%60+'m';};
const options=(values:[string,string][],value:unknown)=>values.map(([key,label])=>`<option value="${esc(key)}" ${String(value)===key?'selected':''}>${esc(label)}</option>`).join('');
const select=(path:string,label:string,values:[string,string][],value:unknown,kind?:'assignment'|'variant')=>`<label>${esc(label)}<select data-setting="${esc(path)}" ${kind?'data-creature-picker':''}>${kind?creatureOptions(data,kind,values,value):options(values,value)}</select></label>`;
const input=(path:string,label:string,value:unknown,min=0,max=1e9,step='1')=>`<label>${esc(label)}<input data-setting="${esc(path)}" type="number" min="${min}" max="${max}" step="${step}" value="${value??''}"></label>`;
const bool=(path:string,label:string,value:boolean)=>`<label class="check toggle-card"><input type="checkbox" data-setting="${esc(path)}" ${value?'checked':''}>${esc(label)}</label>`;
const gearSignature=(profile:Profile,guide:GuideState)=>JSON.stringify([profile.id,combatIdentity(profile),travelIdentity(profile),profile.gearOverrides?.[guide.variantId],guide]);
const routes:[string,string][]=[['plan','Hunt planner'],['guide','Creature guide'],['bank','Bank & gear'],['settings','Settings'],['account','Account & access'],['tasks','Tasks & blocks'],['methods','Combat methods'],['compare','Compare characters'],['data','Data & sources']];
class AppState{
  exportDiscovery:ExportDiscoveryView={busy:false,message:'',folders:[]};exportFolders:Record<string,File[]>={};exportSearched=new Set<string>();
  firstLaunch=false;exportPreview:AccountExportPreview|null=null;exportRequest=0;
  tutorialStep=0;tutorialProfile:Profile|undefined;tutorialPlans:Plan[]=[];tutorialMaster='duradel';guideBeforeTutorial:GuideState|undefined;

  gearPlanOverrides=new Map<string,Plan|undefined>();gearPendingVariants=new Set<string>();
  combatCache=new CombatCacheStore(5000);reusedCombat=false;restoredCalculations=false;
  combatWorkIdentity='';combatCompleteIdentity='';combatRefreshTimer:ReturnType<typeof setTimeout>|undefined;
  gearResults:GuideCombat|undefined;gearKey='';
  display=loadDisplay();bankView:BankView={query:'',previews:[],levels:null,account:null,kind:'auto',group:false};bankPreviewProfile='';bankRequest=0;
  history=new History<{profiles:Profile[];activeId:string}>();compact=false;pin=false;huntSearch='';selectedPresetId='';
  showUnavailable=loadShowUnavailable();questRequest=0;questDraft='';questPreview:QuestPreview|null=null;preserveQuestOverrides=true;theme=loadTheme();profiles:Profile[]=[];activeId='';route=({'#creature-guide':'guide','#bank':'bank','#settings':'settings'} as Record<string,string>)[window.location.hash]||'plan';plans:Plan[]=[];selected='';simulation:Simulation|null=null;comparison:Plan[]=[];comparisonId='';taskMaster='nieve';taskSearch='';methodAssignment='basilisks';accessSearch='';restrictedAreaQuery='';message='';saveError='';busy:Record<string,{done:number;total:number;current?:string}>={};workers=new Map<string,CalculationWorker>();sequence=0;simulations=new Map<string,Simulation>();
  get profile():Profile{return this.profiles.find(p=>p.id===this.activeId)!;}
  strategyResults:{strategy:string;result?:Simulation;error?:string}[]=[];
  constructor(){
    applyTheme(this.theme);
    try{
      const raw=localStorage.getItem(STORAGE);this.firstLaunch=localStorage.getItem('slayer-welcome-v1')==='pending'||(!raw&&!localStorage.getItem('slayer-target-planner-v1')&&!localStorage.getItem('slayer-welcome-v1'));if(this.firstLaunch)localStorage.setItem('slayer-welcome-v1','pending');
      if(raw){const saved=importProfiles(data,raw);this.profiles=saved.profiles;this.activeId=saved.activeId;}
      else{
        const legacy=localStorage.getItem('slayer-target-planner-v1');
        if(legacy){if(!localStorage.getItem(STORAGE+'-v1-backup'))localStorage.setItem(STORAGE+'-v1-backup',legacy);this.profiles=[migrateV1(data,JSON.parse(legacy))];}
      }
    }catch(error){this.saveError='Saved character could not be loaded; original storage is untouched. '+String(error);}
    const originalProfiles=this.profiles;
    const defaults=withDefaultMaxedProfile(data,this.profiles,this.activeId);
    this.profiles=defaults.profiles;this.activeId=defaults.activeId;
    if(originalProfiles!==this.profiles)this.persist();
    this.history.record({profiles:this.profiles,activeId:this.activeId});
    if(this.profile.setup&&!this.profile.setup.complete)this.route='setup';
  }
  persist():void{try{if(!this.saveError)localStorage.setItem(STORAGE,exportProfiles(this.profiles,this.activeId));}catch{this.saveError='Storage unavailable. Export your character to keep changes.';}}
  cancel(channel?:string):void{for(const [key,w]of this.workers)if(!channel||key===channel){w.terminate();this.workers.delete(key);delete this.busy[key];}}
  warmCombat():void{
    const profile=this.profile,identity=combatIdentity(profile);
    if(!profile.combat?.enabled||!profile.bank&&!profile.assumeAllGear)return;
    if(this.combatCompleteIdentity===identity||this.workers.has('combat')&&this.combatWorkIdentity===identity)return;
    this.cancel('combat');this.combatWorkIdentity=identity;this.run('combat','combat-warmup',profile);
  }
  refreshCombatPlans():void{
    if(this.combatRefreshTimer)return;
    this.combatRefreshTimer=setTimeout(()=>{
      this.combatRefreshTimer=undefined;
      if(this.route==='setup'||this.route==='tutorial'||this.workers.has('plans'))return;
      this.run('plans','plans',this.profile);renderStatus();
    },1500);
  }
  run(channel:string,kind:'plans'|'simulation'|'strategies'|'hunt'|'gear'|'gear-selection'|'combat-warmup',profile:Profile,masterId?:string,guide?:GuideState,origin?:ActionOrigin):void{
    const requestedPlan=this.plans.find(plan=>plan.master.id===masterId);
    this.cancel(channel);const requestedGuide=guide||guideState,requestedGuideKey=gearSignature(profile,requestedGuide),identity=combatIdentity(profile),combatCache=this.combatCache.snapshot(identity);const id=++this.sequence,worker=new CalculationWorker(WORKER_SOURCE);
    this.workers.set(channel,worker);this.busy[channel]={done:0,total:kind==='plans'?data.masters.length:kind==='gear'?5:kind==='strategies'?6:profile.simulation.trials,current:calculationCache.available?'Checking saved calculations':combatCache.entries.length?(kind==='plans'?'Updating hunt odds / reusing completed combat results':'Reusing completed combat results'):'Starting calculation'};
    worker.onmessage=event=>{
      if(this.workers.get(channel)!==worker||event.data.id!==id)return;
      const result=event.data;
      if(result.kind==='combat-cache'){this.combatCache.put(identity,result.key,result.result);if(channel==='combat')this.refreshCombatPlans();return;}
      if(result.fromCache)this.restoredCalculations=true;
      if(result.kind==='progress'){this.busy[channel]={done:result.done,total:result.total,current:result.current||'Calculating'};renderStatus();return;}
      if(result.kind==='priority-gear'){if(this.gearKey===requestedGuideKey){this.gearResults=result.result;if(this.route==='guide')renderBackground();}return;}
      if(result.kind==='plan-ready'){
        if(channel==='plans'||channel==='gear-selection'){
          if(channel==='plans'&&this.gearPlanOverrides.has(result.plan.master.id))return;
          if(channel==='gear-selection')this.gearPlanOverrides.set(result.plan.master.id,result.plan);
          this.plans=[...this.plans.filter(p=>p.master.id!==result.plan.master.id),result.plan].sort((a:Plan,b:Plan)=>a.objectiveValue-b.objectiveValue||a.master.name.localeCompare(b.master.name));
          if(!this.selected)this.selected=this.plans.find(plan=>canRankPlan(plan,profile))?.master.id||this.plans.find(plan=>canShowAvailableMaster(data,plan,profile))?.master.id||this.plans[0]?.master.id||'';
          if(this.route==='plan')renderBackground();
        }
        return;
      }
      this.cancel(channel);
      if(result.kind==='error'){renderContent();reportActionError(result.message,origin||null,requestedPlan);renderStatus();return;}
      if(channel==='combat'){
        this.combatCompleteIdentity=identity;
        if(this.combatRefreshTimer){clearTimeout(this.combatRefreshTimer);this.combatRefreshTimer=undefined;}
        if(this.route!=='setup'&&this.route!=='tutorial')this.run('plans','plans',this.profile);
        renderStatus();return;
      }
      if(channel==='gear')this.gearResults=result.result;
      else if(channel==='plans'){
        this.reusedCombat=result.fromCache||result.combatRestored>0;
        this.plans=[...result.plans.filter((plan:Plan)=>!this.gearPlanOverrides.has(plan.master.id)),...[...this.gearPlanOverrides.values()].filter((plan):plan is Plan=>!!plan)].sort((a:Plan,b:Plan)=>a.objectiveValue-b.objectiveValue||a.master.name.localeCompare(b.master.name));
        if(!this.plans.some(p=>p.master.id===this.selected&&(this.showUnavailable||canShowAvailableMaster(data,p,profile))))this.selected=this.plans.find(plan=>canRankPlan(plan,profile))?.master.id||this.plans.find(plan=>canShowAvailableMaster(data,plan,profile))?.master.id||this.plans[0]?.master.id||'';
      }else if(channel==='gear-selection'){
        this.gearPendingVariants.clear();this.reusedCombat=true;
        if(this.plans.length===data.masters.length&&!this.busy.plans)void calculationCache.save({id,kind:'plans',profile:clone(profile)},[{id,kind:'plans',plans:this.plans}]);
      }else if(channel==='compare')this.comparison=result.plans;
      else if(channel==='strategies'){
        this.strategyResults=result.results;
        const failures=this.strategyResults.filter(r=>r.error);
        if(failures.length){this.message=failures[0].error!;displayedMessage='';renderMessage(failures.length===this.strategyResults.length?'error':'warning',origin||null,requestedPlan);}
      }
      else {if(result.plan){this.plans=this.plans.map(p=>p.master.id===result.masterId?result.plan:p);}this.simulation=result.result;this.simulations.set(result.masterId,result.result);}
      if(channel==='plans'&&this.route==='guide'&&!this.gearResults&&!this.workers.has('gear'))this.run('gear','gear',this.profile,undefined,guideState);
      if(channel==='plans')void this.restoreSelectedResults();
      renderBackground();renderStatus();
    };
    worker.onerror=()=>{this.cancel(channel);reportActionError('Calculation worker failed. Reload or export the character before trying again.',origin||null);renderStatus();};
    worker.postMessage({id,kind,profile:clone(profile),combatCache,provisionalCombat:!['combat-warmup','gear','gear-selection'].includes(kind)&&this.workers.has('combat'),guide:kind==='plans'&&(this.gearResults||this.workers.has('gear'))&&this.gearKey===requestedGuideKey?undefined:clone(requestedGuide),guideFirst:this.route==='guide',masterId,variantId:requestedGuide.variantId,variantIds:[...this.gearPendingVariants],blocks:kind==='simulation'?this.plans.find(plan=>plan.master.id===masterId)?.blocks:undefined});
  }
  async restoreSelectedResults():Promise<void>{
    const profile=this.profile,masterId=this.selected,plan=this.plans.find(p=>p.master.id===masterId);if(!plan)return;
    const [simulation,strategies]=await Promise.all([
      calculationCache.load({id:0,kind:'simulation',profile,masterId,blocks:plan.blocks}),
      calculationCache.load({id:0,kind:'strategies',profile,masterId}),
    ]);
    if(this.profile!==profile||this.selected!==masterId)return;
    if(simulation&&!this.workers.has('sim')){this.simulation=simulation.at(-1)!.result;this.simulations.set(masterId,this.simulation!);}
    if(strategies&&!this.workers.has('strategies'))this.strategyResults=strategies.at(-1)!.results;
    if(simulation||strategies){renderContent();renderStatus();}
  }
  gearChanged(variantId:string):void{
    methodPreview.deactivate();this.gearPendingVariants.add(variantId);
    for(const master of gearAffectedMasters(data,this.profile,variantId)){this.gearPlanOverrides.set(master.id,undefined);this.simulations.delete(master.id);}
    this.cancel('gear');this.cancel('strategies');this.cancel('compare');this.cancel('simulation');this.cancel('hunt');
    this.simulation=null;this.strategyResults=[];this.comparison=[];gearInspector.invalidate();
    this.gearKey=gearSignature(this.profile,guideState);this.gearResults=undefined;
    this.history.record({profiles:this.profiles,activeId:this.activeId});this.persist();
    this.run('gear-selection','gear-selection',this.profile,undefined,guideState);renderContent();renderStatus();
  }
  changed(record=true,key=''):void{
    this.gearPlanOverrides.clear();this.gearPendingVariants.clear();this.restoredCalculations=false;
    methodPreview.deactivate();
    if(this.route==='setup'&&!this.profile.setup)this.route='account';
    if(record)this.history.record({profiles:this.profiles,activeId:this.activeId},key);
    const nextGearKey=gearSignature(this.profile,guideState),gearChanged=this.gearKey!==nextGearKey;
    for(const channel of [...this.workers.keys()])if(channel==='combat'?this.combatWorkIdentity!==combatIdentity(this.profile):channel!=='gear'||gearChanged)this.cancel(channel);
    if(gearChanged){gearInspector.invalidate();this.gearKey=nextGearKey;this.gearResults=undefined;}
    this.simulation=null;this.strategyResults=[];this.simulations.clear();this.comparison=[];this.plans=[];this.persist();renderShell();this.warmCombat();if(this.route!=='setup'&&this.route!=='tutorial')this.run('plans','plans',this.profile);renderStatus();
  }
}
installSelectionSurfaces();
const state=new AppState();
const desktopUpdates=new DesktopUpdates(window.slayerDesktop?.updates&&window.slayerDesktop.onUpdateState?window.slayerDesktop as UpdateBridge:undefined,()=>{
 const banner=document.getElementById('desktop-updates');if(banner)banner.innerHTML=renderUpdateBanner(desktopUpdates.state);
 if(state.route==='settings'&&document.getElementById('content'))renderContent();
});
const p=()=>state.profile;
const gearInspector=new GearInspector(WORKER_SOURCE,()=>({profile:p(),guide:guideState,results:state.gearResults,key:state.gearKey}),applyGearSelection);
function applyGearSelection(choice:GearSelection,context:{key:string;guide:GuideState},result:CombatResult):void{
  if(state.route==='tutorial'){reportActionError('Finish the tutorial before changing character gear.',lastOrigin||null);return;}
  if(context.key!==state.gearKey)return;
  try{const copy=clone(p());selectCreatureGear(data,copy,context.guide,result,choice);state.profiles[state.profiles.findIndex(q=>q.id===state.activeId)]=validateProfile(data,copy);state.gearChanged(context.guide.variantId);}
  catch(error){reportActionError(error,lastOrigin||null);}
}
let backgroundRenderPending=false;
function renderBackground():void{if(backgroundRenderPending)return;backgroundRenderPending=true;requestAnimationFrame(()=>{backgroundRenderPending=false;renderContent();});}
const methodPreview=new MethodPreview(WORKER_SOURCE,()=>{if(state.route==='methods')renderBackground();},state.combatCache);
let lastOrigin:ActionOrigin|undefined,displayedMessage='';
const actionNotice=new ActionNotice(()=>({route:state.route,characterId:state.activeId}),openFeedbackFix,()=>{state.message='';displayedMessage='';});
let renderedRoute='';
function fieldValue(path:string):unknown{return path.split('.').reduce((v:any,k)=>v?.[k],p());}
function renderShell():void{
  applyDisplay(state.display);
  const restore=preserveView();
  document.body.classList.toggle('compact-hunt',state.compact);document.body.classList.toggle('tutorial-mode',state.route==='tutorial');
  document.body.classList.toggle('field-guide',state.route==='guide');
  $('app').innerHTML=`<header class="topbar"><div class="brand"><img src="app-icon.png?v=2.1.1" alt=""><div>SLAYER<small>TARGET PLANNER</small></div></div><div class="header-tools"><button class="settings-button" data-route="settings">${interfaceIcon('settings')}<span>Settings</span></button><div class="topmeta">Offline-capable hunt planning<br>Data ${esc(data.version)}</div></div></header><div class="layout"><aside class="sidebar"><div class="profilehead"><label class="profile-label">CHARACTER<select id="profile-select">${options(state.profiles.map(p=>[p.id,p.name]),state.activeId)}</select></label><div class="tools"><button data-action="new-profile">New</button><button data-action="duplicate-profile">Duplicate</button></div></div><div class="tools profile-actions"><button data-action="rename-profile">Rename</button><button data-action="export-profile">Export</button><button data-action="import-profile">Import</button><button class="character-delete" data-action="delete-profile" aria-label="Delete character" title="${p().id===MAXED_PROFILE_ID?'The built-in Maxed character cannot be deleted.':state.route==='tutorial'?'Leave the practice tutorial before deleting a character.':'Delete this saved character'}" ${p().id===MAXED_PROFILE_ID||state.route==='tutorial'?'disabled':''}>Delete</button><button data-qol="undo" ${state.history.canUndo?'':'disabled'}>Undo</button><button data-qol="redo" ${state.history.canRedo?'':'disabled'}>Redo</button></div><nav aria-label="Planner views">${routes.filter(([id])=>!(id==='compare'&&!state.display.compareProfiles)&&!(id==='data'&&!state.display.dataSources)).map(([id,label])=>`<button data-route="${id}" class="${state.route===id?'active':''}" ${state.route===id?'aria-current="page"':''}>${interfaceIcon(id)}<span>${label}</span></button>`).join('')}</nav><div class="quick"><details open><summary>Quick setup</summary><div class="formgrid compact">${input('levels.slayer','Slayer',p().levels.slayer,1,99)}${input('levels.combat','Combat',p().levels.combat,3,126)}${renderQuestPoints(p(),true)}${input('globalDps','Default DPS',p().globalDps,.1,10000,'.1')}${input('points','Current points',p().points,0,1e9)}${input('reserve','Reserve',p().reserve,0,1e9)}</div></details>${bool('assumeUnknown','Assume unknown requirements satisfied (conditional scenario)',p().assumeUnknown)}<p class="small muted">${p().id===MAXED_PROFILE_ID?'Maxed skills, quests, diaries and area access; '+(p().assumeAllGear?'all gear assumed available':'recorded gear only')+'. Slayer-point rewards start off; enable purchased creature unlocks in Account & access.':'Blank account facts stay unknown. Game eligibility and personal preferences are separate.'}</p></div><div class="save">${state.saveError?'Session only — export a backup':'Saved on this device'}</div></aside><main><div id="message" role="status"></div><div id="status" class="statusline"></div><div id="desktop-updates">${renderUpdateBanner(desktopUpdates.state)}</div><div id="content"></div><footer>Slayer Target Planner ${APP_VERSION} · ${esc(data.attribution)}<br>Characters stay local. Optional hiscores lookup sends only the entered RuneScape name.</footer></main></div><input id="file-import" type="file" accept=".json,application/json" hidden><input id="quest-file-import" type="file" accept=".json,application/json" hidden><input id="account-folder-import" type="file" webkitdirectory multiple hidden><input id="account-file-import" type="file" accept=".json,application/json" multiple hidden><input id="bank-file-import" type="file" accept=".json,application/json" multiple hidden>`;
  renderMessage();renderStatus();renderContent();restore();
}
function renderMessage(level:NoticeLevel='info',origin:ActionOrigin|null=lastOrigin||null,plan=state.plans.find(r=>r.master.id===state.selected)):void{
  $('message').innerHTML=state.saveError?`<div class="notice error">${esc(state.saveError)} <button data-action="export-profile">Export character backup</button></div>`:'';
  if(!state.message){actionNotice.close(false);displayedMessage='';return;}
  if(state.message===displayedMessage)return;
  displayedMessage=state.message;
  if(level==='info'&&/session only|storage.*unavailable|applied for this session/i.test(state.message))level='warning';
  actionNotice.show({message:state.message,level,fix:feedbackFix(data,p(),state.message,origin||undefined,plan)},origin||undefined);
}
function reportActionError(error:unknown,origin:ActionOrigin|null=lastOrigin||null,plan?:Plan):void{
  state.message=error instanceof Error?error.message:String(error);displayedMessage='';renderMessage('error',origin,plan);
}
function openFeedbackFix(fix:FeedbackFix):void{
  state.route=fix.route;
  if(fix.route==='methods'){state.methodAssignment=fix.assignmentId||state.methodAssignment;methodVariant=fix.variantId||'';}
  if(fix.route==='account')state.accessSearch=fix.filter||'';
  if(fix.route==='settings')state.restrictedAreaQuery=fix.filter||'';
  if(fix.route==='tasks')state.taskMaster=fix.masterId||state.taskMaster;
  renderShell();
  const selector=fix.setting?'[data-setting="'+CSS.escape(fix.setting)+'"]':fix.selector||(fix.route==='methods'&&fix.field?'[data-method-field="'+CSS.escape(fix.field)+'"]':undefined);
  let focus:HTMLElement|null=null;
  if(selector){const candidates=[...document.querySelectorAll<HTMLElement>(selector)];focus=(fix.index!==undefined?candidates[fix.index]:candidates.find(e=>$('content').contains(e)))||candidates[0]||null;}
  if(!focus&&fix.route==='plan'&&fix.assignmentId){const i=p().goal.targets.findIndex(t=>t.assignmentId===fix.assignmentId);focus=document.querySelector('[data-target="'+i+'"][data-target-field="variantId"]');}
  if(!focus&&fix.route==='settings')focus=document.getElementById('settings-location-pool');
  if(focus)focusCorrection(focus);else{$('content').setAttribute('tabindex','-1');focusCorrection($('content'));}
}

function renderStatus():void{
  if(state.route==='setup'){ $('status').textContent='Character setup · hunt calculations start when you finish or exit';return;}
  if(state.route==='tutorial'){ $('status').textContent='Practice scenario';return;}
  $('status').innerHTML=Object.keys(state.busy).length?`<span>${Object.entries(state.busy).map(([k,v])=>`${k==='gear-selection'?'Creature gear & affected masters':esc(k)}: ${Math.min(100,Math.floor(v.done/Math.max(1,v.total)*100))}% - ${esc(v.current||'Calculating')}`).join(' · ')}</span><button data-action="cancel">Cancel calculations</button>`:`<span>${state.plans.length} master plans${state.restoredCalculations?' · Saved calculations restored':state.reusedCombat?' · Reused combat results':''} · ${p().assumeUnknown?'Conditional assumptions enabled':'Confirmed facts required'}</span><button data-action="recalculate">Check calculations</button>`;
  if(calculationCache.warning)$('status').insertAdjacentHTML('beforeend','<span class="small muted">'+esc(calculationCache.warning)+'</span>');
}
function renderContent():void{
  const restore=preserveView();
  if(state.route!=='methods')methodPreview.deactivate();
  if(state.route==='guide'){const key=gearSignature(p(),guideState);if(key!==state.gearKey){gearInspector.invalidate();state.gearKey=key;state.gearResults=undefined;state.run('gear','gear',p(),undefined,guideState);renderStatus();}}
  const renderers:Record<string,()=>string>={setup:()=>renderCharacterSetup(data,p(),state.exportPreview,state.display.showCompletedAccess,state.exportDiscovery,!!window.slayerDesktop?.characterExports),tutorial:()=>renderFirstHunt(data,state.tutorialProfile!,state.tutorialPlans,state.tutorialStep,state.tutorialProfile!.strategy,state.tutorialMaster),plan:renderPlan,guide:()=>renderCreatureGuide(data,p(),state.gearResults),bank:()=>renderBank(p(),state.bankView),settings:()=>renderUpdateSettings(desktopUpdates.state)+renderSettings(p(),state.display,state.theme,locationPoolKeys(data,p()),state.restrictedAreaQuery),account:renderAccount,tasks:renderTasks,methods:renderMethods,compare:renderCompare,data:renderData};
  const content=$('content'),routeChanged=renderedRoute!==state.route;renderedRoute=state.route;
  content.innerHTML=renderers[state.route]();content.dataset.view=state.route;gearInspector.refresh(!routeChanged);
  enhanceCreaturePickers(document.getElementById('app')!);enhanceSelectionSurfaces(document.getElementById('app')!);restore();actionNotice.refresh();
  if(state.route==='setup'&&p().setup?.step===1&&window.slayerDesktop?.characterExports&&!state.exportSearched.has(state.activeId)){state.exportSearched.add(state.activeId);queueMicrotask(()=>findAccountExports('auto'));}
  if(routeChanged&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)content.animate([{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
}
function head(eyebrow:string,title:string,description:string):string{return `<div class="pagehead"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div></div>`;}
function renderPlan():string{
  const visiblePlans=state.plans.filter(r=>state.showUnavailable||canShowAvailableMaster(data,r,p()));
  const current=visiblePlans.find(r=>r.master.id===state.selected),best=recommendedPlan(state.plans,p());
  const nav=renderHuntNav(data,p(),visiblePlans,state.selected,state.compact,state.history.canUndo,state.history.canRedo,state.selectedPresetId,!!window.slayerDesktop,state.pin);
  if(state.compact)return nav+`<p class="small muted">Hunting: ${p().goal.targets.map(t=>creatureName(t.variantId,data.variants.find(v=>v.id===t.variantId)?.name||t.variantId)).join(', ')}</p>`+(current?planDetails(current,true):'<p>Calculating hunt…</p>');
  let html='<div class="hunt-intro">'+head('THE HUNT STARTS HERE','Your next hunt','Choose a creature. Find your master. Make every task count.');
  html+=renderHuntPicker(data,p())+'</div>';
  html+=nav+renderCombatCoverage(current);
  html+=`<div class="plan-grid"><section class="card plan-setup"><div class="section-heading">${interfaceIcon("plan")}<div><h2>Hunt setup</h2><p class="small muted">Your target, your stopping point, your strategy.</p></div></div><div class="formgrid">${select('goal.kind','Finish when…',[['offer','A compatible target task is offered'],['kills','Target kill quantity is reached'],['drop','Selected item drops']],p().goal.kind)}${select('objective','Rank plans by',[['time','Lowest estimated waiting time'],['kills-hour','Highest target kills per hour'],['chance','Highest target chance per offer'],['points','Lowest estimated points within session limit']],p().objective)}${select('strategy','Strategy',[['none','Complete tasks without skipping'],['sustainable','Sustainable skips (long-run)'],['funded','Spend available points'],['boost-turael','Turael milestone boosting'],['boost-mazchna','Mazchna milestone boosting'],['reset-turael','Turael resets (streak changes)']],p().strategy)}</div>${p().goal.targets.map((t,i)=>`<div class="targetrow"><label>Assignment<select data-creature-picker data-target="${i}" data-target-field="assignmentId">${creatureOptions(data,'assignment',data.assignments.map(a=>[a.id,a.name]),t.assignmentId)}</select></label><label>Desired monster variant<select data-creature-picker data-target="${i}" data-target-field="variantId">${creatureOptions(data,'variant',data.variants.filter(v=>v.assignmentIds.includes(t.assignmentId)).map(v=>[v.id,v.name]),t.variantId)}</select></label><label>Priority<input data-target="${i}" data-target-field="priority" type="number" min="1" max="100" value="${t.priority}"></label><button data-remove-target="${i}" ${p().goal.targets.length===1?'disabled':''}>Remove</button></div>`).join('')}<div class="tools"><button data-action="add-target">Add acceptable target</button><button class="secondary" data-action="export-results">Export comparison CSV</button></div>`;
  html+=renderTargetExtensions(data,p());
  if(p().goal.kind==='kills')html+=`<div class="formgrid">${input('goal.quantity','Target kills needed',p().goal.quantity,1,1e7)}</div>`;
  if(p().goal.kind==='drop'){
    const drops=data.variants.filter(v=>p().goal.targets.some(t=>t.variantId===v.id)).flatMap(v=>v.drops);
    html+=`<div class="formgrid">${select('goal.dropId','Sourced drop',[['','Choose a drop'],...drops.map(d=>[d.id,d.name] as [string,string])],p().goal.dropId)}${input('goal.customDropRate','Optional custom per-kill probability (0–1)',p().goal.customDropRate,0,1,'any')}</div><p class="goalhint">Direct drops only. Custom rates are assumptions; superior spawn/drop tables are not included.</p>`;
  }
  html+=`<details><summary>Points, streak and session assumptions</summary><div class="formgrid">${input('points','Starting points',p().points)}${input('reserve','Minimum point reserve',p().reserve)}${input('streaks.normal','Normal streak',p().streaks.normal)}${input('streaks.mortimer','Mortimer streak',p().streaks.mortimer)}${input('streaks.wilderness','Wilderness streak',p().streaks.wilderness)}${input('mortimerTasks','Mortimer tasks completed',p().mortimerTasks)}${input('milestone','Boost milestone (10 / 50 / 100 / 250 / 1000)',p().milestone,10,1000)}${input('simulation.sessionHours','Session / point-objective time limit (hours)',p().simulation.sessionHours,.01,10000,'any')}${input('skipSeconds','Seconds per skip / reset',p().skipSeconds,0,10000)}${input('requestMinutes','Minutes per task request',p().requestMinutes,0,10000,'.1')}</div>${bool('applySetup','Pay for new blocks before the hunt',p().applySetup)}<p class="small muted">Funded simulation never spends future rewards. Long-run sustainability is a separate model.</p></details></section>`;
  if(p().strategy==='funded')html+=`<div class="notice funded-note">The table is an unlimited-funds offer benchmark. Your starting points and reserve can force tasks to be completed instead of skipped; simulate the full hunt for its actual time and rewards.</div>`;
  if(best)html+=`<section class="card hero"><div class="eyebrow">${p().strategy==='funded'?'UNLIMITED-FUNDS BENCHMARK':'RECOMMENDED MASTER'}</div><h2>${esc(best.master.name)} ${best.unknown.length?'<span class="badge">Conditional scenario</span>':''}</h2><div class="metrics">${renderRecommendationMetric(best,p(),time)}<div class="metric"><small>${best.boost?'Effective target / request':best.reset?'Target opportunity / request (incl. Turael)':'Target opportunity / offer'}</small><strong>${pct(best.chance)}</strong></div><div class="metric"><small>Requests including success</small><strong>${num(best.offers,1)}</strong></div></div><p class="small muted">${esc(best.quality)}</p>${renderExtensionAdvice(data,best,p(),true)}</section>`;
  else html+=state.plans.length?(visiblePlans.some(plan=>requiredTargetUnlocks(data,plan,p()).length)?renderUnlockHuntNotice():p().objective==='kills-hour'?'<div class="notice"><strong>No supported target kill-rate ranking for this setup.</strong><p>Show unavailable masters and hover their Target kills / h cells for the reason. Review account requirements or choose another ranking option for modifier-dependent or cape policies.</p></div>':renderUnavailableHunt(data,state.plans,p())):'<div class="notice plan-pending">Calculating master plans…</div>';
  html+=`</div><section id="master-comparison"><div class="section-heading">${interfaceIcon("compare")}<div><h2>Compare your masters</h2><p class="small muted">Find the best route to your next assignment.</p></div></div><p class="small muted">Analytical estimates compare stationary task offers. Simulate funded, boosting, reset, cape, kill and drop goals for their full result.</p><div class="tools"><label class="check"><input id="show-unavailable" type="checkbox" ${state.showUnavailable?'checked':''}>Show unavailable masters (${state.plans.filter(r=>!canShowAvailableMaster(data,r,p())).length})</label><span class="small muted">Showing ${visiblePlans.length} of ${state.plans.length} masters</span></div><div class="tablewrap"><table><thead><tr><th>Master</th><th>${p().strategy==='funded'?'Unlimited-funds benchmark':p().strategy.startsWith('boost')?'Boost offer estimate':'Offer estimate'}</th><th>${p().strategy.startsWith('boost')?'Effective target / request':p().strategy==='reset-turael'?'Target / request (incl. Turael)':'Target / offer'}</th><th title="Estimated selected target creatures killed per hour over complete task cycles, including intervening tasks, requests, skips and travel.">Target kills / h</th><th>Blocks</th><th>Setup cost</th><th>Long-run points / h</th></tr></thead><tbody>${visiblePlans.map(r=>`<tr class="${r.master.id===state.selected?'selected':''}"><td><button data-master="${r.master.id}" aria-pressed="${r.master.id===state.selected}">${esc(r.master.name)}</button>${renderMasterStatus(data,r,p())}${renderPlanIssues(data,r,p())}${r.master.id==='mortimer'?'<button data-action="mortimer-rules">Modifier rules & ranges</button>':''}</td><td title="${esc(planIssueTooltip(r))}">${r.chance===null&&requiredTargetUnlocks(data,r,p()).length?'Unlock required':time(r.hours)}</td><td>${pct(r.chance)}</td>${renderTargetRateCell(r,p())}${renderPlanCosts(data,r,p())}</tr>`).join('')}${state.plans.length&&!visiblePlans.length?'<tr><td colspan="7">No available masters for this setup. Tick Show unavailable masters to review the reasons and fixes.</td></tr>':''}</tbody></table></div></section>`;
  if(current)html+=planDetails(current);
  return html;
}

function renderResetEstimate(plan:Plan):string{
  const r=plan.reset;if(!r)return '';
  return `<div class="notice"><h3>Turael reset estimate</h3><p>${(r.rate*100).toFixed(1)}% of main-master requests are reset. Each reset includes ${(p().skipSeconds/60).toFixed(1)} minutes to change the task plus ${r.replacementMinutes.toFixed(1)} expected minutes for the Turael request and replacement action. Each main-master request adds ${p().requestMinutes.toFixed(1)} minutes.</p><p>Direct target chance at ${esc(plan.master.name)}: ${pct(r.directChance)}. Turael target chance: ${pct(r.fillerChance)}. The table’s chance averages both request types; time ends when a compatible target is offered. Incompatible Konar locations follow the reset rule.</p><p class="small muted">Uses your recorded actual Turael blocks (${r.fillerBlocks.length}), not a free automatic proposal. Set actual Turael blocks and fast replacement methods to match your route. Streak rewards and finite point balances require simulation.</p><button data-issue-route="tasks" data-issue-master="turael">Review Turael blocks and methods</button></div>`;
}

function planDetails(plan:Plan,compact=false):string{
  if(plan.chance===null&&requiredTargetUnlocks(data,plan,p()).length)return `<section class="card" id="selected-plan" tabindex="-1" aria-labelledby="selected-plan-title"><div class="eyebrow">SELECTED MASTER</div><h2 id="selected-plan-title">${esc(plan.master.name)}</h2>${renderTargetUnlockWarning(data,plan,p())}${renderPlanIssues(data,plan,p())}</section>`;
  const impacts=plan.review?.impacts||[];
  const blockDetails=plan.blocks.length?`<details><summary>Why these blocks?</summary><p class="small muted">Each delta removes one block from this proposal. Deltas are not additive.</p><div class="tablewrap"><table><thead><tr><th>Block</th><th>Chance gain</th><th>Hours saved</th><th>New cost</th></tr></thead><tbody>${impacts.map(i=>`<tr><td>${assignmentName(data,i.id)}</td><td>${pct(i.chanceDelta)}</td><td>${num(i.hoursSaved)}</td><td>${i.cost}</td></tr>`).join('')}</tbody></table></div></details>`:'';
  const unknownDetails=plan.unknown.length?`<details><summary>Unconfirmed requirements and modelling assumptions (${plan.unknown.length})</summary><ul class="issues">${plan.unknown.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details>`:'';
  return `<section class="card" id="selected-plan" tabindex="-1" aria-labelledby="selected-plan-title"><div class="eyebrow">SELECTED STRATEGY</div><h2 id="selected-plan-title">${esc(plan.master.name)}</h2>${plan.reason?`<div class="notice error">${esc(plan.reason)}</div>`:''}${renderPlanIssues(data,plan,p(),!!plan.reason)}${plan.master.id==='mortimer'?renderMortimerSummary(p()):''}${renderResetEstimate(plan)}${renderBoostEstimate(data,plan)}${renderKonarLocations(data,plan,p())}<p class="small muted">${esc(plan.quality)}</p>${renderTargetUnlockWarning(data,plan,p())}${renderExtensionAdvice(data,plan,p())}<div class="task-lookup"><label>Look up an offered task<input id="hunt-task-search" type="search" placeholder="Assignment or monster variant" value="${esc(state.huntSearch)}"></label><div id="hunt-task-results" aria-live="polite">${renderLookup(data,plan,p(),state.huntSearch)}</div></div><div class="split"><div><h3>Proposed blocks</h3><div class="chips">${plan.blocks.map(id=>`<span class="chip">${assignmentName(data,id)}</span>`).join('')||'None'}</div><div class="tools block-actions"><button data-action="use-proposal">Fix this proposal</button><button data-action="clear-proposal">Return to automatic blocks</button><button data-action="apply-proposal">Review & record actual list</button></div><p class="small muted">New blocks cost ${plan.setupCost} points. Removing a block is not treated as a refund.</p></div><div>${renderSkipPolicy(data,plan,p())}</div></div>${renderForecast(plan,p(),state.simulations.get(plan.master.id)||null)}${blockDetails}${unknownDetails}${renderTaskHistory(data,p())}</section>${compact?'':simulationPanel(plan)}`;
}
function simulationPanel(plan:Plan):string{
  const result=state.simulation;
  let html=`<section class="card"><h2>Simulate the full hunt</h2><div class="formgrid">${input('simulation.trials','Trials',p().simulation.trials,100,20000)}${input('simulation.horizonOffers','Maximum offers per trial',p().simulation.horizonOffers,10,10000)}${input('simulation.seed','Reproducible seed',p().simulation.seed,0,4294967295)}${input('simulation.sessionHours','Session hours',p().simulation.sessionHours,.01,10000,'any')}</div><div class="tools" style="margin-top:18px"><button data-action="simulate" ${state.busy.sim?'disabled':''}>Simulate ${esc(plan.master.name)}</button><button class="secondary" data-action="search-hunt">${p().objective==='kills-hour'?'Optimise target rate & simulate':'Search blocks for full hunt goal'}</button><button class="secondary" data-action="simulate-strategies">Compare strategies for this master</button>${result?'<button class="secondary" data-action="export-simulation">Export simulation</button>':''}</div><details><summary>Current assignment and cape state</summary><div class="formgrid">${select('current.kind','Starting situation',[['new','Requesting a new offer'],['task','Already assigned a task'],['offer','Pending offer (enter actual options below)']],p().current.kind)}${select('current.masterId','Current task master',[['','Choose master'],...data.masters.map(m=>[m.id,m.name] as [string,string])],p().current.masterId)}${select('current.assignmentId','Current assignment',[['','Choose assignment'],...data.assignments.map(a=>[a.id,a.name] as [string,string])],p().current.assignmentId,'assignment')}${input('current.remaining','Assignment count remaining',p().current.remaining,0,10000)}${select('current.targetCompatible','Current Konar task supports the target variant?',[['','Unknown / not applicable'],['yes','Yes'],['no','No']],p().current.targetCompatible===undefined?'':p().current.targetCompatible?'yes':'no')}${select('previousTask','Previous assignment for cape',[['','Choose previous assignment'],...data.assignments.map(a=>[a.id,a.name] as [string,string])],p().previousTask,'assignment')}</div>${pendingOfferEditor()}${select('current.modifier','Current task modifier',[['none','None'],['points','Points'],['quantity','Quantity'],['clue','Clue'],['superior','Superior'],['xp','XP']],p().current.modifier||'none')}${input('current.modifierPoints','Actual current-task point modifier',p().current.modifierPoints??0,0,10000)}${select('previousMasterId','Actual previous task master for cape',[['','Choose previous master'],...data.masters.map(m=>[m.id,m.name] as [string,string])],p().previousMasterId||'')}${select('previousTargetCompatible','Previous Konar task supports the target variant?',[['','Unknown / not applicable'],['yes','Yes'],['no','No']],p().previousTargetCompatible===undefined?'':p().previousTargetCompatible?'yes':'no')}${bool('cape','Always accept cape repeats when offered (10%; requires 99 Slayer)',p().cape)}</details>`;
  if(result){
    html+=`<div class="metrics"><div class="metric"><small>Mean goal time</small><strong>${time(result.meanHours)}</strong></div><div class="metric"><small>Median</small><strong>${time(result.medianHours)}</strong></div><div class="metric"><small>90th percentile</small><strong>${time(result.p90Hours)}</strong></div><div class="metric"><small>Success within session</small><strong>${pct(result.sessionChance)}</strong><span>95% interval ${pct(result.sessionInterval[0])}–${pct(result.sessionInterval[1])}</span></div></div><p class="small muted">${result.successes}/${result.trials} trials reached the goal. ${result.unresolved} unfinished. Skip funding exhausted in ${pct(result.exhaustionChance)} of trials. Average earned ${num(result.meanEarned)}; spent ${num(result.meanSpent)}; balance ${num(result.meanRemaining)}.</p>${renderSimulationTotals(result)}${successChart(result)}<details><summary>Curve data</summary><table><thead><tr><th>Hours</th><th>Success chance</th><th>95% interval</th></tr></thead><tbody>${result.curve.map(x=>`<tr><td>${x.hours.toFixed(2)}</td><td>${pct(x.chance)}</td><td>${pct(x.low)}–${pct(x.high)}</td></tr>`).join('')}</tbody></table></details><ul class="small muted">${result.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><details><summary>Example trial action and points trace</summary><p class="small muted">${esc(exampleWorkloadText(result))}</p><pre>${esc(result.trace.join('\n'))}</pre></details>`;
  }
  return html+'</section>'+renderStrategyResults();
}
function pendingOfferEditor():string{
  if(p().current.kind!=='offer')return '';
  const values=p().current.options||[];
  return `<h3>Actual pending offer</h3><p class="small muted">Enter each option as displayed. Compatible target location records whether this particular offer can fulfil your hunt.</p>${values.map((o,i)=>`<div class="card formgrid"><label>Assignment<select data-creature-picker data-offer="${i}" data-offer-field="assignmentId">${creatureOptions(data,'assignment',data.assignments.map(a=>[a.id,a.name]),o.assignmentId)}</select></label><label>Modifier<select data-offer="${i}" data-offer-field="modifier">${options(['none','points','quantity','clue','superior','xp'].map(k=>[k,k]),o.modifier)}</select></label><label>Point value<input type="number" min="0" max="10000" data-offer="${i}" data-offer-field="points" value="${o.points}"></label><label>Quantity adjustment<input type="number" min="-1000" max="1000" data-offer="${i}" data-offer-field="quantity" value="${o.quantity}"></label><label class="check"><input type="checkbox" data-offer="${i}" data-offer-field="target" ${o.target?'checked':''}>Compatible target location</label><button data-action="remove-offer-${i}">Remove option</button></div>`).join('')}<button data-action="add-offer" ${values.length>=3?'disabled':''}>Add actual offer option</button>`;
}
function successChart(result:Simulation):string{
  const max=result.curve.at(-1)?.hours||1;
  const points=result.curve.map(p=>`${50+p.hours/max*600},${230-p.chance*200}`).join(' ');
  return `<svg class="chart" role="img" aria-label="Cumulative chance of reaching the hunt goal over time" viewBox="0 0 700 280"><path d="M50 20V230H660" fill="none" stroke="var(--line)"/><text x="10" y="32">100%</text><text x="22" y="233">0%</text><text x="45" y="260">0 h</text><text x="590" y="260">${max.toFixed(1)} h</text><polyline points="${points}" fill="none" stroke="var(--gold)" stroke-width="3"/></svg>`;
}
function renderStrategyResults():string{
  if(!state.strategyResults.length)return '';
  return `<section class="card"><h2>Whole-strategy comparison</h2><p class="small muted">Each strategy starts with the same profile, balances, streaks and goal. Each uses its own suggested block list; setup costs are included only when enabled. Workload totals are averages per hunt, including unfinished trials; skipped tasks include paid skips and resets.</p><div class="tablewrap"><table><thead><tr><th>Strategy</th><th>Median</th><th>90th percentile</th><th>Session success</th><th>Mean spent</th><th>Mean assigned kills</th><th>Tasks completed</th><th>Tasks skipped</th></tr></thead><tbody>${state.strategyResults.map(r=>`<tr><td>${esc(r.strategy)}${r.error?`<small>${esc(r.error)}</small>`:''}</td><td>${r.result?time(r.result.medianHours):'Unavailable'}</td><td>${r.result?time(r.result.p90Hours):'—'}</td><td>${r.result?pct(r.result.sessionChance):'—'}</td><td>${r.result?num(r.result.meanSpent):'—'}</td><td>${r.result?num(r.result.meanWorkload.assignedKills,1):'—'}</td><td>${r.result?num(r.result.meanWorkload.tasksCompleted,1):'—'}</td><td>${r.result?num(r.result.meanWorkload.tasksSkipped,1):'—'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function renderAccount():string{
  const query=state.accessSearch.toLowerCase();
  const quests=visibleQuestNames(p(),relevantQuests(data),state.display.showCompletedAccess);
  const questField=(key:string)=>`<label>${esc(key)}<select aria-label="Quest state for ${esc(key)}" data-fact="quests" data-key="${esc(key)}">${options([['','Auto: '+questLabel(p().questImport?.states[key]??null)],['0','Not started'],['1','In progress'],['2','Completed']],p().quests[key]??'')}</select><small class="muted">${p().quests[key]!=null?'Manual override':p().questImport?.states[key]!==undefined?'Imported quest state':'Not supplied'}</small></label>`;
  return head('PLAYER INFORMATION','Account & access','Fill known facts; leave missing information unknown. Requirements are separate from your keep/skip preferences.')+`<section class="card"><h2>Character setup</h2><p>Import levels, gear, quests and supported diaries together, or fill the remaining facts.</p><button data-action="resume-setup">Open Character Setup Wizard</button></section>`+renderQuestImport(p(),state.questPreview,state.preserveQuestOverrides,state.questDraft)+`<section class="card"><div class="inline-form"><label>Optional public hiscores lookup<input id="rsn" type="text" maxlength="12" placeholder="RuneScape name"></label><button data-action="hiscores">Import levels</button></div><p class="small muted">Only public levels are imported. Quests, diaries and purchases remain as you entered them. If the browser blocks lookup, use the Windows app or enter levels below.</p><div class="formgrid">${['slayer','combat','attack','strength','defence','hitpoints','ranged','magic','prayer','agility','firemaking','hunter','sailing','mining','woodcutting','crafting','thieving','fishing','farming'].map(k=>input('levels.'+k,k[0].toUpperCase()+k.slice(1),p().levels[k],k==='combat'?3:1,k==='combat'?126:99)).join('')}${renderQuestPoints(p(),true)}${input('blockLimit','Optional hypothetical block-slot override',p().blockLimit,0,7)}${input('mortimerTasks','Completed Mortimer tasks',p().mortimerTasks,0,1e9)}</div>${bool('assumeUnknown','Assume unknown requirements satisfied for this scenario',p().assumeUnknown)}<p class="small muted">Derived block slots: ${data.masters.map(m=>`${m.name}: ${blockSlots(m,p()).slots}`).join(' · ')}</p><div class="formgrid">${(visibleFactKeys(p(),'diaries',['lumbridge','kourend','western'],k=>p().diaries[k as keyof Profile['diaries']]===1,state.display.showCompletedAccess) as (keyof Profile['diaries'])[]).map(k=>factCard('Elite '+k+' diary',p().diaries[k],`data-diary-toggle="${k}"`)).join('')}</div></section><section class="card"><input id="access-search" class="search" type="search" value="${esc(state.accessSearch)}" placeholder="Filter quests, areas or Slayer rewards…" aria-label="Filter requirements"></section>${renderAreaAccess(p(),p().restrictBasicAccess?locationPoolKeys(data,p()):accessKeys(),query,state.display.showCompletedAccess)}<section class="card"><h2>Quest stages</h2><div class="formgrid">${quests.filter(q=>q.toLowerCase().includes(query)).map(questField).join('')}</div><h2 class="group-title">Purchased task unlocks</h2>${rewardCards(data,p(),query)}${renderExtensionRewards(data,p(),query)}<h2 class="group-title">Other access confirmations</h2><div class="formgrid">${renderSpecialAccess(data,p(),accessKeys(),query,state.display.showCompletedAccess)}</div></section>`;
}
function accessKeys():string[]{
  return knownAccessKeys(data);
}
function renderTasks():string{
  const m=data.masters.find(m=>m.id===state.taskMaster)!,plan=state.plans.find(p=>p.master.id===m.id);
  const rows=plan?.rows.filter(r=>(r.name+' '+r.variant.name+' '+r.reason).toLowerCase().includes(state.taskSearch.toLowerCase()))||[];
  return head('YOUR IN-GAME LISTS','Tasks & blocks','Record existing blocks and edit a proposed list. Keep, skip and protect preferences do not change assignment eligibility.')+`<div class="card"><div class="formgrid"><label>Master<select id="task-master">${options(data.masters.map(m=>[m.id,m.name]),m.id)}</select></label><label>Find a task<input id="task-search" type="search" value="${esc(state.taskSearch)}" placeholder="Task, variant or reason"></label></div><p class="small muted">Block group: ${esc(m.group)} · ${blockSlots(m,p()).slots} slots · ${m.blockCost} points per new block. Turael/Aya and Spria share the beginner list.</p><div class="tablewrap"><table><thead><tr><th>Assignment / method</th><th>Eligible weight</th><th>Actual block</th><th>Proposed block</th><th>Preference</th><th>Minutes</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${assignmentName(data,r.id,r.name)}<small>${creatureName(r.variant.id,r.variant.name)}${r.reason?' · '+esc(r.reason):''}${r.methodReason?' · '+esc(r.methodReason):''}</small></td><td>${r.reason?'—':r.weight}</td><td><input aria-label="Actual block ${esc(r.name)}" type="checkbox" data-block="actual" data-master-id="${m.id}" data-assignment="${esc(r.id)}" ${(p().blocks[m.group]||[]).includes(r.id)?'checked':''}></td><td><input aria-label="Proposed block ${esc(r.name)}" type="checkbox" data-block="proposed" data-master-id="${m.id}" data-assignment="${esc(r.id)}" ${(p().proposed[m.group]||plan?.blocks||[]).includes(r.id)?'checked':''}></td><td><select aria-label="Preference for ${esc(r.name)}" data-preference="${esc(r.id)}">${options([['','Automatic'],['keep','Always keep'],['skip','Prefer skipping'],['protect','Protect from blocks/skips'],['avoid','Avoid (skip; keep in pool)']],p().preferences[r.id]||'')}</select></td><td>${r.minutes.toFixed(1)}</td></tr>`).join('')}</tbody></table></div><button data-action="clear-group-proposal">Use automatic proposal for this group</button></div>`;
}
let methodVariant='';
function methodKey(aid:string,vid:string):string{return aid+'::'+vid;}
function editedMethod():{key:string;method:Method;aid:string;vid:string}{
  const aid=state.methodAssignment,a=data.assignments.find(a=>a.id===aid)!;
  const vid=a.variantIds.includes(methodVariant)?methodVariant:(p().methods[aid]?.variantId||a.variantIds[0]);
  const key=methodKey(aid,vid),method=configuredMethod(data,p(),aid,vid);return {key,method,aid,vid};
}
function renderMethods():string{
  const {key,method:m,aid,vid}=editedMethod(),v=data.variants.find(v=>v.id===vid)!,a=data.assignments.find(a=>a.id===aid)!;
  const mf=(field:string,label:string,value:unknown,min=0,max=1e6,step='any')=>`<label>${esc(label)}<input type="number" data-method="${esc(key)}" data-method-field="${field}" min="${min}" max="${max}" step="${step}" value="${value??''}"></label>`;
  const ms=(field:string,label:string,values:[string,string][],value:unknown)=>`<label>${esc(label)}<select data-method="${esc(key)}" data-method-field="${field}">${options(values,value)}</select></label>`;
  return head('MONSTER-SPECIFIC ESTIMATES','Completion methods','Keep measured rates separate from DPS estimates. Methods are saved per assignment and monster variant.')+`<section class="card"><div class="formgrid"><label>Assignment<select data-creature-picker id="method-assignment">${creatureOptions(data,'assignment',data.assignments.map(a=>[a.id,a.name]),aid)}</select></label><label>Monster variant<select data-creature-picker id="method-variant">${creatureOptions(data,'variant',a.variantIds.map(id=>[id,data.variants.find(v=>v.id===id)!.name]),vid)}</select></label></div><h2 class="group-title">${creatureName(v.id,v.name)}</h2>${renderTimingSuggestion(p(),aid,vid)}<p>${v.hp} HP · ${esc(v.status)} · <a href="${esc(v.source.url)}" target="_blank" rel="noopener">Wiki source</a></p>${v.masterLocations?`<p class="small muted">${Object.entries(v.masterLocations).map(([id,locations])=>esc(data.masters.find(master=>master.id===id)?.name||id)+': '+locations.map(esc).join(' or ')).join(' · ')}</p>`:''}<p class="small muted">Eligibility: ${v.requirements.map(r=>`${r.label} ${r.min}`).join(' · ')||'Assignment rules apply'}. DPS multipliers and time estimates are planning inputs.</p>${renderMethodCombat(v,m,aid)}<div class="formgrid"><label>Preferred owned-gear style<select data-method="${esc(key)}" data-method-field="combatStyle">${options([['auto','Fastest available'],['melee','Melee'],['ranged','Ranged'],['magic','Magic']],m.combatStyle||'auto')}</select></label><label>Armour fallback priority<select data-method="${esc(key)}" data-method-field="combatDefence">${options([['','Recommended protection plan'],['tank','Defence first'],['prayer','Prayer bonus first']],m.combatDefence||'')}</select></label><label>Targets per stacked pod (1-9; blank uses reviewed default)<input type="number" min="1" max="9" data-method="${esc(key)}" data-method-field="stackSize" value="${m.stackSize??''}"></label></div><div class="formgrid"><label class="check"><input type="checkbox" data-method="${esc(key)}" data-method-field="manualCombat" ${m.manualCombat?'checked':''}>Keep this method’s manual DPS when automatic combat timing is enabled</label>${ms('timing','Timing source',[['dps','HP / effective DPS + delay'],['kills-hour','Measured kills per hour'],['task-minutes','Measured combat minutes per whole task']],m.timing)}${mf('rate',measuredRateLabel(m.timing),m.rate,0)}${mf('dps',(p().combat?.enabled||m.useSelectedGear)&&m.timing==='dps'&&!m.manualCombat?'Manual fallback DPS':'Effective DPS',m.dps,.1,10000)}${mf('delay','Between-kill delay (seconds)',m.delay,0)}${mf('travel','Travel / banking per task (minutes)',m.travel,0)}${ms('bracelet','Bracelet',[['none','None'],['slaughter','Slaughter'],['expeditious','Expeditious']],m.bracelet)}${mf('locationChance','Optional Konar-compatible location chance (0–1)',m.locationChance,0,1)}</div><label class="check"><input type="checkbox" data-method="${esc(key)}" data-method-field="extended" ${m.extended?'checked':''}>Use this assignment’s extended quantity</label><label>Specific compatible Konar location (optional)<input type="text" data-method="${esc(key)}" data-method-field="location" value="${esc(m.location)}" placeholder="Exact location name"></label><div class="notice">Konar’s location roll is separate from task weight. Unknown compatibility is a conditional assumption. A custom probability is labelled as an estimate.</div><div class="inline-form"><label>Preset name<input id="preset-name" type="text" maxlength="100" placeholder="e.g. Ranged Basilisk Knights"></label><button data-action="save-preset">Save method preset</button></div><div class="tools">${Object.keys(p().methodPresets).map(name=>`<button data-load-preset="${esc(name)}">${esc(name)}</button>`).join('')}</div></section>`;
}
function renderCompare():string{
  const base=state.profiles.find(p=>p.id===state.comparisonId);
  return head('INDEPENDENT SCENARIOS','Compare characters','Each character is evaluated with its own methods, goals, block lists and assumptions.')+`<section class="card"><div class="inline-form"><label>Compare active character with<select id="compare-profile">${options([['','Choose a saved character'],...state.profiles.filter(q=>q.id!==p().id).map(q=>[q.id,q.name] as [string,string])],state.comparisonId)}</select></label><button data-action="compare-profiles" ${!base?'disabled':''}>Compare</button><button data-action="snapshot-profile">Save current setup as a baseline</button></div><p class="small muted">To compare a change, duplicate a character, change that copy, then select the original baseline. Changes to one never alter the other.</p></section>${state.comparison.length?`<div class="tablewrap"><table><thead><tr><th>Master</th><th>${esc(p().name)}</th><th>${esc(base?.name)}</th><th>Offer-time difference</th></tr></thead><tbody>${data.masters.map(m=>{const a=state.plans.find(r=>r.master.id===m.id),b=state.comparison.find(r=>r.master.id===m.id);return `<tr><td>${esc(m.name)}</td><td>${time(a?.hours??null)}<small>${pct(a?.chance??null)}</small></td><td>${time(b?.hours??null)}<small>${pct(b?.chance??null)}</small></td><td>${a?.hours!==null&&a?.hours!==undefined&&b?.hours!==null&&b?.hours!==undefined?((a.hours-b.hours)*60).toFixed(1)+' min':'—'}</td></tr>`;}).join('')}</tbody></table></div><p class="notice">${JSON.stringify(p().goal)!==JSON.stringify(base?.goal)?'These characters use different stopping events. Their times are not equivalent rankings.':'Comparison uses stationary offer estimates. Simulate each character for full funded or drop goals.'}</p>`:''}`;
}
function renderData():string{
  const count=data.masters.reduce((s,m)=>s+m.tasks.length,0);
  return head('RULES AND ASSUMPTIONS','Data & sources','Reviewed source snapshots and explicit planning estimates are kept separate.')+renderMortimerRules(p())+`<section class="card"><div class="metrics"><div class="metric"><small>Master entries</small><strong>${count}</strong></div><div class="metric"><small>Assignments</small><strong>${data.assignments.length}</strong></div><div class="metric"><small>Variants</small><strong>${data.variants.length}</strong></div></div><p>Data version ${esc(data.version)} · Captured ${esc(data.captured)}</p><p class="small muted">${esc(data.attribution)}</p><h3>Known data qualifications</h3><ul>${data.audit.map(a=>`<li>${esc(a.master+' / '+a.assignment+': '+a.issue)}</li>`).join('')||'<li>All current master rows were extracted from captured source tables.</li>'}<li>Generic timing multipliers originate in the workbook; HP-only verification does not establish a complete combat DPS model.</li><li>Alternative mappings come from master tables; unreviewed access and repeatable methods require explicit confirmation. Only listed monster variants are selectable. Other alternatives require a data update.</li><li>Mortimer has one guaranteed modifier per offered task, uniform unlocked types and equally likely five-step values under the confirmed planning rules. The dedicated range table identifies its sources.</li><li>Konar location access and target compatibility must be confirmed or supplied as a custom probability.</li><li>Historical workbook fixtures remain tests of the old import, not current game correctness.</li></ul><h3>Character migration notes</h3><ul>${p().notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><div class="tools"><button data-action="export-profile">Export all characters</button><button data-action="export-v1-backup">Export original v1 backup</button></div></section><section class="card"><h2>Captured source revisions</h2><div class="data-list"><table><thead><tr><th>Page</th><th>Revision</th></tr></thead><tbody>${data.sources.filter(s=>s.revision).map(s=>`<tr><td><a href="${esc(s.url)}?oldid=${s.revision}" target="_blank" rel="noopener">${esc(s.title)}</a></td><td>${s.revision}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function download(name:string,text:string,mime='application/json'):void{
  const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function update(mutate:(profile:Profile)=>void,key=''):boolean{
  try{const copy=clone(p());mutate(copy);const valid=validateProfile(data,copy);state.profiles[state.profiles.findIndex(p=>p.id===state.activeId)]=valid;state.message='';if(state.route==='setup'){state.history.record({profiles:state.profiles,activeId:state.activeId},key?state.activeId+':'+key:'');state.persist();renderShell();}else state.changed(true,key?state.activeId+':'+key:'');return true;}
  catch(error){reportActionError(error);return false;}
}
async function requestName(title:string,value:string):Promise<string|null>{
  const dialog=document.createElement('dialog');dialog.innerHTML=`<form method="dialog"><h2>${esc(title)}</h2><label>Name<input id="dialog-name" maxlength="100" required value="${esc(value)}"></label><div class="tools" style="margin-top:20px"><button value="save">Save</button><button value="cancel" formnovalidate>Cancel</button></div></form>`;
  document.body.append(dialog);dialog.showModal();const field=dialog.querySelector('input')!;field.focus();field.select();
  return new Promise(resolve=>dialog.addEventListener('close',()=>{const name=dialog.returnValue==='save'?field.value.trim():null;dialog.remove();resolve(name||null);},{once:true}));
}
function addProfile(profile:Profile):void{
  resetExportDiscovery();
  if(customProfileCount(state.profiles)>=MAX_CUSTOM_PROFILES)throw Error('Maximum of 50 custom characters. Export characters before creating more.');
  state.questRequest++;state.questDraft='';state.questPreview=null;state.profiles.push(validateProfile(data,profile));state.activeId=profile.id;state.changed();
}
async function deleteActiveCharacter():Promise<void>{
  const target=p();
  if(target.id===MAXED_PROFILE_ID)throw Error('The built-in Maxed character cannot be deleted.');
  if(state.route==='tutorial')throw Error('Leave the practice tutorial before deleting a character.');
  if(state.saveError)throw Error('Saved characters cannot be safely updated. Export a backup and resolve the storage error first.');
  if(!await requestCharacterDeletion(target))return;
  if(state.activeId!==target.id)throw Error('The active character changed. Select the intended character and try again.');
  const next=persistCharacterRemoval({profiles:state.profiles,activeId:state.activeId},target.id,localStorage);
  state.cancel();await calculationCache.removeCharacter(target.id);
  state.history.record({profiles:state.profiles,activeId:state.activeId});
  resetExportDiscovery();state.exportSearched.delete(target.id);state.bankRequest++;state.questRequest++;
  state.bankView={query:'',previews:[],levels:null,account:null,kind:'auto',group:false};state.bankPreviewProfile='';state.questDraft='';state.questPreview=null;
  state.profiles=next.profiles;state.activeId=next.activeId;state.selected='';state.comparisonId='';
  if(state.route==='setup')state.route='account';
  state.message='Deleted '+target.name+'. Use Undo to restore the character during this session.';displayedMessage='';state.changed();
}
async function action(name:string,origin?:ActionOrigin):Promise<void>{
  if(await onboardingAction(name))return;
  if(name==='retry-method-combat'){methodPreview.retry();renderContent();return;}
  if(name==='cancel-method-combat'){methodPreview.cancel();renderContent();return;}
  if(name==='use-calculated-method'){const {key,method}=editedMethod();update(q=>{q.combat={...(q.combat??defaultCombat()),enabled:true};q.methods[key]={...method,timing:'dps',manualCombat:false};});return;}
  const selected=state.plans.find(r=>r.master.id===state.selected);
  if(selected&&['simulate','search-hunt','simulate-strategies'].includes(name)&&p().points===null)throw Error('Enter current points before simulating legal funded actions.');
  if(name==='review-location-pool'){state.route='account';state.accessSearch='';renderShell();focusCorrection($('area-access'));return;}
  if(name==='mortimer-rules'){state.route='data';renderShell();$('mortimer-modifiers').scrollIntoView({block:'start'});return;}
  if(name==='add-offer')update(q=>(q.current.options||=[]).push({assignmentId:q.current.assignmentId||q.goal.targets[0].assignmentId,modifier:'none',points:0,quantity:0,target:true}));
  if(name.startsWith('remove-offer-'))update(q=>q.current.options?.splice(Number(name.split('-').at(-1)),1));
  if(name==='choose-quests')($('quest-file-import')as HTMLInputElement).click();
  if(name==='preview-quests'){state.questRequest++;state.questPreview=null;try{state.questPreview=parseQuestImport(data,($('quest-json')as HTMLTextAreaElement).value);state.questDraft='';state.preserveQuestOverrides=true;}finally{renderContent();}}
  if(name==='apply-quests'&&state.questPreview){const valid=applyQuestImport(data,p(),state.questPreview,state.preserveQuestOverrides,new Date().toISOString());state.profiles[state.profiles.findIndex(q=>q.id===state.activeId)]=valid;state.questPreview=null;state.message='Quest import applied. Area access has been recalculated; manual area overrides were preserved.';state.changed();}
  if(name==='cancel-quests'){state.questRequest++;state.questPreview=null;renderContent();}
  if(name==='quest-points-auto')update(q=>q.questPoints=null);
  if(name==='clear-imported-quests')update(q=>delete q.questImport);
  if(name==='dismiss'){state.message='';renderMessage();}
  if(name==='recalculate'){state.changed(false);}
  if(name==='cancel'){methodPreview.cancel();state.cancel();if(state.route==='methods')renderContent();state.message='Calculations cancelled. Current saved character is unchanged.';renderMessage();renderStatus();}
  if(name==='delete-profile'){await deleteActiveCharacter();return;}
  if(name==='new-profile'){await createCharacter();return;}
  if(name==='duplicate-profile'||name==='snapshot-profile'){
    const name=await requestName('Duplicate character',p().name+' copy');if(name){const copy=clone(p());copy.id=newProfile(data).id;copy.name=name;addProfile(copy);}
  }
  if(name==='rename-profile'){const name=await requestName('Rename character',p().name);if(name)update(q=>q.name=name);}
  if(name==='export-profile')download('slayer-characters-v2.json',exportProfiles(state.profiles,state.activeId));
  if(name==='import-profile')($('file-import')as HTMLInputElement).click();
  if(name==='export-v1-backup'){
    const text=localStorage.getItem(STORAGE+'-v1-backup')||localStorage.getItem('slayer-target-planner-v1');
    if(!text)throw Error('No original v1 settings were found in this browser.');download('slayer-original-v1-backup.json',text);
  }
  if(name==='add-target')update(q=>{
    const a=data.assignments.find(a=>!q.goal.targets.some(t=>t.assignmentId===a.id));if(a)q.goal.targets.push({assignmentId:a.id,variantId:a.variantIds[0],priority:1});
  });
  if(name==='simulate'){if(!selected)throw Error('Select a master first.');state.simulation=null;state.run('sim','simulation',p(),selected.master.id,undefined,origin);renderContent();renderStatus();}
  if(name==='search-hunt'){if(!selected)throw Error('Select a master first.');state.run('sim','hunt',p(),selected.master.id,undefined,origin);renderStatus();}
  if(name==='simulate-strategies'){if(!selected)throw Error('Select a master first.');state.strategyResults=[];state.run('strategies','strategies',p(),selected.master.id,undefined,origin);renderStatus();}
  if(name==='export-simulation')download('slayer-hunt-simulation.json',JSON.stringify({dataVersion:data.version,mortimerRulesVersion:MORTIMER_VERSION,variantRulesVersion:VARIANT_VERSION,profile:clone(p()),masterId:state.selected,result:state.simulation},null,2));
  if(name==='use-proposal'&&selected)update(q=>q.proposed[selected.master.group]=[...selected.blocks]);
  if(name==='clear-proposal'&&selected)update(q=>delete q.proposed[selected.master.group]);
  if(name==='apply-proposal'&&selected)await reviewBlocks(huntContext());
  if(name==='clear-group-proposal'){const m=data.masters.find(m=>m.id===state.taskMaster)!;update(q=>delete q.proposed[m.group]);}
  if(name==='save-preset'){
    const {method}=editedMethod(),name=($('preset-name')as HTMLInputElement).value.trim();if(!name)throw Error('Enter a preset name.');update(q=>q.methodPresets[name]=clone(method));
  }
  if(name==='compare-profiles'){const base=state.profiles.find(p=>p.id===state.comparisonId);if(base){state.run('compare','plans',base);renderStatus();}}
  if(name==='export-results'){
    const cell=(v:unknown)=>'"'+String(v??'').replace(/^[=+@-]/,s=>typeof v==='string'?"'"+s:s).replace(/"/g,'""')+'"';
    const rows=[['Data version','Profile','Master','Offer chance','Stationary offer hours','Target creatures killed per hour','Target rate basis','Extension comparisons','New block cost','Conditional facts','Search status'],...state.plans.map(r=>[data.version,p().name,r.master.name,r.chance,r.hours,r.targetKillsPerHour,targetRateDescription(r,p()),JSON.stringify(r.extensions||[]),r.setupCost,r.unknown.join('; '),r.quality])];
    download('slayer-comparison.csv','\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  }
  if(name==='hiscores')await lookupHiscores();
}
async function lookupHiscores():Promise<void>{
  const name=($('rsn')as HTMLInputElement).value.trim();if(!/^[A-Za-z0-9 _-]{1,12}$/.test(name))throw Error('Enter a valid 1–12 character RuneScape name.');
  state.message='Looking up public levels…';renderMessage();
  let text:string;
  if(window.slayerDesktop)text=await window.slayerDesktop.hiscores(name);
  else {const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch('https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='+encodeURIComponent(name),{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('Player not found or service unavailable.');text=await response.text();}catch{throw Error('Public hiscores could not be reached from this browser. Use the Windows app or enter your levels manually. Existing settings are unchanged.');}finally{clearTimeout(timer);}}
  if(text.length>100000)throw Error('Unexpected hiscores response size.');const payload=JSON.parse(text);
  if(!Array.isArray(payload.skills))throw Error('Unexpected hiscores response.');
  const imported:Record<string,number>={};for(const s of payload.skills){if(typeof s.name==='string'&&['attack','strength','defence','hitpoints','ranged','prayer','magic','agility','slayer','sailing','mining','woodcutting','crafting','thieving','fishing','farming'].includes(s.name.toLowerCase())&&Number.isInteger(s.level)&&s.level>=1&&s.level<=99)imported[s.name.toLowerCase()]=s.level;}
  if(!Object.keys(imported).length)throw Error('No valid levels were returned.');
  if(['attack','strength','defence','hitpoints','prayer','ranged','magic'].every(k=>imported[k]))imported.combat=Math.floor(.25*(imported.defence+imported.hitpoints+Math.floor(imported.prayer/2))+.325*Math.max(imported.attack+imported.strength,Math.floor(imported.ranged*1.5),Math.floor(imported.magic*1.5)));
  update(q=>Object.assign(q.levels,imported));state.message='Public levels imported. Quest stages, diaries and unlocks were preserved.';renderMessage();
}
function setSetting(q:Profile,path:string,value:unknown):void{
  if(path==='previousMasterId'){if(value)q.previousMasterId=String(value);else delete q.previousMasterId;return;}
  if(path==='previousTargetCompatible'){if(value==='')delete q.previousTargetCompatible;else q.previousTargetCompatible=value==='yes';return;}
  if(path==='current.targetCompatible'){if(value==='')delete q.current.targetCompatible;else q.current.targetCompatible=value==='yes';return;}
  if(path.startsWith('combat.'))q.combat??=defaultCombat();
  const parts=path.split('.');let object:any=q;for(const part of parts.slice(0,-1))object=object[part];object[parts.at(-1)!]=value;
  if(path==='current.kind'&&value!=='new'){const master=data.masters.find(m=>m.id===q.current.masterId)||data.masters.find(m=>m.id===state.selected)||data.masters[0];q.current.masterId=master.id;if(!master.tasks.some(t=>t.id===q.current.assignmentId))q.current.assignmentId=master.tasks[0].id;}
}

function scrollSection(id:string):void{
  const target=document.getElementById(id);if(!target)return;
  target.focus({preventScroll:true});const nav=document.querySelector('.hunt-nav');
  const offset=nav&&getComputedStyle(nav).position==='sticky'?nav.getBoundingClientRect().height:0;
  window.scrollTo({top:window.scrollY+target.getBoundingClientRect().top-offset-16,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
function selectMaster(id:string):void{
  state.selected=id;state.simulation=state.simulations.get(id)||null;state.strategyResults=[];renderContent();void state.restoreSelectedResults();scrollSection('selected-plan');
}
function restoreHistory(redo=false):void{
  resetExportDiscovery();
  const saved=redo?state.history.redo():state.history.undo();if(!saved)return;
  state.questRequest++;state.questPreview=null;state.questDraft='';
  state.profiles=saved.profiles;state.activeId=saved.activeId;state.message=redo?'Change redone.':'Change undone.';state.changed(false);
}
function huntContext():HuntContext{return {data,profile:p,plan:()=>state.plans.find(r=>r.master.id===state.selected),commit:profile=>update(q=>Object.assign(q,profile)),select:id=>{state.selected=id;}};}
async function huntAction(name:string,button:HTMLButtonElement):Promise<void>{
  if(name==='undo'){restoreHistory();return;}if(name==='redo'){restoreHistory(true);return;}
  if(name==='comparison'){state.compact=false;await window.slayerDesktop?.compact?.(false,false);renderShell();scrollSection('master-comparison');return;}
  if(name==='compact'||name==='pin'){
    if(name==='compact')state.compact=!state.compact;else state.pin=!state.pin;
    await window.slayerDesktop?.compact?.(state.compact,state.pin);renderShell();scrollSection('selected-plan');return;
  }
  const ctx=huntContext();
  if(name==='save-hunt')await saveHuntDialog(ctx);
  if(name==='delete-hunt')await deleteHuntDialog(ctx,state.selectedPresetId);
  if(name==='record-task')await recordTaskDialog(ctx,button.dataset.task!,button.dataset.recordAction as 'complete'|'skip');
  if(name==='apply-timing')await applyTimingDialog(ctx,button.dataset.assignment!,button.dataset.variant!);
}
document.addEventListener('keydown',event=>{
  if(state.route==='guide'||state.route==='tutorial'||!(event.ctrlKey||event.metaKey)||event.altKey||document.querySelector('dialog[open]'))return;
  const target=event.target as HTMLElement;
  if(target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.key.toLowerCase()==='z'){event.preventDefault();restoreHistory(event.shiftKey);}
  if(event.key.toLowerCase()==='y'){event.preventDefault();restoreHistory(true);}
});

document.addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest('button');if(!button)return;
  const origin=captureAction(button,state.route,state.activeId);lastOrigin=origin;
  if(button.dataset.resetGear){
    if(state.route==='tutorial')return;
    const variant=button.dataset.resetVariant!;resetCreatureGear(p(),variant,button.dataset.resetGear as Family);state.gearChanged(variant);return;
  }
  if(button.dataset.useStyle){
    if(state.route==='tutorial'){state.message='Finish the tutorial and open your own guide to apply an owned-gear style.';renderMessage();return;}
    const variant=data.variants.find(v=>v.id===button.dataset.useVariant)!;const assignment=variant.assignmentIds.find(id=>p().goal.targets.some(t=>t.assignmentId===id&&t.variantId===variant.id))||variant.assignmentIds[0];
    update(q=>{const key=assignment+'::'+variant.id;q.methods[key]={...defaultMethod(data,q,assignment),...q.methods[key],variantId:variant.id,combatStyle:button.dataset.useStyle as Method['combatStyle'],combatDefence:button.dataset.useDefence as Method['combatDefence'],stackSize:guideState.stackSize,location:button.dataset.useLocation||guideState.location};});return;
  }
  if(button.dataset.updateAction){desktopUpdates.action(button.dataset.updateAction as 'check'|'restart').catch(error=>reportActionError(error,origin));return;}
  if(button.dataset.bankAction){bankAction(button.dataset.bankAction).catch(error=>reportActionError(error,origin));return;}
  if(button.dataset.bankAdd){addOwnedItem(Number(button.dataset.bankAdd));return;}
  if(button.dataset.bankClear){update(q=>{q.bank??=emptyBank();delete (state.bankView.group?q.bank.groupManual:q.bank.manual)[button.dataset.bankClear!];});return;}
  if(button.dataset.huntPicker!==undefined){openHuntPicker(button as HTMLButtonElement);return;}
  if(button.dataset.guideLocation){chooseGuideLocation(button.dataset.guideLocation,state.route!=='tutorial',state.route==='tutorial'?state.tutorialProfile!:p());renderContent();$('guide-setup').focus({preventScroll:true});$('guide-setup').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  if(button.dataset.issueRoute){
    state.route=button.dataset.issueRoute;
    if(state.route==='methods'){state.methodAssignment=button.dataset.issueAssignment||state.methodAssignment;methodVariant=button.dataset.issueVariant||'';}
    if(state.route==='account')state.accessSearch=button.dataset.issueFilter||'';
    if(state.route==='settings')state.restrictedAreaQuery=button.dataset.issueFilter||'';
    if(state.route==='tasks')state.taskMaster=button.dataset.issueMaster||state.taskMaster;
    const aid=button.dataset.issueAssignment,field=button.dataset.issueField;
    renderShell();
    let focus:HTMLElement|null=null;
    if(state.route==='account'&&button.dataset.issueUnlock)focus=document.querySelector('[data-fact-toggle="unlocks"][data-key="'+CSS.escape(button.dataset.issueUnlock)+'"]');
    if(state.route==='methods'&&field)focus=document.querySelector('[data-method-field="'+CSS.escape(field)+'"]');
    if(state.route==='settings')focus=document.getElementById('settings-location-pool');
    if(state.route==='plan'&&aid){const i=p().goal.targets.findIndex(t=>t.assignmentId===aid);focus=document.querySelector('[data-target="'+i+'"][data-target-field="variantId"]');}
    if(focus instanceof HTMLSelectElement&&focus.dataset.creatureEnhanced)focus=focus.nextElementSibling as HTMLElement;
    focus?.focus({preventScroll:true});(focus||$('content')).scrollIntoView({block:'start'});return;
  }
  if(button.dataset.setupStep!==undefined){update(q=>q.setup!.step=Number(button.dataset.setupStep));return;}
  if(button.dataset.tutorialMaster){state.tutorialMaster=button.dataset.tutorialMaster;renderContent();return;}
  if(button.dataset.tutorialStrategy){state.tutorialProfile!.strategy=button.dataset.tutorialStrategy as Profile['strategy'];state.tutorialPlans=practicePlans(data,state.tutorialProfile!);renderContent();return;}
  if(button.dataset.teleportToggle){update(q=>{const id=button.dataset.teleportToggle!;const t=TELEPORTS.find(t=>t.id===id)!;setTeleport(q,id,!teleportState(q,t).enabled);});return;}
  if(button.dataset.teleportAuto){update(q=>{if(q.travel)delete q.travel.overrides[button.dataset.teleportAuto!];});return;}
  if(button.dataset.extensionToggle){update(q=>setTaskExtension(q,button.dataset.extensionToggle!,button.dataset.extensionEnabled==='true'));return;}
  if(button.dataset.locationParent){state.restrictedAreaQuery='';state.accessSearch='';renderContent();const target=document.querySelector<HTMLElement>('[data-fact-toggle="access"][data-key="'+CSS.escape(button.dataset.locationParent)+'"]');if(target)focusCorrection(target);return;}
  if(button.dataset.creatureAccessAuto){update(q=>{delete q.access[button.dataset.creatureAccessAuto!];});return;}
  if(button.dataset.factToggle){const kind=button.dataset.factToggle as 'access'|'unlocks',key=button.dataset.key!;update(q=>{if(kind==='access'&&key.startsWith('location:'))setLocationAccess(q,key,(q.restrictBasicAccess?locationAccess(key,q):resolveAccess(key,q)).value!==1);else q[kind][key]=(kind==='access'?resolveAccess(key,q).value:q.unlocks[key])===1?0:1;});return;}
  if(button.dataset.diaryToggle){const key=button.dataset.diaryToggle as keyof Profile['diaries'];update(q=>q.diaries[key]=q.diaries[key]===1?0:1);return;}
  if(button.dataset.booleanToggle){const key=button.dataset.booleanToggle;update(q=>setSetting(q,key,!fieldValue(key)));return;}
  if(button.dataset.accessAuto){update(q=>clearLocationAccess(q,button.dataset.accessAuto!));return;}
  if(button.dataset.route){const deferred=state.route==='setup';if(state.route==='tutorial')endTutorial('skipped');state.route=button.dataset.route;renderShell();if(deferred)state.changed(false);return;}
  if(button.dataset.master){selectMaster(button.dataset.master);return;}
  if(button.dataset.qol){huntAction(button.dataset.qol,button).catch(error=>reportActionError(error,origin));return;}
  if(button.dataset.removeTarget!==undefined){update(q=>q.goal.targets.splice(Number(button.dataset.removeTarget),1));return;}
  if(button.dataset.loadPreset){try{const preset=p().methodPresets[button.dataset.loadPreset],a=data.assignments.find(a=>a.id===state.methodAssignment)!;if(!a.variantIds.includes(preset.variantId))throw Error('This preset is for a different assignment variant.');methodVariant=preset.variantId;update(q=>q.methods[methodKey(a.id,preset.variantId)]=clone(preset));}catch(error){reportActionError(error);}return;}
  if(button.dataset.action)action(button.dataset.action,origin).catch(error=>reportActionError(error,origin));
});
function changeInput(event:Event):void{
  const element=event.target as HTMLInputElement|HTMLSelectElement;
  if(!element.hidden)lastOrigin=captureAction(element,state.route,state.activeId);
  const origin=lastOrigin;
  if(!element.validity.valid){reportActionError(element.validationMessage,origin);return;}
  if(element.id==='account-folder-import'){readAccountFolder(element as HTMLInputElement).catch(error=>exportError(error,origin));return;}
  if(element.id==='export-folder-choice'){if(element.value&&state.exportFolders[element.value])void reviewExportFiles(state.exportFolders[element.value],element.value).catch(error=>exportError(error,origin));return;}
  if(element.id==='account-file-import'){readAccountExports(element as HTMLInputElement).catch(error=>exportError(error,origin));return;}
  if(element.id==='bank-file-import'){readBankFiles(element as HTMLInputElement).catch(error=>reportActionError(error,origin));return;}
  if(element.id==='automatic-app-updates'){desktopUpdates.action('enabled',(element as HTMLInputElement).checked).catch(error=>reportActionError(error,origin));return;}
  if(element.dataset.display){const key=element.dataset.display as keyof DisplaySettings;state.display[key]=(element as HTMLInputElement).checked;try{saveDisplay(state.display);}catch{state.message='Display choices applied for this session only.';}renderShell();return;}
  if(element.id==='bank-slot'){state.bankView.slot=element.value;renderContent();return;}
  if(element.id==='bank-import-kind'){state.bankView.kind=element.value;return;}
  if(element.id==='bank-manual-group'){state.bankView.group=element.value==='group';renderContent();return;}
  if(element.hasAttribute('data-bank-include-group')){update(q=>{q.bank??=emptyBank();q.bank.includeGroup=(element as HTMLInputElement).checked;});return;}
  if(element.dataset.bankQuantity){if(element.value==='')return;const id=element.dataset.bankQuantity;update(q=>{q.bank??=emptyBank();const manual=state.bankView.group?q.bank.groupManual:q.bank.manual;if(element.value==='')delete manual[id];else manual[id]=Number(element.value);},'bank-quantity:'+id);return;}
  if(changeGuide(element,state.route!=='tutorial')){renderContent();return;}
  if(element.id==='hunt-master'){selectMaster(element.value);return;}
  if(element.id==='hunt-preset'){state.selectedPresetId=element.value;if(element.value){try{applyHunt(huntContext(),element.value);}catch(error){reportActionError(error);}}return;}
  if(element.id==='show-unavailable'){
    state.showUnavailable=(element as HTMLInputElement).checked;
    if(!state.showUnavailable&&!canShowAvailableMaster(data,state.plans.find(r=>r.master.id===state.selected),p())){
      state.selected=state.plans.find(r=>canRankPlan(r,p()))?.master.id||state.plans.find(r=>canShowAvailableMaster(data,r,p()))?.master.id||'';
      state.simulation=state.simulations.get(state.selected)||null;state.strategyResults=[];
    }
    if(!saveShowUnavailable(state.showUnavailable)){state.message='Display preference applied for this session; browser storage is unavailable.';renderMessage();}
    renderContent();return;
  }
  if(element.id==='theme-select'){state.theme=themeId(element.value);applyTheme(state.theme);if(!saveTheme(state.theme)){state.message='Theme applied for this session. Browser storage is unavailable.';renderMessage();}return;}
  if(element.id==='preserve-quest-overrides'){state.preserveQuestOverrides=(element as HTMLInputElement).checked;renderContent();return;}
  if(element.id==='quest-file-import'){readQuestFile(element as HTMLInputElement).catch(error=>reportActionError(error,origin));return;}
  if(element.id==='show-travel-completed'){state.display.showCompletedAccess=(element as HTMLInputElement).checked;saveDisplay(state.display);renderContent();return;}
  if(element.id==='profile-select'){resetExportDiscovery();if(state.route==='tutorial')endTutorial('skipped');if(state.route==='setup')state.route='account';state.exportRequest++;state.exportPreview=null;state.bankRequest++;state.bankView.previews=[];state.bankView.levels=null;state.questRequest++;state.questDraft='';state.questPreview=null;state.activeId=element.value;state.selected='';state.changed();return;}
  if(element.id==='task-master'){state.taskMaster=element.value;renderContent();return;}
  if(element.id==='method-assignment'){state.methodAssignment=element.value;methodVariant='';renderContent();return;}
  if(element.id==='method-variant'){methodVariant=element.value;renderContent();return;}
  if(element.id==='compare-profile'){state.comparisonId=element.value;state.comparison=[];renderContent();return;}
  if(element.id==='file-import'){readImport(element as HTMLInputElement).catch(error=>reportActionError(error,origin));return;}
  if(element.dataset.offer!==undefined){update(q=>{const o=q.current.options![Number(element.dataset.offer)]as any,key=element.dataset.offerField!;o[key]=element.type==='checkbox'?(element as HTMLInputElement).checked:element.type==='number'?Number(element.value):element.value;});return;}
  if(element.dataset.target!==undefined){
    const index=Number(element.dataset.target),field=element.dataset.targetField!;
    update(q=>{const t=q.goal.targets[index];if(field==='creature'){setHuntCreature(data,q,index,element.value);}else if(field==='assignmentId'){const a=data.assignments.find(a=>a.id===element.value)!;t.assignmentId=a.id;t.variantId=a.variantIds[0];}else if(field==='variantId')t.variantId=element.value;else t.priority=Number(element.value);});return;
  }
  if(element.dataset.fact){const kind=element.dataset.fact as 'quests'|'unlocks'|'access';update(q=>q[kind][element.dataset.key!]=element.value===''?null:Number(element.value));return;}
  if(element.dataset.preference){update(q=>{if(!element.value)delete q.preferences[element.dataset.preference!];else q.preferences[element.dataset.preference!]=element.value as Profile['preferences'][string];});return;}
  if(element.dataset.block){
    const m=data.masters.find(m=>m.id===element.dataset.masterId)!,id=element.dataset.assignment!;
    update(q=>{const lists=element.dataset.block==='actual'?q.blocks:q.proposed;let items=[...(lists[m.group]||(element.dataset.block==='proposed'?state.plans.find(r=>r.master.id===m.id)?.blocks:[])||[])];items=(element as HTMLInputElement).checked?[...new Set([...items,id])]:items.filter(s=>s!==id);if(items.length>blockSlots(m,q).slots)throw Error('Block list exceeds available slots.');if(items.some(id=>q.goal.targets.some(t=>t.assignmentId===id)))throw Error('A target cannot be blocked. Remove it from the target set first.');lists[m.group]=items;});return;
  }
  if(element.dataset.method){
    const {method,aid}=editedMethod(),field=element.dataset.methodField!;
    if(field==='extended'){update(q=>setTaskExtension(q,aid,(element as HTMLInputElement).checked));return;}
    if(field==='timing'&&(element.value==='kills-hour'||element.value==='task-minutes')&&method.rate<=0){const timing=element.value;requestRate(timing).then(rate=>{if(rate!==null)update(q=>q.methods[element.dataset.method!]={...method,timing,rate});else renderContent();});return;}
    update(q=>{const m=clone(q.methods[element.dataset.method!]||method)as any;if((field==='stackSize'||field==='combatDefence')&&element.value===''){delete m[field];q.methods[element.dataset.method!]=m;return;}m[field]=element.type==='checkbox'?(element as HTMLInputElement).checked:element.type==='number'?(element.value===''?null:Number(element.value)):element.value;q.methods[element.dataset.method!]=m;},element.type==='number'?element.dataset.method+':'+field:'');return;
  }
  if(element.dataset.setting){
    const key=element.dataset.setting,current=fieldValue(key);let value:unknown=element.value;
    if(element.type==='checkbox')value=(element as HTMLInputElement).checked;
    else if(element.type==='number'||typeof current==='number'||key.startsWith('diaries.'))value=element.value===''?null:Number(element.value);
    update(q=>setSetting(q,key,value),element.type==='number'?key:'');
  }
}
document.addEventListener('change',event=>{
  // Numbers are already handled by input. Rebuilding again on blur can remove
  // the button or disclosure the user is clicking before its click arrives.
  if((event.target as HTMLInputElement).type!=='number')changeInput(event);
});
document.addEventListener('input',event=>{
  const element=event.target as HTMLInputElement;
  if(element.id==='bank-query'){state.bankView.query=element.value;const cursor=element.selectionStart;renderContent();const next=$('bank-query') as HTMLInputElement;next.focus();next.setSelectionRange(cursor,cursor);return;}
  if(element.id==='quest-json')state.questDraft=element.value;
  if(element.id==='hunt-task-search'){state.huntSearch=element.value;const plan=state.plans.find(r=>r.master.id===state.selected);if(plan)$('hunt-task-results').innerHTML=renderLookup(data,plan,p(),state.huntSearch);return;}
  if(element.type==='number')changeInput(event);
  if(element.id==='task-search'){state.taskSearch=element.value;const cursor=element.selectionStart;renderContent();const next=$('task-search')as HTMLInputElement;next.focus();next.setSelectionRange(cursor,cursor);}
  if(element.id==='restricted-area-search'){state.restrictedAreaQuery=element.value;const cursor=element.selectionStart;renderContent();const next=$('restricted-area-search')as HTMLInputElement;next.focus();next.setSelectionRange(cursor,cursor);return;}
  if(element.id==='access-search'){state.accessSearch=element.value;const cursor=element.selectionStart;renderContent();const next=$('access-search')as HTMLInputElement;next.focus();next.setSelectionRange(cursor,cursor);}
});
async function readQuestFile(input:HTMLInputElement):Promise<void>{
  const file=input.files?.[0];if(!file)return;const request=++state.questRequest;state.questPreview=null;renderContent();if(file.size>2_000_000)throw Error('Quest file exceeds 2 MB.');
  const profileId=state.activeId,text=await file.text(),preview=parseQuestImport(data,text);
  if(request!==state.questRequest)return;
  if(state.activeId!==profileId)throw Error('Active character changed. Select the quest file again.');
  state.questDraft='';state.questPreview=preview;state.preserveQuestOverrides=true;renderContent();
}
async function readImport(input:HTMLInputElement):Promise<void>{
  const file=input.files?.[0];if(!file)return;if(file.size>2_000_000)throw Error('Profile file exceeds 2 MB.');
  const text=await file.text();let imported;
  try{imported=importProfiles(data,text);}catch(error){
    if(!String(error).includes('explicitly rebase'))throw error;
    const payload=JSON.parse(text),versions=[...new Set(payload.profiles.map((q:any)=>q.dataVersion+(q.areaDataVersion?' / areas '+q.areaDataVersion:'')))];
    const answer=await requestName(`Review data change: ${versions.join(', ')} to ${data.version}. Existing IDs and methods will be validated. Type REBASE to import copies.`, '');
    if(answer!=='REBASE')return;imported=rebaseProfiles(data,text);
  }
  if(customProfileCount(state.profiles)+imported.profiles.length>MAX_CUSTOM_PROFILES)throw Error('Import would exceed 50 custom characters.');
  for(const q of imported.profiles){if(state.profiles.some(p=>p.id===q.id)){q.id=newProfile(data).id;q.name=(q.name+' (imported)').slice(0,100);}state.profiles.push(q);}
  state.questRequest++;state.questDraft='';state.questPreview=null;state.activeId=imported.profiles[0].id;state.message='Imported characters as copies. Existing characters were preserved.';state.changed();
}

function addOwnedItem(id:number):void{
 id=canonicalInventoryId(id);
 const input=$('bank-add-quantity') as HTMLInputElement;lastOrigin=captureAction(input,state.route,state.activeId);if(!input.validity.valid){reportActionError(input.validationMessage);return;}
 const quantity=Number(input.value);if(!Number.isSafeInteger(quantity)||quantity<1){reportActionError('Enter a whole positive quantity.');return;}
 update(q=>{q.bank??=emptyBank();const bank=q.bank,group=state.bankView.group;
  q.combat??={...defaultCombat(),enabled:true};
  const current=group?(bank.groupManual[id]??bank.snapshots.group_storage?.items[id]??0):(ownedQuantities({...bank,includeGroup:false})[id]||0);
  (group?bank.groupManual:bank.manual)[id]=current+quantity;
 });
}
async function readBankFiles(input:HTMLInputElement):Promise<void>{
 const files=Array.from(input.files||[]);if(!files.length)return;if(files.length>6)throw Error('Choose at most six export files.');
 const profileId=state.activeId,request=++state.bankRequest,previews:BankPreview[]=[];let levels:Record<string,number>|null=null,account:string|null=null;
 for(const file of files){
  if(file.size>5_000_000)throw Error('Export file exceeds 5 MB.');const text=await file.text();
  if(file.name.toLowerCase()==='character.json'){if(levels)throw Error('Choose one character file.');const parsed=parseCharacterLevels(text);levels=parsed.levels;account=parsed.account;}
  else {const preview=parseBankImport(text,state.bankView.kind==='auto'?undefined:state.bankView.kind as BankKind);if(previews.some(p=>p.kind===preview.kind))throw Error('Choose one file per container.');previews.push(preview);}
 }
 if(request!==state.bankRequest||state.activeId!==profileId)throw Error('Active character changed; choose the exports again.');
 state.bankView.previews=previews;state.bankView.levels=levels;state.bankView.account=account;state.bankPreviewProfile=profileId;renderContent();
}
async function bankAction(name:string):Promise<void>{
 if(name==='choose'){($('bank-file-import') as HTMLInputElement).value='';$('bank-file-import').click();return;}
 if(name==='recalculate'){state.changed(false);}
  if(name==='cancel'){state.bankView.previews=[];state.bankView.levels=null;renderContent();return;}
 if(name==='apply'){
  if(state.bankPreviewProfile!==state.activeId)throw Error('Review the import again for this character.');
  const timing=($('bank-enable-timing') as HTMLInputElement).checked;
  const levels=state.bankView.levels,previews=state.bankView.previews;
  const applied=update(q=>Object.assign(q,applyBankSnapshots(q,previews,levels,state.bankView.account,timing),{negativeUnknowns:true,assumeUnknown:false}));
  if(applied){state.bankView.previews=[];state.bankView.levels=null;renderContent();}
 }
}
function renderCombatCoverage(plan:Plan|undefined):string{
 if(!plan||!p().combat?.enabled&&!plan.rows.some(row=>row.method.useSelectedGear))return '';
 const calculated=plan.rows.filter(row=>row.method.calculated),fallback=plan.rows.filter(row=>!row.method.calculated);
 return `<section class="notice combat-coverage"><strong>Combat timing: ${calculated.length} methods from ${p().assumeAllGear?'assumed gear':'owned gear'} · ${fallback.length} configured methods</strong><p class="small muted">${state.busy.combat?'Background DPS is running. Unfinished automatic methods use provisional 5 DPS; tables refresh as results arrive. ':''}Expected hit-distribution kill times use your combat settings. Measured rates and boss/switch encounters retain configured timing.</p>${fallback.length?`<details><summary>Review configured timing fallbacks</summary><ul>${fallback.map(row=>`<li>${assignmentName(data,row.id,row.name)} / ${creatureName(row.variant.id,row.variant.name)}: ${esc(row.method.combatNote||'Measured or manual method.')} <button data-issue-route="methods" data-issue-assignment="${esc(row.id)}" data-issue-variant="${esc(row.variant.id)}">Review method</button></li>`).join('')}</ul></details>`:''}</section>`;
}
function renderMethodCombat(v:typeof data.variants[number],method:Method,assignment:string):string{
 return renderMethodCombatStatus(p(),method,methodPreview.get(p(),assignment,v,method));
}

state.gearKey=gearSignature(p(),guideState);renderShell();state.warmCombat();if(state.firstLaunch)void welcome();else if(p().setup?.complete&&p().setup?.tutorial==='pending')startTutorial();else if(state.route!=='setup'){state.run('plans','plans',p());renderStatus();}

async function createCharacter():Promise<void>{
 const result=await requestCharacter();if(!result)return;if(state.route==='tutorial')endTutorial('skipped');
 state.exportRequest++;state.exportPreview=null;state.route=result.wizard?'setup':'account';addProfile(newCharacter(data,result.name,result.wizard));
 try{localStorage.setItem('slayer-welcome-v1','chosen');}catch{/* Existing storage warning covers persistence. */}
}
async function welcome():Promise<void>{
 const choice=await requestFirstLaunch();if(choice==='create')await createCharacter();
 else if(choice==='maxed'){try{localStorage.setItem('slayer-welcome-v1','chosen');}catch{/* Session remains usable. */}startTutorial();}
}
function resetExportDiscovery():void{
 state.exportRequest++;state.exportPreview=null;state.exportFolders={};state.exportDiscovery={busy:false,message:'',folders:[]};
}
function exportError(error:unknown,origin=lastOrigin):void{
 state.exportDiscovery.busy=false;state.exportDiscovery.message=error instanceof Error?error.message:String(error);renderContent();reportActionError(error,origin);
}
async function findAccountExports(mode:'auto'|'choose'):Promise<void>{
 const origin=lastOrigin;
 const desktop=window.slayerDesktop?.characterExports;if(!desktop)return;
 const characterId=state.activeId,request=++state.exportRequest;state.exportSearched.add(characterId);state.exportPreview=null;state.exportFolders={};state.exportDiscovery={busy:true,message:mode==='auto'?'Searching RuneLite exports; select a character folder if the picker opens…':'Choose your RuneLite character folder…',folders:[]};renderContent();
 try{
  const found=await desktop(mode);
  if(characterId!==state.activeId||request!==state.exportRequest)return;
  if(!found){state.exportDiscovery={busy:false,message:'No folder selected. Choose a character folder or try searching again.',folders:[]};renderContent();return;}
  state.exportPreview=parseAccountExports(data,found.files);state.exportDiscovery={busy:false,message:(found.source==='automatic'?'Automatically found ':'Selected ')+found.folder+'. Review the exports below before importing.',folders:[]};renderContent();
 }catch(error){if(characterId===state.activeId&&request===state.exportRequest)exportError(error,origin);}
}
async function reviewExportFiles(files:File[],folder=''):Promise<void>{
 const origin=lastOrigin;
 const characterId=state.activeId,request=++state.exportRequest;state.exportPreview=null;
 if(!files.length||files.length>10||files.reduce((n,f)=>n+f.size,0)>20_000_000)throw Error('Choose 1–10 export files totalling at most 20 MB.');
 if(files.some(file=>file.size>5_000_000))throw Error('Each export must be at most 5 MB.');
 state.exportDiscovery.busy=true;state.exportDiscovery.message='Reading selected exports…';renderContent();
 try{
  const exports=await Promise.all(files.map(async file=>({name:file.name,text:await file.text()})));
  if(characterId!==state.activeId||request!==state.exportRequest)return;
  state.exportPreview=parseAccountExports(data,exports);state.exportFolders={};state.exportDiscovery={busy:false,message:folder?'Selected '+folder+'. Review the exports below.':'Selected export files are ready for review.',folders:[]};renderContent();
 }catch(error){if(characterId===state.activeId&&request===state.exportRequest)exportError(error,origin);}
}
async function readAccountExports(input:HTMLInputElement):Promise<void>{
 const files=[...(input.files||[])];input.value='';if(files.length)await reviewExportFiles(files);
}
async function readAccountFolder(input:HTMLInputElement):Promise<void>{
 const files=[...(input.files||[])];input.value='';if(!files.length)return;resetExportDiscovery();
 const groups=groupExportFolders(files.map(file=>({name:file.name,relativePath:file.webkitRelativePath})));state.exportFolders=Object.fromEntries(Object.entries(groups).map(([folder,indexes])=>[folder,indexes.map(i=>files[i])]));
 const folders=Object.keys(groups).sort();
 if(!folders.length)throw Error('No character export files found. Choose the character subfolder containing character.json or bank.json.');
 if(folders.length===1){await reviewExportFiles(state.exportFolders[folders[0]],folders[0]);return;}
 state.exportRequest++;state.exportPreview=null;state.exportDiscovery={busy:false,message:'Several exported characters found. Select one below; other characters’ file contents are not read.',folders};renderContent();
}

function startTutorial():void{
 for(const channel of [...state.workers.keys()])if(channel!=='combat')state.cancel(channel);state.warmCombat();state.guideBeforeTutorial=clone(guideState);state.tutorialProfile=practiceCharacter(data);state.tutorialPlans=practicePlans(data,state.tutorialProfile);state.tutorialStep=0;state.tutorialMaster='duradel';state.route='tutorial';state.message='';renderShell();
}
function endTutorial(status:'complete'|'skipped'):void{
 if(state.guideBeforeTutorial){Object.assign(guideState,state.guideBeforeTutorial);try{localStorage.setItem(GUIDE_KEY,JSON.stringify(guideState));}catch{/* Display persistence is optional. */}state.guideBeforeTutorial=undefined;}
 if(p().setup){p().setup!.tutorial=status;state.persist();}state.tutorialProfile=undefined;state.route='plan';state.changed(false);
}
async function onboardingAction(name:string):Promise<boolean>{
 if(name==='refresh-access-checks'){resetAccessChecklist();renderContent();return true;}
 if(name==='resume-setup'){resetExportDiscovery();state.exportSearched.delete(state.activeId);state.exportRequest++;state.exportPreview=null;for(const channel of [...state.workers.keys()])if(channel!=='combat')state.cancel(channel);state.route='setup';update(q=>{q.setup??={version:2,step:0,complete:false,imports:[],tutorial:'pending'};q.setup.complete=false;});return true;}
 if(name==='pause-setup'){state.route='account';state.changed(false);return true;}
 if(name==='find-account-exports'){if(state.route!=='setup'){resetExportDiscovery();state.exportSearched.delete(state.activeId);state.route='setup';update(q=>{q.setup??={version:2,step:1,complete:false,imports:[],tutorial:'pending'};q.setup.step=1;q.setup.complete=false;});if(!window.slayerDesktop?.characterExports)($('account-folder-import')as HTMLInputElement).click();}else void findAccountExports('auto');return true;}
 if(name==='choose-account-folder'){if(window.slayerDesktop?.characterExports)void findAccountExports('choose');else ($('account-folder-import')as HTMLInputElement).click();return true;}
 if(name==='choose-account-exports'){($('account-file-import')as HTMLInputElement).click();return true;}
 if(name==='cancel-account-exports'){resetExportDiscovery();state.exportDiscovery.message='Review cancelled. Choose a folder or search again.';renderContent();return true;}
 if(name==='apply-account-exports'&&state.exportPreview){const preview=state.exportPreview;const applied=update(q=>{Object.assign(q,applyAccountExports(data,q,preview,new Date().toISOString()));if(q.setup)q.setup.imports=[...new Set([...q.setup.imports,...preview.files])];});if(applied){state.exportPreview=null;state.message='Character exports imported. Manual overrides and owned-item edits were preserved.';renderContent();renderMessage();}return true;}
 if(name==='setup-next'||name==='setup-back'){update(q=>{if(name==='setup-next'){if(q.setup!.step===2)acceptSetupDefaults(data,q,'combat');if(q.setup!.step===3)acceptSetupDefaults(data,q,'rewards');}q.setup!.step=Math.max(0,Math.min(6,q.setup!.step+(name==='setup-next'?1:-1)));});return true;}
 if(name==='finish-setup'){if(update(q=>{q.setup!.complete=true;q.setup!.tutorial='pending';}))startTutorial();return true;}
 if(name==='start-tutorial'){startTutorial();return true;}
 if(name==='skip-tutorial'||name==='finish-tutorial'||name==='apply-tutorial-hunt'){
  if(name==='apply-tutorial-hunt'){const copy=clone(p());applyPracticeHunt(copy);state.profiles[state.profiles.findIndex(q=>q.id===state.activeId)]=validateProfile(data,copy);}
  endTutorial(name==='skip-tutorial'?'skipped':'complete');return true;
 }
 if(name==='tutorial-next'||name==='tutorial-back'){
  state.tutorialStep=Math.max(0,Math.min(7,state.tutorialStep+(name==='tutorial-next'?1:-1)));
  if(state.tutorialStep>=4){state.tutorialProfile!.strategy='funded';state.tutorialMaster='duradel';state.tutorialPlans=practicePlans(data,state.tutorialProfile!);}
  if(state.tutorialStep===7){Object.assign(guideState,{variantId:'basilisk-knight',assignmentId:'basilisks',formId:GUIDE.records['basilisk-knight'].defaultForm,approach:'auto',priority:'balanced',onTask:true,fastTravel:false,location:'',stackSize:undefined});}
  renderContent();window.scrollTo({top:0});return true;
 }
 return false;
}
