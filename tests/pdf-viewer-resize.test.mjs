import test from 'node:test';
import assert from 'node:assert/strict';
import { observePdfWidth } from '../src/scripts/pdf-viewer-resize.js';

function setup() {
 const stage={width:800,height:600,clientWidth:800,scrollTop:420,getBoundingClientRect(){return {width:this.width,height:this.height};}};
 let callback,observation,disconnected=false,ready=true,renders=0,sequence=0;
 const timers=new Map();
 const tracker=observePdfWidth(stage,{
  canRender:()=>ready,
  onResize:()=>{renders++;tracker.remember();},
 },{
  Observer:class {constructor(fn){callback=fn;}observe(target,options){observation={target,options};}disconnect(){disconnected=true;}},
  delay(fn){timers.set(++sequence,fn);return sequence;},cancel(id){timers.delete(id);},
 });
 tracker.remember();
 return {stage,tracker,get renders(){return renders;},get observation(){return observation;},get disconnected(){return disconnected;},get pending(){return timers.size;},setReady(value){ready=value;},notify:()=>callback(),flush(){const work=[...timers.values()];timers.clear();for(const fn of work)fn();}};
}

test('render-induced scrollbar and height changes cannot trigger repeated PDF fitting or reset scrolling',()=>{
 const s=setup();
 for(let i=0;i<20;i++){
  s.stage.clientWidth=i%2?800:785;s.stage.height=i%2?600:580;
  s.notify();s.flush();
 }
 assert.equal(s.renders,0);assert.equal(s.pending,0);assert.equal(s.stage.scrollTop,420);
 assert.equal(s.observation.target,s.stage);assert.equal(s.observation.options.box,'border-box');
});
test('a real viewport width change requests one fit and settles after rendering',()=>{
 const s=setup();s.stage.width=1000;s.notify();s.notify();assert.equal(s.pending,1);s.flush();assert.equal(s.renders,1);
 s.stage.clientWidth=985;s.notify();s.flush();assert.equal(s.renders,1);
});
test('resize storms coalesce to the final width and changes smaller than a pixel are ignored',()=>{
 const s=setup();s.stage.width=800.5;s.notify();assert.equal(s.pending,0);
 for(const width of [810,830,900]){s.stage.width=width;s.notify();}
 assert.equal(s.pending,1);s.flush();assert.equal(s.renders,1);
});
test('resizing during a render is deferred until the renderer checks again',()=>{
 const s=setup();s.setReady(false);s.stage.width=1000;s.notify();s.flush();assert.equal(s.renders,0);
 s.setReady(true);s.tracker.check();s.flush();assert.equal(s.renders,1);
});
test('hidden stages, manual zoom and loading states do not cause fitting',()=>{
 const s=setup();s.stage.width=0;s.notify();s.flush();assert.equal(s.renders,0);
 s.stage.width=1000;s.setReady(false);s.notify();s.flush();assert.equal(s.renders,0);
 s.stage.width=800;s.setReady(true);s.tracker.check();s.flush();assert.equal(s.renders,0);
});
test('a pending resize rechecks readiness and teardown cancels pending work',()=>{
 const s=setup();s.stage.width=1000;s.notify();s.setReady(false);s.flush();assert.equal(s.renders,0);
 s.setReady(true);s.tracker.check();assert.equal(s.pending,1);s.tracker.disconnect();s.flush();assert.equal(s.renders,0);assert.equal(s.disconnected,true);
 s.notify();assert.equal(s.pending,0);
});
