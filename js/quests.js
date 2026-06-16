/* ============ Emberfall — quests, reputation & achievements ============ */
'use strict';

// stage kinds: kill {target,n} | boss {target} | collect {item,n} | talk {npc} | reach {zone} | floor {n}
const QUESTS = {
  m1: {
    name: 'Trouble in Eldenbrook', type: 'main', giver: 'elder',
    desc: 'Goblins have been raiding the village fields at night. Elder Rowan asks you to thin their numbers.',
    stages: [
      { kind: 'kill', target: 'goblin', n: 3, text: 'Slay goblins in the plains and Whisperwood' },
      { kind: 'talk', npc: 'elder', text: 'Return to Elder Rowan' },
    ],
    rewards: { xp: 60, gold: 50, rep: 5 },
    next: 'm2',
  },
  m2: {
    name: 'Into the Gloomhollow', type: 'main', giver: 'elder',
    desc: 'The goblins answer to a king in Gloomhollow Cave, north past the crossroads. Cut off the head of the snake.',
    stages: [
      { kind: 'boss', target: 'goblinKing', text: 'Defeat Grubnak in Gloomhollow Cave (north)' },
      { kind: 'talk', npc: 'elder', text: 'Bring word to Elder Rowan' },
    ],
    rewards: { xp: 200, gold: 120, rep: 10, loot: { minRarity: 'rare' } },
    next: 'm3',
  },
  m3: {
    name: 'Whispers of Varnath', type: 'main', giver: 'elder',
    desc: 'Grubnak\'s war-drums spoke of a "cold master" in the eastern ruins. The Lich Kareth guards the Ancient Key — the only thing that opens the Dragon\'s Lair.',
    stages: [
      { kind: 'boss', target: 'lichKareth', text: 'Destroy Kareth in the Ruins of Old Varnath (east, across the bridge)' },
      { kind: 'talk', npc: 'elder', text: 'Show the Ancient Key to Elder Rowan' },
    ],
    rewards: { xp: 500, gold: 250, rep: 15, flag: 'ancientKey' },
    next: 'm4',
  },
  m4: {
    name: 'The Doom of Emberfall', type: 'main', giver: 'elder',
    desc: 'The dragon Vaelthyx stirs in his mountain lair. The Ancient Key will open his obsidian door. End this, hero — for Eldenbrook, for everyone.',
    stages: [
      { kind: 'boss', target: 'dragonVaelthyx', text: 'Slay Vaelthyx in the Dragon\'s Lair (far north-east)' },
    ],
    rewards: { xp: 1000, gold: 500, rep: 30 },
  },
  sCat: {
    name: 'A Cat Named Whiskers', type: 'side', giver: 'mab',
    desc: 'Old Mab\'s cat Whiskers has run off again — "He fancies himself a panther, the daft thing." Last seen heading into Whisperwood.',
    stages: [
      { kind: 'collect', item: 'catItem', n: 1, text: 'Find Whiskers in Whisperwood (south-west woods)' },
      { kind: 'talk', npc: 'mab', text: 'Return Whiskers to Old Mab' },
    ],
    rewards: { xp: 50, gold: 30, rep: 5, items: [{ base: 'luckyCoin' }] },
  },
  sHerbs: {
    name: 'Moonpetal Tonic', type: 'repeat', giver: 'healer',
    desc: 'Lyra the healer needs Moonpetal herbs for her tonics. They grow among the wildflowers — search flowering meadows.',
    stages: [
      { kind: 'collect', item: 'herb', n: 5, text: 'Gather 5 Moonpetal Herbs (interact with flowers)' },
      { kind: 'talk', npc: 'healer', text: 'Deliver the herbs to Lyra' },
    ],
    rewards: { xp: 40, gold: 45, rep: 2 },
  },
  sOre: {
    name: 'Star-Iron for the Forge', type: 'side', giver: 'blacksmith',
    desc: 'Bram swears the cave goblins hoard star-iron ore. Bring him 3 chunks and he\'ll work something special.',
    stages: [
      { kind: 'collect', item: 'ore', n: 3, text: 'Collect 3 Star-Iron Ore (cave enemies & chests)' },
      { kind: 'talk', npc: 'blacksmith', text: 'Bring the ore to Bram' },
    ],
    rewards: { xp: 120, gold: 0, loot: { minRarity: 'epic', gearOnly: true } },
  },
  sRiddle: {
    name: 'The Stone That Speaks', type: 'hidden', giver: null,
    desc: 'The forest shrine whispered a riddle and the thorn-wall west of the crossroads shuddered. Something ancient sleeps in the Hidden Grove.',
    stages: [
      { kind: 'boss', target: 'ancientGuardian', text: 'Face what waits in the Hidden Grove (far west)' },
    ],
    rewards: { xp: 600, gold: 300, rep: 10, loot: { minRarity: 'legendary' } },
  },
  sDepths: {
    name: 'The Endless Depths', type: 'hidden', giver: null,
    desc: 'With the dragon slain, the old portal in Varnath has flickered to life. How deep does it go? Nobody has ever returned to say.',
    stages: [
      { kind: 'floor', n: 5, text: 'Reach floor 5 of the Endless Depths' },
    ],
    rewards: { xp: 800, gold: 400, loot: { minRarity: 'mythic' } },
  },
};

function questState(id) { return G.quests[id]; }
function questActive(id) { const q = G.quests[id]; return q && !q.done; }
function questDone(id) { const q = G.quests[id]; return q && q.done; }

function startQuest(id) {
  if (G.quests[id] && !QUESTS[id].type.includes('repeat')) return;
  if (questActive(id)) return;
  G.quests[id] = { stage: 0, progress: 0, done: false };
  UI.notify('📜 New quest: ' + QUESTS[id].name, 'quest');
  Audio2.sfx('quest');
  UI.updateQuestTracker();
}

function curStage(id) {
  const st = G.quests[id];
  if (!st || st.done) return null;
  return QUESTS[id].stages[st.stage];
}

// fired on kills, boss kills, floor reached, etc.
function questEvent(kind, target) {
  for (const id in G.quests) {
    const st = G.quests[id];
    if (st.done) continue;
    const stage = QUESTS[id].stages[st.stage];
    if (!stage || stage.kind !== kind) continue;
    if (kind === 'kill' && stage.target === target) {
      st.progress++;
      UI.notify(QUESTS[id].name + ': ' + st.progress + '/' + stage.n, 'quest');
      if (st.progress >= stage.n) advanceQuest(id);
    } else if (kind === 'boss' && stage.target === target) {
      advanceQuest(id);
    } else if (kind === 'floor' && G.dungeonFloor >= stage.n) {
      advanceQuest(id);
    } else if (kind === 'reach' && stage.zone === target) {
      advanceQuest(id);
    }
  }
  UI.updateQuestTracker();
}

// check collect stages against inventory (called after pickups)
function questCheckCollect() {
  for (const id in G.quests) {
    const st = G.quests[id];
    if (st.done) continue;
    const stage = QUESTS[id].stages[st.stage];
    if (stage && stage.kind === 'collect' && countItem(stage.item) >= stage.n) {
      advanceQuest(id);
    }
  }
  UI.updateQuestTracker();
}

// NPC turn-in: returns true if this npc completes a quest stage
function questTalkTurnIn(npcId) {
  for (const id in G.quests) {
    const st = G.quests[id];
    if (st.done) continue;
    const stage = QUESTS[id].stages[st.stage];
    if (stage && stage.kind === 'talk' && stage.npc === npcId) {
      // consume collect items from a prior stage
      const prev = QUESTS[id].stages[st.stage - 1];
      if (prev && prev.kind === 'collect' && ITEM_BASES[prev.item].stack) takeItems(prev.item, prev.n);
      if (prev && prev.kind === 'collect' && !ITEM_BASES[prev.item].stack) {
        const it = G.player.inventory.find(i => i.base === prev.item);
        if (it) removeItem(it);
      }
      advanceQuest(id);
      return id;
    }
  }
  return null;
}

function advanceQuest(id) {
  const st = G.quests[id];
  st.stage++; st.progress = 0;
  if (st.stage >= QUESTS[id].stages.length) {
    completeQuest(id);
  } else {
    UI.notify('📜 ' + QUESTS[id].name + ' — ' + QUESTS[id].stages[st.stage].text, 'quest');
    Audio2.sfx('quest');
  }
  UI.updateQuestTracker();
}

function completeQuest(id) {
  const q = QUESTS[id];
  const st = G.quests[id];
  st.done = true;
  UI.notify('✅ Quest complete: ' + q.name, 'quest');
  Audio2.sfx('levelup');
  giveRewards(q.rewards);
  if (q.type === 'repeat') {
    // repeatables reset, can be re-accepted from the giver
    delete G.quests[id];
    G.flags['done_' + id] = (G.flags['done_' + id] || 0) + 1;
  } else {
    G.flags['done_' + id] = 1;
  }
  if (q.next && !G.quests[q.next]) {
    // main chain: next quest offered by elder, mark availability
    G.flags['avail_' + q.next] = 1;
  }
  if (id === 'm4') setTimeout(() => Game.winGame(), 1200);
  UI.updateQuestTracker();
}

function giveRewards(r) {
  if (!r) return;
  if (r.xp) gainXP(r.xp);
  if (r.gold) gainGold(r.gold);
  if (r.rep) addRep(r.rep);
  if (r.flag) G.flags[r.flag] = 1;
  if (r.items) for (const def of r.items) addItem(makeItem(def.base, def.rarity || 'common'));
  if (r.loot) {
    const item = rollLoot(G.player.level, { minRarity: r.loot.minRarity, gearOnly: r.loot.gearOnly });
    addItem(item);
    UI.lootFanfare(item);
  }
}

// ---------- reputation ----------
function addRep(n) {
  G.player.rep = clamp(G.player.rep + n, -100, 100);
  if (n > 0) UI.notify('Reputation +' + n, 'good');
  else if (n < 0) UI.notify('Reputation ' + n, 'bad');
  if (G.player.rep >= 50) unlockAchievement('saint');
  if (G.player.rep <= -50) unlockAchievement('menace');
  UI.updateHUD();
}
function repTier() {
  const r = G.player.rep;
  if (r >= 50) return 'hero'; if (r >= 15) return 'liked';
  if (r <= -50) return 'hated'; if (r <= -15) return 'disliked';
  return 'neutral';
}

// ---------- achievements ----------
function unlockAchievement(id) {
  if (!ACHIEVEMENTS[id] || G.achievements[id]) return;
  G.achievements[id] = 1;
  UI.notify('🏆 Achievement: ' + ACHIEVEMENTS[id].name, 'achieve');
  Audio2.sfx('lootEpic');
}

// ---------- XP / leveling ----------
function xpForLevel(lvl) { return Math.floor(80 * lvl * (1 + lvl * 0.18)); }

function gainXP(n) {
  const p = G.player;
  p.xp += n;
  UI.notify('+' + n + ' XP', 'good');
  while (p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    levelUp();
  }
  UI.updateHUD();
}

function levelUp() {
  const p = G.player;
  const cls = CLASSES[p.cls];
  p.level++;
  for (const k of ['str', 'def', 'luck', 'cha']) {
    p.stats[k] = Math.round((p.stats[k] + cls.growth[k]) * 10) / 10;
  }
  p.baseMaxHp += cls.growth.hp;
  p.baseMaxMp += cls.growth.mp;
  p.skillPoints = (p.skillPoints || 0) + 1;
  recalcStats();
  p.hp = p.maxHp; p.mp = p.maxMp; // level-up fully heals
  Audio2.sfx('levelup');
  UI.notify('⬆️ Level ' + p.level + '! (+1 skill point)', 'achieve');
  FX.burst(G.player.px, G.player.py, '#ffd700', 24);
  if (p.level >= 10) unlockAchievement('level10');
}

function gainGold(n) {
  G.player.gold += n;
  if (n > 0) { Audio2.sfx('coin'); UI.notify('+' + n + ' gold', 'good'); }
  if (G.player.gold >= 1000) unlockAchievement('rich');
  UI.updateHUD();
}
function spendGold(n) {
  if (G.player.gold < n) return false;
  G.player.gold -= n; Audio2.sfx('coin'); UI.updateHUD(); return true;
}
