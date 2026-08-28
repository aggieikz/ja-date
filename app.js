/* ============ Din dag, pakket inn ============ */
(() => {
  "use strict";

  const KEY = "date-gifts-opened-v1";
  const DAY_END = 8 * 60; // før kl. 08 regnes som "dagen er over" (alt forblir åpnet)
  const UNLOCKED_LABEL = "✨ Trykk for å åpne";
  const gifts = Array.from(document.querySelectorAll(".gift"));
  const progressEl = document.getElementById("progress");
  const toastEl = document.getElementById("toast");
  const total = gifts.length;

  const toMinutes = (h) => {
    const [hh, mm] = h.split(":").map(Number);
    return hh * 60 + (mm || 0);
  };
  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const startStamp = (h) => {
    const [hh, mm] = h.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  };

  // Datoen i hero-en (alltid i dag dato)
  const datsEl = document.getElementById("datoen");
  if (datsEl) {
    const monthNames = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];
    const d = new Date();
    datsEl.textContent = d.getDate() + ". " + monthNames[d.getMonth()] + " " + d.getFullYear();
  }

  let openedSet;
  try {
    openedSet = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch (e) {
    openedSet = new Set();
  }
  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...openedSet]));
    } catch (e) { /* privat modus osv. */ }
  };

  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  function updateProgress() {
    if (!progressEl) return;
    const n = gifts.filter((g) => openedSet.has(g.id)).length;
    progressEl.textContent = n + " av " + total + " gaver åpnet";
    const letterBtn = document.getElementById("letter-btn");
    if (letterBtn) letterBtn.hidden = n < total;
  }

  function confetti(gift) {
    const bits = ["💛", "✨", "💖", "🎀", "♥"];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement("span");
      s.className = "pop";
      s.textContent = bits[Math.floor(Math.random() * bits.length)];
      s.style.left = (4 + Math.random() * 92) + "%";
      s.style.top = (8 + Math.random() * 74) + "%";
      s.style.fontSize = (11 + Math.random() * 12) + "px";
      s.style.setProperty("--r", Math.round(Math.random() * 50 - 25) + "deg");
      gift.appendChild(s);
      s.addEventListener("animationend", () => s.remove());
    }
  }

  // Finale-brevet
  const finale = document.getElementById("finale");
  const finaleHearts = document.getElementById("finale-hearts");

  function rainHearts() {
    if (!finaleHearts) return;
    finaleHearts.innerHTML = "";
    const glyphs = ["♥", "💛", "💖", "✨", "♥"];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement("span");
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = Math.random() * 100 + "%";
      s.style.fontSize = (14 + Math.random() * 22) + "px";
      s.style.opacity = (0.45 + Math.random() * 0.55).toFixed(2);
      s.style.animationDuration = (4 + Math.random() * 5).toFixed(2) + "s";
      s.style.animationDelay = (-Math.random() * 9).toFixed(2) + "s";
      finaleHearts.appendChild(s);
    }
  }

  function showFinale() {
    if (!finale || finale.classList.contains("show")) return;
    rainHearts();
    finale.classList.add("show");
    finale.setAttribute("aria-hidden", "false");
  }

  function hideFinale() {
    if (!finale) return;
    finale.classList.remove("show");
    finale.setAttribute("aria-hidden", "true");
  }

  const finaleClose = document.getElementById("finale-close");
  if (finaleClose) finaleClose.addEventListener("click", hideFinale);
  if (finale) finale.addEventListener("click", (e) => { if (e.target === finale) hideFinale(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideFinale(); });

  const letterBtn = document.getElementById("letter-btn");
  if (letterBtn) letterBtn.addEventListener("click", showFinale);

  gifts.forEach((gift) => {
    const btn = gift.querySelector(".gift-box");
    const label = gift.querySelector(".lock-label");
    if (!btn) return;
    if (label) label.dataset.original = label.textContent;

    // Gjenopprett gaver som allerede er åpnet
    if (openedSet.has(gift.id)) {
      gift.classList.add("opened", "unlocked");
      btn.setAttribute("aria-expanded", "true");
    }

    btn.addEventListener("click", () => {
      if (gift.classList.contains("opened")) {
        gift.classList.remove("opened");
        btn.setAttribute("aria-expanded", "false");
        openedSet.delete(gift.id);
        persist();
        updateProgress();
        return;
      }

      if (!gift.classList.contains("unlocked")) {
        btn.classList.remove("wiggle");
        void btn.offsetWidth; // restart animasjonen
        btn.classList.add("wiggle");
        toast(gift.dataset.lockedMsg || "Ikke ennå!");
        return;
      }

      gift.classList.add("opened");
      btn.setAttribute("aria-expanded", "true");
      openedSet.add(gift.id);
      persist();
      updateProgress();
      confetti(gift);
      if (openedSet.size >= total) {
        setTimeout(() => {
          toast("Alle gavene er åpnet. Godt valgt, hjerte. 🥂");
          setTimeout(showFinale, 1100);
        }, 900);
      }
    });
  });

  // Nedtelling + låseoppdatering
  function fmtRemaining(ms) {
    const min = Math.ceil(ms / 60000);
    if (min < 1) return "Klokka er i gang … 🎁";
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return h + " t. " + m + " min. igjen";
    return m + " min. igjen";
  }

  function tick() {
    const now = nowMinutes();
    const nowTs = Date.now();
    gifts.forEach((gift) => {
      const label = gift.querySelector(".lock-label");
      const cd = gift.querySelector("[data-countdown]");
      const unlocked = gift.classList.contains("unlocked");

      if (cd && !unlocked) {
        const rem = startStamp(gift.dataset.start) - nowTs;
        cd.textContent = rem <= 0 ? "Klokka er i gang … 🎁" : fmtRemaining(rem);
      }

      if (unlocked) return;
      if (now >= toMinutes(gift.dataset.start) || now < DAY_END) {
        const wasOpened = gift.classList.contains("opened");
        gift.classList.add("unlocked");
        if (label && !wasOpened) label.textContent = UNLOCKED_LABEL;
        if (!wasOpened) toast("En ny gave er klar! ✨");
      }
    });
    updateLock();
  }

  // ============ Låseskjerm til dagen ============
  const LOCK_KEY = "date-lockscreen-entered-v1";
  const DATE_START = new Date(2026, 7, 29, 0, 0, 0).getTime(); // dagen: 27. august
  const lockEl = document.getElementById("lockscreen");
  const lockSub = document.getElementById("lock-sub");
  const lockGrid = document.getElementById("lock-grid");
  const lockD = document.getElementById("lock-d");
  const lockH = document.getElementById("lock-h");
  const lockM = document.getElementById("lock-m");
  const lockS = document.getElementById("lock-s");
  const lockEnter = document.getElementById("lock-enter");

  const pad2 = (n) => String(n).padStart(2, "0");

  function updateLock() {
    if (!lockEl) return;
    let entered = false;
    try { entered = localStorage.getItem(LOCK_KEY) === "1"; } catch (e) { /* privat modus */ }
    document.body.classList.toggle("lock-active", !entered);
    if (entered) {
      lockEl.classList.add("hide");
      lockEl.setAttribute("aria-hidden", "true");
      return;
    }
    lockEl.classList.remove("hide");
    lockEl.setAttribute("aria-hidden", "false");
    const ms = DATE_START - Date.now();
    if (ms <= 0) {
      if (lockGrid) lockGrid.style.display = "none";
      if (lockSub) lockSub.textContent = "Den store dagen er her.";
      if (lockEnter) lockEnter.hidden = false;
    } else {
      if (lockGrid) lockGrid.style.display = "";
      if (lockSub) lockSub.textContent = "Stopp en hall! Dagen låses opp om:";
      if (lockEnter) lockEnter.hidden = true;
      const s = Math.floor(ms / 1000);
      if (lockD) lockD.textContent = String(Math.floor(s / 86400));
      if (lockH) lockH.textContent = pad2(Math.floor(s / 3600) % 24);
      if (lockM) lockM.textContent = pad2(Math.floor(s / 60) % 60);
      if (lockS) lockS.textContent = pad2(s % 60);
    }
  }

  if (lockEnter) lockEnter.addEventListener("click", () => {
    if (lockEnter.hidden) return; // bare den dagen
    try { localStorage.setItem(LOCK_KEY, "1"); } catch (e) { /* privat modus */ }
    updateLock();
    toast("Velkommen inn, hjerte ♥");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  tick();
  setInterval(tick, 1000);

  // Nullstill (for meg) – dobbelt-tap for å unngå ulykke
  const resetBtn = document.getElementById("reset");
  if (resetBtn) {
    const resetLabel = resetBtn.textContent.trim();
    let armed = false;
    let armTimer;
    const disarm = () => {
      armed = false;
      clearTimeout(armTimer);
      resetBtn.classList.remove("armed");
      resetBtn.textContent = resetLabel;
    };
    resetBtn.addEventListener("click", () => {
      if (!armed) {
        armed = true;
        resetBtn.classList.add("armed");
        resetBtn.textContent = "Sikker? Trykk igjen";
        armTimer = setTimeout(disarm, 3000);
        return;
      }
      disarm();
      gifts.forEach((g) => {
        g.classList.remove("opened");
        const btn = g.querySelector(".gift-box");
        if (btn) btn.setAttribute("aria-expanded", "false");
        const label = g.querySelector(".lock-label");
        if (label) {
          label.textContent = g.classList.contains("unlocked")
            ? UNLOCKED_LABEL
            : label.dataset.original;
        }
      });
      openedSet.clear();
      persist();
      updateProgress();
      try { localStorage.removeItem(LOCK_KEY); } catch (e) { /* privat modus */ }
      updateLock();
      toast("Alt er nullstilt ✨");
    });
  }

  // ============ Klemmer mens du venter ============
  // Legg til så mange klemmer du vil – bare skriv dem til i listen.
  const COMPLIMENTS = [
    "Du er den beste vennen jeg noen gang har hatt.",
    "Jeg elsker deg... mer",
    "Du får hjertet mitt til å twerke",
    "Kaffe er bra, men boobies er best",
    "Du mister pusten når du snakker, jeg mister pusten når jeg ser deg",
    "Du er 10/10, 11/10, 12/10, 13/10... Noen sier han fortsatt teller",
    "Leppene dine smaker bedre enn rema stengene",
    "lattern din er nydelig og får meg alltid til å smile",
    "Jeg er smart, derfor valgte jeg deg",
    "Du er beviset på at det beste ikke kan planlegges",
    "Aldri vært så gæren etter noen som deg",
    "Roma blir verdens fineste by (etter du flytter dit)",
    "Du er søtere enn brownies",
    "Du snakker jævlig mye, bra du har verdens søteste stemme",
    "Kroppen din er et museum, kunne stirra på alle delene av deg hele dagen",
    "4 år siden livet itt begynte",
    "Du gjør til og med ventingen til noe jeg ser frem til.",
    "Ja jeg vil være sammen med deg!!",
    "Du har rett",
    "Du er best",
    "Du er den fineste jenta",
    "Jeg er stup forelska i deg",
    "Du er smart og sterk",
    "Eneste grunnen til at jeg kiler er fordi lattern din er så søt",
    "Du er den peneste på jord",
    "Rompa di er favoritt bouncen min, og jeg elsker trampoliner",
    "Love you bunny",
    "Du er den deiligste prinsessa",
    "Elsker å se deg i øynene",
    "Du er perfekt",
    "promping er gøyere med deg"
  ];
  const klemmeBtn = document.getElementById("klemme-btn");
  const klemmeLayer = document.getElementById("klemme-layer");
  const MAX_KLEMMER = 10; // maks på skjermen samtidig – overskudds-trykk skjøres forsvarlig
  let lastKlemme = -1;
  let lastKlemmeTs = 0;

  function spawnKlemme() {
    if (!klemmeLayer || COMPLIMENTS.length === 0) return;
    // Hold antallet nede selv om den trykkes i vevre
    while (klemmeLayer.children.length >= MAX_KLEMMER) {
      klemmeLayer.firstElementChild.remove();
    }
    let i = Math.floor(Math.random() * COMPLIMENTS.length);
    if (COMPLIMENTS.length > 1 && i === lastKlemme) i = (i + 1) % COMPLIMENTS.length;
    lastKlemme = i;
    const el = document.createElement("p");
    el.className = "klemme";
    const dur = 6 + Math.random() * 3;
    el.style.setProperty("--dur", dur.toFixed(2) + "s");
    el.style.setProperty("--r0", (Math.random() * 10 - 5).toFixed(1) + "deg");
    el.style.setProperty("--r1", (Math.random() * 24 - 12).toFixed(1) + "deg");
    const heart = document.createElement("span");
    heart.className = "klemme-heart";
    heart.textContent = "♥";
    el.appendChild(heart);
    el.appendChild(document.createTextNode(" " + COMPLIMENTS[i]));
    klemmeLayer.appendChild(el);
    // Målt bredde først, så plasseres den garantert inni skjermen
    const half = el.offsetWidth / 2;
    const pad = 8;
    const minX = half + pad;
    const maxX = window.innerWidth - half - pad;
    const x = minX + Math.random() * Math.max(0, maxX - minX);
    el.style.left = x + "px";
    // Drift som også holder seg inni skjermen til animasjonen er ferdig
    const dxMin = minX - x;
    const dxMax = maxX - x;
    let dx = dxMin + Math.random() * (dxMax - dxMin);
    dx = Math.max(-80, Math.min(80, dx));
    el.style.setProperty("--dx", Math.round(dx) + "px");
    const clean = () => { if (el.isConnected) el.remove(); };
    el.addEventListener("animationend", clean);
    setTimeout(clean, (dur + 1.2) * 1000); // sikkerhetsnett dersom animasjonen ikke fyller
  }

  if (klemmeBtn) {
    klemmeBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - lastKlemmeTs < 120) return; // mild for DOM-en ved raskt trykking
      lastKlemmeTs = now;
      spawnKlemme();
    });
  }

  // Skjul bilder som ikke finnes (femmer-emoji vises i stedet)
  document.querySelectorAll(".photo img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.display = "none";
    });
    if (img.complete && img.naturalWidth === 0) img.style.display = "none";
  });

  updateProgress();
})();
