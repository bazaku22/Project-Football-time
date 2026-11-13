(function(){
"use strict";
const KEY="pft_notifications_v1",VERSION_KEY="pft_seen_app_version_v1",DB_KEY="pft_seen_football_db_stamp_v1",MAX=50;
let items=load(),dialog,list,badge,toastRoot;
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function save(){try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,MAX)))}catch(_){}render()}
function render(){if(badge)badge.textContent=String(items.filter(x=>!x.read).length);if(list)list.innerHTML=items.length?items.map(x=>'<article class="pft-notice-item '+(x.read?'is-read':'')+'"><span class="pft-notice-icon '+esc(x.type)+'">'+({success:"✓",info:"i",warning:"!",error:"×"}[x.type]||"i")+'</span><div class="pft-notice-copy"><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+esc(new Date(x.createdAt).toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"}))+'</small></div></article>').join(""):'<div class="pft-notice-empty">ยังไม่มีการแจ้งเตือน</div>'}
function toast(x){if(!toastRoot)return;const n=document.createElement("div");n.className="pft-toast "+x.type;n.innerHTML='<span class="pft-toast-mark">●</span><span><b>'+esc(x.title)+'</b><small>'+esc(x.message)+'</small></span><button type="button" aria-label="ปิด">×</button>';n.querySelector("button").onclick=()=>n.remove();toastRoot.append(n);setTimeout(()=>n.remove(),5200)}
function notify({title,message,type="info",showToast=true,dedupeKey}){if(dedupeKey&&items.some(x=>x.dedupeKey===dedupeKey))return;const x={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),title,message,type,createdAt:new Date().toISOString(),read:false,dedupeKey:dedupeKey||null};items.unshift(x);items=items.slice(0,MAX);save();if(showToast)toast(x)}
function open(){if(dialog&&!dialog.open)dialog.showModal();items=items.map(x=>({...x,read:true}));save()}
function init(){
 dialog=document.getElementById("pftNotificationDialog");list=document.getElementById("pftNotificationList");badge=document.getElementById("pftNotificationUnread");toastRoot=document.getElementById("pftToastRoot");
 document.getElementById("pftNotificationButton")?.addEventListener("click",open);
 document.getElementById("pftNotificationClose")?.addEventListener("click",()=>dialog.close());
 document.getElementById("pftNotificationClear")?.addEventListener("click",()=>{items=[];save()});render();
 const version=document.querySelector('meta[name="application-version"]')?.content;
 if(version){const old=localStorage.getItem(VERSION_KEY);if(old&&old!==version)notify({title:"Football Time อัปเดตแล้ว",message:"ขณะนี้เป็นเวอร์ชัน "+version,type:"success",dedupeKey:"app-version:"+version});localStorage.setItem(VERSION_KEY,version)}
 document.addEventListener("pft-football-database-ready",e=>{const d=e.detail||{},stamp=d.lastSuccessfulSync||d.generatedAt||"";if(!stamp)return;const old=localStorage.getItem(DB_KEY);if(old&&old!==stamp)notify({title:"อัปเดตข้อมูลการแข่งขันแล้ว",message:"ฐานข้อมูลฟุตบอลได้รับการอัปเดต ("+stamp+")",type:"success",dedupeKey:"football-db:"+stamp});localStorage.setItem(DB_KEY,stamp)});
 document.addEventListener("pft-football-database-error",e=>notify({title:"โหลดข้อมูลการแข่งขันไม่สำเร็จ",message:e.detail?.message||"โปรดลองอีกครั้งภายหลัง",type:"error",dedupeKey:"db-error:"+new Date().toISOString().slice(0,13)}));
 if("serviceWorker" in navigator){let hadController=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(hadController)notify({title:"Football Time อัปเดตแล้ว",message:"ระบบแอปเวอร์ชันล่าสุดเริ่มทำงานแล้ว",type:"success",dedupeKey:"sw-activated:"+navigator.serviceWorker.controller?.scriptURL});hadController=true});navigator.serviceWorker.getRegistration().then(reg=>{if(!reg)return;const check=()=>{if(reg.waiting&&navigator.serviceWorker.controller)notify({title:"มีแอปเวอร์ชันใหม่พร้อมใช้งาน",message:"รีเฟรชหน้าแอปเพื่อเริ่มใช้เวอร์ชันล่าสุด",type:"info",showToast:false,dedupeKey:"sw-update:"+reg.waiting.scriptURL})};check();reg.addEventListener("updatefound",()=>{const w=reg.installing;if(w)w.addEventListener("statechange",()=>{if(w.state==="installed")check()})})}).catch(()=>{});}
}
window.FootballTimeNotifications={notify,open,getAll:()=>items.slice()};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();