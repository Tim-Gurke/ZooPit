const assert=require('node:assert/strict'),fs=require('node:fs'),E=require('../app/src/main/assets/engine.js');
const levels=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/levels.json'),'utf8'));
assert.deepEqual(E.solve(3,[0,0,0,1,1,1,2,2,2]),[],'3x3 must be impossible with the common rules');
const allSizes=new Set(),allBands=new Set();
for(const p of levels){
  allSizes.add(p.n);allBands.add(p.difficulty);
  const solved=E.solve(p.n,p.regions,2);
  assert.equal(solved.length,1,p.id+' unique');assert.deepEqual(solved[0],p.solution);
  for(let g=0;g<p.n;g++){
    const group=new Set(p.regions.map((v,i)=>v===g?i:-1).filter(i=>i>=0)),seen=new Set(),queue=[group.values().next().value];
    while(queue.length){const i=queue.pop();if(seen.has(i))continue;seen.add(i);const r=Math.floor(i/p.n),c=i%p.n;for(const [rr,cc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]])if(rr>=0&&rr<p.n&&cc>=0&&cc<p.n&&group.has(rr*p.n+cc)&&!seen.has(rr*p.n+cc))queue.push(rr*p.n+cc);}
    assert.equal(seen.size,group.size,p.id+' territory is connected');
  }
  for(let s=1;s<=8;s++){const q=E.transform(p,s*20261106);assert.deepEqual(E.solve(q.n,q.regions,2),[q.solution],p.id+' transformed');}
  const marks=Array(p.n*p.n).fill(0);
  for(let step=0;marks.filter(x=>x===1).length<p.n;step++){
    assert.ok(step<400,p.id+' hint terminates');const h=E.nextStep(p,marks);assert.ok(h);
    for(const i of h.indices){if(h.kind==='place')marks[i]=1;else if(h.kind==='clear')marks[i]=0;else{assert.notEqual(p.solution[Math.floor(i/p.n)],i%p.n,p.id+' valid exclusion');marks[i]=-1;}}
  }
}
assert.deepEqual([...allSizes].sort((a,b)=>a-b),[4,5,6,7,8,9,10]);assert.deepEqual([...allBands].sort(),[1,2,3,4,5]);
const campaign=E.makeCampaign(levels,250);assert.equal(campaign.length,250);campaign.forEach((x,i)=>assert.equal(x.difficulty,i%5+1));
assert.deepEqual(E.contestLevels(levels,'ABCD2345',20),E.contestLevels(levels,'ABCD2345',20));
const p=levels[0],events=p.solution.map((c,r)=>({kind:'place',index:r*p.n+c}));
assert.deepEqual(E.replay(p,events),{solved:true,errors:0,hints:0});
const wrong=p.solution[0]===0?1:0;
assert.equal(E.replay(p,[events[0],{kind:'place',index:wrong},{kind:'place',index:wrong},{kind:'place',index:wrong}]).solved,false);
assert.equal(E.replay(p,[{kind:'hint',mode:'place',index:p.solution[0]},...events.slice(1)]).hints,1);
assert.equal(E.score(1,0,0,0),1500);assert.ok(E.score(5,10,0,0)>E.score(1,10,0,0));assert.ok(E.score(1,10,0,0)>E.score(1,11,0,0));assert.equal(E.score(1,10,1,0),E.score(1,10,0,0)-150);assert.equal(E.score(1,10,0,1),E.score(1,10,0,0)-200);assert.equal(E.score(1,1e6,100,100),0);
console.log('PASS: 400 unique connected original boards; 3,200 transformations; all explanatory hints; 4–10 sizes; five difficulty bands; campaign waves; deterministic contests; errors, hints and scoring.');
