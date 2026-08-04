/**
 * Loads the shared site footer into #site-footer on any page.
 * Usage:
 *   <div id="site-footer"></div>
 *   <script src="./assets/js/load-footer.js"></script>
 * For pages in subfolders (e.g. our-work/), use:
 *   <script src="../assets/js/load-footer.js"></script>
 */
(function () {
  function resolveBase() {
    const script = document.currentScript;
    if (script && script.src) {
      try {
        const url = new URL(script.src, window.location.href);
        // .../assets/js/load-footer.js → site root is two levels up
        const rootUrl = new URL("../../", url);
        const pageUrl = new URL(".", window.location.href);
        let relative = rootUrl.pathname.replace(/\\/g, "/");
        const pagePath = pageUrl.pathname.replace(/\\/g, "/");
        // Prefer path relative to current page for file:// and nested folders
        const scriptDir = url.pathname.replace(/\\/g, "/").replace(/\/[^/]+$/, "/");
        const assetsJsMatch = scriptDir.match(/^(.*\/)assets\/js\/$/);
        if (assetsJsMatch) {
          const root = assetsJsMatch[1];
          if (pagePath.startsWith(root)) {
            const depth = pagePath.slice(root.length).split("/").filter(Boolean).length;
            return depth === 0 ? "./" : "../".repeat(depth);
          }
        }
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

  async function loadFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;

    const base = resolveBase();
    const footerUrl = `${base}components/footer.html`;

    try {
      const res = await fetch(footerUrl);
      if (!res.ok) throw new Error(`Footer fetch failed: ${res.status}`);
      let html = await res.text();
      html = html.replaceAll("{{BASE}}", base);
      mount.outerHTML = html;
    } catch (err) {
      console.error("[load-footer]", err);
      mount.innerHTML =
        '<footer class="bg-white border-t p-6 text-sm text-[#1F2937]">Unable to load footer.</footer>';
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFooter);
  } else {
    loadFooter();
  }
})();
