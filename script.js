// src/main.js
import * as THREE from "three";
import gsap from "gsap";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { VignetteShader } from "three/addons/shaders/VignetteShader.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// ---------------------------
// Util tiempo 03:50
// ---------------------------
function getTargetTime({ hour = 3, minute = 50 } = {}) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}
function formatHMS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
function readOverride() {
  const url = new URL(location.href);
  const hh = url.searchParams.get("hh");
  const mm = url.searchParams.get("mm");
  if (hh && mm) return { hour: Number(hh), minute: Number(mm) };
  return null;
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
// Three.js base
// ---------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Bloom advice: tone mapping enabled

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050a);
scene.fog = new THREE.FogExp2(0x05050a, 0.06);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 120);
camera.position.set(0, 1.15, 6.2);

// Lights simple, “cine rápido”
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
// Postprocesado (nostalgia)
// ---------------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const film = new FilmPass(0.35, false);
composer.addPass(film);

const vignette = new ShaderPass(VignetteShader);
vignette.uniforms.offset.value = 1.2;
vignette.uniforms.darkness.value = 1.15;
composer.addPass(vignette);

const bloom = new UnrealBloomPass(
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
// Hotdog GLB (si existe)
// ---------------------------
const loader = new GLTFLoader();
let hotdog = null;
await new Promise((resolve) => {
  loader.load(
    "/models/hotdog.glb",
    (gltf) => {
      hotdog = gltf.scene;
      hotdog.scale.setScalar(1.2);
      hotdog.position.set(-3.2, -0.55, -2.2);
      scene.add(hotdog);
      resolve();
    },
    undefined,
    () => resolve() // si falla, seguimos igual
  );
});

// ---------------------------
// GSAP Timeline (en segundos)
// ---------------------------
const tl = gsap.timeline({ paused: true });

tl.set(ringGroup.position, { x: 0, y: 0.2, z: -2.8 });
tl.set(ringGroup.rotation, { y: 0 });
tl.to(ringGroup.position, { z: 0.0, duration: 6, ease: "power2.out" }, 0);
tl.to(ringGroup.rotation, { y: Math.PI * 2, duration: 14, ease: "none" }, 0);

// Pancho: una órbita elegante, no “meme”
if (hotdog) {
  tl.to(hotdog.position, { x: 2.8, z: 0.2, duration: 8, ease: "sine.inOut" }, 10);
  tl.to(hotdog.rotation, { y: Math.PI * 2, duration: 8, ease: "none" }, 10);
  // “satélite” alrededor del anillo
  tl.to({}, {
    duration: 18,
    onUpdate: function() {
      const t = this.targets()[0]._gsap?.ratio ?? 0;
      const a = 10 + t * Math.PI * 2;
      hotdog.position.x = Math.cos(a) * 1.9;
      hotdog.position.z = Math.sin(a) * 1.5;
      hotdog.position.y = -0.35 + Math.sin(a * 2) * 0.08;
    }
  }, 22);
}

// Reveal final
tl.to(camera.position, { z: 4.3, y: 1.05, duration: 8, ease: "power2.inOut" }, 24);
tl.to(gem.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 1.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, 30);

// Duración escena (ajústala al track)
const DURATION = 42;

// ---------------------------
// Audio: unlock + sync con reloj estable
// ---------------------------
let audioCtx = null;
let audioBuffer = null;
let audioStartAt = 0;
let started = false;

async function loadAudioBuffer(url) {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  return await audioCtx.decodeAudioData(arr);
}

function startBuffer(buffer) {
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime; // reloj estable en segundos
  src.start(t0); // start(when) (si quisieras, puedes programar en el futuro)
  return { src, startAt: t0 };
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
// Gate 03:50 + countdown
// ---------------------------
const override = readOverride();
const target = getTargetTime(override ?? { hour: 3, minute: 50 });

function tickCountdown() {
  const ms = target - new Date();
  countdownEl.textContent = formatHMS(ms);

  if (ms <= 0) {
    hintEl.textContent = "Es la hora. Toca “Iniciar” 💛";
  }
  requestAnimationFrame(tickCountdown);
}
tickCountdown();

// ---------------------------
// Render loop (sincroniza timeline a audio time)
// ---------------------------
function loop() {
  if (started && audioCtx) {
    const t = Math.max(0, audioCtx.currentTime - audioStartAt);
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
// Click: desbloquea audio (necesario por políticas autoplay)
// ---------------------------
startBtn.addEventListener("click", async () => {
  // Ocultar overlay
  overlay.style.display = "none";

  // fullscreen y wake lock (best-effort)
  await requestFullscreen();
  await requestWakeLock();

  // AudioContext requiere gesto en muchos casos
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.resume();

  // carga y arranque
  audioBuffer = await loadAudioBuffer("/audio/track.mp3");
  const startedAudio = startBuffer(audioBuffer);
  audioStartAt = startedAudio.startAt;

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
