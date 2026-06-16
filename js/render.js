/* ============ Emberfall — canvas rendering, particles & FX ============ */
'use strict';

const TILE_BASE = 36;
let TILE = 36; // effective tile size; scales with Render.zoom (FOV control)
// Force a COLOR emoji font so NPC/enemy glyphs render solid & colored on every
// OS (without this, some systems draw monochrome glyphs tinted by fillStyle,
// which made characters look faded/transparent).
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",serif';

// ---------- FX: particles, shake, floating text ----------
const FX = {
  particles: [], floats: [], shakeAmt: 0,
  shakeEnabled: localStorage.getItem('ef_shake') !== '0',

  shake(n) { if (this.shakeEnabled) this.shakeAmt = Math.max(this.shakeAmt, n); },

  burst(x, y, color, n) {
    for (let i = 0; i < (n || 12); i++) {
      const a = rnd() * Math.PI * 2, sp = 0.5 + rnd() * 2.5;
      this.particles.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 0.6 + rnd() * 0.6, max: 1, color, size: 2 + rnd() * 3 });
    }
  },
  spark(x, y, color) {
    this.particles.push({ x: x + 0.2 + rnd() * 0.6, y: y + 0.2 + rnd() * 0.6, vx: (rnd() - 0.5) * 0.4, vy: -0.4 - rnd() * 0.8, life: 0.8 + rnd() * 0.8, max: 1.4, color, size: 1.5 + rnd() * 2 });
  },
  float(x, y, text, color) {
    this.floats.push({ x, y, text, color: color || '#fff', life: 1.2 });
  },

  update(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1.5 * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const f of this.floats) { f.y -= dt * 0.8; f.life -= dt; }
    this.floats = this.floats.filter(f => f.life > 0);
  },
};

// ---------- tile art (procedural pixel tiles, cached) ----------
const TileArt = {
  cache: {},
  P: 16, // art resolution per tile

  get(tileId, vx, vy) {
    const variants = this.cache[tileId];
    if (!variants) return null;
    return variants[(vx * 7 + vy * 13) % variants.length];
  },

  make(painter, nVariants) {
    const out = [];
    for (let v = 0; v < (nVariants || 3); v++) {
      const c = document.createElement('canvas');
      c.width = this.P; c.height = this.P;
      const ctx = c.getContext('2d');
      const r = mulberry32(v * 977 + 13);
      painter(ctx, r);
      out.push(c);
    }
    return out;
  },

  px(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); },

  init() {
    const P = this.P, px = this.px.bind(this);
    const speckle = (ctx, r, n, colors) => {
      for (let i = 0; i < n; i++) px(ctx, Math.floor(r() * P), Math.floor(r() * P), 1, 1, colors[Math.floor(r() * colors.length)]);
    };
    this.cache[T.GRASS] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#5a9e4b');
      speckle(ctx, r, 14, ['#6cb35a', '#4f8f42', '#7cc468']);
      for (let i = 0; i < 4; i++) { const x = Math.floor(r() * P), y = Math.floor(r() * P); px(ctx, x, y, 1, 2, '#3e7a35'); }
    }, 4);
    this.cache[T.FLOWERS] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#5a9e4b');
      speckle(ctx, r, 10, ['#6cb35a', '#4f8f42']);
      const fc = ['#ff7eb3', '#ffd86b', '#c293ff', '#fff'];
      for (let i = 0; i < 4; i++) {
        const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12);
        px(ctx, x, y, 2, 2, fc[Math.floor(r() * fc.length)]);
        px(ctx, x, y + 2, 1, 1, '#3e7a35');
      }
    }, 4);
    this.cache[T.TREE] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#4f8f42');
      px(ctx, 6, 10, 4, 6, '#5d4023');
      px(ctx, 2, 2, 12, 10, '#2e6b2a');
      px(ctx, 4, 0, 8, 4, '#2e6b2a');
      speckle(ctx, r, 8, ['#3c8a36', '#256322', '#4fa345']);
      px(ctx, 3, 3, 2, 2, '#4fa345');
    }, 3);
    this.cache[T.WATER] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#2e6da8');
      speckle(ctx, r, 8, ['#3d83c4', '#255d91']);
      px(ctx, Math.floor(r() * 10), Math.floor(r() * 14), 5, 1, '#5fa6d8');
      px(ctx, Math.floor(r() * 10), Math.floor(r() * 14), 4, 1, '#5fa6d8');
    }, 4);
    this.cache[T.SAND] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#d9c27e');
      speckle(ctx, r, 12, ['#e6d294', '#c4ad6c', '#cdb87a']);
    }, 3);
    this.cache[T.MOUNTAIN] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#6b7280');
      speckle(ctx, r, 10, ['#7d8593', '#596070', '#828a99']);
      px(ctx, 2, 10, 12, 2, '#596070');
      px(ctx, 4, 4, 8, 2, '#828a99');
      px(ctx, 5, 2, 3, 2, '#9aa2b1');
    }, 3);
    this.cache[T.PATH] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#b59a6a');
      speckle(ctx, r, 12, ['#c2a877', '#a3895c', '#917a52']);
    }, 4);
    this.cache[T.VFLOOR] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#c9ad79');
      speckle(ctx, r, 8, ['#d6ba85', '#b89c6b']);
      px(ctx, 0, 0, P, 1, '#b89c6b'); px(ctx, 0, 8, P, 1, '#b89c6b');
    }, 3);
    this.cache[T.HOUSE] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#8a5a33');
      px(ctx, 0, 0, P, 7, '#a33b2e');
      px(ctx, 0, 7, P, 1, '#7c2d23');
      px(ctx, 2, 9, 4, 5, '#5d3a1d');
      px(ctx, 9, 9, 4, 4, '#ffd86b');
      px(ctx, 10, 9, 1, 4, '#8a5a33'); px(ctx, 9, 11, 4, 1, '#8a5a33');
      speckle(ctx, r, 4, ['#96642f', '#7c4d28']);
    }, 2);
    this.cache[T.BRIDGE] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#2e6da8');
      px(ctx, 0, 2, P, 12, '#8a6a3f');
      for (let i = 0; i < 4; i++) px(ctx, i * 4, 2, 1, 12, '#6f5430');
      px(ctx, 0, 2, P, 1, '#a3804e'); px(ctx, 0, 13, P, 1, '#5d4628');
    }, 2);
    this.cache[T.CAVEWALL] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#2b2438');
      speckle(ctx, r, 10, ['#352c46', '#211b2c']);
      px(ctx, 2, 2, 5, 3, '#3d3352');
      px(ctx, 9, 8, 5, 4, '#3d3352');
    }, 3);
    this.cache[T.CAVEFLOOR] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#4a4258');
      speckle(ctx, r, 12, ['#554c66', '#3f384c', '#5d5470']);
    }, 4);
    this.cache[T.RUINFLOOR] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#7d7a8c');
      px(ctx, 0, 0, P, 1, '#696677'); px(ctx, 0, 8, P, 1, '#696677');
      px(ctx, 8, 0, 1, 8, '#696677'); px(ctx, 4, 8, 1, 8, '#696677');
      speckle(ctx, r, 8, ['#8b8899', '#6e6b7c', '#5f8a5f']);
    }, 3);
    this.cache[T.PILLAR] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#7d7a8c');
      px(ctx, 4, 1, 8, 14, '#a3a0b2');
      px(ctx, 3, 0, 10, 2, '#b5b2c4');
      px(ctx, 3, 14, 10, 2, '#8b8899');
      px(ctx, 6, 4, 1, 8, '#8b8899'); px(ctx, 9, 3, 1, 9, '#8b8899');
      speckle(ctx, r, 4, ['#5f8a5f']);
    }, 2);
    this.cache[T.LAIRFLOOR] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#4a2620');
      speckle(ctx, r, 10, ['#56302a', '#3d1e19', '#62362e']);
      if (r() < 0.4) px(ctx, Math.floor(r() * 12), Math.floor(r() * 12), 2, 1, '#a3452e');
    }, 4);
    this.cache[T.LAVA] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#d44a1e');
      speckle(ctx, r, 12, ['#f06a2a', '#ffb03a', '#b03414']);
      px(ctx, Math.floor(r() * 10), Math.floor(r() * 10), 4, 2, '#ffd23a');
    }, 4);
    this.cache[T.GATE] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#1c1822');
      px(ctx, 1, 1, 14, 14, '#332b44');
      px(ctx, 3, 3, 10, 10, '#211b2c');
      px(ctx, 7, 5, 2, 6, '#d4a73c');
      px(ctx, 6, 7, 4, 2, '#d4a73c');
    }, 1);
    this.cache[T.CHEST] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#5a9e4b');
      px(ctx, 2, 4, 12, 9, '#8a5a33');
      px(ctx, 2, 4, 12, 3, '#a3713f');
      px(ctx, 2, 8, 12, 1, '#5d3a1d');
      px(ctx, 7, 7, 2, 3, '#ffd86b');
      px(ctx, 1, 12, 14, 1, '#3e7a35');
    }, 1);
    this.cache[T.CHEST_OPEN] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#5a9e4b');
      px(ctx, 2, 7, 12, 6, '#8a5a33');
      px(ctx, 2, 3, 12, 3, '#5d3a1d');
      px(ctx, 3, 8, 10, 4, '#2a1c10');
      px(ctx, 1, 12, 14, 1, '#3e7a35');
    }, 1);
    this.cache[T.SHRINE] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#5a9e4b');
      px(ctx, 4, 12, 8, 3, '#8b8899');
      px(ctx, 6, 4, 4, 8, '#a3a0b2');
      px(ctx, 5, 2, 6, 3, '#b5b2c4');
      px(ctx, 7, 0, 2, 3, '#ffd86b');
    }, 1);
    this.cache[T.CROSSROAD] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#b59a6a');
      px(ctx, 7, 3, 2, 12, '#6f5430');
      px(ctx, 3, 3, 10, 3, '#8a6a3f');
      px(ctx, 4, 7, 8, 3, '#8a6a3f');
      px(ctx, 4, 4, 8, 1, '#ffd86b');
    }, 1);
    this.cache[T.PORTAL] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#7d7a8c');
      px(ctx, 2, 1, 12, 14, '#211b2c');
      px(ctx, 4, 3, 8, 10, '#6b2d8f');
      px(ctx, 6, 5, 4, 6, '#a55eea');
      px(ctx, 7, 7, 2, 2, '#e0c3ff');
    }, 1);
    this.cache[T.GROVE] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#3f8f5e');
      speckle(ctx, r, 14, ['#52a871', '#33784e', '#7bed9f']);
      if (r() < 0.5) px(ctx, Math.floor(r() * 13), Math.floor(r() * 13), 2, 2, '#aef5c4');
    }, 4);
    this.cache[T.STAIRS] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#4a4258');
      px(ctx, 2, 2, 12, 12, '#211b2c');
      for (let i = 0; i < 4; i++) px(ctx, 3 + i * 2, 3 + i * 3, 10 - i * 2, 2, '#5d5470');
    }, 1);

    // ---------- new biome tiles ----------
    this.cache[T.SNOW] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#e6eef5'); speckle(ctx, r, 10, ['#f4f8fc', '#d4dde8', '#cdd8e6']); }, 4);
    this.cache[T.ICE] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#acd6ec'); speckle(ctx, r, 6, ['#cdeaf7', '#8fc0db']); px(ctx, 2, 3, 6, 1, '#e4f4fb'); px(ctx, 7, 9, 5, 1, '#e4f4fb'); }, 3);
    this.cache[T.SNOWTREE] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#e6eef5'); px(ctx, 7, 11, 2, 5, '#5d4023');
      px(ctx, 4, 3, 8, 8, '#2e6b4a'); px(ctx, 6, 0, 4, 4, '#2e6b4a');
      px(ctx, 4, 3, 8, 2, '#dff0e8'); px(ctx, 6, 0, 4, 1, '#fff'); speckle(ctx, r, 5, ['#3c8a5e']);
    }, 3);
    this.cache[T.SWAMP] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#4a5a36'); speckle(ctx, r, 14, ['#566a3e', '#3e4d2e', '#6b7a44']); if (r() < 0.5) px(ctx, Math.floor(r() * 12), Math.floor(r() * 12), 2, 1, '#7c8a3e'); }, 4);
    this.cache[T.SWAMPWATER] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#3a4a36'); speckle(ctx, r, 8, ['#46583e', '#2e3c2c']); px(ctx, 3, 5, 4, 1, '#5c6e44'); px(ctx, 8, 10, 3, 1, '#5c6e44'); }, 3);
    this.cache[T.DEADTREE] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#4a5a36'); px(ctx, 7, 4, 2, 12, '#3a2c1e'); px(ctx, 4, 6, 3, 1, '#3a2c1e'); px(ctx, 9, 3, 3, 1, '#3a2c1e'); px(ctx, 5, 9, 2, 1, '#3a2c1e'); }, 2);
    this.cache[T.DUNE] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#e2c785'); speckle(ctx, r, 8, ['#eed595', '#d2b673']); px(ctx, 1, 6, P - 2, 1, '#d2b673'); px(ctx, 2, 11, P - 4, 1, '#d2b673'); }, 3);
    this.cache[T.CACTUS] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#d9c27e'); px(ctx, 6, 3, 4, 12, '#3c8a4a'); px(ctx, 3, 6, 3, 2, '#3c8a4a'); px(ctx, 3, 6, 1, 4, '#3c8a4a'); px(ctx, 10, 8, 3, 2, '#3c8a4a'); px(ctx, 12, 5, 1, 5, '#3c8a4a'); }, 2);
    this.cache[T.ROCK] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#8a8f99'); px(ctx, 3, 6, 10, 8, '#6b7280'); px(ctx, 4, 5, 7, 2, '#9aa2b1'); px(ctx, 5, 9, 4, 2, '#596070'); speckle(ctx, r, 4, ['#828a99']); }, 3);
    this.cache[T.HIGHGRASS] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#6fa35a'); speckle(ctx, r, 14, ['#7eb368', '#5f8f4a', '#8cc472']); for (let i = 0; i < 5; i++) px(ctx, Math.floor(r() * P), Math.floor(r() * P), 1, 3, '#4f7a3a'); }, 4);
    this.cache[T.CURSEDGROUND] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#3a2c44'); speckle(ctx, r, 12, ['#46365280'.slice(0, 7), '#2c2034', '#52406a']); if (r() < 0.4) px(ctx, Math.floor(r() * 12), Math.floor(r() * 12), 2, 2, '#7a4aa8'); }, 4);
    this.cache[T.CURSEDTREE] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#3a2c44'); px(ctx, 7, 5, 2, 11, '#241a2c'); px(ctx, 3, 4, 10, 5, '#2c2038'); px(ctx, 5, 6, 2, 2, '#a55eea'); px(ctx, 9, 5, 2, 2, '#a55eea'); }, 3);
    this.cache[T.OCEAN] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#1d5a86'); speckle(ctx, r, 8, ['#246a9c', '#184d72']); px(ctx, Math.floor(r() * 10), Math.floor(r() * 14), 5, 1, '#3d8fc4'); }, 4);
    this.cache[T.DOCK] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#1d5a86'); px(ctx, 0, 3, P, 11, '#8a6a3f'); for (let i = 0; i < 4; i++) px(ctx, i * 4, 3, 1, 11, '#6f5430'); }, 2);
    this.cache[T.PLAZA] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#c2b390'); px(ctx, 0, 0, P, 1, '#a89a78'); px(ctx, 0, 8, P, 1, '#a89a78'); px(ctx, 8, 0, 1, P, '#a89a78'); speckle(ctx, r, 5, ['#cdbe9a', '#b3a47e']); }, 3);
    this.cache[T.ASH] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#3c3338'); speckle(ctx, r, 12, ['#4a4044', '#2c262a', '#5a4a48']); if (r() < 0.3) px(ctx, Math.floor(r() * 12), Math.floor(r() * 12), 2, 1, '#a3452e'); }, 4);

    // ---------- housing / interior tiles ----------
    this.cache[T.PHOUSE] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#9a6a3f'); px(ctx, 0, 0, P, 6, '#7c4d28'); px(ctx, 0, 6, P, 1, '#5d3a1d');
      for (let i = 0; i < P; i += 4) px(ctx, i, 7, 1, P - 7, '#7c4d28'); speckle(ctx, r, 4, ['#8a5a33']);
    }, 2);
    this.cache[T.HOUSE_DOOR] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#9a6a3f'); px(ctx, 4, 2, 8, 13, '#5d3a1d'); px(ctx, 5, 3, 6, 11, '#4a2c16');
      px(ctx, 9, 8, 2, 2, '#ffd86b');
    }, 1);
    this.cache[T.WOODFLOOR] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#7a5230'); for (let i = 0; i < P; i += 4) px(ctx, 0, i, P, 1, '#6a4528'); speckle(ctx, r, 3, ['#86593a']); }, 3);
    this.cache[T.WALL] = this.make((ctx, r) => { px(ctx, 0, 0, P, P, '#4a3525'); px(ctx, 0, 0, P, 2, '#5d4530'); for (let i = 0; i < P; i += 5) px(ctx, i, 0, 1, P, '#3a2818'); }, 2);
    this.cache[T.RUG] = this.make((ctx) => { px(ctx, 0, 0, P, P, '#7a5230'); px(ctx, 1, 1, P - 2, P - 2, '#8a2f2f'); px(ctx, 3, 3, P - 6, P - 6, '#b04545'); px(ctx, 6, 6, 4, 4, '#d4a73c'); }, 1);
    this.cache[T.INTDOOR] = this.make((ctx) => { px(ctx, 0, 0, P, P, '#4a3525'); px(ctx, 4, 3, 8, 13, '#5d3a1d'); px(ctx, 5, 4, 6, 11, '#3a2412'); px(ctx, 9, 9, 2, 2, '#ffd86b'); }, 1);
    this.cache[T.STORAGE] = this.make((ctx) => { px(ctx, 0, 0, P, P, '#7a5230'); px(ctx, 2, 5, 12, 9, '#6a4a2a'); px(ctx, 2, 5, 12, 3, '#8a6a3a'); px(ctx, 2, 8, 12, 1, '#4a3018'); px(ctx, 7, 8, 2, 3, '#ffd86b'); }, 1);
    this.cache[T.TORCH] = this.make((ctx) => { px(ctx, 0, 0, P, P, '#4a3525'); px(ctx, 7, 6, 2, 7, '#3a2818'); px(ctx, 6, 3, 4, 4, '#ff9234'); px(ctx, 7, 2, 2, 2, '#ffd86b'); }, 1);
    this.cache[T.WINDOW] = this.make((ctx) => { px(ctx, 0, 0, P, P, '#4a3525'); px(ctx, 3, 3, 10, 10, '#2c2436'); px(ctx, 4, 4, 8, 8, '#5a7fb0'); px(ctx, 8, 4, 1, 8, '#3a2818'); px(ctx, 4, 8, 8, 1, '#3a2818'); }, 1);
    // market stall with striped awning + goods
    this.cache[T.STALL] = this.make((ctx, r) => {
      px(ctx, 0, 0, P, P, '#c9ad79');
      px(ctx, 1, 11, 2, 5, '#6f5430'); px(ctx, 13, 11, 2, 5, '#6f5430'); // posts
      px(ctx, 1, 9, 14, 3, '#8a5a33'); // counter
      px(ctx, 0, 2, P, 5, '#b5482f'); // awning base
      for (let i = 0; i < 8; i += 2) px(ctx, i * 2, 2, 2, 5, '#e8ddc2'); // stripes
      px(ctx, 0, 6, P, 1, '#7c2d23');
      // goods on counter
      const goods = ['#d4a73c', '#3d9be9', '#a55eea', '#4caf50'];
      for (let i = 0; i < 3; i++) px(ctx, 3 + i * 4, 7, 2, 2, goods[(v => v)(i + (r() * 4 | 0)) % 4]);
    }, 3);
    this.cache[T.FENCE] = this.make((ctx) => {
      px(ctx, 0, 0, P, P, '#5a9e4b');
      px(ctx, 2, 4, 2, 10, '#7c5836'); px(ctx, 12, 4, 2, 10, '#7c5836'); // posts
      px(ctx, 0, 6, P, 2, '#8a6a3f'); px(ctx, 0, 10, P, 2, '#8a6a3f'); // rails
    }, 1);
  },
};

// ---------- main renderer ----------
const Render = {
  canvas: null, ctx: null, mini: null, miniCtx: null,
  miniCache: null, miniFor: null,
  zoom: 1,

  setZoom(z) {
    this.zoom = clamp(Math.round(z * 20) / 20, 0.6, 2.0);
    TILE = Math.max(12, Math.round(TILE_BASE * this.zoom));
    localStorage.setItem('ef_zoom', this.zoom);
  },
  t: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.mini = document.getElementById('minimap');
    this.miniCtx = this.mini.getContext('2d');
    const z = parseFloat(localStorage.getItem('ef_zoom'));
    this.setZoom(isNaN(z) ? 1 : z);
    TileArt.init();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  draw(dt) {
    this.t += dt;
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    if (!G || !G.player) { ctx.fillStyle = '#0a0805'; ctx.fillRect(0, 0, cw, ch); return; }

    const p = G.player;
    const m = curMap();
    const mapW = m.w * TILE, mapH = m.h * TILE;
    let camX = p.px * TILE + TILE / 2 - cw / 2;
    let camY = p.py * TILE + TILE / 2 - ch / 2;
    // if the map is smaller than the viewport (e.g. a house interior), centre it
    camX = (mapW <= cw) ? (mapW - cw) / 2 : clamp(camX, 0, mapW - cw);
    camY = (mapH <= ch) ? (mapH - ch) / 2 : clamp(camY, 0, mapH - ch);
    if (FX.shakeAmt > 0) {
      camX += (rnd() - 0.5) * FX.shakeAmt * 2;
      camY += (rnd() - 0.5) * FX.shakeAmt * 2;
    }

    ctx.fillStyle = '#0a0805';
    ctx.fillRect(0, 0, cw, ch);

    const x0 = Math.max(0, Math.floor(camX / TILE)), y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(m.w - 1, Math.ceil((camX + cw) / TILE)), y1 = Math.min(m.h - 1, Math.ceil((camY + ch) / TILE));

    // tiles
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = m.tiles[x + y * m.w];
        const art = TileArt.get(t, x, y);
        const sx = Math.round(x * TILE - camX), sy = Math.round(y * TILE - camY);
        if (art) ctx.drawImage(art, sx, sy, TILE, TILE);
        // ambient emitters
        if (t === T.SHRINE && chance(0.02)) FX.spark(x, y, '#ffd86b');
        if (t === T.PORTAL && chance(0.06)) FX.spark(x, y, G.flags.boss_dragonVaelthyx ? '#e0c3ff' : '#554c66');
        if (t === T.LAVA && chance(0.03)) FX.spark(x, y, '#ffb03a');
        if (t === T.GROVE && chance(0.004)) FX.spark(x, y, '#aef5c4');
        if (t === T.GATE && chance(0.02)) FX.spark(x, y, '#d4a73c');
      }
    }

    // chest glow pulse for unopened chests
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(this.t * 3) * 0.15;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (m.tiles[x + y * m.w] === T.CHEST) {
        ctx.fillStyle = '#ffd86b';
        ctx.beginPath();
        ctx.arc(x * TILE - camX + TILE / 2, y * TILE - camY + TILE / 2, TILE * 0.7, 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();

    // NPCs / bosses / foes (overworld only)
    if (!G.inDungeon && !G.inInterior) {
      ctx.font = Math.floor(TILE * 0.8) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const n of G.npcs) {
        if (!npcVisible(n)) continue;
        if (n.x < x0 - 1 || n.x > x1 + 1 || n.y < y0 - 1 || n.y > y1 + 1) continue;
        const sx = n.x * TILE - camX + TILE / 2, sy = n.y * TILE - camY + TILE / 2;
        // glow for important NPCs
        if (n.def.important) {
          ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(this.t * 2.5 + n.x) * 0.08;
          ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.arc(sx, sy, TILE * 0.55, 0, 7); ctx.fill(); ctx.restore();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(sx, sy + TILE * 0.38, TILE * 0.3, TILE * 0.12, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
        ctx.fillText(n.def.icon, sx, sy + Math.sin(this.t * 2 + n.x) * 1.5);
        ctx.restore();
        if (this.npcHasQuest(n)) {
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold ' + Math.floor(TILE * 0.5) + 'px ' + EMOJI_FONT;
          ctx.fillText('!', sx, sy - TILE * 0.7 + Math.sin(this.t * 4) * 2);
          ctx.font = Math.floor(TILE * 0.8) + 'px ' + EMOJI_FONT;
        }
      }
      // bosses
      for (const b of WORLD_BOSSES) {
        if (!bossAlive(b)) continue;
        if (b.loc.x < x0 - 2 || b.loc.x > x1 + 2 || b.loc.y < y0 - 2 || b.loc.y > y1 + 2) continue;
        const def = BOSSES[b.id];
        const sx = b.loc.x * TILE - camX + TILE / 2, sy = b.loc.y * TILE - camY + TILE / 2;
        ctx.save();
        ctx.font = Math.floor(TILE * 1.4) + 'px ' + EMOJI_FONT;
        ctx.shadowColor = '#ff4757'; ctx.shadowBlur = 14 + Math.sin(this.t * 3) * 6;
        ctx.fillText(def.icon, sx, sy + Math.sin(this.t * 1.5) * 2);
        ctx.restore();
        if (chance(0.04)) FX.spark(b.loc.x, b.loc.y, '#ff4757');
      }
      // roaming foes + detection
      this.drawFoes(ctx, camX, camY, x0, y0, x1, y1);
      ctx.font = Math.floor(TILE * 0.8) + 'px ' + EMOJI_FONT;
    }

    // interior furniture overlay
    if (G.inInterior && G.interiorHouse) {
      ctx.font = Math.floor(TILE * 0.75) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const f of (G.interiorHouse.furniture || [])) {
        const sx = f.x * TILE - camX + TILE / 2, sy = f.y * TILE - camY + TILE / 2;
        ctx.fillText(f.icon, sx, sy);
      }
    }

    // docked boat (waiting at the water's edge)
    if (G.boatPos && !p.onBoat && !G.inInterior && !G.inDungeon) {
      const bx = G.boatPos.x * TILE - camX + TILE / 2, by = G.boatPos.y * TILE - camY + TILE / 2;
      ctx.font = Math.floor(TILE * 0.8) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🛶', bx, by + Math.sin(this.t * 2 + bx) * 2);
    }

    // player (pixel hero)
    this.drawPlayer(ctx, p, camX, camY);

    // particles (world space)
    for (const pt of FX.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x * TILE - camX, pt.y * TILE - camY, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // floating texts
    ctx.font = 'bold 15px Verdana';
    for (const f of FX.floats) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, f.x * TILE - camX + 1, f.y * TILE - camY + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x * TILE - camX, f.y * TILE - camY);
    }
    ctx.globalAlpha = 1;

    // placement ghost (build / decorate mode)
    if (Game.placing) this.drawPlacement(ctx, camX, camY);

    // atmospheric lighting for dark places (torches + soft dimming)
    const zone = G.inInterior ? 'interior' : (G.inDungeon ? 'dungeon' : zoneAt(p.x, p.y));
    this.applyLighting(ctx, cw, ch, camX, camY, x0, y0, x1, y1, m, p, zone);

    // ---------- environmental / weather effects ----------
    this.drawEnvironment(ctx, cw, ch, zone);

    this.drawMinimap(p);
  },

  // ---------- atmospheric lighting (caves / dungeon / interiors) ----------
  applyLighting(ctx, cw, ch, camX, camY, x0, y0, x1, y1, m, p, zone) {
    const interior = G.inInterior;
    // Interiors are normally-lit, cozy rooms — not dark caves.
    if (interior) { this.lightInterior(ctx, cw, ch, camX, camY, x0, y0, x1, y1, m); return; }
    const dark = ZONES[zone] && ZONES[zone].dark;
    if (!dark) return;
    const px = p.px * TILE - camX + TILE / 2, py = p.py * TILE - camY + TILE / 2;
    const flick = 1 + Math.sin(this.t * 9) * 0.025 + Math.sin(this.t * 23) * 0.012;
    const R = TILE * (interior ? 5.6 : 6.6) * flick;
    // base darkness tint (warmer indoors, cold/violet in the cursed reach)
    let base, edge;
    if (interior) { base = '6,4,12'; edge = 0.8; }
    else if (zone === 'cursed') { base = '20,8,32'; edge = 0.9; }
    else { base = '4,4,10'; edge = 0.92; }
    // soft multi-stop darkness with a gentle light pocket around the hero
    const g = ctx.createRadialGradient(px, py, R * 0.16, px, py, R);
    g.addColorStop(0, 'rgba(' + base + ',0)');
    g.addColorStop(0.45, 'rgba(' + base + ',0.06)');
    g.addColorStop(0.72, 'rgba(' + base + ',' + (edge * 0.55).toFixed(2) + ')');
    g.addColorStop(1, 'rgba(' + base + ',' + edge + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

    // warm light the hero carries + glow from emissive tiles (additive)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const warm = ctx.createRadialGradient(px, py, 0, px, py, R * 0.72);
    warm.addColorStop(0, 'rgba(255,170,80,' + (0.17 * flick).toFixed(3) + ')');
    warm.addColorStop(0.5, 'rgba(255,140,60,0.06)');
    warm.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = warm; ctx.fillRect(0, 0, cw, ch);

    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = m.tiles[x + y * m.w];
      let col = null, rad = 3.2, sp = '#ffb347';
      if (t === T.TORCH) { col = '255,170,70'; }
      else if (t === T.LAVA) { col = '255,110,40'; rad = 2.6; sp = '#ff7b2e'; }
      else if (t === T.SHRINE) { col = '255,225,130'; rad = 3.0; sp = '#ffe08a'; }
      else if (t === T.PORTAL) { col = '170,110,240'; rad = 3.0; sp = '#c79bff'; }
      else if (t === T.STORAGE && interior) { col = '255,210,120'; rad = 2.0; }
      else if (t === T.GATE) { col = '212,167,60'; rad = 2.2; sp = '#d4a73c'; }
      if (col) {
        const tx = x * TILE - camX + TILE / 2, ty = y * TILE - camY + TILE / 2;
        const fl = 0.45 + Math.sin(this.t * 8 + x * 1.3 + y) * 0.12;
        const tg = ctx.createRadialGradient(tx, ty, 2, tx, ty, TILE * rad);
        tg.addColorStop(0, 'rgba(' + col + ',' + fl.toFixed(3) + ')');
        tg.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, TILE * rad, 0, 7); ctx.fill();
        if (chance(0.05)) FX.spark(x, y - 0.2, sp);
      }
    }
    // keep roaming foes lit so they're visible in the gloom
    if (!interior && typeof Foes !== 'undefined') {
      for (const f of Foes.list) {
        if (!f.alive || f.x < x0 - 1 || f.x > x1 + 1 || f.y < y0 - 1 || f.y > y1 + 1) continue;
        const tx = f.x * TILE - camX + TILE / 2, ty = f.y * TILE - camY + TILE / 2;
        const col = f.state === 'chase' ? '255,71,87' : '230,200,150';
        const tg = ctx.createRadialGradient(tx, ty, 2, tx, ty, TILE * 1.6);
        tg.addColorStop(0, 'rgba(' + col + ',0.5)'); tg.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, TILE * 1.6, 0, 7); ctx.fill();
      }
    }
    ctx.restore();

    // subtle edge vignette for polish
    const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.36, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
  },

  // a normally-lit, cozy interior: warm ambience + torch glows, no cave gloom
  lightInterior(ctx, cw, ch, camX, camY, x0, y0, x1, y1, m) {
    // gentle warm tint so it reads as indoors, but the whole room stays clear
    ctx.fillStyle = 'rgba(60,40,18,0.10)';
    ctx.fillRect(0, 0, cw, ch);
    // additive warm pools from torches
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = m.tiles[x + y * m.w];
      if (t !== T.TORCH && t !== T.WINDOW) continue;
      const tx = x * TILE - camX + TILE / 2, ty = y * TILE - camY + TILE / 2;
      if (t === T.TORCH) {
        const fl = 0.32 + Math.sin(this.t * 8 + x * 1.3 + y) * 0.08;
        const tg = ctx.createRadialGradient(tx, ty, 2, tx, ty, TILE * 3.4);
        tg.addColorStop(0, 'rgba(255,180,90,' + fl.toFixed(3) + ')');
        tg.addColorStop(1, 'rgba(255,180,90,0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty, TILE * 3.4, 0, 7); ctx.fill();
        if (chance(0.04)) FX.spark(x, y - 0.2, '#ffce8a');
      } else { // soft daylight from windows
        const tg = ctx.createRadialGradient(tx, ty + TILE, 2, tx, ty + TILE, TILE * 3);
        tg.addColorStop(0, 'rgba(150,180,220,0.12)');
        tg.addColorStop(1, 'rgba(150,180,220,0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(tx, ty + TILE, TILE * 3, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
    // faint vignette only at the very screen edges
    const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.5, cw / 2, ch / 2, Math.max(cw, ch) * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,6,2,0.3)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
  },

  // ---------- full world map (opened from the minimap) ----------
  drawFullMap(canvas) {
    const m = curMap();
    this.drawMinimap(G.player); // ensure miniCache is current
    if (!this.miniCache) return;
    const maxW = Math.min(window.innerWidth * 0.86, 860);
    const maxH = window.innerHeight * 0.74;
    const aspect = m.w / m.h;
    let cw = maxW, chh = cw / aspect;
    if (chh > maxH) { chh = maxH; cw = chh * aspect; }
    canvas.width = Math.round(cw); canvas.height = Math.round(chh);
    canvas.style.width = Math.round(cw) + 'px'; canvas.style.height = Math.round(chh) + 'px';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0805'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.miniCache, 0, 0, canvas.width, canvas.height);
    const sx = canvas.width / m.w, sy = canvas.height / m.h;
    ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center';
    const label = (loc, text, color) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(loc.x * sx, loc.y * sy, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillText(text, loc.x * sx + 1, loc.y * sy - 6 + 1);
      ctx.fillStyle = '#fff'; ctx.fillText(text, loc.x * sx, loc.y * sy - 6);
    };
    if (!G.inDungeon && !G.inInterior) {
      // settlements
      label(VILLAGE_C, 'Eldenbrook', '#ffd700');
      label(LOCS.frostmere, 'Frostmere', '#bfe6ff');
      label(LOCS.sunspear, 'Sunspear', '#f0d27a');
      label(LOCS.saltwind, 'Saltwind', '#9bd0ff');
      // living bosses
      for (const b of WORLD_BOSSES) {
        if (!bossAlive(b)) continue;
        ctx.fillStyle = '#ff4757';
        ctx.beginPath(); ctx.arc(b.loc.x * sx, b.loc.y * sy, 4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      }
      // owned houses
      for (const h of (G.houses || [])) {
        const d = House.doorCell(h);
        ctx.fillStyle = '#d4a73c';
        ctx.fillRect(d.x * sx - 2, d.y * sy - 2, 4, 4);
      }
    }
    // player
    const px = G.player.px * sx, py = G.player.py * sy;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
  },

  // roaming foes with detection radius + alert
  drawFoes(ctx, camX, camY, x0, y0, x1, y1) {
    if (typeof Foes === 'undefined') return;
    for (const f of Foes.list) {
      if (!f.alive) continue;
      if (f.x < x0 - 2 || f.x > x1 + 2 || f.y < y0 - 2 || f.y > y1 + 2) continue;
      const sx = f.x * TILE - camX + TILE / 2, sy = f.y * TILE - camY + TILE / 2;
      const chasing = f.state === 'chase';
      // detection radius — thin ring only (no heavy fill), so foes stay readable
      const rng = Foes.detectRange(f);
      if (rng > 0) {
        ctx.save();
        ctx.globalAlpha = chasing ? 0.10 : 0.045;
        ctx.fillStyle = chasing ? '#ff4757' : '#cfc09a';
        ctx.beginPath(); ctx.arc(sx, sy, rng * TILE, 0, 7); ctx.fill();
        ctx.globalAlpha = chasing ? 0.45 : 0.2;
        ctx.strokeStyle = chasing ? '#ff4757' : '#9a8f70'; ctx.lineWidth = 1.5;
        ctx.setLineDash(chasing ? [] : [4, 4]);
        ctx.beginPath(); ctx.arc(sx, sy, rng * TILE, 0, 7); ctx.stroke();
        ctx.restore();
      }
      // ground shadow
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(sx, sy + TILE * 0.34, TILE * 0.3, TILE * 0.11, 0, 0, 7); ctx.fill();
      const bob = chasing ? Math.sin(this.t * 16) * 2 : Math.sin(this.t * 3 + f.x) * 1;
      // opaque colored sprite with a soft drop shadow for contrast (no blob)
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.shadowColor = chasing ? 'rgba(255,71,87,0.9)' : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = chasing ? 12 : 5;
      ctx.font = Math.floor(TILE * 0.88) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(f.icon, sx, sy + bob);
      ctx.restore();
      // alert indicator
      if (f.alert > 0.05) {
        ctx.globalAlpha = clamp(f.alert, 0, 1);
        ctx.fillStyle = f.state === 'chase' ? '#ff4757' : '#ffd700';
        ctx.font = 'bold ' + Math.floor(TILE * 0.55) + 'px ' + EMOJI_FONT;
        ctx.fillText(f.state === 'chase' ? '!' : '?', sx, sy - TILE * 0.7 + Math.sin(this.t * 6) * 2);
        ctx.globalAlpha = 1;
      }
    }
  },

  drawPlacement(ctx, camX, camY) {
    const pl = Game.placing;
    ctx.save();
    if (pl.kind === 'house') {
      const tp = HOUSE_TYPES[pl.type];
      const doorDx = Math.floor(tp.w / 2);
      for (let dy = 0; dy < tp.h; dy++) for (let dx = 0; dx < tp.w; dx++) {
        const cellOk = pl.valid; // whole-footprint validity
        const sx = (pl.gx + dx) * TILE - camX, sy = (pl.gy + dy) * TILE - camY;
        ctx.fillStyle = cellOk ? 'rgba(80,220,120,0.32)' : 'rgba(230,70,70,0.32)';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.strokeStyle = cellOk ? '#7bed9f' : '#ff4757'; ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        if (dx === doorDx && dy === tp.h - 1) {
          ctx.fillStyle = cellOk ? '#7bed9f' : '#ff4757';
          ctx.font = Math.floor(TILE * 0.6) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🚪', sx + TILE / 2, sy + TILE / 2);
        }
      }
      ctx.fillStyle = '#fff'; ctx.font = Math.floor(TILE * 0.9) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tp.icon, (pl.gx + tp.w / 2) * TILE - camX, (pl.gy) * TILE - camY - TILE * 0.4);
    } else {
      const sx = pl.gx * TILE - camX, sy = pl.gy * TILE - camY;
      ctx.fillStyle = pl.valid ? 'rgba(80,220,120,0.3)' : 'rgba(230,70,70,0.3)';
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = pl.valid ? '#7bed9f' : '#ff4757'; ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
      ctx.font = Math.floor(TILE * 0.7) + 'px ' + EMOJI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.8; ctx.fillText(pl.item.icon, sx + TILE / 2, sy + TILE / 2);
    }
    ctx.restore();
  },

  // biome ambience + weather
  drawEnvironment(ctx, cw, ch, zone) {
    // rain (weather)
    if (G.weather === 'rain' && !G.inInterior && !G.inDungeon) {
      ctx.strokeStyle = 'rgba(160,200,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const rx = ((i * 67 + this.t * 600) % (cw + 40)) - 20;
        const ry = ((i * 131 + this.t * 900) % (ch + 40)) - 20;
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 12);
      }
      ctx.stroke();
    }
    if (G.inInterior || G.inDungeon) return;
    const N = 60;
    if (zone === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < N; i++) {
        const sx = ((i * 53 + this.t * 40) % (cw + 20)) - 10 + Math.sin(this.t * 2 + i) * 8;
        const sy = ((i * 97 + this.t * 70) % (ch + 20)) - 10;
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (zone === 'forest' || zone === 'grove') {
      ctx.fillStyle = 'rgba(120,180,90,0.6)';
      for (let i = 0; i < 26; i++) {
        const sx = ((i * 71 + this.t * 30) % (cw + 20)) - 10 + Math.sin(this.t * 1.5 + i) * 14;
        const sy = ((i * 113 + this.t * 45) % (ch + 20)) - 10;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.t + i); ctx.fillRect(-2, -1, 4, 2); ctx.restore();
      }
    } else if (zone === 'swamp' || zone === 'cursed') {
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, zone === 'cursed' ? 'rgba(60,30,80,0.18)' : 'rgba(80,100,60,0.16)');
      g.addColorStop(1, 'rgba(20,20,20,0.05)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = zone === 'cursed' ? 'rgba(180,120,255,0.5)' : 'rgba(150,200,120,0.5)';
      for (let i = 0; i < 16; i++) {
        const sx = (i * 89 + Math.sin(this.t * 0.7 + i) * 40 + this.t * 10) % cw;
        const sy = (i * 53 + Math.cos(this.t * 0.5 + i) * 30) % ch;
        ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, 7); ctx.fill();
      }
    } else if (zone === 'volcanic' || zone === 'lair') {
      ctx.fillStyle = 'rgba(255,140,50,0.7)';
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 61 + Math.sin(this.t + i) * 20) % cw);
        const sy = ch - ((i * 83 + this.t * 60) % (ch + 20));
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (zone === 'desert') {
      ctx.strokeStyle = 'rgba(220,200,150,0.12)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 30; i++) {
        const ry = (i * 41 + this.t * 20) % ch;
        ctx.moveTo(0, ry); ctx.lineTo(cw, ry + 6);
      }
      ctx.stroke();
    }
  },

  npcHasQuest(n) {
    const id = n.id;
    if (id === 'elder') {
      return (!G.quests.m1) || (G.flags.avail_m2 && !G.quests.m2) || (G.flags.avail_m3 && !G.quests.m3) || (G.flags.avail_m4 && !G.quests.m4) ||
        ['m1', 'm2', 'm3'].some(q => questActive(q) && curStage(q) && curStage(q).kind === 'talk' && curStage(q).npc === 'elder');
    }
    const turnIn = Object.keys(G.quests).some(q => {
      const s = curStage(q);
      return s && s.kind === 'talk' && s.npc === id;
    });
    if (turnIn) return true;
    if (id === 'mab' && !G.quests.sCat && !G.flags.done_sCat) return true;
    if (id === 'healer' && !questActive('sHerbs')) return true;
    if (id === 'blacksmith' && !G.quests.sOre && !G.flags.done_sOre && G.flags.done_m1) return true;
    return false;
  },

  drawPlayer(ctx, p, camX, camY) {
    const cls = CLASSES[p.cls];
    const sx = p.px * TILE - camX + TILE / 2;
    const sy = p.py * TILE - camY + TILE / 2;
    // funny sailing bob when aboard the boat (rocks side to side + up & down)
    const sailing = p.onBoat;
    const bob = sailing ? Math.sin(this.t * 6) * 4 : (p.moving ? Math.sin(this.t * 14) * 2 : Math.sin(this.t * 2.5) * 1);
    const tilt = sailing ? Math.sin(this.t * 4) * 0.12 : 0;
    const s = TILE / 16;
    if (sailing) {
      // wake ripples behind the boat
      if (chance(0.5)) FX.spark(p.px + (rnd() - 0.5) * 0.6, p.py + 0.4, '#bfe6ff');
      ctx.save();
      ctx.font = Math.floor(TILE * 1.05) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🛶', sx, sy + 6 * s + bob * 0.3);
      ctx.restore();
    }
    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 7 * s, 5.5 * s, 2 * s, 0, 0, 7); ctx.fill();
    ctx.translate(sx, sy + bob * 0.5);
    if (tilt) ctx.rotate(tilt);
    if (p.facing === 'left') ctx.scale(-1, 1);
    const body = cls.color, skin = '#eec39a', hair = '#5d3a1d';
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, w * s, h * s); };
    // legs
    const legShift = p.moving ? Math.sin(this.t * 14) * 1.5 : 0;
    R(-3, 3 + legShift * 0.3, 2.5, 4 - legShift * 0.3, '#3a2c17');
    R(0.5, 3 - legShift * 0.3, 2.5, 4 + legShift * 0.3, '#3a2c17');
    // body / tunic
    R(-4, -2, 8, 6, body);
    R(-4, 3, 8, 1, '#2a2017');
    // arms
    R(-5.5, -1, 1.8, 4.5, body);
    R(3.7, -1, 1.8, 4.5, skin);
    // head
    R(-3, -8, 6, 6, skin);
    R(-3.5, -9, 7, 2.5, hair);
    R(-3.5, -7.5, 1.2, 2, hair);
    // eyes
    if (p.facing !== 'up') { R(-1.5, -6, 1, 1.2, '#222'); R(1, -6, 1, 1.2, '#222'); }
    // weapon hint
    const wpn = p.equipment.weapon;
    if (wpn) {
      ctx.font = (7 * s) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(wpn.icon, 6.5 * s, 1 * s);
    }
    ctx.restore();
    // blessed glow
    if (p.status.some(st => st.id === 'blessed')) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.t * 4) * 0.15;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(sx, sy - 2, TILE * 0.65, 0, 7); ctx.fill();
      ctx.restore();
      if (chance(0.05)) FX.spark(p.px, p.py - 0.3, '#ffd700');
    }
  },

  // ---------- minimap ----------
  MINI_COLORS: {
    [T.GRASS]: '#4f8f42', [T.FLOWERS]: '#6cb35a', [T.TREE]: '#2e6b2a', [T.WATER]: '#2e6da8',
    [T.SAND]: '#d9c27e', [T.MOUNTAIN]: '#6b7280', [T.PATH]: '#b59a6a', [T.VFLOOR]: '#c9ad79',
    [T.HOUSE]: '#a33b2e', [T.BRIDGE]: '#8a6a3f', [T.CAVEWALL]: '#211b2c', [T.CAVEFLOOR]: '#4a4258',
    [T.RUINFLOOR]: '#7d7a8c', [T.PILLAR]: '#a3a0b2', [T.LAIRFLOOR]: '#4a2620', [T.GATE]: '#d4a73c',
    [T.CHEST]: '#ffd86b', [T.CHEST_OPEN]: '#8a5a33', [T.SHRINE]: '#ffd86b', [T.CROSSROAD]: '#e8d9b0',
    [T.PORTAL]: '#a55eea', [T.LAVA]: '#f06a2a', [T.GROVE]: '#3f8f5e', [T.STAIRS]: '#e8d9b0',
    [T.SNOW]: '#e6eef5', [T.ICE]: '#acd6ec', [T.SNOWTREE]: '#2e6b4a', [T.SWAMP]: '#4a5a36',
    [T.SWAMPWATER]: '#3a4a36', [T.DEADTREE]: '#3a2c1e', [T.DUNE]: '#e2c785', [T.CACTUS]: '#3c8a4a',
    [T.ROCK]: '#6b7280', [T.HIGHGRASS]: '#6fa35a', [T.CURSEDGROUND]: '#3a2c44', [T.CURSEDTREE]: '#241a2c',
    [T.OCEAN]: '#1d5a86', [T.DOCK]: '#8a6a3f', [T.PLAZA]: '#c2b390', [T.ASH]: '#3c3338',
    [T.PHOUSE]: '#9a6a3f', [T.HOUSE_DOOR]: '#ffd86b', [T.WOODFLOOR]: '#7a5230', [T.WALL]: '#4a3525',
    [T.RUG]: '#b04545', [T.INTDOOR]: '#ffd86b', [T.STORAGE]: '#8a6a3a', [T.TORCH]: '#ff9234', [T.WINDOW]: '#5a7fb0',
    [T.STALL]: '#b5482f', [T.FENCE]: '#7c5836',
  },

  drawMinimap(p) {
    const m = curMap();
    const key = (G.inInterior ? 'int' + (G.interiorHouse && G.interiorHouse.id) : G.inDungeon ? 'd' + G.dungeonFloor : 'w') + ':' + G.openedChests.length + ':' + ((G.houses && G.houses.length) || 0);
    if (this.miniFor !== key) {
      this.miniFor = key;
      const c = document.createElement('canvas');
      c.width = m.w; c.height = m.h;
      const mc = c.getContext('2d');
      const img = mc.createImageData(m.w, m.h);
      for (let i = 0; i < m.tiles.length; i++) {
        const col = this.MINI_COLORS[m.tiles[i]] || '#000';
        const r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
        img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
      }
      mc.putImageData(img, 0, 0);
      this.miniCache = c;
    }
    const mm = this.miniCtx;
    mm.imageSmoothingEnabled = false;
    mm.clearRect(0, 0, this.mini.width, this.mini.height);
    const sc = this.mini.width / m.w;
    mm.drawImage(this.miniCache, 0, 0, this.mini.width, this.mini.height);
    // bosses
    if (!G.inDungeon && !G.inInterior) {
      for (const b of WORLD_BOSSES) {
        if (!bossAlive(b)) continue;
        mm.fillStyle = '#ff4757';
        mm.fillRect(b.loc.x * sc - 1.5, b.loc.y * sc - 1.5, 3, 3);
      }
    }
    // player blip
    mm.fillStyle = '#fff';
    const blink = Math.sin(this.t * 6) > -0.4;
    if (blink) mm.fillRect(p.px * sc - 2, p.py * sc - 2, 4, 4);
    mm.strokeStyle = '#ffd700'; mm.lineWidth = 1;
    mm.strokeRect(p.px * sc - 3, p.py * sc - 3, 6, 6);
  },
};
