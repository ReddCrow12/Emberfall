/* ============ Emberfall — save / load (localStorage) ============ */
'use strict';

const SAVE_VERSION = 2;
const SAVE_SLOTS = ['ef_save_1', 'ef_save_2', 'ef_save_3'];
const AUTOSAVE_KEY = 'ef_save_auto';
let _lastAutosave = 0;

function serializeGame() {
  const p = G.player;
  // if saving while inside a home, store the position just outside the door
  const out = G.inInterior && G.returnPos ? G.returnPos : { x: p.x, y: p.y, facing: p.facing };
  const zoneName = G.inInterior ? 'At home' : (G.inDungeon ? 'Endless Depths F' + G.dungeonFloor : ZONES[zoneAt(p.x, p.y)].name);
  return {
    v: SAVE_VERSION,
    time: Date.now(),
    meta: { name: p.name, cls: p.cls, level: p.level, zone: zoneName, ngPlus: G.ngPlus },
    seed: G.world.seed,
    player: {
      name: p.name, cls: p.cls, x: out.x, y: out.y, facing: out.facing || 'down',
      stats: p.stats, baseMaxHp: p.baseMaxHp, baseMaxMp: p.baseMaxMp,
      hp: p.hp, mp: p.mp, xp: p.xp, level: p.level, gold: p.gold, rep: p.rep,
      inventory: p.inventory, equipment: p.equipment,
      skills: p.skills, skillPoints: p.skillPoints, status: p.status.filter(s => !STATUS[s.id].overworld),
    },
    flags: G.flags, quests: G.quests, achievements: G.achievements,
    openedChests: G.openedChests, eventCd: G.eventCd, steps: G.steps,
    ngPlus: G.ngPlus, inDungeon: G.inDungeon && !G.inInterior, dungeonFloor: G.dungeonFloor,
    houses: G.houses || [], visited: G.visited || {},
  };
}

function saveGame(slotKey, silent) {
  if (!G || !G.player || Combat.active) {
    if (!silent) UI.notify('Cannot save right now!', 'bad');
    return false;
  }
  try {
    localStorage.setItem(slotKey, JSON.stringify(serializeGame()));
    if (!silent) { UI.notify('💾 Game saved.', 'good'); Audio2.sfx('chest'); }
    return true;
  } catch (e) {
    if (!silent) UI.notify('Save failed: ' + e.message, 'bad');
    return false;
  }
}

function autosave() {
  if (!G || !G.player || Combat.active) return;
  const now = Date.now();
  if (now - _lastAutosave < 8000) return;
  _lastAutosave = now;
  saveGame(AUTOSAVE_KEY, true);
}

function getSaveMeta(slotKey) {
  try {
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { ...d.meta, time: d.time };
  } catch (e) { return null; }
}

function anySaveExists() {
  return [...SAVE_SLOTS, AUTOSAVE_KEY].some(k => getSaveMeta(k));
}

function loadGame(slotKey) {
  let d;
  try { d = JSON.parse(localStorage.getItem(slotKey)); } catch (e) { d = null; }
  if (!d) { UI.notify('No save in that slot.', 'bad'); return false; }

  const world = genWorld(d.seed);
  G = {
    world,
    player: d.player,
    npcs: [],
    flags: d.flags || {},
    quests: d.quests || {},
    achievements: d.achievements || {},
    openedChests: d.openedChests || [],
    eventCd: d.eventCd || {},
    steps: d.steps || 0,
    lastCombatStep: d.steps || 0,
    ngPlus: d.ngPlus || 0,
    inDungeon: false, dungeon: null, dungeonFloor: d.dungeonFloor || 0,
    inInterior: false, interior: null, interiorHouse: null, returnPos: null,
    houses: d.houses || [], visited: d.visited || {},
    weather: null, weatherT: 20,
  };
  const p = G.player;
  if (!p.status) p.status = [];
  p.px = p.x; p.py = p.y; p.anim = 0;
  p.maxHp = p.baseMaxHp; p.maxMp = p.baseMaxMp;
  spawnNPCs();
  if (typeof Foes !== 'undefined') Foes.reset();
  House.applyAll(); // re-stamp player houses onto the regenerated world
  // re-open chests on the regenerated world
  for (const key of G.openedChests) {
    if (key.startsWith('w:')) {
      const [x, y] = key.slice(2).split(',').map(Number);
      if (G.world.tiles[x + y * G.world.w] === T.CHEST) G.world.tiles[x + y * G.world.w] = T.CHEST_OPEN;
    }
  }
  if (d.inDungeon && d.dungeonFloor > 0) {
    G.inDungeon = true;
    G.dungeon = genDungeon(d.dungeonFloor);
    p.x = 4; p.y = 4; p.px = 4; p.py = 4;
  }
  recalcStats();
  p.hp = clamp(d.player.hp, 1, p.maxHp);
  p.mp = clamp(d.player.mp, 0, p.maxMp);
  return true;
}

function deleteSave(slotKey) { localStorage.removeItem(slotKey); }
