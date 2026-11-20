import * as THREE from "three";

const PAGE_LOAD_START = performance.now();

// Standard Color Palette (Ticket-02 & Ticket-03 Colorblind Mode)
const COLORS = {
  sky: 0x0E1430,
  fog: 0x1B2350,
  grass: 0x2F5D50,
  sand: 0xC9B48A,
  wood: 0x6B4A2F,
  cloudSea: 0x12384A,
  lanternLit: 0xFFB347,
  lanternCore: 0xFFE9B0,
  lanternUnlit: 0x5B5F6E,
  moteCore: 0xFFF6C2,
  moteHalo: 0xFFE58A,
  shadeBody: 0x120A1A,
  shadeRim: 0x7A3CFF,
  shadeRimCB: 0x00B3FF,
  shadeStunned: 0x3A3450,
  mayCloak: 0xE8E2D0,
  mayScarf: 0xC8102E,
  gold: 0xF2C14E,
  drifter: 0x8FA3B8,
};

const DT = 1 / 60;
const GRAVITY = -20.0;
const JUMP_VEL = 7.0;
const FUEL_SCALE = 60;
const FUEL_MAX_60 = 6000;
const LOW_FUEL_60 = 1800;

const DEFAULT_KEYS = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  interact: "KeyE",
  pulse: "KeyF",
  pause: "KeyP",
};

const ACTION_LABELS = {
  up: "Tiến",
  down: "Lùi",
  left: "Trái",
  right: "Phải",
  jump: "Nhảy",
  dash: "Lướt",
  interact: "Nạp / Châm",
  pulse: "Tỏa Sáng",
  pause: "Tạm dừng",
};

const NIGHT_INTROS = {
  1: {
    name: "Đảo Bến",
    quote: "“Đèn thắp rồi vẫn cạn dầu từng giây, và Bóng Mực sẽ lao vào hút cạn đèn yếu! Hãy giữ ít nhất 3/5 Đèn Lồng sáng cho tới bình minh (4 phút).” — Ông Đăng",
  },
  2: {
    name: "Đảo Cau",
    quote: "“Thắp sáng mỗi ngọn đèn giúp Mây mang thêm +2 đom đóm (tối đa 20). Hãy châm dầu kịp lúc và giữ ít nhất 4/6 đèn sáng tới bình minh!” — Ông Đăng",
  },
  3: {
    name: "Đảo Chuông",
    quote: "“Đêm cuối cùng trên Đảo Chuông! Giữ ít nhất 5/7 Đèn Lồng cháy sáng qua gió lốc và Bóng Mực hút dầu để đón Bình Minh!” — Ông Đăng",
  },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function prettyKey(code) {
  if (!code) return "?";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "Space";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Escape") return "Esc";
  return code;
}

function ringPoints(cx, cz, r, angles, y = 0) {
  return angles.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + Math.cos(rad) * r, y, cz + Math.sin(rad) * r];
  });
}

function getNightDef(night) {
  if (night === 1) {
    return {
      night: 1,
      name: "Đảo Bến",
      duration: 240,
      spawn: [0, 0, 0],
      lanterns: [
        { id: "L1", pos: [0, 0, 25] },
        { id: "L2", pos: [23.8, 0, 7.7] },
        { id: "L3", pos: [14.7, 0, -20.2] },
        { id: "L4", pos: [-14.7, 0, -20.2] },
        { id: "L5", pos: [-23.8, 0, 7.7] },
      ],
      motePoints: [
        ...ringPoints(0, 0, 12, [0, 45, 90, 135, 180, 225, 270, 315], 0),
        ...ringPoints(0, 0, 33, Array.from({ length: 16 }, (_, i) => i * 22.5), 0),
      ],
      shadePoints: ringPoints(0, 0, 37, Array.from({ length: 12 }, (_, i) => 15 + i * 30), 0),
      shadeInterval: 480,
      maxShades: 6,
      shadeSpeed: 4.0,
      jumpPads: [],
      charms: [],
      hasDrifters: false,
      hasWind: false,
    };
  }
  if (night === 2) {
    const d1 = Math.hypot(50, -18);
    const d2 = Math.hypot(-50, 18);
    return {
      night: 2,
      name: "Đảo Cau",
      duration: 270,
      spawn: [0, 0, 0],
      lanterns: [
        { id: "L1", pos: [0, 0, 20] },
        { id: "L2", pos: [17, 0, -10] },
        { id: "L3", pos: [-17, 0, -10] },
        { id: "L4", pos: [70, 0, 20] },
        { id: "L5", pos: [87, 0, -10] },
        { id: "L6", pos: [53, 0, -10] },
      ],
      motePoints: [
        ...ringPoints(0, 0, 10, [0, 90, 180, 270], 0),
        ...ringPoints(0, 0, 22, [0, 45, 90, 135, 180, 225, 270, 315], 0),
        ...ringPoints(70, 0, 10, [0, 90, 180, 270], 0),
        ...ringPoints(70, 0, 22, [0, 45, 90, 135, 180, 225, 270, 315], 0),
      ],
      shadePoints: [
        ...ringPoints(0, 0, 26, Array.from({ length: 8 }, (_, i) => 22.5 + i * 45), 0),
        ...ringPoints(70, 0, 26, Array.from({ length: 8 }, (_, i) => 22.5 + i * 45), 0),
      ],
      shadeInterval: 420,
      maxShades: 8,
      shadeSpeed: 4.0,
      jumpPads: [
        { pos: [20, 0, 18], r: 1, vy: 14, hspeed: 24, dir: [50 / d1, -18 / d1] },
        { pos: [50, 0, -18], r: 1, vy: 14, hspeed: 24, dir: [-50 / d2, 18 / d2] },
      ],
      charms: [{ id: "C1", pos: [35, 0, 0] }],
      hasDrifters: true,
      hasWind: false,
    };
  }
  return {
    night: 3,
    name: "Đảo Chuông",
    duration: 300,
    spawn: [0, 0, 32],
    lanterns: [
      { id: "L1", pos: [0, 6, 6] },
      { id: "L2", pos: [18, 3, 10] },
      { id: "L3", pos: [-18, 3, 10] },
      { id: "L4", pos: [35, 0, -10] },
      { id: "L5", pos: [-35, 0, -10] },
      { id: "L6", pos: [20, 0, -35] },
      { id: "L7", pos: [-20, 0, -35] },
    ],
    motePoints: [
      ...ringPoints(0, 0, 34, Array.from({ length: 18 }, (_, i) => i * 20), 0),
      ...ringPoints(0, 0, 18, Array.from({ length: 8 }, (_, i) => (i + 1) * 20), 3),
      ...ringPoints(0, 0, 5, [45, 135, 225, 315], 6),
    ],
    shadePoints: ringPoints(0, 0, 43, Array.from({ length: 16 }, (_, i) => i * 22.5), 0),
    shadeInterval: 360,
    maxShades: 10,
    shadeSpeed: 4.5,
    jumpPads: [{ pos: [0, 3, 13], r: 1, vy: 12, hspeed: 8, dir: [0, -1] }],
    charms: [
      { id: "C1", pos: [30, 0, 25] },
      { id: "C2", pos: [-30, 0, 25] },
    ],
    hasDrifters: true,
    hasWind: true,
  };
}

function groundHeightAt(night, x, z) {
  if (night === 1) return Math.hypot(x, z) <= 40 ? 0 : null;
  if (night === 2) {
    if (Math.hypot(x, z) <= 28) return 0;
    if (Math.hypot(x - 70, z) <= 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
    return null;
  }
  const r = Math.hypot(x, z);
  if (r > 45) return null;
  if (r <= 8) return 6;
  if (r >= 12 && r <= 24 && z > 0) return 3;
  for (const deg of [30, 150]) {
    const rad = (deg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uz = Math.sin(rad);
    const along = x * ux + z * uz;
    const perp = Math.abs(-x * uz + z * ux);
    if (along >= 24 && along <= 30 && perp <= 1.5) return (3 * (30 - along)) / 6;
  }
  return 0;
}

function isBlocked(night, x, y, z) {
  return night === 3 && Math.hypot(x, z) < 2.0 && y < 14.0;
}

function createGlowTexture(innerHex, outerRgba) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, innerHex);
  g.addColorStop(0.42, outerRgba);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function loadKeyBindings() {
  try {
    const saved = JSON.parse(localStorage.getItem("ddl_keys") || "null");
    if (saved && typeof saved === "object") return { ...DEFAULT_KEYS, ...saved };
  } catch (_) {}
  return { ...DEFAULT_KEYS };
}

// Persistent settings (Volume, Mouse Sens, Colorblind, Reduced Motion, Large Font, Keybindings)
const settings = {
  volume: Number(localStorage.getItem("ddl_vol") ?? 0.7),
  sens: Number(localStorage.getItem("ddl_sens") ?? 1.0),
  colorblind: localStorage.getItem("ddl_cb") === "true",
  reducedMotion: localStorage.getItem("ddl_rm") === "true",
  largeFont: localStorage.getItem("ddl_lf") === "true",
  keys: loadKeyBindings(),
};

function applyAccessibilityCSS() {
  document.body.classList.toggle("colorblind", settings.colorblind);
  document.body.classList.toggle("reduced-motion", settings.reducedMotion);
  document.body.classList.toggle("large-font", settings.largeFont);
}
applyAccessibilityCSS();

function shadeAccentHex() { return settings.colorblind ? COLORS.shadeRimCB : COLORS.shadeRim; }
function shadeAccentCSS() { return settings.colorblind ? "#00B3FF" : "#7A3CFF"; }

class SoundEngine {
  constructor() { this.ctx = null; this.ambientGain = null; }
  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    this.ensureAmbient();
    return this.ctx;
  }
  ensureAmbient() {
    if (!this.ctx || this.ambientGain) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.022 * settings.volume;
    gain.connect(this.ctx.destination);
    for (const freq of [110, 164.81]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
    }
    this.ambientGain = gain;
  }
  updateVolume() { if (this.ambientGain) this.ambientGain.gain.value = 0.022 * settings.volume; }
  tone(freq, dur = 0.18, type = "sine", vol = 0.14, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || settings.volume <= 0.001) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(vol * settings.volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  pickup(n) { const s = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; this.tone(s[(n - 1) % s.length], 0.22, "triangle", 0.13); }
  lanternLit() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.46, "triangle", 0.14, i * 0.07)); }
  lanternOut() { this.tone(240, 0.35, "sine", 0.13); this.tone(160, 0.45, "triangle", 0.12, 0.1); }
  refuel() { this.tone(587.33, 0.16, "sine", 0.12); this.tone(880, 0.22, "triangle", 0.12, 0.06); }
  pulse() { this.tone(330, 0.34, "sine", 0.16); this.tone(660, 0.3, "triangle", 0.12, 0.04); }
  hit() { this.tone(150, 0.25, "sawtooth", 0.11); this.tone(95, 0.3, "triangle", 0.13, 0.05); }
  jump() { this.tone(320, 0.14, "sine", 0.09); this.tone(480, 0.12, "sine", 0.07, 0.04); }
  dash() { this.tone(540, 0.16, "triangle", 0.11); this.tone(760, 0.12, "sine", 0.08, 0.03); }
  shadeSpawn() { this.tone(130, 0.35, "sawtooth", 0.08); }
  countdown() { this.tone(880, 0.09, "square", 0.08); }
  windWarn() { this.tone(240, 0.45, "sine", 0.08); this.tone(310, 0.35, "triangle", 0.06, 0.12); }
  win() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone(f, 0.52, "triangle", 0.14, i * 0.08)); }
  lose() { [330, 294, 247, 196].forEach((f, i) => this.tone(f, 0.42, "sine", 0.12, i * 0.1)); }
}

const sfx = new SoundEngine();
const FLAME_SVG = `<svg viewBox="0 0 24 28" width="22" height="26"><path d="M12 1C12 1 4 9 4 16.5C4 21.8 7.6 26 12 26C16.4 26 20 21.8 20 16.5C20 12.2 17.2 8.2 15.8 6.5C15.5 9.2 13.8 10.6 13.2 10.8C14.5 7.5 13.8 3.5 12 1Z" fill="#FFB347"/><path d="M12 10C12 10 8.2 14.5 8.2 18.2C8.2 21 9.9 23.2 12 23.2C14.1 23.2 15.8 21 15.8 18.2C15.8 14.5 12 10 12 10Z" fill="#FFF6C2"/></svg>`;

class GameApp {
  constructor(tuning) {
    this.tuning = tuning;
    this.keys = new Set();
    this.camYaw = 0;
    this.dragging = false;
    this.lastMouseX = 0;
    this.mode = "menu";
    this.currentNight = 1;
    this.nightsWon = 0;
    this.campaignScore = 0;
    this.campaignSeed = Math.floor(Math.random() * 100000);
    this.accumulator = 0;
    this.lastFrame = performance.now();
    this.elapsed = 0;
    this.lastCountdownSec = 11;
    this.windWarnPlayed = false;
    this.listeningAction = null;

    // Accessibility subtitle & shade spawn arrow state
    this.shadeSpawnAlert = null; // { pos, timer }

    this.visualYaw = 0;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.squashY = 1.0;
    this.fpsFrames = 0;
    this.fpsTimer = 0;
    this.particles = [];
    this.afterimages = [];
    this.windStreaks = [];
    this.lastRenderedCapacity = 0;

    // Detect benchmark URL params (?bench=1&seed=42&duration=30)
    const params = new URLSearchParams(window.location.search);
    this.isBench = params.get("bench") === "1";
    this.benchSeed = parseInt(params.get("seed") || "42", 10);
    this.benchDuration = parseFloat(params.get("duration") || "30");

    this.buildHUDWidgets();
    this.initThree();
    this.initInput();
    this.refreshKeyLabels();

    if (this.isBench) {
      this.startBenchmarkMode();
    } else {
      this.showMainMenu();
    }
    this.loop();
  }

  get capacity() { return Math.min(20, 10 + 2 * (this.successfulLights || 0)); }

  buildHUDWidgets() {
    this.slotEls = [];
    this.rebuildMoteSlots(10);
    const flamesWrap = document.getElementById("val-flames");
    flamesWrap.innerHTML = "";
    this.flameEls = [];
    for (let i = 0; i < 3; i++) {
      const span = document.createElement("span");
      span.className = "flame-icon";
      span.innerHTML = FLAME_SVG;
      flamesWrap.appendChild(span);
      this.flameEls.push(span);
    }
    this.minimapCtx = document.getElementById("minimap").getContext("2d");
  }

  rebuildMoteSlots(cap) {
    if (cap === this.lastRenderedCapacity) return;
    this.lastRenderedCapacity = cap;
    const wrap = document.getElementById("mote-slots");
    wrap.innerHTML = "";
    this.slotEls = [];
    for (let i = 0; i < cap; i++) {
      const el = document.createElement("div");
      el.className = "mote-slot";
      wrap.appendChild(el);
      this.slotEls.push(el);
    }
  }

  refreshKeyLabels() {
    const k = settings.keys;
    document.getElementById("key-dash-lbl").textContent = prettyKey(k.dash);
    document.getElementById("key-pulse-lbl").textContent = prettyKey(k.pulse);
    document.getElementById("controls-bar").innerHTML =
      `<span><kbd>${prettyKey(k.up)}${prettyKey(k.left)}${prettyKey(k.down)}${prettyKey(k.right)}</kbd> Di chuyển</span>` +
      `<span><kbd>${prettyKey(k.jump)}</kbd> Nhảy</span>` +
      `<span><kbd>${prettyKey(k.dash)}</kbd> Lướt</span>` +
      `<span><kbd>${prettyKey(k.interact)}</kbd> Nạp/Châm</span>` +
      `<span><kbd>${prettyKey(k.pulse)}</kbd> Tỏa Sáng</span>` +
      `<span><kbd>${prettyKey(k.pause)}</kbd>/Esc Tạm dừng</span>`;
  }

  initThree() {
    const container = document.getElementById("canvas-container");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.0105);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 280);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(this.isBench ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.goldGlowTex = createGlowTexture("#FFF6C2", "rgba(255, 179, 71, 0.5)");
    this.violetGlowTex = createGlowTexture("#7A3CFF", "rgba(122, 60, 255, 0.35)");
    this.cyanGlowTex = createGlowTexture("#00B3FF", "rgba(0, 179, 255, 0.38)");

    this.ambient = new THREE.AmbientLight(0xd8e4ff, 0.15);
    this.scene.add(this.ambient);
    this.hemi = new THREE.HemisphereLight(0x4b5f9e, COLORS.cloudSea, 0.25);
    this.scene.add(this.hemi);

    this.moon = new THREE.DirectionalLight(0xc8daff, 0.72);
    this.moon.position.set(28, 52, 24);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(1024, 1024);
    this.moon.shadow.camera.near = 5;
    this.moon.shadow.camera.far = 160;
    const sc = 56;
    this.moon.shadow.camera.left = -sc;
    this.moon.shadow.camera.right = sc;
    this.moon.shadow.camera.top = sc;
    this.moon.shadow.camera.bottom = -sc;
    this.scene.add(this.moon);

    this.buildSkyDecor();

    const cloudPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 520),
      new THREE.MeshStandardMaterial({ color: COLORS.cloudSea, roughness: 0.95 })
    );
    cloudPlane.rotation.x = -Math.PI / 2;
    cloudPlane.position.y = -11.5;
    this.scene.add(cloudPlane);

    this.cloudBank = new THREE.Group();
    if (!this.isBench) {
      const puffGeo = new THREE.SphereGeometry(1, 10, 8);
      const puffMat = new THREE.MeshStandardMaterial({ color: COLORS.cloudSea, emissive: 0x0a1f2d, roughness: 1.0, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 42; i++) {
        const ang = (i / 42) * Math.PI * 2;
        const dist = 52 + (i % 5) * 16;
        const p = new THREE.Mesh(puffGeo, puffMat);
        const s = 7 + (i % 4) * 3.2;
        p.scale.set(s * 1.7, s * 0.42, s * 1.25);
        p.position.set(Math.cos(ang) * dist + 15, -7.5 - (i % 3) * 1.5, Math.sin(ang) * dist);
        this.cloudBank.add(p);
      }
    }
    this.scene.add(this.cloudBank);

    this.worldGroup = new THREE.Group();
    this.entityGroup = new THREE.Group();
    this.fxGroup = new THREE.Group();
    this.scene.add(this.worldGroup, this.entityGroup, this.fxGroup);

    this.playerMesh = this.createMayMesh();
    this.scene.add(this.playerMesh);

    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  buildSkyDecor() {
    const pos = [];
    for (let i = 0; i < 300; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45;
      const rad = 165;
      pos.push(rad * Math.sin(phi) * Math.cos(theta), rad * Math.cos(phi) + 8, rad * Math.sin(phi) * Math.sin(theta));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: COLORS.moteCore, size: 1.15, transparent: true, opacity: 0.9 })));

    const moonOrb = new THREE.Mesh(new THREE.SphereGeometry(6.5, 20, 20), new THREE.MeshBasicMaterial({ color: COLORS.lanternCore }));
    moonOrb.position.set(62, 85, -88);
    this.scene.add(moonOrb);
  }

  createMayMesh() {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const bootMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.85 });
    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 6, 8), bootMat);
    leftLeg.position.set(-0.14, 0.2, 0);
    const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.24, 6, 8), bootMat);
    rightLeg.position.set(0.14, 0.2, 0);
    rig.add(leftLeg, rightLeg);

    const cloak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.48, 0.96, 18),
      new THREE.MeshStandardMaterial({ color: COLORS.mayCloak, roughness: 0.72 })
    );
    cloak.position.y = 0.72;
    cloak.castShadow = true;
    rig.add(cloak);

    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.032, 8, 24), new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.35 }));
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.26;
    rig.add(hem);

    const armMat = new THREE.MeshStandardMaterial({ color: COLORS.mayCloak, roughness: 0.75 });
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.32, 6, 8), armMat);
    leftArm.position.set(-0.34, 0.88, 0.04);
    leftArm.rotation.z = 0.28;
    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.32, 6, 8), armMat);
    rightArm.position.set(0.34, 0.88, 0.04);
    rightArm.rotation.z = -0.28;
    rig.add(leftArm, rightArm);

    const scarfMat = new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.6 });
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.085, 10, 20), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.18;
    rig.add(scarf);

    const ribbonPivot = new THREE.Group();
    ribbonPivot.position.set(0, 1.16, -0.22);
    const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.56), scarfMat);
    rib1.position.set(-0.06, -0.05, -0.26);
    rib1.rotation.x = -0.25;
    const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.44), scarfMat);
    rib2.position.set(0.08, -0.08, -0.21);
    rib2.rotation.x = -0.35;
    ribbonPivot.add(rib1, rib2);
    rig.add(ribbonPivot);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 14), new THREE.MeshStandardMaterial({ color: 0xffdfc4 }));
    head.position.y = 1.42;
    head.castShadow = true;
    rig.add(head);

    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.66, 0);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.42, 24), new THREE.MeshStandardMaterial({ color: COLORS.sand }));
    hat.castShadow = true;
    hatGroup.add(hat);

    const lanternPivot = new THREE.Group();
    lanternPivot.position.set(0, -0.18, 0.64);
    const miniGlass = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.115, 1),
      new THREE.MeshStandardMaterial({ color: COLORS.lanternCore, emissive: COLORS.lanternLit, emissiveIntensity: 2.2 })
    );
    miniGlass.position.y = -0.28;
    lanternPivot.add(miniGlass);
    this.playerLight = new THREE.PointLight(COLORS.lanternLit, 2.2, 13, 1.5);
    this.playerLight.position.y = -0.28;
    lanternPivot.add(this.playerLight);
    hatGroup.add(lanternPivot);
    rig.add(hatGroup);

    const orbitGroup = new THREE.Group();
    const orbitSparks = [];
    const sparkMat = new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 20; i++) {
      const sp = new THREE.Sprite(sparkMat);
      sp.scale.set(0.32, 0.32, 1);
      sp.visible = false;
      orbitGroup.add(sp);
      orbitSparks.push(sp);
    }
    root.add(orbitGroup);

    this.mayParts = { rig, leftLeg, rightLeg, leftArm, rightArm, ribbonPivot, lanternPivot, orbitSparks };
    return root;
  }

  createTree(x, y, z, scale = 1.0, isAreca = false) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.85 });
    if (isAreca) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 5.2 * scale, 8), trunkMat);
      trunk.position.y = 2.6 * scale;
      g.add(trunk);
      for (let i = 0; i < 5; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.55 * scale, 2.2 * scale, 5), leafMat);
        const a = (i / 5) * Math.PI * 2;
        frond.position.set(Math.cos(a) * 0.9 * scale, 5.0 * scale, Math.sin(a) * 0.9 * scale);
        frond.rotation.z = -Math.cos(a) * 1.15;
        frond.rotation.x = Math.sin(a) * 1.15;
        g.add(frond);
      }
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 1.8 * scale, 7), trunkMat);
      trunk.position.y = 0.9 * scale;
      g.add(trunk);
      for (let tier = 0; tier < 3; tier++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((1.45 - tier * 0.32) * scale, 1.55 * scale, 7), leafMat);
        cone.position.y = (2.1 + tier * 0.95) * scale;
        g.add(cone);
      }
    }
    return g;
  }

  buildTerrain(night, disableExtraDecor = false) {
    this.worldGroup.clear();
    const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.88 });
    const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.84 });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.95 });

    const addIslandDisc = (cx, cz, radius, isAreca) => {
      const turf = new THREE.Mesh(new THREE.CylinderGeometry(radius - 1.5, radius - 1.5, 0.3, 48), grassMat);
      turf.position.set(cx, -0.15, cz);
      turf.receiveShadow = true;
      this.worldGroup.add(turf);

      const beach = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius - 0.8, 0.8, 48), sandMat);
      beach.position.set(cx, -0.44, cz);
      beach.receiveShadow = true;
      this.worldGroup.add(beach);

      const cliff = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.8, radius * 0.62, 6.2, 24), rockMat);
      cliff.position.set(cx, -3.9, cz);
      this.worldGroup.add(cliff);

      if (!disableExtraDecor) {
        const count = radius > 35 ? 10 : 7;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + 0.37;
          const tx = cx + Math.cos(a) * (radius - 2.6);
          const tz = cz + Math.sin(a) * (radius - 2.6);
          if (this.def.lanterns.some((l) => Math.hypot(l.pos[0] - tx, l.pos[2] - tz) < 5.5)) continue;
          if (this.def.jumpPads.some((p) => Math.hypot(p.pos[0] - tx, p.pos[2] - tz) < 4.5)) continue;
          if (night === 2 && Math.abs(tz) < 4.5 && ((cx === 0 && tx > 20) || (cx === 70 && tx < 50))) continue;
          this.worldGroup.add(this.createTree(tx, 0, tz, 0.85 + (i % 3) * 0.2, isAreca));
        }
      }
    };

    if (night === 1) {
      addIslandDisc(0, 0, 40, false);
    } else if (night === 2) {
      addIslandDisc(0, 0, 28, true);
      addIslandDisc(70, 0, 28, true);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 4), woodMat);
      deck.position.set(35, -0.18, 0);
      deck.receiveShadow = true;
      this.worldGroup.add(deck);
    } else {
      addIslandDisc(0, 0, 45, false);
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 24, 0, Math.PI, false);
      shape.absarc(0, 0, 12, Math.PI, 0, true);
      const t1Geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
      t1Geo.rotateX(Math.PI / 2);
      const t1 = new THREE.Mesh(t1Geo, sandMat);
      t1.position.y = 3;
      this.worldGroup.add(t1);

      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.3, 6, 32), grassMat);
      t2.position.y = 3;
      this.worldGroup.add(t2);

      const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 8.0, 16), woodMat);
      towerBase.position.y = 10.0;
      this.worldGroup.add(towerBase);
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 8), new THREE.MeshStandardMaterial({ color: COLORS.mayScarf }));
      towerRoof.position.y = 14.8;
      this.worldGroup.add(towerRoof);

      for (const deg of [30, 150]) {
        const rad = (deg * Math.PI) / 180;
        const len = Math.hypot(6, 3);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, 3), woodMat);
        ramp.position.set(Math.cos(rad) * 27, 1.5, Math.sin(rad) * 27);
        ramp.rotation.y = -rad;
        ramp.rotation.z = Math.atan2(3, 6);
        this.worldGroup.add(ramp);
      }
    }

    this.padRings = [];
    for (const pad of this.def.jumpPads) {
      const pg = new THREE.Group();
      pg.position.set(pad.pos[0], pad.pos[1], pad.pos[2]);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r, 0.26, 20), new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.lanternLit, emissiveIntensity: 1.0 }));
      top.position.y = 0.13;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(pad.r * 0.9, 0.06, 8, 24), new THREE.MeshBasicMaterial({ color: COLORS.moteCore, transparent: true, opacity: 0.75 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4;
      pg.add(top, ring);
      this.worldGroup.add(pg);
      this.padRings.push(ring);
    }
  }

  createGrandLantern(l) {
    const g = new THREE.Group();
    g.position.set(l.pos[0], l.pos[1], l.pos[2]);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 0.55, 8), new THREE.MeshStandardMaterial({ color: COLORS.lanternUnlit }));
    base.position.y = 0.27;
    g.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.4, 8), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
    pillar.position.y = 1.65;
    g.add(pillar);

    const chamberGroup = new THREE.Group();
    chamberGroup.position.y = 3.25;
    const coreMat = new THREE.MeshStandardMaterial({ color: COLORS.lanternUnlit, emissive: COLORS.lanternLit, emissiveIntensity: 0.06, roughness: 0.35 });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.46, 1.15, 6), coreMat);
    chamberGroup.add(core);

    const tearGroup = new THREE.Group();
    const tearMat = new THREE.MeshBasicMaterial({ color: 0x0E1430, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const tear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.52, 3), tearMat);
      tear.position.set(Math.cos(a) * 0.52, (i - 1) * 0.14, Math.sin(a) * 0.52);
      tear.rotation.y = -a;
      tear.rotation.z = 0.55;
      tearGroup.add(tear);
    }
    chamberGroup.add(tearGroup);
    chamberGroup.scale.set(1, 0.8, 1);
    g.add(chamberGroup);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.65, 6), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
    roof.position.y = 4.15;
    g.add(roof);

    const fuelBarGroup = new THREE.Group();
    fuelBarGroup.position.y = 5.25;
    fuelBarGroup.visible = false;
    const fbBg = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.3), new THREE.MeshBasicMaterial({ color: 0x0E1430, side: THREE.DoubleSide }));
    const fbFillMat = new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, side: THREE.DoubleSide });
    const fbFill = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 0.18), fbFillMat);
    fbFill.position.z = 0.02;
    fuelBarGroup.add(fbBg, fbFill);
    g.add(fuelBarGroup);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    halo.position.y = 3.25;
    halo.scale.set(4.5, 4.5, 1);
    g.add(halo);

    const pLight = new THREE.PointLight(COLORS.lanternLit, 0, 24, 1.4);
    pLight.position.y = 3.25;
    g.add(pLight);

    const safeRing = new THREE.Mesh(
      new THREE.RingGeometry(5.82, 6.02, 56),
      new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.y = 0.06;
    g.add(safeRing);

    this.entityGroup.add(g);
    return {
      ...l, pos: [...l.pos], lit: false, everLit: false, relitCount: 0, deposited: 0, fuel60: 0,
      mesh: g, chamberGroup, tearGroup, coreMat, pLight, safeRing, halo, fuelBarGroup, fbFill, fbFillMat,
    };
  }

  // ==================== BENCHMARK MODE (Ticket-04 / Contract v1.3) ====================
  startBenchmarkMode() {
    this.mode = "bench";
    this.hideModal();
    document.getElementById("hud-top").style.display = "none";
    document.getElementById("minimap-wrap").style.display = "none";
    document.getElementById("mote-bar-wrap").style.display = "none";
    document.getElementById("abilities").style.display = "none";
    document.getElementById("controls-bar").style.display = "none";
    document.getElementById("bench-banner").style.display = "block";

    this.currentNight = 1;
    this.def = getNightDef(1);
    this.buildTerrain(1, true); // Standard Night 1 scene, extra decorative props disabled
    this.entityGroup.clear();
    this.fxGroup.clear();

    this.playerPos = [0, 0, 0];
    this.playerMesh.position.set(0, 0, 0);

    // 5 Lanterns: L1-L3 lit with fuel 100, L4-L5 unlit
    this.lanterns = this.def.lanterns.map((l, idx) => {
      const obj = this.createGrandLantern(l);
      if (idx < 3) {
        obj.lit = true;
        obj.everLit = true;
        obj.fuel60 = FUEL_MAX_60;
      }
      return obj;
    });
    this.updateAtmosphere();
    for (const l of this.lanterns) {
      if (l.lit) {
        l.coreMat.emissiveIntensity = 2.4;
        l.pLight.intensity = 3.8;
        l.halo.material.opacity = 0.72;
        l.safeRing.material.opacity = 0.36;
      }
    }

    const rng = mulberry32(this.benchSeed);

    // InstancedMesh for 200 wandering Shades (full lighting, 1 draw call!)
    const shadeGeo = new THREE.ConeGeometry(0.62, 1.75, 10);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: COLORS.shadeBody,
      emissive: COLORS.shadeRim,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    });
    this.benchShadeInst = new THREE.InstancedMesh(shadeGeo, shadeMat, 200);
    this.entityGroup.add(this.benchShadeInst);
    this.benchShades = [];
    for (let i = 0; i < 200; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 25; tries++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 37.5;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        if (!this.lanterns.some((l) => l.lit && Math.hypot(x - l.pos[0], z - l.pos[2]) < 6.2)) break;
      }
      this.benchShades.push({ x, z, ang: rng() * Math.PI * 2 });
    }

    // InstancedMesh for 100 Fireflies (full glow, 1 draw call!)
    const moteGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const moteMat = new THREE.MeshStandardMaterial({
      color: COLORS.moteCore,
      emissive: COLORS.moteHalo,
      emissiveIntensity: 2.4,
    });
    this.benchMoteInst = new THREE.InstancedMesh(moteGeo, moteMat, 100);
    this.entityGroup.add(this.benchMoteInst);
    this.benchMotes = [];
    for (let i = 0; i < 100; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 37.0;
      this.benchMotes.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, phase: rng() * Math.PI * 2 });
    }

    this.benchDummy = new THREE.Object3D();
    this.benchWarmupS = 3.0;
    this.benchElapsed = 0;
    this.benchFrameDts = [];
    this.benchDone = false;
    this.benchFirstFrameMs = null;
    this.benchMeasureStartPerf = null;
  }

  stepBenchmark(dt) {
    const now = performance.now();
    if (this.benchFirstFrameMs === null) {
      this.benchFirstFrameMs = now - PAGE_LOAD_START;
    }

    this.benchElapsed += dt;
    const banner = document.getElementById("bench-banner");
    if (this.benchElapsed < this.benchWarmupS) {
      banner.textContent = `Benchmark Warmup: ${(this.benchWarmupS - this.benchElapsed).toFixed(1)}s`;
    } else if (!this.benchDone) {
      if (this.benchMeasureStartPerf === null) this.benchMeasureStartPerf = now;
      this.benchFrameDts.push(dt * 1000.0);
      const measElapsed = (now - this.benchMeasureStartPerf) / 1000.0;
      banner.textContent = `Benchmark: ${measElapsed.toFixed(1)}s / ${this.benchDuration.toFixed(0)}s (${this.benchFrameDts.length} frames)`;
      if (measElapsed >= this.benchDuration) {
        this.benchDone = true;
        this.finishBenchmark(measElapsed * 1000.0);
      }
    }

    // Camera orbit: center (0,0,0), r=30m, Y=15m, starting at 0° (30,15,0), CCW from above, 15s/rev
    const theta = (2 * Math.PI * this.benchElapsed) / 15.0;
    this.camera.position.set(30.0 * Math.cos(theta), 15.0, -30.0 * Math.sin(theta));
    this.camera.lookAt(0, 0, 0);

    // Update 200 wandering Shades (respecting lit L1-L3 safe_radius 6m)
    const dummy = this.benchDummy;
    const moveStep = 4.0 * 0.45 * dt;
    for (let i = 0; i < this.benchShades.length; i++) {
      const s = this.benchShades[i];
      s.ang += 0.4 * dt;
      let nx = s.x + Math.cos(s.ang) * moveStep;
      let nz = s.z + Math.sin(s.ang) * moveStep;
      if (Math.hypot(nx, nz) > 39.0) {
        s.ang += Math.PI * 0.75;
      } else {
        s.x = nx; s.z = nz;
      }
      for (let j = 0; j < 3; j++) {
        const l = this.lanterns[j];
        const dx = s.x - l.pos[0], dz = s.z - l.pos[2], d = Math.hypot(dx, dz);
        if (d < 6.0) {
          const ux = d > 1e-5 ? dx / d : 1, uz = d > 1e-5 ? dz / d : 0;
          s.x = l.pos[0] + ux * 6.0;
          s.z = l.pos[2] + uz * 6.0;
        }
      }
      dummy.position.set(s.x, 0.9, s.z);
      dummy.rotation.set(0, s.ang, 0);
      dummy.updateMatrix();
      this.benchShadeInst.setMatrixAt(i, dummy.matrix);
    }
    this.benchShadeInst.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.benchMotes.length; i++) {
      const m = this.benchMotes[i];
      dummy.position.set(m.x, 0.9 + Math.sin(this.benchElapsed * 3.2 + m.phase) * 0.22, m.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.benchMoteInst.setMatrixAt(i, dummy.matrix);
    }
    this.benchMoteInst.instanceMatrix.needsUpdate = true;
  }

  finishBenchmark(measuredMs) {
    const dts = this.benchFrameDts;
    const N = dts.length;
    const sumDt = dts.reduce((a, b) => a + b, 0);
    const avgFps = N > 0 && sumDt > 0 ? (1000.0 * N) / sumDt : 0;
    const sorted = [...dts].sort((a, b) => a - b);
    const k = Math.max(1, Math.ceil(0.01 * N));
    const worstK = sorted.slice(N - k);
    const meanWorstK = worstK.reduce((a, b) => a + b, 0) / worstK.length;
    const p1LowFps = meanWorstK > 0 ? 1000.0 / meanWorstK : 0;
    const p95Idx = Math.min(N - 1, Math.max(0, Math.ceil(0.95 * N) - 1));
    const frameMsP95 = sorted[p95Idx] || 0;

    let glRenderer = "WebGL";
    try {
      const gl = this.renderer.getContext();
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) glRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    } catch (_) {}

    const payload = {
      frames: N,
      avg_fps: avgFps,
      p1_low_fps: p1LowFps,
      frame_ms_p95: frameMsP95,
      load_ms: this.benchFirstFrameMs || 0,
      measured_ms: measuredMs,
      warmup_ms: this.benchWarmupS * 1000.0,
      renderer: `Three.js r160 WebGL (${glRenderer})`,
    };

    document.getElementById("bench-banner").textContent =
      `Benchmark Done! avg=${avgFps.toFixed(1)} FPS · 1%low=${p1LowFps.toFixed(1)} FPS`;

    fetch("/api/bench-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  // ==================== STANDARD GAMEPLAY ====================
  createShadeVisual(pt) {
    const g = new THREE.Group();
    g.position.set(pt[0], pt[1], pt[2]);
    const accent = shadeAccentHex();
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.shadeBody, emissive: accent, emissiveIntensity: 0.6, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.75, 14), bodyMat);
    body.position.y = 0.92;
    body.castShadow = true;
    g.add(body);

    const ringMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.72 });
    const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 24), ringMat);
    auraRing.rotation.x = Math.PI / 2;
    auraRing.position.y = 0.65;
    g.add(auraRing);

    const eyeMat = new THREE.MeshBasicMaterial({ color: accent });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), eyeMat);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), eyeMat);
    eyeL.position.set(-0.18, 1.28, 0.34);
    eyeR.position.set(0.18, 1.28, 0.34);
    g.add(eyeL, eyeR);

    const stunCrown = new THREE.Group();
    stunCrown.position.y = 2.05;
    stunCrown.visible = false;
    const starMat = new THREE.MeshBasicMaterial({ color: COLORS.gold });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), starMat);
      st.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      stunCrown.add(st);
    }
    g.add(stunCrown);

    const haloMat = new THREE.SpriteMaterial({
      map: settings.colorblind ? this.cyanGlowTex : this.violetGlowTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.y = 1.0;
    halo.scale.set(2.4, 2.4, 1);
    g.add(halo);

    const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 2, 0)]);
    const beamMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.9 });
    const drainBeam = new THREE.Line(beamGeo, beamMat);
    drainBeam.visible = false;
    this.fxGroup.add(drainBeam);

    this.entityGroup.add(g);
    return { g, bodyMat, ringMat, eyeMat, auraRing, stunCrown, haloMat, drainBeam, beamMat };
  }

  createDrifterVisual(pt) {
    const g = new THREE.Group();
    g.position.set(pt[0], pt[1] + 1.3, pt[2]);
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.drifter, emissive: 0x526b82, emissiveIntensity: 0.65, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const segs = [];
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.55 - i * 0.08, 0.42), mat);
      seg.position.z = -i * 0.38;
      g.add(seg);
      segs.push(seg);
    }
    this.entityGroup.add(g);
    return { g, segs };
  }

  spawnBurst(pos, colorHex, count = 12, speed = 4.2) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
    const geo = new THREE.SphereGeometry(0.11, 6, 6);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.position.set(pos[0], pos[1] + 0.6, pos[2]);
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.fxGroup.add(m);
      this.particles.push({ mesh: m, vx: Math.cos(a) * spd, vy: 1.8 + Math.random() * 3.8, vz: Math.sin(a) * spd, age: 0, maxAge: 0.45 + Math.random() * 0.3 });
    }
  }

  triggerHitVignette() {
    if (settings.reducedMotion) return;
    this.shakeTime = 0.25;
    this.shakeMag = 0.45;
    const v = document.getElementById("vignette");
    v.classList.add("flash");
    setTimeout(() => v.classList.remove("flash"), 200);
  }

  triggerSafePushAround(lantern) {
    for (const s of this.shades) {
      if (s.state === "drain" && s.targetLanternId === lantern.id) { s.state = "wander"; s.targetLanternId = null; }
      const d = Math.hypot(s.pos[0] - lantern.pos[0], s.pos[2] - lantern.pos[2]);
      if (d < 6.0) {
        const nx = d > 1e-5 ? (s.pos[0] - lantern.pos[0]) / d : 1;
        const nz = d > 1e-5 ? (s.pos[2] - lantern.pos[2]) / d : 0;
        s.safePushTicks = 30;
        s.safePushTarget = [lantern.pos[0] + nx * 6.0, lantern.pos[2] + nz * 6.0];
      }
    }
  }

  startNight(night) {
    this.currentNight = night;
    this.def = getNightDef(night);
    this.buildTerrain(night, false);
    this.entityGroup.clear();
    this.fxGroup.clear();
    this.pulseWaves = [];
    this.particles = [];
    this.afterimages = [];
    this.windStreaks = [];
    this.shadeSpawnAlert = null;

    this.simTick = 0;
    this.score = 0;
    this.timeLeft = this.def.duration;
    this.lastCountdownSec = 11;
    this.windWarnPlayed = false;
    this.playerPos = [...this.def.spawn];
    this.playerVel = [0, 0, 0];
    this.facing = [0, 1];
    this.visualYaw = 0;
    this.grounded = true;
    this.flames = 3;
    this.carried = 0;
    this.successfulLights = 0;
    this.invulnTicks = 0;
    this.dashCdTicks = 0;
    this.dashTicks = 0;
    this.dashDir = [0, 1];
    this.pulseCdTicks = 0;
    this.charmTicks = 0;
    this.fallWaitTicks = 0;
    this.launchLocked = false;
    this.windActive = false;
    this.windDirDeg = 0;
    this.windTicks = 0;

    this.lanterns = this.def.lanterns.map((l) => this.createGrandLantern(l));
    this.motes = [];
    const shuffled = [...this.def.motePoints].sort(() => Math.random() - 0.5);
    for (const pt of shuffled.slice(0, 20)) this.addMote(pt, "random", null);

    this.charms = this.def.charms.map((c) => {
      const g = new THREE.Group();
      g.position.set(c.pos[0], c.pos[1] + 1.05, c.pos[2]);
      const border = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.82, 0.07), new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.lanternLit, emissiveIntensity: 0.6 }));
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.72, 0.09), new THREE.MeshStandardMaterial({ color: COLORS.mayScarf }));
      g.add(border, paper);
      this.entityGroup.add(g);
      return { ...c, pos: [...c.pos], available: true, respawnTicks: 0, mesh: g };
    });

    this.shades = [];
    this.drifters = [];
    this.rebuildMoteSlots(10);

    document.getElementById("val-night-lbl").textContent = `Đêm ${night} · ${this.def.name}`;
    this.updateAtmosphere();
    this.hideModal();
    this.mode = "playing";
    sfx.ensure();
  }

  addMote(pos, kind, ttl) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshStandardMaterial({ color: COLORS.moteCore, emissive: COLORS.moteHalo, emissiveIntensity: 2.5 }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
    halo.scale.set(1.35, 1.35, 1);
    g.add(core, halo);
    g.position.set(pos[0], pos[1] + 0.9, pos[2]);
    this.entityGroup.add(g);
    this.motes.push({ pos: [...pos], kind, ttl, spawnTick: this.simTick, mesh: g, phase: Math.random() * 6.28 });
  }

  spawnShade() {
    const valid = this.def.shadePoints.filter((pt) => {
      if (Math.hypot(pt[0] - this.playerPos[0], pt[2] - this.playerPos[2]) < 15) return false;
      if (this.lanterns.some((l) => l.lit && l.fuel60 >= LOW_FUEL_60 && Math.hypot(pt[0] - l.pos[0], pt[2] - l.pos[2]) < 6.5)) return false;
      return true;
    });
    if (!valid.length) return;
    const pt = valid[Math.floor(Math.random() * valid.length)];
    const vis = this.createShadeVisual(pt);
    this.shades.push({
      pos: [...pt], state: "wander", stateTicks: 0, pushTicks: 0, pushDir: [1, 0], recoilDir: [1, 0],
      safePushTicks: 0, safePushTarget: null, targetLanternId: null, wanderAng: Math.random() * 6.28, vis,
    });
    // Accessibility visual indicator + directional edge arrow for Shade spawn
    this.shadeSpawnAlert = { pos: [...pt], timer: 3.5 };
    sfx.shadeSpawn();
  }

  spawnDrifter() {
    const pt = this.def.shadePoints[Math.floor(Math.random() * this.def.shadePoints.length)];
    const vis = this.createDrifterVisual(pt);
    this.drifters.push({
      pos: [pt[0], pt[1] + 1.3, pt[2]], state: "idle", stolen: 0, hasStolen: false, fleeTicks: 0, fleeDir: [1, 0], ang: Math.random() * 6.28, vis,
    });
  }

  initInput() {
    window.addEventListener("keydown", (e) => {
      // Handle key rebinding capture in Settings
      if (this.listeningAction) {
        e.preventDefault();
        const code = e.code;
        const conflictEl = document.getElementById("rebind-conflict");
        const conflictAction = Object.keys(settings.keys).find(
          (act) => act !== this.listeningAction && settings.keys[act] === code
        );
        if (conflictAction) {
          if (conflictEl) conflictEl.textContent = `⚠ Phím "${prettyKey(code)}" đã dùng cho "${ACTION_LABELS[conflictAction]}"!`;
          this.listeningAction = null;
          this.renderRebindGrid();
          return;
        }
        settings.keys[this.listeningAction] = code;
        localStorage.setItem("ddl_keys", JSON.stringify(settings.keys));
        if (conflictEl) conflictEl.textContent = "";
        this.listeningAction = null;
        this.refreshKeyLabels();
        this.renderRebindGrid();
        return;
      }

      if (document.activeElement && document.activeElement.tagName === "INPUT") return;

      const code = e.code;
      const k = settings.keys;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) e.preventDefault();
      if ((code === "Escape" || code === k.pause) && !e.repeat) {
        if (this.mode === "playing") this.showPauseMenu();
        else if (this.mode === "paused") { this.hideModal(); this.mode = "playing"; }
        return;
      }
      if (this.mode !== "playing") return;
      if (code === k.jump && !this.keys.has(code)) this.qJump = true;
      if (code === k.interact && !this.keys.has(code)) this.qInteract = true;
      if ((code === k.dash || (k.dash === "ShiftLeft" && code === "ShiftRight")) && !this.keys.has(code)) this.qDash = true;
      if (code === k.pulse && !this.keys.has(code)) this.qPulse = true;
      this.keys.add(code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("mousedown", (e) => { this.dragging = true; this.lastMouseX = e.clientX; });
    window.addEventListener("mouseup", () => { this.dragging = false; });
    window.addEventListener("mousemove", (e) => {
      if (!this.dragging || this.mode !== "playing") return;
      this.camYaw -= (e.clientX - this.lastMouseX) * 0.006 * settings.sens;
      this.lastMouseX = e.clientX;
    });
  }

  stepSim() {
    this.simTick += 1;
    this.timeLeft = Math.max(0, this.def.duration - this.simTick / 60);

    const secCeil = Math.ceil(this.timeLeft);
    if (secCeil <= 10 && secCeil > 0 && secCeil < this.lastCountdownSec) {
      this.lastCountdownSec = secCeil;
      sfx.countdown();
    }

    if (this.invulnTicks > 0) this.invulnTicks--;
    if (this.dashCdTicks > 0) this.dashCdTicks--;
    if (this.pulseCdTicks > 0) this.pulseCdTicks--;
    if (this.charmTicks > 0) this.charmTicks--;

    for (let i = this.motes.length - 1; i >= 0; i--) {
      if (this.motes[i].ttl !== null) {
        this.motes[i].ttl--;
        if (this.motes[i].ttl <= 0) { this.entityGroup.remove(this.motes[i].mesh); this.motes.splice(i, 1); }
      }
    }
    for (const c of this.charms) {
      if (!c.available && c.respawnTicks > 0) {
        c.respawnTicks--;
        if (c.respawnTicks === 0) { c.available = true; c.mesh.visible = true; }
      }
    }

    let anyLanternChanged = false;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const drainers = this.shades.filter((s) => s.state === "drain" && s.targetLanternId === l.id);
      l.fuel60 -= 1 + 5 * drainers.length;
      if (l.fuel60 <= 0) {
        l.lit = false; l.fuel60 = 0; l.deposited = 0; l.everLit = true;
        anyLanternChanged = true;
        sfx.lanternOut();
        for (const s of drainers) { s.state = "wander"; s.targetLanternId = null; }
      }
    }
    if (anyLanternChanged) this.updateAtmosphere();

    if (this.def.hasWind) {
      const rem = 1800 - (this.simTick % 1800);
      if (this.windTicks > 0) {
        this.windTicks--;
        if (this.windTicks === 0) { this.windActive = false; this.windWarnPlayed = false; }
      } else if (this.simTick > 0 && this.simTick % 1800 === 0) {
        this.windActive = true; this.windDirDeg = Math.random() * 360; this.windTicks = 300;
      } else if (rem <= 120 && !this.windWarnPlayed) {
        this.windWarnPlayed = true; sfx.windWarn();
      }
    }

    if (this.keys.has("KeyQ")) this.camYaw += 2.2 * DT;
    if (this.keys.has("KeyC")) this.camYaw -= 2.2 * DT;

    const k = settings.keys;
    const wasGrounded = this.grounded;
    if (this.fallWaitTicks > 0) {
      this.fallWaitTicks--;
      if (this.fallWaitTicks === 0) {
        this.playerPos = [...this.def.spawn]; this.playerVel = [0, 0, 0]; this.grounded = true; this.launchLocked = false; this.invulnTicks = 90;
      }
    } else {
      let mx = 0, mz = 0;
      if (this.keys.has(k.up) || this.keys.has("ArrowUp")) mz -= 1;
      if (this.keys.has(k.down) || this.keys.has("ArrowDown")) mz += 1;
      if (this.keys.has(k.left) || this.keys.has("ArrowLeft")) mx -= 1;
      if (this.keys.has(k.right) || this.keys.has("ArrowRight")) mx += 1;
      const mag = Math.hypot(mx, mz);
      if (mag > 1) { mx /= mag; mz /= mag; }
      const wx = mx * Math.cos(this.camYaw) + mz * Math.sin(this.camYaw);
      const wz = -mx * Math.sin(this.camYaw) + mz * Math.cos(this.camYaw);
      const wmag = Math.hypot(wx, wz);
      if (wmag > 1e-4) this.facing = [wx / wmag, wz / wmag];

      if (this.qDash && this.dashTicks === 0 && (this.charmTicks > 0 || this.dashCdTicks === 0)) {
        this.dashTicks = 12;
        this.dashCdTicks = this.charmTicks > 0 ? 0 : 90;
        this.dashDir = wmag > 1e-4 ? [wx / wmag, wz / wmag] : [...this.facing];
        this.launchLocked = false;
        sfx.dash();
      }
      this.qDash = false;

      if (this.dashTicks > 0) {
        this.playerVel[0] = this.dashDir[0] * 14.0;
        this.playerVel[1] = 0;
        this.playerVel[2] = this.dashDir[1] * 14.0;
        this.dashTicks--;
      } else {
        if (!this.launchLocked) {
          const spd = this.charmTicks > 0 ? 7.2 : 6.0;
          this.playerVel[0] = wx * spd;
          this.playerVel[2] = wz * spd;
        }
        if (this.qJump && this.grounded) {
          this.playerVel[1] = JUMP_VEL; this.grounded = false; this.squashY = 1.24; sfx.jump();
        }
        if (!this.grounded) this.playerVel[1] += GRAVITY * DT;
      }
      this.qJump = false;

      const windVx = this.windActive ? Math.cos((this.windDirDeg * Math.PI) / 180) * 2.0 : 0;
      const windVz = this.windActive ? Math.sin((this.windDirDeg * Math.PI) / 180) * 2.0 : 0;
      const [ox, oy, oz] = this.playerPos;
      let nx = ox + (this.playerVel[0] + windVx) * DT;
      let nz = oz + (this.playerVel[2] + windVz) * DT;
      let ny = oy + this.playerVel[1] * DT;

      let gy = groundHeightAt(this.currentNight, nx, nz);
      if (isBlocked(this.currentNight, nx, oy, nz) || (gy !== null && oy < gy - 0.4)) {
        nx = ox; nz = oz; gy = groundHeightAt(this.currentNight, nx, nz);
      }
      if (gy !== null && ny <= gy && oy >= gy - 0.4 && this.playerVel[1] <= 0) {
        ny = gy; this.playerVel[1] = 0; this.grounded = true; this.launchLocked = false;
        if (!wasGrounded) this.squashY = 0.78;
      } else if (gy !== null && this.grounded && Math.abs(ny - gy) <= 0.4) {
        ny = gy; this.playerVel[1] = 0; this.grounded = true;
      } else { this.grounded = false; }
      this.playerPos = [nx, ny, nz];

      if (this.dashTicks === 0) {
        for (const pad of this.def.jumpPads) {
          if (Math.hypot(nx - pad.pos[0], nz - pad.pos[2]) <= pad.r && Math.abs(ny - pad.pos[1]) <= 0.5) {
            this.playerVel = [pad.dir[0] * pad.hspeed, pad.vy, pad.dir[1] * pad.hspeed];
            this.grounded = false; this.launchLocked = true; sfx.jump();
          }
        }
      }

      if (this.playerPos[1] < -10) {
        this.flames = Math.max(0, this.flames - 1);
        this.carried = 0; this.playerVel = [0, 0, 0]; this.launchLocked = false;
        sfx.hit(); this.triggerHitVignette();
        if (this.flames > 0) this.fallWaitTicks = 60;
      }
    }

    if (this.fallWaitTicks === 0 && this.flames > 0) {
      for (let i = this.motes.length - 1; i >= 0; i--) {
        const m = this.motes[i];
        if (this.carried < this.capacity && m.spawnTick < this.simTick && Math.hypot(this.playerPos[0] - m.pos[0], this.playerPos[2] - m.pos[2]) <= 1.0 && Math.abs(this.playerPos[1] - m.pos[1]) <= 1.5) {
          this.carried++;
          this.spawnBurst(m.pos, COLORS.moteCore, 6, 2.6);
          this.entityGroup.remove(m.mesh); this.motes.splice(i, 1);
          sfx.pickup(this.carried);
        }
      }
      for (const c of this.charms) {
        if (c.available && Math.hypot(this.playerPos[0] - c.pos[0], this.playerPos[2] - c.pos[2]) <= 1.0 && Math.abs(this.playerPos[1] - c.pos[1]) <= 1.5) {
          c.available = false; c.respawnTicks = 2700; c.mesh.visible = false; this.charmTicks = 600; this.dashCdTicks = 0;
          sfx.lanternLit();
        }
      }
    }

    let nearL = null, bestD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit && l.fuel60 >= FUEL_MAX_60) continue;
      const d = Math.hypot(this.playerPos[0] - l.pos[0], this.playerPos[2] - l.pos[2]);
      if (d <= 2.0 && (d < bestD || (Math.abs(d - bestD) < 1e-6 && nearL && l.id < nearL.id))) { bestD = d; nearL = l; }
    }
    const promptEl = document.getElementById("prompt");
    if (nearL && this.carried > 0) {
      promptEl.style.display = "block";
      const keyName = prettyKey(settings.keys.interact);
      if (!nearL.lit) {
        const cost = nearL.everLit ? 5 : 10;
        promptEl.textContent = nearL.everLit ? `${keyName} — Thắp lại (${nearL.deposited}/${cost})` : `${keyName} — Nạp ánh sáng (${nearL.deposited}/${cost})`;
      } else {
        promptEl.textContent = `${keyName} — Châm dầu (${Math.floor(nearL.fuel60 / FUEL_SCALE)}/100)`;
      }
    } else promptEl.style.display = "none";

    if (this.qInteract && nearL && this.carried > 0) {
      if (!nearL.lit) {
        const cost = nearL.everLit ? 5 : 10;
        const amt = Math.min(this.carried, cost - nearL.deposited);
        if (amt > 0) {
          this.carried -= amt; nearL.deposited += amt; this.score += amt * 5;
          if (nearL.deposited >= cost) {
            const isRelight = nearL.everLit;
            nearL.lit = true; nearL.everLit = true; nearL.fuel60 = FUEL_MAX_60;
            if (isRelight) { nearL.relitCount++; this.score += 40; } else this.score += 100;
            this.successfulLights++; this.rebuildMoteSlots(this.capacity);
            this.triggerSafePushAround(nearL); sfx.lanternLit();
            this.spawnBurst([nearL.pos[0], nearL.pos[1] + 2.8, nearL.pos[2]], COLORS.lanternLit, 20, 5.2);
          } else sfx.pickup(nearL.deposited);
          this.updateAtmosphere();
        }
      } else {
        const needed = Math.ceil((FUEL_MAX_60 - nearL.fuel60) / 600);
        const used = Math.min(this.carried, needed);
        if (used > 0) {
          const wasLow = nearL.fuel60 < LOW_FUEL_60;
          this.carried -= used; nearL.fuel60 = Math.min(FUEL_MAX_60, nearL.fuel60 + used * 600);
          this.score += used * 5;
          if (wasLow && nearL.fuel60 >= LOW_FUEL_60) this.triggerSafePushAround(nearL);
          sfx.refuel(); this.updateAtmosphere();
        }
      }
    }
    this.qInteract = false;

    for (const s of this.shades) {
      if (s.safePushTicks > 0 && s.safePushTarget) {
        const frac = 1 / s.safePushTicks;
        s.pos[0] += (s.safePushTarget[0] - s.pos[0]) * frac;
        s.pos[2] += (s.safePushTarget[1] - s.pos[2]) * frac;
        s.safePushTicks--;
        if (s.safePushTicks === 0) s.safePushTarget = null;
      }
    }

    if (this.qPulse && this.carried >= 3 && this.pulseCdTicks === 0) {
      this.carried -= 3; this.pulseCdTicks = 180; sfx.pulse();
      if (!settings.reducedMotion) { this.shakeTime = 0.14; this.shakeMag = 0.2; }
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.85, 48), new THREE.MeshBasicMaterial({ color: COLORS.moteHalo, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(this.playerPos[0], this.playerPos[1] + 0.2, this.playerPos[2]);
      this.fxGroup.add(ring);
      this.pulseWaves.push({ mesh: ring, age: 0 });
      const pc = [this.playerPos[0], this.playerPos[1] + 0.8, this.playerPos[2]];
      for (const s of this.shades) {
        if (Math.hypot(pc[0] - s.pos[0], pc[1] - s.pos[1], pc[2] - s.pos[2]) <= 5.0) {
          const wasDraining = s.state === "drain";
          s.state = "stunned"; s.stateTicks = 120; s.pushTicks = 15; s.targetLanternId = null;
          const dx = s.pos[0] - this.playerPos[0], dz = s.pos[2] - this.playerPos[2], dm = Math.hypot(dx, dz);
          s.pushDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
          this.score += wasDraining ? 15 : 5;
        }
      }
      for (const dr of this.drifters) {
        if (dr.state === "removed") continue;
        if (Math.hypot(pc[0] - dr.pos[0], pc[1] - dr.pos[1], pc[2] - dr.pos[2]) <= 5.0) {
          const dx = dr.pos[0] - this.playerPos[0], dz = dr.pos[2] - this.playerPos[2], dm = Math.hypot(dx, dz);
          dr.fleeDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
          if (dr.state === "chase") { dr.state = "flee"; dr.fleeTicks = 240; }
          else if (dr.state === "flee" && dr.stolen > 0) {
            for (let m = 0; m < dr.stolen; m++) this.addMote([dr.pos[0], 0, dr.pos[2]], "dropped", 480);
            dr.stolen = 0; dr.fleeTicks = 120;
          }
        }
      }
    }
    this.qPulse = false;

    for (const s of this.shades) {
      if (s.safePushTicks > 0) continue;
      if (s.stateTicks > 0) { s.stateTicks--; if (s.stateTicks === 0 && (s.state === "stunned" || s.state === "recoil")) s.state = "wander"; }
      if (s.state === "stunned") {
        if (s.pushTicks > 0) {
          const nx = s.pos[0] + s.pushDir[0] * (4 / 15), nz = s.pos[2] + s.pushDir[1] * (4 / 15);
          if (groundHeightAt(this.currentNight, nx, nz) !== null && !isBlocked(this.currentNight, nx, s.pos[1], nz)) { s.pos[0] = nx; s.pos[2] = nz; }
          s.pushTicks--;
        }
        continue;
      }
      if (s.state === "recoil") {
        const nx = s.pos[0] + s.recoilDir[0] * (2 / 60), nz = s.pos[2] + s.recoilDir[1] * (2 / 60);
        if (groundHeightAt(this.currentNight, nx, nz) !== null) { s.pos[0] = nx; s.pos[2] = nz; }
        continue;
      }
      const dp = Math.hypot(this.playerPos[0] - s.pos[0], this.playerPos[2] - s.pos[2]);
      if (s.state === "drain") {
        const tgt = this.lanterns.find((l) => l.id === s.targetLanternId);
        if (dp <= 6.0) { s.state = "chase"; s.targetLanternId = null; }
        else if (!tgt || !tgt.lit || tgt.fuel60 >= LOW_FUEL_60 || Math.hypot(s.pos[0] - tgt.pos[0], s.pos[2] - tgt.pos[2]) > 2.0) { s.state = "wander"; s.targetLanternId = null; }
        else continue;
      }
      if (s.state === "wander" && dp <= 12) { s.state = "chase"; s.targetLanternId = null; }
      else if (s.state === "chase" && dp > 18) s.state = "wander";

      let nx = s.pos[0], nz = s.pos[2];
      if (s.state === "chase" && dp > 1e-4) {
        const mv = Math.min(this.def.shadeSpeed * DT, dp);
        nx += ((this.playerPos[0] - s.pos[0]) / dp) * mv;
        nz += ((this.playerPos[2] - s.pos[2]) / dp) * mv;
      } else {
        const weak = this.lanterns.filter((l) => l.lit && l.fuel60 < LOW_FUEL_60).sort((a, b) => Math.hypot(s.pos[0] - a.pos[0], s.pos[2] - a.pos[2]) - Math.hypot(s.pos[0] - b.pos[0], s.pos[2] - b.pos[2]) || a.id.localeCompare(b.id));
        if (weak.length) {
          const tgt = weak[0], dl = Math.hypot(tgt.pos[0] - s.pos[0], tgt.pos[2] - s.pos[2]);
          if (dl <= 2.0) { s.state = "drain"; s.targetLanternId = tgt.id; continue; }
          const mv = Math.min(this.def.shadeSpeed * DT, dl);
          nx += ((tgt.pos[0] - s.pos[0]) / dl) * mv; nz += ((tgt.pos[2] - s.pos[2]) / dl) * mv;
          if (Math.hypot(tgt.pos[0] - nx, tgt.pos[2] - nz) <= 2.0) { s.state = "drain"; s.targetLanternId = tgt.id; }
        } else {
          s.wanderAng += 0.4 * DT;
          nx += Math.cos(s.wanderAng) * this.def.shadeSpeed * 0.45 * DT;
          nz += Math.sin(s.wanderAng) * this.def.shadeSpeed * 0.45 * DT;
        }
      }
      const gy = groundHeightAt(this.currentNight, nx, nz);
      if (gy !== null && !isBlocked(this.currentNight, nx, s.pos[1], nz)) s.pos = [nx, gy, nz];
      else s.wanderAng += 2.2;
      for (const l of this.lanterns) {
        if (!l.lit || l.fuel60 < LOW_FUEL_60) continue;
        const dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2], d = Math.hypot(dx, dz);
        if (d < 6.0) { const ux = d > 1e-5 ? dx / d : 1, uz = d > 1e-5 ? dz / d : 0; s.pos[0] = l.pos[0] + ux * 6.0; s.pos[2] = l.pos[2] + uz * 6.0; }
      }
    }

    for (const dr of this.drifters) {
      if (dr.state === "removed") continue;
      if (dr.state === "flee") { dr.pos[0] += dr.fleeDir[0] * 7 * DT; dr.pos[2] += dr.fleeDir[1] * 7 * DT; dr.fleeTicks--; if (dr.fleeTicks <= 0) { dr.state = "removed"; dr.vis.g.visible = false; } continue; }
      const dp = Math.hypot(this.playerPos[0] - dr.pos[0], this.playerPos[2] - dr.pos[2]);
      if (dr.state === "idle") {
        if (this.carried >= 5 && dp <= 15) dr.state = "chase";
        else { dr.ang += 0.6 * DT; dr.pos[0] += Math.cos(dr.ang) * 2 * DT; dr.pos[2] += Math.sin(dr.ang) * 2 * DT; }
      } else if (dr.state === "chase") {
        if (this.carried < 5 || dp > 15) dr.state = "idle";
        else if (dp > 1e-4) { dr.pos[0] += ((this.playerPos[0] - dr.pos[0]) / dp) * 7 * DT; dr.pos[2] += ((this.playerPos[2] - dr.pos[2]) / dp) * 7 * DT; }
      }
      if (dr.state === "chase" && !dr.hasStolen && dp <= 1.2 && this.fallWaitTicks === 0) {
        const amt = Math.min(3, this.carried);
        this.carried -= amt; dr.stolen = amt; dr.hasStolen = true; dr.state = "flee"; dr.fleeTicks = 240;
        const dx = dr.pos[0] - this.playerPos[0], dz = dr.pos[2] - this.playerPos[2], dm = Math.hypot(dx, dz);
        dr.fleeDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0]; sfx.hit();
      }
    }

    if (this.fallWaitTicks === 0 && this.invulnTicks === 0 && this.flames > 0) {
      for (const s of this.shades) {
        if (s.safePushTicks > 0 || (s.state !== "wander" && s.state !== "chase" && s.state !== "drain")) continue;
        if (Math.hypot(this.playerPos[0] - s.pos[0], this.playerPos[2] - s.pos[2]) <= 1.0 && Math.abs(this.playerPos[1] - s.pos[1]) <= 1.5) {
          this.flames = Math.max(0, this.flames - 1); this.invulnTicks = 90;
          const dropped = Math.floor(this.carried / 2); this.carried -= dropped;
          for (let m = 0; m < dropped; m++) { const a = Math.random() * 6.28, r = 1.5 + Math.random(); this.addMote([this.playerPos[0] + Math.cos(a) * r, this.playerPos[1], this.playerPos[2] + Math.sin(a) * r], "dropped", 480); }
          const dx = s.pos[0] - this.playerPos[0], dz = s.pos[2] - this.playerPos[2], dm = Math.hypot(dx, dz);
          s.recoilDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0]; s.state = "recoil"; s.stateTicks = 60; s.targetLanternId = null;
          this.triggerHitVignette(); sfx.hit(); break;
        }
      }
    }

    if (this.simTick % 240 === 0 && this.motes.length < 30) {
      const free = this.def.motePoints.filter((pt) => !this.motes.some((m) => Math.hypot(m.pos[0] - pt[0], m.pos[2] - pt[2]) < 0.5));
      if (free.length) this.addMote(free[Math.floor(Math.random() * free.length)], "random", null);
    }
    if (this.simTick === 300) {
      for (let i = 0; i < 2; i++) if (this.shades.length < this.def.maxShades) this.spawnShade();
    } else if (this.simTick > 300 && (this.simTick - 300) % this.def.shadeInterval === 0) {
      if (this.shades.length < this.def.maxShades) this.spawnShade();
    }
    if (this.def.hasDrifters && this.simTick % 1200 === 0) {
      if (this.drifters.filter((d) => d.state !== "removed").length < 2) this.spawnDrifter();
    }

    if (this.flames <= 0) {
      sfx.lose();
      this.showResult(false, "Ngọn Lửa của Mây đã tắt giữa sương đen.");
    } else if (this.timeLeft <= 0) {
      const litList = this.lanterns.filter((l) => l.lit);
      const needed = Math.ceil(0.6 * this.lanterns.length);
      if (litList.length >= needed) {
        const dawnLanternBonus = litList.reduce((acc, l) => acc + 50 + Math.floor(l.fuel60 / FUEL_SCALE), 0);
        this.score += dawnLanternBonus + this.flames * 50;
        this.campaignScore += this.score;
        this.nightsWon = Math.min(3, this.nightsWon + 1);
        sfx.win();
        if (this.currentNight === 3) this.showDawnScreen();
        else this.showResult(true, `Bình minh đã về! Bạn giữ sáng ${litList.length}/${this.lanterns.length} đèn trên ${this.def.name}.`);
      } else {
        sfx.lose();
        this.showResult(false, `Bình minh đến nhưng chỉ có ${litList.length}/${this.lanterns.length} đèn sáng (cần ≥ ${needed}).`);
      }
    }
  }

  updateAtmosphere() {
    const lit = this.lanterns.filter((l) => l.lit).length;
    const ratio = lit / this.lanterns.length;
    this.ambient.intensity = 0.15 + 0.55 * ratio;
    this.scene.fog.density = 0.011 - ratio * 0.004;
    for (const l of this.lanterns) {
      if (l.lit) {
        l.chamberGroup.scale.set(1, 1.0, 1); l.tearGroup.visible = false;
        l.coreMat.color.setHex(COLORS.lanternCore); l.fuelBarGroup.visible = true;
      } else {
        l.chamberGroup.scale.set(1, 0.8, 1); l.tearGroup.visible = true;
        const r = l.deposited / (l.everLit ? 5 : 10);
        l.coreMat.color.setHex(COLORS.lanternUnlit); l.coreMat.emissiveIntensity = 0.06 + r * 1.0;
        l.pLight.intensity = r * 0.8; l.safeRing.material.opacity = 0; l.halo.material.opacity = r * 0.22; l.fuelBarGroup.visible = false;
      }
    }
  }

  positionEdgeArrow(el, worldPos, alwaysShow = false) {
    const v = new THREE.Vector3(worldPos[0], worldPos[1] + 2.0, worldPos[2]).project(this.camera);
    const offscreen = v.z > 1 || Math.abs(v.x) > 0.9 || Math.abs(v.y) > 0.88;
    if (offscreen || alwaysShow) {
      let sx = v.x, sy = v.y;
      if (v.z > 1) { sx = -sx; sy = -sy; }
      const ang = Math.atan2(-sy, sx);
      const cx = window.innerWidth / 2 + Math.cos(ang) * (window.innerWidth * 0.42);
      const cy = window.innerHeight / 2 + Math.sin(ang) * (window.innerHeight * 0.37);
      el.style.display = "flex";
      el.style.left = `${cx - 21}px`;
      el.style.top = `${cy - 21}px`;
      el.style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;
    } else el.style.display = "none";
  }

  drawMinimap() {
    const ctx = this.minimapCtx;
    const w = 126, h = 126, cx = 63, cy = 63;
    ctx.clearRect(0, 0, w, h);
    const scale = this.currentNight === 2 ? 1.0 : 1.2;
    const toMap = (x, z) => [cx + (x - this.playerPos[0]) * scale, cy + (z - this.playerPos[2]) * scale];

    ctx.fillStyle = "rgba(47, 93, 80, 0.55)"; ctx.strokeStyle = "rgba(201, 180, 138, 0.65)"; ctx.lineWidth = 1.5;
    if (this.currentNight === 1) { const [ix, iy] = toMap(0, 0); ctx.beginPath(); ctx.arc(ix, iy, 40 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else if (this.currentNight === 2) {
      for (const ox of [0, 70]) { const [ix, iy] = toMap(ox, 0); ctx.beginPath(); ctx.arc(ix, iy, 28 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    } else { const [ix, iy] = toMap(0, 0); ctx.beginPath(); ctx.arc(ix, iy, 45 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }

    for (const l of this.lanterns) {
      const [lx, ly] = toMap(l.pos[0], l.pos[2]);
      const lowFuel = l.lit && l.fuel60 < LOW_FUEL_60;
      ctx.fillStyle = !l.lit ? "#5B5F6E" : (lowFuel ? (settings.colorblind ? "#FFFFFF" : "#FF5A5F") : "#FFB347");
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
    }
    for (const s of this.shades) { const [sx, sy] = toMap(s.pos[0], s.pos[2]); ctx.fillStyle = shadeAccentCSS(); ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#F5F1E6"; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  }

  updateHUD(dt) {
    for (let i = 0; i < 3; i++) this.flameEls[i].classList.toggle("lost", i >= this.flames);
    const lit = this.lanterns.filter((l) => l.lit).length;
    const needed = Math.ceil(0.6 * this.lanterns.length);
    const lEl = document.getElementById("val-lanterns");
    lEl.textContent = `${lit}/${this.lanterns.length} (≥${needed})`;
    lEl.classList.toggle("warn", lit < needed);
    document.getElementById("val-score").textContent = String(this.score);

    const mins = Math.floor(this.timeLeft / 60), secs = Math.floor(this.timeLeft % 60);
    const clk = document.getElementById("val-clock");
    const isDangerClock = this.timeLeft <= 30;
    clk.textContent = `${isDangerClock && settings.colorblind ? "⚠ " : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    clk.classList.toggle("danger", isDangerClock);

    // Visual Subtitles Stack (Accessibility Section 4: Shade spawn, Wind, Last 10s, Fuel < 30)
    const stack = document.getElementById("subtitle-stack");
    const subs = [];
    if (this.shadeSpawnAlert) {
      this.shadeSpawnAlert.timer -= dt;
      if (this.shadeSpawnAlert.timer > 0) {
        subs.push({ cls: "shade", text: "👁️ Bóng Mực vừa xuất hiện!" });
        this.positionEdgeArrow(document.getElementById("shade-arrow"), this.shadeSpawnAlert.pos, true);
      } else {
        this.shadeSpawnAlert = null;
        document.getElementById("shade-arrow").style.display = "none";
      }
    } else document.getElementById("shade-arrow").style.display = "none";

    if (this.timeLeft <= 10 && this.timeLeft > 0) {
      subs.push({ cls: "", text: `⚠ Còn ${Math.ceil(this.timeLeft)} giây cuối tới bình minh!` });
    }
    if (this.def.hasWind && this.windActive) {
      subs.push({ cls: "info", text: "💨 Gió mạnh đang thổi!" });
    } else if (this.def.hasWind && (1800 - (this.simTick % 1800)) <= 120) {
      subs.push({ cls: "info", text: "🍃 Gió mạnh sắp thổi!" });
    }
    const lowLanterns = this.lanterns.filter((l) => l.lit && l.fuel60 < LOW_FUEL_60);
    if (lowLanterns.length > 0) {
      subs.push({ cls: "", text: `⚠ ${lowLanterns.map((l) => l.id).join(", ")} sắp cạn dầu (<30%)!` });
    }
    stack.innerHTML = subs.map((s) => `<div class="subtitle-toast ${s.cls}">${s.text}</div>`).join("");

    const cap = this.capacity;
    this.rebuildMoteSlots(cap);
    for (let i = 0; i < cap; i++) this.slotEls[i].classList.toggle("filled", i < this.carried);
    document.getElementById("mote-count").textContent = `${this.carried}/${cap}`;

    const charmEl = document.getElementById("charm-badge");
    if (this.charmTicks > 0) { charmEl.style.display = "block"; charmEl.textContent = `🧧 Bùa Gió: ${(this.charmTicks / 60).toFixed(1)}s`; }
    else charmEl.style.display = "none";

    const cdDash = document.getElementById("cd-dash"), cardDash = document.getElementById("card-dash"), barDash = document.getElementById("bar-dash");
    if (this.charmTicks > 0) { cdDash.textContent = "0s"; cdDash.className = "cd"; cardDash.classList.add("ready"); barDash.style.width = "100%"; }
    else if (this.dashCdTicks > 0) { cdDash.textContent = `${(this.dashCdTicks / 60).toFixed(1)}s`; cdDash.className = "cd dim"; cardDash.classList.remove("ready"); barDash.style.width = `${((90 - this.dashCdTicks) / 90) * 100}%`; }
    else { cdDash.textContent = "Sẵn sàng"; cdDash.className = "cd"; cardDash.classList.add("ready"); barDash.style.width = "100%"; }

    const cdPulse = document.getElementById("cd-pulse"), cardPulse = document.getElementById("card-pulse"), barPulse = document.getElementById("bar-pulse");
    if (this.pulseCdTicks > 0) { cdPulse.textContent = `${(this.pulseCdTicks / 60).toFixed(1)}s`; cdPulse.className = "cd dim"; cardPulse.classList.remove("ready"); barPulse.style.width = `${((180 - this.pulseCdTicks) / 180) * 100}%`; }
    else if (this.carried < 3) { cdPulse.textContent = "Cần 3"; cdPulse.className = "cd dim"; cardPulse.classList.remove("ready"); barPulse.style.width = `${(this.carried / 3) * 100}%`; }
    else { cdPulse.textContent = "Sẵn sàng"; cdPulse.className = "cd"; cardPulse.classList.add("ready"); barPulse.style.width = "100%"; }

    const arrow = document.getElementById("lantern-arrow");
    const searchList = lowLanterns.length ? lowLanterns : this.lanterns.filter((l) => !l.lit);
    let targetL = null, minD = Infinity;
    for (const l of searchList) { const d = Math.hypot(l.pos[0] - this.playerPos[0], l.pos[2] - this.playerPos[2]); if (d < minD) { minD = d; targetL = l; } }
    if (targetL) this.positionEdgeArrow(arrow, targetL.pos, false);
    else arrow.style.display = "none";

    this.drawMinimap();
  }

  syncVisuals(dt) {
    this.elapsed += dt;
    const targetYaw = Math.atan2(this.facing[0], this.facing[1]);
    let diff = targetYaw - this.visualYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.visualYaw += diff * Math.min(1, dt * 16);

    const hSpeed = Math.hypot(this.playerVel[0], this.playerVel[2]);
    this.squashY += (1.0 - this.squashY) * Math.min(1, dt * 14);
    this.playerMesh.position.set(this.playerPos[0], this.playerPos[1], this.playerPos[2]);
    this.playerMesh.rotation.y = this.visualYaw;
    this.playerMesh.visible = this.fallWaitTicks === 0 && (this.invulnTicks === 0 || Math.floor(this.elapsed * 16) % 2 === 0);

    const { rig, leftLeg, rightLeg, leftArm, rightArm, ribbonPivot, lanternPivot, orbitSparks } = this.mayParts;
    rig.scale.set(1 / Math.sqrt(this.squashY), this.squashY, 1 / Math.sqrt(this.squashY));
    if (hSpeed > 0.4 && this.grounded) {
      const cycle = this.elapsed * (this.charmTicks > 0 ? 15 : 12);
      leftLeg.rotation.x = Math.sin(cycle) * 0.65; rightLeg.rotation.x = -Math.sin(cycle) * 0.65;
      leftArm.rotation.x = -Math.sin(cycle) * 0.5; rightArm.rotation.x = Math.sin(cycle) * 0.5;
    } else {
      leftLeg.rotation.x *= 0.85; rightLeg.rotation.x *= 0.85; leftArm.rotation.x *= 0.85; rightArm.rotation.x *= 0.85;
    }
    ribbonPivot.rotation.x = Math.sin(this.elapsed * 10) * 0.18 + (hSpeed > 0.5 ? 0.42 : 0.06);
    lanternPivot.rotation.z = Math.sin(this.elapsed * 5) * 0.14;
    for (let i = 0; i < 20; i++) {
      const sp = orbitSparks[i];
      if (i < this.carried) {
        sp.visible = true;
        const a = this.elapsed * 2.4 + (i / Math.max(1, this.carried)) * Math.PI * 2;
        sp.position.set(Math.cos(a) * 0.95, 1.05 + Math.sin(this.elapsed * 4 + i) * 0.24, Math.sin(a) * 0.95);
      } else sp.visible = false;
    }

    const blinkOn = Math.sin(this.elapsed * Math.PI * 2) > 0;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      l.fuelBarGroup.lookAt(this.camera.position);
      const frac = Math.max(0.02, l.fuel60 / FUEL_MAX_60);
      l.fbFill.scale.x = frac;
      l.fbFill.position.x = -0.98 * (1 - frac);
      const lowFuel = l.fuel60 < LOW_FUEL_60;
      l.safeRing.material.opacity = lowFuel ? 0.0 : 0.36;
      if (lowFuel) {
        l.coreMat.emissiveIntensity = blinkOn ? 2.1 : 0.45;
        l.pLight.intensity = blinkOn ? 3.0 : 0.8;
        l.fbFillMat.color.setHex(settings.colorblind ? 0xFFFFFF : 0xFF5A5F);
        l.fuelBarGroup.visible = blinkOn;
      } else {
        l.coreMat.emissiveIntensity = 2.4; l.pLight.intensity = 3.8;
        l.fbFillMat.color.setHex(COLORS.lanternLit); l.fuelBarGroup.visible = true;
      }
    }

    for (const m of this.motes) m.mesh.position.set(m.pos[0], m.pos[1] + 0.9 + Math.sin(this.elapsed * 3.4 + m.phase) * 0.24, m.pos[2]);
    for (const c of this.charms) if (c.available) c.mesh.rotation.y = this.elapsed * 2.2;

    const accent = shadeAccentHex(), glowTex = settings.colorblind ? this.cyanGlowTex : this.violetGlowTex;
    for (const s of this.shades) {
      const { g, bodyMat, ringMat, eyeMat, auraRing, stunCrown, haloMat, drainBeam, beamMat } = s.vis;
      g.position.set(s.pos[0], s.pos[1] + Math.sin(this.elapsed * 5) * 0.1, s.pos[2]);
      g.rotation.y = Math.atan2(this.playerPos[0] - s.pos[0], this.playerPos[2] - s.pos[2]);
      auraRing.rotation.z = this.elapsed * (s.state === "drain" ? 7 : 3);
      const isStun = s.state === "stunned";
      bodyMat.color.setHex(isStun ? COLORS.shadeStunned : COLORS.shadeBody);
      bodyMat.emissive.setHex(isStun ? COLORS.lanternLit : accent);
      ringMat.color.setHex(isStun ? COLORS.gold : accent);
      eyeMat.color.setHex(isStun ? COLORS.moteHalo : accent);
      if (haloMat.map !== glowTex) { haloMat.map = glowTex; haloMat.needsUpdate = true; }
      stunCrown.visible = isStun;
      if (s.state === "drain" && s.targetLanternId) {
        const tgt = this.lanterns.find((l) => l.id === s.targetLanternId);
        if (tgt) {
          drainBeam.visible = true; beamMat.color.setHex(accent);
          const pa = drainBeam.geometry.attributes.position;
          pa.setXYZ(0, s.pos[0], s.pos[1] + 1.2, s.pos[2]); pa.setXYZ(1, tgt.pos[0], tgt.pos[1] + 3.25, tgt.pos[2]); pa.needsUpdate = true;
        } else drainBeam.visible = false;
      } else drainBeam.visible = false;
    }

    for (const dr of this.drifters) if (dr.state !== "removed") {
      dr.vis.g.position.set(dr.pos[0], dr.pos[1] + Math.sin(this.elapsed * 6) * 0.22, dr.pos[2]);
      dr.vis.segs.forEach((seg, idx) => { seg.position.x = Math.sin(this.elapsed * 9 - idx * 0.9) * 0.14; });
    }
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const w = this.pulseWaves[i]; w.age += dt;
      if (w.age >= 0.45) { this.fxGroup.remove(w.mesh); this.pulseWaves.splice(i, 1); }
      else { const p = w.age / 0.45; w.mesh.scale.setScalar(1 + p * 6.5); w.mesh.material.opacity = (1 - p) * 0.9; }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.age += dt;
      if (p.age >= p.maxAge) { this.fxGroup.remove(p.mesh); this.particles.splice(i, 1); }
      else { p.vy -= 8 * dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y += p.vy * dt; p.mesh.position.z += p.vz * dt; p.mesh.material.opacity = 1 - p.age / p.maxAge; }
    }

    if (!settings.reducedMotion) {
      const targetFov = this.dashTicks > 0 ? 66 : (this.charmTicks > 0 ? 61 : 58);
      if (Math.abs(this.camera.fov - targetFov) > 0.05) { this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12); this.camera.updateProjectionMatrix(); }
    } else if (this.camera.fov !== 58) { this.camera.fov = 58; this.camera.updateProjectionMatrix(); }

    const tx = this.playerPos[0] + Math.sin(this.camYaw) * 12.2, tz = this.playerPos[2] + Math.cos(this.camYaw) * 12.2, ty = this.playerPos[1] + 7.4;
    this.camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.14);
    if (!settings.reducedMotion && this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeMag;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeMag;
    }
    this.camera.lookAt(this.playerPos[0], this.playerPos[1] + 1.35, this.playerPos[2]);
  }

  // ==================== MODALS & LEADERBOARD ====================
  showModal(html) { document.getElementById("modal-content").innerHTML = html; document.getElementById("modal-overlay").classList.remove("hidden"); }
  hideModal() { document.getElementById("modal-overlay").classList.add("hidden"); this.listeningAction = null; }

  showMainMenu() {
    this.mode = "menu";
    this.campaignScore = 0;
    this.nightsWon = 0;
    this.campaignSeed = Math.floor(Math.random() * 100000);
    this.showModal(`
      <h1>🏮 Đảo Đèn Lồng</h1>
      <h2>Phiên bản Phát hành v1.0.0</h2>
      <p>Giữ ánh sáng trên <strong>Đảo Bến</strong>, <strong>Đảo Cau</strong> và <strong>Đảo Chuông</strong> vượt qua sương đen tới bình minh.</p>
      <div class="btn-row">
        <button class="btn" id="m-play">✨ Bắt đầu hành trình (Đêm 1)</button>
        <div class="btn-grid">
          <button class="btn secondary" id="m-n2">Đêm 2 · Đảo Cau</button>
          <button class="btn secondary" id="m-n3">Đêm 3 · Đảo Chuông</button>
        </div>
        <div class="btn-grid">
          <button class="btn secondary" id="m-lb">🏆 Bảng xếp hạng</button>
          <button class="btn secondary" id="m-set">⚙️ Cài đặt & Tiếp cận</button>
        </div>
      </div>
    `);
    document.getElementById("m-play").onclick = () => this.showNightIntro(1);
    document.getElementById("m-n2").onclick = () => this.showNightIntro(2);
    document.getElementById("m-n3").onclick = () => this.showNightIntro(3);
    document.getElementById("m-lb").onclick = () => this.showLeaderboard(() => this.showMainMenu());
    document.getElementById("m-set").onclick = () => this.showSettings(() => this.showMainMenu());
  }

  async showLeaderboard(onBack) {
    this.mode = "menu";
    let entries = [];
    try {
      const r = await fetch("/api/leaderboard");
      if (r.ok) entries = (await r.json()).entries || [];
    } catch (_) {}
    const rows = entries.length
      ? entries.map((e, i) => `<tr><td>#${i + 1}</td><td>${e.name}</td><td><strong>${e.score}</strong></td><td>${e.nights_won}/3</td></tr>`).join("")
      : `<tr><td colspan="4" style="text-align:center;color:#C9B48A">Chưa có điểm nào được lưu.</td></tr>`;
    this.showModal(`
      <h1>🏆 Bảng Xếp Hạng (Top 10)</h1>
      <table class="lb-table">
        <thead><tr><th>Hạng</th><th>Tên</th><th>Điểm</th><th>Đêm thắng</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="btn-row"><button class="btn" id="lb-back">Quay lại</button></div>
    `);
    document.getElementById("lb-back").onclick = onBack;
  }

  showNightIntro(night) {
    this.mode = "intro";
    const info = NIGHT_INTROS[night];
    this.showModal(`
      <h1>Đêm ${night} — ${info.name}</h1>
      <div class="quote">${info.quote}</div>
      <div class="btn-row">
        <button class="btn" id="m-go">🏮 Lên đường!</button>
        <button class="btn secondary" id="m-back">Về menu chính</button>
      </div>
    `);
    document.getElementById("m-go").onclick = () => this.startNight(night);
    document.getElementById("m-back").onclick = () => this.showMainMenu();
  }

  showPauseMenu() {
    this.mode = "paused";
    this.showModal(`
      <h1>⏸️ Tạm dừng</h1>
      <h2>Đêm ${this.currentNight} — ${this.def.name}</h2>
      <div class="btn-row">
        <button class="btn" id="p-resume">▶ Tiếp tục</button>
        <button class="btn secondary" id="p-retry">🔄 Chơi lại Đêm ${this.currentNight}</button>
        <button class="btn secondary" id="p-set">⚙️ Cài đặt & Đổi phím</button>
        <button class="btn secondary" id="p-menu">🏠 Về menu</button>
      </div>
    `);
    document.getElementById("p-resume").onclick = () => { this.hideModal(); this.mode = "playing"; };
    document.getElementById("p-retry").onclick = () => this.startNight(this.currentNight);
    document.getElementById("p-set").onclick = () => this.showSettings(() => this.showPauseMenu());
    document.getElementById("p-menu").onclick = () => this.showMainMenu();
  }

  renderRebindGrid() {
    const grid = document.getElementById("rebind-grid");
    if (!grid) return;
    grid.innerHTML = Object.keys(ACTION_LABELS)
      .map((act) => {
        const isListening = this.listeningAction === act;
        return `<div class="rebind-item"><span>${ACTION_LABELS[act]}</span><button class="rebind-btn ${isListening ? "listening" : ""}" data-act="${act}">${isListening ? "Nhấn phím..." : prettyKey(settings.keys[act])}</button></div>`;
      })
      .join("");
    grid.querySelectorAll(".rebind-btn").forEach((btn) => {
      btn.onclick = () => {
        this.listeningAction = btn.dataset.act;
        this.renderRebindGrid();
      };
    });
  }

  showSettings(onBack) {
    this.listeningAction = null;
    this.showModal(`
      <h1>⚙️ Cài đặt & Dễ tiếp cận</h1>
      <div class="setting-row"><label>Âm lượng (<span id="s-vol-v">${Math.round(settings.volume * 100)}%</span>)</label><input id="s-vol" type="range" min="0" max="1" step="0.05" value="${settings.volume}" /></div>
      <div class="setting-row"><label>Độ nhạy chuột (<span id="s-sens-v">${settings.sens.toFixed(1)}x</span>)</label><input id="s-sens" type="range" min="0.4" max="2.5" step="0.1" value="${settings.sens}" /></div>
      <div class="setting-row"><label for="s-cb">Bảng màu dễ phân biệt (Mù màu)</label><input id="s-cb" type="checkbox" ${settings.colorblind ? "checked" : ""} /></div>
      <div class="setting-row"><label for="s-rm">Giảm chuyển động (tắt rung & chớp)</label><input id="s-rm" type="checkbox" ${settings.reducedMotion ? "checked" : ""} /></div>
      <div class="setting-row"><label for="s-lf">Chữ lớn (×1.25)</label><input id="s-lf" type="checkbox" ${settings.largeFont ? "checked" : ""} /></div>
      <h2 style="margin-top:12px">Đổi phím điều khiển</h2>
      <div class="rebind-grid" id="rebind-grid"></div>
      <div class="conflict-msg" id="rebind-conflict"></div>
      <div class="btn-grid">
        <button class="btn secondary" id="s-reset-keys">Khôi phục mặc định</button>
        <button class="btn" id="s-back">Lưu & Quay lại</button>
      </div>
    `);
    this.renderRebindGrid();
    document.getElementById("s-vol").oninput = (e) => { settings.volume = Number(e.target.value); localStorage.setItem("ddl_vol", String(settings.volume)); document.getElementById("s-vol-v").textContent = `${Math.round(settings.volume * 100)}%`; sfx.updateVolume(); };
    document.getElementById("s-sens").oninput = (e) => { settings.sens = Number(e.target.value); localStorage.setItem("ddl_sens", String(settings.sens)); document.getElementById("s-sens-v").textContent = `${settings.sens.toFixed(1)}x`; };
    document.getElementById("s-cb").onchange = (e) => { settings.colorblind = Boolean(e.target.checked); localStorage.setItem("ddl_cb", String(settings.colorblind)); applyAccessibilityCSS(); };
    document.getElementById("s-rm").onchange = (e) => { settings.reducedMotion = Boolean(e.target.checked); localStorage.setItem("ddl_rm", String(settings.reducedMotion)); applyAccessibilityCSS(); };
    document.getElementById("s-lf").onchange = (e) => { settings.largeFont = Boolean(e.target.checked); localStorage.setItem("ddl_lf", String(settings.largeFont)); applyAccessibilityCSS(); };
    document.getElementById("s-reset-keys").onclick = () => {
      settings.keys = { ...DEFAULT_KEYS };
      localStorage.setItem("ddl_keys", JSON.stringify(settings.keys));
      this.listeningAction = null;
      document.getElementById("rebind-conflict").textContent = "";
      this.refreshKeyLabels();
      this.renderRebindGrid();
    };
    document.getElementById("s-back").onclick = onBack;
  }

  wireLeaderboardSave() {
    const saveBtn = document.getElementById("lb-save-btn");
    const nameIn = document.getElementById("lb-name-in");
    const statusEl = document.getElementById("lb-save-msg");
    if (!saveBtn || !nameIn) return;
    saveBtn.onclick = async () => {
      const raw = nameIn.value.trim();
      try {
        const res = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: raw, score: this.campaignScore, nights_won: this.nightsWon, seed: this.campaignSeed }),
        });
        const data = await res.json();
        if (!res.ok) { statusEl.textContent = `⚠ ${data.error || "Tên phải dài 3–12 ký tự"}`; return; }
        statusEl.style.color = "#FFE58A";
        statusEl.textContent = "✅ Đã lưu vào Bảng xếp hạng!";
        saveBtn.disabled = true;
      } catch (_) {
        statusEl.textContent = "⚠ Không thể lưu điểm.";
      }
    };
  }

  showResult(won, msg) {
    this.mode = "result";
    const saveBlock = !won
      ? `<div class="lb-input-row"><input id="lb-name-in" maxlength="12" placeholder="Nhập tên (3–12 ký tự)..." /><button class="btn" id="lb-save-btn">Lưu điểm</button></div><div class="conflict-msg" id="lb-save-msg"></div>`
      : "";
    this.showModal(`
      <h1>${won ? "🌅 Qua Đêm " + this.currentNight + "!" : "🌑 Đêm " + this.currentNight + " Thất Bại"}</h1>
      <p>${msg}</p>
      <div class="stats-box">
        <div>⭐ Điểm Đêm ${this.currentNight}: <strong>${this.score}</strong></div>
        <div>🏆 Tổng điểm chiến dịch: <strong>${this.campaignScore}</strong> (${this.nightsWon}/3 Đêm)</div>
      </div>
      ${saveBlock}
      <div class="btn-row">
        ${won ? `<button class="btn" id="r-next">➡ Sang Đêm ${this.currentNight + 1}</button>` : ""}
        <button class="btn ${won ? "secondary" : ""}" id="r-retry">🔄 Chơi lại Đêm ${this.currentNight}</button>
        <button class="btn secondary" id="r-menu">🏠 Về menu</button>
      </div>
    `);
    this.wireLeaderboardSave();
    if (won) document.getElementById("r-next").onclick = () => this.showNightIntro(this.currentNight + 1);
    document.getElementById("r-retry").onclick = () => this.startNight(this.currentNight);
    document.getElementById("r-menu").onclick = () => this.showMainMenu();
  }

  showDawnScreen() {
    this.mode = "dawn";
    this.showModal(`
      <h1>🌅 Bình Minh Trên Biển Mây!</h1>
      <p>Chúc mừng! Mây đã giữ sáng cả 3 hòn đảo tới bình minh!</p>
      <div class="stats-box">
        <div>⭐ Điểm Đêm 3: <strong>${this.score}</strong></div>
        <div>🏆 Tổng điểm toàn hành trình: <strong>${this.campaignScore}</strong> (${this.nightsWon}/3 Đêm)</div>
      </div>
      <div class="lb-input-row"><input id="lb-name-in" maxlength="12" placeholder="Nhập tên (3–12 ký tự)..." /><button class="btn" id="lb-save-btn">Lưu điểm</button></div>
      <div class="conflict-msg" id="lb-save-msg"></div>
      <div class="btn-row">
        <button class="btn" id="d-lb">🏆 Xem Bảng xếp hạng</button>
        <button class="btn secondary" id="d-menu">🏠 Về menu chính</button>
      </div>
    `);
    this.wireLeaderboardSave();
    document.getElementById("d-lb").onclick = () => this.showLeaderboard(() => this.showMainMenu());
    document.getElementById("d-menu").onclick = () => this.showMainMenu();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;

    if (this.mode === "bench") {
      this.stepBenchmark(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      document.getElementById("fps-badge").textContent = `${Math.round(this.fpsFrames / this.fpsTimer)} FPS`;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }

    if (this.mode === "playing") {
      this.accumulator += dt;
      while (this.accumulator >= DT && this.mode === "playing") {
        this.stepSim();
        this.accumulator -= DT;
      }
      this.updateHUD(dt);
      this.syncVisuals(dt);
    } else if (this.mode === "menu" || this.mode === "intro") {
      this.elapsed += dt;
      this.cloudBank.rotation.y = this.elapsed * 0.008;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

fetch("/game.contract.json")
  .then((r) => (r.ok ? r.json() : {}))
  .then((d) => new GameApp(d.tuning || {}))
  .catch(() => new GameApp({}));
