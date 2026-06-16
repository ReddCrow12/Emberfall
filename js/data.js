/* ============ Emberfall — static game data ============ */
'use strict';

// Global game state (populated by main.js)
var G = null;

// ---------- RNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = Math.random;
function rint(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function chance(p) { return rnd() < p; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// ---------- Rarity ----------
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'ancient'];
const RARITY = {
  common:    { name: 'Common',    color: '#9da5b4', mult: 1.0, w: 100 },
  uncommon:  { name: 'Uncommon',  color: '#4caf50', mult: 1.35, w: 45 },
  rare:      { name: 'Rare',      color: '#3d9be9', mult: 1.8, w: 18 },
  epic:      { name: 'Epic',      color: '#a55eea', mult: 2.4, w: 7 },
  legendary: { name: 'Legendary', color: '#ff9234', mult: 3.2, w: 2.2 },
  mythic:    { name: 'Mythic',    color: '#ff4757', mult: 4.2, w: 0.7 },
  ancient:   { name: 'Ancient',   color: '#ffd700', mult: 5.5, w: 0.15 }, // unlocked in NG+
};

// ---------- Classes ----------
const CLASSES = {
  warrior: {
    name: 'Warrior', icon: '🛡️', color: '#c0392b',
    desc: 'A stalwart frontline fighter. Heavy armor, heavy blows, and the stubbornness of a mountain.',
    base: { hp: 130, mp: 30, str: 12, def: 10, luck: 4, cha: 5 },
    growth: { hp: 16, mp: 3, str: 3, def: 2.5, luck: 0.5, cha: 0.5 },
    abilities: [
      { id: 'powerStrike', name: 'Power Strike', icon: '💥', mp: 8, pow: 1.9,
        desc: 'A crushing blow dealing heavy damage.', kind: 'attack' },
      { id: 'shieldWall', name: 'Shield Wall', icon: '🛡️', mp: 10,
        desc: 'Brace behind your shield: +60% defense for 3 turns.', kind: 'buff', buff: 'defense' },
      { id: 'berserk', name: 'Berserk Rage', icon: '😤', mp: 14, pow: 2.9,
        desc: 'Massive damage, but you take 10% of your max HP in recoil.', kind: 'attack', selfDmg: 0.1 },
    ],
  },
  rogue: {
    name: 'Rogue', icon: '🗡️', color: '#7f8c8d',
    desc: 'A shadow with a knife. High crit, high dodge, and a talent for finding what others lock away.',
    base: { hp: 95, mp: 45, str: 10, def: 6, luck: 12, cha: 7 },
    growth: { hp: 11, mp: 5, str: 2.5, def: 1.5, luck: 2, cha: 1 },
    abilities: [
      { id: 'backstab', name: 'Backstab', icon: '🔪', mp: 9, pow: 1.6, critBonus: 0.35,
        desc: 'Strike from the shadows with greatly increased critical chance.', kind: 'attack' },
      { id: 'poisonBlade', name: 'Poison Blade', icon: '🧪', mp: 11, pow: 1.1, status: 'poison',
        desc: 'A venom-coated cut that poisons the enemy for 4 turns.', kind: 'attack' },
      { id: 'smokeBomb', name: 'Smoke Bomb', icon: '💨', mp: 12,
        desc: 'Vanish in smoke: +50% dodge for 3 turns.', kind: 'buff', buff: 'dodge' },
    ],
  },
  mage: {
    name: 'Mage', icon: '🔮', color: '#8e44ad',
    desc: 'A scholar of the arcane. Fragile as parchment, devastating as a falling star.',
    base: { hp: 80, mp: 90, str: 6, def: 4, luck: 7, cha: 8 },
    growth: { hp: 9, mp: 12, str: 1.5, def: 1, luck: 1, cha: 1.5 },
    spellPower: true, // abilities scale harder
    abilities: [
      { id: 'fireball', name: 'Fireball', icon: '🔥', mp: 12, pow: 2.1, status: 'burn',
        desc: 'Hurl a sphere of flame that may set the enemy ablaze.', kind: 'attack' },
      { id: 'frostNova', name: 'Frost Nova', icon: '❄️', mp: 16, pow: 1.5, status: 'freeze', aoe: true,
        desc: 'A wave of cold hits ALL enemies and may freeze them.', kind: 'attack' },
      { id: 'arcaneBlast', name: 'Arcane Blast', icon: '✨', mp: 24, pow: 3.4,
        desc: 'Pure arcane devastation against a single foe.', kind: 'attack' },
    ],
  },
  ranger: {
    name: 'Ranger', icon: '🏹', color: '#27ae60',
    desc: 'A child of the wilds. Sharp eyes, steady hands, and the forest always at their back.',
    base: { hp: 105, mp: 55, str: 10, def: 7, luck: 9, cha: 6 },
    growth: { hp: 13, mp: 6, str: 2.5, def: 1.8, luck: 1.4, cha: 0.8 },
    abilities: [
      { id: 'aimedShot', name: 'Aimed Shot', icon: '🎯', mp: 9, pow: 1.8, critBonus: 0.2,
        desc: 'A carefully aimed arrow with bonus crit chance.', kind: 'attack' },
      { id: 'multiShot', name: 'Multi-Shot', icon: '🏹', mp: 14, pow: 1.1, aoe: true,
        desc: 'Loose a volley striking ALL enemies.', kind: 'attack' },
      { id: 'naturesMend', name: "Nature's Mend", icon: '🌿', mp: 13, heal: 0.35,
        desc: 'Channel the forest to restore 35% of your max HP.', kind: 'heal' },
    ],
  },
};

// ---------- Status effects ----------
const STATUS = {
  poison: { name: 'Poison', icon: '☠️', turns: 4, dot: 0.05, color: '#7bed9f' },
  burn:   { name: 'Burn',   icon: '🔥', turns: 3, dot: 0.08, color: '#ff9234' },
  freeze: { name: 'Freeze', icon: '❄️', turns: 2, skip: 0.5, color: '#74b9ff' },
  stun:   { name: 'Stun',   icon: '💫', turns: 1, skip: 1.0, color: '#ffeaa7' },
  defense:{ name: 'Shield Wall', icon: '🛡️', turns: 3, defMult: 1.6, color: '#dfe6e9', good: true },
  dodge:  { name: 'Smoke Veil', icon: '💨', turns: 3, dodgeAdd: 0.5, color: '#b2bec3', good: true },
  blessed:{ name: 'Blessed', icon: '🌟', turns: 5, atkMult: 1.25, color: '#ffd700', good: true },
  invisible:{ name: 'Invisible', icon: '👻', turns: 30, color: '#dfe6e9', good: true, overworld: true },
  regen:  { name: 'Regeneration', icon: '💚', turns: 5, heal: 0.06, color: '#7bed9f', good: true },
};

// ---------- Enemies ----------
// stats are per-level multiplied in combat.js
const ENEMIES = {
  slime:     { name: 'Gloop Slime', icon: '🟢', hp: 28, str: 5, def: 1, xp: 14, gold: [2, 8], ai: 'simple', lvl: 1 },
  goblin:    { name: 'Goblin', icon: '👺', hp: 35, str: 7, def: 2, xp: 20, gold: [4, 14], ai: 'aggressive', lvl: 1 },
  wolf:      { name: 'Gray Wolf', icon: '🐺', hp: 42, str: 9, def: 2, xp: 26, gold: [3, 10], ai: 'aggressive', dodge: 0.12, lvl: 2 },
  bandit:    { name: 'Bandit', icon: '🥷', hp: 50, str: 10, def: 4, xp: 32, gold: [12, 30], ai: 'cunning', lvl: 3 },
  skeleton:  { name: 'Skeleton', icon: '💀', hp: 55, str: 11, def: 5, xp: 36, gold: [6, 18], ai: 'simple', lvl: 4 },
  spider:    { name: 'Cave Spider', icon: '🕷️', hp: 46, str: 10, def: 3, xp: 33, gold: [4, 12], ai: 'venomous', status: 'poison', lvl: 4 },
  bat:       { name: 'Dire Bat', icon: '🦇', hp: 34, str: 8, def: 1, xp: 22, gold: [2, 8], ai: 'aggressive', dodge: 0.2, lvl: 3 },
  ghost:     { name: 'Restless Ghost', icon: '👻', hp: 60, str: 12, def: 6, xp: 45, gold: [8, 20], ai: 'caster', dodge: 0.18, lvl: 6 },
  darkMage:  { name: 'Dark Mage', icon: '🧙', hp: 65, str: 15, def: 4, xp: 55, gold: [15, 40], ai: 'caster', status: 'burn', lvl: 7 },
  orc:       { name: 'Orc Brute', icon: '👹', hp: 85, str: 16, def: 7, xp: 60, gold: [10, 28], ai: 'aggressive', lvl: 7 },
  golem:     { name: 'Stone Golem', icon: '🗿', hp: 110, str: 14, def: 12, xp: 75, gold: [12, 30], ai: 'simple', stun: 0.15, lvl: 8 },
  drake:     { name: 'Ember Drake', icon: '🦎', hp: 95, str: 18, def: 8, xp: 85, gold: [20, 45], ai: 'venomous', status: 'burn', lvl: 9 },
  wraith:    { name: 'Shadow Wraith', icon: '🌑', hp: 90, str: 20, def: 6, xp: 95, gold: [18, 40], ai: 'caster', status: 'freeze', dodge: 0.2, lvl: 10 },
  guardElite:{ name: 'Caravan Guard', icon: '⚔️', hp: 70, str: 13, def: 8, xp: 50, gold: [15, 35], ai: 'cunning', lvl: 6 },
  // --- biome enemies (detection radius via `detect`: short/med/long) ---
  frostwolf: { name: 'Frost Wolf', icon: '🐺', hp: 60, str: 13, def: 4, xp: 40, gold: [4, 14], ai: 'aggressive', status: 'freeze', dodge: 0.15, lvl: 5, detect: 6 },
  yeti:      { name: 'Yeti', icon: '🦬', hp: 120, str: 17, def: 9, xp: 70, gold: [10, 30], ai: 'aggressive', status: 'freeze', stun: 0.1, lvl: 7, detect: 5 },
  wisp:      { name: 'Will-o-Wisp', icon: '🔵', hp: 44, str: 14, def: 3, xp: 38, gold: [6, 20], ai: 'caster', status: 'burn', dodge: 0.28, lvl: 6, detect: 7 },
  scorpion:  { name: 'Sand Scorpion', icon: '🦂', hp: 58, str: 12, def: 6, xp: 42, gold: [5, 16], ai: 'venomous', status: 'poison', lvl: 5, detect: 4 },
  mummy:     { name: 'Withered Mummy', icon: '🧟', hp: 90, str: 14, def: 7, xp: 55, gold: [12, 32], ai: 'simple', status: 'poison', stun: 0.12, lvl: 6, detect: 4 },
  boglurker: { name: 'Bog Lurker', icon: '🐸', hp: 75, str: 13, def: 5, xp: 48, gold: [6, 18], ai: 'venomous', status: 'poison', lvl: 6, detect: 5 },
  cursedknight:{ name: 'Cursed Knight', icon: '🩸', hp: 130, str: 19, def: 12, xp: 85, gold: [18, 44], ai: 'cunning', stun: 0.15, lvl: 9, detect: 6 },
};

const BOSSES = {
  goblinKing: {
    name: 'Grubnak the Goblin King', icon: '👑', boss: true,
    hp: 260, str: 14, def: 6, xp: 250, gold: [80, 120], lvl: 4, ai: 'aggressive',
    intro: '"WHO DARES enter MY cave?! I\'ll grind your bones for my porridge!"',
    phases: [
      { at: 0.5, msg: 'Grubnak smashes his fists down — "NOW I\'M ANGRY!" His attacks grow wilder!', strMult: 1.5 },
    ],
    guaranteedLoot: { minRarity: 'rare' },
  },
  lichKareth: {
    name: 'Kareth, the Hollow Lich', icon: '🧟', boss: true,
    hp: 420, str: 20, def: 10, xp: 600, gold: [150, 250], lvl: 8, ai: 'caster', status: 'freeze',
    intro: '"Mortal flesh... how long since I tasted its warmth. Come, join my collection of bones."',
    phases: [
      { at: 0.66, msg: 'Kareth shatters his phylactery shield — necrotic frost swirls around him!', status: 'freeze' },
      { at: 0.33, msg: 'The Lich\'s eyes blaze violet: "ENOUGH! WITNESS TRUE DEATH!"', strMult: 1.6 },
    ],
    guaranteedLoot: { minRarity: 'epic' },
  },
  ancientGuardian: {
    name: 'The Ancient Guardian', icon: '🗿', boss: true,
    hp: 500, str: 24, def: 16, xp: 800, gold: [200, 300], lvl: 11, ai: 'simple', stun: 0.2,
    intro: 'Stone grinds against stone as the colossus wakes. Runes flare along its arms.',
    phases: [
      { at: 0.5, msg: 'Cracks spread across the Guardian — molten light pours out! Its blows turn searing!', strMult: 1.4, status: 'burn' },
    ],
    guaranteedLoot: { minRarity: 'legendary' },
  },
  dragonVaelthyx: {
    name: 'Vaelthyx, Doom of Emberfall', icon: '🐉', boss: true, final: true,
    hp: 750, str: 28, def: 14, xp: 1500, gold: [400, 600], lvl: 14, ai: 'dragon', status: 'burn',
    intro: '"So. The little ember comes to my mountain at last. Your village will make fine kindling... after you burn first."',
    phases: [
      { at: 0.66, msg: 'Vaelthyx takes wing! Gusts of cinder rake the arena — his breath ignites the very air!', strMult: 1.3, status: 'burn' },
      { at: 0.33, msg: 'The dragon\'s scales crack with inner fire. "I AM THE MOUNTAIN\'S WRATH!" — final phase!', strMult: 1.6 },
    ],
    guaranteedLoot: { minRarity: 'mythic' },
  },
  frostTitan: {
    name: 'Hrimnir, the Frost Titan', icon: '🧊', boss: true,
    hp: 560, str: 22, def: 14, xp: 700, gold: [160, 260], lvl: 9, ai: 'caster', status: 'freeze', detect: 7,
    intro: '"Warmblood. You trespass on the long winter. I will make a statue of you — a TASTEFUL one."',
    phases: [
      { at: 0.5, msg: 'Hrimnir slams the glacier — a blizzard howls through the arena!', strMult: 1.4, status: 'freeze' },
    ],
    guaranteedLoot: { minRarity: 'epic' },
  },
  sandWyrm: {
    name: 'Qoth, the Sand Wyrm', icon: '🐛', boss: true,
    hp: 620, str: 24, def: 12, xp: 760, gold: [180, 280], lvl: 10, ai: 'venomous', status: 'poison', detect: 6,
    intro: 'The dunes erupt. A vast segmented horror rears against the sun, dripping venom that hisses on the sand.',
    phases: [
      { at: 0.5, msg: 'Qoth burrows and bursts forth — sand and venom everywhere!', strMult: 1.5, status: 'poison' },
    ],
    guaranteedLoot: { minRarity: 'legendary' },
  },
  voidWraith: {
    name: 'The Void Wraith', icon: '🕳️', boss: true, secret: true,
    hp: 1100, str: 36, def: 18, xp: 3000, gold: [800, 1200], lvl: 20, ai: 'caster', status: 'freeze', dodge: 0.25,
    intro: 'Reality folds. Something that was never meant to be looks at you — and smiles without a face.',
    phases: [
      { at: 0.66, msg: 'The Wraith splits the air — your shadow no longer obeys you!', status: 'stun' },
      { at: 0.33, msg: 'The void screams. Light itself bends away from the Wraith\'s final form!', strMult: 1.8 },
    ],
    guaranteedLoot: { minRarity: 'ancient' },
  },
};

// ---------- Zone definitions ----------
// `encounter` = chance/step of a surprise ambush (low now that foes roam visibly).
// `table`     = enemy pool for ambushes & for spawning visible roaming foes.
const ZONES = {
  village:  { name: 'Eldenbrook Village', music: 'village', encounter: 0, table: [] },
  town:     { name: 'Settlement', music: 'village', encounter: 0, table: [] },
  plains:   { name: 'Heartland Plains', music: 'explore', encounter: 0, table: ['slime', 'goblin', 'wolf'] },
  forest:   { name: 'Whisperwood', music: 'forest', encounter: 0, table: ['wolf', 'goblin', 'spider', 'bandit'] },
  river:    { name: 'Silverrun River', music: 'explore', encounter: 0, table: ['slime', 'bandit'] },
  mountain: { name: 'Graycrag Mountains', music: 'explore', encounter: 0, table: [] },
  highland: { name: 'Stormpeak Highlands', music: 'explore', encounter: 0, table: ['wolf', 'orc', 'golem', 'bat'] },
  snow:     { name: 'Frostmere Tundra', music: 'explore', encounter: 0, table: ['frostwolf', 'yeti', 'wisp'] },
  desert:   { name: 'Sunspear Wastes', music: 'explore', encounter: 0, table: ['scorpion', 'mummy', 'bandit'] },
  swamp:    { name: 'Murkmire Swamp', music: 'cave', encounter: 0, table: ['boglurker', 'spider', 'wisp', 'slime'] },
  cursed:   { name: 'The Blighted Reach', music: 'cave', dark: true, encounter: 0, table: ['cursedknight', 'ghost', 'wraith', 'darkMage'] },
  volcanic: { name: 'Cinderwaste', music: 'explore', encounter: 0, table: ['drake', 'orc', 'golem'] },
  coast:    { name: 'Saltwind Coast', music: 'explore', encounter: 0, table: ['slime', 'bandit', 'scorpion'] },
  island:   { name: 'Forgotten Isle', music: 'forest', encounter: 0, table: ['scorpion', 'drake', 'wraith'] },
  cave:     { name: 'Gloomhollow Cave', music: 'cave', dark: true, encounter: 0, table: ['bat', 'spider', 'slime', 'goblin', 'skeleton'] },
  ruins:    { name: 'Ruins of Old Varnath', music: 'cave', encounter: 0, table: ['skeleton', 'ghost', 'darkMage', 'wraith'] },
  lair:     { name: "The Dragon's Lair", music: 'boss', dark: true, encounter: 0, table: ['drake', 'golem', 'darkMage'] },
  grove:    { name: 'The Hidden Grove', music: 'forest', encounter: 0, table: [] },
  dungeon:  { name: 'The Endless Depths', music: 'cave', dark: true, encounter: 0, table: [] },
  interior: { name: 'Home', music: 'village', encounter: 0, table: [] },
};

// ---------- Achievements ----------
const ACHIEVEMENTS = {
  firstBlood: { name: 'First Blood', desc: 'Win your first battle.' },
  goblinKing: { name: 'Cave Cleared', desc: 'Defeat Grubnak the Goblin King.' },
  lichKareth: { name: 'Bone Collector Collected', desc: 'Defeat Kareth the Hollow Lich.' },
  ancientGuardian: { name: 'Stonebreaker', desc: 'Defeat the Ancient Guardian.' },
  dragonVaelthyx: { name: 'Doom Undone', desc: 'Slay Vaelthyx and save Emberfall.' },
  voidWraith: { name: 'Beyond the Veil', desc: 'Destroy the Void Wraith.' },
  frostTitan: { name: 'Winter\'s End', desc: 'Defeat Hrimnir the Frost Titan.' },
  sandWyrm: { name: 'Dunebreaker', desc: 'Defeat Qoth the Sand Wyrm.' },
  homeowner: { name: 'Home Sweet Home', desc: 'Buy and place your first house.' },
  realEstate: { name: 'Property Magnate', desc: 'Own three houses at once.' },
  explorer: { name: 'Cartographer', desc: 'Set foot in every biome.' },
  rich: { name: 'Dragon Hoard', desc: 'Hold 1000 gold at once.' },
  legendary: { name: 'Stuff of Legends', desc: 'Obtain a Legendary or better item.' },
  saint: { name: 'Folk Hero', desc: 'Reach +50 reputation.' },
  menace: { name: 'Village Menace', desc: 'Reach -50 reputation.' },
  level10: { name: 'Seasoned Adventurer', desc: 'Reach level 10.' },
  dungeon5: { name: 'Depth Delver', desc: 'Reach floor 5 of the Endless Depths.' },
};
