/* Hero: liquid-chrome object rendered with Three.js (global THREE, classic script — works from file:// too).
   - Noise-displaced icosphere, normals rebuilt in the vertex shader so reflections follow the deformation.
   - Reflections come from a procedurally built "studio" environment (no texture downloads).
   - Reacts to pointer, pauses when off-screen or tab hidden, renders a single frame for reduced motion. */
(function () {
  'use strict';

  window.initHero3D = function (canvas, opts) {
    opts = opts || {};
    var THREE = window.THREE;
    if (!THREE || !canvas) return null;
    if ((navigator.hardwareConcurrency || 4) <= 2) return null; // very low-end: keep CSS fallback

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }

    var small = matchMedia('(max-width: 900px)').matches;
    var coarse = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputEncoding = THREE.sRGBEncoding;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    /* ---------- studio environment for reflections ---------- */
    var env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x07070a, side: THREE.BackSide })));
    function panel(w, h, color, x, y, z, ry, rx) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.rotation.y = ry || 0; m.rotation.x = rx || 0; env.add(m); m.lookAt(0, 0, 0);
    }
    panel(14, 5, 0xffffff, 0, 9, 3);            // big top softbox
    panel(2, 16, 0x3d7bff, -9, 0, 2);           // electric blue strip
    panel(2, 14, 0x8b6cff, 9, -1, -3);          // violet strip
    panel(10, 0.6, 0xffffff, 0, -2, 10);        // thin front rim light
    panel(0.5, 10, 0xdfe6ff, 5, 2, 8);          // vertical highlight
    panel(8, 3, 0x1a1d2b, 0, -9, 0);            // floor bounce
    panel(4, 7, 0xffffff, -6, 3, 7);            // key light, front-left
    panel(3, 3, 0xcfd8ff, 7, 5, 4);             // cool fill, top-right
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envMap = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();

    /* ---------- liquid chrome core ---------- */
    var uniforms = { uTime: { value: 0 }, uAmp: { value: 0.16 }, uFreq: { value: 0.62 } };
    var chrome = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 1, roughness: 0.05, envMap: envMap, envMapIntensity: 1.45,
      clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.35, iridescenceIOR: 1.35
    });
    chrome.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uAmp = uniforms.uAmp;
      shader.uniforms.uFreq = uniforms.uFreq;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;\nuniform float uFreq;\n' + NOISE +
          '\nfloat disp(vec3 p){ return uAmp * (snoise(p*uFreq + vec3(uTime*.16, uTime*.11, -uTime*.09)) + .18*snoise(p*uFreq*1.9 - uTime*.14)); }\n')
        .replace('#include <beginnormal_vertex>',
          'vec3 n0 = normalize(normal);\n' +
          'vec3 tg = normalize(cross(n0, abs(n0.y) < .99 ? vec3(0.,1.,0.) : vec3(1.,0.,0.)));\n' +
          'vec3 bt = normalize(cross(n0, tg));\n' +
          'vec3 pd = position + n0 * disp(position);\n' +
          'vec3 pa = position + tg*.012; pa += n0 * disp(pa);\n' +
          'vec3 pb = position + bt*.012; pb += n0 * disp(pb);\n' +
          'vec3 objectNormal = normalize(cross(pa - pd, pb - pd));\n' +
          '#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif\n')
        .replace('#include <begin_vertex>', 'vec3 transformed = pd;');
    };

    var group = new THREE.Group();
    scene.add(group);
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, small ? 28 : 52), chrome);
    group.add(core);

    // thin chrome orbit ring + satellites
    var flatChrome = new THREE.MeshPhysicalMaterial({ color: 0xe8e8ea, metalness: 1, roughness: 0.12, envMap: envMap, envMapIntensity: 1.1, clearcoat: 1 });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.022, 16, 220), flatChrome);
    ring.rotation.set(1.2, 0.3, 0);
    group.add(ring);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.008, 8, 220),
      new THREE.MeshBasicMaterial({ color: 0x7aa5ff, transparent: true, opacity: 0.35 }));
    ring2.rotation.set(1.45, -0.5, 0.2);
    group.add(ring2);

    var sats = [];
    var satGeo = new THREE.SphereGeometry(1, 32, 16);
    [[0.16, 0], [0.1, 2.1], [0.07, 4.2]].forEach(function (s) {
      var m = new THREE.Mesh(satGeo, flatChrome);
      m.scale.setScalar(s[0]); m.userData.phase = s[1]; group.add(m); sats.push(m);
    });

    // glass shard (holographic accent)
    var shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshPhysicalMaterial({
      color: 0xbfd3ff, metalness: 0.2, roughness: 0.05, envMap: envMap, envMapIntensity: 1.6,
      transparent: true, opacity: 0.55, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1
    }));
    group.add(shard);

    /* ---------- ambient particles ---------- */
    var N = small ? 260 : 700;
    var pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 3;
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xc9d6ff, size: 0.022, transparent: true, opacity: 0.55, depthWrite: false }));
    scene.add(dots);

    /* ---------- layout ---------- */
    var W = 1, H = 1, wide = true;
    function layout() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      var vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      var vw = vh * camera.aspect;
      wide = W > 900 && camera.aspect > 1.05;
      if (wide) { group.position.set(vw * 0.23, 0.05, 0); group.scale.setScalar(Math.min(1.15, vw / 13)); }
      else { group.position.set(0, vh * 0.27, 0); group.scale.setScalar(Math.min(0.7, vw / 7.4)); }
    }
    layout();
    window.addEventListener('resize', layout, { passive: true });

    /* ---------- interaction ---------- */
    var m = { x: 0, y: 0, tx: 0, ty: 0, energy: 0 };
    var lastX = 0, lastY = 0;
    window.addEventListener('pointermove', function (e) {
      m.tx = e.clientX / window.innerWidth * 2 - 1;
      m.ty = e.clientY / window.innerHeight * 2 - 1;
      var d = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX; lastY = e.clientY;
      m.energy = Math.min(1, m.energy + d * 0.0025);
    }, { passive: true });
    if (coarse && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null) return;
        m.tx = Math.max(-1, Math.min(1, e.gamma / 30));
        m.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      }, { passive: true });
    }

    var clock = new THREE.Clock();
    var visible = true, running = false, raf = 0, entryT = 0;
    function frame() {
      var t = clock.getElapsedTime();
      entryT = Math.min(1, entryT + 0.012);
      var ease = 1 - Math.pow(1 - entryT, 3);
      m.x += (m.tx - m.x) * 0.045;
      m.y += (m.ty - m.y) * 0.045;
      m.energy *= 0.96;

      uniforms.uTime.value = t;
      uniforms.uAmp.value = 0.15 + Math.sin(t * 0.6) * 0.035 + m.energy * 0.16;

      core.rotation.y = t * 0.12 + m.x * 0.7;
      core.rotation.x = m.y * 0.45;
      core.scale.setScalar(0.6 + 0.4 * ease);
      ring.rotation.z = t * 0.22;
      ring.rotation.x = 1.2 + m.y * 0.25;
      ring2.rotation.z = -t * 0.12;
      sats.forEach(function (s, i) {
        var a = t * (0.35 + i * 0.12) + s.userData.phase;
        s.position.set(Math.cos(a) * (2.35 + i * 0.25), Math.sin(a * 1.3) * 0.6, Math.sin(a) * (2.35 + i * 0.25) * 0.5);
      });
      shard.position.set(-1.9 + Math.sin(t * 0.5) * 0.12, 1.25 + Math.sin(t * 0.8) * 0.15, 0.6);
      shard.rotation.set(t * 0.4, t * 0.6, 0);
      group.rotation.y = m.x * 0.18;
      group.rotation.x = m.y * 0.12;
      dots.rotation.y = t * 0.01 + m.x * 0.05;
      dots.rotation.x = m.y * 0.03;
      camera.position.x = m.x * 0.35;
      camera.position.y = -m.y * 0.2;
      camera.lookAt(group.position.x * 0.15, 0, 0);

      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (running || opts.reducedMotion) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    if (opts.reducedMotion) {
      entryT = 1; uniforms.uTime.value = 2; frame();
      window.addEventListener('resize', function () { layout(); frame(); }, { passive: true });
    } else {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(canvas);
      document.addEventListener('visibilitychange', function () { document.hidden || !visible ? stop() : start(); });
      start();
    }
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); document.documentElement.classList.remove('has-webgl'); });
    return { start: start, stop: stop };
  };

  /* Ashima 3D simplex noise (MIT) */
  var NOISE = [
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
    'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}',
    'float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);',
    'vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;',
    'vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
    'i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    'float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);',
    'vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    'vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));',
    'vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    'vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    'vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    'vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;',
    'return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}'
  ].join('\n');
})();
