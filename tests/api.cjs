// Integration tests execute the actual HTTP handler against the actual SQLite migrations.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const ts=require('../online/node_modules/typescript');
const E=require('../app/src/main/assets/engine.js');
const root=path.resolve(__dirname,'..'),database=new DatabaseSync(':memory:');
for(const name of fs.readdirSync(path.join(root,'online/drizzle')).filter(x=>x.endsWith('.sql')).sort())database.exec(fs.readFileSync(path.join(root,'online/drizzle',name),'utf8'));
function prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return database.prepare(sql).get(...args)||null;},async all(){return {results:database.prepare(sql).all(...args),success:true};},async run(){return this._run();},_run(){return {success:true,meta:database.prepare(sql).run(...args)};}};}
globalThis.__ZooTestEnv={DB:{prepare,batch:async statements=>{database.exec('BEGIN');try{const results=statements.map(s=>s._run());database.exec('COMMIT');return results;}catch(e){database.exec('ROLLBACK');throw e;}}}};
globalThis.__ZooTestEngine=E;globalThis.__ZooTestLevels=JSON.parse(fs.readFileSync(path.join(root,'data/levels.json'),'utf8'));
let source=fs.readFileSync(path.join(root,'online/app/api/zoo/route.ts'),'utf8')
 .replace('import { env } from "cloudflare:workers";','const env=globalThis.__ZooTestEnv;')
 .replace('import { E } from "../../../lib/zoo-engine.mjs";','const E=globalThis.__ZooTestEngine;')
 .replace('import levels from "../../../lib/levels.json";','const levels=globalThis.__ZooTestLevels;');
const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const file=path.join(root,'online/.sites-runtime/api-test.mjs');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,output);
async function main(){
 const api=await import('file://'+file+'?v='+Date.now());
 const a=crypto.randomBytes(24).toString('hex'),b=crypto.randomBytes(24).toString('hex'),outsider=crypto.randomBytes(24).toString('hex');
 async function call(token,action,data={},expected=200){const response=await api.POST(new Request('https://zoo.test/api/zoo',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,name:token===a?'Testgast A':'Testgast B',...data})}));const result=await response.json();assert.equal(response.status,expected,JSON.stringify(result));return result;}
 const create=await call(a,'create',{count:5});assert.match(create.code,/^[A-Z0-9]{8}$/);
 await call(b,'join',{code:create.code});await call(outsider,'lobby',{code:create.code},403);
 const lobby=await call(a,'lobby',{code:create.code});assert.equal(lobby.players.length,2);assert.equal(lobby.next,0);
 const start=await call(a,'start',{code:create.code,bank:3}),repeat=await call(a,'start',{code:create.code,bank:0}),bstart=await call(b,'start',{code:create.code,bank:0});
 assert.equal(start.nonce,repeat.nonce);assert.deepEqual(start.puzzle,bstart.puzzle);assert.equal(start.puzzle.solution,undefined);
 const solution=E.solve(start.puzzle.n,start.puzzle.regions,2)[0],correct=solution.map((c,r)=>({kind:'place',index:r*start.puzzle.n+c}));
 const wrong=solution[0]===0?1:0,events=[{kind:'place',index:wrong},{kind:'place',index:wrong},{kind:'place',index:wrong},{kind:'restart'},{kind:'hint',mode:'explain'},...correct];
 await call(a,'finish',{code:create.code,index:0,nonce:start.nonce,events:[]},400);
 const result=await call(a,'finish',{code:create.code,index:0,nonce:start.nonce,events});assert.equal(result.next,1);assert.ok(result.points>0);
 const again=await call(a,'finish',{code:create.code,index:0,nonce:start.nonce,events});assert.deepEqual(again,result,'Retry must be idempotent');
 await call(b,'finish',{code:create.code,index:0,nonce:bstart.nonce,events:[{kind:'hint',mode:'explain'},{kind:'hint',mode:'explain'},...correct]},400);
 const bresult=await call(b,'finish',{code:create.code,index:0,nonce:bstart.nonce,events:correct});assert.ok(bresult.points>result.points,'Mistakes and hints must reduce points');
 for(let index=1;index<5;index++){
  const s=await call(a,'start',{code:create.code,bank:0});assert.equal(s.index,index);assert.equal(s.puzzle.difficulty,index%5+1);
  const sol=E.solve(s.puzzle.n,s.puzzle.regions,2)[0],ev=sol.map((c,r)=>({kind:'place',index:r*s.puzzle.n+c}));
  const body={code:create.code,index,nonce:s.nonce,events:ev};
  const responses=index===4?await Promise.all([call(a,'finish',body),call(a,'finish',body)]):[await call(a,'finish',body)];
  responses.forEach(x=>assert.equal(x.next,index+1));
 }
 const final=await call(a,'lobby',{code:create.code});assert.equal(final.next,5);assert.equal(final.players[0].done,5);assert.equal(final.players[0].name,'Testgast A');assert.equal(database.prepare('SELECT count(*) AS n FROM zoo_rounds WHERE player=(SELECT id FROM zoo_players WHERE name=?) AND finished IS NOT NULL').get('Testgast A').n,5);
 await call(a,'start',{code:create.code,bank:0},409);
 for(const count of [10,15,20]){const c=await call(a,'create',{count});const l=await call(a,'lobby',{code:c.code});assert.equal(l.count,count);}
 await call(a,'create',{count:7},400);await call(a,'join',{code:'INVALID9'},404);await call(a,'join',{code:"' OR 1=1"},400);
 const preflight=await api.OPTIONS();assert.equal(preflight.status,204);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'*');
 console.log('PASS: host/join/lobby; 5/10/15/20 rounds; same puzzles for friends; fixed start time; three-error reset; hint budget; server scoring; idempotent and concurrent submission; access and invalid-input checks.');
}
main().catch(e=>{console.error(e);process.exit(1);});
