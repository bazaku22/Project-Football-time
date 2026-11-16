/* Adds national-team experimental estimates and Asian Handicap views without altering existing snapshots. */
(function(){
 "use strict";
 const KEY="pft_experiment_snapshots_v1";
 let research=null;
 let oddsData=null;
 let oddsLoadError=null;
 const ODDS_LEAGUES={"Premier League":"PL","La Liga":"PD","Bundesliga":"BL1","Serie A":"SA","Ligue 1":"FL1"};
 const ODDS_ALIASES={"Athletic Club":["Athletic Club","Athletic Bilbao"],"Espanyol":["Espanyol","RCD Espanyol"],"Bayern Munich":["Bayern Munich","FC Bayern München","FC Bayern Munich"],"1. FC Köln":["1. FC Köln","FC Köln","1. FC Koln","Koln"],"Troyes":["Troyes","ESTAC Troyes"],"Le Havre":["Le Havre","Le Havre AC"]};
 function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");if(!Array.isArray(x))return [];const kept=x.filter(r=>ODDS_LEAGUES[r?.competition]&&!r?.modelType?.includes("national"));if(kept.length!==x.length)save(kept);return kept;}catch(_){return [];}}
 function save(rows){try{localStorage.setItem(KEY,JSON.stringify(rows));return true;}catch(_){return false;}}
 function poisson(l,k){let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p;}
 function normalizeOddsTeam(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
 function oddsTeamKeys(value){return Array.from(new Set([value].concat(ODDS_ALIASES[value]||[]).map(normalizeOddsTeam)));}
 function findOddsEvent(fixture){
  if(!oddsData||!Array.isArray(oddsData.events))return null;
  const leagueId=ODDS_LEAGUES[fixture.competition];if(!leagueId)return null;
  const homeKeys=oddsTeamKeys(fixture.home),awayKeys=oddsTeamKeys(fixture.away),kickoff=new Date(fixture.kickoffUtc).getTime();
  return oddsData.events.find(event=>{
   if(event.leagueId!==leagueId||!homeKeys.includes(normalizeOddsTeam(event.homeTeam))||!awayKeys.includes(normalizeOddsTeam(event.awayTeam)))return false;
   const eventKickoff=new Date(event.commenceTime).getTime();
   return Number.isFinite(kickoff)&&Number.isFinite(eventKickoff)&&Math.abs(eventKickoff-kickoff)<=6*60*60*1000;
  })||null;
 }
 function renderApiHandicap(panel,fixture,expected){
  let target=panel.querySelector("[data-api-ah-panel]");
  if(!target){target=document.createElement("div");target.className="handicap-panel";target.setAttribute("data-api-ah-panel",fixture.id);panel.appendChild(target);}
  if(!oddsData){
   target.innerHTML='<b>Asian Handicap · อ้างอิง API อัตโนมัติ</b><div class="experiment-status">'+(oddsLoadError?'ยังโหลดข้อมูลจาก API ไม่สำเร็จ · '+esc(oddsLoadError):'กำลังโหลดข้อมูลเส้นอ้างอิงจาก The Odds API…')+'</div>';return;
  }
  if(!ODDS_LEAGUES[fixture.competition]){
   target.innerHTML='<b>Asian Handicap · อ้างอิง API อัตโนมัติ</b><div class="experiment-status">ไม่มีข้อมูลเส้นจาก The Odds API สำหรับรายการนี้ · แหล่งข้อมูลที่เชื่อมอยู่รองรับเฉพาะ 5 ลีกหลัก จึงไม่แสดงเส้นที่คาดเดาเอง</div>';return;
  }
  const event=findOddsEvent(fixture);
  if(!event||!Array.isArray(event.bookmakers)||!event.bookmakers.length){
   target.innerHTML='<b>Asian Handicap · อ้างอิง API อัตโนมัติ</b><div class="experiment-status">API ยังไม่มีเส้น Asian Handicap สำหรับคู่นี้ในช่วงข้อมูลล่าสุด · ไม่มีการเลือกหรือเติมเส้นแทน</div>';return;
  }
  const rows=event.bookmakers.filter(row=>Number.isFinite(row.homeLine)&&Number.isFinite(row.awayLine));
  if(!rows.length){target.innerHTML='<b>Asian Handicap · อ้างอิง API อัตโนมัติ</b><div class="experiment-status">พบคู่แข่งขันใน API แต่ไม่มีค่าเส้น Handicap ที่ใช้งานได้</div>';return;}
  const timestamps=rows.map(row=>new Date(row.lastUpdate).getTime()).filter(Number.isFinite);
  const latest=timestamps.length?Math.max(...timestamps):0;
  const fresh=latest>0&&Date.now()-latest<=24*60*60*1000;
  const sorted=rows.map(row=>row.homeLine).sort((a,b)=>a-b);
  const reference=Number.isFinite(event.referenceHomeLine)?event.referenceHomeLine:sorted[Math.floor((sorted.length-1)/2)];
  const awayReference=Number.isFinite(event.referenceAwayLine)?event.referenceAwayLine:-reference;
  const fmt=value=>(value>0?"+":"")+Number(value).toFixed(2);
  const stamp=latest?new Date(latest).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"}):"ไม่ทราบ";
  const bookmakerRows=rows.map(row=>'<div class="p5-row"><span>'+esc(row.bookmaker)+'</span><b>'+fmt(row.homeLine)+' / '+fmt(row.awayLine)+'</b></div>').join("");
  let calculation='<div class="quality-note">เส้นอ้างอิง '+(fresh?'อัปเดตภายใน 24 ชั่วโมง':'ข้อมูลเก่ากว่า 24 ชั่วโมงหรือไม่ทราบเวลา')+' · ค่ากลางจาก '+rows.length+' แหล่ง · อัปเดตล่าสุด '+esc(stamp)+'</div>';
  const calc=window.FootballTimeAsianHandicap;
  if(fresh&&expected&&calc){
   const home=calc.calculate(expected,reference),away=calc.calculate({home:expected.away,away:expected.home},awayReference);
   const columns=[["fullWin","ชนะเต็ม"],["halfWin","ชนะครึ่ง"],["push","คืนทุน"],["halfLoss","แพ้ครึ่ง"],["fullLoss","แพ้เต็ม"]];
   const renderRow=(label,data)=>'<div class="handicap-result-row"><b>'+label+'</b>'+columns.map(col=>'<span><strong>'+data[col[0]].toFixed(1)+'%</strong><small>'+col[1]+'</small></span>').join("")+'</div>';
   calculation+='<div class="small">ความน่าจะเป็นจาก Expected Goals ของโมเดล Poisson ที่เส้นอ้างอิง API</div>'+renderRow('เจ้าบ้าน '+fmt(reference),home)+renderRow('ทีมเยือน '+fmt(awayReference),away);
  }else calculation+='<div class="experiment-status">แสดงเส้นอ้างอิงไว้เพื่อดูข้อมูลเท่านั้น · ไม่คำนวณความน่าจะเป็นเพราะข้อมูลไม่สดพอหรือไม่มีค่า Expected Goals</div>';
  target.innerHTML='<div class="topline"><b>Asian Handicap · อ้างอิง API อัตโนมัติ</b><span class="tag">The Odds API</span></div><div class="experiment-kpis"><div class="experiment-kpi"><b>'+fmt(reference)+'</b><span>เส้นเจ้าบ้าน</span></div><div class="experiment-kpi"><b>'+fmt(awayReference)+'</b><span>เส้นทีมเยือน</span></div></div>'+calculation+'<details><summary class="small">ดูเส้นจากแต่ละแหล่ง ('+rows.length+')</summary>'+bookmakerRows+'</details><div class="small">รายการ '+esc(event.homeTeam)+' vs '+esc(event.awayTeam)+' · เริ่มแข่ง '+new Date(event.commenceTime).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"})+' · ข้อมูลอ้างอิงจาก '+esc(event.provider||"The Odds API")+'</div>';
 }
 async function loadOddsData(){
  try{
   const response=await fetch("./data/asian-handicap-odds.json?v="+Date.now(),{cache:"no-store"});
   if(!response.ok)throw Error("HTTP "+response.status);
   const data=await response.json();
   if(data.schemaVersion!==1||!Array.isArray(data.events))throw Error("รูปแบบข้อมูลไม่ถูกต้อง");
   oddsData=data;oddsLoadError=null;
  }catch(error){oddsData=null;oddsLoadError=error.message;}
  const app=window.FootballTimeAppContext;
  if(app&&app.getFixtures&&window.renderTestExperimentPanels)window.renderTestExperimentPanels(app.getFixtures());
 }
 function modelMetrics(rows){
  const done=rows.filter(r=>r.actualOutcome&&r.probabilities);if(!done.length)return {count:0,accuracy:null,brier:null,logLoss:null};
  let correct=0,brier=0,logLoss=0;
  done.forEach(r=>{const p=r.probabilities,actual=r.actualOutcome;const pick=["home","draw","away"].reduce((best,k)=>p[k]>p[best]?k:best,"home");if(pick===actual)correct++;["home","draw","away"].forEach(k=>{brier+=Math.pow(p[k]/100-(k===actual?1:0),2);});logLoss-=Math.log(Math.max(1e-15,p[actual]/100));});
  return {count:done.length,accuracy:correct/done.length,brier:brier/done.length,logLoss:logLoss/done.length};
 }
 function renderModelBreakdown(){
  const root=document.getElementById("testExperimentSummary");if(!root)return;
  const rows=read(),models=[["pft-poisson-1.0","โมเดลสโมสร Poisson"]];
  const old=document.getElementById("experimentModelBreakdown");if(old)old.remove();
  const pct=v=>v==null?"—":(v*100).toFixed(1)+"%",num=v=>v==null?"—":v.toFixed(3);
  const cards=models.map(([key,label])=>{const subset=rows.filter(r=>r.modelVersion===key),m=modelMetrics(subset);return '<div class="card"><b>'+label+'</b><div class="small">'+subset.length+' Snapshot · ประเมินแล้ว '+m.count+' · รอผล '+Math.max(0,subset.length-m.count)+'</div><div class="experiment-kpis"><div class="experiment-kpi"><b>'+pct(m.accuracy)+'</b><span>1X2 Accuracy</span></div><div class="experiment-kpi"><b>'+num(m.brier)+'</b><span>Brier</span></div><div class="experiment-kpi"><b>'+num(m.logLoss)+'</b><span>Log Loss</span></div></div></div>';}).join("");
  root.insertAdjacentHTML("beforeend",'<div id="experimentModelBreakdown"><div class="quality-note">ตัวเลขภาพรวมด้านบนรวมทุกเวอร์ชันเพื่อสรุปจำนวนรายการเท่านั้น การประเมินคุณภาพให้ดูแยกตามโมเดลด้านล่างเพื่อไม่ให้ผลสโมสรและทีมชาติปะปนกัน</div>'+cards+'</div>');
 }
 function enhance(fixtures){
  const rows=read();
  (fixtures||[]).forEach(f=>{
   const panel=document.querySelector('[data-experiment-id="'+String(f.id).replace(/"/g,"")+'"]');
   if(!panel)return;
   const snapshot=rows.find(r=>r.fixtureId===f.id);
   renderApiHandicap(panel,f,snapshot&&snapshot.expectedGoals?snapshot.expectedGoals:null);
  });
  return false;
 }
 const original=window.renderTestExperimentPanels;
 if(typeof original==="function")window.renderTestExperimentPanels=function(fixtures){
  original(fixtures);
  enhance(fixtures);
  renderModelBreakdown();
 };
 loadOddsData();
})();
