"use strict";
(() => {
  const routes = {
    home: { page: "home" },
    leagues: { page: "fixtures", tab: "overview" },
    analyze: { page: "fixtures", tab: "probability" },
    history: { page: "fixtures", tab: "accuracy" }
  };
  const secondary = [
    ["summary","สรุปผลโมเดลทดลอง"],
    ["analysis","หลักการวิเคราะห์"],
    ["archive","คลัง Legacy"],
    ["players","ฐานข้อมูลนักเตะ"],
    ["advanced","วิเคราะห์เชิงลึก"]
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
    const nav = $(".nav");
    if (!nav) return;
    nav.innerHTML = [
      '<button type="button" data-primary-route="home" class="active" aria-current="page">⌂ หน้าหลัก</button>',
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
      details.innerHTML = '<summary>เครื่องมือเพิ่มเติม</summary><p class="pn-note">เครื่องมือรองและพื้นที่เดิมยังคงเข้าถึงได้ โดยไม่ปะปนกับเมนูหลัก</p><div class="pn-tool-grid">' +
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
      if (target === "players") {
        activate("fixtures", "players", "");
        document.querySelectorAll("[data-primary-route]").forEach((node) => node.classList.remove("active"));
      } else if (target === "advanced") {
        activate("fixtures", "advanced", "");
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
