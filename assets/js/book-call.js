/**
 * 5RV Digital — Book a Call widget + Web3Forms submit
 *
 * Web3Forms setup:
 * 1. Create a form at https://web3forms.com
 * 2. Set destination email to prab.samra@5rv.digital (host notification)
 * 3. Enable Auto Response to the sender so the visitor gets a confirmation
 *    (subject like “Your 5RV Digital meeting request”)
 * 4. Paste the access key into assets/js/book-call-config.example.js
 *    (or copy to book-call-config.js and update the script src in BookCall.html)
 *    Do not commit real keys — book-call-config.js is gitignored.
 *
 * API: POST https://api.web3forms.com/submit
 */
(function () {
  const TZ = "Europe/London";
  const SLOT_LABELS = [
    "9:00am",
    "11:30am",
    "1:00pm",
    "1:30pm",
    "2:00pm",
    "3:30pm",
    "4:00pm",
    "4:30pm",
  ];
  const BUFFER_MINUTES = 30;

  const state = {
    viewYear: 0,
    viewMonth: 0, // 0-11
    selectedDateKey: null, // YYYY-MM-DD
    selectedSlot: null,
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function londonParts(date = new Date()) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "long",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(date).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
    );
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      weekday: parts.weekday,
    };
  }

  function dateKey(y, m, d) {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function todayKey() {
    const t = londonParts();
    return dateKey(t.year, t.month, t.day);
  }

  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  function formatLongDate(key) {
    const { year, month, day } = parseKey(key);
    const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(utc);
  }

  function formatWeekdayDate(key) {
    const { year, month, day } = parseKey(key);
    const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(utc);
  }

  function weekdayIndexMon0(y, m, d) {
    // JS: Sun=0 … Sat=6 → Mon=0 … Sun=6
    const js = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
    return (js + 6) % 7;
  }

  function isWeekend(y, m, d) {
    const js = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
    return js === 0 || js === 6;
  }

  function isPastDay(y, m, d) {
    return dateKey(y, m, d) < todayKey();
  }

  function isBookableDay(y, m, d) {
    if (isPastDay(y, m, d)) return false;
    if (isWeekend(y, m, d)) return false;
    return true;
  }

  function parseSlotToMinutes(label) {
    const match = label.trim().match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
    if (!match) return 0;
    let h = Number(match[1]);
    const min = Number(match[2]);
    const ap = match[3].toLowerCase();
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return h * 60 + min;
  }

  function formatMinutesAmPm(total) {
    let h = Math.floor(total / 60);
    const m = total % 60;
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, "0")}${ap}`;
  }

  function slotEndLabel(startLabel) {
    return formatMinutesAmPm(parseSlotToMinutes(startLabel) + 30);
  }

  function nowLondonMinutes() {
    const t = londonParts();
    return t.hour * 60 + t.minute;
  }

  function isSlotAvailable(dateKeyStr, slotLabel) {
    if (!dateKeyStr) return false;
    const { year, month, day } = parseKey(dateKeyStr);
    if (!isBookableDay(year, month, day)) return false;
    const slotMin = parseSlotToMinutes(slotLabel);
    if (dateKeyStr === todayKey()) {
      return slotMin >= nowLondonMinutes() + BUFFER_MINUTES;
    }
    return dateKeyStr > todayKey();
  }

  function updateTzClock() {
    const t = londonParts();
    let h = t.hour;
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    const timeStr = `${h}:${String(t.minute).padStart(2, "0")}${ap}`;
    if (els.tzLabel) {
      els.tzLabel.textContent = `UK, Ireland, Lisbon Time (${timeStr})`;
    }
  }

  function updateSummaries() {
    if (state.selectedDateKey) {
      els.summaryDate.textContent = formatLongDate(state.selectedDateKey);
      if (els.slotsHeading) {
        els.slotsHeading.textContent = formatWeekdayDate(state.selectedDateKey);
      }
    } else {
      els.summaryDate.textContent = "Select a date";
      if (els.slotsHeading) {
        els.slotsHeading.textContent = "Select a date";
      }
    }
    if (state.selectedSlot) {
      els.summaryTime.textContent = state.selectedSlot;
    } else {
      els.summaryTime.textContent = "Select a time";
    }
  }

  function renderCalendar() {
    const y = state.viewYear;
    const m = state.viewMonth + 1;
    const monthName = new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: TZ,
    }).format(new Date(Date.UTC(y, m - 1, 1, 12)));
    els.monthLabel.textContent = monthName;

    const firstDow = weekdayIndexMon0(y, m, 1);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const today = londonParts();
    // Prevent navigating to months entirely before current month
    const atCurrentMonth =
      state.viewYear === today.year && state.viewMonth === today.month - 1;
    els.monthPrev.disabled = atCurrentMonth;
    els.monthPrev.classList.toggle("opacity-40", atCurrentMonth);
    els.monthPrev.classList.toggle("pointer-events-none", atCurrentMonth);

    els.calendarGrid.innerHTML = "";
    for (let i = 0; i < firstDow; i++) {
      const pad = document.createElement("div");
      pad.className = "aspect-square";
      els.calendarGrid.appendChild(pad);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(d);
      const key = dateKey(y, m, d);
      const bookable = isBookableDay(y, m, d);
      const selected = state.selectedDateKey === key;

      btn.className =
        "aspect-square rounded-full font-ronzino text-sm sm:text-base flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#356EFF]";

      if (!bookable) {
        btn.disabled = true;
        btn.className += " text-[#B3B3B3] cursor-not-allowed";
      } else if (selected) {
        btn.className += " bg-[#356EFF] text-white font-medium";
        btn.setAttribute("aria-selected", "true");
      } else {
        btn.className += " bg-[#356EFF]/20 text-[#1F2937] hover:bg-[#356EFF]/35 cursor-pointer";
        btn.setAttribute("aria-selected", "false");
      }

      if (bookable) {
        btn.addEventListener("click", () => {
          state.selectedDateKey = key;
          state.selectedSlot = null;
          renderCalendar();
          renderSlots();
          updateSummaries();
        });
      }

      els.calendarGrid.appendChild(btn);
    }
  }

  function renderSlots() {
    if (!els.slotsList) return;
    els.slotsList.innerHTML = "";

    if (!state.selectedDateKey) {
      if (els.slotsPrompt) els.slotsPrompt.classList.remove("hidden");
      if (els.slotsEmpty) els.slotsEmpty.classList.add("hidden");
      return;
    }

    if (els.slotsPrompt) els.slotsPrompt.classList.add("hidden");

    const available = SLOT_LABELS.filter((s) =>
      isSlotAvailable(state.selectedDateKey, s)
    );

    if (available.length === 0) {
      if (els.slotsEmpty) els.slotsEmpty.classList.remove("hidden");
      return;
    }
    if (els.slotsEmpty) els.slotsEmpty.classList.add("hidden");

    available.forEach((label) => {
      const li = document.createElement("li");
      li.className = "flex items-center gap-2";

      const slotBtn = document.createElement("button");
      slotBtn.type = "button";
      slotBtn.textContent = label;
      slotBtn.setAttribute("role", "option");
      const isSelected = state.selectedSlot === label;

      slotBtn.className = isSelected
        ? "flex-1 rounded-md bg-[#D9D9D9] px-4 py-3 font-ronzino text-base font-medium text-[#1F2937] text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#356EFF]"
        : "flex-1 rounded-md border border-[#356EFF] px-4 py-3 font-ronzino text-base font-medium text-[#356EFF] text-center hover:bg-[#356EFF]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#356EFF]";

      slotBtn.addEventListener("click", () => {
        state.selectedSlot = label;
        renderSlots();
        updateSummaries();
      });

      li.appendChild(slotBtn);

      if (isSelected) {
        const next = document.createElement("button");
        next.type = "button";
        next.textContent = "Next";
        next.className =
          "shrink-0 rounded-md bg-[#356EFF] px-5 py-3 font-ronzino text-base font-medium text-white hover:bg-[#2a58d4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#356EFF]";
        next.addEventListener("click", goToStep2);
        li.appendChild(next);
      }

      els.slotsList.appendChild(li);
    });
  }

  function goToStep2() {
    if (
      !state.selectedDateKey ||
      !state.selectedSlot ||
      !isSlotAvailable(state.selectedDateKey, state.selectedSlot)
    ) {
      return;
    }
    const { year } = parseKey(state.selectedDateKey);
    els.detailsWhen.textContent = `${state.selectedSlot} - ${slotEndLabel(state.selectedSlot)}, ${formatWeekdayDate(state.selectedDateKey)}, ${year}`;

    els.step1.classList.add("hidden");
    els.step2.classList.remove("hidden");
    els.stepSuccess.classList.add("hidden");
  }

  function goToStep1() {
    els.step2.classList.add("hidden");
    els.stepSuccess.classList.add("hidden");
    els.step1.classList.remove("hidden");
    // Re-check slots in case time passed
    if (
      state.selectedSlot &&
      !isSlotAvailable(state.selectedDateKey, state.selectedSlot)
    ) {
      state.selectedSlot = null;
    }
    renderCalendar();
    renderSlots();
    updateSummaries();
  }

  function showSuccess(name) {
    els.step1.classList.add("hidden");
    els.step2.classList.add("hidden");
    els.stepSuccess.classList.remove("hidden");
    els.successCopy.textContent = `Thanks${name ? `, ${name}` : ""}. Your 30 Minute Meeting with Prab Samra is requested for ${els.detailsWhen.textContent}.`;
  }

  function validateForm() {
    const name = els.bookName.value.trim();
    const email = els.bookEmail.value.trim();
    let ok = true;
    els.errName.classList.toggle("hidden", !!name);
    if (!name) ok = false;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    els.errEmail.classList.toggle("hidden", emailOk);
    if (!emailOk) ok = false;
    return ok;
  }

  async function submitBooking(e) {
    e.preventDefault();
    els.formError.classList.add("hidden");
    if (!validateForm()) return;

    const accessKey =
      (window.BOOK_CALL_WEB3FORMS_KEY || "").trim() || "YOUR_ACCESS_KEY";

    if (!accessKey || accessKey === "YOUR_ACCESS_KEY") {
      els.formError.textContent =
        "Booking is not configured yet. Add your Web3Forms access key to assets/js/book-call-config.js.";
      els.formError.classList.remove("hidden");
      return;
    }

    // Final guard against past slots
    if (!isSlotAvailable(state.selectedDateKey, state.selectedSlot)) {
      els.formError.textContent =
        "That time is no longer available. Please go back and choose another slot.";
      els.formError.classList.remove("hidden");
      return;
    }

    const name = els.bookName.value.trim();
    const email = els.bookEmail.value.trim();
    const guests = els.bookGuests.value.trim();
    const notes = els.bookNotes.value.trim();
    const when = els.detailsWhen.textContent;
    const end = slotEndLabel(state.selectedSlot);

    const message = [
      "New Book a Call request for Prab Samra (prab.samra@5rv.digital)",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Guests: ${guests || "—"}`,
      `Message: ${notes || "—"}`,
      `Selected date: ${formatLongDate(state.selectedDateKey)}`,
      `Start time: ${state.selectedSlot}`,
      `End time: ${end}`,
      `Timezone: Europe/London (UK, Ireland, Lisbon Time)`,
      `Duration: 30 min`,
      `Meeting: 30 Minute Meeting`,
      `Host: Prab Samra`,
      `When: ${when}`,
    ].join("\n");

    els.scheduleBtn.disabled = true;
    els.scheduleBtn.textContent = "Scheduling…";

    try {
      // Host notification (Web3Forms dashboard email must be prab.samra@5rv.digital)
      // Visitor confirmation: enable Auto Response in Web3Forms dashboard.
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New Book a Call — ${name} — ${formatLongDate(state.selectedDateKey)} ${state.selectedSlot}`,
          from_name: name,
          name,
          email,
          replyto: email,
          message,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Submission failed");
      }

      showSuccess(name);
    } catch (err) {
      console.error("[book-call]", err);
      els.formError.textContent =
        "Unable to schedule right now. Check your Web3Forms key / network and try again.";
      els.formError.classList.remove("hidden");
      els.scheduleBtn.disabled = false;
      els.scheduleBtn.textContent = "Schedule Event";
    }
  }

  function init() {
    els.step1 = $("step-1");
    els.step2 = $("step-2");
    els.stepSuccess = $("step-success");
    els.calendarGrid = $("calendar-grid");
    els.monthLabel = $("month-label");
    els.monthPrev = $("month-prev");
    els.monthNext = $("month-next");
    els.slotsList = $("slots-list");
    els.slotsEmpty = $("slots-empty");
    els.slotsPrompt = $("slots-prompt");
    els.slotsHeading = $("slots-heading");
    els.slotsPanel = $("slots-panel");
    els.summaryDate = $("summary-date");
    els.summaryTime = $("summary-time");
    els.tzLabel = $("tz-label");
    els.detailsWhen = $("details-when");
    els.backBtn = $("back-to-step-1");
    els.form = $("booking-form");
    els.bookName = $("book-name");
    els.bookEmail = $("book-email");
    els.bookGuests = $("book-guests");
    els.bookNotes = $("book-notes");
    els.errName = $("err-name");
    els.errEmail = $("err-email");
    els.formError = $("form-error");
    els.scheduleBtn = $("schedule-btn");
    els.addGuestsBtn = $("add-guests-btn");
    els.guestsWrap = $("guests-wrap");
    els.successCopy = $("success-copy");

    if (!els.calendarGrid) return;

    const today = londonParts();
    state.viewYear = today.year;
    state.viewMonth = today.month - 1;

    els.monthPrev.addEventListener("click", () => {
      const t = londonParts();
      if (state.viewYear === t.year && state.viewMonth === t.month - 1) return;
      state.viewMonth -= 1;
      if (state.viewMonth < 0) {
        state.viewMonth = 11;
        state.viewYear -= 1;
      }
      renderCalendar();
    });

    els.monthNext.addEventListener("click", () => {
      state.viewMonth += 1;
      if (state.viewMonth > 11) {
        state.viewMonth = 0;
        state.viewYear += 1;
      }
      renderCalendar();
    });

    els.backBtn.addEventListener("click", goToStep1);
    els.form.addEventListener("submit", submitBooking);
    els.addGuestsBtn.addEventListener("click", () => {
      els.guestsWrap.classList.toggle("hidden");
    });

    updateTzClock();
    renderCalendar();
    renderSlots();
    updateSummaries();

    // Re-evaluate past slots while the page stays open
    setInterval(() => {
      updateTzClock();
      if (els.step1 && !els.step1.classList.contains("hidden")) {
        if (
          state.selectedSlot &&
          !isSlotAvailable(state.selectedDateKey, state.selectedSlot)
        ) {
          state.selectedSlot = null;
          updateSummaries();
        }
        renderSlots();
        renderCalendar();
      }
    }, 60000);

    window.addEventListener("focus", () => {
      updateTzClock();
      renderCalendar();
      renderSlots();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
