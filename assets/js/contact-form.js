/**
 * 5RV Digital — Contact enquiry form + Web3Forms
 *
 * Setup:
 * 1. Create a form at https://web3forms.com
 * 2. Set destination email to hello@5rv.digital
 * 3. Enable Auto Response for visitor confirmation
 * 4. Replace YOUR_ACCESS_KEY in assets/js/contact-form-config.example.js
 *    (or copy to contact-form-config.js locally — that file is gitignored)
 *
 * API: POST https://api.web3forms.com/submit
 */
(function () {
  const PLACEHOLDER_KEY = "YOUR_ACCESS_KEY";

  const state = {
    services: new Set(),
    budget: "",
  };

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function $all(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function styleServiceChip(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) {
      btn.classList.remove("bg-white", "border-[#D9D9D9]", "text-[#1F2937]");
      btn.classList.add("bg-[#356EFF]", "border-[#356EFF]", "text-white");
    } else {
      btn.classList.add("bg-white", "border-[#D9D9D9]", "text-[#1F2937]");
      btn.classList.remove("bg-[#356EFF]", "border-[#356EFF]", "text-white");
    }
  }

  function styleBudgetChip(btn, on) {
    btn.setAttribute("aria-checked", on ? "true" : "false");
    if (on) {
      btn.classList.remove("bg-white", "border-[#D9D9D9]", "text-[#1F2937]");
      btn.classList.add("bg-[#356EFF]/15", "border-[#356EFF]", "text-[#356EFF]");
    } else {
      btn.classList.add("bg-white", "border-[#D9D9D9]", "text-[#1F2937]");
      btn.classList.remove("bg-[#356EFF]/15", "border-[#356EFF]", "text-[#356EFF]");
    }
  }

  function showErr(name, show) {
    const el = document.querySelector(`[data-err="${name}"]`);
    if (el) el.classList.toggle("hidden", !show);
  }

  function validate() {
    const name = $("#c-name").value.trim();
    const email = $("#c-email").value.trim();
    const phone = $("#c-phone").value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    showErr("name", !name);
    showErr("email", !emailOk);
    showErr("phone", !phone);

    return !!(name && emailOk && phone);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const formError = $("#form-error");
    formError.classList.add("hidden");

    if (!validate()) return;

    const accessKey = (window.CONTACT_WEB3FORMS_KEY || "").trim();
    if (!accessKey || accessKey === PLACEHOLDER_KEY) {
      formError.textContent =
        "Contact form is not configured yet. Add your Web3Forms access key to assets/js/contact-form-config.example.js.";
      formError.classList.remove("hidden");
      return;
    }

    const name = $("#c-name").value.trim();
    const email = $("#c-email").value.trim();
    const phone = $("#c-phone").value.trim();
    const company = $("#c-company").value.trim();
    const location = $("#c-location").value.trim();
    const heard = $("#c-heard").value.trim();
    const details = $("#c-details").value.trim();
    const services = Array.from(state.services).join(", ") || "—";
    const budget = state.budget || "—";

    const message = [
      "New contact enquiry for hello@5rv.digital",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Company: ${company || "—"}`,
      `Location: ${location || "—"}`,
      `How did you hear about us: ${heard || "—"}`,
      `Services: ${services}`,
      `Budget: ${budget}`,
      `Project details: ${details || "—"}`,
    ].join("\n");

    const btn = $("#submit-btn");
    btn.disabled = true;
    btn.textContent = "Sending…";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New Contact Enquiry — ${name}`,
          from_name: name,
          name,
          email,
          phone,
          company,
          location,
          heard_about: heard,
          services,
          budget,
          message: details,
          replyto: email,
          message,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Submission failed");
      }

      $("#contact-form").classList.add("hidden");
      const success = $("#contact-success");
      success.classList.remove("hidden");
      success.classList.add("flex");
      $("#success-copy").textContent =
        `Thanks${name ? `, ${name}` : ""}. We’ve received your enquiry and will reply within 24 hours.`;
    } catch (err) {
      console.error("[contact-form]", err);
      formError.textContent =
        "Unable to send right now. Check your Web3Forms key / network and try again.";
      formError.classList.remove("hidden");
      btn.disabled = false;
      btn.innerHTML =
        'Send Enquiry <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    }
  }

  function init() {
    const form = $("#contact-form");
    if (!form) return;

    $all(".service-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-service");
        if (state.services.has(value)) {
          state.services.delete(value);
          styleServiceChip(btn, false);
        } else {
          state.services.add(value);
          styleServiceChip(btn, true);
        }
      });
    });

    $all(".budget-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-budget");
        state.budget = value;
        $all(".budget-chip").forEach((b) =>
          styleBudgetChip(b, b.getAttribute("data-budget") === value)
        );
      });
    });

    const details = $("#c-details");
    const counter = $("#char-count");
    if (details && counter) {
      details.addEventListener("input", () => {
        counter.textContent = String(details.value.length);
      });
    }

    form.addEventListener("submit", onSubmit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
