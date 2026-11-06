// Regression checks run the actual app with a small in-memory DOM and storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('../app/src/main/assets/engine.js');
const levels=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/levels.json'),'utf8'));
const source=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/app.js'),'utf8');
function app(saved){
  const nodes=new Map(),storage=new Map(saved?[['zoopit-save-v1',saved]]:[]),calls=[];
  class Element{
    constructor(id){this.id=id;this.style={};this.owned=[];this.classes=new Set(id==='modal'?['hidden']:[]);this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c)};}
    set innerHTML(html){for(const id of this.owned)nodes.delete(id);this.owned=[];this.html=html;for(const m of html.matchAll(/\bid="([^"]+)"/g)){nodes.set(m[1],new Element(m[1]));this.owned.push(m[1]);}}
    get innerHTML(){return this.html||'';}
    addEventListener(){} querySelector(){return {focus(){}};} focus(){} setPointerCapture(){}
  }
  for(const id of ['app','modal','toast'])nodes.set(id,new Element(id));
  const context={ZooEngine:E,ZOOPIT_LEVELS:levels,document:{hidden:false,getElementById:id=>nodes.get(id)||null,addEventListener(){}},location:{protocol:'file:',origin:'https://zoo.test',search:''},navigator:{},crypto:require('node:crypto').webcrypto,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setTimeout:()=>1,clearTimeout(){},setInterval(){},clearInterval(){},URLSearchParams,AbortController,Uint8Array,matchMedia:()=>({matches:true}),console};
  context.window=context;context.scrollTo=()=>{};context.addEventListener=()=>{};
  context.fetch=async(url,options)=>{const data=JSON.parse(options.body);calls.push(data);if(context.respond)return context.respond(data);throw new Error('offline');};
  const instrumented=source.replace(/\}\)\(\);\s*$/,'globalThis.test={state:()=>S,act,startCampaign,pickFree,place,mark,undo,resetNow,resumeGame,renderGame,showComplete,startGame,refreshCompleteStanding};})();');
  vm.runInNewContext(instrumented,context,{filename:'app.js'});
  return {t:context.test,nodes,storage,calls,context};
}
async function flush(){await new Promise(setImmediate);}
async function main(){
  let a=app(),t=a.t,s=t.state();
  assert.match(a.nodes.get('app').innerHTML,/Ein Spiel von Tim Weißbach/);
  s.settings.auto=false;t.startCampaign(0);
  let g=s.game,wrong=g.puzzle.solution[0]===0?1:0;
  t.place(wrong);
  assert.equal(g.marks[wrong],-1,'wrong animal becomes a cross without auto marks');
  assert.equal(g.errors,1);assert.equal(g.lives,2);
  assert.match(a.nodes.get('board').innerHTML,/rejected[^>]*[\s\S]*Falscher Versuch, Kreuz/);
  assert.match(a.nodes.get('board').innerHTML,/<span class="cross"><\/span>/);
  t.renderGame();assert.match(a.nodes.get('board').innerHTML,/rejected/,'cross survives a redraw');
  a=app(a.storage.get('zoopit-save-v1'));t=a.t;s=t.state();g=s.game;t.resumeGame();
  assert.equal(g.marks[wrong],-1,'cross survives restart of app');
  assert.match(a.nodes.get('board').innerHTML,/rejected/);
  t.undo();assert.equal(g.marks[wrong],0);assert.equal(g.lives,2,'undo never refunds a failed attempt');
  t.place(wrong);t.place(wrong);assert.equal(g.failed,true);assert.equal(g.lives,0);
  t.resetNow();assert.equal(g.rejected.length,0);assert.equal(g.errors,3);assert.equal(g.lives,3);
  // Every level, including those between difficulty-wave boundaries, shows totals.
  a=app();t=a.t;s=t.state();let previous=0;
  for(let index=0;index<7;index++){
    t.startCampaign(index);g=s.game;g.puzzle.solution.forEach((c,r)=>t.place(r*g.puzzle.n+c));
    assert.equal(g.finished,true);assert.equal(s.solved,index+1);assert.ok(s.totalPoints>previous);previous=s.totalPoints;
    const html=a.nodes.get('modal').innerHTML;
    assert.match(html,/Dein aktueller Stand/);assert.ok(html.includes('Level '+(index+1)+' geschafft'));
    assert.ok(html.includes(s.totalPoints.toLocaleString('de-DE')));assert.match(html,/Gesamtpunkte/);assert.match(html,/Tipps im Vorrat/);
  }
  const before=s.totalPoints;t.showComplete();assert.equal(s.totalPoints,before,'reopening result does not award points again');
  for(const mode of ['free','mix']){t.pickFree(mode);g=s.game;g.puzzle.solution.forEach((c,r)=>t.place(r*g.puzzle.n+c));assert.match(a.nodes.get('modal').innerHTML,/Dein aktueller Stand/);}
  // An existing 0.1.0 save has no rejected-fields array and must still work.
  t.startCampaign(s.unlocked);delete s.game.rejected;g=s.game;wrong=g.puzzle.solution[0]===0?1:0;t.place(wrong);assert.equal(g.marks[wrong],-1);
  // A successful submission refreshes the standings after the very first puzzle.
  a=app();t=a.t;s=t.state();s.profile='QA';
  a.context.respond=async d=>({ok:true,json:async()=>d.action==='finish'?{points:1300,seconds:10,next:1}:{code:'ABCD2345',count:5,next:1,players:[{name:'QA <one>',done:1,points:1300,me:true},{name:'Friend',done:0,points:0,me:false}]}});
  t.startGame(levels[0],'contest','contest-test-0',0,{code:'ABCD2345',index:0,count:5,nonce:'test',startedAt:Date.now()-10000});
  g=s.game;g.puzzle.solution.forEach((c,r)=>t.place(r*g.puzzle.n+c));await flush();
  assert.equal(g.sent,true);assert.equal(a.calls.filter(c=>c.action==='finish').length,1);assert.equal(a.calls.filter(c=>c.action==='lobby').length,1);
  assert.match(a.nodes.get('modal').innerHTML,/Euer aktueller Stand/);assert.match(a.nodes.get('modal').innerHTML,/1 \/ 5 Rätsel gelöst/);
  assert.match(a.nodes.get('complete-standing').innerHTML,/QA &lt;one&gt; \(du\)/);assert.match(a.nodes.get('complete-standing').innerHTML,/1\.300/);
  a.context.respond=async()=>{throw new Error('offline');};await t.refreshCompleteStanding();
  assert.match(a.nodes.get('complete-standing').innerHTML,/Erneut aktualisieren/);assert.equal(g.sent,true,'standings failure keeps the submitted result');
  // Reloading while a standings request is pending must not leave a saved lock.
  a=app();t=a.t;s=t.state();s.profile='QA';
  a.context.respond=()=>new Promise(()=>{});
  t.startGame(levels[0],'contest','contest-pending',0,{code:'ABCD2345',index:0,count:5,nonce:'test',startedAt:Date.now()});
  g=s.game;g.finished=true;g.sent=true;g.points=1300;g.contestNext=1;t.showComplete();
  assert.equal(g.standingsLoading,undefined,'request lock is not stored in the game');
  g.standingsLoading=true; // Simulate a saved request from the earlier work-in-progress build.
  t.act('home'); // Leaving the result saves the game while the request is still pending.
  const pendingSave=a.storage.get('zoopit-save-v1');
  a=app(pendingSave);t=a.t;
  a.context.respond=async()=>({ok:true,json:async()=>({count:5,players:[{name:'QA',done:1,points:1300,me:true}]})});
  t.showComplete();await flush();
  assert.equal(a.calls.filter(c=>c.action==='lobby').length,1,'reload must start a fresh standings request');
  assert.match(a.nodes.get('complete-standing').innerHTML,/1\.300/);
  console.log('PASS: persistent wrong-answer crosses with auto marks off; reload, undo, three-error reset and old saves; totals after each of seven consecutive levels and both free modes; first-round standings, escaping, offline retry, recovery from interrupted standings requests and author credit.');
}
main().catch(e=>{console.error(e);process.exit(1);});
