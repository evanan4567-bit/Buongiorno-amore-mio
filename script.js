/* script.js (DEMO inmediata - sin bloqueo 03:50) */
/* global THREE, gsap */

(() => {
  // ---------------------------
  // Helpers
  // ---------------------------
  function formatHMS(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  // ---------------------------
  // DOM
  // ---------------------------
  const canvas = document.getElementById("c");
  const overlay = document.getElementById("overlay");
  const countdownEl = document.getElementById("countdown");
  const hintEl = document.getElementById("hint");
  const startBtn = document.getElementById("startBtn");

  // ---------------------------
  // DEMO: target inmediato (no espera 03:50)
  // ---------------------------
  const target = new Date(Date.now() + 800); // 0.8s para que se vea el contador moverse

  function tickCountdown() {
    const ms = target - new Date();
    countdownEl.textContent = formatHMS(ms);

    if (ms <= 0) {
      hintEl.textContent = "Demo lista. Toca “Iniciar” 💛";
    } else {
      hintEl.textContent = "Cargando demo… en breve puedes iniciar 💛";
    }

    requestAnimationFrame(tickCountdown);
  }
  tickCountdown();

  // ---------------------------
  // Three.js base
  // ---------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.FogExp2(0x05050a, 0.06);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 120);
  camera.position.set(0, 1.15, 6.2);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.2);
  key.position.set(4, 5, 2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xbfe8ff, 0.7);
  rim.position.set(-5, 2, -3);
  scene.add(rim);

  // Stars
  (function addStars() {
    const n = 900;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = -Math.random() * 28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, opacity: 0.8, transparent: true });
    scene.add(new THREE.Points(geo, mat));
  })();

  // ---------------------------
  // Postprocesado (requiere CDN de examples/* en index.html)
  // ---------------------------
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  // FilmPass (nostalgia)
  const film = new THREE.FilmPass(0.35, false);
  composer.addPass(film);

  // Vignette
  const vignette = new THREE.ShaderPass(THREE.VignetteShader);
  vignette.uniforms.offset.value = 1.2;
  vignette.uniforms.darkness.value = 1.15;
  composer.addPass(vignette);

  // Bloom
  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.65, // strength
    0.45, // radius
    0.85  // threshold
  );
  composer.addPass(bloom);

  // ---------------------------
  // Objetos: anillo + gema
  // ---------------------------
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.16, 48, 160),
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      metalness: 1.0,
      roughness: 0.22,
      envMapIntensity: 1.0
    })
  );
  ring.rotation.x = Math.PI * 0.5;
  ringGroup.add(ring);

  const gem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.19, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0xbfe8ff,
      roughness: 0.05,
      metalness: 0,
      transmission: 0.85,
      thickness: 0.9,
      ior: 1.45
    })
  );
  gem.position.set(0, 0.22, 0);
  ringGroup.add(gem);

  // ---------------------------
  // “Pancho” 3D procedural (hotdog) - sin loaders
  // ---------------------------
  const hotdog = new THREE.Group();
  scene.add(hotdog);

  const bunMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.65, metalness: 0.0 });
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0xb8452a, roughness: 0.55, metalness: 0.0 });

  const bunGeo = new THREE.CapsuleGeometry(0.55, 1.7, 8, 16);
  const bunTop = new THREE.Mesh(bunGeo, bunMat);
  bunTop.scale.set(1.05, 0.65, 0.65);
  bunTop.position.y = 0.05;

  const sausageGeo = new THREE.CapsuleGeometry(0.35, 1.9, 8, 16);
  const sausage = new THREE.Mesh(sausageGeo, sausageMat);
  sausage.scale.set(1.0, 0.7, 0.7);

  hotdog.add(bunTop, sausage);
  hotdog.position.set(-3.2, -0.55, -2.2);
  hotdog.rotation.z = 0.15;

  // ---------------------------
  // GSAP Timeline
  // ---------------------------
  const tl = gsap.timeline({ paused: true });

  tl.set(ringGroup.position, { x: 0, y: 0.2, z: -2.8 });
  tl.set(ringGroup.rotation, { y: 0 });
  tl.to(ringGroup.position, { z: 0.0, duration: 6, ease: "power2.out" }, 0);
  tl.to(ringGroup.rotation, { y: Math.PI * 2, duration: 14, ease: "none" }, 0);

  tl.to(hotdog.position, { x: 2.8, z: 0.2, duration: 8, ease: "sine.inOut" }, 10);
  tl.to(hotdog.rotation, { y: Math.PI * 2, duration: 8, ease: "none" }, 10);

  tl.to(
    {},
    {
      duration: 18,
      onUpdate: function () {
        const ratio = this.progress();
        const a = 10 + ratio * Math.PI * 2;
        hotdog.position.x = Math.cos(a) * 1.9;
        hotdog.position.z = Math.sin(a) * 1.5;
        hotdog.position.y = -0.35 + Math.sin(a * 2) * 0.08;
      }
    },
    22
  );

  tl.to(camera.position, { z: 4.3, y: 1.05, duration: 8, ease: "power2.inOut" }, 24);
  tl.to(gem.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 1.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, 30);

  const DURATION = 42;

  // ---------------------------
  // Audio (GitHub Pages)
  // ---------------------------
  let audioEl = null;
  let audioStartPerf = 0;
  let started = false;

  function ensureAudio() {
    if (audioEl) return audioEl;
    audioEl = new Audio("./assets/audio/musica_intro.mp3");
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.volume = 0.55;
    return audioEl;
  }

  // Wake lock best-effort
  let wakeLock = null;
  async function requestWakeLock() {
    try { wakeLock = await navigator.wakeLock?.request?.("screen"); } catch { /* ignore */ }
  }

  async function requestFullscreen() {
    try { await document.documentElement.requestFullscreen?.(); } catch { /* ignore */ }
  }

  // ---------------------------
  // Render loop
  // ---------------------------
  function loop() {
    if (started) {
      const t = Math.max(0, (performance.now() - audioStartPerf) / 1000);
      tl.time(Math.min(t, DURATION), false);

      // micro brillo “heartbeat”
      const pulse = 1.0 + Math.sin(t * 3.2) * 0.015;
      ring.material.roughness = 0.22 - (pulse - 1.0) * 2.5;
    }

    composer.render();
    requestAnimationFrame(loop);
  }
  loop();

  // ---------------------------
  // Click: iniciar demo YA
  // ---------------------------
  startBtn.addEventListener("click", async () => {
    overlay.style.display = "none";
    await requestFullscreen();
    await requestWakeLock();

    const a = ensureAudio();
    try { await a.play(); } catch (e) { console.warn("Autoplay bloqueado, toca de nuevo.", e); }

    audioStartPerf = performance.now();
    started = true;
  });

  // Resize
  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    composer.setSize(window.innerWidth, window.innerHeight);
  });
})();
