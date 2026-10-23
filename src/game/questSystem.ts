import {
  ATOLL_PEARL_CHEST_POS,
  ATOLL_VICTORY_CHEST_POS,
  BIG_KEY_CHEST_POS,
  BOSS_CHEST_POS,
  CAVERN_CREST_KEY_POS,
  CAVERN_HAMMER_CHEST_POS,
  CAVERN_SHOVEL_CHEST_POS,
  CALDERA_BOSS_GATE_POS,
  CALDERA_FORGE_CHEST_POS,
  CALDERA_VICTORY_CHEST_POS,
  CITADEL_ARMORY_CHEST_POS,
  CITADEL_BOSS_GATE_POS,
  CITADEL_VICTORY_CHEST_POS,
  DESERT_CALDERA_GATE_POS,
  DESERT_OASIS_CHEST_POS,
  DESERT_SOLAR_KEY_POS,
  DG_SMALL_KEY_POS,
  DUNGEON_ENTRY_GATE_POS,
  DUNGEON_KEY_POS,
  DungeonRoomId,
  EAST_WING_DOOR_POS,
  FIRE_ROD_CHEST_POS,
  FRONTIER_BOMB_CHEST_POS,
  FRONTIER_CITADEL_GATE_POS,
  FRONTIER_HOOKSHOT_CHEST_POS,
  HEIRLOOM_NPC_POS,
  HOLLOW_SPORE_CHEST_POS,
  HOLLOW_VICTORY_CHEST_POS,
  LOCKED_GATE_POS,
  MapPortal,
  SECRET_STASH_POS,
  SKY_CELESTIAL_CHEST_POS,
  SKY_VICTORY_CHEST_POS,
  ZoneId,
} from "@/game/worldData";
import type { GameFlags, HeroState } from "@/store/gameStore";

export interface QuestEntry {
  id: string;
  category: "chapter" | "rumor";
  chapterNumber?: string;
  title: string;
  regionLabel: string;
  summary: string;
  wayfinderHint: string;
  status: "active" | "completed" | "shrouded";
  targetZone: ZoneId;
  targetX: number;
  targetZ: number;
  targetLabel: string;
}

export interface WayfinderRoute {
  quest: QuestEntry;
  destX: number;
  destZ: number;
  destLabel: string;
  isPortalHop: boolean;
  nextZone?: ZoneId;
  waypoints: Array<{ x: number; z: number }>;
  totalLength: number;
}

export interface QuestChronicleData {
  chapters: QuestEntry[];
  rumors: QuestEntry[];
  activeQuest: QuestEntry;
}

export function buildQuestChronicle(params: {
  zone: ZoneId;
  dungeonRoom: DungeonRoomId;
  hero: HeroState;
  flags: GameFlags;
  pinnedQuestId: string | null;
}): QuestChronicleData {
  const { zone, dungeonRoom, hero, flags, pinnedQuestId } = params;

  // =========================================================
  // 1. MAIN STORY CHAPTERS (ACTS I – VII) — ZERO REWARD/BOSS SPOILERS
  // =========================================================
  const ch1Done = Boolean(flags.dungeonEntryUnlocked);
  const ch2Done = Boolean(flags.chestUnlocked || flags.bossDefeated);
  const ch3Done = Boolean(
    flags.frontierBombChestOpened &&
      (flags.cavernShovelChestOpened ||
        flags.cavernBossDefeated ||
        flags.cavernCrestKeyPickedUp ||
        flags.frontierCitadelGateUnlocked)
  );
  const ch4Done = Boolean(flags.cavernCrestKeyPickedUp || flags.frontierCitadelGateUnlocked);
  const ch5Done = Boolean(flags.citadelVictoryChestOpened || flags.citadelBossDefeated);
  const ch6Done = Boolean(flags.desertCalderaGateUnlocked || flags.desertSolarKeyPickedUp);
  const ch7Done = Boolean(flags.calderaVictoryChestOpened || flags.calderaBossDefeated);
  const ch8Done = Boolean(flags.atollVictoryChestOpened || flags.atollBossDefeated);
  const ch9Done = Boolean(flags.hollowVictoryChestOpened || flags.hollowBossDefeated);
  const ch10Done = Boolean(flags.skyVictoryChestOpened || flags.skyBossDefeated);

  // Chapter I dynamic step
  let ch1TargetZone: ZoneId = "grove";
  let ch1TargetX = -6.5;
  let ch1TargetZ = 6.2;
  let ch1TargetLabel = "Western Grove Stream";
  let ch1Summary =
    "The northern temple gate stands sealed by an ancient lock. Villagers whisper of an old shrine hidden deep within the western forest grove.";
  let ch1Hint =
    "Follow the western cobble path out of Crossroads Village into the Whispering Forest Grove, then look across the stream for a glowing crystal orb or ambushers.";

  if (flags.keyPickedUp || hero.hasDungeonKey) {
    ch1TargetZone = "overworld";
    ch1TargetX = DUNGEON_ENTRY_GATE_POS.x;
    ch1TargetZ = DUNGEON_ENTRY_GATE_POS.z;
    ch1TargetLabel = "Northern Sanctum Gate";
    ch1Summary =
      "You hold the ancient shrine key from the western woods. The sealed iron gate north of the river bridge awaits.";
    ch1Hint =
      "Return east to Crossroads Village, raise your shield while crossing the northern bridge, and approach the northern iron gate.";
  } else if (flags.grovePuzzleSolved) {
    ch1TargetZone = "grove";
    ch1TargetX = DUNGEON_KEY_POS.x;
    ch1TargetZ = DUNGEON_KEY_POS.z;
    ch1TargetLabel = "Grove Shrine Pedestal";
    ch1Summary =
      "The crystal barrier in the forest grove has subsided, revealing a glinting relic atop the northern stone altar.";
    ch1Hint =
      "Step up to the northern pedestal in the Whispering Grove (or cast a curved throw from afar) to claim the key.";
  }

  // Chapter II dynamic step (5-Room Sunken Sanctum)
  let ch2TargetZone: ZoneId = "dungeon";
  let ch2TargetX = -24.0;
  let ch2TargetZ = 0.0;
  let ch2TargetLabel = "Western Gallery Passage";
  let ch2Summary =
    "Beneath the northern arch lies the Sunken Sanctum. The great northern door in the central hall is barred by unlit braziers and a heavy lock.";
  let ch2Hint =
    "Explore the open western doorway from the Central Hub first; something gleams across the subterranean chasm.";

  if (flags.bossDefeated && !flags.chestUnlocked) {
    ch2TargetX = BOSS_CHEST_POS.x;
    ch2TargetZ = BOSS_CHEST_POS.z;
    ch2TargetLabel = "Unsealed Sanctum Reliquary";
    ch2Summary =
      "Silence returns to the inner sanctum. The crimson ward around the northern altar chest has faded.";
    ch2Hint = "Step up to the ornate chest at the north end of the sanctum to claim its blessing.";
  } else if (flags.gateUnlocked) {
    ch2TargetX = 0.0;
    ch2TargetZ = 22.0;
    ch2TargetLabel = "Inner Sanctum Chamber";
    ch2Summary = !flags.bossAwakened
      ? "The heavy northern bars have descended. A dormant presence stirs within the northernmost chamber."
      : flags.bossState === "ARMORED"
      ? "The sanctum guardian's thorny carapace deflects steel and arrows alike. Only searing heat can strip away its shell."
      : flags.bossState === "EXPOSED_EYE"
      ? "The guardian's core eye glares wide open! Strike it from afar before its shell regenerates!"
      : "The guardian has crashed to the stone floor! Rush in and strike with your blade!";
    ch2Hint =
      "Use fire to burn away the outer shell, pierce the exposed eye with a ranged shot, then slash while it is toppled.";
  } else if (flags.hasBigKey && flags.dungeonTimedTorchSolved) {
    ch2TargetX = LOCKED_GATE_POS.x;
    ch2TargetZ = LOCKED_GATE_POS.z;
    ch2TargetLabel = "Northern Sanctum Gate";
    ch2Summary =
      "All four central braziers burn in unison and the ornate sanctum key is in your possession. The northern gate can now be unsealed.";
    ch2Hint = "Walk up to the northern gate in the Central Hub to unlock the inner chamber.";
  } else if (flags.hasBigKey && !flags.dungeonTimedTorchSolved) {
    ch2TargetX = 0.0;
    ch2TargetZ = -1.0;
    ch2TargetLabel = "Central Hub Braziers";
    ch2Summary =
      "You carry the grand key from the dark crypt, yet the four timed braziers in the central hall must all burn together to release the iron bars.";
    ch2Hint =
      "Return to the Central Hub (Room 1) and ignite all four central braziers before their flames fade.";
  } else if (flags.dungeonEyeStatuesSolved && !flags.bigKeyChestOpened) {
    ch2TargetX = BIG_KEY_CHEST_POS.x;
    ch2TargetZ = BIG_KEY_CHEST_POS.z;
    ch2TargetLabel = "Unsealed Crypt Chest";
    ch2Summary =
      "The stone eye in the southern crypt has closed its gaze, lifting the seal upon the central vault chest.";
    ch2Hint = "Open the chest in the center of the Dark Crypt (Room 4).";
  } else if (flags.webBarrierBurned || dungeonRoom === "crypt") {
    ch2TargetX = 26.0;
    ch2TargetZ = -34.2;
    ch2TargetLabel = "Shrouded Southern Crypt";
    ch2Summary =
      "Thick darkness shrouds the southern vault. Unlit corner braziers hide floor hazards and a watchful stone carving along the south wall.";
    ch2Hint =
      "Ignite the corner lanterns in the southern crypt so you can spot and pierce the stone eye carving on the south wall.";
  } else if (flags.fireRodChestOpened) {
    ch2TargetX = 26.0;
    ch2TargetZ = -9.5;
    ch2TargetLabel = "Webbed Southern Arch";
    ch2Summary =
      "With the ember relic in hand, dry cobwebs and cold lanterns are no longer an obstacle. A webbed archway leads south from the East Wing.";
    ch2Hint =
      "Light the two unlit southern braziers in the East Wing and burn away the thick cobwebs blocking the southern passage.";
  } else if (flags.eastWingDoorUnlocked) {
    ch2TargetX = FIRE_ROD_CHEST_POS.x;
    ch2TargetZ = FIRE_ROD_CHEST_POS.z;
    ch2TargetLabel = "East Wing Sanctum";
    ch2Summary =
      "The eastern wing door stands open. Three armored sentries guard a sealed reliquary pedestal in the center of the chamber.";
    ch2Hint =
      "Defeat all three defenders in the East Wing (Room 3) to unseal the central chest.";
  } else if (flags.hasSmallKey || flags.dgSmallKeyPickedUp) {
    ch2TargetX = EAST_WING_DOOR_POS.x;
    ch2TargetZ = EAST_WING_DOOR_POS.z;
    ch2TargetLabel = "Locked East Wing Door";
    ch2Summary =
      "You retrieved the small key from across the western chasm. The locked door on the east side of the central hall awaits.";
    ch2Hint = "Return to the Central Hub (Room 1) and walk up to the eastern locked door.";
  } else {
    ch2TargetX = DG_SMALL_KEY_POS.x;
    ch2TargetZ = DG_SMALL_KEY_POS.z;
    ch2TargetLabel = "West Chasm Pedestal";
    ch2Summary =
      "In the western gallery, a narrow chasm separates you from a small key resting on a stone pillar.";
    ch2Hint =
      "Enter the West Wing (Room 2) and send a curved throw across the water gap to snag the key.";
  }

  // Chapter III dynamic step (Elderwood Highlands)
  let ch3TargetZone: ZoneId = "frontier";
  let ch3TargetX = 24.5;
  let ch3TargetZ = -18.5;
  let ch3TargetLabel = "Southeastern Outpost";
  let ch3Summary =
    "Beyond the eastern briar pass lies Elderwood Highlands. Smoke rises from a besieged stone outpost in the southeastern crags, while a cracked landslide blocks the eastern quarry.";
  let ch3Hint =
    "Travel to Elderwood Highlands (via the North Sanctum portal or burning the eastern vines in Crossroads Village) and clear the southeastern briar-choked outpost.";

  if (flags.frontierBombChestOpened) {
    ch3TargetX = 31.2;
    ch3TargetZ = -2.5;
    ch3TargetLabel = "Cracked Quarry Pass";
    ch3Summary =
      "With the sapper's supplies recovered from the southeastern outpost, the fractured boulders sealing the eastern quarry pass can finally be cleared.";
    ch3Hint =
      "Head to the eastern edge of Elderwood Highlands (31, -2.5) and shatter the cracked boulder blocking the pass.";
  }

  // Chapter IV dynamic step (Frostpeak Caverns)
  let ch4TargetZone: ZoneId = "caverns";
  let ch4TargetX = CAVERN_CREST_KEY_POS.x;
  let ch4TargetZ = CAVERN_CREST_KEY_POS.z;
  let ch4TargetLabel = "Eastern Glacial Sanctum";
  let ch4Summary =
    "Icy winds howl through Frostpeak Caverns. Deep in the eastern sanctum, a frost-bound crest rests behind a crystal ward and an ancient slumbering colossus.";
  let ch4Hint =
    "Explore the northwestern cracked wall for buried tools, then trigger the eastern crystal orb and overcome the eastern sanctum's guardian.";

  if (flags.cavernBossDefeated && !flags.cavernCrestKeyPickedUp) {
    ch4TargetX = CAVERN_CREST_KEY_POS.x;
    ch4TargetZ = CAVERN_CREST_KEY_POS.z;
    ch4TargetLabel = "Unsealed Glacial Pedestal";
    ch4Summary =
      "The frost colossus has shattered. The icy ward around the eastern pedestal has lifted, leaving the crest key ready to claim.";
    ch4Hint = "Step up to the eastern pedestal in Frostpeak Caverns (24, 14) to claim the key.";
  } else if (flags.cavernBossAwakened && !flags.cavernBossDefeated) {
    ch4TargetX = 24.0;
    ch4TargetZ = 19.0;
    ch4TargetLabel = "Eastern Glacial Arena";
    ch4Summary =
      flags.bossState === "ARMORED"
        ? "A towering frost colossus guards the eastern sanctum. Its thick permafrost shell shrugs off ordinary blades."
        : flags.bossState === "EXPOSED_EYE"
        ? "The colossus's core eye is exposed! Strike it with a ranged shot before the frost reforms!"
        : "The colossus is stunned on the cavern floor! Strike with your blade!";
    ch4Hint = "Crack or melt its icy shell, shoot its open eye, and slash while stunned.";
  } else if (!flags.cavernShovelChestOpened) {
    ch4TargetX = CAVERN_SHOVEL_CHEST_POS.x;
    ch4TargetZ = CAVERN_SHOVEL_CHEST_POS.z;
    ch4TargetLabel = "Northwestern Cracked Alcove";
    ch4Summary =
      "Before braving the deepest ice vaults, a fractured rock wall in the northwestern caverns conceals an old excavator's cache.";
    ch4Hint =
      "Blast the cracked boulder in the northwestern corner of Frostpeak Caverns (-22, 11.5) and open the chest inside.";
  }

  // Chapter V dynamic step (The Obsidian Citadel)
  let ch5TargetZone: ZoneId = "citadel";
  let ch5TargetX = CITADEL_BOSS_GATE_POS.x;
  let ch5TargetZ = CITADEL_BOSS_GATE_POS.z;
  let ch5TargetLabel = "Citadel Inner Sanctum Gate";
  let ch5Summary =
    "North of the highlands rises the Obsidian Citadel. Its inner sanctum is sealed by four ritual braziers and twin watchful eyes, while a western armory lies hidden behind webs and cracked stone.";
  let ch5Hint =
    "Unlock the northern gate in Elderwood Highlands, investigate the Citadel's western armory, then unseal the central gate.";

  if (!flags.frontierCitadelGateUnlocked) {
    ch5TargetZone = "frontier";
    ch5TargetX = FRONTIER_CITADEL_GATE_POS.x;
    ch5TargetZ = FRONTIER_CITADEL_GATE_POS.z;
    ch5TargetLabel = "Northern Highlands Gate";
    ch5Summary =
      "The frost-forged key resonates with the towering iron gate at the northern border of Elderwood Highlands.";
    ch5Hint =
      "Return to Elderwood Highlands and approach the northern gate (0, 31.8) to open the way to the Citadel.";
  } else if (flags.citadelBossDefeated && !flags.citadelVictoryChestOpened) {
    ch5TargetX = CITADEL_VICTORY_CHEST_POS.x;
    ch5TargetZ = CITADEL_VICTORY_CHEST_POS.z;
    ch5TargetLabel = "Citadel Northern Reliquary";
    ch5Summary =
      "The shadow over the Obsidian Citadel has been lifted. An unsealed royal reliquary gleams near the northern dais.";
    ch5Hint = "Open the unsealed chest in the northern hall of the Obsidian Citadel (-6.5, 32).";
  } else if (flags.citadelGateUnlocked) {
    ch5TargetX = 0.0;
    ch5TargetZ = 24.0;
    ch5TargetLabel = "Citadel Northern Hall";
    ch5Summary = !flags.citadelBossAwakened
      ? "The inner gate of the Obsidian Citadel has opened. Step north into the silent throne hall."
      : flags.bossState === "ARMORED"
      ? "The citadel's sovereign unleashes dark void bolts from behind an arcane shell. Deflect its magic or scorch its armor!"
      : flags.bossState === "EXPOSED_EYE"
      ? "The sovereign's eye is unguarded! Pierce it from afar!"
      : "The sovereign has fallen to one knee! Strike now with your blade!";
    ch5Hint =
      "Turn the sovereign's own bolts back with a polished shield or use fire to break its guard.";
  } else if (!flags.citadelArmoryChestOpened) {
    ch5TargetX = CITADEL_ARMORY_CHEST_POS.x;
    ch5TargetZ = CITADEL_ARMORY_CHEST_POS.z;
    ch5TargetLabel = "Western Citadel Armory";
    ch5Summary =
      "Inscriptions in the Citadel courtyard speak of sacred arms sealed within the western wing behind cobwebs and cracked masonry.";
    ch5Hint =
      "Clear the spiderwebs and cracked wall on the west side of the Obsidian Citadel (-22, -6) to open the armory chest.";
  }

  // Chapter VI dynamic step (Sunscorched Oasis)
  let ch6TargetZone: ZoneId = "desert";
  let ch6TargetX = DESERT_SOLAR_KEY_POS.x;
  let ch6TargetZ = DESERT_SOLAR_KEY_POS.z;
  let ch6TargetLabel = "Eastern Sun-Pyramid Altar";
  let ch6Summary =
    "Beyond the southern canyon lies the Sunscorched Oasis. Heat shimmers around a sunken pyramid in the east, where a solar crest is bound by ancient wards.";
  let ch6Hint =
    "Travel south from Elderwood Highlands (or via the northeastern Citadel portal) into the Sunscorched Oasis and unseal the eastern pyramid.";

  if (flags.desertSolarKeyPickedUp && !flags.desertCalderaGateUnlocked) {
    ch6TargetX = DESERT_CALDERA_GATE_POS.x;
    ch6TargetZ = DESERT_CALDERA_GATE_POS.z;
    ch6TargetLabel = "Eastern Canyon Gate";
    ch6Summary =
      "The solar crest key radiates warmth in your pack, pointing toward the barred canyon gate on the eastern edge of the dunes.";
    ch6Hint =
      "Walk up to the locked gate on the eastern edge of the Sunscorched Oasis (31.8, 0).";
  } else if (flags.desertBossDefeated && !flags.desertSolarKeyPickedUp) {
    ch6TargetX = DESERT_SOLAR_KEY_POS.x;
    ch6TargetZ = DESERT_SOLAR_KEY_POS.z;
    ch6TargetLabel = "Unsealed Solar Pedestal";
    ch6Summary =
      "The desert behemoth lies still beneath the sun. The golden key atop the eastern pyramid pedestal is unsealed.";
    ch6Hint = "Claim the key from the eastern pyramid pedestal (22, 10.5).";
  } else if (flags.desertBossAwakened && !flags.desertBossDefeated) {
    ch6TargetX = 22.0;
    ch6TargetZ = 16.0;
    ch6TargetLabel = "Eastern Sun-Pyramid Sands";
    ch6Summary =
      flags.bossState === "ARMORED"
        ? "An armored desert behemoth stalks the eastern pyramid. Heavy impacts or searing flames can crack its golden chitin."
        : flags.bossState === "EXPOSED_EYE"
        ? "The behemoth's eye is exposed! Loose a shot before its shell hardens!"
        : "The behemoth is toppled in the sand! Rush in and strike!";
    ch6Hint = "Crack its shell with heavy force or fire, shoot its eye, then slash.";
  }

  // Chapter VII dynamic step (Skyward Caldera)
  let ch7TargetZone: ZoneId = "caldera";
  let ch7TargetX = CALDERA_BOSS_GATE_POS.x;
  let ch7TargetZ = CALDERA_BOSS_GATE_POS.z;
  let ch7TargetLabel = "Caldera Sanctum Gate";
  let ch7Summary =
    "Rivers of magma divide the basalt islands of Skyward Caldera. At the northern peak, a sealed gate bars the final ancient altar.";
  let ch7Hint =
    "Cross the basalt islands using grapple anchors and iron stakes, then solve the central caldera trials to open the northern gate.";

  if (flags.calderaBossDefeated && !flags.calderaVictoryChestOpened) {
    ch7TargetX = CALDERA_VICTORY_CHEST_POS.x;
    ch7TargetZ = CALDERA_VICTORY_CHEST_POS.z;
    ch7TargetLabel = "Dragon's Peak Reliquary";
    ch7Summary =
      "The volcanic peak grows calm at last. The final reliquary chest atop the northern dais stands unsealed.";
    ch7Hint = "Step up to the unsealed chest at the northern peak (-6.5, 32).";
  } else if (flags.calderaGateUnlocked) {
    ch7TargetX = 0.0;
    ch7TargetZ = 24.0;
    ch7TargetLabel = "Northern Caldera Peak";
    ch7Summary = !flags.calderaBossAwakened
      ? "The northern caldera gate has descended into the basalt. Ascend the northern bridge toward the summit."
      : flags.bossState === "ARMORED"
      ? "An ancient magma wyrm coils around the summit! Shatter its molten scales or turn its own fiery bolts back upon it!"
      : flags.bossState === "EXPOSED_EYE"
      ? "The magma wyrm's core eye burns bright and unguarded! Strike it from afar!"
      : "The wyrm has collapsed onto the basalt! Unleash your blade!";
    ch7Hint =
      "Break its molten armor with heavy impacts or reflected bolts, pierce its open eye, and strike while it is downed.";
  }

  const rawChapters: Array<Omit<QuestEntry, "status"> & { done: boolean }> = [
    {
      id: "chapter-1",
      category: "chapter",
      chapterNumber: "Chapter I",
      title: "Whispers at the Crossroads",
      regionLabel: "Crossroads Hub & Western Grove",
      summary: ch1Summary,
      wayfinderHint: ch1Hint,
      targetZone: ch1TargetZone,
      targetX: ch1TargetX,
      targetZ: ch1TargetZ,
      targetLabel: ch1TargetLabel,
      done: ch1Done,
    },
    {
      id: "chapter-2",
      category: "chapter",
      chapterNumber: "Chapter II",
      title: "Echoes Below the Stone",
      regionLabel: "The Sunken Sanctum",
      summary: ch2Summary,
      wayfinderHint: ch2Hint,
      targetZone: ch2TargetZone,
      targetX: ch2TargetX,
      targetZ: ch2TargetZ,
      targetLabel: ch2TargetLabel,
      done: ch2Done,
    },
    {
      id: "chapter-3",
      category: "chapter",
      chapterNumber: "Chapter III",
      title: "Beyond the Scorched Briars",
      regionLabel: "Elderwood Highlands",
      summary: ch3Summary,
      wayfinderHint: ch3Hint,
      targetZone: ch3TargetZone,
      targetX: ch3TargetX,
      targetZ: ch3TargetZ,
      targetLabel: ch3TargetLabel,
      done: ch3Done,
    },
    {
      id: "chapter-4",
      category: "chapter",
      chapterNumber: "Chapter IV",
      title: "Heart of the Permafrost",
      regionLabel: "Frostpeak Caverns",
      summary: ch4Summary,
      wayfinderHint: ch4Hint,
      targetZone: ch4TargetZone,
      targetX: ch4TargetX,
      targetZ: ch4TargetZ,
      targetLabel: ch4TargetLabel,
      done: ch4Done,
    },
    {
      id: "chapter-5",
      category: "chapter",
      chapterNumber: "Chapter V",
      title: "Towers of Dark Glass",
      regionLabel: "The Obsidian Citadel",
      summary: ch5Summary,
      wayfinderHint: ch5Hint,
      targetZone: ch5TargetZone,
      targetX: ch5TargetX,
      targetZ: ch5TargetZ,
      targetLabel: ch5TargetLabel,
      done: ch5Done,
    },
    {
      id: "chapter-6",
      category: "chapter",
      chapterNumber: "Chapter VI",
      title: "Mirage of the Shifting Sands",
      regionLabel: "Sunscorched Oasis",
      summary: ch6Summary,
      wayfinderHint: ch6Hint,
      targetZone: ch6TargetZone,
      targetX: ch6TargetX,
      targetZ: ch6TargetZ,
      targetLabel: ch6TargetLabel,
      done: ch6Done,
    },
    {
      id: "chapter-7",
      category: "chapter",
      chapterNumber: "Chapter VII",
      title: "Crown of the Skyward Peak",
      regionLabel: "Skyward Caldera",
      summary: ch7Summary,
      wayfinderHint: ch7Hint,
      targetZone: ch7TargetZone,
      targetX: ch7TargetX,
      targetZ: ch7TargetZ,
      targetLabel: ch7TargetLabel,
      done: ch7Done,
    },
    {
      id: "chapter-8",
      category: "chapter",
      chapterNumber: "Chapter VIII",
      title: "Tides of the Sunken Atoll",
      regionLabel: "Sunken Coral Atoll",
      summary: flags.atollBossDefeated
        ? "The turquoise waters of the Sunken Coral Atoll have grown tranquil. An unsealed tidal reliquary gleams at the northern reef."
        : "Southeast of Crossroads Village and south of the desert dunes lies a turquoise lagoon of sunken marble ruins where an ancient sea leviathan stirs.",
      wayfinderHint:
        "Enter the Sunken Coral Atoll via the southeastern coast of Crossroads Village (34.8, -21) or the south shore of the Sunscorched Oasis (0, -34.5), and confront the northern reef guardian.",
      targetZone: "atoll",
      targetX: flags.atollBossDefeated ? ATOLL_VICTORY_CHEST_POS.x : 0.0,
      targetZ: flags.atollBossDefeated ? ATOLL_VICTORY_CHEST_POS.z : 25.0,
      targetLabel: flags.atollBossDefeated ? "Tidal Reef Reliquary" : "Northern Coral Sanctum",
      done: ch8Done,
    },
    {
      id: "chapter-9",
      category: "chapter",
      chapterNumber: "Chapter IX",
      title: "Glow of the Mycelial Deep",
      regionLabel: "Bioluminescent Fungal Hollow",
      summary: flags.hollowBossDefeated
        ? "The toxic spores of the Fungal Hollow have settled into a gentle luminescence. The northern spore reliquary stands unsealed."
        : "Beyond the westernmost trees of Whispering Grove and the northern tunnels of Frostpeak Caverns lies a bioluminescent mushroom mire ruled by a colossal spore entity.",
      wayfinderHint:
        "Travel into the Bioluminescent Fungal Hollow from the west edge of Whispering Grove (-32, 6) or the north tunnel of Frostpeak Caverns (0, 34.5) and clear the northern lair.",
      targetZone: "hollow",
      targetX: flags.hollowBossDefeated ? HOLLOW_VICTORY_CHEST_POS.x : 0.0,
      targetZ: flags.hollowBossDefeated ? HOLLOW_VICTORY_CHEST_POS.z : 25.0,
      targetLabel: flags.hollowBossDefeated ? "Mycelial Hoard Chest" : "Northern Spore Lair",
      done: ch9Done,
    },
    {
      id: "chapter-10",
      category: "chapter",
      chapterNumber: "Chapter X",
      title: "Citadel Above the Stars",
      regionLabel: "Aetherial Sky-Archipelago",
      summary: flags.skyBossDefeated
        ? "The Starlight Observatory shines in eternal harmony across the clouds. Claim the sovereign crown chest atop the northern dais."
        : "High above the northeastern summit of Skyward Caldera, a golden ascension portal leads to floating marble islands and the Starlight Observatory.",
      wayfinderHint:
        "Step into the northeastern ascension portal in Skyward Caldera (24, 33.5) to reach the Aetherial Sky-Archipelago and challenge the Starlight Archon.",
      targetZone: "sky",
      targetX: flags.skyBossDefeated ? SKY_VICTORY_CHEST_POS.x : 0.0,
      targetZ: flags.skyBossDefeated ? SKY_VICTORY_CHEST_POS.z : 25.5,
      targetLabel: flags.skyBossDefeated ? "Aetherial Crown Chest" : "Starlight Observatory Summit",
      done: ch10Done,
    },
  ];

  let foundFirstActive = false;
  const chapters: QuestEntry[] = rawChapters.map((c) => {
    if (c.done) {
      return { ...c, status: "completed" };
    }
    if (!foundFirstActive) {
      foundFirstActive = true;
      return { ...c, status: "active" };
    }
    return { ...c, status: "shrouded" };
  });

  // =========================================================
  // 2. SIDE MYSTERIES & RUMORS (SPOILER-FREE OPTIONAL LEADS)
  // =========================================================
  const rumors: QuestEntry[] = [
    {
      id: "rumor-elder-heirloom",
      category: "rumor",
      title: "The Elder's Lost Heirloom",
      regionLabel: "Crossroads Village (East)",
      summary: flags.heirloomQuestClaimed
        ? "Elder Rowan's family heirloom was recovered from the eastern ruins."
        : flags.heirloomMonstersCleared
        ? "The raiders in the eastern ruins have been driven off. Elder Rowan awaits word near his cottage."
        : "Elder Rowan near the eastern path laments that raiders in the nearby ruins made off with a cherished keepsake.",
      wayfinderHint:
        "Speak with Elder Rowan east of the village path, defeat the three raiders in the eastern ruins, and return to him.",
      status: flags.heirloomQuestClaimed ? "completed" : "active",
      targetZone: "overworld",
      targetX: flags.heirloomMonstersCleared ? HEIRLOOM_NPC_POS.x : 21.5,
      targetZ: flags.heirloomMonstersCleared ? HEIRLOOM_NPC_POS.z : 10.5,
      targetLabel: flags.heirloomMonstersCleared ? "Elder Rowan" : "Eastern Raider Ruins",
    },
    {
      id: "rumor-secret-stash",
      category: "rumor",
      title: "The Hollow Behind the Cracked Cliff",
      regionLabel: "Crossroads Village (Southwest)",
      summary: flags.secretStashClaimed
        ? "You opened the hidden cliffside cache in the southwestern corner of the village."
        : "A hairline fracture runs down the southwestern cliff face of the village, as if hollow space lies just behind the stone.",
      wayfinderHint:
        "Inspect the cracked boulder at the southwestern cliff of Crossroads Village (-23.8, -19.2) with an explosive blast or heavy impact.",
      status: flags.secretStashClaimed ? "completed" : "active",
      targetZone: "overworld",
      targetX: SECRET_STASH_POS.x,
      targetZ: SECRET_STASH_POS.z,
      targetLabel: "Southwestern Cliff Face",
    },
    {
      id: "rumor-cliffside-reliquary",
      category: "rumor",
      title: "The Watchman on the Northwest Ridge",
      regionLabel: "Elderwood Highlands (Northwest)",
      summary: flags.frontierHookshotChestOpened
        ? "The northwestern ridge reliquary in Elderwood Highlands has yielded its ancient mechanism."
        : "High on the northwestern ridge of Elderwood Highlands, a lone wooden-shielded sentry stands vigil beside a sealed chest.",
      wayfinderHint:
        "Climb to the northwestern ridge of Elderwood Highlands (-24.5, 22) and defeat the sentry guarding the chest.",
      status: flags.frontierHookshotChestOpened ? "completed" : "active",
      targetZone: "frontier",
      targetX: FRONTIER_HOOKSHOT_CHEST_POS.x,
      targetZ: FRONTIER_HOOKSHOT_CHEST_POS.z,
      targetLabel: "Northwestern Ridge Reliquary",
    },
    {
      id: "rumor-glacial-forge",
      category: "rumor",
      title: "The Frozen Anvil in the Southwest",
      regionLabel: "Frostpeak Caverns (Southwest)",
      summary: flags.cavernHammerChestOpened
        ? "You claimed the heavy relic from the southwestern forge in Frostpeak Caverns."
        : "In the southwestern alcove of Frostpeak Caverns, an ice-plated sentinel guards an ancient smith's chest.",
      wayfinderHint:
        "Head to the southwestern alcove of Frostpeak Caverns (-24.5, -18.5), melt or shatter the sentinel's ice armor, and open the chest.",
      status: flags.cavernHammerChestOpened ? "completed" : "active",
      targetZone: "caverns",
      targetX: CAVERN_HAMMER_CHEST_POS.x,
      targetZ: CAVERN_HAMMER_CHEST_POS.z,
      targetLabel: "Southwestern Glacial Forge",
    },
    {
      id: "rumor-oasis-spring",
      category: "rumor",
      title: "Waters of the Southwestern Mirage",
      regionLabel: "Sunscorched Oasis (Southwest)",
      summary: flags.desertOasisChestOpened
        ? "You uncovered the oasis spring reliquary in the southwestern dunes."
        : "Travelers speak of a palm-shaded spring in the southwestern dunes where something burrows beneath the sand beside a sealed chest.",
      wayfinderHint:
        "Cross the southwestern basin in the Sunscorched Oasis (-23.5, -21), unearth the subterranean creature, and open the chest.",
      status: flags.desertOasisChestOpened ? "completed" : "active",
      targetZone: "desert",
      targetX: DESERT_OASIS_CHEST_POS.x,
      targetZ: DESERT_OASIS_CHEST_POS.z,
      targetLabel: "Southwestern Oasis Spring",
    },
    {
      id: "rumor-caldera-forge",
      category: "rumor",
      title: "The Magma Smith's Vault",
      regionLabel: "Skyward Caldera (Northwest)",
      summary: flags.calderaForgeChestOpened
        ? "You opened the northwestern magma vault in Skyward Caldera."
        : "Across the northwestern lava rift of Skyward Caldera, a heavily armored guardian watches over a fire-forged chest.",
      wayfinderHint:
        "Traverse the northwestern basalt island in Skyward Caldera (-22.5, 20) and defeat the sentinel to unseal the chest.",
      status: flags.calderaForgeChestOpened ? "completed" : "active",
      targetZone: "caldera",
      targetX: CALDERA_FORGE_CHEST_POS.x,
      targetZ: CALDERA_FORGE_CHEST_POS.z,
      targetLabel: "Northwestern Magma Vault",
    },
    {
      id: "rumor-atoll-pearl",
      category: "rumor",
      title: "The Sunken Pearl of the Southwest Reef",
      regionLabel: "Sunken Coral Atoll (Southwest)",
      summary: flags.atollPearlChestOpened
        ? "You claimed the pearl reliquary on the southwestern island of the Sunken Coral Atoll."
        : "Across a turquoise channel in the southwestern reef of the Sunken Coral Atoll, an ice-plated sentinel guards a pearl-inlaid chest.",
      wayfinderHint:
        "Use your Grappling Hookshot [H] to cross the southwestern lagoon channel in Sunken Coral Atoll (-23, -19.5) and defeat the guardian.",
      status: flags.atollPearlChestOpened ? "completed" : "active",
      targetZone: "atoll",
      targetX: ATOLL_PEARL_CHEST_POS.x,
      targetZ: ATOLL_PEARL_CHEST_POS.z,
      targetLabel: "Southwestern Coral Pearl Island",
    },
    {
      id: "rumor-hollow-spore",
      category: "rumor",
      title: "The Alchemist's Spore-Briar Cache",
      regionLabel: "Bioluminescent Fungal Hollow (Northwest)",
      summary: flags.hollowSporeChestOpened
        ? "You recovered the alchemist's cache from the northwestern alcove of the Fungal Hollow."
        : "Behind a wall of dry spore-briars in the northwestern corner of the Fungal Hollow lies an old alchemist's reliquary.",
      wayfinderHint:
        "Burn the northwestern briar barrier with your Flame Rod [R] in the Bioluminescent Fungal Hollow (-23.5, 19.5) and defeat the warden.",
      status: flags.hollowSporeChestOpened ? "completed" : "active",
      targetZone: "hollow",
      targetX: HOLLOW_SPORE_CHEST_POS.x,
      targetZ: HOLLOW_SPORE_CHEST_POS.z,
      targetLabel: "Northwestern Alchemist Alcove",
    },
    {
      id: "rumor-sky-celestial",
      category: "rumor",
      title: "The Starlight Island Reliquary",
      regionLabel: "Aetherial Sky-Archipelago (Northwest)",
      summary: flags.skyCelestialChestOpened
        ? "You unlocked the northwestern starlight island reliquary high above the clouds."
        : "A floating marble island to the northwest of the Sky-Archipelago is separated by a cloud chasm and guarded by a crowned celestial champion.",
      wayfinderHint:
        "Grapple across the northwestern cloud chasm [H] in the Aetherial Sky-Archipelago (-23, 18) and defeat the champion.",
      status: flags.skyCelestialChestOpened ? "completed" : "active",
      targetZone: "sky",
      targetX: SKY_CELESTIAL_CHEST_POS.x,
      targetZ: SKY_CELESTIAL_CHEST_POS.z,
      targetLabel: "Northwestern Starlight Island",
    },
  ];

  // Determine the active tracked quest:
  // 1) If user pinned a specific chapter or rumor, use it (even if it's in another zone!)
  // 2) Otherwise, if the player is currently inside a zone that has its own active chapter, prefer that chapter
  // 3) Otherwise, use the first uncompleted Main Story chapter
  const allEntries = [...chapters, ...rumors];
  let activeQuest: QuestEntry | undefined;

  if (pinnedQuestId) {
    const pinned = allEntries.find((q) => q.id === pinnedQuestId);
    if (pinned && pinned.status !== "completed") {
      activeQuest = pinned;
    }
  }

  if (!activeQuest) {
    const currentZoneChapter = chapters.find(
      (c) => c.targetZone === zone && c.status !== "completed"
    );
    if (currentZoneChapter) {
      activeQuest = currentZoneChapter;
    } else {
      activeQuest =
        chapters.find((c) => c.status === "active") ??
        chapters[chapters.length - 1];
    }
  }

  return {
    chapters,
    rumors,
    activeQuest,
  };
}

// =========================================================
// 3. CROSS-ZONE PORTAL ROUTER & MULTI-WAYPOINT PATH BUILDER
// =========================================================
export function resolveWayfinderRoute(params: {
  zone: ZoneId;
  dungeonRoom: DungeonRoomId;
  hero: HeroState;
  flags: GameFlags;
  portals: MapPortal[];
  pinnedQuestId: string | null;
}): WayfinderRoute {
  const { zone, dungeonRoom, hero, flags, portals, pinnedQuestId } = params;
  const { activeQuest } = buildQuestChronicle({
    zone,
    dungeonRoom,
    hero,
    flags,
    pinnedQuestId,
  });

  let destX = activeQuest.targetX;
  let destZ = activeQuest.targetZ;
  let destLabel = activeQuest.targetLabel;
  let isPortalHop = false;
  let nextZone: ZoneId | undefined;

  if (zone !== activeQuest.targetZone) {
    // BFS over `portals` to find the next zone hop from `zone` to `activeQuest.targetZone`
    const adj = new Map<ZoneId, Array<{ to: ZoneId; portal: MapPortal }>>();
    for (const pt of portals) {
      if (!adj.has(pt.zone)) adj.set(pt.zone, []);
      adj.get(pt.zone)!.push({ to: pt.targetZone, portal: pt });
    }

    const queue: Array<{ z: ZoneId; firstPortal?: MapPortal; firstHop?: ZoneId }> = [
      { z: zone },
    ];
    const visited = new Set<ZoneId>([zone]);
    let chosenPortal: MapPortal | undefined;
    let chosenNextZone: ZoneId | undefined;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.z === activeQuest.targetZone) {
        chosenPortal = curr.firstPortal;
        chosenNextZone = curr.firstHop;
        break;
      }
      const neighbors = adj.get(curr.z) ?? [];
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({
            z: edge.to,
            firstPortal: curr.firstPortal ?? edge.portal,
            firstHop: curr.firstHop ?? edge.to,
          });
        }
      }
    }

    if (chosenPortal) {
      destX = chosenPortal.x;
      destZ = chosenPortal.z;
      destLabel = `Passage to ${chosenPortal.label}`;
      isPortalHop = true;
      nextZone = chosenNextZone;
    }
  }

  // Build smooth intermediate waypoints in the current zone so the trail navigates bridges & doorways
  const waypoints: Array<{ x: number; z: number }> = [{ x: hero.x, z: hero.z }];

  if (zone === "overworld") {
    // River spans Z ≈ 4.5, with central bridge at X = 0
    const heroNorthOfRiver = hero.z > 4.5;
    const destNorthOfRiver = destZ > 4.5;
    if (heroNorthOfRiver !== destNorthOfRiver) {
      waypoints.push({ x: 0, z: heroNorthOfRiver ? 7.5 : 1.5 });
      waypoints.push({ x: 0, z: heroNorthOfRiver ? 1.5 : 7.5 });
    }
  } else if (zone === "grove") {
    // Stream spans Z ≈ 3.0, with bridge at X = 0
    const heroNorth = hero.z > 3.0;
    const destNorth = destZ > 3.0;
    if (heroNorth !== destNorth) {
      waypoints.push({ x: 0, z: heroNorth ? 5.2 : 0.8 });
      waypoints.push({ x: 0, z: heroNorth ? 0.8 : 5.2 });
    }
  } else if (zone === "dungeon") {
    // 5-Room Cross Dungeon doorway routing so the Golden Trail flows through corridors!
    const getRoomAt = (x: number, z: number): DungeonRoomId => {
      if (z < -12) return "crypt";
      if (x < -14) return "west_wing";
      if (x > 14) return "east_wing";
      if (z > 13.5) return "sanctum";
      return "hub";
    };
    const startRoom = getRoomAt(hero.x, hero.z);
    const endRoom = getRoomAt(destX, destZ);

    if (startRoom !== endRoom) {
      const doorWest = { x: -14.0, z: 0.0 };
      const doorEast = { x: 14.0, z: 0.0 };
      const doorSouthEast = { x: 26.0, z: -12.0 };
      const doorNorth = { x: 0.0, z: 13.5 };
      const doorCryptShortcut = { x: 14.0, z: -24.0 };

      if (startRoom === "west_wing") {
        waypoints.push(doorWest);
      } else if (startRoom === "sanctum") {
        waypoints.push(doorNorth);
      } else if (startRoom === "crypt") {
        if (flags.dungeonEyeStatuesSolved && endRoom !== "east_wing") {
          waypoints.push(doorCryptShortcut);
        } else {
          waypoints.push(doorSouthEast);
          if (endRoom !== "east_wing") waypoints.push(doorEast);
        }
      } else if (startRoom === "east_wing" && endRoom !== "crypt") {
        waypoints.push(doorEast);
      }

      if (endRoom === "west_wing") {
        waypoints.push(doorWest);
      } else if (endRoom === "sanctum") {
        waypoints.push(doorNorth);
      } else if (endRoom === "east_wing" && startRoom !== "crypt") {
        waypoints.push(doorEast);
      } else if (endRoom === "crypt") {
        if (startRoom !== "east_wing") {
          if (flags.dungeonEyeStatuesSolved) {
            waypoints.push(doorCryptShortcut);
          } else {
            waypoints.push(doorEast);
            waypoints.push(doorSouthEast);
          }
        } else {
          waypoints.push(doorSouthEast);
        }
      }
    }
  }

  waypoints.push({ x: destX, z: destZ });

  // Deduplicate very close consecutive points and compute total polyline length
  const cleanWaypoints: Array<{ x: number; z: number }> = [waypoints[0]];
  let totalLength = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const prev = cleanWaypoints[cleanWaypoints.length - 1];
    const curr = waypoints[i];
    const segLen = Math.hypot(curr.x - prev.x, curr.z - prev.z);
    if (segLen > 0.25 || i === waypoints.length - 1) {
      cleanWaypoints.push(curr);
      totalLength += segLen;
    }
  }

  return {
    quest: activeQuest,
    destX,
    destZ,
    destLabel,
    isPortalHop,
    nextZone,
    waypoints: cleanWaypoints,
    totalLength,
  };
}

export function sampleWayfinderPolyline(
  waypoints: Array<{ x: number; z: number }>,
  u: number
): { x: number; z: number; yaw: number } {
  if (waypoints.length === 0) return { x: 0, z: 0, yaw: 0 };
  if (waypoints.length === 1) return { x: waypoints[0].x, z: waypoints[0].z, yaw: 0 };

  const clampedU = Math.max(0, Math.min(1, u));
  let totalLen = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = Math.hypot(
      waypoints[i + 1].x - waypoints[i].x,
      waypoints[i + 1].z - waypoints[i].z
    );
    segLengths.push(d);
    totalLen += d;
  }

  if (totalLen <= 0.001) {
    return { x: waypoints[0].x, z: waypoints[0].z, yaw: 0 };
  }

  const targetDist = clampedU * totalLen;
  let accum = 0;
  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (accum + segLen >= targetDist || i === segLengths.length - 1) {
      const localT = segLen > 0.0001 ? (targetDist - accum) / segLen : 0;
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      return {
        x: a.x + dx * localT,
        z: a.z + dz * localT,
        yaw: Math.atan2(dx, dz),
      };
    }
    accum += segLen;
  }

  const last = waypoints[waypoints.length - 1];
  return { x: last.x, z: last.z, yaw: 0 };
}
