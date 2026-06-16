/* ============ Emberfall — turn-based combat ============ */
'use strict';

const Combat = {
  active: false, busy: false,
  enemies: [], target: 0, opts: null, prevTheme: null,

  // ---------- entry points ----------
  startEncounter(zone) {
    let ids;
    if (zone === 'dungeon') {
      const f = G.dungeonFloor;
      const tiers = [['slime', 'goblin', 'bat'], ['skeleton', 'spider', 'bandit'], ['ghost', 'orc', 'darkMage'], ['golem', 'drake', 'wraith']];
      const tier = tiers[Math.min(tiers.length - 1, Math.floor((f - 1) / 3))];
      ids = [];
      const n = f % 5 === 0 ? 1 : rint(1, Math.min(3, 1 + Math.floor(f / 2)));
      for (let i = 0; i < n; i++) ids.push(pick(tier));
      if (f % 5 === 0) ids = [pick(['golem', 'drake', 'wraith', 'darkMage'])]; // floor guardian: 1 elite
      this.start(ids, { reason: f % 5 === 0 ? 'A floor guardian bars the stairs!' : 'Something stirs in the dark...', eliteMult: f % 5 === 0 ? 2.2 : 1 + f * 0.12 });
      return;
    }
    const table = ZONES[zone].table;
    if (!table.length) return;
    const n = chance(0.55) ? 1 : chance(0.7) ? 2 : 3;
    ids = [];
    for (let i = 0; i < n; i++) ids.push(pick(table));
    this.start(ids, { reason: pick(['You are ambushed!', 'Enemies block your path!', 'Hostile eyes glint nearby...', 'A snarl — then they are upon you!']) });
  },

  startBoss(id) {
    this.start([id], { boss: true, reason: BOSSES[id].intro });
  },

  start(ids, opts) {
    if (this.active) return;
    this.active = true; this.busy = true;
    this.opts = opts || {};
    this.prevTheme = Audio2.theme;
    this.enemies = ids.map(id => this.buildEnemy(id, this.opts));
    this.target = 0;
    G.player.status = G.player.status.filter(s => STATUS[s.id].good); // keep buffs only
    const ov = document.getElementById('combat-overlay');
    ov.classList.remove('hidden');
    document.getElementById('combat-log').innerHTML = '';
    this.log(this.opts.reason || 'Battle begins!', this.opts.boss ? 'crit' : '');
    if (this.opts.boss) { Audio2.sfx('roar'); FX.shake(12); } else Audio2.sfx('sword');
    Audio2.playMusic('boss');
    this.renderEnemies();
    this.renderPlayer();
    this.drawArena();
    setTimeout(() => { this.busy = false; this.renderActions(); }, 600);
  },

  buildEnemy(id, opts) {
    const def = BOSSES[id] || ENEMIES[id];
    const isBoss = !!def.boss;
    let lvl = isBoss ? def.lvl : Math.max(def.lvl, G.player.level - 1 + rint(-1, 1));
    let mult = 1 + Math.max(0, lvl - def.lvl) * 0.16;
    if (G.ngPlus) { mult *= isBoss ? 2.2 : 2.0; lvl += 10; }
    if (opts && opts.eliteMult) mult *= opts.eliteMult;
    return {
      id, def, boss: isBoss,
      name: def.name, icon: def.icon, lvl,
      maxHp: Math.round(def.hp * mult), hp: Math.round(def.hp * mult),
      str: def.str * mult, armor: def.def * mult,
      dodge: def.dodge || 0, status: [], phase: 0, strMult: 1,
    };
  },

  // ---------- rendering ----------
  renderEnemies() {
    const box = document.getElementById('combat-enemies');
    box.innerHTML = '';
    this.enemies.forEach((e, i) => {
      const card = document.createElement('div');
      card.className = 'enemy-card' + (e.hp <= 0 ? ' dead' : '') + (i === this.target ? ' targeted' : '');
      card.id = 'ecard' + i;
      const st = e.status.map(s => STATUS[s.id].icon).join('');
      card.innerHTML =
        '<div class="e-sprite' + (e.boss ? ' boss' : '') + '">' + e.icon + '</div>' +
        '<div class="e-name">' + e.name + ' <small>Lv' + e.lvl + '</small></div>' +
        '<div class="e-hpbar"><div class="e-hpfill" style="width:' + Math.max(0, e.hp / e.maxHp * 100) + '%"></div></div>' +
        '<div class="e-status">' + st + '</div>';
      card.onclick = () => { if (e.hp > 0) { this.target = i; this.renderEnemies(); Audio2.sfx('click'); } };
      box.appendChild(card);
    });
  },

  renderPlayer() {
    const p = G.player;
    document.getElementById('combat-player-name').textContent = p.name + ' — Lv' + p.level + ' ' + CLASSES[p.cls].name;
    document.getElementById('combat-hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    document.getElementById('combat-hp-text').textContent = Math.max(0, Math.round(p.hp)) + ' / ' + p.maxHp;
    document.getElementById('combat-mp-fill').style.width = Math.max(0, p.mp / p.maxMp * 100) + '%';
    document.getElementById('combat-mp-text').textContent = Math.round(p.mp) + ' / ' + p.maxMp;
    document.getElementById('combat-status').innerHTML = p.status.map(s => STATUS[s.id].icon + STATUS[s.id].name + '(' + s.turns + ')').join(' ');
  },

  renderActions(mode) {
    const box = document.getElementById('combat-actions');
    box.innerHTML = '';
    const btn = (label, fn, disabled, title) => {
      const b = document.createElement('button');
      b.className = 'opt-btn'; b.innerHTML = label;
      if (title) b.title = title;
      b.disabled = !!disabled || this.busy;
      b.onclick = () => { if (!this.busy) { Audio2.sfx('click'); fn(); } };
      box.appendChild(b);
    };
    if (mode === 'abilities') {
      const cls = CLASSES[G.player.cls];
      for (const ab of cls.abilities) {
        const lvl = G.player.skills[ab.id];
        btn(ab.icon + ' ' + ab.name + ' <small>Lv' + lvl + ' · ' + ab.mp + 'MP</small>',
          () => this.playerAbility(ab), G.player.mp < ab.mp, ab.desc);
      }
      btn('◀ Back', () => this.renderActions());
      return;
    }
    if (mode === 'items') {
      const potions = G.player.inventory.filter(i => i.type === 'potion');
      if (!potions.length) this.log('No potions in your pack!', 'bad');
      for (const it of potions.slice(0, 4)) {
        btn(it.icon + ' ' + it.name + (it.stack ? ' ×' + it.qty : ''), () => {
          if (usePotion(it, true)) this.endPlayerTurn();
          this.renderPlayer(); this.renderActions();
        });
      }
      btn('◀ Back', () => this.renderActions());
      return;
    }
    btn('⚔️ Attack', () => this.playerAttack());
    btn('✨ Abilities', () => this.renderActions('abilities'));
    btn('🧪 Items', () => this.renderActions('items'));
    btn('🏃 Flee', () => this.playerFlee(), this.opts.boss, this.opts.boss ? 'There is no escaping this foe!' : 'Attempt to escape');
  },

  drawArena() {
    const cv = document.getElementById('combat-canvas');
    const rect = cv.parentElement.getBoundingClientRect();
    cv.width = rect.width; cv.height = rect.height;
    const ctx = cv.getContext('2d');
    const zone = G.inDungeon ? 'dungeon' : zoneAt(G.player.x, G.player.y);
    const skys = {
      village: ['#7ec8e3', '#cfe8b8'], plains: ['#86b7d4', '#b6d98e'], forest: ['#3d6647', '#1e3d28'],
      river: ['#86b7d4', '#9fd0c5'], mountain: ['#9aa7b8', '#6b7886'], cave: ['#15121f', '#211a30'],
      ruins: ['#4a4258', '#332d40'], lair: ['#451a12', '#2a0d08'], grove: ['#5fa86a', '#2e5e3c'], dungeon: ['#100c18', '#1d1428'],
    };
    const [c1, c2] = skys[zone] || skys.plains;
    const gr = ctx.createLinearGradient(0, 0, 0, cv.height);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, cv.height * 0.78, cv.width, cv.height);
    if (zone === 'lair') { // embers
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(255,' + rint(80, 160) + ',40,' + (0.2 + rnd() * 0.5) + ')';
        ctx.fillRect(rnd() * cv.width, rnd() * cv.height, 3, 3);
      }
    }
  },

  log(msg, cls) {
    const el = document.getElementById('combat-log');
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = '• ' + msg;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  },

  // ---------- player actions ----------
  aliveEnemies() { return this.enemies.filter(e => e.hp > 0); },
  getTarget() {
    if (this.enemies[this.target] && this.enemies[this.target].hp > 0) return this.enemies[this.target];
    const a = this.aliveEnemies()[0];
    this.target = this.enemies.indexOf(a);
    return a;
  },

  critChance(bonus) { return clamp(0.05 + playerStat('luck') * 0.012 + (bonus || 0), 0, 0.8); },
  playerDodgeChance() {
    let c = 0.03 + playerStat('luck') * 0.008;
    if (G.player.status.some(s => s.id === 'dodge')) c += STATUS.dodge.dodgeAdd;
    return clamp(c, 0, 0.85);
  },
  playerAtkMult() { return G.player.status.some(s => s.id === 'blessed') ? STATUS.blessed.atkMult : 1; },
  playerDefMult() { return G.player.status.some(s => s.id === 'defense') ? STATUS.defense.defMult : 1; },

  dealToEnemy(e, raw, critBonus, statusId) {
    if (e.dodge && chance(e.dodge)) {
      this.log(e.name + ' dodges!', ''); Audio2.sfx('dodge');
      return;
    }
    const crit = chance(this.critChance(critBonus));
    let dmg = Math.max(1, Math.round(raw * (0.85 + rnd() * 0.3) - e.armor * 0.45));
    if (crit) { dmg = Math.round(dmg * 1.8); Audio2.sfx('crit'); FX.shake(7); }
    else Audio2.sfx('sword');
    e.hp -= dmg;
    this.log((crit ? '💥 CRITICAL! ' : '') + 'You hit ' + e.name + ' for <b>' + dmg + '</b>!', crit ? 'crit' : '');
    const card = document.getElementById('ecard' + this.enemies.indexOf(e));
    if (card) { card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit'); }
    if (statusId && e.hp > 0 && chance(0.75)) {
      this.applyStatus(e, statusId);
      this.log(e.name + ' is afflicted with ' + STATUS[statusId].icon + ' ' + STATUS[statusId].name + '!', 'bad');
    }
    if (e.hp <= 0) {
      this.log(e.name + ' is defeated!', 'heal');
      Audio2.sfx('death');
    } else if (e.boss) this.checkPhase(e);
  },

  checkPhase(e) {
    const phases = e.def.phases || [];
    const frac = e.hp / e.maxHp;
    while (e.phase < phases.length && frac <= phases[e.phase].at) {
      const ph = phases[e.phase];
      e.phase++;
      if (ph.strMult) e.strMult *= ph.strMult;
      this.log('⚠️ ' + ph.msg, 'crit');
      Audio2.sfx('roar'); FX.shake(14);
      const card = document.getElementById('ecard' + this.enemies.indexOf(e));
      if (card) { card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit'); }
    }
  },

  playerAttack() {
    const e = this.getTarget(); if (!e) return;
    this.busy = true;
    this.dealToEnemy(e, playerAtk() * 1.0 * this.playerAtkMult());
    this.afterPlayerAction();
  },

  playerAbility(ab) {
    const p = G.player;
    if (p.mp < ab.mp) return;
    p.mp -= ab.mp;
    this.busy = true;
    const spMult = CLASSES[p.cls].spellPower ? 1.15 : 1;
    if (ab.kind === 'heal') {
      const lvl = p.skills[ab.id];
      const amt = Math.round(p.maxHp * (ab.heal + 0.05 * (lvl - 1)));
      p.hp = Math.min(p.maxHp, p.hp + amt);
      this.log('🌿 ' + ab.name + ' restores <b>' + amt + '</b> HP!', 'heal');
      Audio2.sfx('heal');
    } else if (ab.kind === 'buff') {
      applyStatusToPlayer(ab.buff);
      this.log(ab.icon + ' ' + ab.name + '! ' + STATUS[ab.buff].name + ' active.', 'heal');
      Audio2.sfx('magic');
    } else {
      const raw = playerAtk() * abilityPower(ab) * spMult * this.playerAtkMult();
      Audio2.sfx(ab.status === 'burn' ? 'fire' : ab.status === 'freeze' ? 'ice' : 'magic');
      if (ab.aoe) {
        for (const e of this.aliveEnemies()) this.dealToEnemy(e, raw, ab.critBonus, ab.status);
      } else {
        const e = this.getTarget();
        if (e) this.dealToEnemy(e, raw, ab.critBonus, ab.status);
      }
      if (ab.selfDmg) {
        const rec = Math.round(p.maxHp * ab.selfDmg);
        p.hp -= rec;
        this.log('Recoil! You take <b>' + rec + '</b> damage.', 'bad');
      }
    }
    this.afterPlayerAction();
  },

  playerFlee() {
    this.busy = true;
    if (chance(0.5 + playerStat('luck') * 0.012)) {
      this.log('You slip away into the wilds!', 'heal');
      Audio2.sfx('flee');
      setTimeout(() => this.end('fled'), 700);
    } else {
      this.log('You fail to escape!', 'bad');
      this.endPlayerTurn();
    }
  },

  afterPlayerAction() {
    this.renderEnemies(); this.renderPlayer();
    if (G.player.hp <= 0) { setTimeout(() => this.end('defeat'), 800); return; }
    if (!this.aliveEnemies().length) { setTimeout(() => this.end('victory'), 700); return; }
    this.endPlayerTurn();
  },

  endPlayerTurn() {
    this.renderActions();
    setTimeout(() => this.enemyTurns(), 750);
  },

  // ---------- enemy turns ----------
  enemyTurns() {
    const alive = this.aliveEnemies();
    let i = 0;
    const next = () => {
      if (G.player.hp <= 0) { this.end('defeat'); return; }
      if (i >= alive.length) { this.startPlayerTurn(); return; }
      const e = alive[i++];
      if (e.hp <= 0) { next(); return; }
      this.enemyAct(e);
      this.renderEnemies(); this.renderPlayer();
      setTimeout(next, 650);
    };
    next();
  },

  enemyAct(e) {
    // status tick
    if (!this.tickStatuses(e)) { return; } // skipped turn (freeze/stun)
    if (e.hp <= 0) return;
    const p = G.player;
    const ai = e.def.ai || 'simple';
    let mult = 1, statusId = null, magic = false, name = 'attacks';
    if (ai === 'aggressive' && chance(0.25)) { mult = 1.45; name = 'attacks savagely'; }
    if (ai === 'cunning' && chance(0.2)) { statusId = 'stun'; name = 'strikes a pressure point'; }
    if (ai === 'venomous' && chance(0.4)) { statusId = e.def.status || 'poison'; name = 'strikes with venom'; }
    if (ai === 'caster' && chance(0.45)) { magic = true; mult = 1.3; statusId = chance(0.4) ? e.def.status : null; name = 'unleashes dark magic'; }
    if (ai === 'dragon') {
      if (chance(0.35)) { magic = true; mult = 1.6; statusId = 'burn'; name = 'breathes FIRE'; Audio2.sfx('fire'); FX.shake(10); }
      else if (chance(0.2)) { mult = 1.4; statusId = 'stun'; name = 'slams its tail down'; FX.shake(8); }
    }
    if (e.def.stun && chance(e.def.stun)) { statusId = 'stun'; name = 'delivers a crushing blow'; }

    if (chance(this.playerDodgeChance())) {
      this.log('You dodge ' + e.name + '\'s attack!', 'heal');
      Audio2.sfx('dodge');
      return;
    }
    const effDef = playerDef() * this.playerDefMult() * (magic ? 0.4 : 1);
    let dmg = Math.max(1, Math.round(e.str * e.strMult * mult * (0.85 + rnd() * 0.3) - effDef * 0.5));
    if (chance(0.05)) { dmg = Math.round(dmg * 1.7); this.log(e.name + ' lands a vicious blow!', 'crit'); }
    p.hp -= dmg;
    Audio2.sfx('hit');
    if (e.boss) FX.shake(5);
    this.log(e.name + ' ' + name + ' — you take <b>' + dmg + '</b>!', 'bad');
    if (statusId && p.hp > 0 && chance(0.6)) {
      applyStatusToPlayer(statusId);
      this.log(STATUS[statusId].icon + ' You are afflicted with ' + STATUS[statusId].name + '!', 'bad');
    }
  },

  startPlayerTurn() {
    // tick player statuses (dots & buffs)
    const p = G.player;
    let skip = false;
    for (const s of [...p.status]) {
      const def = STATUS[s.id];
      if (def.dot) {
        const dmg = Math.max(1, Math.round(p.maxHp * def.dot));
        p.hp -= dmg;
        this.log(def.icon + ' ' + def.name + ' deals <b>' + dmg + '</b> to you.', 'bad');
      }
      if (def.heal) {
        const h = Math.min(p.maxHp - p.hp, Math.round(p.maxHp * def.heal));
        if (h > 0) { p.hp += h; this.log(def.icon + ' ' + def.name + ' restores <b>' + h + '</b> HP.', 'heal'); }
      }
      if (def.skip && chance(def.skip)) { skip = true; this.log(def.icon + ' You are unable to act!', 'bad'); }
      s.turns--;
      if (s.turns <= 0) p.status.splice(p.status.indexOf(s), 1);
    }
    this.renderPlayer();
    if (p.hp <= 0) { this.end('defeat'); return; }
    if (skip) { setTimeout(() => this.enemyTurns(), 800); return; }
    this.busy = false;
    this.renderActions();
  },

  tickStatuses(e) {
    let canAct = true;
    for (const s of [...e.status]) {
      const def = STATUS[s.id];
      if (def.dot) {
        const dmg = Math.max(1, Math.round(e.maxHp * def.dot));
        e.hp -= dmg;
        this.log(e.name + ' suffers <b>' + dmg + '</b> from ' + def.icon + ' ' + def.name + '.', '');
      }
      if (def.skip && chance(def.skip)) { canAct = false; this.log(e.name + ' is ' + def.name.toLowerCase() + ' and cannot act!', 'heal'); }
      s.turns--;
      if (s.turns <= 0) e.status.splice(e.status.indexOf(s), 1);
    }
    if (e.hp <= 0) { this.log(e.name + ' succumbs!', 'heal'); Audio2.sfx('death'); }
    return canAct;
  },

  applyStatus(e, id) {
    const ex = e.status.find(s => s.id === id);
    if (ex) ex.turns = STATUS[id].turns;
    else e.status.push({ id, turns: STATUS[id].turns });
  },

  // ---------- resolution ----------
  end(result) {
    if (!this.active) return;
    this.active = false; this.busy = false;
    G.lastCombatStep = G.steps;
    const finish = () => {
      document.getElementById('combat-overlay').classList.add('hidden');
      Audio2.playMusic(null); // re-derive zone music
      Game.refreshMusic();
      UI.updateHUD();
      autosave();
    };

    if (result === 'victory') {
      let xp = 0, gold = 0;
      let bossId = null;
      for (const e of this.enemies) {
        xp += e.def.xp * (G.ngPlus ? 2 : 1);
        gold += rint(e.def.gold[0], e.def.gold[1]) * (G.ngPlus ? 2 : 1);
        if (e.boss) bossId = e.id;
        else questEvent('kill', e.id);
      }
      unlockAchievement('firstBlood');
      Audio2.playMusic('victory');
      setTimeout(() => {
        finish();
        gainGold(gold);
        gainXP(xp);
        // loot
        if (bossId) {
          G.flags['boss_' + bossId] = 1;
          unlockAchievement(bossId);
          questEvent('boss', bossId);
          const lootDef = BOSSES[bossId].guaranteedLoot;
          const it = rollLoot(G.player.level, { minRarity: lootDef.minRarity, gearOnly: true });
          addItem(it); UI.lootFanfare(it);
          if (bossId === 'lichKareth' && !G.flags.ancientKey) {
            G.flags.ancientKey = 1;
            addItem(makeItem('ancientKeyItem'));
            UI.notify('🗝️ The Lich\'s claw releases THE ANCIENT KEY!', 'achieve');
          }
          if (bossId === 'dragonVaelthyx' && !questActive('m4') && !G.flags.done_m4) {
            G.flags.done_m4 = 1; setTimeout(() => Game.winGame(), 1500);
          }
          if (bossId === 'voidWraith') {
            const extra = rollLoot(G.player.level, { minRarity: 'ancient', gearOnly: true });
            addItem(extra); setTimeout(() => UI.lootFanfare(extra), 2200);
          }
        } else if (chance(0.35)) {
          const it = rollLoot(G.player.level);
          addItem(it);
          if (RARITIES.indexOf(it.rarity) >= 2) UI.lootFanfare(it);
        }
        // cave ore drops
        if (questActive('sOre') && !G.inDungeon && zoneAt(G.player.x, G.player.y) === 'cave' && chance(0.5)) {
          addItem(makeItem('ore')); questCheckCollect();
        }
        if (this.opts.onWin) this.opts.onWin();
      }, 1400);
      return;
    }

    if (result === 'defeat') {
      this.log('💀 Darkness takes you...', 'bad');
      Audio2.sfx('death');
      setTimeout(() => {
        finish();
        Game.playerDefeated();
      }, 1300);
      return;
    }
    finish(); // fled
  },
};
