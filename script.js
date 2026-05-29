const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const ui     = document.getElementById('ui');

let W, H, CX, CY, S, DPR;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);

  const lw = window.innerWidth;
  const lh = window.innerHeight;

  canvas.width  = Math.round(lw * DPR);
  canvas.height = Math.round(lh * DPR);
  canvas.style.width  = lw + 'px';
  canvas.style.height = lh + 'px';
  ctx.scale(DPR, DPR);

  W  = lw;
  H  = lh;
  CX = W / 2;

  // Heart sits centered on screen; we nudge it slightly down so
  // it looks balanced with the black area above/below.
  CY = H / 2 + H * 0.03;

  const isPortrait = H >= W;
  S = isPortrait ? W * 0.42 : H * 0.44;

  // ── Calculate the visual center of the heart's hollow interior ──────────────
  const heartTopLocal    = -S * 0.3;
  const heartBottomLocal =  S * 0.55;
  const interiorCenterLocal = (heartTopLocal + heartBottomLocal) / 2;
  const interiorCenterY = CY + interiorCenterLocal;

  document.documentElement.style.setProperty('--heart-cy', interiorCenterY + 'px');
}

resize();
window.addEventListener('resize', () => {
  resize();
  buildPath();
  init();
});

// Heart parametric
function heartPt(t) {
  const x =  16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return {
    x: CX + x * (S / 16),
    y: CY + y * (S / 16),
  };
}

const N_PATH = 2400;
let path = [];

function buildPath() {
  path = [];
  for (let i = 0; i < N_PATH; i++) {
    path.push(heartPt((i / N_PATH) * Math.PI * 2));
  }
}
buildPath();

const COLORS = [
  [255, 80,  160], [255, 120, 185], [255, 160, 210], [255,  60, 140],
  [220,  50, 130], [255, 200, 230], [255, 255, 255], [255, 100, 175],
  [255,  40, 130], [200,  30, 110], [255, 180, 220], [255, 230, 240],
];
function rndColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

class Particle {
  constructor(idx) {
    const pi    = Math.floor(Math.random() * N_PATH);
    const spread = 2 + Math.random() * 20;
    const angle  = Math.random() * Math.PI * 2;
    this.tx = path[pi].x + Math.cos(angle) * spread;
    this.ty = path[pi].y + Math.sin(angle) * spread;

    const edge = Math.floor(Math.random() * 4);
    if      (edge === 0) { this.x = Math.random() * W; this.y = -20; }
    else if (edge === 1) { this.x = W + 20;            this.y = Math.random() * H; }
    else if (edge === 2) { this.x = Math.random() * W; this.y = H + 20; }
    else                 { this.x = -20;               this.y = Math.random() * H; }

    this.delay    = idx * 0.0016 + Math.random() * 0.4;
    this.t        = -this.delay;
    this.color    = rndColor();
    this.baseSize = 0.9 + Math.random() * 2.4;
    this.alpha    = 0;
    this.landed   = false;

    this.driftR     = 1 + Math.random() * 2.5;
    this.driftSpeed = 0.007 + Math.random() * 0.014;
    this.driftPhase = Math.random() * Math.PI * 2;
    this.driftT     = 0;

    this.twSpeed = 0.025 + Math.random() * 0.05;
    this.twPhase = Math.random() * Math.PI * 2;
    this.curAlpha = 0;
    this.curSize  = this.baseSize;
  }

  update(dt) {
    this.t += dt;
    if (this.t < 0) return;

    const TRAVEL = 1.3;
    if (this.t < TRAVEL) {
      const prog = this.t / TRAVEL;
      const ease = 1 - Math.pow(1 - prog, 4);
      this.x    += (this.tx - this.x) * ease * 0.14;
      this.y    += (this.ty - this.y) * ease * 0.14;
      this.alpha = Math.min(1, prog * 2.8);
    } else {
      this.landed  = true;
      this.driftT += this.driftSpeed;
      this.x = this.tx + Math.sin(this.driftT + this.driftPhase)       * this.driftR;
      this.y = this.ty + Math.cos(this.driftT * 0.8 + this.driftPhase) * this.driftR * 0.6;
      this.alpha = 1;
    }

    const tw      = 0.5 + 0.5 * Math.sin(this.t * this.twSpeed * 60 + this.twPhase);
    this.curAlpha = this.alpha * (0.4 + 0.6 * tw);
    this.curSize  = this.baseSize * (0.55 + 0.75 * tw);
  }

  draw() {
    if (this.t < 0 || this.curAlpha <= 0.01) return;
    const [r, g, b] = this.color;
    ctx.globalAlpha = this.curAlpha;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = this.curSize * 3.5;
    ctx.fillStyle   = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.curSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Spark {
  constructor() {
    const pi  = Math.floor(Math.random() * N_PATH);
    this.x    = path[pi].x + (Math.random() - 0.5) * 8;
    this.y    = path[pi].y + (Math.random() - 0.5) * 8;
    const spd = 0.4 + Math.random() * 2.2;
    const a   = Math.random() * Math.PI * 2;
    this.vx   = Math.cos(a) * spd;
    this.vy   = Math.sin(a) * spd - 0.4;
    this.color = rndColor();
    this.life  = 1;
    this.decay = 0.014 + Math.random() * 0.028;
    this.size  = 0.5 + Math.random() * 1.3;
  }

  update() {
    this.vx   *= 0.96;
    this.vy   += 0.045;
    this.x    += this.vx;
    this.y    += this.vy;
    this.life -= this.decay;
  }

  draw() {
    if (this.life <= 0) return;
    const [r, g, b] = this.color;
    ctx.globalAlpha = this.life * 0.85;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  dead() { return this.life <= 0; }
}

const TOTAL = 2000;
let particles  = [];
let sparks     = [];
let last       = null;
let total      = 0;
let shown      = false;
let sparkTimer = 0;

function init() {
  particles  = [];
  sparks     = [];
  shown      = false;
  total      = 0;
  last       = null;
  sparkTimer = 0;
  ui.classList.remove('show');
  for (let i = 0; i < TOTAL; i++) particles.push(new Particle(i));
}
init();

function loop(ts) {
  requestAnimationFrame(loop);
  if (!last) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.05);
  last   = ts;
  total += dt;

  ctx.clearRect(0, 0, W, H);

  if (total > 2.2) {
    const str = Math.min(1, (total - 2.2) / 2.5) * 0.08;
    const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, S * 1.1);
    grd.addColorStop(0, `rgba(255,20,100,${str})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle   = grd;
    ctx.fillRect(0, 0, W, H);
  }

  let landed = 0;
  for (const p of particles) {
    p.update(dt);
    p.draw();
    if (p.landed) landed++;
  }

  sparkTimer += dt;
  if (landed / TOTAL > 0.6 && sparkTimer > 0.07) {
    sparkTimer = 0;
    for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) sparks.push(new Spark());
  }

  for (const s of sparks) { s.update(); s.draw(); }
  sparks = sparks.filter(s => !s.dead());

  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;

  if (!shown && landed / TOTAL > 0.48) {
    shown = true;
    ui.classList.add('show');
  }
}
requestAnimationFrame(loop);

window.addEventListener('pointerdown', init);