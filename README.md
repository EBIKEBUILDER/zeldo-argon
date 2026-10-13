# Zeldo — Episode I: The Sunken Sanctum

An overhead 3D action-adventure browser game built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Babylon.js**, **Zustand**, and the **Web Audio API**.

## Controls

- **Move Hero**: `WASD` or `Arrow Keys`
- **Sword Slash**: `Space`, `J`, `Z`, `Enter`, or `Left Click`
- **Shield Block (Hold)**: `Right Click` or `Shift` (reduces incoming melee & arrow damage by 50% and cuts knockback)
- **Throw Gale Boomerang**: `Q` or `1` (purchased from Bramble's Shop)
- **Shoot Ranger's Bow**: `E`, `F`, or `2` (requires both the Ranger's Bow and Arrows from Bramble's Shop)
- **Toggle 3D Map Editor / Live Play Mode**: `Tab` or `F2` (or click **▶ Play Live** / **⏸ Map Editor** in the top bar)
- **Interact (Shop / Key / Locked Gate / Boss Chest / Portals)**: Walk up to the object or golden carpet

## Unity-Style 3D Map Editor & Asset Importer

Press **`Tab`** or **`F2`** (or click **⏸ Map Editor**) at any time to pause the live simulation and enter the **3D Scene Editor**:
- **Camera Controls**: Hold **Right-Click + Drag** to orbit the 3D camera, use **`WASD` / `Arrows`** to pan across the map, and scroll the **Mouse Wheel** to zoom in or out.
- **Individual 3D Props & Asset Browser**: Browse and place individual environment props (**Pine Trees, Meadow Bushes, Wildflowers, Mossy Boulders, Watchtower Pillars, Sanctum Pillars, Flame Braziers, Supply Crates, Stone Walls, Cliff Ridges, Water Streams, Cobblestone Paths, Wooden Bridges, and Temple Archways**). Click any existing prop in the scene to drag-move, rotate, scale, toggle its collision box, duplicate (`Ctrl+D`), or delete (`Delete`) it.
- **Monster Spawners & Weight Tuning**: Place **Poring Blobs, Goblin Archers, Goblin Fighters, Shadow Minions, Sentinel Knights, or Boss Malakor** and tune their **Weight (Poise)**, **HP**, and **Speed** in the Inspector:
  - **Lightweight (`0.5 - 0.6`)**: Purple/Pink Poring Blobs and Goblin Archers get knocked back strongly and can be juggled with sword spam.
  - **Medium (`2.0 - 2.2`)**: Goblin Fighters and Shadow Minions take moderate knockback.
  - **Heavy (`6.5`)**: Sentinel Knights barely flinch when struck.
  - **Immovable (`100`)**: Boss Malakor cannot be knocked back at all.
- **Terrain Sculpt & Paint Brush**: Switch to the **⛰ Terrain Brush** tool to **Raise Hills**, **Lower Valleys**, **Flatten**, or **Paint Surface Colors** (Lush Grass, Cobblestone Path, Sanctum Slate, Golden Sand, Mystic Water) directly onto the 3D ground mesh.
- **Portals & Map Linking**: Place or select **Map Transition Portals** and configure their **Target Map (`Overworld` or `Dungeon`)**, **Arrival X/Z Coordinates**, **Trigger Radius**, and **Banner Text**.
- **Custom 3D Model Import (`.OBJ`) & Map JSON IO**: Import external `.OBJ` 3D model files into the Asset Browser palette to place custom 3D meshes in the world, and export/import full Map `.json` files.

## Adventure Guide

1. **The Whispering Vale (Overworld) & Bramble's Curio Shop**:
   - Begin in the safe **South Clearing** and visit **Merchant Bramble's Curio Shop** on the east side of the clearing to spend Rupees on the **Gale Boomerang** (`15 Rupees`), **Ranger's Ash Bow** (`20 Rupees`), **Bundles of 10 Arrows** (`10 Rupees`), and **Crimson Heart Elixirs** (`10 Rupees`).
   - Cross the wooden bridge into the Central Crossroads and defeat Poring-style Blobby Slimes, Moss Goblins, **Goblin Archers**, and Iron Sentinels to collect **Rupees** (`Green = 1`, `Blue = 5`, `Red = 20`).
   - Venture into the **Western Watchtower Ruins** to recover the golden **Sanctum Key**.
2. **The Sunken Sanctum (Dungeon)**:
   - Travel north to enter the glowing **Sanctum Portal**.
   - Battle through **Room I (Torchlit Antechamber)** and **Room II (Hall of Pillars)**.
   - Use the **Sanctum Key** to open the **Locked Iron Gate** barring the northern passage.
3. **Boss Fight & The Zeldo Crest**:
   - Enter **Room III (Dread Sanctum)** to confront **Malakor, Warden of the Eclipse** and his **Shadow Minions**.
   - **Tactical Boss Strategy**: Malakor's obsidian armor deflects attacks while he is standing or lunging. Watch the ground path telegraph when he aims his charging lunge, sidestep near a wall or pillar so he crashes into the stone, and strike while he is **Stunned**!
   - **Lobbed Hazard Bombs**: Dodge the arcing toxic-fire bombs he lobs into the air and stay out of the lingering ground hazard pools they leave behind.
   - Vanquish the Warden to shatter the crimson seal on the **Golden Sanctum Chest**, then open the chest to restore the **Zeldo Crest**!


