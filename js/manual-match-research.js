"use strict";
(() => {
  const STORAGE_KEY = "pft_manual_match_research_2026_27_v1";
  const COMPETITIONS = new Set(["PL","PD","BL1","SA","FL1","UNL"]);
  const CLUB = new Set(["PL","PD","BL1","SA","FL1"]);
  const AUTHORITATIVE = new Set(["competition_organiser","federation","licensed_provider"]);
  const RIGHTS = new Set(["confirmed","pending","prohibited"]);
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
  let pendingDataset = null;
  let pendingFileName = "";

  function emptyDataset() {
    return {
      schema_version:"1.0.0",
      dataset_id:"manual-match-research-2026-27",
      season:"2026/27",
      dataset_status:"research_intake_empty",
      scope:{
        club_competitions:["PL","PD","BL1","SA","FL1"],
        international_competitions:["UNL"],
        excluded:["friendlies","other_national_competitions"]
      },
      timezone:"Asia/Bangkok",
      updated_at:null,
      records:[]
    };
  }

  function loadStored() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && Array.isArray(value.records) ? value : emptyDataset();
    } catch (_) {
      return emptyDataset();
    }
  }

  function validateDataset(data) {
    const errors = [];
    if (!data || data.schema_version !== "1.0.0" ||
        data.dataset_id !== "manual-match-research-2026-27") {
      return ["รูปแบบหรือรหัสชุดข้อมูลไม่ถูกต้อง"];
    }
    if (data.season !== "2026/27" || data.timezone !== "Asia/Bangkok") {
      errors.push("รองรับเฉพาะฤดูกาล 2026/27 และเขตเวลา Asia/Bangkok");
    }
    if (JSON.stringify(data.scope?.club_competitions) !== JSON.stringify(["PL","PD","BL1","SA","FL1"]) ||
        JSON.stringify(data.scope?.international_competitions) !== JSON.stringify(["UNL"])) {
      errors.push("ขอบเขตต้องเป็น 5 ลีกหลักและ UEFA Nations League เท่านั้น");
    }
    if (!Array.isArray(data.records)) return errors.concat("records ต้องเป็น Array");
    const recordIds = new Set();
    const fixtureKeys = new Set();
    data.records.forEach((record, index) => {
      const label = "รายการที่ " + (index + 1);
      if (!record || typeof record !== "object") {
        errors.push(label + ": รูปแบบรายการไม่ถูกต้อง");
        return;
      }
      if (!record.record_id || recordIds.has(record.record_id)) errors.push(label + ": record_id ว่างหรือซ้ำ");
      recordIds.add(record.record_id);
      const competition = record.competition_code;
      const fixture = record.fixture_ref || {};
      if (!COMPETITIONS.has(competition) || record.season !== "2026/27") {
        errors.push(label + ": รายการแข่งขันหรือฤดูกาลอยู่นอกขอบเขต");
      }
      let fixtureKey = "";
      if (CLUB.has(competition)) {
        if (fixture.provider_match_id === undefined || fixture.provider_match_id === null || fixture.provider_match_id === "") {
          errors.push(label + ": ลีกสโมสรต้องมี provider_match_id เดิม");
        }
        if (fixture.international_fixture_id) errors.push(label + ": รายการสโมสรห้ามใช้ international_fixture_id");
        fixtureKey = competition + ":" + String(fixture.provider_match_id ?? "");
      } else if (competition === "UNL") {
        if (!fixture.international_fixture_id) errors.push(label + ": Nations League ต้องใช้ international_fixture_id เดิม");
        if (fixture.provider_match_id !== undefined && fixture.provider_match_id !== null && fixture.provider_match_id !== "") {
          errors.push(label + ": รายการทีมชาติห้ามใช้ provider_match_id ของสโมสร");
        }
        fixtureKey = competition + ":" + String(fixture.international_fixture_id ?? "");
      }
      if (!fixture.home_team || !fixture.away_team) errors.push(label + ": ต้องระบุชื่อทั้งสองทีม");
      if (fixtureKeys.has(fixtureKey)) errors.push(label + ": พบ Fixture ซ้ำในไฟล์");
      fixtureKeys.add(fixtureKey);
      const statuses = ["SCHEDULED","LIVE","FINISHED","POSTPONED","CANCELLED","SUSPENDED","AWARDED"];
      if (!statuses.includes(record.match_status)) errors.push(label + ": match_status ไม่ถูกต้อง");
      if (record.match_status === "FINISHED" &&
          (!record.score || !Number.isInteger(record.score.home) || !Number.isInteger(record.score.away) ||
           record.score.home < 0 || record.score.away < 0)) {
        errors.push(label + ": ผล FINISHED ต้องมีสกอร์จำนวนเต็มที่ไม่ติดลบ");
      }
      const sources = Array.isArray(record.sources) ? record.sources : [];
      const sourceUrls = new Set();
      let authoritativeCount = 0;
      sources.forEach((source) => {
        if (!source?.url || !/^https:\/\//i.test(source.url) || sourceUrls.has(source.url)) {
          errors.push(label + ": URL แหล่งอ้างอิงต้องเป็น HTTPS และไม่ซ้ำ");
        }
        sourceUrls.add(source?.url || "");
        if (!source?.name || !RIGHTS.has(source.reuse_rights) ||
            !["competition_organiser","federation","licensed_provider","aggregator","search_reference","other"].includes(source.source_type)) {
          errors.push(label + ": ข้อมูลแหล่งอ้างอิงหรือ reuse_rights ไม่ถูกต้อง");
        }
        if (!source?.checked_at || !Number.isFinite(Date.parse(source.checked_at))) errors.push(label + ": checked_at ของแหล่งข้อมูลไม่ถูกต้อง");
        if (AUTHORITATIVE.has(source?.source_type)) authoritativeCount += 1;
      });
      if (!sources.length) errors.push(label + ": ต้องมีแหล่งอ้างอิงโดยตรงอย่างน้อยหนึ่งแหล่ง");
      if (record.verification_status === "verified" &&
          (sources.length < 2 || authoritativeCount < 1 || sources.some((source) => source.reuse_rights !== "confirmed"))) {
        errors.push(label + ": VERIFIED ต้องมีอย่างน้อย 2 แหล่ง รวมแหล่งทางการ/ผู้ให้บริการที่ได้รับอนุญาต และสิทธิ์ยืนยันครบ");
      }
      if (!["verified","needs_review","unverified"].includes(record.verification_status)) {
        errors.push(label + ": verification_status ไม่ถูกต้อง");
      }
      (Array.isArray(record.events) ? record.events : []).forEach((event) => {
        if (!event?.event_id || !["goal","assist","yellow_card","red_card","own_goal","penalty_goal"].includes(event.type) ||
            !event.player?.name || !event.team || !Array.isArray(event.source_urls) ||
            !event.source_urls.length || event.source_urls.some((url) => !sourceUrls.has(url))) {
          errors.push(label + ": Event ต้องมีชนิด เหตุการณ์ ผู้เล่น ทีม และ URL อ้างอิงที่อยู่ใน sources");
        }
      });
      (Array.isArray(record.ratings) ? record.ratings : []).forEach((rating) => {
        if (!rating?.provider || !rating.player?.name ||
            !Number.isFinite(rating.value) || !Number.isFinite(rating.scale_min) ||
            !Number.isFinite(rating.scale_max) || rating.scale_min >= rating.scale_max ||
            rating.value < rating.scale_min || rating.value > rating.scale_max ||
            !RIGHTS.has(rating.reuse_rights)) {
          errors.push(label + ": Player Rating หรือช่วงคะแนนไม่ถูกต้อง");
        }
        if (rating?.reuse_rights === "confirmed" &&
            (!sourceUrls.has(rating.source_url) || !Number.isFinite(Date.parse(rating.checked_at || "")))) {
          errors.push(label + ": Rating ที่ยืนยันสิทธิ์ต้องมี URL ใน sources และ checked_at");
        }
      });
    });
    const expected = data.records.length ? "research_records_present" : "research_intake_empty";
    if (data.dataset_status !== expected) errors.push("dataset_status ไม่ตรงกับจำนวน records");
    return errors;
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], {type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function renderStoredSummary() {
    const stored = loadStored();
    const verified = stored.records.filter((row) => row.verification_status === "verified");
    const pending = stored.records.filter((row) => row.verification_status !== "verified");
    const events = stored.records.reduce((sum,row) => sum + (row.events || []).length,0);
    const ratings = stored.records.reduce((sum,row) => sum + (row.ratings || []).length,0);
    $("mrStoredSummary").innerHTML =
      '<div class="mr-kpis"><div><b>' + stored.records.length + '</b><span>รายการที่เก็บในเครื่อง</span></div>' +
      '<div><b>' + verified.length + '</b><span>ตรวจสอบแล้ว</span></div>' +
      '<div><b>' + pending.length + '</b><span>รอตรวจสอบ</span></div></div>' +
      '<p class="mr-note">เหตุการณ์ ' + events + ' รายการ · Player Ratings ' + ratings + ' รายการ</p>';
    $("mrStoredList").innerHTML = stored.records.length ? stored.records.map((row) =>
      '<div class="mr-record"><div><b>' + escapeHtml(row.fixture_ref.home_team) + ' ' +
      (row.score ? escapeHtml(row.score.home + "–" + row.score.away) : "VS") + ' ' +
      escapeHtml(row.fixture_ref.away_team) + '</b><small>' + escapeHtml(row.competition_code) +
      ' · ' + escapeHtml(row.match_status) + ' · ' + escapeHtml(row.verification_status) + '</small></div>' +
      '<span>' + (row.verification_status === "verified" ? "✓" : "…") + '</span></div>'
    ).join("") : '<div class="mr-empty">ยังไม่มีข้อมูลนำเข้าในอุปกรณ์นี้</div>';
  }

  function setMessage(message, kind = "info") {
    const root = $("mrStatus");
    if (!root) return;
    root.className = "mr-status mr-status-" + kind;
    root.textContent = message;
  }

  function validatePending() {
    const file = $("mrFile").files?.[0];
    if (!file) {
      pendingDataset = null;
      setMessage("กรุณาเลือกไฟล์ JSON ก่อนตรวจสอบ","error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      pendingDataset = null;
      setMessage("ไฟล์มีขนาดเกิน 2 MB","error");
      return;
    }
    pendingFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const errors = validateDataset(parsed);
        pendingDataset = errors.length ? null : parsed;
        if (errors.length) {
          $("mrPreview").innerHTML = '<b>พบข้อผิดพลาด ' + errors.length + ' จุด</b><ul>' +
            errors.slice(0,12).map((error) => '<li>' + escapeHtml(error) + '</li>').join("") + '</ul>';
          setMessage("ไฟล์ไม่ผ่านการตรวจสอบ ยังไม่สามารถนำเข้าได้","error");
        } else {
          const verified = parsed.records.filter((row) => row.verification_status === "verified").length;
          const review = parsed.records.length - verified;
          $("mrPreview").innerHTML = '<b>' + parsed.records.length + ' รายการผ่านการตรวจโครงสร้าง</b>' +
            '<p>VERIFIED ' + verified + ' รายการ · รอตรวจสอบ ' + review + ' รายการ</p>' +
            '<p>Events ' + parsed.records.reduce((sum,row)=>sum+(row.events||[]).length,0) +
            ' · Ratings ' + parsed.records.reduce((sum,row)=>sum+(row.ratings||[]).length,0) + '</p>' +
            '<p class="mr-note">การตรวจนี้เป็นการตรวจรูปแบบและหลักฐานที่ระบุในไฟล์ ไม่ใช่การยืนยันความจริงของสกอร์หรือการให้คำปรึกษาทางกฎหมาย</p>';
          setMessage("ไฟล์ผ่านการตรวจรูปแบบ พร้อมนำเข้าเก็บในอุปกรณ์นี้","success");
        }
        $("mrImportButton").disabled = !pendingDataset;
      } catch (_) {
        pendingDataset = null;
        $("mrPreview").textContent = "อ่าน JSON ไม่สำเร็จ กรุณาตรวจสอบไฟล์";
        $("mrImportButton").disabled = true;
        setMessage("ไฟล์ JSON ไม่ถูกต้อง","error");
      }
    };
    reader.onerror = () => {
      pendingDataset = null;
      $("mrImportButton").disabled = true;
      setMessage("ไม่สามารถอ่านไฟล์ได้","error");
    };
    reader.readAsText(file);
  }

  function importPending() {
    if (!pendingDataset) return;
    const existing = loadStored();
    const existingIds = new Set(existing.records.map((row) => row.record_id));
    const existingFixtures = new Set(existing.records.map((row) => {
      const ref = row.fixture_ref || {};
      return row.competition_code + ":" + String(ref.provider_match_id ?? ref.international_fixture_id ?? "");
    }));
    const incoming = pendingDataset.records;
    const duplicates = incoming.filter((row) => {
      const ref = row.fixture_ref || {};
      return existingIds.has(row.record_id) ||
        existingFixtures.has(row.competition_code + ":" + String(ref.provider_match_id ?? ref.international_fixture_id ?? ""));
    });
    if (duplicates.length) {
      setMessage("พบรายการซ้ำกับข้อมูลที่มีอยู่ " + duplicates.length + " รายการ กรุณาส่งออกข้อมูลเดิมและจัดการไฟล์ก่อนนำเข้า","error");
      return;
    }
    const merged = {...existing,updated_at:new Date().toISOString(),dataset_status:"research_records_present",
      records:[...existing.records,...incoming]};
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(merged));
      pendingDataset = null;
      $("mrImportButton").disabled = true;
      $("mrFile").value = "";
      $("mrPreview").textContent = "นำเข้าข้อมูลเรียบร้อย";
      setMessage("นำเข้า " + incoming.length + " รายการแล้ว ข้อมูลถูกเก็บเฉพาะในอุปกรณ์นี้","success");
      renderStoredSummary();
      window.dispatchEvent(new CustomEvent("pft-manual-match-research-updated"));
    } catch (_) {
      setMessage("พื้นที่จัดเก็บในอุปกรณ์ไม่เพียงพอ ไม่ได้บันทึกข้อมูล","error");
    }
  }

  function exportStored() {
    const stored = loadStored();
    stored.updated_at = new Date().toISOString();
    stored.dataset_status = stored.records.length ? "research_records_present" : "research_intake_empty";
    downloadJson("football-time-manual-research-2026-27.json",stored);
  }

  function mount() {
    if (!$("manualMatchResearchPage")) return;
    $("mrValidateButton").addEventListener("click",validatePending);
    $("mrImportButton").addEventListener("click",importPending);
    $("mrExportButton").addEventListener("click",exportStored);
    $("mrTemplateButton").addEventListener("click",() => downloadJson("football-time-manual-research-template-2026-27.json",emptyDataset()));
    $("mrClearButton").addEventListener("click",() => {
      if (!window.confirm("ต้องการลบข้อมูล Manual Research ที่เก็บไว้ในอุปกรณ์นี้ทั้งหมดหรือไม่?")) return;
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("pft-manual-match-research-updated"));
      pendingDataset = null;
      $("mrImportButton").disabled = true;
      renderStoredSummary();
      setMessage("ล้างข้อมูลในอุปกรณ์นี้แล้ว","success");
    });
    $("mrFile").addEventListener("change",() => {
      pendingDataset = null;
      $("mrImportButton").disabled = true;
      $("mrPreview").textContent = "เลือกไฟล์แล้ว กดตรวจสอบก่อนนำเข้า";
      setMessage("รอการตรวจสอบไฟล์");
    });
    renderStoredSummary();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
  window.FootballTimeManualResearch = {validateDataset,loadStored,storageKey:STORAGE_KEY};
})();