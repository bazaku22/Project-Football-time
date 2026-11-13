"use strict";
(() => {
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll(".mm-panel")];
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    const selected = tab.dataset.tab;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.id === "panel-" + selected;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }));
  const viewAll = document.getElementById("view-all-goals");
  const extraGoals = [...document.querySelectorAll(".mm-extra-goal")];
  viewAll?.addEventListener("click", () => {
    const expanded = viewAll.getAttribute("aria-expanded") !== "true";
    extraGoals.forEach((goal) => { goal.hidden = !expanded; });
    viewAll.setAttribute("aria-expanded", String(expanded));
    viewAll.textContent = expanded ? "แสดงเฉพาะ 3 ประตูแรก ↑" : "ดูประตูทั้งหมด (5) ↓";
  });
  tabs.forEach((tab, index) => {
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });
})();
