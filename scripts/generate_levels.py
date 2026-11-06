#!/usr/bin/env python3
"""Original connected-region puzzles, unique and solved by explicit deductions."""
import json, random, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RNG = random.Random(2026110601)

def solution_permutation(n):
    cols = list(range(n))
    def walk(path, remaining):
        if not remaining: return path
        choices = list(remaining); RNG.shuffle(choices)
        for c in choices:
            if path and abs(c-path[-1]) <= 1: continue
            got = walk(path+[c], remaining-{c})
            if got is not None: return got
    return walk([], set(cols))

def partition(n, solution):
    a = [-1]*(n*n)
    frontier=[]
    def add(i, g):
        r,c=divmod(i,n)
        for rr,cc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
            if 0<=rr<n and 0<=cc<n and a[rr*n+cc]<0:
                frontier.append((rr*n+cc,g))
    for r,c in enumerate(solution): a[r*n+c]=r
    for r,c in enumerate(solution): add(r*n+c,r)
    while frontier:
        j=RNG.randrange(len(frontier)); i,g=frontier[j]
        frontier[j]=frontier[-1];frontier.pop()
        if a[i]>=0:continue
        a[i]=g;add(i,g)
    return a

def count_solutions(n,a,limit=2):
    found=[]
    full=(1<<n)-1
    def dfs(r, cols, regs, prev, path):
        if len(found)>=limit:return
        if r==n:found.append(path[:]);return
        available=full & ~cols
        if prev>=0:available &= ~(7<<max(0,prev-1)) if prev>0 else ~3
        while available:
            bit=available & -available; available-=bit
            c=bit.bit_length()-1;g=1<<a[r*n+c]
            if not regs&g:dfs(r+1,cols|bit,regs|g,c,path+[c])
    dfs(0,0,0,-2,[])
    return found

def deduction_score(n,a):
    cand=set(range(n*n)); placed=[];hard=0;rounds=0
    row=[set(range(r*n,(r+1)*n)) for r in range(n)]
    col=[set(range(c,n*n,n)) for c in range(n)]
    reg=[{i for i,g in enumerate(a) if g==k} for k in range(n)]
    groups=row+col+reg
    while len(placed)<n:
        rounds+=1
        if rounds>n*n*2:return None
        live=[g&cand for g in groups if not any(p in g for p in placed)]
        if any(not g for g in live):return None
        single=next((next(iter(g)) for g in live if len(g)==1),None)
        if single is not None:
            r,c=divmod(single,n);placed.append(single)
            invalid=row[r]|col[c]|reg[a[single]]
            invalid |= {rr*n+cc for rr in range(max(0,r-1),min(n,r+2)) for cc in range(max(0,c-1),min(n,c+2))}
            cand-=invalid
            continue
        changed=False
        for src in live:
            for target in groups:
                if src<=target:
                    remove=(target&cand)-src
                    if remove:
                        cand-=remove;hard+=1;changed=True;break
            if changed:break
        if not changed:return None
    return hard

def mutate(n,a,s):
    a=a[:]; protected={r*n+c for r,c in enumerate(s)}
    def neighbors(i):
        r,c=divmod(i,n)
        return [rr*n+cc for rr,cc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)] if 0<=rr<n and 0<=cc<n]
    for _ in range(RNG.randint(1,6)):
        for attempt in range(35):
            i=RNG.randrange(n*n)
            if i in protected:continue
            targets=[a[j] for j in neighbors(i) if a[j]!=a[i]]
            if not targets:continue
            group={j for j,g in enumerate(a) if g==a[i] and j!=i}
            if not group:continue
            todo=[next(iter(group))]; visited=set(todo)
            while todo:
                for j in neighbors(todo.pop()):
                    if j in group and j not in visited:visited.add(j);todo.append(j)
            if visited!=group:continue
            a[i]=RNG.choice(targets);break
    return a

def extend(previous):
    # A new L-shaped connected territory forces a corner placement. Mutating
    # its boundaries afterwards yields fresh, validated larger boards.
    m=previous['n'];n=m+1;s=previous['solution'][:];old=previous['regions'][:]
    if abs(s[-1]-m)<2:
        old=[old[r*m+(m-1-c)] for r in range(m) for c in range(m)]
        s=[m-1-c for c in s]
    a=[m]*(n*n)
    for r in range(m):
        for c in range(m):a[r*n+c]=old[r*m+c]
    return a,s+[m]

def generate():
    output=[];seen=set();start=time.time();previous=None
    # Each size is represented; simple logic is verified independently of uniqueness.
    counts={4:40,5:70,6:70,7:70,8:60,9:50,10:40}
    for n,target in counts.items():
        accepted=0;attempts=0;pool=[]
        if previous:
            a,s=extend(previous)
            pool.append((a,s))
        while accepted<target:
            attempts+=1
            if pool and RNG.random()<.96:
                a,s=RNG.choice(pool);a=mutate(n,a,s)
            else:
                s=solution_permutation(n);a=partition(n,s)
            key=(n,*a)
            if key in seen:continue
            solutions=count_solutions(n,a)
            if len(solutions)!=1:continue
            hard=deduction_score(n,a)
            if hard is None:continue
            seen.add(key)
            # Five bands overlap board sizes, with inference difficulty also considered.
            if n==4:d=1
            elif n==5:d=1 if hard<=1 else 2
            elif n==6:d=2 if hard<=2 else 3
            elif n==7:d=3 if hard<=3 else 4
            elif n==8:d=4
            else:d=5
            output.append({'id':f'zp-{n}-{accepted+1:03d}','n':n,'regions':a,'solution':s,'difficulty':d,'deductions':hard})
            pool.append((a,s));previous=output[-1]
            accepted+=1
        print(f'{n}x{n}: {accepted} originals, {attempts} attempts, {time.time()-start:.1f}s',flush=True)
    dest=ROOT/'app/src/main/assets/levels.js'
    dest.write_text('globalThis.ZOOPIT_LEVELS='+json.dumps(output,separators=(',',':'))+';\n',encoding='utf-8')
    (ROOT/'data').mkdir(exist_ok=True)
    (ROOT/'data/levels.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
    print('Total',len(output),flush=True)

if __name__=='__main__':generate()
