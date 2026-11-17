"use strict";
(() => {
  const routes = {
    home: { page: "home" },
    leagues: { page: "fixtures", tab: "overview" },
    matches: { page: "home", focus: "#matchCenterApp" },
    tools: { page: "toolsHubPage" }
  };
  const $ = (selector) => document.querySelector(selector);
  function activate(page, tab, navKey, focus) {
    document.querySelectorAll(".page").forEach((node) => node.classList.toggle("active", node.id === page));
    document.querySelectorAll("[data-primary-route]").forEach((node) =>
      node.classList.toggle("active", node.dataset.primaryRoute === navKey)
    );
    if (tab && typeof window.switchDatabaseTab === "function") window.switchDatabaseTab(tab);
    if (page === "archive" && typeof window.render === "function") window.render();
    window.scrollTo(0, 0);
    if (focus) requestAnimationFrame(() => document.querySelector(focus)?.scrollIntoView({behavior:"smooth",block:"start"}));
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
        '<p class="mr-intro">นำเข้าข้อมูลที่ค้นคว้าและตรวจสอบแล้วสำหรับ 5 ลีกใหญ่ ฤดูกาล 2026/27 โดยไม่เขียนฐานข้อมูลส่วนกลาง</p>' +
        '<div class="mr-panel"><h3>1. เลือกไฟล์ข้อมูล</h3><p class="mr-note">ใช้ไฟล์ JSON ตามโครงสร้าง Manual Match Research · ขนาดไม่เกิน 2 MB · Google Search ใช้ค้นหาแหล่งต้นทางเท่านั้น ไม่ใช่หลักฐานต้นทาง</p>' +
        '<input id="mrFile" class="mr-file" type="file" accept=".json,application/json" aria-label="เลือกไฟล์ JSON สำหรับนำเข้าข้อมูล">' +
        '<div class="mr-actions"><button type="button" class="primary" id="mrValidateButton">ตรวจสอบไฟล์</button><button type="button" class="secondary" id="mrImportButton" disabled>นำเข้าในอุปกรณ์นี้</button></div>' +
        '<div id="mrStatus" class="mr-status" role="status" aria-live="polite">รอเลือกไฟล์</div><div id="mrPreview" class="mr-preview">ยังไม่มีไฟล์สำหรับตรวจสอบ</div>' +
        '<div class="mr-actions"><button type="button" class="secondary" id="mrTemplateButton">ดาวน์โหลดไฟล์ตัวอย่าง</button><button type="button" class="secondary" id="mrExportButton">ส่งออกข้อมูลที่เก็บไว้</button></div></div>' +
        '<div class="mr-panel"><h3>2. ข้อมูลในอุปกรณ์นี้</h3><div id="mrStoredSummary"></div><div id="mrStoredList"></div>' +
        '<button type="button" class="secondary" id="mrClearButton">ล้างข้อมูล Manual Research ในอุปกรณ์นี้</button>' +
        '<p class="mr-note">ข้อมูลจะถูกเก็บใน Local Storage ของเบราว์เซอร์นี้เท่านั้น ยังไม่ซิงก์ข้ามอุปกรณ์ ไม่ได้เผยแพร่สู่ผู้ใช้อื่น และยังไม่เปลี่ยนผลใน Match Center หรือฐานข้อมูล Supabase</p></div>' +
        '<div class="mr-panel"><h3>ข้อกำหนดการตรวจสอบ</h3><ul class="mr-note"><li>รายการ VERIFIED ต้องมีแหล่งข้อมูลโดยตรงอย่างน้อย 2 แหล่ง รวมผู้จัดการแข่งขัน สมาคม หรือผู้ให้บริการที่ได้รับอนุญาต</li><li>ต้องยืนยันสิทธิ์การใช้ข้อมูลทุกแหล่งก่อนระบุ VERIFIED</li><li>เก็บ Provider Match ID เดิมของการแข่งขันทั้ง 5 ลีกใหญ่</li><li>เรตติ้งแยกตามผู้ให้คะแนน ไม่เฉลี่ยข้ามผู้ให้บริการ</li><li>ข้อมูลที่ไม่ครบหรือขัดแย้งต้องใช้ needs_review หรือ unverified</li></ul></div>';
      $("main")?.appendChild(researchPage);
    }
    if (!$("#footballEcosystemExportPage")) {
      const page = document.createElement("section");
      page.id = "footballEcosystemExportPage";
      page.className = "page";
      page.innerHTML =
        '<div class="sectionhead"><h2>ส่งออกข้อมูลไป Football rich</h2><span class="small">FOOTBALL ECOSYSTEM · V1.0</span></div>' +
        '<div class="card"><b>Fixtures · 5 ลีกหลัก · ฤดูกาล 2026/27</b>' +
        '<p class="profile-note">สร้างไฟล์ JSON จากฐานข้อมูล Football Time ที่โหลดอยู่ในอุปกรณ์นี้ เพื่อส่งไปนำเข้าใน Football rich โดยตรง รวมโปรแกรมทุกสถานะ แต่ไม่รวมสกอร์หรือผลการแข่งขันจริง</p>' +
        '<div class="quality-note">ขอบเขต: Premier League, La Liga, Bundesliga, Serie A และ Ligue 1 · ใช้ Shared Match ID จาก Provider Match ID เดิม · ไม่เรียก API เพิ่มและไม่แก้ไขข้อมูลต้นฉบับ</div>' +
        '<button type="button" class="primary" id="ftEcosystemExportPreviewButton">ตรวจสอบข้อมูลและเตรียมไฟล์</button>' +
        '<div id="ftEcosystemExportSummary" class="small" aria-live="polite">ยังไม่ได้ตรวจสอบข้อมูล</div>' +
        '<button type="button" class="secondary" id="ftEcosystemExportDownloadButton" disabled>ดาวน์โหลดไฟล์ JSON</button>' +
        '<p id="ftEcosystemExportStatus" class="profile-note" role="status" aria-live="polite">รอฐานข้อมูลฟุตบอลหลัก</p></div>' +
        '<div class="card"><b>Match Results · ผลจริงพร้อมประวัติ Revision</b>' +
        '<p class="profile-note">ส่งออกเฉพาะผลที่ FT ยืนยันเป็น FINISHED ใน 5 ลีกหลัก พร้อมเลข Revision, เวลาอัปเดต, แหล่งข้อมูล และประวัติทุก Revision เพื่อให้ Football rich ประเมินผลได้โดยไม่เขียนทับประวัติเดิม</p>' +
        '<div class="quality-note">ระบบจะยกเลิกการส่งออกทั้งชุดทันที หากพบผลที่ไม่มี Revision/Provenance หรือประวัติไม่ตรงกับผลล่าสุด · ไม่มีการเดาเลข Revision และไม่มีการแก้ข้อมูลต้นฉบับ</div>' +
        '<button type="button" class="secondary" id="ftEcosystemResultAuditButton">ตรวจสอบความพร้อมของผลเก่า (อ่านอย่างเดียว)</button>' +
        '<button type="button" class="primary" id="ftEcosystemResultPreviewButton">ตรวจสอบผลจริงและเตรียมไฟล์</button>' +
        '<div id="ftEcosystemResultSummary" class="small" aria-live="polite">ยังไม่ได้ตรวจสอบผลจริง</div>' +
        '<button type="button" class="secondary" id="ftEcosystemResultDownloadButton" disabled>ดาวน์โหลดไฟล์ผลจริง JSON</button>' +
        '<p id="ftEcosystemResultStatus" class="profile-note" role="status" aria-live="polite">รอฐานข้อมูลผลการแข่งขัน</p></div>' +
        '<div class="card"><b>Legacy Match Results · ผลเก่าที่ไม่มี Revision History</b>' +
        '<p class="profile-note">ส่งออกสกอร์เก่าที่มี Match ID และคะแนนครบ เพื่อเก็บเป็น Legacy Snapshot แยกจากผลที่มี Revision History · ใช้ประกอบการประเมินย้อนหลังได้โดยต้องแสดงสถานะว่าไม่ได้ตรวจสอบอิสระ</p>' +
        '<div class="quality-note">ไฟล์นี้ไม่มีเลข Revision และไม่มี Revision History · เวลา Database Generated ใช้บอกเวลาของ Snapshot เท่านั้น ไม่ใช่เวลายืนยันผลการแข่งขัน · รายการที่ไม่มี Match ID หรือสกอร์ถูกต้องจะถูกข้าม</div>' +
        '<button type="button" class="primary" id="ftEcosystemLegacyResultPreviewButton">ตรวจสอบ Legacy Snapshot และเตรียมไฟล์</button>' +
        '<div id="ftEcosystemLegacyResultSummary" class="small" aria-live="polite">ยังไม่ได้ตรวจสอบ Legacy Snapshot</div>' +
        '<button type="button" class="secondary" id="ftEcosystemLegacyResultDownloadButton" disabled>ดาวน์โหลด Legacy Snapshot JSON</button></div>' +
        '<div class="card"><b>วิธีนำเข้าใน Football rich</b><ol class="profile-note"><li>ดาวน์โหลดไฟล์ JSON จากหน้านี้</li><li>เปิด Football rich → เครื่องมือ → นำเข้าข้อมูลจาก Football Time</li><li>เลือกไฟล์ JSON และตรวจสอบตัวอย่างก่อนยืนยันนำเข้า</li></ol><p class="profile-note">ไม่ต้องล้างข้อมูลหรือแคชของแอปใด ๆ ก่อนนำเข้า</p></div>';
      $("#main")?.appendChild(page);
      if (!document.querySelector('script[data-ft-fixture-export]')) {
        const script = document.createElement("script");
        script.src = "./js/football-ecosystem-export.js";
        script.dataset.ftFixtureExport = "true";
        document.body.appendChild(script);
      }
    }
    const nav = $(".nav");
    if (!nav) return;
    nav.innerHTML = [
      '<button type="button" data-primary-route="home" class="active" aria-current="page"><span aria-hidden="true">⌂</span><b>หน้าหลัก</b></button>',
      '<button type="button" data-primary-route="leagues"><span aria-hidden="true">🏆</span><b>ลีกและทีม</b></button>',
      '<button type="button" data-primary-route="matches"><span aria-hidden="true">⚽</span><b>แมตช์</b></button>',
      '<button type="button" data-primary-route="tools"><span aria-hidden="true">▦</span><b>เครื่องมือ</b></button>'
    ].join("");
    nav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-primary-route]");
      if (!button) return;
      const route = routes[button.dataset.primaryRoute];
      if (route) activate(route.page, route.tab, button.dataset.primaryRoute, route.focus);
    });
    if (!$("#toolsHubPage")) {
      const page = document.createElement("section");
      page.id = "toolsHubPage";
      page.className = "page";
      page.innerHTML = '<div class="pn-tools-hero"><span class="pn-tools-icon">▦</span><div><div class="pn-tools-eyebrow">FOOTBALL TIME</div><h2>เครื่องมือ</h2><p>รวมเครื่องมือที่ใช้งานจริง แยกตามหน้าที่</p></div></div>' +
        '<section class="pn-tools-group"><h3>วิเคราะห์และประเมินผล</h3><p>เครื่องมือหลักสำหรับตรวจสอบการคาดการณ์และข้อมูลย้อนหลัง</p><div class="pn-tool-grid">' +
        '<button type="button" data-secondary-route="analyze">วิเคราะห์การแข่งขัน</button><button type="button" data-secondary-route="history">ประวัติการวิเคราะห์</button><button type="button" data-secondary-route="advanced">วิเคราะห์เชิงลึก</button>' +
        '</div></section><section class="pn-tools-group"><h3>จัดการและเชื่อมต่อข้อมูล</h3><p>นำเข้าข้อมูลที่ตรวจสอบแล้ว และส่งออกผลจริงไปยัง Football rich</p><div class="pn-tool-grid">' +
        '<button type="button" data-secondary-route="matchResearch">นำเข้าผลและสถิติ</button><button type="button" data-secondary-route="footballEcosystemExport">ส่งออกไป Football rich</button>' +
        '</div></section><details class="pn-tools-advanced"><summary>พื้นที่ทดลองและคลังข้อมูลเก่า</summary><p>ส่วนนี้เก็บเครื่องมือทดลองและข้อมูล Legacy แยกจากการใช้งานประจำวัน โดยไม่ลบประวัติเดิม</p><div class="pn-tool-grid">' +
        '<button type="button" data-secondary-route="summary">สรุปผลโมเดลทดลอง</button><button type="button" data-secondary-route="archive">คลังข้อมูล Legacy</button>' +
        '</div></details><p class="pn-tools-note">เครื่องมือทั้งหมดทำงานตามขอบเขตข้อมูลเดิมของ Football Time · ไม่มีการเพิ่ม API หรือบริการเสียค่าใช้จ่าย</p>';
      $("#main")?.appendChild(page);
    }
    const toolHub = $("#toolsHubPage");
    toolHub?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-secondary-route]");
      if (!button) return;
      const target = button.dataset.secondaryRoute;
      if (target === "analyze") {
        activate("matchAnalysis", null, "");
      } else if (target === "history") {
        activate("analysisHistory", null, "");
      } else if (target === "footballEcosystemExport") {
        activate("footballEcosystemExportPage", null, "");
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
    home?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-primary-route]");
      if (!button) return;
      const route = routes[button.dataset.primaryRoute];
      if (route) activate(route.page, route.tab, button.dataset.primaryRoute, route.focus);
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
