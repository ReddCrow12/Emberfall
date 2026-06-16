/* ============ Emberfall — boot, input & main loop ============ */
'use strict';

const Game = {
  running: false, selectedClass: null,
  held: {}, moveSpeed: 6.0,

  // ---------- boot ----------
  boot() {
    Render.init();
    this.bindUI();
    this.bindInput();
    document.getElementById('btn-continue').style.display = anySaveExists() ? '' : 'none';
    requestAnimationFrame(this.loopBound = this.loop.bind(this));
  },

  bindUI() {
    const $ = id => document.getElementById(id);
    $('btn-new-game').onclick = () => { Audio2.init(); Audio2.sfx('click'); this.showClassSelect(); };
    $('btn-continue').onclick = () => { Audio2.init(); Audio2.sfx('click'); UI.openPanel('save'); };
    $('panel-close').onclick = () => UI.closePanel();
    $('btn-inventory').onclick = () => UI.togglePanel('inventory');
    $('btn-character').onclick = () => UI.togglePanel('character');
    $('btn-quests').onclick = () => UI.togglePanel('quests');
    $('btn-save').onclick = () => UI.togglePanel('save');
    $('btn-settings').onclick = () => UI.togglePanel('settings');
    $('btn-start-game').onclick = () => {
      if (!this.selectedClass) return;
      const name = $('hero-name').value.trim() || 'Adventurer';
      this.newGame(this.selectedClass, name);
    };
    $('placement-confirm').onclick = () => { if (this.placing) House.confirm(); };
    $('placement-cancel').onclick = () => { if (this.placing) House.cancel(); };
    // map + zoom controls
    $('minimap').onclick = () => { if (this.running && !this.placing) UI.openMap(); };
    $('map-close').onclick = () => UI.closeMap();
    $('map-overlay').onclick = (e) => { if (e.target.id === 'map-overlay') UI.closeMap(); };
    $('zoom-map').onclick = () => { if (this.running && !this.placing) UI.openMap(); };
    $('zoom-in').onclick = () => { Render.setZoom(Render.zoom + 0.1); Audio2.sfx('click'); };
    $('zoom-out').onclick = () => { Render.setZoom(Render.zoom - 0.1); Audio2.sfx('click'); };
  },

  showClassSelect() {
    document.getElementById('class-select').classList.remove('hidden');
    const box = document.getElementById('class-cards');
    box.innerHTML = '';
    for (const id in CLASSES) {
      const c = CLASSES[id];
      const card = document.createElement('div');
      card.className = 'class-card';
      card.innerHTML = '<div class="ci">' + c.icon + '</div><h3>' + c.name + '</h3><p>' + c.desc + '</p>' +
        '<div class="cstats">HP ' + c.base.hp + ' · MP ' + c.base.mp + ' · STR ' + c.base.str + ' · DEF ' + c.base.def +
        ' · LCK ' + c.base.luck + ' · CHA ' + c.base.cha + '</div>' +
        '<div class="cstats">' + c.abilities.map(a => a.icon + ' ' + a.name).join(' · ') + '</div>';
      card.onclick = () => {
        Audio2.sfx('click');
        document.querySelectorAll('.class-card').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedClass = id;
        document.getElementById('btn-start-game').disabled = false;
      };
      box.appendChild(card);
    }
  },

  // ---------- game lifecycle ----------
  newGame(clsId, name) {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    G = {
      world: genWorld(seed),
      player: createPlayer(clsId, name),
      npcs: [], flags: {}, quests: {}, achievements: {},
      openedChests: [], eventCd: {}, steps: 0, lastCombatStep: 0,
      ngPlus: 0, inDungeon: false, dungeon: null, dungeonFloor: 0,
      inInterior: false, interior: null, interiorHouse: null, returnPos: null,
      houses: [], visited: {},
      weather: null, weatherT: 25,
    };
    spawnNPCs();
    Foes.reset();
    addItem(makeItem('hpPotion'), true);
    addItem(makeItem('hpPotion'), true);
    G.player.inventory.find(i => i.base === 'hpPotion').qty = 2;
    const starter = { warrior: 'sword', rogue: 'dagger', mage: 'staff', ranger: 'bow' }[clsId];
    equipItem(makeItem(starter)); // goes straight to equipment (not in inventory)
    G.player.inventory = G.player.inventory.filter(i => i.base !== starter);
    this.startSession();
    UI.notify('Welcome to Eldenbrook, ' + name + '. Elder Rowan awaits at the village square (!)', 'quest');
  },

  afterLoad() { this.startSession(); UI.notify('Welcome back, ' + G.player.name + '.', 'good'); },

  startSession() {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('class-select').classList.add('hidden');
    document.getElementById('ending-screen').classList.add('hidden');
    UI.closePanel();
    document.getElementById('hud').classList.remove('hidden');
    if ('ontouchstart' in window) document.getElementById('touch-controls').classList.remove('hidden');
    this.running = true;
    Render.miniFor = null;
    UI.updateHUD();
    UI.updateQuestTracker();
    this.refreshMusic(true);
  },

  toTitle() {
    this.running = false;
    G = null;
    Audio2.stopMusic();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('btn-continue').style.display = anySaveExists() ? '' : 'none';
  },

  refreshMusic(force) {
    if (!G || !G.player || Combat.active) return;
    const zone = G.inDungeon ? 'dungeon' : zoneAt(G.player.x, G.player.y);
    const theme = ZONES[zone] ? ZONES[zone].music : 'explore';
    if (force) Audio2.theme = '_force_';
    Audio2.playMusic(theme);
  },

  playerDefeated() {
    const p = G.player;
    const loss = Math.floor(p.gold * 0.2);
    p.gold -= loss;
    p.hp = Math.floor(p.maxHp * 0.5);
    p.mp = Math.floor(p.maxMp * 0.5);
    p.status = [];
    G.inDungeon = false; G.dungeon = null;
    G.inInterior = false; G.interior = null; G.interiorHouse = null;
    p.x = LOCS.spawn.x; p.y = LOCS.spawn.y; p.px = p.x; p.py = p.y;
    Render.miniFor = null;
    this.fade(() => {
      UI.notify('💀 You awaken in Eldenbrook, patched up by Lyra. ' + (loss ? '(' + loss + ' gold lost)' : ''), 'bad');
      this.refreshMusic(true);
      UI.updateHUD();
      autosave();
    });
  },

  // ---------- the endless depths ----------
  enterDungeon(floor) {
    this.fade(() => {
      G.inDungeon = true;
      G.dungeonFloor = floor;
      G.dungeon = genDungeon(floor);
      // exit portal at the entry point
      G.dungeon.tiles[4 + 4 * G.dungeon.w] = T.PORTAL;
      const p = G.player;
      p.x = 4; p.y = 5; p.px = 4; p.py = 5;
      Render.miniFor = null;
      Audio2.sfx('stairs');
      UI.notify('🕳️ The Endless Depths — Floor ' + floor + '. The portal behind you leads home.', 'quest');
      if (floor >= 5) { questEvent('floor'); unlockAchievement('dungeon5'); }
      this.refreshMusic(true);
      UI.updateHUD();
      autosave();
    });
  },

  nextDungeonFloor() { this.enterDungeon(G.dungeonFloor + 1); },

  exitDungeon() {
    this.fade(() => {
      G.inDungeon = false; G.dungeon = null;
      const p = G.player;
      p.x = LOCS.portal.x; p.y = LOCS.portal.y + 1; p.px = p.x; p.py = p.y;
      Render.miniFor = null;
      UI.notify('You surface from the Depths, blinking in the light.', 'good');
      this.refreshMusic(true);
      UI.updateHUD();
      autosave();
    });
  },

  // ---------- victory & NG+ ----------
  winGame() {
    const rep = G.player.rep;
    const repText = rep >= 30 ?
      'They name a festival after you. Gerald\'s chickens perform an interpretive reenactment annually. You are home.' :
      rep <= -20 ?
      'The village cheers — nervously. Heroes are judged by their deeds, and yours cast long shadows. Still... the dragon is dead. That counts.' :
      'Eldenbrook rebuilds, the mountain sleeps cold and quiet, and somewhere a bard is already getting the story wrong. You don\'t mind.';
    document.getElementById('ending-screen').classList.remove('hidden');
    document.getElementById('ending-title').textContent = '🐉 VAELTHYX HAS FALLEN 🐉';
    document.getElementById('ending-text').innerHTML =
      'The Doom of Emberfall crashes to the lair floor, and for the first time in a century the mountain exhales.<br><br>' + repText +
      '<br><br><b style="color:var(--gold)">The world remains open:</b> the Endless Depths portal now glows in the Ruins of Varnath' +
      (G.ngPlus ? '' : ', and New Game+ awaits — keep everything, face a deadlier world, and hunt ANCIENT relics and a secret horror in the grove') + '.';
    const btns = document.getElementById('ending-buttons');
    btns.innerHTML = '';
    const b1 = document.createElement('button');
    b1.className = 'menu-btn'; b1.textContent = '🌍 Keep Exploring (endgame unlocked)';
    b1.onclick = () => {
      Audio2.sfx('click');
      document.getElementById('ending-screen').classList.add('hidden');
      startQuest('sDepths');
      autosave();
    };
    btns.appendChild(b1);
    const b2 = document.createElement('button');
    b2.className = 'menu-btn'; b2.textContent = '⭐ New Game+ (keep level & items, deadlier world)';
    b2.onclick = () => { Audio2.sfx('click'); this.newGamePlus(); };
    btns.appendChild(b2);
    Audio2.playMusic('victory');
  },

  newGamePlus() {
    const p = G.player;
    const keepAch = G.achievements;
    const seed = (Math.random() * 0xffffffff) >>> 0;
    G.ngPlus++;
    G.world = genWorld(seed);
    G.flags = {}; G.quests = {}; G.openedChests = []; G.eventCd = {};
    G.achievements = keepAch; G.visited = {};
    G.inDungeon = false; G.dungeon = null; G.dungeonFloor = 0;
    G.inInterior = false; G.interior = null; G.interiorHouse = null;
    G.houses = []; // fresh world — properties don't carry over (keeps placement valid)
    G.steps = 0; G.lastCombatStep = 0;
    p.x = LOCS.spawn.x; p.y = LOCS.spawn.y; p.px = p.x; p.py = p.y;
    p.hp = p.maxHp; p.mp = p.maxMp; p.status = [];
    spawnNPCs();
    Foes.reset();
    Render.miniFor = null;
    document.getElementById('ending-screen').classList.add('hidden');
    this.fade(() => {
      UI.notify('⭐ NEW GAME+' + G.ngPlus + ' — enemies are far deadlier. ANCIENT relics now drop... and something new stirs in the grove.', 'achieve');
      this.refreshMusic(true);
      UI.updateHUD(); UI.updateQuestTracker();
      autosave();
    });
  },

  fade(fn) {
    const f = document.getElementById('fader');
    f.classList.add('on');
    setTimeout(() => { fn(); setTimeout(() => f.classList.remove('on'), 100); }, 470);
  },

  // ---------- input ----------
  bindInput() {
    const keymap = {
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    };
    window.addEventListener('keydown', (e) => {
      Audio2.init();
      if (e.code in keymap) { this.held[keymap[e.code]] = true; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sneaking = true;
      if (!this.running) return;
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        if (this.placing || !UI.anyOpen()) { interact(); e.preventDefault(); }
      }
      if (e.code === 'Escape') {
        if (this.placing) House.cancel();
        else if (UI.mapOpen) UI.closeMap();
        else if (UI.panelOpen) UI.closePanel();
        else if (UI.dialogueNpc) UI.endDialogue();
        else if (UI.eventOpen) UI.closeEvent();
      }
      // zoom / FOV
      if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'BracketRight') Render.setZoom(Render.zoom + 0.1);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'BracketLeft') Render.setZoom(Render.zoom - 0.1);
      if (!Combat.active && !UI.dialogueNpc && !UI.eventOpen && !this.placing) {
        if (e.code === 'KeyI') UI.togglePanel('inventory');
        if (e.code === 'KeyC') UI.togglePanel('character');
        if (e.code === 'KeyQ') UI.togglePanel('quests');
        if (e.code === 'KeyM') { if (UI.mapOpen) UI.closeMap(); else UI.openMap(); }
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code in keymap) this.held[keymap[e.code]] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sneaking = false;
    });
    window.addEventListener('blur', () => { this.held = {}; this.sneaking = false; });

    // pointer-driven placement (build / decorate) + canceling with right-click
    const cv = document.getElementById('game');
    const pointerTile = (clientX, clientY) => {
      const p = G.player;
      const cw = Render.canvas.width, ch = Render.canvas.height;
      const m = curMap();
      let camX = clamp(p.px * TILE + TILE / 2 - cw / 2, -TILE * 2, m.w * TILE - cw + TILE * 2);
      let camY = clamp(p.py * TILE + TILE / 2 - ch / 2, -TILE * 2, m.h * TILE - ch + TILE * 2);
      return { x: Math.floor((clientX + camX) / TILE), y: Math.floor((clientY + camY) / TILE) };
    };
    cv.addEventListener('mousemove', (e) => {
      if (!this.placing || !G || !G.player) return;
      this.pointerActive = true;
      const t = pointerTile(e.clientX, e.clientY);
      House.updateGhost(t.x, t.y);
    });
    cv.addEventListener('mousedown', (e) => {
      if (!this.placing) return;
      e.preventDefault();
      if (e.button === 2) { House.cancel(); return; }
      const t = pointerTile(e.clientX, e.clientY);
      House.updateGhost(t.x, t.y);
      House.confirm();
    });
    cv.addEventListener('contextmenu', (e) => { if (this.placing) e.preventDefault(); });
    // mouse wheel = zoom / FOV
    cv.addEventListener('wheel', (e) => {
      if (!this.running) return;
      e.preventDefault();
      Render.setZoom(Render.zoom + (e.deltaY < 0 ? 0.1 : -0.1));
    }, { passive: false });
    cv.addEventListener('touchstart', (e) => {
      if (!this.placing || !e.touches[0]) return;
      this.pointerActive = true;
      const t = pointerTile(e.touches[0].clientX, e.touches[0].clientY);
      House.updateGhost(t.x, t.y);
    }, { passive: true });

    // touch
    document.querySelectorAll('.dpad-btn').forEach(b => {
      const dir = b.dataset.dir;
      const on = (e) => { e.preventDefault(); Audio2.init(); this.held[dir] = true; };
      const off = (e) => { e.preventDefault(); this.held[dir] = false; };
      b.addEventListener('touchstart', on); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
      b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off);
    });
    const act = document.getElementById('btn-action');
    act.addEventListener('touchstart', (e) => { e.preventDefault(); Audio2.init(); if (this.running && !UI.anyOpen()) interact(); });
    act.addEventListener('mousedown', (e) => { e.preventDefault(); if (this.running && !UI.anyOpen()) interact(); });
  },

  // ---------- main loop ----------
  lastT: 0,
  loop(ts) {
    const dt = Math.min(0.05, (ts - this.lastT) / 1000 || 0.016);
    this.lastT = ts;
    if (this.running && G && G.player) {
      this.updateMovement(dt);
      updateNPCs(dt);
      Foes.update(dt);
      this.updateWeather(dt);
      this.tickOverworldStatus(dt);
      FX.update(dt);
      if (!Combat.active) Render.draw(dt);
    } else {
      FX.update(dt);
      Render.draw(dt);
    }
    requestAnimationFrame(this.loopBound);
  },

  updateMovement(dt) {
    const p = G.player;
    const speed = this.moveSpeed * (this.sneaking ? 0.55 : 1);
    // smooth slide toward target tile
    const dx = p.x - p.px, dy = p.y - p.py;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001) {
      p.moving = true;
      const step = speed * dt;
      if (step >= dist) {
        p.px = p.x; p.py = p.y;
        onStep();
        UI.updateHUD();
      } else {
        p.px += dx / dist * step;
        p.py += dy / dist * step;
      }
      return;
    }
    p.moving = false;
    // movement is allowed during placement (to reposition the ghost); panels block it
    if (UI.anyOpen() && !this.placing) return;
    let mx = 0, my = 0;
    if (this.held.up) { my = -1; p.facing = 'up'; }
    else if (this.held.down) { my = 1; p.facing = 'down'; }
    else if (this.held.left) { mx = -1; p.facing = 'left'; }
    else if (this.held.right) { mx = 1; p.facing = 'right'; }
    if (mx || my) {
      const nx = p.x + mx, ny = p.y + my;
      if (!isBlocked(nx, ny)) { p.x = nx; p.y = ny; p.moving = true; }
      // keep the build ghost in front of the player when not using a pointer
      if (this.placing && !this.pointerActive) House.updateGhost(p.x + mx, p.y + my);
    }
  },

  // tick time-based overworld buffs (e.g. Invisibility)
  tickOverworldStatus(dt) {
    if (Combat.active || !G.player.status.length) return;
    this._statT = (this._statT || 0) + dt;
    if (this._statT < 1) return;
    this._statT = 0;
    for (const s of [...G.player.status]) {
      const def = STATUS[s.id];
      if (!def.overworld) continue;
      s.turns--;
      if (s.turns <= 0) {
        G.player.status.splice(G.player.status.indexOf(s), 1);
        if (s.id === 'invisible') UI.notify('You shimmer back into view.', '');
      }
    }
  },

  updateWeather(dt) {
    if (G.inDungeon || G.inInterior) { G.weather = null; return; }
    G.weatherT -= dt;
    if (G.weatherT <= 0) {
      if (G.weather === 'rain') { G.weather = null; G.weatherT = 25 + rnd() * 40; }
      else if (chance(0.3)) { G.weather = 'rain'; G.weatherT = 15 + rnd() * 20; UI.notify('🌧️ Rain begins to fall...', ''); }
      else G.weatherT = 20 + rnd() * 30;
    }
  },
};

window.addEventListener('DOMContentLoaded', () => Game.boot());
window.addEventListener('pointerdown', () => Audio2.init(), { once: false });

// periodic autosave
setInterval(() => { if (Game.running && G && G.player && !Combat.active) autosave(); }, 30000);
