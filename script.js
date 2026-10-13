/* ==========================================================================
   SAN GAB URIEL · Motor de animación e interacción (sin dependencias)
   Módulos: loader · scroll suave · split de texto · reveals · header/menú
   hero (parallax + partículas) · marquee · manifiesto · expansión de foto
   tarjetas apiladas · bento · timeline · galería · FAQ · cierre · selección
   de servicios + formulario → WhatsApp · lightbox · cursor · magnéticos
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const WA = '525574043075';

  let vw = innerWidth, vh = innerHeight, maxScroll = 0;
  let dirty = true;             // fuerza recalcular los efectos de scroll (tras medir)
  const measures = [];          // callbacks que recalculan posiciones
  const reads = [];             // lecturas de layout por frame, ANTES de escribir: (y, moved)
  const frames = [];            // callbacks por frame: (y, dt, t, moved)
  const absTop = el => { let t = 0; for (let n = el; n; n = n.offsetParent) t += n.offsetTop; return t; };

  /* ------------------------------------------------------------------ 1 · Anclas (scroll nativo)
     El scroll lo maneja el navegador (hilo del compositor): no se intercepta la rueda. */
  function goTo(y) {
    scrollTo({ top: clamp(y, 0, maxScroll), behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ 2 · Loader */
  function initLoader() {
    const loader = $('#loader'), bar = $('#loaderBar'), pct = $('#loaderPct');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (!location.hash) scrollTo(0, 0);

    const MIN = reduce ? 500 : 2400;
    let loaded = false, finished = false, shown = 0;
    const t0 = performance.now();

    const pageLoaded = new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    Promise.all([pageLoaded, fontsReady]).then(() => { loaded = true; });
    setTimeout(() => { loaded = true; }, 6500);

    function finish() {
      finished = true;
      bar.style.setProperty('--p', 1);
      pct.textContent = '100';
      loader.classList.add('is-done');
      loader.setAttribute('aria-busy', 'false');
      setTimeout(() => {
        doc.classList.remove('is-loading');
        doc.classList.add('is-ready');
        const h1 = $('[data-hero-split]');
        if (h1) h1.classList.add('is-in');
        measureAll();
      }, reduce ? 0 : 650);
      setTimeout(() => loader.classList.add('is-gone'), reduce ? 50 : 2000);
    }

    (function tick(now) {
      if (finished) return;
      const t = clamp((now - t0) / MIN);
      let target = easeOut(t) * 100;
      if (!loaded) target = Math.min(target, 88);
      shown += (target - shown) * 0.14;
      bar.style.setProperty('--p', (shown / 100).toFixed(3));
      pct.textContent = Math.min(99, Math.round(shown));
      if (loaded && t >= 1 && shown > 98.6) return finish();
      requestAnimationFrame(tick);
    })(t0);
  }

  /* ------------------------------------------------------------------ 3 · Split de texto */
  function splitText(el) {
    let idx = 0, prevWord = false, lastWi = null;
    const out = el.cloneNode(false);
    const mkWord = txt => {
      const w = document.createElement('span'); w.className = 'w';
      const i = document.createElement('span'); i.className = 'wi';
      i.textContent = txt; i.style.setProperty('--i', idx++);
      w.appendChild(i); lastWi = i; return w;
    };
    (function walk(src, dst) {
      src.childNodes.forEach(ch => {
        if (ch.nodeType === 3) {
          ch.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { dst.appendChild(document.createTextNode(' ')); prevWord = false; }
            else if (prevWord && lastWi) lastWi.textContent += tok;      // puntuación pegada a la palabra
            else { dst.appendChild(mkWord(tok)); prevWord = true; }
          });
        } else if (ch.nodeType === 1) {
          const c = ch.cloneNode(false); dst.appendChild(c); walk(ch, c);
        }
      });
    })(el, out);
    el.replaceChildren(...out.childNodes);
  }

  /* ------------------------------------------------------------------ 4 · Reveals + contadores */
  function initReveals() {
    $$('[data-split]').forEach(splitText);
    $$('[data-stagger]').forEach(g => $$('[data-reveal]', g).forEach((c, i) => c.style.setProperty('--d', i * 90)));

    const all = $$('[data-reveal], [data-split]:not([data-hero-split]), .scard, .footer__word');
    if (reduce || !('IntersectionObserver' in window)) { all.forEach(e => e.classList.add('is-in')); }
    else {
      // los elementos con clip-path al 100% no reportan intersección: se observa su contenedor
      const owner = new Map();
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { (owner.get(e.target) || e.target).classList.add('is-in'); io.unobserve(e.target); }
      }), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
      all.forEach(e => {
        const t = (e.dataset.reveal === 'mask' || e.classList.contains('footer__word')) ? e.parentElement : e;
        owner.set(t, e); io.observe(t);
      });
    }

    // contadores
    const counters = $$('[data-count]');
    const run = el => {
      const end = +el.dataset.count, dur = 1900, t0 = performance.now();
      if (reduce) { el.textContent = end; return; }
      (function f(now) {
        const t = clamp((now - t0) / dur);
        el.textContent = Math.round(easeOut(t) * end);
        if (t < 1) requestAnimationFrame(f);
      })(t0);
    };
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { run(e.target); cio.unobserve(e.target); }
      }), { threshold: 0.6 });
      counters.forEach(c => { c.textContent = '0'; cio.observe(c); });
    }
  }

  /* ------------------------------------------------------------------ 5 · Header, progreso, menú, anclas */
  function initChrome() {
    const header = $('#header'), prog = $('#progressBar'), burger = $('#burger'), menu = $('#menu');
    const links = $$('.nav a');
    const secs = links.map(a => $(a.getAttribute('href')));
    let lastY = 0, hidden = false;

    const setMenu = open => {
      doc.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', !open);
      if (open) header.classList.remove('is-hidden');
    };
    burger.addEventListener('click', () => setMenu(!doc.classList.contains('menu-open')));
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      setMenu(false);
      goTo(id === '#inicio' ? 0 : absTop(el));
    });

    // posiciones de las secciones en caché (leerlas en cada frame fuerza un relayout)
    let tops = [], hs = [], lastP = -1, solid = false, current = -2;
    measures.push(() => { tops = secs.map(s => s ? absTop(s) : 0); hs = secs.map(s => s ? s.offsetHeight : 0); });

    frames.push((y, dt, t, moved) => {
      if (!moved) return;
      const p = maxScroll > 0 ? +clamp(y / maxScroll).toFixed(4) : 0;
      if (p !== lastP) { lastP = p; prog.style.transform = `scaleX(${p})`; }
      const s = y > 40;
      if (s !== solid) { solid = s; header.classList.toggle('is-solid', s); }
      if (Math.abs(y - lastY) > 5) {
        const down = y > lastY;
        const hide = down && y > 520 && !doc.classList.contains('menu-open');
        if (hide !== hidden) { hidden = hide; header.classList.toggle('is-hidden', hide); }
        lastY = y;
      }
      let active = -1;
      const probe = y + vh * 0.42;
      for (let i = 0; i < secs.length; i++) if (secs[i] && probe >= tops[i] && probe < tops[i] + hs[i]) active = i;
      if (active !== current) { current = active; links.forEach((a, i) => a.classList.toggle('is-active', i === active)); }
    });
  }

  /* ------------------------------------------------------------------ 6 · Partículas (polvo de luz) */
  // Cada partícula (núcleo + halo suave) se pre-dibuja una vez en un sprite por tamaño y color;
  // por frame solo se estampa con drawImage (mucho más barato que 2 arcos + un string rgba por partícula).
  const DUST_BUCKETS = 6;
  const dustSprites = (rgb, dpr) => Array.from({ length: DUST_BUCKETS }, (_, k) => {
    const r = 0.5 + 1.7 * (k + 0.5) / DUST_BUCKETS, size = Math.ceil(r * 8 * dpr), c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), m = size / 2;
    g.fillStyle = `rgba(${rgb},.14)`; g.beginPath(); g.arc(m, m, m, 0, 6.2832); g.fill();
    g.fillStyle = `rgb(${rgb})`; g.beginPath(); g.arc(m, m, m / 4, 0, 6.2832); g.fill();
    return { c, s: size / dpr };
  });

  function makeDust(canvas, { density = 9000, max = 90, gold = 0.45 } = {}) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 0, parts = [], spGold = null, spSky = null;
    const mouse = { x: -9999, y: -9999 };
    const spawn = (anywhere = true) => {
      const r = Math.random() * 1.7 + 0.5;
      return {
        x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10,
        r, b: Math.min(DUST_BUCKETS - 1, ((r - 0.5) / 1.7 * DUST_BUCKETS) | 0),
        vy: -(Math.random() * 0.28 + 0.06), vx: (Math.random() - 0.5) * 0.12,
        a: Math.random() * 0.6 + 0.25, ph: Math.random() * 6.28, gold: Math.random() < gold
      };
    };
    const resize = () => {
      const nd = Math.min(devicePixelRatio || 1, 1.5), r = canvas.getBoundingClientRect();
      // si el tamaño no cambió no se toca el canvas (reasignar width lo vacía y realoca su memoria)
      if (spGold && nd === dpr && Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1) return;
      if (nd !== dpr) { dpr = nd; spGold = dustSprites('246,213,110', dpr); spSky = dustSprites('155,188,245', dpr); }
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.round(clamp(w * h / density, 18, max)) }, () => spawn());
      if (reduce) draw(0, true);
    };
    function draw(t, still) {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        if (!still) {
          p.x += p.vx + Math.sin(t / 2200 + p.ph) * 0.18;
          p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 14000) { const f = (1 - d2 / 14000) * 1.4 / Math.sqrt(d2 + 1); p.x += dx * f; p.y += dy * f; }
          if (p.y < -10) Object.assign(p, spawn(false));
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        }
        const sp = (p.gold ? spGold : spSky)[p.b];
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t / 650 + p.ph));
        ctx.drawImage(sp.c, p.x - sp.s / 2, p.y - sp.s / 2, sp.s, sp.s);
      }
      ctx.globalAlpha = 1;
    }
    const host = canvas.parentElement;
    if (fine) {
      host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }
    measures.push(resize); resize();
    return { draw, host };
  }

  /* ------------------------------------------------------------------ 7 · Hero */
  function initHero() {
    const hero = $('#inicio'), portal = $('#portal'), cv = $('#heroDust');
    if (!hero || !portal) return;
    const copy = $('.hero__copy', hero);
    let heroH = hero.offsetHeight, tx = 0, ty = 0, mx = 0, my = 0, lastHp = -1;
    measures.push(() => { heroH = hero.offsetHeight; });
    if (fine) hero.addEventListener('pointermove', e => { tx = (e.clientX / vw - 0.5) * 2; ty = (e.clientY / vh - 0.5) * 2; });
    const dust = makeDust(cv, { density: 10000, max: 80, gold: 0.5 });

    frames.push((y, dt, t, moved) => {
      if (y > heroH + 60) return;
      // salida del hero al hacer scroll: se escribe directo en los 2 elementos (sin variable heredada
      // por todo el árbol del hero, que obligaba a recalcular el estilo de ~100 nodos por frame)
      if (moved) {
        const hp = +clamp(y / (heroH * 0.9)).toFixed(3);
        if (hp !== lastHp) {
          lastHp = hp;
          copy.style.translate = `0 ${(hp * 70).toFixed(1)}px`;
          copy.style.opacity = Math.max(0, 1 - hp * 1.5).toFixed(3);
          portal.style.translate = `0 ${(hp * -50).toFixed(1)}px`;
          portal.style.scale = (1 + hp * 0.1).toFixed(4);
        }
      }
      if (reduce) return;
      // parallax del mouse: solo se escribe mientras el valor aún se está acercando al destino
      if (Math.abs(tx - mx) > 0.0005 || Math.abs(ty - my) > 0.0005) {
        mx = lerp(mx, tx, 0.06); my = lerp(my, ty, 0.06);
        portal.style.setProperty('--mx', mx.toFixed(3));
        portal.style.setProperty('--my', my.toFixed(3));
      }
      dust.draw(t);
    });
  }

  /* ------------------------------------------------------------------ 8 · Marquee */
  function initMarquee() {
    const rows = $$('[data-marquee]');
    if (!rows.length) return;
    const st = rows.map(row => ({ row, dir: +row.dataset.marquee, x: 0, gw: 1 }));
    const build = () => {
      st.forEach(s => {
        while (s.row.children.length > 1) s.row.lastElementChild.remove();
        s.gw = s.row.firstElementChild.getBoundingClientRect().width || 1;
        const n = Math.ceil((vw * 2) / s.gw) + 1;
        for (let i = 0; i < n; i++) { const c = s.row.firstElementChild.cloneNode(true); c.setAttribute('aria-hidden', 'true'); s.row.appendChild(c); }
      });
    };
    const box = rows[0].parentElement;
    let top = 0, bh = 0;
    measures.push(build, () => { top = absTop(box); bh = box.offsetHeight; }); build();
    if (reduce) return;
    let lastY = scrollY, vel = 0;
    frames.push((y, dt) => {
      vel = lerp(vel, y - lastY, 0.12); lastY = y;
      if (y + vh < top || y > top + bh) return;      // fuera de pantalla: no se anima
      st.forEach(s => {
        s.x += s.dir * (34 + Math.abs(vel) * 14) * (dt / 1000);
        if (s.x <= -s.gw) s.x += s.gw; else if (s.x > 0) s.x -= s.gw;
        s.row.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
      });
    });
  }

  /* ------------------------------------------------------------------ 9 · Manifiesto (palabras que se iluminan) */
  function initManifesto() {
    const p = $('#manifesto');
    if (!p) return;
    const words = [], out = document.createDocumentFragment();
    let prevWord = false;
    p.childNodes.forEach(ch => {
      const em = ch.nodeType === 1 && ch.tagName === 'EM';
      ch.textContent.split(/(\s+)/).forEach(tok => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { out.appendChild(document.createTextNode(' ')); prevWord = false; }
        else if (prevWord) words[words.length - 1].textContent += tok;
        else { const s = document.createElement('span'); s.className = 'mw' + (em ? ' is-em' : ''); s.textContent = tok; out.appendChild(s); words.push(s); prevWord = true; }
      });
    });
    p.replaceChildren(out);
    if (reduce) { words.forEach(w => w.classList.add('on')); return; }
    let top = absTop(p), h = p.offsetHeight, shown = -1;
    measures.push(() => { top = absTop(p); h = p.offsetHeight; });
    frames.push((y, dt, t, moved) => {
      if (!moved) return;
      const rt = top - y;
      if (rt > vh || rt + h < 0) return;
      const start = vh * 0.88, end = vh * 0.5 - h;
      const prog = clamp((start - rt) / (start - end));
      const n = Math.round(prog * words.length);
      if (n === shown) return;
      // solo se tocan las palabras que cambian de estado
      const from = shown < 0 ? 0 : Math.min(shown, n), to = shown < 0 ? words.length : Math.max(shown, n);
      shown = n;
      for (let i = from; i < to; i++) words[i].classList.toggle('on', i < n);
    });
  }

  /* ------------------------------------------------------------------ 10 · Foto que se expande con el scroll */
  function initExpand() {
    const sec = $('[data-expand]');
    if (!sec || reduce) return;
    const frame = $('#expandFrame'), img = $('img', frame), shade = $('.expand__shade', frame);
    const intro = $('#expandIntro'), outro = $('#expandOutro');
    let top = absTop(sec), h = sec.offsetHeight, lastQ = -1;
    measures.push(() => { top = absTop(sec); h = sec.offsetHeight; lastQ = -1; });
    frames.push((y, dt, t, moved) => {
      if (!moved) return;
      const rt = top - y;
      if (rt > vh + 100 || rt + h < -100) return;
      const p = clamp(-rt / (h - vh));
      const q = Math.round(p * 4000);
      if (q === lastQ) return;
      lastQ = q;
      const wide = vw >= 900;
      const s = wide ? [15, 5, 15, 52] : [42, 7, 7, 7], rad = wide ? 38 : 34;
      const e = easeOut(clamp(p / 0.58));
      frame.style.clipPath = `inset(${s.map(v => (v * (1 - e)).toFixed(2) + '%').join(' ')} round ${(rad * (1 - e)).toFixed(1)}px)`;
      img.style.scale = lerp(1.3, 1.02, e).toFixed(4);
      frame.style.setProperty('--shade', lerp(0.18, 0.78, e).toFixed(3));
      const io = clamp(p / 0.2);
      intro.style.opacity = (1 - io).toFixed(3);
      intro.style.transform = `translateY(${(-io * 70).toFixed(1)}px)`;
      const o = clamp((p - 0.62) / 0.24);
      outro.style.opacity = o.toFixed(3);
      outro.style.transform = `translateY(${((1 - o) * 46).toFixed(1)}px)`;
      outro.classList.toggle('is-live', o > 0.55);
    });
  }

  /* ------------------------------------------------------------------ 11 · Tarjetas apiladas */
  function initStack() {
    const cards = $$('.scard');
    if (cards.length < 2) return;
    const mq = matchMedia('(min-width:900px) and (min-height:640px)');
    const stack = $('#stack');
    let top = absTop(stack), h = stack.offsetHeight, hs = cards.map(c => c.offsetHeight), tops = null;
    const last = cards.map(() => '');
    measures.push(() => { top = absTop(stack); h = stack.offsetHeight; hs = cards.map(c => c.offsetHeight); });
    // lectura de posiciones ANTES de cualquier escritura del frame (un solo layout por frame)
    reads.push((y, moved) => {
      tops = (moved && mq.matches && top - y <= vh && top + h - y >= 0) ? cards.map(c => c.getBoundingClientRect().top) : null;
    });
    frames.push(() => {
      if (!tops) return;
      cards.forEach((c, i) => {
        const v = i === cards.length - 1 ? '0' : clamp((hs[i] + 30 - (tops[i + 1] - tops[i])) / hs[i]).toFixed(3);
        if (v !== last[i]) { last[i] = v; c.style.setProperty('--c', v); }
      });
    });
    mq.addEventListener('change', () => cards.forEach((c, i) => { last[i] = '0'; c.style.setProperty('--c', 0); }));
  }

  /* ------------------------------------------------------------------ 12 · Spotlight en tarjetas bento */
  function initTiles() {
    if (!fine) return;
    $$('.tile').forEach(t => t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }

  /* ------------------------------------------------------------------ 13 · Timeline del proceso */
  function initSteps() {
    const ol = $('#steps'), fill = $('#stepsFill');
    if (!ol) return;
    const steps = $$('.step', ol);
    let top = absTop(ol), h = ol.offsetHeight, tops = steps.map(absTop);
    measures.push(() => { top = absTop(ol); h = ol.offsetHeight; tops = steps.map(absTop); });
    if (reduce) { steps.forEach(s => s.classList.add('is-passed')); fill.parentElement.style.setProperty('--fill', 1); return; }
    let cur = -2, lastFill = '';
    frames.push((y, dt, t, moved) => {
      if (!moved) return;
      const rt = top - y;
      if (rt > vh || rt + h < -50) return;
      const mid = y + vh * 0.55;
      const f = clamp((mid - top) / h).toFixed(4);
      if (f !== lastFill) { lastFill = f; fill.parentElement.style.setProperty('--fill', f); }
      let act = -1;
      tops.forEach((t, i) => { if (t < mid) act = i; });
      if (act === cur) return;
      cur = act;
      steps.forEach((s, i) => { s.classList.toggle('is-passed', i <= act); s.classList.toggle('is-active', i === act); });
    });
  }

  /* ------------------------------------------------------------------ 14 · Parallax de imágenes y galería */
  function initParallax() {
    if (reduce) return;
    const imgs = $$('.pimg img, .gal__media img, .tile__photo img').map(img => {
      const p = img.parentElement;
      return { img, p, top: 0, h: 1, v: '' };
    });
    const gal = $('.gal');
    const items = $$('.gal__item[data-speed]').map(el => ({ el, sp: +el.dataset.speed, top: 0, h: 1, v: '' }));
    const meas = () => {
      imgs.forEach(o => { o.top = absTop(o.p); o.h = o.p.offsetHeight; });
      items.forEach(o => { o.top = absTop(o.el); o.h = o.el.offsetHeight; });
    };
    measures.push(meas); meas();
    frames.push((y, dt, t, moved) => {
      if (!moved) return;
      for (const o of imgs) {
        const c = o.top + o.h / 2 - y - vh / 2;
        if (Math.abs(c) > vh / 2 + o.h) continue;
        const v = (-clamp(c / (vh / 2 + o.h / 2), -1, 1) * o.h * 0.075).toFixed(1) + 'px';
        if (v !== o.v) { o.v = v; o.img.style.setProperty('--iy', v); }
      }
      if (vw >= 900 && gal) for (const o of items) {
        const c = o.top + o.h / 2 - y - vh / 2;
        if (Math.abs(c) > vh * 1.2) continue;
        const v = (c * o.sp * -1 * 2.2).toFixed(1) + 'px';
        if (v !== o.v) { o.v = v; o.el.style.setProperty('--gy', v); }
      }
    });
  }

  /* ------------------------------------------------------------------ 15 · FAQ animado */
  function initFaq() {
    $$('.qa').forEach(d => {
      const sum = $('summary', d), ans = $('.qa__a', d);
      sum.addEventListener('click', e => {
        e.preventDefault();
        if (reduce) { d.open = !d.open; return; }
        if (d.dataset.anim) return;
        const opening = !d.open;
        if (opening) d.open = true;
        const from = opening ? 0 : ans.offsetHeight, to = opening ? ans.scrollHeight : 0;
        d.dataset.anim = '1';
        const a = ans.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
        a.onfinish = a.oncancel = () => { d.dataset.anim = ''; if (!opening) d.open = false; };
      });
    });
  }

  /* ------------------------------------------------------------------ 16 · Cierre (palabra gigante + partículas) */
  function initFinale() {
    const sec = $('#cita'), word = $('#finaleWord'), cv = $('#finaleDust');
    if (!sec) return;
    let top = absTop(sec), h = sec.offsetHeight;
    measures.push(() => { top = absTop(sec); h = sec.offsetHeight; });
    const dust = cv ? makeDust(cv, { density: 9000, max: 80, gold: 0.6 }) : null;
    frames.push((y, dt, t, moved) => {
      const rt = top - y;
      if (rt > vh || rt + h < 0) return;
      if (moved && word && !reduce) {
        const p = clamp((vh - rt) / (vh + h));
        word.style.setProperty('--wx', ((0.06 - p * 0.42) * vw).toFixed(1) + 'px');
      }
      if (dust && !reduce) dust.draw(t);
    });
  }

  /* ------------------------------------------------------------------ 17 · Selección de servicios + formulario → WhatsApp */
  function initBooking() {
    const form = $('#builder'), tray = $('#tray');
    if (!form) return;
    const btns = $$('.sel[data-service]'), checks = $$('input[name="servicio"]', form);
    const nombre = $('#nombre'), msg = $('#mensaje'), err = $('#nombreErr'), prev = $('#preview');
    const picked = new Set();
    let contactVisible = false;

    const list = arr => (typeof Intl !== 'undefined' && Intl.ListFormat)
      ? new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(arr)
      : arr.join(', ');

    function build() {
      const name = nombre.value.trim();
      const when = ($('input[name="horario"]:checked', form) || {}).value;
      const extra = msg.value.trim();
      const chosen = checks.filter(c => picked.has(c.value)).map(c => c.value);
      let m = name ? `Hola, soy ${name}. Me gustaría agendar una cita en San Gab Uriel.` : 'Hola, me gustaría agendar una cita en San Gab Uriel.';
      if (chosen.length) m += ` Me interesa: ${list(chosen)}.`;
      if (when) m += ` Me viene mejor ${when}.`;
      if (extra) m += ` ${extra}`;
      return m;
    }
    let flashT;
    function render() {
      btns.forEach(b => b.setAttribute('aria-pressed', picked.has(b.dataset.service)));
      checks.forEach(c => { c.checked = picked.has(c.value); c.closest('.sel').classList.toggle('is-on', c.checked); });
      const n = picked.size;
      $('#trayCount').textContent = n;
      $('#trayLabel').textContent = n === 1 ? 'servicio en tu cita' : 'servicios en tu cita';
      tray.classList.toggle('is-on', n > 0 && !contactVisible);
      prev.textContent = build();
      prev.classList.add('is-flash'); clearTimeout(flashT); flashT = setTimeout(() => prev.classList.remove('is-flash'), 350);
    }
    const toggle = (v, on) => { on ? picked.add(v) : picked.delete(v); render(); };
    btns.forEach(b => b.addEventListener('click', () => toggle(b.dataset.service, !picked.has(b.dataset.service))));
    checks.forEach(c => c.addEventListener('change', () => toggle(c.value, c.checked)));
    $('#trayClear').addEventListener('click', () => { picked.clear(); render(); });
    [nombre, msg].forEach(el => el.addEventListener('input', () => { el.classList.remove('is-bad'); err.hidden = true; render(); }));
    $$('input[name="horario"]', form).forEach(r => r.addEventListener('change', render));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { contactVisible = es[0].isIntersecting; render(); }, { threshold: 0.12 }).observe($('#contacto'));
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!nombre.value.trim()) {
        nombre.classList.add('is-bad'); err.hidden = false; nombre.focus();
        return;
      }
      // enlace temporal con target=_blank: abre WhatsApp en otra pestaña sin sacar al visitante de la página
      const a = document.createElement('a');
      a.href = `https://wa.me/${WA}?text=${encodeURIComponent(build())}`;
      a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
    render();
  }

  /* ------------------------------------------------------------------ 18 · Lightbox */
  function initLightbox() {
    const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
    const items = [];
    $$('[data-lightbox]').forEach(el => {
      const src = el.dataset.lightbox;
      if (!items.some(i => i.src === src)) items.push({ src, cap: el.dataset.caption || '', alt: (el.querySelector('img') || {}).alt || '' });
      el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Ver foto ampliada: ' + (el.dataset.caption || ''));
      el.addEventListener('click', () => open(src));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(src); } });
    });
    let idx = 0, last = null;
    const show = i => {
      idx = (i + items.length) % items.length;
      img.style.opacity = 0;
      setTimeout(() => { img.src = items[idx].src; img.alt = items[idx].alt; cap.textContent = items[idx].cap; img.style.opacity = 1; }, reduce ? 0 : 180);
    };
    function open(src) {
      last = document.activeElement;
      const i = Math.max(0, items.findIndex(x => x.src === src));
      idx = i; img.src = items[i].src; img.alt = items[i].alt; cap.textContent = items[i].cap; img.style.opacity = 1;
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); doc.classList.add('lb-open');
      $('#lbClose').focus();
    }
    function close() {
      lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); doc.classList.remove('lb-open');
      if (last) last.focus();
    }
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', () => show(idx - 1));
    $('#lbNext').addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb), first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------ 19 · Cursor + botones magnéticos */
  function initPointer() {
    if (!fine || reduce) return;
    doc.classList.add('has-cursor');
    const c = $('#cursor'), dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), lab = $('#cursorLabel');
    let x = -100, y = -100, rx = -100, ry = -100;
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px,${y}px)`;
      const t = e.target.closest ? e.target.closest('[data-cursor], a, button, summary, .sel, input, textarea') : null;
      const view = t && t.closest('[data-cursor]');
      c.classList.toggle('is-view', !!view);
      c.classList.toggle('is-link', !!t && !view);
      lab.textContent = view ? view.dataset.cursor : '';
    }, { passive: true });
    frames.push(() => {
      if (Math.abs(x - rx) < 0.1 && Math.abs(y - ry) < 0.1) return;      // ya llegó: no se reescribe
      rx = lerp(rx, x, 0.2); ry = lerp(ry, y, 0.2);
      ring.style.transform = `translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px)`;
    });
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', ((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1) + 'px');
        b.style.setProperty('--ty', ((e.clientY - (r.top + r.height / 2)) * 0.3).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    });
  }

  /* ------------------------------------------------------------------ 20 · Burbuja del botón de WhatsApp */
  function initWaHint() {
    const wa = $('#waFloat');
    if (!wa) return;
    const pulse = () => { wa.classList.add('is-hint'); setTimeout(() => wa.classList.remove('is-hint'), 7000); };
    setTimeout(pulse, 7500); setTimeout(pulse, 52000);
  }

  /* ------------------------------------------------------------------ 21 · Pausar animaciones fuera de pantalla
     Las animaciones CSS infinitas (brillos, pulsos, giros) de una sección que no se ve se pausan. */
  function initOffscreenPause() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '120px 0px' });
    $$('main > section, main > .marquee, .footer').forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------------ 22 · Mapa bajo demanda
     El iframe de Google Maps es pesado: se carga cuando falta poco para verlo y en tiempo ocioso,
     no durante el scroll de las secciones anteriores. */
  function initMap() {
    const f = $('.map iframe[data-src]');
    if (!f) return;
    const load = () => { if (f.src) return; f.src = f.dataset.src; };
    if (!('IntersectionObserver' in window)) return load();
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      'requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 1500 }) : setTimeout(load, 200);
    }, { rootMargin: '350px 0px' });
    io.observe(f);
  }

  /* ------------------------------------------------------------------ Orquestación */
  function measureAll() {
    vw = innerWidth; vh = innerHeight;
    maxScroll = Math.max(0, doc.scrollHeight - vh);
    measures.forEach(f => f());
    dirty = true;
  }
  let rT;
  const remeasure = () => { clearTimeout(rT); rT = setTimeout(measureAll, 140); };

  function start() {
    initLoader();
    initReveals();
    initChrome();
    initHero();
    initMarquee();
    initManifesto();
    initExpand();
    initStack();
    initTiles();
    initSteps();
    initParallax();
    initFaq();
    initFinale();
    initBooking();
    initLightbox();
    initPointer();
    initWaHint();
    initOffscreenPause();
    initMap();

    measureAll();
    addEventListener('resize', remeasure);
    addEventListener('load', measureAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);

    // Un frame = primero todas las LECTURAS de layout, luego todas las ESCRITURAS de estilo.
    // Los efectos que dependen solo del scroll se saltan cuando el scroll no cambió.
    let lastT = performance.now(), lastY = -1;
    (function loop(t) {
      const dt = Math.min(64, t - lastT); lastT = t;
      const y = scrollY, moved = dirty || y !== lastY;
      lastY = y; dirty = false;
      for (let i = 0; i < reads.length; i++) reads[i](y, moved);
      for (let i = 0; i < frames.length; i++) frames[i](y, dt, t, moved);
      requestAnimationFrame(loop);
    })(lastT);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
