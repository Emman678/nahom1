/* ==========================================================================
   NAHOM — site behaviour (vanilla JS, no dependencies)
   Sections: helpers · nav · hero timecode · work grid · dialog · showreel ·
             contact · footer
   ========================================================================== */
(function () {
  "use strict";

  var SITE = window.NAHOM_SITE || {};
  var CONTACT = SITE.contact || {};
  var REEL = SITE.showreel || {};
  var CATEGORIES = (window.NAHOM_CATEGORIES || []).slice();
  var PROJECTS = (window.NAHOM_PROJECTS || []).slice();
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = text; /* textContent only: never raw HTML */
    return n;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function str(v) { return typeof v === "string" ? v.trim() : ""; }

  /* Only https:// links for outside destinations. */
  function safeHttps(u) {
    u = str(u);
    if (!u) return "";
    try {
      var x = new URL(u);
      return x.protocol === "https:" ? x.href : "";
    } catch (e) { return ""; }
  }
  /* Local media path (relative) or https URL. Blocks javascript:, data: etc. */
  function safeMedia(u) {
    u = str(u);
    if (!u) return "";
    if (/^https:\/\//i.test(u)) return safeHttps(u);
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf("//") === 0) return "";
    return u.replace(/\.\.\//g, "");
  }
  function validEmail(e) { return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(str(e)); }

  function parseVideo(url) {
    var u = safeMedia(url);
    if (!u) return null;
    var x;
    try { x = new URL(u, location.href); } catch (e) { return null; }
    var host = x.hostname.replace(/^www\./, "");
    var id;
    if (/^https:/i.test(u)) {
      if (host === "youtu.be") id = x.pathname.slice(1).split("/")[0];
      else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        id = x.searchParams.get("v");
        if (!id) { var m = x.pathname.match(/^\/(?:embed|shorts)\/([\w-]{6,})/); if (m) id = m[1]; }
      }
      if (id && /^[\w-]{6,}$/.test(id)) return { type: "iframe", src: "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&playsinline=1" };
      if (host === "vimeo.com" || host === "player.vimeo.com") {
        var vm = x.pathname.match(/(\d{5,})/);
        if (vm) return { type: "iframe", src: "https://player.vimeo.com/video/" + vm[1] + "?dnt=1" };
      }
    }
    if (/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i.test(x.pathname)) return { type: "file", src: u };
    return null;
  }

  function ratioParts(r) {
    var m = /^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/.exec(r || "");
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  }

  var PLAY_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';

  /* ---------- footer year ---------- */
  var yr = $("#year");
  if (yr) yr.textContent = String(new Date().getFullYear());

  /* ---------- nav: scrolled state, progress, active link, mobile menu ---------- */
  var nav = $("#top-nav");
  var toggle = $("#nav-toggle");
  var bar = $("#nav-progress");
  var navLinks = $$("[data-nav]");
  var SECTION_TO_NAV = { work: "work", showreel: "work", about: "about", pillars: "about", toolkit: "about", services: "services", contact: "contact" };
  var sections = $$("main > section[id]");
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop;
      nav.setAttribute("data-state", y > 8 ? "scrolled" : "top");
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      var line = window.innerHeight * 0.35, current = "";
      sections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) current = s.id;
      });
      var key = SECTION_TO_NAV[current] || "";
      navLinks.forEach(function (a) {
        if (a.getAttribute("href") === "#" + key) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  function setMenu(open, returnFocus) {
    nav.setAttribute("data-menu", open ? "open" : "closed");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (!open && returnFocus) toggle.focus();
  }
  setMenu(false);
  toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
  $$("#site-nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") setMenu(false, true);
  });
  document.addEventListener("click", function (e) {
    if (toggle.getAttribute("aria-expanded") === "true" && !nav.contains(e.target)) setMenu(false);
  });
  window.matchMedia("(min-width: 860px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });

  /* ---------- hero: timecode follows the playhead ---------- */
  (function heroTimecode() {
    var head = $("#ruler-head"), track = $(".ruler__track"), tc = $("#hero-tc");
    if (!head || !track || !tc || reduceMotion.matches) return;
    var start = performance.now(), done = false;
    function frame() {
      var t = track.getBoundingClientRect(), h = head.getBoundingClientRect();
      var p = t.width ? Math.max(0, Math.min(1, (h.left + h.width / 2 - t.left) / t.width)) : 1;
      var secs = p * 3, s = Math.floor(secs), f = Math.floor((secs - s) * 30);
      if (p >= 0.999) { s = 3; f = 0; done = true; }
      tc.textContent = "00:" + pad(s) + ":" + pad(f);
      if (!done && performance.now() - start < 6000) requestAnimationFrame(frame);
      else tc.textContent = "00:03:00";
    }
    tc.textContent = "00:00:00";
    requestAnimationFrame(frame);
  })();

  /* ---------- hero: optional muted loop inside the portrait frame ---------- */
  (function heroVideo() {
    var info = parseVideo((SITE.hero || {}).videoUrl);
    var frame = $(".monitor__frame");
    if (!info || info.type !== "file" || !frame || reduceMotion.matches) return;
    var v = document.createElement("video");
    v.className = "monitor__video";
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.setAttribute("muted", ""); v.setAttribute("aria-hidden", "true"); v.tabIndex = -1;
    v.preload = "metadata";
    var img = $(".monitor__img");
    if (img && img.currentSrc) v.poster = img.currentSrc;
    v.src = info.src;
    v.addEventListener("error", function () { v.remove(); });
    frame.insertBefore(v, $(".monitor__shade"));
    var p = v.play(); if (p && p.catch) p.catch(function () { v.remove(); });
  })();

  /* ---------- work: grid, filters ---------- */
  var grid = $("#work-grid");
  var filtersEl = $("#filters");
  var statusEl = $("#work-status");
  var activeFilter = "All";
  var cards = [];

  PROJECTS = PROJECTS.filter(function (p) { return p && p.id && p.title; });
  PROJECTS.forEach(function (p) {
    p.category = str(p.category) || "Other Creatives";
    if (CATEGORIES.indexOf(p.category) === -1) CATEGORIES.push(p.category);
  });
  /* featured first, otherwise keep authored order */
  var ordered = PROJECTS.map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) {
    return (b.p.featured ? 1 : 0) - (a.p.featured ? 1 : 0) || a.i - b.i;
  }).map(function (o) { return o.p; });

  function ratioFrameClass(r) {
    var rp = ratioParts(r);
    if (!rp) return "ph-frame--flex";
    return rp[1] > rp[0] ? "ph-frame--916" : rp[0] > rp[1] ? "ph-frame--169" : "ph-frame--flex";
  }

  function buildCard(p) {
    var li = el("li", "work-item");
    li.dataset.category = p.category;
    var btn = el("button", "work-card");
    btn.type = "button";
    var hasVideo = !!parseVideo(p.videoUrl);
    var ratio = str(p.aspectRatio);
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-label", "Open " + p.title + ", " + p.category + (ratio ? ", " + ratio : "") + (hasVideo ? "" : ", video coming soon"));

    var media = el("span", "work-media");
    var thumb = safeMedia(p.thumbnail);
    if (thumb) {
      var img = el("img", "work-thumb");
      img.src = thumb; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      img.width = 800; img.height = 1000;
      img.addEventListener("error", function () { img.remove(); media.insertBefore(placeholder(), media.firstChild); });
      media.appendChild(img);
    } else {
      media.appendChild(placeholder());
    }
    function placeholder() {
      var ph = el("span", "work-ph");
      ph.appendChild(el("span", "ph-frame " + ratioFrameClass(ratio)));
      return ph;
    }
    var play = el("span", "work-play"); play.setAttribute("aria-hidden", "true"); play.innerHTML = PLAY_SVG;
    media.appendChild(play);
    if (!hasVideo) media.appendChild(el("span", "work-badge", "Coming soon"));
    if (ratio) media.appendChild(el("span", "work-ratio", ratio));
    btn.appendChild(media);

    var body = el("span", "work-body");
    body.appendChild(el("span", "work-cat", p.category));
    body.appendChild(el("span", "work-title", p.title));
    if (str(p.summary)) body.appendChild(el("span", "work-sum", str(p.summary)));
    btn.appendChild(body);

    btn.addEventListener("click", function () { openProject(p, btn); });
    li.appendChild(btn);
    return li;
  }

  function renderFilters() {
    var used = ["All"].concat(CATEGORIES.filter(function (c) {
      return ordered.some(function (p) { return p.category === c; });
    }));
    filtersEl.textContent = "";
    used.forEach(function (c) {
      var b = el("button", "filter", c);
      b.type = "button";
      b.dataset.filter = c;
      b.setAttribute("aria-pressed", c === activeFilter ? "true" : "false");
      b.addEventListener("click", function () { applyFilter(c); });
      filtersEl.appendChild(b);
    });
  }

  function announce() {
    var n = cards.filter(function (c) { return !c.hidden; }).length;
    statusEl.textContent = "Showing " + n + (n === 1 ? " project" : " projects") + (activeFilter === "All" ? "." : " in " + activeFilter + ".");
  }

  function applyFilter(cat) {
    if (cat === activeFilter) return;
    activeFilter = cat;
    $$(".filter", filtersEl).forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.filter === cat ? "true" : "false"); });
    function swap() {
      cards.forEach(function (c) { c.hidden = !(cat === "All" || c.dataset.category === cat); });
      grid.classList.remove("is-fading");
      grid.style.minHeight = "";
      announce();
    }
    if (reduceMotion.matches) { swap(); return; }
    grid.style.minHeight = grid.offsetHeight + "px"; /* hold height while fading: no jump */
    grid.classList.add("is-fading");
    setTimeout(swap, 170);
  }

  if (grid && filtersEl) {
    if (!ordered.length) {
      var empty = el("p", "note", "New work is on the way.");
      grid.replaceWith(empty);
      filtersEl.hidden = true;
    } else {
      ordered.forEach(function (p) { var c = buildCard(p); cards.push(c); grid.appendChild(c); });
      renderFilters();
      announce();
    }
  }

  /* ---------- project dialog ---------- */
  var dlg = $("#dlg");
  var dlgBox = $("#dlg-box");
  var stage = $("#dlg-stage");
  var lastOpener = null;

  function addFact(dl, label, value) {
    if (!value) return;
    var wrap = el("div");
    wrap.appendChild(el("dt", "", label));
    wrap.appendChild(el("dd", "", value));
    dl.appendChild(wrap);
  }

  function buildStage(p) {
    stage.textContent = "";
    var info = parseVideo(p.videoUrl);
    var poster = safeMedia(p.thumbnail);
    if (info && info.type === "file") {
      var v = document.createElement("video");
      v.controls = true; v.playsInline = true; v.preload = "metadata"; /* never autoplay */
      if (poster) v.poster = poster;
      v.src = info.src;
      v.setAttribute("aria-label", p.title);
      var cap = safeMedia(p.captions);
      if (cap) {
        var t = document.createElement("track");
        t.kind = "captions"; t.src = cap; t.srclang = "en"; t.label = "English"; t.default = true;
        v.appendChild(t);
      }
      stage.appendChild(v);
    } else if (info && info.type === "iframe") {
      var f = document.createElement("iframe");
      f.src = info.src; f.title = p.title; f.loading = "lazy";
      f.allow = "fullscreen; picture-in-picture; encrypted-media";
      f.referrerPolicy = "strict-origin-when-cross-origin";
      stage.appendChild(f);
    } else {
      var e = el("div", "stage-empty");
      var ic = el("span"); ic.setAttribute("aria-hidden", "true");
      ic.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40" focusable="false"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/></svg>';
      e.appendChild(ic);
      e.appendChild(el("span", "", "Video coming soon"));
      stage.appendChild(e);
    }
  }

  function openProject(p, opener) {
    lastOpener = opener || null;
    var rp = ratioParts(str(p.aspectRatio));
    var w = rp ? rp[0] : 16, h = rp ? rp[1] : 9;
    dlg.classList.toggle("dlg--portrait", h > w);
    dlg.classList.toggle("dlg--landscape", h <= w);
    stage.style.setProperty("--r", w + " / " + h);
    buildStage(p);
    $("#dlg-cat").textContent = p.category;
    $("#dlg-title").textContent = p.title;
    $("#dlg-sum").textContent = str(p.summary);
    var facts = $("#dlg-facts");
    facts.textContent = "";
    addFact(facts, "Role", str(p.role));
    addFact(facts, "Client", str(p.client));
    if (Array.isArray(p.deliverables) && p.deliverables.length) {
      addFact(facts, "Deliverables", p.deliverables.map(str).filter(Boolean).join(", "));
    }
    addFact(facts, "Format", rp ? str(p.aspectRatio) : "");
    document.documentElement.classList.add("modal-open");
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    dlg.scrollTop = 0;
  }

  function closeDialog() {
    if (typeof dlg.close === "function") dlg.close(); else { dlg.removeAttribute("open"); afterClose(); }
  }
  function afterClose() {
    stage.textContent = ""; /* stops playback and frees the decoder */
    document.documentElement.classList.remove("modal-open");
    if (lastOpener && document.contains(lastOpener)) lastOpener.focus({ preventScroll: true });
    lastOpener = null;
  }
  if (dlg) {
    $("#dlg-close").addEventListener("click", closeDialog);
    dlg.addEventListener("close", afterClose); /* fires for Escape, button and backdrop */
    dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(); });
    dlg.addEventListener("keydown", function (e) { if (e.key === "Escape" && typeof dlg.close !== "function") closeDialog(); });
  }

  /* ---------- showreel ---------- */
  (function showreel() {
    var box = $("#reel");
    if (!box) return;
    var info = parseVideo(REEL.videoUrl);
    var poster = safeMedia(REEL.poster);

    if (!info) {
      box.classList.add("reel--quiet");
      var q = el("div", "reel__quiet");
      q.appendChild(el("h3", "", "Showreel coming soon"));
      q.appendChild(el("p", "", "A short cut of recent work will live here. Until then, browse the projects above."));
      var s = el("div", "reel__scrub"); s.setAttribute("aria-hidden", "true");
      q.appendChild(s);
      box.appendChild(q);
      return;
    }

    function mountPlayer() {
      box.textContent = "";
      if (info.type === "file") {
        var v = document.createElement("video");
        v.controls = true; v.playsInline = true; v.preload = "auto";
        if (poster) v.poster = poster;
        v.src = info.src;
        v.setAttribute("aria-label", "Nahom showreel");
        var cap = safeMedia(REEL.captions);
        if (cap) {
          var t = document.createElement("track");
          t.kind = "captions"; t.src = cap; t.srclang = "en"; t.label = "English"; t.default = true;
          v.appendChild(t);
        }
        box.appendChild(v);
        v.play().catch(function () { /* user can press play */ });
        v.focus();
      } else {
        var f = document.createElement("iframe");
        f.src = info.src + (info.src.indexOf("?") > -1 ? "&" : "?") + "autoplay=1";
        f.title = "Nahom showreel"; f.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
        box.appendChild(f);
      }
    }

    var start = el("button", "reel__start");
    start.type = "button";
    start.setAttribute("aria-label", "Play showreel");
    if (poster) {
      var img = el("img", "reel__poster");
      img.src = poster; img.alt = ""; img.loading = "lazy"; img.decoding = "async";
      img.width = 1600; img.height = 900;
      box.appendChild(img);
    }
    var p = el("span", "work-play"); p.setAttribute("aria-hidden", "true"); p.innerHTML = PLAY_SVG;
    start.appendChild(p);
    start.addEventListener("click", mountPlayer);
    box.appendChild(start);
  })();

  /* ---------- contact: channels + brief form ---------- */
  var channels = [];
  function pushChannel(label, href, external) { if (href) channels.push({ label: label, href: href, external: external !== false }); }

  var subject = str(SITE.mailSubject) || "Video editing project inquiry";
  var emailOk = validEmail(CONTACT.email);
  if (emailOk) pushChannel("Email", "mailto:" + str(CONTACT.email) + "?subject=" + encodeURIComponent(subject), false);
  var wa = str(CONTACT.whatsapp), waHref = "";
  if (/^\+?[\d\s-]{7,18}$/.test(wa)) waHref = "https://wa.me/" + wa.replace(/\D/g, "");
  else waHref = safeHttps(wa);
  pushChannel("WhatsApp", waHref);
  pushChannel("Upwork", safeHttps(CONTACT.upwork));
  pushChannel("Instagram", safeHttps(CONTACT.instagram));
  pushChannel("TikTok", safeHttps(CONTACT.tiktok));
  pushChannel("LinkedIn", safeHttps(CONTACT.linkedin));

  function chipLink(c, cls, label) {
    var a = el("a", cls, label || c.label);
    a.href = c.href;
    if (c.external) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    return a;
  }
  var chList = $("#channels"), ftList = $("#footer-social");
  if (channels.length) {
    channels.forEach(function (c) {
      var li = el("li"); li.appendChild(chipLink(c, "chip")); chList.appendChild(li);
      var li2 = el("li"); li2.appendChild(chipLink(c, "chip")); ftList.appendChild(li2);
    });
    chList.hidden = false;
    ftList.hidden = false;
  }
  /* "Message Me" only when a real messaging destination exists */
  var msgPriority = ["WhatsApp", "Instagram", "LinkedIn", "Upwork", "TikTok"];
  var msgBtn = $("#message-me");
  var msgChannel = null;
  msgPriority.some(function (name) {
    return channels.some(function (c) { if (c.label === name) { msgChannel = c; return true; } return false; });
  });
  if (msgChannel && msgBtn) {
    msgBtn.href = msgChannel.href; msgBtn.target = "_blank"; msgBtn.rel = "noopener noreferrer";
    msgBtn.hidden = false;
  }

  var form = $("#brief");
  var statusMsg = $("#brief-status");
  var submitBtn = $("#brief-submit");
  function setStatus(msg, tone) { statusMsg.textContent = msg; if (tone) statusMsg.setAttribute("data-tone", tone); else statusMsg.removeAttribute("data-tone"); }

  function buildMessage(d) {
    return [
      subject,
      "",
      "Name: " + d.name,
      "Reply to: " + d.reach,
      "Platform: " + d.platform,
      d.link ? "Raw materials: " + d.link : "",
      "",
      "What I'm building:",
      d.message
    ].filter(function (l, i, a) { return !(l === "" && a[i - 1] === ""); }).join("\n");
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); } finally { ta.remove(); }
    });
  }

  if (form) {
    form.addEventListener("input", function (e) {
      if (e.target && e.target.removeAttribute) e.target.removeAttribute("aria-invalid");
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (submitBtn.disabled) return;
      var fd = new FormData(form);
      if (str(fd.get("_gotcha"))) return; /* bot trap */
      var d = {
        name: str(fd.get("name")), reach: str(fd.get("reach")), platform: str(fd.get("platform")),
        link: str(fd.get("link")), message: str(fd.get("message"))
      };
      var bad = [];
      function flag(id, ok) { var f = $("#" + id); if (!ok) { f.setAttribute("aria-invalid", "true"); bad.push(f); } else f.removeAttribute("aria-invalid"); }
      flag("f-name", !!d.name);
      flag("f-reach", !!d.reach);
      flag("f-platform", !!d.platform);
      flag("f-link", !d.link || !!safeHttps(d.link) || /^http:\/\//i.test(d.link));
      flag("f-msg", !!d.message);
      if (bad.length) {
        setStatus(bad[0].id === "f-link" ? "That link doesn’t look right. Use a full address starting with https://." : "Please fill in the highlighted fields.", "error");
        bad[0].focus();
        return;
      }
      var text = buildMessage(d);
      var endpoint = safeHttps(CONTACT.formEndpoint);

      if (endpoint) {
        submitBtn.disabled = true; setStatus("Sending…");
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ subject: subject, name: d.name, reply_to: d.reach, platform: d.platform, link: d.link, message: d.message })
        }).then(function (r) {
          if (!r.ok) throw new Error("bad status");
          form.reset();
          setStatus("Sent. Nahom will reply to " + d.reach + ".", "ok");
        }).catch(function () {
          setStatus("That didn’t send. Check your connection and try again.", "error");
        }).then(function () { submitBtn.disabled = false; });
        return;
      }
      if (emailOk) {
        window.location.href = "mailto:" + str(CONTACT.email) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
        setStatus("Your email app should open with the message ready to send.", "ok");
        return;
      }
      copyText(text).then(function () {
        setStatus("Your brief is copied. Paste it into a message to Nahom.", "ok");
      }).catch(function () {
        setStatus("Couldn’t copy automatically. Select your message and copy it by hand.", "error");
      });
    });
  }
})();
