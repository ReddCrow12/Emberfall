/* ============ Emberfall — world generation & map queries ============
 * v2: large 200x200 multi-biome world (radial biome layout with noisy
 * transition borders), several settlements & dungeons, build-zone helper,
 * and house-interior map support. Public API is unchanged so older modules
 * keep working: genWorld / curMap / tileAt / setTileAt / zoneAt / isBlocked
 * / genDungeon / LOCS / VILLAGE_C / T / SOLID.
 */
'use strict';

// Tile ids — original 0..23 kept stable; new biome/house tiles appended.
const T = {
  GRASS: 0, TREE: 1, WATER: 2, SAND: 3, MOUNTAIN: 4, PATH: 5, VFLOOR: 6, HOUSE: 7,
  BRIDGE: 8, CAVEWALL: 9, CAVEFLOOR: 10, RUINFLOOR: 11, PILLAR: 12, LAIRFLOOR: 13,
  GATE: 14, CHEST: 15, SHRINE: 16, CROSSROAD: 17, PORTAL: 18, FLOWERS: 19, LAVA: 20,
  GROVE: 21, STAIRS: 22, CHEST_OPEN: 23,
  // --- biomes ---
  SNOW: 24, SNOWTREE: 25, ICE: 26, SWAMP: 27, SWAMPWATER: 28, DEADTREE: 29,
  DUNE: 30, CACTUS: 31, ROCK: 32, HIGHGRASS: 33, CURSEDGROUND: 34, CURSEDTREE: 35,
  OCEAN: 36, DOCK: 37, PLAZA: 38, ASH: 39,
  // --- housing / interiors ---
  WOODFLOOR: 40, WALL: 41, RUG: 42, INTDOOR: 43, HOUSE_DOOR: 44, PHOUSE: 45,
  STORAGE: 46, TORCH: 47, WINDOW: 48,
  // --- village dressing ---
  STALL: 49, FENCE: 50,
};
const SOLID = new Set([
  T.TREE, T.WATER, T.MOUNTAIN, T.HOUSE, T.CAVEWALL, T.PILLAR, T.LAVA, T.CHEST, T.CHEST_OPEN,
  T.SNOWTREE, T.DEADTREE, T.CACTUS, T.ROCK, T.CURSEDTREE, T.OCEAN,
  T.WALL, T.PHOUSE, T.STORAGE, T.WINDOW, T.TORCH, T.STALL, T.FENCE,
]);

// Market stalls in Eldenbrook: vendor stands one tile south of the stall.
const VILLAGE_STALLS = [
  { id: 'shop',       x: 96,  y: 101 },
  { id: 'blacksmith', x: 100, y: 101 },
  { id: 'armorer',    x: 104, y: 101 },
  { id: 'alchemist',  x: 96,  y: 104 },
  { id: 'furnisher',  x: 100, y: 104 },
  { id: 'realtor',    x: 104, y: 104 },
];
// natural ground players may build on
const BUILDABLE = new Set([T.GRASS, T.FLOWERS, T.SNOW, T.SAND, T.DUNE, T.HIGHGRASS]);
// ground that triggers random/foe activity & is walkable open terrain
const OPEN_GROUND = new Set([
  T.GRASS, T.FLOWERS, T.SAND, T.PATH, T.SNOW, T.ICE, T.SWAMP, T.SWAMPWATER, T.DUNE,
  T.HIGHGRASS, T.CURSEDGROUND, T.GROVE, T.VFLOOR, T.PLAZA, T.DOCK, T.BRIDGE,
  T.CAVEFLOOR, T.RUINFLOOR, T.LAIRFLOOR, T.ASH,
]);

const ZONE_IDS = [
  'village', 'plains', 'forest', 'river', 'mountain', 'cave', 'ruins', 'lair', 'grove',
  'dungeon', 'snow', 'desert', 'swamp', 'highland', 'volcanic', 'cursed', 'coast', 'town',
  'island', 'interior',
];
const ZI = {}; ZONE_IDS.forEach((z, i) => ZI[z] = i);

const WORLD_W = 200, WORLD_H = 200;
const VILLAGE_C = { x: 100, y: 100 };

// Key world locations on the new map.
const LOCS = {
  spawn: { x: 100, y: 107 },
  caveBoss: { x: 100, y: 26 },        // Goblin King — Gloomhollow (north highland)
  lichBoss: { x: 172, y: 100 },       // Lich Kareth — Ruins of Varnath (east)
  guardianBoss: { x: 26, y: 100 },    // Ancient Guardian — Hidden Grove (west)
  dragonBoss: { x: 168, y: 30 },      // Vaelthyx — Dragon's Lair (north-east, volcanic)
  voidBoss: { x: 22, y: 104 },        // Void Wraith (secret, grove)
  frostBoss: { x: 32, y: 30 },        // Frost Titan (snow, NW)
  sandBoss: { x: 32, y: 170 },        // Sand Wyrm (desert, SW)
  portal: { x: 178, y: 106 },         // Endless Depths portal (ruins)
  lairGate: { x: 160, y: 42 },        // obsidian door to dragon's lair
  groveGate: { x: 40, y: 100 },       // thorn-wall to hidden grove
  realtor: { x: 109, y: 100 },        // village real-estate agent
  // settlements
  frostmere: { x: 40, y: 40 },        // snow town (NW)
  sunspear: { x: 40, y: 160 },        // desert outpost (SW)
  saltwind: { x: 162, y: 162 },       // coastal town (SE)
  island: { x: 186, y: 184 },         // hidden island (SE ocean)
};

// ---------- seeded value noise ----------
function makeNoise(seed) {
  const r = mulberry32(seed);
  const grid = [];
  for (let i = 0; i < 128 * 128; i++) grid.push(r());
  return function (x, y) {
    const gx = Math.floor(x), gy = Math.floor(y);
    const fx = x - gx, fy = y - gy;
    const g = (a, b) => grid[(((a % 128) + 128) % 128) + (((b % 128) + 128) % 128) * 128];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g(gx, gy) + sx * (g(gx + 1, gy) - g(gx, gy));
    const b = g(gx, gy + 1) + sx * (g(gx + 1, gy + 1) - g(gx, gy + 1));
    return a + sy * (b - a);
  };
}

// Biomes radiate from the centre in 8 sectors; SE outer becomes ocean/coast.
const SECTOR_BIOME = ['ruins', 'cursed', 'swamp', 'desert', 'forest', 'snow', 'highland', 'volcanic'];

function classifyBiome(x, y, warp, sectorNoise) {
  const dx = x - VILLAGE_C.x, dy = y - VILLAGE_C.y;
  let dist = Math.hypot(dx, dy);
  dist += (warp(x * 0.04, y * 0.04) - 0.5) * 22; // wobble borders
  if (dist < 22) return { biome: 'plains', dist };
  let ang = Math.atan2(dy, dx); if (ang < 0) ang += Math.PI * 2;
  ang += (sectorNoise(x * 0.05, y * 0.05) - 0.5) * 0.7; // jagged sector borders
  if (ang < 0) ang += Math.PI * 2; if (ang >= Math.PI * 2) ang -= Math.PI * 2;
  const sector = Math.floor(ang / (Math.PI / 4)) % 8;
  let biome = SECTOR_BIOME[sector];
  // South-east outer ring is the sea
  if ((biome === 'cursed' || biome === 'swamp') && dist > 64 && x > 120) biome = 'coast';
  return { biome, dist };
}

function genWorld(seed) {
  const W = WORLD_W, H = WORLD_H;
  const tiles = new Uint8Array(W * H);
  const zones = new Uint8Array(W * H);
  const rand = mulberry32(seed);
  const warp = makeNoise(seed ^ 0x9e3779b9);
  const sectorNoise = makeNoise(seed ^ 0x51ed270b);
  const detail = makeNoise(seed ^ 0x2545f491);
  const idx = (x, y) => x + y * W;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[idx(x, y)] = t; };
  const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? tiles[idx(x, y)] : T.MOUNTAIN;
  const setZ = (x, y, z) => { if (x >= 0 && y >= 0 && x < W && y < H) zones[idx(x, y)] = ZI[z]; };

  // --- 1. paint biomes ---
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x < 2 || y < 2 || x > W - 3 || y > H - 3) { set(x, y, T.MOUNTAIN); setZ(x, y, 'mountain'); continue; }
      const { biome, dist } = classifyBiome(x, y, warp, sectorNoise);
      const d = detail(x * 0.16, y * 0.16);
      const d2 = detail(x * 0.5 + 11, y * 0.5 + 7);
      let t = T.GRASS, zone = biome;
      switch (biome) {
        case 'plains':
          t = d > 0.7 ? T.TREE : (d2 < 0.12 ? T.FLOWERS : T.GRASS); zone = 'plains'; break;
        case 'forest':
          t = d > 0.42 ? T.TREE : (d2 < 0.12 ? T.FLOWERS : T.GRASS); zone = 'forest'; break;
        case 'snow':
          t = d > 0.62 ? T.SNOWTREE : (d2 < 0.1 ? T.ICE : (d > 0.55 ? T.ROCK : T.SNOW)); break;
        case 'desert':
          t = d > 0.7 ? T.CACTUS : (d > 0.5 ? T.DUNE : (d2 < 0.06 ? T.ROCK : T.SAND)); break;
        case 'swamp':
          t = d > 0.66 ? T.DEADTREE : (d < 0.34 ? T.SWAMPWATER : T.SWAMP); break;
        case 'highland':
          t = d > 0.66 ? T.MOUNTAIN : (d > 0.5 ? T.ROCK : (d2 > 0.85 ? T.TREE : T.HIGHGRASS)); break;
        case 'volcanic':
          t = d < 0.28 ? T.LAVA : (d > 0.7 ? T.ROCK : T.ASH); break;
        case 'cursed':
          t = d > 0.6 ? T.CURSEDTREE : (d2 < 0.08 ? T.ROCK : T.CURSEDGROUND); break;
        case 'ruins':
          t = d > 0.78 ? T.PILLAR : (d > 0.6 ? T.RUINFLOOR : (d2 > 0.9 ? T.TREE : T.GRASS)); break;
        case 'coast':
          if (dist > 78) { t = T.OCEAN; } else { t = d2 < 0.4 ? T.SAND : T.GRASS; }
          break;
      }
      // hard mountain/ocean border at the very edge
      if (dist > 92) { t = (biome === 'coast') ? T.OCEAN : T.MOUNTAIN; zone = (biome === 'coast') ? 'coast' : 'mountain'; }
      set(x, y, t); setZ(x, y, zone);
    }
  }

  // --- 2. rivers from the northern highlands down to the sea ---
  const carveRiver = (sx, sy, ex, ey) => {
    let x = sx, y = sy;
    let steps = 0;
    while ((Math.abs(x - ex) > 1 || Math.abs(y - ey) > 1) && steps++ < 600) {
      const wob = Math.round((warp(x * 0.1, y * 0.1) - 0.5) * 3);
      for (let dx = -1; dx <= 1; dx++) {
        const tx = x + dx + wob;
        if (get(tx, y) !== T.MOUNTAIN && get(tx, y) !== T.OCEAN) { set(tx, y, T.WATER); setZ(tx, y, 'river'); }
      }
      if (Math.abs(x - ex) > Math.abs(y - ey)) x += Math.sign(ex - x); else y += Math.sign(ey - y);
    }
  };
  carveRiver(108, 30, 150, 150);
  carveRiver(70, 40, 60, 150);

  // --- helpers for structures ---
  const carveRect = (x0, y0, x1, y1, floor, wall, zone) => {
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      const inner = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      set(x, y, inner ? floor : wall); setZ(x, y, zone);
    }
  };
  const blob = (cx, cy, r, floor, zone, keepClear) => {
    for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      if (Math.hypot(x - cx, y - cy) <= r) { set(x, y, floor); setZ(x, y, zone); }
    }
    if (keepClear) keepClear.forEach(([kx, ky]) => set(cx + kx, cy + ky, floor));
  };

  // --- 3. dungeons / boss arenas ---
  // Gloomhollow Cave (highland, north)
  carveRect(88, 8, 112, 24, T.CAVEFLOOR, T.CAVEWALL, 'cave');
  for (let i = 0; i < 30; i++) { const bx = 90 + Math.floor(rand() * 21), by = 10 + Math.floor(rand() * 13);
    if (Math.abs(bx - 100) < 3 && by < 14) continue; if (Math.abs(bx - 100) < 2 && by > 21) continue; set(bx, by, T.CAVEWALL); }
  for (let y = 24; y <= 30; y++) { set(100, y, T.CAVEFLOOR); set(101, y, T.CAVEFLOOR); setZ(100, y, 'cave'); setZ(101, y, 'cave'); }

  // Dragon's Lair (volcanic, NE)
  carveRect(158, 16, 180, 36, T.LAIRFLOOR, T.MOUNTAIN, 'lair');
  for (let i = 0; i < 18; i++) { const bx = 160 + Math.floor(rand() * 19), by = 18 + Math.floor(rand() * 16);
    if (Math.abs(bx - 168) < 4 && by < 34) continue; set(bx, by, T.LAVA); }
  for (let y = 36; y <= 44; y++) { set(168, y, T.LAIRFLOOR); set(169, y, T.LAIRFLOOR); setZ(168, y, 'lair'); setZ(169, y, 'lair'); }
  set(LOCS.lairGate.x, LOCS.lairGate.y, T.GATE); set(LOCS.lairGate.x + 1, LOCS.lairGate.y, T.MOUNTAIN);

  // Ruins of Old Varnath (east)
  carveRect(160, 90, 186, 112, T.RUINFLOOR, T.PILLAR, 'ruins');
  set(159, 100, T.RUINFLOOR); setZ(159, 100, 'ruins');
  for (let i = 0; i < 26; i++) { const bx = 162 + Math.floor(rand() * 23), by = 91 + Math.floor(rand() * 20);
    if (Math.abs(bx - 172) < 3 && Math.abs(by - 100) < 3) continue; if (Math.abs(bx - 178) < 2 && Math.abs(by - 106) < 2) continue; set(bx, by, T.PILLAR); }
  set(LOCS.portal.x, LOCS.portal.y, T.PORTAL);

  // Hidden Grove (west, walled by thorns)
  carveRect(14, 92, 34, 110, T.GROVE, T.TREE, 'grove');
  for (let y = 86; y <= 116; y++) for (let x = 6; x <= 40; x++) {
    if (get(x, y) === T.GRASS || get(x, y) === T.FLOWERS || get(x, y) === T.HIGHGRASS) { set(x, y, T.TREE); setZ(x, y, 'forest'); }
  }
  set(LOCS.groveGate.x, LOCS.groveGate.y, T.GATE); setZ(LOCS.groveGate.x, LOCS.groveGate.y, 'grove');
  for (let x = 35; x <= 40; x++) { set(x, 100, T.GROVE); setZ(x, 100, 'grove'); }

  // Frost cavern (snow) — Frost Titan arena
  blob(LOCS.frostBoss.x, LOCS.frostBoss.y, 6, T.ICE, 'snow');
  // Sand tomb (desert) — Sand Wyrm arena
  blob(LOCS.sandBoss.x, LOCS.sandBoss.y, 6, T.SAND, 'desert');

  // --- 4. settlements ---
  const buildTown = (c, r, floor, zone, houses) => {
    blob(c.x, c.y, r, floor, zone);
    for (const [hx, hy] of houses) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(c.x + hx + dx, c.y + hy + dy, T.HOUSE);
  };
  // --- Eldenbrook (centre): a proper village with a market square ---
  const vx = VILLAGE_C.x, vy = VILLAGE_C.y;
  blob(vx, vy, 11, T.VFLOOR, 'village');
  // grass border ring just inside the edge (gardens) + perimeter fence with road gaps
  for (let y = vy - 12; y <= vy + 12; y++) for (let x = vx - 12; x <= vx + 12; x++) {
    const d = Math.hypot(x - vx, y - vy);
    if (d > 9.4 && d <= 10.6 && get(x, y) === T.VFLOOR) set(x, y, T.GRASS);
  }
  for (let a = 0; a < 360; a += 3) {
    const rad = 10.2, x = Math.round(vx + Math.cos(a * Math.PI / 180) * rad), y = Math.round(vy + Math.sin(a * Math.PI / 180) * rad);
    if (Math.abs(x - vx) <= 1 || Math.abs(y - vy) <= 1) continue; // leave N/S/E/W road gaps
    if (get(x, y) === T.GRASS || get(x, y) === T.VFLOOR) set(x, y, T.FENCE);
  }
  // cobbled market square in the centre
  for (let y = vy; y <= vy + 6; y++) for (let x = vx - 5; x <= vx + 5; x++)
    if (get(x, y) === T.VFLOOR) set(x, y, T.PLAZA);
  // houses around the perimeter (top-left of each 2x2), kept clear of the market
  for (const [hx, hy] of [[-8, -6], [-3, -7], [3, -7], [7, -5], [-9, 0], [7, 1], [-8, 5], [6, 6]])
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(vx + hx + dx, vy + hy + dy, T.HOUSE);
  // the well, north of the market
  set(vx, vy - 3, T.SHRINE);
  // market stalls (vendors stand just south of each)
  for (const s of VILLAGE_STALLS) { set(s.x, s.y, T.STALL); setZ(s.x, s.y, 'village'); }
  // flower gardens for charm
  for (const [gx, gy] of [[-6, -3], [5, -3], [-6, 8], [6, 8], [-9, -3], [8, -2]]) {
    if (get(vx + gx, vy + gy) === T.VFLOOR || get(vx + gx, vy + gy) === T.GRASS) set(vx + gx, vy + gy, T.FLOWERS);
  }
  // Frostmere (snow)
  buildTown(LOCS.frostmere, 7, T.PLAZA, 'town', [[-4, -3], [3, -4], [-5, 1], [4, 2], [-2, 3]]);
  // Sunspear Oasis (desert)
  buildTown(LOCS.sunspear, 7, T.PLAZA, 'town', [[-4, -3], [3, -3], [-4, 2], [4, 1]]);
  blob(LOCS.sunspear.x + 5, LOCS.sunspear.y + 4, 2, T.WATER, 'town'); // oasis pool
  // Saltwind Cove (coast)
  buildTown(LOCS.saltwind, 7, T.PLAZA, 'town', [[-4, -3], [3, -4], [-5, 2]]);
  for (let i = 0; i < 5; i++) { set(LOCS.saltwind.x + 6 + i, LOCS.saltwind.y + 5, T.DOCK); setZ(LOCS.saltwind.x + 6 + i, LOCS.saltwind.y + 5, 'town'); }
  // town vendor stalls (Magus in Frostmere, the rover in Saltwind)
  set(LOCS.frostmere.x, LOCS.frostmere.y - 3, T.STALL); setZ(LOCS.frostmere.x, LOCS.frostmere.y - 3, 'town');
  set(LOCS.saltwind.x - 2, LOCS.saltwind.y - 2, T.STALL); setZ(LOCS.saltwind.x - 2, LOCS.saltwind.y - 2, 'town');

  // Hidden island (SE ocean)
  blob(LOCS.island.x, LOCS.island.y, 5, T.SAND, 'island');
  blob(LOCS.island.x, LOCS.island.y, 3, T.GRASS, 'island');
  set(LOCS.island.x, LOCS.island.y, T.SHRINE);
  for (const [dx, dy] of [[-2, -2], [2, 2], [-2, 2]]) set(LOCS.island.x + dx, LOCS.island.y + dy, T.TREE);

  // --- 5. roads & crossroads ---
  const carvePath = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      let [x, y] = pts[i]; const [tx, ty] = pts[i + 1];
      let guard = 0;
      while ((x !== tx || y !== ty) && guard++ < 800) {
        if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y);
        const cur = get(x, y);
        if (cur === T.WATER || cur === T.SWAMPWATER) set(x, y, T.BRIDGE);
        else if (cur === T.OCEAN || cur === T.MOUNTAIN || cur === T.LAVA) { /* don't pave */ }
        else if (cur !== T.HOUSE && cur !== T.CHEST && cur !== T.SHRINE && cur !== T.GATE && cur !== T.PORTAL) set(x, y, T.PATH);
        for (const [ax, ay] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          const c = get(ax, ay);
          if ((c === T.TREE || c === T.SNOWTREE || c === T.CACTUS || c === T.DEADTREE || c === T.CURSEDTREE) && rand() < 0.6) set(ax, ay, T.PATH);
        }
      }
    }
  };
  const V = VILLAGE_C;
  carvePath([[V.x, V.y - 11], [V.x, 50], [100, 30]]);                 // N → cave
  carvePath([[V.x, 50], [70, 50], [LOCS.frostmere.x, LOCS.frostmere.y + 7]]); // → Frostmere
  carvePath([[100, 50], [150, 45], [LOCS.lairGate.x, LOCS.lairGate.y + 2]]);  // → Dragon gate
  carvePath([[V.x + 11, V.y], [150, 100], [159, 100]]);              // E → ruins
  carvePath([[V.x - 11, V.y], [42, 100]]);                           // W → grove gate
  carvePath([[42, 100], [42, 60], [LOCS.frostmere.x, LOCS.frostmere.y + 7]]); // grove road → Frostmere
  carvePath([[V.x, V.y + 11], [100, 150], [120, 150]]);              // S → swamp
  carvePath([[100, 150], [60, 155], [LOCS.sunspear.x, LOCS.sunspear.y - 7]]); // → Sunspear
  carvePath([[150, 100], [155, 150], [LOCS.saltwind.x, LOCS.saltwind.y - 7]]); // ruins road → Cove

  const crossroads = [[V.x, 50], [100, 50], [150, 100], [42, 100], [100, 150], [70, 50], [150, 45], [120, 150], [155, 150], [42, 60]];
  for (const [cx, cy] of crossroads) if (get(cx, cy) === T.PATH || OPEN_GROUND.has(get(cx, cy))) set(cx, cy, T.CROSSROAD);

  // --- 6. shrines (one per major biome) ---
  for (const [sx, sy] of [[70, 80], [130, 70], [60, 130], [130, 130], [LOCS.island.x, LOCS.island.y], [100, 14], [40, 100]]) {
    if (!SOLID.has(get(sx, sy)) && get(sx, sy) !== T.GATE) set(sx, sy, T.SHRINE);
  }
  set(45, 90, T.SHRINE); // forest riddle shrine (opens grove)

  // --- 7. treasure chests ---
  const fixedChests = [[92, 10], [108, 22], [165, 95], [184, 110], [16, 96], [36, 100], [168, 18], [178, 34], [34, 34], [34, 166], [186, 184], [150, 150]];
  for (const [cx, cy] of fixedChests) if (!SOLID.has(get(cx, cy))) set(cx, cy, T.CHEST);
  let placed = 0, guard = 0;
  while (placed < 24 && guard++ < 4000) {
    const cx = 6 + Math.floor(rand() * (W - 12)), cy = 6 + Math.floor(rand() * (H - 12));
    const c = get(cx, cy);
    if ((BUILDABLE.has(c) || c === T.CAVEFLOOR || c === T.RUINFLOOR || c === T.GROVE || c === T.HIGHGRASS) &&
        Math.hypot(cx - V.x, cy - V.y) > 18) { set(cx, cy, T.CHEST); placed++; }
  }

  // --- 8. forest landmark (riddle shrine path tile near grove) ---
  set(LOCS.realtor.x, LOCS.realtor.y, T.VFLOOR);

  return {
    w: W, h: H, tiles, zones, seed,
    gates: [
      { x: LOCS.lairGate.x, y: LOCS.lairGate.y, flag: 'ancientKey', msg: 'A massive obsidian door sealed with draconic runes. It needs the Ancient Key.' },
      { x: LOCS.groveGate.x, y: LOCS.groveGate.y, flag: 'grovePath', msg: 'A wall of living thorns blocks the way. Something here is testing you...' },
    ],
  };
}

// ---------- map queries (work on current map: world / dungeon / interior) ----------
function curMap() {
  if (G.inInterior) return G.interior;
  if (G.inDungeon) return G.dungeon;
  return G.world;
}
function tileAt(x, y) {
  const m = curMap();
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return G.inInterior ? T.WALL : T.MOUNTAIN;
  return m.tiles[x + y * m.w];
}
function setTileAt(x, y, t) {
  const m = curMap();
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[x + y * m.w] = t;
}
function zoneAt(x, y) {
  if (G.inInterior) return 'interior';
  if (G.inDungeon) return 'dungeon';
  const m = G.world;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 'mountain';
  return ZONE_IDS[m.zones[x + y * m.w]];
}
function isBlocked(x, y) {
  const t = tileAt(x, y);
  if (t === T.GATE) {
    const g = (G.world.gates || []).find(g => g.x === x && g.y === y);
    return !(g && G.flags[g.flag]);
  }
  if (SOLID.has(t)) return true;
  if (!G.inDungeon && !G.inInterior && G.npcs.some(n => n.x === x && n.y === y && npcVisible(n))) return true;
  return false;
}

// ---------- build-zone validation (housing) ----------
function isBuildableTile(x, y) {
  if (G.inDungeon || G.inInterior) return false;
  const t = tileAt(x, y);
  if (!BUILDABLE.has(t)) return false;
  // keep clear of NPCs, foes, bosses, player-houses & key locations
  if (G.npcs && G.npcs.some(n => n.x === x && n.y === y && npcVisible(n))) return false;
  if (typeof Foes !== 'undefined' && Foes.list && Foes.list.some(f => f.alive && Math.round(f.x) === x && Math.round(f.y) === y)) return false;
  for (const k in LOCS) { if (Math.abs(LOCS[k].x - x) + Math.abs(LOCS[k].y - y) < 3) return false; }
  return true;
}

// ---------- endless dungeon ----------
function genDungeon(floor) {
  const W = 40, H = 40;
  const tiles = new Uint8Array(W * H).fill(T.CAVEWALL);
  const rand = mulberry32((G.world.seed ^ (floor * 7919)) >>> 0);
  const idx = (x, y) => x + y * W;
  let x = 4, y = 4; tiles[idx(x, y)] = T.CAVEFLOOR;
  let carved = 1; const target = Math.floor(W * H * 0.34);
  let fx = x, fy = y, fd = 0;
  while (carved < target) {
    const d = Math.floor(rand() * 4);
    x = clamp(x + [1, -1, 0, 0][d], 1, W - 2);
    y = clamp(y + [0, 0, 1, -1][d], 1, H - 2);
    if (tiles[idx(x, y)] === T.CAVEWALL) {
      tiles[idx(x, y)] = T.CAVEFLOOR; carved++;
      const dist = Math.abs(x - 4) + Math.abs(y - 4);
      if (dist > fd) { fd = dist; fx = x; fy = y; }
    }
  }
  tiles[idx(fx, fy)] = T.STAIRS;
  let placed = 0, guard = 0;
  while (placed < 2 && guard++ < 400) {
    const cx = 2 + Math.floor(rand() * (W - 4)), cy = 2 + Math.floor(rand() * (H - 4));
    if (tiles[idx(cx, cy)] === T.CAVEFLOOR && (Math.abs(cx - 4) + Math.abs(cy - 4)) > 8) { tiles[idx(cx, cy)] = T.CHEST; placed++; }
  }
  return { w: W, h: H, tiles, floor, stairs: { x: fx, y: fy } };
}
