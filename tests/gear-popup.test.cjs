const test=require('node:test'),assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const source=buildSync({entryPoints:['src/ui/gear-inspector.ts'],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
function fixture(){
 const timers=new Map(),workers=[];let timerId=0;
 class Node {
  constructor(dataset={}){this.dataset=dataset;this.children=[];this.parent=null;this.listeners={};this.attributes={};this.style={};this.open=false;this.hover=false;this.offsetWidth=800;}
  append(child){child.parent=this;this.children.push(child);}
  remove(){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
  get isConnected(){return this===document.body||!!this.parent?.isConnected;}
  contains(node){return !!node&&(this===node||this.children.some(c=>c.contains(node)));}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  setAttribute(name,value){this.attributes[name]=value;}
  matches(selector){return selector===':popover-open'?this.open:selector===':hover'?this.hover:false;}
  closest(selector){for(let node=this;node;node=node.parent)if(selector==='[data-gear-slot]'&&node.dataset.gearSlot!==undefined||selector==='[data-gear-info]'&&node.dataset.gearInfo!==undefined||selector==='[data-gear-pick]'&&node.dataset.gearPick!==undefined||selector==='[data-gear-close]'&&node.dataset.gearClose!==undefined||selector==='.gear-comparison-body'&&node.dataset.comparisonBody!==undefined)return node;return null;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){return this.children.flatMap(child=>[...(child.closest(selector)===child?[child]:[]),...child.querySelectorAll(selector)]);}
  showPopover(){this.open=true;}
  hidePopover(){this.open=false;}
  getBoundingClientRect(){return {left:20,top:70,bottom:110,height:100};}
  focus(){const before=document.activeElement;document.activeElement=this;dispatch('focusout',before,this);dispatch('focusin',this,before);}
 }
 const document={body:new Node(),listeners:{},activeElement:null,createElement:()=>new Node(),addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},querySelectorAll(selector){return this.body.querySelectorAll(selector);}};document.activeElement=document.body;
 const window={innerWidth:1200,innerHeight:900,addEventListener(){}};
 class Worker {constructor(){this.terminated=false;workers.push(this);}postMessage(request){this.request=request;}terminate(){this.terminated=true;}}
 function dispatch(type,target,relatedTarget=null,extra={}){const event={target,relatedTarget,...extra};if(type==='pointerenter'){for(const fn of target.listeners[type]||[])fn(event);return;}for(let node=target;node;node=node.parent)for(const fn of node.listeners[type]||[])fn(event);for(const fn of document.listeners[type]||[])fn(event);}
 const mod={exports:{}};new Function('module','exports','document','window','Node','Worker','URL','setTimeout','clearTimeout',source)(mod,mod.exports,document,window,Node,Worker,{createObjectURL:()=> 'fixture',revokeObjectURL(){}},fn=>{const id=++timerId;timers.set(id,fn);return id;},id=>timers.delete(id));
 const context={key:'same-character-and-setup',profile:{id:'popup-fixture'},guide:{variantId:'hellhound'},results:{styles:{melee:{supported:true}}}},picks=[];
 const inspector=new mod.exports.GearInspector('fixture worker',()=>context,(...args)=>picks.push(args));
 const panel=document.body.children[0],body=new Node({comparisonBody:''}),table=new Node(),footer=new Node(),close=new Node({gearClose:''});panel.append(body);body.append(table);body.append(footer);panel.append(close);
 const anchor=(tier)=>{const a=new Node({gearFamily:'melee',gearSlot:'shield',...(tier?{gearTier:tier}:{})}),info=new Node({gearInfo:''});a.append(info);document.body.append(a);return a;};
 const initial=anchor();
 return {inspector,context,panel,body,table,footer,close,anchor,initial,document,dispatch,workers,picks,timers,Node,open(){dispatch('pointerover',initial.children[0]);assert.equal(panel.open,true);},flush(){for(const [id,fn]of [...timers]){timers.delete(id);fn();}}};
}

test('hover previews still close when left without entering the comparison',()=>{
 const f=fixture();f.open();f.dispatch('pointerout',f.initial,f.document.body);f.flush();assert.equal(f.panel.open,false);assert.equal(f.workers[0].terminated,true);
});
test('entering the comparison cancels dismissal and keeps footer controls open after leaving the table',()=>{
 const f=fixture();f.open();f.dispatch('pointerout',f.initial,f.document.body);assert.equal(f.timers.size,1);
 f.dispatch('pointerenter',f.panel);f.dispatch('pointerout',f.table,f.footer);f.flush();assert.equal(f.panel.open,true);assert.equal(f.timers.size,0);
 f.dispatch('click',f.footer);f.dispatch('pointerout',f.footer,f.document.body);f.flush();assert.equal(f.panel.open,true,'interactive content stays open until explicitly dismissed');
 f.dispatch('click',f.document.body);assert.equal(f.panel.open,false);
});
test('internal pointer transitions and the bridge from anchor to popup never arm a close timer',()=>{
 const f=fixture();f.open();f.dispatch('pointerout',f.initial,f.panel);assert.equal(f.timers.size,0);f.dispatch('pointerout',f.table,f.footer);assert.equal(f.timers.size,0);
});
test('keyboard entry keeps the popup open while moving focus among its controls',()=>{
 const f=fixture();f.open();f.table.focus();f.footer.focus();f.dispatch('pointerout',f.table,f.document.body);f.flush();assert.equal(f.panel.open,true);
 f.dispatch('keydown',f.footer,null,{key:'Escape'});assert.equal(f.panel.open,false);
});
test('the close button dismisses and restores anchor focus without immediately reopening',()=>{
 const f=fixture();f.open();f.dispatch('pointerenter',f.panel);f.dispatch('click',f.close);assert.equal(f.panel.open,false);assert.equal(f.document.activeElement,f.initial.children[0]);assert.equal(f.workers.length,1);
});
test('same-view redraw rebinds the matching slot and preserves the popup and in-flight comparison',()=>{
 const f=fixture();f.open();f.dispatch('pointerenter',f.panel);f.initial.remove();const wrong=f.anchor('mid'),replacement=f.anchor();
 f.inspector.refresh(true);assert.equal(f.panel.open,true);assert.equal(f.workers[0].terminated,false);assert.equal(replacement.children[0].attributes['aria-expanded'],'true');assert.equal(wrong.children[0].attributes['aria-expanded'],undefined);
 f.dispatch('click',replacement.children[0]);assert.equal(f.panel.open,false,'the replacement info button still toggles the pinned popup');
});
test('navigation, changed setup and absent replacement slots still dismiss stale comparisons',()=>{
 for(const mode of ['navigation','context','missing']){const f=fixture();f.open();f.dispatch('pointerenter',f.panel);f.initial.remove();if(mode!=='missing')f.anchor();if(mode==='context')f.context.key='different-character';f.inspector.refresh(mode!=='navigation');assert.equal(f.panel.open,false,mode);assert.equal(f.workers[0].terminated,true,mode);}
});
test('comparison progress reports percentage and current item without dismissing the interactive popup',()=>{
 const f=fixture();f.open();f.dispatch('pointerenter',f.panel);const worker=f.workers[0];
 worker.onmessage({data:{id:worker.request.id,kind:'progress',done:1,total:4,current:'<Emberlight>'}});assert.match(f.body.innerHTML,/25% · &lt;Emberlight&gt;/);assert.equal(f.panel.open,true);
 f.dispatch('keydown',f.footer,null,{key:'Escape'});const before=f.body.innerHTML;worker.onmessage({data:{id:worker.request.id,kind:'progress',done:3,total:4,current:'Late result'}});assert.equal(f.body.innerHTML,before);assert.equal(f.panel.open,false);
});
