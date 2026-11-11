// Three.js background scene: glass-wire core, orbit rings, floating cubes and a particle field.
// Reacts to mouse (desktop), scroll and pauses when the tab is hidden. Degrades gracefully.
// Loaded as a classic script (works from file:// too); uses the global THREE from vendor/three.min.js.
window.initScene = function initScene(canvas, { reducedMotion = false } = {}) {
  if (!window.THREE) return null;
  const THREE = window.THREE;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null; // no WebGL: CSS gradient background stays
  }
  const isMobile = matchMedia('(max-width: 800px)').matches || !matchMedia('(hover:hover)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 10;

  const rig = new THREE.Group();
  scene.add(rig);

  // core
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.7, 1),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.55 })
  );
  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 0),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.9 })
  );
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.35 })
  );
  rig.add(core, inner, glow);

  // rings
  const rings = [];
  [2.6, 3.2, 3.8].forEach((r, i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color: [0x22d3ee, 0x8b5cf6, 0xf472b6][i], transparent: true, opacity: 0.55 })
    );
    m.rotation.set(Math.PI / 2 + i * 0.5, i * 0.7, 0);
    rig.add(m);
    rings.push(m);
  });

  // floating cubes
  const cubes = [];
  const cubeGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
  const edgeGeo = new THREE.EdgesGeometry(cubeGeo);
  const cubeCount = isMobile ? 8 : 14;
  for (let i = 0; i < cubeCount; i++) {
    const m = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: i % 2 ? 0x22d3ee : 0xf472b6, transparent: true, opacity: 0.8 }));
    const a = (i / cubeCount) * Math.PI * 2, rad = 3 + Math.random() * 1.6;
    m.userData = { a, rad, y: (Math.random() - 0.5) * 3, s: 0.15 + Math.random() * 0.3, p: Math.random() * 6 };
    m.scale.setScalar(0.6 + Math.random() * 1.2);
    rig.add(m);
    cubes.push(m);
  }

  // particles
  const N = isMobile ? 450 : 1100;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 2;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xaab4ff, size: isMobile ? 0.045 : 0.035, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(points);

  // state
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0, targetScroll = 0, vw = 1, vh = 1, running = true, raf = 0;

  function resize() {
    vw = innerWidth; vh = innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize, { passive: true });
  addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / vw - 0.5) * 2;
    mouse.ty = (e.clientY / vh - 0.5) * 2;
  }, { passive: true });
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - vh;
    targetScroll = max > 0 ? scrollY / max : 0;
  }, { passive: true });

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    scroll += (targetScroll - scroll) * 0.06;

    // desktop: core sits right of the hero text, drifts left/back as the page scrolls. mobile: centred behind text.
    const wide = vw / vh > 1.1 && vw > 860;
    const baseX = wide ? 4.3 : 0;
    const heroFade = Math.max(0, 1 - scroll * 8);
    rig.position.x += ((baseX - scroll * (wide ? 9 : 0) * 1) - rig.position.x) * 0.05;
    rig.position.y = (wide ? 0 : 1.6) + Math.sin(t * 0.8) * 0.15 - scroll * 6;
    rig.position.z = -scroll * 4;
    rig.scale.setScalar((wide ? 0.72 : 0.5) * (0.7 + 0.3 * heroFade));
    rig.rotation.y = t * 0.15 + mouse.x * 0.6 + scroll * 8;
    rig.rotation.x = mouse.y * 0.35 + scroll * 3;

    core.rotation.x = t * 0.2; core.rotation.y = t * 0.12;
    inner.rotation.x = -t * 0.35; inner.rotation.y = -t * 0.25;
    glow.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
    rings.forEach((r, i) => { r.rotation.z = t * (0.18 + i * 0.07) * (i % 2 ? -1 : 1); });
    cubes.forEach((c) => {
      const u = c.userData, a = u.a + t * u.s * 0.4;
      c.position.set(Math.cos(a) * u.rad, u.y + Math.sin(t + u.p) * 0.3, Math.sin(a) * u.rad);
      c.rotation.x = t * u.s; c.rotation.y = t * u.s * 1.3;
    });
    points.rotation.y = t * 0.012 + mouse.x * 0.04;
    points.position.y = scroll * 12;
    camera.position.x = mouse.x * 0.5;
    camera.position.y = -mouse.y * 0.3;
    camera.lookAt(0, 0, 0);
    canvas.style.opacity = (0.22 + 0.78 * heroFade).toFixed(2);

    renderer.render(scene, camera);
    if (running && !reducedMotion) raf = requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; clock.getDelta(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  if (reducedMotion) { running = false; frame(); addEventListener('resize', frame, { passive: true }); }
  else raf = requestAnimationFrame(frame);

  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); canvas.style.display = 'none'; });
  return { stop, start };
};
