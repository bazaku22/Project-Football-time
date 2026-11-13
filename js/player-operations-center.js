"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const phases = [
    {
      n:"01", title:"ตรวจสอบฐานข้อมูลและรักษาข้อมูลเดิม", status:"พร้อมแล้ว", tone:"success",
      detail:"ตรวจสอบโครงสร้าง ft_* และข้อมูลเดิมแบบอ่านอย่างเดียวแล้ว ไม่ลบหรือย้ายข้อมูล Arsenal 2025/26 และไม่แตะ Local Storage เดิม",
      evidence:"ฐานข้อมูลล่าสุดที่ตรวจ: 29 canonical players · 29 provider ID mappings · 29 memberships · 29 current-stat rows · 29 source observations · 1 import batch"
    },
    {
      n:"02", title:"ตัวตนกลางและการจับคู่ Provider ID", status:"มีฐานระบบแล้ว", tone:"success",
      detail:"ใช้ canonical player ID และ exact (source_name, provider_player_id) mapping เท่านั้น ไม่รวมผู้เล่นจากชื่อคล้ายกัน และเก็บรายการขัดแย้งไว้ตรวจสอบ",
      evidence:"โครงสร้าง ft_players และ ft_player_source_ids พร้อมใช้งาน"
    },
    {
      n:"03", title:"นำเข้ารายชื่อนักเตะและสังกัดตามฤดูกาล", status:"ต้องเติมข้อมูล 2026/27", tone:"warning",
      detail:"มี squad intake, team reference และ reconciliation pipeline แล้ว แต่ข้อมูล Canonical ที่ตรวจล่าสุดยังเป็น Arsenal ฤดูกาล 2025/26 ไม่ใช่ roster ครบทั้ง 5 ลีกใน 2026/27",
      evidence:"StrikerAPI squad workflow มีอยู่แล้ว แต่ยังไม่เริ่มเรียก API ในงานรอบนี้"
    },
    {
      n:"04", title:"นำเข้าสถิติลีก ฤดูกาล และรายแมตช์", status:"โครงสร้างพร้อม · ข้อมูลยังไม่ครบ", tone:"warning",
      detail:"มี source records, current stats, change history, CSV preview และ atomic import RPC รองรับ season / competition / match scope โดยคง null เป็น unknown",
      evidence:"ข้อมูลจริงที่ตรวจล่าสุด: 29 source records จาก OpenPlay สำหรับ 2025/26; ยังไม่มีการนำเข้าสถิติ 2026/27 ในรอบนี้"
    },
    {
      n:"05", title:"ตรวจสิทธิ์ คุณภาพ และรายการรอตรวจ", status:"มีเครื่องมือ · ต้องรวมศูนย์", tone:"warning",
      detail:"มี manifest validator, identity review, team alias review, duplicate checks และ rights register แยกสิทธิ์ตาม source/field แต่ยังต้องให้มนุษย์ตัดสินกรณีคลุมเครือ",
      evidence:"ข้อมูลที่สิทธิ์ pending หรือไม่ชัดเจนต้องถูกกักไว้ ไม่อนุมัติอัตโนมัติ"
    },
    {
      n:"06", title:"ซิงก์ตามรอบและติดตามความครอบคลุม", status:"รออนุมัติการเรียก Provider", tone:"warning",
      detail:"มี GitHub Actions สำหรับอัปเดตฐานนักเตะและงานตามรอบแล้ว แต่การดึงข้อมูลจริงอาจใช้ API credits และต้องตรวจ secret/แผนบริการก่อน",
      evidence:"ไม่มีการเรียก Provider API หรือใช้เครดิต และไม่มี Production write ในการทำ Operations Center นี้"
    }
  ];
  function mount() {
    const main = $("#main");
    if (!main || $("#playerOperationsPage")) return;
    const page = document.createElement("section");
    page.id = "playerOperationsPage";
    page.className = "page";
    page.innerHTML = `
      <div class="sectionhead"><h2>ศูนย์จัดการระบบนักเตะ</h2><span class="small">PLAYER DATA OPERATIONS</span></div>
      <p class="poc-intro">เป้าหมายคือให้ Football Time รวบรวมและจัดระเบียบข้อมูลแทนการกรอกทีละคน โดยคุณตรวจเฉพาะรายการที่ระบบยังไม่มั่นใจ</p>
      <div class="poc-snapshot">
        <div class="poc-snapshot-head"><b>ภาพรวมฐานข้อมูลล่าสุด</b><span>ตรวจแบบอ่านอย่างเดียว · 14 พ.ย. 2026</span></div>
        <div class="poc-kpis">
          <div><b>29</b><span>Canonical players</span></div>
          <div><b>29</b><span>Provider ID mappings</span></div>
          <div><b>29</b><span>Season memberships</span></div>
          <div><b>29</b><span>Current stat rows</span></div>
        </div>
        <p class="poc-footnote">ข้อมูล Canonical ที่ตรวจพบเป็นชุด Arsenal 2025/26 และต้องคงอยู่ใน Archive ไม่ย้ายไปเป็นฤดูกาล 2026/27 โดยอัตโนมัติ</p>
      </div>
      <div class="poc-section-title"><b>ความคืบหน้า 6 เฟส</b><span>สถานะตามหลักฐานที่ตรวจได้</span></div>
      <div id="pocPhaseList" class="poc-phase-list"></div>
      <div class="poc-section-title"><b>ระบบที่มีอยู่แล้ว</b><span>ต่อยอดของเดิม ไม่สร้างซ้ำ</span></div>
      <div class="poc-tools">
        <a href="https://github.com/bazaku22/Project-Football-time/blob/main/js/player-cloud.js" target="_blank" rel="noopener noreferrer"><b>Cloud Player Data</b><span>อ่านข้อมูล Canonical และ scoped statistics ตามสิทธิ์บัญชี</span></a>
        <a href="https://github.com/bazaku22/Project-Football-time/blob/main/js/player-stats-import.js" target="_blank" rel="noopener noreferrer"><b>Statistics Import Preview</b><span>ตรวจ CSV, exact ID mapping, scope, metrics และ duplicate ก่อนนำเข้า</span></a>
        <a href="https://github.com/bazaku22/Project-Football-time/blob/main/scripts/player_reconciliation_pipeline.py" target="_blank" rel="noopener noreferrer"><b>Identity Reconciliation</b><span>จับคู่ผู้เล่นและทีมแบบ offline โดยไม่เดา canonical ID</span></a>
        <a href="https://github.com/bazaku22/Project-Football-time/blob/main/docs/player-open-data-source-assessment-2026-11.md" target="_blank" rel="noopener noreferrer"><b>Source Rights Register</b><span>ตรวจสิทธิ์การใช้ข้อมูลแยกตามผู้ให้บริการและประเภทข้อมูล</span></a>
        <a href="https://github.com/bazaku22/Project-Football-time/blob/main/supabase/migrations/20261112110000_add_atomic_player_stats_import_rpc.sql" target="_blank" rel="noopener noreferrer"><b>Atomic Import RPC</b><span>รองรับการนำเข้าสถิติแบบ transaction เมื่อผ่านการอนุมัติและ deployment gate</span></a>
        <a href="https://github.com/bazaku22/Project-Football-time/actions/workflows/update-player-database.yml" target="_blank" rel="noopener noreferrer"><b>Scheduled Player Sync</b><span>Workflow เดิมสำหรับซิงก์รายชื่อและสถิติ ไม่ได้เริ่มทำงานจากหน้านี้</span></a>
      </div>
      <div class="poc-gate">
        <b>ประตูความปลอดภัยก่อนเติมข้อมูลจริง</b>
        <ul>
          <li>ต้องมี Provider API key ที่ถูกต้องและยืนยันค่าใช้จ่าย/เครดิตก่อนเรียก API</li>
          <li>ต้องตรวจสิทธิ์แหล่งข้อมูลและขอบเขตการเก็บ/แสดงผลก่อนนำเข้า</li>
          <li>ต้องตรวจ exact player ID, team, league, season และ metric definitions</li>
          <li>ต้องผ่าน preview, duplicate checks และ review ก่อนเขียน Production</li>
          <li>ไม่ลบหรือเขียนทับข้อมูลเดิม และไม่รวมข้อมูลที่มี scope ซ้ำกัน</li>
        </ul>
        <p>หน้านี้เป็นแดชบอร์ดติดตามงาน ไม่ได้เรียก Provider API, ไม่ใช้เครดิต, ไม่เขียน Supabase และไม่เปลี่ยนข้อมูลในอุปกรณ์</p>
      </div>
    `;
    main.appendChild(page);
    const phaseRoot = $("#pocPhaseList");
    phases.forEach((phase) => {
      const article = document.createElement("article");
      article.className = "poc-phase";
      article.innerHTML = `
        <div class="poc-phase-top"><span class="poc-phase-num">${esc(phase.n)}</span><b>${esc(phase.title)}</b><span class="poc-state poc-${esc(phase.tone)}">${esc(phase.status)}</span></div>
        <p>${esc(phase.detail)}</p><small>${esc(phase.evidence)}</small>
      `;
      phaseRoot.appendChild(article);
    });
    const grid = $("#secondaryTools .pn-tool-grid");
    if (grid && !grid.querySelector('[data-secondary-route="playerOperations"]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary";
      button.dataset.secondaryRoute = "playerOperations";
      button.textContent = "ศูนย์จัดการระบบนักเตะ";
      grid.appendChild(button);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
