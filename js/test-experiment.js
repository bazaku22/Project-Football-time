/* November 2026 experiment history.
 * Isolated from pft_matches_v1 and pft_probability_predictions_v1.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "pft_experiment_snapshots_v1";
  const EXPERIMENT_ID = "nov-2026-test";
  const LEAGUE_BY_COMPETITION = {
    "La Liga": "PD",
    "Bundesliga": "BL1",
    "Ligue 1": "FL1"
  };
  const TEAM_ALIASES = {
    "Athletic Club": ["Athletic Club", "Athletic Bilbao"],
    "Espanyol": ["Espanyol", "RCD Espanyol"],
    "Bayern Munich": ["Bayern Munich", "FC Bayern München", "FC Bayern Munich"],
    "1. FC Köln": ["1. FC Köln", "FC Köln", "1. FC Koln", "Koln"],
    "Troyes": ["Troyes", "ESTAC Troyes"],
    "Le Havre": ["Le Havre", "Le Havre AC"]
  };

  function normalize(value) {
    return String(value || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function readSnapshots() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn("Experiment history could not be read", error);
      return [];
    }
  }

  function saveSnapshots(rows) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      return true;
    } catch (error) {
      console.warn("Experiment history could not be saved", error);
      return false;
    }
  }

  function findTeam(db, fixture, teamName) {
    const aliases = [teamName].concat(TEAM_ALIASES[teamName] || []);
    const keys = new Set(aliases.map(normalize));
    return (db.teams || []).find(function (team) {
      return keys.has(normalize(team.name));
    }) || null;
  }

  function getForecast(fixture) {
    const app = window.FootballTimeAppContext;
    const db = app && app.getDatabase();
    const leagueId = LEAGUE_BY_COMPETITION[fixture.competition];

    if (!db || !leagueId) {
      return { unavailable: "รายการนี้อยู่นอก 3 ลีกสโมสรที่เชื่อมกับฐานข้อมูลปัจจุบัน จึงยังไม่มีข้อมูลรองรับโมเดล" };
    }

    const season = app.getSeason(leagueId);
    if (!season) return { unavailable: "ยังไม่พบฤดูกาลปัจจุบันของลีกนี้ในฐานข้อมูล" };

    const home = findTeam(db, fixture, fixture.home);
    const away = findTeam(db, fixture, fixture.away);
    if (!home || !away) {
      return { unavailable: "ไม่พบรหัสทีมที่ตรงกันในฐานข้อมูลลีกปัจจุบัน จึงไม่คาดเดาความน่าจะเป็น" };
    }

    const memberships = db.teamSeasons || [];
    const belongsToSeason = function (teamId) {
      return memberships.some(function (row) {
        return row.teamId === teamId && row.leagueId === leagueId && row.season === season;
      });
    };
    if (!belongsToSeason(home.id) || !belongsToSeason(away.id)) {
      return { unavailable: "ทีมทั้งสองไม่ได้อยู่ในฤดูกาลเดียวกันของฐานข้อมูลปัจจุบัน" };
    }

    const match = {
      leagueId: leagueId,
      season: season,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeTeamName: fixture.home,
      awayTeamName: fixture.away
    };
    const result = app.computeMatchProbability(match);
    if (!result) return { unavailable: "ผลการแข่งขันย้อนหลังยังไม่เพียงพอสำหรับคำนวณ" };

    if (result.sample.homeForm < 3 || result.sample.awayForm < 3 ||
        result.sample.homeVenue < 2 || result.sample.awayVenue < 2) {
      return {
        unavailable: "จำนวนตัวอย่างยังไม่ถึงเกณฑ์ขั้นต่ำ (ฟอร์มทีมละ 3 นัด และผลงานเหย้า/เยือนด้านละ 2 นัด)"
      };
    }

    return {
      leagueId: leagueId,
      season: season,
      homeTeamId: home.id,
      awayTeamId: away.id,
      result: result
    };
  }

  function scoreOutcome(value) {
    const parts = String(value || "").trim().split("-");
    if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return null;
    const homeGoals = Number(parts[0]);
    const awayGoals = Number(parts[1]);
    return {
      score: homeGoals + "-" + awayGoals,
      outcome: homeGoals > awayGoals ? "home" : homeGoals === awayGoals ? "draw" : "away"
    };
  }

  function calculateMetrics(rows) {
    const evaluated = rows.filter(function (row) {
      return row.actualOutcome && row.probabilities;
    });
    if (!evaluated.length) {
      return { evaluated: 0, accuracy: null, brier: null, logLoss: null };
    }

    let correct = 0;
    let brier = 0;
    let logLoss = 0;
    evaluated.forEach(function (row) {
      const p = row.probabilities;
      const actual = row.actualOutcome;
      const predicted = ["home", "draw", "away"].reduce(function (best, key) {
        return p[key] > p[best] ? key : best;
      }, "home");
      if (predicted === actual) correct += 1;
      ["home", "draw", "away"].forEach(function (key) {
        const target = key === actual ? 1 : 0;
        brier += Math.pow(p[key] / 100 - target, 2);
      });
      logLoss -= Math.log(Math.max(1e-15, p[actual] / 100));
    });

    return {
      evaluated: evaluated.length,
      accuracy: correct / evaluated.length,
      brier: brier / evaluated.length,
      logLoss: logLoss / evaluated.length
    };
  }

  function renderSummary(rows) {
    const root = document.getElementById("testExperimentSummary");
    if (!root) return;
    const result = calculateMetrics(rows);
    const percent = function (value) {
      return value == null ? "—" : (value * 100).toFixed(1) + "%";
    };
    const number = function (value) {
      return value == null ? "—" : value.toFixed(3);
    };

    root.innerHTML =
      '<div class="topline"><b>ชุดทดลองโมเดลใหม่ · ' + EXPERIMENT_ID + '</b><span class="tag">' + rows.length + ' Snapshot</span></div>' +
      '<div class="experiment-kpis">' +
        '<div class="experiment-kpi"><b>' + rows.length + '</b><span>คำทำนายที่บันทึก</span></div>' +
        '<div class="experiment-kpi"><b>' + result.evaluated + '</b><span>คู่ที่ประเมินผลแล้ว</span></div>' +
        '<div class="experiment-kpi"><b>' + percent(result.accuracy) + '</b><span>ทาย 1X2 ถูก</span></div>' +
        '<div class="experiment-kpi"><b>' + number(result.brier) + '</b><span>Brier · 0–2</span></div>' +
        '<div class="experiment-kpi"><b>' + number(result.logLoss) + '</b><span>Log Loss</span></div>' +
        '<div class="experiment-kpi"><b>' + Math.max(0, rows.length - result.evaluated) + '</b><span>รอผลจริง</span></div>' +
      '</div>' +
      '<div class="quality-note">คำนวณจาก Snapshot ของชุดทดลองนี้เท่านั้น ไม่รวม Legacy #001–#011 และไม่ปะปนกับ Calibration ของ 5 ลีกหลัก · ตัวอย่างยังน้อยจึงยังใช้สรุปคุณภาพโมเดลไม่ได้</div>' +
      '<button type="button" class="secondary" id="exportExperimentBackup">↓ ส่งออกข้อมูลทดลอง JSON</button>';

    const button = document.getElementById("exportExperimentBackup");
    if (button) {
      button.onclick = function () {
        const payload = {
          schemaVersion: 1,
          experiment: EXPERIMENT_ID,
          exportedAt: new Date().toISOString(),
          snapshots: readSnapshots()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "football-time-nov-2026-experiment.json";
        link.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      };
    }
  }

  function renderFixturePanel(fixture, rows) {
    const panel = Array.from(document.querySelectorAll("[data-experiment-id]")).find(function (node) {
      return node.dataset.experimentId === fixture.id;
    });
    if (!panel) return;

    let snapshot = rows.find(function (row) { return row.fixtureId === fixture.id; });
    const kickoff = new Date(fixture.kickoffUtc).getTime();
    const now = Date.now();

    if (!snapshot && Number.isFinite(kickoff) && kickoff > now) {
      const forecast = getForecast(fixture);
      if (forecast.result) {
        const model = forecast.result;
        snapshot = {
          schemaVersion: 1,
          fixtureId: fixture.id,
          experiment: EXPERIMENT_ID,
          competition: fixture.competition,
          kickoffUtc: fixture.kickoffUtc,
          home: fixture.home,
          away: fixture.away,
          leagueId: forecast.leagueId,
          season: forecast.season,
          teamIds: { home: forecast.homeTeamId, away: forecast.awayTeamId },
          probabilities: model.probabilities,
          expectedGoals: model.expectedGoals,
          confidenceScore: model.confidenceScore,
          confidence: model.confidence,
          probabilityLevel: model.probabilityLevel,
          sample: model.sample,
          reasons: model.reasons,
          modelVersion: "pft-poisson-1.0",
          createdAt: new Date().toISOString(),
          actualScore: null,
          actualOutcome: null,
          evaluatedAt: null,
          resultSource: null
        };
        rows.push(snapshot);
        if (!saveSnapshots(rows)) {
          rows.pop();
          snapshot = null;
        }
      }
    }

    if (!snapshot) {
      const forecast = getForecast(fixture);
      const message = forecast.unavailable || "ไม่สามารถสร้างคำทำนายก่อนเวลาแข่งขันได้";
      panel.innerHTML =
        '<div class="experiment-status"><b>ยังไม่มีคำทำนายจากโมเดล</b><br>' + escapeHtml(message) +
        (kickoff <= now ? '<br>เลยเวลาเริ่มแข่งขันแล้ว จึงไม่สร้าง Snapshot ย้อนหลัง' : '') +
        '</div>';
      return;
    }

    const p = snapshot.probabilities;
    const savedAt = new Date(snapshot.createdAt).toLocaleString("th-TH", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok"
    });

    let html =
      '<div class="topline"><b>คำทำนายก่อนแข่ง · ' + escapeHtml(snapshot.modelVersion) + '</b><span class="tag">บันทึกแล้ว</span></div>' +
      '<div class="experiment-kpis">' +
        '<div class="experiment-kpi"><b>' + p.home.toFixed(1) + '%</b><span>เจ้าบ้านชนะ</span></div>' +
        '<div class="experiment-kpi"><b>' + p.draw.toFixed(1) + '%</b><span>เสมอ</span></div>' +
        '<div class="experiment-kpi"><b>' + p.away.toFixed(1) + '%</b><span>ทีมเยือนชนะ</span></div>' +
      '</div>' +
      '<div class="experiment-status">ความเชื่อมั่นด้านข้อมูล ' + escapeHtml(snapshot.confidence) + ' (' + snapshot.confidenceScore + '/100) · ตัวอย่างเหย้า ' +
      snapshot.sample.homeVenue + ' / เยือน ' + snapshot.sample.awayVenue + ' / ฟอร์ม ' + snapshot.sample.homeForm + ' และ ' +
      snapshot.sample.awayForm + ' นัด · บันทึก ' + escapeHtml(savedAt) + '</div>' +
      '<details><summary class="small">ดูเหตุผลและปัจจัยที่ใช้คำนวณ</summary><ul class="experiment-reasons">' +
      snapshot.reasons.map(function (reason) { return '<li>' + escapeHtml(reason) + '</li>'; }).join("") +
      '</ul><div class="small">ประตูคาดหมาย ' + snapshot.expectedGoals.home.toFixed(2) + ' – ' +
      snapshot.expectedGoals.away.toFixed(2) + ' · ฤดูกาล ' + escapeHtml(snapshot.season) + '</div></details>';

    if (snapshot.actualOutcome) {
      html += '<div class="quality-note">ผลจริง ' + escapeHtml(snapshot.actualScore) +
        ' · บันทึกผลแล้ว (' + escapeHtml(snapshot.resultSource || "ผู้ใช้ตรวจสอบ") + ') · ประเมินแล้ว</div>';
    } else if (kickoff <= now) {
      html +=
        '<form class="experiment-result" data-experiment-result="' + escapeHtml(fixture.id) + '">' +
          '<div class="field"><label>สกอร์จริง (เจ้าบ้าน-ทีมเยือน)</label><input name="score" required pattern="[0-9]{1,2}-[0-9]{1,2}" placeholder="2-1"></div>' +
          '<div class="field"><label>ที่มาผลจริง</label><input name="source" maxlength="80" value="ผู้ใช้ตรวจสอบผลจริง"></div>' +
          '<div class="experiment-actions full"><button class="primary" type="submit">บันทึกผลจริงและประเมิน</button></div>' +
        '</form>';
    } else {
      html += '<div class="experiment-status">รอการแข่งขันจบ · ระบบจะเปิดให้บันทึกผลจริงหลังเวลาเตะ</div>';
    }

    panel.innerHTML = html;
    const form = panel.querySelector("[data-experiment-result]");
    if (form) {
      form.onsubmit = function (event) {
        event.preventDefault();
        const currentRows = readSnapshots();
        const current = currentRows.find(function (row) { return row.fixtureId === fixture.id; });
        if (!current || current.actualOutcome) return;
        const parsed = scoreOutcome(form.elements.score.value);
        if (!parsed) {
          alert("กรุณากรอกสกอร์รูปแบบ 2-1");
          return;
        }
        current.actualScore = parsed.score;
        current.actualOutcome = parsed.outcome;
        current.evaluatedAt = new Date().toISOString();
        current.resultSource = form.elements.source.value.trim() || "ผู้ใช้ตรวจสอบผลจริง";
        if (!saveSnapshots(currentRows)) {
          alert("บันทึกผลจริงไม่สำเร็จ กรุณาส่งออกข้อมูลสำรองก่อนลองอีกครั้ง");
          return;
        }
        window.renderTestExperimentPanels(window.FootballTimeAppContext.getFixtures());
      };
    }
  }

  window.renderTestExperimentPanels = function (fixtures) {
    const rows = readSnapshots();
    (fixtures || []).forEach(function (fixture) {
      renderFixturePanel(fixture, rows);
    });
    renderSummary(readSnapshots());
  };

  const app = window.FootballTimeAppContext;
  if (app && app.getFixtures) window.renderTestExperimentPanels(app.getFixtures());
})();
