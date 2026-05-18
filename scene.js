// scene.js — Three.js floating physics hero scene.
// Vanilla JS. Reads palette from CSS custom properties on :root.

(function () {
  const canvas = document.getElementById('webgl');
  if (!canvas || typeof THREE === 'undefined') return;

  // ── Theme ────────────────────────────────────────────────────────────────
  const cssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const theme = {
    bg: '#0a0a0a',
    fg: '#e8e6dd',
    accent: '#ff5b2e',
    dim: '#2a2622',
    intensity: 1.0, // motion multiplier (0..2)
  };

  function readTheme() {
    theme.bg = cssVar('--bg') || theme.bg;
    theme.fg = cssVar('--fg') || theme.fg;
    theme.accent = cssVar('--accent') || theme.accent;
    theme.dim = cssVar('--dim') || theme.dim;
  }
  readTheme();

  // ── Renderer ─────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 22);
  camera.lookAt(0, 0, 0);

  // ── Lights ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const key = new THREE.DirectionalLight(0xfff1de, 2.2);
  key.position.set(8, 10, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x6c88ff, 0.55);
  fill.position.set(-8, -2, 5);
  scene.add(fill);

  const rim = new THREE.PointLight(0xff5b2e, 6.0, 30, 1.6);
  rim.position.set(-4, -6, 4);
  scene.add(rim);

  // Refresh accent point light when accent changes
  function updateAccentLight() {
    rim.color.set(theme.accent);
  }

  // ── Shapes ───────────────────────────────────────────────────────────────
  // Each shape: { mesh, home, vel, angVel, phase, role, baseScale }
  // role ∈ { fg, accent, dim }
  const shapes = [];

  function makeMat(role) {
    const color = theme[role === 'accent' ? 'accent' : role === 'dim' ? 'dim' : 'fg'];
    return new THREE.MeshStandardMaterial({
      color,
      metalness: role === 'dim' ? 0.55 : 0.18,
      roughness: role === 'accent' ? 0.32 : 0.4,
    });
  }

  function addShape(geom, role, home, scale, opts = {}) {
    const mesh = new THREE.Mesh(geom, makeMat(role));
    mesh.position.copy(home);
    mesh.scale.setScalar(scale);
    mesh.rotation.set(Math.random() * 6.283, Math.random() * 6.283, Math.random() * 6.283);
    scene.add(mesh);
    shapes.push({
      mesh,
      role,
      home: home.clone(),
      vel: new THREE.Vector3(),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3,
      ),
      phase: Math.random() * 6.283,
      wobbleAmp: 0.25 + Math.random() * 0.5,
      baseScale: scale,
      mass: 1 / Math.max(scale, 0.4),
      ...opts,
    });
  }

  // Geometry library (shared across many shapes)
  const G = {
    sphere: new THREE.SphereGeometry(1, 48, 32),
    torus: new THREE.TorusGeometry(1, 0.32, 24, 96),
    ico: new THREE.IcosahedronGeometry(1, 0),
    octa: new THREE.OctahedronGeometry(1, 0),
    box: new THREE.BoxGeometry(1.4, 1.4, 1.4),
    pill: new THREE.CapsuleGeometry(0.55, 1.6, 12, 24),
    disc: new THREE.CylinderGeometry(1, 1, 0.28, 64),
    ring: new THREE.TorusGeometry(1.2, 0.08, 16, 96),
  };
  // Round the box edges via segments — three.js doesn't ship a bevel, but a
  // slightly subdivided box + smooth shading reads as a soft block at this
  // distance. (Sphere/torus do the heavy lifting; box is just rhythm.)

  // Centerpiece: big featured ring + glowing core sphere
  addShape(G.torus, 'accent', new THREE.Vector3(0, 0.6, -1.5), 2.4, {
    angVel: new THREE.Vector3(0.06, 0.18, 0.03),
    wobbleAmp: 0.15,
  });
  addShape(G.sphere, 'fg', new THREE.Vector3(0, 0.6, -1), 1.05, {
    angVel: new THREE.Vector3(0.05, 0.08, 0),
    wobbleAmp: 0.1,
  });

  // Mid-layer orbiters — varied geometry, varied roles
  const orbiters = [
    { g: G.sphere, role: 'fg',     home: [-5.2, 2.4, 1.5],   s: 0.8 },
    { g: G.ico,    role: 'accent', home: [4.6, -2.8, 2.0],   s: 0.7 },
    { g: G.disc,   role: 'fg',     home: [-4.4, -2.6, 1.2],  s: 0.85, av: [1.0, 0.05, 0.05] },
    { g: G.octa,   role: 'fg',     home: [4.2, 3.0, 0.5],    s: 0.9 },
    { g: G.box,    role: 'dim',    home: [-2.4, -3.6, 2.5],  s: 0.55 },
    { g: G.pill,   role: 'accent', home: [3.0, 1.6, 3.0],    s: 0.6 },
    { g: G.sphere, role: 'dim',    home: [-3.0, 3.6, 2.2],   s: 0.5 },
    { g: G.ring,   role: 'fg',     home: [2.0, -3.4, 1.8],   s: 0.9 },
    { g: G.sphere, role: 'accent', home: [-6.4, 0.4, 2.2],   s: 0.4 },
    { g: G.ico,    role: 'fg',     home: [6.4, 0.8, 1.2],    s: 0.5 },
  ];
  for (const o of orbiters) {
    addShape(o.g, o.role, new THREE.Vector3(...o.home), o.s,
      o.av ? { angVel: new THREE.Vector3(...o.av) } : {});
  }

  // Far backdrop — small specks of scale to suggest depth
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 8.5 + Math.random() * 2.5;
    const home = new THREE.Vector3(
      Math.cos(a) * r,
      Math.sin(a) * r * 0.7,
      -4 - Math.random() * 3,
    );
    const g = Math.random() < 0.5 ? G.sphere : (Math.random() < 0.5 ? G.octa : G.ico);
    const role = Math.random() < 0.18 ? 'accent' : (Math.random() < 0.4 ? 'fg' : 'dim');
    addShape(g, role, home, 0.18 + Math.random() * 0.22);
  }

  // ── Mouse / interaction ──────────────────────────────────────────────────
  const mouseWorld = new THREE.Vector3();
  let mouseActive = false;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z = 0

  function projectMouse(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    raycaster.ray.intersectPlane(plane, mouseWorld);
    mouseActive = true;
  }

  window.addEventListener('pointermove', (e) => projectMouse(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerleave', () => { mouseActive = false; });
  window.addEventListener('blur', () => { mouseActive = false; });

  // Click ripple — push all shapes radially outward from the click point
  window.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest && e.target.closest('a,button,input,select,textarea,[data-no-ripple]')) return;
    projectMouse(e.clientX, e.clientY);
    for (const s of shapes) {
      const v = new THREE.Vector3().subVectors(s.mesh.position, mouseWorld);
      const d = Math.max(v.length(), 0.6);
      if (d < 9) {
        v.normalize().multiplyScalar((9 - d) * 1.6 * theme.intensity * s.mass);
        s.vel.add(v);
      }
    }
  });

  // ── Animation loop ───────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let visible = true; // gated by IntersectionObserver on hero

  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    for (const s of shapes) {
      // Idle wobble — small drift around home so the scene breathes
      const wob = new THREE.Vector3(
        Math.sin(t * 0.42 + s.phase) * s.wobbleAmp,
        Math.sin(t * 0.55 + s.phase * 1.73) * s.wobbleAmp,
        Math.sin(t * 0.31 + s.phase * 2.11) * s.wobbleAmp * 0.5,
      ).multiplyScalar(theme.intensity);

      const target = new THREE.Vector3().addVectors(s.home, wob);
      const force = target.sub(s.mesh.position).multiplyScalar(4.5);

      // Mouse repulsion (1/r falloff capped near the cursor)
      if (mouseActive) {
        const toMouse = new THREE.Vector3().subVectors(s.mesh.position, mouseWorld);
        const d = Math.max(toMouse.length(), 0.6);
        if (d < 4.5) {
          const strength = (4.5 - d) * 3.0 * theme.intensity * s.mass;
          force.add(toMouse.normalize().multiplyScalar(strength));
        }
      }

      // Damping
      force.add(s.vel.clone().multiplyScalar(-2.6));
      // Integrate
      s.vel.add(force.multiplyScalar(dt));
      s.mesh.position.add(s.vel.clone().multiplyScalar(dt));

      // Rotation drift (slows with motion intensity)
      s.mesh.rotation.x += s.angVel.x * dt * theme.intensity;
      s.mesh.rotation.y += s.angVel.y * dt * theme.intensity;
      s.mesh.rotation.z += s.angVel.z * dt * theme.intensity;
    }

    // Subtle parallax tilt on the camera based on mouse
    if (mouseActive) {
      camera.position.x += (mouseWorld.x * 0.18 - camera.position.x) * 0.04;
      camera.position.y += (mouseWorld.y * 0.18 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }
  tick();

  // ── Resize ───────────────────────────────────────────────────────────────
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Pause rendering when hero is off-screen
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => { visible = entries[0].isIntersecting; },
      { threshold: 0 },
    );
    io.observe(hero);
  }

  // ── React to tweak changes ───────────────────────────────────────────────
  function refreshMaterials() {
    readTheme();
    updateAccentLight();
    for (const s of shapes) {
      const c = theme[s.role === 'accent' ? 'accent' : s.role === 'dim' ? 'dim' : 'fg'];
      s.mesh.material.color.set(c);
    }
  }
  // Expose hooks so the tweaks panel (which lives in React land) can poke us
  window.__scene = {
    refreshMaterials,
    setIntensity: (v) => { theme.intensity = v; },
  };
})();
