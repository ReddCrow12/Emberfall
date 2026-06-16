# 🔥 Emberfall — A Tale of Dice & Dragons

A complete browser-based 2D fantasy RPG inspired by tabletop Dungeons & Dragons adventures.
Explore a vast hand-crafted world, fight roaming monsters, take on multi-phase bosses,
collect loot of legendary rarity, buy and decorate your own homes, and decide the fate of
the village of Eldenbrook — all in your browser, no install required.

> Pure **HTML + CSS + JavaScript**. No engine, no build step, no dependencies.
> Just open `index.html` (or the live link) and play.

---

## ▶️ Play

**Live:** _add your GitHub Pages link here, e.g._ `https://<your-username>.github.io/emberfall/`

**Run locally:** download the files and open `index.html` in any modern browser
(Chrome / Edge / Firefox). That's it.

---

## 🎮 How to Play

### Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | `W A S D` or Arrow Keys | On-screen D-pad |
| Interact / Talk / Confirm | `E`, `Space` or `Enter` | ✦ action button |
| Inventory | `I` | 🎒 button |
| Character & Skills | `C` | 🧙 button |
| Quest Journal | `Q` | 📜 button |
| Open Full Map | `M` or click the mini-map | 🗺️ button |
| Zoom in / out (field of view) | `+` / `-` or mouse wheel | ➕ / ➖ buttons |
| Sneak (lowers enemy detection) | Hold `Shift` | — |
| Close menus / Cancel | `Esc` | ✕ |
| Save / Load & Settings | 💾 / ⚙️ buttons | 💾 / ⚙️ buttons |

### Getting Started
1. Pick **New Adventure** and choose a **class** and name.
2. You wake in **Eldenbrook Village**. Talk to **Elder Rowan** (the NPC with a glowing `!`).
3. Take his quest, head out, and start exploring. Enemies are **visible on the map** —
   you'll see their detection ring before they notice you.

---

## 🧝 Classes

| Class | Style | Strengths | Signature Abilities |
|---|---|---|---|
| 🛡️ **Warrior** | Tanky melee bruiser | High HP & defense | Power Strike, Shield Wall, Berserk Rage |
| 🗡️ **Rogue** | Crit & evasion | Luck, dodge, crits | Backstab, Poison Blade, Smoke Bomb |
| 🔮 **Mage** | Glass-cannon caster | Huge spell damage | Fireball, Frost Nova, Arcane Blast |
| 🏹 **Ranger** | Balanced survivalist | Versatile, self-heal | Aimed Shot, Multi-Shot, Nature's Mend |

Stats tracked: **Health, Mana, Strength, Defense, Luck, Charisma, Experience, Level.**
Every level grants a **skill point** to upgrade your abilities (each up to Lv 5).

---

## 🗺️ The World

A large radial world spreads out from the central village, each direction a distinct biome
with its own enemies, weather and ambience:

- 🌾 **Heartland Plains** & 🌳 **Whisperwood** — the gentle starting lands
- ❄️ **Frostmere Tundra** — snow, blizzards, the Frost Titan (town: Frostmere)
- 🏜️ **Sunspear Wastes** — desert dunes & the Sand Wyrm (town: Sunspear)
- 🪨 **Stormpeak Highlands** & 🕳️ **Gloomhollow Cave**
- 🌋 **Cinderwaste** & 🐉 **The Dragon's Lair**
- 🏛️ **Ruins of Old Varnath** — the Lich and a portal to the depths
- 🐸 **Murkmire Swamp** & 💀 **The Blighted Reach** (cursed lands)
- 🌊 **Saltwind Coast** & a hidden island off the shore (town: Saltwind)
- 🌿 **The Hidden Grove** — sealed behind a riddle

Some areas stay locked until you obtain the right item or solve a puzzle, so the map
rewards exploration. Open the **full map** (`M`) any time to see towns, bosses and your houses.

### Crossroad Events
Step onto a crossroad and you may trigger a random **D&D-style event** — dilemmas
(help / ignore / rob the injured traveler), merchant caravans, ambushes, riddles, gambling
goblins, lost children, mysterious doors and more. Your choices shift **reputation, gold,
future encounters and the story**, so every playthrough feels different.

---

## ⚔️ Combat

Turn-based battles against varied enemies and **multi-phase bosses**.

- **Critical hits**, **dodge**, and status effects: ☠️ Poison, 🔥 Burn, ❄️ Freeze, 💫 Stun
- Distinct enemy AI: aggressive, cunning, venomous, casters, and the dragon's fire-breath
- Bosses change behavior and grow stronger as their health drops
- Use **Attack**, **Abilities** (cost mana), or **Items**, or try to **Flee**

Defeated enemies drop XP, gold and loot. Bosses always drop something rare or better.

---

## 💎 Rarity Table

Loot is graded across seven tiers. Higher **Luck** improves your odds, and the highest
tier only appears in **New Game+**. Legendary and above feature unique names and a special
glowing fanfare.

| Tier | Color | Power | Notes |
|---|---|---|---|
| **Common** | ⬜ Gray | ×1.0 | Everyday gear |
| **Uncommon** | 🟩 Green | ×1.35 | A cut above |
| **Rare** | 🟦 Blue | ×1.8 | Worth seeking |
| **Epic** | 🟪 Purple | ×2.4 | Powerful |
| **Legendary** | 🟧 Orange | ×3.2 | Named & glowing (e.g. *Blade of Forgotten Kings*, *Emberheart Ring*) |
| **Mythic** | 🟥 Red | ×4.2 | Game-changing (e.g. *Crown of the Eternal Watcher*) |
| **Ancient** | 🟨 Gold | ×5.5 | NG+ only — radiant, animated relics (e.g. *Worldsplinter*) |

Item types: **Weapons, Armor, Rings, Amulets, Potions, Crafting Materials, Collectibles,
Quest Items, Furniture, and Artifacts.**

---

## 🧭 Game Flow

1. **Start** in Eldenbrook — choose a class, meet the villagers.
2. **Main quest chain:** thin the goblin raids → defeat the **Goblin King** in the cave →
   destroy the **Lich Kareth** in the ruins (he holds the Ancient Key) → use the key to open
   the **Dragon's Lair** and slay **Vaelthyx**, the Doom of Emberfall.
3. **Side & hidden quests** along the way: a runaway cat, herb-gathering, star-iron forging,
   a forest riddle that opens the Hidden Grove, and the Endless Depths.
4. **Beat the dragon** to unlock the endgame:
   - 🔁 **New Game+** — keep your level & gear, face a deadlier world, hunt **Ancient** relics
     and a **secret boss** in the grove.
   - 🕳️ **Endless Dungeon** — the portal in the ruins descends forever; how deep can you go?
   - 💀 **Extra bosses** — the Frost Titan, the Sand Wyrm and the Void Wraith.

---

## ✨ Features

- 🌍 **Vast multi-biome world** with towns, dungeons, rivers, secret areas and landmarks
- 👁️ **Visible enemies** with detection radius, alert indicators and chase AI — plus
  **stealth** (sneak with `Shift`, or vanish with an Invisibility Potion)
- 🏠 **Player housing** — buy 5 house types from the realtor, place them with a drag-to-build
  mode (green = valid / red = invalid), enter **distinct multi-room interiors**, store items
  in a persistent vault, **lock your door with a key**, and **decorate with furniture**
- 🛒 **Full economy** — weapon, armor, potion, magic and general-goods shops, a furniture
  store, and a traveling merchant with rotating stock; prices scale with rarity and your
  reputation
- 🧑‍🤝‍🧑 **Living NPCs** — shopkeepers, guards, quest-givers, healers, blacksmiths and a few
  very strange folk, each with dialogue, personalities and reputation reactions
- 🎯 **Quests** — main, side, hidden and repeatable, all tracked automatically
- 🎒 **Deep inventory** — equip gear, manage potions, sell loot, see live stat previews
- 🎨 **Atmosphere** — pixel-art tiles, glowing magical items, particle effects (fire, ice,
  poison, healing), weather (rain, snow, falling leaves, fog, embers), torch-lit interiors,
  screen shake and smooth transitions
- 🔊 **Procedural audio** — original music per region and reactive sound effects, with
  independent music/SFX volume controls
- 💾 **Saving** — 3 manual save slots + autosave, persisted in your browser
- 🔍 **Zoom / FOV control** and a full **world map**
- 📱 **Responsive** — plays on desktop and mobile with touch controls

---

## 🛠️ Tech

- Vanilla JavaScript, HTML5 Canvas, CSS — **zero dependencies**
- Procedurally generated pixel-art tiles and Web Audio music/SFX
- Modular architecture: world generation, entities, combat, quests, items, housing,
  enemy AI, rendering, UI and save system are cleanly separated

---

*Built for fun. May the First Ember light your path.* 🔥
