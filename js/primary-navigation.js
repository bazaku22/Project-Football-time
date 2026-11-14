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
    ["matchResearch","นำเข้าผลและสถิติ"],
    ["playerMatchEvents","บันทึกเหตุการณ์ผู้เล่น"],
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
    if (!$("#playerMatchEventEntryPage")) {
      const page = document.createElement("section");
      page.id = "playerMatchEventEntryPage";
      page.className = "page";
      page.innerHTML =
        '<div class="sectionhead"><h2>บันทึกเหตุการณ์ผู้เล่น</h2><span class="small">LOCAL MATCH LEDGER</span></div>' +
        '<p class="pme-intro">บันทึก Starting XI, ตัวสำรอง, การเปลี่ยนตัว, ประตู และแอสซิสต์จากหลักฐานการแข่งขัน เพื่อคำนวณสถิติผู้เล่นในฤดูกาล 2026/27 โดยข้อมูลอยู่ในอุปกรณ์นี้เท่านั้น</p>' +
        '<div class="pme-status pme-status-info">หน้านี้ไม่เรียก Provider API ไม่เขียน Supabase และไม่ส่งข้อมูลขึ้นเซิร์ฟเวอร์ · เพิ่มข้อมูลเฉพาะเมื่อมีแหล่งอ้างอิงที่ตรวจสอบได้</div>' +
        '<section class="pme-panel"><h3>1. เลือกแมตช์จากฐานข้อมูลหลัก</h3><div class="pme-grid">' +
        '<label class="pme-field">ลีก<select id="pmeCompetition" class="pme-control"><option value="all">ทุกลีก</option><option value="PL">Premier League</option><option value="PD">La Liga</option><option value="BL1">Bundesliga</option><option value="SA">Serie A</option><option value="FL1">Ligue 1</option></select></label>' +
        '<label class="pme-field">แมตช์<select id="pmeMatch" class="pme-control"><option value="">กำลังโหลดแมตช์…</option></select></label></div>' +
        '<div id="pmeMatchSummary" class="pme-match-summary"><div class="pme-empty">รอฐานข้อมูลฟุตบอลหลัก</div></div><div class="pme-actions"><button type="button" class="secondary" id="pmeReloadMatches">โหลดรายการใหม่</button><span id="pmeMatchCount" class="pme-note">—</span></div></section>' +
        '<section id="pmeEditor" class="pme-panel"><h3>2. แหล่งข้อมูลและสิทธิ์การใช้</h3><p class="pme-note">เพิ่ม URL แหล่งอ้างอิงโดยตรง ระบุสถานะสิทธิ์ตามหลักฐานจริง ค่าเริ่มต้นเป็น PENDING และจะไม่ถือว่าเผยแพร่ได้โดยอัตโนมัติ</p>' +
        '<div class="pme-grid"><label class="pme-field">ชื่อแหล่งข้อมูล<input id="pmeSourceName" class="pme-control" placeholder="เช่น Official Match Centre"></label><label class="pme-field">URL HTTPS<input id="pmeSourceUrl" type="url" class="pme-control" placeholder="https://…"></label>' +
        '<label class="pme-field">ประเภทแหล่งข้อมูล<select id="pmeSourceType" class="pme-control"><option value="official_competition">ผู้จัดการแข่งขัน</option><option value="federation">สมาคม / สหพันธ์</option><option value="licensed_provider">ผู้ให้บริการที่ได้รับอนุญาต</option><option value="other">อื่น ๆ</option></select></label>' +
        '<label class="pme-field">สิทธิ์การนำข้อมูลกลับมาใช้<select id="pmeSourceRights" class="pme-control"><option value="pending">ยังไม่ยืนยัน (PENDING)</option><option value="confirmed">ยืนยันแล้ว (CONFIRMED)</option><option value="prohibited">ห้ามใช้ (PROHIBITED)</option></select></label></div>' +
        '<label class="pme-field">หลักฐาน/ฐานสิทธิ์<input id="pmePermissionBasis" class="pme-control" placeholder="เช่น หนังสืออนุญาตหรือเลขที่สัญญา (ถ้ามี)"></label><button type="button" class="secondary" id="pmeAddSource">เพิ่มแหล่งข้อมูล</button><div id="pmeSourceList"></div></section>' +
        '<section class="pme-panel"><h3>3. รายชื่อผู้เล่น</h3><p class="pme-note">บันทึกทั้ง Starting XI และตัวสำรอง ผู้เล่นที่ยังยืนยันตัวตนไม่ได้จะถูกเก็บเป็น unresolved และไม่รวมยอดสถิติภายใต้ FT Player ID</p>' +
        '<div class="pme-grid"><label class="pme-field">ทีม<select id="pmeLineupTeam" class="pme-control"><option value="">เลือกแมตช์ก่อน</option></select></label><label class="pme-field">บทบาท<select id="pmePlayerRole" class="pme-control"><option value="starting_xi">ตัวจริง (Starting XI)</option><option value="substitute">ตัวสำรอง</option></select></label>' +
        '<label class="pme-field">ชื่อผู้เล่น<input id="pmePlayerName" class="pme-control" autocomplete="off" placeholder="ชื่อผู้เล่นตามแหล่งข้อมูล"></label><label class="pme-field">หมายเลขเสื้อ (ถ้ามี)<input id="pmeShirtNumber" type="number" min="1" max="99" class="pme-control" placeholder="เช่น 10"></label>' +
        '<label class="pme-field">FT Player ID<input id="pmePlayerId" class="pme-control" placeholder="FT-P-000001"></label><label class="pme-field">แหล่งอ้างอิงรายชื่อ (เลือกได้หลายรายการ)<select id="pmeLineupSources" class="pme-control" multiple size="3"></select></label></div>' +
        '<label class="pme-check"><input id="pmeIdentityConfirmed" type="checkbox"> ยืนยันตัวตนผู้เล่นแล้วและตรวจสอบ FT Player ID ถูกต้อง</label><button type="button" class="secondary" id="pmeAddLineup">เพิ่มผู้เล่นในรายชื่อ</button><div id="pmeLineupList"></div></section>' +
        '<section class="pme-panel"><h3>4. เหตุการณ์การแข่งขัน</h3><p class="pme-note">ลงนาทีจริง รวมเวลาทด เช่น 45+2 หรือ 90+4 · แอสซิสต์นับเฉพาะเมื่อแหล่งข้อมูลระบุชัดเจน · Own Goal ไม่เพิ่มประตูให้ผู้เล่นที่ทำเข้าประตูตัวเอง</p>' +
        '<div class="pme-grid"><label class="pme-field">ประเภทเหตุการณ์<select id="pmeEventType" class="pme-control"><option value="goal">ประตู</option><option value="substitution">เปลี่ยนตัว</option></select></label><label class="pme-field">นาที<input id="pmeEventMinute" class="pme-control" placeholder="เช่น 67 หรือ 90+3"></label></div>' +
        '<div id="pmeSubFields"></div><div id="pmeGoalFields"></div><label class="pme-field">แหล่งอ้างอิงเหตุการณ์ (เลือกได้หลายรายการ)<select id="pmeEventSources" class="pme-control" multiple size="3"></select></label><button type="button" class="secondary" id="pmeAddEvent">เพิ่มเหตุการณ์</button><div id="pmeEventList"></div></section>' +
        '<section class="pme-panel"><h3>5. ตรวจสอบความครบถ้วนและบันทึก</h3><div class="pme-grid">' +
        '<label class="pme-field">ความครบถ้วนของไลน์อัป<select id="pmeLineupCoverage" class="pme-control"><option value="unknown">ยังไม่ทราบ</option><option value="partial">บางส่วน</option><option value="complete">ครบถ้วน</option></select></label>' +
        '<label class="pme-field">ความครบถ้วนของเหตุการณ์<select id="pmeEventCoverage" class="pme-control"><option value="unknown">ยังไม่ทราบ</option><option value="partial">บางส่วน</option><option value="complete">ครบถ้วน</option></select></label></div>' +
        '<label class="pme-check"><input id="pmeReviewedConfirm" type="checkbox"> ยืนยันว่าตรวจสอบหลักฐานและความครบถ้วนของแมตช์นี้แล้ว</label><p id="pmeReviewState" class="pme-note">ยังไม่ผ่านการยืนยัน</p>' +
        '<div class="pme-actions"><button type="button" class="primary" id="pmeSave">บันทึกในอุปกรณ์นี้</button><button type="button" class="secondary" id="pmeExport">ส่งออก JSON</button></div><div id="pmeStatus" class="pme-status pme-status-info" role="status" aria-live="polite">รอเลือกแมตช์</div></section>' +
        '<section class="pme-panel"><h3>6. ข้อมูลที่บันทึกไว้ในอุปกรณ์นี้</h3><div id="pmeSummary"></div><div id="pmeSavedList"></div><div class="pme-actions"><button type="button" class="secondary" id="pmeRenderStats">คำนวณสถิติจากข้อมูลในเครื่อง</button><button type="button" class="secondary" id="pmeClear">ล้างข้อมูลในอุปกรณ์นี้</button></div><p id="pmeStatsStatus" class="pme-note">ยังไม่มีสถิติให้คำนวณ</p><div id="pmeStatsTable"></div><div class="pme-restore"><b>นำเข้า / กู้คืน Ledger JSON</b><p class="pme-note">เลือกไฟล์ที่ส่งออกจากเครื่องนี้หรือไฟล์ Ledger ที่จัดทำตาม Schema 2026/27 ระบบจะตรวจโครงสร้างและ Match ID ก่อนแทนที่ข้อมูลในอุปกรณ์นี้เท่านั้น</p><input id="pmeImportFile" type="file" accept=".json,application/json" class="pme-control" aria-label="เลือกไฟล์ Player Match Event Ledger JSON"><button type="button" class="secondary" id="pmeImport">ตรวจสอบและนำเข้าไฟล์</button><p id="pmeImportStatus" class="pme-note" role="status" aria-live="polite">ยังไม่ได้เลือกไฟล์</p></div><p class="pme-note">ข้อมูล Local Storage จะไม่ซิงก์ข้ามอุปกรณ์โดยอัตโนมัติ โปรดส่งออก JSON เพื่อสำรองข้อมูลก่อนเปลี่ยนอุปกรณ์ การส่งออกไม่ได้เป็นการอนุญาตให้เผยแพร่ข้อมูล</p></section>';
      $("#main")?.appendChild(page);
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
      } else if (target === "playerOperations") {
        activate("playerOperationsPage", null, "");
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      } else if (target === "playerMatchEvents") {
        activate("playerMatchEventEntryPage", null, "");
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
