/* ============ Emberfall — UI: HUD, panels, dialogue, events, shops ============ */
'use strict';

const UI = {
  panelOpen: null, dialogueNpc: null, eventOpen: false, mapOpen: false,

  anyOpen() {
    return this.panelOpen || this.dialogueNpc || this.eventOpen || this.mapOpen || Combat.active ||
      !document.getElementById('class-select').classList.contains('hidden') ||
      !document.getElementById('ending-screen').classList.contains('hidden') ||
      !document.getElementById('title-screen').classList.contains('hidden');
  },

  // ---------- HUD ----------
  updateHUD() {
    if (!G || !G.player) return;
    const p = G.player;
    const set = (id, v) => document.getElementById(id).textContent = v;
    document.getElementById('bar-hp-fill').style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    document.getElementById('bar-mp-fill').style.width = clamp(p.mp / p.maxMp * 100, 0, 100) + '%';
    const need = xpForLevel(p.level);
    document.getElementById('bar-xp-fill').style.width = clamp(p.xp / need * 100, 0, 100) + '%';
    set('hud-hp-text', Math.max(0, Math.round(p.hp)) + '/' + p.maxHp);
    set('hud-mp-text', Math.round(p.mp) + '/' + p.maxMp);
    set('hud-xp-text', p.xp + '/' + need + ' XP');
    set('hud-level', 'Lv ' + p.level + (G.ngPlus ? ' ★NG+' + G.ngPlus : ''));
    set('hud-gold', '🪙 ' + p.gold);
    set('hud-rep', (p.rep >= 0 ? '☆ +' : '☆ ') + p.rep);
    set('hud-zone', G.inDungeon ? 'Endless Depths — Floor ' + G.dungeonFloor : ZONES[zoneAt(p.x, p.y)].name);
  },

  updateQuestTracker() {
    const el = document.getElementById('quest-tracker');
    if (!G) return;
    let html = '';
    for (const id in G.quests) {
      const st = G.quests[id];
      if (st.done) continue;
      const stage = QUESTS[id].stages[st.stage];
      if (!stage) continue;
      let goal = stage.text;
      if (stage.kind === 'kill') goal += ' (' + st.progress + '/' + stage.n + ')';
      if (stage.kind === 'collect') goal += ' (' + countItem(stage.item) + '/' + stage.n + ')';
      html += '<div><span class="qt-name">' + QUESTS[id].name + '</span><br><span class="qt-goal">› ' + goal + '</span></div>';
    }
    el.innerHTML = html;
    el.style.display = html ? '' : 'none';
  },

  // ---------- notifications ----------
  notify(text, cls) {
    const area = document.getElementById('notif-area');
    const d = document.createElement('div');
    d.className = 'notif ' + (cls || '');
    d.innerHTML = text;
    area.appendChild(d);
    while (area.children.length > 5) area.removeChild(area.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 3900);
  },

  notifyItem(item) {
    const r = RARITY[item.rarity];
    this.notify(item.icon + ' <span style="color:' + r.color + '">' + item.name + '</span>' + (item.qty > 1 ? ' ×' + item.qty : '') + ' obtained!', 'good');
    Audio2.sfx('loot');
  },

  lootFanfare(item) {
    const ri = RARITIES.indexOf(item.rarity);
    const pop = document.getElementById('loot-popup');
    const glow = ri >= 6 ? 'glow-ancient' : ri >= 5 ? 'glow-mythic' : ri >= 4 ? 'glow-legendary' : '';
    pop.innerHTML = '<div class="loot-card r-' + item.rarity + ' ' + glow + '">' +
      '<div class="l-icon">' + item.icon + '</div>' +
      '<div class="l-name r-' + item.rarity + '">' + item.name + '</div>' +
      '<div class="l-rarity r-' + item.rarity + '">' + RARITY[item.rarity].name + '</div></div>';
    pop.classList.remove('hidden');
    Audio2.sfx(ri >= 3 ? 'lootEpic' : 'loot');
    if (ri >= 4) FX.shake(6);
    clearTimeout(this._lootT);
    this._lootT = setTimeout(() => pop.classList.add('hidden'), ri >= 4 ? 3000 : 1800);
  },

  // ---------- generic panel ----------
  openPanel(name) {
    Audio2.sfx('open');
    this.panelOpen = name;
    document.getElementById('panel-wrap').classList.remove('hidden');
    const body = document.getElementById('panel-body');
    body.innerHTML = '';
    const title = document.getElementById('panel-title');
    if (name === 'inventory') { title.textContent = '🎒 Inventory'; this.buildInventory(body); }
    else if (name === 'character') { title.textContent = '🧙 Character'; this.buildCharacter(body); }
    else if (name === 'quests') { title.textContent = '📜 Quest Journal'; this.buildQuests(body); }
    else if (name === 'settings') { title.textContent = '⚙️ Settings'; this.buildSettings(body); }
    else if (name === 'save') { title.textContent = '💾 Save / Load'; this.buildSaves(body); }
    else if (name === 'shop') { /* set externally */ }
  },

  closePanel() {
    if (!this.panelOpen) return;
    this.panelOpen = null;
    document.getElementById('panel-wrap').classList.add('hidden');
    Audio2.sfx('close');
  },

  togglePanel(name) {
    if (this.panelOpen === name) this.closePanel();
    else { this.closePanel(); this.openPanel(name); }
  },

  // ---------- inventory ----------
  buildInventory(body) {
    const p = G.player;
    const eqRow = document.createElement('div');
    eqRow.className = 'equip-row';
    for (const slot of ['weapon', 'armor', 'ring', 'amulet']) {
      const it = p.equipment[slot];
      const d = document.createElement('div');
      d.className = 'equip-slot';
      d.innerHTML = '<div class="inv-slot ' + (it ? 'r-' + it.rarity : '') + '">' + (it ? it.icon : '·') + '</div>' + slot;
      if (it) d.querySelector('.inv-slot').onclick = () => this.showItemDetail(body, it, true);
      eqRow.appendChild(d);
    }
    body.appendChild(eqRow);

    const sums = document.createElement('div');
    sums.style.cssText = 'font-size:13px;color:#aed581;font-family:Verdana;margin:4px 0';
    sums.textContent = '⚔️ ATK ' + playerAtk() + '   🛡️ DEF ' + playerDef() + '   🍀 LUCK ' + playerStat('luck') + '   💬 CHA ' + playerStat('cha');
    body.appendChild(sums);

    const grid = document.createElement('div');
    grid.className = 'inv-grid';
    if (!p.inventory.length) {
      const e = document.createElement('p');
      e.style.cssText = 'color:#8d8268;font-style:italic';
      e.textContent = 'Your pack is empty. The world, however, is not.';
      body.appendChild(e);
    }
    for (const it of p.inventory) {
      const s = document.createElement('div');
      s.className = 'inv-slot r-' + it.rarity;
      s.innerHTML = it.icon + (it.stack && it.qty > 1 ? '<span class="qty">' + it.qty + '</span>' : '');
      s.title = it.name;
      s.onclick = () => { Audio2.sfx('click'); this.showItemDetail(body, it, false); };
      grid.appendChild(s);
    }
    body.appendChild(grid);
    this._detail = document.createElement('div');
    body.appendChild(this._detail);
  },

  showItemDetail(body, it, equipped) {
    const statStr = Object.entries(it.stats || {}).map(([k, v]) => '+' + v + ' ' + k.toUpperCase()).join('  ');
    let html = '<div class="item-detail"><h4 class="r-' + it.rarity + '">' + it.icon + ' ' + it.name +
      ' <small style="font-weight:normal">(' + RARITY[it.rarity].name + ')</small></h4>';
    if (statStr) html += '<div class="stats">' + statStr + '</div>';
    if (it.heal) html += '<div class="stats">Restores ' + it.heal + ' HP</div>';
    if (it.mana) html += '<div class="stats">Restores ' + it.mana + ' MP</div>';
    if (it.desc) html += '<div class="desc">' + it.desc + '</div>';
    html += '<div class="stats">Value: ' + (it.price || 0) + 'g</div>';
    html += '<div class="row-btns">';
    if (equipped) html += '<button data-act="unequip">Unequip</button>';
    else {
      if (it.slot) html += '<button data-act="equip">Equip</button>';
      if (it.type === 'potion') html += '<button data-act="use">Use</button>';
      if (it.type === 'furniture' && G.inInterior) html += '<button data-act="place">Place</button>';
      if (it.type === 'vehicle') html += '<button data-act="launch">Launch on Water</button>';
      if (it.type !== 'quest') html += '<button data-act="drop">Drop</button>';
    }
    html += '</div></div>';
    this._detail.innerHTML = html;
    this._detail.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        Audio2.sfx('click');
        const act = b.dataset.act;
        if (act === 'equip') equipItem(it);
        else if (act === 'unequip') unequipItem(it.slot);
        else if (act === 'use') usePotion(it);
        else if (act === 'place') { House.beginFurniture(it); return; }
        else if (act === 'launch') { House.beginBoat(it); return; }
        else if (act === 'drop') removeItem(it, it.qty);
        this.openPanel('inventory');
      };
    });
  },

  // ---------- character ----------
  buildCharacter(body) {
    const p = G.player;
    const cls = CLASSES[p.cls];
    body.innerHTML =
      '<div style="text-align:center;font-size:38px">' + cls.icon + '</div>' +
      '<div style="text-align:center;margin-bottom:8px"><b style="color:var(--gold)">' + p.name + '</b> — Level ' + p.level + ' ' + cls.name +
      (G.ngPlus ? ' <span class="q-tag q-hidden">NG+' + G.ngPlus + '</span>' : '') + '</div>' +
      '<table class="stat-table">' +
      '<tr><td>❤️ Health</td><td>' + Math.round(p.hp) + ' / ' + p.maxHp + '</td></tr>' +
      '<tr><td>🔷 Mana</td><td>' + Math.round(p.mp) + ' / ' + p.maxMp + '</td></tr>' +
      '<tr><td>💪 Strength</td><td>' + Math.round(playerStat('str')) + '</td></tr>' +
      '<tr><td>🛡️ Defense</td><td>' + Math.round(playerDef()) + '</td></tr>' +
      '<tr><td>🍀 Luck</td><td>' + Math.round(playerStat('luck')) + '</td></tr>' +
      '<tr><td>💬 Charisma</td><td>' + Math.round(playerStat('cha')) + '</td></tr>' +
      '<tr><td>⚔️ Total Attack</td><td>' + Math.round(playerAtk()) + '</td></tr>' +
      '<tr><td>⭐ Experience</td><td>' + p.xp + ' / ' + xpForLevel(p.level) + '</td></tr>' +
      '<tr><td>☆ Reputation</td><td>' + p.rep + ' (' + repTier() + ')</td></tr>' +
      '</table>' +
      '<h2 style="font-size:17px;margin-top:14px">Abilities — Skill Points: <span style="color:#7bed9f">' + p.skillPoints + '</span></h2>';
    for (const ab of cls.abilities) {
      const lvl = p.skills[ab.id];
      const row = document.createElement('div');
      row.className = 'skill-row';
      row.innerHTML = '<div class="s-ico">' + ab.icon + '</div><div class="s-body">' +
        '<div class="s-name">' + ab.name + ' — Lv ' + lvl + (lvl >= 5 ? ' (MAX)' : '') + '</div>' +
        '<div class="s-desc">' + ab.desc + ' <i>(' + ab.mp + ' MP)</i></div></div>';
      const btn = document.createElement('button');
      btn.textContent = lvl >= 5 ? 'MAX' : 'Upgrade';
      btn.disabled = lvl >= 5 || p.skillPoints < 1;
      btn.onclick = () => {
        p.skillPoints--; p.skills[ab.id]++;
        Audio2.sfx('levelup');
        this.notify(ab.name + ' upgraded to Lv ' + p.skills[ab.id] + '!', 'achieve');
        this.openPanel('character');
      };
      row.appendChild(btn);
      body.appendChild(row);
    }
    // achievements
    const ach = document.createElement('div');
    let ahtml = '<h2 style="font-size:17px;margin-top:14px">🏆 Achievements</h2>';
    for (const id in ACHIEVEMENTS) {
      const got = G.achievements[id];
      ahtml += '<div style="font-size:13px;padding:2px 0;color:' + (got ? '#ffd700' : '#5c5240') + '">' +
        (got ? '🏆 ' : '🔒 ') + ACHIEVEMENTS[id].name + ' — <i>' + ACHIEVEMENTS[id].desc + '</i></div>';
    }
    ach.innerHTML = ahtml;
    body.appendChild(ach);
  },

  // ---------- quests ----------
  buildQuests(body) {
    let any = false;
    const mk = (id, st) => {
      const q = QUESTS[id];
      const done = st.done;
      const stage = done ? null : q.stages[st.stage];
      let prog = '';
      if (stage) {
        prog = stage.text;
        if (stage.kind === 'kill') prog += ' (' + st.progress + '/' + stage.n + ')';
        if (stage.kind === 'collect') prog += ' (' + countItem(stage.item) + '/' + stage.n + ')';
      }
      return '<div class="quest-entry' + (done ? ' done' : '') + '">' +
        '<h4>' + q.name + '<span class="q-tag q-' + q.type + '">' + q.type + '</span></h4>' +
        '<p>' + q.desc + '</p>' +
        (done ? '<p class="q-progress">✅ Completed</p>' : '<p class="q-progress">› ' + prog + '</p>') +
        '</div>';
    };
    let html = '';
    for (const id in G.quests) { if (!G.quests[id].done) { html += mk(id, G.quests[id]); any = true; } }
    for (const id in G.quests) { if (G.quests[id].done) { html += mk(id, G.quests[id]); any = true; } }
    body.innerHTML = any ? html : '<p style="color:#8d8268;font-style:italic">No quests yet. Elder Rowan at the village square may have work for a capable blade...</p>';
  },

  // ---------- settings ----------
  buildSettings(body) {
    body.innerHTML =
      '<div class="settings-row"><label>🎵 Music volume</label><input type="range" id="set-music" min="0" max="1" step="0.05" value="' + Audio2.musicVol + '"></div>' +
      '<div class="settings-row"><label>🔊 Effects volume</label><input type="range" id="set-sfx" min="0" max="1" step="0.05" value="' + Audio2.sfxVol + '"></div>' +
      '<div class="settings-row"><label>📳 Screen shake</label><input type="checkbox" id="set-shake"' + (FX.shakeEnabled ? ' checked' : '') + '></div>' +
      '<button class="menu-btn" id="set-quit">🚪 Save & Quit to Title</button>';
    document.getElementById('set-music').oninput = (e) => Audio2.setMusicVol(parseFloat(e.target.value));
    document.getElementById('set-sfx').oninput = (e) => { Audio2.setSfxVol(parseFloat(e.target.value)); Audio2.sfx('coin'); };
    document.getElementById('set-shake').onchange = (e) => { FX.shakeEnabled = e.target.checked; localStorage.setItem('ef_shake', e.target.checked ? '1' : '0'); };
    document.getElementById('set-quit').onclick = () => {
      saveGame(AUTOSAVE_KEY, true);
      this.closePanel();
      Game.toTitle();
    };
  },

  // ---------- saves ----------
  buildSaves(body, loadOnly) {
    body.innerHTML = '';
    const mkSlot = (key, label, canSave) => {
      const meta = getSaveMeta(key);
      const d = document.createElement('div');
      d.className = 'save-slot';
      const info = meta ?
        '<b>' + meta.name + '</b> — Lv' + meta.level + ' ' + CLASSES[meta.cls].name + (meta.ngPlus ? ' (NG+)' : '') +
        '<br>' + meta.zone + ' · ' + new Date(meta.time).toLocaleString() :
        '<i style="color:#5c5240">— empty —</i>';
      d.innerHTML = '<div class="ss-info">' + label + '<br>' + info + '</div>';
      const btns = document.createElement('div');
      btns.className = 'ss-btns';
      if (canSave && G && G.player) {
        const b = document.createElement('button');
        b.textContent = 'Save';
        b.onclick = () => { saveGame(key); this.openPanel('save'); };
        btns.appendChild(b);
      }
      if (meta) {
        const b = document.createElement('button');
        b.textContent = 'Load';
        b.onclick = () => {
          if (loadGame(key)) { this.closePanel(); Game.afterLoad(); }
        };
        btns.appendChild(b);
        if (canSave) {
          const del = document.createElement('button');
          del.textContent = '🗑';
          del.onclick = () => { deleteSave(key); this.openPanel('save'); };
          btns.appendChild(del);
        }
      }
      d.appendChild(btns);
      body.appendChild(d);
    };
    SAVE_SLOTS.forEach((k, i) => mkSlot(k, '📁 Slot ' + (i + 1), !loadOnly));
    mkSlot(AUTOSAVE_KEY, '🔄 Autosave', false);
  },

  // ---------- shop ----------
  openShop(npcId) {
    this.endDialogue();
    this.openPanel('shop');
    document.getElementById('panel-title').textContent = '🪙 ' + (NPC_DEFS.find(n => n.id === npcId) || { name: 'Shop' }).name;
    const body = document.getElementById('panel-body');
    const mult = shopPriceMult();
    const stock = shopStock(npcId);
    const render = () => {
      const disc = (mult < 1) ? ' <small style="color:#7bed9f">(rep discount)</small>' : (mult > 1.05 ? ' <small style="color:#ff7b73">(rep markup)</small>' : '');
      body.innerHTML = '<div style="text-align:right;color:var(--gold)">Your gold: 🪙 ' + G.player.gold + disc + '</div><h2 style="font-size:16px">Buy</h2>';
      for (const it of stock) {
        const price = Math.max(1, Math.round((it.price || 10) * mult));
        const row = document.createElement('div');
        row.className = 'shop-row';
        row.innerHTML = '<span class="r-' + it.rarity + '">' + it.icon + ' ' + it.name + '</span>' + this.itemPreview(it);
        const b = document.createElement('button');
        b.textContent = price + 'g';
        b.disabled = G.player.gold < price;
        b.onclick = () => {
          if (spendGold(price)) {
            if (it.stack || it.type === 'furniture') addItem(makeItem(it.base, it.rarity));
            else { addItem(it); stock.splice(stock.indexOf(it), 1); }
            render();
          }
        };
        row.appendChild(b);
        body.appendChild(row);
      }
      const sellables = G.player.inventory.filter(i => i.type !== 'quest');
      if (sellables.length) {
        const h = document.createElement('h2'); h.style.fontSize = '16px'; h.textContent = 'Sell';
        body.appendChild(h);
        for (const it of sellables) {
          const price = Math.max(1, Math.round((it.price || 5) * 0.4));
          const row = document.createElement('div');
          row.className = 'shop-row';
          row.innerHTML = '<span class="r-' + it.rarity + '">' + it.icon + ' ' + it.name + (it.stack && it.qty > 1 ? ' ×' + it.qty : '') + '</span>';
          const b = document.createElement('button');
          b.textContent = '+' + price + 'g';
          b.onclick = () => { removeItem(it, 1); gainGold(price); render(); };
          row.appendChild(b);
          body.appendChild(row);
        }
      }
    };
    render();
  },

  // small inline stat preview for shop/storage rows
  itemPreview(it) {
    const parts = [];
    if (it.stats) for (const k in it.stats) parts.push('+' + it.stats[k] + ' ' + k.toUpperCase());
    if (it.heal) parts.push(it.heal >= 9999 ? 'Full HP' : '+' + it.heal + ' HP');
    if (it.mana) parts.push(it.mana >= 9999 ? 'Full MP' : '+' + it.mana + ' MP');
    if (it.cure) parts.push('Cure');
    if (it.invis) parts.push('Invisibility');
    if (it.regen) parts.push('Regen');
    if (!parts.length) return '';
    return '<small style="color:#aed581;font-family:Verdana;margin-left:6px">' + parts.join(' ') + '</small>';
  },

  // ---------- realtor (housing) ----------
  openRealtor() {
    this.endDialogue();
    this.openPanel('shop');
    document.getElementById('panel-title').textContent = '🏠 Cassia\'s Properties';
    const body = document.getElementById('panel-body');
    body.innerHTML = '<div style="text-align:right;color:var(--gold)">Your gold: 🪙 ' + G.player.gold + '</div>' +
      '<p style="font-size:13px;color:#bdb091">You own <b style="color:var(--gold)">' + House.ownedCount() + '</b> propert' + (House.ownedCount() === 1 ? 'y' : 'ies') + '. Buy one, then choose where to build it.</p>';
    for (const id in HOUSE_TYPES) {
      const tp = HOUSE_TYPES[id];
      const row = document.createElement('div');
      row.className = 'quest-entry';
      row.innerHTML = '<h4>' + tp.icon + ' ' + tp.name + ' <small style="color:var(--gold);font-weight:normal">' + tp.price + 'g</small></h4>' +
        '<p>' + tp.desc + '</p>' +
        '<p class="q-progress">Size ' + tp.w + '×' + tp.h + ' · Storage ' + tp.storage + ' slots</p>';
      const b = document.createElement('button');
      b.className = 'opt-btn'; b.style.marginTop = '4px';
      b.textContent = 'Buy & Place (' + tp.price + 'g)';
      b.disabled = G.player.gold < tp.price;
      b.onclick = () => { Audio2.sfx('click'); House.beginPlacement(id); };
      row.appendChild(b);
      body.appendChild(row);
    }
  },

  // ---------- house storage ----------
  openStorage(house) {
    if (!house) return;
    this.openPanel('shop');
    const tp = HOUSE_TYPES[house.type];
    document.getElementById('panel-title').textContent = '📦 ' + tp.name + ' — Storage';
    const body = document.getElementById('panel-body');
    const render = () => {
      body.innerHTML = '';
      const used = house.storage.reduce((s, i) => s + (i.stack ? 1 : 1), 0);
      const cap = tp.storage;
      const cols = document.createElement('div');
      cols.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap';
      const mkCol = (title, items, fromStorage) => {
        const col = document.createElement('div');
        col.style.cssText = 'flex:1;min-width:220px';
        col.innerHTML = '<h2 style="font-size:15px">' + title + '</h2>';
        if (!items.length) col.innerHTML += '<p style="color:#8d8268;font-style:italic;font-size:13px">Empty</p>';
        for (const it of items) {
          const row = document.createElement('div');
          row.className = 'shop-row';
          row.innerHTML = '<span class="r-' + it.rarity + '">' + it.icon + ' ' + it.name + (it.stack && it.qty > 1 ? ' ×' + it.qty : '') + '</span>';
          const b = document.createElement('button');
          b.textContent = fromStorage ? '→ Take' : 'Store →';
          b.onclick = () => {
            if (fromStorage) { this._moveItem(house.storage, G.player.inventory, it, 40); }
            else {
              if (used >= cap) { UI.notify('Storage is full!', 'bad'); return; }
              this._moveItem(G.player.inventory, house.storage, it, cap);
            }
            Audio2.sfx('chest'); autosave(); render();
          };
          row.appendChild(b);
          col.appendChild(row);
        }
        return col;
      };
      const head = document.createElement('div');
      head.style.cssText = 'color:var(--gold);margin-bottom:6px';
      head.textContent = 'Vault: ' + used + ' / ' + cap + ' slots used';
      body.appendChild(head);
      cols.appendChild(mkCol('🎒 Inventory', G.player.inventory.filter(i => i.type !== 'quest'), false));
      cols.appendChild(mkCol('📦 Vault', house.storage, true));
      body.appendChild(cols);
    };
    render();
  },

  _moveItem(from, to, it, cap) {
    if (it.stack) {
      const ex = to.find(t => t.base === it.base);
      if (ex) { ex.qty += it.qty; }
      else { if (to.length >= cap) { UI.notify('No room!', 'bad'); return; } to.push(it); }
    } else {
      if (to.length >= cap) { UI.notify('No room!', 'bad'); return; }
      to.push(it);
    }
    const i = from.indexOf(it); if (i >= 0) from.splice(i, 1);
  },

  // ---------- full world map ----------
  openMap() {
    if (!G || !G.player || Combat.active) return;
    this.mapOpen = true;
    document.getElementById('map-overlay').classList.remove('hidden');
    const cv = document.getElementById('map-canvas');
    Render.drawFullMap(cv);
    const where = G.inInterior ? 'Home interior' : (G.inDungeon ? 'Endless Depths — Floor ' + G.dungeonFloor : ZONES[zoneAt(G.player.x, G.player.y)].name);
    document.getElementById('map-legend').innerHTML =
      '📍 You are in: <b style="color:var(--gold)">' + where + '</b><br>' +
      '<span style="color:#fff">●</span> You &nbsp; <span style="color:#ffd700">●</span> Towns &nbsp; ' +
      '<span style="color:#ff4757">●</span> Bosses &nbsp; <span style="color:#d4a73c">▪</span> Your houses';
    Audio2.sfx('open');
  },
  closeMap() {
    this.mapOpen = false;
    document.getElementById('map-overlay').classList.add('hidden');
    Audio2.sfx('close');
  },

  // ---------- placement bar ----------
  showPlacementBar(text) {
    const bar = document.getElementById('placement-bar');
    bar.classList.remove('hidden');
    document.getElementById('placement-text').textContent = text;
  },
  hidePlacementBar() {
    document.getElementById('placement-bar').classList.add('hidden');
  },

  // ---------- dialogue ----------
  startDialogue(npc) {
    this.dialogueNpc = npc;
    const fn = DIALOGS[npc.id];
    if (!fn) { this.endDialogue(); return; }
    this.renderDialogNode(npc.def.name, fn());
  },

  renderDialogNode(name, n) {
    if (!n) { this.endDialogue(); return; }
    document.getElementById('dialogue-overlay').classList.remove('hidden');
    document.getElementById('dialogue-name').textContent = name;
    document.getElementById('dialogue-text').innerHTML = n.text;
    const opts = document.getElementById('dialogue-options');
    opts.innerHTML = '';
    for (const o of n.options || bye()) {
      const b = document.createElement('button');
      b.className = 'opt-btn';
      b.innerHTML = o.label + (o.sub ? ' <small>' + o.sub + '</small>' : '');
      b.onclick = () => {
        Audio2.sfx('click');
        if (!o.fn) { this.endDialogue(); return; }
        const next = o.fn();
        if (next && next.text) this.renderDialogNode(name, next);
        else if (this.dialogueNpc) this.endDialogue();
      };
      opts.appendChild(b);
    }
  },

  endDialogue() {
    this.dialogueNpc = null;
    document.getElementById('dialogue-overlay').classList.add('hidden');
    this.updateQuestTracker();
  },

  // ---------- events ----------
  showEvent(title, text, options) {
    this.eventOpen = true;
    document.getElementById('event-overlay').classList.remove('hidden');
    document.getElementById('event-title').textContent = title;
    document.getElementById('event-text').innerHTML = text;
    const box = document.getElementById('event-options');
    box.innerHTML = '';
    Audio2.sfx('quest');
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'opt-btn';
      b.innerHTML = o.label + (o.sub ? ' <small>' + o.sub + '</small>' : '');
      b.onclick = () => {
        Audio2.sfx('click');
        this.closeEvent();
        if (o.fn) o.fn();
        autosave();
      };
      box.appendChild(b);
    }
  },

  closeEvent() {
    this.eventOpen = false;
    document.getElementById('event-overlay').classList.add('hidden');
  },
};
