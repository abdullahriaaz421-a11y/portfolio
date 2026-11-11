/* Skills "technology universe": skills orbit a Laravel core on three tilted elliptical rings.
   Nodes are real <li> elements (accessible list); JS only positions them. SVG draws rings + connection lines.
   Animation runs only while the section is on screen; reduced motion gets a static arrangement. */
(function () {
  'use strict';

  window.initUniverse = function (root, opts) {
    opts = opts || {};
    if (!root) return;
    var svg = root.querySelector('#uniSvg');
    var nodes = Array.prototype.slice.call(root.querySelectorAll('#uniNodes li'));
    var NS = 'http://www.w3.org/2000/svg';
    var RINGS = [0.27, 0.4, 0.5];      // radius as a fraction of the container width
    var SPEED = [0.12, -0.075, 0.05];  // radians per second
    var TILT = 0.42;                   // vertical squash = perspective
    var active = 'all';

    // spread nodes evenly on their ring
    var byRing = [[], [], []];
    nodes.forEach(function (n) { byRing[+n.dataset.ring].push(n); });
    byRing.forEach(function (list, r) {
      list.forEach(function (n, i) { n._a = (i / list.length) * Math.PI * 2 + r * 0.6; n._r = r; });
    });

    var ellipses = RINGS.map(function () { var e = document.createElementNS(NS, 'ellipse'); svg.appendChild(e); return e; });
    var lines = nodes.map(function () { var l = document.createElementNS(NS, 'line'); svg.appendChild(l); return l; });
    var ringCat = ['back', 'front', 'tools'];

    var size = 0, cx = 0, cy = 0, K = 0.92, SQ = TILT * 1.9;
    function measure() {
      size = root.clientWidth; cx = size / 2; cy = root.clientHeight / 2;
      K = size < 520 ? 0.76 : 0.92; // keep outer chips inside the viewport on phones
      SQ = size < 560 ? 1.25 : TILT * 1.9; // taller orbits on phones so chips don't collide
      svg.setAttribute('viewBox', '0 0 ' + size + ' ' + root.clientHeight);
      ellipses.forEach(function (e, i) {
        e.setAttribute('cx', cx); e.setAttribute('cy', cy);
        e.setAttribute('rx', RINGS[i] * size * K); e.setAttribute('ry', RINGS[i] * size * K * SQ);
      });
      nodes.forEach(function (n) { n._w = n.offsetWidth; n._h = n.offsetHeight; });
    }

    function place(t) {
      nodes.forEach(function (n, i) {
        var a = n._a + t * SPEED[n._r];
        var rx = RINGS[n._r] * size * K, ry = rx * SQ;
        var x = Math.cos(a) * rx, y = Math.sin(a) * ry;
        var depth = (Math.sin(a) + 1) / 2;           // 0 = back, 1 = front
        var s = 0.78 + depth * 0.28;
        n.style.transform = 'translate(' + (x - n._w / 2).toFixed(1) + 'px,' + (y - n._h / 2).toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
        n.style.zIndex = depth > 0.5 ? 6 : 4;
        if (!n.classList.contains('dim')) n.style.opacity = (0.55 + depth * 0.45).toFixed(2);
        var l = lines[i];
        l.setAttribute('x1', cx); l.setAttribute('y1', cy);
        l.setAttribute('x2', (cx + x).toFixed(1)); l.setAttribute('y2', (cy + y).toFixed(1));
      });
    }

    function setFilter(cat) {
      active = cat;
      nodes.forEach(function (n, i) {
        var on = cat === 'all' || n.dataset.cat === cat;
        n.classList.toggle('dim', !on);
        n.classList.toggle('hot', on && cat !== 'all');
        lines[i].classList.toggle('on', on && cat !== 'all');
        if (!on) n.style.opacity = '';
      });
      ellipses.forEach(function (e, i) { e.classList.toggle('on', cat !== 'all' && ringCat[i] === cat); });
    }

    // hovering a node traces its connection
    nodes.forEach(function (n, i) {
      n.addEventListener('pointerenter', function () { lines[i].classList.add('on'); });
      n.addEventListener('pointerleave', function () { if (active === 'all' || n.dataset.cat !== active) lines[i].classList.remove('on'); });
    });

    var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        filters.forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
        setFilter(b.dataset.cat);
      });
    });

    measure();
    var t0 = performance.now(), raf = 0, running = false, offset = 0;
    function loop(now) { place(offset + (now - t0) / 1000); raf = requestAnimationFrame(loop); }
    function start() { if (running || opts.reducedMotion) return; running = true; t0 = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { if (!running) return; running = false; offset += (performance.now() - t0) / 1000; cancelAnimationFrame(raf); }

    place(0);
    window.addEventListener('resize', function () { measure(); place(offset); }, { passive: true });
    if (!opts.reducedMotion) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(root);
      document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
    }
  };
})();
