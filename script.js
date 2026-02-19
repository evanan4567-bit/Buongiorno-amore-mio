/* script.js FINAL (sin bloqueo + PNGs 3D + texto tostado en pan) */
/* global THREE, gsap, EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, FilmPass, VignetteShader */

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

  // Ruido simple para borde “tostado” irregular
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Texto tostado (canvas -> textura)
  function makeToastedTextPlane(paragraph, renderer, opts = {}) {
    const {
      w = 1024,
      h = 512,
      padding = 72,
      lineHeight = 46,
      font = "600 36px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      // “tostado”
      ink = "rgba(35,18,10,0.96)",
      edge = "rgba(20,10,5,0.55)",   // borde/quemado
      soft = "rgba(0,0,0,0.25)"      // sombra suave
    } = opts;

    const cnv = document.createElement("canvas");
    cnv.width = w;
    cnv.height = h;
    const ctx = cnv.getContext("2d");

    ctx.clearRect(0, 0, w, h);

    // Wrap texto
    function wrapText(text, maxWidth) {
      const words = text.split(/\s+/);
      const lines = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth) {
          if (line) lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    ctx.font = font;
    const maxWidth = w - padding * 2;
    const lines = wrapText(paragraph, maxWidth).slice(0, 8);

    const blockH = lines.length * lineHeight;
    let y = Math.max(padding, (h - blockH) / 2);

    // 1) Primero: “quemadito” (stroke irregular)
    // Truco: dibujamos el texto varias veces con pequeños offsets aleatorios
    const rand = mulberry32(1337);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    for (const ln of lines) {
      // “halo tostado” alrededor
      ctx.fillStyle = edge;
      ctx.shadowColor = soft;
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      // offsets para borde irregular (como tostado real)
      for (let i = 0; i < 8; i++) {
        const ox = (rand() - 0.5) * 2.2;
        const oy = (rand() - 0.5) * 2.2;
        ctx.fillText(ln, padding + ox, y + oy);
      }

      // 2) Luego: tinta principal tostada
      ctx.shadowBlur = 0;
      ctx.fillStyle = ink;
      ctx.fillText(ln, padding, y);

      y += lineHeight;
    }

    // Corazón “grabado”
    ctx.font = "600 54px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(35,18,10,0.35)";
    ctx.fillText("💛", w - padding - 70, h - padding - 70);

    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 8);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      opacity: 0.98,
      roughness: 0.98,
      metalness: 0.0,
      depthWrite: false,
      depthTest: true
    });

    const geo = new THREE.PlaneGeometry(2.25, 1.25);
    return new THREE.Mesh(geo, mat);
  }

  // Sticker PNG en 3D
  function makeSticker(url, renderer, baseSize = 1.2) {
    const texLoader = new THREE.TextureLoader();
    return new Promise((resolve) => {
      texLoader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 8);

          const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            opacity: 0.98
          });

          const img = tex.image;
          const aspect = img && img.width ? (img.width / img.height) : 1.0;
          const w = baseSize * aspect;
          const h = baseSize;

          const geo = new THREE.PlaneGeometry(w, h);
          const mesh = new THREE.Mesh(geo, mat);

          // Glow suave
          const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.10,
            depthWrite: false
          });
          const glow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.06, h * 1.06), glowMat);
          glow.position.z = -0.01;
          mesh.add(glow);

          resolve(mesh);
        },
        undefined,
        () => {
          console.warn("No se pudo cargar:", url);
          resolve(null);
        }
      );
    });
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
  // SIN BLOQUEO
  // ---------------------------
  const target = new Date(Date.now() + 400);
  function tickCountdown() {
    const ms = target - new Date();
    countdownEl.textContent = ms <= 0 ? "💛" : formatHMS(ms);
    hintEl.textContent = ms <= 0 ? "Tocá “Iniciar” 💛" : "Preparando una sorpresa…";
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
  // Postprocesado (CDN examples => GLOBALS)
  // ---------------------------
  const hasPost =
    typeof EffectComposer !== "undefined" &&
    typeof RenderPass !== "undefined" &&
    typeof ShaderPass !== "undefined" &&
    typeof UnrealBloomPass !== "undefined" &&
    typeof FilmPass !== "undefined" &&
    typeof VignetteShader !== "undefined";

  const composer = hasPost ? new EffectComposer(renderer) : null;

  if (composer) {
    composer.addPass(new RenderPass(scene, camera));

    const film = new FilmPass(0.35, false);
    composer.addPass(film);

    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 1.2;
    vignette.uniforms.darkness.value = 1.15;
    composer.addPass(vignette);

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.65,
      0.45,
      0.85
    );
    composer.addPass(bloom);
  }

  // ---------------------------
  // Ring + gem
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
  // Hotdog 3D procedural
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
  // Texto TOSTADO en el pan (centrado, legible)
  // ---------------------------
  const mensaje =
    "Buenos días, amor mío. Gracias por existir y por elegirme. " +
    "Que hoy te abrace la vida y que recuerdes que te amo " +
    "más de lo que puedo decir. Siempre tuyo.";

  const stamped = makeToastedTextPlane(mensaje, renderer);
  stamped.position.set(0.0, 0.22, 0.28);
  stamped.rotation.set(-0.03, 0.0, 0.0);
  stamped.scale.set(0.72, 0.72, 0.72);
  hotdog.add(stamped);

  // ---------------------------
  // PNGs dentro del 3D (orbitando)
  // ---------------------------
  const stickers3D = new THREE.Group();
  scene.add(stickers3D);

  const stickerLight = new THREE.PointLight(0xffffff, 0.85, 12);
  stickerLight.position.set(0, 1.4, 3.5);
  scene.add(stickerLight);

  let panchoPlane = null;
  let anilloPlane = null;

  Promise.all([
    makeSticker("./assets/images/pancho.png", renderer, 1.35),
    makeSticker("./assets/images/anillo.png", renderer, 1.15)
  ]).then(([p, a]) => {
    if (p) {
      panchoPlane = p;
      panchoPlane.position.set(-1.9, -0.25, -0.4);
      stickers3D.add(panchoPlane);
    }
    if (a) {
      anilloPlane = a;
      anilloPlane.position.set(1.9, 0.05, -0.6);
      stickers3D.add(anilloPlane);
    }
  });

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
  // Audio
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
  function renderFrame() {
    if (started) {
      const t = Math.max(0, (performance.now() - audioStartPerf) / 1000);
      tl.time(Math.min(t, DURATION), false);

      const pulse = 1.0 + Math.sin(t * 3.2) * 0.015;
      ring.material.roughness = 0.22 - (pulse - 1.0) * 2.5;

      const orbitA = t * 0.55;
      const orbitB = t * 0.42;

      if (panchoPlane) {
        panchoPlane.position.x = Math.cos(orbitA) * 1.8;
        panchoPlane.position.z = Math.sin(orbitA) * 1.2;
        panchoPlane.position.y = -0.15 + Math.sin(t * 1.6) * 0.12;
        panchoPlane.lookAt(camera.position);
      }

      if (anilloPlane) {
        anilloPlane.position.x = Math.cos(orbitB + 2.0) * 1.6;
        anilloPlane.position.z = Math.sin(orbitB + 2.0) * 1.1;
        anilloPlane.position.y = 0.15 + Math.sin(t * 1.3 + 1.1) * 0.10;
        anilloPlane.lookAt(camera.position);
      }
    } else {
      if (panchoPlane) panchoPlane.lookAt(camera.position);
      if (anilloPlane) anilloPlane.lookAt(camera.position);
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);

    requestAnimationFrame(renderFrame);
  }
  renderFrame();

  // ---------------------------
  // Click: iniciar
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
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
})();
