"use strict";
(() => {
 const REGISTRY_URL="./data/player-team-name-registry-2026-27.json";
 const LEAGUES=[["PL","Premier League"],["PD","La Liga"],["BL1","Bundesliga"],["SA","Serie A"],["FL1","Ligue 1"]];
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let registry=null, selectedLeague=null, selectedTeam=null, query="";
 const root=document.createElement("section");root.id="playerDatabasePage";root.className="page";
 root.innerHTML='<div class="pdb-head"><div><div class="pdb-eyebrow">FOOTBALL TIME · PLAYER DATABASE</div><h2>หมวดข้อมูลผู้เล่น</h2><p>เลือกลีกและทีมเพื่อเข้าสู่รายชื่อนักเตะ</p></div><span class="pdb-season">2026/27</span></div><div id="pdb-content"><div class="pdb-empty">กำลังโหลดทะเบียนทีม…</div></div>';
 document.querySelector("#main")?.appendChild(root);
 const content=()=>root.querySelector("#pdb-content");
 function render(){
  if(!registry){content().innerHTML='<div class="pdb-empty">ไม่สามารถโหลดทะเบียนทีมได้ กรุณาลองใหม่ภายหลัง</div>';return;}
  if(selectedTeam){
   content().innerHTML='<button class="pdb-back" data-back="teams">‹ กลับไปยังทีม</button><div class="pdb-team-hero"><span class="pdb-team-mark">'+esc(selectedTeam.name.slice(0,2).toUpperCase())+'</span><div><h3>'+esc(selectedTeam.name)+'</h3><p>'+esc(selectedLeague[1])+' · ฤดูกาล 2026/27</p></div></div><div class="pdb-empty pdb-no-data"><strong>ยังไม่มีข้อมูลนักเตะ</strong><span>ทีมนี้อยู่ในทะเบียนครบ 96 ทีมแล้ว แต่รายชื่อนักเตะยังไม่พร้อมแสดง</span></div>';
   return;
  }
  if(selectedLeague){
   const teams=Object.entries(registry.lookup[selectedLeague[0]]||{}).map(([id,name])=>({id,name})).filter(t=>t.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
   content().innerHTML='<button class="pdb-back" data-back="leagues">‹ กลับไปยังลีก</button><div class="pdb-section-title"><div><h3>'+esc(selectedLeague[1])+'</h3><p>'+teams.length+' ทีมในรายการ</p></div><span class="pdb-count">'+Object.keys(registry.lookup[selectedLeague[0]]||{}).length+' ทีม</span></div><label class="pdb-search"><span>ค้นหาทีม</span><input id="pdb-team-search" type="search" value="'+esc(query)+'" placeholder="พิมพ์ชื่อทีม…" autocomplete="off"></label><div class="pdb-team-list">'+teams.map(t=>'<button class="pdb-team-row" data-team="'+esc(t.id)+'"><span class="pdb-team-mark">'+esc(t.name.slice(0,2).toUpperCase())+'</span><span><b>'+esc(t.name)+'</b><small>ยังไม่มีข้อมูลรายชื่อนักเตะ</small></span><span class="pdb-chevron">›</span></button>').join("")+'</div>';
   const input=root.querySelector("#pdb-team-search");input?.addEventListener("input",e=>{query=e.target.value;const pos=e.target.selectionStart;render();const next=root.querySelector("#pdb-team-search");next?.focus();next?.setSelectionRange(pos,pos);});
   return;
  }
  content().innerHTML='<div class="pdb-intro"><strong>เลือกลีก</strong><span>ครอบคลุมทุกทีมจาก 5 ลีกใหญ่</span></div><div class="pdb-league-grid">'+LEAGUES.map(([id,name])=>'<button class="pdb-league-card" data-league="'+id+'"><span class="pdb-league-symbol">'+id+'</span><span><b>'+name+'</b><small>'+Object.keys(registry.lookup[id]||{}).length+' ทีม</small></span><span class="pdb-chevron">›</span></button>').join("")+'</div><div class="pdb-total"><b>96</b><span>ทีมทั้งหมดใน 5 ลีกใหญ่</span></div>';
 }
 root.addEventListener("click",e=>{
  const league=e.target.closest("[data-league]");if(league){selectedLeague=LEAGUES.find(x=>x[0]===league.dataset.league);selectedTeam=null;query="";render();return;}
  const team=e.target.closest("[data-team]");if(team){const name=registry.lookup[selectedLeague[0]][team.dataset.team];selectedTeam={id:team.dataset.team,name};render();return;}
  const back=e.target.closest("[data-back]");if(back){if(back.dataset.back==="leagues")selectedLeague=null;else selectedTeam=null;query="";render();}
 });
 fetch(REGISTRY_URL,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).then(data=>{
  const count=Object.values(data.lookup||{}).reduce((sum,league)=>sum+Object.keys(league).length,0);
  if(data.status!=="provider_display_names_verified"||data.production_import!==false||count!==96)throw Error("ทะเบียนทีมไม่ผ่านการตรวจสอบ");
  registry=data;render();
 }).catch(error=>{content().innerHTML='<div class="pdb-empty">โหลดทะเบียนทีมไม่สำเร็จ ('+esc(error.message)+')</div>';});
})();
