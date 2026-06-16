/* ============ Emberfall — items, loot & inventory ============ */
'use strict';

// Base item templates. slot: weapon|armor|ring|amulet, or type: potion|quest|misc
const ITEM_BASES = {
  // weapons
  sword:   { name: 'Sword', icon: '🗡️', slot: 'weapon', atk: 5, price: 30 },
  axe:     { name: 'Battle Axe', icon: '🪓', slot: 'weapon', atk: 7, price: 45 },
  bow:     { name: 'Hunting Bow', icon: '🏹', slot: 'weapon', atk: 5, luck: 1, price: 35 },
  staff:   { name: 'Oaken Staff', icon: '🪄', slot: 'weapon', atk: 4, mp: 10, price: 35 },
  dagger:  { name: 'Dagger', icon: '🔪', slot: 'weapon', atk: 4, luck: 2, price: 28 },
  mace:    { name: 'War Mace', icon: '🔨', slot: 'weapon', atk: 8, def: 1, price: 55 },
  spear:   { name: 'Spear', icon: '🔱', slot: 'weapon', atk: 6, luck: 1, price: 48 },
  greatsword:{ name: 'Greatsword', icon: '⚔️', slot: 'weapon', atk: 11, price: 110 },
  wand:    { name: 'Crystal Wand', icon: '✨', slot: 'weapon', atk: 5, mp: 20, price: 80 },
  // armor
  leather: { name: 'Leather Armor', icon: '🧥', slot: 'armor', def: 4, price: 30 },
  chain:   { name: 'Chainmail', icon: '🛡️', slot: 'armor', def: 6, price: 55 },
  robe:    { name: 'Enchanted Robe', icon: '👘', slot: 'armor', def: 3, mp: 15, price: 45 },
  plate:   { name: 'Plate Armor', icon: '🛡️', slot: 'armor', def: 9, price: 90 },
  scale:   { name: 'Scale Mail', icon: '🐉', slot: 'armor', def: 7, hp: 10, price: 75 },
  fur:     { name: 'Fur-lined Coat', icon: '🧣', slot: 'armor', def: 5, hp: 15, price: 60 },
  // trinkets
  ring:    { name: 'Ring', icon: '💍', slot: 'ring', luck: 2, price: 40 },
  amulet:  { name: 'Amulet', icon: '📿', slot: 'amulet', hp: 15, price: 45 },
  bandRing:{ name: 'Iron Band', icon: '💍', slot: 'ring', str: 2, def: 1, price: 50 },
  sigil:   { name: 'Arcane Sigil', icon: '🔯', slot: 'amulet', mp: 25, luck: 2, price: 70 },
  // consumables
  hpPotion:   { name: 'Healing Potion', icon: '🧪', type: 'potion', heal: 50, price: 20, stack: true,
                desc: 'Restores 50 HP. Tastes of cherries and regret.' },
  mpPotion:   { name: 'Mana Potion', icon: '🫙', type: 'potion', mana: 40, price: 22, stack: true,
                desc: 'Restores 40 MP. Fizzes faintly with starlight.' },
  bigHpPotion:{ name: 'Greater Healing Potion', icon: '⚗️', type: 'potion', heal: 150, price: 55, stack: true,
                desc: 'Restores 150 HP. Brewed by someone who knew what they were doing.' },
  elixir:     { name: 'Golden Elixir', icon: '🏺', type: 'potion', heal: 9999, mana: 9999, price: 200, stack: true,
                desc: 'Fully restores HP and MP. Liquid sunrise.' },
  antidote:   { name: 'Antidote', icon: '🌿', type: 'potion', cure: true, price: 15, stack: true,
                desc: 'Cures all status ailments.' },
  invisPotion:{ name: 'Potion of Invisibility', icon: '🫧', type: 'potion', invis: true, price: 90, stack: true,
                desc: 'Vanish from sight for a time — enemies won\'t notice you in the world.' },
  regenPotion:{ name: 'Regeneration Tonic', icon: '💚', type: 'potion', regen: true, price: 40, stack: true,
                desc: 'Slowly restores HP over several combat turns.' },
  // --- crafting materials ---
  pelt:       { name: 'Wolf Pelt', icon: '🟫', type: 'material', stack: true, price: 8,
                desc: 'Warm, sturdy fur. Useful to crafters and tailors.' },
  fang:       { name: 'Beast Fang', icon: '🦷', type: 'material', stack: true, price: 12,
                desc: 'A sharp trophy. Blacksmiths pay well for these.' },
  crystal:    { name: 'Mana Crystal', icon: '🔷', type: 'material', stack: true, price: 25,
                desc: 'A humming shard of pure magic.' },
  emberdust:  { name: 'Ember Dust', icon: '🟧', type: 'material', stack: true, price: 30,
                desc: 'Glowing ash from the Cinderwaste. Warm to the touch.' },
  // --- collectibles ---
  goldenIdol: { name: 'Golden Idol', icon: '🗿', type: 'collectible', stack: true, price: 250,
                desc: 'A small idol of a forgotten god. Collectors covet these.' },
  oldCoin:    { name: 'Ancient Doubloon', icon: '🪙', type: 'collectible', stack: true, price: 120,
                desc: 'Currency of a drowned kingdom. Worth far more than its weight.' },
  seashell:   { name: 'Pearl Shell', icon: '🐚', type: 'collectible', stack: true, price: 60,
                desc: 'A shimmering shell from the Saltwind Coast.' },
  // quest & misc
  herb:       { name: 'Moonpetal Herb', icon: '🌸', type: 'quest', stack: true, price: 5,
                desc: 'A silvery herb that blooms at dusk. Lyra needs these.' },
  ore:        { name: 'Star-Iron Ore', icon: '🪨', type: 'quest', stack: true, price: 10,
                desc: 'Ore flecked with sky-metal. Bram could forge wonders from this.' },
  ancientKeyItem: { name: 'The Ancient Key', icon: '🗝️', type: 'quest',
                desc: 'A key of black iron, humming with draconic runes. It opens the Dragon\'s Lair.' },
  catItem:    { name: 'Whiskers the Cat', icon: '🐈', type: 'quest',
                desc: 'A very smug cat. He knows exactly how much trouble he caused.' },
  luckyCoin:  { name: 'Lucky Coin', icon: '🪙', type: 'misc', luckP: 3,
                desc: 'A two-headed coin. +3 Luck while carried.' },
  boat:       { name: 'Wooden Boat', icon: '🛶', type: 'vehicle', price: 150,
                desc: 'A sturdy little boat. Carry it with you and launch it on any water, then hop aboard to sail.' },
  // --- furniture (placed inside owned houses) ---
  fBed:    { name: 'Comfy Bed', icon: '🛏️', type: 'furniture', price: 80, desc: 'A soft bed for an adventurer\'s rare rest.' },
  fChair:  { name: 'Wooden Chair', icon: '🪑', type: 'furniture', price: 25, desc: 'Sit. You have earned it.' },
  fTable:  { name: 'Dining Table', icon: '🪵', type: 'furniture', price: 45, desc: 'Surface for feasts and battle plans.' },
  fSofa:   { name: 'Plush Sofa', icon: '🛋️', type: 'furniture', price: 120, desc: 'Dangerously comfortable.' },
  fPlant:  { name: 'Potted Plant', icon: '🪴', type: 'furniture', price: 30, desc: 'A touch of life indoors.' },
  fPainting:{ name: 'Framed Painting', icon: '🖼️', type: 'furniture', price: 70, desc: 'A heroic portrait. Possibly of you.' },
  fLamp:   { name: 'Candle Lamp', icon: '🕯️', type: 'furniture', price: 35, desc: 'Warm, flickering light.' },
  fBookshelf:{ name: 'Bookshelf', icon: '📚', type: 'furniture', price: 90, desc: 'Knowledge, neatly stacked.' },
  fVase:   { name: 'Ornate Vase', icon: '🏺', type: 'furniture', price: 55, desc: 'Tasteful. Fragile. Expensive.' },
  fOrb:    { name: 'Scrying Orb', icon: '🔮', type: 'furniture', price: 150, desc: 'It glows with arcane potential.' },
  fAnvil:  { name: 'Home Anvil', icon: '🔨', type: 'furniture', price: 130, desc: 'For the tinkering homeowner.' },
  fRug:    { name: 'Patterned Rug', icon: '🟥', type: 'furniture', price: 40, desc: 'Ties the room together.' },
};
const FURNITURE_IDS = ['fBed', 'fChair', 'fTable', 'fSofa', 'fPlant', 'fPainting', 'fLamp', 'fBookshelf', 'fVase', 'fOrb', 'fAnvil', 'fRug'];

// Unique named items by rarity tier
const UNIQUES = {
  legendary: [
    { base: 'sword', name: 'Blade of Forgotten Kings', icon: '⚔️', bonus: { atk: 8, cha: 3 },
      lore: 'Forged for a dynasty whose name even the stones forgot.' },
    { base: 'ring', name: 'Emberheart Ring', icon: '💍', bonus: { atk: 5, hp: 25 },
      lore: 'Warm to the touch. It beats, faintly, like a tiny heart of fire.' },
    { base: 'bow', name: 'Whisperwind', icon: '🏹', bonus: { atk: 7, luck: 5 },
      lore: 'Its arrows arrive before the sound of the string.' },
    { base: 'plate', name: 'Bulwark of the Last Dawn', icon: '🛡️', bonus: { def: 8, hp: 40 },
      lore: 'Worn by the knight who held the gate alone until sunrise.' },
    { base: 'staff', name: 'Rod of Hollow Stars', icon: '🌠', bonus: { atk: 6, mp: 40 },
      lore: 'Each gem on its head is a star that no longer exists.' },
  ],
  mythic: [
    { base: 'amulet', name: 'Crown of the Eternal Watcher', icon: '👑', bonus: { def: 6, hp: 60, luck: 4, cha: 5 },
      lore: 'It sees everything. It judges quietly. It approves of you — for now.' },
    { base: 'sword', name: 'Vaelthyx\'s Fang', icon: '🐉', bonus: { atk: 14, hp: 30 },
      lore: 'A tooth of the great dragon, still smoldering after all these years.' },
    { base: 'dagger', name: 'Nightfall\'s Kiss', icon: '🌙', bonus: { atk: 10, luck: 8 },
      lore: 'Strikes between one heartbeat and the next.' },
  ],
  ancient: [
    { base: 'sword', name: 'Worldsplinter', icon: '🌋', bonus: { atk: 20, hp: 50, luck: 5 },
      lore: 'A shard of the blade that carved the valleys at the dawn of things.' },
    { base: 'amulet', name: 'The First Ember', icon: '🔆', bonus: { atk: 8, def: 8, hp: 80, mp: 50 },
      lore: 'The spark from which all fires — and all stories — were lit.' },
    { base: 'plate', name: 'Aegis of the Sleeping God', icon: '✴️', bonus: { def: 18, hp: 100 },
      lore: 'Do not wake what lends you this protection.' },
  ],
};

const PREFIXES = ['Worn', 'Sturdy', 'Fine', 'Gleaming', 'Runed', 'Blessed', 'Stormwrought'];

let _itemSeq = 1;

// Create an item instance from base id, with rarity scaling
function makeItem(baseId, rarity, opts) {
  const base = ITEM_BASES[baseId];
  if (!base) return null;
  rarity = rarity || 'common';
  const r = RARITY[rarity];
  const it = {
    uid: 'i' + (_itemSeq++) + '_' + Date.now().toString(36),
    base: baseId, rarity,
    name: base.name, icon: base.icon,
    slot: base.slot || null, type: base.type || 'gear',
    qty: 1, stack: !!base.stack,
    desc: base.desc || '',
    stats: {},
  };
  if (base.slot) { // gear scales with rarity
    const ri = RARITIES.indexOf(rarity);
    for (const k of ['atk', 'def', 'hp', 'mp', 'luck', 'cha', 'str']) {
      if (base[k]) it.stats[k] = Math.round(base[k] * r.mult);
    }
    if (ri >= 1 && ri <= 3) it.name = PREFIXES[Math.min(ri * 2, PREFIXES.length - 1)] + ' ' + base.name;
    it.price = Math.round((base.price || 20) * r.mult * r.mult);
  } else {
    if (base.heal) it.heal = base.heal;
    if (base.mana) it.mana = base.mana;
    if (base.cure) it.cure = true;
    if (base.invis) it.invis = true;
    if (base.regen) it.regen = true;
    if (base.luckP) it.stats.luck = base.luckP;
    it.price = base.price || 10;
  }
  if (opts && opts.unique) {
    const u = opts.unique;
    it.name = u.name; it.icon = u.icon; it.desc = u.lore; it.unique = true;
    for (const k in u.bonus) it.stats[k] = (it.stats[k] || 0) + u.bonus[k];
    it.price = Math.round(it.price * 2.5);
  }
  return it;
}

// Weighted rarity roll; luck shifts odds, NG+ unlocks ancient
function rollRarity(luckBonus, minRarity) {
  const ng = G && G.ngPlus ? 1 : 0;
  let pool = RARITIES.filter(r => ng || r !== 'ancient');
  if (minRarity) {
    const mi = RARITIES.indexOf(minRarity);
    pool = pool.filter(r => RARITIES.indexOf(r) >= mi);
  }
  const lk = 1 + (luckBonus || 0) * 0.04 + ng * 0.5;
  let total = 0; const ws = pool.map(r => {
    const i = RARITIES.indexOf(r);
    const w = RARITY[r].w * (i >= 2 ? lk : 1);
    total += w; return w;
  });
  let roll = rnd() * total;
  for (let i = 0; i < pool.length; i++) { roll -= ws[i]; if (roll <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

// Random loot drop appropriate to a level
function rollLoot(level, opts) {
  opts = opts || {};
  const luck = G ? playerStat('luck') : 0;
  const rarity = rollRarity(luck, opts.minRarity);
  const ri = RARITIES.indexOf(rarity);
  // high tiers draw from unique tables
  if (ri >= 4) {
    const tier = rarity === 'legendary' ? 'legendary' : rarity === 'mythic' ? 'mythic' : 'ancient';
    const table = UNIQUES[tier];
    const u = table[Math.floor(rnd() * table.length)];
    return makeItem(u.base, rarity, { unique: u });
  }
  const gearIds = ['sword', 'axe', 'bow', 'staff', 'dagger', 'leather', 'chain', 'robe', 'plate', 'ring', 'amulet'];
  const potionIds = ['hpPotion', 'hpPotion', 'mpPotion', 'antidote', 'bigHpPotion'];
  if (!opts.gearOnly && chance(0.4)) return makeItem(pick(potionIds), 'common');
  return makeItem(pick(gearIds), rarity);
}

// ---------- inventory ops ----------
function addItem(item, silent) {
  if (!item) return;
  if (item.stack) {
    const ex = G.player.inventory.find(i => i.base === item.base);
    if (ex) { ex.qty += item.qty; if (!silent) UI.notifyItem(item); return; }
  }
  if (G.player.inventory.length >= 40) {
    UI.notify('Your pack is full! (' + item.name + ' left behind)', 'bad');
    return;
  }
  G.player.inventory.push(item);
  if (!silent) UI.notifyItem(item);
  if (RARITIES.indexOf(item.rarity) >= 4) unlockAchievement('legendary');
}

function removeItem(item, n) {
  n = n || 1;
  if (item.stack && item.qty > n) { item.qty -= n; return; }
  const i = G.player.inventory.indexOf(item);
  if (i >= 0) G.player.inventory.splice(i, 1);
}

function countItem(baseId) {
  return G.player.inventory.filter(i => i.base === baseId).reduce((s, i) => s + i.qty, 0);
}

function takeItems(baseId, n) {
  let need = n;
  for (const it of [...G.player.inventory]) {
    if (it.base !== baseId || need <= 0) continue;
    const take = Math.min(need, it.qty);
    removeItem(it, take); need -= take;
  }
}

function equipItem(item) {
  if (!item.slot) return;
  const cur = G.player.equipment[item.slot];
  removeItem(item);
  if (cur) G.player.inventory.push(cur);
  G.player.equipment[item.slot] = item;
  Audio2.sfx('chest');
  recalcStats();
}

function unequipItem(slot) {
  const cur = G.player.equipment[slot];
  if (!cur) return;
  if (G.player.inventory.length >= 40) { UI.notify('Pack is full!', 'bad'); return; }
  G.player.equipment[slot] = null;
  G.player.inventory.push(cur);
  recalcStats();
}

function usePotion(item, inCombat) {
  const p = G.player;
  let used = false;
  if (item.heal) { const h = Math.min(item.heal, p.maxHp - p.hp); p.hp += h; used = true; if (h > 0) UI.notify('+' + h + ' HP', 'good'); }
  if (item.mana) { const m = Math.min(item.mana, p.maxMp - p.mp); p.mp += m; used = true; if (m > 0) UI.notify('+' + m + ' MP', 'good'); }
  if (item.cure) { p.status = p.status.filter(s => STATUS[s.id].good); used = true; UI.notify('Ailments cured', 'good'); }
  if (item.invis) { applyStatusToPlayer('invisible'); used = true; UI.notify('You fade from sight...', 'good'); }
  if (item.regen) { applyStatusToPlayer('regen'); used = true; UI.notify('Regeneration flows through you.', 'good'); }
  if (used) { Audio2.sfx('heal'); removeItem(item, 1); UI.updateHUD(); }
  return used;
}

// Equipment + base stat aggregate
function playerStat(stat) {
  const p = G.player;
  let v = p.stats[stat] || 0;
  for (const s of ['weapon', 'armor', 'ring', 'amulet']) {
    const it = p.equipment[s];
    if (it && it.stats[stat]) v += it.stats[stat];
  }
  // carried misc bonuses (lucky coin)
  for (const it of p.inventory) if (it.type === 'misc' && it.stats && it.stats[stat]) v += it.stats[stat];
  return v;
}
function playerAtk() { return playerStat('str') + playerStat('atk'); }
function playerDef() { return playerStat('def'); }

function recalcStats() {
  const p = G.player;
  const bonusHp = playerStat('hp'), bonusMp = playerStat('mp');
  const newMaxHp = p.baseMaxHp + bonusHp, newMaxMp = p.baseMaxMp + bonusMp;
  p.hp = clamp(Math.round(p.hp * (newMaxHp / Math.max(1, p.maxHp))), 1, newMaxHp);
  p.mp = clamp(p.mp, 0, newMaxMp);
  p.maxHp = newMaxHp; p.maxMp = newMaxMp;
  UI.updateHUD();
}
