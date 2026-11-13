"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const bangkokDate = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map((part) => [part.type,part.value]));
    return values.year + "-" + values.month + "-" + values.day;
  };
  const dateLabel = (key) => new Date(key + "T12:00:00+07:00").toLocaleDateString("th-TH", {
    timeZone:"Asia/Bangkok",weekday:"long",day:"numeric",month:"long",year:"numeric"
  });
  function render() {
    const summary = window.FootballTimeMatchCenter?.getTodaySummary?.();
    const database = window.FootballTimeAppContext?.getDatabase?.() || null;
    if (!summary) {
      $("homeLiveCount").textContent = $("homeUpcomingCount").textContent = $("homeFinishedCount").textContent = "—";
      $("homeTodayMatchTotal").textContent = "กำลังโหลดข้อมูล…";
      return;
    }
    $("homeTodayDate").textContent = dateLabel(bangkokDate());
    $("homeLiveCount").textContent = String(summary.live);
    $("homeUpcomingCount").textContent = String(summary.upcoming);
    $("homeFinishedCount").textContent = String(summary.finished);
    $("homeTodayMatchTotal").textContent = summary.total + " นัดวันนี้";
    const updated = database?.source?.lastSuccessfulSync || database?.generatedAt;
    $("homeDataFreshness").textContent = updated
      ? "อัปเดตข้อมูล " + new Date(updated).toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"short",timeStyle:"short"})
      : "ข้อมูลจากฐานข้อมูลการแข่งขันหลัก";
  }
  function mount() {
    render();
    ["pft-football-database-ready","pft-football-database-error","pft-match-center-data-ready"].forEach((name) =>
      window.addEventListener(name,render)
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
