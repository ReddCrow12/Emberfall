/* ============ Emberfall — player, NPCs, bosses & world interaction ============ */
'use strict';

function createPlayer(clsId, name) {
  const c = CLASSES[clsId];
  const skills = {};
  c.abilities.forEach(a => skills[a.id] = 1);
  return {
    name: name || 'Adventurer', cls: clsId,
    x: LOCS.spawn.x, y: LOCS.spawn.y,
    px: LOCS.spawn.x, py: LOCS.spawn.y, facing: 'down', anim: 0,
    stats: { str: c.base.str, def: c.base.def, luck: c.base.luck, cha: c.base.cha },
    baseMaxHp: c.base.hp, baseMaxMp: c.base.mp,
    maxHp: c.base.hp, hp: c.base.hp, maxMp: c.base.mp, mp: c.base.mp,
    xp: 0, level: 1, gold: 30, rep: 0,
    inventory: [], equipment: { weapon: null, armor: null, ring: null, amulet: null },
    skills, skillPoints: 0, status: [], onBoat: false,
  };
}

function abilityPower(ab) {
  const lvl = G.player.skills[ab.id] || 1;
  return (ab.pow || 0) * (1 + 0.18 * (lvl - 1));
}

// ---------- NPCs ----------
const VC = VILLAGE_C;
// vendors stand one tile south of their market stall
const STALL_OF = {}; (typeof VILLAGE_STALLS !== 'undefined' ? VILLAGE_STALLS : []).forEach(s => STALL_OF[s.id] = { x: s.x, y: s.y + 1 });
const NPC_DEFS = [
  // --- service folk (near homes & the well) ---
  { id: 'elder', name: 'Elder Rowan', icon: '🧓', x: VC.x, y: VC.y - 5, wander: 0, important: true },
  { id: 'healer', name: 'Lyra Dawnwhisper', icon: '👩‍⚕️', x: VC.x - 8, y: VC.y - 5, wander: 1 },
  { id: 'guard', name: 'Guard Tomlin', icon: '💂', x: VC.x, y: VC.y + 9, wander: 1 },
  { id: 'mab', name: 'Old Mab', icon: '👵', x: VC.x + 8, y: VC.y - 4, wander: 1 },
  { id: 'gerald', name: 'Gerald the Chicken Whisperer', icon: '👨‍🌾', x: VC.x - 9, y: VC.y + 6, wander: 2 },
  { id: 'traveler', name: 'Finn the Wayfarer', icon: '🧳', x: VC.x + 9, y: VC.y + 4, wander: 2 },
  { id: 'stranger', name: 'The Mysterious Stranger', icon: '🕵️', x: VC.x + 2, y: VC.y - 4, wander: 0,
    cond: () => G.flags.done_m3 },
  // --- market-stall vendors ---
  { id: 'shop', name: 'Marta the Merchant', icon: '👩‍🌾', x: STALL_OF.shop.x, y: STALL_OF.shop.y, wander: 0 },
  { id: 'blacksmith', name: 'Bram Ironsong', icon: '🧔', x: STALL_OF.blacksmith.x, y: STALL_OF.blacksmith.y, wander: 0 },
  { id: 'armorer', name: 'Sera Steelhide', icon: '🛡️', x: STALL_OF.armorer.x, y: STALL_OF.armorer.y, wander: 0 },
  { id: 'alchemist', name: 'Pip Bubblewick', icon: '⚗️', x: STALL_OF.alchemist.x, y: STALL_OF.alchemist.y, wander: 0 },
  { id: 'furnisher', name: 'Dwin the Furnisher', icon: '🪚', x: STALL_OF.furnisher.x, y: STALL_OF.furnisher.y, wander: 0 },
  { id: 'realtor', name: 'Cassia, Property Broker', icon: '👔', x: STALL_OF.realtor.x, y: STALL_OF.realtor.y, wander: 0, important: true },
  // --- town NPCs ---
  { id: 'magus', name: 'Magus Vey', icon: '🧙‍♂️', x: LOCS.frostmere.x, y: LOCS.frostmere.y - 2, wander: 0, important: true },
  { id: 'frostkin', name: 'Brina of Frostmere', icon: '🧕', x: LOCS.frostmere.x - 3, y: LOCS.frostmere.y + 2, wander: 1 },
  { id: 'nomad', name: 'Hassan the Nomad', icon: '🧎', x: LOCS.sunspear.x + 2, y: LOCS.sunspear.y, wander: 1 },
  { id: 'rover', name: 'Wandering Merchant Yul', icon: '🐪', x: LOCS.saltwind.x - 2, y: LOCS.saltwind.y - 1, wander: 0, important: true },
  { id: 'fisher', name: 'Old Salt Pernn', icon: '🎣', x: LOCS.saltwind.x + 4, y: LOCS.saltwind.y + 3, wander: 0, important: true },
  { id: 'caveman', name: 'Grok the Caveman', icon: '🧔🏽', x: LOCS.island.x, y: LOCS.island.y + 1, wander: 1, important: true },
  // --- conditional / hidden ---
  { id: 'sylvara', name: 'Sylvara, Voice of the Grove', icon: '🧝', x: 26, y: 100, wander: 0,
    cond: () => G.flags.boss_ancientGuardian, important: true },
  { id: 'whiskers', name: 'Whiskers (?)', icon: '🐈', x: 46, y: 110, wander: 0,
    cond: () => questActive('sCat') && countItem('catItem') === 0 },
];

function npcVisible(n) { return !n.def.cond || n.def.cond(); }

function spawnNPCs() {
  G.npcs = NPC_DEFS.map(def => ({ id: def.id, def, x: def.x, y: def.y, hx: def.x, hy: def.y, t: rnd() * 9 }));
}

function updateNPCs(dt) {
  if (G.inDungeon || G.inInterior) return;
  for (const n of G.npcs) {
    if (!n.def.wander || !npcVisible(n)) continue;
    n.t -= dt;
    if (n.t <= 0) {
      n.t = 2.5 + rnd() * 5;
      const dx = rint(-1, 1), dy = dx === 0 ? rint(-1, 1) : 0;
      const nx = n.x + dx, ny = n.y + dy;
      if (Math.abs(nx - n.hx) <= n.def.wander && Math.abs(ny - n.hy) <= n.def.wander &&
          !isBlocked(nx, ny) && !(nx === G.player.x && ny === G.player.y)) {
        n.x = nx; n.y = ny;
      }
    }
  }
}

// ---------- bosses on the map ----------
const WORLD_BOSSES = [
  { id: 'goblinKing', loc: LOCS.caveBoss },
  { id: 'lichKareth', loc: LOCS.lichBoss },
  { id: 'ancientGuardian', loc: LOCS.guardianBoss, cond: () => G.flags.grovePath },
  { id: 'dragonVaelthyx', loc: LOCS.dragonBoss },
  { id: 'frostTitan', loc: LOCS.frostBoss },
  { id: 'sandWyrm', loc: LOCS.sandBoss },
  { id: 'voidWraith', loc: LOCS.voidBoss, cond: () => G.ngPlus && G.flags.boss_ancientGuardian },
];

function bossAlive(b) {
  if (G.flags['boss_' + b.id]) return false;
  return !b.cond || b.cond();
}

function checkBossProximity() {
  if (G.inDungeon || Combat.active) return;
  for (const b of WORLD_BOSSES) {
    if (!bossAlive(b)) continue;
    if (Math.abs(G.player.x - b.loc.x) + Math.abs(G.player.y - b.loc.y) <= 2) {
      Combat.startBoss(b.id);
      return;
    }
  }
}

// ---------- dialogue trees ----------
// Each returns a node {text, options:[{label, sub, fn}]}; fn returns a node or null (close).
const DIALOGS = {
  elder() {
    const turnedIn = questTalkTurnIn('elder');
    if (turnedIn === 'm1') return node("You've bloodied their noses, hero! But goblins don't organize on their own... Rest, then come see me again.", bye());
    if (turnedIn === 'm2') return node("The Goblin King, slain! But what you found troubles me — a 'cold master' in the east. The old ruins... Kareth. Speak to me when you're ready for the truth.", bye());
    if (turnedIn === 'm3') return node("So it's true. The Lich guarded the Ancient Key — which means the dragon STIRS. Take the key, hero. The lair lies in the far north-east mountains. Emberfall's fate walks with you.", bye());
    if (G.flags.avail_m4 && !G.quests.m4) return node("Vaelthyx wakes, and only you hold the key. I won't lie — many have climbed that mountain. None returned. Will you go?",
      [opt('Accept: The Doom of Emberfall', () => { startQuest('m4'); return node('"May the First Ember light your path." The whole village watches you go — some praying, some waving, Gerald saluting with a chicken.', bye()); }),
       opt('Not yet', null)]);
    if (G.flags.avail_m3 && !G.quests.m3) return node("The ruins of Old Varnath lie east, across the Silverrun bridge. The Lich Kareth holds the Ancient Key — without it, the dragon's door will never open. Will you face him?",
      [opt('Accept: Whispers of Varnath', () => { startQuest('m3'); return node('"Beware his frost, and trust your steel. And hero — buy potions first. Pride fills no graves like preparedness empties them."', bye()); }),
       opt('Not yet', null)]);
    if (G.flags.avail_m2 && !G.quests.m2) return node("The goblins you slew bore war-paint of Grubnak, their so-called king. His throne squats in Gloomhollow Cave, due north past the crossroads. End him?",
      [opt('Accept: Into the Gloomhollow', () => { startQuest('m2'); return node('"Take a torch\'s worth of courage — that cave swallows light and adventurers alike."', bye()); }),
       opt('Not yet', null)]);
    if (!G.quests.m1) return node("Ah, the new blade in town. Eldenbrook needs you sorely — goblins raid our fields each night, and my knees are eighty years past chasing them. Will you help us?",
      [opt('Accept: Trouble in Eldenbrook', () => { startQuest('m1'); return node('"Three of the wretches should send the message. You\'ll find them skulking in the plains and the Whisperwood. Go safely."', bye()); }),
       opt('Maybe later', null)]);
    if (questActive('m4')) return node('"The lair waits in the far north-east. The key will answer the obsidian door. We believe in you."', bye());
    if (G.flags.done_m4) return node('"The hero of Emberfall, in the flesh! Statues will be carved, songs will be sung, and Gerald is naming a chicken after you."', bye());
    const q = ['The harvest looks promising this year — thanks to you.', 'My knees ache. Rain coming, or goblins. Hopefully rain.', 'Eldenbrook has stood three hundred years. With heroes like you, three hundred more.'];
    return node('"' + pick(q) + '"', bye());
  },

  shop() {
    const tier = repTier();
    if (tier === 'hated') return node('"YOU! Out of my shop! We don\'t serve villains here... unless you pay double. Fine. Double, and don\'t touch anything."',
      [opt('Browse wares (marked up)', () => { UI.openShop('shop'); return null; }), opt('Leave', null)]);
    const greet = tier === 'hero' ? 'The hero graces my humble stall! For you, my very best prices.' :
      pick(['Fresh potions! Mostly fresh. Acceptably fresh.', 'Welcome, welcome! Gold spends the same in any weather.', 'Buying? Selling? Gossiping? I accept all three.']);
    return node('"' + greet + '"', [opt('Browse wares', () => { UI.openShop('shop'); return null; }), opt('Leave', null)]);
  },

  blacksmith() {
    const t = questTalkTurnIn('blacksmith');
    if (t === 'sOre') return node('"STAR-IRON! Look at the grain on that! Give me a moment—" *furious hammering* "—here. Finest work of my life. Wear it well, friend."', bye());
    const opts = [opt('Browse the forge', () => { UI.openShop('blacksmith'); return null; })];
    if (!G.quests.sOre && !G.flags.done_sOre && G.flags.done_m1) {
      opts.unshift(opt('"Need anything forged?"', () => { startQuest('sOre'); return node('"The cave goblins hoard star-iron ore — fell from the sky generations back. Bring me three chunks and I\'ll forge you something the bards will mention."', bye()); }));
    }
    opts.push(opt('Leave', null));
    return node('"' + pick(['Mind the sparks.', 'A dull blade is a long funeral.', 'Steel doesn\'t lie. People lie. Buy steel.']) + '"', opts);
  },

  healer() {
    const t = questTalkTurnIn('healer');
    if (t === 'sHerbs') return node('"Perfect petals, every one! The tonic will keep three families on their feet this winter. Bless you."', bye());
    const cost = Math.max(5, 15 + G.player.level * 4 - Math.floor(playerStat('cha')));
    const opts = [];
    if (G.player.hp < G.player.maxHp || G.player.mp < G.player.maxMp) {
      opts.push(opt('Rest and heal (' + cost + 'g)', () => {
        if (!spendGold(cost)) return node('"No gold, no herbs, I\'m afraid. The lake won\'t pay my suppliers."', bye());
        G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp; G.player.status = [];
        Audio2.sfx('heal'); UI.updateHUD();
        return node('"There. Good as new — try to stay that way longer than last time, hm?"', bye());
      }));
    }
    if (!questActive('sHerbs')) {
      opts.push(opt('"Need any help?"', () => { startQuest('sHerbs'); return node('"Always! Moonpetal herbs — five of them. They grow among the wildflowers in the meadows. Search the flowering patches."', bye()); }));
    }
    opts.push(opt('Leave', null));
    return node('"' + pick(['Welcome to the apothecary.', 'Drink water. Sleep. Stop getting stabbed. That\'s the secret.', 'You look pale. Paler than usual.']) + '"', opts);
  },

  guard() {
    const tier = repTier();
    if (tier === 'hated') return node('"I\'m watching you. One toe out of line and you\'ll see our cell. We have ONE cell. It\'s very boring."', bye());
    if (tier === 'hero') return node('"Sir! I mean— ma\'am! I mean— HERO! *salutes so hard his helmet rotates*"', bye());
    return node('"' + pick(['Move along. Or don\'t. It\'s a free village.', 'Third night shift this week. The well gets very philosophical at 3am.', 'Report any goblins, dragons, or suspiciously cheap potions.']) + '"', bye());
  },

  mab() {
    const t = questTalkTurnIn('mab');
    if (t === 'sCat') return node('"WHISKERS! My baby! Where— is that RUIN dust on your paws?! ...Thank you, dearie. Take this coin — it\'s lucky. Won it off a goblin in \'62."', bye());
    if (!G.quests.sCat && !G.flags.done_sCat) {
      return node('"Oh deary me... Whiskers has run off again. He fancies himself a panther, the daft thing. Last I saw he went bounding toward the Whisperwood."',
        [opt('"I\'ll find your cat."', () => { startQuest('sCat'); return node('"Bless you, child! He answers to \'Whiskers\', \'Sir Pounce\', and the sound of cheese being unwrapped."', bye()); }),
         opt('"Cats come back on their own."', () => { addRep(-1); return node('"Hmph! Adventurers these days. In MY day we rescued cats from BOTH dragons.", she mutters.', bye()); })]);
    }
    if (questActive('sCat')) return node('"Any sign of Whiskers? Try the woods south-west — and bring cheese!"', bye());
    return node('"Whiskers says hello. Well, he said \'mrow\', but I speak fluent cat."', bye());
  },

  gerald() {
    const lines = [
      'Shh. I\'m communing. ...The chickens say a storm\'s coming. Or they want corn. The dialect is tricky.',
      'People laugh, but who predicted the goblin raid? HENRIETTA. Three days early. Nobody listens to hens.',
      'I once taught a rooster to count to three. He\'s in management now.',
      'You ever look a chicken dead in the eye? They KNOW things, friend. Terrible things.',
      'The secret to whispering to chickens? Mostly it\'s the crouching.',
    ];
    if (G.flags.done_m4) return node('"The chickens have voted. The new one is named after you. It\'s a great honor — she\'s our fastest."', bye());
    return node('"' + pick(lines) + '"',
      [opt('"...Are you okay, Gerald?"', () => node('"Never better! Henrietta says you have the aura of a hero. Or of someone carrying grain. Either way — destiny!"', bye())),
       opt('Slowly back away', null)]);
  },

  traveler() {
    const rumors = [
      'They say a stone in the Whisperwood SPEAKS — asks riddles, even. South-east of the woods, near the old meadow. Answer well and the forest itself opens.',
      'The bridge east leads to Old Varnath. Cursed ruins. Skeletons, ghosts... great place to visit, wouldn\'t move there.',
      'I saw a glow on the north-east peaks last night. Old folk say it\'s the dragon, dreaming of fire.',
      'A merchant swears there\'s a portal in the ruins that goes DOWN forever. It only wakes when the mountain\'s master dies, they say.',
      'Heard of treasure by the lake, south of the village. A smuggler\'s stash, never found. Worth a look past the shore!',
    ];
    return node('"Roads teach you things. For instance—" he leans in, "—' + pick(rumors) + '"', bye());
  },

  stranger() {
    if (G.ngPlus && !G.flags.boss_voidWraith) {
      return node('"You\'ve walked this story before, haven\'t you? Then know this: in the Hidden Grove, beyond the Guardian\'s rest... something from OUTSIDE the story has nested. Bring your best blade." His eyes do not blink. Have they ever?',
        [opt('Browse strange wares', () => { UI.openShop('stranger'); return null; }), opt('Leave', null)]);
    }
    return node('"You don\'t remember me. That\'s fine — I remember enough for both of us. Care to see wares no caravan carries?"',
      [opt('Browse strange wares', () => { UI.openShop('stranger'); return null; }),
       opt('"Who ARE you?"', () => node('"A patron of interesting endings." He smiles like a closing door.', bye())),
       opt('Leave', null)]);
  },

  sylvara() {
    if (!G.flags.groveBlessing) {
      return node('"You bested the Guardian without breaking its spirit — the grove has watched you, ember-bearer. Accept the forest\'s gratitude."',
        [opt('Receive the Grove\'s Blessing', () => {
          G.flags.groveBlessing = 1;
          G.player.stats.str += 2; G.player.stats.def += 2; G.player.stats.luck += 2;
          G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp;
          Audio2.sfx('shrine'); FX.burst(G.player.px, G.player.py, '#7bed9f', 30);
          UI.notify('Grove\'s Blessing: +2 STR, +2 DEF, +2 LUCK (permanent)', 'achieve');
          recalcStats();
          return node('"Walk gently, strike truly. The trees will remember your name longer than the stones do."', bye());
        })]);
    }
    return node('"The grove hums when you pass, ember-bearer. Few mortals earn that song."', bye());
  },

  whiskers() {
    return node('The cat regards you with the unimpressed majesty of minor royalty. "Mrow." He appears to be... posing on a ruined log? You recognize Old Mab\'s Whiskers.',
      [opt('Scoop up the cat', () => {
        addItem(makeItem('catItem'));
        questCheckCollect();
        Audio2.sfx('chest');
        return node('Whiskers goes limp with theatrical despair, but begins purring within seconds. The panther life can wait.', bye());
      }),
       opt('Leave him to his kingdom', null)]);
  },

  // ---------- vendors ----------
  realtor() {
    return node('"Welcome to Cassia\'s Properties — location, location, and also location! Looking to put down roots? I have homes for every purse, from a humble cabin to a noble estate."',
      [opt('Browse properties', () => { UI.openRealtor(); return null; }),
       opt('"How does buying work?"', () => node('"Pick a property, then I\'ll let you choose where to build it — anywhere on open ground, clear of roads, water, and your neighbors. Walk up to your door and press E to step inside. You even get a key to lock it!"', [opt('Browse properties', () => { UI.openRealtor(); return null; }), opt('Maybe later', null)])),
       opt('Leave', null)]);
  },
  furnisher() {
    return node('"Dwin\'s Fine Furnishings! A house is just a box until you fill it with character. Buy a piece, then place it inside any home you own."',
      [opt('Browse furniture', () => { UI.openShop('furnisher'); return null; }), opt('Leave', null)]);
  },
  armorer() {
    return node('"' + pick(['Steel between you and the grave — that\'s my trade.', 'Dents I can fix. Holes in YOU, less so. Buy armor.', 'A good shield is cheaper than a funeral.']) + '"',
      [opt('Browse armor', () => { UI.openShop('armorer'); return null; }), opt('Leave', null)]);
  },
  alchemist() {
    return node('"' + pick(['Potions, tonics, and one or two things that are technically legal!', 'Careful with the bubbly blue one. Or don\'t. Free entertainment either way.', 'Invisibility tonic in stock — slip past anything that wants to eat you.']) + '"',
      [opt('Browse potions', () => { UI.openShop('alchemist'); return null; }), opt('Leave', null)]);
  },
  magus() {
    return node('"' + pick(['The arcane is not for the timid. Fortunately, your coin is welcome regardless.', 'I sense potential in you. Also, I sell wands. These facts are unrelated.', 'Frostmere is cold, my wares are hot. Browse.']) + '"',
      [opt('Browse arcana', () => { UI.openShop('magus'); return null; }), opt('Leave', null)]);
  },
  rover() {
    return node('"Ah, a customer with the wandering look! Yul travels every road in Emberfall — my stock changes with the wind. See anything you fancy today?"',
      [opt('See today\'s wares', () => { UI.openShop('rover'); return null; }),
       opt('"Where have you been?"', () => node('"Frostmere to the Cinderwaste and back. Sold a frost titan a scarf once. He didn\'t need it, but he appreciated the gesture."', [opt('See today\'s wares', () => { UI.openShop('rover'); return null; }), opt('Leave', null)])),
       opt('Leave', null)]);
  },
  frostkin() {
    return node('"' + pick(['Frostmere folk are hardy. We have to be — the snowmen here have OPINIONS.', 'Magus Vey keeps the worst of the cold off the town. Don\'t ask how. I did. I regret it.', 'Heading into the tundra? Mind the Titan. And the wolves. And the wisps. Actually, mind everything.']) + '"', bye());
  },
  nomad() {
    return node('"' + pick(['The desert gives and the desert takes. Mostly it takes water. Bring water.', 'Beneath these sands sleeps Qoth the Wyrm. Tread softly, stranger.', 'Sunspear Oasis: the only honest puddle for fifty miles.']) + '"', bye());
  },
  fisher() {
    const price = Math.max(1, Math.round(150 * shopPriceMult()));
    const hasBoat = countItem('boat') > 0 || (G.boatPos != null) || G.player.onBoat;
    return node('"See that island out past the waves? Treasure, they say — heaps of it. You\'ll want a boat. Lucky for you, old Pernn builds the finest little vessels on the coast."',
      [
        hasBoat
          ? opt('"I already have a boat."', () => node('"Then what are you waiting for, the tide? Launch it on the water and hop aboard! Step ashore when you reach the isle."', bye()))
          : opt('Buy a Wooden Boat (' + price + 'g)', () => {
              if (!spendGold(price)) return node('"No coin, no boat. The sea doesn\'t take credit, and neither do I."', bye());
              addItem(makeItem('boat'));
              return node('"She\'s all yours! Open your pack, hit Launch on the water, then walk onto her. Mind the sea serpents — kidding. Mostly."', bye());
            }, price + 'g'),
        opt('"Tell me about the island."', () => node('"Nobody\'s rowed back the same. Some say a wild fellow lives out there, babbling about MORE islands coming. Sea-madness, probably. Probably."', bye())),
        opt('Leave', null),
      ]);
  },

  caveman() {
    const text = G.flags.caveHoard
      ? '"Ooga! Friend return! Island good, yes? Grok still wait for OTHER islands. Any day now. Grok very patient. Grok been patient... long time."'
      : '"OOGA?! Visitor! Nobody come here in AGES! You brave — cross big wet thing in tiny wood thing! Here — Grok find shiny round things, no use for Grok. YOU take. ALL of them!"';
    const opts = [];
    if (!G.flags.caveHoard) {
      opts.push(opt('Accept Grok\'s hoard', () => {
        G.flags.caveHoard = 1;
        gainGold(1000);
        FX.burst(G.player.px, G.player.py, '#ffd700', 40); Audio2.sfx('lootEpic');
        return node('Grok upends a cracked clay pot and a glittering avalanche of 1000 gold coins pours out. "GOOD trade! ...wait, what Grok get? ...Grok think about it later."', [
          opt('"What\'s this about more islands?"', () => node('"Grok hear whispers on wind! SOON — many island! Big island, small island, island shaped like Grok\'s cousin! Builder-spirits working on it. Come back, friend. More adventure SOON!" 🌋🏝️', bye())),
          opt('Thank him and explore', null),
        ]);
      }));
    }
    opts.push(opt('"More islands?"', () => node('"YES! Grok PROMISE! The world still growing — new lands rise from sea when the time right. Keep your boat, friend. You need it!" 🏝️', bye())));
    opts.push(opt('Leave', null));
    return node(text, opts);
  },
};

function node(text, options) { return { text, options }; }
function opt(label, fn, sub) { return { label, fn, sub }; }
function bye() { return [opt('Farewell', null)]; }

// ---------- shops ----------
function shopStock(npcId) {
  if (npcId === 'shop') return [               // general goods
    makeItem('hpPotion'), makeItem('mpPotion'), makeItem('antidote'), makeItem('bigHpPotion'),
    makeItem('leather', 'uncommon'), makeItem('sword'), makeItem('amulet'), makeItem('pelt'), makeItem('fang'),
  ];
  if (npcId === 'blacksmith') return [          // weapon shop
    makeItem('sword', 'uncommon'), makeItem('axe', 'uncommon'), makeItem('bow', 'uncommon'),
    makeItem('staff', 'uncommon'), makeItem('dagger', 'uncommon'), makeItem('mace', 'uncommon'),
    makeItem('spear', 'uncommon'), makeItem('greatsword', 'rare'), makeItem('wand', 'rare'),
  ];
  if (npcId === 'armorer') return [             // armor shop
    makeItem('leather', 'uncommon'), makeItem('chain', 'uncommon'), makeItem('scale', 'uncommon'),
    makeItem('fur', 'uncommon'), makeItem('robe', 'rare'), makeItem('plate', 'rare'),
    makeItem('bandRing', 'uncommon'), makeItem('sigil', 'rare'),
  ];
  if (npcId === 'alchemist') return [           // potion store
    makeItem('hpPotion'), makeItem('mpPotion'), makeItem('bigHpPotion'), makeItem('antidote'),
    makeItem('regenPotion'), makeItem('invisPotion'), makeItem('elixir'), makeItem('crystal'),
  ];
  if (npcId === 'magus') return [               // magic item vendor
    makeItem('wand', 'rare'), makeItem('staff', 'epic'), makeItem('robe', 'epic'),
    makeItem('sigil', 'epic'), makeItem('invisPotion'), makeItem('crystal'), makeItem('emberdust'),
    makeItem('ring', 'epic'),
  ];
  if (npcId === 'stranger') return [            // black-market
    makeItem('elixir'), makeItem('bigHpPotion'), makeItem('invisPotion'),
    makeItem('ring', 'epic'), makeItem('amulet', 'epic'),
    rollLoot(G.player.level, { minRarity: 'rare', gearOnly: true }),
  ];
  if (npcId === 'rover') return roverStock();   // traveling merchant (rotating)
  if (npcId === 'furnisher') return FURNITURE_IDS.map(id => makeItem(id));
  return [];
}

// Traveling merchant: stock rotates daily (every ~400 steps) and is seeded so it is
// stable within a "day" but different each time.
function roverStock() {
  const day = Math.floor(G.steps / 400);
  const r = mulberry32((G.world.seed ^ (day * 2654435761)) >>> 0);
  const rpick = a => a[Math.floor(r() * a.length)];
  const pool = ['greatsword', 'wand', 'scale', 'fur', 'sigil', 'bandRing', 'mace', 'spear'];
  const rar = ['uncommon', 'rare', 'rare', 'epic'];
  const out = [makeItem('bigHpPotion'), makeItem('invisPotion'), makeItem('regenPotion')];
  for (let i = 0; i < 4; i++) out.push(makeItem(rpick(pool), rpick(rar)));
  if (r() < 0.5) out.push(makeItem(rpick(['goldenIdol', 'oldCoin', 'seashell'])));
  return out;
}

function shopPriceMult() {
  const tier = repTier();
  let m = 1 - playerStat('cha') * 0.005;
  if (tier === 'hero') m *= 0.85; else if (tier === 'liked') m *= 0.93;
  else if (tier === 'disliked') m *= 1.15; else if (tier === 'hated') m *= 2;
  return Math.max(0.5, m);
}

// ---------- interaction (E / action button) ----------
function interact() {
  // confirm an active build/decorate placement
  if (Game.placing) { House.confirm(); return; }

  const p = G.player;
  const fx = p.x + (p.facing === 'left' ? -1 : p.facing === 'right' ? 1 : 0);
  const fy = p.y + (p.facing === 'up' ? -1 : p.facing === 'down' ? 1 : 0);

  // NPC adjacent (any direction)
  if (!G.inDungeon && !G.inInterior) {
    const npc = G.npcs.find(n => npcVisible(n) && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) === 1);
    if (npc) { Audio2.sfx('talk'); UI.startDialogue(npc); return; }
  }

  // pick up a docked boat you're facing (carry it again)
  if (!p.onBoat && G.boatPos && G.boatPos.x === fx && G.boatPos.y === fy) {
    addItem(makeItem('boat')); G.boatPos = null;
    Audio2.sfx('chest'); UI.notify('🛶 You haul the boat back onto your shoulder.', 'good');
    return;
  }

  const checkTiles = [[fx, fy], [p.x, p.y]];
  for (const [tx, ty] of checkTiles) {
    const t = tileAt(tx, ty);
    if (t === T.CHEST) { openChest(tx, ty); return; }
    if (t === T.SHRINE) { useShrine(tx, ty); return; }
    if (t === T.FLOWERS) { gatherHerb(tx, ty); return; }
    if (t === T.PORTAL) { usePortal(); return; }
    if (t === T.HOUSE_DOOR) { const h = House.houseAtDoor(tx, ty); if (h) { House.doorMenu(h); return; } }
    if (t === T.INTDOOR) { House.exit(); return; }
    if (t === T.STORAGE) { UI.openStorage(G.interiorHouse); return; }
    if (t === T.GATE) {
      const g = G.world.gates.find(g => g.x === tx && g.y === ty);
      if (g && !G.flags[g.flag]) { UI.notify(g.msg, 'bad'); Audio2.sfx('error'); return; }
    }
  }
}

function openChest(x, y) {
  const key = (G.inDungeon ? 'd' + G.dungeonFloor + ':' : 'w:') + x + ',' + y;
  if (G.openedChests.includes(key)) return;
  G.openedChests.push(key);
  setTileAt(x, y, T.CHEST_OPEN);
  Audio2.sfx('chest');
  FX.burst(x, y, '#ffd700', 16);
  const gold = rint(10, 30) + G.player.level * 5 + (G.inDungeon ? G.dungeonFloor * 8 : 0);
  gainGold(gold);
  const item = rollLoot(G.player.level);
  addItem(item);
  if (RARITIES.indexOf(item.rarity) >= 2) UI.lootFanfare(item);
  if (questActive('sOre') && zoneAt(x, y) === 'cave' && chance(0.8)) {
    addItem(makeItem('ore')); questCheckCollect();
  }
  // biome-themed material / collectible
  if (chance(0.5)) {
    const z = zoneAt(x, y);
    const mat = { snow: 'pelt', forest: 'pelt', highland: 'fang', volcanic: 'emberdust', lair: 'emberdust',
      ruins: 'crystal', cursed: 'crystal', cave: 'crystal', coast: 'seashell', island: 'oldCoin',
      desert: 'goldenIdol', swamp: 'fang' }[z];
    if (mat) addItem(makeItem(mat));
  }
  autosave();
}

function useShrine(x, y) {
  // village well
  if (!G.inDungeon && x === VC.x && y === VC.y - 1) {
    if (G.player.gold < 1) { UI.notify('You need a coin to toss in the well.', 'bad'); return; }
    G.player.gold -= 1; UI.updateHUD(); Audio2.sfx('coin');
    if (chance(0.1)) { gainGold(rint(5, 25)); UI.notify('The well... gives change? Lucky!', 'good'); }
    else if (chance(0.15)) { applyStatusToPlayer('blessed'); UI.notify('The water glimmers. You feel blessed!', 'good'); Audio2.sfx('shrine'); }
    else UI.notify('Plunk. You make a wish.', '');
    return;
  }
  // forest riddle shrine (opens the Hidden Grove)
  if (!G.inDungeon && x === 45 && y === 90 && !G.flags.grovePath) { Events.riddleShrine(); return; }
  const key = 'shrine:' + x + ',' + y;
  if (G.flags[key]) { UI.notify('The shrine\'s light is spent... for now.', ''); return; }
  G.flags[key] = 1;
  G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp; G.player.status = [];
  applyStatusToPlayer('blessed');
  Audio2.sfx('shrine');
  FX.burst(x, y, '#ffd700', 24);
  UI.notify('✨ The shrine restores you fully and blesses your strikes!', 'achieve');
}

function gatherHerb(x, y) {
  setTileAt(x, y, T.GRASS);
  if (chance(0.75)) {
    addItem(makeItem('herb'));
    questCheckCollect();
  } else {
    UI.notify('Just ordinary wildflowers. Pretty, though.', '');
  }
  Audio2.sfx('step');
}

function usePortal() {
  if (G.inDungeon) { Game.exitDungeon(); return; }
  if (!G.flags.boss_dragonVaelthyx) {
    UI.notify('The portal stones are dark and cold. Some greater power still anchors them shut.', 'bad');
    Audio2.sfx('error'); return;
  }
  Game.enterDungeon(1);
}

function applyStatusToPlayer(id) {
  const def = STATUS[id];
  const ex = G.player.status.find(s => s.id === id);
  if (ex) ex.turns = def.turns; else G.player.status.push({ id, turns: def.turns });
}

// biomes visited → Cartographer achievement
const TRACK_BIOMES = ['plains', 'forest', 'snow', 'desert', 'swamp', 'highland', 'volcanic', 'cursed', 'coast', 'ruins'];
function trackBiome(zone) {
  if (!TRACK_BIOMES.includes(zone)) return;
  G.visited = G.visited || {};
  if (!G.visited[zone]) {
    G.visited[zone] = 1;
    if (TRACK_BIOMES.every(b => G.visited[b])) unlockAchievement('explorer');
  }
}

// ---------- per-step world logic ----------
function onStep() {
  const p = G.player;
  G.steps++;
  if (chance(0.4)) Audio2.sfx('step');

  const t = tileAt(p.x, p.y);

  if (G.inInterior) return; // homes are safe

  if (G.inDungeon) {
    if (t === T.STAIRS) { Game.nextDungeonFloor(); return; }
    if (G.steps - G.lastCombatStep > 5 && chance(0.11)) {
      Combat.startEncounter('dungeon'); return;
    }
    return;
  }

  trackBiome(zoneAt(p.x, p.y));

  // crossroad events
  if (t === T.CROSSROAD) {
    const key = 'cr:' + p.x + ',' + p.y;
    if ((G.eventCd[key] || 0) <= G.steps && chance(0.75)) {
      G.eventCd[key] = G.steps + 60; // steps until this crossroad can fire again
      Events.trigger();
      return;
    }
  }

  // random ambushes (rare now — most threats roam visibly as foes)
  const zone = zoneAt(p.x, p.y);
  const zdef = ZONES[zone];
  if (zdef && zdef.encounter > 0 && OPEN_GROUND.has(t)) {
    if (G.steps - G.lastCombatStep > 8 && chance(zdef.encounter)) {
      Combat.startEncounter(zone);
      return;
    }
  }

  checkBossProximity();
}
