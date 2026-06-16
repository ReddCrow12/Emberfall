/* ============ Emberfall — player housing ============
 * Buy houses from the realtor, place them with a pointer-driven build mode
 * (green/red validity outline + build restrictions), enter distinct generated
 * interiors with lighting & furniture, store items in persistent containers,
 * lock/unlock with a generated key, and decorate with purchased furniture.
 * Houses are persisted in the save and re-stamped onto the regenerated world.
 */
'use strict';

const HOUSE_TYPES = {
  cabin:  { name: 'Small Cabin',  icon: '🛖', w: 2, h: 2, price: 300,  storage: 12, iw: 7,  ih: 6,  style: 'wood',
            desc: 'Cozy, drafty, and entirely yours. Room for a bed and your regrets.' },
  cottage:{ name: 'Cottage',      icon: '🏠', w: 3, h: 3, price: 850,  storage: 24, iw: 9,  ih: 7,  style: 'wood',
            desc: 'A proper home with a hearth and a good-sized chest.' },
  family: { name: 'Family House', icon: '🏡', w: 4, h: 3, price: 2000, storage: 40, iw: 11, ih: 8,  style: 'plaster',
            desc: 'Spacious enough for a family, or one adventurer with a lot of loot.' },
  estate: { name: 'Noble Estate', icon: '🏰', w: 5, h: 4, price: 5000, storage: 64, iw: 13, ih: 10, style: 'stone',
            desc: 'Marble floors, a vault, and the quiet respect of the gentry.' },
  tower:  { name: 'Mage Tower',   icon: '🗼', w: 2, h: 3, price: 3500, storage: 56, iw: 9,  ih: 9,  style: 'arcane',
            desc: 'A spire humming with old magic. The vault never forgets.' },
};

const FURNITURE_STYLE = {
  wood:    { floor: '#7a5230', floor2: '#6a4528', wall: '#3d2a18', torch: '#ffb347' },
  plaster: { floor: '#b89b6a', floor2: '#a88d5e', wall: '#7a6647', torch: '#ffcf6b' },
  stone:   { floor: '#9a9aa6', floor2: '#86868f', wall: '#55555f', torch: '#9bd0ff' },
  arcane:  { floor: '#3a2c5a', floor2: '#322650', wall: '#241a3a', torch: '#c79bff' },
};

const House = {
  applyAll() {
    if (!G.houses) return;
    for (const h of G.houses) this.stamp(h);
  },

  stamp(h) {
    const tp = HOUSE_TYPES[h.type];
    const doorDx = Math.floor(tp.w / 2);
    for (let dy = 0; dy < tp.h; dy++) for (let dx = 0; dx < tp.w; dx++) {
      const isDoor = (dx === doorDx && dy === tp.h - 1);
      setWorldTile(h.x + dx, h.y + dy, isDoor ? T.HOUSE_DOOR : T.PHOUSE);
    }
  },

  doorCell(h) {
    const tp = HOUSE_TYPES[h.type];
    return { x: h.x + Math.floor(tp.w / 2), y: h.y + tp.h - 1 };
  },

  houseAtDoor(x, y) {
    return (G.houses || []).find(h => { const d = this.doorCell(h); return d.x === x && d.y === y; });
  },

  ownedCount() { return (G.houses || []).length; },

  // ---------- placement mode ----------
  beginPlacement(type) {
    if (!HOUSE_TYPES[type]) return;
    if (G.player.gold < HOUSE_TYPES[type].price) { UI.notify('You cannot afford that property.', 'bad'); Audio2.sfx('error'); return; }
    UI.closePanel();
    Game.pointerActive = false;
    Game.placing = { kind: 'house', type, gx: G.player.x - 1, gy: G.player.y - 2, valid: false };
    this.updateGhost(G.player.x, G.player.y - 1);
    UI.showPlacementBar('Placing ' + HOUSE_TYPES[type].name + ' — move the pointer (or walk), tap to confirm.');
    Audio2.sfx('open');
  },

  beginFurniture(item) {
    if (!G.inInterior) { UI.notify('You can only place furniture inside your home.', 'bad'); return; }
    UI.closePanel();
    Game.pointerActive = false;
    Game.placing = { kind: 'furniture', item, gx: G.player.x, gy: G.player.y, valid: false };
    this.updateGhost(G.player.x, G.player.y);
    UI.showPlacementBar('Placing ' + item.name + ' — tap a floor tile to set it down.');
  },

  // pointer/cursor moved to world tile (tx,ty) — anchor footprint there
  updateGhost(tx, ty) {
    const pl = Game.placing; if (!pl) return;
    if (pl.kind === 'house') {
      const tp = HOUSE_TYPES[pl.type];
      pl.gx = clamp(tx - Math.floor(tp.w / 2), 1, WORLD_W - tp.w - 1);
      pl.gy = clamp(ty - (tp.h - 1), 1, WORLD_H - tp.h - 1);
      pl.valid = this.validHouse(pl.gx, pl.gy, pl.type);
    } else {
      pl.gx = tx; pl.gy = ty;
      pl.valid = (tileAt(tx, ty) === T.WOODFLOOR || tileAt(tx, ty) === T.RUG) &&
        !(G.interiorHouse.furniture || []).some(f => f.x === tx && f.y === ty) &&
        !(tx === G.player.x && ty === G.player.y);
    }
  },

  validHouse(gx, gy, type) {
    const tp = HOUSE_TYPES[type];
    const doorDx = Math.floor(tp.w / 2);
    for (let dy = 0; dy < tp.h; dy++) for (let dx = 0; dx < tp.w; dx++) {
      if (!isBuildableTile(gx + dx, gy + dy)) return false;
    }
    // a clear tile must sit in front of the door so you can reach it
    const fx = gx + doorDx, fy = gy + tp.h;
    if (isBlocked(fx, fy) || !OPEN_GROUND.has(tileAt(fx, fy))) return false;
    return true;
  },

  confirm() {
    const pl = Game.placing; if (!pl || !pl.valid) { Audio2.sfx('error'); return; }
    if (pl.kind === 'house') {
      const tp = HOUSE_TYPES[pl.type];
      if (!spendGold(tp.price)) { UI.notify('Not enough gold!', 'bad'); this.cancel(); return; }
      const h = {
        id: 'h' + Date.now().toString(36) + Math.floor(rnd() * 1000),
        type: pl.type, x: pl.gx, y: pl.gy,
        locked: false, key: 'KEY-' + Math.floor(rnd() * 0xffff).toString(16).toUpperCase(),
        storage: [], furniture: [],
      };
      G.houses.push(h);
      this.stamp(h);
      Render.miniFor = null;
      FX.burst(this.doorCell(h).x, this.doorCell(h).y, '#d4a73c', 26);
      Audio2.sfx('levelup');
      UI.notify('🏠 You bought a ' + tp.name + '! Stand at the door and press E to enter.', 'achieve');
      unlockAchievement('homeowner');
      if (this.ownedCount() >= 3) unlockAchievement('realEstate');
    } else {
      const h = G.interiorHouse;
      h.furniture.push({ icon: pl.item.icon, name: pl.item.name, x: pl.gx, y: pl.gy });
      removeItem(pl.item, 1);
      Audio2.sfx('chest');
      FX.burst(pl.gx, pl.gy, '#aed581', 12);
      UI.notify(pl.item.name + ' placed.', 'good');
    }
    Game.placing = null;
    UI.hidePlacementBar();
    autosave();
  },

  cancel() {
    Game.placing = null;
    UI.hidePlacementBar();
    Audio2.sfx('close');
  },

  // ---------- doors / locking ----------
  doorMenu(h) {
    const owner = true; // single-player: you always own your houses
    const opts = [];
    opts.push(Events.o('🚪 Enter', null, () => this.enter(h)));
    opts.push(Events.o(h.locked ? '🔓 Unlock door' : '🔒 Lock door', 'Key: ' + h.key, () => this.toggleLock(h)));
    opts.push(Events.o('Leave', null, null));
    UI.showEvent(HOUSE_TYPES[h.type].name, h.locked ? 'The door is locked tight. Your key, <b>' + h.key + '</b>, fits the mechanism.' : 'Your ' + HOUSE_TYPES[h.type].name + '. The door is unlocked.', opts);
  },

  toggleLock(h) {
    h.locked = !h.locked;
    const d = this.doorCell(h);
    Audio2.sfx(h.locked ? 'close' : 'open');
    FX.burst(d.x, d.y, h.locked ? '#c0392b' : '#7bed9f', 14);
    FX.float(d.x, d.y - 0.5, h.locked ? '🔒 Locked' : '🔓 Unlocked', h.locked ? '#ff7b73' : '#7bed9f');
    UI.notify(h.locked ? 'Door locked.' : 'Door unlocked.', h.locked ? '' : 'good');
    autosave();
  },

  // ---------- interiors ----------
  enter(h) {
    const d = this.doorCell(h);
    G.returnPos = { x: d.x, y: d.y + 1, facing: 'down' };
    const map = this.buildInterior(h);
    Game.fade(() => {
      G.inInterior = true;
      G.interior = map;
      G.interiorHouse = h;
      const p = G.player;
      p.x = map.exit.x; p.y = map.exit.y - 1; p.px = p.x; p.py = p.y; p.facing = 'up';
      Render.miniFor = null;
      Audio2.sfx('open');
      this.refreshFurnitureTiles();
      Game.refreshMusic(true);
      UI.updateHUD();
    });
  },

  exit() {
    Game.fade(() => {
      G.inInterior = false;
      G.interior = null; G.interiorHouse = null;
      const p = G.player;
      const r = G.returnPos || { x: LOCS.spawn.x, y: LOCS.spawn.y };
      p.x = r.x; p.y = r.y; p.px = p.x; p.py = p.y; p.facing = r.facing || 'down';
      Render.miniFor = null;
      Audio2.sfx('close');
      Game.refreshMusic(true);
      UI.updateHUD();
    });
  },

  // furniture is stored on the house; we don't bake it into the tile grid,
  // it's rendered as an overlay — but mark storage/torches as tiles.
  refreshFurnitureTiles() {},

  buildInterior(h) {
    const tp = HOUSE_TYPES[h.type];
    const W = tp.iw, H = tp.ih;
    const tiles = new Uint8Array(W * H).fill(T.WOODFLOOR);
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[x + y * W] = t; };
    const get = (x, y) => tiles[x + y * W];
    const vWall = (x, y0, y1, door) => { for (let y = y0; y <= y1; y++) if (y !== door) set(x, y, T.WALL); };
    const hWall = (y, x0, x1, door) => { for (let x = x0; x <= x1; x++) if (x !== door) set(x, y, T.WALL); };
    const rug = (cx, cy, rw, rh) => { for (let y = cy; y < cy + rh; y++) for (let x = cx; x < cx + rw; x++) if (get(x, y) === T.WOODFLOOR) set(x, y, T.RUG); };

    // outer shell
    for (let x = 0; x < W; x++) { set(x, 0, T.WALL); set(x, H - 1, T.WALL); }
    for (let y = 0; y < H; y++) { set(0, y, T.WALL); set(W - 1, y, T.WALL); }
    for (let x = 2; x < W - 2; x += 3) set(x, 0, T.WINDOW); // windows along the top
    const ex = Math.floor(W / 2);
    set(ex, H - 1, T.INTDOOR); // exit at the bottom-centre
    set(ex, H - 2, T.WOODFLOOR);

    // per-type room layout (interior walls with doorway gaps), storage & furniture
    const furn = []; // {icon, x, y}
    const F = (icon, x, y) => { if (get(x, y) === T.WOODFLOOR || get(x, y) === T.RUG) furn.push({ icon, x, y }); };
    let storage;
    switch (h.type) {
      case 'cabin': { // single cozy room
        rug(ex - 1, H - 4, 3, 2); storage = [W - 2, 1];
        set(1, 2, T.TORCH); set(W - 2, 3, T.TORCH);
        F('🛏️', 1, 1); F('🪑', 2, H - 3); F('🪴', W - 2, H - 2); F('🕯️', 1, H - 2);
        break; }
      case 'cottage': { // living room + bedroom
        vWall(4, 1, H - 2, 3);
        rug(1, 2, 3, 3); storage = [W - 2, 1];
        set(1, 1, T.TORCH); set(W - 2, H - 3, T.TORCH);
        F('🛋️', 1, 2); F('🪵', 2, 4); F('🪴', 3, H - 2);          // living
        F('🛏️', W - 2, 2); F('📚', 5, H - 2); F('🖼️', 6, 1);     // bedroom
        break; }
      case 'family': { // bedroom | living | kitchen
        vWall(4, 1, H - 2, 4); vWall(7, 1, H - 2, 4);
        rug(5, 3, 2, 3); storage = [W - 2, 1];
        set(1, 1, T.TORCH); set(W - 2, 1, T.TORCH); set(ex, H - 2, T.WOODFLOOR);
        F('🛏️', 1, 1); F('🪴', 1, H - 2);                          // bedroom
        F('🛋️', 5, 2); F('🪵', 6, H - 3); F('🖼️', 5, 1);          // living
        F('🍶', W - 2, H - 2); F('🪑', 8, 3); F('📚', 8, H - 2);   // kitchen
        break; }
      case 'estate': { // grand hall + two bedrooms + vault
        vWall(6, 1, H - 2, H - 3);
        hWall(5, 7, W - 2, 9);
        rug(2, 2, 3, 3); storage = [W - 2, 2];
        set(1, 1, T.TORCH); set(5, H - 2, T.TORCH); set(W - 2, 1, T.TORCH); set(W - 2, H - 2, T.TORCH);
        F('🛋️', 2, 2); F('🖼️', 4, 1); F('🏺', 1, H - 2); F('🪴', 5, H - 3); F('🪵', 3, 4); // hall
        F('🏺', 8, 1); F('🖼️', W - 2, 1);                           // vault room (top-right)
        F('🛏️', 8, H - 2); F('🛏️', W - 2, H - 3); F('🪴', 10, H - 2); // bedrooms (bottom-right)
        break; }
      case 'tower': { // arcane study, pillared
        set(3, 3, T.WALL); set(W - 4, 3, T.WALL); set(3, H - 4, T.WALL); set(W - 4, H - 4, T.WALL);
        rug(ex - 1, ex - 1, 3, 3); storage = [W - 2, 1];
        set(1, 1, T.TORCH); set(W - 2, 1, T.TORCH); set(1, H - 2, T.TORCH); set(W - 2, H - 2, T.TORCH);
        F('🔮', ex, 1); F('📚', 1, 3); F('📚', 1, 4); F('⚗️', W - 2, 3); F('🪄', 2, H - 2); F('📖', W - 3, H - 2);
        break; }
      default: storage = [W - 2, 1];
    }
    set(storage[0], storage[1], T.STORAGE);

    // place the default furniture once, persisted on the house
    if (!h.furnished) {
      h.furniture = h.furniture || [];
      for (const f of furn) if (!h.furniture.some(o => o.x === f.x && o.y === f.y)) h.furniture.push({ icon: f.icon, name: 'Furniture', x: f.x, y: f.y });
      h.furnished = true;
    }
    return { w: W, h: H, tiles, exit: { x: ex, y: H - 1 }, style: tp.style };
  },
};

// helper that always targets the world map (used while stamping houses)
function setWorldTile(x, y, t) {
  const m = G.world;
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.tiles[x + y * m.w] = t;
}
