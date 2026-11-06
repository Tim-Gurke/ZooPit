import { env } from "cloudflare:workers";
import { E } from "../../../lib/zoo-engine.mjs";
import levels from "../../../lib/levels.json";

export const dynamic = "force-dynamic";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};
class Problem extends Error { constructor(public status:number,message:string){super(message);} }
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:cors});}
function db(){if(!env.DB)throw new Problem(503,"Der Wettbewerbsdienst wird gerade vorbereitet. Deine Offline-Rätsel sind schon spielbar.");return env.DB;}
async function digest(s:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");}
function randomCode(){const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const bytes=crypto.getRandomValues(new Uint8Array(8));return Array.from(bytes,x=>alphabet[x%32]).join("");}
function normalizeCode(raw:unknown){const code=String(raw||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!/^[A-Z0-9]{8}$/.test(code))throw new Problem(400,"Bitte prüfe den achtstelligen Einladungscode.");return code;}
async function limit(key:string,max:number,windowMs:number){
  const now=Date.now(),slot=Math.floor(now/windowMs),k=key+":"+slot;
  const row=await db().prepare("INSERT INTO zoo_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(k,now+windowMs).first<{count:number}>();
  if(row&&row.count>max)throw new Problem(429,"Gerade kommen viele Anfragen. Bitte warte einen Moment.");
}
async function getContest(code:string){const c=await db().prepare("SELECT code,host,count,created,puzzles FROM zoo_contests WHERE code=?").bind(code).first<any>();if(!c)throw new Problem(404,"Diese Freundesrunde wurde nicht gefunden. Prüfe den Code.");return c;}
async function getEntry(code:string,id:string){const e=await db().prepare("SELECT * FROM zoo_entries WHERE code=? AND player=?").bind(code,id).first<any>();if(!e)throw new Problem(403,"Bitte tritt dieser Runde zuerst mit dem Einladungscode bei.");return e;}
export async function OPTIONS(){return new Response(null,{status:204,headers:cors});}
export async function GET(){try{await db().prepare("SELECT code FROM zoo_contests LIMIT 1").first();return json({app:"ZooPit",version:"0.1.1",ready:true});}catch(e){return json({app:"ZooPit",ready:false},503);}}
export async function POST(request:Request){
  try{
    const auth=request.headers.get("authorization")||"",match=/^Bearer ([a-f0-9]{48})$/.exec(auth);
    if(!match)throw new Problem(401,"Deine Gerätekennung fehlt. Starte ZooPit bitte neu.");
    const raw=await request.text();if(raw.length>260000)throw new Problem(413,"Der Spielverlauf ist zu groß.");
    let b:any;try{b=JSON.parse(raw);}catch(e){throw new Problem(400,"Ungültige Anfrage.");}
    const name=String(b.name||"").trim().slice(0,24);
    if(name.length<2)throw new Problem(400,"Bitte gib einen Spitznamen mit mindestens zwei Zeichen ein.");
    const id=await digest(match[1]),ip=await digest(request.headers.get("cf-connecting-ip")||id);
    await limit("ip:"+ip,150,60000);await limit("player:"+id,100,60000);
    await db().prepare("INSERT INTO zoo_players (id,name,created) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name").bind(id,name,Date.now()).run();
    if(b.action==="create"){
      const count=Number(b.count);if(![5,10,15,20].includes(count))throw new Problem(400,"Wähle 5, 10, 15 oder 20 Rätsel.");
      await limit("create:"+id,20,86400000);
      const code=randomCode(),puzzles=E.contestLevels(levels,code,count);
      await db().batch([
        db().prepare("INSERT INTO zoo_contests (code,host,count,created,puzzles) VALUES (?,?,?,?,?)").bind(code,id,count,Date.now(),JSON.stringify(puzzles)),
        db().prepare("INSERT INTO zoo_entries (code,player,next,points,seconds) VALUES (?,?,0,0,0)").bind(code,id),
        db().prepare("DELETE FROM zoo_limits WHERE expires < ?").bind(Date.now()-86400000),
      ]);
      return json({code,count});
    }
    const code=normalizeCode(b.code),contest=await getContest(code);
    if(b.action==="join"){
      const count=await db().prepare("SELECT count(*) AS n FROM zoo_entries WHERE code=?").bind(code).first<{n:number}>();
      const existing=await db().prepare("SELECT player FROM zoo_entries WHERE code=? AND player=?").bind(code,id).first();
      if(!existing&&(count?.n||0)>=100)throw new Problem(409,"Diese Freundesrunde ist voll.");
      await db().prepare("INSERT OR IGNORE INTO zoo_entries (code,player,next,points,seconds) VALUES (?,?,0,0,0)").bind(code,id).run();
      return json({code,count:contest.count});
    }
    const entry=await getEntry(code,id);
    if(b.action==="lobby"){
      const rows=await db().prepare("SELECT e.player,p.name,e.next,e.points,e.seconds FROM zoo_entries e JOIN zoo_players p ON e.player=p.id WHERE e.code=? ORDER BY CASE WHEN e.next=? THEN 1 ELSE 0 END DESC,e.points DESC,e.seconds ASC,p.name ASC").bind(code,contest.count).all<any>();
      return json({code,count:contest.count,next:entry.next,players:rows.results.map(p=>({name:p.name,done:p.next,points:p.points,seconds:p.seconds,me:p.player===id}))});
    }
    const puzzles=JSON.parse(contest.puzzles||"[]");
    if(puzzles.length!==contest.count)throw new Problem(409,"Diese ältere Runde ist nicht mehr spielbar. Eröffne bitte eine neue.");
    if(b.action==="start"){
      if(entry.next>=contest.count)throw new Problem(409,"Du hast diese Runde schon abgeschlossen.");
      const index=entry.next,now=Date.now(),nonce=crypto.randomUUID();
      const bank=Math.max(0,Math.min(10000,Math.floor(Number(b.bank)||0)));
      await db().prepare("INSERT OR IGNORE INTO zoo_rounds (code,player,idx,started,nonce,bank) VALUES (?,?,?,?,?,?)").bind(code,id,index,now,nonce,bank).run();
      const round=await db().prepare("SELECT started,nonce,bank FROM zoo_rounds WHERE code=? AND player=? AND idx=?").bind(code,id,index).first<any>();
      const p=puzzles[index];
      return json({code,count:contest.count,index,nonce:round.nonce,elapsedMs:Math.max(0,Date.now()-round.started),puzzle:{id:p.id,n:p.n,regions:p.regions,difficulty:p.difficulty}});
    }
    if(b.action==="finish"){
      const index=Number(b.index);
      if(!Number.isInteger(index)||index<0||index>=contest.count)throw new Problem(400,"Ungültige Rätselnummer.");
      const round=await db().prepare("SELECT * FROM zoo_rounds WHERE code=? AND player=? AND idx=?").bind(code,id,index).first<any>();
      if(!round||round.nonce!==b.nonce)throw new Problem(403,"Dieses Rätsel wurde mit deiner Kennung noch nicht begonnen.");
      if(round.finished!==null)return json({points:round.points,seconds:round.seconds,next:entry.next});
      if(index!==entry.next)throw new Problem(409,"Bitte spiele die Rätsel in der vorgegebenen Reihenfolge.");
      let result;try{result=E.replay(puzzles[index],b.events);}catch(e){throw new Problem(400,"Der Spielverlauf konnte nicht bestätigt werden.");}
      if(!result.solved)throw new Problem(400,"Das Rätsel ist noch nicht vollständig gelöst.");
      if(result.hints>round.bank+1)throw new Problem(400,"Es wurden mehr Tipps verwendet als zu Beginn verfügbar waren.");
      const now=Date.now(),seconds=Math.max(0,Math.round((now-round.started)/1000));
      const points=E.score(puzzles[index].difficulty,seconds,result.errors,result.hints);
      await db().batch([
        db().prepare("UPDATE zoo_rounds SET finished=?,points=?,seconds=?,errors=?,hints=? WHERE code=? AND player=? AND idx=? AND finished IS NULL").bind(now,points,seconds,result.errors,result.hints,code,id,index),
        db().prepare("UPDATE zoo_entries SET next=next+1,points=points+?,seconds=seconds+? WHERE code=? AND player=? AND next=?").bind(points,seconds,code,id,index),
      ]);
      const stored=await db().prepare("SELECT points,seconds FROM zoo_rounds WHERE code=? AND player=? AND idx=?").bind(code,id,index).first<any>();
      const current=await getEntry(code,id);
      return json({points:stored.points,seconds:stored.seconds,next:current.next});
    }
    throw new Problem(400,"Diese Aktion gibt es nicht.");
  }catch(e){
    if(e instanceof Problem)return json({error:e.message},e.status);
    console.error("ZooPit request failed",e instanceof Error?e.message:"unknown");
    return json({error:"Der Wettbewerbsdienst ist gerade nicht verfügbar. Bitte versuche es später erneut."},503);
  }
}
