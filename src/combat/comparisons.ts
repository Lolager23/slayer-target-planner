import {combatCandidate} from './combat-impact';
import {filterStrictUpgrades,compareGearRows} from './strict-upgrades';
import {weaponSupportsFamily,weaponStylesForFamily} from './weapon-family';
import type {Profile} from '../domain/types';
import type {GuideState,Family} from '../guide/types';
import type {CombatResult,EquipmentItem,EquipmentSlot} from './types';
import {GUIDE,guideForm,fightPlan,selectedLocation} from '../guide/model';
import {availableItems} from './availability';
import {ownedItems,equipmentItem,canEquip,itemRequirements} from './equipment';
import {calculateCombat,isWildernessCombat,candidateSpells} from './calculate';
import {bestOwnedGear,requirementSlots,usableAmmo} from './optimise';
import {defenceScore} from './armour';
import {applyAreaDamage} from './area-damage';
import {isBlowpipe,rangedWeaponCandidates,rangedAmmoCandidates} from './ranged';

export interface GearComparisonRow {upgrade?:string;id:number;name:string;ammoId?:number;selected:boolean;owned:boolean;dps:number|null;aggregateDps:number|null;delta:number|null;prayer:number;defensive:Record<string,number>;defence:number;reason:string}
export interface GearComparison {outclassed?:GearComparisonRow[];assumed?:boolean;rebuildsWeapons?:boolean;slot:EquipmentSlot;selectedId:number;reason:string;context:string;notes:string;rows:GearComparisonRow[]}
interface ComparisonOptions {rebuildWeapons?:boolean;progress?:(done:number,total:number,current:string)=>void}

/** Ranged weapon comparisons pair compatible ammunition; protection stays required. */
export function compareOwnedSlot(p:Profile,state:GuideState,result:CombatResult,slot:EquipmentSlot,options:ComparisonOptions={}):GearComparison{
 const record=GUIDE.records[state.variantId],form=guideForm(record,state),location=selectedLocation(record,form,state,p);
 const required=requirementSlots(record,state,location,p),selectedId=result.loadout[slot]||0;
 const fallback=result.armourFallback?.includes(slot),priority=result.armourPriority==='prayer'?'prayer bonus, then relevant defence':'relevant defence, then prayer bonus';
 let reason=p.gearOverrides?.[record.id]?.[result.family as Family]?.[slot]===selectedId?'You selected this item for this creature/style. It is held fixed while the other slots are optimised. Reset this style’s gear choices to return to automatic selection.':required[slot]?'Required creature or location protection takes priority over DPS.':result.source==='example'?'Curated tier/style template, rather than a search of your bank. The comparison shows whether your available alternatives improve this example setup.':fallback?'This slot was not a DPS upgrade. Selected for '+priority+' from style-compatible available armour (or the least accuracy penalty when none is compatible).':'Selected by the bounded DPS search, with '+priority+' breaking equal-DPS ties.';
 const rangedWeapon=slot==='weapon'&&result.family==='ranged';
 const rebuildsWeapons=slot==='weapon'&&result.source==='bank'&&options.rebuildWeapons===true;
 const evaluate=(item:EquipmentItem,ammoId?:number):{dps:number|null;aggregateDps:number|null;reason:string}=>{
  if(!canEquip(item,p)){
   const requirements=itemRequirements(item),missing=requirements&&Object.entries(requirements).filter(([skill,level])=>(p.levels[skill]??0)<level).map(([skill,level])=>skill+' '+level);
   return {dps:null,aggregateDps:null,reason:missing?'Requires '+missing.join(', ')+'.':'Unreviewed skill requirements are disabled.'};
  }
  if(required[slot]&&!required[slot]!(item))return {dps:null,aggregateDps:null,reason:'Does not provide the required creature/location protection or weapon.'};
  if(rebuildsWeapons){
   // Mirror Use item without mutating the character. Explicit pins survive;
   // optional off-hands, armour and attack style follow the same bounded search.
   const family=result.family as Family,pins={...p.gearOverrides?.[record.id]?.[family],weapon:item.id};
   if(ammoId)pins.ammo=ammoId;else delete pins.ammo;
   if(item.isTwoHanded)delete pins.shield;
   const preview={...p,gearOverrides:{...p.gearOverrides,[record.id]:{...p.gearOverrides?.[record.id],[family]:pins}}};
   const priority=result.armourPriority??fightPlan(record,form,state,location).defence;
   const best=bestOwnedGear(preview,record,form,{...state,approach:(family+'-'+priority) as GuideState['approach']},location,priority);
   return best.supported?{dps:best.dps,aggregateDps:best.aggregateDps??best.dps,reason:best.style.type+' / '+best.style.stance+(best.spell?' / '+best.spell:'')+'. Equipped setup preview; other unpinned slots re-optimised'+(ammoId?' with '+equipmentItem(ammoId)!.name:'')+'.'}:{dps:null,aggregateDps:null,reason:best.reason};
  }
  const loadout={...result.loadout,[slot]:item.id};
  if(rangedWeapon){if(ammoId)loadout.ammo=ammoId;else delete loadout.ammo;}
  const weapon=equipmentItem(loadout.weapon||0),ammo=equipmentItem(loadout.ammo||0);
  const removeShield=slot==='weapon'&&weapon?.isTwoHanded&&loadout.shield&&!required.shield;
  if(removeShield)delete loadout.shield;
  if(weapon?.isTwoHanded&&loadout.shield)return {dps:null,aggregateDps:null,reason:'Two-handed weapon conflicts with the equipped off-hand. Other slots are held fixed.'};
  if(ammo&&weapon&&!usableAmmo(weapon,ammo,result.family))return {dps:null,aggregateDps:null,reason:'Ammunition is incompatible with this weapon/style.'};
  const styles=slot==='weapon'?weaponStylesForFamily(item,result.family).filter(s=>!/defensive|longrange/i.test(s.stance)):[result.style];
  const spells=slot==='weapon'&&result.family==='magic'&&!/Powered/i.test(item.category)?candidateSpells(p):[slot==='weapon'?null:result.spell];
  let best:CombatResult|undefined,issue='No attack style in the selected combat family.';
  for(const style of styles)for(const spell of spells){
   const trial=applyAreaDamage(calculateCombat(p,record,form,{...loadout},style,spell,state.onTask,isWildernessCombat(record,location),false),record,location,state.stackSize);
   if(!trial.supported){issue=trial.reason;continue;}
   if(!best||(trial.aggregateDps??trial.dps)>(best.aggregateDps??best.dps))best=trial;
  }
  return best?{dps:best.dps,aggregateDps:best.aggregateDps??best.dps,reason:slot==='weapon'?best.style.type+' / '+best.style.stance+(best.spell?' / '+best.spell:'')+'. '+(rangedWeapon?(ammo?'With '+ammo.name+'. ':'No external ammunition needed. ')+(removeShield?'Optional off-hand removed for this two-handed weapon. ':''):'')+'Best supported attack/spell within '+result.family+'; remaining gear held fixed.':'Other slots, attack style and spell held fixed.'}:{dps:null,aggregateDps:null,reason:issue};
 };
 const actualOwned=new Set(ownedItems(p).map(item=>item.id));
 const relevant=(item:EquipmentItem)=>combatCandidate(item,required[item.slot]?.(item));
 const combatItems=availableItems(p).filter(relevant);
 const available=combatItems.filter(item=>slot!=='weapon'||weaponSupportsFamily(item,result.family)),usable=combatItems.filter(item=>canEquip(item,p));
 const currentWeapon=equipmentItem(result.loadout.weapon||0);
 const owned=rangedWeapon?rangedWeaponCandidates(available.filter(item=>item.slot==='weapon'),item=>canEquip(item,p)):slot==='ammo'&&isBlowpipe(currentWeapon)?available.filter(item=>usableAmmo(currentWeapon,item,'ranged')):available.filter(item=>item.slot===slot),selectedItem=equipmentItem(selectedId);
 const items=selectedItem&&relevant(selectedItem)&&(slot!=='weapon'||weaponSupportsFamily(selectedItem,result.family))&&!owned.some(item=>item.id===selectedId)?[selectedItem,...owned]:owned;
 const rows=items.flatMap((item,index)=>{
  options.progress?.(index,items.length,item.name);
  const ammoOptions:(number|undefined)[]=rangedWeapon?rangedAmmoCandidates(usable,item).map(ammo=>ammo.id):[undefined];
  if(rangedWeapon&&item.id===selectedId&&result.loadout.ammo&&!ammoOptions.includes(result.loadout.ammo))ammoOptions.unshift(result.loadout.ammo);
  return (ammoOptions.length?ammoOptions:[undefined]).map(ammoId=>{
  const selected=item.id===selectedId&&(!rangedWeapon||ammoId===result.loadout.ammo),value=selected?{dps:result.dps,aggregateDps:result.aggregateDps??result.dps,reason:'Equipped recommendation.'}:evaluate(item,ammoId);
  return {id:item.id,name:item.name,ammoId,selected,owned:actualOwned.has(item.id)&&(!ammoId||actualOwned.has(ammoId)),...value,delta:value.dps===null?null:value.dps-result.dps,prayer:item.bonuses.prayer,defensive:{...item.defensive},defence:defenceScore(item,form)};
  });
 }).sort(compareGearRows);
 options.progress?.(items.length,items.length,'Comparison complete');
 const filtered=filterStrictUpgrades(rows,p.assumeAllGear===true);
 if(!p.gearOverrides?.[record.id]?.[result.family as Family]?.[slot]&&!required[slot]&&!fallback&&result.source!=='example'){
  const bestAlternative=rows.filter(row=>!row.selected&&row.dps!==null).sort((a,b)=>(b.aggregateDps??0)-(a.aggregateDps??0))[0];
  reason+=!bestAlternative?' No other available item can be used in this setup.':(bestAlternative.aggregateDps??0)>(result.aggregateDps??result.dps)+1e-10?' A '+(rebuildsWeapons?'rebuilt weapon setup':rangedWeapon?'weapon/ammo combination':'one-slot swap')+' with '+bestAlternative.name+' scores higher; the bounded search missed this alternative.':' Best usable alternative: '+bestAlternative.name+' ('+bestAlternative.dps!.toFixed(3)+' single-target DPS).';
 }
 return {...filtered,slot,selectedId,reason,rebuildsWeapons,assumed:p.assumeAllGear===true,context:(p.assumeAllGear?'All gear assumed · ':'')+record.name+' / '+form.label+' · '+(location?.name||'default location'),notes:'Cosmetic and skilling-only gear without beneficial combat bonuses or a reviewed combat effect is omitted. Required protection and zero-stat combat effects are retained; this does not change bank records. DPS is the whole setup with this item, not damage attributable to the item alone. Defence relevance averages bonuses against the listed NPC attacks ('+(form['attack style']||'unknown: all five')+'); it is not a damage-taken model. Weapon alternatives are filtered to the selected combat family; generic manual casting and incidental staff bash attacks are excluded. Alternatives are available gear in this slot; assumed gear is not a bank-ownership claim. Quest/diary item unlocks and charges still need review. '+(rebuildsWeapons?'Weapon rows preview the same bounded rebuild as Use item: your other explicit choices remain pinned, and unpinned armour/off-hands are re-optimised. ':'Other gear is held fixed; ')+'Ranged weapons use compatible available ammunition and remove an optional off-hand for two-handed weapons. The best usable ordinary Rune-or-lower crossbow is retained alongside Dragon/higher and distinct ammunition families. Crossbows evaluate their strongest non-enchanted bolt by Ranged strength plus every available compatible enchanted bolt; blowpipes load their strongest compatible unpoisoned dart. Two-handed weapon swaps remove an optional off-hand in every combat style; required protection remains mandatory. Weapon swaps try supported attacks/spells within the chosen combat family. Non-degrading, non-consumable stat gear with a strict usable upgrade is hidden by default: no worse combat bonuses, speed, weight or setup DPS, with at least one improvement. Unknown/special utility, protection, set effects, charges, consumables and the shown item are retained. Expand the hidden items to make an intentional downgrade. After the shown setup, rows rank by aggregate DPS, prayer, then average defence against the listed NPC attack types.'+(rebuildsWeapons?'':' A complete rebuild may produce a different ranking.')};
}
