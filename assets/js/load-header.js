/**
 * Loads the shared site header into #site-header on any page.
 * Usage:
 *   <div id="site-header"></div>
 *   <script src="./assets/js/load-header.js"></script>
 * For pages in subfolders (e.g. our-work/), use:
 *   <script src="../assets/js/load-header.js"></script>
 */
(function () {
  const scriptEl = document.currentScript;

  function resolveBase() {
    const script = scriptEl;
    if (script && script.src) {
      try {
        const url = new URL(script.src, window.location.href);
        const pageUrl = new URL(".", window.location.href);
        const scriptDir = url.pathname.replace(/\\/g, "/").replace(/\/[^/]+$/, "/");
        const pagePath = pageUrl.pathname.replace(/\\/g, "/");
        const assetsJsMatch = scriptDir.match(/^(.*\/)assets\/js\/$/);
        if (assetsJsMatch) {
          const root = assetsJsMatch[1];
          if (pagePath.startsWith(root)) {
            const depth = pagePath.slice(root.length).split("/").filter(Boolean).length;
            return depth === 0 ? "./" : "../".repeat(depth);
          }
        }
        const rootUrl = new URL("../../", url);
        let relative = rootUrl.pathname.replace(/\\/g, "/");
        return relative.endsWith("/") ? relative : relative + "/";
      } catch (_) {
        /* fall through */
      }
    }

    const path = window.location.pathname.replace(/\\/g, "/");
    if (path.includes("/our-work/") || path.toLowerCase().includes("/services/")) {
      return "../";
    }
    return "./";
  }

  function currentNavKey() {
    const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
    const file = path.split("/").pop() || "";
    if (file.includes("about")) return "about";
    if (file.includes("contact")) return "contact";
    if (file.includes("blog")) return "blog";
    return null;
  }

  function markActive(root) {
    const key = currentNavKey();
    if (!key) return;
    root.querySelectorAll(".nav-link[data-nav]").forEach((link) => {
      if (link.getAttribute("data-nav") === key) {
        link.classList.remove("text-[#1F2937]");
        link.classList.add("text-[#356EFF]");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function initMobileMenu(root) {
    const menuBtn = root.querySelector("#menu-btn") || document.getElementById("menu-btn");
    const mobileMenu = root.querySelector("#mobile-menu") || document.getElementById("mobile-menu");
    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener("click", () => {
      const open = !mobileMenu.classList.contains("hidden");
      if (open) {
        mobileMenu.classList.add("hidden");
        mobileMenu.classList.remove("flex");
        menuBtn.setAttribute("aria-expanded", "false");
      } else {
        mobileMenu.classList.remove("hidden");
        mobileMenu.classList.add("flex");
        menuBtn.setAttribute("aria-expanded", "true");
      }
    });

    mobileMenu.querySelectorAll(".mobile-nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
        mobileMenu.classList.remove("flex");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  async function loadHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;

    const base = resolveBase();
    const headerUrl = `${base}components/header.html`;

    try {
      const res = await fetch(headerUrl);
      if (!res.ok) throw new Error(`Header fetch failed: ${res.status}`);
      let html = await res.text();
      html = html.replaceAll("{{BASE}}", base);

      const wrapper = document.createElement("div");
      wrapper.innerHTML = html.trim();
      const headerEl = wrapper.firstElementChild;
      if (!headerEl) throw new Error("Header markup empty");

      markActive(headerEl);
      mount.replaceWith(headerEl);
      initMobileMenu(headerEl);
    } catch (err) {
      console.error("[load-header]", err);
      mount.innerHTML =
        '<div class="p-4 text-sm text-[#1F2937]">Unable to load header.</div>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadHeader);
  } else {
    loadHeader();
  }
})();
