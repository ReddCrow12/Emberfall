/* ============ Emberfall — overworld foes: detection, patrol & chase ============
 * Enemies are now visible in the world. Each foe roams / patrols a home area,
 * has a detection radius (varies by type), notices the player on line-of-sight,
 * shows an alert indicator and gives chase, navigating around obstacles. It
 * gives up after losing sight and returns home. Touching a foe starts combat.
 * Supports stealth: sneaking (Shift) and the Invisibility status shrink/zero
 * the detection range.
 */
'use strict';

const Foes = {
  list: [],
  spawnT: 0,
  cap: 26,

  reset() { this.list = []; this.spawnT = 0; },

  detectBase(type) {
    const def = ENEMIES[type];
    return (def && def.detect) || 4;
  },

  // effective detection range given stealth state
  detectRange(foe) {
    if (G.player.status && G.player.status.some(s => s.id === 'invisible')) return 0;
    let r = foe.detect;
    if (Game.sneaking) r *= 0.5;
    const z = zoneAt(Math.round(foe.x), Math.round(foe.y));
    if (ZONES[z] && ZONES[z].dark) r *= 0.8; // harder to be seen in the gloom
    return r;
  },

  // cheap line-of-sight: walls/trees/mountains block vision
  canSee(foe) {
    const px = G.player.x, py = G.player.y;
    const fx = Math.round(foe.x), fy = Math.round(foe.y);
    const dist = Math.hypot(px - fx, py - fy);
    if (dist > this.detectRange(foe)) return false;
    const steps = Math.ceil(dist);
    for (let i = 1; i < steps; i++) {
      const sx = Math.round(fx + (px - fx) * i / steps);
      const sy = Math.round(fy + (py - fy) * i / steps);
      const t = tileAt(sx, sy);
      if (SOLID.has(t) && t !== T.CHEST && t !== T.CHEST_OPEN) return false;
    }
    return true;
  },

  spawnOne(near) {
    if (G.inDungeon || G.inInterior) return null;
    for (let tries = 0; tries < 30; tries++) {
      const ang = rnd() * Math.PI * 2;
      const r = near ? 15 + rnd() * 8 : 24 + rnd() * 40;
      const x = Math.round(G.player.x + Math.cos(ang) * r);
      const y = Math.round(G.player.y + Math.sin(ang) * r);
      if (x < 3 || y < 3 || x >= WORLD_W - 3 || y >= WORLD_H - 3) continue;
      if (isBlocked(x, y) || !OPEN_GROUND.has(tileAt(x, y))) continue;
      const zone = zoneAt(x, y);
      const zdef = ZONES[zone];
      if (!zdef || !zdef.table.length) continue;
      // no spawns right on top of settlements / key spots
      if (Math.hypot(x - VILLAGE_C.x, y - VILLAGE_C.y) < 16) continue;
      const type = pick(zdef.table);
      const behavior = pick(['patrol', 'guard', 'roam']);
      const foe = {
        type, x, y, hx: x, hy: y,
        tx: x, ty: y,
        detect: this.detectBase(type) + (G.ngPlus ? 1 : 0),
        state: 'idle', behavior,
        alert: 0, lostT: 0, moveT: rnd() * 2, alive: true,
        icon: ENEMIES[type].icon, name: ENEMIES[type].name,
        facing: 'down',
      };
      // patrollers get two waypoints
      if (behavior === 'patrol') {
        for (let p = 0; p < 8; p++) {
          const wx = x + rint(-4, 4), wy = y + rint(-4, 4);
          if (!isBlocked(wx, wy) && OPEN_GROUND.has(tileAt(wx, wy))) { foe.wp = { x: wx, y: wy }; break; }
        }
      }
      this.list.push(foe);
      return foe;
    }
    return null;
  },

  maintain() {
    // cull foes that wandered too far from the player
    this.list = this.list.filter(f => f.alive && Math.hypot(f.x - G.player.x, f.y - G.player.y) < 60);
    let guard = 0;
    while (this.list.length < this.cap && guard++ < 8) {
      if (!this.spawnOne(false)) break;
    }
  },

  // try to step a foe toward (tx,ty) avoiding obstacles
  stepToward(foe, gx, gy, dt, speed) {
    const fx = Math.round(foe.x), fy = Math.round(foe.y);
    // already mid-step toward a target tile?
    const dx = foe.tx - foe.x, dy = foe.ty - foe.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.02) {
      const step = speed * dt;
      foe.x += dx / d * Math.min(step, d);
      foe.y += dy / d * Math.min(step, d);
      foe.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      return;
    }
    foe.x = foe.tx; foe.y = foe.ty;
    // choose next tile
    let ax = Math.sign(gx - fx), ay = Math.sign(gy - fy);
    const tryMove = (mx, my) => {
      if (mx === 0 && my === 0) return false;
      const nx = fx + mx, ny = fy + my;
      if (nx === G.player.x && ny === G.player.y) { foe.tx = nx; foe.ty = ny; return true; }
      if (!isBlocked(nx, ny) && OPEN_GROUND.has(tileAt(nx, ny))) { foe.tx = nx; foe.ty = ny; return true; }
      return false;
    };
    // prefer the dominant axis, then alternatives
    const order = Math.abs(gx - fx) >= Math.abs(gy - fy)
      ? [[ax, 0], [0, ay], [0, ay === 0 ? 1 : ay], [ax === 0 ? 1 : ax, 0], [0, -1], [-1, 0]]
      : [[0, ay], [ax, 0], [ax === 0 ? 1 : ax, 0], [0, ay === 0 ? 1 : ay], [-1, 0], [0, -1]];
    for (const [mx, my] of order) if (tryMove(mx, my)) return;
  },

  update(dt) {
    if (G.inDungeon || G.inInterior) return;
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 2.5; this.maintain(); }
    if (Combat.active) return;

    for (const foe of this.list) {
      if (!foe.alive) continue;
      const sees = this.canSee(foe);

      if (sees) {
        foe.state = 'chase'; foe.lostT = 0;
        foe.alert = Math.min(1, foe.alert + dt * 3);
      } else if (foe.state === 'chase') {
        foe.lostT += dt;
        if (foe.lostT > 4) { foe.state = 'return'; foe.alert = 0; }
      }

      if (foe.state === 'chase') {
        this.stepToward(foe, G.player.x, G.player.y, dt, 3.4);
        // contact → fight
        if (Math.hypot(foe.x - G.player.x, foe.y - G.player.y) < 0.7) { this.engage(foe); return; }
      } else if (foe.state === 'return') {
        this.stepToward(foe, foe.hx, foe.hy, dt, 2.4);
        if (Math.round(foe.x) === foe.hx && Math.round(foe.y) === foe.hy) foe.state = 'idle';
      } else {
        // idle / patrol / roam
        foe.alert = Math.max(0, foe.alert - dt);
        foe.moveT -= dt;
        const moving = Math.hypot(foe.tx - foe.x, foe.ty - foe.y) > 0.02;
        if (moving) { this.stepToward(foe, foe.tx, foe.ty, dt, 1.6); }
        else if (foe.moveT <= 0) {
          foe.moveT = 1.5 + rnd() * 3;
          let dest;
          if (foe.behavior === 'patrol' && foe.wp) {
            dest = (Math.abs(foe.x - foe.hx) + Math.abs(foe.y - foe.hy) < 1) ? foe.wp : { x: foe.hx, y: foe.hy };
          } else if (foe.behavior === 'guard') {
            dest = { x: foe.hx + rint(-1, 1), y: foe.hy + rint(-1, 1) };
          } else {
            dest = { x: Math.round(foe.x) + rint(-3, 3), y: Math.round(foe.y) + rint(-3, 3) };
          }
          if (!isBlocked(dest.x, dest.y) && OPEN_GROUND.has(tileAt(dest.x, dest.y))) { foe.tx = dest.x; foe.ty = dest.y; }
        }
      }
    }
  },

  engage(foe) {
    // gather nearby alerted foes for a group ambush (max 3)
    const group = [foe];
    for (const f of this.list) {
      if (f !== foe && f.alive && f.state === 'chase' && Math.hypot(f.x - foe.x, f.y - foe.y) < 2.5 && group.length < 3) group.push(f);
    }
    const ids = group.map(f => f.type);
    group.forEach(f => { f.alive = false; });
    this.list = this.list.filter(f => f.alive);
    Audio2.sfx('sword');
    Combat.start(ids, { reason: group.length > 1 ? 'You are surrounded!' : (foe.name + ' attacks!') });
  },
};
