"use client";

import React, { useRef, useState } from "react";
import {
  EditorPlaceCategory,
  TerrainBrushMode,
  useGameStore,
} from "@/store/gameStore";
import { EnemyKind, PropPrefabId, RupeeTier, ZoneId } from "@/game/worldData";

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
  { id: "wall_torch", label: "Flame Brazier", tag: "Dungeon" },
  { id: "wooden_crate", label: "Supply Crate", tag: "Dungeon" },
];

const MONSTER_PALETTE: Array<{
  prefab: string;
  label: string;
  weightLabel: string;
}> = [
  { prefab: "enemy:slime", label: "Poring Blob Slime", weightLabel: "Light (0.5)" },
  { prefab: "enemy:archer", label: "Goblin Bowman Archer", weightLabel: "Light (0.6)" },
  { prefab: "enemy:goblin", label: "Goblin Fighter", weightLabel: "Medium (2.0)" },
  { prefab: "enemy:minion", label: "Shadow Minion", weightLabel: "Medium (2.2)" },
  { prefab: "enemy:knight", label: "Sentinel Knight", weightLabel: "Heavy (12.0)" },
  { prefab: "enemy:boss", label: "Boss: Malakor", weightLabel: "Immovable (100)" },
];

const TERRAIN_SWATCHES = [
  { label: "Lush Grass", hex: "#3d8c47" },
  { label: "Cobble Path", hex: "#bfa675" },
  { label: "Sanctum Slate", hex: "#2e3040" },
  { label: "Golden Sand", hex: "#e3c16f" },
  { label: "Mystic Water", hex: "#2989d8" },
];

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
  const boomerang = useGameStore((s) => s.boomerang);

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

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && shopOpen) {
        setShopOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shopOpen, setShopOpen]);

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

  const bossEnemy = enemies.find((e) => e.kind === "boss" && e.zone === zone);
  const activeMinions = enemies.filter(
    (e) => e.kind === "minion" && e.zone === zone && e.state !== "dead"
  ).length;

  let currentObjective =
    "Visit Bramble's Shop in the East Clearing or find the Sanctum Key in the West";
  if (zone === "frontier") {
    currentObjective =
      "Explore the Elderwood Frontier — press Tab / Map Editor anytime to build & customize!";
  } else if (flags.chestUnlocked) {
    currentObjective =
      "Zeldo Crest Restored! Walk North through the Sanctum Exit to the Elderwood Frontier!";
  } else if (flags.bossDefeated) {
    currentObjective =
      "Open the Golden Chest or step North through the unsealed Sanctum Exit!";
  } else if (zone === "dungeon" && flags.gateUnlocked) {
    currentObjective = "Defeat Malakor, Warden of the Eclipse & his minions";
  } else if (zone === "dungeon" && !flags.gateUnlocked) {
    currentObjective = hero.hasDungeonKey
      ? "Advance North through the Hall of Pillars to unlock the Gate"
      : "Return South to the Overworld & find the Sanctum Key in the West";
  } else if (flags.keyPickedUp) {
    currentObjective = "Head North across the bridge to enter the Sunken Sanctum";
  }

  const zoneLabel =
    zone === "overworld"
      ? "Whispering Vale (Overworld)"
      : zone === "frontier"
      ? "Elderwood Frontier (Beyond the Sanctum)"
      : dungeonRoom === "entry"
      ? "Sunken Sanctum — I. Antechamber"
      : dungeonRoom === "hall"
      ? "Sunken Sanctum — II. Hall of Pillars"
      : "Sunken Sanctum — III. Dread Sanctum";

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

  return (
    <div className="hud-layer">
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
      <header className="hud-top-bar">
        {/* Left: Life Hearts, Zone Location & Gear Slots */}
        <div className="hud-panel hud-left">
          <div className="hud-section-label">LIFE</div>
          <div className="hearts-row">
            {hearts.map((st, idx) => (
              <HeartIcon key={idx} state={st} index={idx} />
            ))}
          </div>
          <div className="zone-badge">{zoneLabel}</div>

          {/* Equipment / Action Bar */}
          <div className="gear-slots-row">
            <div
              className={`gear-slot ${hero.isBlocking ? "gear-slot-blocking" : "gear-slot-owned"}`}
              title={`Hold Right-Click or Shift to Block (-${hero.shieldBlock ?? 1} Physical Damage)`}
            >
              <span className="gear-key">RMB</span>
              <span className="gear-name">
                {hero.isBlocking ? "GUARDING" : `Shield (-${hero.shieldBlock ?? 1})`}
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
                  : "No Boomerang"}
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
              title="Press E, F, or 2 to fire an Arrow (requires Bow + Arrows)"
            >
              <span className="gear-key">E</span>
              <span className="gear-name">
                {hero.hasBow ? `Bow (${hero.arrows})` : `Arrows: ${hero.arrows}`}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Unity-Style Play / Map Editor Toolbar + Boss Health Bar */}
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

          {!editorMode &&
            phase === "playing" &&
            zone === "dungeon" &&
            flags.bossAwakened &&
            !flags.bossDefeated &&
            bossEnemy && (
              <div className="hud-panel boss-bar-panel">
                <div className="boss-bar-header">
                  <span className="boss-name">MALAKOR, WARDEN OF THE ECLIPSE</span>
                  <span className="minion-tag">
                    {bossEnemy.state === "stunned"
                      ? "STUNNED — STRIKE NOW!"
                      : bossEnemy.state === "charge_aim" ||
                        bossEnemy.state === "charge_lock" ||
                        bossEnemy.state === "charge_lunge"
                      ? "CHARGING — LURE INTO WALL!"
                      : activeMinions > 0
                      ? `ARMORED • +${activeMinions} Minion${activeMinions > 1 ? "s" : ""}`
                      : "ARMORED — BAIT CHARGE INTO WALL"}
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

        {/* Right: Rupees, Sanctum Key, Shop Toggle, FPS, Objective, Mute */}
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
                hero.hasDungeonKey
                  ? "key-chip-active"
                  : flags.gateUnlocked
                  ? "key-chip-used"
                  : "key-chip-empty"
              }`}
              title="Sanctum Key Status"
            >
              <svg width="22" height="22" viewBox="0 0 24 24">
                <circle
                  cx="8"
                  cy="12"
                  r="5"
                  fill="none"
                  stroke={hero.hasDungeonKey || flags.gateUnlocked ? "#ffd24c" : "#6c6a7c"}
                  strokeWidth="2.4"
                />
                <path
                  d="M13 12H22M18 12V16M21 12V15"
                  stroke={hero.hasDungeonKey || flags.gateUnlocked ? "#ffd24c" : "#6c6a7c"}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
              <span className="key-status-text">
                {hero.hasDungeonKey
                  ? "Sanctum Key"
                  : flags.gateUnlocked
                  ? "Gate Opened"
                  : "No Key"}
              </span>
            </div>

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

          <div className="objective-line">{currentObjective}</div>
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
              <div className="editor-zone-switch">
                <button
                  type="button"
                  onClick={() => setEditorZone("overworld", true)}
                  className={`zone-switch-btn ${zone === "overworld" ? "active" : ""}`}
                >
                  Overworld
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("dungeon", true)}
                  className={`zone-switch-btn ${zone === "dungeon" ? "active" : ""}`}
                >
                  Dungeon
                </button>
                <button
                  type="button"
                  onClick={() => setEditorZone("frontier", true)}
                  className={`zone-switch-btn ${zone === "frontier" ? "active" : ""}`}
                >
                  Frontier
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

            {/* 2. MONSTER INSPECTOR (INCLUDING WEIGHT TUNING!) */}
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
                    <option value="slime">Poring Blob Slime</option>
                    <option value="archer">Goblin Bowman Archer</option>
                    <option value="goblin">Moss Goblin Fighter</option>
                    <option value="minion">Shadow Minion</option>
                    <option value="knight">Sentinel Knight</option>
                    <option value="boss">Boss: Malakor</option>
                  </select>
                </label>

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
                  {selectedRupee.tier === "heart" ? "HEART PICKUP" : "RUPEE PICKUP"}
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
                    <option value="red">Red Rupee (+20)</option>
                    <option value="heart">Recovery Heart (+1 Heart)</option>
                  </select>
                </label>

                <div className="inspector-xyz-grid">
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
                    <option value="overworld">Overworld (Whispering Vale)</option>
                    <option value="dungeon">Dungeon (Sunken Sanctum)</option>
                    <option value="frontier">Elderwood Frontier (Beyond Sanctum)</option>
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
          MERCHANT BRAMBLE'S CURIO SHOP MODAL (FIXED CENTER OVERLAY!)
         ========================================================= */}
      {phase === "playing" && !editorMode && shopOpen && (
        <div className="shop-panel-wrapper">
          <div className="shop-card">
            <div className="shop-header">
              <div>
                <div className="shop-pill">SOUTH CLEARING BAZAAR</div>
                <h2 className="shop-title">BRAMBLE&apos;S CURIO SHOP</h2>
              </div>
              <div className="shop-wallet">
                <span className="shop-wallet-label">YOUR RUPEES:</span>
                <span className="shop-wallet-val">{hero.rupees}</span>
              </div>
            </div>
            <p className="shop-greeting">
              &ldquo;Welcome, traveler! Spend your hard-earned Rupees on fine weapons and
              supplies. Remember — the Ranger&apos;s Bow and Arrows are sold separately!&rdquo;
            </p>

            <div className="shop-items-grid">
              <div className={`shop-item-card ${hero.hasBoomerang ? "shop-item-owned" : ""}`}>
                <div className="shop-item-top">
                  <span className="shop-item-name">Gale Boomerang</span>
                  <span className="shop-item-hotkey">Key: Q / 1</span>
                </div>
                <p className="shop-item-desc">
                  Throws a returning wind-blade that damages &amp; stuns foes in its path
                  and snatches distant Rupees.
                </p>
                <button
                  type="button"
                  disabled={hero.hasBoomerang || hero.rupees < 15}
                  onClick={() => buyShopItem("boomerang")}
                  className="shop-buy-btn"
                >
                  {hero.hasBoomerang
                    ? "Owned ✓"
                    : hero.rupees >= 15
                    ? "Buy — 15 Rupees"
                    : "Need 15 Rupees"}
                </button>
              </div>

              <div className={`shop-item-card ${hero.hasBow ? "shop-item-owned" : ""}`}>
                <div className="shop-item-top">
                  <span className="shop-item-name">Ranger&apos;s Ash Bow</span>
                  <span className="shop-item-hotkey">Key: E / 2</span>
                </div>
                <p className="shop-item-desc">
                  Crafted hunting bow for long-range attacks. Requires Arrows (purchased
                  separately) to fire!
                </p>
                <button
                  type="button"
                  disabled={hero.hasBow || hero.rupees < 20}
                  onClick={() => buyShopItem("bow")}
                  className="shop-buy-btn"
                >
                  {hero.hasBow
                    ? "Owned ✓"
                    : hero.rupees >= 20
                    ? "Buy — 20 Rupees"
                    : "Need 20 Rupees"}
                </button>
              </div>

              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Bundle of 10 Arrows</span>
                  <span className="shop-item-hotkey">Quiver: {hero.arrows}</span>
                </div>
                <p className="shop-item-desc">
                  Restocks 10 iron-tipped arrows for your quiver. Pair with the
                  Ranger&apos;s Ash Bow to snipe enemies from afar.
                </p>
                <button
                  type="button"
                  disabled={hero.rupees < 10}
                  onClick={() => buyShopItem("arrows")}
                  className="shop-buy-btn"
                >
                  {hero.rupees >= 10 ? "Buy +10 — 10 Rupees" : "Need 10 Rupees"}
                </button>
              </div>

              <div className="shop-item-card">
                <div className="shop-item-top">
                  <span className="shop-item-name">Crimson Heart Elixir</span>
                  <span className="shop-item-hotkey">
                    HP: {(hero.hp / 2).toFixed(1)}/{(hero.maxHp / 2).toFixed(1)}
                  </span>
                </div>
                <p className="shop-item-desc">
                  A warm alchemical draught brewed from sun-berries. Immediately restores
                  2 full Hearts.
                </p>
                <button
                  type="button"
                  disabled={hero.hp >= hero.maxHp || hero.rupees < 10}
                  onClick={() => buyShopItem("heart")}
                  className="shop-buy-btn"
                >
                  {hero.hp >= hero.maxHp
                    ? "Full Health"
                    : hero.rupees >= 10
                    ? "Drink — 10 Rupees"
                    : "Need 10 Rupees"}
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
                <strong>WASD / Arrows</strong> Move
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Left-Click / Space</strong> Sword
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Right-Click / Shift</strong> Shield Block
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Q</strong> Boomerang
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>E</strong> Bow
              </span>
              <span className="dot-sep">•</span>
              <span>
                <strong>Tab / F2</strong> Map Editor
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
              Darkness stirs beneath the northern cliffs. Dread Warden Malakor has stolen
              the radiant <strong>Zeldo Crest</strong> and sealed it within the Sunken
              Sanctum. Visit <strong>Bramble&apos;s Shop</strong> in the South Clearing,
              recover the <strong>Sanctum Key</strong> from the Western Ruins, or open the{" "}
              <strong>3D Map Editor</strong> to customize the world!
            </p>

            <div className="controls-grid">
              <div className="control-box">
                <span className="control-key">WASD / Arrows</span>
                <span className="control-desc">Move Hero</span>
              </div>
              <div className="control-box">
                <span className="control-key">Left-Click / Space</span>
                <span className="control-desc">Sword Slash</span>
              </div>
              <div className="control-box">
                <span className="control-key">Right-Click / Shift</span>
                <span className="control-desc">Hold Shield Block</span>
              </div>
              <div className="control-box">
                <span className="control-key">Q (Boomerang) • E (Bow)</span>
                <span className="control-desc">Use Shop Weapons</span>
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
              With Dread Warden Malakor defeated and the Sanctum Chest unsealed, golden
              light washes across the Whispering Vale once more.
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
                <span className="stat-val">{(hero.hp / 2).toFixed(1)} / 5.0</span>
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
