/* Isolated UEFA Nations League Asian Handicap workspace.
 * Reads only data/experimental/international-r1 and uses its own immutable
 * browser snapshot/result stores. Never reads or writes club history.
 */
(function () {
  "use strict";

  const ROOT = "./data/experimental/international-r1/";
  const SNAPSHOT_KEY = "pft_international_handicap_snapshots_r1";
  const RESULT_KEY = "pft_international_handicap_results_r1";
  const MODEL = window.FootballTimeInternationalHandicapModel;
  const OUTCOMES = ["full_win", "half_win", "push", "half_loss", "full_loss"];
  const LABELS = {
    full_win: "ชนะเต็ม", half_win: "ชนะครึ่ง", push: "เสมอ/คืนทุน",
    half_loss: "แพ้ครึ่ง", full_loss: "แพ้เต็ม"
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
    });
  }
  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }
  function write(key, rows) {
    try { localStorage.setItem(key, JSON.stringify(rows)); return true; }
    catch (error) { console.warn("International Handicap storage unavailable", error); return false; }
  }
  function fmtLine(value) {
    return (value > 0 ? "+" : "") + Number(value).toFixed(2);
  }
  function pct(value) { return (value * 100).toFixed(1) + "%"; }
  function stamp(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? new Date(time).toLocaleString("th-TH", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok"
    }) + " น." : "ไม่ทราบเวลา";
  }
  function loadJSON(name) {
    return fetch(ROOT + name + "?v=1", {cache:"no-store"}).then(function (response) {
      if (!response.ok) throw new Error(name + " HTTP " + response.status);
      return response.json();
    });
  }
  function derive(fixture, prediction, reference, referenceFetchedAt) {
    const kickoff = Date.parse(fixture.kickoff_utc || "");
    const predictionCaptured = Date.parse(prediction.captured_at || "");
    const referenceCaptured = Date.parse(referenceFetchedAt || "");
    const captured = Math.max(predictionCaptured, referenceCaptured);
    const latest = reference.bookmakers.map(function (row) {
      return Date.parse(row.lastUpdate || "");
    }).filter(Number.isFinite).reduce(function (max, value) { return Math.max(max, value); }, 0);
    const ageHours = latest && referenceCaptured ? (referenceCaptured - latest) / 3600000 : Infinity;
    const sourceCount = new Set(reference.bookmakers.map(function (row) { return row.bookmaker; })).size;
    const preMatch = Number.isFinite(kickoff) && Number.isFinite(captured) && captured < kickoff;
    const fresh = latest > 0 && Number.isFinite(ageHours) && ageHours >= 0 && ageHours <= 24;
    const enoughSources = sourceCount >= 3;
    let status = "insufficient_reference";
    let statusLabel = "ข้อมูลอ้างอิงไม่เพียงพอ";
    let probabilities = null;
    let awayProbabilities = null;
    let probabilityLevel = null;
    let reason = "";
    if (!preMatch) {
      status = "not_pre_match";
      statusLabel = "ไม่มี Snapshot ก่อนเริ่มแข่งขัน";
      reason = "ไม่พบเวลาบันทึกที่ยืนยันได้ว่าเกิดก่อนเวลาแข่งขัน จึงไม่คำนวณย้อนหลัง";
    } else if (!fresh) {
      status = "stale_reference";
      statusLabel = "ข้อมูลเส้นอ้างอิงเก่า";
      reason = "ข้อมูลเส้นล่าสุดเกิน 24 ชั่วโมงหรือไม่มีเวลาปรับปรุงที่ตรวจสอบได้";
    } else if (!enoughSources) {
      status = "low_source_coverage";
      statusLabel = "แหล่งอ้างอิงน้อยกว่า 3";
      reason = "มีแหล่งข้อมูลที่ไม่ซ้ำกันเพียง " + sourceCount + " แหล่ง ต่ำกว่าเกณฑ์ขั้นต่ำ 3 แหล่ง";
    } else if (!prediction.expected_goals ||
      !Number.isFinite(prediction.expected_goals.home) ||
      !Number.isFinite(prediction.expected_goals.away)) {
      status = "missing_model_inputs";
      statusLabel = "ไม่มี Expected Goals ที่ตรวจสอบได้";
      reason = "ไม่มีค่าประตูคาดหมายที่ถูกต้องจาก Snapshot ก่อนแข่ง";
    } else {
      const home = MODEL.calculateHandicapGrid(
        prediction.expected_goals.home, prediction.expected_goals.away,
        [reference.referenceHomeLine]
      ).lines[0].probabilities;
      const away = MODEL.calculateHandicapGrid(
        prediction.expected_goals.away, prediction.expected_goals.home,
        [reference.referenceAwayLine]
      ).lines[0].probabilities;
      probabilities = home;
      awayProbabilities = away;
      const homeWin = home.full_win + home.half_win;
      const awayWin = away.full_win + away.half_win;
      const highest = Math.max(homeWin, awayWin);
      probabilityLevel = highest >= 0.65 ? "สูง" : highest >= 0.40 ? "กลาง" : "ต่ำ";
      status = sourceCount >= 5 ? "ready" : "limited";
      statusLabel = sourceCount >= 5 ? "ผ่านเกณฑ์ข้อมูล" : "ผ่านขั้นต่ำ · ความครอบคลุมจำกัด";
      reason = "คำนวณจาก Independent Poisson score matrix ด้วย Expected Goals ก่อนแข่ง และเส้นอ้างอิงที่พบจริงจาก " +
        sourceCount + " แหล่ง · ข้อมูลล่าสุด " + stamp(new Date(latest).toISOString());
    }
    return {
      schemaVersion: 1, fixtureId: fixture.id, competition: "UEFA Nations League",
      home: fixture.home_team, away: fixture.away_team, kickoffUtc: fixture.kickoff_utc,
      capturedAt: Number.isFinite(captured) ? new Date(captured).toISOString() : null, modelVersion: prediction.model_version,
      expectedGoals: prediction.expected_goals || null,
      homeLine: reference.referenceHomeLine, awayLine: reference.referenceAwayLine,
      sourceCount: sourceCount, sources: reference.bookmakers.map(function (row) {
        return {bookmaker:row.bookmaker, homeLine:row.homeLine, lastUpdate:row.lastUpdate};
      }),
      latestSourceUpdate: latest ? new Date(latest).toISOString() : null,
      sourceAgeHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null,
      dataStatus: status, dataStatusLabel: statusLabel, dataReason: reason,
      probabilities: probabilities, awayProbabilities: awayProbabilities,
      probabilityLevel: probabilityLevel, actualResultId: null
    };
  }
  function ensureSnapshots(records) {
    const existing = read(SNAPSHOT_KEY);
    if (existing.length) return existing;
    const saved = records.map(function (row) {
      return Object.assign({}, row, {snapshotId: row.fixtureId + "-" + row.modelVersion + "-ah-r1"});
    });
    if (!write(SNAPSHOT_KEY, saved)) return [];
    return saved;
  }
  function resultFor(results, fixtureId) {
    return results.find(function (row) { return row.fixtureId === fixtureId; }) || null;
  }
  function evaluate(snapshot, result) {
    if (!snapshot.probabilities || !result) return null;
    const actual = MODEL.classify(result.homeScore - result.awayScore, snapshot.homeLine);
    const p = snapshot.probabilities;
    let brier = 0;
    OUTCOMES.forEach(function (key) {
      brier += Math.pow(p[key] - (key === actual ? 1 : 0), 2);
    });
    return {actualOutcome:actual, brier:brier, logLoss:-Math.log(Math.max(0.000001, p[actual]))};
  }
  function renderOutcomeRow(label, data) {
    return '<div class="intl-ah-outcome"><b>' + label + '</b>' +
      OUTCOMES.map(function (key) {
        return '<span><strong>' + pct(data[key]) + '</strong><small>' + LABELS[key] + '</small></span>';
      }).join("") + '</div>';
  }
  function renderCard(snapshot, results) {
    const result = resultFor(results, snapshot.fixtureId);
    const evaluation = evaluate(snapshot, result);
    let html = '<article class="card intl-ah-card"><div class="topline"><span class="tag">UEFA Nations League</span><span class="small">' +
      esc(stamp(snapshot.kickoffUtc)) + '</span></div><div class="intl-ah-teams"><b>' +
      esc(snapshot.home) + '</b><span>VS</span><b>' + esc(snapshot.away) +
      '</b></div><div class="intl-ah-lines"><div><span>เส้นเจ้าบ้าน</span><b>' + fmtLine(snapshot.homeLine) +
      '</b></div><div><span>เส้นทีมเยือน</span><b>' + fmtLine(snapshot.awayLine) + '</b></div></div>' +
      '<div class="intl-ah-status">' + esc(snapshot.dataStatusLabel) + ' · ' + snapshot.sourceCount +
      ' แหล่งอ้างอิง · อัปเดต ' + esc(stamp(snapshot.latestSourceUpdate)) + '</div>';
    if (snapshot.probabilities && snapshot.awayProbabilities) {
      html += '<div class="intl-ah-prob-title">ความน่าจะเป็นการตัดสินผล Handicap</div>' +
        renderOutcomeRow("เจ้าบ้าน " + fmtLine(snapshot.homeLine), snapshot.probabilities) +
        renderOutcomeRow("ทีมเยือน " + fmtLine(snapshot.awayLine), snapshot.awayProbabilities) +
        '<div class="quality-note">ระดับความน่าจะเป็น ' + esc(snapshot.probabilityLevel) +
        ' · เป็นการแจกแจงผลตามโมเดล ไม่ใช่ระดับความเชื่อมั่นหรือการรับประกันผล</div>';
    } else {
      html += '<div class="quality-note">' + esc(snapshot.dataReason) +
        ' · ระบบงดแสดงเปอร์เซ็นต์แทนการคาดเดาข้อมูล</div>';
    }
    html += '<details class="intl-ah-details"><summary>เหตุผล ข้อจำกัด และแหล่งข้อมูล</summary>' +
      '<p>Expected Goals: ' + (snapshot.expectedGoals ?
        Number(snapshot.expectedGoals.home).toFixed(2) + " – " + Number(snapshot.expectedGoals.away).toFixed(2) : "ไม่มีข้อมูล") +
      ' · โมเดล ' + esc(snapshot.modelVersion) + '</p><p>' + esc(snapshot.dataReason) +
      '</p><p>ข้อมูลฟอร์มทีมชาติอ้างอิงผลย้อนหลังถึง 6 ต.ค. 2026 จากชุดข้อมูล CC0 แบบรวบรวมหลายแหล่ง ไม่ใช่ฟีดสหพันธ์ และไม่มีการปรับความแข็งแกร่งคู่แข่งหรือค่าสนามเหย้าที่ผ่านการ fit</p>' +
      '<p>เส้นเป็นค่า spread ที่ผู้ให้บริการรายงาน ไม่เก็บราคา และไม่ใช่คำแนะนำการเดิมพัน</p><div>' +
      snapshot.sources.map(function (row) {
        return '<div class="intl-ah-source"><span>' + esc(row.bookmaker) + '</span><b>' +
          fmtLine(row.homeLine) + '</b><small>' + esc(stamp(row.lastUpdate)) + '</small></div>';
      }).join("") + '</div></details>';
    if (evaluation) {
      html += '<div class="quality-note">ผลจริง ' + result.homeScore + "-" + result.awayScore +
        ' · ' + LABELS[evaluation.actualOutcome] + ' · Brier ' + evaluation.brier.toFixed(3) +
        ' · Log Loss ' + evaluation.logLoss.toFixed(3) + ' · แหล่งผล ' + esc(result.source) + '</div>';
    } else if (!result && Date.now() >= Date.parse(snapshot.kickoffUtc) + 2 * 60 * 60 * 1000) {
      html += '<form class="intl-ah-result" data-intl-result="' + esc(snapshot.fixtureId) + '">' +
        '<b>บันทึกผลจริงเพื่อประเมินโมเดล</b><div class="field"><label>สกอร์หลังจบ 90 นาที (เจ้าบ้าน-ทีมเยือน)</label>' +
        '<input name="score" required pattern="[0-9]{1,2}-[0-9]{1,2}" placeholder="2-1"></div>' +
        '<div class="field"><label>แหล่งยืนยันผล</label><input name="source" required maxlength="120" placeholder="เช่น UEFA / เว็บไซต์ทางการ"></div>' +
        '<button class="secondary" type="submit">บันทึกผลเพื่อประเมิน</button></form>';
    } else if (!result) {
      html += '<div class="intl-ah-status">รอการแข่งขันจบอย่างน้อย 2 ชั่วโมงก่อนเปิดบันทึกผล · Snapshot ก่อนแข่งถูกเก็บแยกไว้แล้ว</div>';
    }
    html += '</article>';
    return html;
  }
  function renderHistory(snapshots, results) {
    const evaluated = snapshots.map(function (snapshot) {
      const result = resultFor(results, snapshot.fixtureId);
      return {snapshot:snapshot, result:result, evaluation:evaluate(snapshot, result)};
    }).filter(function (row) { return row.evaluation; });
    const valid = evaluated.filter(function (row) { return row.snapshot.probabilities; });
    const brier = valid.length ? valid.reduce(function (sum, row) { return sum + row.evaluation.brier; }, 0) / valid.length : null;
    const logLoss = valid.length ? valid.reduce(function (sum, row) { return sum + row.evaluation.logLoss; }, 0) / valid.length : null;
    const eligible = snapshots.filter(function (snapshot) { return !!snapshot.probabilities; }).length;
    const pending = eligible - evaluated.length;
    const excluded = snapshots.length - eligible;
    const cards = snapshots.map(function (snapshot) {
      const result = resultFor(results, snapshot.fixtureId);
      const evaluation = evaluate(snapshot, result);
      return '<div class="intl-ah-history-row"><b>' + esc(snapshot.home) + ' – ' + esc(snapshot.away) +
        '</b><span>' + (evaluation ? esc(LABELS[evaluation.actualOutcome]) : esc(snapshot.dataStatusLabel + " · รอผล")) +
        '</span><small>' + esc(snapshot.fixtureId) + ' · เส้น ' + fmtLine(snapshot.homeLine) + '</small></div>';
    }).join("");
    const root = document.getElementById("intlAhHistory");
    if (!root) return;
    root.innerHTML = '<div class="intl-ah-kpis"><div><b>' + snapshots.length +
      '</b><span>Snapshot แยกทีมชาติ</span></div><div><b>' + evaluated.length +
      '</b><span>ประเมินแล้ว</span></div><div><b>' + pending +
      '</b><span>รอผลจริง</span></div><div><b>' + (brier == null ? "—" : brier.toFixed(3)) +
      '</b><span>Brier เฉลี่ย · ต่ำดีกว่า</span></div><div><b>' + (logLoss == null ? "—" : logLoss.toFixed(3)) +
      '</b><span>Log Loss เฉลี่ย · ต่ำดีกว่า</span></div></div>' +
      '<div class="quality-note">คำนวณเฉพาะ Snapshot ที่มีความน่าจะเป็นครบและมีผลจริงที่ผู้ใช้บันทึกพร้อมแหล่งยืนยัน · ตัวอย่างน้อยไม่ใช่หลักฐานยืนยันความแม่นยำ</div>' +
      '<div>' + cards + '</div><button type="button" class="secondary" id="intlAhExport">ส่งออกประวัติทีมชาติ JSON</button>';
    const exportButton = document.getElementById("intlAhExport");
    exportButton.onclick = function () {
      const payload = {schemaVersion:1, competition:"UEFA Nations League",
        exportedAt:new Date().toISOString(), snapshots:read(SNAPSHOT_KEY), results:read(RESULT_KEY)};
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "football-time-international-handicap-r1.json";
      link.click(); URL.revokeObjectURL(url);
    };
  }
  function mount() {
    const main = document.querySelector("main");
    const nav = document.querySelector(".nav");
    if (!main || !nav || document.getElementById("internationalHandicap")) return;
    const page = document.createElement("section");
    page.id = "internationalHandicap";
    page.className = "page";
    page.innerHTML = '<div class="sectionhead"><h2>International Handicap</h2><span class="small">UEFA NATIONS LEAGUE · EXPERIMENTAL</span></div>' +
      '<p class="profile-note">พื้นที่ทดลองทีมชาติ แยกจากฐานข้อมูล โมเดล และประวัติของสโมสรโดยสมบูรณ์</p>' +
      '<div class="intl-ah-tabs"><button type="button" class="active" data-intl-tab="analysis">วิเคราะห์รายคู่</button>' +
      '<button type="button" data-intl-tab="history">ประวัติและประเมินผล</button></div>' +
      '<div id="intlAhAnalysis"><div class="empty">กำลังโหลดข้อมูล Nations League…</div></div>' +
      '<div id="intlAhHistory" hidden></div><div class="notice">ข้อมูลอ้างอิงเป็นข้อมูลทดลอง ไม่ใช่บริการรับเดิมพัน ไม่มีราคาเดิมพันหรือคำแนะนำการเดิมพัน</div>';
    main.appendChild(page);
    nav.insertAdjacentHTML("beforeend", '<button type="button" data-intl-route="true">ทีมชาติ AH</button>');
    nav.addEventListener("click", function (event) {
      if (!event.target.closest("[data-intl-route]")) return;
      document.querySelectorAll(".page").forEach(function (node) { node.classList.toggle("active", node.id === "internationalHandicap"); });
      document.querySelectorAll("[data-primary-route]").forEach(function (node) { node.classList.remove("active"); });
      nav.querySelector("[data-intl-route]").classList.add("active");
      window.scrollTo(0, 0);
    });
    page.addEventListener("click", function (event) {
      const button = event.target.closest("[data-intl-tab]");
      if (!button) return;
      const history = button.dataset.intlTab === "history";
      page.querySelectorAll("[data-intl-tab]").forEach(function (node) { node.classList.toggle("active", node === button); });
      document.getElementById("intlAhAnalysis").hidden = history;
      document.getElementById("intlAhHistory").hidden = !history;
    });
    loadWorkspace();
  }
  function loadWorkspace() {
    const root = document.getElementById("intlAhAnalysis");
    Promise.all([
      loadJSON("fixtures.json"), loadJSON("prediction-snapshots.json"), loadJSON("handicap-reference.json")
    ]).then(function (data) {
      const fixtures = data[0].fixtures.filter(function (row) {
        return row.match_type === "nations_league" && row.competition === "UEFA Nations League";
      });
      const predictions = new Map(data[1].snapshots.map(function (row) { return [row.fixture_id, row]; }));
      const references = new Map(data[2].events.map(function (row) { return [row.fixtureId, row]; }));
      const records = fixtures.map(function (fixture) {
        const prediction = predictions.get(fixture.id);
        const reference = references.get(fixture.id);
        if (!prediction || !reference) return null;
        return derive(fixture, prediction, reference, data[2].fetchedAt);
      }).filter(Boolean).sort(function (a,b) { return a.kickoffUtc.localeCompare(b.kickoffUtc); });
      const snapshots = ensureSnapshots(records);
      const results = read(RESULT_KEY);
      root.innerHTML = '<div class="quality-note">ชุดข้อมูลนี้มีโปรแกรม Nations League 10 คู่ · คำนวณจากเส้นที่มีจริงเท่านั้น · ไม่เรียก API จากหน้าแอป</div>' +
        snapshots.map(function (row) { return renderCard(row, results); }).join("") +
        (snapshots.length ? "" : '<div class="empty">ไม่พบคู่แข่งขันที่มีทั้ง Snapshot ก่อนแข่งและเส้นอ้างอิง</div>');
      root.querySelectorAll("[data-intl-result]").forEach(function (form) {
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          const id = form.dataset.intlResult;
          if (read(RESULT_KEY).some(function (row) { return row.fixtureId === id; })) return;
          const parts = form.elements.score.value.trim().split("-");
          if (parts.length !== 2 || !parts.every(function (value) { return /^\d{1,2}$/.test(value); })) return;
          const snapshot = snapshots.find(function (row) { return row.fixtureId === id; });
          if (!snapshot || !snapshot.probabilities) return;
          const entry = {schemaVersion:1, fixtureId:id, homeScore:Number(parts[0]), awayScore:Number(parts[1]),
            scorePeriod:"regulation_90_minutes", source:form.elements.source.value.trim(),
            recordedAt:new Date().toISOString()};
          if (!entry.source) return;
          const updated = read(RESULT_KEY).concat([entry]);
          if (!write(RESULT_KEY, updated)) { alert("บันทึกไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บ"); return; }
          loadWorkspace();
        });
      });
      renderHistory(snapshots, results);
    }).catch(function (error) {
      root.innerHTML = '<div class="empty">โหลดข้อมูล International Handicap ไม่สำเร็จ: ' + esc(error.message) + '</div>';
    });
  }
  if (!MODEL) {
    console.error("International Handicap model is not loaded.");
    return;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, {once:true});
  else mount();
})();