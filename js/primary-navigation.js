"use strict";
(() => {
  const routes = {
    home: { page: "home" },
    leagues: { page: "fixtures", tab: "overview" },
    analyze: { page: "matchAnalysis", tab: "probability" },
    history: { page: "analysisHistory", tab: "accuracy" }
  };
  const secondary = [
    ["summary","สรุปผลโมเดลทดลอง"],
    ["analysis","หลักการวิเคราะห์"],
    ["archive","คลัง Legacy"],
    ["advanced","วิเคราะห์เชิงลึก"],
    ["internationalHandicap","ทีมชาติ AH"],
    ["matchResearch","นำเข้าผลและสถิติ"]
  ];
  const $ = (selector) => document.querySelector(selector);
  function activate(page, tab, navKey) {
    document.querySelectorAll(".page").forEach((node) => node.classList.toggle("active", node.id === page));
    document.querySelectorAll("[data-primary-route]").forEach((node) =>
      node.classList.toggle("active", node.dataset.primaryRoute === navKey)
    );
    if (tab && typeof window.switchDatabaseTab === "function") window.switchDatabaseTab(tab);
    if (page === "archive" && typeof window.render === "function") window.render();
    window.scrollTo(0, 0);
  }
  function mount() {
    const fixtures = $("#fixtures");
    if (fixtures && !$("#matchAnalysis") && !$("#analysisHistory")) {
      const analysisPanel = $("#dbtab-probability");
      const historyPanel = $("#dbtab-accuracy");
      const analysisPage = document.createElement("section");
      analysisPage.id = "matchAnalysis";
      analysisPage.className = "page";
      analysisPage.innerHTML = '<div class="sectionhead"><h2>วิเคราะห์การแข่งขัน</h2><span class="small">MATCH ANALYSIS</span></div><p class="profile-note">เลือกคู่แข่งขันเพื่อดูความน่าจะเป็น 1X2 และ Handicap จาก Score Distribution ชุดเดียวกัน พร้อมเหตุผลและข้อจำกัดของข้อมูล</p>';
      const historyPage = document.createElement("section");
      historyPage.id = "analysisHistory";
      historyPage.className = "page";
      historyPage.innerHTML = '<div class="sectionhead"><h2>ประวัติการวิเคราะห์</h2><span class="small">ANALYSIS HISTORY</span></div><p class="profile-note">ตรวจสอบผลการประเมินและ Calibration จากคำทำนายก่อนแข่งที่บันทึกไว้ โดยไม่เขียนทับ Snapshot เดิม</p>';
      if (analysisPanel) analysisPage.appendChild(analysisPanel);
      if (historyPanel) historyPage.appendChild(historyPanel);
      fixtures.after(analysisPage, historyPage);
      document.querySelectorAll('[data-db-tab="probability"],[data-db-tab="accuracy"]').forEach(button => button.remove());
    }
    if (!$("#manualMatchResearchPage")) {
      const researchPage = document.createElement("section");
      researchPage.id = "manualMatchResearchPage";
      researchPage.className = "page";
      researchPage.innerHTML = '<div class="sectionhead"><h2>นำเข้าผลและสถิติการแข่งขัน</h2><span class="small">MANUAL RESEARCH</span></div>' +
        '<p class="mr-intro">นำเข้าข้อมูลที่ค้นคว้าและตรวจสอบแล้วสำหรับฤดูกาล 2026/27 รองรับ 5 ลีกหลักและ UEFA Nations League โดยไม่เรียก API และไม่เขียนฐานข้อมูลส่วนกลาง</p>' +
        '<div class="mr-panel"><h3>1. เลือกไฟล์ข้อมูล</h3><p class="mr-note">ใช้ไฟล์ JSON ตามโครงสร้าง Manual Match Research · ขนาดไม่เกิน 2 MB · Google Search ใช้ค้นหาแหล่งต้นทางเท่านั้น ไม่ใช่หลักฐานต้นทาง</p>' +
        '<input id="mrFile" class="mr-file" type="file" accept=".json,application/json" aria-label="เลือกไฟล์ JSON สำหรับนำเข้าข้อมูล">' +
        '<div class="mr-actions"><button type="button" class="primary" id="mrValidateButton">ตรวจสอบไฟล์</button><button type="button" class="secondary" id="mrImportButton" disabled>นำเข้าในอุปกรณ์นี้</button></div>' +
        '<div id="mrStatus" class="mr-status" role="status" aria-live="polite">รอเลือกไฟล์</div><div id="mrPreview" class="mr-preview">ยังไม่มีไฟล์สำหรับตรวจสอบ</div>' +
        '<div class="mr-actions"><button type="button" class="secondary" id="mrTemplateButton">ดาวน์โหลดไฟล์ตัวอย่าง</button><button type="button" class="secondary" id="mrExportButton">ส่งออกข้อมูลที่เก็บไว้</button></div></div>' +
        '<div class="mr-panel"><h3>2. ข้อมูลในอุปกรณ์นี้</h3><div id="mrStoredSummary"></div><div id="mrStoredList"></div>' +
        '<button type="button" class="secondary" id="mrClearButton">ล้างข้อมูล Manual Research ในอุปกรณ์นี้</button>' +
        '<p class="mr-note">ข้อมูลจะถูกเก็บใน Local Storage ของเบราว์เซอร์นี้เท่านั้น ยังไม่ซิงก์ข้ามอุปกรณ์ ไม่ได้เผยแพร่สู่ผู้ใช้อื่น และยังไม่เปลี่ยนผลใน Match Center หรือฐานข้อมูล Supabase</p></div>' +
        '<div class="mr-panel"><h3>ข้อกำหนดการตรวจสอบ</h3><ul class="mr-note"><li>รายการ VERIFIED ต้องมีแหล่งข้อมูลโดยตรงอย่างน้อย 2 แหล่ง รวมผู้จัดการแข่งขัน สมาคม หรือผู้ให้บริการที่ได้รับอนุญาต</li><li>ต้องยืนยันสิทธิ์การใช้ข้อมูลทุกแหล่งก่อนระบุ VERIFIED</li><li>เก็บ Provider Match ID เดิมของสโมสรและ International Fixture ID เดิมของ Nations League</li><li>เรตติ้งแยกตามผู้ให้คะแนน ไม่เฉลี่ยข้ามผู้ให้บริการ</li><li>ข้อมูลที่ไม่ครบหรือขัดแย้งต้องใช้ needs_review หรือ unverified</li></ul></div>';
      $("main")?.appendChild(researchPage);
    }
    const nav = $(".nav");
    if (!nav) return;
    nav.innerHTML = [
      '<button type="button" data-primary-route="home" class="active" aria-current="page">⚽ Match Center</button>',
      '<button type="button" data-primary-route="leagues">▤ ลีกและทีม</button>',
      '<button type="button" data-primary-route="analyze">◎ วิเคราะห์</button>',
      '<button type="button" data-primary-route="history">▥ ประวัติ</button>'
    ].join("");
    nav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-primary-route]");
      if (!button) return;
      const route = routes[button.dataset.primaryRoute];
      if (route) activate(route.page, route.tab, button.dataset.primaryRoute);
    });
    const home = $("#home");
    if (home && !$("#secondaryTools")) {
      const details = document.createElement("details");
      details.id = "secondaryTools";
      details.className = "pn-secondary card";
      details.innerHTML = '<summary>เครื่องมือเพิ่มเติม</summary><p class="pn-note">รวมเครื่องมือรองที่ยังเปิดใช้งาน โดยไม่ปะปนกับเมนูหลัก</p><div class="pn-tool-grid">' +
        secondary.map(([id,label]) => '<button type="button" class="secondary" data-secondary-route="' + id + '">' + label + '</button>').join("") +
        '</div>';
      const experiment = home.querySelector(".mc-experiment");
      if (experiment) home.insertBefore(details, experiment);
      else home.appendChild(details);
    }
    home?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-secondary-route]");
      if (!button) return;
      const target = button.dataset.secondaryRoute;
      if (target === "internationalHandicap") {
        activate("internationalHandicap", null, "");
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      } else if (target === "advanced") {
        activate("fixtures", "advanced", "");
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      } else if (target === "matchResearch") {
        activate("manualMatchResearchPage", null, "");
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      } else {
        activate(target, null, "");
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      }
    });
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
