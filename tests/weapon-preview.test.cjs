const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{buildSync}=require('esbuild');
const c=require('../.desktop-build/core.cjs'),g=require('../.desktop-build/guide.cjs'),d=c.catalogue;
const item=name=>{const i=c.itemForLabel(name);assert.ok(i,name);return i.id;};
function fixture(names,variant='cerberus',family='melee'){
 const p=c.maxedProfile(d);p.assumeAllGear=false;p.bank=c.emptyBank();p.combat={...c.defaultCombat(),enabled:true};
 for(const name of names)p.bank.manual[item(name)]=1;
 const record=g.GUIDE.records[variant],state={...g.defaultGuideState(),variantId:variant,formId:record.defaultForm,approach:family+'-prayer'},form=g.guideForm(record,state),location=g.selectedLocation(record,form,state,p);
 const best=()=>c.bestOwnedGear(p,record,form,state,location),compare=r=>c.compareOwnedSlot(p,state,r,'weapon',{rebuildWeapons:true});
 return {p,record,state,form,location,family,best,compare};
}
const allRows=comparison=>[...comparison.rows,...comparison.outclassed||[]];
function equip(t,result,row){c.selectCreatureGear(d,t.p,t.state,result,{family:t.family,slot:'weapon',id:row.id,ammoId:row.ammoId});return t.best();}

test('Cerberus Emberlight preview matches equipping it, including the defender and other unpinned gear',()=>{
 const t=fixture(['Scythe of Vitur','Emberlight','Avernic defender','Ferocious gloves','Barrows gloves',"Inquisitor's plateskirt",'Sunfire fanatic chausses']);
 t.p.gearOverrides={cerberus:{melee:{weapon:item('Scythe of Vitur')}}};
 const before=JSON.stringify(t.p),r=t.best(),fixed=allRows(c.compareOwnedSlot(t.p,t.state,r,'weapon')).find(r=>r.id===item('Emberlight')),preview=t.compare(r),row=allRows(preview).find(r=>r.id===item('Emberlight'));
 assert.equal(r.loadout.shield,undefined);assert.equal(preview.rebuildsWeapons,true);assert.ok(row.dps>fixed.dps);assert.match(row.reason,/unpinned slots re-optimised/);assert.equal(JSON.stringify(t.p),before,'preview does not change the character');
 const actual=equip(t,r,row);assert.equal(actual.loadout.shield,item('Avernic defender'));assert.equal(row.dps,actual.dps);assert.equal(row.aggregateDps,actual.aggregateDps??actual.dps);assert.equal(row.delta,actual.dps-r.dps);
});
test('weapon previews retain explicit armour choices and the selected prayer/tank priority',()=>{
 const t=fixture(['Scythe of Vitur','Emberlight','Avernic defender','Barrows gloves','Ferocious gloves']);
 t.p.gearOverrides={cerberus:{melee:{weapon:item('Scythe of Vitur'),hands:item('Barrows gloves')}}};
 const r=t.best(),row=allRows(t.compare(r)).find(r=>r.id===item('Emberlight')),actual=equip(t,r,row);
 assert.equal(actual.loadout.hands,item('Barrows gloves'));assert.equal(actual.armourPriority,'prayer');assert.equal(row.dps,actual.dps);
});
test('ranged previews match both bolt selection and two-handed off-hand removal',()=>{
 const names=['Rune crossbow','Runite bolts','Ruby bolts (e)','Diamond bolts (e)','Magic shortbow (i)','Amethyst arrows','Book of law','Toxic blowpipe','Dragon dart'];
 const t=fixture(names,'hellhound','ranged');t.p.gearOverrides={hellhound:{ranged:{weapon:item('Magic shortbow (i)')}}};
 let r=t.best(),rows=allRows(t.compare(r));
 for(const name of ['Runite bolts','Ruby bolts (e)','Diamond bolts (e)']){
  const row=rows.find(r=>r.id===item('Rune crossbow')&&r.ammoId===item(name));assert.ok(row);const actual=equip(t,r,row);assert.equal(actual.loadout.ammo,item(name));assert.equal(row.dps,actual.dps);
 }
 t.p.gearOverrides.hellhound.ranged.shield=item('Book of law');r=t.best();rows=allRows(t.compare(r));const row=rows.find(r=>r.id===item('Magic shortbow (i)')),actual=equip(t,r,row);
 assert.equal(actual.loadout.shield,undefined);assert.equal(t.p.gearOverrides.hellhound.ranged.shield,undefined);assert.equal(row.dps,actual.dps);
 r=t.best();const pipe=allRows(t.compare(r)).find(r=>r.id===item('Toxic blowpipe')&&r.ammoId===item('Dragon dart')),loaded=equip(t,r,pipe);assert.equal(loaded.loadout.ammo,item('Dragon dart'));assert.equal(pipe.dps,loaded.dps);
});
test('rebuilt weapon comparisons still require creature protection and exclude incompatible two-handed weapons',()=>{
 const t=fixture(['Scythe of Vitur','Emberlight','Mirror shield','Dragon defender'],'basilisk-knight'),r=t.best(),rows=allRows(t.compare(r));
 assert.equal(rows.find(r=>r.id===item('Scythe of Vitur')).dps,null);const row=rows.find(r=>r.id===item('Emberlight')),actual=equip(t,r,row);assert.equal(actual.loadout.shield,item('Mirror shield'));assert.equal(row.dps,actual.dps);
});
test('magic weapon previews include the spell and multi-target configuration used after equipping',()=>{
 const t=fixture(['Trident of the seas','Ancient staff','Slayer helmet (i)',"Ahrim's robetop"],'dust-devil','magic');t.state.stackSize=8;t.p.gearOverrides={'dust-devil':{magic:{weapon:item('Trident of the seas')}}};
 const r=t.best(),row=allRows(t.compare(r)).find(r=>r.id===item('Ancient staff')),actual=equip(t,r,row);assert.equal(actual.targets,8);assert.equal(row.dps,actual.dps);assert.equal(row.aggregateDps,actual.aggregateDps);
});
test('curated example comparisons keep fixed-loadout semantics',()=>{
 const t=fixture(['Scythe of Vitur','Emberlight','Avernic defender']),r=t.best();r.source='example';
 const preview=t.compare(r),fixed=c.compareOwnedSlot(t.p,t.state,r,'weapon');assert.equal(preview.rebuildsWeapons,false);assert.deepEqual(preview.rows,fixed.rows);assert.match(preview.notes,/Other gear is held fixed/);
});
test('actual comparison worker reports progress and limits rebuilt combat entries to the selected creature',()=>{
 const t=fixture(['Scythe of Vitur','Emberlight','Avernic defender']);t.p.gearOverrides={cerberus:{melee:{weapon:item('Scythe of Vitur')}}};const r=t.best();
 const source=buildSync({entryPoints:['src/worker.ts'],bundle:true,write:false,format:'iife',platform:'browser',define:{LOCATION_REVIEW_DETAILS:'false'}}).outputFiles[0].text,messages=[],self={postMessage:m=>messages.push(structuredClone(m))};
 vm.runInNewContext(source,{self,structuredClone,console});self.onmessage({data:{id:1,kind:'gear-detail',profile:t.p,guide:t.state,combat:r,slot:'weapon'}});
 assert.equal(messages.some(m=>m.kind==='error'),false);const detail=messages.find(m=>m.kind==='gear-detail');assert.equal(detail.result.rebuildsWeapons,true);assert.ok(messages.some(m=>m.kind==='progress'&&/Comparing gear/.test(m.current)));
 const row=allRows(detail.result).find(r=>r.id===item('Emberlight'));assert.equal(row.dps,equip(t,r,row).dps);
 const results=messages.filter(m=>m.kind==='combat-cache');assert.ok(results.length);assert.ok(results.every(m=>JSON.parse(m.key)[0]==='cerberus'));assert.equal(messages.some(m=>m.kind==='plans'||m.kind==='plan-ready'),false);
});
