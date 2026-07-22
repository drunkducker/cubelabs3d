/* ==========================================================================
   CUBE LAB 3D — LEARN PAGE  ·  visual generators
   Renders the isometric cubes, flat OLL/PLL face grids, tutorial thumbnails
   and the product cube as inline SVG so the whole page stays asset-free.
   ========================================================================== */
(function () {
  "use strict";

  // Sticker palette (matches the mockup / brand tokens)
  var C = {
    W: "#f4f6f8", Y: "#ffd21f", R: "#e6352b", O: "#ff7a1a",
    B: "#1667e0", G: "#2fbf3f", X: "#182034"
  };

  /* ---- isometric 3x3 cube --------------------------------------------------
     top/left/right are 9-element colour-key arrays read left→right, top→bottom
     on each visible face. Returns a self-contained <svg> string.             */
  function iso(top, left, right) {
    var s = 24;                       // tile edge
    var hx = s * 0.866, hy = s * 0.5; // isometric half-steps
    var cx = 65, topY = 10;           // diamond apex
    var R = { x: hx, y: hy };         // right-down axis
    var L = { x: -hx, y: hy };        // left-down axis
    var D = { x: 0, y: s };           // straight down
    var apex = { x: cx, y: topY };

    function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
    function mul(v, k) { return { x: v.x * k, y: v.y * k }; }
    function quad(o, u, v, fill) {
      var pts = [o, add(o, u), add(o, add(u, v)), add(o, v)]
        .map(function (q) { return q.x.toFixed(1) + "," + q.y.toFixed(1); }).join(" ");
      return '<polygon points="' + pts + '" fill="' + fill +
        '" stroke="rgba(0,0,0,.5)" stroke-width="1.3" stroke-linejoin="round"/>';
    }
    function shade(key, k) {
      var hex = C[key] || C.X;
      if (k >= 1) return hex;
      var n = parseInt(hex.slice(1), 16);
      return "rgb(" + Math.round(((n >> 16) & 255) * k) + "," +
        Math.round(((n >> 8) & 255) * k) + "," + Math.round((n & 255) * k) + ")";
    }
    function grid(origin, across, down, cells, k) {
      var out = "";
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        out += quad(add(origin, add(mul(across, c), mul(down, r))), across, down,
          shade(cells[r * 3 + c], k));
      }
      return out;
    }

    var leftCorner = add(apex, mul(L, 3));   // top of left face
    var rightCorner = add(apex, mul(R, 3));  // top of right face

    var svg = '<svg class="iso" viewBox="0 0 130 168" aria-hidden="true">';
    svg += '<ellipse cx="65" cy="160" rx="40" ry="10" fill="rgba(0,0,0,.4)"/>';
    svg += grid(apex, R, L, top, 1.0);          // TOP face
    svg += grid(leftCorner, R, D, left, 0.82);  // LEFT face
    svg += grid(rightCorner, L, D, right, 0.66); // RIGHT face
    return svg + "</svg>";
  }

  /* ---- flat 3x3 face (algorithm cards) ---- */
  function face(cells) {
    var html = '<div class="face3">';
    for (var i = 0; i < 9; i++) {
      html += "<span class='" + (cells[i] || "") + "'></span>";
    }
    return html + "</div>";
  }

  /* ---- tutorial thumbnail (cube on gradient) ---- */
  function thumb(top, left, right, bg) {
    return '<span style="position:absolute;inset:0;background:' + bg +
      ';display:grid;place-items:center">' +
      '<span style="width:60px;height:66px;display:block">' + iso(top, left, right) +
      "</span></span>";
  }

  /* ---------- cube definitions ---------- */
  var W = "W", Y = "Y", R = "R", B = "B", G = "G";
  var solid = function (c) { return [c, c, c, c, c, c, c, c, c]; };

  var cubes = {
    hero: iso(solid(W), solid(B), solid(R)),
    avatar: iso([R, G, W, W, B, R, G, W, B], [B, R, G, W, B, R, G, W, B], [R, W, G, B, R, W, G, B, R]),
    "getting-started": iso([W, R, W, G, W, R, W, G, W], [R, G, R, G, R, G, R, G, R], [G, W, G, W, G, W, G, W, G]),
    beginner: iso([W, W, R, W, R, W, G, W, W], [B, R, B, R, B, R, B, R, B], [R, G, R, G, R, G, R, G, R]),
    cfop: iso(solid(W), solid(G), solid(R)),
    oll: iso(solid(Y), solid(B), solid(R)),
    product: iso(solid(W), solid(B), solid(R))
  };

  var thumbs = {
    t1: thumb(solid(W), [R, G, R, G, R, G, R, G, R], [G, W, G, W, G, W, G, W, G], "linear-gradient(135deg,#20304a,#0d1424)"),
    t2: thumb([W, R, W, G, W, R, W, G, W], [G, R, G, W, B, R, G, W, B], [R, W, B, G, R, W, B, G, R], "linear-gradient(135deg,#2a2140,#0d1424)"),
    t3: thumb([G, W, G, W, R, W, G, W, R], [R, W, G, B, R, W, G, B, R], [W, G, R, B, W, G, R, B, W], "linear-gradient(135deg,#102a2a,#0d1424)"),
    t4: thumb(solid(Y), [B, R, B, R, B, R, B, R, B], [R, G, R, G, R, G, R, G, R], "linear-gradient(135deg,#2a2410,#0d1424)")
  };

  // OLL/PLL top-face patterns: "y" = oriented yellow, "g" = grey/other
  var faces = {
    sexy: ["y", "", "y", "", "y", "", "y", "", "y"],
    sledge: ["", "y", "", "y", "y", "y", "", "y", ""],
    tperm: ["y", "g", "y", "y", "y", "y", "g", "y", "g"],
    yperm: ["g", "y", "g", "y", "y", "y", "y", "g", "y"]
  };

  /* ---------- mount everything ---------- */
  document.querySelectorAll("[data-cube]").forEach(function (el) {
    var key = el.getAttribute("data-cube");
    if (cubes[key]) el.innerHTML = cubes[key];
    else if (thumbs[key]) el.innerHTML = thumbs[key];
  });
  document.querySelectorAll("[data-face]").forEach(function (el) {
    var key = el.getAttribute("data-face");
    if (faces[key]) el.innerHTML = face(faces[key]);
  });
  document.querySelectorAll("[data-ring]").forEach(function (el) {
    el.style.setProperty("--val", el.getAttribute("data-ring"));
  });

  // Cosmetic press feedback (no navigation in this static prototype)
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".play, .btn-grad, .browse-all, .topic, .tut");
    if (!b || !b.animate) return;
    b.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }],
      { duration: 150, easing: "ease-out" });
  });

  /* ---- affiliate product carousel: auto-rotate + swipe + dots ---- */
  function initCarousel(root) {
    var vp = root.querySelector(".aff-viewport");
    var cards = root.querySelectorAll(".prod-card");
    var dotsWrap = root.querySelector(".aff-dots");
    if (!vp || !cards.length || !dotsWrap) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idx = 0, timer = null;

    cards.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show product " + (i + 1) + " of " + cards.length);
      if (i === 0) { b.className = "on"; b.setAttribute("aria-current", "true"); }
      b.addEventListener("click", function () { go(i); });
      dotsWrap.appendChild(b);
    });
    var dots = dotsWrap.querySelectorAll("button");

    function step() { return cards[0].getBoundingClientRect().width + 12; } // card + gap
    function atEnd() { return vp.scrollLeft + vp.clientWidth >= vp.scrollWidth - 4; }
    function go(i) { idx = (i + cards.length) % cards.length; vp.scrollTo({ left: idx * step(), behavior: "smooth" }); }
    function next() { go(atEnd() ? 0 : idx + 1); }
    function sync() {
      var i = Math.round(vp.scrollLeft / step());
      i = Math.max(0, Math.min(cards.length - 1, i));
      idx = i;
      dots.forEach(function (d, k) {
        var on = k === i; d.classList.toggle("on", on);
        if (on) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    }
    vp.addEventListener("scroll", function () { window.requestAnimationFrame(sync); }, { passive: true });

    function start() { if (reduce || timer) return; timer = setInterval(next, 2800); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    ["pointerenter", "focusin", "touchstart"].forEach(function (ev) { root.addEventListener(ev, stop, { passive: true }); });
    ["pointerleave", "focusout", "touchend"].forEach(function (ev) { root.addEventListener(ev, start, { passive: true }); });
    start();
  }
  document.querySelectorAll("[data-carousel]").forEach(initCarousel);
})();
