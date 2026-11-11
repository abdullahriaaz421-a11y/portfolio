(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
document.documentElement.classList.add('js');

/* ---------- preloader ---------- */
const pre = $('#preloader'), pct = $('#loadPct');
let shown = 0, loaded = false;
function endPreloader() {
  pre.classList.add('done');
  setTimeout(() => pre.remove(), 800);
  $$('.hero .reveal').forEach((el, i) => setTimeout(() => el.classList.add('in'), 120 * i));
}
const tick = setInterval(() => {
  shown = Math.min(shown + (loaded ? 12 : 3), loaded ? 100 : 90);
  pct.textContent = shown;
  if (shown >= 100) { clearInterval(tick); endPreloader(); }
}, 40);
const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).then(() => { loaded = true; });

/* ---------- 3D scene (lazy, after first paint) ---------- */
let sceneOk = false;
try { sceneOk = !!(window.initScene && window.initScene($('#scene'), { reducedMotion: reduced })); } catch (e) { console.warn('3D scene disabled:', e); }

/* ---------- typed role ---------- */
(function typed() {
  const el = $('#typed');
  if (!el || reduced) return;
  const words = ['Senior Full Stack PHP Laravel Developer', 'ERP & CRM Software Builder', 'E-commerce Website Developer', 'Web Portal Engineer'];
  let w = 0, i = words[0].length, del = true, wait = 0;
  setInterval(() => {
    if (wait > 0) { wait--; return; }
    const word = words[w];
    i += del ? -1 : 1;
    el.textContent = word.slice(0, i);
    if (!del && i === word.length) { del = true; wait = 40; }
    else if (del && i === 0) { del = false; w = (w + 1) % words.length; }
  }, 55);
  wait = 60;
})();

/* ---------- nav ---------- */
const toggle = $('#navToggle'), links = $('#navLinks');
function setMenu(open) { toggle.setAttribute('aria-expanded', open); links.classList.toggle('open', open); }
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

const sections = $$('main section[id]');
const navMap = new Map($$('.nav__links a').map((a) => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      navMap.forEach((a) => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
      const a = navMap.get(en.target.id);
      if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => spy.observe(s));

/* ---------- scroll progress + timeline ---------- */
const bar = $('#progress'), tl = $('#timeline');
let ticking = false;
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  if (tl) {
    const r = tl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    tl.style.setProperty('--tp', p.toFixed(3));
  }
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

/* ---------- reveal + counters ---------- */
function count(el) {
  const target = +el.dataset.count, suffix = el.dataset.suffix || '';
  if (reduced) { el.textContent = target + suffix; return; }
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / 1400);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suffix : '');
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    io.unobserve(en.target);
  });
}, { threshold: 0.12 });
$$('.reveal').forEach((el, i) => { if (!el.closest('.hero')) { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); } });
// stats live inside a reveal block; make sure counters run once visible
const statIO = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { $$('[data-count]', e.target).forEach(count); statIO.unobserve(e.target); } }), { threshold: 0.4 });
const stats = $('.stats'); if (stats) statIO.observe(stats);

/* ---------- 3D tilt cards (fine pointers only) ---------- */
if (finePointer && !reduced) {
  $$('[data-tilt]').forEach((el) => {
    const max = el.classList.contains('about__photo') ? 8 : 10;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.classList.add('is-tilting');
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max * 1.2}deg) translateZ(6px)`;
      el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('is-tilting'); el.style.transform = ''; });
  });

  /* magnetic buttons */
  $$('[data-magnetic]').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.2}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });
}

/* ---------- custom cursor ---------- */
if (finePointer) {
  const cur = $('#cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
  document.documentElement.classList.add('js-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)`; }, { passive: true });
  (function loop() { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
  document.addEventListener('pointerover', (e) => cur.classList.toggle('hover', !!e.target.closest('a,button,[data-tilt].project,input,textarea')));
}

/* ---------- project modal ---------- */
const modal = $('#modal');
let lastFocus = null;
$$('.project').forEach((card) => {
  $('.project__open', card).addEventListener('click', () => {
    lastFocus = document.activeElement;
    const img = $('img', card);
    $('#mImg').src = img.src; $('#mImg').alt = img.alt;
    $('#mTitle').textContent = $('h3', card).textContent;
    const tmp = document.createElement('div'); tmp.innerHTML = card.dataset.type;
    $('#mType').textContent = tmp.textContent;
    const ul = $('#mStack'); ul.replaceChildren();
    card.dataset.stack.split(',').forEach((s) => { const li = document.createElement('li'); li.textContent = s.trim(); ul.append(li); });
    $('#mLink').href = card.dataset.url;
    modal.showModal();
    document.documentElement.style.overflow = 'hidden';
  });
});
function closeModal() { modal.close(); }
$('#mClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
modal.addEventListener('close', () => { document.documentElement.style.overflow = ''; lastFocus && lastFocus.focus(); });

/* ---------- contact form (opens the visitor's mail app; no backend needed) ---------- */
const form = $('#contactForm'), status = $('#formStatus');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;
  $$('.field', form).forEach((f) => {
    const inp = $('input,textarea', f), err = $('.err', f);
    let msg = '';
    if (!inp.value.trim()) msg = 'This field is required.';
    else if (inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value)) msg = 'Please enter a valid email address.';
    f.classList.toggle('invalid', !!msg); err.textContent = msg; inp.setAttribute('aria-invalid', !!msg);
    if (msg && ok) { inp.focus(); ok = false; }
  });
  if (!ok) return;
  const d = new FormData(form);
  const body = `${d.get('message')}\n\n— ${d.get('name')} (${d.get('email')})`;
  location.href = `mailto:talhafarooq522446@gmail.com?subject=${encodeURIComponent('Portfolio enquiry from ' + d.get('name'))}&body=${encodeURIComponent(body)}`;
  status.textContent = 'Opening your email app to send the message. If nothing opens, email talhafarooq522446@gmail.com directly.';
  form.reset();
});

$('#year').textContent = new Date().getFullYear();
})();
