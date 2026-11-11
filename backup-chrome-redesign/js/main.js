/* Main page logic. Classic script (works from file://). Every enhancement is optional:
   if GSAP / Three.js fail to load, content stays fully visible and usable. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var hasGsap = !!(gsap && ST) && !reduced;
  if (hasGsap) { gsap.registerPlugin(ST); root.classList.add('has-gsap'); }

  /* ---------- 3D hero ---------- */
  try {
    if (window.initHero3D && window.initHero3D($('#hero3d'), { reducedMotion: reduced })) root.classList.add('has-webgl');
  } catch (e) { console.warn('3D hero disabled:', e); }

  /* ---------- skills universe ---------- */
  try {
    if (window.initUniverse) window.initUniverse($('#universe'), { reducedMotion: reduced });
    else root.classList.add('no-orbit');
  } catch (e) { root.classList.add('no-orbit'); }

  /* ---------- intro curtain + hero entrance ---------- */
  var intro = $('#intro'), bar = $('#introBar');
  requestAnimationFrame(function () { bar.style.width = '100%'; });
  function heroIn() {
    if (!hasGsap) return;
    gsap.from('.hero__name .line > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: 0.05 });
    gsap.from(['.kicker.hero__in', '.hero__title', '.hero__ctas', '.hero__meta', '.scrollcue'], { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.35 });
    gsap.from('.nav > *', { y: -20, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.5 });
  }
  var introDone = false;
  function endIntro() {
    if (introDone) return; introDone = true;
    intro.classList.add('is-done');
    setTimeout(function () { intro.remove(); }, 900);
    heroIn();
  }
  var fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1500); })]).then(function () { setTimeout(endIntro, 450); });

  /* ---------- nav: active section + sliding indicator ---------- */
  var pill = $('.nav__pill'), ind = $('#navInd');
  var links = $$('.nav__pill a');
  function moveInd(a) {
    if (!a) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1;
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  var current = null;
  function setActive(id) {
    current = links.filter(function (a) { return a.hash === '#' + id; })[0] || null;
    links.forEach(function (a) { var on = a === current; a.classList.toggle('is-active', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
    moveInd(current);
  }
  var sections = $$('main > section[id]');
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
  }, { rootMargin: '-45% 0px -54% 0px' });
  sections.forEach(function (s) { spy.observe(s); });
  links.forEach(function (a) {
    a.addEventListener('mouseenter', function () { moveInd(a); });
  });
  pill.addEventListener('mouseleave', function () { moveInd(current); });
  window.addEventListener('resize', function () { moveInd(current); }, { passive: true });

  /* ---------- mobile menu ---------- */
  var burger = $('#burger'), menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    if (open) {
      if (hasGsap) gsap.from('#menu nav a', { y: 40, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05 });
      $('#menu a').focus();
    }
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
  });

  /* ---------- smooth anchor scrolling (GSAP handles pinned sections correctly) ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.pageYOffset - (target.id === 'home' ? 0 : 70);
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', '#' + target.id);
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
  });

  /* ---------- about statement: split words, light them up on scroll ---------- */
  var st = $('#statement');
  var hl = /^(e-commerce|ERP|CRM|PHP|Laravel|dependable)/i;
  st.innerHTML = st.textContent.trim().split(/\s+/).map(function (w) {
    return '<span class="w' + (hl.test(w) ? ' hl' : '') + '">' + w + '</span>';
  }).join(' ');
  var words = $$('.w', st);
  if (hasGsap) {
    ST.create({
      trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
      }
    });
  } else words.forEach(function (w) { w.classList.add('on'); });

  if (!hasGsap) return finishCommon();

  /* ---------- generic reveals ---------- */
  var revealSel = ['.label', '.h2', '.about__copy > *', '.skills__intro .muted', '.filters', '.case__body > *', '.svc__item', '.contact__details > *', '.form', '.footer__row > *'];
  $$(revealSel.join(',')).forEach(function (el) { el.classList.add('rv'); });
  ST.batch('.rv', {
    start: 'top 88%',
    onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, overwrite: true }); }
  });

  /* hero parallax out */
  gsap.to('.hero__inner', { yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('#hero3d', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* about floating chrome + portrait depth */
  $$('[data-depth]').forEach(function (el) {
    var d = parseFloat(el.dataset.depth);
    gsap.fromTo(el, { y: 120 * d }, { y: -120 * d, ease: 'none', scrollTrigger: { trigger: '.about__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.glassframe', { clipPath: 'inset(100% 0% 0% 0% round 28px)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.about__portrait', start: 'top 80%' } });

  /* skills universe entrance */
  gsap.from('.universe', { scale: 0.85, opacity: 0, rotate: -6, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.universe', start: 'top 80%' } });

  /* contact headline */
  gsap.from('.contact__title', { yPercent: 30, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.contact__title', start: 'top 85%' } });

  /* case studies: image clip reveal + slow parallax */
  $$('.case').forEach(function (c) {
    var img = $('.case__img', c), pic = $('img', c);
    gsap.from(img, { clipPath: 'inset(12% 12% 12% 12% round 22px)', opacity: 0.3, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 78%' } });
    gsap.fromTo(pic, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* services: staggered 3D objects */
  gsap.from('.obj', { rotateY: -180, opacity: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.svc', start: 'top 80%' }, clearProps: 'transform' });

  /* experience: horizontal spatial scroll on large screens */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function () {
    var track = $('#expTrack'), vp = $('.exp__viewport');
    var dist = function () { return Math.max(0, track.scrollWidth - vp.clientWidth); };
    var tl = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: '.exp', pin: '.exp__pin', start: 'top top', end: function () { return '+=' + (dist() + window.innerHeight * 0.3); }, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    gsap.to('#expRail', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.exp', start: 'top top', end: function () { return '+=' + (dist() + window.innerHeight * 0.3); }, scrub: true, invalidateOnRefresh: true } });
    $$('.station').forEach(function (s, i) {
      gsap.fromTo(s, { rotateY: 18, z: -140, opacity: 0.35 }, {
        rotateY: 0, z: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: s, containerAnimation: tl, start: 'left 95%', end: 'left 45%', scrub: true }
      });
    });
    return function () { gsap.set(track, { clearProps: 'all' }); };
  });
  mm.add('(max-width: 900px)', function () {
    $$('.station').forEach(function (s) {
      gsap.from(s, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
    });
  });

  // images load lazily: refresh trigger positions as they arrive
  $$('img[loading=lazy]').forEach(function (img) { if (!img.complete) img.addEventListener('load', function () { ST.refresh(); }, { once: true }); });
  window.addEventListener('load', function () { ST.refresh(); });

  finishCommon();

  /* ---------- things that run with or without GSAP ---------- */
  function finishCommon() {
    /* 3D tilt on case-study previews */
    if (fine && !reduced) {
      $$('.case__img').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          el.style.transition = 'transform .12s linear';
          el.style.transform = 'rotateX(' + ((0.5 - y) * 7).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 9).toFixed(2) + 'deg) translateZ(10px)';
          el.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
        el.addEventListener('pointerleave', function () { el.style.transition = ''; el.style.transform = ''; });
      });
    }

    /* contact holographic field follows the pointer */
    var holo = $('#holo'), contact = $('#contact');
    if (!reduced) {
      var hx = 30, hy = 40, tx = 30, ty = 40, ang = 0, hraf = 0, on = false;
      contact.addEventListener('pointermove', function (e) {
        var r = contact.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width * 100; ty = (e.clientY - r.top) / r.height * 100;
      });
      var step = function () {
        hx += (tx - hx) * 0.06; hy += (ty - hy) * 0.06; ang = (ang + 0.15) % 360;
        holo.style.setProperty('--hx', hx.toFixed(1) + '%'); holo.style.setProperty('--hy', hy.toFixed(1) + '%');
        holo.style.setProperty('--ha', ang.toFixed(1) + 'deg');
        if (on) hraf = requestAnimationFrame(step);
      };
      new IntersectionObserver(function (en) {
        on = en[0].isIntersecting; if (on) hraf = requestAnimationFrame(step); else cancelAnimationFrame(hraf);
      }).observe(contact);
    }

    /* contact form → opens the visitor's mail client (no server required) */
    var form = $('#form'), status = $('#formStatus');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      $$('.field', form).forEach(function (f) {
        var inp = $('input,textarea', f), err = $('.err', f), v = inp.value.trim(), msg = '';
        if (!v) msg = 'Please fill in this field.';
        else if (inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = 'Please enter a valid email address.';
        f.classList.toggle('invalid', !!msg); err.textContent = msg; inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (msg && !firstBad) firstBad = inp;
      });
      if (firstBad) { firstBad.focus(); status.textContent = ''; return; }
      var d = new FormData(form);
      var body = d.get('message') + '\n\n— ' + d.get('name') + ' (' + d.get('email') + ')';
      window.location.href = 'mailto:talhafarooq522446@gmail.com?subject=' + encodeURIComponent('Project enquiry from ' + d.get('name')) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Opening your email app… If nothing happens, write to talhafarooq522446@gmail.com.';
      form.reset();
    });

    $('#year').textContent = new Date().getFullYear();
  }
})();
