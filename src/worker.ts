import {workerPublisher} from './worker-messages';
import {deferCombatTiming} from './combat/timing';
import {withPlanReview} from './analysis/plan-review';
import {gearAffectedMasters} from './combat/gear-selection';
import {calculateGuideCombat} from './combat/guide';
import {calculateMethodPreview} from './combat/method-preview';
import type {GuideState} from './guide/types';
import type {CombatResult,EquipmentSlot} from './combat/types';
import {compareOwnedSlot} from './combat/comparisons';
import {preparePriorityCombat,prioritisedMasters} from './combat/priority';
import {combatIdentity,type CombatCacheSnapshot} from './combat/cache';
import {observeCombatCache,restoreCombatCache} from './combat/optimise';
import {catalogue,evaluate,optimise,simulate,searchHunt,prepareRows} from './core';
import {withExtensionComparisons} from './analysis/extensions';
import type {Profile} from './domain/types';
self.onmessage=(event:MessageEvent)=>{
  const publish=workerPublisher(message=>self.postMessage(message));
  const reviewed=(plan:ReturnType<typeof evaluate>,p:Profile)=>withPlanReview(catalogue,withExtensionComparisons(catalogue,plan,p),p);
  const {id,kind,profile,masterId,blocks,guide,guideFirst,combat,slot,combatCache,assignmentId,variantId,variantIds,provisionalCombat}=event.data as {id:number;kind:string;profile:Profile;masterId?:string;blocks?:string[];guide?:GuideState;guideFirst?:boolean;combat?:CombatResult;slot?:EquipmentSlot;combatCache?:CombatCacheSnapshot;assignmentId?:string;variantId?:string;variantIds?:string[];provisionalCombat?:boolean};
  try{
    restoreCombatCache(profile,combatCache);
    deferCombatTiming(provisionalCombat===true);
    const identity=combatIdentity(profile);let calculated=0;
    observeCombatCache((signature,key,result)=>{if(signature===identity){calculated++;publish({id,kind:'combat-cache',key,result});}});
    if(kind==='combat-warmup'){
      const offset=preparePriorityCombat(catalogue,profile,guide,guideFirst===true,(done,total,current)=>publish({id,kind:'progress',done,total:total+catalogue.masters.reduce((n,m)=>n+m.tasks.length,0),current}),result=>publish({id,kind:'priority-gear',result}));
      const total=offset+catalogue.masters.reduce((n,m)=>n+m.tasks.length,0);let done=offset;
      for(const master of prioritisedMasters(catalogue,profile)){
        prepareRows(catalogue,master,profile,(n,count,current)=>publish({id,kind:'progress',done:done+master.tasks.length*n/Math.max(1,count),total,current:'Background DPS / '+master.name+' / '+current}));
        done+=master.tasks.length;
      }
      publish({id,kind,combatCalculated:calculated});
    }else if(kind==='method-timing'){
      const name=catalogue.variants.find(v=>v.id===variantId)?.name||'selected method';
      publish({id,kind:'progress',done:0,total:1,current:'Calculating '+name+' / selected completion method'});
      const result=calculateMethodPreview(catalogue,profile,assignmentId!,variantId!);
      publish({id,kind:'progress',done:1,total:1,current:name+' / method ready'});
      publish({id,kind,result});
    }else if(kind==='gear-detail'){
      publish({id,kind,result:compareOwnedSlot(profile,guide!,combat!,slot!,{rebuildWeapons:true,progress:(done,total,current)=>publish({id,kind:'progress',done,total,current:'Comparing gear / '+current})})});
    }else if(kind==='gear'){
      const result=calculateGuideCombat(profile,guide!, (done,current)=>publish({id,kind:'progress',done,total:5,current}));
      publish({id,kind:'gear',result});
    }else if(kind==='gear-selection'){
      const ids=new Set((variantIds?.length?variantIds:[variantId!]).flatMap(variant=>gearAffectedMasters(catalogue,profile,variant).map(master=>master.id)));
      const masters=catalogue.masters.filter(master=>ids.has(master.id));
      const result=calculateGuideCombat(profile,guide!,(done,current)=>publish({id,kind:'progress',done,total:5+masters.length,current}));
      publish({id,kind:'priority-gear',result});
      const plans=[];
      for(const [index,master]of masters.entries()){
        const plan=optimise(catalogue,master,profile,master.id==='mortimer'?60:250,(fraction,current)=>publish({id,kind:'progress',done:5+index+fraction,total:5+masters.length,current:master.name+' / '+current}));
        plans.push(reviewed(plan,profile));
        publish({id,kind:'plan-ready',plan:plans[plans.length-1]});
      }
      publish({id,kind,plans,combatCalculated:calculated});
    }else if(kind==='plans'){
      const offset=provisionalCombat?0:preparePriorityCombat(catalogue,profile,guide,guideFirst===true,(done,total,current)=>publish({id,kind:'progress',done,total,current}),result=>publish({id,kind:'priority-gear',result}));
      const plans=[],total=offset+catalogue.masters.length;
      for(const [index,master]of prioritisedMasters(catalogue,profile).entries()){
        publish({id,kind:'progress',done:offset+index,total,current:master.name+' / preparing methods'});
        const plan=optimise(catalogue,master,profile,master.id==='mortimer'?60:250,(fraction,current)=>publish({id,kind:'progress',done:offset+index+.9*fraction,total,current:master.name+' / '+current}));
        publish({id,kind:'progress',done:offset+index+.9,total,current:master.name+' / Comparing task extensions'});
        plans.push(reviewed(plan,profile));
        publish({id,kind:'plan-ready',plan:plans[plans.length-1]});
        publish({id,kind:'progress',done:offset+plans.length,total,current:master.name+' / finished'});
      }
      publish({id,kind:'plans',plans,combatCalculated:calculated,combatRestored:combatCache?.identity===identity?combatCache.entries.length:0});
    }else if(kind==='hunt'){const master=catalogue.masters.find(m=>m.id===masterId)!;publish({id,kind:'progress',done:0,total:1,current:'Preparing full-hunt search / '+master.name});const found=searchHunt(catalogue,master,profile,(done,total)=>publish({id,kind:'progress',done,total,current:'Searching full-hunt block candidates'}));found.plan=reviewed(found.plan,profile);publish({id,kind:'hunt',...found,masterId});
    }else if(kind==='strategies'){
      const master=catalogue.masters.find(m=>m.id===masterId)!;
      const strategies=['none','sustainable','funded','boost-turael','boost-mazchna','reset-turael'] as const,results=[];
      for(const strategy of strategies){
        try{const scenario={...profile,strategy};const index=results.length;publish({id,kind:'progress',done:index,total:strategies.length,current:'Preparing strategy / '+strategy});const plan=optimise(catalogue,master,scenario,50,(fraction,current)=>publish({id,kind:'progress',done:index+.25*fraction,total:strategies.length,current:strategy+' / '+current}));results.push({strategy,result:simulate(catalogue,plan,scenario,done=>publish({id,kind:'progress',done:index+.25+.75*done/scenario.simulation.trials,total:strategies.length,current:'Simulating / '+strategy}))});}
        catch(error){results.push({strategy,error:error instanceof Error?error.message:String(error)});}
        publish({id,kind:'progress',done:results.length,total:strategies.length,current:'Strategy / '+strategy});
      }
      publish({id,kind:'strategies',results});
    }else{
      const master=catalogue.masters.find(m=>m.id===masterId)!;
      const preparing=(fraction:number,current:string)=>publish({id,kind:'progress',done:.2*fraction*profile.simulation.trials,total:profile.simulation.trials,current:master.name+' / '+current});
      const plan=blocks?evaluate(catalogue,master,profile,blocks,'Evaluated configuration',false,prepareRows(catalogue,master,profile,(done,total,current)=>preparing(done/Math.max(1,total),'Gear / '+current))):optimise(catalogue,master,profile,master.id==='mortimer'?60:250,preparing);
      const result=simulate(catalogue,plan,profile,done=>publish({id,kind:'progress',done:.2*profile.simulation.trials+.8*done,total:profile.simulation.trials,current:'Simulating hunt trials'}));
      publish({id,kind:'simulation',result,masterId});
    }
  }catch(error){publish({id,kind:'error',message:error instanceof Error?error.message:String(error)});}
  finally{observeCombatCache(undefined);deferCombatTiming(false);}
};
