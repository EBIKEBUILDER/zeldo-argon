"use client";

import React from "react";
import { useGameStore } from "@/store/gameStore";

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

      {/* Base empty container */}
      <path
        d="M12 20.5C12 20.5 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.5 12 3.9C12.8 2.5 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.5 12 20.5Z"
        fill="#1e1928"
        stroke="#c9a449"
        strokeWidth="1.6"
      />

      {/* Full heart fill */}
      {state === "full" && (
        <path
          d="M12 20.5C12 20.5 2 13.8 2 7.2C2 3.9 4.6 1.5 7.7 1.5C9.6 1.5 11.2 2.5 12 3.9C12.8 2.5 14.4 1.5 16.3 1.5C19.4 1.5 22 3.9 22 7.2C22 13.8 12 20.5 12 20.5Z"
          fill={`url(#heart-grad-${index})`}
          stroke="#ffd479"
          strokeWidth="1.5"
        />
      )}

      {/* Half heart fill (left half clipped) */}
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

      {/* Specular shine on filled/half heart */}
      {state !== "empty" && (
        <ellipse cx="7.2" cy="6.2" rx="2.1" ry="1.2" transform="rotate(-25 7.2 6.2)" fill="rgba(255,255,255,0.55)" />
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
      {/* Top Diamond Shard */}
      <polygon
        points="50,6 68,36 50,54 32,36"
        fill="url(#crestGold)"
        stroke="#fff6c2"
        strokeWidth="2"
      />
      {/* Bottom-Left Diamond Shard */}
      <polygon
        points="29,42 47,62 29,90 11,62"
        fill="url(#crestGold)"
        stroke="#fff6c2"
        strokeWidth="2"
      />
      {/* Bottom-Right Diamond Shard */}
      <polygon
        points="71,42 89,62 71,90 53,62"
        fill="url(#crestGold)"
        stroke="#fff6c2"
        strokeWidth="2"
      />
      {/* Center Radiant Star */}
      <circle cx="50" cy="54" r="4.5" fill="#ffffff" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function GameOverlay() {
  const phase = useGameStore((s) => s.phase);
  const zone = useGameStore((s) => s.zone);
  const dungeonRoom = useGameStore((s) => s.dungeonRoom);
  const hero = useGameStore((s) => s.hero);
  const flags = useGameStore((s) => s.flags);
  const enemies = useGameStore((s) => s.enemies);
  const stats = useGameStore((s) => s.stats);
  const banner = useGameStore((s) => s.banner);
  const muted = useGameStore((s) => s.muted);
  const fps = useGameStore((s) => s.fps);
  const startGame = useGameStore((s) => s.startGame);
  const restartGame = useGameStore((s) => s.restartGame);
  const toggleMute = useGameStore((s) => s.toggleMute);

  const totalHeartContainers = Math.ceil(hero.maxHp / 2);
  const hearts: Array<"full" | "half" | "empty"> = [];
  for (let i = 0; i < totalHeartContainers; i++) {
    const heartHp = hero.hp - i * 2;
    if (heartHp >= 2) hearts.push("full");
    else if (heartHp === 1) hearts.push("half");
    else hearts.push("empty");
  }

  const bossEnemy = enemies.find((e) => e.kind === "boss");
  const activeMinions = enemies.filter(
    (e) => e.kind === "minion" && e.state !== "dead"
  ).length;

  let currentObjective = "Explore the Western Ruins to find the Sanctum Key";
  if (flags.chestUnlocked) {
    currentObjective = "The Zeldo Crest has been restored!";
  } else if (flags.bossDefeated) {
    currentObjective = "Open the Golden Chest at the North Altar!";
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
      : dungeonRoom === "entry"
      ? "Sunken Sanctum — I. Antechamber"
      : dungeonRoom === "hall"
      ? "Sunken Sanctum — II. Hall of Pillars"
      : "Sunken Sanctum — III. Dread Sanctum";

  return (
    <div className="hud-layer">
      {/* TOP HUD BAR */}
      <header className="hud-top-bar">
        {/* Left: Life Hearts & Zone Location */}
        <div className="hud-panel hud-left">
          <div className="hud-section-label">LIFE</div>
          <div className="hearts-row">
            {hearts.map((st, idx) => (
              <HeartIcon key={idx} state={st} index={idx} />
            ))}
          </div>
          <div className="zone-badge">{zoneLabel}</div>
        </div>

        {/* Center: Boss Health Bar (when Boss is awakened in Dungeon) */}
        {phase === "playing" &&
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

        {/* Right: Rupees, Sanctum Key, FPS, Objective, Mute */}
        <div className="hud-panel hud-right">
          <div className="hud-counters">
            {/* Rupee Counter */}
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

            {/* Key Status Slot */}
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

            {/* Live FPS Badge */}
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

      {/* FLOATING DISCOVERY BANNER */}
      {phase === "playing" && banner && (
        <div key={banner.id} className="discovery-banner">
          <div className="banner-title">{banner.text}</div>
          {banner.subtext && <div className="banner-sub">{banner.subtext}</div>}
        </div>
      )}

      {/* BOTTOM CONTROLS BAR */}
      {phase === "playing" && (
        <footer className="hud-bottom-bar">
          <span>
            <strong>WASD / Arrows</strong> Move
          </span>
          <span className="dot-sep">•</span>
          <span>
            <strong>Space / J / Click</strong> Sword Slash
          </span>
          <span className="dot-sep">•</span>
          <span>
            <strong>Walk into Key / Gate / Chest</strong> Interact
          </span>
        </footer>
      )}

      {/* =========================================================
          START SCREEN OVERLAY
         ========================================================= */}
      {phase === "title" && (
        <div className="modal-backdrop">
          <div className="modal-card title-card">
            <ZeldoCrestEmblem size={84} />
            <div className="episode-pill">EPISODE I • OVERHEAD 3D ADVENTURE</div>
            <h1 className="game-title">ZELDO</h1>
            <p className="game-subtitle">The Whispering Vale &amp; The Sunken Sanctum</p>

            <p className="story-blurb">
              Darkness stirs beneath the northern cliffs. Dread Warden Malakor has stolen
              the radiant <strong>Zeldo Crest</strong> and sealed it within the Sunken
              Sanctum. Recover the <strong>Sanctum Key</strong> from the Western
              Watchtower Ruins, breach the locked dungeon gate, and vanquish the Warden!
            </p>

            <div className="controls-grid">
              <div className="control-box">
                <span className="control-key">WASD / Arrows</span>
                <span className="control-desc">Move Hero</span>
              </div>
              <div className="control-box">
                <span className="control-key">Space / J / Click</span>
                <span className="control-desc">Sword Swing</span>
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
      {phase === "gameover" && (
        <div className="modal-backdrop gameover-backdrop">
          <div className="modal-card gameover-card">
            <h2 className="gameover-title">YOU HAVE FALLEN</h2>
            <p className="gameover-sub">
              The shadows of the Sanctum overwhelmed your courage, but the Zeldo Crest
              still awaits its champion.
            </p>

            <div className="stats-row">
              <div className="stat-item">
                <span className="stat-val">{ hero.rupees }</span>
                <span className="stat-lbl">Rupees</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{ stats.enemiesDefeated }</span>
                <span className="stat-lbl">Foes Defeated</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{ formatTime(stats.elapsedSeconds) }</span>
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
      {phase === "victory" && (
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
                <span className="stat-val">{ formatTime(stats.elapsedSeconds) }</span>
                <span className="stat-lbl">Clear Time</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{ hero.rupees }</span>
                <span className="stat-lbl">Rupees Collected</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{ stats.enemiesDefeated }</span>
                <span className="stat-lbl">Foes Vanquished</span>
              </div>
              <div className="stat-item">
                <span className="stat-val">{ (hero.hp / 2).toFixed(1) } / 5.0</span>
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
