/* 方舟鸡窝官网交互：星野粒子 / 导航态 / 移动菜单 / 滚动揭示 / 数字滚动 */
(function () {
  "use strict";

  /* ---------- 星野粒子 ---------- */
  var canvas = document.getElementById("stars");
  var ctx = canvas.getContext("2d");
  var stars = [];
  var W = 0, H = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function seed() {
    stars = [];
    var count = Math.min(160, Math.floor((W * H) / 9000));
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.4, 1.6),
        a: rand(0.12, 0.9),
        v: rand(0.02, 0.14),
        tw: rand(0.004, 0.02)
      });
    }
  }
  var t = 0;
  /* 验收用：?static=1 时暂停粒子动画（QA 截图需要，正式访问不触发） */
  var STATIC = location.search.indexOf("static=1") !== -1;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y -= s.v;
      if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
      var flicker = 0.72 + 0.28 * Math.sin(t * 0.018 * 60 * s.tw + i);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(180, 210, 255," + (s.a * flicker).toFixed(3) + ")";
      ctx.fill();
    }
    t += 0.016;
    requestAnimationFrame(draw);
  }
  resize(); seed(); if (!STATIC) draw();
  window.addEventListener("resize", function () { resize(); seed(); });
  var last = 0;
  window.addEventListener("scroll", function () { /* starfield stays fixed */ }, { passive: true });

  /* ---------- Hero 壁纸轮播（R2 壁纸库，Supabase wallpapers 表驱动） ---------- */
  (function () {
    var host = "https://r2.lostarkjiwo.dpdns.org/wallpapers/";
    var slides = document.querySelector(".hero__slides");
    if (!slides || !("IntersectionObserver" in window)) return; // 能力降级：无容器/无 IO 则不轮播
    var STATIC = location.search.indexOf("static=1") !== -1;

    // 硬编码回落列表（A 计划失败时使用；与 Supabase wallpapers 表内容一致）
    var fallback = [
      "9bfb47d61331.jpg", "43c8f94cb3eb.jpg", "4bc59e4f7d2f.jpg", "8a132a47da39.jpg"
    ];
    var picked = [];
    var idx = 0, timer = null;

    function build(list) {
      picked = list.filter(function (f) { return /^[\w.-]+\.(jpe?g|png|webp)$/i.test(f); });
      if (picked.length < 2) return; // 少于 2 张不轮播
      picked.forEach(function (f) {
        var div = document.createElement("div");
        div.className = "hero__slide";
        div.style.backgroundImage = "url('" + host + f + "')";
        slides.appendChild(div);
      });
      slides.firstChild.classList.add("is-on");
      if (STATIC) return; // QA 静态截图：只看第一张
      // 预加载下一张，避免首次切换白闪
      var next = new Image();
      next.src = host + picked[1];
      timer = setInterval(function () {
        var cur = slides.children[idx];
        var ni = (idx + 1) % picked.length;
        var nxt = slides.children[ni];
        var pre = new Image();
        pre.src = host + picked[(ni + 1) % picked.length];
        nxt.classList.add("is-on");
        cur.classList.remove("is-on");
        idx = ni;
      }, 8000);
    }

    // A 计划：匿名读 Supabase wallpapers 表（anon key 为客户端公开用途）
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "https://api.lostarkjiwo.dpdns.org/rest/v1/wallpapers?select=filename&order=created_at.desc&limit=24");
      xhr.setRequestHeader("apikey", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3YmRnbHJtZmNzb3l4YmxjYmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM4ODgsImV4cCI6MjA5NzY0OTg4OH0.Hwegn6DF3LA_1dABcdoC4EqHT4l_nIaZGtp6nqxhgpw");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.timeout = 6000;
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            var rows = JSON.parse(xhr.responseText);
            if (rows && rows.map) build(rows.map(function (r) { return r.filename; }));
            else build(fallback);
          } catch (e) { build(fallback); }
        } else { build(fallback); }
      };
      xhr.onerror = function () { build(fallback); };
      xhr.ontimeout = function () { build(fallback); };
      xhr.send();
    } catch (e) { build(fallback); }
  })();

  /* ---------- 导航态 ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 移动菜单 ---------- */
  var burger = document.getElementById("burger");
  var mobile = document.getElementById("mobileMenu");
  burger.addEventListener("click", function () {
    burger.classList.toggle("open");
    mobile.classList.toggle("open");
  });
  mobile.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      burger.classList.remove("open");
      mobile.classList.remove("open");
    }
  });

  /* ---------- 滚动揭示（含交错） ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  /* 验收开关：?preview=1 时跳过 IO 等待，全部立即可见（正式访问不受影响） */
  if (location.search.indexOf("preview=1") !== -1) {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add("in-view");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min((i % 3) * 90, 180) + "ms";
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- 数字滚动 ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var dur = 1400;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  var cObserver = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 })
    : null;
  counters.forEach(function (el) {
    if (cObserver) cObserver.observe(el);
    else el.textContent = el.getAttribute("data-count");
  });

  /* 验收诊断：?diag=1 时把页面规模写入 title（QA 用） */
  if (location.search.indexOf("diag=1") !== -1) {
    setTimeout(function () {
      document.title = "DIAG|h=" + document.body.scrollHeight + "|sec=" +
        document.querySelectorAll(".section").length + "|rv=" +
        document.querySelectorAll(".reveal.in-view").length;
    }, 1500);
  }

  /* 验收定位：?go=<id> 时瞬移滚动到目标区（QA 用，正式访问不触发） */
  var gm = location.search.match(/[?&]go=([^&]+)/);
  if (gm) {
    var target = document.getElementById(decodeURIComponent(gm[1]));
    if (target) {
      document.documentElement.style.scrollBehavior = "auto";
      setTimeout(function () {
        window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 56);
      }, 300);
    }
  }
})();
