"use strict";
(() => {
  const FAVORITES_KEY = "pft_discovery_favorites_v1";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const db = () => window.FootballTimeAppContext?.getDatabase?.() || null;
  let cloudPlayers = [];
  let index = [];

  function readFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      return Array.isArray(value) ? value.filter((x) => x && typeof x.type === "string" && typeof x.id === "string") : [];
    } catch (_) { return []; }
  }
  let favorites = readFavorites();
  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      renderFavorites();
      renderSearch();
      renderDateMatches();
      return true;
    } catch (_) {
      const status = $("discoveryFavoriteStatus");
      if (status) status.textContent = "บันทึกรายการโปรดไม่สำเร็จ · ตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์";
      return false;
    }
  }
  function favoriteKey(type, id) { return type + ":" + id; }
  function isFavorite(type, id) { return favorites.some((x) => x.type === type && x.id === id); }
  function toggleFavorite(entity) {
    if (!entity) return;
    if (isFavorite(entity.type, entity.id)) {
      favorites = favorites.filter((x) => !(x.type === entity.type && x.id === entity.id));
    } else {
      favorites.push({type:entity.type,id:entity.id,label:entity.label,meta:entity.meta || ""});
    }
    saveFavorites();
  }
  function getLocalPlayers() {
    try {
      const rows = JSON.parse(localStorage.getItem("pft_players_v1") || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }
  function buildIndex() {
    const data = db();
    const rows = [];
    if (data) {
      (data.leagues || []).forEach((league) => rows.push({
        type:"league",id:String(league.id),label:league.name,meta:league.country || "ลีกฟุตบอล",
        search:league.name + " " + league.country
      }));
      (data.teams || []).forEach((team) => {
        const memberships = (data.teamSeasons || []).filter((x) => x.teamId === team.id);
        const leagueNames = [...new Set(memberships.map((x) => data.leagues?.find((l) => l.id === x.leagueId)?.name).filter(Boolean))];
        rows.push({
          type:"team",id:String(team.id),label:team.name,
          meta:leagueNames.join(" · ") || team.country || "ทีมฟุตบอล",
          search:[team.name,team.shortName,team.tla,team.country,leagueNames.join(" ")].filter(Boolean).join(" "),
          leagueId:memberships[0]?.leagueId || ""
        });
      });
      (data.matches || []).forEach((match) => {
        const league = data.leagues?.find((x) => x.id === match.leagueId);
        const date = String(match.utcDate || "").slice(0,10);
        const id = [match.leagueId,date,match.homeTeamId,match.awayTeamId].join("|");
        rows.push({
          type:"match",id,label:(match.homeTeamName || "ทีมเจ้าบ้าน") + " vs " + (match.awayTeamName || "ทีมเยือน"),
          meta:[league?.name,date,match.status].filter(Boolean).join(" · "),
          search:[match.homeTeamName,match.awayTeamName,league?.name,date,match.status].filter(Boolean).join(" "),
          leagueId:match.leagueId,date,match
        });
      });
    }
    const players = [...getLocalPlayers(), ...cloudPlayers.map((row) => ({
      id:"cloud:" + String(row.playerId || row.player?.id || row.sourceId?.provider_player_id || ""),
      playerId:String(row.playerId || row.player?.id || ""),
      name:row.player?.display_name || row.player?.name || "ไม่ระบุชื่อ",
      teamName:row.player?.team_name || row.player?.teamName || "",
      leagueName:row.player?.league_name || row.player?.leagueName || "",
      season:row.season || "",
      _cloud:true
    }))];
    const seenPlayers = new Set();
    players.forEach((player) => {
      const id = String(player.id || player.playerId || "");
      if (!id || seenPlayers.has(id)) return;
      seenPlayers.add(id);
      rows.push({
        type:"player",id,label:player.name || player.display_name || "ไม่ระบุชื่อนักเตะ",
        meta:[player.teamName,player.leagueName,player.season].filter(Boolean).join(" · ") || "ฐานข้อมูลนักเตะ",
        search:[player.name,player.display_name,player.teamName,player.leagueName,player.season].filter(Boolean).join(" ")
      });
    });
    const fixtures = window.FootballTimeAppContext?.getFixtures?.() || [];
    fixtures.forEach((match) => rows.push({
      type:"testmatch",id:String(match.id),label:(match.home || "ทีมเจ้าบ้าน") + " vs " + (match.away || "ทีมเยือน"),
      meta:[match.competition,match.date,"โปรแกรมติดตาม"].filter(Boolean).join(" · "),
      search:[match.home,match.away,match.competition,match.date].filter(Boolean).join(" "),
      date:match.date
    }));
    index = rows;
    return rows;
  }
  function getEntity(type,id) { return index.find((x) => x.type === type && x.id === id); }
  function favoriteButton(entity) {
    const active = isFavorite(entity.type, entity.id);
    return '<button type="button" class="discovery-star'+(active?' active':'')+'" data-favorite-type="'+esc(entity.type)+'" data-favorite-id="'+esc(entity.id)+'" aria-label="'+(active?'นำออกจากรายการโปรด':'เพิ่มในรายการโปรด')+'" aria-pressed="'+String(active)+'">'+(active?'★':'☆')+'</button>';
  }
  function openPage(page) {
    document.querySelector('[data-page="'+page+'"]')?.click();
  }
  function openDatabaseTab(tab) {
    openPage("fixtures");
    document.querySelector('[data-db-tab="'+tab+'"]')?.click();
  }
  function openEntity(entity) {
    if (!entity) return;
    if (entity.type === "league") {
      openDatabaseTab("overview");
      document.querySelector('[data-league="'+CSS.escape(entity.id)+'"]')?.click();
      return;
    }
    if (entity.type === "team") {
      const data = db();
      const membership = (data?.teamSeasons || []).find((x) => x.teamId === entity.id);
      openDatabaseTab("profile");
      const leagueSelect = $("profileLeagueSelect"), teamSelect = $("profileTeamSelect");
      if (membership && leagueSelect && teamSelect) {
        leagueSelect.value = membership.leagueId;
        leagueSelect.dispatchEvent(new Event("change",{bubbles:true}));
        teamSelect.value = entity.id;
        teamSelect.dispatchEvent(new Event("change",{bubbles:true}));
      }
      return;
    }
    if (entity.type === "player") {
      openDatabaseTab("players");
      const input = $("playerSearch");
      if (input) { input.value = entity.label; input.dispatchEvent(new Event("input",{bubbles:true})); }
      return;
    }
    if (entity.type === "match") {
      openDatabaseTab("overview");
      const from = $("discoveryDateFrom"), to = $("discoveryDateTo"), league = $("discoveryDateLeague");
      if (from) from.value = entity.date || "";
      if (to) to.value = entity.date || "";
      if (league) league.value = entity.leagueId || "ALL";
      renderDateMatches();
      $("discoveryDateResults")?.scrollIntoView({behavior:"smooth",block:"nearest"});
      return;
    }
    if (entity.type === "testmatch") {
      openPage("home");
      document.querySelector('[data-fixture-day="'+CSS.escape(entity.date || "")+'"]')?.click();
    }
  }
  function renderSearch() {
    const input = $("discoverySearchInput"), root = $("discoverySearchResults");
    if (!input || !root) return;
    const query = input.value.trim().toLocaleLowerCase();
    if (!query) { root.hidden = true; root.innerHTML = ""; input.setAttribute("aria-expanded","false"); return; }
    const results = buildIndex().map((entity) => {
      const text = (entity.label + " " + (entity.search || "")).toLocaleLowerCase();
      return {...entity,score:entity.label.toLocaleLowerCase() === query ? 0 : entity.label.toLocaleLowerCase().startsWith(query) ? 1 : text.includes(query) ? 2 : 9};
    }).filter((x) => x.score < 9).sort((a,b) => a.score-b.score || a.label.localeCompare(b.label)).slice(0,12);
    root.innerHTML = results.length ? results.map((entity) =>
      '<div class="discovery-result"><button type="button" class="discovery-result-open" data-open-type="'+esc(entity.type)+'" data-open-id="'+esc(entity.id)+'"><span class="discovery-kind">'+esc({league:"ลีก",team:"ทีม",match:"แมตช์",player:"นักเตะ",testmatch:"โปรแกรม"}[entity.type] || "ข้อมูล")+'</span><span class="discovery-result-copy"><b>'+esc(entity.label)+'</b><small>'+esc(entity.meta || "")+'</small></span></button>'+favoriteButton(entity)+'</div>'
    ).join("") : '<div class="discovery-empty">ไม่พบข้อมูลที่ตรงกับคำค้น</div>';
    root.hidden = false;
    input.setAttribute("aria-expanded","true");
  }
  function renderFavorites() {
    const root = $("discoveryFavorites");
    const status = $("discoveryFavoriteStatus");
    if (!root) return;
    const available = favorites.map((fav) => getEntity(fav.type,fav.id) || fav);
    if (status) status.textContent = favorites.length + " รายการ · บันทึกในอุปกรณ์นี้เท่านั้น";
    root.innerHTML = available.length ? available.map((entity) =>
      '<div class="discovery-favorite"><button type="button" class="discovery-favorite-open" data-open-type="'+esc(entity.type)+'" data-open-id="'+esc(entity.id)+'"><b>'+esc(entity.label || entity.name || "รายการโปรด")+'</b><small>'+esc(entity.meta || "ข้อมูลที่บันทึกไว้")+'</small></button><button type="button" class="discovery-remove" data-favorite-type="'+esc(entity.type)+'" data-favorite-id="'+esc(entity.id)+'" aria-label="นำออกจากรายการโปรด">×</button></div>'
    ).join("") : '<div class="discovery-empty">ยังไม่มีรายการโปรด · กด ☆ ในผลการค้นหาเพื่อบันทึกทีม ลีก นักเตะ หรือแมตช์</div>';
  }
  function dateOf(match) { return String(match.utcDate || "").slice(0,10); }
  function renderDateMatches() {
    const root = $("discoveryDateResults");
    if (!root) return;
    const from = $("discoveryDateFrom")?.value || "";
    const to = $("discoveryDateTo")?.value || "";
    const leagueId = $("discoveryDateLeague")?.value || "ALL";
    if (from && to && from > to) { root.innerHTML = '<div class="discovery-empty">วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด</div>'; return; }
    if (!from && !to) { root.innerHTML = '<div class="discovery-empty">เลือกวันเริ่มต้นหรือวันสิ้นสุดเพื่อค้นหาโปรแกรมและผลการแข่งขัน</div>'; return; }
    const data = db();
    const matches = (data?.matches || []).filter((match) => {
      const date = dateOf(match);
      return (!from || date >= from) && (!to || date <= to) && (leagueId === "ALL" || match.leagueId === leagueId);
    }).sort((a,b) => dateOf(a).localeCompare(dateOf(b)) || String(a.utcDate).localeCompare(String(b.utcDate)));
    const list = matches.slice(0,50).map((match) => {
      const entity = index.find((x) => x.type === "match" && x.match === match);
      if (!entity) return "";
      const score = match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null ? match.homeScore + " - " + match.awayScore : "vs";
      return '<div class="discovery-date-row"><button type="button" class="discovery-result-open" data-open-type="match" data-open-id="'+esc(entity.id)+'"><b>'+esc(match.homeTeamName)+' <span>'+esc(score)+'</span> '+esc(match.awayTeamName)+'</b><small>'+esc(dateTimeSafe(match.utcDate))+' · '+esc(match.status)+'</small></button>'+favoriteButton(entity)+'</div>';
    }).join("");
    root.innerHTML = '<div class="discovery-count">พบ '+matches.length+' นัด'+(matches.length>50?' · แสดง 50 นัดแรก':'')+'</div>'+(list || '<div class="discovery-empty">ไม่พบการแข่งขันในช่วงวันที่เลือก</div>');
  }
  function dateTimeSafe(value) {
    if (!value) return "ไม่ระบุเวลา";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"});
  }
  function mount() {
    const header = document.querySelector("header");
    if (header && !$("discoverySearch")) {
      const search = document.createElement("div");
      search.id = "discoverySearch";
      search.className = "discovery-search";
      search.innerHTML = '<label for="discoverySearchInput">ค้นหาฟุตบอล</label><input id="discoverySearchInput" type="search" autocomplete="off" placeholder="ค้นหาทีม ลีก นักเตะ หรือการแข่งขัน" aria-controls="discoverySearchResults" aria-expanded="false"><div id="discoverySearchResults" class="discovery-search-results" hidden></div>';
      header.append(search);
    }
    const home = $("home");
    if (home && !$("discoveryFavoritesCard")) {
      const card = document.createElement("section");
      card.id = "discoveryFavoritesCard";
      card.className = "card discovery-favorites-card";
      card.innerHTML = '<div class="topline"><b>รายการโปรด</b><span id="discoveryFavoriteStatus" class="small">บันทึกในอุปกรณ์นี้เท่านั้น</span></div><div id="discoveryFavorites"></div>';
      const heading = home.querySelector(".sectionhead");
      if (heading) heading.insertAdjacentElement("afterend",card);
      else home.prepend(card);
    }
    const overview = $("dbtab-overview");
    const matchCard = $("databaseMatches")?.closest(".card");
    if (overview && matchCard && !$("discoveryDateCard")) {
      const card = document.createElement("section");
      card.id = "discoveryDateCard";
      card.className = "card discovery-date-card";
      card.innerHTML = '<div class="topline"><b>ค้นหาตามวันที่แข่งขัน</b><span class="small">ทุกลีก</span></div><div class="discovery-date-controls"><div class="field"><label for="discoveryDateFrom">ตั้งแต่วันที่</label><input id="discoveryDateFrom" type="date"></div><div class="field"><label for="discoveryDateTo">ถึงวันที่</label><input id="discoveryDateTo" type="date"></div><div class="field discovery-date-league"><label for="discoveryDateLeague">ลีก</label><select id="discoveryDateLeague" class="filter"><option value="ALL">ทุกลีก</option></select></div></div><div id="discoveryDateResults" aria-live="polite"><div class="discovery-empty">เลือกวันเริ่มต้นหรือวันสิ้นสุดเพื่อค้นหาโปรแกรมและผลการแข่งขัน</div></div><button type="button" class="secondary discovery-clear-date" id="discoveryClearDate">ล้างตัวกรองวันที่</button>';
      matchCard.insertAdjacentElement("beforebegin",card);
    }
    refreshLeagueOptions();
    renderFavorites();
  }
  function refreshLeagueOptions() {
    const select = $("discoveryDateLeague"), data = db();
    if (!select || !data) return;
    const current = select.value || "ALL";
    select.innerHTML = '<option value="ALL">ทุกลีก</option>'+(data.leagues || []).map((league) =>
      '<option value="'+esc(league.id)+'">'+esc(league.name)+'</option>'
    ).join("");
    select.value = (data.leagues || []).some((x) => x.id === current) ? current : "ALL";
  }
  document.addEventListener("click",(event) => {
    const favorite = event.target.closest("[data-favorite-type]");
    if (favorite) {
      event.preventDefault();event.stopPropagation();
      const entity = getEntity(favorite.dataset.favoriteType,favorite.dataset.favoriteId) || {
        type:favorite.dataset.favoriteType,id:favorite.dataset.favoriteId,
        label:favorites.find((x)=>x.type===favorite.dataset.favoriteType&&x.id===favorite.dataset.favoriteId)?.label || "รายการโปรด"
      };
      toggleFavorite(entity);return;
    }
    const open = event.target.closest("[data-open-type][data-open-id]");
    if (open) {
      const entity = getEntity(open.dataset.openType,open.dataset.openId) || favorites.find((x)=>x.type===open.dataset.openType&&x.id===open.dataset.openId);
      openEntity(entity);
      if ($("discoverySearchResults")) $("discoverySearchResults").hidden = true;
      $("discoverySearchInput")?.setAttribute("aria-expanded","false");
    }
  });
  document.addEventListener("input",(event) => {
    if (event.target.id === "discoverySearchInput") renderSearch();
    if (["discoveryDateFrom","discoveryDateTo","discoveryDateLeague"].includes(event.target.id)) renderDateMatches();
  });
  document.addEventListener("change",(event) => {
    if (["discoveryDateFrom","discoveryDateTo","discoveryDateLeague"].includes(event.target.id)) renderDateMatches();
  });
  document.addEventListener("click",(event) => {
    if (event.target.id === "discoveryClearDate") {
      $("discoveryDateFrom").value = "";
      $("discoveryDateTo").value = "";
      $("discoveryDateLeague").value = "ALL";
      renderDateMatches();
    }
  });
  document.addEventListener("keydown",(event) => {
    if (event.key === "Escape" && $("discoverySearchResults") && !$("discoverySearchResults").hidden) {
      $("discoverySearchResults").hidden = true;
      $("discoverySearchInput")?.setAttribute("aria-expanded","false");
    }
  });
  window.addEventListener("pft-player-stats-data",(event) => {
    cloudPlayers = Array.isArray(event.detail?.rows) ? event.detail.rows : [];
    buildIndex();renderSearch();renderFavorites();
  });
  window.addEventListener("pft-football-database-ready",() => {
    buildIndex();refreshLeagueOptions();renderSearch();renderFavorites();renderDateMatches();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
  buildIndex();
})();