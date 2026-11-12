"use strict";
// Directory policy: current season is the primary view; legacy seasons remain reviewable in Archive.
(() => {
 const PILOT_URL="./data/player-position-pilot-2026-27.json",CURRENT_SEASON="2026/27",$=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=v=>v===null||v===undefined||v===""?"—":esc(v);
 const labels={FORWARD:"แนวรุก",MIDFIELDER:"กองกลาง",DEFENDER:"กองหลัง",GOALKEEPER:"ผู้รักษาประตู",MULTI:"หลายกลุ่มตำแหน่ง",UNKNOWN:"ยังไม่ระบุตำแหน่ง"};
 let canonical=[],pilot=[],view="current",directoryStatus="กำลังโหลดชุดข้อมูล",statsStatus="ยังไม่ได้เข้าสู่ระบบ";
 const position=r=>{const p=String(r.positionGroup||r.position_group||r.position||"").toUpperCase();if(labels[p])return p;const t=p.replaceAll("/"," ").split(/[,;|+]+/).map(x=>x.trim()),found=new Set();for(const x of t){if(["GK","GOALKEEPER"].includes(x))found.add("GOALKEEPER");else if(["DF","DEF","DEFENDER","CB","LB","RB","LWB","RWB"].includes(x))found.add("DEFENDER");else if(["MF","MID","MIDFIELDER","DM","CDM","CM","AM","CAM","LM","RM"].includes(x))found.add("MIDFIELDER");else if(["FW","FWD","FORWARD","ST","CF","LW","RW","SS"].includes(x))found.add("FORWARD");}return found.size===1?[...found][0]:found.size>1?"MULTI":"UNKNOWN";};
 const initials=name=>String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
 function render(){
  const q=$("playerSearch").value.trim().toLocaleLowerCase(),league=$("playerLeagueFilter").value,team=$("playerTeamFilter").value,pos=$("playerPositionFilter").value;
  const base=view==="research"?pilot.map(p=>({...p,kind:"research",name:p.name,teamName:"Manchester United",teamId:"manchester-united",leagueName:"Premier League",leagueId:"PL",season:"2026/27",number:p.shirt_number,positionGroup:p.position_group,position:p.official_position_label,statistics:{},photoUrl:p.photo_url||null})):canonical.filter(p=>view==="archive"?p.season!==CURRENT_SEASON:p.season===CURRENT_SEASON);
  const rows=base.filter(r=>(league==="ALL"||(r.leagueId||"unknown")===league)&&(team==="ALL"||(r.teamId||"unknown")===team)&&(pos==="ALL"||position(r)===pos)&&(!q||String(r.name||r.display_name||"").toLocaleLowerCase().includes(q))).sort((a,b)=>String(a.name||a.display_name).localeCompare(String(b.name||b.display_name)));
  const leagues=[...new Map(base.map(r=>[r.leagueId||"unknown",r.leagueName||r.leagueId||"ไม่ระบุลีก"])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const teams=[...new Map(base.map(r=>[r.teamId||"unknown",r.teamName||r.teamId||"ไม่ระบุทีม"])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const setOptions=(el,items,label)=>{const old=el.value||"ALL";el.innerHTML='<option value="ALL">'+label+'</option>'+items.map(([v,n])=>'<option value="'+esc(v)+'">'+esc(n)+'</option>').join("");el.value=items.some(x=>x[0]===old)?old:"ALL";};
  setOptions($("playerLeagueFilter"),leagues,"ทุกลีก");setOptions($("playerTeamFilter"),teams,"ทุกทีม");
  const unique=new Set(canonical.filter(p=>p.season===CURRENT_SEASON).map(p=>p.id)).size,archived=new Set(canonical.filter(p=>p.season&&p.season!==CURRENT_SEASON).map(p=>p.id)).size;
  $("playerDbSummary").innerHTML='<div class="player-stat"><b>'+unique+'</b><span>นักเตะฤดูกาล '+CURRENT_SEASON+'</span></div><div class="player-stat"><b>'+archived+'</b><span>รายการฤดูกาลเก่า</span></div><div class="player-stat"><b>'+pilot.length+'</b><span>Research Only</span></div>';
  $("playerDbStatus").textContent=directoryStatus+" · "+statsStatus+" · พบ "+rows.length+" รายการในมุมมองนี้";
  $("playerList").innerHTML=rows.length?rows.map(r=>{
   const research=r.kind==="research",s=r.statistics||{},name=r.name||r.display_name||"ไม่ระบุชื่อ",photo=r.photoUrl||r.photo_url||"",metrics=[["ลงเล่น",s.appearances],["ประตู",s.goals],["แอสซิสต์",s.assists],["นาที",s.minutes??s.minutes_played]];
   const avatar=photo?'<img class="player-avatar" src="'+esc(photo)+'" alt="รูป '+esc(name)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="player-avatar-fallback" hidden>'+esc(initials(name))+'</span>':'<span class="player-avatar-fallback">'+esc(initials(name))+'</span>';
   const photoCredit=research&&r.photo_source_url?'<div class="player-card-foot">ภาพ: '+esc(r.photo_author||"ไม่ระบุผู้ถ่าย")+' · '+esc(r.photo_license||"ไม่ระบุสัญญาอนุญาต")+' · <a href="'+esc(r.photo_source_url)+'" target="_blank" rel="noopener noreferrer">ดูแหล่งที่มาและเงื่อนไข</a><br>หมายเหตุ: ตรวจสอบสัญญาอนุญาตลิขสิทธิ์แล้ว แต่ยังไม่ได้ยืนยันสิทธิส่วนบุคคลของผู้ถูกถ่าย</div>':'';
   return '<article class="player-card"><div class="player-card-top"><div class="player-avatar-wrap">'+avatar+'</div><div class="player-main"><div class="player-name">'+esc(name)+'</div><div class="player-meta">'+esc(r.teamName||r.team_id||"ไม่ระบุทีม")+' · '+esc(r.leagueName||r.leagueId||"ไม่ระบุลีก")+'</div><div class="player-meta">'+esc(r.season||"ไม่ระบุฤดูกาล")+' · '+esc(labels[position(r)]||"ยังไม่ระบุตำแหน่ง")+' · เบอร์ '+fmt(r.number??r.shirt_number)+'</div></div><span class="player-status '+(research?"research":"canonical")+'">'+(research?"RESEARCH ONLY":view==="archive"?"ARCHIVE":"CANONICAL")+'</span></div>'+(research?'<div class="player-research-note"><b>ข้อมูลทดลอง — ไม่ใช่ข้อมูล Production</b><br>สิทธิ์แหล่งข้อมูล: '+esc(r.rights_status||"pending_review")+' · ยังไม่มีสถิติที่ผ่านการตรวจสอบ</div>'+photoCredit:'<div class="player-metrics">'+metrics.map(([k,v])=>'<div><b>'+fmt(v)+'</b><span>'+k+'</span></div>').join("")+'</div><div class="player-card-foot">Canonical ID: '+esc(r.id)+' · '+esc(r.verificationStatus||"identity_only")+'</div>')+'</article>';
  }).join(""):'<div class="empty">ไม่พบรายชื่อนักเตะในหมวดนี้ ลองเปลี่ยนตัวกรองหรือเข้าสู่ระบบ Cloud เพื่อโหลดข้อมูล Canonical</div>';
 }
 function setView(next){view=next;document.querySelectorAll("[data-player-view]").forEach(b=>b.classList.toggle("active",b.dataset.playerView===view));$("playerLeagueFilter").value="ALL";$("playerTeamFilter").value="ALL";render();}
 async function loadPilot(){try{const res=await fetch(PILOT_URL,{cache:"no-store"});if(!res.ok)throw new Error("HTTP "+res.status);const d=await res.json();pilot=Array.isArray(d.players)?d.players:[];directoryStatus="โหลดชุดทดลอง "+pilot.length+" คนแล้ว";}catch(e){pilot=[];directoryStatus="โหลดชุดทดลองไม่สำเร็จ: "+e.message;}render();}
 window.addEventListener("pft-player-directory-data",e=>{const d=e.detail||{};canonical=Array.isArray(d.players)?d.players:[];directoryStatus=d.status||"โหลด Canonical แล้ว";render();});
 window.addEventListener("pft-player-directory-status",e=>{directoryStatus=String(e.detail||"");render();});
 window.addEventListener("pft-player-stats-data",e=>{statsStatus=e.detail?.status||"ยังไม่ได้โหลดสถิติ";render();});
 document.querySelectorAll("[data-player-view]").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.playerView)));
 ["playerLeagueFilter","playerTeamFilter","playerPositionFilter"].forEach(id=>$(id).addEventListener("change",render));$("playerSearch").addEventListener("input",render);
 loadPilot();
})();