(function(root,factory){var e=factory();if(typeof module==='object'&&module.exports)module.exports=e;root.ZooEngine=e;})(globalThis,function(){
  'use strict';
  function rng(seed){var x=(seed>>>0)||1;return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
  function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function transform(p,seed){
    var rand=rng(seed),turn=Math.floor(rand()*4),flip=rand()<.5,n=p.n,a=Array(n*n),s=Array(n),labels=Array.from({length:n},function(_,i){return i;});
    for(var j=n-1;j>0;j--){var k=Math.floor(rand()*(j+1)),v=labels[j];labels[j]=labels[k];labels[k]=v;}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){
      var rr=r,cc=c;if(flip)cc=n-1-cc;
      for(var t=0;t<turn;t++){var tmp=rr;rr=cc;cc=n-1-tmp;}
      a[rr*n+cc]=labels[p.regions[r*n+c]];
      if(p.solution[r]===c)s[rr]=cc;
    }
    return {id:p.id,n:n,regions:a,solution:s,difficulty:p.difficulty,deductions:p.deductions,seed:seed>>>0};
  }
  function solve(n,regions,limit){
    limit=limit||2;var out=[],pos=Array(n).fill(-1);
    function walk(cols,regs,depth){
      if(out.length>=limit)return;
      if(depth===n){out.push(pos.slice());return;}
      var best=-1,choices=null;
      for(var r=0;r<n;r++)if(pos[r]<0){
        var cs=[];
        for(var c=0;c<n;c++){
          var g=regions[r*n+c];
          if(cols&(1<<c)||regs&(1<<g))continue;
          if(r>0&&pos[r-1]>=0&&Math.abs(pos[r-1]-c)<=1)continue;
          if(r+1<n&&pos[r+1]>=0&&Math.abs(pos[r+1]-c)<=1)continue;
          cs.push(c);
        }
        if(!cs.length)return;
        if(choices===null||cs.length<choices.length){best=r;choices=cs;}
      }
      for(var i=0;i<choices.length;i++){var c=choices[i];pos[best]=c;walk(cols|(1<<c),regs|(1<<regions[best*n+c]),depth+1);pos[best]=-1;if(out.length>=limit)return;}
    }
    walk(0,0,0);return out;
  }
  function autoMask(p,marks){
    var n=p.n,mask=Array(n*n).fill(false),animals=[];
    for(var i=0;i<marks.length;i++)if(marks[i]===1)animals.push(i);
    for(var j=0;j<mask.length;j++){
      if(marks[j]===1)continue;
      var r=Math.floor(j/n),c=j%n,g=p.regions[j];
      mask[j]=animals.some(function(q){var qr=Math.floor(q/n),qc=q%n;return qr===r||qc===c||p.regions[q]===g||(Math.abs(qr-r)<=1&&Math.abs(qc-c)<=1);});
    }
    return mask;
  }
  function nextStep(p,marks){
    var n=p.n,mask=autoMask(p,marks),groups=[],candidates=[],i,r,c,g;
    for(r=0;r<n;r++)if(marks[r*n+p.solution[r]]===-1)return {kind:'clear',indices:[r*n+p.solution[r]],reason:'Dieses Kreuz schließt einen benötigten Platz aus. Entferne es, damit die Lösung wieder möglich wird.'};
    for(i=0;i<n*n;i++)if(!mask[i]&&marks[i]===0)candidates.push(i);
    for(r=0;r<n;r++)groups.push({type:'row',id:r,cells:Array.from({length:n},function(_,c){return r*n+c;})});
    for(c=0;c<n;c++)groups.push({type:'col',id:c,cells:Array.from({length:n},function(_,r){return r*n+c;})});
    for(g=0;g<n;g++)groups.push({type:'region',id:g,cells:Array.from({length:n*n},function(_,i){return i;}).filter(function(i){return p.regions[i]===g;})});
    var live=groups.filter(function(gr){return !gr.cells.some(function(i){return marks[i]===1;});}).map(function(gr){return {type:gr.type,id:gr.id,cells:gr.cells,possible:gr.cells.filter(function(i){return candidates.indexOf(i)>=0;})};});
    function name(gr){return (gr.type==='row'?'Reihe ':gr.type==='col'?'Spalte ':'Farbgebiet ')+(gr.id+1);}
    for(i=0;i<live.length;i++)if(live[i].possible.length===1)return {kind:'place',indices:[live[i].possible[0]],reason:'In '+name(live[i])+' ist nur noch dieses eine Feld möglich. Hier gehört ein Tier hin.'};
    for(i=0;i<live.length;i++){
      var src=live[i];if(!src.possible.length)continue;
      for(var j=0;j<live.length;j++){
        var dst=live[j];if(src===dst||src.type===dst.type)continue;
        if(src.possible.every(function(q){return dst.cells.indexOf(q)>=0;})){
          var remove=dst.possible.filter(function(q){return src.possible.indexOf(q)<0;});
          if(remove.length)return {kind:'exclude',indices:remove,reason:'Alle möglichen Plätze in '+name(src)+' liegen zugleich in '+name(dst)+'. Die anderen Felder in '+name(dst)+' kannst du deshalb ausschließen.'};
        }
      }
    }
    for(r=0;r<n;r++)if(marks[r*n+p.solution[r]]!==1)return {kind:'place',indices:[r*n+p.solution[r]],reason:'Dieses Feld gehört zur eindeutigen Lösung. Es lässt sich mit den übrigen Reihen, Spalten und Farbgebieten vereinbaren.'};
    return null;
  }
  function score(d,seconds,errors,hints){d=Math.max(1,Math.min(5,Number(d)||1));seconds=Math.max(0,Number(seconds)||0);errors=Math.max(0,Number(errors)||0);hints=Math.max(0,Number(hints)||0);return Math.max(0,Math.round(1000*d+Math.max(0,500*d-2*d*seconds)-150*d*errors-200*d*hints));}
  function makeCampaign(levels,count){count=count||250;var bs={};for(var d=1;d<=5;d++)bs[d]=levels.filter(function(p){return p.difficulty===d;});return Array.from({length:count},function(_,i){var d=i%5+1,cycle=Math.floor(i/5),b=bs[d];return {base:b[cycle%b.length],seed:hash('journey-'+i),key:'journey-'+i,index:i,difficulty:d};});}
  function contestLevels(levels,code,count){var rr=rng(hash(code)),out=[];for(var i=0;i<count;i++){var d=i%5+1,b=levels.filter(function(p){return p.difficulty===d;}),p=b[Math.floor(rr()*b.length)];out.push(transform(p,Math.floor(rr()*4294967295)));}return out;}
  function replay(p,events){
    var marks=Array(p.n*p.n).fill(0),errors=0,lives=3,hints=0;
    if(!Array.isArray(events)||events.length>20000)throw Error('Ungültiger Spielverlauf.');
    for(var t=0;t<events.length;t++){
      var e=events[t],i=e.index;
      if(e.kind==='restart'){marks.fill(0);lives=3;continue;}
      if(e.kind==='hint'){
        hints++;
        if(e.mode==='place'){
          if(!Number.isInteger(i)||i<0||i>=marks.length||p.solution[Math.floor(i/p.n)]!==i%p.n)throw Error('Ungültiger Tipp.');
          marks[i]=1;
        }
        continue;
      }
      if(!Number.isInteger(i)||i<0||i>=marks.length)throw Error('Ungültiges Feld.');
      if(e.kind==='remove'){marks[i]=0;continue;}
      if(e.kind!=='place')throw Error('Ungültiger Zug.');
      if(p.solution[Math.floor(i/p.n)]!==i%p.n){errors++;lives--;if(!lives){marks.fill(0);lives=3;}}
      else marks[i]=1;
    }
    return {solved:p.solution.every(function(c,r){return marks[r*p.n+c]===1;}),errors:errors,hints:hints};
  }
  return {rng:rng,hash:hash,transform:transform,solve:solve,autoMask:autoMask,nextStep:nextStep,score:score,makeCampaign:makeCampaign,contestLevels:contestLevels,replay:replay};
});

export const E=globalThis.ZooEngine;
