"use client";

import React, { useRef, useState } from "react";
import {
  BootsId,
  BottleContentId,
  EditorPlaceCategory,
  OffhandId,
  PrimaryHandId,
  TerrainBrushMode,
  TunicId,
  useGameStore,
} from "@/store/gameStore";
import {
  BuriedRewardKind,
  EnemyKind,
  EnemyShieldArmor,
  PotRewardKind,
  PropPrefabId,
  RupeeTier,
  WARP_STONE_META,
  ZoneId,
} from "@/game/worldData";
import {
  buildQuestChronicle,
  resolveWayfinderRoute,
} from "@/game/questSystem";

function HeartIcon({ state, index }: { state: "full" | "half" | "empty"; index: number }) {
  const clipId = `half-heart-clip-${index}`;
  return (
    <svg
      width="30"
      height="28"
      viewBox="0 0 24 22"
      className={`heart-icon ${state !== "empty" ? "heart-active" : "heart-empty"}`}
      aria-label={`Heart ${index + 1}: ${state}`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="12" height="22" />
        </clipPath>
        <linearGradient id={`heart-grad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff5e7e" />
          <stop offset="55%" stopColor="#e61943" />
          <stop offset="100%" stopColor="#990a26" />
        </linearGradient>
      </defs>

      <path
        d="M12 20.5C12 20.5 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.5 12 3.9C12.8 2.5 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.5 12 20.5Z"
        fill="#1e1928"
        stroke="#c9a449"
        strokeWidth="1.6"
      />

      {state === "full" && (
        <path
          d="M12 20.5C12 20.5 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.5 12 3.9C12.8 2.5 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.5 12 20.5Z"
          fill={`url(#heart-grad-${index})`}
          stroke="#ffd479"
          strokeWidth="1.5"
        />
      )}

      {state === "half" && (
        <g clipPath={`url(#${clipId})`}>
          <path
            d="M12 20.5C12 20.5 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.5 12 3.9C12.8 2.5 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.5 12 20.5Z"
            fill={`url(#heart-grad-${index})`}
            stroke="#ffd479"
            strokeWidth="1.5"
          />
        </g>
      )}

      {state !== "empty" && (
        <ellipse
          cx="7.2"
          cy="6.2"
          rx="2.1"
          ry="1.2"
          transform="rotate(-25 7.2 6.2)"
          fill="rgba(255,255,255,0.55)"
        />
      )}
    </svg>
  );
}

function ZeldoCrestEmblem({ size = 76 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="crest-emblem">
      <defs>
        <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff3a8" />
          <stop offset="45%" stopColor="#f5be33" />
          <stop offset="100%" stopColor="#b87708" />
        </linearGradient>
      </defs>
      <polygon
        points="50,6 68,36 50,54 32,36"
        fill="url(#crestGold)"
        stroke="#fff6c2"
        strokeWidth="2"
      />
      <polygon
        points="29,42 47,62 29,90 11,62"
        fill="url(#crestGold)"
        stroke="#fff6c2"
        strokeWidth="2"
      />
      <polygon
        points="71,42 89,62 71,90 53,62"
        fill="url(#crestGold)"
        stroke="#fff6c2"
        strokeWidth="2"
      />
      <circle cx="50" cy="54" r="4.5" fill="#ffffff" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const PROP_PALETTE: Array<{ id: PropPrefabId; label: string; tag: string }> = [
  { id: "rusted_peg", label: "Rusted Iron Peg (Pound w/ Hammer)", tag: "Puzzle" },
  { id: "grapple_post", label: "Grapple Anchor Post (Hookshot)", tag: "Puzzle" },
  { id: "eye_statue", label: "Wall Eye Statue (Shoot w/ Bow)", tag: "Puzzle" },
  { id: "clay_pot", label: "Clay Pot (Lift & Throw)", tag: "Interact" },
  { id: "light_rock", label: "Light Rock (Lift & Throw)", tag: "Interact" },
  { id: "push_block", label: "Pushable Puzzle Block", tag: "Puzzle" },
  { id: "crystal_switch", label: "Crystal Orb Switch", tag: "Puzzle" },
  { id: "crystal_barrier", label: "Crystal Barrier Pillar", tag: "Puzzle" },
  { id: "cracked_rock", label: "Cracked Boulder (Bomb)", tag: "Secret" },
  { id: "briar_barrier", label: "Dry Briars (Burn w/ Flame Rod)", tag: "Barrier" },
  { id: "spiderweb_barrier", label: "Spiderweb Arch (Burn w/ Flame Rod)", tag: "Barrier" },
  { id: "wall_torch", label: "Flame Brazier / Torch", tag: "Puzzle" },
  { id: "dirt_patch", label: "Soft Dirt Patch (Dig)", tag: "Secret" },
  { id: "pine_tree", label: "Pine Tree", tag: "Nature" },
  { id: "bush", label: "Meadow Bush", tag: "Nature" },
  { id: "flower_patch", label: "Wildflowers", tag: "Nature" },
  { id: "boulder", label: "Mossy Boulder", tag: "Nature" },
  { id: "water_tile", label: "Water Stream", tag: "Terrain" },
  { id: "path_tile", label: "Cobblestone Path", tag: "Terrain" },
  { id: "cliff_block", label: "Cliff Ridge", tag: "Terrain" },
  { id: "ruin_pillar", label: "Watchtower Pillar", tag: "Ruins" },
  { id: "stone_wall", label: "Stone Wall Block", tag: "Wall" },
  { id: "wooden_bridge", label: "Wooden Bridge", tag: "Structure" },
  { id: "temple_arch", label: "Temple Archway", tag: "Structure" },
  { id: "dungeon_pillar", label: "Sanctum Pillar", tag: "Dungeon" },
  { id: "wooden_crate", label: "Supply Crate", tag: "Dungeon" },
];

const MONSTER_PALETTE: Array<{
  prefab: string;
  label: string;
  weightLabel: string;
}> = [
  { prefab: "enemy:turret", label: "Stone Spitter Turret", weightLabel: "Heavy (18.0)" },
  { prefab: "enemy:slime", label: "Poring Blob Slime", weightLabel: "Light (0.5)" },
  { prefab: "enemy:archer", label: "Goblin Bowman Archer", weightLabel: "Light (0.6)" },
  { prefab: "enemy:wraith", label: "Frost Wraith (Glacial Specter)", weightLabel: "Light (0.8)" },
  { prefab: "enemy:bomber", label: "Sapper Gremlin (Bomb-Lobber)", weightLabel: "Medium (1.4)" },
  { prefab: "enemy:goblin", label: "Goblin Fighter", weightLabel: "Medium (2.0)" },
  { prefab: "enemy:minion", label: "Shadow Minion", weightLabel: "Medium (2.2)" },
  { prefab: "enemy:burrower", label: "Tunnel Wyrm (Unearth w/ Shovel/Bomb)", weightLabel: "Heavy (3.6)" },
  { prefab: "enemy:knight", label: "Sentinel Knight", weightLabel: "Heavy (12.0)" },
  { prefab: "enemy:boss", label: "Boss: Ignis / Cryos / Vaelkor", weightLabel: "Immovable (100)" },
];

const TERRAIN_SWATCHES = [
  { label: "Lush Grass", hex: "#3d8c47" },
  { label: "Cobble Path", hex: "#bfa675" },
  { label: "Sanctum Slate", hex: "#2e3040" },
  { label: "Golden Sand", hex: "#e3c16f" },
  { label: "Mystic Water", hex: "#2989d8" },
];

const BOTTLE_META: Record<
  BottleContentId,
  { name: string; badge: string; color: string; desc: string }
> = {
  empty: {
    name: "Empty Glass Bottle",
    badge: "EMPTY",
    color: "#8fa4bf",
    desc: "Ready to store a Red/Green/Blue Potion, a Healing Fairy, or a Golden Attack Bee.",
  },
  red_potion: {
    name: "Crimson Life Potion",
    badge: "RED POTION",
    color: "#ff4769",
    desc: "Drink to immediately restore 100% of your Life Hearts. Leaves an empty bottle.",
  },
  green_potion: {
    name: "Emerald Magic Potion",
    badge: "GREEN POTION",
    color: "#2ee675",
    desc: "Drink to immediately restore 100% Magic Power (MP) for your Flame Rod.",
  },
  blue_potion: {
    name: "Sapphire Sovereign Elixir",
    badge: "BLUE POTION",
    color: "#3aa0ff",
    desc: "Rare alchemical brew that restores ALL Life Hearts AND 100% Magic Power!",
  },
  fairy: {
    name: "Captured Spring Fairy",
    badge: "FAIRY",
    color: "#ff7be5",
    desc: "Heals 7 Full Hearts on use — OR automatically revives you if your Hearts hit zero!",
  },
  bee: {
    name: "Golden Attack Bee",
    badge: "GOLDEN BEE",
    color: "#ffd23f",
    desc: "Unleash a friendly 3D Golden Bee that chases and stings nearby monsters for 15s!",
  },
};

export default function GameOverlay() {
  const phase = useGameStore((s) => s.phase);
  const zone = useGameStore((s) => s.zone);
  const dungeonRoom = useGameStore((s) => s.dungeonRoom);
  const hero = useGameStore((s) => s.hero);
  const flags = useGameStore((s) => s.flags);
  const enemies = useGameStore((s) => s.enemies);
  const rupees = useGameStore((s) => s.rupees);
  const mapProps = useGameStore((s) => s.mapProps);
  const portals = useGameStore((s) => s.portals);
  const customModels = useGameStore((s) => s.customModels);
  const stats = useGameStore((s) => s.stats);
  const banner = useGameStore((s) => s.banner);
  const muted = useGameStore((s) => s.muted);
  const fps = useGameStore((s) => s.fps);
  const nearShop = useGameStore((s) => s.nearShop);
  const shopOpen = useGameStore((s) => s.shopOpen);
  const characterOpen = useGameStore((s) => s.characterOpen);
  const questLogOpen = useGameStore((s) => s.questLogOpen);
  const atlasOpen = useGameStore((s) => s.atlasOpen);
  const forgeOpen = useGameStore((s) => s.forgeOpen);
  const riftOpen = useGameStore((s) => s.riftOpen);
  const wayfinderActive = useGameStore((s) => s.wayfinderActive);
  const pinnedQuestId = useGameStore((s) => s.pinnedQuestId);
  const boomerang = useGameStore((s) => s.boomerang);
  const hookshot = useGameStore((s) => s.hookshot);

  // Map Editor Store Slice
  const editorMode = useGameStore((s) => s.editorMode);
  const editorTool = useGameStore((s) => s.editorTool);
  const editorSelected = useGameStore((s) => s.editorSelected);
  const editorPlaceCategory = useGameStore((s) => s.editorPlaceCategory);
  const editorPlacePrefab = useGameStore((s) => s.editorPlacePrefab);
  const terrainBrushMode = useGameStore((s) => s.terrainBrushMode);
  const terrainBrushRadius = useGameStore((s) => s.terrainBrushRadius);
  const terrainBrushStrength = useGameStore((s) => s.terrainBrushStrength);
  const terrainPaintColor = useGameStore((s) => s.terrainPaintColor);

  const startGame = useGameStore((s) => s.startGame);
  const restartGame = useGameStore((s) => s.restartGame);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setShopOpen = useGameStore((s) => s.setShopOpen);
  const setCharacterOpen = useGameStore((s) => s.setCharacterOpen);
  const setQuestLogOpen = useGameStore((s) => s.setQuestLogOpen);
  const setAtlasOpen = useGameStore((s) => s.setAtlasOpen);
  const setForgeOpen = useGameStore((s) => s.setForgeOpen);
  const setRiftOpen = useGameStore((s) => s.setRiftOpen);
  const enterProceduralRift = useGameStore((s) => s.enterProceduralRift);
  const forgeEnchantWeapon = useGameStore((s) => s.forgeEnchantWeapon);
  const grantForgePlaytestBundle = useGameStore((s) => s.grantForgePlaytestBundle);
  const warpToZone = useGameStore((s) => s.warpToZone);
  const toggleWayfinder = useGameStore((s) => s.toggleWayfinder);
  const setPinnedQuestId = useGameStore((s) => s.setPinnedQuestId);
  const equipHeroItem = useGameStore((s) => s.equipHeroItem);
  const useBottleSlot = useGameStore((s) => s.useBottleSlot);
  const fillBottleSlot = useGameStore((s) => s.fillBottleSlot);
  const buyShopItem = useGameStore((s) => s.buyShopItem);

  const setEditorMode = useGameStore((s) => s.setEditorMode);
  const setEditorZone = useGameStore((s) => s.setEditorZone);
  const setEditorTool = useGameStore((s) => s.setEditorTool);
  const setEditorSelected = useGameStore((s) => s.setEditorSelected);
  const setEditorPlaceItem = useGameStore((s) => s.setEditorPlaceItem);
  const setTerrainBrush = useGameStore((s) => s.setTerrainBrush);
  const updatePropInstance = useGameStore((s) => s.updatePropInstance);
  const updateEnemyInstance = useGameStore((s) => s.updateEnemyInstance);
  const updateRupeeInstance = useGameStore((s) => s.updateRupeeInstance);
  const updatePortalInstance = useGameStore((s) => s.updatePortalInstance);
  const duplicateSelectedEntity = useGameStore((s) => s.duplicateSelectedEntity);
  const deleteSelectedEntity = useGameStore((s) => s.deleteSelectedEntity);
  const importCustomObjModel = useGameStore((s) => s.importCustomObjModel);
  const resetPlaySimulation = useGameStore((s) => s.resetPlaySimulation);
  const exportMapJson = useGameStore((s) => s.exportMapJson);
  const importMapJson = useGameStore((s) => s.importMapJson);
  const saveMapToBrowserStorage = useGameStore((s) => s.saveMapToBrowserStorage);
  const resetMapToDefaults = useGameStore((s) => s.resetMapToDefaults);

  const objInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [importColorHex, setImportColorHex] = useState("#4fd8ff");
  const [editorStatusMsg, setEditorStatusMsg] = useState<string | null>(null);
  const [revealAllChapters, setRevealAllChapters] = useState(false);
  const [expandedHintIds, setExpandedHintIds] = useState<string[]>([]);
  const [selectedAtlasZone, setSelectedAtlasZone] = useState<ZoneId>("overworld");
  const [unlockAllWarpsPlaytest, setUnlockAllWarpsPlaytest] = useState(false);
  const [riftTargetDepth, setRiftTargetDepth] = useState<number>(1);
  const [riftCustomSeedText, setRiftCustomSeedText] = useState<string>("");

  React.useEffect(() => {
    if (riftOpen) {
      setRiftTargetDepth(zone === "rift" ? (flags.riftDepth ?? 1) + 1 : Math.max(1, flags.riftDepth || 1));
    }
  }, [riftOpen, zone, flags.riftDepth]);

  React.useEffect(() => {
    if (atlasOpen) {
      setSelectedAtlasZone(zone);
    }
  }, [atlasOpen, zone]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (shopOpen) setShopOpen(false);
        if (characterOpen) setCharacterOpen(false);
        if (questLogOpen) setQuestLogOpen(false);
        if (atlasOpen) setAtlasOpen(false);
        if (forgeOpen) setForgeOpen(false);
        if (riftOpen) setRiftOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    shopOpen,
    characterOpen,
    questLogOpen,
    atlasOpen,
    forgeOpen,
    riftOpen,
    setShopOpen,
    setCharacterOpen,
    setQuestLogOpen,
    setAtlasOpen,
    setForgeOpen,
    setRiftOpen,
  ]);

  const showEditorToast = (msg: string) => {
    setEditorStatusMsg(msg);
    setTimeout(() => {
      setEditorStatusMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const handleObjFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const cleanName = file.name.replace(/\.obj$/i, "");
    const ok = importCustomObjModel(cleanName, text, importColorHex);
    if (ok) {
      showEditorToast(`Imported 3D model "${cleanName}"! Click on the map to place it.`);
    } else {
      showEditorToast("Could not parse .OBJ vertices/faces from file.");
    }
    e.target.value = "";
  };

  const handleExportMapFile = () => {
    const json = exportMapJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zeldo-map-${zone}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showEditorToast("Exported Map JSON file!");
  };

  const handleImportMapFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ok = importMapJson(text);
    showEditorToast(ok ? "Loaded Map JSON successfully!" : "Invalid Map JSON file.");
    e.target.value = "";
  };

  const totalHeartContainers = Math.ceil(hero.maxHp / 2);
  const hearts: Array<"full" | "half" | "empty"> = [];
  for (let i = 0; i < totalHeartContainers; i++) {
    const heartHp = hero.hp - i * 2;
    if (heartHp >= 2) hearts.push("full");
    else if (heartHp === 1) hearts.push("half");
    else hearts.push("empty");
  }

  const mpPercent = Math.max(0, Math.min(100, ((hero.mp ?? 100) / (hero.maxMp || 100)) * 100));
  const tunicMitigationLabel =
    hero.equippedTunic === "red_mail"
      ? "Crimson Mail (-75% DMG)"
      : hero.equippedTunic === "blue_mail"
      ? "Sapphire Mail (-50% DMG)"
      : "Green Tunic (0% Red.)";

  const filledBottlesCount = (hero.bottles ?? []).filter((b) => b !== "empty").length;

  const bossEnemy = enemies.find((e) => e.kind === "boss" && e.zone === zone);
  const activeMinions = enemies.filter(
    (e) => e.kind === "minion" && e.zone === zone && e.state !== "dead"
  ).length;

  // Dark Room (Room 4: The Dark Archery Crypt) & Timed 8-Second Torch Square Status
  const inDarkHall =
    phase === "playing" && !editorMode && zone === "dungeon" && dungeonRoom === "crypt";
  const hallTorches = mapProps.filter(
    (p) =>
      p.zone === "dungeon" &&
      p.prefab === "wall_torch" &&
      p.id.startsWith("prop-dg-crypt-torch")
  );
  const litHallTorchesCount = hallTorches.filter((p) => p.lit !== false).length;
  const hallLightRatio = Math.min(1, litHallTorchesCount / Math.max(1, hallTorches.length));

  const zoneTimedTorches = mapProps.filter(
    (p) =>
      p.zone === zone &&
      p.prefab === "wall_torch" &&
      (p.timedDuration ?? 0) > 0
  );
  const litTimedTorches = zoneTimedTorches.filter((p) => p.lit === true);
  const timedSquareSolved =
    zoneTimedTorches.length > 0 && zoneTimedTorches.every((p) => Boolean(p.timedSolved));
  const minTimedLeft = litTimedTorches.reduce(
    (acc, p) =>
      p.timedSolved
        ? acc
        : Math.min(acc, p.litTimer ?? p.timedDuration ?? 8),
    99
  );

  const questChronicle = buildQuestChronicle({
    zone,
    dungeonRoom,
    hero,
    flags,
    pinnedQuestId,
  });
  const wayfinderRoute = resolveWayfinderRoute({
    zone,
    dungeonRoom,
    hero,
    flags,
    portals,
    pinnedQuestId,
  });
  const activeQuest = questChronicle.activeQuest;
  const currentObjective = `${
    activeQuest.chapterNumber ? `${activeQuest.chapterNumber}: ` : "Rumor: "
  }${activeQuest.title} — ${activeQuest.summary}`;

  const zoneLabel =
    zone === "overworld"
      ? "Map 1: Crossroads Village Hub"
      : zone === "grove"
      ? "Map 1B: Whispering Forest Grove (West)"
      : zone === "frontier"
      ? "Map 3: Elderwood Highlands & Quarry (Hub)"
      : zone === "caverns"
      ? "Map 4: Frostpeak Caverns & Glacial Reliquary"
      : zone === "citadel"
      ? "Map 5: The Obsidian Citadel & Sovereign's Throne"
      : zone === "desert"
      ? "Map 6: Sunscorched Oasis & Shifting Sands"
      : zone === "caldera"
      ? "Map 7: Skyward Caldera & Dragon's Peak"
      : zone === "rift"
      ? `Abyssal Rift • Depth ${flags.riftDepth ?? 1}: ${flags.riftBiomeTitle ?? "The Endless Labyrinth"} (Seed #${flags.riftSeed ?? 0})`
      : dungeonRoom === "hub"
      ? "Map 2: Sunken Sanctum — Room 1: Central Lantern Hub"
      : dungeonRoom === "west_wing"
      ? "Map 2: Sunken Sanctum — Room 2: The Chasm Gallery (West)"
      : dungeonRoom === "east_wing"
      ? "Map 2: Sunken Sanctum — Room 3: The Ember Sanctum (East)"
      : dungeonRoom === "crypt"
      ? "Map 2: Sunken Sanctum — Room 4: The Dark Archery Crypt"
      : flags.bossAwakened || flags.bossDefeated
      ? "Map 2: Sunken Sanctum — Room 5: Boss Lair (Ignis)"
      : "Map 2: Sunken Sanctum — Room 5: Inner Sanctum";

  // Lookup currently selected entity for the Right Inspector Dock
  const selectedProp =
    editorSelected?.kind === "prop"
      ? mapProps.find((p) => p.id === editorSelected.id) ?? null
      : null;
  const selectedEnemy =
    editorSelected?.kind === "enemy"
      ? enemies.find((e) => e.id === editorSelected.id) ?? null
      : null;
  const selectedRupee =
    editorSelected?.kind === "rupee"
      ? rupees.find((r) => r.id === editorSelected.id) ?? null
      : null;
  const selectedPortal =
    editorSelected?.kind === "portal"
      ? portals.find((pt) => pt.id === editorSelected.id) ?? null
      : null;

  const innerConePct = Math.round(13 + hallLightRatio * 36);
  const midConePct = Math.round(24 + hallLightRatio * 42);
  const outerConePct = Math.round(36 + hallLightRatio * 52);
  const darkOverlayAlpha = Number(((1 - hallLightRatio) * 0.88).toFixed(2));

  return (
    <div className="hud-layer">
      {/* GPU-COMPOSITED DARK ROOM VISIBILITY CONE OVERLAY (0 WebGL Draw Calls / 0 FPS Cost!) */}
      {inDarkHall && hallLightRatio < 1 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            background: `radial-gradient(circle at 50% 52%, rgba(255, 195, 95, 0.08) 0%, rgba(12, 10, 22, 0.14) ${innerConePct}%, rgba(6, 6, 14, ${
              darkOverlayAlpha * 0.72
            }) ${midConePct}%, rgba(2, 2, 7, ${darkOverlayAlpha}) ${outerConePct}%)`,
            transition: "background 220ms ease-out",
          }}
        />
      )}

      {/* Hidden File Inputs for 3D .OBJ Import & Map JSON Import */}
      <input
        ref={objInputRef}
        type="file"
        accept=".obj"
        style={{ display: "none" }}
        onChange={handleObjFileUpload}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleImportMapFile}
      />

      {/* TOP HUD BAR */}
      <header className="hud-top-bar" style={{ position: "relative", zIndex: 2 }}>
        {/* Left: Life Hearts, Magic Meter, Zone Location & Gear Slots */}
        <div className="hud-panel hud-left">
          <div className="hud-vitals-header">
            <span className="hud-section-label">LIFE</span>
            <span className="tunic-armor-pill" title="Equipped Chest Armor Damage Reduction">
              {tunicMitigationLabel}
            </span>
          </div>
          <div className="hearts-row">
            {hearts.map((st, idx) => (
              <HeartIcon key={idx} state={st} index={idx} />
            ))}
          </div>

          {/* Magic Power (MP) Bar */}
          <div className="mp-bar-row" title="Magic Power (MP) — used by the Flame Rod (R / 3). Regenerates slowly or via Green/Blue Potions.">
            <span className="mp-label">MAGIC</span>
            <div className="mp-track">
              <div className="mp-fill" style={{ width: `${mpPercent}%` }} />
            </div>
            <span className="mp-val">{Math.round(hero.mp ?? 100)}</span>
          </div>

          <div className="zone-badge">{zoneLabel}</div>

          {/* Equipment / Action Bar */}
          {!editorMode && (
            <div className="gear-slots-row">
              <div
                className={`gear-slot ${
                  (hero.swordChargeTimer ?? 0) >= 0.62
                    ? "gear-slot-active"
                    : "gear-slot-owned"
                }`}
                title="Tap Space/LMB to slash, or HOLD Space/LMB to charge a 360° Spin Attack (2x Damage)!"
              >
                <span className="gear-key">SPC</span>
                <span className="gear-name">
                  {(hero.swordChargeTimer ?? 0) >= 0.62
                    ? "SPIN READY!"
                    : `Sword (${hero.swordDamage ?? 1} DMG${
                        (hero.swordRuneTier ?? 0) === 2
                          ? " ⚡II"
                          : (hero.swordRuneTier ?? 0) === 1
                          ? " ⚡I"
                          : ""
                      })`}
                </span>
              </div>

              <div
                className={`gear-slot ${hero.isBlocking ? "gear-slot-blocking" : "gear-slot-owned"}`}
                title={`Hold Right-Click or Shift to Block (-${hero.shieldBlock ?? 1} Damage)`}
              >
                <span className="gear-key">RMB</span>
                <span className="gear-name">
                  {hero.isBlocking ? "GUARDING" : `Shield (-${hero.shieldBlock ?? 1})`}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  !hero.hasFireRod
                    ? "gear-slot-locked"
                    : (hero.fireRodChargeTimer ?? 0) >= 0.55
                    ? "gear-slot-active"
                    : (hero.mp ?? 100) >= 12
                    ? "gear-slot-owned"
                    : "gear-slot-warn"
                }`}
                title={
                  hero.hasFireRod
                    ? "Tap R or 3 for a fireball (lights braziers, burns cobwebs/briars, melts ice armor)."
                    : "Undiscovered Relic — Sealed within an ancient sanctum."
                }
              >
                <span className="gear-key">R</span>
                <span className="gear-name">
                  {!hero.hasFireRod
                    ? "??? Relic"
                    : (hero.fireRodChargeTimer ?? 0) >= 0.55
                    ? "FLAME MAX!"
                    : (hero.fireRodChargeTimer ?? 0) > 0.1
                    ? "Charging..."
                    : "Flame Rod"}
                </span>
              </div>

              <div
                className={`gear-slot ${hero.hasShovel ? "gear-slot-owned" : "gear-slot-locked"}`}
                title={
                  hero.hasShovel
                    ? "Press G or 4 on soft dirt patches to dig up buried treasures!"
                    : "Undiscovered Tool — Can be found in the caverns or acquired from a merchant."
                }
              >
                <span className="gear-key">G</span>
                <span className="gear-name">
                  {hero.hasShovel ? "Shovel" : "??? Relic"}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  hero.hasBoomerang
                    ? boomerang !== null
                      ? "gear-slot-active"
                      : hero.boomerangCooldown > 0
                      ? "gear-slot-warn"
                      : "gear-slot-owned"
                    : "gear-slot-locked"
                }`}
                title="Press Q or 1 to throw the Gale Boomerang (2s Cooldown)"
              >
                <span className="gear-key">Q</span>
                <span className="gear-name">
                  {hero.hasBoomerang
                    ? boomerang !== null
                      ? "Flying..."
                      : hero.boomerangCooldown > 0
                      ? `Boomerang (${hero.boomerangCooldown.toFixed(1)}s)`
                      : "Boomerang"
                    : "Boomerang"}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  hero.hasHookshot
                    ? hookshot !== null
                      ? "gear-slot-active"
                      : "gear-slot-owned"
                    : "gear-slot-locked"
                }`}
                title={
                  hero.hasHookshot
                    ? "Press H or 7 to fire the Grappling Hookshot — latches onto Anchor Posts, Trees, Crates & Torches across chasms!"
                    : "Undiscovered Relic — Hidden high in the frontier crags."
                }
              >
                <span className="gear-key">H</span>
                <span className="gear-name">
                  {hero.hasHookshot
                    ? hookshot !== null
                      ? hookshot.state === "pulling_hero"
                        ? "Grappling!"
                        : "Hookshot..."
                      : "Hookshot"
                    : "??? Relic"}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  hero.hasHammer
                    ? (hero.hammerAnimTimer ?? 0) > 0
                      ? "gear-slot-active"
                      : (hero.hammerCooldown ?? 0) > 0
                      ? "gear-slot-warn"
                      : "gear-slot-owned"
                    : "gear-slot-locked"
                }`}
                title={
                  hero.hasHammer
                    ? "Press T or 8 to slam the Titan War-Hammer — pounds Rusted Stakes flat and shatters Cracked Boulders & Ice Armor!"
                    : "Undiscovered Relic — Forged in the frozen depths."
                }
              >
                <span className="gear-key">T</span>
                <span className="gear-name">
                  {hero.hasHammer
                    ? (hero.hammerAnimTimer ?? 0) > 0
                      ? "Slamming!"
                      : (hero.hammerCooldown ?? 0) > 0
                      ? `Hammer (${(hero.hammerCooldown ?? 0).toFixed(1)}s)`
                      : `War-Hammer${
                          (hero.hammerRuneTier ?? 0) === 2
                            ? " ❄II"
                            : (hero.hammerRuneTier ?? 0) === 1
                            ? " ❄I"
                            : ""
                        }`
                    : "??? Relic"}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  hero.heldObject
                    ? "gear-slot-active"
                    : hero.interactPrompt
                    ? "gear-slot-owned"
                    : "gear-slot-owned"
                }`}
                title="Stand next to a Clay Pot, Light Rock, or placed Bomb and press F (or K / X) to Lift overhead, then press F or Attack to Throw!"
              >
                <span className="gear-key">F</span>
                <span className="gear-name">
                  {hero.heldObject
                    ? `Throw ${
                        hero.heldObject.kind === "clay_pot"
                          ? "Pot"
                          : hero.heldObject.kind === "light_rock"
                          ? "Rock"
                          : "Bomb"
                      }!`
                    : "Lift / Throw"}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  hero.heldObject?.kind === "bomb"
                    ? "gear-slot-active"
                    : (hero.maxBombs ?? 0) <= 0
                    ? "gear-slot-locked"
                    : (hero.bombs ?? 0) > 0
                    ? "gear-slot-owned"
                    : "gear-slot-warn"
                }`}
                title={
                  (hero.maxBombs ?? 0) > 0
                    ? "Press B or 6 to place or throw a Bomb and shatter Cracked Boulders!"
                    : "Undiscovered Supply — Kept by sappers and merchants."
                }
              >
                <span className="gear-key">B</span>
                <span className="gear-name">
                  {(hero.maxBombs ?? 0) <= 0
                    ? "??? Relic"
                    : `Bombs (${hero.bombs ?? 0}/${hero.maxBombs})`}
                </span>
              </div>

              <div
                className={`gear-slot ${
                  hero.hasBow && hero.arrows > 0
                    ? "gear-slot-owned"
                    : hero.hasBow
                    ? "gear-slot-warn"
                    : "gear-slot-locked"
                }`}
                title="Press E or 2 to fire an Arrow (requires Bow + Arrows)"
              >
                <span className="gear-key">E</span>
                <span className="gear-name">
                  {hero.hasBow
                    ? `Bow (${hero.arrows}${
                        (hero.bowRuneTier ?? 0) === 2
                          ? " • 3x✦"
                          : (hero.bowRuneTier ?? 0) === 1
                          ? " • 3x"
                          : ""
                      })`
                    : `Arrows: ${hero.arrows}`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => useBottleSlot((hero.bottles ?? []).findIndex((b) => b !== "empty"))}
                className={`gear-slot gear-slot-btn ${
                  (hero.bottles ?? []).length === 0
                    ? "gear-slot-locked"
                    : filledBottlesCount > 0
                    ? "gear-slot-owned"
                    : "gear-slot-warn"
                }`}
                title="Press V or 5 to use your first filled Glass Bottle (Potion, Fairy, or Golden Bee). Purchase Empty Bottles at Bramble's Shop (120 Rupees)!"
              >
                <span className="gear-key">V</span>
                <span className="gear-name">
                  {(hero.bottles ?? []).length === 0
                    ? "Bottles (0)"
                    : `Bottles (${filledBottlesCount}/${(hero.bottles ?? []).length})`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Unity-Style Play / Map Editor Toolbar + Contextual Prompt + Dark Room / Timed Torch Badges + Boss Health Bar */}
        <div className="hud-center-stack">
          <div className="unity-mode-bar">
            <button
              type="button"
              onClick={() => setEditorMode(false)}
              className={`unity-mode-btn ${!editorMode ? "unity-mode-play-active" : ""}`}
              title="Play the game live in real time"
            >
              ▶ Play Live
            </button>
            <button
              type="button"
              onClick={() => setEditorMode(true)}
              className={`unity-mode-btn ${editorMode ? "unity-mode-edit-active" : ""}`}
              title="Pause game and open the 3D Map Editor (Shortcut: Tab or F2)"
            >
              ⏸ Map Editor
            </button>
            <button
              type="button"
              onClick={() => {
                resetPlaySimulation();
                showEditorToast("Simulation reset to authored spawn positions!");
              }}
              className="unity-sim-reset-btn"
              title="Reset enemy HP, positions, and rupees to authored map spawns"
            >
              ↺ Reset Sim
            </button>
          </div>

          {inDarkHall && (
            <div
              className="hud-panel"
              style={{
                padding: "5px 13px",
                borderRadius: "999px",
                border:
                  hallLightRatio >= 1
                    ? "1px solid rgba(116, 255, 178, 0.55)"
                    : "1px solid rgba(255, 178, 92, 0.55)",
                background: "rgba(14, 16, 28, 0.92)",
                color: hallLightRatio >= 1 ? "#9effc6" : "#ffd699",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
              }}
            >
              {hallLightRatio >= 1
                ? `🕯 Dark Archery Crypt Illuminated (${litHallTorchesCount}/${hallTorches.length} Lanterns Lit) — Shoot South Eye Statue with Bow (E)!`
                : `🕯 Shrouded Archery Crypt (${litHallTorchesCount}/${hallTorches.length} Lanterns Lit) — Light Corner Lanterns with Flame Rod (R) to See Spikes & Eye Statue!`}
            </div>
          )}

          {!editorMode &&
            phase === "playing" &&
            litTimedTorches.length > 0 &&
            !timedSquareSolved &&
            minTimedLeft < 90 && (
              <div
                className="hud-panel"
                style={{
                  padding: "5px 14px",
                  borderRadius: "999px",
                  border: "1px solid rgba(82, 224, 255, 0.65)",
                  background: "rgba(12, 24, 38, 0.92)",
                  color: "#8ceeff",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                }}
              >
                🔥 Central Hub Lanterns: {litTimedTorches.length}/{zoneTimedTorches.length} Lit •{" "}
                {minTimedLeft.toFixed(1)}s before extinguish!
              </div>
            )}

          {!editorMode && phase === "playing" && hero.interactPrompt && (
            <div
              className="hud-panel"
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(255, 212, 121, 0.55)",
                background: "rgba(18, 22, 34, 0.9)",
                color: "#ffe49e",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.03em",
                boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
              }}
            >
              {hero.interactPrompt}
            </div>
          )}

          {!editorMode && phase === "playing" && zone === "rift" && (
            <div
              className="hud-panel"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 12px",
                padding: "6px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(196, 114, 255, 0.65)",
                background: "rgba(18, 12, 34, 0.94)",
                color: "#eed4ff",
                fontSize: "0.78rem",
                fontWeight: 700,
                boxShadow: "0 8px 22px rgba(0,0,0,0.55)",
              }}
            >
              <span style={{ color: "#e09eff", fontWeight: 800 }}>
                🌀 Depth {flags.riftDepth ?? 1}: {flags.riftBiomeTitle ?? "Abyssal Labyrinth"}
              </span>
              <span style={{ color: "#ffd978" }}>
                • {flags.riftEliteAffix ?? "Cursed Pack"}
              </span>
              <span>
                • Monsters:{" "}
                <strong style={{ color: "#9ef6ff" }}>
                  {
                    enemies.filter(
                      (e) => e.zone === "rift" && e.kind !== "boss" && e.state !== "dead"
                    ).length
                  }
                </strong>
              </span>
              <span>
                • Shrine:{" "}
                <strong style={{ color: flags.riftShrineClaimed ? "#7affaa" : "#ffe694" }}>
                  {flags.riftShrineClaimed ? "✓ Blessed" : "✦ Active"}
                </strong>
              </span>
              <span>
                • Vault:{" "}
                <strong style={{ color: flags.riftVaultChestOpened ? "#7affaa" : "#ffe694" }}>
                  {flags.riftVaultChestOpened ? "✓ Looted" : "✦ Sealed"}
                </strong>
              </span>
              <span>
                • Guardian:{" "}
                <strong style={{ color: flags.riftBossDefeated ? "#7affaa" : "#ff6b8b" }}>
                  {flags.riftBossDefeated ? "✓ Slain" : "☠ Alive"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => enterProceduralRift((flags.riftDepth ?? 1) + 1)}
                className="char-equip-btn"
                style={{
                  background: flags.riftBossDefeated
                    ? "linear-gradient(180deg, #b85cff 0%, #6d24b8 100%)"
                    : "rgba(180, 92, 255, 0.2)",
                  borderColor: "rgba(210, 140, 255, 0.7)",
                  color: "#ffffff",
                  padding: "3px 9px",
                  fontSize: "0.72rem",
                }}
                title="Generate and descend into the next deeper procedural Rift floor!"
              >
                🌀 Descend to Floor {(flags.riftDepth ?? 1) + 1}
              </button>
              <button
                type="button"
                onClick={() => setRiftOpen(true)}
                className="char-equip-btn"
                style={{
                  padding: "3px 9px",
                  fontSize: "0.72rem",
                }}
                title="Open the Abyssal Rift Console & Chamber Blueprint (Shortcut: P)"
              >
                🗺 Rift Map (P)
              </button>
            </div>
          )}

          {!editorMode &&
            phase === "playing" &&
            ((zone === "dungeon" && flags.bossAwakened && !flags.bossDefeated) ||
              (zone === "caverns" &&
                flags.cavernBossAwakened &&
                !flags.cavernBossDefeated) ||
              (zone === "citadel" &&
                flags.citadelBossAwakened &&
                !flags.citadelBossDefeated) ||
              (zone === "desert" &&
                flags.desertBossAwakened &&
                !flags.desertBossDefeated) ||
              (zone === "caldera" &&
                flags.calderaBossAwakened &&
                !flags.calderaBossDefeated) ||
              (zone === "rift" &&
                !flags.riftBossDefeated &&
                bossEnemy &&
                bossEnemy.state !== "idle" &&
                bossEnemy.state !== "dead")) &&
            bossEnemy && (
              <div className="hud-panel boss-bar-panel">
                <div className="boss-bar-header">
                  <span className="boss-name">
                    {zone === "rift"
                      ? (flags.riftBossName ?? "RIFT GUARDIAN").toUpperCase()
                      : zone === "caldera"
                      ? "PYRAX, THE MAGMA WYRM"
                      : zone === "desert"
                      ? "SKORPIUS, THE SUN-SCORPION BEHEMOTH"
                      : zone === "citadel"
                      ? "VAELKOR, THE OBSIDIAN SOVEREIGN"
                      : zone === "caverns"
                      ? "CRYOS, THE GLACIAL COLOSSUS"
                      : "IGNIS, THE ARMORED EYE-GOLEM"}
                  </span>
                  <span className="minion-tag">
                    {flags.bossState === "STUNNED" || bossEnemy.state === "stunned"
                      ? "PHASE 3: STUNNED ON FLOOR — SLASH WITH SWORD (SPACE / LMB) FOR 3X DMG!"
                      : flags.bossState === "EXPOSED_EYE"
                      ? `PHASE 2: EYE OPEN (${(flags.bossArmorTimer ?? 0).toFixed(1)}s) — SHOOT WITH BOW (E) OR BOOMERANG (Q)!`
                      : activeMinions > 0
                      ? `PHASE 1: ELEMENTAL SHELL — CRACK WITH FLAME ROD (R), HAMMER (T), OR BOMBS (B)${
                          zone === "citadel" || zone === "caldera"
                            ? " / REFLECT BOLTS (RMB)"
                            : ""
                        }! • +${activeMinions} Minion${activeMinions > 1 ? "s" : ""}`
                      : `PHASE 1: ELEMENTAL SHELL — CRACK WITH FLAME ROD (R), HAMMER (T), OR BOMBS (B)${
                          zone === "citadel" || zone === "caldera"
                            ? " / REFLECT BOLTS (RMB)"
                            : ""
                        }!`}
                  </span>
                </div>
                <div className="boss-hp-track">
                  <div
                    className="boss-hp-fill"
                    style={{
                      width: `${Math.max(0, (bossEnemy.hp / bossEnemy.maxHp) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
        </div>

        {/* Right: Rupees, Keys, Character Sheet Button, Shop Toggle, FPS, Objective, Mute */}
        <div className="hud-panel hud-right">
          <div className="hud-counters">
            <div className="counter-chip" title="Collected Rupees">
              <svg width="20" height="24" viewBox="0 0 20 26">
                <polygon
                  points="10,1 19,7 19,19 10,25 1,19 1,7"
                  fill="#29e06b"
                  stroke="#b4ffd0"
                  strokeWidth="1.5"
                />
                <polygon points="10,4 15,8 15,18 10,22 5,18 5,8" fill="#7affaa" />
              </svg>
              <span className="rupee-number">
                {hero.rupees.toString().padStart(3, "0")}
              </span>
            </div>

            <div
              className={`counter-chip ${
                flags.hasSolarKey ||
                flags.hasGlacialKey ||
                flags.hasBigKey ||
                flags.hasSmallKey ||
                hero.hasDungeonKey
                  ? "key-chip-active"
                  : flags.desertCalderaGateUnlocked ||
                    flags.frontierCitadelGateUnlocked ||
                    flags.gateUnlocked ||
                    flags.eastWingDoorUnlocked ||
                    flags.dungeonEntryUnlocked
                  ? "key-chip-used"
                  : "key-chip-empty"
              }`}
              title="Progression Key Status"
            >
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle
                  cx="8"
                  cy="12"
                  r="5"
                  fill="none"
                  stroke={
                    flags.hasSolarKey ||
                    flags.hasGlacialKey ||
                    flags.hasBigKey ||
                    flags.hasSmallKey ||
                    hero.hasDungeonKey ||
                    flags.gateUnlocked
                      ? "#ffd24c"
                      : "#6c6a7c"
                  }
                  strokeWidth="2.4"
                />
                <path
                  d="M13 12H22M18 12V16M21 12V15"
                  stroke={
                    flags.hasSolarKey ||
                    flags.hasGlacialKey ||
                    flags.hasBigKey ||
                    flags.hasSmallKey ||
                    hero.hasDungeonKey ||
                    flags.gateUnlocked
                      ? "#ffd24c"
                      : "#6c6a7c"
                  }
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
              <span className="key-status-text">
                {flags.hasSolarKey && !flags.desertCalderaGateUnlocked
                  ? "Solar Key"
                  : flags.hasGlacialKey && !flags.frontierCitadelGateUnlocked
                  ? "Glacial Key"
                  : flags.hasBigKey
                  ? "Big Boss Key"
                  : flags.hasSmallKey
                  ? "Small Key (1)"
                  : hero.hasDungeonKey && !flags.dungeonEntryUnlocked
                  ? "Entry Key"
                  : flags.desertCalderaGateUnlocked
                  ? "Caldera Open"
                  : flags.frontierCitadelGateUnlocked
                  ? "Citadel Open"
                  : flags.gateUnlocked
                  ? "Boss Gate Open"
                  : flags.eastWingDoorUnlocked
                  ? "East Wing Open"
                  : "No Key"}
              </span>
            </div>

            {phase === "playing" && !editorMode && (
              <>
                <button
                  type="button"
                  onClick={toggleWayfinder}
                  className={`char-toggle-btn ${wayfinderActive ? "active" : ""}`}
                  style={
                    wayfinderActive
                      ? {
                          borderColor: "rgba(255, 214, 92, 0.85)",
                          background: "rgba(64, 48, 12, 0.92)",
                          color: "#ffe896",
                        }
                      : undefined
                  }
                  title="Toggle the 3D Golden Wayfinder Guiding Path toward your next lead (Shortcut: N)"
                >
                  {wayfinderActive ? "✦ Guide: ON (N)" : "✦ Guide Path (N)"}
                </button>
                <button
                  type="button"
                  onClick={() => setQuestLogOpen(!questLogOpen)}
                  className={`char-toggle-btn ${questLogOpen ? "active" : ""}`}
                  title="Open the Spoiler-Free Quest Chronicle & Rumor Log (Shortcut: L)"
                >
                  📜 Quests (L)
                </button>
                <button
                  type="button"
                  onClick={() => setAtlasOpen(!atlasOpen)}
                  className={`char-toggle-btn ${atlasOpen ? "active" : ""}`}
                  title="Open the Interactive World Atlas & Fast-Travel Warp Network (Shortcut: M)"
                >
                  🗺 Atlas (M)
                </button>
                <button
                  type="button"
                  onClick={() => setForgeOpen(!forgeOpen)}
                  className={`char-toggle-btn ${forgeOpen ? "active" : ""}`}
                  title="Open Master Smith Torvin's Runic Forge & Weapon Enchantments (Shortcut: U)"
                >
                  ⚒ Forge ({hero.monsterCores ?? 0}✦)
                </button>
                <button
                  type="button"
                  onClick={() => setRiftOpen(!riftOpen)}
                  className={`char-toggle-btn ${riftOpen || zone === "rift" ? "active" : ""}`}
                  style={
                    zone === "rift"
                      ? {
                          borderColor: "rgba(196, 114, 255, 0.85)",
                          background: "rgba(48, 18, 76, 0.92)",
                          color: "#eabfff",
                        }
                      : undefined
                  }
                  title="Open the Diablo-Style Procedural Abyssal Rift Dungeon Console (Shortcut: P)"
                >
                  🌀 Rift {flags.riftDepth ? `(F${flags.riftDepth})` : "(P)"}
                </button>
                <button
                  type="button"
                  onClick={() => setCharacterOpen(!characterOpen)}
                  className={`char-toggle-btn ${characterOpen ? "active" : ""}`}
                  title="Open Character Equipment, Tunics, Boots & Glass Bottles (Shortcut: C or I)"
                >
                  ⚔ Gear (C)
                </button>
              </>
            )}

            {phase === "playing" && !editorMode && nearShop && (
              <button
                type="button"
                onClick={() => setShopOpen(!shopOpen)}
                className="shop-toggle-btn"
              >
                {shopOpen ? "Close Shop" : "Open Shop"}
              </button>
            )}

            <div className="fps-chip" title="Frames Per Second">
              <span className="fps-value">{fps}</span>
              <span className="fps-label">FPS</span>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              className="mute-btn"
              title={muted ? "Unmute Audio" : "Mute Audio"}
            >
              {muted ? "SFX: OFF" : "SFX: ON"}
            </button>
          </div>

          <div className="objective-line">
            {currentObjective}
            {wayfinderActive && !editorMode && (
              <span
                style={{
                  display: "inline-block",
                  marginLeft: "8px",
                  color: "#7ef4ff",
                  fontWeight: 700,
                }}
              >
                • ✦ Guiding to: {wayfinderRoute.destLabel}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================
          UNITY-3D-STYLE MAP EDITOR WORKSPACE (WHEN editorMode IS TRUE)
         ========================================================= */}
      {editorMode && (
        <div className="editor-workspace">
          {/* LEFT DOCK: TOOLS, MAP ZONE SWITCHER & ASSET BROWSER */}
          <aside className="editor-dock editor-left-dock">
            <div className="editor-dock-header">
              <span className="editor-badge">UNITY-STYLE SCENE EDITOR</span>
              <div className="editor-zone-switch" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setEditorZone("overworld", true)}
                  className={`zone-switch-btn ${zone === "overworld" ? "active" : ""}`}
                >
                  Hub (1)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("grove", true)}
                  className={`zone-switch-btn ${zone === "grove" ? "active" : ""}`}
                >
                  Grove (1B)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("dungeon", true)}
                  className={`zone-switch-btn ${zone === "dungeon" ? "active" : ""}`}
                >
                  Sanctum (2)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("frontier", true)}
                  className={`zone-switch-btn ${zone === "frontier" ? "active" : ""}`}
                >
                  Highlands (3)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("caverns", true)}
                  className={`zone-switch-btn ${zone === "caverns" ? "active" : ""}`}
                >
                  Caverns (4)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("citadel", true)}
                  className={`zone-switch-btn ${zone === "citadel" ? "active" : ""}`}
                >
                  Citadel (5)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("desert", true)}
                  className={`zone-switch-btn ${zone === "desert" ? "active" : ""}`}
                >
                  Oasis (6)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("caldera", true)}
                  className={`zone-switch-btn ${zone === "caldera" ? "active" : ""}`}
                >
                  Caldera (7)
                </button>
              </div>
            </div>

            {/* Editor Tool Strip */}
            <div className="editor-section-title">SCENE TOOLS</div>
            <div className="editor-tools-grid">
              <button
                type="button"
                onClick={() => setEditorTool("select")}
                className={`editor-tool-btn ${editorTool === "select" ? "active" : ""}`}
              >
                ✥ Select / Drag
              </button>
              <button
                type="button"
                onClick={() => setEditorTool("place")}
                className={`editor-tool-btn ${editorTool === "place" ? "active" : ""}`}
              >
                ＋ Place Object
              </button>
              <button
                type="button"
                onClick={() => setEditorTool("terrain")}
                className={`editor-tool-btn ${editorTool === "terrain" ? "active" : ""}`}
              >
                ⛰ Terrain Brush
              </button>
              <button
                type="button"
                onClick={() => setEditorTool("delete")}
                className={`editor-tool-btn editor-tool-danger ${
                  editorTool === "delete" ? "active" : ""
                }`}
              >
                ✕ Eraser
              </button>
            </div>

            {/* Terrain Brush Sub-Panel when Terrain Tool is Active */}
            {editorTool === "terrain" ? (
              <div className="terrain-brush-panel">
                <div className="editor-section-title">TERRAIN SCULPT &amp; PAINT BRUSH</div>
                <div className="terrain-modes-grid">
                  {(
                    [
                      { id: "raise", label: "▲ Raise Hill" },
                      { id: "lower", label: "▼ Lower Valley" },
                      { id: "flatten", label: "▬ Flatten (Y=0)" },
                      { id: "paint", label: "🎨 Paint Surface" },
                    ] as Array<{ id: TerrainBrushMode; label: string }>
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTerrainBrush({ mode: m.id })}
                      className={`terrain-mode-btn ${
                        terrainBrushMode === m.id ? "active" : ""
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <label className="editor-slider-row">
                  <span>Brush Size: {terrainBrushRadius.toFixed(1)}m</span>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={0.5}
                    value={terrainBrushRadius}
                    onChange={(e) =>
                      setTerrainBrush({ radius: parseFloat(e.target.value) })
                    }
                  />
                </label>

                <label className="editor-slider-row">
                  <span>Brush Strength: {terrainBrushStrength.toFixed(1)}x</span>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={terrainBrushStrength}
                    onChange={(e) =>
                      setTerrainBrush({ strength: parseFloat(e.target.value) })
                    }
                  />
                </label>

                {terrainBrushMode === "paint" && (
                  <div className="paint-swatches">
                    <div className="editor-section-title">SURFACE TEXTURE COLOR</div>
                    <div className="swatch-row">
                      {TERRAIN_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          onClick={() => setTerrainBrush({ color: sw.hex })}
                          className={`swatch-btn ${
                            terrainPaintColor === sw.hex ? "active" : ""
                          }`}
                          style={{ backgroundColor: sw.hex }}
                          title={sw.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <p className="editor-hint-text">
                  Left-click and drag across the 3D ground to sculpt hills, valleys, or paint paths!
                </p>
              </div>
            ) : (
              /* Asset Browser Palette */
              <div className="asset-browser-panel">
                <div className="editor-section-title">ASSET BROWSER PALETTE</div>
                <div className="asset-tabs-row">
                  {(
                      [
                        { id: "props", label: "3D Props" },
                        { id: "monsters", label: "Monsters" },
                        { id: "rupees", label: "Pickups" },
                        { id: "portals", label: "Portals" },
                        { id: "custom", label: "3D Import" },
                      ] as Array<{ id: EditorPlaceCategory; label: string }>
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (tab.id === "props") setEditorPlaceItem("props", "pine_tree");
                          else if (tab.id === "monsters")
                            setEditorPlaceItem("monsters", "enemy:slime");
                          else if (tab.id === "rupees")
                            setEditorPlaceItem("rupees", "rupee:heart");
                          else if (tab.id === "portals")
                            setEditorPlaceItem("portals", "portal:new");
                          else
                            setEditorPlaceItem(
                              "custom",
                              `custom:${customModels[0]?.id ?? "custom-crystal-obelisk"}`
                            );
                        }}
                        className={`asset-tab-btn ${
                          editorPlaceCategory === tab.id ? "active" : ""
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="asset-items-scroll">
                    {editorPlaceCategory === "props" &&
                      PROP_PALETTE.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEditorPlaceItem("props", item.id)}
                          className={`asset-card-btn ${
                            editorPlacePrefab === item.id ? "active" : ""
                          }`}
                        >
                          <span className="asset-card-name">{item.label}</span>
                          <span className="asset-card-tag">{item.tag}</span>
                        </button>
                      ))}

                    {editorPlaceCategory === "monsters" &&
                      MONSTER_PALETTE.map((m) => (
                        <button
                          key={m.prefab}
                          type="button"
                          onClick={() => setEditorPlaceItem("monsters", m.prefab)}
                          className={`asset-card-btn ${
                            editorPlacePrefab === m.prefab ? "active" : ""
                          }`}
                        >
                          <span className="asset-card-name">{m.label}</span>
                          <span className="asset-card-tag">Wt: {m.weightLabel}</span>
                        </button>
                      ))}

                    {editorPlaceCategory === "rupees" &&
                      (
                        [
                          {
                            id: "rupee:heart",
                            label: "Recovery Heart",
                            tag: "Heal: +1 Heart",
                          },
                          { id: "rupee:green", label: "Green Rupee (+1)", tag: "Value: 1" },
                          { id: "rupee:blue", label: "Blue Rupee (+5)", tag: "Value: 5" },
                          { id: "rupee:red", label: "Red Rupee (+20)", tag: "Value: 20" },
                          {
                            id: "rupee:gold_admin",
                            label: "★ Admin Gold Rupee (+500)",
                            tag: "Admin Cheat: +500",
                          },
                        ] as const
                      ).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setEditorPlaceItem("rupees", r.id)}
                          className={`asset-card-btn ${
                            editorPlacePrefab === r.id ? "active" : ""
                          }`}
                        >
                          <span className="asset-card-name">{r.label}</span>
                          <span className="asset-card-tag">{r.tag}</span>
                        </button>
                      ))}

                  {editorPlaceCategory === "portals" && (
                    <div className="portal-browser-box">
                      <button
                        type="button"
                        onClick={() => setEditorPlaceItem("portals", "portal:new")}
                        className={`asset-card-btn ${
                          editorPlacePrefab === "portal:new" ? "active" : ""
                        }`}
                      >
                        <span className="asset-card-name">Map Transition Portal</span>
                        <span className="asset-card-tag">Link Maps</span>
                      </button>
                      <p className="editor-hint-text">
                        Click on the ground to place a Portal, then select it to configure its
                        Target Map (Overworld / Dungeon) and arrival X/Z coordinates!
                      </p>
                    </div>
                  )}

                  {editorPlaceCategory === "custom" && (
                    <div className="custom-import-box">
                      {customModels.map((cm) => {
                        const key = `custom:${cm.id}`;
                        return (
                          <button
                            key={cm.id}
                            type="button"
                            onClick={() => setEditorPlaceItem("custom", key)}
                            className={`asset-card-btn ${
                              editorPlacePrefab === key ? "active" : ""
                            }`}
                          >
                            <span className="asset-card-name">{cm.name}</span>
                            <span className="asset-card-tag">
                              {Math.floor(cm.positions.length / 3)}v Mesh
                            </span>
                          </button>
                        );
                      })}

                      <div className="import-controls-box">
                        <div className="editor-section-title">IMPORT 3D FILE (.OBJ)</div>
                        <div className="import-color-row">
                          <span>Mesh Tint:</span>
                          <input
                            type="color"
                            value={importColorHex}
                            onChange={(e) => setImportColorHex(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => objInputRef.current?.click()}
                          className="editor-action-btn editor-primary-btn"
                        >
                          ⬆ Import .OBJ 3D Model
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Save / Export Footer */}
            <div className="editor-io-row" style={{ flexWrap: "wrap", gap: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  saveMapToBrowserStorage();
                  showEditorToast("Saved all maps to browser storage (auto-saves on every edit)!");
                }}
                className="editor-io-btn"
                title="Save authored maps to browser storage"
              >
                💾 Save Map
              </button>
              <button
                type="button"
                onClick={handleExportMapFile}
                className="editor-io-btn"
                title="Download JSON backup of all maps"
              >
                ⬇ Export JSON
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="editor-io-btn"
                title="Load a previously exported Map JSON file"
              >
                ⬆ Import JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMapToDefaults();
                  showEditorToast("Restored default authored maps!");
                }}
                className="editor-io-btn"
                title="Restore built-in default maps"
              >
                ↺ Default Map
              </button>
            </div>
          </aside>

          {/* RIGHT DOCK: INSPECTOR PANEL FOR SELECTED ENTITY */}
          <aside className="editor-dock editor-right-dock">
            <div className="editor-dock-header">
              <span className="editor-badge">INSPECTOR</span>
              {editorSelected && (
                <button
                  type="button"
                  onClick={() => setEditorSelected(null)}
                  className="inspector-deselect-btn"
                >
                  Deselect
                </button>
              )}
            </div>

            {!editorSelected && (
              <div className="inspector-empty">
                <p>
                  Click any <strong>3D Prop</strong>, <strong>Monster</strong>,{" "}
                  <strong>Rupee</strong>, or <strong>Portal</strong> in the scene to inspect
                  and edit its properties.
                </p>
                <div className="inspector-shortcuts">
                  <div>
                    <strong>Left-Click + Drag:</strong> Move Selected / Paint Terrain
                  </div>
                  <div>
                    <strong>Right-Click + Drag:</strong> Orbit 3D Camera
                  </div>
                  <div>
                    <strong>WASD / Arrows:</strong> Pan Camera Across Map
                  </div>
                  <div>
                    <strong>Scroll Wheel:</strong> Zoom Camera In / Out
                  </div>
                  <div>
                    <strong>Ctrl+D / Delete:</strong> Duplicate / Delete Selected
                  </div>
                </div>
              </div>
            )}

            {/* 1. PROP INSPECTOR */}
            {selectedProp && (
              <div className="inspector-form">
                <div className="inspector-type-pill">3D PROP • {selectedProp.prefab}</div>
                <label className="inspector-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={selectedProp.name}
                    onChange={(e) =>
                      updatePropInstance(selectedProp.id, { name: e.target.value })
                    }
                  />
                </label>

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Pos X</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedProp.x}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          x: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Pos Y</span>
                    <input
                      type="number"
                      step={0.25}
                      value={selectedProp.y}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          y: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Pos Z</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedProp.z}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          z: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>

                <label className="inspector-field">
                  <span>Rotation Y ({Math.round((selectedProp.rotY * 180) / Math.PI)}°)</span>
                  <input
                    type="range"
                    min={-Math.PI}
                    max={Math.PI}
                    step={0.05}
                    value={selectedProp.rotY}
                    onChange={(e) =>
                      updatePropInstance(selectedProp.id, {
                        rotY: parseFloat(e.target.value),
                      })
                    }
                  />
                </label>

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Scale X</span>
                    <input
                      type="number"
                      step={0.2}
                      min={0.2}
                      value={selectedProp.scaleX}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          scaleX: Math.max(0.2, parseFloat(e.target.value) || 1),
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Scale Y</span>
                    <input
                      type="number"
                      step={0.2}
                      min={0.2}
                      value={selectedProp.scaleY}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          scaleY: Math.max(0.2, parseFloat(e.target.value) || 1),
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Scale Z</span>
                    <input
                      type="number"
                      step={0.2}
                      min={0.2}
                      value={selectedProp.scaleZ}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          scaleZ: Math.max(0.2, parseFloat(e.target.value) || 1),
                        })
                      }
                    />
                  </label>
                </div>

                <label className="inspector-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedProp.hasCollider}
                    onChange={(e) =>
                      updatePropInstance(selectedProp.id, {
                        hasCollider: e.target.checked,
                      })
                    }
                  />
                  <span>Solid Collision Obstacle in Play Mode</span>
                </label>

                {selectedProp.prefab === "wall_torch" && (
                  <>
                    <label className="inspector-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedProp.lit !== false}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            lit: e.target.checked,
                            litTimer: e.target.checked
                              ? selectedProp.timedDuration
                              : undefined,
                          })
                        }
                      />
                      <span>Torch Currently Lit (Shoot with Flame Rod R to Light)</span>
                    </label>
                    <label className="inspector-field">
                      <span>Timed Torch Countdown (s) (0 = Permanent)</span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={1}
                        value={selectedProp.timedDuration ?? 0}
                        onChange={(e) => {
                          const dur = Math.max(0, parseInt(e.target.value, 10) || 0);
                          updatePropInstance(selectedProp.id, {
                            timedDuration: dur > 0 ? dur : undefined,
                            litTimer: dur > 0 && selectedProp.lit ? dur : undefined,
                            timedSolved: false,
                          });
                        }}
                      />
                    </label>
                    <label className="inspector-field">
                      <span>Torch Combination Puzzle Target</span>
                      <select
                        value={selectedProp.puzzleTarget ?? "none"}
                        onChange={(e) => {
                          const val = e.target.value;
                          updatePropInstance(selectedProp.id, {
                            puzzleTarget:
                              val === "lit" || val === "unlit" ? val : undefined,
                          });
                        }}
                      >
                        <option value="none">None (Decorative / Timed Torch)</option>
                        <option value="lit">Puzzle Torch: MUST BE LIT</option>
                        <option value="unlit">Puzzle Torch: MUST BE UNLIT</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedProp.prefab === "dirt_patch" && (
                  <>
                    <label className="inspector-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedProp.dug)}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            dug: e.target.checked,
                          })
                        }
                      />
                      <span>Already Dug Up</span>
                    </label>
                    <label className="inspector-field">
                      <span>Buried Treasure (Dig with Shovel G)</span>
                      <select
                        value={selectedProp.buriedReward ?? "random"}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            buriedReward: e.target.value as BuriedRewardKind,
                          })
                        }
                      >
                        <option value="random">Random Loot Roll (Rupees / Hearts)</option>
                        <option value="blue_rupee">Blue Rupee (+5 Rupees)</option>
                        <option value="red_rupee">Red Rupee (+20 Rupees)</option>
                        <option value="heart">Recovery Heart (+1 Heart)</option>
                        <option value="bottle">Empty Glass Bottle</option>
                        <option value="red_mail">Crimson Dragon Mail (-75% DMG)</option>
                        <option value="tempered_blade">Tempered Sun-Blade (2 DMG)</option>
                        <option value="swift_boots">Swiftwind Boots (+25% Speed)</option>
                      </select>
                    </label>
                  </>
                )}

                {(selectedProp.prefab === "clay_pot" ||
                  selectedProp.prefab === "light_rock") && (
                  <>
                    <label className="inspector-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedProp.smashed)}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            smashed: e.target.checked,
                          })
                        }
                      />
                      <span>Currently Smashed</span>
                    </label>
                    <label className="inspector-field">
                      <span>Hidden Smash Reward (Lift &amp; Throw with F)</span>
                      <select
                        value={selectedProp.potReward ?? "random"}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            potReward: e.target.value as PotRewardKind,
                          })
                        }
                      >
                        <option value="random">Random Drop (Rupee / Heart / Bombs)</option>
                        <option value="small_key">Small Key (Unlocks Sanctum Gate!)</option>
                        <option value="heart">Recovery Heart (+1 Heart)</option>
                        <option value="green_rupee">Green Rupee (+1)</option>
                        <option value="blue_rupee">Blue Rupee (+5)</option>
                        <option value="red_rupee">Red Rupee (+20)</option>
                        <option value="bombs">Bomb Bundle (+3 Bombs)</option>
                        <option value="none">Empty (No Drop)</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedProp.prefab === "push_block" && (
                  <div className="inspector-xyz-grid">
                    <label className="inspector-field">
                      <span>Target Socket X</span>
                      <input
                        type="number"
                        step={0.5}
                        placeholder="Optional"
                        value={selectedProp.puzzleTargetX ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updatePropInstance(selectedProp.id, {
                            puzzleTargetX: v === "" ? undefined : parseFloat(v) || 0,
                          });
                        }}
                      />
                    </label>
                    <label className="inspector-field">
                      <span>Target Socket Z</span>
                      <input
                        type="number"
                        step={0.5}
                        placeholder="Optional"
                        value={selectedProp.puzzleTargetZ ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updatePropInstance(selectedProp.id, {
                            puzzleTargetZ: v === "" ? undefined : parseFloat(v) || 0,
                          });
                        }}
                      />
                    </label>
                  </div>
                )}

                {selectedProp.prefab === "crystal_switch" && (
                  <>
                    <label className="inspector-field">
                      <span>Current Crystal Orb Color</span>
                      <select
                        value={selectedProp.switchState ?? "blue"}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            switchState: e.target.value as "blue" | "orange",
                          })
                        }
                      >
                        <option value="blue">Blue Orb (Barriers Raised)</option>
                        <option value="orange">Orange Orb (Barriers Lowered)</option>
                      </select>
                    </label>
                    <label className="inspector-field">
                      <span>Puzzle Target Color</span>
                      <select
                        value={selectedProp.switchTarget ?? "orange"}
                        onChange={(e) =>
                          updatePropInstance(selectedProp.id, {
                            switchTarget: e.target.value as "blue" | "orange",
                          })
                        }
                      >
                        <option value="orange">Must Be ORANGE to Solve</option>
                        <option value="blue">Must Be BLUE to Solve</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedProp.prefab === "cracked_rock" && (
                  <label className="inspector-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedProp.smashed)}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          smashed: e.target.checked,
                        })
                      }
                    />
                    <span>Already Blown Up (Explode with Bomb B)</span>
                  </label>
                )}

                {(selectedProp.prefab === "briar_barrier" ||
                  selectedProp.prefab === "spiderweb_barrier") && (
                  <label className="inspector-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedProp.smashed)}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          smashed: e.target.checked,
                          burningTimer: undefined,
                        })
                      }
                    />
                    <span>Already Burned Away (Shoot with Flame Rod R)</span>
                  </label>
                )}

                {selectedProp.prefab === "eye_statue" && (
                  <label className="inspector-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedProp.eyeActivated)}
                      onChange={(e) =>
                        updatePropInstance(selectedProp.id, {
                          eyeActivated: e.target.checked,
                        })
                      }
                    />
                    <span>Eye Pierced &amp; Activated (Shoot with Bow E to Unlock Gate)</span>
                  </label>
                )}

                <div className="inspector-actions-row">
                  <button
                    type="button"
                    onClick={duplicateSelectedEntity}
                    className="editor-action-btn"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedEntity}
                    className="editor-action-btn editor-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* 2. MONSTER INSPECTOR (INCLUDING WEIGHT TUNING & ELEMENTAL / SHOCK ARMOR!) */}
            {selectedEnemy && (
              <div className="inspector-form">
                <div className="inspector-type-pill">
                  MONSTER SPAWNER • {selectedEnemy.kind.toUpperCase()}
                </div>

                <label className="inspector-field">
                  <span>Monster Type</span>
                  <select
                    value={selectedEnemy.kind}
                    onChange={(e) =>
                      updateEnemyInstance(selectedEnemy.id, {
                        kind: e.target.value as EnemyKind,
                      })
                    }
                  >
                    <option value="turret">Stone Spitter Turret (Shoots Rocks)</option>
                    <option value="slime">Poring Blob Slime</option>
                    <option value="archer">Goblin Bowman Archer</option>
                    <option value="wraith">Frost Wraith (Glacial Specter)</option>
                    <option value="bomber">Sapper Gremlin (Lobs Live Bombs)</option>
                    <option value="goblin">Moss Goblin Fighter</option>
                    <option value="minion">Shadow Minion</option>
                    <option value="burrower">Tunnel Wyrm (Unearth w/ Shovel/Bomb)</option>
                    <option value="knight">Sentinel Knight</option>
                    <option value="boss">Boss: Ignis / Cryos / Vaelkor</option>
                  </select>
                </label>

                {selectedEnemy.kind !== "boss" && (
                  <>
                    <label className="inspector-field">
                      <span>Elemental Shield / Armor (Melt/Burn with Flame Rod R)</span>
                      <select
                        value={selectedEnemy.shieldArmor ?? "none"}
                        onChange={(e) => {
                          const sa = e.target.value as EnemyShieldArmor;
                          updateEnemyInstance(selectedEnemy.id, {
                            shieldArmor: sa,
                            initialShieldArmor: sa,
                          });
                        }}
                      >
                        <option value="none">None (Normal Vulnerability)</option>
                        <option value="wood">Wooden Shield (Blocks Sword/Arrows — Burn w/ R)</option>
                        <option value="ice">Glacial Ice Armor (Blocks Sword/Arrows — Melt w/ R)</option>
                      </select>
                    </label>
                    <label className="inspector-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedEnemy.shockArmor)}
                        onChange={(e) =>
                          updateEnemyInstance(selectedEnemy.id, {
                            shockArmor: e.target.checked,
                            initialShockArmor: e.target.checked,
                          })
                        }
                      />
                      <span>Electrified / Spiked Shell (Stun for 2s w/ Boomerang Q to Slash!)</span>
                    </label>
                    <label className="inspector-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedEnemy.isBounty)}
                        onChange={(e) =>
                          updateEnemyInstance(selectedEnemy.id, {
                            isBounty: e.target.checked,
                            initialIsBounty: e.target.checked,
                          })
                        }
                      />
                      <span>Gold/Crimson Bounty Variant (Drops 5x Rupee Fountain on Death!)</span>
                    </label>
                  </>
                )}

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Spawn X</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedEnemy.x}
                      onChange={(e) =>
                        updateEnemyInstance(selectedEnemy.id, {
                          x: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Spawn Z</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedEnemy.z}
                      onChange={(e) =>
                        updateEnemyInstance(selectedEnemy.id, {
                          z: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Max HP</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={selectedEnemy.maxHp}
                      onChange={(e) => {
                        const hp = Math.max(1, parseInt(e.target.value, 10) || 1);
                        updateEnemyInstance(selectedEnemy.id, { hp, maxHp: hp });
                      }}
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Weight (Poise)</span>
                    <input
                      type="number"
                      step={0.2}
                      min={0.2}
                      max={100}
                      value={selectedEnemy.weight}
                      onChange={(e) =>
                        updateEnemyInstance(selectedEnemy.id, {
                          weight: Math.max(0.2, parseFloat(e.target.value) || 1),
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Speed</span>
                    <input
                      type="number"
                      step={0.2}
                      min={1}
                      max={15}
                      value={selectedEnemy.speed}
                      onChange={(e) =>
                        updateEnemyInstance(selectedEnemy.id, {
                          speed: Math.max(1, parseFloat(e.target.value) || 4.5),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="weight-presets-row">
                  <button
                    type="button"
                    onClick={() => updateEnemyInstance(selectedEnemy.id, { weight: 0.5 })}
                    className="weight-preset-btn"
                  >
                    Light (0.5)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEnemyInstance(selectedEnemy.id, { weight: 2.0 })}
                    className="weight-preset-btn"
                  >
                    Med (2.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEnemyInstance(selectedEnemy.id, { weight: 6.5 })}
                    className="weight-preset-btn"
                  >
                    Heavy (6.5)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEnemyInstance(selectedEnemy.id, { weight: 100 })}
                    className="weight-preset-btn"
                  >
                    Boss (100)
                  </button>
                </div>

                <div className="inspector-actions-row">
                  <button
                    type="button"
                    onClick={duplicateSelectedEntity}
                    className="editor-action-btn"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedEntity}
                    className="editor-action-btn editor-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* 3. PICKUP INSPECTOR */}
            {selectedRupee && (
              <div className="inspector-form">
                <div className="inspector-type-pill">
                  {selectedRupee.tier === "heart"
                    ? "HEART PICKUP"
                    : `RUPEE PICKUP (+${selectedRupee.value})`}
                </div>
                <label className="inspector-field">
                  <span>Pickup Type</span>
                  <select
                    value={selectedRupee.tier}
                    onChange={(e) => {
                      const tier = e.target.value as RupeeTier;
                      const value =
                        tier === "heart"
                          ? 2
                          : tier === "red"
                            ? 20
                            : tier === "blue"
                              ? 5
                              : 1;
                      updateRupeeInstance(selectedRupee.id, { tier, value });
                    }}
                  >
                    <option value="green">Green Rupee (+1)</option>
                    <option value="blue">Blue Rupee (+5)</option>
                    <option value="red">Red / Gold Rupee (+20 or Custom)</option>
                    <option value="heart">Recovery Heart (+1 Heart)</option>
                  </select>
                </label>

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Rupee / Heal Value</span>
                    <input
                      type="number"
                      min={1}
                      max={9999}
                      step={10}
                      value={selectedRupee.value}
                      onChange={(e) =>
                        updateRupeeInstance(selectedRupee.id, {
                          value: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Pos X</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedRupee.x}
                      onChange={(e) =>
                        updateRupeeInstance(selectedRupee.id, {
                          x: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Pos Z</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedRupee.z}
                      onChange={(e) =>
                        updateRupeeInstance(selectedRupee.id, {
                          z: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="inspector-actions-row">
                  <button
                    type="button"
                    onClick={duplicateSelectedEntity}
                    className="editor-action-btn"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedEntity}
                    className="editor-action-btn editor-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* 4. PORTAL & MAP LINK INSPECTOR */}
            {selectedPortal && (
              <div className="inspector-form">
                <div className="inspector-type-pill">MAP TRANSITION PORTAL</div>
                <label className="inspector-field">
                  <span>Destination Banner Title</span>
                  <input
                    type="text"
                    value={selectedPortal.label}
                    onChange={(e) =>
                      updatePortalInstance(selectedPortal.id, { label: e.target.value })
                    }
                  />
                </label>
                <label className="inspector-field">
                  <span>Destination Subtitle</span>
                  <input
                    type="text"
                    value={selectedPortal.sublabel}
                    onChange={(e) =>
                      updatePortalInstance(selectedPortal.id, { sublabel: e.target.value })
                    }
                  />
                </label>

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Portal X</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedPortal.x}
                      onChange={(e) =>
                        updatePortalInstance(selectedPortal.id, {
                          x: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Portal Z</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedPortal.z}
                      onChange={(e) =>
                        updatePortalInstance(selectedPortal.id, {
                          z: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Radius</span>
                    <input
                      type="number"
                      step={0.2}
                      min={1.0}
                      max={6.0}
                      value={selectedPortal.radius}
                      onChange={(e) =>
                        updatePortalInstance(selectedPortal.id, {
                          radius: Math.max(1, parseFloat(e.target.value) || 2),
                        })
                      }
                    />
                  </label>
                </div>

                <label className="inspector-field">
                  <span>Target Destination Map</span>
                  <select
                    value={selectedPortal.targetZone}
                    onChange={(e) =>
                      updatePortalInstance(selectedPortal.id, {
                        targetZone: e.target.value as ZoneId,
                      })
                    }
                  >
                    <option value="overworld">Map 1: Crossroads Village Hub</option>
                    <option value="grove">Map 1B: Whispering Forest Grove (West Exit)</option>
                    <option value="dungeon">Map 2: Sunken Sanctum (First Dungeon)</option>
                    <option value="frontier">Map 3: Elderwood Highlands &amp; Quarry</option>
                    <option value="caverns">Map 4: Frostpeak Caverns &amp; Reliquary</option>
                    <option value="citadel">Map 5: The Obsidian Citadel</option>
                    <option value="desert">Map 6: Sunscorched Oasis &amp; Shifting Sands</option>
                    <option value="caldera">Map 7: Skyward Caldera &amp; Dragon&apos;s Peak</option>
                  </select>
                </label>

                <div className="inspector-xyz-grid">
                  <label className="inspector-field">
                    <span>Arrival X</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedPortal.targetX}
                      onChange={(e) =>
                        updatePortalInstance(selectedPortal.id, {
                          targetX: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="inspector-field">
                    <span>Arrival Z</span>
                    <input
                      type="number"
                      step={0.5}
                      value={selectedPortal.targetZ}
                      onChange={(e) =>
                        updatePortalInstance(selectedPortal.id, {
                          targetZ: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>

                <label className="inspector-field">
                  <span>Portal Ring Color</span>
                  <select
                    value={selectedPortal.color}
                    onChange={(e) =>
                      updatePortalInstance(selectedPortal.id, {
                        color: e.target.value as
                          | "cyan"
                          | "gold"
                          | "purple"
                          | "emerald"
                          | "crimson",
                      })
                    }
                  >
                    <option value="cyan">Mystic Cyan</option>
                    <option value="purple">Arcane Purple</option>
                    <option value="gold">Radiant Gold</option>
                    <option value="emerald">Emerald Green</option>
                    <option value="crimson">Blood Crimson</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setEditorZone(
                      selectedPortal.targetZone,
                      true,
                      selectedPortal.targetX,
                      selectedPortal.targetZ
                    )
                  }
                  className="editor-action-btn editor-primary-btn"
                >
                  ➔ Jump Editor to Destination
                </button>

                <div className="inspector-actions-row">
                  <button
                    type="button"
                    onClick={duplicateSelectedEntity}
                    className="editor-action-btn"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelectedEntity}
                    className="editor-action-btn editor-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* =========================================================
          SPOILER-FREE QUEST CHRONICLE & WAYFINDER GUIDE MODAL (SHORTCUT: L)
         ========================================================= */}
      {phase === "playing" && !editorMode && questLogOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card char-sheet-card" style={{ maxWidth: "1020px" }}>
            <div className="shop-header">
              <div>
                <div className="shop-pill">WAYFINDER JOURNAL • ZERO SPOILERS</div>
                <h2 className="shop-title">QUEST CHRONICLE &amp; REGIONAL RUMORS</h2>
              </div>
              <div className="char-summary-badges" style={{ alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={toggleWayfinder}
                  className="shop-buy-btn"
                  style={{
                    padding: "6px 13px",
                    fontSize: "0.78rem",
                    background: wayfinderActive
                      ? "linear-gradient(180deg, #ffe074 0%, #c98a14 100%)"
                      : "rgba(38, 46, 68, 0.9)",
                    color: wayfinderActive ? "#1a1306" : "#d8e6ff",
                  }}
                >
                  {wayfinderActive ? "✦ 3D Golden Trail: ON (N)" : "✦ Summon Golden Trail (N)"}
                </button>
                {pinnedQuestId && (
                  <button
                    type="button"
                    onClick={() => setPinnedQuestId(null)}
                    className="shop-close-btn"
                    style={{ padding: "6px 11px", fontSize: "0.75rem" }}
                  >
                    ↺ Auto-Track Main Story
                  </button>
                )}
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.75rem",
                    color: "#a8c0e0",
                    cursor: "pointer",
                    padding: "4px 9px",
                    borderRadius: "8px",
                    background: "rgba(20, 26, 42, 0.75)",
                    border: "1px solid rgba(120, 150, 200, 0.25)",
                  }}
                  title="Unveil future chapters and enable 1-click Playtest Teleport to any objective"
                >
                  <input
                    type="checkbox"
                    checked={revealAllChapters}
                    onChange={(e) => setRevealAllChapters(e.target.checked)}
                  />
                  <span>Playtest: Reveal All &amp; Teleport</span>
                </label>
              </div>
            </div>

            <div
              style={{
                marginBottom: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(255, 210, 86, 0.1)",
                border: "1px solid rgba(255, 210, 86, 0.38)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: "#ffd978",
                    textTransform: "uppercase",
                  }}
                >
                  Currently Guiding • {activeQuest.regionLabel}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff6d6" }}>
                  {activeQuest.chapterNumber ? `${activeQuest.chapterNumber}: ` : "Rumor: "}
                  {activeQuest.title}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#d6e2f5", marginTop: "2px" }}>
                  {activeQuest.summary}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "0.78rem", color: "#8ceeff" }}>
                <div>
                  Next Waypoint: <strong>{wayfinderRoute.destLabel}</strong>
                </div>
                {wayfinderRoute.isPortalHop && (
                  <div style={{ color: "#ffd978", fontSize: "0.73rem" }}>
                    (Routes through connecting portal in current map)
                  </div>
                )}
              </div>
            </div>

            <div className="char-equip-grid" style={{ gridTemplateColumns: "1.15fr 0.95fr" }}>
              {/* COLUMN 1: MAIN STORY CHAPTERS (ACTS I - VII) */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">MAIN CHRONICLE (CHAPTERS I – VII)</span>
                  <span className="char-slot-sub">Spoiler-Free Story Progression</span>
                </div>
                <div
                  className="char-options-col"
                  style={{ maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}
                >
                  {questChronicle.chapters.map((ch) => {
                    const isHiddenFuture = ch.status === "shrouded" && !revealAllChapters;
                    const isTracked = activeQuest.id === ch.id;
                    const hintExpanded = expandedHintIds.includes(ch.id);

                    if (isHiddenFuture) {
                      return (
                        <div
                          key={ch.id}
                          className="char-option-card char-option-locked"
                          style={{ opacity: 0.55 }}
                        >
                          <div className="char-option-top">
                            <div>
                              <div className="char-option-name">
                                {ch.chapterNumber}: Unwritten Chapter
                              </div>
                              <div className="char-option-stats">
                                Shrouded in Mystery • Follow current leads to unveil
                              </div>
                            </div>
                            <span className="char-locked-pill">SHROUDED</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={ch.id}
                        className={`char-option-card ${isTracked ? "char-option-equipped" : ""}`}
                      >
                        <div className="char-option-top">
                          <div>
                            <div className="char-option-name">
                              {ch.chapterNumber}: {ch.title}
                            </div>
                            <div className="char-option-stats">{ch.regionLabel}</div>
                          </div>
                          {ch.status === "completed" ? (
                            <span
                              className="char-equipped-pill"
                              style={{
                                background: "rgba(46, 214, 118, 0.2)",
                                color: "#7bffb5",
                                borderColor: "rgba(46, 214, 118, 0.5)",
                              }}
                            >
                              ✓ COMPLETED
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPinnedQuestId(ch.id);
                                  setQuestLogOpen(false);
                                }}
                                className="char-equip-btn"
                              >
                                {isTracked && wayfinderActive ? "✦ Guiding" : "✦ Guide Path"}
                              </button>
                              {revealAllChapters && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditorZone(ch.targetZone, true, ch.targetX, ch.targetZ);
                                    setPinnedQuestId(ch.id);
                                    setQuestLogOpen(false);
                                  }}
                                  className="char-equip-btn"
                                  style={{
                                    background: "rgba(92, 214, 255, 0.2)",
                                    borderColor: "rgba(92, 214, 255, 0.55)",
                                    color: "#9ef0ff",
                                  }}
                                  title="Playtest: Teleport Hero near this chapter's objective"
                                >
                                  ⚡ Jump
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="char-option-desc">{ch.summary}</p>
                        {ch.status !== "completed" && (
                          <div style={{ marginTop: "6px" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedHintIds((prev) =>
                                  prev.includes(ch.id)
                                    ? prev.filter((x) => x !== ch.id)
                                    : [...prev, ch.id]
                                )
                              }
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ffd978",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {hintExpanded ? "▾ Hide Wayfinder Whisper" : "▸ Consult Wayfinder Whisper"}
                            </button>
                            {hintExpanded && (
                              <div
                                style={{
                                  marginTop: "4px",
                                  padding: "6px 9px",
                                  borderRadius: "6px",
                                  background: "rgba(14, 22, 36, 0.75)",
                                  border: "1px solid rgba(255, 214, 102, 0.3)",
                                  color: "#ffe8a3",
                                  fontSize: "0.76rem",
                                }}
                              >
                                {ch.wayfinderHint}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 2: REGIONAL RUMORS & SIDE MYSTERIES */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">REGIONAL RUMORS &amp; MYSTERIES</span>
                  <span className="char-slot-sub">Optional Lore Leads &amp; Hidden Vaults</span>
                </div>
                <div
                  className="char-options-col"
                  style={{ maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}
                >
                  {questChronicle.rumors.map((rm) => {
                    const isTracked = activeQuest.id === rm.id;
                    const hintExpanded = expandedHintIds.includes(rm.id);
                    return (
                      <div
                        key={rm.id}
                        className={`char-option-card ${isTracked ? "char-option-equipped" : ""}`}
                      >
                        <div className="char-option-top">
                          <div>
                            <div className="char-option-name">{rm.title}</div>
                            <div className="char-option-stats">{rm.regionLabel}</div>
                          </div>
                          {rm.status === "completed" ? (
                            <span
                              className="char-equipped-pill"
                              style={{
                                background: "rgba(46, 214, 118, 0.2)",
                                color: "#7bffb5",
                                borderColor: "rgba(46, 214, 118, 0.5)",
                              }}
                            >
                              ✓ DISCOVERED
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPinnedQuestId(rm.id);
                                  setQuestLogOpen(false);
                                }}
                                className="char-equip-btn"
                              >
                                {isTracked && wayfinderActive ? "✦ Guiding" : "✦ Guide Path"}
                              </button>
                              {revealAllChapters && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditorZone(rm.targetZone, true, rm.targetX, rm.targetZ);
                                    setPinnedQuestId(rm.id);
                                    setQuestLogOpen(false);
                                  }}
                                  className="char-equip-btn"
                                  style={{
                                    background: "rgba(92, 214, 255, 0.2)",
                                    borderColor: "rgba(92, 214, 255, 0.55)",
                                    color: "#9ef0ff",
                                  }}
                                  title="Playtest: Teleport Hero near this rumor"
                                >
                                  ⚡ Jump
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="char-option-desc">{rm.summary}</p>
                        {rm.status !== "completed" && (
                          <div style={{ marginTop: "6px" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedHintIds((prev) =>
                                  prev.includes(rm.id)
                                    ? prev.filter((x) => x !== rm.id)
                                    : [...prev, rm.id]
                                )
                              }
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ffd978",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {hintExpanded ? "▾ Hide Whisper" : "▸ Consult Wayfinder Whisper"}
                            </button>
                            {hintExpanded && (
                              <div
                                style={{
                                  marginTop: "4px",
                                  padding: "6px 9px",
                                  borderRadius: "6px",
                                  background: "rgba(14, 22, 36, 0.75)",
                                  border: "1px solid rgba(255, 214, 102, 0.3)",
                                  color: "#ffe8a3",
                                  fontSize: "0.76rem",
                                }}
                              >
                                {rm.wayfinderHint}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shop-footer">
              <span className="shop-hint">
                Press <strong>N</strong> anytime to toggle the 3D Golden Wayfinder Trail, or{" "}
                <strong>L</strong> / <strong>Esc</strong> to close this Chronicle.
              </span>
              <button
                type="button"
                onClick={() => setQuestLogOpen(false)}
                className="shop-close-btn"
              >
                Resume Adventure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          INTERACTIVE WORLD ATLAS & FAST-TRAVEL WARP MONOLITHS MODAL (SHORTCUT: M)
         ========================================================= */}
      {phase === "playing" && !editorMode && atlasOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card char-sheet-card" style={{ maxWidth: "1060px" }}>
            <div className="shop-header">
              <div>
                <div className="shop-pill">CARTOGRAPHER&apos;S SANCTUM • WAYPOINT NETWORK</div>
                <h2 className="shop-title">WORLD ATLAS &amp; FAST-TRAVEL MONOLITHS</h2>
              </div>
              <div className="char-summary-badges" style={{ alignItems: "center", gap: "8px" }}>
                <span className="char-stat-badge">
                  Regions Charted:{" "}
                  <strong>
                    {unlockAllWarpsPlaytest
                      ? "8 / 8"
                      : `${(flags.discoveredZones ?? ["overworld"]).length} / 8`}
                  </strong>
                </span>
                <span className="char-stat-badge">
                  Warp Monoliths Awakened:{" "}
                  <strong>
                    {unlockAllWarpsPlaytest
                      ? "8 / 8"
                      : `${(flags.awakenedWarpZones ?? ["overworld"]).length} / 8`}
                  </strong>
                </span>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.75rem",
                    color: "#a8c0e0",
                    cursor: "pointer",
                    padding: "4px 9px",
                    borderRadius: "8px",
                    background: "rgba(20, 26, 42, 0.75)",
                    border: "1px solid rgba(120, 150, 200, 0.25)",
                  }}
                  title="Playtest: Reveal all 8 regions and allow instant Fast-Travel to any Warp Monolith"
                >
                  <input
                    type="checkbox"
                    checked={unlockAllWarpsPlaytest}
                    onChange={(e) => setUnlockAllWarpsPlaytest(e.target.checked)}
                  />
                  <span>Playtest: Unlock All Warps</span>
                </label>
              </div>
            </div>

            {(() => {
              const allZones: ZoneId[] = [
                "grove",
                "overworld",
                "dungeon",
                "frontier",
                "caverns",
                "citadel",
                "desert",
                "caldera",
              ];
              const discoveredList = flags.discoveredZones ?? ["overworld"];
              const awakenedList = flags.awakenedWarpZones ?? ["overworld"];
              const graphEdges: Array<[ZoneId, ZoneId]> = [
                ["grove", "overworld"],
                ["overworld", "dungeon"],
                ["overworld", "frontier"],
                ["dungeon", "frontier"],
                ["frontier", "caverns"],
                ["frontier", "citadel"],
                ["frontier", "desert"],
                ["citadel", "desert"],
                ["desert", "caldera"],
              ];

              const selMeta = WARP_STONE_META[selectedAtlasZone];
              const selDiscovered =
                unlockAllWarpsPlaytest || discoveredList.includes(selectedAtlasZone);
              const selAwakened =
                unlockAllWarpsPlaytest || awakenedList.includes(selectedAtlasZone);
              const selProps = mapProps.filter((p) => p.zone === selectedAtlasZone);
              const selPortals = portals.filter((pt) => pt.zone === selectedAtlasZone);
              const selEnemies = enemies.filter(
                (e) => e.zone === selectedAtlasZone && e.state !== "dead" && !e.burrowed
              );
              const toTac = (coord: number, inv = false) => {
                const norm = (coord + 40) / 80;
                const clamped = Math.max(0.03, Math.min(0.97, norm));
                return Math.round((inv ? 1 - clamped : clamped) * 220);
              };

              return (
                <div className="char-equip-grid" style={{ gridTemplateColumns: "1.2fr 0.9fr" }}>
                  {/* LEFT COLUMN: 8-REGION INTERCONNECTED WORLD GRAPH */}
                  <div className="char-slot-panel">
                    <div className="char-slot-header">
                      <span className="char-slot-title">INTERCONNECTED REALM GRAPH (8 REGIONS)</span>
                      <span className="char-slot-sub">
                        Click any region to inspect its tactical radar &amp; Warp Monolith
                      </span>
                    </div>

                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "330px",
                        borderRadius: "12px",
                        background:
                          "radial-gradient(circle at 50% 45%, rgba(26, 42, 72, 0.92) 0%, rgba(10, 14, 26, 0.98) 100%)",
                        border: "1px solid rgba(112, 168, 235, 0.32)",
                        overflow: "hidden",
                      }}
                    >
                      {/* SVG Connection Lines between linked regions */}
                      <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                      >
                        {graphEdges.map(([a, b]) => {
                          const ma = WARP_STONE_META[a];
                          const mb = WARP_STONE_META[b];
                          const bothKnown =
                            unlockAllWarpsPlaytest ||
                            (discoveredList.includes(a) && discoveredList.includes(b));
                          return (
                            <line
                              key={`${a}-${b}`}
                              x1={ma.atlasX}
                              y1={ma.atlasY}
                              x2={mb.atlasX}
                              y2={mb.atlasY}
                              stroke={
                                bothKnown
                                  ? "rgba(116, 224, 255, 0.55)"
                                  : "rgba(110, 128, 165, 0.22)"
                              }
                              strokeWidth={bothKnown ? "0.75" : "0.5"}
                              strokeDasharray={bothKnown ? undefined : "1.8 1.8"}
                            />
                          );
                        })}
                      </svg>

                      {/* Interactive Region Nodes */}
                      {allZones.map((zid) => {
                        const meta = WARP_STONE_META[zid];
                        const isKnown =
                          unlockAllWarpsPlaytest || discoveredList.includes(zid);
                        const isAwakened =
                          unlockAllWarpsPlaytest || awakenedList.includes(zid);
                        const isCurrentZone = zone === zid;
                        const isSelected = selectedAtlasZone === zid;
                        const isQuestZone = activeQuest.targetZone === zid;

                        return (
                          <button
                            key={zid}
                            type="button"
                            onClick={() => setSelectedAtlasZone(zid)}
                            style={{
                              position: "absolute",
                              left: `${meta.atlasX}%`,
                              top: `${meta.atlasY}%`,
                              transform: "translate(-50%, -50%)",
                              minWidth: "126px",
                              padding: "6px 9px",
                              borderRadius: "10px",
                              cursor: "pointer",
                              textAlign: "left",
                              background: isSelected
                                ? "rgba(28, 52, 86, 0.96)"
                                : isKnown
                                ? "rgba(15, 23, 40, 0.92)"
                                : "rgba(12, 14, 22, 0.82)",
                              border: isSelected
                                ? "2px solid #7ef4ff"
                                : isCurrentZone
                                ? "1.5px solid #ffd24c"
                                : isAwakened
                                ? "1px solid rgba(110, 230, 255, 0.55)"
                                : "1px dashed rgba(130, 145, 175, 0.35)",
                              boxShadow: isSelected
                                ? "0 0 16px rgba(92, 230, 255, 0.4)"
                                : "0 4px 12px rgba(0,0,0,0.5)",
                              transition: "all 140ms ease",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.66rem",
                                fontWeight: 800,
                                color: isAwakened ? "#7ef4ff" : "#8b9bb8",
                              }}
                            >
                              <span>Map {meta.shortLabel.split("•")[0]?.trim()}</span>
                              <span>{isAwakened ? "✦ WARP" : "◇ DORMANT"}</span>
                            </div>
                            <div
                              style={{
                                fontSize: "0.76rem",
                                fontWeight: 800,
                                color: isKnown ? "#f4f8ff" : "#7d88a3",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {isKnown
                                ? meta.shortLabel.split("•")[1]?.trim() ?? meta.regionName
                                : "??? Uncharted Realm"}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "5px",
                                marginTop: "2px",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                              }}
                            >
                              {isCurrentZone && (
                                <span style={{ color: "#5eff9e" }}>● YOU ARE HERE</span>
                              )}
                              {isQuestZone && (
                                <span style={{ color: "#ffd978" }}>✦ QUEST LEAD</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: SELECTED REGION TACTICAL RADAR & FAST-TRAVEL */}
                  <div className="char-slot-panel">
                    <div className="char-slot-header">
                      <span className="char-slot-title">
                        {selDiscovered ? selMeta.regionName : "UNCHARTED REGION (FOG OF WAR)"}
                      </span>
                      <span className="char-slot-sub">
                        {selAwakened
                          ? `✦ ${selMeta.title} Awakened`
                          : "◇ Approach Monolith in 3D World to Awaken"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <svg
                        width="196"
                        height="196"
                        viewBox="0 0 220 220"
                        style={{
                          flexShrink: 0,
                          borderRadius: "10px",
                          background: "rgba(9, 14, 24, 0.96)",
                          border: "1px solid rgba(116, 214, 255, 0.35)",
                        }}
                      >
                        {/* Radar Grid */}
                        <line
                          x1="110"
                          y1="0"
                          x2="110"
                          y2="220"
                          stroke="rgba(120, 160, 210, 0.14)"
                          strokeWidth="1"
                        />
                        <line
                          x1="0"
                          y1="110"
                          x2="220"
                          y2="110"
                          stroke="rgba(120, 160, 210, 0.14)"
                          strokeWidth="1"
                        />
                        <circle
                          cx="110"
                          cy="110"
                          r="82"
                          fill="none"
                          stroke="rgba(120, 160, 210, 0.12)"
                          strokeDasharray="3 3"
                        />

                        {selDiscovered ? (
                          <>
                            {/* Terrain & Structural Props */}
                            {selProps.map((p) => {
                              const px = toTac(p.x);
                              const py = toTac(p.z, true);
                              if (p.prefab === "water_tile") {
                                return (
                                  <rect
                                    key={p.id}
                                    x={px - 5}
                                    y={py - 5}
                                    width="10"
                                    height="10"
                                    fill="rgba(42, 148, 235, 0.42)"
                                    rx="2"
                                  />
                                );
                              }
                              if (
                                p.prefab === "cliff_block" ||
                                p.prefab === "stone_wall" ||
                                p.prefab === "dungeon_pillar"
                              ) {
                                return (
                                  <rect
                                    key={p.id}
                                    x={px - 3}
                                    y={py - 3}
                                    width="6"
                                    height="6"
                                    fill="rgba(148, 162, 188, 0.45)"
                                  />
                                );
                              }
                              return null;
                            })}

                            {/* Portals */}
                            {selPortals.map((pt) => (
                              <circle
                                key={pt.id}
                                cx={toTac(pt.x)}
                                cy={toTac(pt.z, true)}
                                r="4.5"
                                fill="#c57bff"
                                stroke="#ffffff"
                                strokeWidth="1"
                              />
                            ))}

                            {/* Live Enemies (when inspecting current or charted zone) */}
                            {selEnemies.map((en) => (
                              <circle
                                key={en.id}
                                cx={toTac(en.x)}
                                cy={toTac(en.z, true)}
                                r={en.kind === "boss" ? "5.5" : "2.8"}
                                fill={en.kind === "boss" ? "#ff3860" : "#ff6b6b"}
                              />
                            ))}

                            {/* Warp Monolith Diamond */}
                            <polygon
                              points={`${toTac(selMeta.x)},${toTac(selMeta.z, true) - 7} ${
                                toTac(selMeta.x) + 6
                              },${toTac(selMeta.z, true)} ${toTac(selMeta.x)},${
                                toTac(selMeta.z, true) + 7
                              } ${toTac(selMeta.x) - 6},${toTac(selMeta.z, true)}`}
                              fill={selAwakened ? "#4ef2ff" : "#6c7a96"}
                              stroke="#ffffff"
                              strokeWidth="1.2"
                            />

                            {/* Active Quest Lead Star if in this Zone */}
                            {activeQuest.targetZone === selectedAtlasZone && (
                              <circle
                                cx={toTac(activeQuest.targetX)}
                                cy={toTac(activeQuest.targetZ, true)}
                                r="5.5"
                                fill="#ffd95e"
                                stroke="#fff8d6"
                                strokeWidth="1.5"
                              />
                            )}

                            {/* Hero Position if in this Zone */}
                            {zone === selectedAtlasZone && (
                              <circle
                                cx={toTac(hero.x)}
                                cy={toTac(hero.z, true)}
                                r="5"
                                fill="#4eff91"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                            )}
                          </>
                        ) : (
                          <text
                            x="110"
                            y="114"
                            textAnchor="middle"
                            fill="#7d8aa6"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            UNCHARTED REALM
                          </text>
                        )}
                      </svg>

                      <div style={{ fontSize: "0.78rem", color: "#d6e2f5", lineHeight: 1.45 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            color: "#ffd978",
                            marginBottom: "4px",
                          }}
                        >
                          {selDiscovered ? selMeta.title : "Shrouded Monolith"}
                        </div>
                        <p style={{ margin: "0 0 8px 0" }}>
                          {selDiscovered
                            ? `Ancient obsidian waypoint in ${selMeta.regionName} (${selMeta.x.toFixed(
                                1
                              )}, ${selMeta.z.toFixed(
                                1
                              )}). Walk within 3.4m or press F to attune for instant Fast-Travel.`
                            : "Explore connecting portals or follow the Golden Wayfinder Trail to chart this region."}
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "4px",
                            fontSize: "0.7rem",
                            color: "#a8c0e0",
                          }}
                        >
                          <span>◆ Cyan: Warp Monolith</span>
                          <span>● Purple: Portal</span>
                          <span>● Green: Your Hero</span>
                          <span>● Gold: Quest Lead</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!selAwakened}
                      onClick={() => warpToZone(selectedAtlasZone, unlockAllWarpsPlaytest)}
                      className="shop-buy-btn"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        fontSize: "0.86rem",
                        background: selAwakened
                          ? "linear-gradient(180deg, #4ef2ff 0%, #1982c4 100%)"
                          : undefined,
                        color: selAwakened ? "#071320" : undefined,
                        fontWeight: 800,
                      }}
                    >
                      {selAwakened
                        ? `⚡ Fast-Travel to ${selMeta.title}`
                        : "🔒 Walk Near This Region's Warp Monolith to Unlock Fast-Travel"}
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="shop-footer">
              <span className="shop-hint">
                Walk within <strong>3.4m</strong> of any obsidian Warp Monolith to awaken it
                permanently, or press <strong>M</strong> / <strong>Esc</strong> to close.
              </span>
              <button
                type="button"
                onClick={() => setAtlasOpen(false)}
                className="shop-close-btn"
              >
                Close World Atlas (M)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MASTER BLACKSMITH FORGE & RUNIC WEAPON ENCHANTMENTS MODAL (SHORTCUT: U)
         ========================================================= */}
      {phase === "playing" && !editorMode && forgeOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card char-sheet-card" style={{ maxWidth: "1020px" }}>
            <div className="shop-header">
              <div>
                <div className="shop-pill">CROSSROADS VILLAGE HEARTH • MASTER SMITH TORVIN</div>
                <h2 className="shop-title">RUNIC ANVIL &amp; WEAPON ENCHANTMENTS</h2>
              </div>
              <div className="char-summary-badges" style={{ alignItems: "center", gap: "8px" }}>
                <span className="char-stat-badge" style={{ borderColor: "#4ef2ff", color: "#9ef6ff" }}>
                  ✦ Monster Cores: <strong>{hero.monsterCores ?? 0}</strong>
                </span>
                <span className="char-stat-badge" style={{ borderColor: "#ffd24c", color: "#ffe694" }}>
                  ◆ Rupees: <strong>{hero.rupees}</strong>
                </span>
                <button
                  type="button"
                  onClick={grantForgePlaytestBundle}
                  className="char-equip-btn"
                  style={{
                    background: "rgba(92, 214, 255, 0.2)",
                    borderColor: "rgba(92, 214, 255, 0.55)",
                    color: "#9ef0ff",
                    padding: "5px 10px",
                  }}
                  title="Playtest: Instantly grant +12 Monster Cores & +600 Rupees to test all weapon enchantments"
                >
                  ⚡ Playtest: +12 Cores &amp; +600 Rupees
                </button>
              </div>
            </div>

            <p className="shop-greeting" style={{ marginBottom: "14px" }}>
              &ldquo;Hail, champion! Every monster you slay yields crystallized{" "}
              <strong>Monster Cores (✦)</strong> — 1 from regular foes, 2 from Knights &amp;
              Crowned Bounties, and 5 from Sanctum Bosses! Bring them to my Runic Anvil in
              Crossroads Village (or press <strong>U</strong> anytime) to infuse your{" "}
              <strong>Sword, Bow, and War-Hammer</strong> with Tier I &amp; Tier II Elemental
              Runes!&rdquo;
            </p>

            {(() => {
              const cores = hero.monsterCores ?? 0;
              const sTier = hero.swordRuneTier ?? 0;
              const bTier = hero.bowRuneTier ?? 0;
              const hTier = hero.hammerRuneTier ?? 0;

              const forgeTrees = [
                {
                  slot: "sword" as const,
                  title: "1. Sword Enchantment • Tempest Chain-Lightning",
                  hotkey: "Space / LMB",
                  tier: sTier,
                  accent: "#4ef2ff",
                  tier1Name: "Tier I: Arcing Storm-Edge",
                  tier1Cost: { cores: 3, rupees: 120 },
                  tier1Desc:
                    "Every Sword slash & Spin Attack arcs Chain Lightning to up to 2 nearby monsters within 4.8m for +1 Electric DMG and a 0.85s shock stagger!",
                  tier2Name: "Tier II: Sovereign Thunder-Cleaver",
                  tier2Cost: { cores: 6, rupees: 280 },
                  tier2Desc:
                    "Arcs Chain Lightning to up to 4 monsters within 6.2m for +2 Electric DMG and a 1.45s shock stun!",
                },
                {
                  slot: "bow" as const,
                  title: "2. Bow Enchantment • Astral Multi-Shot & Piercer",
                  hotkey: "Key: E / 2",
                  tier: bTier,
                  accent: "#ffd95e",
                  tier1Name: "Tier I: Twin-Hawk 3-Arrow Volley",
                  tier1Cost: { cores: 3, rupees: 140 },
                  tier1Desc:
                    "Firing your Bow launches a 3-Arrow Spread Volley (-10°, 0°, +10°) while consuming only 1 arrow from your quiver!",
                  tier2Name: "Tier II: Starlight Piercer Volley",
                  tier2Cost: { cores: 6, rupees: 300 },
                  tier2Desc:
                    "Upgrades your 3-Arrow Volley to 3 DMG per arrow and pierces straight through multiple enemies in a line!",
                },
                {
                  slot: "hammer" as const,
                  title: "3. War-Hammer Enchantment • Permafrost & Cataclysm",
                  hotkey: "Key: T / 8",
                  tier: hTier,
                  accent: "#ff7b54",
                  tier1Name: "Tier I: Permafrost Quake Nova",
                  tier1Cost: { cores: 3, rupees: 150 },
                  tier1Desc:
                    "Expands your War-Hammer seismic shockwave to 5.0m radius, deals 4 DMG, and extends monster stun duration by +1.4s!",
                  tier2Name: "Tier II: Cataclysmic Frostfire Impact",
                  tier2Cost: { cores: 6, rupees: 320 },
                  tier2Desc:
                    "Expands shockwave to 6.2m radius (5 DMG) and erupts 4 radial Elemental Fireballs outward in a 4-way cross on every slam!",
                },
              ];

              return (
                <div className="shop-items-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {forgeTrees.map((tree) => {
                    const nextTier = tree.tier < 2 ? ((tree.tier + 1) as 1 | 2) : null;
                    const req =
                      nextTier === 1
                        ? tree.tier1Cost
                        : nextTier === 2
                        ? tree.tier2Cost
                        : null;
                    const canAfford =
                      req !== null && cores >= req.cores && hero.rupees >= req.rupees;

                    return (
                      <div
                        key={tree.slot}
                        className={`shop-item-card ${tree.tier >= 2 ? "shop-item-owned" : ""}`}
                        style={{
                          borderColor:
                            tree.tier > 0 ? tree.accent : "rgba(140, 165, 210, 0.35)",
                        }}
                      >
                        <div className="shop-item-top">
                          <span className="shop-item-name" style={{ color: tree.accent }}>
                            {tree.title}
                          </span>
                          <span className="shop-item-hotkey">
                            {tree.tier === 0
                              ? "Unenchanted"
                              : tree.tier === 1
                              ? "★ RUNE TIER I"
                              : "★★ MAX TIER II"}
                          </span>
                        </div>

                        <div
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            marginBottom: "8px",
                            background:
                              tree.tier >= 1
                                ? "rgba(46, 214, 118, 0.12)"
                                : "rgba(255, 255, 255, 0.04)",
                            border:
                              tree.tier >= 1
                                ? "1px solid rgba(46, 214, 118, 0.45)"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                            fontSize: "0.76rem",
                          }}
                        >
                          <div style={{ fontWeight: 800, color: "#fff2c2", marginBottom: "3px" }}>
                            {tree.tier >= 1 ? `✓ ${tree.tier1Name}` : tree.tier1Name}
                          </div>
                          <div style={{ color: "#d6e2f5" }}>{tree.tier1Desc}</div>
                        </div>

                        <div
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            marginBottom: "10px",
                            background:
                              tree.tier >= 2
                                ? "rgba(46, 214, 118, 0.12)"
                                : "rgba(255, 255, 255, 0.04)",
                            border:
                              tree.tier >= 2
                                ? "1px solid rgba(46, 214, 118, 0.45)"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                            fontSize: "0.76rem",
                          }}
                        >
                          <div style={{ fontWeight: 800, color: "#ffd978", marginBottom: "3px" }}>
                            {tree.tier >= 2 ? `✓ ${tree.tier2Name}` : tree.tier2Name}
                          </div>
                          <div style={{ color: "#d6e2f5" }}>{tree.tier2Desc}</div>
                        </div>

                        <button
                          type="button"
                          disabled={!nextTier || !canAfford}
                          onClick={() => forgeEnchantWeapon(tree.slot)}
                          className="shop-buy-btn"
                        >
                          {!nextTier
                            ? "★★ Masterwork Rune Complete"
                            : canAfford
                            ? `⚒ Forge Tier ${nextTier === 1 ? "I" : "II"} — ${req!.cores}✦ Cores & ${
                                req!.rupees
                              } Rupees`
                            : `Need ${req!.cores}✦ Cores (${cores}/${req!.cores}) & ${
                                req!.rupees
                              } Rupees`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="shop-footer">
              <span className="shop-hint">
                Visit Master Smith Torvin&apos;s Anvil in Crossroads Village or press{" "}
                <strong>U</strong> / <strong>Esc</strong> anytime to close.
              </span>
              <button
                type="button"
                onClick={() => setForgeOpen(false)}
                className="shop-close-btn"
              >
                Close Runic Forge (U)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          DIABLO-STYLE PROCEDURAL ABYSSAL RIFT CONSOLE MODAL (SHORTCUT: P)
         ========================================================= */}
      {phase === "playing" && !editorMode && riftOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card char-sheet-card" style={{ maxWidth: "1040px" }}>
            <div className="shop-header">
              <div>
                <div className="shop-pill" style={{ color: "#e09eff" }}>
                  PROCEDURAL LABYRINTH GENERATOR • ENDLESS NEPHALEM-STYLE RIFTING
                </div>
                <h2 className="shop-title">THE ABYSSAL RIFT • PROCEDURAL DUNGEONS</h2>
              </div>
              <div className="char-summary-badges" style={{ alignItems: "center", gap: "8px" }}>
                <span className="char-stat-badge" style={{ borderColor: "#c875ff", color: "#eabfff" }}>
                  🌀 Deepest Floor Cleared: <strong>Floor {flags.highestRiftDepth ?? 0}</strong>
                </span>
                <span className="char-stat-badge" style={{ borderColor: "#4ef2ff", color: "#9ef6ff" }}>
                  ✦ Monster Cores: <strong>{hero.monsterCores ?? 0}</strong>
                </span>
                <span className="char-stat-badge" style={{ borderColor: "#ffd24c", color: "#ffe694" }}>
                  ◆ Rupees: <strong>{hero.rupees}</strong>
                </span>
              </div>
            </div>

            <p className="shop-greeting" style={{ marginBottom: "14px" }}>
              &ldquo;Step into the <strong>Abyssal Rift Obelisk</strong> in Crossroads Village (or
              press <strong>P</strong> anytime) to open a procedurally generated dungeon floor!
              Every run carves a brand-new multi-room labyrinth with randomized{" "}
              <strong>Corridors, Biome Themes, Crowned Elite Champions, Blessing Shrines, Treasure Vaults, and a Rift Guardian Boss</strong>{" "}
              that unseals the Descent Portal to the next deeper floor!&rdquo;
            </p>

            <div className="char-equip-grid" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
              {/* LEFT: LAUNCH / REROLL PROCEDURAL RIFT FLOOR */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">OPEN OR REROLL PROCEDURAL RIFT</span>
                  <span className="char-slot-sub">
                    Choose a Floor Depth &amp; Seed (leave Seed blank for a unique layout every time)
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        color: "#c8d8f0",
                        marginBottom: "6px",
                      }}
                    >
                      SELECT RIFT FLOOR DEPTH (SCALES MONSTER PACKS, ELITES &amp; LOOT):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRiftTargetDepth(d)}
                          className={`char-equip-btn ${riftTargetDepth === d ? "active" : ""}`}
                          style={{
                            padding: "6px 12px",
                            background:
                              riftTargetDepth === d
                                ? "linear-gradient(180deg, #b85cff 0%, #6d24b8 100%)"
                                : "rgba(26, 32, 52, 0.85)",
                            borderColor:
                              riftTargetDepth === d
                                ? "#eabfff"
                                : "rgba(140, 165, 210, 0.35)",
                            color: "#ffffff",
                            fontWeight: 800,
                          }}
                        >
                          Floor {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "8px",
                      alignItems: "end",
                    }}
                  >
                    <label className="inspector-field" style={{ margin: 0 }}>
                      <span>Custom Dungeon Seed (Optional — Leave Empty for Random Layout)</span>
                      <input
                        type="text"
                        placeholder="e.g. 777421 (or leave blank for random)"
                        value={riftCustomSeedText}
                        onChange={(e) => setRiftCustomSeedText(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setRiftCustomSeedText(
                          String(Math.floor(100000 + Math.random() * 899999))
                        )
                      }
                      className="char-equip-btn"
                      style={{ padding: "8px 12px", height: "36px" }}
                    >
                      🎲 Roll Seed
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(32, 18, 54, 0.65)",
                      border: "1px solid rgba(196, 114, 255, 0.35)",
                      fontSize: "0.78rem",
                      color: "#e2d4f8",
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#ffd978", marginBottom: "4px" }}>
                      ✦ Floor {riftTargetDepth} Procedural Modifiers &amp; Rewards:
                    </div>
                    <div>• <strong>6 to 8 Interconnected Chambers</strong> on a 3×3 Dungeon Grid</div>
                    <div>
                      • <strong>{Math.min(3, 1 + Math.floor(riftTargetDepth / 2))} Crowned Elite Champion Packs</strong>{" "}
                      with Diablo-style Affixes (2x HP, +50 Rupees &amp; +2 Monster Cores)
                    </div>
                    <div>
                      • <strong>1 Abyssal Blessing Shrine</strong> (100% Heal, MP Refill &amp; +2 Cores) &amp;{" "}
                      <strong>1 Treasure Vault Chest</strong> (+75 Rupees, +2 Cores, Bombs &amp; Arrows)
                    </div>
                    <div>
                      • <strong>Rift Guardian Boss Hoard</strong>: Unseals{" "}
                      <strong>+1 Heart Container, +4 Monster Cores &amp; +{80 + riftTargetDepth * 35} Rupees</strong>!
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseInt(riftCustomSeedText.trim(), 10);
                        const customSeed = Number.isFinite(parsed) ? parsed : undefined;
                        enterProceduralRift(riftTargetDepth, customSeed);
                      }}
                      className="shop-buy-btn"
                      style={{
                        flex: 1,
                        padding: "11px 16px",
                        fontSize: "0.9rem",
                        background: "linear-gradient(180deg, #c86bff 0%, #7320c9 100%)",
                        color: "#ffffff",
                        fontWeight: 800,
                      }}
                    >
                      🌀 Open Procedural Rift — Floor {riftTargetDepth}{" "}
                      {riftCustomSeedText.trim() ? `(Seed #${riftCustomSeedText.trim()})` : "(New Random Layout)"}
                    </button>

                    {zone === "rift" && (
                      <button
                        type="button"
                        onClick={() => {
                          setRiftOpen(false);
                          warpToZone("overworld", true);
                        }}
                        className="shop-close-btn"
                        style={{ padding: "11px 14px" }}
                      >
                        🏛 Return to Village
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: LIVE 3x3 PROCEDURAL CHAMBER TOPOLOGY MAP */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">
                    {(flags.riftDepth ?? 0) > 0
                      ? `ACTIVE RIFT BLUEPRINT • FLOOR ${flags.riftDepth} (SEED #${flags.riftSeed})`
                      : "PROCEDURAL CHAMBER TOPOLOGY PREVIEW"}
                  </span>
                  <span className="char-slot-sub">
                    {flags.riftBiomeTitle
                      ? `${flags.riftBiomeTitle} • ${flags.riftEliteAffix}`
                      : "Open a Rift to inspect its generated 3×3 room graph"}
                  </span>
                </div>

                {flags.riftRooms && flags.riftRooms.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "10px",
                        width: "100%",
                        maxWidth: "320px",
                        padding: "14px",
                        borderRadius: "12px",
                        background: "rgba(10, 12, 24, 0.92)",
                        border: "1px solid rgba(196, 114, 255, 0.35)",
                      }}
                    >
                      {[2, 1, 0].map((row) =>
                        [0, 1, 2].map((col) => {
                          const room = (flags.riftRooms ?? []).find(
                            (r) => r.col === col && r.row === row
                          );
                          const isHeroHere =
                            zone === "rift" &&
                            room &&
                            Math.abs(hero.x - room.cx) <= 11 &&
                            Math.abs(hero.z - room.cz) <= 11;

                          if (!room) {
                            return (
                              <div
                                key={`${col}-${row}`}
                                style={{
                                  height: "68px",
                                  borderRadius: "8px",
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px dashed rgba(255,255,255,0.08)",
                                }}
                              />
                            );
                          }

                          const roleBadge =
                            room.role === "start"
                              ? { icon: "⛩", label: "Entry", color: "#4ef2ff" }
                              : room.role === "boss"
                              ? { icon: "☠", label: "Guardian", color: "#ff4769" }
                              : room.role === "shrine"
                              ? { icon: "✦", label: "Shrine", color: "#4eff91" }
                              : room.role === "vault"
                              ? { icon: "💎", label: "Vault", color: "#ffd24c" }
                              : room.role === "elite"
                              ? { icon: "👑", label: "Elite", color: "#e09eff" }
                              : { icon: "⚔", label: "Combat", color: "#9eb4d8" };

                          return (
                            <div
                              key={`${col}-${row}`}
                              style={{
                                height: "68px",
                                borderRadius: "8px",
                                background: isHeroHere
                                  ? "rgba(184, 92, 255, 0.32)"
                                  : "rgba(30, 36, 58, 0.9)",
                                border: isHeroHere
                                  ? "2px solid #4eff91"
                                  : `1.5px solid ${roleBadge.color}`,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px",
                                textAlign: "center",
                              }}
                            >
                              <span style={{ fontSize: "1.05rem" }}>{roleBadge.icon}</span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  color: roleBadge.color,
                                }}
                              >
                                {roleBadge.label}
                              </span>
                              {isHeroHere && (
                                <span
                                  style={{
                                    fontSize: "0.62rem",
                                    color: "#4eff91",
                                    fontWeight: 800,
                                  }}
                                >
                                  ● HERO
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#c8d8f0",
                        textAlign: "center",
                        lineHeight: 1.45,
                      }}
                    >
                      Every chamber is linked by carved <strong>5.6m Stone Corridors</strong>. Slay{" "}
                      <strong>{flags.riftBossName}</strong> in the <strong>☠ Guardian Lair</strong>{" "}
                      to unseal the Descent Portal to Floor {(flags.riftDepth ?? 1) + 1}!
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "28px 18px",
                      textAlign: "center",
                      color: "#9eb4d8",
                      fontSize: "0.82rem",
                    }}
                  >
                    No Abyssal Rift floor is active yet. Click{" "}
                    <strong>&ldquo;🌀 Open Procedural Rift&rdquo;</strong> on the left to generate
                    your first Diablo-style dungeon!
                  </div>
                )}
              </div>
            </div>

            <div className="shop-footer">
              <span className="shop-hint">
                Press <strong>P</strong> or <strong>Esc</strong> anytime to close the Abyssal Rift
                Console.
              </span>
              <button
                type="button"
                onClick={() => setRiftOpen(false)}
                className="shop-close-btn"
              >
                Close Rift Console (P)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          HERO CHARACTER EQUIPMENT, ARMOR TUNICS, BOOTS & GLASS BOTTLES MODAL
         ========================================================= */}
      {phase === "playing" && !editorMode && characterOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card char-sheet-card">
            <div className="shop-header">
              <div>
                <div className="shop-pill">CHAMPION LOADOUT &amp; ALCHEMY BELT</div>
                <h2 className="shop-title">CHARACTER EQUIPMENT &amp; BOTTLES</h2>
              </div>
              <div className="char-summary-badges">
                <span className="char-stat-badge">
                  Sword: <strong>{hero.swordDamage ?? 1} DMG</strong> (Spin:{" "}
                  <strong>{(hero.swordDamage ?? 1) * 2} DMG</strong>)
                </span>
                <span className="char-stat-badge">
                  Armor:{" "}
                  <strong>
                    {hero.equippedTunic === "red_mail"
                      ? "-75% All DMG"
                      : hero.equippedTunic === "blue_mail"
                      ? "-50% All DMG"
                      : "0% Reduction"}
                  </strong>
                </span>
                <span className="char-stat-badge">
                  Boots:{" "}
                  <strong>
                    {hero.equippedBoots === "swift_boots"
                      ? "+25% Speed"
                      : hero.equippedBoots === "titan_greaves"
                      ? "+12% Spd / Poise"
                      : "1.0x Speed"}
                  </strong>
                </span>
              </div>
            </div>

            <div className="char-equip-grid">
              {/* 1. PRIMARY HAND */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">PRIMARY HAND (SWORD)</span>
                  <span className="char-slot-sub">Hold Space/LMB for 2x Spin Attack</span>
                </div>
                <div className="char-options-col">
                  {(
                    [
                      {
                        id: "traveler_blade" as PrimaryHandId,
                        name: "Traveler's Broadsword",
                        stats: "1 Base DMG • 2 Spin DMG",
                        unlockHint: "Starter Weapon",
                        desc: "Balanced steel blade forged for swift slashes and 360° spin attacks.",
                      },
                      {
                        id: "tempered_blade" as PrimaryHandId,
                        name: "Tempered Sun-Blade",
                        stats: "2 Base DMG • 4 Spin DMG",
                        unlockHint: "🔒 500 Rupees at Shop (or Dig in Dungeon Rm 3)",
                        desc: "Masterwork golden blade that doubles your Sword & Spin Attack damage!",
                      },
                    ] as const
                  ).map((item) => {
                    const unlocked = (hero.unlockedPrimaries ?? ["traveler_blade"]).includes(
                      item.id
                    );
                    const active = hero.equippedPrimary === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => equipHeroItem("primary", item.id)}
                        className={`char-option-btn ${active ? "active" : ""}`}
                        style={!unlocked ? { opacity: 0.62 } : undefined}
                      >
                        <div className="char-option-top">
                          <span className="char-option-name">
                            {unlocked ? item.name : `🔒 ${item.name}`}
                          </span>
                          <span className="char-option-stat">
                            {unlocked ? item.stats : item.unlockHint}
                          </span>
                        </div>
                        <div className="char-option-desc">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. OFFHAND SHIELD */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">OFFHAND (SHIELD)</span>
                  <span className="char-slot-sub">Hold RMB or Shift to Guard</span>
                </div>
                <div className="char-options-col">
                  {(
                    [
                      {
                        id: "wooden_buckler" as OffhandId,
                        name: "Traveler's Kite Shield",
                        stats: "Blocks 1 Physical DMG",
                        unlockHint: "Starter Shield",
                        desc: "Sturdy iron-rimmed shield that catches arrows and absorbs melee strikes.",
                      },
                      {
                        id: "mirror_shield" as OffhandId,
                        name: "Aegis Mirror Shield",
                        stats: "Blocks 2 Physical & Magic DMG",
                        unlockHint: "🔒 400 Rupees at Shop",
                        desc: "Polished silver-gold ward that blocks heavy impacts and magical bolts.",
                      },
                    ] as const
                  ).map((item) => {
                    const unlocked = (hero.unlockedOffhands ?? ["wooden_buckler"]).includes(
                      item.id
                    );
                    const active = hero.equippedOffhand === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => equipHeroItem("offhand", item.id)}
                        className={`char-option-btn ${active ? "active" : ""}`}
                        style={!unlocked ? { opacity: 0.62 } : undefined}
                      >
                        <div className="char-option-top">
                          <span className="char-option-name">
                            {unlocked ? item.name : `🔒 ${item.name}`}
                          </span>
                          <span className="char-option-stat">
                            {unlocked ? item.stats : item.unlockHint}
                          </span>
                        </div>
                        <div className="char-option-desc">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. CHEST ARMOR (TUNICS — 0% / 50% / 75% MITIGATION) */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">CHEST ARMOR (TUNICS)</span>
                  <span className="char-slot-sub">Physical &amp; Magical Damage Mitigation</span>
                </div>
                <div className="char-options-col">
                  {(
                    [
                      {
                        id: "green_tunic" as TunicId,
                        name: "Forest Green Tunic (Default)",
                        stats: "0% Damage Reduction",
                        unlockHint: "Starter Tunic",
                        desc: "Classic emerald adventurer's tunic. Takes standard baseline 1.0x damage.",
                      },
                      {
                        id: "blue_mail" as TunicId,
                        name: "Sapphire Mail",
                        stats: "-50% Physical & Magic DMG",
                        unlockHint: "🔒 450 Rupees at Shop (or Sun Shrine Torch Quest)",
                        desc: "Enchanted cerulean chainmail that halves all incoming damage!",
                      },
                      {
                        id: "red_mail" as TunicId,
                        name: "Crimson Dragon Mail",
                        stats: "-75% Physical & Magic DMG",
                        unlockHint: "🔒 750 Rupees at Shop (or Dig in Map 3)",
                        desc: "Legendary ruby-woven mail that reduces all incoming damage by 75%!",
                      },
                    ] as const
                  ).map((item) => {
                    const unlocked = (hero.unlockedTunics ?? ["green_tunic"]).includes(
                      item.id
                    );
                    const active = hero.equippedTunic === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => equipHeroItem("tunic", item.id)}
                        className={`char-option-btn ${active ? "active" : ""}`}
                        style={!unlocked ? { opacity: 0.62 } : undefined}
                      >
                        <div className="char-option-top">
                          <span className="char-option-name">
                            {unlocked ? item.name : `🔒 ${item.name}`}
                          </span>
                          <span className="char-option-stat">
                            {unlocked ? item.stats : item.unlockHint}
                          </span>
                        </div>
                        <div className="char-option-desc">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. BOOTS SLOT */}
              <div className="char-slot-panel">
                <div className="char-slot-header">
                  <span className="char-slot-title">BOOTS &amp; FOOTWEAR</span>
                  <span className="char-slot-sub">Movement Speed &amp; Stance Poise</span>
                </div>
                <div className="char-options-col">
                  {(
                    [
                      {
                        id: "leather_boots" as BootsId,
                        name: "Traveler's Leather Boots",
                        stats: "1.0x Base Speed",
                        unlockHint: "Starter Boots",
                        desc: "Supple calfskin boots for everyday overland trekking.",
                      },
                      {
                        id: "swift_boots" as BootsId,
                        name: "Swiftwind Pegasus Boots",
                        stats: "+25% Run Speed",
                        unlockHint: "🔒 300 Rupees at Shop (or Dig w/ Shovel)",
                        desc: "Wing-stitched boots that boost your movement speed by 25% to dodge charges!",
                      },
                      {
                        id: "titan_greaves" as BootsId,
                        name: "Titan Iron Greaves",
                        stats: "+12% Speed • -50% Knockback",
                        unlockHint: "🔒 350 Rupees at Shop",
                        desc: "Heavy steel greaves that anchor your footing when blocking heavy attacks.",
                      },
                    ] as const
                  ).map((item) => {
                    const unlocked = (hero.unlockedBoots ?? ["leather_boots"]).includes(
                      item.id
                    );
                    const active = hero.equippedBoots === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => equipHeroItem("boots", item.id)}
                        className={`char-option-btn ${active ? "active" : ""}`}
                        style={!unlocked ? { opacity: 0.62 } : undefined}
                      >
                        <div className="char-option-top">
                          <span className="char-option-name">
                            {unlocked ? item.name : `🔒 ${item.name}`}
                          </span>
                          <span className="char-option-stat">
                            {unlocked ? item.stats : item.unlockHint}
                          </span>
                        </div>
                        <div className="char-option-desc">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GLASS BOTTLES BELT SECTION */}
            <div className="bottles-section">
              <div className="bottles-header-row">
                <div>
                  <span className="char-slot-title">
                    GLASS BOTTLES BELT ({(hero.bottles ?? []).length} / 6 BOTTLES)
                  </span>
                  <span className="char-slot-sub" style={{ marginLeft: 10 }}>
                    Press <strong>V</strong> or <strong>5</strong> during battle to use your first
                    filled bottle, or click any bottle below!
                  </span>
                </div>
              </div>

              {(hero.bottles ?? []).length === 0 ? (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px dashed rgba(201, 164, 73, 0.45)",
                    color: "#d8d5e8",
                    fontSize: "0.82rem",
                  }}
                >
                  <strong>🔒 No Glass Bottles Owned Yet:</strong> Purchase Empty Glass Bottles at{" "}
                  <strong>Merchant Bramble&apos;s Curio Shop (120 Rupees)</strong> or unearth buried
                  bottles from soft dirt patches with the <strong>Explorer&apos;s Shovel [G]</strong>!
                </div>
              ) : (
                <div className="bottles-grid">
                  {(hero.bottles ?? []).map((content, idx) => {
                    const meta = BOTTLE_META[content] ?? BOTTLE_META.empty;
                    const isEmpty = content === "empty";
                    return (
                      <div
                        key={idx}
                        className={`bottle-card ${isEmpty ? "bottle-card-empty" : "bottle-card-filled"}`}
                      >
                        <div className="bottle-card-top">
                          <span className="bottle-slot-num">BOTTLE #{idx + 1}</span>
                          <span
                            className="bottle-badge"
                            style={{
                              borderColor: meta.color,
                              color: meta.color,
                            }}
                          >
                            {meta.badge}
                          </span>
                        </div>
                        <div className="bottle-name">{meta.name}</div>
                        <p className="bottle-desc">{meta.desc}</p>

                        {!isEmpty ? (
                          <div className="bottle-actions-row">
                            <button
                              type="button"
                              onClick={() => useBottleSlot(idx)}
                              className="shop-buy-btn bottle-use-btn"
                            >
                              {content === "bee"
                                ? "Unleash Golden Bee!"
                                : content === "fairy"
                                ? "Release Fairy (+7 Hearts)"
                                : "Drink Potion Now"}
                            </button>
                            <button
                              type="button"
                              onClick={() => fillBottleSlot(idx, "empty")}
                              className="bottle-empty-btn"
                              title="Pour out bottle contents"
                            >
                              Empty
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "0.73rem",
                              color: "#b9b4d4",
                              marginTop: "6px",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              background: "rgba(255,255,255,0.04)",
                            }}
                          >
                            Visit <strong>Bramble&apos;s Curio Shop</strong> to fill with Red/Green/Blue
                            Potions, a Spring Fairy, or a Golden Bee!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shop-footer">
              <span className="shop-footer-hint">
                Tip: Earn Rupees via quests/bounties or place{" "}
                <strong>★ Admin Gold Rupees (+500)</strong> in Map Editor (<strong>Tab</strong>)!
              </span>
              <button
                type="button"
                onClick={() => setCharacterOpen(false)}
                className="shop-close-btn"
              >
                Close Character Sheet (C / Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MERCHANT BRAMBLE'S CURIO SHOP MODAL (FIXED CENTER OVERLAY!)
         ========================================================= */}
      {phase === "playing" && !editorMode && shopOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card">
            <div className="shop-header">
              <div>
                <div className="shop-pill">SOUTH CLEARING BAZAAR • PROGRESSIVE ADVENTURE SHOP</div>
                <h2 className="shop-title">BRAMBLE&apos;S CURIO SHOP</h2>
              </div>
              <div className="shop-wallet">
                <span className="shop-wallet-label">YOUR RUPEES:</span>
                <span className="shop-wallet-val">{hero.rupees}</span>
              </div>
            </div>
            <p className="shop-greeting">
              &ldquo;Welcome, traveler! Everyday arrow &amp; potion refills are cheap, while{" "}
              <strong>masterwork tools, weapons, shields, and armor</strong> require a true
              adventurer&apos;s fortune! Complete quests across the Vale, or (for Admin Testing)
              open the <strong>Map Editor [Tab] &rarr; Pickups &rarr; ★ Admin Gold Rupee (+500)</strong>{" "}
              to drop Rupees on the ground!&rdquo;
            </p>

            {/* MAP 1 RUPEE ECONOMY TRACKER BANNER */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
                marginBottom: "12px",
                padding: "8px 10px",
                borderRadius: "10px",
                background: "rgba(255, 210, 76, 0.08)",
                border: "1px solid rgba(255, 210, 76, 0.32)",
                fontSize: "0.75rem",
              }}
            >
              <div>
                <div style={{ color: "#ffd24c", fontWeight: 800 }}>
                  1. SW Secret Stash Cave (+50)
                </div>
                <div style={{ color: flags.secretStashClaimed ? "#5eff9e" : "#d8d5e8" }}>
                  {flags.secretStashClaimed
                    ? "✓ Claimed (+50 Rupees!)"
                    : "Hidden behind SW Bush & Cracked Wall (-26, -33)"}
                </div>
              </div>
              <div>
                <div style={{ color: "#ffd24c", fontWeight: 800 }}>
                  2. SE Heirloom Quest NPC (+50)
                </div>
                <div style={{ color: flags.heirloomQuestClaimed ? "#5eff9e" : "#d8d5e8" }}>
                  {flags.heirloomQuestClaimed
                    ? "✓ Claimed (+50 Rupees!)"
                    : flags.heirloomMonstersCleared
                    ? "★ Monsters Cleared! Talk to Elder Rowan (20.5, -29)"
                    : "Clear SE Bandit Cave for Elder Rowan (20.5, -29)"}
                </div>
              </div>
              <div>
                <div style={{ color: "#ffd24c", fontWeight: 800 }}>
                  3. Gold Bounty Monsters &amp; Admin Testing
                </div>
                <div style={{ color: "#d8d5e8" }}>
                  Slay Crowned Foes for 5x Rupees — or drop <strong>+500 Gold Rupees</strong> via{" "}
                  <strong>Tab</strong>!
                </div>
              </div>
            </div>

            {/* THE 3 FEATURED SHOP COUNTER ITEMS */}
            <div
              style={{
                fontSize: "0.76rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#ffd24c",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              ★ Featured On The Shop Counter (3 Table Specials)
            </div>
            <div className="shop-items-grid" style={{ marginBottom: "12px" }}>
              {/* COUNTER ITEM 1: REFILL HEARTS / POTION (20 RUPEES) */}
              <div
                className="shop-item-card"
                style={{
                  borderColor: "rgba(255, 82, 119, 0.55)",
                  background: "rgba(56, 18, 32, 0.55)",
                }}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">1. Refill Hearts &amp; Potion</span>
                  <span className="shop-item-hotkey">Cheap: 20 Rupees</span>
                </div>
                <p className="shop-item-desc">
                  <strong>Left Counter Special:</strong> Immediately restores{" "}
                  <strong>100% of your Life Hearts</strong> AND fills an Empty Glass Bottle
                  with a Crimson Red Potion!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.hp >= hero.maxHp && !(hero.bottles ?? []).includes("empty")) ||
                    hero.rupees < 20
                  }
                  onClick={() => buyShopItem("counter_hearts")}
                  className="shop-buy-btn"
                >
                  {hero.hp >= hero.maxHp && !(hero.bottles ?? []).includes("empty")
                    ? "Hearts & Bottles Full"
                    : hero.rupees >= 20
                    ? "Buy Counter Special — 20 Rupees"
                    : "Need 20 Rupees"}
                </button>
              </div>

              {/* COUNTER ITEM 2: BUNDLE OF ARROWS + MAGIC REFILL (10 RUPEES) */}
              <div
                className="shop-item-card"
                style={{
                  borderColor: "rgba(62, 230, 135, 0.55)",
                  background: "rgba(16, 48, 36, 0.55)",
                }}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">2. 10 Arrows + Magic Refill</span>
                  <span className="shop-item-hotkey">Cheap: 10 Rupees</span>
                </div>
                <p className="shop-item-desc">
                  <strong>Center Counter Special:</strong> Restocks{" "}
                  <strong>+10 Iron-Tipped Arrows</strong> (Quiver: {hero.arrows}) AND
                  restores <strong>100% Magic Power (MP)</strong> for your Flame Rod!
                </p>
                <button
                  type="button"
                  disabled={hero.rupees < 10}
                  onClick={() => buyShopItem("counter_ammo_magic")}
                  className="shop-buy-btn"
                >
                  {hero.rupees >= 10
                    ? "Buy +10 Arrows & Full MP — 10 Rupees"
                    : "Need 10 Rupees"}
                </button>
              </div>

              {/* COUNTER ITEM 3: EXPENSIVE PROGRESSION ITEM / UPGRADE (600 RUPEES) */}
              <div
                className={`shop-item-card ${
                  flags.shopProgressionBought ? "shop-item-owned" : ""
                }`}
                style={{
                  borderColor: "rgba(255, 215, 76, 0.85)",
                  background: "rgba(68, 48, 12, 0.65)",
                  boxShadow: "0 0 18px rgba(255, 210, 64, 0.18)",
                }}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name" style={{ color: "#ffe270" }}>
                    3. Champion&apos;s Progression Set
                  </span>
                  <span className="shop-item-hotkey">
                    {flags.shopProgressionBought ? "300 Rupees" : "Grand Bundle: 600 Rupees"}
                  </span>
                </div>
                <p className="shop-item-desc">
                  <strong>Right Counter Grand Prize:</strong> Grants{" "}
                  <strong>+1 Heart Container (+1 Max HP &amp; Full Heal)</strong>, unlocks &amp; equips{" "}
                  <strong>Aegis Mirror Shield</strong> &amp;{" "}
                  <strong>Tempered Blade (2x DMG)</strong>, and upgrades{" "}
                  <strong>Bomb Bag to 30 Bombs</strong>!
                </p>
                <button
                  type="button"
                  disabled={
                    flags.shopProgressionBought ? hero.rupees < 300 : hero.rupees < 600
                  }
                  onClick={() =>
                    buyShopItem(
                      flags.shopProgressionBought
                        ? "heart_container"
                        : "counter_progression_upgrade"
                    )
                  }
                  className="shop-buy-btn"
                >
                  {flags.shopProgressionBought
                    ? hero.rupees >= 300
                      ? "Buy +1 Heart Container — 300 Rupees"
                      : `Owned ✓ (+1 Heart Container: ${hero.rupees}/300)`
                    : hero.rupees >= 600
                    ? "★ Unlock Champion's Set — 600 Rupees"
                    : `Need 600 Rupees (${hero.rupees}/600)`}
                </button>
              </div>
            </div>

            <div
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#b9b4d4",
                marginBottom: "6px",
                textTransform: "uppercase",
              }}
            >
              Progressive Adventure Tools, Weapons, Armor &amp; Alchemical Bottles
            </div>

            <div className="shop-items-grid">
              {/* BOMB BAG UNLOCK (150 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.maxBombs ?? 0) > 0 ? "shop-item-owned" : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Canvas Bomb Bag (20 Cap)</span>
                  <span className="shop-item-hotkey">150 Rupees • Key: B / 6</span>
                </div>
                <p className="shop-item-desc">
                  Unlocks the <strong>Bomb Bag (20 Capacity + 10 Bombs)</strong> so you can
                  blast Cracked Boulders and open hidden caves!
                </p>
                <button
                  type="button"
                  disabled={(hero.maxBombs ?? 0) > 0 || hero.rupees < 150}
                  onClick={() => buyShopItem("bomb_bag")}
                  className="shop-buy-btn"
                >
                  {(hero.maxBombs ?? 0) > 0
                    ? "Owned ✓"
                    : hero.rupees >= 150
                    ? "Unlock Bomb Bag — 150 Rupees"
                    : `Need 150 Rupees (${hero.rupees}/150)`}
                </button>
              </div>

              {/* 5 BOMBS REFILL (25 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Bundle of 5 Bombs</span>
                  <span className="shop-item-hotkey">
                    {(hero.maxBombs ?? 0) > 0
                      ? `Bag: ${hero.bombs ?? 0}/${hero.maxBombs}`
                      : "Requires Bomb Bag"}
                  </span>
                </div>
                <p className="shop-item-desc">
                  Restocks 5 heavy iron Bombs once you own a Bomb Bag. Place or throw (B / F)
                  to blast foes and Cracked Boulders!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.maxBombs ?? 0) <= 0 ||
                    (hero.bombs ?? 0) >= (hero.maxBombs ?? 20) ||
                    hero.rupees < 25
                  }
                  onClick={() => buyShopItem("bombs")}
                  className="shop-buy-btn"
                >
                  {(hero.maxBombs ?? 0) <= 0
                    ? "Buy Bomb Bag First (150)"
                    : (hero.bombs ?? 0) >= (hero.maxBombs ?? 20)
                    ? "Bomb Bag Full"
                    : hero.rupees >= 25
                    ? "Buy +5 Bombs — 25 Rupees"
                    : "Need 25 Rupees"}
                </button>
              </div>

              {/* EXPLORER'S SHOVEL (250 RUPEES) */}
              <div className={`shop-item-card ${hero.hasShovel ? "shop-item-owned" : ""}`}>
                <div className="shop-item-top">
                  <span className="shop-item-name">Explorer&apos;s Iron Shovel</span>
                  <span className="shop-item-hotkey">250 Rupees • Key: G / 4</span>
                </div>
                <p className="shop-item-desc">
                  Unlocks the <strong>Shovel [G]</strong> to dig soft dirt patches across all
                  maps for buried Rupees, Hearts, Bottles, and legendary gear!
                </p>
                <button
                  type="button"
                  disabled={hero.hasShovel || hero.rupees < 250}
                  onClick={() => buyShopItem("shovel")}
                  className="shop-buy-btn"
                >
                  {hero.hasShovel
                    ? "Owned ✓"
                    : hero.rupees >= 250
                    ? "Unlock Shovel — 250 Rupees"
                    : `Need 250 Rupees (${hero.rupees}/250)`}
                </button>
              </div>

              {/* GRAPPLING HOOKSHOT (180 RUPEES — OR FREE IN MAP 3 NW RELIQUARY) */}
              <div className={`shop-item-card ${hero.hasHookshot ? "shop-item-owned" : ""}`}>
                <div className="shop-item-top">
                  <span className="shop-item-name">Grappling Hookshot</span>
                  <span className="shop-item-hotkey">180 Rupees • Key: H / 7</span>
                </div>
                <p className="shop-item-desc">
                  Fires a 13.5m iron grapple chain that pulls you across rivers &amp; chasms to{" "}
                  <strong>Grapple Posts, Trees, Crates &amp; Torches</strong>, rips Wooden Shields
                  off Goblins, and snags distant treasure! <em>(Or find in Map 3 NW!)</em>
                </p>
                <button
                  type="button"
                  disabled={hero.hasHookshot || hero.rupees < 180}
                  onClick={() => buyShopItem("hookshot")}
                  className="shop-buy-btn"
                >
                  {hero.hasHookshot
                    ? "Owned ✓"
                    : hero.rupees >= 180
                    ? "Unlock Hookshot — 180 Rupees"
                    : `Need 180 Rupees (Or Map 3 NW)`}
                </button>
              </div>

              {/* TITAN WAR-HAMMER (220 RUPEES — OR FREE IN MAP 4 SW FORGE) */}
              <div className={`shop-item-card ${hero.hasHammer ? "shop-item-owned" : ""}`}>
                <div className="shop-item-top">
                  <span className="shop-item-name">Titan War-Hammer</span>
                  <span className="shop-item-hotkey">220 Rupees • Key: T / 8</span>
                </div>
                <p className="shop-item-desc">
                  Slams a radial seismic shockwave that <strong>pounds Rusted Iron Pegs flat</strong>,
                  shatters Cracked Boulders &amp; Ice/Wood Shields in 1 blow, flips Spiked Beetles,
                  and unearths Burrowed Wyrms! <em>(Or find in Map 4 SW!)</em>
                </p>
                <button
                  type="button"
                  disabled={hero.hasHammer || hero.rupees < 220}
                  onClick={() => buyShopItem("hammer")}
                  className="shop-buy-btn"
                >
                  {hero.hasHammer
                    ? "Owned ✓"
                    : hero.rupees >= 220
                    ? "Unlock War-Hammer — 220 Rupees"
                    : `Need 220 Rupees (Or Map 4 SW)`}
                </button>
              </div>

              {/* FLAME ROD (300 RUPEES — OR FREE IN DUNGEON ROOM 3) */}
              <div className={`shop-item-card ${hero.hasFireRod ? "shop-item-owned" : ""}`}>
                <div className="shop-item-top">
                  <span className="shop-item-name">Sanctum Flame Rod</span>
                  <span className="shop-item-hotkey">300 Rupees • Key: R / 3</span>
                </div>
                <p className="shop-item-desc">
                  Shoots blazing fireballs that light lanterns, burn spiderwebs/briars, and
                  melt ice armor. <em>(Or find for FREE in Dungeon Room 3!)</em>
                </p>
                <button
                  type="button"
                  disabled={hero.hasFireRod || hero.rupees < 300}
                  onClick={() => buyShopItem("fire_rod")}
                  className="shop-buy-btn"
                >
                  {hero.hasFireRod
                    ? "Owned ✓"
                    : hero.rupees >= 300
                    ? "Unlock Flame Rod — 300 Rupees"
                    : `Need 300 Rupees (Or Dungeon Rm 3)`}
                </button>
              </div>

              {/* SWIFTWIND BOOTS (300 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.unlockedBoots ?? []).includes("swift_boots") ? "shop-item-owned" : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Swiftwind Pegasus Boots</span>
                  <span className="shop-item-hotkey">300 Rupees • +25% Speed</span>
                </div>
                <p className="shop-item-desc">
                  Wing-stitched boots that permanently unlock <strong>+25% Run Speed</strong>{" "}
                  in your Character Sheet [C]!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.unlockedBoots ?? []).includes("swift_boots") || hero.rupees < 300
                  }
                  onClick={() => buyShopItem("swift_boots")}
                  className="shop-buy-btn"
                >
                  {(hero.unlockedBoots ?? []).includes("swift_boots")
                    ? "Owned ✓ (Equip in C)"
                    : hero.rupees >= 300
                    ? "Unlock Swift Boots — 300 Rupees"
                    : `Need 300 Rupees (${hero.rupees}/300)`}
                </button>
              </div>

              {/* TITAN IRON GREAVES (350 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.unlockedBoots ?? []).includes("titan_greaves")
                    ? "shop-item-owned"
                    : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Titan Iron Greaves</span>
                  <span className="shop-item-hotkey">350 Rupees • -50% Knockback</span>
                </div>
                <p className="shop-item-desc">
                  Heavy steel greaves that grant <strong>+12% Speed</strong> and halve all
                  knockback when blocking heavy attacks!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.unlockedBoots ?? []).includes("titan_greaves") || hero.rupees < 350
                  }
                  onClick={() => buyShopItem("titan_greaves")}
                  className="shop-buy-btn"
                >
                  {(hero.unlockedBoots ?? []).includes("titan_greaves")
                    ? "Owned ✓ (Equip in C)"
                    : hero.rupees >= 350
                    ? "Unlock Titan Greaves — 350 Rupees"
                    : `Need 350 Rupees (${hero.rupees}/350)`}
                </button>
              </div>

              {/* AEGIS MIRROR SHIELD (400 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.unlockedOffhands ?? []).includes("mirror_shield")
                    ? "shop-item-owned"
                    : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Aegis Mirror Shield</span>
                  <span className="shop-item-hotkey">400 Rupees • 2x Block + Magic</span>
                </div>
                <p className="shop-item-desc">
                  Polished silver-gold shield that blocks <strong>2 Damage</strong> and
                  deflects magical fireballs &amp; arcane bolts!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.unlockedOffhands ?? []).includes("mirror_shield") ||
                    hero.rupees < 400
                  }
                  onClick={() => buyShopItem("mirror_shield")}
                  className="shop-buy-btn"
                >
                  {(hero.unlockedOffhands ?? []).includes("mirror_shield")
                    ? "Owned ✓ (Equip in C)"
                    : hero.rupees >= 400
                    ? "Unlock Mirror Shield — 400 Rupees"
                    : `Need 400 Rupees (${hero.rupees}/400)`}
                </button>
              </div>

              {/* SAPPHIRE MAIL (450 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.unlockedTunics ?? []).includes("blue_mail") ? "shop-item-owned" : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Sapphire Mail (Tunic)</span>
                  <span className="shop-item-hotkey">450 Rupees • -50% DMG</span>
                </div>
                <p className="shop-item-desc">
                  Cerulean chainmail that reduces all physical &amp; magical damage by{" "}
                  <strong>50%</strong>! <em>(Or solve the Sun Shrine Torch Puzzle!)</em>
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.unlockedTunics ?? []).includes("blue_mail") || hero.rupees < 450
                  }
                  onClick={() => buyShopItem("blue_mail")}
                  className="shop-buy-btn"
                >
                  {(hero.unlockedTunics ?? []).includes("blue_mail")
                    ? "Owned ✓ (Equip in C)"
                    : hero.rupees >= 450
                    ? "Unlock Sapphire Mail — 450 Rupees"
                    : `Need 450 Rupees (${hero.rupees}/450)`}
                </button>
              </div>

              {/* TEMPERED SUN-BLADE (500 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.unlockedPrimaries ?? []).includes("tempered_blade")
                    ? "shop-item-owned"
                    : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Tempered Sun-Blade</span>
                  <span className="shop-item-hotkey">500 Rupees • 2x Sword DMG</span>
                </div>
                <p className="shop-item-desc">
                  Masterwork golden broadsword that doubles your slash damage (2 DMG) and
                  Spin Attack damage (4 DMG)!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.unlockedPrimaries ?? []).includes("tempered_blade") ||
                    hero.rupees < 500
                  }
                  onClick={() => buyShopItem("tempered_blade")}
                  className="shop-buy-btn"
                >
                  {(hero.unlockedPrimaries ?? []).includes("tempered_blade")
                    ? "Owned ✓ (Equip in C)"
                    : hero.rupees >= 500
                    ? "Unlock Tempered Blade — 500 Rupees"
                    : `Need 500 Rupees (${hero.rupees}/500)`}
                </button>
              </div>

              {/* CRIMSON DRAGON MAIL (750 RUPEES) */}
              <div
                className={`shop-item-card ${
                  (hero.unlockedTunics ?? []).includes("red_mail") ? "shop-item-owned" : ""
                }`}
              >
                <div className="shop-item-top">
                  <span className="shop-item-name">Crimson Dragon Mail</span>
                  <span className="shop-item-hotkey">750 Rupees • -75% DMG</span>
                </div>
                <p className="shop-item-desc">
                  Ultimate ruby-woven armor that reduces all incoming physical &amp; magical
                  damage by <strong>75%</strong>!
                </p>
                <button
                  type="button"
                  disabled={
                    (hero.unlockedTunics ?? []).includes("red_mail") || hero.rupees < 750
                  }
                  onClick={() => buyShopItem("red_mail")}
                  className="shop-buy-btn"
                >
                  {(hero.unlockedTunics ?? []).includes("red_mail")
                    ? "Owned ✓ (Equip in C)"
                    : hero.rupees >= 750
                    ? "Unlock Crimson Mail — 750 Rupees"
                    : `Need 750 Rupees (${hero.rupees}/750)`}
                </button>
              </div>

              {/* EMPTY GLASS BOTTLE (120 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Empty Glass Bottle</span>
                  <span className="shop-item-hotkey">
                    120 Rupees • Belt: {(hero.bottles ?? []).length}/6
                  </span>
                </div>
                <p className="shop-item-desc">
                  Adds an Empty Glass Bottle to your belt (up to 6) for storing Potions,
                  Fairies, or Golden Attack Bees.
                </p>
                <button
                  type="button"
                  disabled={(hero.bottles ?? []).length >= 6 || hero.rupees < 120}
                  onClick={() => buyShopItem("bottle")}
                  className="shop-buy-btn"
                >
                  {(hero.bottles ?? []).length >= 6
                    ? "Max 6 Bottles"
                    : hero.rupees >= 120
                    ? "Buy Empty Bottle — 120 Rupees"
                    : `Need 120 Rupees (${hero.rupees}/120)`}
                </button>
              </div>

              {/* BOTTLED GREEN MAGIC POTION (25 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Bottled Green Potion</span>
                  <span className="shop-item-hotkey">25 Rupees • Empty Bottle</span>
                </div>
                <p className="shop-item-desc">
                  Fills an Empty Bottle with Emerald Magic Potion. Drink (V) to restore 100%
                  Magic Power (MP)!
                </p>
                <button
                  type="button"
                  disabled={
                    !(hero.bottles ?? []).includes("empty") || hero.rupees < 25
                  }
                  onClick={() => buyShopItem("green_potion")}
                  className="shop-buy-btn"
                >
                  {!(hero.bottles ?? []).includes("empty")
                    ? "Need Empty Bottle (120)"
                    : hero.rupees >= 25
                    ? "Fill Green Potion — 25 Rupees"
                    : "Need 25 Rupees"}
                </button>
              </div>

              {/* BOTTLED RED LIFE POTION (30 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Bottled Red Potion</span>
                  <span className="shop-item-hotkey">30 Rupees • Empty Bottle</span>
                </div>
                <p className="shop-item-desc">
                  Fills an Empty Bottle with Crimson Life Potion. Drink anytime (V) to
                  restore 100% of your Hearts!
                </p>
                <button
                  type="button"
                  disabled={
                    !(hero.bottles ?? []).includes("empty") || hero.rupees < 30
                  }
                  onClick={() => buyShopItem("red_potion")}
                  className="shop-buy-btn"
                >
                  {!(hero.bottles ?? []).includes("empty")
                    ? "Need Empty Bottle (120)"
                    : hero.rupees >= 30
                    ? "Fill Red Potion — 30 Rupees"
                    : "Need 30 Rupees"}
                </button>
              </div>

              {/* BOTTLED BLUE ELIXIR (60 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Bottled Blue Elixir</span>
                  <span className="shop-item-hotkey">60 Rupees • Empty Bottle</span>
                </div>
                <p className="shop-item-desc">
                  Fills an Empty Bottle with Sapphire Elixir. Restores ALL Hearts and 100%
                  Magic Power when drunk!
                </p>
                <button
                  type="button"
                  disabled={
                    !(hero.bottles ?? []).includes("empty") || hero.rupees < 60
                  }
                  onClick={() => buyShopItem("blue_potion")}
                  className="shop-buy-btn"
                >
                  {!(hero.bottles ?? []).includes("empty")
                    ? "Need Empty Bottle (120)"
                    : hero.rupees >= 60
                    ? "Fill Blue Elixir — 60 Rupees"
                    : "Need 60 Rupees"}
                </button>
              </div>

              {/* BOTTLED SPRING FAIRY (80 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Captured Spring Fairy</span>
                  <span className="shop-item-hotkey">80 Rupees • Empty Bottle</span>
                </div>
                <p className="shop-item-desc">
                  Captures a Spring Fairy in an Empty Bottle. Heals 7 Hearts or
                  automatically revives you upon fatal damage!
                </p>
                <button
                  type="button"
                  disabled={
                    !(hero.bottles ?? []).includes("empty") || hero.rupees < 80
                  }
                  onClick={() => buyShopItem("fairy")}
                  className="shop-buy-btn"
                >
                  {!(hero.bottles ?? []).includes("empty")
                    ? "Need Empty Bottle (120)"
                    : hero.rupees >= 80
                    ? "Bottle Fairy — 80 Rupees"
                    : "Need 80 Rupees"}
                </button>
              </div>

              {/* BOTTLED GOLDEN BEE (50 RUPEES) */}
              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Golden Attack Bee</span>
                  <span className="shop-item-hotkey">50 Rupees • Empty Bottle</span>
                </div>
                <p className="shop-item-desc">
                  Captures a friendly Golden Bee in an Empty Bottle. Unleash (V) to chase and
                  sting nearby monsters for 15s!
                </p>
                <button
                  type="button"
                  disabled={
                    !(hero.bottles ?? []).includes("empty") || hero.rupees < 50
                  }
                  onClick={() => buyShopItem("bee")}
                  className="shop-buy-btn"
                >
                  {!(hero.bottles ?? []).includes("empty")
                    ? "Need Empty Bottle (120)"
                    : hero.rupees >= 50
                    ? "Bottle Golden Bee — 50 Rupees"
                    : "Need 50 Rupees"}
                </button>
              </div>
            </div>

            <div className="shop-footer">
              <span className="shop-footer-hint">
                Walk off the golden carpet or press Esc to close
              </span>
              <button
                type="button"
                onClick={() => setShopOpen(false)}
                className="shop-close-btn"
              >
                Done Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE CORNER MINIMAP RADAR (CLICK TO OPEN WORLD ATLAS [M]) */}
      {phase === "playing" && !editorMode && (
        <div
          onClick={() => setAtlasOpen(true)}
          title="Click or press M to open the Interactive World Atlas & Fast-Travel Network"
          style={{
            position: "fixed",
            right: "18px",
            bottom: "54px",
            width: "164px",
            padding: "7px",
            borderRadius: "14px",
            background: "rgba(11, 16, 28, 0.88)",
            border: "1px solid rgba(126, 224, 255, 0.42)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.55)",
            cursor: "pointer",
            pointerEvents: "auto",
            zIndex: 3,
            userSelect: "none",
          }}
        >
          {(() => {
            const toMini = (coord: number, inv = false) => {
              const norm = (coord + 40) / 80;
              const clamped = Math.max(0.03, Math.min(0.97, norm));
              return Math.round((inv ? 1 - clamped : clamped) * 148);
            };
            const zoneWarp = WARP_STONE_META[zone];
            const warpAwakened = (flags.awakenedWarpZones ?? ["overworld"]).includes(zone);
            const zoneProps = mapProps.filter((p) => p.zone === zone);
            const zonePortals = portals.filter((pt) => pt.zone === zone);
            const zoneEnemies = enemies.filter(
              (e) => e.zone === zone && e.state !== "dead" && !e.burrowed
            );
            const hx = toMini(hero.x);
            const hy = toMini(hero.z, true);
            const wx = toMini(wayfinderRoute.destX);
            const wy = toMini(wayfinderRoute.destZ, true);

            return (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.66rem",
                    fontWeight: 800,
                    color: "#9ee8ff",
                    marginBottom: "4px",
                    padding: "0 2px",
                  }}
                >
                  <span>MAP {zoneWarp.shortLabel.split("•")[0]?.trim()} RADAR</span>
                  <span style={{ color: "#ffd978" }}>[M] ATLAS</span>
                </div>
                <svg
                  width="148"
                  height="148"
                  viewBox="0 0 148 148"
                  style={{
                    display: "block",
                    borderRadius: "9px",
                    background: "rgba(6, 10, 18, 0.95)",
                    border: "1px solid rgba(90, 150, 210, 0.25)",
                  }}
                >
                  <line
                    x1="74"
                    y1="0"
                    x2="74"
                    y2="148"
                    stroke="rgba(120, 160, 210, 0.12)"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="74"
                    x2="148"
                    y2="74"
                    stroke="rgba(120, 160, 210, 0.12)"
                    strokeWidth="1"
                  />

                  {/* Water & Walls */}
                  {zoneProps.map((p) => {
                    const px = toMini(p.x);
                    const py = toMini(p.z, true);
                    if (p.prefab === "water_tile") {
                      return (
                        <rect
                          key={p.id}
                          x={px - 4}
                          y={py - 4}
                          width="8"
                          height="8"
                          fill="rgba(42, 148, 235, 0.42)"
                        />
                      );
                    }
                    if (
                      p.prefab === "cliff_block" ||
                      p.prefab === "stone_wall" ||
                      p.prefab === "dungeon_pillar"
                    ) {
                      return (
                        <rect
                          key={p.id}
                          x={px - 2}
                          y={py - 2}
                          width="4"
                          height="4"
                          fill="rgba(148, 162, 188, 0.42)"
                        />
                      );
                    }
                    return null;
                  })}

                  {/* Portals */}
                  {zonePortals.map((pt) => (
                    <circle
                      key={pt.id}
                      cx={toMini(pt.x)}
                      cy={toMini(pt.z, true)}
                      r="3.5"
                      fill="#c57bff"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                    />
                  ))}

                  {/* Live Enemies */}
                  {zoneEnemies.map((en) => (
                    <circle
                      key={en.id}
                      cx={toMini(en.x)}
                      cy={toMini(en.z, true)}
                      r={en.kind === "boss" ? "4.5" : "2.2"}
                      fill={en.kind === "boss" ? "#ff3860" : "#ff6b6b"}
                    />
                  ))}

                  {/* Warp Monolith Diamond */}
                  <polygon
                    points={`${toMini(zoneWarp.x)},${toMini(zoneWarp.z, true) - 5} ${
                      toMini(zoneWarp.x) + 4.5
                    },${toMini(zoneWarp.z, true)} ${toMini(zoneWarp.x)},${
                      toMini(zoneWarp.z, true) + 5
                    } ${toMini(zoneWarp.x) - 4.5},${toMini(zoneWarp.z, true)}`}
                    fill={warpAwakened ? "#4ef2ff" : "#6c7a96"}
                    stroke="#ffffff"
                    strokeWidth="0.9"
                  />

                  {/* Wayfinder Line & Target Star */}
                  {wayfinderActive && (
                    <>
                      <line
                        x1={hx}
                        y1={hy}
                        x2={wx}
                        y2={wy}
                        stroke="rgba(255, 217, 94, 0.75)"
                        strokeWidth="1.5"
                        strokeDasharray="3 2"
                      />
                      <circle
                        cx={wx}
                        cy={wy}
                        r="4"
                        fill="#ffd95e"
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    </>
                  )}

                  {/* Hero Position + Facing Direction */}
                  <line
                    x1={hx}
                    y1={hy}
                    x2={hx + Math.sin(hero.facing) * 7}
                    y2={hy - Math.cos(hero.facing) * 7}
                    stroke="#ffffff"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={hx}
                    cy={hy}
                    r="3.8"
                    fill="#4eff91"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                </svg>
              </>
            );
          })()}
        </div>
      )}

      {/* FLOATING DISCOVERY BANNER (FIXED BOTTOM OVERLAY — NEVER PUSHES SHOP UI!) */}
      {phase === "playing" && (banner || editorStatusMsg) && (
        <div key={banner?.id ?? editorStatusMsg} className="discovery-banner">
          <div className="banner-title">{editorStatusMsg ?? banner?.text}</div>
          {!editorStatusMsg && banner?.subtext && (
            <div className="banner-sub">{banner.subtext}</div>
          )}
        </div>
      )}

      {/* BOTTOM CONTROLS BAR */}
      {phase === "playing" && (
        <footer className="hud-bottom-bar">
          {editorMode ? (
            <>
              <span>
                <strong>Left-Click</strong> Select / Place / Sculpt
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Right-Click Drag</strong> Orbit Camera
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>WASD</strong> Pan Map
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Wheel</strong> Zoom
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Tab / F2</strong> Resume Play
              </span>
            </>
          ) : (
            <>
              <span>
                <strong>WASD</strong> Move / Push Blocks (1s)
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Space/LMB</strong> Slash / Spin
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>F</strong> Lift / Interact
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>L / N</strong> Quests &amp; Guide
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>M</strong> World Atlas &amp; Warp
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>C</strong> Gear &amp; Bottles
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Tab</strong> Map Editor
              </span>
            </>
          )}
        </footer>
      )}

      {/* =========================================================
          START SCREEN OVERLAY
         ========================================================= */}
      {phase === "title" && !editorMode && (
        <div className="modal-backdrop">
          <div className="modal-card title-card">
            <ZeldoCrestEmblem size={84} />
            <div className="episode-pill">EPISODE I • OVERHEAD 3D ADVENTURE</div>
            <h1 className="game-title">ZELDO</h1>
            <p className="game-subtitle">The Whispering Vale &amp; The Sunken Sanctum</p>

            <p className="story-blurb">
              Darkness stirs beneath the northern cliffs. <strong>Ignis, the Armored Eye-Golem</strong>{" "}
              guards the Sunken Sanctum — a 5-room cross-shaped puzzle box where every
              weapon unlocks the next path: hold your{" "}
              <strong>Shield (RMB / Shift)</strong> against Turret fire, throw your{" "}
              <strong>Boomerang (Q)</strong> across chasms to fetch keys &amp; stun Spiked
              Beetles, claim the <strong>Flame Rod (R)</strong> to light lanterns &amp; burn
              spiderwebs/armor, and fire your <strong>Bow (E)</strong> into Cyclops Eye
              Statues and Ignis&apos;s Open Eye!
            </p>

            <div className="controls-grid">
              <div className="control-box">
                <span className="control-key">Space/LMB (Slash) • RMB/Shift (Shield)</span>
                <span className="control-desc">Spin Attack &amp; Deflect Turret Rocks</span>
              </div>
              <div className="control-box">
                <span className="control-key">Q (Boomerang) • E (Bow &amp; Arrows)</span>
                <span className="control-desc">Fetch Over Chasms, Stun Beetles &amp; Shoot Eyes</span>
              </div>
              <div className="control-box">
                <span className="control-key">F (Lift / Throw) • B (Bombs)</span>
                <span className="control-desc">Smash Pots/Rocks &amp; Blast Secret Caves</span>
              </div>
              <div className="control-box">
                <span className="control-key">R (Flame Rod) • G (Shovel) • C (Gear)</span>
                <span className="control-desc">Light Torches, Melt Armor &amp; Dig Treasure</span>
              </div>
            </div>

            <button type="button" onClick={startGame} className="primary-cta-btn">
              Begin Adventure
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          GAME OVER OVERLAY
         ========================================================= */}
      {phase === "gameover" && !editorMode && (
        <div className="modal-backdrop gameover-backdrop">
          <div className="modal-card gameover-card">
            <h2 className="gameover-title">YOU HAVE FALLEN</h2>
            <p className="gameover-sub">
              The shadows of the Sanctum overwhelmed your courage, but the Zeldo Crest
              still awaits its champion.
            </p>

            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-val">{hero.rupees}</span>
                <span className="stat-lbl">Rupees</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{stats.enemiesDefeated}</span>
                <span className="stat-lbl">Foes Defeated</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{formatTime(stats.elapsedSeconds)}</span>
                <span className="stat-lbl">Time</span>
              </div>
            </div>

            <button type="button" onClick={restartGame} className="primary-cta-btn">
              Rise Again
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VICTORY SCREEN OVERLAY
         ========================================================= */}
      {phase === "victory" && !editorMode && (
        <div className="modal-backdrop victory-backdrop">
          <div className="modal-card victory-card">
            <ZeldoCrestEmblem size={96} />
            <div className="episode-pill">EPISODE I COMPLETE</div>
            <h2 className="victory-title">THE ZELDO CREST RESTORED!</h2>
            <p className="victory-sub">
              With Ignis, the Armored Eye-Golem defeated and the Sanctum Chest unsealed,
              golden light washes across the Whispering Vale once more.
            </p>

            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-val">{formatTime(stats.elapsedSeconds)}</span>
                <span className="stat-lbl">Clear Time</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{hero.rupees}</span>
                <span className="stat-lbl">Rupees Left</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{stats.enemiesDefeated}</span>
                <span className="stat-lbl">Foes Vanquished</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">
                  {(hero.hp / 2).toFixed(1)} / {(hero.maxHp / 2).toFixed(1)}
                </span>
                <span className="stat-lbl">Hearts Left</span>
              </div>
            </div>

            <button type="button" onClick={restartGame} className="primary-cta-btn">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
