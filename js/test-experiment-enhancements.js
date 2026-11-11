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
 function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[];}catch(_){return [];}}
 function save(rows){try{localStorage.setItem(KEY,JSON.stringify(rows));return true;}catch(_){return false;}}
 function poisson(l,k){let p=Math.exp(-l);for(let i=1;i<=k;i++)p*=l/i;return p;}
 function nationalForecast(fixture){
  const h=research&&research.teams&&research.teams[fixture.home],a=research&&research.teams&&research.teams[fixture.away];
  if(!h||!a||h.matches.length<3||a.matches.length<3)return null;
  const avg=rows=>({gf:rows.reduce((s,r)=>s+r[2],0)/rows.length,ga:rows.reduce((s,r)=>s+r[3],0)/rows.length});
  const hs=avg(h.matches),as=avg(a.matches);
  const eh=Math.max(.25,Math.min(4.5,.65*((hs.gf+as.ga)/2)+.35*1.35+.12));
  const ea=Math.max(.25,Math.min(4.5,.65*((as.gf+hs.ga)/2)+.35*1.15-.08));
  let hw=0,d=0,aw=0,total=0;
  for(let x=0;x<=12;x++){const px=poisson(eh,x);for(let y=0;y<=12;y++){const p=px*poisson(ea,y);total+=p;if(x>y)hw+=p;else if(x===y)d+=p;else aw+=p;}}
  const home=Math.round(hw/total*1000)/10,away=Math.round(aw/total*1000)/10;
  const probs={home:home,draw:Math.round((100-home-away)*10)/10,away:away};
  const detail=research.fixtures[fixture.id]||{};
  const recent=rows=>rows.map(r=>r[2]+"-"+r[3]).join(", ");
  return {probabilities:probs,expectedGoals:{home:eh,away:ea},confidenceScore:Math.min(42,30+Math.min(h.matches.length,a.matches.length)*3),confidence:"ต่ำ",probabilityLevel:Math.max(probs.home,probs.draw,probs.away)>=55?"สูง":Math.max(probs.home,probs.draw,probs.away)>=45?"กลาง":"ต่ำ",sample:{homeMatches:h.matches.length,awayMatches:a.matches.length,homeForm:h.matches.length,awayForm:a.matches.length,homeVenue:0,awayVenue:0,homeRecent:recent(h.matches),awayRecent:recent(a.matches)},reasons:[detail.note||"คำนวณจากผลทีมชาติชุดใหญ่ย้อนหลัง",fixture.home+" ยิงเฉลี่ย "+hs.gf.toFixed(2)+" เสีย "+hs.ga.toFixed(2)+" ประตู จาก "+h.matches.length+" นัด",fixture.away+" ยิงเฉลี่ย "+as.gf.toFixed(2)+" เสีย "+as.ga.toFixed(2)+" ประตู จาก "+a.matches.length+" นัด","ตัวอย่างเพียง 3–4 นัด; ยังไม่รวมการปรับความแข็งแกร่งคู่แข่งและการยืนยันตัวจริง/ผู้เล่นบาดเจ็บครบทุกทีม","ยังไม่นำฐานผู้เล่น 156 รายการมาปรับเปอร์เซ็นต์ เพราะเป็นข้อมูลตัวตน/สโมสร ไม่ใช่สถิติผลงานรายบุคคลหรือรายชื่อทีมชาติที่ยืนยันครบ"],sources:Array.from(new Set([h.source,a.source].concat(detail.sources||[])))};
 }

 function normalizeOddsTeam(value){return String(value||"").normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
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
 function renderNational(fixture,panel,snapshot){
  const p=snapshot.probabilities,stamp=new Date(snapshot.createdAt).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"});
  let html='<div class="topline"><b>วิเคราะห์ทีมชาติ · '+esc(snapshot.modelVersion)+'</b><span class="tag">บันทึกก่อนแข่ง</span></div><div class="experiment-kpis"><div class="experiment-kpi"><b>'+p.home.toFixed(1)+'%</b><span>เจ้าบ้านชนะ</span></div><div class="experiment-kpi"><b>'+p.draw.toFixed(1)+'%</b><span>เสมอ</span></div><div class="experiment-kpi"><b>'+p.away.toFixed(1)+'%</b><span>ทีมเยือนชนะ</span></div></div><div class="experiment-status">ระดับความน่าจะเป็น '+esc(snapshot.probabilityLevel)+' · ความเชื่อมั่น '+esc(snapshot.confidence)+' ('+snapshot.confidenceScore+'/100) · ตัวอย่าง '+snapshot.sample.homeMatches+' / '+snapshot.sample.awayMatches+' นัด · บันทึก '+esc(stamp)+'</div><details><summary class="small">ดูรีเสิร์ชและเหตุผล</summary><ul class="experiment-reasons">'+snapshot.reasons.map(r=>'<li>'+esc(r)+'</li>').join("")+'</ul><div class="small">ประตูคาดหมาย '+snapshot.expectedGoals.home.toFixed(2)+' – '+snapshot.expectedGoals.away.toFixed(2)+' · ฟอร์มล่าสุด '+esc(snapshot.sample.homeRecent)+' / '+esc(snapshot.sample.awayRecent)+'</div><div class="small">แหล่งข้อมูล: '+snapshot.researchSources.map(url=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">เปิดแหล่งข้อมูล</a>').join(" · ")+'</div></details>';
  if(snapshot.actualOutcome)html+='<div class="quality-note">ผลจริง '+esc(snapshot.actualScore)+' · ประเมินแล้ว</div>';
  else if(Date.now()>=new Date(fixture.kickoffUtc).getTime())html+='<form class="experiment-result" data-national-result="'+esc(fixture.id)+'"><div class="field"><label>สกอร์จริง (เจ้าบ้าน-ทีมเยือน)</label><input name="score" required pattern="[0-9]{1,2}-[0-9]{1,2}" placeholder="2-1"></div><div class="field"><label>แหล่งผลจริง</label><input name="source" value="ผู้ใช้ตรวจสอบผลจริง" maxlength="100"></div><button class="primary" type="submit">บันทึกผลจริงและประเมิน</button></form>';
  else html+='<div class="experiment-status">รอการแข่งขันจบ · จะเปิดให้บันทึกผลจริงหลังเวลาเตะ</div>';
  panel.innerHTML=html;
  renderApiHandicap(panel,fixture,snapshot.expectedGoals);
  const form=panel.querySelector("[data-national-result]");
  if(form)form.onsubmit=event=>{
   event.preventDefault();const rows=read(),current=rows.find(r=>r.fixtureId===fixture.id);if(!current||current.actualOutcome)return;
   const parts=form.elements.score.value.trim().split("-");if(parts.length!==2||!parts.every(x=>/^\d{1,2}$/.test(x))){alert("กรุณากรอกสกอร์รูปแบบ 2-1");return;}
   const hg=Number(parts[0]),ag=Number(parts[1]);current.actualScore=hg+"-"+ag;current.actualOutcome=hg>ag?"home":hg===ag?"draw":"away";current.evaluatedAt=new Date().toISOString();current.resultSource=form.elements.source.value.trim()||"ผู้ใช้ตรวจสอบผลจริง";
   if(!save(rows)){alert("บันทึกไม่สำเร็จ กรุณาส่งออกข้อมูลสำรองก่อน");return;}window.renderTestExperimentPanels(window.FootballTimeAppContext.getFixtures());
  };
 }
 function modelMetrics(rows){
  const done=rows.filter(r=>r.actualOutcome&&r.probabilities);if(!done.length)return {count:0,accuracy:null,brier:null,logLoss:null};
  let correct=0,brier=0,logLoss=0;
  done.forEach(r=>{const p=r.probabilities,actual=r.actualOutcome;const pick=["home","draw","away"].reduce((best,k)=>p[k]>p[best]?k:best,"home");if(pick===actual)correct++;["home","draw","away"].forEach(k=>{brier+=Math.pow(p[k]/100-(k===actual?1:0),2);});logLoss-=Math.log(Math.max(1e-15,p[actual]/100));});
  return {count:done.length,accuracy:correct/done.length,brier:brier/done.length,logLoss:logLoss/done.length};
 }
 function renderModelBreakdown(){
  const root=document.getElementById("testExperimentSummary");if(!root)return;
  const rows=read(),models=[["pft-poisson-1.0","โมเดลสโมสร Poisson"],["pft-national-poisson-0.1","โมเดลทีมชาติทดลอง"]];
  const old=document.getElementById("experimentModelBreakdown");if(old)old.remove();
  const pct=v=>v==null?"—":(v*100).toFixed(1)+"%",num=v=>v==null?"—":v.toFixed(3);
  const cards=models.map(([key,label])=>{const subset=rows.filter(r=>r.modelVersion===key),m=modelMetrics(subset);return '<div class="card"><b>'+label+'</b><div class="small">'+subset.length+' Snapshot · ประเมินแล้ว '+m.count+' · รอผล '+Math.max(0,subset.length-m.count)+'</div><div class="experiment-kpis"><div class="experiment-kpi"><b>'+pct(m.accuracy)+'</b><span>1X2 Accuracy</span></div><div class="experiment-kpi"><b>'+num(m.brier)+'</b><span>Brier</span></div><div class="experiment-kpi"><b>'+num(m.logLoss)+'</b><span>Log Loss</span></div></div></div>';}).join("");
  root.insertAdjacentHTML("beforeend",'<div id="experimentModelBreakdown"><div class="quality-note">ตัวเลขภาพรวมด้านบนรวมทุกเวอร์ชันเพื่อสรุปจำนวนรายการเท่านั้น การประเมินคุณภาพให้ดูแยกตามโมเดลด้านล่างเพื่อไม่ให้ผลสโมสรและทีมชาติปะปนกัน</div>'+cards+'</div>');
 }
 function enhance(fixtures){
  const rows=read();let changed=false;
  (fixtures||[]).forEach(f=>{
   if(f.competition!=="UEFA Nations League"&&f.competition!=="International Friendly")return;
   if(rows.some(r=>r.fixtureId===f.id))return;
   const kickoff=new Date(f.kickoffUtc).getTime();if(!Number.isFinite(kickoff)||kickoff<=Date.now())return;
   const model=nationalForecast(f);if(!model)return;
   rows.push({schemaVersion:1,fixtureId:f.id,experiment:"nov-2026-test",modelType:"national",competition:f.competition,kickoffUtc:f.kickoffUtc,home:f.home,away:f.away,probabilities:model.probabilities,expectedGoals:model.expectedGoals,confidenceScore:model.confidenceScore,confidence:model.confidence,probabilityLevel:model.probabilityLevel,sample:model.sample,reasons:model.reasons,researchSources:model.sources,modelVersion:"pft-national-poisson-0.1",createdAt:new Date().toISOString(),actualScore:null,actualOutcome:null,evaluatedAt:null,resultSource:null});changed=true;
  });
  if(changed&&!save(rows))console.warn("National experiment snapshots could not be saved");
  const all=read();
  (fixtures||[]).forEach(f=>{
   const panel=document.querySelector('[data-experiment-id="'+f.id.replace(/"/g,"")+'"]');if(!panel)return;
   const snapshot=all.find(r=>r.fixtureId===f.id);
   if(f.competition==="UEFA Nations League"||f.competition==="International Friendly"){if(snapshot)renderNational(f,panel,snapshot);return;}
   if(snapshot&&snapshot.expectedGoals)renderApiHandicap(panel,f,snapshot.expectedGoals);
  });
  return changed;
 }
 const original=window.renderTestExperimentPanels;
 if(typeof original==="function")window.renderTestExperimentPanels=function(fixtures){
  original(fixtures);
  const changed=enhance(fixtures);
  if(changed)original(fixtures);
  enhance(fixtures);
  renderModelBreakdown();
 };
 loadOddsData();
 fetch("./data/national-team-research-2026-11.json?v=1",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(data=>{research=data;const app=window.FootballTimeAppContext;if(app&&app.getFixtures)window.renderTestExperimentPanels(app.getFixtures());}).catch(error=>console.error("National research unavailable",error));
})();
