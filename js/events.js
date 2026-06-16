/* ============ Emberfall — crossroad events, dilemmas & encounters ============ */
'use strict';

const Events = {
  // ---------- event pool ----------
  pool() {
    return [
      { w: 10, fn: this.injuredTraveler, cond: () => !G.flags.travelerHelped || true },
      { w: 8, fn: this.merchantCaravan },
      { w: 8, fn: this.ambush },
      { w: 6, fn: this.lostChild },
      { w: 7, fn: this.waysideShrine },
      { w: 6, fn: this.riddler },
      { w: 6, fn: this.gamblingGoblin },
      { w: 6, fn: this.treasureHunters },
      { w: 3, fn: this.mysteriousDoor, cond: () => G.player.level >= 5 },
      { w: 6, fn: this.wanderingBard },
      { w: 4, fn: this.gratefulTraveler, cond: () => G.flags.travelerHelped && !G.flags.travelerThanked },
      { w: 4, fn: this.vengefulVictim, cond: () => G.flags.travelerRobbed && !G.flags.travelerAvenged },
    ].filter(e => !e.cond || e.cond());
  },

  trigger() {
    const pool = this.pool();
    let total = pool.reduce((s, e) => s + e.w, 0);
    let r = rnd() * total;
    for (const e of pool) { r -= e.w; if (r <= 0) { e.fn.call(this); return; } }
    pool[0].fn.call(this);
  },

  show(title, text, options) { UI.showEvent(title, text, options); },
  o(label, sub, fn) { return { label, sub, fn }; },

  // ---------- dilemmas ----------
  injuredTraveler() {
    const hasPotion = countItem('hpPotion') > 0;
    this.show('An Injured Traveler',
      'A man slumps against the signpost, clutching a bleeding leg. "Wolves," he winces. "Please... do you have anything? I can\'t pay much."',
      [
        this.o('Help him', hasPotion ? 'Give a Healing Potion' : 'Bind the wound yourself', () => {
          if (hasPotion) takeItems('hpPotion', 1);
          G.flags.travelerHelped = 1;
          addRep(4);
          UI.notify('"You\'re one of the good ones. I won\'t forget this."', 'good');
        }),
        this.o('Ignore him', 'Keep walking — the road is dangerous enough', () => {
          UI.notify('You walk on. His eyes follow you long after the bend.', '');
        }),
        this.o('Rob him', 'He can hardly fight back...', () => {
          const g = rint(15, 40);
          gainGold(g);
          addRep(-8);
          G.flags.travelerRobbed = 1;
          UI.notify('You take his coin purse. He says nothing — that\'s somehow worse.', 'bad');
        }),
      ]);
  },

  gratefulTraveler() {
    G.flags.travelerThanked = 1;
    this.show('A Familiar Face',
      'A man in a fine new coat waves you down — the traveler you once helped! "There they are! My savior! Business has been kind since — let me repay you properly."',
      [this.o('Accept his gift', null, () => {
        gainGold(rint(60, 100));
        const it = rollLoot(G.player.level, { minRarity: 'uncommon' });
        addItem(it); UI.lootFanfare(it);
        addRep(2);
      })]);
  },

  vengefulVictim() {
    G.flags.travelerAvenged = 1;
    this.show('Old Debts',
      'Three rough-looking sellswords block the road. Behind them, a man you recognize — the traveler you robbed. "That\'s them," he says quietly. "That\'s the one."',
      [
        this.o('Fight', null, () => Combat.start(['bandit', 'bandit', 'bandit'], { reason: 'Hired blades close in!' })),
        this.o('Return double the gold', 'Costs 80 gold', () => {
          if (G.player.gold >= 80) { G.player.gold -= 80; UI.updateHUD(); addRep(4); UI.notify('"...Huh. Didn\'t expect that." The sellswords shrug and disperse.', 'good'); }
          else { UI.notify('You can\'t pay! Steel it is.', 'bad'); Combat.start(['bandit', 'bandit', 'bandit'], { reason: 'No gold? Then blood.' }); }
        }),
      ]);
  },

  merchantCaravan() {
    this.show('A Merchant Caravan',
      'A brightly painted wagon creaks to a halt. "Traveler! Rare goods, road prices!" The guards eye your weapon with professional interest.',
      [
        this.o('Trade', 'Discounted potions', () => {
          const price = Math.round(14 * shopPriceMult());
          UI.showEvent('Caravan Goods', 'The merchant lays out his wares with a flourish.',
            [
              this.o('Healing Potion — ' + price + 'g', null, () => { if (spendGold(price)) { addItem(makeItem('hpPotion')); this.merchantAgain(price); } else UI.notify('Not enough gold!', 'bad'); }),
              this.o('Mana Potion — ' + price + 'g', null, () => { if (spendGold(price)) { addItem(makeItem('mpPotion')); this.merchantAgain(price); } else UI.notify('Not enough gold!', 'bad'); }),
              this.o('Wave them off', null, null),
            ]);
        }),
        this.o('Raid the caravan', 'The guards look tough. The cargo looks valuable.', () => {
          addRep(-12);
          Combat.start(['bandit', 'bandit', 'guardElite'], {
            reason: 'The caravan guards draw steel!',
            onWin: () => { gainGold(rint(80, 150)); const it = rollLoot(G.player.level, { minRarity: 'rare' }); addItem(it); UI.lootFanfare(it); },
          });
        }),
        this.o('Travel on', null, null),
      ]);
  },
  merchantAgain(price) {
    UI.notify('A pleasure doing business!', 'good');
  },

  ambush() {
    const luck = playerStat('luck');
    this.show('Ambush!',
      'Figures melt out of the treeline — bandits, blades already drawn. "Coin or blood, friend. Dealer\'s choice."',
      [
        this.o('Fight!', null, () => Combat.start(G.player.level >= 6 ? ['bandit', 'bandit', 'bandit'] : ['bandit', 'bandit'], { reason: 'The bandits attack!' })),
        this.o('Pay them off', 'Lose ' + (20 + G.player.level * 5) + ' gold', () => {
          const cost = 20 + G.player.level * 5;
          if (G.player.gold >= cost) { G.player.gold -= cost; UI.updateHUD(); UI.notify('They count the coin and vanish into the brush.', ''); }
          else { UI.notify('Your purse is too light — they attack!', 'bad'); Combat.start(['bandit', 'bandit'], { reason: 'No coin? Blood, then.' }); }
        }),
        this.o('Try to slip away', 'Luck check', () => {
          if (chance(0.35 + luck * 0.025)) { UI.notify('You melt into the undergrowth. The cursing fades behind you.', 'good'); Audio2.sfx('dodge'); }
          else { UI.notify('A twig snaps underfoot. So much for that.', 'bad'); Combat.start(['bandit', 'bandit'], { reason: 'They cut off your escape!' }); }
        }),
      ]);
  },

  lostChild() {
    this.show('A Lost Child',
      'A small girl sits on a stump, hugging a wooden sword. "I was hunting dragons," she sniffles, "but the dragons moved the village."',
      [
        this.o('Walk her home', 'Eldenbrook will be grateful', () => {
          addRep(6); gainXP(30);
          gainGold(rint(15, 35));
          UI.notify('Her mother nearly squeezes the life out of you both. The village beams.', 'good');
        }),
        this.o('Give directions and a snack', null, () => {
          addRep(2);
          UI.notify('"A REAL adventurer gave me rations!" She marches off, morale restored.', 'good');
        }),
        this.o('"Dragons, eh? Which way?"', 'Encourage the quest', () => {
          addRep(-2); gainXP(10);
          UI.notify('You exchange salutes. Somewhere, her mother feels a chill she can\'t explain.', '');
        }),
      ]);
  },

  waysideShrine() {
    this.show('A Wayside Shrine',
      'An old shrine leans at the crossroads, its bowl holding rainwater, wilted offerings, and a few coins that travelers left for luck.',
      [
        this.o('Leave an offering', '10 gold', () => {
          if (!spendGold(10)) { UI.notify('You have nothing to give.', 'bad'); return; }
          if (chance(0.5)) { applyStatusToPlayer('blessed'); UI.notify('Warmth spreads through you. Blessed!', 'good'); Audio2.sfx('shrine'); }
          else { G.player.hp = Math.min(G.player.maxHp, G.player.hp + 40); UI.notify('Your wounds knit closed. +40 HP', 'good'); Audio2.sfx('heal'); UI.updateHUD(); }
        }),
        this.o('Pray quietly', null, () => {
          G.player.mp = Math.min(G.player.maxMp, G.player.mp + 25);
          UI.notify('Your mind clears. +25 MP', 'good'); UI.updateHUD();
        }),
        this.o('Steal the offerings', 'Free gold. Probably no consequences.', () => {
          gainGold(rint(10, 25)); addRep(-5);
          if (chance(0.4)) {
            UI.notify('The temperature drops sharply...', 'bad');
            Combat.start(['ghost', 'ghost'], { reason: 'The shrine\'s keepers object. From beyond.' });
          } else UI.notify('You pocket the coins. The shrine seems... disappointed.', 'bad');
        }),
      ]);
  },

  RIDDLES: [
    { q: '"I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?"', a: 'An echo', wrong: ['A ghost', 'A bell'] },
    { q: '"The more you take, the more you leave behind. What am I?"', a: 'Footsteps', wrong: ['Memories', 'Gold'] },
    { q: '"I have cities, but no houses. Mountains, but no trees. Water, but no fish. What am I?"', a: 'A map', wrong: ['A dream', 'A painting'] },
    { q: '"What has roots as nobody sees, is taller than trees — up, up it goes, and yet never grows?"', a: 'A mountain', wrong: ['A tower', 'Smoke'] },
  ],

  riddler() {
    const r = pick(this.RIDDLES);
    const opts = [r.a, ...r.wrong].sort(() => rnd() - 0.5);
    this.show('The Hooded Riddler',
      'A figure in a patched cloak sits cross-legged atop the signpost — somehow. "A toll!" it announces gleefully. "Paid in WITS!" ' + r.q,
      opts.map(o => this.o('"' + o + '"', null, () => {
        if (o === r.a) {
          UI.notify('"DELIGHTFUL!" The riddler flips you a prize and somersaults into nowhere.', 'good');
          gainXP(40 + G.player.level * 5);
          const it = rollLoot(G.player.level, { minRarity: 'uncommon' });
          addItem(it); UI.lootFanfare(it);
        } else {
          UI.notify('"WRONG! The toll is EMBARRASSMENT!" Your ears burn. The riddler is already gone.', 'bad');
          gainXP(5);
        }
      })).concat([this.o('Decline the game', null, () => UI.notify('"A forfeit! How boring." The figure vanishes in a puff of smugness.', ''))]));
  },

  gamblingGoblin() {
    const bets = [10, 25, 50];
    this.show('A Gambling Goblin',
      'A goblin in a tiny waistcoat has set up a dice table at the crossroads. "Honest game! Mostly honest! Two dice, highest wins, no biting!"',
      bets.map(b => this.o('Bet ' + b + ' gold', 'Roll 2d6 vs the goblin', () => {
        if (G.player.gold < b) { UI.notify('The goblin counts your purse from afar and tuts.', 'bad'); return; }
        const you = rint(1, 6) + rint(1, 6);
        let gob = rint(1, 6) + rint(1, 6);
        if (playerStat('luck') < 10 && chance(0.25)) gob = Math.min(12, gob + 2); // loaded dice
        if (you > gob) { gainGold(b); UI.notify('You roll ' + you + ' vs ' + gob + ' — "AGH! Rigged! I mean— well played!"', 'good'); }
        else if (you < gob) { G.player.gold -= b; UI.updateHUD(); Audio2.sfx('error'); UI.notify('You roll ' + you + ' vs ' + gob + ' — the goblin sweeps your coins, cackling.', 'bad'); }
        else UI.notify('Both roll ' + you + '! "A tie! Thrilling! Nobody pays!"', '');
      })).concat([this.o('Walk away', 'Gambling at a crossroads? With a goblin?', null)]));
  },

  treasureHunters() {
    const cha = playerStat('cha');
    this.show('Treasure Hunters',
      'Two dusty adventurers argue over a torn map. "The cache is REAL," one insists. They notice you. "...You didn\'t hear anything."',
      [
        this.o('Offer to team up', 'Charisma check', () => {
          if (chance(0.3 + cha * 0.03)) {
            UI.notify('"Fine. Three-way split — you look handy." The map leads true!', 'good');
            gainGold(rint(40, 80));
            const it = rollLoot(G.player.level); addItem(it); UI.lootFanfare(it);
          } else {
            UI.notify('"Nice try. Shove off." They fold the map pointedly.', 'bad');
          }
        }),
        this.o('Demand the map', 'They won\'t like it', () => {
          addRep(-6);
          Combat.start(['bandit', 'bandit'], {
            reason: 'The treasure hunters defend their find!',
            onWin: () => { gainGold(rint(50, 100)); UI.notify('You take the map. It leads to a modest, slightly guilty fortune.', ''); },
          });
        }),
        this.o('Wish them luck', null, () => { addRep(1); UI.notify('"See? SOME people have manners." They trudge off, still arguing.', ''); }),
      ]);
  },

  mysteriousDoor() {
    this.show('A Door That Should Not Be',
      'A freestanding stone door has appeared beside the road. It wasn\'t here before. It isn\'t attached to anything. Through the keyhole: faint golden light, and breathing.',
      [
        this.o('Open the door', 'Whatever breathes within sounds LARGE', () => {
          Combat.start(['golem', 'wraith'], {
            reason: 'Through the door: a vault, a hoard, and its very awake guardians!',
            onWin: () => {
              gainGold(rint(100, 200));
              const it = rollLoot(G.player.level, { minRarity: 'epic' });
              addItem(it); UI.lootFanfare(it);
              UI.notify('You grab what you can. Behind you, the door politely ceases to exist.', 'good');
            },
          });
        }),
        this.o('Knock first', null, () => {
          if (chance(0.3)) { UI.notify('A muffled voice: "GO AWAY." A gold bar slides under the door. You take the hint, and the bar.', 'good'); gainGold(75); }
          else UI.notify('The breathing stops. You decide, wisely, to be elsewhere. The door watches you leave. Doors shouldn\'t watch.', '');
        }),
        this.o('Leave it alone', 'Doors in fields are nobody\'s friend', null),
      ]);
  },

  wanderingBard() {
    this.show('A Wandering Bard',
      'A bard tunes her lute on a fence post. "Ah, an audience! For a few coins I\'ll sing courage into your very bones. For free, I\'ll take requests about chickens — that one\'s been popular lately."',
      [
        this.o('Pay for a battle hymn', '15 gold — gain Blessed', () => {
          if (!spendGold(15)) { UI.notify('"No coin? The arts WEEP."', 'bad'); return; }
          applyStatusToPlayer('blessed'); Audio2.sfx('shrine');
          UI.notify('🎵 Her song settles over you like armor. Blessed!', 'good');
        }),
        this.o('Share your story', 'Spread your legend', () => {
          const r = repTier() === 'hated' ? -1 : 2;
          addRep(r); gainXP(15);
          UI.notify('She turns your deeds into eight verses and a key change. Word will spread.', 'good');
        }),
        this.o('Request the chicken song', null, () => {
          UI.notify('🎵 "...and the ROOSTER counts to THREE!" It\'s catchier than it has any right to be. You feel nothing, and yet — everything.', '');
        }),
      ]);
  },

  // ---------- forest riddle shrine (opens the Hidden Grove) ----------
  riddleShrine() {
    this.show('The Stone That Speaks',
      'The moss-grown shrine GRINDS as ancient stone lips move: "WEST OF HERE, MY GARDEN SLEEPS BEHIND THORN AND SILENCE. ANSWER, AND PASS. — What walks on four legs at dawn, two legs at noon, and three legs at dusk?"',
      [
        this.o('"A human"', 'Crawls as a babe, walks grown, leans on a cane when old', () => {
          G.flags.grovePath = 1;
          startQuest('sRiddle');
          Audio2.sfx('shrine');
          FX.shake(8);
          UI.notify('🌿 Far to the west, you hear a great rustling — the thorn-wall parts!', 'achieve');
        }),
        this.o('"A dragon"', null, () => this.shrineWrong()),
        this.o('"A chicken"', 'Gerald would be proud', () => {
          UI.notify('The stone is silent for a long moment. "...NO. BUT THE COMMITMENT IS NOTED."', '');
          this.shrineWrong(true);
        }),
      ]);
  },
  shrineWrong(noFight) {
    if (noFight) return;
    UI.notify('"WRONG. PROVE YOUR WORTH ANOTHER WAY." The ground splits!', 'bad');
    Combat.start(['skeleton', 'skeleton'], {
      reason: 'Ancient bones claw free of the earth!',
      onWin: () => UI.notify('The stone hums, almost approvingly. You may try the riddle again.', ''),
    });
  },
};
