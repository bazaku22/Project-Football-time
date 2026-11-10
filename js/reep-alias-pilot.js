const SUPABASE_URL = "https://igbprkdqtsxvlcgcrqkn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gJaIN-2d3EIovzLsP6T2Tg__tC41luO";

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function parseCsvLine(line) {
  const fields = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      fields.push(value);
      value = "";
    } else {
      value += ch;
    }
  }
  fields.push(value);
  return fields;
}

export async function runReepAliasPilot({ session, records, onProgress = () => {} }) {
  if (!session?.access_token) throw new Error("กรุณาเข้าสู่ระบบคลังนักเตะส่วนตัวก่อน");
  if (!Array.isArray(records) || records.length === 0) throw new Error("ไม่พบรายชื่อนักเตะในคลังส่วนตัว");
  if (records.length > 500) throw new Error("จำนวนรายการเกินขอบเขตการทดสอบ 500 คน");
  if (typeof DecompressionStream === "undefined") throw new Error("เบราว์เซอร์นี้ยังไม่รองรับการคลายไฟล์ gzip สำหรับการทดสอบ");

  const targets = new Map();
  const resultRows = records.map((record, index) => {
    const key = String(record.id || record.provider_player_id || index);
    const name = String(record.player_name || "").trim();
    const normalized = normalizeName(name);
    if (normalized) {
      if (!targets.has(normalized)) targets.set(normalized, []);
      targets.get(normalized).push(key);
    }
    return { key, name, league: record.league_id || "", team: record.team_id || "", candidates: new Map() };
  });
  const byKey = new Map(resultRows.map(row => [row.key, row]));

  onProgress("กำลังดาวน์โหลดไฟล์ Reep และตรวจสอบ checksum…");
  const response = await fetch(SUPABASE_URL + "/functions/v1/reep-aliases", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + session.access_token,
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json"
    },
    body: "{}",
    cache: "no-store"
  });
  if (!response.ok) {
    let message = "ดาวน์โหลดไฟล์ Reep ไม่สำเร็จ (HTTP " + response.status + ")";
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  const stamp = response.headers.get("X-Reep-Release-Stamp") || "ไม่ระบุรุ่น";
  const checksum = response.headers.get("X-Reep-SHA256") || "";
  const compressed = await response.arrayBuffer();
  if (!compressed.byteLength || compressed.byteLength > 30 * 1024 * 1024) {
    throw new Error("ขนาดไฟล์ Reep ไม่อยู่ในขอบเขตที่ปลอดภัย");
  }

  onProgress("ตรวจสอบไฟล์แล้ว · กำลังเทียบชื่อกับ alias ของ Reep รุ่น " + stamp + "…");
  const decompressed = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  const reader = decompressed.getReader();
  const decoder = new TextDecoder("utf-8");
  let pending = "";
  let header = null;
  let aliasIndex = -1;
  let reepIdIndex = -1;
  let rowsScanned = 0;
  let matchedRows = 0;
  let headerChecked = false;
  let lastProgress = 0;

  const processLine = line => {
    if (!line) return;
    const fields = parseCsvLine(line.replace(/\r$/, ""));
    if (!headerChecked) {
      header = fields.map(x => x.replace(/^\uFEFF/, "").trim());
      aliasIndex = header.indexOf("alias");
      reepIdIndex = header.indexOf("reep_id");
      headerChecked = true;
      if (aliasIndex < 0 || reepIdIndex < 0) throw new Error("โครงสร้าง provider_aliases.csv.gz ไม่ตรงกับ schema ที่คาดไว้");
      return;
    }
    rowsScanned++;
    const alias = fields[aliasIndex] || "";
    const reepId = fields[reepIdIndex] || "";
    if (!alias || !reepId) return;
    const normalized = normalizeName(alias);
    const targetKeys = targets.get(normalized);
    if (!targetKeys) return;
    matchedRows++;
    for (const key of targetKeys) {
      const row = byKey.get(key);
      if (!row) continue;
      if (!row.candidates.has(reepId)) {
        row.candidates.set(reepId, {
          reepId,
          alias,
          aliasKind: fields[header.indexOf("alias_kind")] || "",
          provider: fields[header.indexOf("provider")] || ""
        });
      }
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() || "";
      for (const line of lines) processLine(line);
      if (rowsScanned - lastProgress >= 50000) {
        lastProgress = rowsScanned;
        onProgress("กำลังตรวจ alias… " + rowsScanned.toLocaleString("en-US") + " แถว");
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    pending += decoder.decode();
    if (pending) processLine(pending);
  } finally {
    reader.releaseLock();
  }

  const results = resultRows.map(row => ({
    playerName: row.name,
    league: row.league,
    team: row.team,
    candidates: Array.from(row.candidates.values())
  }));
  const matchedPlayers = results.filter(row => row.candidates.length > 0).length;
  const ambiguousPlayers = results.filter(row => row.candidates.length > 1).length;
  return {
    release: stamp,
    checksum,
    compressedBytes: compressed.byteLength,
    rowsScanned,
    matchedAliasRows: matchedRows,
    totalPlayers: results.length,
    matchedPlayers,
    unmatchedPlayers: results.length - matchedPlayers,
    ambiguousPlayers,
    results
  };
}
