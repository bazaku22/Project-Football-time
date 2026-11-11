/* Adds national-team experimental estimates and Asian Handicap views without altering existing snapshots. */
(function(){
 "use strict";
 const KEY="pft_experiment_snapshots_v1";
 const lines=["-1.5","-1.25","-1","-0.75","-0.5","-0.25","0","0.25","0.5","0.75","1","1.25","1.5"];
 let research=null;
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
 function handicapMarkup(id,expected){
  const options=lines.map(v=>'<option value="'+v+'"'+(v==="-0.5"?" selected":"")+'>'+((Number(v)>0)?"+":"")+v+'</option>').join("");
  return '<div class="handicap-panel" data-ah-panel="'+esc(id)+'"><b>Asian Handicap · คำนวณจากสกอร์โมเดล</b><div class="field"><label>เลือกเส้นฝั่งเจ้าบ้าน</label><select data-ah-line>'+options+'</select></div><div data-ah-output></div><div class="small">เป็นความน่าจะเป็นจากโมเดล ไม่ใช่ราคา/เส้นตลาด และไม่รวมอัตราต่อรอง</div></div>';
 }
 function paintHandicap(panel,expected){
  const calc=window.FootballTimeAsianHandicap,select=panel.querySelector("[data-ah-line]"),out=panel.querySelector("[data-ah-output]");
  if(!calc||!select||!out)return;
  const render=()=>{
   const line=Number(select.value),home=calc.calculate(expected,line),away=calc.calculate({home:expected.away,away:expected.home},-line);
   const cols=[["fullWin","ชนะเต็ม"],["halfWin","ชนะครึ่ง"],["push","คืนทุน"],["halfLoss","แพ้ครึ่ง"],["fullLoss","แพ้เต็ม"]];
   const row=(name,data)=>'<div class="handicap-result-row"><b>'+name+'</b>'+cols.map(c=>'<span><strong>'+data[c[0]].toFixed(1)+'%</strong><small>'+c[1]+'</small></span>').join("")+'</div>';
   out.innerHTML=row("เจ้าบ้าน "+(line>0?"+":"")+line.toFixed(2),home)+row("ทีมเยือน "+(-line>0?"+":"")+(-line).toFixed(2),away);
  };
  select.onchange=render;render();
 }
 function renderNational(fixture,panel,snapshot){
  const p=snapshot.probabilities,stamp=new Date(snapshot.createdAt).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Bangkok"});
  let html='<div class="topline"><b>วิเคราะห์ทีมชาติ · '+esc(snapshot.modelVersion)+'</b><span class="tag">บันทึกก่อนแข่ง</span></div><div class="experiment-kpis"><div class="experiment-kpi"><b>'+p.home.toFixed(1)+'%</b><span>เจ้าบ้านชนะ</span></div><div class="experiment-kpi"><b>'+p.draw.toFixed(1)+'%</b><span>เสมอ</span></div><div class="experiment-kpi"><b>'+p.away.toFixed(1)+'%</b><span>ทีมเยือนชนะ</span></div></div><div class="experiment-status">ระดับความน่าจะเป็น '+esc(snapshot.probabilityLevel)+' · ความเชื่อมั่น '+esc(snapshot.confidence)+' ('+snapshot.confidenceScore+'/100) · ตัวอย่าง '+snapshot.sample.homeMatches+' / '+snapshot.sample.awayMatches+' นัด · บันทึก '+esc(stamp)+'</div><details><summary class="small">ดูรีเสิร์ชและเหตุผล</summary><ul class="experiment-reasons">'+snapshot.reasons.map(r=>'<li>'+esc(r)+'</li>').join("")+'</ul><div class="small">ประตูคาดหมาย '+snapshot.expectedGoals.home.toFixed(2)+' – '+snapshot.expectedGoals.away.toFixed(2)+' · ฟอร์มล่าสุด '+esc(snapshot.sample.homeRecent)+' / '+esc(snapshot.sample.awayRecent)+'</div><div class="small">แหล่งข้อมูล: '+snapshot.researchSources.map(url=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">เปิดแหล่งข้อมูล</a>').join(" · ")+'</div></details>';
  if(snapshot.actualOutcome)html+='<div class="quality-note">ผลจริง '+esc(snapshot.actualScore)+' · ประเมินแล้ว</div>';
  else if(Date.now()>=new Date(fixture.kickoffUtc).getTime())html+='<form class="experiment-result" data-national-result="'+esc(fixture.id)+'"><div class="field"><label>สกอร์จริง (เจ้าบ้าน-ทีมเยือน)</label><input name="score" required pattern="[0-9]{1,2}-[0-9]{1,2}" placeholder="2-1"></div><div class="field"><label>แหล่งผลจริง</label><input name="source" value="ผู้ใช้ตรวจสอบผลจริง" maxlength="100"></div><button class="primary" type="submit">บันทึกผลจริงและประเมิน</button></form>';
  else html+='<div class="experiment-status">รอการแข่งขันจบ · จะเปิดให้บันทึกผลจริงหลังเวลาเตะ</div>';
  panel.innerHTML=html+handicapMarkup(fixture.id,snapshot.expectedGoals);
  paintHandicap(panel,snapshot.expectedGoals);
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
   if(snapshot&&snapshot.expectedGoals){
    const ah=panel.querySelector("[data-ah-panel]");if(!ah){panel.insertAdjacentHTML("beforeend",handicapMarkup(f.id,snapshot.expectedGoals));paintHandicap(panel,snapshot.expectedGoals);}
   }
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
 fetch("./data/national-team-research-2026-11.json?v=1",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(data=>{research=data;const app=window.FootballTimeAppContext;if(app&&app.getFixtures)window.renderTestExperimentPanels(app.getFixtures());}).catch(error=>console.error("National research unavailable",error));
})();
