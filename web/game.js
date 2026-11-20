import * as THREE from "three";

// Standard Color Palette (Ticket-02)
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
  shadeStunned: 0x3A3450,
  mayCloak: 0xE8E2D0,
  mayScarf: 0xC8102E,
  gold: 0xF2C14E,
  drifter: 0x8FA3B8,
};

const DT = 1 / 60;
const GRAVITY = -20.0;
const JUMP_VEL = 7.0;

const NIGHT_INTROS = {
  1: {
    name: "Đảo Bến",
    quote: "“Mây à, sương đen đã nuốt lấy ánh đèn bến cảng. Hãy gom 10 đom đóm cho mỗi Đèn Lồng Lớn, rồi thắp sáng cả 5 ngọn trước khi trời hửng sáng.” — Ông Đăng",
  },
  2: {
    name: "Đảo Cau",
    quote: "“Hai bờ Đảo Cau nối nhau bằng cầu tre chênh vênh và bục nhảy gió. Cẩn thận Gió Lạc hay rình cướp đom đóm, và nhớ tìm Bùa Gió đỏ ở giữa cầu!” — Ông Đăng",
  },
  3: {
    name: "Đảo Chuông",
    quote: "“Đảo Chuông có ba tầng dốc đứng và những cơn gió lốc bất chợt. Thắp sáng 7 Đèn Lồng từ bãi biển lên đỉnh Tháp Chuông để đón Bình Minh về!” — Ông Đăng",
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
      duration: 300,
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
      duration: 330,
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
    duration: 360,
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

// Persistent settings
const settings = {
  volume: Number(localStorage.getItem("ddl_vol") ?? 0.7),
  sens: Number(localStorage.getItem("ddl_sens") ?? 1.0),
};

// Web Audio engine (ambient + all required SFX)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ambientNode = null;
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
    if (!this.ctx || this.ambientNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 110;
    gain.gain.value = 0.025 * settings.volume;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    this.ambientNode = { osc, gain };
  }
  updateVolume() {
    if (this.ambientNode) this.ambientNode.gain.gain.value = 0.025 * settings.volume;
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
  pickup(n) { const s = [523, 587, 659, 784, 880]; this.tone(s[(n - 1) % s.length], 0.2, "triangle", 0.13); }
  lanternLit() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.42, "triangle", 0.14, i * 0.07)); }
  pulse() { this.tone(330, 0.32, "sine", 0.16); this.tone(660, 0.28, "triangle", 0.12, 0.04); }
  hit() { this.tone(150, 0.25, "sawtooth", 0.12); this.tone(95, 0.3, "triangle", 0.14, 0.05); }
  jump() { this.tone(320, 0.14, "sine", 0.09); this.tone(480, 0.12, "sine", 0.07, 0.04); }
  dash() { this.tone(540, 0.16, "triangle", 0.11); this.tone(720, 0.12, "sine", 0.08, 0.03); }
  shadeSpawn() { this.tone(130, 0.35, "sawtooth", 0.08); }
  countdown() { this.tone(880, 0.09, "square", 0.08); }
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.14, i * 0.08)); }
  lose() { [330, 294, 247, 196].forEach((f, i) => this.tone(f, 0.4, "sine", 0.12, i * 0.1)); }
}

const sfx = new SoundEngine();

class GameApp {
  constructor(tuning) {
    this.tuning = tuning;
    this.keys = new Set();
    this.camYaw = 0;
    this.dragging = false;
    this.lastMouseX = 0;
    this.mode = "menu"; // menu | intro | playing | paused | result | dawn
    this.currentNight = 1;
    this.campaignScore = 0;
    this.accumulator = 0;
    this.lastFrame = performance.now();
    this.elapsed = 0;
    this.lastCountdownSec = 11;

    this.buildMoteSlots();
    this.initThree();
    this.initInput();
    this.showMainMenu();
    this.loop();
  }

  buildMoteSlots() {
    const wrap = document.getElementById("mote-slots");
    wrap.innerHTML = "";
    this.slotEls = [];
    for (let i = 0; i < 10; i++) {
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
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.011);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.ambient = new THREE.AmbientLight(0xd8e2ff, 0.15);
    this.scene.add(this.ambient);

    this.moon = new THREE.DirectionalLight(0xc2d6ff, 0.55);
    this.moon.position.set(25, 45, 20);
    this.scene.add(this.moon);

    // Sea of clouds plane
    const cloudGeo = new THREE.PlaneGeometry(400, 400);
    const cloudMat = new THREE.MeshStandardMaterial({ color: COLORS.cloudSea, roughness: 1.0 });
    const cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
    cloudPlane.rotation.x = -Math.PI / 2;
    cloudPlane.position.y = -11;
    this.scene.add(cloudPlane);

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

  createMayMesh() {
    const g = new THREE.Group();
    const cloak = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 1.15, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.mayCloak, roughness: 0.7 })
    );
    cloak.position.y = 0.58;
    g.add(cloak);

    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.08, 8, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, roughness: 0.6 })
    );
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.08;
    g.add(scarf);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xffe2c6 })
    );
    head.position.y = 1.32;
    g.add(head);

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 0.38, 22),
      new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.85 })
    );
    hat.position.y = 1.62;
    g.add(hat);

    const mini = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.lanternCore, emissive: COLORS.lanternLit, emissiveIntensity: 2.0 })
    );
    mini.position.set(0, 1.2, 0.56);
    g.add(mini);

    this.playerLight = new THREE.PointLight(COLORS.lanternLit, 2.0, 12, 1.5);
    this.playerLight.position.set(0, 1.25, 0.56);
    g.add(this.playerLight);
    return g;
  }

  buildTerrain(night) {
    this.worldGroup.clear();
    const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.9 });
    const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.85 });

    if (night === 1) {
      const isl = new THREE.Mesh(new THREE.CylinderGeometry(40, 36, 6, 48), grassMat);
      isl.position.y = -3;
      this.worldGroup.add(isl);
    } else if (night === 2) {
      for (const cx of [0, 70]) {
        const isl = new THREE.Mesh(new THREE.CylinderGeometry(28, 25, 6, 40), grassMat);
        isl.position.set(cx, -3, 0);
        this.worldGroup.add(isl);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 4), woodMat);
      bridge.position.set(35, -0.25, 0);
      this.worldGroup.add(bridge);
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(45, 41, 6, 56), grassMat);
      base.position.y = -3;
      this.worldGroup.add(base);

      // Tier 1 half-ring (r 12..24, z > 0, Y=3)
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 24, 0, Math.PI, false);
      shape.absarc(0, 0, 12, Math.PI, 0, true);
      const t1Geo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
      t1Geo.rotateX(Math.PI / 2);
      const t1 = new THREE.Mesh(t1Geo, sandMat);
      t1.position.y = 3;
      this.worldGroup.add(t1);

      // Tier 2 disk (r 8, Y=6)
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 32), grassMat);
      t2.position.y = 3;
      this.worldGroup.add(t2);

      // Bell Tower (r 2, h 8 on Tier 2)
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 20), woodMat);
      tower.position.y = 10;
      this.worldGroup.add(tower);

      // 2 Ramps at 30° & 150°
      for (const deg of [30, 150]) {
        const rad = (deg * Math.PI) / 180;
        const len = Math.hypot(6, 3);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 3), woodMat);
        ramp.position.set(Math.cos(rad) * 27, 1.5, Math.sin(rad) * 27);
        ramp.rotation.y = -rad;
        ramp.rotation.z = Math.atan2(3, 6);
        this.worldGroup.add(ramp);
      }
    }

    // Jump pads
    const padMat = new THREE.MeshStandardMaterial({ color: COLORS.gold, emissive: COLORS.lanternLit, emissiveIntensity: 0.9 });
    for (const pad of this.def.jumpPads) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r * 1.1, 0.25, 20), padMat);
      m.position.set(pad.pos[0], pad.pos[1] + 0.12, pad.pos[2]);
      this.worldGroup.add(m);
    }
  }

  startNight(night) {
    this.currentNight = night;
    this.def = getNightDef(night);
    this.buildTerrain(night);
    this.entityGroup.clear();
    this.fxGroup.clear();
    this.pulseWaves = [];

    this.simTick = 0;
    this.score = 0;
    this.timeLeft = this.def.duration;
    this.lastCountdownSec = 11;
    this.playerPos = [...this.def.spawn];
    this.playerVel = [0, 0, 0];
    this.facing = [0, 1];
    this.grounded = true;
    this.flames = 3;
    this.carried = 0;
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

    // Lanterns
    this.lanterns = this.def.lanterns.map((l) => {
      const g = new THREE.Group();
      g.position.set(l.pos[0], l.pos[1], l.pos[2]);
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 2.8, 8),
        new THREE.MeshStandardMaterial({ color: COLORS.wood })
      );
      pillar.position.y = 1.4;
      g.add(pillar);
      const coreMat = new THREE.MeshStandardMaterial({
        color: COLORS.lanternUnlit,
        emissive: COLORS.lanternLit,
        emissiveIntensity: 0.05,
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 1), coreMat);
      core.position.y = 3.0;
      g.add(core);
      const pLight = new THREE.PointLight(COLORS.lanternLit, 0, 22, 1.4);
      pLight.position.y = 3.0;
      g.add(pLight);
      const safeRing = new THREE.Mesh(
        new THREE.RingGeometry(5.85, 6.0, 48),
        new THREE.MeshBasicMaterial({ color: COLORS.lanternLit, transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      safeRing.rotation.x = -Math.PI / 2;
      safeRing.position.y = 0.06;
      g.add(safeRing);
      this.entityGroup.add(g);
      return { ...l, pos: [...l.pos], lit: false, deposited: 0, mesh: g, coreMat, pLight, safeRing };
    });

    // Initial 20 motes
    this.motes = [];
    const shuffled = [...this.def.motePoints].sort(() => Math.random() - 0.5);
    for (const pt of shuffled.slice(0, 20)) this.addMote(pt, "random", null);

    // Charms
    this.charms = this.def.charms.map((c) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.7, 0.1),
        new THREE.MeshStandardMaterial({ color: COLORS.mayScarf, emissive: COLORS.gold, emissiveIntensity: 0.6 })
      );
      m.position.set(c.pos[0], c.pos[1] + 1.0, c.pos[2]);
      this.entityGroup.add(m);
      return { ...c, pos: [...c.pos], available: true, respawnTicks: 0, mesh: m };
    });

    this.shades = [];
    this.drifters = [];

    document.getElementById("val-night-lbl").textContent = `Đêm ${night} · ${this.def.name}`;
    this.updateAtmosphere();
    this.hideModal();
    this.mode = "playing";
    sfx.ensure();
  }

  addMote(pos, kind, ttl) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshStandardMaterial({ color: COLORS.moteCore, emissive: COLORS.moteHalo, emissiveIntensity: 2.2 })
    );
    m.position.set(pos[0], pos[1] + 0.9, pos[2]);
    this.entityGroup.add(m);
    this.motes.push({ pos: [...pos], kind, ttl, spawnTick: this.simTick, mesh: m, phase: Math.random() * 6.28 });
  }

  spawnShade() {
    const valid = this.def.shadePoints.filter((pt) => {
      if (Math.hypot(pt[0] - this.playerPos[0], pt[2] - this.playerPos[2]) < 15) return false;
      if (this.lanterns.some((l) => l.lit && Math.hypot(pt[0] - l.pos[0], pt[2] - l.pos[2]) < 6.5)) return false;
      return true;
    });
    if (!valid.length) return;
    const pt = valid[Math.floor(Math.random() * valid.length)];
    const mat = new THREE.MeshStandardMaterial({ color: COLORS.shadeBody, emissive: COLORS.shadeRim, emissiveIntensity: 0.75 });
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 12), mat);
    mesh.position.set(pt[0], pt[1] + 0.85, pt[2]);
    this.entityGroup.add(mesh);
    this.shades.push({
      pos: [...pt],
      state: "wander",
      stateTicks: 0,
      pushTicks: 0,
      pushDir: [1, 0],
      recoilDir: [1, 0],
      wanderAng: Math.random() * 6.28,
      mesh,
      mat,
    });
    sfx.shadeSpawn();
  }

  spawnDrifter() {
    const pt = this.def.shadePoints[Math.floor(Math.random() * this.def.shadePoints.length)];
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({ color: COLORS.drifter, emissive: 0x587088, emissiveIntensity: 0.6 })
    );
    mesh.position.set(pt[0], pt[1] + 1.3, pt[2]);
    this.entityGroup.add(mesh);
    this.drifters.push({
      pos: [pt[0], pt[1] + 1.3, pt[2]],
      state: "idle",
      stolen: 0,
      hasStolen: false,
      fleeTicks: 0,
      fleeDir: [1, 0],
      ang: Math.random() * 6.28,
      mesh,
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

    // 10s countdown beep
    const secCeil = Math.ceil(this.timeLeft);
    if (secCeil <= 10 && secCeil > 0 && secCeil < this.lastCountdownSec) {
      this.lastCountdownSec = secCeil;
      sfx.countdown();
    }

    // Timers
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

    // Wind (Night 3)
    const windBanner = document.getElementById("wind-banner");
    if (this.def.hasWind) {
      const rem = 1800 - (this.simTick % 1800);
      if (this.windTicks > 0) {
        this.windTicks--;
        if (this.windTicks === 0) this.windActive = false;
        windBanner.style.display = "block";
        windBanner.textContent = "💨 Gió mạnh đang thổi!";
      } else if (this.simTick > 0 && this.simTick % 1800 === 0) {
        this.windActive = true;
        this.windDirDeg = Math.random() * 360;
        this.windTicks = 300;
      } else if (rem <= 120) {
        windBanner.style.display = "block";
        windBanner.textContent = "🍃 Gió mạnh sắp nổi!";
      } else {
        windBanner.style.display = "none";
      }
    } else {
      windBanner.style.display = "none";
    }

    // Camera keyboard rotation
    if (this.keys.has("KeyQ")) this.camYaw += 2.2 * DT;
    if (this.keys.has("KeyC")) this.camYaw -= 2.2 * DT;

    // Move Mây
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
          this.playerVel[1] = JUMP_VEL;
          this.grounded = false;
          sfx.jump();
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
      } else if (gy !== null && this.grounded && Math.abs(ny - gy) <= 0.4) {
        ny = gy; this.playerVel[1] = 0; this.grounded = true;
      } else {
        this.grounded = false;
      }
      this.playerPos = [nx, ny, nz];

      // Jump pads
      if (this.dashTicks === 0) {
        for (const pad of this.def.jumpPads) {
          if (Math.hypot(nx - pad.pos[0], nz - pad.pos[2]) <= pad.r && Math.abs(ny - pad.pos[1]) <= 0.5) {
            this.playerVel = [pad.dir[0] * pad.hspeed, pad.vy, pad.dir[1] * pad.hspeed];
            this.grounded = false;
            this.launchLocked = true;
            sfx.jump();
          }
        }
      }

      // Fall check
      if (this.playerPos[1] < -10) {
        this.flames = Math.max(0, this.flames - 1);
        this.carried = 0;
        this.playerVel = [0, 0, 0];
        this.launchLocked = false;
        sfx.hit();
        if (this.flames > 0) this.fallWaitTicks = 60;
      }
    }

    // Pickup motes & charms
    if (this.fallWaitTicks === 0 && this.flames > 0) {
      for (let i = this.motes.length - 1; i >= 0; i--) {
        const m = this.motes[i];
        if (
          this.carried < 10 &&
          m.spawnTick < this.simTick &&
          Math.hypot(this.playerPos[0] - m.pos[0], this.playerPos[2] - m.pos[2]) <= 1.0 &&
          Math.abs(this.playerPos[1] - m.pos[1]) <= 1.5
        ) {
          this.carried++;
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
          sfx.lanternLit();
        }
      }
    }

    // Interact with nearest unlit lantern
    let nearL = null, bestD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit) continue;
      const d = Math.hypot(this.playerPos[0] - l.pos[0], this.playerPos[2] - l.pos[2]);
      if (d <= 2.0 && d < bestD) { bestD = d; nearL = l; }
    }
    const promptEl = document.getElementById("prompt");
    if (nearL && this.carried > 0) {
      promptEl.style.display = "block";
      promptEl.textContent = `E — Nạp ánh sáng (${nearL.deposited}/10)`;
    } else {
      promptEl.style.display = "none";
    }
    if (this.qInteract && nearL && this.carried > 0) {
      const amt = Math.min(this.carried, 10 - nearL.deposited);
      this.carried -= amt;
      nearL.deposited += amt;
      this.score += amt * 10;
      if (nearL.deposited >= 10) {
        nearL.lit = true;
        this.score += 100;
        sfx.lanternLit();
        this.updateAtmosphere();
      } else {
        sfx.pickup(nearL.deposited);
      }
    }
    this.qInteract = false;

    // Pulse
    if (this.qPulse && this.carried >= 3 && this.pulseCdTicks === 0) {
      this.carried -= 3;
      this.pulseCdTicks = 180;
      sfx.pulse();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.4, 0.75, 40),
        new THREE.MeshBasicMaterial({ color: COLORS.moteHalo, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(this.playerPos[0], this.playerPos[1] + 0.15, this.playerPos[2]);
      this.fxGroup.add(ring);
      this.pulseWaves.push({ mesh: ring, age: 0 });

      const pc = [this.playerPos[0], this.playerPos[1] + 0.8, this.playerPos[2]];
      for (const s of this.shades) {
        const d3 = Math.hypot(pc[0] - s.pos[0], pc[1] - s.pos[1], pc[2] - s.pos[2]);
        if (d3 <= 5.0) {
          s.state = "stunned";
          s.stateTicks = 120;
          s.pushTicks = 15;
          const dx = s.pos[0] - this.playerPos[0], dz = s.pos[2] - this.playerPos[2];
          const dm = Math.hypot(dx, dz);
          s.pushDir = dm > 1e-5 ? [dx / dm, dz / dm] : [1, 0];
          this.score += 5;
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

    // Move Shades & Drifters + Collisions
    for (const s of this.shades) {
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
      if (s.state === "wander" && dp <= 12) s.state = "chase";
      else if (s.state === "chase" && dp > 18) s.state = "wander";

      let nx = s.pos[0], nz = s.pos[2];
      if (s.state === "chase" && dp > 1e-4) {
        const mv = Math.min(this.def.shadeSpeed * DT, dp);
        nx += ((this.playerPos[0] - s.pos[0]) / dp) * mv;
        nz += ((this.playerPos[2] - s.pos[2]) / dp) * mv;
      } else {
        s.wanderAng += 0.4 * DT;
        nx += Math.cos(s.wanderAng) * this.def.shadeSpeed * 0.45 * DT;
        nz += Math.sin(s.wanderAng) * this.def.shadeSpeed * 0.45 * DT;
      }
      const gy = groundHeightAt(this.currentNight, nx, nz);
      if (gy !== null && !isBlocked(this.currentNight, nx, s.pos[1], nz)) { s.pos = [nx, gy, nz]; }
      else s.wanderAng += 2.2;

      for (const l of this.lanterns) {
        if (!l.lit) continue;
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
        if (dr.fleeTicks <= 0) { dr.state = "removed"; dr.mesh.visible = false; }
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
        sfx.hit();
      }
    }

    // Shade hit player
    if (this.fallWaitTicks === 0 && this.invulnTicks === 0 && this.flames > 0) {
      for (const s of this.shades) {
        if (s.state !== "wander" && s.state !== "chase") continue;
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
          s.state = "recoil"; s.stateTicks = 60;
          sfx.hit();
          break;
        }
      }
    }

    // Spawns
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

    // Win / Lose
    if (this.flames <= 0) {
      sfx.lose();
      this.showResult(false, "Ngọn Lửa của Mây đã tắt giữa sương đen.");
    } else if (this.lanterns.every((l) => l.lit)) {
      this.score += Math.floor(this.timeLeft) * 2 + this.flames * 50;
      this.campaignScore += this.score;
      sfx.win();
      if (this.currentNight === 3) this.showDawnScreen();
      else this.showResult(true, `Tất cả Đèn Lồng Lớn trên ${this.def.name} đã bừng sáng!`);
    } else if (this.timeLeft <= 0) {
      sfx.lose();
      this.showResult(false, "Bình minh đã đến trước khi mọi Đèn Lồng Lớn kịp sáng.");
    }
  }

  updateAtmosphere() {
    const lit = this.lanterns.filter((l) => l.lit).length;
    const ratio = lit / this.lanterns.length;
    this.ambient.intensity = 0.15 + 0.55 * ratio;
    for (const l of this.lanterns) {
      if (l.lit) {
        l.coreMat.color.setHex(COLORS.lanternCore);
        l.coreMat.emissiveIntensity = 2.4;
        l.pLight.intensity = 3.6;
        l.safeRing.material.opacity = 0.35;
      } else {
        const r = l.deposited / 10;
        l.coreMat.color.setHex(COLORS.lanternUnlit);
        l.coreMat.emissiveIntensity = 0.05 + r * 0.9;
        l.pLight.intensity = r * 0.8;
        l.safeRing.material.opacity = 0;
      }
    }
  }

  updateHUD() {
    document.getElementById("val-flames").textContent = "🔥".repeat(this.flames) || "—";
    const lit = this.lanterns.filter((l) => l.lit).length;
    document.getElementById("val-lanterns").textContent = `${lit} / ${this.lanterns.length}`;
    document.getElementById("val-score").textContent = String(this.score);

    const mins = Math.floor(this.timeLeft / 60);
    const secs = Math.floor(this.timeLeft % 60);
    const clk = document.getElementById("val-clock");
    clk.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    clk.classList.toggle("danger", this.timeLeft <= 30);

    for (let i = 0; i < 10; i++) this.slotEls[i].classList.toggle("filled", i < this.carried);

    const charmEl = document.getElementById("charm-badge");
    if (this.charmTicks > 0) {
      charmEl.style.display = "block";
      charmEl.textContent = `🧧 Bùa Gió: ${(this.charmTicks / 60).toFixed(1)}s`;
    } else charmEl.style.display = "none";

    const cdDash = document.getElementById("cd-dash");
    if (this.charmTicks > 0) { cdDash.textContent = "0s (Bùa)"; cdDash.className = "cd"; }
    else if (this.dashCdTicks > 0) { cdDash.textContent = `${(this.dashCdTicks / 60).toFixed(1)}s`; cdDash.className = "cd dim"; }
    else { cdDash.textContent = "Sẵn sàng"; cdDash.className = "cd"; }

    const cdPulse = document.getElementById("cd-pulse");
    if (this.pulseCdTicks > 0) { cdPulse.textContent = `${(this.pulseCdTicks / 60).toFixed(1)}s`; cdPulse.className = "cd dim"; }
    else if (this.carried < 3) { cdPulse.textContent = "Cần 3"; cdPulse.className = "cd dim"; }
    else { cdPulse.textContent = "Sẵn sàng"; cdPulse.className = "cd"; }

    // Off-screen arrow to nearest unlit lantern
    const arrow = document.getElementById("lantern-arrow");
    let nearest = null, minD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit) continue;
      const d = Math.hypot(l.pos[0] - this.playerPos[0], l.pos[2] - this.playerPos[2]);
      if (d < minD) { minD = d; nearest = l; }
    }
    if (nearest) {
      const v = new THREE.Vector3(nearest.pos[0], nearest.pos[1] + 3, nearest.pos[2]).project(this.camera);
      const offscreen = v.z > 1 || Math.abs(v.x) > 0.92 || Math.abs(v.y) > 0.92;
      if (offscreen) {
        let sx = v.x, sy = v.y;
        if (v.z > 1) { sx = -sx; sy = -sy; }
        const ang = Math.atan2(-sy, sx);
        const cx = window.innerWidth / 2 + Math.cos(ang) * (window.innerWidth * 0.42);
        const cy = window.innerHeight / 2 + Math.sin(ang) * (window.innerHeight * 0.38);
        arrow.style.display = "flex";
        arrow.style.left = `${cx - 17}px`;
        arrow.style.top = `${cy - 17}px`;
        arrow.style.transform = `rotate(${(ang * 180) / Math.PI}deg)`;
      } else arrow.style.display = "none";
    } else arrow.style.display = "none";
  }

  syncVisuals(dt) {
    this.elapsed += dt;
    this.playerMesh.position.set(this.playerPos[0], this.playerPos[1], this.playerPos[2]);
    this.playerMesh.rotation.y = Math.atan2(this.facing[0], this.facing[1]);
    this.playerMesh.visible = this.fallWaitTicks === 0 && (this.invulnTicks === 0 || Math.floor(this.elapsed * 16) % 2 === 0);

    for (const m of this.motes) m.mesh.position.set(m.pos[0], m.pos[1] + 0.9 + Math.sin(this.elapsed * 3.2 + m.phase) * 0.22, m.pos[2]);
    for (const c of this.charms) if (c.available) c.mesh.rotation.y = this.elapsed * 2.0;
    for (const s of this.shades) {
      s.mesh.position.set(s.pos[0], s.pos[1] + 0.85, s.pos[2]);
      s.mat.color.setHex(s.state === "stunned" ? COLORS.shadeStunned : COLORS.shadeBody);
      s.mat.emissive.setHex(s.state === "stunned" ? COLORS.lanternLit : COLORS.shadeRim);
    }
    for (const dr of this.drifters) if (dr.state !== "removed") {
      dr.mesh.position.set(dr.pos[0], dr.pos[1] + Math.sin(this.elapsed * 5) * 0.2, dr.pos[2]);
      dr.mesh.rotation.y = this.elapsed * 3;
    }
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const w = this.pulseWaves[i];
      w.age += dt;
      if (w.age >= 0.45) { this.fxGroup.remove(w.mesh); this.pulseWaves.splice(i, 1); }
      else { const p = w.age / 0.45; w.mesh.scale.setScalar(1 + p * 7); w.mesh.material.opacity = (1 - p) * 0.85; }
    }

    const tx = this.playerPos[0] + Math.sin(this.camYaw) * 12;
    const tz = this.playerPos[2] + Math.cos(this.camYaw) * 12;
    const ty = this.playerPos[1] + 7.5;
    this.camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.14);
    this.camera.lookAt(this.playerPos[0], this.playerPos[1] + 1.2, this.playerPos[2]);
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
      <h2>Hành trình Ba Hòn Đảo</h2>
      <p>Cùng Mây mang ánh sáng trở lại cho Đảo Bến, Đảo Cau và Đảo Chuông qua 3 Đêm thử thách.</p>
      <div class="btn-row">
        <button class="btn" id="m-play">Bắt đầu từ Đêm 1</button>
        <button class="btn secondary" id="m-n2">Chơi nhanh Đêm 2 — Đảo Cau</button>
        <button class="btn secondary" id="m-n3">Chơi nhanh Đêm 3 — Đảo Chuông</button>
        <button class="btn secondary" id="m-set">Cài đặt</button>
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
        <button class="btn" id="m-go">Lên đường!</button>
        <button class="btn secondary" id="m-back">Về menu</button>
      </div>
    `);
    document.getElementById("m-go").onclick = () => this.startNight(night);
    document.getElementById("m-back").onclick = () => this.showMainMenu();
  }

  showPauseMenu() {
    this.mode = "paused";
    this.showModal(`
      <h1>⏸️ Tạm dừng</h1>
      <div class="btn-row">
        <button class="btn" id="p-resume">Tiếp tục</button>
        <button class="btn secondary" id="p-retry">Chơi lại Đêm ${this.currentNight}</button>
        <button class="btn secondary" id="p-set">Cài đặt</button>
        <button class="btn secondary" id="p-menu">Về menu</button>
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
    document.getElementById("s-back").onclick = onBack;
  }

  showResult(won, msg) {
    this.mode = "result";
    this.showModal(`
      <h1>${won ? "✨ Qua Đêm " + this.currentNight + "!" : "🌑 Đêm " + this.currentNight + " Thất Bại"}</h1>
      <p>${msg}</p>
      <div class="stats-box">
        <div>⭐ Điểm Đêm ${this.currentNight}: <strong>${this.score}</strong></div>
        <div>🏆 Tổng điểm chiến dịch: <strong>${this.campaignScore}</strong></div>
      </div>
      <div class="btn-row">
        ${won ? `<button class="btn" id="r-next">Sang Đêm ${this.currentNight + 1}</button>` : ""}
        <button class="btn ${won ? "secondary" : ""}" id="r-retry">Chơi lại Đêm ${this.currentNight}</button>
        <button class="btn secondary" id="r-menu">Về menu</button>
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
      <p>Chúc mừng! Mây đã thắp sáng cả 3 hòn đảo — Đảo Bến, Đảo Cau và Đảo Chuông — xua tan sương đen.</p>
      <div class="stats-box">
        <div>⭐ Điểm Đêm 3: <strong>${this.score}</strong></div>
        <div>🏆 Tổng điểm toàn hành trình: <strong>${this.campaignScore}</strong></div>
      </div>
      <div class="btn-row">
        <button class="btn" id="d-menu">Về menu chính</button>
      </div>
    `);
    document.getElementById("d-menu").onclick = () => this.showMainMenu();
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;

    if (this.mode === "playing") {
      this.accumulator += dt;
      while (this.accumulator >= DT && this.mode === "playing") {
        this.stepSim();
        this.accumulator -= DT;
      }
      this.updateHUD();
      this.syncVisuals(dt);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

fetch("/game.contract.json")
  .then((r) => (r.ok ? r.json() : {}))
  .then((d) => new GameApp(d.tuning || {}))
  .catch(() => new GameApp({}));
