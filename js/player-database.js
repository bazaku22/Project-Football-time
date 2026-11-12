"use strict";
(() => {
 const PILOT_URL="./data/player-position-pilot-2026-27.json", $=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=v=>v===null||v===undefined||v===""?"—":esc(v);
 const labels={FORWARD:"แนวรุก",MIDFIELDER:"กองกลาง",DEFENDER:"กองหลัง",GOALKEEPER:"ผู้รักษาประตู",MULTI:"หลายกลุ่มตำแหน่ง",UNKNOWN:"ยังไม่ระบุตำแหน่ง"};
 let canonical=[],pilot=[],directoryStatus="กำลังโหลดชุดข้อมูลทดลอง",statsStatus="ยังไม่ได้เข้าสู่ระบบ";
 const position=r=>{const p=String(r.positionGroup||r.position_group||r.position||"").toUpperCase();if(labels[p])return p;const t=p.replaceAll("/", " ").split(/[,;|+]+/).map(x=>x.trim()),found=new Set();for(const x of t){if(["GK","GOALKEEPER"].includes(x))found.add("GOALKEEPER");else if(["DF","DEF","DEFENDER","CB","LB","RB","LWB","RWB"].includes(x))found.add("DEFENDER");else if(["MF","MID","MIDFIELDER","DM","CDM","CM","AM","CAM","LM","RM"].includes(x))found.add("MIDFIELDER");else if(["FW","FWD","FORWARD","ST","CF","LW","RW","SS"].includes(x))found.add("FORWARD");}return found.size===1?[...found][0]:found.size>1?"MULTI":"UNKNOWN";};
 function render(){
  const q=$("playerSearch").value.trim().toLocaleLowerCase(),league=$("playerLeagueFilter").value,team=$("playerTeamFilter").value,pos=$("playerPositionFilter").value;
  const rows=[...canonical.map(p=>({...p,kind:"canonical"})),...pilot.map(p=>({...p,kind:"research",name:p.name,teamName:"Manchester United",teamId:"manchester-united",leagueName:"Premier League",leagueId:"PL",season:"2026/27",number:p.shirt_number,positionGroup:p.position_group,position:p.official_position_label,statistics:{},source:{provider:"Research Pilot",rightsStatus:p.rights_status}}))];
  const leagues=[...new Map(rows.map(r=>[r.leagueId||"unknown",r.leagueName||r.leagueId||"ไม่ระบุลีก"])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const teams=[...new Map(rows.map(r=>[r.teamId||"unknown",r.teamName||r.teamId||"ไม่ระบุทีม"])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const setOptions=(el,items,label)=>{const old=el.value||"ALL";el.innerHTML='<option value="ALL">'+label+'</option>'+items.map(([v,n])=>'<option value="'+esc(v)+'">'+esc(n)+'</option>').join("");el.value=items.some(x=>x[0]===old)?old:"ALL";};
  setOptions($("playerLeagueFilter"),leagues,"ทุกลีก");setOptions($("playerTeamFilter"),teams,"ทุกทีม");
  const filtered=rows.filter(r=>(league==="ALL"||(r.leagueId||"unknown")===league)&&(team==="ALL"||(r.teamId||"unknown")===team)&&(pos==="ALL"||position(r)===pos)&&(!q||String(r.name||r.display_name||"").toLocaleLowerCase().includes(q))).sort((a,b)=>String(a.name||a.display_name).localeCompare(String(b.name||b.display_name)));
  $("playerDbSummary").innerHTML='<div class="db-kpi"><b>'+new Set(rows.map(r=>r.id||r.research_key)).size+'</b><span>นักเตะที่แสดงได้</span></div><div class="db-kpi"><b>'+canonical.length+'</b><span>Canonical ใน Cloud</span></div><div class="db-kpi"><b>'+pilot.length+'</b><span>Research Only</span></div>';
  $("playerDbStatus").textContent="Canonical: "+canonical.length+" · Research Only: "+pilot.length+" · "+directoryStatus+" · "+statsStatus+" · แสดง "+filtered.length+" คน";
  $("playerList").innerHTML=filtered.length?filtered.map(r=>{const research=r.kind==="research",s=r.statistics||{},metrics=[["ลงเล่น",s.appearances],["ประตู",s.goals],["แอสซิสต์",s.assists],["นาที",s.minutes??s.minutes_played]];
   return '<article class="card"><div class="profile-hero"><div><b>'+esc(r.name||r.display_name||"ไม่ระบุชื่อ")+'</b><div class="small">'+esc(r.teamName||r.team_id||"ไม่ระบุทีม")+' · '+esc(r.leagueName||r.leagueId||"ไม่ระบุลีก")+' · '+esc(r.season||"ไม่ระบุฤดูกาล")+'</div><div class="small">'+esc(labels[position(r)]||"ยังไม่ระบุตำแหน่ง")+' · '+esc(r.position||"")+' · เบอร์ '+fmt(r.number??r.shirt_number)+'</div></div></div>'+(research?'<div class="p5-note"><b>RESEARCH ONLY · ยังไม่ใช่ข้อมูล Production</b><br>สิทธิ์แหล่งข้อมูล: '+esc(r.rights_status||"pending_review")+' · สถิติฤดูกาลยังไม่มีข้อมูลที่ผ่านการตรวจสอบ</div>':'<div class="p5-score">'+metrics.map(([k,v])=>'<div class="p5-metric"><b>'+fmt(v)+'</b><span>'+k+'</span></div>').join("")+'</div><div class="small">Canonical ID: '+esc(r.id)+' · สถานะ: '+esc(r.verificationStatus||"identity_only")+'</div>')+'</article>';
  }).join(""):'<div class="empty">ไม่พบรายชื่อนักเตะตามตัวกรอง · หากต้องการข้อมูล Canonical ให้เข้าสู่ระบบ Cloud</div>';
 }
 async function loadPilot(){try{const res=await fetch(PILOT_URL,{cache:"no-store"});if(!res.ok)throw new Error("HTTP "+res.status);const d=await res.json();pilot=Array.isArray(d.players)?d.players:[];directoryStatus="โหลดชุดทดลอง "+pilot.length+" คนแล้ว";}catch(e){pilot=[];directoryStatus="โหลดชุดทดลองไม่สำเร็จ: "+e.message;}render();}
 window.addEventListener("pft-player-directory-data",e=>{const d=e.detail||{};canonical=Array.isArray(d.players)?d.players:[];directoryStatus=d.status||"โหลด Canonical แล้ว";render();});
 window.addEventListener("pft-player-directory-status",e=>{directoryStatus=String(e.detail||"");render();});
 window.addEventListener("pft-player-stats-data",e=>{statsStatus=e.detail?.status||"ยังไม่ได้โหลดสถิติ";render();});
 ["playerLeagueFilter","playerTeamFilter","playerPositionFilter"].forEach(id=>$(id).addEventListener("change",render));$("playerSearch").addEventListener("input",render);
 loadPilot();
})();