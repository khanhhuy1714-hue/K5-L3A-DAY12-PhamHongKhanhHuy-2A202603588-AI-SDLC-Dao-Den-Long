import * as THREE from "three";

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
  shadeRimCB: 0x00B3FF, // Colorblind mode (Ticket-03)
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
const LOW_FUEL_60 = 1800; // 30 * 60

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

// Persistent settings (including Colorblind mode)
const settings = {
  volume: Number(localStorage.getItem("ddl_vol") ?? 0.7),
  sens: Number(localStorage.getItem("ddl_sens") ?? 1.0),
  colorblind: localStorage.getItem("ddl_cb") === "true",
};
function applyColorblindCSS() {
  document.body.classList.toggle("colorblind", settings.colorblind);
}
applyColorblindCSS();

function shadeAccentHex() {
  return settings.colorblind ? COLORS.shadeRimCB : COLORS.shadeRim;
}
function shadeAccentCSS() {
  return settings.colorblind ? "#00B3FF" : "#7A3CFF";
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
  }
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
  updateVolume() {
    if (this.ambientGain) this.ambientGain.gain.value = 0.022 * settings.volume;
  }
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

const FLAME_SVG = `<svg viewBox="0 0 24 28" width="20" height="24"><path d="M12 1C12 1 4 9 4 16.5C4 21.8 7.6 26 12 26C16.4 26 20 21.8 20 16.5C20 12.2 17.2 8.2 15.8 6.5C15.5 9.2 13.8 10.6 13.2 10.8C14.5 7.5 13.8 3.5 12 1Z" fill="#FFB347"/><path d="M12 10C12 10 8.2 14.5 8.2 18.2C8.2 21 9.9 23.2 12 23.2C14.1 23.2 15.8 21 15.8 18.2C15.8 14.5 12 10 12 10Z" fill="#FFF6C2"/></svg>`;

class GameApp {
  constructor(tuning) {
    this.tuning = tuning;
    this.keys = new Set();
    this.camYaw = 0;
    this.dragging = false;
    this.lastMouseX = 0;
    this.mode = "menu";
    this.currentNight = 1;
    this.campaignScore = 0;
    this.accumulator = 0;
    this.lastFrame = performance.now();
    this.elapsed = 0;
    this.lastCountdownSec = 11;
    this.windWarnPlayed = false;

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

    this.buildHUDWidgets();
    this.initThree();
    this.initInput();
    this.showMainMenu();
    this.loop();
  }

  get capacity() {
    return Math.min(20, 10 + 2 * (this.successfulLights || 0));
  }

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

  initThree() {
    const container = document.getElementById("canvas-container");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.0105);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 280);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    const puffMat = new THREE.MeshStandardMaterial({
      color: COLORS.cloudSea,
      emissive: 0x0a1f2d,
      roughness: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 42; i++) {
      const ang = (i / 42) * Math.PI * 2;
      const dist = 52 + (i % 5) * 16;
      const p = new THREE.Mesh(puffGeo, puffMat);
      const s = 7 + (i % 4) * 3.2;
      p.scale.set(s * 1.7, s * 0.42, s * 1.25);
      p.position.set(Math.cos(ang) * dist + 15, -7.5 - (i % 3) * 1.5, Math.sin(ang) * dist);
      this.cloudBank.add(p);
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
    for (let i = 0; i < 380; i++) {
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

    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
    );
    moonHalo.position.copy(moonOrb.position);
    moonHalo.scale.set(34, 34, 1);
    this.scene.add(moonHalo);
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

    const hem = new THREE.Mesh(
      new THREE.TorusGeometry(0.47, 0.032, 8, 24),
      new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.35, roughness: 0.45 })
    );
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

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 16), new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.65 }));
    head.position.y = 1.42;
    head.castShadow = true;
    rig.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1426 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), eyeMat);
    eyeL.position.set(-0.09, 1.43, 0.23);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), eyeMat);
    eyeR.position.set(0.09, 1.43, 0.23);
    rig.add(eyeL, eyeR);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.265, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
      new THREE.MeshStandardMaterial({ color: 0x201828, roughness: 0.8 })
    );
    hair.position.set(0, 1.44, -0.02);
    rig.add(hair);

    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 1.66, 0);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.42, 28), new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.82 }));
    hat.castShadow = true;
    hatGroup.add(hat);
    const hatRim = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.024, 8, 32), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
    hatRim.rotation.x = Math.PI / 2;
    hatRim.position.y = -0.2;
    hatGroup.add(hatRim);

    const lanternPivot = new THREE.Group();
    lanternPivot.position.set(0, -0.18, 0.64);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 6), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
    cord.position.y = -0.12;
    lanternPivot.add(cord);
    const miniGlass = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.115, 1),
      new THREE.MeshStandardMaterial({ color: COLORS.lanternCore, emissive: COLORS.lanternLit, emissiveIntensity: 2.2 })
    );
    miniGlass.scale.set(0.9, 1.25, 0.9);
    miniGlass.position.y = -0.28;
    lanternPivot.add(miniGlass);
    const miniGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    miniGlow.position.y = -0.28;
    miniGlow.scale.set(0.85, 0.85, 1);
    lanternPivot.add(miniGlow);
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
      trunk.castShadow = true;
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
      trunk.castShadow = true;
      g.add(trunk);
      for (let tier = 0; tier < 3; tier++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry((1.45 - tier * 0.32) * scale, 1.55 * scale, 7), leafMat);
        cone.position.y = (2.1 + tier * 0.95) * scale;
        cone.castShadow = true;
        g.add(cone);
      }
    }
    return g;
  }

  buildTerrain(night) {
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
    };

    if (night === 1) {
      addIslandDisc(0, 0, 40, false);
      const plaza = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 0.14, 24), sandMat);
      plaza.position.y = -0.02;
      plaza.receiveShadow = true;
      this.worldGroup.add(plaza);
    } else if (night === 2) {
      addIslandDisc(0, 0, 28, true);
      addIslandDisc(70, 0, 28, true);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.35, 4), woodMat);
      deck.position.set(35, -0.18, 0);
      deck.receiveShadow = true;
      this.worldGroup.add(deck);
      for (let x = 26.5; x <= 43.5; x += 1.2) {
        const slat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.9, 6), sandMat);
        slat.rotation.x = Math.PI / 2;
        slat.position.set(x, 0.02, 0);
        this.worldGroup.add(slat);
      }
    } else {
      addIslandDisc(0, 0, 45, false);
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 24, 0, Math.PI, false);
      shape.absarc(0, 0, 12, Math.PI, 0, true);
      const t1Geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
      t1Geo.rotateX(Math.PI / 2);
      const t1 = new THREE.Mesh(t1Geo, sandMat);
      t1.position.y = 3;
      t1.receiveShadow = true;
      this.worldGroup.add(t1);

      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.3, 6, 32), grassMat);
      t2.position.y = 3;
      t2.receiveShadow = true;
      this.worldGroup.add(t2);

      const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 8.0, 16), woodMat);
      towerBase.position.y = 10.0;
      towerBase.castShadow = true;
      this.worldGroup.add(towerBase);
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 8), new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.7 }));
      towerRoof.position.y = 14.8;
      this.worldGroup.add(towerRoof);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.5, 14), new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.65, roughness: 0.3 }));
      bell.position.y = 12.2;
      this.worldGroup.add(bell);

      for (const deg of [30, 150]) {
        const rad = (deg * Math.PI) / 180;
        const len = Math.hypot(6, 3);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, 3), woodMat);
        ramp.position.set(Math.cos(rad) * 27, 1.5, Math.sin(rad) * 27);
        ramp.rotation.y = -rad;
        ramp.rotation.z = Math.atan2(3, 6);
        ramp.receiveShadow = true;
        this.worldGroup.add(ramp);
      }
    }

    this.padRings = [];
    for (const pad of this.def.jumpPads) {
      const pg = new THREE.Group();
      pg.position.set(pad.pos[0], pad.pos[1], pad.pos[2]);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r * 1.15, 0.25, 24), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
      base.position.y = 0.12;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(pad.r * 0.82, pad.r * 0.82, 0.28, 24), new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.lanternLit, emissiveIntensity: 1.1 }));
      top.position.y = 0.14;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(pad.r * 0.9, 0.06, 8, 24), new THREE.MeshBasicMaterial({ color: COLORS.moteCore, transparent: true, opacity: 0.75 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.4;
      pg.add(base, top, ring);
      this.worldGroup.add(pg);
      this.padRings.push(ring);
    }
  }

  createGrandLantern(l) {
    const g = new THREE.Group();
    g.position.set(l.pos[0], l.pos[1], l.pos[2]);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.0, 0.55, 8), new THREE.MeshStandardMaterial({ color: COLORS.lanternUnlit }));
    base.position.y = 0.27;
    base.castShadow = true;
    g.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 2.4, 8), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
    pillar.position.y = 1.65;
    pillar.castShadow = true;
    g.add(pillar);

    // Paper lantern chamber (squashed 20% + visible torn patches when unlit — Ticket-03 accessibility)
    const chamberGroup = new THREE.Group();
    chamberGroup.position.y = 3.25;
    const coreMat = new THREE.MeshStandardMaterial({
      color: COLORS.lanternUnlit,
      emissive: COLORS.lanternLit,
      emissiveIntensity: 0.06,
      roughness: 0.35,
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.46, 1.15, 6), coreMat);
    chamberGroup.add(core);

    // Torn paper jagged cuts visible when unlit
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
    chamberGroup.scale.set(1, 0.8, 1); // Starts unlit => squashed 20%
    g.add(chamberGroup);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.65, 6), new THREE.MeshStandardMaterial({ color: COLORS.wood }));
    roof.position.y = 4.15;
    g.add(roof);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.5 }));
    finial.position.y = 4.55;
    g.add(finial);

    // Floating 3D Fuel Bar above lantern (visible when lit)
    const fuelBarGroup = new THREE.Group();
    fuelBarGroup.position.y = 5.25;
    fuelBarGroup.visible = false;
    const fbBg = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.3), new THREE.MeshBasicMaterial({ color: 0x0E1430, side: THREE.DoubleSide }));
    const fbFillMat = new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, side: THREE.DoubleSide });
    const fbFill = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 0.18), fbFillMat);
    fbFill.position.z = 0.02;
    fuelBarGroup.add(fbBg, fbFill);
    g.add(fuelBarGroup);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending })
    );
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
      ...l,
      pos: [...l.pos],
      lit: false,
      everLit: false,
      relitCount: 0,
      deposited: 0,
      fuel60: 0,
      mesh: g,
      chamberGroup,
      tearGroup,
      coreMat,
      pLight,
      safeRing,
      halo,
      fuelBarGroup,
      fbFill,
      fbFillMat,
    };
  }

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

    // Drain beam line (visible when state === "drain")
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
    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.drifter,
      emissive: 0x526b82,
      emissiveIntensity: 0.65,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
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

  spawnBurst(pos, colorHex, count = 14, speed = 4.5) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
    const geo = new THREE.SphereGeometry(0.11, 6, 6);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat.clone());
      m.position.set(pos[0], pos[1] + 0.6, pos[2]);
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.fxGroup.add(m);
      this.particles.push({
        mesh: m,
        vx: Math.cos(a) * spd,
        vy: 1.8 + Math.random() * 3.8,
        vz: Math.sin(a) * spd,
        age: 0,
        maxAge: 0.45 + Math.random() * 0.35,
      });
    }
  }

  spawnDashAfterimage() {
    const ghost = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.2, 10),
      new THREE.MeshBasicMaterial({ color: this.charmTicks > 0 ? COLORS.mayScarf : COLORS.moteHalo, transparent: true, opacity: 0.45 })
    );
    ghost.position.set(this.playerPos[0], this.playerPos[1] + 0.65, this.playerPos[2]);
    this.fxGroup.add(ghost);
    this.afterimages.push({ mesh: ghost, age: 0, maxAge: 0.22 });
  }

  triggerHitVignette() {
    this.shakeTime = 0.25;
    this.shakeMag = 0.45;
    const v = document.getElementById("vignette");
    v.classList.add("flash");
    setTimeout(() => v.classList.remove("flash"), 200);
  }

  triggerSafePushAround(lantern) {
    for (const s of this.shades) {
      if (s.state === "drain" && s.targetLanternId === lantern.id) {
        s.state = "wander";
        s.targetLanternId = null;
      }
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
    this.buildTerrain(night);
    this.entityGroup.clear();
    this.fxGroup.clear();
    this.pulseWaves = [];
    this.particles = [];
    this.afterimages = [];
    this.windStreaks = [];

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
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.72, 0.09), new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.5 }));
      const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.goldGlowTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }));
      aura.scale.set(1.6, 1.6, 1);
      g.add(border, paper, aura);
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
      pos: [...pt],
      state: "wander",
      stateTicks: 0,
      pushTicks: 0,
      pushDir: [1, 0],
      recoilDir: [1, 0],
      safePushTicks: 0,
      safePushTarget: null,
      targetLanternId: null,
      wanderAng: Math.random() * 6.28,
      vis,
    });
    sfx.shadeSpawn();
  }

  spawnDrifter() {
    const pt = this.def.shadePoints[Math.floor(Math.random() * this.def.shadePoints.length)];
    const vis = this.createDrifterVisual(pt);
    this.drifters.push({
      pos: [pt[0], pt[1] + 1.3, pt[2]],
      state: "idle",
      stolen: 0,
      hasStolen: false,
      fleeTicks: 0,
      fleeDir: [1, 0],
      ang: Math.random() * 6.28,
      vis,
    });
  }

  initInput() {
    window.addEventListener("keydown", (e) => {
      const code = e.code;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) e.preventDefault();
      if ((code === "Escape" || code === "KeyP") && !e.repeat) {
        if (this.mode === "playing") this.showPauseMenu();
        else if (this.mode === "paused") { this.hideModal(); this.mode = "playing"; }
        return;
      }
      if (this.mode !== "playing") return;
      if (code === "Space" && !this.keys.has(code)) this.qJump = true;
      if (code === "KeyE" && !this.keys.has(code)) this.qInteract = true;
      if ((code === "ShiftLeft" || code === "ShiftRight") && !this.keys.has(code)) this.qDash = true;
      if ((code === "KeyF" || code === "KeyX") && !this.keys.has(code)) this.qPulse = true;
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

    // Step 2: Timers + Lantern Fuel Decay/Drain
    if (this.invulnTicks > 0) this.invulnTicks--;
    if (this.dashCdTicks > 0) this.dashCdTicks--;
    if (this.pulseCdTicks > 0) this.pulseCdTicks--;
    if (this.charmTicks > 0) this.charmTicks--;

    for (let i = this.motes.length - 1; i >= 0; i--) {
      if (this.motes[i].ttl !== null) {
        this.motes[i].ttl--;
        if (this.motes[i].ttl <= 0) {
          this.entityGroup.remove(this.motes[i].mesh);
          this.motes.splice(i, 1);
        }
      }
    }
    for (const c of this.charms) {
      if (!c.available && c.respawnTicks > 0) {
        c.respawnTicks--;
        if (c.respawnTicks === 0) { c.available = true; c.mesh.visible = true; }
      }
    }

    // Fuel decay & shade drain (fixed-point 1/60 units)
    let anyLanternChanged = false;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const drainers = this.shades.filter((s) => s.state === "drain" && s.targetLanternId === l.id);
      l.fuel60 -= 1 + 5 * drainers.length;
      if (l.fuel60 <= 0) {
        l.lit = false;
        l.fuel60 = 0;
        l.deposited = 0;
        l.everLit = true;
        anyLanternChanged = true;
        sfx.lanternOut();
        for (const s of drainers) {
          s.state = "wander";
          s.targetLanternId = null;
        }
      }
    }
    if (anyLanternChanged) this.updateAtmosphere();

    // Wind (Night 3)
    if (this.def.hasWind) {
      const rem = 1800 - (this.simTick % 1800);
      if (this.windTicks > 0) {
        this.windTicks--;
        if (this.windTicks === 0) { this.windActive = false; this.windWarnPlayed = false; }
      } else if (this.simTick > 0 && this.simTick % 1800 === 0) {
        this.windActive = true;
        this.windDirDeg = Math.random() * 360;
        this.windTicks = 300;
      } else if (rem <= 120 && !this.windWarnPlayed) {
        this.windWarnPlayed = true;
        sfx.windWarn();
      }
    }

    if (this.keys.has("KeyQ")) this.camYaw += 2.2 * DT;
    if (this.keys.has("KeyC")) this.camYaw -= 2.2 * DT;

    // Step 3: Move Mây
    const wasGrounded = this.grounded;
    if (this.fallWaitTicks > 0) {
      this.fallWaitTicks--;
      if (this.fallWaitTicks === 0) {
        this.playerPos = [...this.def.spawn];
        this.playerVel = [0, 0, 0];
        this.grounded = true;
        this.launchLocked = false;
        this.invulnTicks = 90;
      }
    } else {
      let mx = 0, mz = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) mz -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) mz += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
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
        this.spawnBurst(this.playerPos, COLORS.moteHalo, 8, 3.2);
      }
      this.qDash = false;

      if (this.dashTicks > 0) {
        this.playerVel[0] = this.dashDir[0] * 14.0;
        this.playerVel[1] = 0;
        this.playerVel[2] = this.dashDir[1] * 14.0;
        if (this.dashTicks % 3 === 0) this.spawnDashAfterimage();
        this.dashTicks--;
      } else {
        if (!this.launchLocked) {
          const spd = this.charmTicks > 0 ? 7.2 : 6.0;
          this.playerVel[0] = wx * spd;
          this.playerVel[2] = wz * spd;
        }
        if (this.qJump && this.grounded) {
          this.playerVel[1] = JUMP_VEL;
          this.grounded = false;
          this.squashY = 1.24;
          sfx.jump();
          this.spawnBurst(this.playerPos, COLORS.sand, 6, 2.2);
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
        nx = ox; nz = oz;
        gy = groundHeightAt(this.currentNight, nx, nz);
      }
      if (gy !== null && ny <= gy && oy >= gy - 0.4 && this.playerVel[1] <= 0) {
        ny = gy; this.playerVel[1] = 0; this.grounded = true; this.launchLocked = false;
        if (!wasGrounded) this.squashY = 0.78;
      } else if (gy !== null && this.grounded && Math.abs(ny - gy) <= 0.4) {
        ny = gy; this.playerVel[1] = 0; this.grounded = true;
      } else {
        this.grounded = false;
      }
      this.playerPos = [nx, ny, nz];

      if (this.dashTicks === 0) {
        for (const pad of this.def.jumpPads) {
          if (Math.hypot(nx - pad.pos[0], nz - pad.pos[2]) <= pad.r && Math.abs(ny - pad.pos[1]) <= 0.5) {
            this.playerVel = [pad.dir[0] * pad.hspeed, pad.vy, pad.dir[1] * pad.hspeed];
            this.grounded = false;
            this.launchLocked = true;
            this.squashY = 1.3;
            sfx.jump();
            this.spawnBurst(pad.pos, COLORS.gold, 14, 4.5);
          }
        }
      }

      if (this.playerPos[1] < -10) {
        this.flames = Math.max(0, this.flames - 1);
        this.carried = 0;
        this.playerVel = [0, 0, 0];
        this.launchLocked = false;
        sfx.hit();
        this.triggerHitVignette();
        if (this.flames > 0) this.fallWaitTicks = 60;
      }
    }

    // Step 4: Pickup motes & charms (dynamic capacity)
    if (this.fallWaitTicks === 0 && this.flames > 0) {
      for (let i = this.motes.length - 1; i >= 0; i--) {
        const m = this.motes[i];
        if (
          this.carried < this.capacity &&
          m.spawnTick < this.simTick &&
          Math.hypot(this.playerPos[0] - m.pos[0], this.playerPos[2] - m.pos[2]) <= 1.0 &&
          Math.abs(this.playerPos[1] - m.pos[1]) <= 1.5
        ) {
          this.carried++;
          this.spawnBurst(m.pos, COLORS.moteCore, 8, 2.8);
          this.entityGroup.remove(m.mesh);
          this.motes.splice(i, 1);
          sfx.pickup(this.carried);
        }
      }
      for (const c of this.charms) {
        if (
          c.available &&
          Math.hypot(this.playerPos[0] - c.pos[0], this.playerPos[2] - c.pos[2]) <= 1.0 &&
          Math.abs(this.playerPos[1] - c.pos[1]) <= 1.5
        ) {
          c.available = false;
          c.respawnTicks = 2700;
          c.mesh.visible = false;
          this.charmTicks = 600;
          this.dashCdTicks = 0;
          this.spawnBurst(c.pos, COLORS.mayScarf, 16, 4.5);
          sfx.lanternLit();
        }
      }
    }

    // Step 5: Interact (light, relight, or refuel)
    let nearL = null, bestD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit && l.fuel60 >= FUEL_MAX_60) continue;
      const d = Math.hypot(this.playerPos[0] - l.pos[0], this.playerPos[2] - l.pos[2]);
      if (d <= 2.0 && (d < bestD || (Math.abs(d - bestD) < 1e-6 && nearL && l.id < nearL.id))) {
        bestD = d;
        nearL = l;
      }
    }
    const promptEl = document.getElementById("prompt");
    if (nearL && this.carried > 0) {
      promptEl.style.display = "block";
      if (!nearL.lit) {
        const cost = nearL.everLit ? 5 : 10;
        promptEl.textContent = nearL.everLit
          ? `E — Thắp lại đèn (${nearL.deposited}/${cost})`
          : `E — Nạp ánh sáng (${nearL.deposited}/${cost})`;
      } else {
        promptEl.textContent = `E — Châm dầu (${Math.floor(nearL.fuel60 / FUEL_SCALE)}/100)`;
      }
    } else {
      promptEl.style.display = "none";
    }

    if (this.qInteract && nearL && this.carried > 0) {
      if (!nearL.lit) {
        const cost = nearL.everLit ? 5 : 10;
        const amt = Math.min(this.carried, cost - nearL.deposited);
        if (amt > 0) {
          this.carried -= amt;
          nearL.deposited += amt;
          this.score += amt * 5;
          if (nearL.deposited >= cost) {
            const isRelight = nearL.everLit;
            nearL.lit = true;
            nearL.everLit = true;
            nearL.fuel60 = FUEL_MAX_60;
            if (isRelight) { nearL.relitCount++; this.score += 40; }
            else this.score += 100;
            this.successfulLights++;
            this.rebuildMoteSlots(this.capacity);
            this.triggerSafePushAround(nearL);
            sfx.lanternLit();
            this.spawnBurst([nearL.pos[0], nearL.pos[1] + 2.8, nearL.pos[2]], COLORS.lanternLit, 24, 5.5);
          } else {
            sfx.pickup(nearL.deposited);
          }
          this.updateAtmosphere();
        }
      } else {
        const missing60 = FUEL_MAX_60 - nearL.fuel60;
        const needed = Math.ceil(missing60 / 600);
        const used = Math.min(this.carried, needed);
        if (used > 0) {
          const wasLow = nearL.fuel60 < LOW_FUEL_60;
          this.carried -= used;
          nearL.fuel60 = Math.min(FUEL_MAX_60, nearL.fuel60 + used * 600);
          this.score += used * 5;
          if (wasLow && nearL.fuel60 >= LOW_FUEL_60) this.triggerSafePushAround(nearL);
          sfx.refuel();
          this.spawnBurst([nearL.pos[0], nearL.pos[1] + 2.8, nearL.pos[2]], COLORS.moteHalo, 14, 3.6);
          this.updateAtmosphere();
        }
      }
    }
    this.qInteract = false;

    // Step 6: Safe push updates
    for (const s of this.shades) {
      if (s.safePushTicks > 0 && s.safePushTarget) {
        const frac = 1 / s.safePushTicks;
        s.pos[0] += (s.safePushTarget[0] - s.pos[0]) * frac;
        s.pos[2] += (s.safePushTarget[1] - s.pos[2]) * frac;
        s.safePushTicks--;
        if (s.safePushTicks === 0) s.safePushTarget = null;
      }
    }

    // Step 7: Pulse (+15 for draining shade, +5 otherwise)
    if (this.qPulse && this.carried >= 3 && this.pulseCdTicks === 0) {
      this.carried -= 3;
      this.pulseCdTicks = 180;
      sfx.pulse();
      this.shakeTime = 0.14;
      this.shakeMag = 0.2;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.85, 48),
        new THREE.MeshBasicMaterial({ color: COLORS.moteHalo, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(this.playerPos[0], this.playerPos[1] + 0.2, this.playerPos[2]);
      this.fxGroup.add(ring);
      this.pulseWaves.push({ mesh: ring, age: 0 });
      this.spawnBurst(this.playerPos, COLORS.moteCore, 16, 6.0);

      const pc = [this.playerPos[0], this.playerPos[1] + 0.8, this.playerPos[2]];
      for (const s of this.shades) {
        const d3 = Math.hypot(pc[0] - s.pos[0], pc[1] - s.pos[1], pc[2] - s.pos[2]);
        if (d3 <= 5.0) {
          const wasDraining = s.state === "drain";
          s.state = "stunned";
          s.stateTicks = 120;
          s.pushTicks = 15;
          s.targetLanternId = null;
          const dx = s.pos[0] - this.playerPos[0], dz = s.pos[2] - this.playerPos[2];
          const dm = Math.hypot(dx, dz);
          s.pushDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
          this.score += wasDraining ? 15 : 5;
        }
      }
      for (const dr of this.drifters) {
        if (dr.state === "removed") continue;
        const d3 = Math.hypot(pc[0] - dr.pos[0], pc[1] - dr.pos[1], pc[2] - dr.pos[2]);
        if (d3 <= 5.0) {
          const dx = dr.pos[0] - this.playerPos[0], dz = dr.pos[2] - this.playerPos[2];
          const dm = Math.hypot(dx, dz);
          dr.fleeDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
          if (dr.state === "chase") { dr.state = "flee"; dr.fleeTicks = 240; }
          else if (dr.state === "flee" && dr.stolen > 0) {
            for (let k = 0; k < dr.stolen; k++) this.addMote([dr.pos[0], 0, dr.pos[2]], "dropped", 480);
            dr.stolen = 0; dr.fleeTicks = 120;
          }
        }
      }
    }
    this.qPulse = false;

    // Step 8: Move Shades (with drain AI) & Drifters
    for (const s of this.shades) {
      if (s.safePushTicks > 0) continue;
      if (s.stateTicks > 0) {
        s.stateTicks--;
        if (s.stateTicks === 0 && (s.state === "stunned" || s.state === "recoil")) s.state = "wander";
      }
      if (s.state === "stunned") {
        if (s.pushTicks > 0) {
          const nx = s.pos[0] + s.pushDir[0] * (4 / 15), nz = s.pos[2] + s.pushDir[1] * (4 / 15);
          if (groundHeightAt(this.currentNight, nx, nz) !== null && !isBlocked(this.currentNight, nx, s.pos[1], nz)) {
            s.pos[0] = nx; s.pos[2] = nz;
          }
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
        else if (!tgt || !tgt.lit || tgt.fuel60 >= LOW_FUEL_60 || Math.hypot(s.pos[0] - tgt.pos[0], s.pos[2] - tgt.pos[2]) > 2.0) {
          s.state = "wander"; s.targetLanternId = null;
        } else continue;
      }

      if (s.state === "wander" && dp <= 12) { s.state = "chase"; s.targetLanternId = null; }
      else if (s.state === "chase" && dp > 18) s.state = "wander";

      let nx = s.pos[0], nz = s.pos[2];
      if (s.state === "chase" && dp > 1e-4) {
        const mv = Math.min(this.def.shadeSpeed * DT, dp);
        nx += ((this.playerPos[0] - s.pos[0]) / dp) * mv;
        nz += ((this.playerPos[2] - s.pos[2]) / dp) * mv;
      } else {
        // Wander seeks weak lit lantern (fuel < 30) first, else nearest unlit lantern
        const weak = this.lanterns
          .filter((l) => l.lit && l.fuel60 < LOW_FUEL_60)
          .sort((a, b) => Math.hypot(s.pos[0] - a.pos[0], s.pos[2] - a.pos[2]) - Math.hypot(s.pos[0] - b.pos[0], s.pos[2] - b.pos[2]) || a.id.localeCompare(b.id));
        if (weak.length) {
          const tgt = weak[0];
          const dl = Math.hypot(tgt.pos[0] - s.pos[0], tgt.pos[2] - s.pos[2]);
          if (dl <= 2.0) { s.state = "drain"; s.targetLanternId = tgt.id; continue; }
          const mv = Math.min(this.def.shadeSpeed * DT, dl);
          nx += ((tgt.pos[0] - s.pos[0]) / dl) * mv;
          nz += ((tgt.pos[2] - s.pos[2]) / dl) * mv;
          if (Math.hypot(tgt.pos[0] - nx, tgt.pos[2] - nz) <= 2.0) { s.state = "drain"; s.targetLanternId = tgt.id; }
        } else {
          const unlit = this.lanterns
            .filter((l) => !l.lit)
            .sort((a, b) => Math.hypot(s.pos[0] - a.pos[0], s.pos[2] - a.pos[2]) - Math.hypot(s.pos[0] - b.pos[0], s.pos[2] - b.pos[2]) || a.id.localeCompare(b.id));
          if (unlit.length) {
            const tgt = unlit[0];
            const dl = Math.hypot(tgt.pos[0] - s.pos[0], tgt.pos[2] - s.pos[2]);
            if (dl > 2.5) {
              const mv = Math.min(this.def.shadeSpeed * 0.55 * DT, dl - 2.0);
              nx += ((tgt.pos[0] - s.pos[0]) / dl) * mv;
              nz += ((tgt.pos[2] - s.pos[2]) / dl) * mv;
            }
          } else {
            s.wanderAng += 0.4 * DT;
            nx += Math.cos(s.wanderAng) * this.def.shadeSpeed * 0.45 * DT;
            nz += Math.sin(s.wanderAng) * this.def.shadeSpeed * 0.45 * DT;
          }
        }
      }

      const gy = groundHeightAt(this.currentNight, nx, nz);
      if (gy !== null && !isBlocked(this.currentNight, nx, s.pos[1], nz)) s.pos = [nx, gy, nz];
      else s.wanderAng += 2.2;

      for (const l of this.lanterns) {
        if (!l.lit || l.fuel60 < LOW_FUEL_60) continue;
        const dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2], d = Math.hypot(dx, dz);
        if (d < 6.0) {
          const ux = d > 1e-5 ? dx / d : 1, uz = d > 1e-5 ? dz / d : 0;
          s.pos[0] = l.pos[0] + ux * 6.0; s.pos[2] = l.pos[2] + uz * 6.0;
        }
      }
    }

    for (const dr of this.drifters) {
      if (dr.state === "removed") continue;
      if (dr.state === "flee") {
        dr.pos[0] += dr.fleeDir[0] * 7 * DT;
        dr.pos[2] += dr.fleeDir[1] * 7 * DT;
        dr.fleeTicks--;
        if (dr.fleeTicks <= 0) { dr.state = "removed"; dr.vis.g.visible = false; }
        continue;
      }
      const dp = Math.hypot(this.playerPos[0] - dr.pos[0], this.playerPos[2] - dr.pos[2]);
      if (dr.state === "idle") {
        if (this.carried >= 5 && dp <= 15) dr.state = "chase";
        else { dr.ang += 0.6 * DT; dr.pos[0] += Math.cos(dr.ang) * 2 * DT; dr.pos[2] += Math.sin(dr.ang) * 2 * DT; }
      } else if (dr.state === "chase") {
        if (this.carried < 5 || dp > 15) dr.state = "idle";
        else if (dp > 1e-4) {
          dr.pos[0] += ((this.playerPos[0] - dr.pos[0]) / dp) * 7 * DT;
          dr.pos[2] += ((this.playerPos[2] - dr.pos[2]) / dp) * 7 * DT;
        }
      }
      if (dr.state === "chase" && !dr.hasStolen && dp <= 1.2 && this.fallWaitTicks === 0) {
        const amt = Math.min(3, this.carried);
        this.carried -= amt; dr.stolen = amt; dr.hasStolen = true; dr.state = "flee"; dr.fleeTicks = 240;
        const dx = dr.pos[0] - this.playerPos[0], dz = dr.pos[2] - this.playerPos[2], dm = Math.hypot(dx, dz);
        dr.fleeDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
        this.spawnBurst(this.playerPos, COLORS.drifter, 10, 4.0);
        sfx.hit();
      }
    }

    // Step 9: Shade hit player
    if (this.fallWaitTicks === 0 && this.invulnTicks === 0 && this.flames > 0) {
      for (const s of this.shades) {
        if (s.safePushTicks > 0 || (s.state !== "wander" && s.state !== "chase" && s.state !== "drain")) continue;
        if (Math.hypot(this.playerPos[0] - s.pos[0], this.playerPos[2] - s.pos[2]) <= 1.0 && Math.abs(this.playerPos[1] - s.pos[1]) <= 1.5) {
          this.flames = Math.max(0, this.flames - 1);
          this.invulnTicks = 90;
          const dropped = Math.floor(this.carried / 2);
          this.carried -= dropped;
          for (let k = 0; k < dropped; k++) {
            const a = Math.random() * 6.28, r = 1.5 + Math.random();
            this.addMote([this.playerPos[0] + Math.cos(a) * r, this.playerPos[1], this.playerPos[2] + Math.sin(a) * r], "dropped", 480);
          }
          const dx = s.pos[0] - this.playerPos[0], dz = s.pos[2] - this.playerPos[2], dm = Math.hypot(dx, dz);
          s.recoilDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
          s.state = "recoil"; s.stateTicks = 60; s.targetLanternId = null;
          this.spawnBurst(this.playerPos, shadeAccentHex(), 14, 4.5);
          this.triggerHitVignette();
          sfx.hit();
          break;
        }
      }
    }

    // Step 10: Spawns
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

    // Step 11 (Ticket-03): Win/Lose (Dawn Survival — NO early win!)
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
        sfx.win();
        if (this.currentNight === 3) this.showDawnScreen();
        else this.showResult(true, `Bình minh đã về! Bạn giữ sáng được ${litList.length}/${this.lanterns.length} Đèn Lồng trên ${this.def.name}.`);
      } else {
        sfx.lose();
        this.showResult(false, `Bình minh đến nhưng chỉ có ${litList.length}/${this.lanterns.length} đèn sáng (cần tối thiểu ${needed}).`);
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
        l.chamberGroup.scale.set(1, 1.0, 1);
        l.tearGroup.visible = false;
        l.coreMat.color.setHex(COLORS.lanternCore);
        l.fuelBarGroup.visible = true;
      } else {
        l.chamberGroup.scale.set(1, 0.8, 1); // Squashed 20% when unlit (Ticket-03)
        l.tearGroup.visible = true;          // Torn paper cuts visible when unlit
        const cost = l.everLit ? 5 : 10;
        const r = l.deposited / cost;
        l.coreMat.color.setHex(COLORS.lanternUnlit);
        l.coreMat.emissiveIntensity = 0.06 + r * 1.0;
        l.pLight.intensity = r * 0.8;
        l.safeRing.material.opacity = 0;
        l.halo.material.opacity = r * 0.22;
        l.fuelBarGroup.visible = false;
      }
    }
  }

  drawMinimap() {
    const ctx = this.minimapCtx;
    const w = 132, h = 132, cx = 66, cy = 66;
    ctx.clearRect(0, 0, w, h);

    const scale = this.currentNight === 2 ? 1.05 : 1.28;
    const toMap = (x, z) => [cx + (x - this.playerPos[0]) * scale, cy + (z - this.playerPos[2]) * scale];

    ctx.fillStyle = "rgba(47, 93, 80, 0.55)";
    ctx.strokeStyle = "rgba(201, 180, 138, 0.65)";
    ctx.lineWidth = 1.5;
    if (this.currentNight === 1) {
      const [ix, iy] = toMap(0, 0);
      ctx.beginPath(); ctx.arc(ix, iy, 40 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (this.currentNight === 2) {
      for (const ox of [0, 70]) {
        const [ix, iy] = toMap(ox, 0);
        ctx.beginPath(); ctx.arc(ix, iy, 28 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      const [bx, by] = toMap(26, -2);
      ctx.fillStyle = "rgba(107, 74, 47, 0.85)";
      ctx.fillRect(bx, by, 18 * scale, 4 * scale);
    } else {
      const [ix, iy] = toMap(0, 0);
      ctx.beginPath(); ctx.arc(ix, iy, 45 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(ix, iy, 8 * scale, 0, Math.PI * 2); ctx.stroke();
    }

    for (const l of this.lanterns) {
      const [lx, ly] = toMap(l.pos[0], l.pos[2]);
      const lowFuel = l.lit && l.fuel60 < LOW_FUEL_60;
      ctx.fillStyle = !l.lit ? "#5B5F6E" : (lowFuel ? (settings.colorblind ? "#FFFFFF" : "#FF5A5F") : "#FFB347");
      ctx.strokeStyle = "#FFE9B0";
      ctx.beginPath(); ctx.arc(lx, ly, lowFuel ? 4.8 : 4, 0, Math.PI * 2); ctx.fill();
      if (!l.lit) ctx.stroke();
    }

    for (const s of this.shades) {
      const [sx, sy] = toMap(s.pos[0], s.pos[2]);
      ctx.fillStyle = s.state === "stunned" ? "#3A3450" : shadeAccentCSS();
      ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    for (const dr of this.drifters) {
      if (dr.state === "removed") continue;
      const [dx, dy] = toMap(dr.pos[0], dr.pos[2]);
      ctx.fillStyle = "#8FA3B8";
      ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "#F5F1E6";
    ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#C8102E";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + this.facing[0] * 9, cy + this.facing[1] * 9); ctx.stroke();
  }

  updateHUD() {
    for (let i = 0; i < 3; i++) this.flameEls[i].classList.toggle("lost", i >= this.flames);
    const lit = this.lanterns.filter((l) => l.lit).length;
    const needed = Math.ceil(0.6 * this.lanterns.length);
    const lEl = document.getElementById("val-lanterns");
    lEl.textContent = `${lit}/${this.lanterns.length} (≥${needed})`;
    lEl.classList.toggle("warn", lit < needed);
    document.getElementById("val-score").textContent = String(this.score);

    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    const clk = document.getElementById("val-clock");
    const isDangerClock = this.timeLeft <= 30;
    clk.textContent = `${isDangerClock && settings.colorblind ? "⚠ " : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    clk.classList.toggle("danger", isDangerClock);

    // Status banner (Wind or Draining / Low fuel warning)
    const banner = document.getElementById("status-banner");
    const drainingCount = this.shades.filter((s) => s.state === "drain").length;
    const lowCount = this.lanterns.filter((l) => l.lit && l.fuel60 < LOW_FUEL_60).length;
    if (drainingCount > 0) {
      banner.style.display = "block";
      banner.textContent = `⚠ Bóng Mực đang hút dầu đèn!`;
    } else if (this.def.hasWind && this.windActive) {
      banner.style.display = "block";
      banner.textContent = "💨 Gió mạnh đang thổi!";
    } else if (this.def.hasWind && (1800 - (this.simTick % 1800)) <= 120) {
      banner.style.display = "block";
      banner.textContent = "🍃 Gió mạnh sắp nổi!";
    } else if (lowCount > 0) {
      banner.style.display = "block";
      banner.textContent = `⚠ ${lowCount} đèn sắp cạn dầu (<30%)!`;
    } else {
      banner.style.display = "none";
    }

    const cap = this.capacity;
    this.rebuildMoteSlots(cap);
    for (let i = 0; i < cap; i++) this.slotEls[i].classList.toggle("filled", i < this.carried);
    document.getElementById("mote-count").textContent = `${this.carried}/${cap}`;

    const charmEl = document.getElementById("charm-badge");
    if (this.charmTicks > 0) {
      charmEl.style.display = "block";
      charmEl.textContent = `🧧 Bùa Gió: ${(this.charmTicks / 60).toFixed(1)}s`;
    } else charmEl.style.display = "none";

    const cdDash = document.getElementById("cd-dash");
    const cardDash = document.getElementById("card-dash");
    const barDash = document.getElementById("bar-dash");
    if (this.charmTicks > 0) {
      cdDash.textContent = "0s (Bùa)"; cdDash.className = "cd"; cardDash.classList.add("ready"); barDash.style.width = "100%";
    } else if (this.dashCdTicks > 0) {
      cdDash.textContent = `${(this.dashCdTicks / 60).toFixed(1)}s`; cdDash.className = "cd dim"; cardDash.classList.remove("ready");
      barDash.style.width = `${((90 - this.dashCdTicks) / 90) * 100}%`;
    } else {
      cdDash.textContent = "Sẵn sàng"; cdDash.className = "cd"; cardDash.classList.add("ready"); barDash.style.width = "100%";
    }

    const cdPulse = document.getElementById("cd-pulse");
    const cardPulse = document.getElementById("card-pulse");
    const barPulse = document.getElementById("bar-pulse");
    if (this.pulseCdTicks > 0) {
      cdPulse.textContent = `${(this.pulseCdTicks / 60).toFixed(1)}s`; cdPulse.className = "cd dim"; cardPulse.classList.remove("ready");
      barPulse.style.width = `${((180 - this.pulseCdTicks) / 180) * 100}%`;
    } else if (this.carried < 3) {
      cdPulse.textContent = "Cần 3"; cdPulse.className = "cd dim"; cardPulse.classList.remove("ready");
      barPulse.style.width = `${(this.carried / 3) * 100}%`;
    } else {
      cdPulse.textContent = "Sẵn sàng"; cdPulse.className = "cd"; cardPulse.classList.add("ready"); barPulse.style.width = "100%";
    }

    // Off-screen arrow: prioritize weak lit lantern (<30), else nearest unlit lantern
    const arrow = document.getElementById("lantern-arrow");
    let targetL = null, minD = Infinity;
    const priorityList = this.lanterns.filter((l) => l.lit && l.fuel60 < LOW_FUEL_60);
    const searchList = priorityList.length ? priorityList : this.lanterns.filter((l) => !l.lit);
    for (const l of searchList) {
      const d = Math.hypot(l.pos[0] - this.playerPos[0], l.pos[2] - this.playerPos[2]);
      if (d < minD) { minD = d; targetL = l; }
    }
    if (targetL) {
      const v = new THREE.Vector3(targetL.pos[0], targetL.pos[1] + 3.2, targetL.pos[2]).project(this.camera);
      const offscreen = v.z > 1 || Math.abs(v.x) > 0.9 || Math.abs(v.y) > 0.88;
      if (offscreen) {
        let sx = v.x, sy = v.y;
        if (v.z > 1) { sx = -sx; sy = -sy; }
        const ang = Math.atan2(-sy, sx);
        const cx = window.innerWidth / 2 + Math.cos(ang) * (window.innerWidth * 0.42);
        const cy = window.innerHeight / 2 + Math.sin(ang) * (window.innerHeight * 0.37);
        arrow.style.display = "flex";
        arrow.style.left = `${cx - 19}px`;
        arrow.style.top = `${cy - 19}px`;
        arrow.style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;
      } else arrow.style.display = "none";
    } else arrow.style.display = "none";

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
    const invSquash = 1 / Math.sqrt(this.squashY);

    this.playerMesh.position.set(this.playerPos[0], this.playerPos[1], this.playerPos[2]);
    this.playerMesh.rotation.y = this.visualYaw;
    this.playerMesh.visible = this.fallWaitTicks === 0 && (this.invulnTicks === 0 || Math.floor(this.elapsed * 16) % 2 === 0);

    const { rig, leftLeg, rightLeg, leftArm, rightArm, ribbonPivot, lanternPivot, orbitSparks } = this.mayParts;
    rig.scale.set(invSquash, this.squashY, invSquash);
    if (hSpeed > 0.4 && this.grounded) {
      const cycle = this.elapsed * (this.charmTicks > 0 ? 15 : 12);
      leftLeg.rotation.x = Math.sin(cycle) * 0.65;
      rightLeg.rotation.x = -Math.sin(cycle) * 0.65;
      leftArm.rotation.x = -Math.sin(cycle) * 0.5;
      rightArm.rotation.x = Math.sin(cycle) * 0.5;
      rig.position.y = Math.abs(Math.sin(cycle)) * 0.08;
      rig.rotation.x = this.dashTicks > 0 ? 0.34 : 0.1;
    } else {
      leftLeg.rotation.x *= 0.85;
      rightLeg.rotation.x *= 0.85;
      leftArm.rotation.x *= 0.85;
      rightArm.rotation.x *= 0.85;
      rig.position.y = Math.sin(this.elapsed * 3) * 0.025;
      rig.rotation.x = this.dashTicks > 0 ? 0.34 : 0;
    }
    ribbonPivot.rotation.x = Math.sin(this.elapsed * 10) * 0.18 + (hSpeed > 0.5 ? 0.42 : 0.06);
    ribbonPivot.rotation.y = Math.sin(this.elapsed * 7) * 0.22;
    lanternPivot.rotation.z = Math.sin(this.elapsed * 5) * 0.14;
    lanternPivot.rotation.x = -Math.min(0.45, hSpeed * 0.04);
    this.playerLight.intensity = 1.8 + this.carried * 0.15;

    for (let i = 0; i < 20; i++) {
      const sp = orbitSparks[i];
      if (i < this.carried) {
        sp.visible = true;
        const a = this.elapsed * 2.4 + (i / Math.max(1, this.carried)) * Math.PI * 2;
        sp.position.set(Math.cos(a) * 0.95, 1.05 + Math.sin(this.elapsed * 4 + i) * 0.24, Math.sin(a) * 0.95);
      } else sp.visible = false;
    }

    // Lantern 3D Fuel Bars + 1 Hz blink when fuel < 30 (Ticket-03)
    const blinkOn = Math.sin(this.elapsed * Math.PI * 2) > 0; // 1 Hz slow blink
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
        l.halo.material.opacity = blinkOn ? 0.55 : 0.15;
        l.fbFillMat.color.setHex(settings.colorblind ? 0xFFFFFF : 0xFF5A5F);
        l.fuelBarGroup.visible = blinkOn;
      } else {
        l.coreMat.emissiveIntensity = 2.4;
        l.pLight.intensity = 3.8;
        l.halo.material.opacity = 0.72;
        l.fbFillMat.color.setHex(COLORS.lanternLit);
        l.fuelBarGroup.visible = true;
      }
    }

    for (const m of this.motes) m.mesh.position.set(m.pos[0], m.pos[1] + 0.9 + Math.sin(this.elapsed * 3.4 + m.phase) * 0.24, m.pos[2]);
    for (const c of this.charms) if (c.available) {
      c.mesh.rotation.y = this.elapsed * 2.2;
      c.mesh.position.y = c.pos[1] + 1.05 + Math.sin(this.elapsed * 3.5) * 0.15;
    }
    for (const pr of this.padRings) {
      pr.position.y = 0.25 + ((this.elapsed * 1.4) % 1.0) * 1.1;
      pr.material.opacity = 1.0 - ((this.elapsed * 1.4) % 1.0);
    }

    // Shades & Drain Beams (live colorblind updates)
    const accent = shadeAccentHex();
    const glowTex = settings.colorblind ? this.cyanGlowTex : this.violetGlowTex;
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
      if (isStun) stunCrown.rotation.y = this.elapsed * 5.5;

      if (s.state === "drain" && s.targetLanternId) {
        const tgt = this.lanterns.find((l) => l.id === s.targetLanternId);
        if (tgt) {
          drainBeam.visible = true;
          beamMat.color.setHex(accent);
          const posAttr = drainBeam.geometry.attributes.position;
          posAttr.setXYZ(0, s.pos[0], s.pos[1] + 1.2, s.pos[2]);
          posAttr.setXYZ(1, tgt.pos[0], tgt.pos[1] + 3.25, tgt.pos[2]);
          posAttr.needsUpdate = true;
        } else drainBeam.visible = false;
      } else {
        drainBeam.visible = false;
      }
    }

    for (const dr of this.drifters) {
      if (dr.state === "removed") continue;
      dr.vis.g.position.set(dr.pos[0], dr.pos[1] + Math.sin(this.elapsed * 6) * 0.22, dr.pos[2]);
      dr.vis.g.rotation.y = Math.atan2(this.playerPos[0] - dr.pos[0], this.playerPos[2] - dr.pos[2]);
      dr.vis.segs.forEach((seg, idx) => { seg.position.x = Math.sin(this.elapsed * 9 - idx * 0.9) * 0.14; });
    }

    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const w = this.pulseWaves[i];
      w.age += dt;
      if (w.age >= 0.45) { this.fxGroup.remove(w.mesh); this.pulseWaves.splice(i, 1); }
      else { const p = w.age / 0.45; w.mesh.scale.setScalar(1 + p * 6.5); w.mesh.material.opacity = (1 - p) * 0.9; }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.maxAge) { this.fxGroup.remove(p.mesh); this.particles.splice(i, 1); }
      else {
        p.vy -= 8.0 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = 1 - p.age / p.maxAge;
      }
    }
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.age += dt;
      if (a.age >= a.maxAge) { this.fxGroup.remove(a.mesh); this.afterimages.splice(i, 1); }
      else a.mesh.material.opacity = 0.45 * (1 - a.age / a.maxAge);
    }

    if (this.def.hasWind && (this.windActive || (1800 - (this.simTick % 1800)) <= 120)) {
      if (this.windStreaks.length < 18 && Math.random() < 0.45) {
        const leaf = new THREE.Mesh(
          new THREE.PlaneGeometry(0.32, 0.14),
          new THREE.MeshBasicMaterial({ color: COLORS.sand, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        leaf.position.set(
          this.playerPos[0] + (Math.random() - 0.5) * 28,
          this.playerPos[1] + 0.8 + Math.random() * 6,
          this.playerPos[2] + (Math.random() - 0.5) * 28
        );
        this.fxGroup.add(leaf);
        this.windStreaks.push({ mesh: leaf, age: 0 });
      }
    }
    const wrad = (this.windDirDeg * Math.PI) / 180;
    for (let i = this.windStreaks.length - 1; i >= 0; i--) {
      const ws = this.windStreaks[i];
      ws.age += dt;
      if (ws.age > 1.2) { this.fxGroup.remove(ws.mesh); this.windStreaks.splice(i, 1); }
      else {
        ws.mesh.position.x += Math.cos(wrad) * 14 * dt;
        ws.mesh.position.z += Math.sin(wrad) * 14 * dt;
        ws.mesh.rotation.x += 5 * dt;
        ws.mesh.rotation.y += 4 * dt;
      }
    }

    this.cloudBank.rotation.y = this.elapsed * 0.008;

    const targetFov = this.dashTicks > 0 ? 66 : (this.charmTicks > 0 ? 61 : 58);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 12);
      this.camera.updateProjectionMatrix();
    }

    const tx = this.playerPos[0] + Math.sin(this.camYaw) * 12.2;
    const tz = this.playerPos[2] + Math.cos(this.camYaw) * 12.2;
    const ty = this.playerPos[1] + 7.4;
    this.camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.14);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeMag;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeMag;
    }
    this.camera.lookAt(this.playerPos[0], this.playerPos[1] + 1.35, this.playerPos[2]);
  }

  // Modal screens
  showModal(html) {
    document.getElementById("modal-content").innerHTML = html;
    document.getElementById("modal-overlay").classList.remove("hidden");
  }
  hideModal() { document.getElementById("modal-overlay").classList.add("hidden"); }

  showMainMenu() {
    this.mode = "menu";
    this.campaignScore = 0;
    this.showModal(`
      <h1>🏮 Đảo Đèn Lồng</h1>
      <h2>Đèn Cạn Dầu — Giữ Đảo Sáng Tới Bình Minh</h2>
      <p>Thắp sáng, châm dầu và bảo vệ các Đèn Lồng Lớn khỏi Bóng Mực hút dầu trên <strong>Đảo Bến</strong>, <strong>Đảo Cau</strong> và <strong>Đảo Chuông</strong>.</p>
      <div class="btn-row">
        <button class="btn" id="m-play">✨ Bắt đầu hành trình (Đêm 1)</button>
        <div class="btn-grid">
          <button class="btn secondary" id="m-n2">Đêm 2 · Đảo Cau</button>
          <button class="btn secondary" id="m-n3">Đêm 3 · Đảo Chuông</button>
        </div>
        <button class="btn secondary" id="m-set">⚙️ Cài đặt (Âm thanh / Mù màu)</button>
      </div>
    `);
    document.getElementById("m-play").onclick = () => this.showNightIntro(1);
    document.getElementById("m-n2").onclick = () => this.showNightIntro(2);
    document.getElementById("m-n3").onclick = () => this.showNightIntro(3);
    document.getElementById("m-set").onclick = () => this.showSettings(() => this.showMainMenu());
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
        <button class="btn secondary" id="p-set">⚙️ Cài đặt</button>
        <button class="btn secondary" id="p-menu">🏠 Về menu</button>
      </div>
    `);
    document.getElementById("p-resume").onclick = () => { this.hideModal(); this.mode = "playing"; };
    document.getElementById("p-retry").onclick = () => this.startNight(this.currentNight);
    document.getElementById("p-set").onclick = () => this.showSettings(() => this.showPauseMenu());
    document.getElementById("p-menu").onclick = () => this.showMainMenu();
  }

  showSettings(onBack) {
    this.showModal(`
      <h1>⚙️ Cài đặt</h1>
      <div class="setting-row">
        <label>Âm lượng (<span id="s-vol-v">${Math.round(settings.volume * 100)}%</span>)</label>
        <input id="s-vol" type="range" min="0" max="1" step="0.05" value="${settings.volume}" />
      </div>
      <div class="setting-row">
        <label>Độ nhạy chuột (<span id="s-sens-v">${settings.sens.toFixed(1)}x</span>)</label>
        <input id="s-sens" type="range" min="0.4" max="2.5" step="0.1" value="${settings.sens}" />
      </div>
      <div class="setting-row">
        <label for="s-cb">Bảng màu dễ phân biệt (Mù màu)</label>
        <input id="s-cb" type="checkbox" ${settings.colorblind ? "checked" : ""} />
      </div>
      <div class="btn-row"><button class="btn" id="s-back">Lưu & Quay lại</button></div>
    `);
    document.getElementById("s-vol").oninput = (e) => {
      settings.volume = Number(e.target.value);
      localStorage.setItem("ddl_vol", String(settings.volume));
      document.getElementById("s-vol-v").textContent = `${Math.round(settings.volume * 100)}%`;
      sfx.updateVolume();
    };
    document.getElementById("s-sens").oninput = (e) => {
      settings.sens = Number(e.target.value);
      localStorage.setItem("ddl_sens", String(settings.sens));
      document.getElementById("s-sens-v").textContent = `${settings.sens.toFixed(1)}x`;
    };
    document.getElementById("s-cb").onchange = (e) => {
      settings.colorblind = Boolean(e.target.checked);
      localStorage.setItem("ddl_cb", String(settings.colorblind));
      applyColorblindCSS();
    };
    document.getElementById("s-back").onclick = onBack;
  }

  showResult(won, msg) {
    this.mode = "result";
    this.showModal(`
      <h1>${won ? "🌅 Qua Đêm " + this.currentNight + "!" : "🌑 Đêm " + this.currentNight + " Thất Bại"}</h1>
      <p>${msg}</p>
      <div class="stats-box">
        <div>⭐ Điểm Đêm ${this.currentNight}: <strong>${this.score}</strong></div>
        <div>🏆 Tổng điểm chiến dịch: <strong>${this.campaignScore}</strong></div>
      </div>
      <div class="btn-row">
        ${won ? `<button class="btn" id="r-next">➡ Sang Đêm ${this.currentNight + 1}</button>` : ""}
        <button class="btn ${won ? "secondary" : ""}" id="r-retry">🔄 Chơi lại Đêm ${this.currentNight}</button>
        <button class="btn secondary" id="r-menu">🏠 Về menu</button>
      </div>
    `);
    if (won) document.getElementById("r-next").onclick = () => this.showNightIntro(this.currentNight + 1);
    document.getElementById("r-retry").onclick = () => this.startNight(this.currentNight);
    document.getElementById("r-menu").onclick = () => this.showMainMenu();
  }

  showDawnScreen() {
    this.mode = "dawn";
    this.showModal(`
      <h1>🌅 Bình Minh Trên Biển Mây!</h1>
      <p>Chúc mừng! Mây đã giữ sáng cả 3 hòn đảo — Đảo Bến, Đảo Cau và Đảo Chuông — vượt qua mọi cơn bão mực tới tận bình minh!</p>
      <div class="stats-box">
        <div>⭐ Điểm Đêm 3: <strong>${this.score}</strong></div>
        <div>🏆 Tổng điểm toàn hành trình: <strong>${this.campaignScore}</strong></div>
      </div>
      <div class="btn-row"><button class="btn" id="d-menu">🏠 Về menu chính</button></div>
    `);
    document.getElementById("d-menu").onclick = () => this.showMainMenu();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;

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
      this.updateHUD();
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
