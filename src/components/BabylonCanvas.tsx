"use client";

import React, { useEffect, useRef } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
  VertexData,
} from "@babylonjs/core";
import {
  EditorEntityKind,
  sampleTerrainHeight,
  TerrainCellData,
  useGameStore,
} from "@/store/gameStore";
import {
  resolveWayfinderRoute,
  sampleWayfinderPolyline,
} from "@/game/questSystem";
import {
  ATOLL_PEARL_CHEST_POS,
  ATOLL_VICTORY_CHEST_POS,
  BIG_KEY_CHEST_POS,
  BOSS_CHEST_POS,
  BOSS_EXIT_GATE_POS,
  CALDERA_BOSS_GATE_POS,
  CALDERA_EXIT_GATE_POS,
  CALDERA_FORGE_CHEST_POS,
  CALDERA_VICTORY_CHEST_POS,
  CAVERN_CREST_KEY_POS,
  CAVERN_HAMMER_CHEST_POS,
  CAVERN_SHOVEL_CHEST_POS,
  CITADEL_ARMORY_CHEST_POS,
  CITADEL_BOSS_GATE_POS,
  CITADEL_EXIT_GATE_POS,
  CITADEL_VICTORY_CHEST_POS,
  COLOSSEUM_GATE_POS,
  COMPANION_ALTAR_POS,
  CRYPT_SHORTCUT_DOOR_POS,
  CustomModelAsset,
  DESERT_CALDERA_GATE_POS,
  DESERT_OASIS_CHEST_POS,
  DESERT_SOLAR_KEY_POS,
  DG_SMALL_KEY_POS,
  DUNGEON_ENTRY_GATE_POS,
  DUNGEON_KEY_POS,
  EAST_WING_DOOR_POS,
  EnemyKind,
  FIRE_ROD_CHEST_POS,
  FORGE_ANVIL_POS,
  FRONTIER_BOMB_CHEST_POS,
  FRONTIER_CITADEL_GATE_POS,
  FRONTIER_HOOKSHOT_CHEST_POS,
  FRONTIER_SAPPER_NPC_POS,
  GUIDE_NPC_POS,
  HEIRLOOM_NPC_POS,
  HOLLOW_SPORE_CHEST_POS,
  HOLLOW_VICTORY_CHEST_POS,
  LOCKED_GATE_POS,
  MapPortal,
  MapPropInstance,
  MOUNT_STABLES_POS,
  PropPrefabId,
  RIFT_ENTRANCE_POS,
  SECRET_STASH_POS,
  SHOP_INTERACT_POS,
  SHOP_STALL_POS,
  SKY_CELESTIAL_CHEST_POS,
  SKY_VICTORY_CHEST_POS,
  WARP_STONE_META,
  ZoneId,
} from "@/game/worldData";

interface EnemyMeshRig {
  root: TransformNode;
  body: TransformNode;
  weapon: TransformNode;
  telegraphRing: Mesh;
  hpBarHolder: TransformNode;
  hpBarBg: Mesh;
  hpBarFill: Mesh;
  barWidth: number;
  barY: number;
  materials: StandardMaterial[];
  baseColors: Color3[];
  chargeCorridorRoot?: TransformNode;
  chargeCorridorBody?: TransformNode;
  chargeCorridorTip?: Mesh;
  chargeCorridorMat?: StandardMaterial;
  lungeShieldMesh?: Mesh;
  stunStarsRoot?: TransformNode;
  archerAimLine?: Mesh;
  woodShieldNode?: TransformNode;
  iceArmorNode?: TransformNode;
  shockAuraNode?: TransformNode;
  bountyAuraNode?: TransformNode;
}

/**
 * Builds a flat 3D arrowhead mesh lying on the ground plane whose apex points
 * strictly along +Z (0, y, +tipLen) and whose base spans (-halfWidth..+halfWidth, y, 0).
 * Because +Z is the exact direction of (Math.sin(chargeAngle), Math.cos(chargeAngle)),
 * this arrowhead never has a 90-degree cylinder-tessellation offset and never stretches.
 */
function createForwardArrowheadMesh(
  name: string,
  halfWidth: number,
  tipLength: number,
  scene: Scene
): Mesh {
  const mesh = new Mesh(name, scene);
  const yTop = 0.085;
  const yBot = 0.035;

  const positions = [
    // Top face (0, 1, 2)
    0, yTop, tipLength,
    -halfWidth, yTop, 0,
    halfWidth, yTop, 0,
    // Bottom face (3, 4, 5)
    0, yBot, tipLength,
    halfWidth, yBot, 0,
    -halfWidth, yBot, 0,
  ];
  const indices = [
    0, 1, 2,
    3, 4, 5,
    0, 2, 4, 0, 4, 3,
    0, 3, 5, 0, 5, 1,
    1, 5, 4, 1, 4, 2,
  ];
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);

  const vData = new VertexData();
  vData.positions = positions;
  vData.indices = indices;
  vData.normals = normals;
  vData.applyToMesh(mesh);
  mesh.isPickable = false;
  return mesh;
}

interface PropVisualRig {
  root: TransformNode;
  prefab: PropPrefabId;
  customModelId?: string;
  colorHex?: string;
  bushFoliage?: Mesh | TransformNode;
  bushStump?: TransformNode;
  torchFlame?: Mesh;
  timedTorchRing?: Mesh;
  dirtMound?: TransformNode;
  dirtHole?: TransformNode;
  crystalOrbMat?: StandardMaterial;
  crystalOrbMesh?: Mesh;
  crystalHaloRing?: Mesh;
  crystalBarrierBody?: TransformNode;
  pushTargetSocket?: Mesh;
  eyeIrisMat?: StandardMaterial;
  eyeArrowMesh?: Mesh;
}

interface BushLeafParticle {
  mesh: Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx0: number;
  ry0: number;
  rz0: number;
  wx: number;
  wy: number;
  wz: number;
  flutterFreq: number;
  flutterPhase: number;
  baseScale: Vector3;
}

interface BushBurstVisualRig {
  root: TransformNode;
  particles: BushLeafParticle[];
}

interface PortalVisualRig {
  root: TransformNode;
  disc: Mesh;
  ring: Mesh;
  pillarL: Mesh;
  pillarR: Mesh;
  color: string;
}

interface ProjectileVisualRig {
  root: TransformNode;
  orb: Mesh;
  outerRing: Mesh;
  innerCoreRing: Mesh;
  fillDisc: Mesh;
  arcDots: Mesh[];
}

interface HazardVisualRig {
  root: TransformNode;
  poolDisc: Mesh;
  rimRing: Mesh;
  bubbles: Mesh[];
}

/**
 * Sculpts a sphere's vertices into an organic, squishy Poring-like blobby droplet shape
 * (wider wavy flat base, plump lower cheeks, tapered droplet peak on top) and recomputes normals.
 */
function createSculptedPoringBodyMesh(name: string, scene: Scene): Mesh {
  const mesh = MeshBuilder.CreateSphere(
    name,
    { diameter: 1.45, segments: 24, updatable: true },
    scene
  );
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getIndices();
  const normals = mesh.getVerticesData(VertexBuffer.NormalKind);

  if (positions && indices && normals) {
    for (let i = 0; i < positions.length; i += 3) {
      const vx = positions[i];
      const vy = positions[i + 1];
      const vz = positions[i + 2];

      const ny = vy / 0.725;
      const angle = Math.atan2(vz, vx);

      const lobeWave =
        1.0 +
        0.065 * Math.sin(angle * 5 + 0.4) +
        0.045 * Math.cos(angle * 3 - 0.7);

      let radialScale = lobeWave;
      let yOut = vy;
      let zShift = 0;

      if (ny < 0) {
        yOut = vy * (0.58 + 0.18 * (1 + ny));
        radialScale *= 1.18 + 0.16 * Math.cos(ny * Math.PI * 0.5);
      } else {
        radialScale *= 1.16 * (1 - 0.48 * Math.pow(ny, 1.35));
        yOut = vy * 1.08 + Math.pow(ny, 2.2) * 0.14;
        zShift = -Math.pow(ny, 1.8) * 0.14;
      }

      positions[i] = vx * radialScale;
      positions[i + 1] = yOut;
      positions[i + 2] = vz * radialScale + zShift;
    }

    VertexData.ComputeNormals(positions, indices, normals);
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  }

  return mesh;
}

/**
 * Helper to merge an array of meshes sharing the same material into a single draw call.
 */
function mergeGroupWithMaterial(
  name: string,
  meshes: Mesh[],
  material: StandardMaterial,
  parent: TransformNode,
  editorMeta?: { editorKind: EditorEntityKind; editorId: string }
): Mesh | null {
  if (meshes.length === 0) return null;
  const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
  if (merged) {
    merged.name = name;
    merged.material = material;
    merged.parent = parent;
    if (editorMeta) {
      merged.metadata = editorMeta;
      merged.isPickable = true;
    }
  }
  return merged;
}

function tagHierarchyMetadata(
  root: TransformNode,
  editorKind: EditorEntityKind,
  editorId: string
) {
  root.getChildMeshes().forEach((m) => {
    m.metadata = { editorKind, editorId };
    m.isPickable = true;
  });
}

function hexToColor3(hex: string, fallback = new Color3(0.3, 0.8, 1.0)): Color3 {
  try {
    const clean = hex.replace("#", "");
    if (clean.length === 6) {
      const r = parseInt(clean.slice(0, 2), 16) / 255;
      const g = parseInt(clean.slice(2, 4), 16) / 255;
      const b = parseInt(clean.slice(4, 6), 16) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return new Color3(r, g, b);
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Applies sculpted vertex heights and painted vertex colors from `terrainCells` onto an updatable ground mesh.
 */
function applyTerrainCellsToGroundMesh(
  ground: Mesh,
  baseColor: Color3,
  cells: Record<string, TerrainCellData>
) {
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  const indices = ground.getIndices();
  const normals = ground.getVerticesData(VertexBuffer.NormalKind);
  if (!positions || !indices || !normals) return;

  const vertCount = positions.length / 3;
  let colors = ground.getVerticesData(VertexBuffer.ColorKind);
  if (!colors || colors.length !== vertCount * 4) {
    colors = new Array(vertCount * 4).fill(1);
  }

  const step = 2.0;
  for (let i = 0; i < vertCount; i++) {
    const vx = positions[i * 3];
    const vz = positions[i * 3 + 2];
    const gx = Math.round(vx / step);
    const gz = Math.round(vz / step);
    const cell = cells[`${gx},${gz}`];

    const h = cell ? cell.h : 0;
    positions[i * 3 + 1] = h;

    let r = baseColor.r;
    let g = baseColor.g;
    let b = baseColor.b;
    if (cell?.c) {
      const c3 = hexToColor3(cell.c, baseColor);
      r = c3.r;
      g = c3.g;
      b = c3.b;
    } else if (Math.abs(h) > 0.15) {
      // Subtle elevation shading on hills/valleys
      const tint = Math.max(-0.12, Math.min(0.16, h * 0.035));
      r = Math.min(1, Math.max(0, r + tint));
      g = Math.min(1, Math.max(0, g + tint));
      b = Math.min(1, Math.max(0, b + tint * 0.7));
    }

    colors[i * 4] = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 1.0;
  }

  VertexData.ComputeNormals(positions, indices, normals);
  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.updateVerticesData(VertexBuffer.NormalKind, normals);
  ground.setVerticesData(VertexBuffer.ColorKind, colors, true);
  ground.refreshBoundingInfo();
}

export default function BabylonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Automatically hydrate any authored Map Editor layout saved in localStorage
    useGameStore.getState().hydrateSavedMapFromStorage();

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true,
    });

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.08, 0.14, 0.1, 1);
    scene.blockMaterialDirtyMechanism = false;

    // Overhead Zeldo-style angled camera (fixed in Play Mode, free orbit/pan/zoom in Editor Mode!)
    const camera = new ArcRotateCamera(
      "overheadCam",
      -Math.PI / 2,
      0.72,
      25,
      new Vector3(0, 0, -32),
      scene
    );
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 80;

    // Lights
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.9;
    hemiLight.diffuse = new Color3(1.0, 0.98, 0.92);
    hemiLight.groundColor = new Color3(0.26, 0.32, 0.28);

    const dirLight = new DirectionalLight("dirLight", new Vector3(-0.45, -1.0, -0.35), scene);
    dirLight.intensity = 0.76;
    dirLight.diffuse = new Color3(1.0, 0.94, 0.8);

    const sanctumPointLight = new PointLight("sanctumLight", new Vector3(0, 5.5, 28), scene);
    sanctumPointLight.intensity = 0;
    sanctumPointLight.diffuse = new Color3(1.0, 0.78, 0.32);
    sanctumPointLight.range = 26;

    const makeMat = (
      name: string,
      diffuse: Color3,
      emissive?: Color3,
      specular = new Color3(0.18, 0.18, 0.18),
      alpha = 1.0,
      specularPower = 32
    ): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = diffuse;
      if (emissive) m.emissiveColor = emissive;
      m.specularColor = specular;
      m.specularPower = specularPower;
      m.alpha = alpha;
      return m;
    };

    const darkEyeMat = makeMat(
      "darkEyeMat",
      new Color3(0.06, 0.05, 0.09),
      new Color3(0.02, 0.02, 0.04),
      new Color3(0.9, 0.9, 0.95),
      1.0,
      96
    );
    const whiteEyeMat = makeMat(
      "whiteEyeMat",
      new Color3(0.98, 0.98, 1.0),
      new Color3(0.22, 0.22, 0.25),
      new Color3(0.6, 0.6, 0.6),
      1.0,
      48
    );
    const blushMat = makeMat(
      "blushMat",
      new Color3(1.0, 0.36, 0.55),
      new Color3(0.35, 0.08, 0.16)
    );
    const glowingYellowEyeMat = makeMat(
      "glowingYellowEyeMat",
      new Color3(1.0, 0.92, 0.2),
      new Color3(0.85, 0.65, 0.05)
    );
    const glowingCrimsonMat = makeMat(
      "glowingCrimsonMat",
      new Color3(1.0, 0.18, 0.24),
      new Color3(0.92, 0.12, 0.18)
    );
    const boneHornMat = makeMat(
      "boneHornMat",
      new Color3(0.92, 0.87, 0.74),
      new Color3(0.12, 0.1, 0.07),
      new Color3(0.45, 0.42, 0.35)
    );
    const darkObsidianMat = makeMat(
      "darkObsidianMat",
      new Color3(0.16, 0.15, 0.22),
      new Color3(0.04, 0.03, 0.07),
      new Color3(0.55, 0.55, 0.65),
      1.0,
      64
    );

    // =========================================================
    // ZONE CONTAINERS & UPDATABLE TERRAIN MESHES
    // =========================================================
    const overworldRoot = new TransformNode("overworldRoot", scene);
    const groveRoot = new TransformNode("groveRoot", scene);
    const dungeonRoot = new TransformNode("dungeonRoot", scene);
    const frontierRoot = new TransformNode("frontierRoot", scene);
    const cavernsRoot = new TransformNode("cavernsRoot", scene);
    const citadelRoot = new TransformNode("citadelRoot", scene);
    const desertRoot = new TransformNode("desertRoot", scene);
    const calderaRoot = new TransformNode("calderaRoot", scene);
    const atollRoot = new TransformNode("atollRoot", scene);
    const hollowRoot = new TransformNode("hollowRoot", scene);
    const skyRoot = new TransformNode("skyRoot", scene);
    const riftRoot = new TransformNode("riftRoot", scene);

    const owBaseColor = new Color3(0.24, 0.55, 0.28);
    const grBaseColor = new Color3(0.19, 0.48, 0.27);
    const dgBaseColor = new Color3(0.18, 0.19, 0.25);
    const frBaseColor = new Color3(0.18, 0.46, 0.32);
    const cvBaseColor = new Color3(0.22, 0.34, 0.46);
    const ctBaseColor = new Color3(0.16, 0.14, 0.22);
    const dsBaseColor = new Color3(0.82, 0.66, 0.36);
    const caBaseColor = new Color3(0.22, 0.12, 0.12);
    const atBaseColor = new Color3(0.14, 0.56, 0.64);
    const hlBaseColor = new Color3(0.14, 0.22, 0.34);
    const skBaseColor = new Color3(0.74, 0.80, 0.94);
    const riftBaseColor = new Color3(0.14, 0.12, 0.22);

    const owGroundMat = makeMat(
      "owGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.05, 0.07, 0.05)
    );
    const grGroundMat = makeMat(
      "grGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.05, 0.08, 0.06)
    );
    const dgGroundMat = makeMat(
      "dgGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.08, 0.08, 0.1)
    );
    const frGroundMat = makeMat(
      "frGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.06, 0.09, 0.07)
    );
    const cvGroundMat = makeMat(
      "cvGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.14, 0.18, 0.24)
    );
    const ctGroundMat = makeMat(
      "ctGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.12, 0.08, 0.16)
    );
    const dsGroundMat = makeMat(
      "dsGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.14, 0.11, 0.06)
    );
    const caGroundMat = makeMat(
      "caGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.18, 0.08, 0.06)
    );
    const atGroundMat = makeMat(
      "atGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.08, 0.18, 0.22)
    );
    const hlGroundMat = makeMat(
      "hlGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.08, 0.14, 0.22)
    );
    const skGroundMat = makeMat(
      "skGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.22, 0.24, 0.32)
    );
    const riftGroundMat = makeMat(
      "riftGroundMat",
      new Color3(1, 1, 1),
      undefined,
      new Color3(0.12, 0.08, 0.18)
    );

    // Subdivided updatable ground meshes for real-time Terrain Brush sculpting & painting!
    const owGround = MeshBuilder.CreateGround(
      "owGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    owGround.material = owGroundMat;
    owGround.parent = overworldRoot;
    owGround.isPickable = true;
    applyTerrainCellsToGroundMesh(owGround, owBaseColor, {});

    const grGround = MeshBuilder.CreateGround(
      "grGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    grGround.material = grGroundMat;
    grGround.parent = groveRoot;
    grGround.isPickable = true;
    applyTerrainCellsToGroundMesh(grGround, grBaseColor, {});

    const dgGround = MeshBuilder.CreateGround(
      "dgGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    dgGround.material = dgGroundMat;
    dgGround.parent = dungeonRoot;
    dgGround.isPickable = true;
    applyTerrainCellsToGroundMesh(dgGround, dgBaseColor, {});

    const frGround = MeshBuilder.CreateGround(
      "frGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    frGround.material = frGroundMat;
    frGround.parent = frontierRoot;
    frGround.isPickable = true;
    applyTerrainCellsToGroundMesh(frGround, frBaseColor, {});

    const cvGround = MeshBuilder.CreateGround(
      "cvGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    cvGround.material = cvGroundMat;
    cvGround.parent = cavernsRoot;
    cvGround.isPickable = true;
    applyTerrainCellsToGroundMesh(cvGround, cvBaseColor, {});

    const ctGround = MeshBuilder.CreateGround(
      "ctGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    ctGround.material = ctGroundMat;
    ctGround.parent = citadelRoot;
    ctGround.isPickable = true;
    applyTerrainCellsToGroundMesh(ctGround, ctBaseColor, {});

    const dsGround = MeshBuilder.CreateGround(
      "dsGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    dsGround.material = dsGroundMat;
    dsGround.parent = desertRoot;
    dsGround.isPickable = true;
    applyTerrainCellsToGroundMesh(dsGround, dsBaseColor, {});

    const caGround = MeshBuilder.CreateGround(
      "caGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    caGround.material = caGroundMat;
    caGround.parent = calderaRoot;
    caGround.isPickable = true;
    applyTerrainCellsToGroundMesh(caGround, caBaseColor, {});

    const atGround = MeshBuilder.CreateGround(
      "atGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    atGround.material = atGroundMat;
    atGround.parent = atollRoot;
    atGround.isPickable = true;
    applyTerrainCellsToGroundMesh(atGround, atBaseColor, {});

    const hlGround = MeshBuilder.CreateGround(
      "hlGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    hlGround.material = hlGroundMat;
    hlGround.parent = hollowRoot;
    hlGround.isPickable = true;
    applyTerrainCellsToGroundMesh(hlGround, hlBaseColor, {});

    const skGround = MeshBuilder.CreateGround(
      "skGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    skGround.material = skGroundMat;
    skGround.parent = skyRoot;
    skGround.isPickable = true;
    applyTerrainCellsToGroundMesh(skGround, skBaseColor, {});

    const riftGround = MeshBuilder.CreateGround(
      "riftGround",
      { width: 84, height: 84, subdivisions: 42, updatable: true },
      scene
    );
    riftGround.material = riftGroundMat;
    riftGround.parent = riftRoot;
    riftGround.isPickable = true;
    applyTerrainCellsToGroundMesh(riftGround, riftBaseColor, {});

    // Shared Prop Materials
    const pathMat = makeMat("owPathMat", new Color3(0.75, 0.65, 0.46), undefined, new Color3(0.08, 0.08, 0.06));
    const woodMat = makeMat("woodMat", new Color3(0.52, 0.34, 0.18));
    const goldKeyMat = makeMat(
      "goldKeyMat",
      new Color3(1.0, 0.84, 0.22),
      new Color3(0.42, 0.3, 0.04),
      new Color3(1, 0.95, 0.75),
      1.0,
      64
    );
    const cliffMat = makeMat("cliffMat", new Color3(0.45, 0.39, 0.34));
    const cliffTopMat = makeMat("cliffTopMat", new Color3(0.21, 0.49, 0.25));
    const waterMat = makeMat(
      "waterMat",
      new Color3(0.16, 0.54, 0.85),
      new Color3(0.06, 0.2, 0.38),
      new Color3(0.75, 0.9, 1.0),
      1.0,
      64
    );
    const ruinMat = makeMat("ruinMat", new Color3(0.56, 0.55, 0.51));
    const foliageMat = makeMat("foliageMat", new Color3(0.16, 0.46, 0.22));
    const bushMat = makeMat("bushMat", new Color3(0.22, 0.58, 0.28));
    const dgWallMat = makeMat("dgWallMat", new Color3(0.25, 0.27, 0.35));
    const dgPillarMat = makeMat("dgPillarMat", new Color3(0.37, 0.39, 0.49));
    const ironGateMat = makeMat(
      "ironGateMat",
      new Color3(0.28, 0.3, 0.35),
      new Color3(0.05, 0.05, 0.07),
      new Color3(0.65, 0.65, 0.7),
      1.0,
      64
    );
    const bladeMat = makeMat(
      "heroBladeMat",
      new Color3(0.88, 0.94, 1.0),
      new Color3(0.28, 0.42, 0.62),
      new Color3(1, 1, 1),
      1.0,
      96
    );
    const shopCanopyMat = makeMat(
      "shopCanopyMat",
      new Color3(0.82, 0.18, 0.26),
      new Color3(0.18, 0.03, 0.05)
    );
    const merchantRobeMat = makeMat(
      "merchantRobeMat",
      new Color3(0.42, 0.2, 0.68),
      new Color3(0.08, 0.03, 0.15)
    );

    // --- MERCHANT BAZAAR STALL IN SOUTH CLEARING (11.5, -32.2) ---
    const sx = SHOP_STALL_POS.x;
    const sz = SHOP_STALL_POS.z;

    const shopNode = new TransformNode("shopStallNode", scene);
    shopNode.parent = overworldRoot;

    const shopWoodParts: Mesh[] = [];
    const shopCounter = MeshBuilder.CreateBox(
      "shopCounter",
      { width: 5.2, height: 1.15, depth: 2.2 },
      scene
    );
    shopCounter.position.set(sx, 0.58, sz + 0.3);
    shopWoodParts.push(shopCounter);

    for (const px of [-2.4, 2.4]) {
      for (const pz of [-1.1, 1.1]) {
        const post = MeshBuilder.CreateCylinder(
          `shopPost-${px}-${pz}`,
          { diameter: 0.26, height: 3.4, tessellation: 10 },
          scene
        );
        post.position.set(sx + px, 1.7, sz + pz);
        shopWoodParts.push(post);
      }
    }
    mergeGroupWithMaterial("shopWoodMerged", shopWoodParts, woodMat, shopNode);

    const shopAwning = MeshBuilder.CreateCylinder(
      "shopAwning",
      { diameterTop: 0.8, diameterBottom: 6.8, height: 1.4, tessellation: 4 },
      scene
    );
    shopAwning.rotation.y = Math.PI / 4;
    shopAwning.position.set(sx, 3.85, sz);
    shopAwning.material = shopCanopyMat;
    shopAwning.parent = shopNode;

    const shopRug = MeshBuilder.CreateCylinder(
      "shopRug",
      { diameter: 4.4, height: 0.06, tessellation: 24 },
      scene
    );
    shopRug.position.set(SHOP_INTERACT_POS.x, 0.035, SHOP_INTERACT_POS.z);
    shopRug.material = goldKeyMat;
    shopRug.parent = shopNode;

    const merchantBody = MeshBuilder.CreateCylinder(
      "merchantBody",
      { diameterTop: 0.65, diameterBottom: 0.95, height: 1.25, tessellation: 14 },
      scene
    );
    merchantBody.position.set(sx, 1.1, sz - 0.65);
    merchantBody.material = merchantRobeMat;
    merchantBody.parent = shopNode;

    const merchantHead = MeshBuilder.CreateSphere(
      "merchantHead",
      { diameter: 0.72, segments: 14 },
      scene
    );
    merchantHead.position.set(sx, 1.95, sz - 0.65);
    merchantHead.material = whiteEyeMat;
    merchantHead.parent = shopNode;

    const merchantHat = MeshBuilder.CreateCylinder(
      "merchantHat",
      { diameterTop: 0.05, diameterBottom: 1.05, height: 0.95, tessellation: 12 },
      scene
    );
    merchantHat.position.set(sx, 2.55, sz - 0.65);
    merchantHat.material = merchantRobeMat;
    merchantHat.parent = shopNode;

    // 3 Featured Counter Items on Bramble's Curio Shop Counter:
    // 1. Left Counter Item: Refill Hearts / Red Potion (20 Rupees)
    const displayHeart = MeshBuilder.CreateSphere(
      "displayHeart",
      { diameter: 0.46, segments: 12 },
      scene
    );
    displayHeart.position.set(sx - 1.55, 1.38, sz + 0.4);
    displayHeart.material = glowingCrimsonMat;
    displayHeart.parent = shopNode;

    const displayPotionVial = MeshBuilder.CreateCylinder(
      "displayPotionVial",
      { diameterTop: 0.14, diameterBottom: 0.34, height: 0.48, tessellation: 12 },
      scene
    );
    displayPotionVial.position.set(sx - 1.15, 1.38, sz + 0.4);
    displayPotionVial.material = glowingCrimsonMat;
    displayPotionVial.parent = shopNode;

    // 2. Center Counter Item: Bundle of Arrows + Magic Refill (10 Rupees)
    const displayBow = MeshBuilder.CreateTorus(
      "displayBow",
      { diameter: 0.78, thickness: 0.1, tessellation: 16 },
      scene
    );
    displayBow.rotation.x = Math.PI / 2;
    displayBow.position.set(sx - 0.18, 1.38, sz + 0.4);
    displayBow.material = goldKeyMat;
    displayBow.parent = shopNode;

    const displayMagicVial = MeshBuilder.CreatePolyhedron(
      "displayMagicVial",
      { type: 1, size: 0.22 },
      scene
    );
    displayMagicVial.position.set(sx + 0.25, 1.42, sz + 0.4);
    displayMagicVial.material = makeMat(
      "displayMagicMat",
      new Color3(0.2, 0.95, 0.48),
      new Color3(0.1, 0.65, 0.28)
    );
    displayMagicVial.parent = shopNode;

    // 3. Right Counter Item: Expensive 100-Rupee Progression Upgrade Relic (Mirror Shield + Heart Container + Bomb Bag!)
    const shopProgressionNode = new TransformNode("shopProgressionNode", scene);
    shopProgressionNode.position.set(sx + 1.48, 1.44, sz + 0.4);
    shopProgressionNode.parent = shopNode;

    const displayRelicShield = MeshBuilder.CreateCylinder(
      "displayRelicShield",
      { diameterTop: 0.76, diameterBottom: 0.42, height: 0.14, tessellation: 12 },
      scene
    );
    displayRelicShield.rotation.x = Math.PI / 2.4;
    displayRelicShield.material = goldKeyMat;
    displayRelicShield.parent = shopProgressionNode;

    const displayRelicGem = MeshBuilder.CreatePolyhedron(
      "displayRelicGem",
      { type: 1, size: 0.22 },
      scene
    );
    displayRelicGem.position.set(0, 0.36, 0);
    displayRelicGem.material = glowingCrimsonMat;
    displayRelicGem.parent = shopProgressionNode;

    // =========================================================
    // MAP 1 ECONOMY LOOP: 3D SECRET RUPEE STASH CHEST (+50 RUPEES) IN SW CAVE
    // =========================================================
    const secretStashRoot = new TransformNode("secretStashRoot", scene);
    secretStashRoot.parent = overworldRoot;
    secretStashRoot.position.set(SECRET_STASH_POS.x, 0, SECRET_STASH_POS.z);

    const stashDais = MeshBuilder.CreateCylinder(
      "stashDais",
      { diameterTop: 2.8, diameterBottom: 3.2, height: 0.26, tessellation: 16 },
      scene
    );
    stashDais.position.set(0, 0.13, 0);
    stashDais.material = ruinMat;
    stashDais.parent = secretStashRoot;

    const stashChestBase = MeshBuilder.CreateBox(
      "stashChestBase",
      { width: 1.75, height: 0.88, depth: 1.2 },
      scene
    );
    stashChestBase.position.set(0, 0.7, 0);
    stashChestBase.material = woodMat;
    stashChestBase.parent = secretStashRoot;

    const stashChestTrim = MeshBuilder.CreateBox(
      "stashChestTrim",
      { width: 1.84, height: 0.2, depth: 1.26 },
      scene
    );
    stashChestTrim.position.set(0, 1.05, 0);
    stashChestTrim.material = goldKeyMat;
    stashChestTrim.parent = secretStashRoot;

    const secretStashLid = MeshBuilder.CreateCylinder(
      "secretStashLid",
      { diameter: 1.2, height: 1.75, tessellation: 14 },
      scene
    );
    secretStashLid.rotation.z = Math.PI / 2;
    secretStashLid.scaling.set(0.55, 1, 1);
    secretStashLid.position.set(0, 1.18, 0);
    secretStashLid.material = woodMat;
    secretStashLid.parent = secretStashRoot;

    const secretStashRing = MeshBuilder.CreateTorus(
      "secretStashRing",
      { diameter: 3.1, thickness: 0.11, tessellation: 28 },
      scene
    );
    secretStashRing.position.set(0, 0.28, 0);
    secretStashRing.material = goldKeyMat;
    secretStashRing.parent = secretStashRoot;

    const secretStashGemNode = MeshBuilder.CreatePolyhedron(
      "secretStashGemNode",
      { type: 1, size: 0.45 },
      scene
    );
    secretStashGemNode.scaling.set(0.8, 1.35, 0.65);
    secretStashGemNode.position.set(0, 1.95, 0);
    secretStashGemNode.material = glowingCrimsonMat;
    secretStashGemNode.parent = secretStashRoot;

    // =========================================================
    // MAP 1 ECONOMY LOOP: 3D MINI-SUB-QUEST NPC (ELDER ROWAN AT HEIRLOOM_NPC_POS)
    // =========================================================
    const elderRowanRoot = new TransformNode("elderRowanRoot", scene);
    elderRowanRoot.parent = overworldRoot;
    elderRowanRoot.position.set(HEIRLOOM_NPC_POS.x, 0, HEIRLOOM_NPC_POS.z);
    elderRowanRoot.rotation.y = Math.PI * 0.15;

    const rowanRug = MeshBuilder.CreateCylinder(
      "rowanRug",
      { diameter: 2.3, height: 0.05, tessellation: 20 },
      scene
    );
    rowanRug.position.set(0, 0.025, 0);
    rowanRug.material = goldKeyMat;
    rowanRug.parent = elderRowanRoot;

    const rowanRobeMat = makeMat(
      "rowanRobeMat",
      new Color3(0.22, 0.48, 0.85),
      new Color3(0.08, 0.18, 0.36)
    );
    const rowanBody = MeshBuilder.CreateCylinder(
      "rowanBody",
      { diameterTop: 0.62, diameterBottom: 1.0, height: 1.28, tessellation: 14 },
      scene
    );
    rowanBody.position.set(0, 0.68, 0);
    rowanBody.material = rowanRobeMat;
    rowanBody.parent = elderRowanRoot;

    const rowanHead = MeshBuilder.CreateSphere(
      "rowanHead",
      { diameter: 0.72, segments: 14 },
      scene
    );
    rowanHead.position.set(0, 1.56, 0);
    rowanHead.material = whiteEyeMat;
    rowanHead.parent = elderRowanRoot;

    const rowanBeard = MeshBuilder.CreateCylinder(
      "rowanBeard",
      { diameterTop: 0.46, diameterBottom: 0.08, height: 0.55, tessellation: 10 },
      scene
    );
    rowanBeard.position.set(0, 1.24, 0.24);
    rowanBeard.material = whiteEyeMat;
    rowanBeard.parent = elderRowanRoot;

    const rowanHat = MeshBuilder.CreateCylinder(
      "rowanHat",
      { diameterTop: 0.06, diameterBottom: 1.08, height: 0.85, tessellation: 12 },
      scene
    );
    rowanHat.position.set(0, 2.1, 0);
    rowanHat.material = goldKeyMat;
    rowanHat.parent = elderRowanRoot;

    const rowanStaff = MeshBuilder.CreateCylinder(
      "rowanStaff",
      { diameter: 0.11, height: 1.85, tessellation: 8 },
      scene
    );
    rowanStaff.position.set(0.54, 0.92, 0.18);
    rowanStaff.material = woodMat;
    rowanStaff.parent = elderRowanRoot;

    // Floating Overhead Quest Marker above Elder Rowan (! when active, Golden Star when ready to claim!)
    const elderRowanQuestMarker = new TransformNode("elderRowanQuestMarker", scene);
    elderRowanQuestMarker.position.set(0, 2.95, 0);
    elderRowanQuestMarker.parent = elderRowanRoot;

    const questExclamationShaft = MeshBuilder.CreateCylinder(
      "questExclamationShaft",
      { diameterTop: 0.24, diameterBottom: 0.12, height: 0.55, tessellation: 10 },
      scene
    );
    questExclamationShaft.position.set(0, 0.22, 0);
    questExclamationShaft.material = goldKeyMat;
    questExclamationShaft.parent = elderRowanQuestMarker;

    const questExclamationDot = MeshBuilder.CreateSphere(
      "questExclamationDot",
      { diameter: 0.22, segments: 10 },
      scene
    );
    questExclamationDot.position.set(0, -0.2, 0);
    questExclamationDot.material = glowingCrimsonMat;
    questExclamationDot.parent = elderRowanQuestMarker;

     // =========================================================
    // MAP 1 HUB: 3D CROSSROADS GUIDE NPC (SCOUT LYRA AT GUIDE_NPC_POS)
    // =========================================================
    const scoutLyraRoot = new TransformNode("scoutLyraRoot", scene);
    scoutLyraRoot.parent = overworldRoot;
    scoutLyraRoot.position.set(GUIDE_NPC_POS.x, 0, GUIDE_NPC_POS.z);
    scoutLyraRoot.rotation.y = Math.PI * 0.85;

    const lyraRug = MeshBuilder.CreateCylinder(
      "lyraRug",
      { diameter: 2.1, height: 0.05, tessellation: 20 },
      scene
    );
    lyraRug.position.set(0, 0.025, 0);
    lyraRug.material = pathMat;
    lyraRug.parent = scoutLyraRoot;

    const lyraCloakMat = makeMat(
      "lyraCloakMat",
      new Color3(0.18, 0.68, 0.44),
      new Color3(0.05, 0.22, 0.14)
    );
    const lyraBody = MeshBuilder.CreateCylinder(
      "lyraBody",
      { diameterTop: 0.56, diameterBottom: 0.92, height: 1.24, tessellation: 14 },
      scene
    );
    lyraBody.position.set(0, 0.66, 0);
    lyraBody.material = lyraCloakMat;
    lyraBody.parent = scoutLyraRoot;

    const lyraHead = MeshBuilder.CreateSphere(
      "lyraHead",
      { diameter: 0.68, segments: 14 },
      scene
    );
    lyraHead.position.set(0, 1.52, 0);
    lyraHead.material = whiteEyeMat;
    lyraHead.parent = scoutLyraRoot;

    const lyraHood = MeshBuilder.CreateCylinder(
      "lyraHood",
      { diameterTop: 0.08, diameterBottom: 0.96, height: 0.78, tessellation: 12 },
      scene
    );
    lyraHood.position.set(0, 1.98, -0.05);
    lyraHood.material = lyraCloakMat;
    lyraHood.parent = scoutLyraRoot;

    const scoutLyraCompass = MeshBuilder.CreateTorus(
      "scoutLyraCompass",
      { diameter: 0.92, thickness: 0.1, tessellation: 20 },
      scene
    );
    scoutLyraCompass.position.set(0, 2.75, 0);
    scoutLyraCompass.material = goldKeyMat;
    scoutLyraCompass.parent = scoutLyraRoot;

    // =========================================================
    // MAP 1 NORTH EXIT: LOCKED DUNGEON ENTRANCE IRON GATE (DUNGEON_ENTRY_GATE_POS = 0, 31.8)
    // =========================================================
    const owDungeonGateNode = new TransformNode("owDungeonGateNode", scene);
    owDungeonGateNode.parent = overworldRoot;
    owDungeonGateNode.position.set(DUNGEON_ENTRY_GATE_POS.x, 0, DUNGEON_ENTRY_GATE_POS.z);

    {
      const h = 4.5;
      const w = 7.4;
      const owIronParts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `owGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        owIronParts.push(bar);
      }
      const crossBeamTop = MeshBuilder.CreateBox(
        "owGateBeamTop",
        { width: w, height: 0.38, depth: 0.5 },
        scene
      );
      crossBeamTop.position.set(0, h - 0.5, 0);
      owIronParts.push(crossBeamTop);

      const crossBeamMid = MeshBuilder.CreateBox(
        "owGateBeamMid",
        { width: w, height: 0.34, depth: 0.45 },
        scene
      );
      crossBeamMid.position.set(0, h * 0.45, 0);
      owIronParts.push(crossBeamMid);

      mergeGroupWithMaterial("mergedOwDungeonGateIron", owIronParts, ironGateMat, owDungeonGateNode);

      const owLockPlate = MeshBuilder.CreateBox(
        "owGateLockPlate",
        { width: 1.15, height: 1.25, depth: 0.65 },
        scene
      );
      owLockPlate.position.set(0, h * 0.45, 0);
      owLockPlate.material = goldKeyMat;
      owLockPlate.parent = owDungeonGateNode;
    }

    // =========================================================
    // MAP 1B (GROVE) SHRINE PEDESTAL: FLOATING GOLDEN SANCTUM KEY & FLAME ROD
    // =========================================================
    const keyPedestal = MeshBuilder.CreateCylinder(
      "keyPedestal",
      { diameterTop: 2.1, diameterBottom: 2.6, height: 0.72, tessellation: 14 },
      scene
    );
    keyPedestal.position.set(DUNGEON_KEY_POS.x, 0.36, DUNGEON_KEY_POS.z);
    keyPedestal.material = ruinMat;
    keyPedestal.parent = groveRoot;

    const keyNode = new TransformNode("sanctumKeyNode", scene);
    keyNode.parent = groveRoot;
    keyNode.position.set(DUNGEON_KEY_POS.x, 1.6, DUNGEON_KEY_POS.z);

    const keyParts: Mesh[] = [];
    const keyBow = MeshBuilder.CreateTorus(
      "keyBow",
      { diameter: 0.75, thickness: 0.18, tessellation: 20 },
      scene
    );
    keyBow.rotation.x = Math.PI / 2;
    keyBow.position.set(0, 0.45, 0);
    keyParts.push(keyBow);

    const keyShaft = MeshBuilder.CreateCylinder(
      "keyShaft",
      { diameter: 0.18, height: 0.95, tessellation: 12 },
      scene
    );
    keyShaft.position.set(0, -0.1, 0);
    keyParts.push(keyShaft);

    const keyBit1 = MeshBuilder.CreateBox("keyBit1", { width: 0.32, height: 0.14, depth: 0.14 }, scene);
    keyBit1.position.set(0.18, -0.35, 0);
    keyParts.push(keyBit1);

    const keyBit2 = MeshBuilder.CreateBox("keyBit2", { width: 0.26, height: 0.14, depth: 0.14 }, scene);
    keyBit2.position.set(0.15, -0.15, 0);
    keyParts.push(keyBit2);

    mergeGroupWithMaterial("mergedSanctumKey", keyParts, goldKeyMat, keyNode);

    const keyBeaconRing = MeshBuilder.CreateTorus(
      "keyBeaconRing",
      { diameter: 2.5, thickness: 0.09, tessellation: 28 },
      scene
    );
    keyBeaconRing.position.set(DUNGEON_KEY_POS.x, 0.12, DUNGEON_KEY_POS.z);
    keyBeaconRing.material = goldKeyMat;
    keyBeaconRing.parent = groveRoot;

    // Dungeon Cross-Shaped Carpet Runners, Central Hub Raised Platform & Boss Arena Ring
    const dgRunnerMat = makeMat(
      "dgRunnerMat",
      new Color3(0.42, 0.14, 0.18),
      new Color3(0.08, 0.02, 0.03)
    );
    const dgRunner = MeshBuilder.CreateBox(
      "dgRunner",
      { width: 4.5, height: 0.05, depth: 66 },
      scene
    );
    dgRunner.position.set(0, 0.025, -1);
    dgRunner.material = dgRunnerMat;
    dgRunner.parent = dungeonRoot;
    dgRunner.isPickable = false;

    const dgCrossRunner = MeshBuilder.CreateBox(
      "dgCrossRunner",
      { width: 56, height: 0.048, depth: 4.2 },
      scene
    );
    dgCrossRunner.position.set(1.0, 0.024, 0);
    dgCrossRunner.material = dgRunnerMat;
    dgCrossRunner.parent = dungeonRoot;
    dgCrossRunner.isPickable = false;

    const dgCryptRunner = MeshBuilder.CreateBox(
      "dgCryptRunner",
      { width: 4.0, height: 0.046, depth: 24 },
      scene
    );
    dgCryptRunner.position.set(26.0, 0.023, -23.0);
    dgCryptRunner.material = dgRunnerMat;
    dgCryptRunner.parent = dungeonRoot;
    dgCryptRunner.isPickable = false;

    // Room 1 Central Hub Raised Stone Platform (surrounded by the 4 Unlit Timed Lanterns)
    const dgHubPlatform = MeshBuilder.CreateBox(
      "dgHubPlatform",
      { width: 6.4, height: 0.24, depth: 6.0 },
      scene
    );
    dgHubPlatform.position.set(0, 0.12, -1.5);
    dgHubPlatform.material = dgPillarMat;
    dgHubPlatform.parent = dungeonRoot;
    dgHubPlatform.isPickable = false;

    const dgHubPlatformRing = MeshBuilder.CreateTorus(
      "dgHubPlatformRing",
      { diameter: 4.6, thickness: 0.14, tessellation: 28 },
      scene
    );
    dgHubPlatformRing.position.set(0, 0.26, -1.5);
    dgHubPlatformRing.material = goldKeyMat;
    dgHubPlatformRing.parent = dungeonRoot;
    dgHubPlatformRing.isPickable = false;

    // Room 2 (West Wing) Small Key Pedestal & Floating Small Key Across the Chasm (`DG_SMALL_KEY_POS = -31.2, 0.0`)
    const dgSmallKeyPedestal = MeshBuilder.CreateCylinder(
      "dgSmallKeyPedestal",
      { diameterTop: 2.1, diameterBottom: 2.5, height: 0.55, tessellation: 16 },
      scene
    );
    dgSmallKeyPedestal.position.set(DG_SMALL_KEY_POS.x, 0.275, DG_SMALL_KEY_POS.z);
    dgSmallKeyPedestal.material = dgPillarMat;
    dgSmallKeyPedestal.parent = dungeonRoot;
    dgSmallKeyPedestal.isPickable = false;

    const dgSmallKeyBeaconRing = MeshBuilder.CreateTorus(
      "dgSmallKeyBeaconRing",
      { diameter: 2.4, thickness: 0.1, tessellation: 24 },
      scene
    );
    dgSmallKeyBeaconRing.position.set(DG_SMALL_KEY_POS.x, 0.58, DG_SMALL_KEY_POS.z);
    dgSmallKeyBeaconRing.material = goldKeyMat;
    dgSmallKeyBeaconRing.parent = dungeonRoot;
    dgSmallKeyBeaconRing.isPickable = false;

    const dgSmallKeyNode = new TransformNode("dgSmallKeyNode", scene);
    dgSmallKeyNode.parent = dungeonRoot;
    dgSmallKeyNode.position.set(DG_SMALL_KEY_POS.x, 1.65, DG_SMALL_KEY_POS.z);
    {
      const skParts: Mesh[] = [];
      const skBow = MeshBuilder.CreateTorus(
        "dgSmallKeyBow",
        { diameter: 0.68, thickness: 0.16, tessellation: 18 },
        scene
      );
      skBow.rotation.x = Math.PI / 2;
      skBow.position.set(0, 0.42, 0);
      skParts.push(skBow);

      const skShaft = MeshBuilder.CreateCylinder(
        "dgSmallKeyShaft",
        { diameter: 0.16, height: 0.92, tessellation: 10 },
        scene
      );
      skShaft.position.set(0, -0.14, 0);
      skParts.push(skShaft);

      const skBit1 = MeshBuilder.CreateBox(
        "dgSmallKeyBit1",
        { width: 0.28, height: 0.12, depth: 0.12 },
        scene
      );
      skBit1.position.set(0.16, -0.34, 0);
      skParts.push(skBit1);

      const skBit2 = MeshBuilder.CreateBox(
        "dgSmallKeyBit2",
        { width: 0.34, height: 0.14, depth: 0.12 },
        scene
      );
      skBit2.position.set(0.18, -0.52, 0);
      skParts.push(skBit2);

      mergeGroupWithMaterial("dgSmallKeyMerged", skParts, goldKeyMat, dgSmallKeyNode);
    }

    // Room 1 -> Room 3 Locked Small Key Door (`EAST_WING_DOOR_POS = 14.0, 0.0`)
    const eastWingDoorNode = new TransformNode("eastWingDoorNode", scene);
    eastWingDoorNode.parent = dungeonRoot;
    eastWingDoorNode.position.set(EAST_WING_DOOR_POS.x, 0, EAST_WING_DOOR_POS.z);
    eastWingDoorNode.rotation.y = Math.PI / 2;
    {
      const h = 4.5;
      const w = 6.2;
      const eastDoorParts: Mesh[] = [];
      const barCount = 7;
      for (let b = 0; b < barCount; b++) {
        const bx = -2.6 + (b / (barCount - 1)) * 5.2;
        const bar = MeshBuilder.CreateCylinder(
          `eastDoorBar-${b}`,
          { diameter: 0.24, height: h, tessellation: 10 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        eastDoorParts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "eastDoorBeamTop",
        { width: w, height: 0.36, depth: 0.48 },
        scene
      );
      beamTop.position.set(0, h - 0.45, 0);
      eastDoorParts.push(beamTop);

      const beamMid = MeshBuilder.CreateBox(
        "eastDoorBeamMid",
        { width: w, height: 0.32, depth: 0.44 },
        scene
      );
      beamMid.position.set(0, h * 0.45, 0);
      eastDoorParts.push(beamMid);

      mergeGroupWithMaterial("mergedEastWingDoorIron", eastDoorParts, ironGateMat, eastWingDoorNode);

      const eastLockPlate = MeshBuilder.CreateBox(
        "eastDoorLockPlate",
        { width: 0.95, height: 1.05, depth: 0.62 },
        scene
      );
      eastLockPlate.position.set(0, h * 0.45, 0);
      eastLockPlate.material = goldKeyMat;
      eastLockPlate.parent = eastWingDoorNode;
    }

    // Room 3 (East Wing: Ember Sanctum) Center Flame Rod Treasure Chest (`FIRE_ROD_CHEST_POS = 26.0, 1.5`)
    const fireRodChestRoot = new TransformNode("fireRodChestRoot", scene);
    fireRodChestRoot.parent = dungeonRoot;
    fireRodChestRoot.position.set(FIRE_ROD_CHEST_POS.x, 0, FIRE_ROD_CHEST_POS.z);

    const fireRodChestDais = MeshBuilder.CreateBox(
      "fireRodChestDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    fireRodChestDais.position.set(0, 0.18, 0);
    fireRodChestDais.material = dgPillarMat;
    fireRodChestDais.parent = fireRodChestRoot;

    const fireRodChestBase = MeshBuilder.CreateBox(
      "fireRodChestBase",
      { width: 1.85, height: 0.92, depth: 1.25 },
      scene
    );
    fireRodChestBase.position.set(0, 0.82, 0);
    fireRodChestBase.material = woodMat;
    fireRodChestBase.parent = fireRodChestRoot;

    const fireRodChestTrim = MeshBuilder.CreateBox(
      "fireRodChestTrim",
      { width: 1.94, height: 0.22, depth: 1.32 },
      scene
    );
    fireRodChestTrim.position.set(0, 1.2, 0);
    fireRodChestTrim.material = goldKeyMat;
    fireRodChestTrim.parent = fireRodChestRoot;

    const fireRodChestLid = MeshBuilder.CreateCylinder(
      "fireRodChestLid",
      { diameter: 1.25, height: 1.88, tessellation: 16 },
      scene
    );
    fireRodChestLid.rotation.z = Math.PI / 2;
    fireRodChestLid.position.set(0, 1.32, 0);
    fireRodChestLid.material = goldKeyMat;
    fireRodChestLid.parent = fireRodChestRoot;

    const fireRodChestSealRing = MeshBuilder.CreateTorus(
      "fireRodChestSealRing",
      { diameter: 2.9, thickness: 0.13, tessellation: 24 },
      scene
    );
    fireRodChestSealRing.position.set(0, 0.45, 0);
    fireRodChestSealRing.material = glowingCrimsonMat;
    fireRodChestSealRing.parent = fireRodChestRoot;

    const fireRodChestRelicNode = new TransformNode("fireRodChestRelicNode", scene);
    fireRodChestRelicNode.parent = fireRodChestRoot;
    fireRodChestRelicNode.position.set(0, 2.25, 0);
    {
      const rodShaft = MeshBuilder.CreateCylinder(
        "fireRodChestShaft",
        { diameterTop: 0.13, diameterBottom: 0.16, height: 1.15, tessellation: 10 },
        scene
      );
      rodShaft.rotation.z = -0.35;
      rodShaft.material = glowingCrimsonMat;
      rodShaft.parent = fireRodChestRelicNode;

      const rodOrb = MeshBuilder.CreateSphere(
        "fireRodChestOrb",
        { diameter: 0.42, segments: 12 },
        scene
      );
      rodOrb.position.set(0.2, 0.52, 0);
      rodOrb.material = goldKeyMat;
      rodOrb.parent = fireRodChestRelicNode;
    }

    // Room 4 (South-East Dark Archery Crypt) Big Boss Key Chest (`BIG_KEY_CHEST_POS = 26.0, -24.0`) & West Shortcut Gate (`CRYPT_SHORTCUT_DOOR_POS = 14.0, -24.0`)
    const bigKeyChestRoot = new TransformNode("bigKeyChestRoot", scene);
    bigKeyChestRoot.parent = dungeonRoot;
    bigKeyChestRoot.position.set(BIG_KEY_CHEST_POS.x, 0, BIG_KEY_CHEST_POS.z);

    const bigKeyChestDais = MeshBuilder.CreateBox(
      "bigKeyChestDais",
      { width: 3.8, height: 0.38, depth: 3.0 },
      scene
    );
    bigKeyChestDais.position.set(0, 0.19, 0);
    bigKeyChestDais.material = dgPillarMat;
    bigKeyChestDais.parent = bigKeyChestRoot;

    const bigKeyChestBase = MeshBuilder.CreateBox(
      "bigKeyChestBase",
      { width: 1.95, height: 0.98, depth: 1.32 },
      scene
    );
    bigKeyChestBase.position.set(0, 0.86, 0);
    bigKeyChestBase.material = glowingCrimsonMat;
    bigKeyChestBase.parent = bigKeyChestRoot;

    const bigKeyChestTrim = MeshBuilder.CreateBox(
      "bigKeyChestTrim",
      { width: 2.05, height: 0.24, depth: 1.4 },
      scene
    );
    bigKeyChestTrim.position.set(0, 1.26, 0);
    bigKeyChestTrim.material = goldKeyMat;
    bigKeyChestTrim.parent = bigKeyChestRoot;

    const bigKeyChestLid = MeshBuilder.CreateCylinder(
      "bigKeyChestLid",
      { diameter: 1.32, height: 1.98, tessellation: 16 },
      scene
    );
    bigKeyChestLid.rotation.z = Math.PI / 2;
    bigKeyChestLid.position.set(0, 1.38, 0);
    bigKeyChestLid.material = goldKeyMat;
    bigKeyChestLid.parent = bigKeyChestRoot;

    const bigKeyChestSealRing = MeshBuilder.CreateTorus(
      "bigKeyChestSealRing",
      { diameter: 3.1, thickness: 0.14, tessellation: 24 },
      scene
    );
    bigKeyChestSealRing.position.set(0, 0.48, 0);
    bigKeyChestSealRing.material = glowingCrimsonMat;
    bigKeyChestSealRing.parent = bigKeyChestRoot;

    const bigKeyChestUnsealedRing = MeshBuilder.CreateTorus(
      "bigKeyChestUnsealedRing",
      { diameter: 3.2, thickness: 0.14, tessellation: 28 },
      scene
    );
    bigKeyChestUnsealedRing.position.set(0, 0.48, 0);
    bigKeyChestUnsealedRing.material = goldKeyMat;
    bigKeyChestUnsealedRing.parent = bigKeyChestRoot;

    const bigKeyChestItemNode = new TransformNode("bigKeyChestItemNode", scene);
    bigKeyChestItemNode.parent = bigKeyChestRoot;
    bigKeyChestItemNode.position.set(0, 2.35, 0);
    {
      const bkParts: Mesh[] = [];
      const bkBow = MeshBuilder.CreateTorus(
        "bigKeyItemBow",
        { diameter: 0.82, thickness: 0.2, tessellation: 18 },
        scene
      );
      bkBow.rotation.x = Math.PI / 2;
      bkBow.position.set(0, 0.48, 0);
      bkParts.push(bkBow);

      const bkShaft = MeshBuilder.CreateCylinder(
        "bigKeyItemShaft",
        { diameter: 0.2, height: 1.05, tessellation: 10 },
        scene
      );
      bkShaft.position.set(0, -0.15, 0);
      bkParts.push(bkShaft);

      const bkBit = MeshBuilder.CreateBox(
        "bigKeyItemBit",
        { width: 0.42, height: 0.24, depth: 0.16 },
        scene
      );
      bkBit.position.set(0.22, -0.45, 0);
      bkParts.push(bkBit);

      mergeGroupWithMaterial("bigKeyItemMerged", bkParts, goldKeyMat, bigKeyChestItemNode);
    }

    const cryptShortcutGateNode = new TransformNode("cryptShortcutGateNode", scene);
    cryptShortcutGateNode.parent = dungeonRoot;
    cryptShortcutGateNode.position.set(CRYPT_SHORTCUT_DOOR_POS.x, 0, CRYPT_SHORTCUT_DOOR_POS.z);
    cryptShortcutGateNode.rotation.y = Math.PI / 2;
    {
      const h = 4.4;
      const w = 5.6;
      const scParts: Mesh[] = [];
      const barCount = 7;
      for (let b = 0; b < barCount; b++) {
        const bx = -2.3 + (b / (barCount - 1)) * 4.6;
        const bar = MeshBuilder.CreateCylinder(
          `cryptShortcutBar-${b}`,
          { diameter: 0.22, height: h, tessellation: 10 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        scParts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "cryptShortcutBeamTop",
        { width: w, height: 0.34, depth: 0.44 },
        scene
      );
      beamTop.position.set(0, h - 0.45, 0);
      scParts.push(beamTop);

      mergeGroupWithMaterial("mergedCryptShortcutIron", scParts, ironGateMat, cryptShortcutGateNode);
    }

    const bossArenaRing = MeshBuilder.CreateTorus(
      "bossArenaRing",
      { diameter: 14, thickness: 0.22, tessellation: 36 },
      scene
    );
    bossArenaRing.position.set(0, 0.06, 24);
    bossArenaRing.material = makeMat(
      "bossArenaRingMat",
      new Color3(0.75, 0.2, 0.25),
      new Color3(0.35, 0.06, 0.08)
    );
    bossArenaRing.parent = dungeonRoot;
    bossArenaRing.isPickable = false;

    // Locked Iron Gate in Dungeon (Southern entry to Room 5 Boss Lair)
    const lockedGateNode = new TransformNode("lockedGateNode", scene);
    lockedGateNode.parent = dungeonRoot;
    lockedGateNode.position.set(LOCKED_GATE_POS.x, 0, LOCKED_GATE_POS.z);

    {
      const h = 4.6;
      const w = 7.0;
      const ironParts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.0 + (b / (barCount - 1)) * 6.0;
        const bar = MeshBuilder.CreateCylinder(
          `gateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        ironParts.push(bar);
      }
      const crossBeamTop = MeshBuilder.CreateBox(
        "gateBeamTop",
        { width: w, height: 0.38, depth: 0.5 },
        scene
      );
      crossBeamTop.position.set(0, h - 0.5, 0);
      ironParts.push(crossBeamTop);

      const crossBeamMid = MeshBuilder.CreateBox(
        "gateBeamMid",
        { width: w, height: 0.34, depth: 0.45 },
        scene
      );
      crossBeamMid.position.set(0, h * 0.45, 0);
      ironParts.push(crossBeamMid);

      mergeGroupWithMaterial("mergedGateIron", ironParts, ironGateMat, lockedGateNode);

      const lockPlate = MeshBuilder.CreateBox(
        "gateLockPlate",
        { width: 1.1, height: 1.2, depth: 0.65 },
        scene
      );
      lockPlate.position.set(0, h * 0.45, 0);
      lockPlate.material = goldKeyMat;
      lockPlate.parent = lockedGateNode;
    }

    // Northern Sanctum Exit Gate (unseals when Boss Ignis is defeated, opening the path to Map 3!)
    const bossExitGateNode = new TransformNode("bossExitGateNode", scene);
    bossExitGateNode.parent = dungeonRoot;
    bossExitGateNode.position.set(BOSS_EXIT_GATE_POS.x, 0, BOSS_EXIT_GATE_POS.z);

    {
      const h = 4.8;
      const w = 7.4;
      const exitIronParts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `exitGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        exitIronParts.push(bar);
      }
      const crossBeamTop = MeshBuilder.CreateBox(
        "exitGateBeamTop",
        { width: w, height: 0.4, depth: 0.52 },
        scene
      );
      crossBeamTop.position.set(0, h - 0.5, 0);
      exitIronParts.push(crossBeamTop);

      const crossBeamMid = MeshBuilder.CreateBox(
        "exitGateBeamMid",
        { width: w, height: 0.34, depth: 0.48 },
        scene
      );
      crossBeamMid.position.set(0, h * 0.45, 0);
      exitIronParts.push(crossBeamMid);

      mergeGroupWithMaterial("mergedExitGateIron", exitIronParts, ironGateMat, bossExitGateNode);

      const sealEmblem = MeshBuilder.CreateTorus(
        "exitGateSealEmblem",
        { diameter: 1.5, thickness: 0.18, tessellation: 20 },
        scene
      );
      sealEmblem.rotation.x = Math.PI / 2;
      sealEmblem.position.set(0, h * 0.48, 0);
      sealEmblem.material = glowingCrimsonMat;
      sealEmblem.parent = bossExitGateNode;
    }

    // --- BOSS CHEST & SEAL IN DUNGEON ROOM 5 (0, 32) ---
    const chestRoot = new TransformNode("bossChestRoot", scene);
    chestRoot.parent = dungeonRoot;
    chestRoot.position.set(BOSS_CHEST_POS.x, 0, BOSS_CHEST_POS.z);

    const chestDais = MeshBuilder.CreateBox(
      "chestDais",
      { width: 4.4, height: 0.45, depth: 3.4 },
      scene
    );
    chestDais.position.set(0, 0.225, 0);
    chestDais.material = dgPillarMat;
    chestDais.parent = chestRoot;

    const chestBase = MeshBuilder.CreateBox(
      "chestBase",
      { width: 2.1, height: 1.05, depth: 1.4 },
      scene
    );
    chestBase.position.set(0, 0.95, 0);
    chestBase.material = woodMat;
    chestBase.parent = chestRoot;

    const chestTrim = MeshBuilder.CreateBox(
      "chestTrim",
      { width: 2.2, height: 0.25, depth: 1.48 },
      scene
    );
    chestTrim.position.set(0, 1.38, 0);
    chestTrim.material = goldKeyMat;
    chestTrim.parent = chestRoot;

    const chestLid = MeshBuilder.CreateCylinder(
      "chestLid",
      { diameter: 1.4, height: 2.12, tessellation: 18 },
      scene
    );
    chestLid.rotation.z = Math.PI / 2;
    chestLid.position.set(0, 1.5, 0);
    chestLid.material = goldKeyMat;
    chestLid.parent = chestRoot;

    const chestSealRing = MeshBuilder.CreateTorus(
      "chestSealRing",
      { diameter: 3.4, thickness: 0.16, tessellation: 28 },
      scene
    );
    chestSealRing.position.set(0, 1.1, 0);
    chestSealRing.material = glowingCrimsonMat;
    chestSealRing.parent = chestRoot;

    const chestUnsealedRing = MeshBuilder.CreateTorus(
      "chestUnsealedRing",
      { diameter: 3.6, thickness: 0.14, tessellation: 32 },
      scene
    );
    chestUnsealedRing.position.set(0, 0.55, 0);
    chestUnsealedRing.material = goldKeyMat;
    chestUnsealedRing.parent = chestRoot;

    const zeldoCrestNode = new TransformNode("zeldoCrestNode", scene);
    zeldoCrestNode.parent = chestRoot;
    zeldoCrestNode.position.set(0, 2.7, 0);

    const crestParts: Mesh[] = [];
    const crestOffsets = [
      { x: 0, y: 0.48 },
      { x: -0.42, y: -0.24 },
      { x: 0.42, y: -0.24 },
    ];
    crestOffsets.forEach((pos, idx) => {
      const shard = MeshBuilder.CreatePolyhedron(
        `zeldoCrestShard-${idx}`,
        { type: 1, size: 0.34 },
        scene
      );
      shard.position.set(pos.x, pos.y, 0);
      crestParts.push(shard);
    });
    mergeGroupWithMaterial("mergedZeldoCrest", crestParts, goldKeyMat, zeldoCrestNode);

    // =========================================================
    // MAP 3 (FRONTIER): SAPPER CAPTAIN VANE NPC, BOMB BAG CHEST & NORTH GLACIAL SEAL GATE
    // =========================================================
    const glacialIceMat = makeMat(
      "glacialIceMat",
      new Color3(0.32, 0.85, 1.0),
      new Color3(0.14, 0.55, 0.88),
      new Color3(0.9, 0.98, 1.0),
      1.0,
      96
    );

    const sapperNpcRoot = new TransformNode("sapperNpcRoot", scene);
    sapperNpcRoot.parent = frontierRoot;
    sapperNpcRoot.position.set(FRONTIER_SAPPER_NPC_POS.x, 0, FRONTIER_SAPPER_NPC_POS.z);
    sapperNpcRoot.rotation.y = Math.PI * 0.25;

    const sapperRug = MeshBuilder.CreateCylinder(
      "sapperRug",
      { diameter: 2.2, height: 0.05, tessellation: 20 },
      scene
    );
    sapperRug.position.set(0, 0.025, 0);
    sapperRug.material = pathMat;
    sapperRug.parent = sapperNpcRoot;

    const sapperArmorMat = makeMat(
      "sapperArmorMat",
      new Color3(0.85, 0.42, 0.16),
      new Color3(0.18, 0.08, 0.03)
    );
    const sapperBody = MeshBuilder.CreateCylinder(
      "sapperBody",
      { diameterTop: 0.64, diameterBottom: 0.98, height: 1.28, tessellation: 14 },
      scene
    );
    sapperBody.position.set(0, 0.68, 0);
    sapperBody.material = sapperArmorMat;
    sapperBody.parent = sapperNpcRoot;

    const sapperHead = MeshBuilder.CreateSphere(
      "sapperHead",
      { diameter: 0.72, segments: 14 },
      scene
    );
    sapperHead.position.set(0, 1.54, 0);
    sapperHead.material = whiteEyeMat;
    sapperHead.parent = sapperNpcRoot;

    const sapperHelm = MeshBuilder.CreateCylinder(
      "sapperHelm",
      { diameterTop: 0.52, diameterBottom: 0.88, height: 0.55, tessellation: 12 },
      scene
    );
    sapperHelm.position.set(0, 1.88, 0);
    sapperHelm.material = ironGateMat;
    sapperHelm.parent = sapperNpcRoot;

    const sapperQuestMarker = new TransformNode("sapperQuestMarker", scene);
    sapperQuestMarker.position.set(0, 2.75, 0);
    sapperQuestMarker.parent = sapperNpcRoot;
    {
      const qShaft = MeshBuilder.CreateCylinder(
        "sapperQuestShaft",
        { diameterTop: 0.22, diameterBottom: 0.12, height: 0.52, tessellation: 10 },
        scene
      );
      qShaft.position.set(0, 0.2, 0);
      qShaft.material = goldKeyMat;
      qShaft.parent = sapperQuestMarker;

      const qDot = MeshBuilder.CreateSphere(
        "sapperQuestDot",
        { diameter: 0.2, segments: 10 },
        scene
      );
      qDot.position.set(0, -0.18, 0);
      qDot.material = glowingCrimsonMat;
      qDot.parent = sapperQuestMarker;
    }

    // SE Sapper Outpost Bomb Bag Chest (`FRONTIER_BOMB_CHEST_POS = 24.5, -18.5`)
    const frontierBombChestRoot = new TransformNode("frontierBombChestRoot", scene);
    frontierBombChestRoot.parent = frontierRoot;
    frontierBombChestRoot.position.set(FRONTIER_BOMB_CHEST_POS.x, 0, FRONTIER_BOMB_CHEST_POS.z);

    const frBombDais = MeshBuilder.CreateBox(
      "frBombDais",
      { width: 3.4, height: 0.34, depth: 2.6 },
      scene
    );
    frBombDais.position.set(0, 0.17, 0);
    frBombDais.material = ruinMat;
    frBombDais.parent = frontierBombChestRoot;

    const frBombBase = MeshBuilder.CreateBox(
      "frBombBase",
      { width: 1.85, height: 0.92, depth: 1.25 },
      scene
    );
    frBombBase.position.set(0, 0.8, 0);
    frBombBase.material = woodMat;
    frBombBase.parent = frontierBombChestRoot;

    const frBombTrim = MeshBuilder.CreateBox(
      "frBombTrim",
      { width: 1.94, height: 0.22, depth: 1.32 },
      scene
    );
    frBombTrim.position.set(0, 1.18, 0);
    frBombTrim.material = goldKeyMat;
    frBombTrim.parent = frontierBombChestRoot;

    const frontierBombChestLid = MeshBuilder.CreateCylinder(
      "frontierBombChestLid",
      { diameter: 1.25, height: 1.88, tessellation: 16 },
      scene
    );
    frontierBombChestLid.rotation.z = Math.PI / 2;
    frontierBombChestLid.position.set(0, 1.3, 0);
    frontierBombChestLid.material = goldKeyMat;
    frontierBombChestLid.parent = frontierBombChestRoot;

    const frontierBombChestRing = MeshBuilder.CreateTorus(
      "frontierBombChestRing",
      { diameter: 3.0, thickness: 0.13, tessellation: 24 },
      scene
    );
    frontierBombChestRing.position.set(0, 0.42, 0);
    frontierBombChestRing.material = glowingCrimsonMat;
    frontierBombChestRing.parent = frontierBombChestRoot;

    const frontierBombRelicNode = new TransformNode("frontierBombRelicNode", scene);
    frontierBombRelicNode.parent = frontierBombChestRoot;
    frontierBombRelicNode.position.set(0, 2.2, 0);
    {
      const bSphere = MeshBuilder.CreateSphere(
        "frBombRelicSphere",
        { diameter: 0.72, segments: 14 },
        scene
      );
      bSphere.material = darkObsidianMat;
      bSphere.parent = frontierBombRelicNode;

      const bCap = MeshBuilder.CreateCylinder(
        "frBombRelicCap",
        { diameter: 0.28, height: 0.2, tessellation: 10 },
        scene
      );
      bCap.position.set(0, 0.36, 0);
      bCap.material = goldKeyMat;
      bCap.parent = frontierBombRelicNode;

      const bSpark = MeshBuilder.CreatePolyhedron(
        "frBombRelicSpark",
        { type: 1, size: 0.18 },
        scene
      );
      bSpark.position.set(0, 0.56, 0);
      bSpark.material = glowingCrimsonMat;
      bSpark.parent = frontierBombRelicNode;
    }

    // NW Cliffside Grapple Reliquary Chest (`FRONTIER_HOOKSHOT_CHEST_POS = -24.5, 22.0`)
    const frontierHookshotChestRoot = new TransformNode("frontierHookshotChestRoot", scene);
    frontierHookshotChestRoot.parent = frontierRoot;
    frontierHookshotChestRoot.position.set(
      FRONTIER_HOOKSHOT_CHEST_POS.x,
      0,
      FRONTIER_HOOKSHOT_CHEST_POS.z
    );

    const frHookDais = MeshBuilder.CreateBox(
      "frHookDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    frHookDais.position.set(0, 0.18, 0);
    frHookDais.material = dgPillarMat;
    frHookDais.parent = frontierHookshotChestRoot;

    const frHookBase = MeshBuilder.CreateBox(
      "frHookBase",
      { width: 1.85, height: 0.92, depth: 1.25 },
      scene
    );
    frHookBase.position.set(0, 0.82, 0);
    frHookBase.material = ironGateMat;
    frHookBase.parent = frontierHookshotChestRoot;

    const frHookTrim = MeshBuilder.CreateBox(
      "frHookTrim",
      { width: 1.94, height: 0.22, depth: 1.32 },
      scene
    );
    frHookTrim.position.set(0, 1.2, 0);
    frHookTrim.material = goldKeyMat;
    frHookTrim.parent = frontierHookshotChestRoot;

    const frontierHookshotChestLid = MeshBuilder.CreateCylinder(
      "frontierHookshotChestLid",
      { diameter: 1.25, height: 1.88, tessellation: 16 },
      scene
    );
    frontierHookshotChestLid.rotation.z = Math.PI / 2;
    frontierHookshotChestLid.position.set(0, 1.32, 0);
    frontierHookshotChestLid.material = goldKeyMat;
    frontierHookshotChestLid.parent = frontierHookshotChestRoot;

    const frontierHookshotChestRing = MeshBuilder.CreateTorus(
      "frontierHookshotChestRing",
      { diameter: 2.95, thickness: 0.13, tessellation: 24 },
      scene
    );
    frontierHookshotChestRing.position.set(0, 0.45, 0);
    frontierHookshotChestRing.material = goldKeyMat;
    frontierHookshotChestRing.parent = frontierHookshotChestRoot;

    const frontierHookshotRelicNode = new TransformNode("frontierHookshotRelicNode", scene);
    frontierHookshotRelicNode.parent = frontierHookshotChestRoot;
    frontierHookshotRelicNode.position.set(0, 2.25, 0);
    {
      const hkBarrel = MeshBuilder.CreateCylinder(
        "frHookRelicBarrel",
        { diameterTop: 0.24, diameterBottom: 0.34, height: 0.65, tessellation: 12 },
        scene
      );
      hkBarrel.rotation.z = -0.45;
      hkBarrel.material = bladeMat;
      hkBarrel.parent = frontierHookshotRelicNode;

      const hkClawRing = MeshBuilder.CreateTorus(
        "frHookRelicRing",
        { diameter: 0.48, thickness: 0.1, tessellation: 16 },
        scene
      );
      hkClawRing.position.set(0.22, 0.28, 0);
      hkClawRing.material = goldKeyMat;
      hkClawRing.parent = frontierHookshotRelicNode;
    }

    // North Glacial Seal Gate to Map 5 (`FRONTIER_CITADEL_GATE_POS = 0, 31.8`)
    const frCitadelGateNode = new TransformNode("frCitadelGateNode", scene);
    frCitadelGateNode.parent = frontierRoot;
    frCitadelGateNode.position.set(FRONTIER_CITADEL_GATE_POS.x, 0, FRONTIER_CITADEL_GATE_POS.z);
    {
      const h = 4.6;
      const w = 7.4;
      const parts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `frCitadelBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        parts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "frCitadelBeamTop",
        { width: w, height: 0.38, depth: 0.5 },
        scene
      );
      beamTop.position.set(0, h - 0.5, 0);
      parts.push(beamTop);

      const beamMid = MeshBuilder.CreateBox(
        "frCitadelBeamMid",
        { width: w, height: 0.34, depth: 0.45 },
        scene
      );
      beamMid.position.set(0, h * 0.45, 0);
      parts.push(beamMid);

      mergeGroupWithMaterial("mergedFrCitadelGateIron", parts, ironGateMat, frCitadelGateNode);

      const lockPlate = MeshBuilder.CreateBox(
        "frCitadelLockPlate",
        { width: 1.15, height: 1.25, depth: 0.65 },
        scene
      );
      lockPlate.position.set(0, h * 0.45, 0);
      lockPlate.material = glacialIceMat;
      lockPlate.parent = frCitadelGateNode;
    }

    // =========================================================
    // MAP 4 (CAVERNS): NW RELIQUARY SHOVEL/MAIL CHEST & EAST GLACIAL CREST KEY PEDESTAL
    // =========================================================
    const cavernShovelChestRoot = new TransformNode("cavernShovelChestRoot", scene);
    cavernShovelChestRoot.parent = cavernsRoot;
    cavernShovelChestRoot.position.set(CAVERN_SHOVEL_CHEST_POS.x, 0, CAVERN_SHOVEL_CHEST_POS.z);

    const cvChestDais = MeshBuilder.CreateBox(
      "cvChestDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    cvChestDais.position.set(0, 0.18, 0);
    cvChestDais.material = dgPillarMat;
    cvChestDais.parent = cavernShovelChestRoot;

    const cvChestBase = MeshBuilder.CreateBox(
      "cvChestBase",
      { width: 1.85, height: 0.92, depth: 1.25 },
      scene
    );
    cvChestBase.position.set(0, 0.82, 0);
    cvChestBase.material = glacialIceMat;
    cvChestBase.parent = cavernShovelChestRoot;

    const cvChestTrim = MeshBuilder.CreateBox(
      "cvChestTrim",
      { width: 1.94, height: 0.22, depth: 1.32 },
      scene
    );
    cvChestTrim.position.set(0, 1.2, 0);
    cvChestTrim.material = goldKeyMat;
    cvChestTrim.parent = cavernShovelChestRoot;

    const cavernShovelChestLid = MeshBuilder.CreateCylinder(
      "cavernShovelChestLid",
      { diameter: 1.25, height: 1.88, tessellation: 16 },
      scene
    );
    cavernShovelChestLid.rotation.z = Math.PI / 2;
    cavernShovelChestLid.position.set(0, 1.32, 0);
    cavernShovelChestLid.material = goldKeyMat;
    cavernShovelChestLid.parent = cavernShovelChestRoot;

    const cavernShovelChestRing = MeshBuilder.CreateTorus(
      "cavernShovelChestRing",
      { diameter: 2.9, thickness: 0.13, tessellation: 24 },
      scene
    );
    cavernShovelChestRing.position.set(0, 0.45, 0);
    cavernShovelChestRing.material = glacialIceMat;
    cavernShovelChestRing.parent = cavernShovelChestRoot;

    const cavernShovelRelicNode = new TransformNode("cavernShovelRelicNode", scene);
    cavernShovelRelicNode.parent = cavernShovelChestRoot;
    cavernShovelRelicNode.position.set(0, 2.25, 0);
    {
      const shShaft = MeshBuilder.CreateCylinder(
        "cvShovelRelicShaft",
        { diameter: 0.12, height: 1.0, tessellation: 10 },
        scene
      );
      shShaft.rotation.z = 0.35;
      shShaft.material = woodMat;
      shShaft.parent = cavernShovelRelicNode;

      const shBlade = MeshBuilder.CreateBox(
        "cvShovelRelicBlade",
        { width: 0.46, height: 0.52, depth: 0.08 },
        scene
      );
      shBlade.position.set(-0.2, -0.45, 0);
      shBlade.rotation.z = 0.35;
      shBlade.material = bladeMat;
      shBlade.parent = cavernShovelRelicNode;
    }

    // SW Glacial Forge War-Hammer Chest (`CAVERN_HAMMER_CHEST_POS = -24.5, -18.5`)
    const cavernHammerChestRoot = new TransformNode("cavernHammerChestRoot", scene);
    cavernHammerChestRoot.parent = cavernsRoot;
    cavernHammerChestRoot.position.set(CAVERN_HAMMER_CHEST_POS.x, 0, CAVERN_HAMMER_CHEST_POS.z);

    const cvHammerDais = MeshBuilder.CreateBox(
      "cvHammerDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    cvHammerDais.position.set(0, 0.18, 0);
    cvHammerDais.material = dgPillarMat;
    cvHammerDais.parent = cavernHammerChestRoot;

    const cvHammerBase = MeshBuilder.CreateBox(
      "cvHammerBase",
      { width: 1.85, height: 0.92, depth: 1.25 },
      scene
    );
    cvHammerBase.position.set(0, 0.82, 0);
    cvHammerBase.material = darkObsidianMat;
    cvHammerBase.parent = cavernHammerChestRoot;

    const cvHammerTrim = MeshBuilder.CreateBox(
      "cvHammerTrim",
      { width: 1.94, height: 0.22, depth: 1.32 },
      scene
    );
    cvHammerTrim.position.set(0, 1.2, 0);
    cvHammerTrim.material = goldKeyMat;
    cvHammerTrim.parent = cavernHammerChestRoot;

    const cavernHammerChestLid = MeshBuilder.CreateCylinder(
      "cavernHammerChestLid",
      { diameter: 1.25, height: 1.88, tessellation: 16 },
      scene
    );
    cavernHammerChestLid.rotation.z = Math.PI / 2;
    cavernHammerChestLid.position.set(0, 1.32, 0);
    cavernHammerChestLid.material = goldKeyMat;
    cavernHammerChestLid.parent = cavernHammerChestRoot;

    const cavernHammerChestRing = MeshBuilder.CreateTorus(
      "cavernHammerChestRing",
      { diameter: 2.9, thickness: 0.13, tessellation: 24 },
      scene
    );
    cavernHammerChestRing.position.set(0, 0.45, 0);
    cavernHammerChestRing.material = goldKeyMat;
    cavernHammerChestRing.parent = cavernHammerChestRoot;

    const cavernHammerRelicNode = new TransformNode("cavernHammerRelicNode", scene);
    cavernHammerRelicNode.parent = cavernHammerChestRoot;
    cavernHammerRelicNode.position.set(0, 2.28, 0);
    {
      const hmShaft = MeshBuilder.CreateCylinder(
        "cvHammerRelicShaft",
        { diameter: 0.12, height: 1.05, tessellation: 10 },
        scene
      );
      hmShaft.rotation.z = -0.32;
      hmShaft.material = woodMat;
      hmShaft.parent = cavernHammerRelicNode;

      const hmHead = MeshBuilder.CreateBox(
        "cvHammerRelicHead",
        { width: 0.68, height: 0.38, depth: 0.42 },
        scene
      );
      hmHead.position.set(0.16, 0.42, 0);
      hmHead.rotation.z = -0.32;
      hmHead.material = ironGateMat;
      hmHead.parent = cavernHammerRelicNode;

      const hmFaces = MeshBuilder.CreateCylinder(
        "cvHammerRelicFaces",
        { diameter: 0.36, height: 0.74, tessellation: 12 },
        scene
      );
      hmFaces.position.set(0.16, 0.42, 0);
      hmFaces.rotation.z = Math.PI / 2 - 0.32;
      hmFaces.material = goldKeyMat;
      hmFaces.parent = cavernHammerRelicNode;
    }

    // East Glacial Sanctum Pedestal & Floating Glacial Crest Key (`CAVERN_CREST_KEY_POS = 24.0, 14.0`)
    const cvKeyPedestal = MeshBuilder.CreateCylinder(
      "cvKeyPedestal",
      { diameterTop: 2.2, diameterBottom: 2.7, height: 0.72, tessellation: 16 },
      scene
    );
    cvKeyPedestal.position.set(CAVERN_CREST_KEY_POS.x, 0.36, CAVERN_CREST_KEY_POS.z);
    cvKeyPedestal.material = dgPillarMat;
    cvKeyPedestal.parent = cavernsRoot;

    const glacialKeyBeaconRing = MeshBuilder.CreateTorus(
      "glacialKeyBeaconRing",
      { diameter: 2.7, thickness: 0.12, tessellation: 28 },
      scene
    );
    glacialKeyBeaconRing.position.set(CAVERN_CREST_KEY_POS.x, 0.14, CAVERN_CREST_KEY_POS.z);
    glacialKeyBeaconRing.material = glacialIceMat;
    glacialKeyBeaconRing.parent = cavernsRoot;

    const glacialKeyNode = new TransformNode("glacialKeyNode", scene);
    glacialKeyNode.parent = cavernsRoot;
    glacialKeyNode.position.set(CAVERN_CREST_KEY_POS.x, 1.65, CAVERN_CREST_KEY_POS.z);
    {
      const gkParts: Mesh[] = [];
      const gkBow = MeshBuilder.CreateTorus(
        "glacialKeyBow",
        { diameter: 0.82, thickness: 0.18, tessellation: 20 },
        scene
      );
      gkBow.rotation.x = Math.PI / 2;
      gkBow.position.set(0, 0.48, 0);
      gkParts.push(gkBow);

      const gkShaft = MeshBuilder.CreateCylinder(
        "glacialKeyShaft",
        { diameter: 0.18, height: 1.0, tessellation: 12 },
        scene
      );
      gkShaft.position.set(0, -0.12, 0);
      gkParts.push(gkShaft);

      const gkBit1 = MeshBuilder.CreateBox(
        "glacialKeyBit1",
        { width: 0.36, height: 0.15, depth: 0.14 },
        scene
      );
      gkBit1.position.set(0.2, -0.38, 0);
      gkParts.push(gkBit1);

      const gkBit2 = MeshBuilder.CreateBox(
        "glacialKeyBit2",
        { width: 0.28, height: 0.15, depth: 0.14 },
        scene
      );
      gkBit2.position.set(0.16, -0.16, 0);
      gkParts.push(gkBit2);

      mergeGroupWithMaterial("mergedGlacialKey", gkParts, glacialIceMat, glacialKeyNode);
    }

    // =========================================================
    // MAP 5 (CITADEL): WEST ARMORY CHEST, INNER SANCTUM GATE, VICTORY CHEST & EXIT GATE
    // =========================================================
    const ctRunner = MeshBuilder.CreateBox(
      "ctRunner",
      { width: 5.2, height: 0.05, depth: 68 },
      scene
    );
    ctRunner.position.set(0, 0.025, 0);
    ctRunner.material = dgRunnerMat;
    ctRunner.parent = citadelRoot;
    ctRunner.isPickable = false;

    const ctBossArenaRing = MeshBuilder.CreateTorus(
      "ctBossArenaRing",
      { diameter: 15, thickness: 0.24, tessellation: 36 },
      scene
    );
    ctBossArenaRing.position.set(0, 0.06, 23);
    ctBossArenaRing.material = glowingCrimsonMat;
    ctBossArenaRing.parent = citadelRoot;
    ctBossArenaRing.isPickable = false;

    // West Armory Chest (`CITADEL_ARMORY_CHEST_POS = -22.0, -6.0`)
    const citadelArmoryChestRoot = new TransformNode("citadelArmoryChestRoot", scene);
    citadelArmoryChestRoot.parent = citadelRoot;
    citadelArmoryChestRoot.position.set(CITADEL_ARMORY_CHEST_POS.x, 0, CITADEL_ARMORY_CHEST_POS.z);

    const ctArmoryDais = MeshBuilder.CreateBox(
      "ctArmoryDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    ctArmoryDais.position.set(0, 0.18, 0);
    ctArmoryDais.material = dgPillarMat;
    ctArmoryDais.parent = citadelArmoryChestRoot;

    const ctArmoryBase = MeshBuilder.CreateBox(
      "ctArmoryBase",
      { width: 1.9, height: 0.95, depth: 1.3 },
      scene
    );
    ctArmoryBase.position.set(0, 0.84, 0);
    ctArmoryBase.material = darkObsidianMat;
    ctArmoryBase.parent = citadelArmoryChestRoot;

    const ctArmoryTrim = MeshBuilder.CreateBox(
      "ctArmoryTrim",
      { width: 2.0, height: 0.22, depth: 1.36 },
      scene
    );
    ctArmoryTrim.position.set(0, 1.22, 0);
    ctArmoryTrim.material = goldKeyMat;
    ctArmoryTrim.parent = citadelArmoryChestRoot;

    const citadelArmoryChestLid = MeshBuilder.CreateCylinder(
      "citadelArmoryChestLid",
      { diameter: 1.3, height: 1.92, tessellation: 16 },
      scene
    );
    citadelArmoryChestLid.rotation.z = Math.PI / 2;
    citadelArmoryChestLid.position.set(0, 1.34, 0);
    citadelArmoryChestLid.material = goldKeyMat;
    citadelArmoryChestLid.parent = citadelArmoryChestRoot;

    const citadelArmoryChestRing = MeshBuilder.CreateTorus(
      "citadelArmoryChestRing",
      { diameter: 3.0, thickness: 0.13, tessellation: 24 },
      scene
    );
    citadelArmoryChestRing.position.set(0, 0.45, 0);
    citadelArmoryChestRing.material = goldKeyMat;
    citadelArmoryChestRing.parent = citadelArmoryChestRoot;

    const citadelArmoryRelicNode = new TransformNode("citadelArmoryRelicNode", scene);
    citadelArmoryRelicNode.parent = citadelArmoryChestRoot;
    citadelArmoryRelicNode.position.set(0, 2.3, 0);
    {
      const sunBlade = MeshBuilder.CreateBox(
        "ctArmorySunBlade",
        { width: 0.18, height: 1.15, depth: 0.06 },
        scene
      );
      sunBlade.rotation.z = -0.3;
      sunBlade.material = goldKeyMat;
      sunBlade.parent = citadelArmoryRelicNode;

      const aegisShield = MeshBuilder.CreateCylinder(
        "ctArmoryAegisShield",
        { diameterTop: 0.68, diameterBottom: 0.4, height: 0.12, tessellation: 12 },
        scene
      );
      aegisShield.position.set(0.32, -0.1, 0.12);
      aegisShield.rotation.x = Math.PI / 2.2;
      aegisShield.material = bladeMat;
      aegisShield.parent = citadelArmoryRelicNode;
    }

    // Inner Sanctum Gate (`CITADEL_BOSS_GATE_POS = 0, 12.0`)
    const citadelBossGateNode = new TransformNode("citadelBossGateNode", scene);
    citadelBossGateNode.parent = citadelRoot;
    citadelBossGateNode.position.set(CITADEL_BOSS_GATE_POS.x, 0, CITADEL_BOSS_GATE_POS.z);
    {
      const h = 4.6;
      const w = 7.4;
      const parts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `ctBossGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        parts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "ctBossGateBeamTop",
        { width: w, height: 0.38, depth: 0.5 },
        scene
      );
      beamTop.position.set(0, h - 0.5, 0);
      parts.push(beamTop);

      const beamMid = MeshBuilder.CreateBox(
        "ctBossGateBeamMid",
        { width: w, height: 0.34, depth: 0.45 },
        scene
      );
      beamMid.position.set(0, h * 0.45, 0);
      parts.push(beamMid);

      mergeGroupWithMaterial("mergedCtBossGateIron", parts, ironGateMat, citadelBossGateNode);

      const lockPlate = MeshBuilder.CreateBox(
        "ctBossGateLockPlate",
        { width: 1.15, height: 1.25, depth: 0.65 },
        scene
      );
      lockPlate.position.set(0, h * 0.45, 0);
      lockPlate.material = glowingCrimsonMat;
      lockPlate.parent = citadelBossGateNode;
    }

    // North Exit Gate (`CITADEL_EXIT_GATE_POS = 0, 35.8`)
    const citadelExitGateNode = new TransformNode("citadelExitGateNode", scene);
    citadelExitGateNode.parent = citadelRoot;
    citadelExitGateNode.position.set(CITADEL_EXIT_GATE_POS.x, 0, CITADEL_EXIT_GATE_POS.z);
    {
      const h = 4.8;
      const w = 7.4;
      const parts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `ctExitGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        parts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "ctExitGateBeamTop",
        { width: w, height: 0.4, depth: 0.52 },
        scene
      );
      beamTop.position.set(0, h - 0.5, 0);
      parts.push(beamTop);

      mergeGroupWithMaterial("mergedCtExitGateIron", parts, ironGateMat, citadelExitGateNode);

      const sealEmblem = MeshBuilder.CreateTorus(
        "ctExitGateSealEmblem",
        { diameter: 1.5, thickness: 0.18, tessellation: 20 },
        scene
      );
      sealEmblem.rotation.x = Math.PI / 2;
      sealEmblem.position.set(0, h * 0.48, 0);
      sealEmblem.material = goldKeyMat;
      sealEmblem.parent = citadelExitGateNode;
    }

    // Sovereign's Victory Chest (`CITADEL_VICTORY_CHEST_POS = -6.5, 32.0`)
    const citadelVictoryChestRoot = new TransformNode("citadelVictoryChestRoot", scene);
    citadelVictoryChestRoot.parent = citadelRoot;
    citadelVictoryChestRoot.position.set(
      CITADEL_VICTORY_CHEST_POS.x,
      0,
      CITADEL_VICTORY_CHEST_POS.z
    );

    const ctVicDais = MeshBuilder.CreateBox(
      "ctVicDais",
      { width: 4.4, height: 0.45, depth: 3.4 },
      scene
    );
    ctVicDais.position.set(0, 0.225, 0);
    ctVicDais.material = dgPillarMat;
    ctVicDais.parent = citadelVictoryChestRoot;

    const ctVicBase = MeshBuilder.CreateBox(
      "ctVicBase",
      { width: 2.1, height: 1.05, depth: 1.4 },
      scene
    );
    ctVicBase.position.set(0, 0.95, 0);
    ctVicBase.material = glowingCrimsonMat;
    ctVicBase.parent = citadelVictoryChestRoot;

    const ctVicTrim = MeshBuilder.CreateBox(
      "ctVicTrim",
      { width: 2.2, height: 0.25, depth: 1.48 },
      scene
    );
    ctVicTrim.position.set(0, 1.38, 0);
    ctVicTrim.material = goldKeyMat;
    ctVicTrim.parent = citadelVictoryChestRoot;

    const citadelVictoryChestLid = MeshBuilder.CreateCylinder(
      "citadelVictoryChestLid",
      { diameter: 1.4, height: 2.12, tessellation: 18 },
      scene
    );
    citadelVictoryChestLid.rotation.z = Math.PI / 2;
    citadelVictoryChestLid.position.set(0, 1.5, 0);
    citadelVictoryChestLid.material = goldKeyMat;
    citadelVictoryChestLid.parent = citadelVictoryChestRoot;

    const citadelVictorySealRing = MeshBuilder.CreateTorus(
      "citadelVictorySealRing",
      { diameter: 3.4, thickness: 0.16, tessellation: 28 },
      scene
    );
    citadelVictorySealRing.position.set(0, 1.1, 0);
    citadelVictorySealRing.material = glowingCrimsonMat;
    citadelVictorySealRing.parent = citadelVictoryChestRoot;

    const citadelVictoryUnsealedRing = MeshBuilder.CreateTorus(
      "citadelVictoryUnsealedRing",
      { diameter: 3.6, thickness: 0.14, tessellation: 32 },
      scene
    );
    citadelVictoryUnsealedRing.position.set(0, 0.55, 0);
    citadelVictoryUnsealedRing.material = goldKeyMat;
    citadelVictoryUnsealedRing.parent = citadelVictoryChestRoot;

    const citadelVictoryCrestNode = new TransformNode("citadelVictoryCrestNode", scene);
    citadelVictoryCrestNode.parent = citadelVictoryChestRoot;
    citadelVictoryCrestNode.position.set(0, 2.75, 0);
    {
      const vParts: Mesh[] = [];
      for (let idx = 0; idx < crestOffsets.length; idx++) {
        const pos = crestOffsets[idx];
        const shard = MeshBuilder.CreatePolyhedron(
          `ctVictoryCrestShard-${idx}`,
          { type: 1, size: 0.36 },
          scene
        );
        shard.position.set(pos.x, pos.y, 0);
        vParts.push(shard);
      }
      mergeGroupWithMaterial("mergedCtVictoryCrest", vParts, goldKeyMat, citadelVictoryCrestNode);
    }

    // =========================================================
    // MAP 6 (DESERT): SW OASIS CHEST, EAST SOLAR KEY PEDESTAL & EAST CALDERA GATE
    // =========================================================
    // SW Oasis Spring Chest (`DESERT_OASIS_CHEST_POS = -23.5, -21.0`)
    const desertOasisChestRoot = new TransformNode("desertOasisChestRoot", scene);
    desertOasisChestRoot.parent = desertRoot;
    desertOasisChestRoot.position.set(DESERT_OASIS_CHEST_POS.x, 0, DESERT_OASIS_CHEST_POS.z);

    const dsOasisDais = MeshBuilder.CreateBox(
      "dsOasisDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    dsOasisDais.position.set(0, 0.18, 0);
    dsOasisDais.material = dgPillarMat;
    dsOasisDais.parent = desertOasisChestRoot;

    const dsOasisBase = MeshBuilder.CreateBox(
      "dsOasisBase",
      { width: 1.9, height: 0.95, depth: 1.3 },
      scene
    );
    dsOasisBase.position.set(0, 0.84, 0);
    dsOasisBase.material = darkObsidianMat;
    dsOasisBase.parent = desertOasisChestRoot;

    const dsOasisTrim = MeshBuilder.CreateBox(
      "dsOasisTrim",
      { width: 2.0, height: 0.22, depth: 1.36 },
      scene
    );
    dsOasisTrim.position.set(0, 1.22, 0);
    dsOasisTrim.material = goldKeyMat;
    dsOasisTrim.parent = desertOasisChestRoot;

    const desertOasisChestLid = MeshBuilder.CreateCylinder(
      "desertOasisChestLid",
      { diameter: 1.3, height: 1.92, tessellation: 16 },
      scene
    );
    desertOasisChestLid.rotation.z = Math.PI / 2;
    desertOasisChestLid.position.set(0, 1.34, 0);
    desertOasisChestLid.material = goldKeyMat;
    desertOasisChestLid.parent = desertOasisChestRoot;

    const desertOasisChestRing = MeshBuilder.CreateTorus(
      "desertOasisChestRing",
      { diameter: 3.0, thickness: 0.13, tessellation: 24 },
      scene
    );
    desertOasisChestRing.position.set(0, 0.45, 0);
    desertOasisChestRing.material = glacialIceMat;
    desertOasisChestRing.parent = desertOasisChestRoot;

    const desertOasisRelicNode = new TransformNode("desertOasisRelicNode", scene);
    desertOasisRelicNode.parent = desertOasisChestRoot;
    desertOasisRelicNode.position.set(0, 2.3, 0);
    {
      const vesselBody = MeshBuilder.CreateCylinder(
        "dsOasisVesselBody",
        { diameterTop: 0.36, diameterBottom: 0.56, height: 0.72, tessellation: 14 },
        scene
      );
      vesselBody.material = glacialIceMat;
      vesselBody.parent = desertOasisRelicNode;

      const vesselHalo = MeshBuilder.CreateTorus(
        "dsOasisVesselHalo",
        { diameter: 0.9, thickness: 0.1, tessellation: 20 },
        scene
      );
      vesselHalo.rotation.x = Math.PI / 2;
      vesselHalo.material = goldKeyMat;
      vesselHalo.parent = desertOasisRelicNode;
    }

    // East Sun-Pyramid Pedestal & Floating Solar Crest Key (`DESERT_SOLAR_KEY_POS = 22.0, 10.5`)
    const dsKeyPedestal = MeshBuilder.CreateCylinder(
      "dsKeyPedestal",
      { diameterTop: 2.2, diameterBottom: 2.7, height: 0.72, tessellation: 16 },
      scene
    );
    dsKeyPedestal.position.set(DESERT_SOLAR_KEY_POS.x, 0.36, DESERT_SOLAR_KEY_POS.z);
    dsKeyPedestal.material = dgPillarMat;
    dsKeyPedestal.parent = desertRoot;

    const solarKeyBeaconRing = MeshBuilder.CreateTorus(
      "solarKeyBeaconRing",
      { diameter: 2.7, thickness: 0.12, tessellation: 28 },
      scene
    );
    solarKeyBeaconRing.position.set(DESERT_SOLAR_KEY_POS.x, 0.14, DESERT_SOLAR_KEY_POS.z);
    solarKeyBeaconRing.material = goldKeyMat;
    solarKeyBeaconRing.parent = desertRoot;

    const solarKeyNode = new TransformNode("solarKeyNode", scene);
    solarKeyNode.parent = desertRoot;
    solarKeyNode.position.set(DESERT_SOLAR_KEY_POS.x, 1.65, DESERT_SOLAR_KEY_POS.z);
    {
      const skParts: Mesh[] = [];
      const skBow = MeshBuilder.CreateTorus(
        "solarKeyBow",
        { diameter: 0.86, thickness: 0.18, tessellation: 20 },
        scene
      );
      skBow.rotation.x = Math.PI / 2;
      skBow.position.set(0, 0.48, 0);
      skParts.push(skBow);

      const skShaft = MeshBuilder.CreateCylinder(
        "solarKeyShaft",
        { diameter: 0.18, height: 1.0, tessellation: 12 },
        scene
      );
      skShaft.position.set(0, -0.12, 0);
      skParts.push(skShaft);

      const skBit1 = MeshBuilder.CreateBox(
        "solarKeyBit1",
        { width: 0.38, height: 0.15, depth: 0.14 },
        scene
      );
      skBit1.position.set(0.2, -0.38, 0);
      skParts.push(skBit1);

      const skBit2 = MeshBuilder.CreateBox(
        "solarKeyBit2",
        { width: 0.3, height: 0.15, depth: 0.14 },
        scene
      );
      skBit2.position.set(0.16, -0.16, 0);
      skParts.push(skBit2);

      mergeGroupWithMaterial("mergedSolarKey", skParts, goldKeyMat, solarKeyNode);
    }

    // East Caldera Gate (`DESERT_CALDERA_GATE_POS = 31.8, 0`)
    const dsCalderaGateNode = new TransformNode("dsCalderaGateNode", scene);
    dsCalderaGateNode.parent = desertRoot;
    dsCalderaGateNode.position.set(DESERT_CALDERA_GATE_POS.x, 0, DESERT_CALDERA_GATE_POS.z);
    dsCalderaGateNode.rotation.y = Math.PI / 2;
    {
      const h = 4.6;
      const w = 6.8;
      const parts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.0 + (b / (barCount - 1)) * 6.0;
        const bar = MeshBuilder.CreateCylinder(
          `dsCalderaGateBar-${b}`,
          { diameter: 0.24, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        parts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "dsCalderaGateBeamTop",
        { width: w, height: 0.38, depth: 0.48 },
        scene
      );
      beamTop.position.set(0, h - 0.5, 0);
      parts.push(beamTop);

      mergeGroupWithMaterial("mergedDsCalderaGateIron", parts, ironGateMat, dsCalderaGateNode);

      const lockPlate = MeshBuilder.CreateBox(
        "dsCalderaGateLockPlate",
        { width: 1.1, height: 1.2, depth: 0.62 },
        scene
      );
      lockPlate.position.set(0, h * 0.45, 0);
      lockPlate.material = goldKeyMat;
      lockPlate.parent = dsCalderaGateNode;
    }

    // =========================================================
    // MAP 7 (CALDERA): NW FORGE CHEST, INNER SANCTUM GATE, VICTORY CHEST & EXIT GATE
    // =========================================================
    const caRunner = MeshBuilder.CreateBox(
      "caRunner",
      { width: 5.4, height: 0.05, depth: 68 },
      scene
    );
    caRunner.position.set(0, 0.025, 0);
    caRunner.material = glowingCrimsonMat;
    caRunner.parent = calderaRoot;
    caRunner.isPickable = false;

    const caBossArenaRing = MeshBuilder.CreateTorus(
      "caBossArenaRing",
      { diameter: 16, thickness: 0.26, tessellation: 36 },
      scene
    );
    caBossArenaRing.position.set(0, 0.06, 23);
    caBossArenaRing.material = goldKeyMat;
    caBossArenaRing.parent = calderaRoot;
    caBossArenaRing.isPickable = false;

    // NW Dragon Forge Chest (`CALDERA_FORGE_CHEST_POS = -22.5, 20.0`)
    const calderaForgeChestRoot = new TransformNode("calderaForgeChestRoot", scene);
    calderaForgeChestRoot.parent = calderaRoot;
    calderaForgeChestRoot.position.set(CALDERA_FORGE_CHEST_POS.x, 0, CALDERA_FORGE_CHEST_POS.z);

    const caForgeDais = MeshBuilder.CreateBox(
      "caForgeDais",
      { width: 3.6, height: 0.36, depth: 2.8 },
      scene
    );
    caForgeDais.position.set(0, 0.18, 0);
    caForgeDais.material = dgPillarMat;
    caForgeDais.parent = calderaForgeChestRoot;

    const caForgeBase = MeshBuilder.CreateBox(
      "caForgeBase",
      { width: 1.9, height: 0.95, depth: 1.3 },
      scene
    );
    caForgeBase.position.set(0, 0.84, 0);
    caForgeBase.material = glowingCrimsonMat;
    caForgeBase.parent = calderaForgeChestRoot;

    const caForgeTrim = MeshBuilder.CreateBox(
      "caForgeTrim",
      { width: 2.0, height: 0.22, depth: 1.36 },
      scene
    );
    caForgeTrim.position.set(0, 1.22, 0);
    caForgeTrim.material = goldKeyMat;
    caForgeTrim.parent = calderaForgeChestRoot;

    const calderaForgeChestLid = MeshBuilder.CreateCylinder(
      "calderaForgeChestLid",
      { diameter: 1.3, height: 1.92, tessellation: 16 },
      scene
    );
    calderaForgeChestLid.rotation.z = Math.PI / 2;
    calderaForgeChestLid.position.set(0, 1.34, 0);
    calderaForgeChestLid.material = goldKeyMat;
    calderaForgeChestLid.parent = calderaForgeChestRoot;

    const calderaForgeChestRing = MeshBuilder.CreateTorus(
      "calderaForgeChestRing",
      { diameter: 3.0, thickness: 0.13, tessellation: 24 },
      scene
    );
    calderaForgeChestRing.position.set(0, 0.45, 0);
    calderaForgeChestRing.material = goldKeyMat;
    calderaForgeChestRing.parent = calderaForgeChestRoot;

    const calderaForgeRelicNode = new TransformNode("calderaForgeRelicNode", scene);
    calderaForgeRelicNode.parent = calderaForgeChestRoot;
    calderaForgeRelicNode.position.set(0, 2.3, 0);
    {
      const dragonPlate = MeshBuilder.CreateBox(
        "caForgeDragonPlate",
        { width: 0.72, height: 0.86, depth: 0.28 },
        scene
      );
      dragonPlate.material = glowingCrimsonMat;
      dragonPlate.parent = calderaForgeRelicNode;

      const dragonTrim = MeshBuilder.CreateTorus(
        "caForgeDragonTrim",
        { diameter: 1.05, thickness: 0.1, tessellation: 20 },
        scene
      );
      dragonTrim.rotation.x = Math.PI / 2;
      dragonTrim.material = goldKeyMat;
      dragonTrim.parent = calderaForgeRelicNode;
    }

    // Inner Sanctum Gate (`CALDERA_BOSS_GATE_POS = 0, 12.0`)
    const calderaBossGateNode = new TransformNode("calderaBossGateNode", scene);
    calderaBossGateNode.parent = calderaRoot;
    calderaBossGateNode.position.set(CALDERA_BOSS_GATE_POS.x, 0, CALDERA_BOSS_GATE_POS.z);
    {
      const h = 4.6;
      const w = 7.4;
      const parts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `caBossGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        parts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "caBossGateBeamTop",
        { width: w, height: 0.38, depth: 0.5 },
        scene
      );
      beamTop.position.set(0, h - 0.5, 0);
      parts.push(beamTop);

      const beamMid = MeshBuilder.CreateBox(
        "caBossGateBeamMid",
        { width: w, height: 0.34, depth: 0.45 },
        scene
      );
      beamMid.position.set(0, h * 0.45, 0);
      parts.push(beamMid);

      mergeGroupWithMaterial("mergedCaBossGateIron", parts, ironGateMat, calderaBossGateNode);

      const lockPlate = MeshBuilder.CreateBox(
        "caBossGateLockPlate",
        { width: 1.15, height: 1.25, depth: 0.65 },
        scene
      );
      lockPlate.position.set(0, h * 0.45, 0);
      lockPlate.material = goldKeyMat;
      lockPlate.parent = calderaBossGateNode;
    }

    // North Exit Gate (`CALDERA_EXIT_GATE_POS = 0, 36.2`)
    const calderaExitGateNode = new TransformNode("calderaExitGateNode", scene);
    calderaExitGateNode.parent = calderaRoot;
    calderaExitGateNode.position.set(CALDERA_EXIT_GATE_POS.x, 0, CALDERA_EXIT_GATE_POS.z);
    {
      const h = 4.8;
      const w = 7.4;
      const parts: Mesh[] = [];
      const barCount = 9;
      for (let b = 0; b < barCount; b++) {
        const bx = -3.2 + (b / (barCount - 1)) * 6.4;
        const bar = MeshBuilder.CreateCylinder(
          `caExitGateBar-${b}`,
          { diameter: 0.26, height: h, tessellation: 12 },
          scene
        );
        bar.position.set(bx, h / 2, 0);
        parts.push(bar);
      }
      const beamTop = MeshBuilder.CreateBox(
        "caExitGateBeamTop",
        { width: w, height: 0.4, depth: 0.52 },
        scene
      );
      beamTop.position.set(0, h - 0.5, 0);
      parts.push(beamTop);

      mergeGroupWithMaterial("mergedCaExitGateIron", parts, ironGateMat, calderaExitGateNode);

      const sealEmblem = MeshBuilder.CreateTorus(
        "caExitGateSealEmblem",
        { diameter: 1.5, thickness: 0.18, tessellation: 20 },
        scene
      );
      sealEmblem.rotation.x = Math.PI / 2;
      sealEmblem.position.set(0, h * 0.48, 0);
      sealEmblem.material = goldKeyMat;
      sealEmblem.parent = calderaExitGateNode;
    }

    // Dragon Peak Victory Chest (`CALDERA_VICTORY_CHEST_POS = -6.5, 32.0`)
    const calderaVictoryChestRoot = new TransformNode("calderaVictoryChestRoot", scene);
    calderaVictoryChestRoot.parent = calderaRoot;
    calderaVictoryChestRoot.position.set(
      CALDERA_VICTORY_CHEST_POS.x,
      0,
      CALDERA_VICTORY_CHEST_POS.z
    );

    const caVicDais = MeshBuilder.CreateBox(
      "caVicDais",
      { width: 4.4, height: 0.45, depth: 3.4 },
      scene
    );
    caVicDais.position.set(0, 0.225, 0);
    caVicDais.material = dgPillarMat;
    caVicDais.parent = calderaVictoryChestRoot;

    const caVicBase = MeshBuilder.CreateBox(
      "caVicBase",
      { width: 2.1, height: 1.05, depth: 1.4 },
      scene
    );
    caVicBase.position.set(0, 0.95, 0);
    caVicBase.material = glowingCrimsonMat;
    caVicBase.parent = calderaVictoryChestRoot;

    const caVicTrim = MeshBuilder.CreateBox(
      "caVicTrim",
      { width: 2.2, height: 0.25, depth: 1.48 },
      scene
    );
    caVicTrim.position.set(0, 1.38, 0);
    caVicTrim.material = goldKeyMat;
    caVicTrim.parent = calderaVictoryChestRoot;

    const calderaVictoryChestLid = MeshBuilder.CreateCylinder(
      "calderaVictoryChestLid",
      { diameter: 1.4, height: 2.12, tessellation: 18 },
      scene
    );
    calderaVictoryChestLid.rotation.z = Math.PI / 2;
    calderaVictoryChestLid.position.set(0, 1.5, 0);
    calderaVictoryChestLid.material = goldKeyMat;
    calderaVictoryChestLid.parent = calderaVictoryChestRoot;

    const calderaVictorySealRing = MeshBuilder.CreateTorus(
      "calderaVictorySealRing",
      { diameter: 3.4, thickness: 0.16, tessellation: 28 },
      scene
    );
    calderaVictorySealRing.position.set(0, 1.1, 0);
    calderaVictorySealRing.material = glowingCrimsonMat;
    calderaVictorySealRing.parent = calderaVictoryChestRoot;

    const calderaVictoryUnsealedRing = MeshBuilder.CreateTorus(
      "calderaVictoryUnsealedRing",
      { diameter: 3.6, thickness: 0.14, tessellation: 32 },
      scene
    );
    calderaVictoryUnsealedRing.position.set(0, 0.55, 0);
    calderaVictoryUnsealedRing.material = goldKeyMat;
    calderaVictoryUnsealedRing.parent = calderaVictoryChestRoot;

    const calderaVictoryCrestNode = new TransformNode("calderaVictoryCrestNode", scene);
    calderaVictoryCrestNode.parent = calderaVictoryChestRoot;
    calderaVictoryCrestNode.position.set(0, 2.75, 0);
    {
      const vParts: Mesh[] = [];
      for (let idx = 0; idx < crestOffsets.length; idx++) {
        const pos = crestOffsets[idx];
        const shard = MeshBuilder.CreatePolyhedron(
          `caVictoryCrestShard-${idx}`,
          { type: 1, size: 0.36 },
          scene
        );
        shard.position.set(pos.x, pos.y, 0);
        vParts.push(shard);
      }
      mergeGroupWithMaterial("mergedCaVictoryCrest", vParts, goldKeyMat, calderaVictoryCrestNode);
    }

    // =========================================================
    // MAPS 8, 9 & 10 (ATOLL, HOLLOW & SKY-ISLES): 6 BIOME RELIQUARY & VICTORY CHESTS
    // =========================================================
    const coralPinkMat = makeMat(
      "coralPinkMat",
      new Color3(0.95, 0.38, 0.56),
      new Color3(0.28, 0.08, 0.16),
      new Color3(0.9, 0.7, 0.8),
      1.0,
      48
    );
    const coralTealMat = makeMat(
      "coralTealMat",
      new Color3(0.18, 0.88, 0.82),
      new Color3(0.08, 0.42, 0.42),
      new Color3(0.85, 1.0, 0.98),
      1.0,
      64
    );
    const fungalStemMat = makeMat(
      "fungalStemMat",
      new Color3(0.76, 0.82, 0.94),
      new Color3(0.12, 0.18, 0.32),
      new Color3(0.4, 0.45, 0.55)
    );
    const fungalCapMat = makeMat(
      "fungalCapMat",
      new Color3(0.38, 0.22, 0.88),
      new Color3(0.22, 0.12, 0.58),
      new Color3(0.85, 0.75, 1.0),
      1.0,
      64
    );
    const celestialMarbleMat = makeMat(
      "celestialMarbleMat",
      new Color3(0.94, 0.96, 1.0),
      new Color3(0.18, 0.22, 0.34),
      new Color3(1.0, 1.0, 1.0),
      1.0,
      84
    );

    const buildBiomeChestRig = (
      id: string,
      parent: TransformNode,
      pos: { x: number; z: number },
      bodyMat: StandardMaterial,
      ringMat: StandardMaterial
    ) => {
      const root = new TransformNode(`biomeChestRoot-${id}`, scene);
      root.parent = parent;
      root.position.set(pos.x, 0, pos.z);

      const dais = MeshBuilder.CreateBox(
        `bcDais-${id}`,
        { width: 3.6, height: 0.36, depth: 2.8 },
        scene
      );
      dais.position.set(0, 0.18, 0);
      dais.material = dgPillarMat;
      dais.parent = root;

      const base = MeshBuilder.CreateBox(
        `bcBase-${id}`,
        { width: 1.9, height: 0.95, depth: 1.3 },
        scene
      );
      base.position.set(0, 0.84, 0);
      base.material = bodyMat;
      base.parent = root;

      const trim = MeshBuilder.CreateBox(
        `bcTrim-${id}`,
        { width: 2.0, height: 0.22, depth: 1.36 },
        scene
      );
      trim.position.set(0, 1.22, 0);
      trim.material = goldKeyMat;
      trim.parent = root;

      const lid = MeshBuilder.CreateCylinder(
        `bcLid-${id}`,
        { diameter: 1.3, height: 1.92, tessellation: 16 },
        scene
      );
      lid.rotation.z = Math.PI / 2;
      lid.position.set(0, 1.34, 0);
      lid.material = goldKeyMat;
      lid.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `bcRing-${id}`,
        { diameter: 3.1, thickness: 0.14, tessellation: 26 },
        scene
      );
      ring.position.set(0, 0.45, 0);
      ring.material = ringMat;
      ring.parent = root;

      const relic = MeshBuilder.CreatePolyhedron(
        `bcRelic-${id}`,
        { type: 1, size: 0.42 },
        scene
      );
      relic.position.set(0, 2.3, 0);
      relic.material = goldKeyMat;
      relic.parent = root;

      return { root, lid, ring, relic };
    };

    const atollPearlChestRig = buildBiomeChestRig(
      "atollPearl",
      atollRoot,
      ATOLL_PEARL_CHEST_POS,
      coralTealMat,
      coralPinkMat
    );
    const atollVictoryChestRig = buildBiomeChestRig(
      "atollVictory",
      atollRoot,
      ATOLL_VICTORY_CHEST_POS,
      coralPinkMat,
      goldKeyMat
    );
    const hollowSporeChestRig = buildBiomeChestRig(
      "hollowSpore",
      hollowRoot,
      HOLLOW_SPORE_CHEST_POS,
      fungalCapMat,
      coralTealMat
    );
    const hollowVictoryChestRig = buildBiomeChestRig(
      "hollowVictory",
      hollowRoot,
      HOLLOW_VICTORY_CHEST_POS,
      fungalCapMat,
      goldKeyMat
    );
    const skyCelestialChestRig = buildBiomeChestRig(
      "skyCelestial",
      skyRoot,
      SKY_CELESTIAL_CHEST_POS,
      celestialMarbleMat,
      goldKeyMat
    );
    const skyVictoryChestRig = buildBiomeChestRig(
      "skyVictory",
      skyRoot,
      SKY_VICTORY_CHEST_POS,
      celestialMarbleMat,
      glowingCrimsonMat
    );

    // =========================================================
    // INDIVIDUAL PICKABLE 3D PROP PREFAB BUILDER (FOR MAP EDITOR!)
    // =========================================================
    const propRigs = new Map<string, PropVisualRig>();
    const portalRigs = new Map<string, PortalVisualRig>();

    const dirtSoilMat = makeMat(
      "dirtSoilMat",
      new Color3(0.46, 0.31, 0.17),
      new Color3(0.06, 0.03, 0.01),
      new Color3(0.08, 0.06, 0.04)
    );
    const dirtPitMat = makeMat(
      "dirtPitMat",
      new Color3(0.24, 0.16, 0.09),
      new Color3(0.02, 0.01, 0.01),
      new Color3(0.05, 0.04, 0.03)
    );
    const clayPotMat = makeMat(
      "clayPotMat",
      new Color3(0.84, 0.44, 0.24),
      new Color3(0.11, 0.04, 0.02),
      new Color3(0.32, 0.18, 0.1)
    );
    const clayRimMat = makeMat(
      "clayRimMat",
      new Color3(0.54, 0.24, 0.13),
      new Color3(0.06, 0.02, 0.01),
      new Color3(0.2, 0.12, 0.08)
    );
    const lightRockMat = makeMat(
      "lightRockMat",
      new Color3(0.68, 0.67, 0.63),
      new Color3(0.08, 0.08, 0.07),
      new Color3(0.25, 0.25, 0.24)
    );
    const pushBlockMat = makeMat(
      "pushBlockMat",
      new Color3(0.44, 0.51, 0.63),
      new Color3(0.06, 0.08, 0.12),
      new Color3(0.3, 0.34, 0.4)
    );
    const crackedRockMat = makeMat(
      "crackedRockMat",
      new Color3(0.32, 0.28, 0.25),
      new Color3(0.05, 0.04, 0.03),
      new Color3(0.18, 0.16, 0.14)
    );
    const crackedFissureMat = makeMat(
      "crackedFissureMat",
      new Color3(1.0, 0.52, 0.14),
      new Color3(0.92, 0.38, 0.08)
    );
    const crystalBarrierMat = makeMat(
      "crystalBarrierMat",
      new Color3(0.22, 0.78, 1.0),
      new Color3(0.12, 0.48, 0.85),
      new Color3(0.9, 0.96, 1.0),
      0.86,
      72
    );
    const briarVineMat = makeMat(
      "briarVineMat",
      new Color3(0.42, 0.27, 0.14),
      new Color3(0.06, 0.03, 0.01),
      new Color3(0.14, 0.1, 0.06)
    );
    const briarThornMat = makeMat(
      "briarThornMat",
      new Color3(0.76, 0.32, 0.16),
      new Color3(0.22, 0.06, 0.02)
    );
    const spiderwebSilkMat = makeMat(
      "spiderwebSilkMat",
      new Color3(0.92, 0.96, 1.0),
      new Color3(0.32, 0.38, 0.48),
      new Color3(1.0, 1.0, 1.0),
      0.88,
      72
    );
    const timedRingMat = makeMat(
      "timedRingMat",
      new Color3(0.32, 0.92, 1.0),
      new Color3(0.2, 0.74, 0.98)
    );
    const iceArmorMat = makeMat(
      "iceArmorMat",
      new Color3(0.54, 0.92, 1.0),
      new Color3(0.24, 0.65, 0.92),
      new Color3(1.0, 1.0, 1.0),
      0.62,
      92
    );
    const shockSpikeMat = makeMat(
      "shockSpikeMat",
      new Color3(0.32, 0.95, 1.0),
      new Color3(0.25, 0.85, 1.0),
      new Color3(1.0, 1.0, 1.0),
      0.88,
      96
    );

    const buildPropRig = (
      prop: MapPropInstance,
      customModels: CustomModelAsset[]
    ): PropVisualRig => {
      const root = new TransformNode(`propRoot-${prop.id}`, scene);
      const meta = { editorKind: "prop" as const, editorId: prop.id };

      let bushFoliage: Mesh | TransformNode | undefined;
      let bushStump: TransformNode | undefined;
      let torchFlame: Mesh | undefined;
      let timedTorchRing: Mesh | undefined;
      let dirtMound: TransformNode | undefined;
      let dirtHole: TransformNode | undefined;
      let crystalOrbMat: StandardMaterial | undefined;
      let crystalOrbMesh: Mesh | undefined;
      let crystalHaloRing: Mesh | undefined;
      let crystalBarrierBody: TransformNode | undefined;
      let pushTargetSocket: Mesh | undefined;
      let eyeIrisMat: StandardMaterial | undefined;
      let eyeArrowMesh: Mesh | undefined;

      if (prop.prefab === "pine_tree") {
        const trunk = MeshBuilder.CreateCylinder(
          `trunk-${prop.id}`,
          { diameterTop: 0.5, diameterBottom: 0.72, height: 1.6, tessellation: 10 },
          scene
        );
        trunk.position.set(0, 0.8, 0);
        trunk.material = woodMat;
        trunk.parent = root;

        const foliageParts: Mesh[] = [];
        const c1 = MeshBuilder.CreateCylinder(
          `c1-${prop.id}`,
          { diameterTop: 0.25, diameterBottom: 2.55, height: 2.3, tessellation: 12 },
          scene
        );
        c1.position.set(0, 2.25, 0);
        foliageParts.push(c1);

        const c2 = MeshBuilder.CreateCylinder(
          `c2-${prop.id}`,
          { diameterTop: 0.12, diameterBottom: 1.95, height: 1.95, tessellation: 12 },
          scene
        );
        c2.position.set(0, 3.55, 0);
        foliageParts.push(c2);

        const c3 = MeshBuilder.CreateCylinder(
          `c3-${prop.id}`,
          { diameterTop: 0.04, diameterBottom: 1.25, height: 1.35, tessellation: 12 },
          scene
        );
        c3.position.set(0, 4.55, 0);
        foliageParts.push(c3);

        mergeGroupWithMaterial(`treeFoliage-${prop.id}`, foliageParts, foliageMat, root, meta);
      } else if (prop.prefab === "bush") {
        const bushParts: Mesh[] = [];
        const bCenter = MeshBuilder.CreateSphere(
          `bushC-${prop.id}`,
          { diameter: 1.35, segments: 10 },
          scene
        );
        bCenter.scaling.set(1.1, 0.8, 1.1);
        bCenter.position.set(0, 0.48, 0);
        bushParts.push(bCenter);

        for (const off of [
          { x: -0.45, z: 0.2, s: 0.85 },
          { x: 0.45, z: 0.15, s: 0.9 },
          { x: 0, z: -0.42, s: 0.88 },
        ]) {
          const lobe = MeshBuilder.CreateSphere(
            `bushLobe-${prop.id}-${off.x}`,
            { diameter: 1.05 * off.s, segments: 10 },
            scene
          );
          lobe.position.set(off.x, 0.38, off.z);
          bushParts.push(lobe);
        }
        bushFoliage =
          mergeGroupWithMaterial(`bushMerged-${prop.id}`, bushParts, bushMat, root, meta) ??
          undefined;

        // Low cut-grass ring & woody stem stump shown after the bush is chopped down
        const stumpNode = new TransformNode(`bushStump-${prop.id}`, scene);
        stumpNode.parent = root;

        const grassRing = MeshBuilder.CreateCylinder(
          `bushCutRing-${prop.id}`,
          { diameterTop: 1.05, diameterBottom: 1.2, height: 0.06, tessellation: 12 },
          scene
        );
        grassRing.position.set(0, 0.03, 0);
        grassRing.material = foliageMat;
        grassRing.parent = stumpNode;

        const woodyStem = MeshBuilder.CreateCylinder(
          `bushCutStem-${prop.id}`,
          { diameterTop: 0.28, diameterBottom: 0.38, height: 0.14, tessellation: 8 },
          scene
        );
        woodyStem.position.set(0, 0.07, 0);
        woodyStem.material = woodMat;
        woodyStem.parent = stumpNode;

        stumpNode.setEnabled(false);
        bushStump = stumpNode;
      } else if (prop.prefab === "flower_patch") {
        const stemParts: Mesh[] = [];
        const petalParts: Mesh[] = [];
        const offsets = [
          { x: 0, z: 0 },
          { x: -0.42, z: 0.28 },
          { x: 0.42, z: -0.25 },
          { x: -0.28, z: -0.38 },
          { x: 0.35, z: 0.38 },
        ];
        offsets.forEach((o, idx) => {
          const pad = MeshBuilder.CreateCylinder(
            `flPad-${prop.id}-${idx}`,
            { diameter: 0.38, height: 0.08, tessellation: 8 },
            scene
          );
          pad.position.set(o.x, 0.04, o.z);
          stemParts.push(pad);

          const blossom = MeshBuilder.CreateSphere(
            `flBlossom-${prop.id}-${idx}`,
            { diameter: 0.26, segments: 8 },
            scene
          );
          blossom.position.set(o.x, 0.16, o.z);
          petalParts.push(blossom);
        });
        mergeGroupWithMaterial(`flStems-${prop.id}`, stemParts, bushMat, root, meta);
        mergeGroupWithMaterial(`flPetals-${prop.id}`, petalParts, goldKeyMat, root, meta);
      } else if (prop.prefab === "boulder") {
        const rocks: Mesh[] = [];
        const mainRock = MeshBuilder.CreatePolyhedron(
          `boulderMain-${prop.id}`,
          { type: 2, size: 1.05 },
          scene
        );
        mainRock.scaling.set(1.25, 0.9, 1.15);
        mainRock.position.set(0, 0.72, 0);
        rocks.push(mainRock);

        const sideRock = MeshBuilder.CreatePolyhedron(
          `boulderSide-${prop.id}`,
          { type: 1, size: 0.65 },
          scene
        );
        sideRock.position.set(0.68, 0.42, 0.35);
        rocks.push(sideRock);
        mergeGroupWithMaterial(`boulderMerged-${prop.id}`, rocks, ruinMat, root, meta);
      } else if (prop.prefab === "ruin_pillar" || prop.prefab === "dungeon_pillar") {
        const mat = prop.prefab === "dungeon_pillar" ? dgPillarMat : ruinMat;
        const h = prop.prefab === "dungeon_pillar" ? 4.8 : 4.0;
        const w = 2.0;
        const parts: Mesh[] = [];
        const basePed = MeshBuilder.CreateCylinder(
          `pilBase-${prop.id}`,
          { diameterTop: w * 1.08, diameterBottom: w * 1.18, height: 0.55, tessellation: 14 },
          scene
        );
        basePed.position.set(0, 0.275, 0);
        parts.push(basePed);

        const col = MeshBuilder.CreateCylinder(
          `pilCol-${prop.id}`,
          { diameterTop: w * 0.86, diameterBottom: w * 0.96, height: h, tessellation: 16 },
          scene
        );
        col.position.set(0, h / 2, 0);
        parts.push(col);

        const cap = MeshBuilder.CreateCylinder(
          `pilCap-${prop.id}`,
          { diameterTop: w * 1.18, diameterBottom: w * 0.92, height: 0.5, tessellation: 14 },
          scene
        );
        cap.position.set(0, h - 0.25, 0);
        parts.push(cap);
        mergeGroupWithMaterial(`pillarMerged-${prop.id}`, parts, mat, root, meta);
      } else if (prop.prefab === "coral_pillar") {
        const coralBranches: Mesh[] = [];
        const mainReef = MeshBuilder.CreateCylinder(
          `coralCol-${prop.id}`,
          { diameterTop: 1.1, diameterBottom: 1.85, height: 3.8, tessellation: 12 },
          scene
        );
        mainReef.position.set(0, 1.9, 0);
        coralBranches.push(mainReef);

        const armL = MeshBuilder.CreateCylinder(
          `coralArmL-${prop.id}`,
          { diameterTop: 0.45, diameterBottom: 0.72, height: 2.1, tessellation: 10 },
          scene
        );
        armL.position.set(-0.72, 2.35, 0);
        armL.rotation.z = 0.52;
        coralBranches.push(armL);

        const armR = MeshBuilder.CreateCylinder(
          `coralArmR-${prop.id}`,
          { diameterTop: 0.42, diameterBottom: 0.68, height: 1.85, tessellation: 10 },
          scene
        );
        armR.position.set(0.68, 2.05, 0.25);
        armR.rotation.z = -0.48;
        coralBranches.push(armR);

        mergeGroupWithMaterial(`coralMerged-${prop.id}`, coralBranches, coralPinkMat, root, meta);

        const pearlCrown = MeshBuilder.CreateSphere(
          `coralPearl-${prop.id}`,
          { diameter: 0.95, segments: 12 },
          scene
        );
        pearlCrown.position.set(0, 3.95, 0);
        pearlCrown.material = coralTealMat;
        pearlCrown.metadata = meta;
        pearlCrown.parent = root;
      } else if (prop.prefab === "giant_mushroom") {
        const stalk = MeshBuilder.CreateCylinder(
          `shroomStalk-${prop.id}`,
          { diameterTop: 0.75, diameterBottom: 1.25, height: 3.2, tessellation: 12 },
          scene
        );
        stalk.position.set(0, 1.6, 0);
        stalk.material = fungalStemMat;
        stalk.metadata = meta;
        stalk.parent = root;

        const cap = MeshBuilder.CreateSphere(
          `shroomCap-${prop.id}`,
          { diameter: 3.1, segments: 14 },
          scene
        );
        cap.scaling.set(1.05, 0.48, 1.05);
        cap.position.set(0, 3.25, 0);
        cap.material = fungalCapMat;
        cap.metadata = meta;
        cap.parent = root;

        const gillRing = MeshBuilder.CreateTorus(
          `shroomRing-${prop.id}`,
          { diameter: 2.35, thickness: 0.16, tessellation: 20 },
          scene
        );
        gillRing.position.set(0, 2.95, 0);
        gillRing.material = coralTealMat;
        gillRing.metadata = meta;
        gillRing.parent = root;
      } else if (prop.prefab === "cloud_pillar") {
        const marbleParts: Mesh[] = [];
        const base = MeshBuilder.CreateCylinder(
          `cloudBase-${prop.id}`,
          { diameterTop: 2.1, diameterBottom: 2.35, height: 0.6, tessellation: 16 },
          scene
        );
        base.position.set(0, 0.3, 0);
        marbleParts.push(base);

        const shaft = MeshBuilder.CreateCylinder(
          `cloudShaft-${prop.id}`,
          { diameterTop: 1.55, diameterBottom: 1.72, height: 4.5, tessellation: 16 },
          scene
        );
        shaft.position.set(0, 2.4, 0);
        marbleParts.push(shaft);

        const cap = MeshBuilder.CreateCylinder(
          `cloudCap-${prop.id}`,
          { diameterTop: 2.35, diameterBottom: 1.68, height: 0.55, tessellation: 16 },
          scene
        );
        cap.position.set(0, 4.55, 0);
        marbleParts.push(cap);

        mergeGroupWithMaterial(`cloudMerged-${prop.id}`, marbleParts, celestialMarbleMat, root, meta);

        const halo = MeshBuilder.CreateTorus(
          `cloudHalo-${prop.id}`,
          { diameter: 2.3, thickness: 0.14, tessellation: 24 },
          scene
        );
        halo.position.set(0, 4.95, 0);
        halo.material = goldKeyMat;
        halo.metadata = meta;
        halo.parent = root;
      } else if (prop.prefab === "wall_torch") {
        const stand = MeshBuilder.CreateCylinder(
          `torchStand-${prop.id}`,
          { diameterTop: 0.72, diameterBottom: 0.92, height: 1.48, tessellation: 12 },
          scene
        );
        stand.position.set(0, 0.74, 0);
        stand.material = dgPillarMat;
        stand.parent = root;

        const bowl = MeshBuilder.CreateCylinder(
          `torchBowl-${prop.id}`,
          { diameterTop: 1.05, diameterBottom: 0.65, height: 0.28, tessellation: 12 },
          scene
        );
        bowl.position.set(0, 1.44, 0);
        bowl.material = ironGateMat;
        bowl.parent = root;

        // Puzzle pedestal ring indicator if this torch is part of a Torch Combination Puzzle!
        if (prop.puzzleTarget === "lit" || prop.puzzleTarget === "unlit") {
          const hintMat =
            prop.puzzleTarget === "lit" ? goldKeyMat : darkObsidianMat;
          const hintRing = MeshBuilder.CreateTorus(
            `torchHintRing-${prop.id}`,
            { diameter: 1.48, thickness: 0.12, tessellation: 20 },
            scene
          );
          hintRing.position.set(0, 0.08, 0);
          hintRing.material = hintMat;
          hintRing.parent = root;
        }

        // Timed Torch 8-Second Countdown Ring around the pedestal base
        const tRing = MeshBuilder.CreateTorus(
          `timedRing-${prop.id}`,
          { diameter: 1.72, thickness: 0.11, tessellation: 24 },
          scene
        );
        tRing.position.set(0, 0.11, 0);
        tRing.material = timedRingMat;
        tRing.parent = root;
        tRing.setEnabled((prop.timedDuration ?? 0) > 0);
        timedTorchRing = tRing;

        const flame = MeshBuilder.CreateSphere(
          `torchFlame-${prop.id}`,
          { diameter: 0.74, segments: 12 },
          scene
        );
        flame.scaling.set(0.88, 1.52, 0.88);
        flame.position.set(0, 1.78, 0);
        flame.material = goldKeyMat;
        flame.parent = root;
        torchFlame = flame;
      } else if (prop.prefab === "dirt_patch") {
        // Soft Dirt Patch that can be dug up with the Shovel (G / 4)!
        const moundNode = new TransformNode(`dirtMound-${prop.id}`, scene);
        moundNode.parent = root;

        const moundParts: Mesh[] = [];
        const baseDisc = MeshBuilder.CreateCylinder(
          `dirtBase-${prop.id}`,
          { diameterTop: 1.45, diameterBottom: 1.68, height: 0.14, tessellation: 14 },
          scene
        );
        baseDisc.position.set(0, 0.07, 0);
        moundParts.push(baseDisc);

        for (const clod of [
          { x: 0, z: 0, s: 0.52, y: 0.16 },
          { x: -0.34, z: 0.18, s: 0.38, y: 0.13 },
          { x: 0.36, z: -0.14, s: 0.4, y: 0.14 },
          { x: 0.12, z: 0.34, s: 0.34, y: 0.12 },
          { x: -0.22, z: -0.3, s: 0.36, y: 0.12 },
        ]) {
          const cMesh = MeshBuilder.CreatePolyhedron(
            `dirtClod-${prop.id}-${clod.x}`,
            { type: 2, size: clod.s },
            scene
          );
          cMesh.scaling.set(1.2, 0.62, 1.15);
          cMesh.position.set(clod.x, clod.y, clod.z);
          moundParts.push(cMesh);
        }
        mergeGroupWithMaterial(`dirtMoundMerged-${prop.id}`, moundParts, dirtSoilMat, moundNode, meta);

        // Subtle golden treasure glint on soft dirt patches
        const glint = MeshBuilder.CreatePolyhedron(
          `dirtGlint-${prop.id}`,
          { type: 1, size: 0.14 },
          scene
        );
        glint.position.set(0.08, 0.32, -0.05);
        glint.material = goldKeyMat;
        glint.parent = moundNode;
        dirtMound = moundNode;

        // Excavated pit shown after digging with the Shovel!
        const holeNode = new TransformNode(`dirtHole-${prop.id}`, scene);
        holeNode.parent = root;

        const pitRim = MeshBuilder.CreateTorus(
          `dirtPitRim-${prop.id}`,
          { diameter: 1.48, thickness: 0.24, tessellation: 16 },
          scene
        );
        pitRim.scaling.set(1.0, 0.55, 1.0);
        pitRim.position.set(0, 0.05, 0);
        pitRim.material = dirtSoilMat;
        pitRim.parent = holeNode;

        const pitCenter = MeshBuilder.CreateCylinder(
          `dirtPitCenter-${prop.id}`,
          { diameter: 1.32, height: 0.05, tessellation: 14 },
          scene
        );
        pitCenter.position.set(0, 0.025, 0);
        pitCenter.material = dirtPitMat;
        pitCenter.parent = holeNode;

        holeNode.setEnabled(false);
        dirtHole = holeNode;
      } else if (prop.prefab === "wooden_crate") {
        const crate = MeshBuilder.CreateBox(
          `crateBox-${prop.id}`,
          { width: 1.35, height: 1.35, depth: 1.35 },
          scene
        );
        crate.position.set(0, 0.675, 0);
        crate.material = woodMat;
        crate.parent = root;

        const band = MeshBuilder.CreateBox(
          `crateBand-${prop.id}`,
          { width: 1.42, height: 0.22, depth: 1.42 },
          scene
        );
        band.position.set(0, 0.675, 0);
        band.material = ironGateMat;
        band.parent = root;
      } else if (prop.prefab === "stone_wall") {
        const wallBox = MeshBuilder.CreateBox(
          `wallBox-${prop.id}`,
          { width: 1, height: 1, depth: 1 },
          scene
        );
        wallBox.position.set(0, 0.5, 0);
        wallBox.material = prop.zone === "dungeon" ? dgWallMat : ruinMat;
        wallBox.parent = root;
      } else if (prop.prefab === "cliff_block") {
        const cliffBox = MeshBuilder.CreateBox(
          `cliffBox-${prop.id}`,
          { width: 1, height: 1, depth: 1 },
          scene
        );
        cliffBox.position.set(0, 0.5, 0);
        cliffBox.material = cliffMat;
        cliffBox.parent = root;

        const cap = MeshBuilder.CreateBox(
          `cliffCap-${prop.id}`,
          { width: 1.04, height: 0.09, depth: 1.04 },
          scene
        );
        cap.position.set(0, 1.02, 0);
        cap.material = cliffTopMat;
        cap.parent = root;
      } else if (prop.prefab === "water_tile") {
        const waterBox = MeshBuilder.CreateBox(
          `waterBox-${prop.id}`,
          { width: 1, height: 0.16, depth: 1 },
          scene
        );
        waterBox.position.set(0, 0.02, 0);
        waterBox.material = waterMat;
        waterBox.parent = root;
      } else if (prop.prefab === "path_tile") {
        const pathBox = MeshBuilder.CreateBox(
          `pathBox-${prop.id}`,
          { width: 1, height: 0.06, depth: 1 },
          scene
        );
        pathBox.position.set(0, 0.03, 0);
        pathBox.material = pathMat;
        pathBox.parent = root;
      } else if (prop.prefab === "wooden_bridge") {
        const parts: Mesh[] = [];
        const deck = MeshBuilder.CreateBox(
          `bridgeDeck-${prop.id}`,
          { width: 7.4, height: 0.28, depth: 5.2 },
          scene
        );
        deck.position.set(0, 0.16, 0);
        parts.push(deck);

        for (const side of [-3.4, 3.4]) {
          for (const zOff of [-2.1, 0, 2.1]) {
            const post = MeshBuilder.CreateCylinder(
              `bridgePost-${prop.id}-${side}-${zOff}`,
              { diameter: 0.48, height: 1.35, tessellation: 12 },
              scene
            );
            post.position.set(side, 0.65, zOff);
            parts.push(post);
          }
          const rail = MeshBuilder.CreateBox(
            `bridgeRail-${prop.id}-${side}`,
            { width: 0.22, height: 0.22, depth: 4.8 },
            scene
          );
          rail.position.set(side, 1.05, 0);
          parts.push(rail);
        }
        mergeGroupWithMaterial(`bridgeMerged-${prop.id}`, parts, woodMat, root, meta);
      } else if (prop.prefab === "temple_arch") {
        const parts: Mesh[] = [];
        for (const tx of [-3.6, 3.6]) {
          const archCol = MeshBuilder.CreateCylinder(
            `templeCol-${prop.id}-${tx}`,
            { diameterTop: 2.2, diameterBottom: 2.6, height: 5.6, tessellation: 16 },
            scene
          );
          archCol.position.set(tx, 2.8, 0);
          parts.push(archCol);
        }
        const lintel = MeshBuilder.CreateBox(
          `templeLintel-${prop.id}`,
          { width: 10.6, height: 1.5, depth: 3.2 },
          scene
        );
        lintel.position.set(0, 5.8, 0);
        parts.push(lintel);

        const crest = MeshBuilder.CreateCylinder(
          `templeCrest-${prop.id}`,
          { diameterTop: 0.4, diameterBottom: 8.5, height: 1.8, tessellation: 4 },
          scene
        );
        crest.rotation.y = Math.PI / 4;
        crest.position.set(0, 7.2, 0);
        parts.push(crest);
        mergeGroupWithMaterial(`templeArchMerged-${prop.id}`, parts, ruinMat, root, meta);
      } else if (prop.prefab === "clay_pot") {
        const potParts: Mesh[] = [];
        const belly = MeshBuilder.CreateSphere(
          `potBelly-${prop.id}`,
          { diameter: 1.04, segments: 14 },
          scene
        );
        belly.scaling.set(1.06, 0.94, 1.06);
        belly.position.set(0, 0.48, 0);
        potParts.push(belly);

        const neck = MeshBuilder.CreateCylinder(
          `potNeck-${prop.id}`,
          { diameterTop: 0.56, diameterBottom: 0.72, height: 0.3, tessellation: 14 },
          scene
        );
        neck.position.set(0, 0.88, 0);
        potParts.push(neck);

        for (const hx of [-0.46, 0.46]) {
          const handle = MeshBuilder.CreateTorus(
            `potHandle-${prop.id}-${hx}`,
            { diameter: 0.34, thickness: 0.068, tessellation: 12 },
            scene
          );
          handle.rotation.z = Math.PI / 2;
          handle.position.set(hx, 0.68, 0);
          potParts.push(handle);
        }
        mergeGroupWithMaterial(`potBodyMerged-${prop.id}`, potParts, clayPotMat, root, meta);

        const trimParts: Mesh[] = [];
        const rim = MeshBuilder.CreateTorus(
          `potRim-${prop.id}`,
          { diameter: 0.66, thickness: 0.14, tessellation: 16 },
          scene
        );
        rim.position.set(0, 1.02, 0);
        trimParts.push(rim);

        const band = MeshBuilder.CreateTorus(
          `potBand-${prop.id}`,
          { diameter: 1.04, thickness: 0.075, tessellation: 16 },
          scene
        );
        band.position.set(0, 0.54, 0);
        trimParts.push(band);
        mergeGroupWithMaterial(`potTrimMerged-${prop.id}`, trimParts, clayRimMat, root, meta);

        if (prop.potReward === "small_key") {
          const keyGlint = MeshBuilder.CreateTorus(
            `potKeyGlint-${prop.id}`,
            { diameter: 0.78, thickness: 0.065, tessellation: 16 },
            scene
          );
          keyGlint.position.set(0, 0.86, 0);
          keyGlint.material = goldKeyMat;
          keyGlint.parent = root;
        }
      } else if (prop.prefab === "light_rock") {
        const rockParts: Mesh[] = [];
        const mainStone = MeshBuilder.CreatePolyhedron(
          `lightRockMain-${prop.id}`,
          { type: 2, size: 0.56 },
          scene
        );
        mainStone.scaling.set(1.22, 0.86, 1.15);
        mainStone.position.set(0, 0.44, 0);
        rockParts.push(mainStone);

        const sideStone = MeshBuilder.CreatePolyhedron(
          `lightRockSide-${prop.id}`,
          { type: 1, size: 0.34 },
          scene
        );
        sideStone.position.set(0.36, 0.28, 0.22);
        rockParts.push(sideStone);
        mergeGroupWithMaterial(`lightRockMerged-${prop.id}`, rockParts, lightRockMat, root, meta);

        const mossCap = MeshBuilder.CreateSphere(
          `lightRockMoss-${prop.id}`,
          { diameter: 0.62, segments: 10 },
          scene
        );
        mossCap.scaling.set(1.1, 0.28, 0.95);
        mossCap.position.set(-0.06, 0.82, -0.04);
        mossCap.material = bushMat;
        mossCap.parent = root;
      } else if (prop.prefab === "push_block") {
        const blockCore = MeshBuilder.CreateBox(
          `pushBlockCore-${prop.id}`,
          { width: 1.86, height: 1.68, depth: 1.86 },
          scene
        );
        blockCore.position.set(0, 0.88, 0);
        blockCore.material = pushBlockMat;
        blockCore.parent = root;

        const trimParts: Mesh[] = [];
        const baseSlab = MeshBuilder.CreateBox(
          `pushBlockBase-${prop.id}`,
          { width: 2.02, height: 0.24, depth: 2.02 },
          scene
        );
        baseSlab.position.set(0, 0.12, 0);
        trimParts.push(baseSlab);

        const capSlab = MeshBuilder.CreateBox(
          `pushBlockCap-${prop.id}`,
          { width: 1.98, height: 0.22, depth: 1.98 },
          scene
        );
        capSlab.position.set(0, 1.76, 0);
        trimParts.push(capSlab);
        mergeGroupWithMaterial(`pushBlockTrim-${prop.id}`, trimParts, ruinMat, root, meta);

        const runeParts: Mesh[] = [];
        const topRing = MeshBuilder.CreateTorus(
          `pushBlockTopRing-${prop.id}`,
          { diameter: 1.18, thickness: 0.09, tessellation: 18 },
          scene
        );
        topRing.position.set(0, 1.88, 0);
        runeParts.push(topRing);

        for (const side of [
          { x: 0, z: 0.95, w: 0.68, d: 0.08 },
          { x: 0, z: -0.95, w: 0.68, d: 0.08 },
          { x: 0.95, z: 0, w: 0.08, d: 0.68 },
          { x: -0.95, z: 0, w: 0.08, d: 0.68 },
        ]) {
          const plaque = MeshBuilder.CreateBox(
            `pushRune-${prop.id}-${side.x}-${side.z}`,
            { width: side.w, height: 0.68, depth: side.d },
            scene
          );
          plaque.position.set(side.x, 0.92, side.z);
          runeParts.push(plaque);
        }
        mergeGroupWithMaterial(`pushBlockRunes-${prop.id}`, runeParts, goldKeyMat, root, meta);

        // Floor Target Socket visual marker in world space when puzzleTargetX/Z are configured!
        if (prop.puzzleTargetX !== undefined && prop.puzzleTargetZ !== undefined) {
          const socketRing = MeshBuilder.CreateTorus(
            `pushTargetSocket-${prop.id}`,
            { diameter: 2.15, thickness: 0.14, tessellation: 24 },
            scene
          );
          socketRing.material = goldKeyMat;
          socketRing.isPickable = false;
          pushTargetSocket = socketRing;
        }
      } else if (prop.prefab === "crystal_switch") {
        const pedParts: Mesh[] = [];
        const pedBase = MeshBuilder.CreateCylinder(
          `crystPedBase-${prop.id}`,
          { diameterTop: 0.96, diameterBottom: 1.24, height: 0.68, tessellation: 10 },
          scene
        );
        pedBase.position.set(0, 0.34, 0);
        pedParts.push(pedBase);

        const pedCollar = MeshBuilder.CreateCylinder(
          `crystPedCollar-${prop.id}`,
          { diameterTop: 1.08, diameterBottom: 0.88, height: 0.18, tessellation: 10 },
          scene
        );
        pedCollar.position.set(0, 0.72, 0);
        pedParts.push(pedCollar);
        mergeGroupWithMaterial(`crystPedMerged-${prop.id}`, pedParts, dgPillarMat, root, meta);

        const cradle = MeshBuilder.CreateTorus(
          `crystCradle-${prop.id}`,
          { diameter: 0.86, thickness: 0.11, tessellation: 16 },
          scene
        );
        cradle.position.set(0, 0.84, 0);
        cradle.material = goldKeyMat;
        cradle.parent = root;

        const isOrange = prop.switchState === "orange";
        crystalOrbMat = makeMat(
          `crystalOrbMat-${prop.id}`,
          isOrange ? new Color3(1.0, 0.56, 0.16) : new Color3(0.22, 0.78, 1.0),
          isOrange ? new Color3(0.88, 0.38, 0.08) : new Color3(0.12, 0.48, 0.88),
          new Color3(1, 1, 1),
          0.95,
          80
        );

        const orb = MeshBuilder.CreatePolyhedron(
          `crystalOrb-${prop.id}`,
          { type: 1, size: 0.48 },
          scene
        );
        orb.position.set(0, 1.32, 0);
        orb.material = crystalOrbMat;
        orb.parent = root;
        crystalOrbMesh = orb;

        const halo = MeshBuilder.CreateTorus(
          `crystalHalo-${prop.id}`,
          { diameter: 1.22, thickness: 0.075, tessellation: 20 },
          scene
        );
        halo.position.set(0, 1.32, 0);
        halo.rotation.x = 0.45;
        halo.material = crystalOrbMat;
        halo.parent = root;
        crystalHaloRing = halo;
      } else if (prop.prefab === "crystal_barrier") {
        const socket = MeshBuilder.CreateCylinder(
          `crystBarrierSocket-${prop.id}`,
          { diameterTop: 1.82, diameterBottom: 1.98, height: 0.2, tessellation: 12 },
          scene
        );
        socket.position.set(0, 0.1, 0);
        socket.material = dgPillarMat;
        socket.parent = root;

        const socketTrim = MeshBuilder.CreateTorus(
          `crystBarrierTrim-${prop.id}`,
          { diameter: 1.72, thickness: 0.11, tessellation: 16 },
          scene
        );
        socketTrim.position.set(0, 0.2, 0);
        socketTrim.material = goldKeyMat;
        socketTrim.parent = root;

        const bodyNode = new TransformNode(`crystBarrierBody-${prop.id}`, scene);
        bodyNode.parent = root;
        crystalBarrierBody = bodyNode;

        const obeliskParts: Mesh[] = [];
        const obelisk = MeshBuilder.CreateCylinder(
          `crystBarrierCol-${prop.id}`,
          { diameterTop: 0.92, diameterBottom: 1.32, height: 2.25, tessellation: 6 },
          scene
        );
        obelisk.position.set(0, 1.15, 0);
        obeliskParts.push(obelisk);

        const crown = MeshBuilder.CreatePolyhedron(
          `crystBarrierCrown-${prop.id}`,
          { type: 1, size: 0.48 },
          scene
        );
        crown.position.set(0, 2.38, 0);
        obeliskParts.push(crown);
        mergeGroupWithMaterial(
          `crystBarrierMerged-${prop.id}`,
          obeliskParts,
          crystalBarrierMat,
          bodyNode,
          meta
        );
      } else if (prop.prefab === "cracked_rock") {
        const rockParts: Mesh[] = [];
        const mainBoulder = MeshBuilder.CreatePolyhedron(
          `crackedMain-${prop.id}`,
          { type: 2, size: 1.12 },
          scene
        );
        mainBoulder.scaling.set(1.28, 0.98, 1.18);
        mainBoulder.position.set(0, 0.82, 0);
        rockParts.push(mainBoulder);

        const sideCrag = MeshBuilder.CreatePolyhedron(
          `crackedSide-${prop.id}`,
          { type: 1, size: 0.72 },
          scene
        );
        sideCrag.position.set(-0.62, 0.52, 0.34);
        rockParts.push(sideCrag);

        const rightCrag = MeshBuilder.CreatePolyhedron(
          `crackedRight-${prop.id}`,
          { type: 2, size: 0.64 },
          scene
        );
        rightCrag.position.set(0.66, 0.48, -0.28);
        rockParts.push(rightCrag);
        mergeGroupWithMaterial(`crackedRockMerged-${prop.id}`, rockParts, crackedRockMat, root, meta);

        // Glowing amber/orange explosive fissure seams across the boulder!
        const seamParts: Mesh[] = [];
        const coreGlow = MeshBuilder.CreatePolyhedron(
          `crackedCore-${prop.id}`,
          { type: 1, size: 0.92 },
          scene
        );
        coreGlow.scaling.set(1.36, 0.22, 1.24);
        coreGlow.position.set(0, 0.84, 0);
        coreGlow.rotation.z = 0.28;
        seamParts.push(coreGlow);

        const crossSeam = MeshBuilder.CreateBox(
          `crackedSeamA-${prop.id}`,
          { width: 2.35, height: 1.45, depth: 0.16 },
          scene
        );
        crossSeam.position.set(0, 0.82, 0);
        crossSeam.rotation.y = 0.45;
        seamParts.push(crossSeam);

        const crossSeamB = MeshBuilder.CreateBox(
          `crackedSeamB-${prop.id}`,
          { width: 0.16, height: 1.48, depth: 2.15 },
          scene
        );
        crossSeamB.position.set(0, 0.82, 0);
        crossSeamB.rotation.y = -0.35;
        seamParts.push(crossSeamB);
        mergeGroupWithMaterial(
          `crackedSeamsMerged-${prop.id}`,
          seamParts,
          crackedFissureMat,
          root,
          meta
        );
      } else if (prop.prefab === "briar_barrier") {
        // Entangled Dry Thorny Briar Hedge (Burnable with the Flame Rod!)
        const vineParts: Mesh[] = [];
        const thornParts: Mesh[] = [];

        for (let b = 0; b < 7; b++) {
          const bx = -1.45 + b * 0.48;
          const post = MeshBuilder.CreateCylinder(
            `briarStem-${prop.id}-${b}`,
            { diameterTop: 0.22, diameterBottom: 0.36, height: 1.65, tessellation: 8 },
            scene
          );
          post.position.set(bx, 0.82, ((b % 2) - 0.5) * 0.26);
          post.rotation.z = ((b % 3) - 1) * 0.28;
          post.rotation.x = ((b % 2) - 0.5) * 0.22;
          vineParts.push(post);
        }

        for (const hy of [0.46, 0.94, 1.38]) {
          const crossVine = MeshBuilder.CreateCylinder(
            `briarCross-${prop.id}-${hy}`,
            { diameterTop: 0.24, diameterBottom: 0.28, height: 3.45, tessellation: 10 },
            scene
          );
          crossVine.rotation.z = Math.PI / 2 + (hy === 0.94 ? 0.08 : -0.08);
          crossVine.position.set(0, hy, 0);
          vineParts.push(crossVine);
        }

        const brambleCore = MeshBuilder.CreatePolyhedron(
          `briarCore-${prop.id}`,
          { type: 2, size: 0.86 },
          scene
        );
        brambleCore.scaling.set(1.78, 0.78, 0.65);
        brambleCore.position.set(0, 0.78, 0);
        vineParts.push(brambleCore);

        for (let tIdx = 0; tIdx < 12; tIdx++) {
          const tx = -1.5 + (tIdx % 6) * 0.6;
          const ty = tIdx < 6 ? 0.62 : 1.24;
          const thorn = MeshBuilder.CreateCylinder(
            `briarThorn-${prop.id}-${tIdx}`,
            { diameterTop: 0.02, diameterBottom: 0.16, height: 0.42, tessellation: 6 },
            scene
          );
          thorn.position.set(tx, ty, tIdx % 2 === 0 ? 0.32 : -0.32);
          thorn.rotation.x = tIdx % 2 === 0 ? 0.68 : -0.68;
          thorn.rotation.z = ((tIdx % 3) - 1) * 0.35;
          thornParts.push(thorn);
        }

        mergeGroupWithMaterial(`briarVinesMerged-${prop.id}`, vineParts, briarVineMat, root, meta);
        mergeGroupWithMaterial(`briarThornsMerged-${prop.id}`, thornParts, briarThornMat, root, meta);
      } else if (prop.prefab === "spiderweb_barrier") {
        // Thick Dungeon / Archway Spiderweb Barrier (Burnable with the Flame Rod!)
        const pillarParts: Mesh[] = [];
        for (const px of [-2.05, 2.05]) {
          const anchorPost = MeshBuilder.CreateCylinder(
            `webPost-${prop.id}-${px}`,
            { diameterTop: 0.38, diameterBottom: 0.52, height: 2.55, tessellation: 10 },
            scene
          );
          anchorPost.position.set(px, 1.275, 0);
          pillarParts.push(anchorPost);
        }
        mergeGroupWithMaterial(`webPostsMerged-${prop.id}`, pillarParts, dgPillarMat, root, meta);

        const silkParts: Mesh[] = [];
        // Radial silk spokes from center (0, 1.32, 0)
        for (let r = 0; r < 8; r++) {
          const ang = (r / 8) * Math.PI;
          const spoke = MeshBuilder.CreateCylinder(
            `webSpoke-${prop.id}-${r}`,
            { diameter: 0.09, height: 4.1, tessellation: 8 },
            scene
          );
          spoke.position.set(0, 1.32, 0);
          spoke.rotation.z = ang;
          silkParts.push(spoke);
        }

        // Concentric silk web rings
        for (const diam of [1.1, 2.15, 3.25]) {
          const webRing = MeshBuilder.CreateTorus(
            `webRing-${prop.id}-${diam}`,
            { diameter: diam, thickness: 0.085, tessellation: 16 },
            scene
          );
          webRing.rotation.x = Math.PI / 2;
          webRing.scaling.set(1.18, 1.0, 0.78);
          webRing.position.set(0, 1.32, 0);
          silkParts.push(webRing);
        }

        const centerCocoon = MeshBuilder.CreatePolyhedron(
          `webCocoon-${prop.id}`,
          { type: 1, size: 0.34 },
          scene
        );
        centerCocoon.scaling.set(1.25, 0.9, 0.55);
        centerCocoon.position.set(0, 1.32, 0);
        silkParts.push(centerCocoon);

        mergeGroupWithMaterial(`webSilkMerged-${prop.id}`, silkParts, spiderwebSilkMat, root, meta);
      } else if (prop.prefab === "eye_statue") {
        // Carved Dungeon Wall Eye Relief Statue (Only activates when pierced with a Bow Arrow!)
        const stoneParts: Mesh[] = [];
        const goldParts: Mesh[] = [];

        const pedestalBase = MeshBuilder.CreateBox(
          `eyePedestal-${prop.id}`,
          { width: 2.35, height: 0.65, depth: 1.35 },
          scene
        );
        pedestalBase.position.set(0, 0.325, 0);
        stoneParts.push(pedestalBase);

        const wallSlab = MeshBuilder.CreateBox(
          `eyeSlab-${prop.id}`,
          { width: 2.1, height: 2.55, depth: 0.95 },
          scene
        );
        wallSlab.position.set(0, 1.85, 0);
        stoneParts.push(wallSlab);

        const topCornice = MeshBuilder.CreateBox(
          `eyeCornice-${prop.id}`,
          { width: 2.42, height: 0.32, depth: 1.25 },
          scene
        );
        topCornice.position.set(0, 3.18, 0);
        stoneParts.push(topCornice);

        for (const px of [-0.88, 0.88]) {
          const sidePilaster = MeshBuilder.CreateCylinder(
            `eyePilaster-${prop.id}-${px}`,
            { diameter: 0.36, height: 2.5, tessellation: 10 },
            scene
          );
          sidePilaster.position.set(px, 1.85, 0.42);
          stoneParts.push(sidePilaster);
        }

        // Golden Eyelid Arches & Brow Crest framing the Open Eye
        const eyeSocketRing = MeshBuilder.CreateTorus(
          `eyeSocketRing-${prop.id}`,
          { diameter: 1.32, thickness: 0.16, tessellation: 24 },
          scene
        );
        eyeSocketRing.rotation.x = Math.PI / 2;
        eyeSocketRing.scaling.set(1.22, 1.0, 0.78);
        eyeSocketRing.position.set(0, 1.92, 0.48);
        goldParts.push(eyeSocketRing);

        const browCrest = MeshBuilder.CreatePolyhedron(
          `eyeBrowCrest-${prop.id}`,
          { type: 1, size: 0.24 },
          scene
        );
        browCrest.scaling.set(1.2, 1.45, 0.65);
        browCrest.position.set(0, 2.58, 0.54);
        goldParts.push(browCrest);

        mergeGroupWithMaterial(`eyeStoneMerged-${prop.id}`, stoneParts, dgPillarMat, root, meta);
        mergeGroupWithMaterial(`eyeGoldMerged-${prop.id}`, goldParts, goldKeyMat, root, meta);

        // Glowing White Sclera
        const sclera = MeshBuilder.CreateSphere(
          `eyeSclera-${prop.id}`,
          { diameter: 1.18, segments: 18 },
          scene
        );
        sclera.scaling.set(1.22, 0.78, 0.44);
        sclera.position.set(0, 1.92, 0.44);
        sclera.material = whiteEyeMat;
        sclera.parent = root;

        // Glowing Iris (shifts from Crimson/Amber to Solved Emerald/Cyan when hit by an Arrow!)
        eyeIrisMat = makeMat(
          `eyeIrisMat-${prop.id}`,
          new Color3(1.0, 0.28, 0.22),
          new Color3(0.92, 0.2, 0.14),
          new Color3(1.0, 0.9, 0.85),
          1.0,
          72
        );
        const iris = MeshBuilder.CreateSphere(
          `eyeIris-${prop.id}`,
          { diameter: 0.68, segments: 16 },
          scene
        );
        iris.scaling.set(1.05, 0.95, 0.36);
        iris.position.set(0, 1.92, 0.61);
        iris.material = eyeIrisMat;
        iris.parent = root;

        // Vertical Slit Pupil
        const pupil = MeshBuilder.CreateBox(
          `eyePupil-${prop.id}`,
          { width: 0.14, height: 0.46, depth: 0.12 },
          scene
        );
        pupil.position.set(0, 1.92, 0.7);
        pupil.material = darkEyeMat;
        pupil.parent = root;

        // Embedded Arrow Mesh shown when pierced (`prop.eyeActivated === true`)
        const arrowParts: Mesh[] = [];
        const embeddedShaft = MeshBuilder.CreateCylinder(
          `eyeArrowShaft-${prop.id}`,
          { diameter: 0.08, height: 1.15, tessellation: 8 },
          scene
        );
        embeddedShaft.rotation.x = Math.PI / 2;
        embeddedShaft.position.set(0, 1.92, 1.15);
        arrowParts.push(embeddedShaft);

        const fletchA = MeshBuilder.CreateBox(
          `eyeArrowFletchA-${prop.id}`,
          { width: 0.28, height: 0.04, depth: 0.28 },
          scene
        );
        fletchA.position.set(0, 1.92, 1.56);
        arrowParts.push(fletchA);

        const fletchB = MeshBuilder.CreateBox(
          `eyeArrowFletchB-${prop.id}`,
          { width: 0.04, height: 0.28, depth: 0.28 },
          scene
        );
        fletchB.position.set(0, 1.92, 1.56);
        arrowParts.push(fletchB);

        eyeArrowMesh =
          mergeGroupWithMaterial(
            `eyeArrowMerged-${prop.id}`,
            arrowParts,
            goldKeyMat,
            root,
            meta
          ) ?? undefined;
        if (eyeArrowMesh) {
          eyeArrowMesh.setEnabled(Boolean(prop.eyeActivated));
        }
      } else if (prop.prefab === "grapple_post") {
        // Wooden Grapple Anchor Post with Stone Base, Brass Bands, Iron Cap & Glowing Golden Target Ring!
        const stoneBase = MeshBuilder.CreateCylinder(
          `grappleBase-${prop.id}`,
          { diameterTop: 0.92, diameterBottom: 1.15, height: 0.34, tessellation: 12 },
          scene
        );
        stoneBase.position.set(0, 0.17, 0);
        stoneBase.material = dgPillarMat;
        stoneBase.parent = root;

        const timberPost = MeshBuilder.CreateCylinder(
          `grappleTimber-${prop.id}`,
          { diameterTop: 0.56, diameterBottom: 0.66, height: 1.95, tessellation: 12 },
          scene
        );
        timberPost.position.set(0, 1.14, 0);
        timberPost.material = woodMat;
        timberPost.parent = root;

        const ironCap = MeshBuilder.CreateCylinder(
          `grappleCap-${prop.id}`,
          { diameterTop: 0.42, diameterBottom: 0.68, height: 0.28, tessellation: 12 },
          scene
        );
        ironCap.position.set(0, 2.2, 0);
        ironCap.material = ironGateMat;
        ironCap.parent = root;

        const goldParts: Mesh[] = [];
        for (const by of [0.68, 1.56]) {
          const band = MeshBuilder.CreateTorus(
            `grappleBand-${prop.id}-${by}`,
            { diameter: 0.64, thickness: 0.08, tessellation: 16 },
            scene
          );
          band.position.set(0, by, 0);
          goldParts.push(band);
        }

        const topLatchRing = MeshBuilder.CreateTorus(
          `grappleTopRing-${prop.id}`,
          { diameter: 0.58, thickness: 0.11, tessellation: 18 },
          scene
        );
        topLatchRing.rotation.x = Math.PI / 2;
        topLatchRing.position.set(0, 2.52, 0);
        goldParts.push(topLatchRing);

        mergeGroupWithMaterial(`grappleGoldMerged-${prop.id}`, goldParts, goldKeyMat, root, meta);
      } else if (prop.prefab === "rusted_peg") {
        // Rusted Iron Floor Peg / Barrier Stake (Pound flat into the ground with Titan War-Hammer T / 8!)
        const socketRing = MeshBuilder.CreateCylinder(
          `pegSocket-${prop.id}`,
          { diameterTop: 0.94, diameterBottom: 1.12, height: 0.18, tessellation: 12 },
          scene
        );
        socketRing.position.set(0, 0.09, 0);
        socketRing.material = dgPillarMat;
        socketRing.parent = root;

        const ironParts: Mesh[] = [];
        const stakeShaft = MeshBuilder.CreateCylinder(
          `pegShaft-${prop.id}`,
          { diameterTop: 0.64, diameterBottom: 0.54, height: 1.42, tessellation: 8 },
          scene
        );
        stakeShaft.position.set(0, 0.78, 0);
        ironParts.push(stakeShaft);

        const stakeHead = MeshBuilder.CreateCylinder(
          `pegHead-${prop.id}`,
          { diameterTop: 0.82, diameterBottom: 0.9, height: 0.32, tessellation: 8 },
          scene
        );
        stakeHead.position.set(0, 1.56, 0);
        ironParts.push(stakeHead);
        mergeGroupWithMaterial(`pegIronMerged-${prop.id}`, ironParts, ironGateMat, root, meta);

        const strikeRuneRing = MeshBuilder.CreateTorus(
          `pegRuneRing-${prop.id}`,
          { diameter: 0.58, thickness: 0.09, tessellation: 16 },
          scene
        );
        strikeRuneRing.position.set(0, 1.73, 0);
        strikeRuneRing.material = goldKeyMat;
        strikeRuneRing.parent = root;
      } else if (prop.prefab === "custom_model") {
        const asset = customModels.find((m) => m.id === prop.customModelId);
        const customMesh = new Mesh(`customMesh-${prop.id}`, scene);
        if (asset && asset.positions.length >= 9 && asset.indices.length >= 3) {
          const vData = new VertexData();
          vData.positions = asset.positions;
          vData.indices = asset.indices;
          vData.normals = asset.normals;
          vData.applyToMesh(customMesh);
        } else {
          // Fallback crystal polyhedron
          const fallback = MeshBuilder.CreatePolyhedron(
            `customFallback-${prop.id}`,
            { type: 1, size: 1.2 },
            scene
          );
          fallback.position.set(0, 1.4, 0);
          fallback.parent = root;
        }
        const col = hexToColor3(prop.colorHex ?? asset?.colorHex ?? "#4fd8ff");
        customMesh.material = makeMat(
          `customMat-${prop.id}`,
          col,
          col.scale(0.25),
          new Color3(0.8, 0.9, 1.0),
          1.0,
          64
        );
        customMesh.parent = root;
      }

      tagHierarchyMetadata(root, "prop", prop.id);
      return {
        root,
        prefab: prop.prefab,
        customModelId: prop.customModelId,
        colorHex: prop.colorHex,
        bushFoliage,
        bushStump,
        torchFlame,
        timedTorchRing,
        dirtMound,
        dirtHole,
        crystalOrbMat,
        crystalOrbMesh,
        crystalHaloRing,
        crystalBarrierBody,
        pushTargetSocket,
        eyeIrisMat,
        eyeArrowMesh,
      };
    };

    const getPortalColors = (colorName: string): { diff: Color3; em: Color3 } => {
      switch (colorName) {
        case "gold":
          return { diff: new Color3(1.0, 0.82, 0.22), em: new Color3(0.85, 0.58, 0.08) };
        case "purple":
          return { diff: new Color3(0.75, 0.32, 1.0), em: new Color3(0.55, 0.15, 0.88) };
        case "emerald":
          return { diff: new Color3(0.22, 0.95, 0.52), em: new Color3(0.12, 0.68, 0.32) };
        case "crimson":
          return { diff: new Color3(1.0, 0.25, 0.32), em: new Color3(0.85, 0.12, 0.18) };
        default:
          return { diff: new Color3(0.2, 0.75, 1.0), em: new Color3(0.15, 0.55, 0.95) };
      }
    };

    const buildPortalRig = (portal: MapPortal): PortalVisualRig => {
      const root = new TransformNode(`portalRoot-${portal.id}`, scene);
      const { diff, em } = getPortalColors(portal.color);
      const portalMat = makeMat(
        `portalMat-${portal.id}`,
        diff,
        em,
        new Color3(0.8, 0.9, 1.0),
        0.85
      );

      const disc = MeshBuilder.CreateCylinder(
        `portalDisc-${portal.id}`,
        { diameter: portal.radius * 2, height: 0.14, tessellation: 28 },
        scene
      );
      disc.position.set(0, 0.08, 0);
      disc.material = portalMat;
      disc.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `portalRing-${portal.id}`,
        { diameter: portal.radius * 2.15, thickness: 0.14, tessellation: 28 },
        scene
      );
      ring.position.set(0, 0.18, 0);
      ring.material = goldKeyMat;
      ring.parent = root;

      const pillarL = MeshBuilder.CreateCylinder(
        `portalPilL-${portal.id}`,
        { diameterTop: 0.35, diameterBottom: 0.5, height: 2.2, tessellation: 10 },
        scene
      );
      pillarL.position.set(-portal.radius * 1.05, 1.1, 0);
      pillarL.material = ruinMat;
      pillarL.parent = root;

      const pillarR = MeshBuilder.CreateCylinder(
        `portalPilR-${portal.id}`,
        { diameterTop: 0.35, diameterBottom: 0.5, height: 2.2, tessellation: 10 },
        scene
      );
      pillarR.position.set(portal.radius * 1.05, 1.1, 0);
      pillarR.material = ruinMat;
      pillarR.parent = root;

      tagHierarchyMetadata(root, "portal", portal.id);
      return { root, disc, ring, pillarL, pillarR, color: portal.color };
    };

    // =========================================================
    // 3D MAP EDITOR SELECTION GIZMO & TERRAIN BRUSH RING
    // =========================================================
    const editorGizmoRoot = new TransformNode("editorGizmoRoot", scene);
    const selRing = MeshBuilder.CreateTorus(
      "editorSelRing",
      { diameter: 3.2, thickness: 0.14, tessellation: 32 },
      scene
    );
    selRing.position.set(0, 0.15, 0);
    selRing.material = makeMat(
      "editorSelRingMat",
      new Color3(1.0, 0.9, 0.2),
      new Color3(1.0, 0.8, 0.1)
    );
    selRing.isPickable = false;
    selRing.parent = editorGizmoRoot;

    // Red X-Axis Arrow & Blue Z-Axis Arrow (Unity Transform Gizmo feel!)
    const xAxisMat = makeMat("xAxisMat", new Color3(1.0, 0.22, 0.22), new Color3(0.9, 0.15, 0.15));
    const zAxisMat = makeMat("zAxisMat", new Color3(0.22, 0.58, 1.0), new Color3(0.15, 0.45, 0.95));

    const xAxisShaft = MeshBuilder.CreateCylinder(
      "xAxisShaft",
      { diameter: 0.12, height: 2.4, tessellation: 10 },
      scene
    );
    xAxisShaft.rotation.z = -Math.PI / 2;
    xAxisShaft.position.set(1.2, 0.45, 0);
    xAxisShaft.material = xAxisMat;
    xAxisShaft.isPickable = false;
    xAxisShaft.parent = editorGizmoRoot;

    const xAxisTip = MeshBuilder.CreateCylinder(
      "xAxisTip",
      { diameterTop: 0.02, diameterBottom: 0.36, height: 0.55, tessellation: 10 },
      scene
    );
    xAxisTip.rotation.z = -Math.PI / 2;
    xAxisTip.position.set(2.5, 0.45, 0);
    xAxisTip.material = xAxisMat;
    xAxisTip.isPickable = false;
    xAxisTip.parent = editorGizmoRoot;

    const zAxisShaft = MeshBuilder.CreateCylinder(
      "zAxisShaft",
      { diameter: 0.12, height: 2.4, tessellation: 10 },
      scene
    );
    zAxisShaft.rotation.x = Math.PI / 2;
    zAxisShaft.position.set(0, 0.45, 1.2);
    zAxisShaft.material = zAxisMat;
    zAxisShaft.isPickable = false;
    zAxisShaft.parent = editorGizmoRoot;

    const zAxisTip = MeshBuilder.CreateCylinder(
      "zAxisTip",
      { diameterTop: 0.02, diameterBottom: 0.36, height: 0.55, tessellation: 10 },
      scene
    );
    zAxisTip.rotation.x = Math.PI / 2;
    zAxisTip.position.set(0, 0.45, 2.5);
    zAxisTip.material = zAxisMat;
    zAxisTip.isPickable = false;
    zAxisTip.parent = editorGizmoRoot;
    editorGizmoRoot.setEnabled(false);

    // Terrain Brush Ring Preview
    const terrainBrushRing = MeshBuilder.CreateTorus(
      "terrainBrushRing",
      { diameter: 2.0, thickness: 0.08, tessellation: 36 },
      scene
    );
    terrainBrushRing.material = makeMat(
      "terrainBrushRingMat",
      new Color3(0.3, 1.0, 0.65),
      new Color3(0.2, 0.85, 0.5)
    );
    terrainBrushRing.isPickable = false;
    terrainBrushRing.setEnabled(false);

    // =========================================================
    // UPGRADED HERO 3D CHARACTER RIG + SHIELD BLOCK WARD + TOOLS
    // =========================================================
    const heroRoot = new TransformNode("heroRoot", scene);

    const tunicMat = makeMat("heroTunicMat", new Color3(0.15, 0.68, 0.32), new Color3(0.03, 0.12, 0.05));
    const skinMat = makeMat("heroSkinMat", new Color3(0.97, 0.81, 0.66));
    const shieldMat = makeMat("heroShieldMat", new Color3(0.2, 0.42, 0.8), new Color3(0.05, 0.1, 0.22));
    const bootMat = makeMat("heroBootMat", new Color3(0.38, 0.24, 0.14));

    const heroLeftBoot = MeshBuilder.CreateCylinder(
      "heroLeftBoot",
      { diameterTop: 0.28, diameterBottom: 0.34, height: 0.52, tessellation: 12 },
      scene
    );
    heroLeftBoot.position.set(-0.22, 0.26, 0);
    heroLeftBoot.material = bootMat;
    heroLeftBoot.parent = heroRoot;

    const heroRightBoot = MeshBuilder.CreateCylinder(
      "heroRightBoot",
      { diameterTop: 0.28, diameterBottom: 0.34, height: 0.52, tessellation: 12 },
      scene
    );
    heroRightBoot.position.set(0.22, 0.26, 0);
    heroRightBoot.material = bootMat;
    heroRightBoot.parent = heroRoot;

    const heroTunicParts: Mesh[] = [];
    const heroTorso = MeshBuilder.CreateCylinder(
      "heroTorso",
      { diameterTop: 0.7, diameterBottom: 1.02, height: 1.05, tessellation: 16 },
      scene
    );
    heroTorso.position.set(0, 0.85, 0);
    heroTunicParts.push(heroTorso);

    const heroShoulders = MeshBuilder.CreateSphere(
      "heroShoulders",
      { diameterX: 1.05, diameterY: 0.45, diameterZ: 0.72, segments: 14 },
      scene
    );
    heroShoulders.position.set(0, 1.25, 0);
    heroTunicParts.push(heroShoulders);

    const heroCap = MeshBuilder.CreateCylinder(
      "heroCap",
      { diameterTop: 0.06, diameterBottom: 0.82, height: 1.08, tessellation: 14 },
      scene
    );
    heroCap.position.set(0, 2.1, -0.26);
    heroCap.rotation.x = -0.62;
    heroTunicParts.push(heroCap);
    mergeGroupWithMaterial("heroTunicMerged", heroTunicParts, tunicMat, heroRoot);

    const heroSkinParts: Mesh[] = [];
    const heroHead = MeshBuilder.CreateSphere(
      "heroHead",
      { diameter: 0.82, segments: 16 },
      scene
    );
    heroHead.position.set(0, 1.66, 0.04);
    heroSkinParts.push(heroHead);

    for (const ex of [-1, 1]) {
      const ear = MeshBuilder.CreateCylinder(
        `heroEar-${ex}`,
        { diameterTop: 0.03, diameterBottom: 0.2, height: 0.42, tessellation: 10 },
        scene
      );
      ear.position.set(ex * 0.46, 1.68, 0.02);
      ear.rotation.z = -ex * 1.15;
      ear.rotation.y = ex * 0.25;
      heroSkinParts.push(ear);
    }
    mergeGroupWithMaterial("heroSkinMerged", heroSkinParts, skinMat, heroRoot);

    const heroEyeParts: Mesh[] = [];
    for (const ex of [-0.15, 0.15]) {
      const eye = MeshBuilder.CreateSphere(`heroEye-${ex}`, { diameter: 0.13, segments: 10 }, scene);
      eye.scaling.set(0.85, 1.25, 0.6);
      eye.position.set(ex, 1.66, 0.41);
      heroEyeParts.push(eye);
    }
    mergeGroupWithMaterial("heroEyesMerged", heroEyeParts, darkEyeMat, heroRoot);

    const heroGoldParts: Mesh[] = [];
    const heroHairBand = MeshBuilder.CreateTorus(
      "heroHairBand",
      { diameter: 0.78, thickness: 0.18, tessellation: 18 },
      scene
    );
    heroHairBand.position.set(0, 1.78, 0.02);
    heroGoldParts.push(heroHairBand);

    const beltBuckle = MeshBuilder.CreateBox(
      "heroBeltBuckle",
      { width: 0.28, height: 0.18, depth: 0.12 },
      scene
    );
    beltBuckle.position.set(0, 0.72, 0.44);
    heroGoldParts.push(beltBuckle);
    mergeGroupWithMaterial("heroGoldMerged", heroGoldParts, goldKeyMat, heroRoot);

    // Articulated Kite Shield Pivot
    const heroShieldPivot = new TransformNode("heroShieldPivot", scene);
    heroShieldPivot.position.set(-0.56, 0.9, 0.24);
    heroShieldPivot.parent = heroRoot;

    const heroShield = MeshBuilder.CreateCylinder(
      "heroShield",
      { diameterTop: 0.78, diameterBottom: 0.36, height: 0.14, tessellation: 12 },
      scene
    );
    heroShield.rotation.z = Math.PI / 2;
    heroShield.material = shieldMat;
    heroShield.parent = heroShieldPivot;

    const shieldCrest = MeshBuilder.CreatePolyhedron(
      "heroShieldCrest",
      { type: 1, size: 0.16 },
      scene
    );
    shieldCrest.position.set(-0.08, 0.02, 0);
    shieldCrest.material = goldKeyMat;
    shieldCrest.parent = heroShieldPivot;

    const heroBlockWard = MeshBuilder.CreateSphere(
      "heroBlockWard",
      { diameterX: 1.85, diameterY: 1.85, diameterZ: 0.85, segments: 14 },
      scene
    );
    heroBlockWard.position.set(0, 1.0, 0.65);
    heroBlockWard.material = makeMat(
      "heroBlockWardMat",
      new Color3(0.25, 0.72, 1.0),
      new Color3(0.18, 0.55, 0.95),
      new Color3(1, 1, 1),
      0.38
    );
    heroBlockWard.parent = heroRoot;
    heroBlockWard.setEnabled(false);

    const swordPivot = new TransformNode("swordPivot", scene);
    swordPivot.position.set(0.45, 0.92, 0.1);
    swordPivot.parent = heroRoot;

    const swordHilt = MeshBuilder.CreateBox(
      "swordHilt",
      { width: 0.48, height: 0.12, depth: 0.14 },
      scene
    );
    swordHilt.position.set(0, 0, 0.35);
    swordHilt.material = goldKeyMat;
    swordHilt.parent = swordPivot;

    const swordBlade = MeshBuilder.CreateCylinder(
      "swordBlade",
      { diameterTop: 0.03, diameterBottom: 0.22, height: 1.72, tessellation: 6 },
      scene
    );
    swordBlade.rotation.x = Math.PI / 2;
    swordBlade.scaling.set(1.0, 1.0, 0.38);
    swordBlade.position.set(0, 0, 1.24);
    swordBlade.material = bladeMat;
    swordBlade.parent = swordPivot;

    const slashArc = MeshBuilder.CreateTorus(
      "slashArc",
      { diameter: 4.1, thickness: 0.22, tessellation: 28 },
      scene
    );
    slashArc.position.set(0, 0.9, 0.55);
    slashArc.scaling.set(1.0, 0.25, 0.95);
    const slashMat = makeMat(
      "slashMat",
      new Color3(0.55, 0.95, 1.0),
      new Color3(0.45, 0.85, 1.0),
      new Color3(1, 1, 1),
      0.82
    );
    slashArc.material = slashMat;
    slashArc.parent = heroRoot;

    // 360° Charged Spin Attack Whirlwind Ring & Charge Aura Ring
    const spinSlashRing = MeshBuilder.CreateTorus(
      "spinSlashRing",
      { diameter: 6.2, thickness: 0.32, tessellation: 36 },
      scene
    );
    spinSlashRing.position.set(0, 0.92, 0);
    spinSlashRing.scaling.set(1.0, 0.3, 1.0);
    spinSlashRing.material = makeMat(
      "spinSlashMat",
      new Color3(1.0, 0.88, 0.26),
      new Color3(1.0, 0.72, 0.14),
      new Color3(1, 1, 1),
      0.86
    );
    spinSlashRing.parent = heroRoot;
    spinSlashRing.setEnabled(false);

    const chargeAuraMat = makeMat(
      "chargeAuraMat",
      new Color3(1.0, 0.82, 0.22),
      new Color3(0.95, 0.65, 0.12),
      new Color3(1, 1, 1),
      0.65
    );
    const chargeAuraRing = MeshBuilder.CreateTorus(
      "chargeAuraRing",
      { diameter: 2.35, thickness: 0.13, tessellation: 28 },
      scene
    );
    chargeAuraRing.position.set(0, 0.16, 0);
    chargeAuraRing.material = chargeAuraMat;
    chargeAuraRing.parent = heroRoot;
    chargeAuraRing.setEnabled(false);

    // Zero-cost emissive floor lantern illumination disc under the Hero in Dark Rooms!
    const heroLanternDisc = MeshBuilder.CreateCylinder(
      "heroLanternDisc",
      { diameter: 9.8, height: 0.03, tessellation: 32 },
      scene
    );
    heroLanternDisc.position.set(0, 0.04, 0);
    heroLanternDisc.material = makeMat(
      "heroLanternDiscMat",
      new Color3(1.0, 0.78, 0.34),
      new Color3(0.95, 0.65, 0.22),
      new Color3(0, 0, 0),
      0.16
    );
    heroLanternDisc.isPickable = false;
    heroLanternDisc.parent = heroRoot;
    heroLanternDisc.setEnabled(false);

    // --- 3D MAGIC FIRE ROD ON HERO (SHOWN WHEN CHARGING / CASTING FIREBALLS) ---
    const heroFireRodNode = new TransformNode("heroFireRodNode", scene);
    heroFireRodNode.position.set(0.46, 0.96, 0.28);
    heroFireRodNode.parent = heroRoot;

    const fireRodShaft = MeshBuilder.CreateCylinder(
      "fireRodShaft",
      { diameterTop: 0.12, diameterBottom: 0.09, height: 1.35, tessellation: 10 },
      scene
    );
    fireRodShaft.rotation.x = Math.PI / 2;
    fireRodShaft.position.set(0, 0, 0.55);
    fireRodShaft.material = glowingCrimsonMat;
    fireRodShaft.parent = heroFireRodNode;

    const fireRodCrown = MeshBuilder.CreatePolyhedron(
      "fireRodCrown",
      { type: 1, size: 0.22 },
      scene
    );
    fireRodCrown.position.set(0, 0, 1.28);
    fireRodCrown.material = goldKeyMat;
    fireRodCrown.parent = heroFireRodNode;
    heroFireRodNode.setEnabled(false);

    // --- 3D SHOVEL ON HERO (SHOWN WHEN DIGGING SOFT DIRT PATCHES) ---
    const heroShovelNode = new TransformNode("heroShovelNode", scene);
    heroShovelNode.position.set(0.42, 0.88, 0.35);
    heroShovelNode.parent = heroRoot;

    const shovelHandle = MeshBuilder.CreateCylinder(
      "shovelHandle",
      { diameter: 0.09, height: 1.25, tessellation: 8 },
      scene
    );
    shovelHandle.rotation.x = Math.PI / 2.6;
    shovelHandle.position.set(0, 0.12, 0.42);
    shovelHandle.material = woodMat;
    shovelHandle.parent = heroShovelNode;

    const shovelScoop = MeshBuilder.CreateCylinder(
      "shovelScoop",
      { diameterTop: 0.44, diameterBottom: 0.14, height: 0.48, tessellation: 6 },
      scene
    );
    shovelScoop.rotation.x = Math.PI / 2.6;
    shovelScoop.scaling.set(1.0, 1.0, 0.32);
    shovelScoop.position.set(0, -0.34, 0.96);
    shovelScoop.material = bladeMat;
    shovelScoop.parent = heroShovelNode;
    heroShovelNode.setEnabled(false);

    // --- 3D TITAN WAR-HAMMER ON HERO (SHOWN WHEN SLAMMING T / 8) ---
    const heroHammerNode = new TransformNode("heroHammerNode", scene);
    heroHammerNode.position.set(0.32, 1.15, 0.25);
    heroHammerNode.parent = heroRoot;
    {
      const hmHandle = MeshBuilder.CreateCylinder(
        "heroHammerHandle",
        { diameter: 0.11, height: 1.48, tessellation: 10 },
        scene
      );
      hmHandle.position.set(0, 0.62, 0);
      hmHandle.material = woodMat;
      hmHandle.isPickable = false;
      hmHandle.parent = heroHammerNode;

      const hmHeadCore = MeshBuilder.CreateBox(
        "heroHammerHeadCore",
        { width: 0.74, height: 0.44, depth: 0.48 },
        scene
      );
      hmHeadCore.position.set(0, 1.32, 0);
      hmHeadCore.rotation.y = Math.PI / 2;
      hmHeadCore.material = ironGateMat;
      hmHeadCore.isPickable = false;
      hmHeadCore.parent = heroHammerNode;

      const hmImpactFaces = MeshBuilder.CreateCylinder(
        "heroHammerImpactFaces",
        { diameter: 0.42, height: 0.84, tessellation: 12 },
        scene
      );
      hmImpactFaces.position.set(0, 1.32, 0);
      hmImpactFaces.rotation.x = Math.PI / 2;
      hmImpactFaces.material = goldKeyMat;
      hmImpactFaces.isPickable = false;
      hmImpactFaces.parent = heroHammerNode;
    }
    heroHammerNode.setEnabled(false);

    // --- 3D RANGER'S BOW ON HERO (SHOWN WHEN SHOOTING ARROWS) ---
    const heroBowNode = new TransformNode("heroBowNode", scene);
    heroBowNode.position.set(0, 0.96, 0.62);
    heroBowNode.parent = heroRoot;

    const heroBowArc = MeshBuilder.CreateTorus(
      "heroBowArc",
      { diameter: 1.15, thickness: 0.1, tessellation: 18 },
      scene
    );
    heroBowArc.rotation.y = Math.PI / 2;
    heroBowArc.material = goldKeyMat;
    heroBowArc.parent = heroBowNode;

    const heroBowString = MeshBuilder.CreateCylinder(
      "heroBowString",
      { diameter: 0.025, height: 1.08, tessellation: 6 },
      scene
    );
    heroBowString.position.set(0, 0, -0.08);
    heroBowString.material = whiteEyeMat;
    heroBowString.parent = heroBowNode;
    heroBowNode.setEnabled(false);

    // --- 3D OVERHEAD HELD OBJECT ON HERO (CLAY POT, LIGHT ROCK, OR LIT BOMB) ---
    const heroHeldNode = new TransformNode("heroHeldNode", scene);
    heroHeldNode.position.set(0, 2.32, 0.08);
    heroHeldNode.parent = heroRoot;

    // 1. Overhead Held Clay Pot
    const heldPotNode = new TransformNode("heldPotNode", scene);
    heldPotNode.parent = heroHeldNode;
    const heldPotBelly = MeshBuilder.CreateSphere(
      "heldPotBelly",
      { diameter: 0.92, segments: 12 },
      scene
    );
    heldPotBelly.scaling.set(1.06, 0.94, 1.06);
    heldPotBelly.position.set(0, 0.36, 0);
    heldPotBelly.material = clayPotMat;
    heldPotBelly.isPickable = false;
    heldPotBelly.parent = heldPotNode;

    const heldPotRim = MeshBuilder.CreateTorus(
      "heldPotRim",
      { diameter: 0.58, thickness: 0.12, tessellation: 14 },
      scene
    );
    heldPotRim.position.set(0, 0.78, 0);
    heldPotRim.material = clayRimMat;
    heldPotRim.isPickable = false;
    heldPotRim.parent = heldPotNode;

    // 2. Overhead Held Light Rock
    const heldRockNode = new TransformNode("heldRockNode", scene);
    heldRockNode.parent = heroHeldNode;
    const heldRockMesh = MeshBuilder.CreatePolyhedron(
      "heldRockMesh",
      { type: 2, size: 0.52 },
      scene
    );
    heldRockMesh.scaling.set(1.22, 0.86, 1.15);
    heldRockMesh.position.set(0, 0.36, 0);
    heldRockMesh.material = lightRockMat;
    heldRockMesh.isPickable = false;
    heldRockMesh.parent = heldRockNode;

    const heldRockMoss = MeshBuilder.CreateSphere(
      "heldRockMoss",
      { diameter: 0.54, segments: 8 },
      scene
    );
    heldRockMoss.scaling.set(1.1, 0.28, 0.95);
    heldRockMoss.position.set(0, 0.68, 0);
    heldRockMoss.material = bushMat;
    heldRockMoss.isPickable = false;
    heldRockMoss.parent = heldRockNode;

    // 3. Overhead Held Bomb
    const heldBombNode = new TransformNode("heldBombNode", scene);
    heldBombNode.parent = heroHeldNode;
    const heldBombBodyMat = makeMat(
      "heldBombBodyMat",
      new Color3(0.16, 0.22, 0.36),
      new Color3(0.04, 0.06, 0.12),
      new Color3(0.75, 0.82, 0.95),
      1.0,
      64
    );
    const heldBombSphere = MeshBuilder.CreateSphere(
      "heldBombSphere",
      { diameter: 0.78, segments: 14 },
      scene
    );
    heldBombSphere.position.set(0, 0.38, 0);
    heldBombSphere.material = heldBombBodyMat;
    heldBombSphere.isPickable = false;
    heldBombSphere.parent = heldBombNode;

    const heldBombCap = MeshBuilder.CreateCylinder(
      "heldBombCap",
      { diameterTop: 0.22, diameterBottom: 0.28, height: 0.14, tessellation: 10 },
      scene
    );
    heldBombCap.position.set(0, 0.78, 0);
    heldBombCap.material = goldKeyMat;
    heldBombCap.isPickable = false;
    heldBombCap.parent = heldBombNode;

    const heldBombSpark = MeshBuilder.CreatePolyhedron(
      "heldBombSpark",
      { type: 1, size: 0.14 },
      scene
    );
    heldBombSpark.position.set(0, 0.94, 0);
    heldBombSpark.material = goldKeyMat;
    heldBombSpark.isPickable = false;
    heldBombSpark.parent = heldBombNode;

    heroHeldNode.setEnabled(false);

    // --- 3D SPINNING BOOMERANG PROJECTILE ---
    const boomerangNode = new TransformNode("boomerangNode", scene);
    const wing1 = MeshBuilder.CreateBox(
      "boomWing1",
      { width: 0.95, height: 0.12, depth: 0.24 },
      scene
    );
    wing1.position.set(0.32, 0, 0.15);
    wing1.rotation.y = 0.48;
    wing1.material = goldKeyMat;
    wing1.parent = boomerangNode;

    const wing2 = MeshBuilder.CreateBox(
      "boomWing2",
      { width: 0.95, height: 0.12, depth: 0.24 },
      scene
    );
    wing2.position.set(-0.32, 0, 0.15);
    wing2.rotation.y = -0.48;
    wing2.material = goldKeyMat;
    wing2.parent = boomerangNode;

    const boomRing = MeshBuilder.CreateTorus(
      "boomRing",
      { diameter: 1.5, thickness: 0.06, tessellation: 20 },
      scene
    );
    boomRing.material = slashMat;
    boomRing.parent = boomerangNode;
    boomerangNode.setEnabled(false);

    // --- 3D GRAPPLING HOOKSHOT CLAW + SEGMENTED METALLIC CHAIN ---
    const hookshotClawNode = new TransformNode("hookshotClawNode", scene);
    {
      const clawHead = MeshBuilder.CreateCylinder(
        "hookshotClawHead",
        { diameterTop: 0.22, diameterBottom: 0.36, height: 0.56, tessellation: 12 },
        scene
      );
      clawHead.rotation.x = Math.PI / 2;
      clawHead.material = bladeMat;
      clawHead.isPickable = false;
      clawHead.parent = hookshotClawNode;

      const clawCollar = MeshBuilder.CreateTorus(
        "hookshotClawCollar",
        { diameter: 0.42, thickness: 0.09, tessellation: 16 },
        scene
      );
      clawCollar.rotation.x = Math.PI / 2;
      clawCollar.position.set(0, 0, 0.14);
      clawCollar.material = goldKeyMat;
      clawCollar.isPickable = false;
      clawCollar.parent = hookshotClawNode;

      for (let p = 0; p < 3; p++) {
        const ang = (p / 3) * Math.PI * 2;
        const prong = MeshBuilder.CreateCylinder(
          `hookshotProng-${p}`,
          { diameterTop: 0.02, diameterBottom: 0.12, height: 0.46, tessellation: 8 },
          scene
        );
        prong.position.set(Math.cos(ang) * 0.18, Math.sin(ang) * 0.18, 0.34);
        prong.rotation.x = Math.PI / 2;
        prong.material = goldKeyMat;
        prong.isPickable = false;
        prong.parent = hookshotClawNode;
      }
    }
    hookshotClawNode.setEnabled(false);

    const HOOKSHOT_CHAIN_COUNT = 14;
    const hookshotChainLinks: Mesh[] = [];
    for (let c = 0; c < HOOKSHOT_CHAIN_COUNT; c++) {
      const link = MeshBuilder.CreateTorus(
        `hookshotChainLink-${c}`,
        { diameter: 0.24, thickness: 0.065, tessellation: 12 },
        scene
      );
      link.material = c % 2 === 0 ? bladeMat : ironGateMat;
      link.isPickable = false;
      link.setEnabled(false);
      hookshotChainLinks.push(link);
    }

    // --- 3D GOLDEN WAYFINDER TRAIL (FLOWING MOTES, CHEVRONS, FOOT COMPASS & BEACON) ---
    const wayfinderGoldMat = makeMat(
      "wayfinderGoldMat",
      new Color3(1.0, 0.88, 0.34),
      new Color3(1.0, 0.74, 0.22),
      new Color3(1.0, 1.0, 0.9),
      0.92
    );
    const wayfinderCyanMat = makeMat(
      "wayfinderCyanMat",
      new Color3(0.36, 0.94, 1.0),
      new Color3(0.22, 0.78, 0.98),
      new Color3(0.9, 1.0, 1.0),
      0.78
    );

    const WAYFINDER_MOTE_COUNT = 18;
    const wayfinderNodes: TransformNode[] = [];
    for (let w = 0; w < WAYFINDER_MOTE_COUNT; w++) {
      const wfNode = new TransformNode(`wayfinderMote-${w}`, scene);

      const chevronL = MeshBuilder.CreateBox(
        `wfChevronL-${w}`,
        { width: 0.36, height: 0.055, depth: 0.11 },
        scene
      );
      chevronL.position.set(-0.12, 0.04, 0.04);
      chevronL.rotation.y = -0.62;
      chevronL.material = wayfinderGoldMat;
      chevronL.isPickable = false;
      chevronL.parent = wfNode;

      const chevronR = MeshBuilder.CreateBox(
        `wfChevronR-${w}`,
        { width: 0.36, height: 0.055, depth: 0.11 },
        scene
      );
      chevronR.position.set(0.12, 0.04, 0.04);
      chevronR.rotation.y = 0.62;
      chevronR.material = wayfinderGoldMat;
      chevronR.isPickable = false;
      chevronR.parent = wfNode;

      const moteGem = MeshBuilder.CreatePolyhedron(
        `wfMoteGem-${w}`,
        { type: 1, size: 0.13 },
        scene
      );
      moteGem.position.set(0, 0.18, 0.12);
      moteGem.scaling.set(0.85, 0.65, 1.45);
      moteGem.material = w % 2 === 0 ? wayfinderGoldMat : wayfinderCyanMat;
      moteGem.isPickable = false;
      moteGem.parent = wfNode;

      const moteHalo = MeshBuilder.CreateTorus(
        `wfMoteHalo-${w}`,
        { diameter: 0.56, thickness: 0.045, tessellation: 14 },
        scene
      );
      moteHalo.position.set(0, 0.02, 0);
      moteHalo.material = wayfinderCyanMat;
      moteHalo.isPickable = false;
      moteHalo.parent = wfNode;

      wfNode.setEnabled(false);
      wayfinderNodes.push(wfNode);
    }

    const wayfinderCompassNode = new TransformNode("wayfinderCompassNode", scene);
    {
      const compassRing = MeshBuilder.CreateTorus(
        "wayfinderCompassRing",
        { diameter: 1.75, thickness: 0.055, tessellation: 28 },
        scene
      );
      compassRing.position.set(0, 0.07, 0);
      compassRing.material = wayfinderCyanMat;
      compassRing.isPickable = false;
      compassRing.parent = wayfinderCompassNode;

      const compassArrow = MeshBuilder.CreateCylinder(
        "wayfinderCompassArrow",
        { diameterTop: 0.02, diameterBottom: 0.38, height: 0.52, tessellation: 4 },
        scene
      );
      compassArrow.rotation.x = Math.PI / 2;
      compassArrow.position.set(0, 0.1, 1.08);
      compassArrow.material = wayfinderGoldMat;
      compassArrow.isPickable = false;
      compassArrow.parent = wayfinderCompassNode;
    }
    wayfinderCompassNode.setEnabled(false);

    const wayfinderBeaconNode = new TransformNode("wayfinderBeaconNode", scene);
    const wayfinderBeaconOuterRing = MeshBuilder.CreateTorus(
      "wayfinderBeaconOuterRing",
      { diameter: 2.8, thickness: 0.11, tessellation: 28 },
      scene
    );
    wayfinderBeaconOuterRing.position.set(0, 0.1, 0);
    wayfinderBeaconOuterRing.material = wayfinderGoldMat;
    wayfinderBeaconOuterRing.isPickable = false;
    wayfinderBeaconOuterRing.parent = wayfinderBeaconNode;

    const wayfinderBeaconInnerRing = MeshBuilder.CreateTorus(
      "wayfinderBeaconInnerRing",
      { diameter: 1.85, thickness: 0.085, tessellation: 24 },
      scene
    );
    wayfinderBeaconInnerRing.position.set(0, 0.24, 0);
    wayfinderBeaconInnerRing.material = wayfinderCyanMat;
    wayfinderBeaconInnerRing.isPickable = false;
    wayfinderBeaconInnerRing.parent = wayfinderBeaconNode;

    const wayfinderBeaconCrest = MeshBuilder.CreatePolyhedron(
      "wayfinderBeaconCrest",
      { type: 1, size: 0.34 },
      scene
    );
    wayfinderBeaconCrest.position.set(0, 2.35, 0);
    wayfinderBeaconCrest.scaling.set(0.9, 1.45, 0.9);
    wayfinderBeaconCrest.material = wayfinderGoldMat;
    wayfinderBeaconCrest.isPickable = false;
    wayfinderBeaconCrest.parent = wayfinderBeaconNode;
    wayfinderBeaconNode.setEnabled(false);

    // --- 3D ANCIENT RUNIC WARP MONOLITH (FAST-TRAVEL LANDMARK IN EVERY ZONE) ---
    const warpDormantMat = makeMat(
      "warpDormantMat",
      new Color3(0.42, 0.46, 0.56),
      new Color3(0.14, 0.16, 0.24),
      new Color3(0.6, 0.65, 0.75)
    );
    const warpAwakenedMat = makeMat(
      "warpAwakenedMat",
      new Color3(0.32, 0.94, 1.0),
      new Color3(0.18, 0.78, 0.98),
      new Color3(1.0, 1.0, 1.0)
    );
    const warpBeamMat = makeMat(
      "warpBeamMat",
      new Color3(0.45, 0.96, 1.0),
      new Color3(0.32, 0.85, 1.0),
      new Color3(0, 0, 0),
      0.34
    );

    const warpMonolithNode = new TransformNode("warpMonolithNode", scene);
    const warpDaisOuter = MeshBuilder.CreateCylinder(
      "warpDaisOuter",
      { diameterTop: 3.1, diameterBottom: 3.6, height: 0.24, tessellation: 16 },
      scene
    );
    warpDaisOuter.position.set(0, 0.12, 0);
    warpDaisOuter.material = dgPillarMat;
    warpDaisOuter.isPickable = false;
    warpDaisOuter.parent = warpMonolithNode;

    const warpDaisInner = MeshBuilder.CreateCylinder(
      "warpDaisInner",
      { diameterTop: 2.1, diameterBottom: 2.4, height: 0.28, tessellation: 12 },
      scene
    );
    warpDaisInner.position.set(0, 0.36, 0);
    warpDaisInner.material = darkObsidianMat;
    warpDaisInner.isPickable = false;
    warpDaisInner.parent = warpMonolithNode;

    const warpObelisk = MeshBuilder.CreateCylinder(
      "warpObelisk",
      { diameterTop: 0.68, diameterBottom: 1.15, height: 2.35, tessellation: 8 },
      scene
    );
    warpObelisk.position.set(0, 1.55, 0);
    warpObelisk.material = darkObsidianMat;
    warpObelisk.isPickable = false;
    warpObelisk.parent = warpMonolithNode;

    const warpGroundSigil = MeshBuilder.CreateTorus(
      "warpGroundSigil",
      { diameter: 3.4, thickness: 0.095, tessellation: 28 },
      scene
    );
    warpGroundSigil.position.set(0, 0.14, 0);
    warpGroundSigil.material = warpAwakenedMat;
    warpGroundSigil.isPickable = false;
    warpGroundSigil.parent = warpMonolithNode;

    const warpCoreMesh = MeshBuilder.CreatePolyhedron(
      "warpCoreMesh",
      { type: 1, size: 0.44 },
      scene
    );
    warpCoreMesh.position.set(0, 3.3, 0);
    warpCoreMesh.scaling.set(0.88, 1.48, 0.88);
    warpCoreMesh.material = warpAwakenedMat;
    warpCoreMesh.isPickable = false;
    warpCoreMesh.parent = warpMonolithNode;

    const warpRingOuter = MeshBuilder.CreateTorus(
      "warpRingOuter",
      { diameter: 1.55, thickness: 0.075, tessellation: 24 },
      scene
    );
    warpRingOuter.position.set(0, 3.3, 0);
    warpRingOuter.rotation.x = Math.PI / 3;
    warpRingOuter.material = goldKeyMat;
    warpRingOuter.isPickable = false;
    warpRingOuter.parent = warpMonolithNode;

    const warpRingInner = MeshBuilder.CreateTorus(
      "warpRingInner",
      { diameter: 1.12, thickness: 0.065, tessellation: 20 },
      scene
    );
    warpRingInner.position.set(0, 3.3, 0);
    warpRingInner.rotation.z = Math.PI / 3;
    warpRingInner.material = warpAwakenedMat;
    warpRingInner.isPickable = false;
    warpRingInner.parent = warpMonolithNode;

    const warpBeamCylinder = MeshBuilder.CreateCylinder(
      "warpBeamCylinder",
      { diameterTop: 1.4, diameterBottom: 2.2, height: 11.5, tessellation: 20 },
      scene
    );
    warpBeamCylinder.position.set(0, 5.75, 0);
    warpBeamCylinder.material = warpBeamMat;
    warpBeamCylinder.isPickable = false;
    warpBeamCylinder.setEnabled(false);
    warpBeamCylinder.parent = warpMonolithNode;

    // =========================================================
    // 3D MASTER BLACKSMITH FORGE HEARTH, RUNIC ANVIL & TORVIN (MAP 1 OVERWORLD)
    // =========================================================
    const forgeAnvilNode = new TransformNode("forgeAnvilNode", scene);
    forgeAnvilNode.position.set(FORGE_ANVIL_POS.x, 0, FORGE_ANVIL_POS.z);

    const forgeIronMat = makeMat(
      "forgeIronMat",
      new Color3(0.22, 0.24, 0.29),
      new Color3(0.05, 0.06, 0.08),
      new Color3(0.55, 0.58, 0.65)
    );
    const forgeEmberMat = makeMat(
      "forgeEmberMat",
      new Color3(1.0, 0.42, 0.12),
      new Color3(0.95, 0.32, 0.06),
      new Color3(1.0, 0.85, 0.5)
    );
    const forgeRuneRingMat = makeMat(
      "forgeRuneRingMat",
      new Color3(1.0, 0.78, 0.25),
      new Color3(0.85, 0.55, 0.12),
      new Color3(1.0, 0.95, 0.75)
    );
    const lightningArcMat = makeMat(
      "lightningArcMat",
      new Color3(0.45, 0.95, 1.0),
      new Color3(0.35, 0.88, 1.0),
      new Color3(1.0, 1.0, 1.0)
    );

    const forgePad = MeshBuilder.CreateCylinder(
      "forgePad",
      { diameterTop: 3.4, diameterBottom: 3.8, height: 0.22, tessellation: 12 },
      scene
    );
    forgePad.position.set(0, 0.11, 0);
    forgePad.material = ruinMat;
    forgePad.isPickable = false;
    forgePad.parent = forgeAnvilNode;

    // Stone Hearth & Glowing Coal Bed (Behind Anvil)
    const forgeHearth = MeshBuilder.CreateBox(
      "forgeHearth",
      { width: 1.9, height: 1.15, depth: 1.2 },
      scene
    );
    forgeHearth.position.set(-0.65, 0.68, 0.85);
    forgeHearth.material = dgWallMat;
    forgeHearth.isPickable = false;
    forgeHearth.parent = forgeAnvilNode;

    const forgeChimney = MeshBuilder.CreateBox(
      "forgeChimney",
      { width: 1.1, height: 1.6, depth: 0.85 },
      scene
    );
    forgeChimney.position.set(-0.65, 1.95, 0.95);
    forgeChimney.material = dgWallMat;
    forgeChimney.isPickable = false;
    forgeChimney.parent = forgeAnvilNode;

    const forgeCoals = MeshBuilder.CreateCylinder(
      "forgeCoals",
      { diameterTop: 1.05, diameterBottom: 1.2, height: 0.25, tessellation: 10 },
      scene
    );
    forgeCoals.position.set(-0.65, 1.28, 0.78);
    forgeCoals.material = forgeEmberMat;
    forgeCoals.isPickable = false;
    forgeCoals.parent = forgeAnvilNode;

    // Oak Stump & Heavy Iron Runic Anvil (Center)
    const anvilStump = MeshBuilder.CreateCylinder(
      "anvilStump",
      { diameterTop: 0.92, diameterBottom: 1.04, height: 0.68, tessellation: 10 },
      scene
    );
    anvilStump.position.set(0.35, 0.45, -0.15);
    anvilStump.material = cliffMat;
    anvilStump.isPickable = false;
    anvilStump.parent = forgeAnvilNode;

    const anvilBase = MeshBuilder.CreateBox(
      "anvilBase",
      { width: 0.95, height: 0.34, depth: 0.56 },
      scene
    );
    anvilBase.position.set(0.35, 0.95, -0.15);
    anvilBase.material = forgeIronMat;
    anvilBase.isPickable = false;
    anvilBase.parent = forgeAnvilNode;

    const anvilHorn = MeshBuilder.CreateCylinder(
      "anvilHorn",
      { diameterTop: 0.06, diameterBottom: 0.36, height: 0.55, tessellation: 10 },
      scene
    );
    anvilHorn.rotation.z = -Math.PI / 2;
    anvilHorn.position.set(0.95, 0.98, -0.15);
    anvilHorn.material = forgeIronMat;
    anvilHorn.isPickable = false;
    anvilHorn.parent = forgeAnvilNode;

    const forgeFloatingRuneRing = MeshBuilder.CreateTorus(
      "forgeFloatingRuneRing",
      { diameter: 1.25, thickness: 0.06, tessellation: 20 },
      scene
    );
    forgeFloatingRuneRing.position.set(0.35, 1.48, -0.15);
    forgeFloatingRuneRing.material = forgeRuneRingMat;
    forgeFloatingRuneRing.isPickable = false;
    forgeFloatingRuneRing.parent = forgeAnvilNode;

    // Master Smith Torvin (Standing by the Anvil)
    const smithBody = MeshBuilder.CreateCylinder(
      "smithBody",
      { diameterTop: 0.62, diameterBottom: 0.78, height: 1.05, tessellation: 10 },
      scene
    );
    smithBody.position.set(1.15, 0.72, 0.55);
    smithBody.material = forgeEmberMat;
    smithBody.isPickable = false;
    smithBody.parent = forgeAnvilNode;

    const smithHead = MeshBuilder.CreateSphere(
      "smithHead",
      { diameter: 0.52, segments: 10 },
      scene
    );
    smithHead.position.set(1.15, 1.45, 0.55);
    smithHead.material = skinMat;
    smithHead.isPickable = false;
    smithHead.parent = forgeAnvilNode;

    const smithArmNode = new TransformNode("smithArmNode", scene);
    smithArmNode.position.set(0.85, 1.15, 0.35);
    smithArmNode.parent = forgeAnvilNode;

    const smithHammerHead = MeshBuilder.CreateBox(
      "smithHammerHead",
      { width: 0.28, height: 0.22, depth: 0.44 },
      scene
    );
    smithHammerHead.position.set(0, 0.35, -0.25);
    smithHammerHead.material = forgeIronMat;
    smithHammerHead.isPickable = false;
    smithHammerHead.parent = smithArmNode;

    // 3D Chain-Lightning Arc Mesh Pool (8 reusable electric bolts)
    const lightningArcPool: Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const bolt = MeshBuilder.CreateBox(
        `lightningArcBolt-${i}`,
        { width: 0.14, height: 0.14, depth: 1.0 },
        scene
      );
      bolt.material = lightningArcMat;
      bolt.isPickable = false;
      bolt.setEnabled(false);
      lightningArcPool.push(bolt);
    }

    // =========================================================
    // 3D ABYSSAL RIFT OBELISK (VILLAGE OVERWORLD) & PROCEDURAL DUNGEON LANDMARKS
    // =========================================================
    const riftVioletMat = makeMat(
      "riftVioletMat",
      new Color3(0.76, 0.28, 1.0),
      new Color3(0.62, 0.18, 0.92),
      new Color3(1.0, 0.85, 1.0)
    );
    const riftVortexDiscMat = makeMat(
      "riftVortexDiscMat",
      new Color3(0.58, 0.16, 0.88),
      new Color3(0.45, 0.1, 0.78),
      new Color3(0, 0, 0),
      0.58
    );
    const riftShrineGlowMat = makeMat(
      "riftShrineGlowMat",
      new Color3(0.32, 0.98, 0.78),
      new Color3(0.22, 0.86, 0.64),
      new Color3(0.95, 1.0, 0.98)
    );

    // 1. Overworld Abyssal Rift Obelisk & Swirling Vortex (`RIFT_ENTRANCE_POS = 12.2, -13.5`)
    const riftEntranceNode = new TransformNode("riftEntranceNode", scene);
    riftEntranceNode.position.set(RIFT_ENTRANCE_POS.x, 0, RIFT_ENTRANCE_POS.z);

    const riftObeliskPad = MeshBuilder.CreateCylinder(
      "riftObeliskPad",
      { diameterTop: 3.4, diameterBottom: 3.9, height: 0.24, tessellation: 14 },
      scene
    );
    riftObeliskPad.position.set(0, 0.12, 0);
    riftObeliskPad.material = darkObsidianMat;
    riftObeliskPad.isPickable = false;
    riftObeliskPad.parent = riftEntranceNode;

    for (const side of [-1, 1]) {
      const hornPillar = MeshBuilder.CreateCylinder(
        `riftHornPillar-${side}`,
        { diameterTop: 0.36, diameterBottom: 0.72, height: 2.85, tessellation: 8 },
        scene
      );
      hornPillar.position.set(side * 1.18, 1.48, 0);
      hornPillar.rotation.z = side * -0.14;
      hornPillar.material = darkObsidianMat;
      hornPillar.isPickable = false;
      hornPillar.parent = riftEntranceNode;

      const hornCrystal = MeshBuilder.CreatePolyhedron(
        `riftHornCrystal-${side}`,
        { type: 1, size: 0.26 },
        scene
      );
      hornCrystal.position.set(side * 0.98, 2.98, 0);
      hornCrystal.scaling.set(0.85, 1.5, 0.85);
      hornCrystal.material = riftVioletMat;
      hornCrystal.isPickable = false;
      hornCrystal.parent = riftEntranceNode;
    }

    const riftVortexDisc = MeshBuilder.CreateCylinder(
      "riftVortexDisc",
      { diameter: 1.85, height: 0.08, tessellation: 24 },
      scene
    );
    riftVortexDisc.rotation.x = Math.PI / 2;
    riftVortexDisc.position.set(0, 1.65, 0);
    riftVortexDisc.material = riftVortexDiscMat;
    riftVortexDisc.isPickable = false;
    riftVortexDisc.parent = riftEntranceNode;

    const riftOuterRing = MeshBuilder.CreateTorus(
      "riftOuterRing",
      { diameter: 2.1, thickness: 0.11, tessellation: 28 },
      scene
    );
    riftOuterRing.rotation.x = Math.PI / 2;
    riftOuterRing.position.set(0, 1.65, 0);
    riftOuterRing.material = riftVioletMat;
    riftOuterRing.isPickable = false;
    riftOuterRing.parent = riftEntranceNode;

    const riftGroundHalo = MeshBuilder.CreateTorus(
      "riftGroundHalo",
      { diameter: 3.55, thickness: 0.09, tessellation: 28 },
      scene
    );
    riftGroundHalo.position.set(0, 0.14, 0);
    riftGroundHalo.material = riftVioletMat;
    riftGroundHalo.isPickable = false;
    riftGroundHalo.parent = riftEntranceNode;

    // 1b. Overworld Spirit Companion Sanctuary & Ancient Relic Altar (`COMPANION_ALTAR_POS = -12.2, -13.5`)
    const companionAltarNode = new TransformNode("companionAltarNode", scene);
    companionAltarNode.position.set(COMPANION_ALTAR_POS.x, 0, COMPANION_ALTAR_POS.z);

    const altarDais = MeshBuilder.CreateCylinder(
      "companionAltarDais",
      { diameterTop: 3.3, diameterBottom: 3.8, height: 0.24, tessellation: 14 },
      scene
    );
    altarDais.position.set(0, 0.12, 0);
    altarDais.material = ruinMat;
    altarDais.isPickable = false;
    altarDais.parent = companionAltarNode;

    const altarPedestal = MeshBuilder.CreateCylinder(
      "companionAltarPedestal",
      { diameterTop: 1.15, diameterBottom: 1.45, height: 1.25, tessellation: 12 },
      scene
    );
    altarPedestal.position.set(0, 0.72, 0);
    altarPedestal.material = dgPillarMat;
    altarPedestal.isPickable = false;
    altarPedestal.parent = companionAltarNode;

    const altarOrb = MeshBuilder.CreatePolyhedron(
      "companionAltarOrb",
      { type: 1, size: 0.44 },
      scene
    );
    altarOrb.position.set(0, 2.05, 0);
    altarOrb.material = riftShrineGlowMat;
    altarOrb.isPickable = false;
    altarOrb.parent = companionAltarNode;

    const altarOrbitRing = MeshBuilder.CreateTorus(
      "companionAltarOrbitRing",
      { diameter: 1.65, thickness: 0.08, tessellation: 24 },
      scene
    );
    altarOrbitRing.position.set(0, 2.05, 0);
    altarOrbitRing.rotation.x = Math.PI / 3;
    altarOrbitRing.material = goldKeyMat;
    altarOrbitRing.isPickable = false;
    altarOrbitRing.parent = companionAltarNode;

    const altarGroundHalo = MeshBuilder.CreateTorus(
      "companionAltarGroundHalo",
      { diameter: 3.45, thickness: 0.09, tessellation: 28 },
      scene
    );
    altarGroundHalo.position.set(0, 0.14, 0);
    altarGroundHalo.material = riftShrineGlowMat;
    altarGroundHalo.isPickable = false;
    altarGroundHalo.parent = companionAltarNode;

    // 1c. 3D Elemental Spirit Companion Rig (`companionRoot` — Orbits / Follows the Hero!)
    const companionRoot = new TransformNode("companionRoot", scene);
    companionRoot.setEnabled(false);

    // Companion 1: Ember Phoenix (`ember_phoenix`)
    const phoenixNode = new TransformNode("phoenixNode", scene);
    phoenixNode.parent = companionRoot;
    const phoenixBody = MeshBuilder.CreateSphere(
      "phoenixBody",
      { diameter: 0.56, segments: 12 },
      scene
    );
    phoenixBody.scaling.set(0.85, 0.85, 1.35);
    phoenixBody.material = forgeEmberMat;
    phoenixBody.isPickable = false;
    phoenixBody.parent = phoenixNode;

    const phoenixWingL = MeshBuilder.CreateBox(
      "phoenixWingL",
      { width: 0.65, height: 0.05, depth: 0.34 },
      scene
    );
    phoenixWingL.position.set(-0.38, 0.08, 0);
    phoenixWingL.material = goldKeyMat;
    phoenixWingL.isPickable = false;
    phoenixWingL.parent = phoenixNode;

    const phoenixWingR = MeshBuilder.CreateBox(
      "phoenixWingR",
      { width: 0.65, height: 0.05, depth: 0.34 },
      scene
    );
    phoenixWingR.position.set(0.38, 0.08, 0);
    phoenixWingR.material = goldKeyMat;
    phoenixWingR.isPickable = false;
    phoenixWingR.parent = phoenixNode;

    // Companion 2: Frost Owl (`frost_owl`)
    const owlNode = new TransformNode("owlNode", scene);
    owlNode.parent = companionRoot;
    const owlBody = MeshBuilder.CreateSphere(
      "owlBody",
      { diameter: 0.58, segments: 12 },
      scene
    );
    owlBody.scaling.set(0.95, 1.15, 0.95);
    owlBody.material = warpAwakenedMat;
    owlBody.isPickable = false;
    owlBody.parent = owlNode;

    const owlWingL = MeshBuilder.CreateBox(
      "owlWingL",
      { width: 0.58, height: 0.05, depth: 0.36 },
      scene
    );
    owlWingL.position.set(-0.36, 0.05, 0);
    owlWingL.material = whiteEyeMat;
    owlWingL.isPickable = false;
    owlWingL.parent = owlNode;

    const owlWingR = MeshBuilder.CreateBox(
      "owlWingR",
      { width: 0.58, height: 0.05, depth: 0.36 },
      scene
    );
    owlWingR.position.set(0.36, 0.05, 0);
    owlWingR.material = whiteEyeMat;
    owlWingR.isPickable = false;
    owlWingR.parent = owlNode;

    // Companion 3: Storm Wolf (`storm_wolf`)
    const wolfNode = new TransformNode("wolfNode", scene);
    wolfNode.parent = companionRoot;
    const wolfBody = MeshBuilder.CreateBox(
      "wolfBody",
      { width: 0.44, height: 0.42, depth: 0.82 },
      scene
    );
    wolfBody.material = riftVioletMat;
    wolfBody.isPickable = false;
    wolfBody.parent = wolfNode;

    const wolfHead = MeshBuilder.CreateBox(
      "wolfHead",
      { width: 0.36, height: 0.34, depth: 0.38 },
      scene
    );
    wolfHead.position.set(0, 0.22, 0.42);
    wolfHead.material = lightningArcMat;
    wolfHead.isPickable = false;
    wolfHead.parent = wolfNode;

    // Companion 4: Treasure Sprite (`gold_sprite`)
    const spriteNode = new TransformNode("spriteNode", scene);
    spriteNode.parent = companionRoot;
    const spriteCore = MeshBuilder.CreatePolyhedron(
      "spriteCore",
      { type: 1, size: 0.28 },
      scene
    );
    spriteCore.material = goldKeyMat;
    spriteCore.isPickable = false;
    spriteCore.parent = spriteNode;

    const spriteHalo = MeshBuilder.CreateTorus(
      "spriteHalo",
      { diameter: 0.78, thickness: 0.05, tessellation: 20 },
      scene
    );
    spriteHalo.rotation.x = Math.PI / 3;
    spriteHalo.material = riftShrineGlowMat;
    spriteHalo.isPickable = false;
    spriteHalo.parent = spriteNode;

    // 1d. Overworld Crossroads Royal Stables (`MOUNT_STABLES_POS = -11.5, -31.8`)
    const mountStablesNode = new TransformNode("mountStablesNode", scene);
    mountStablesNode.position.set(MOUNT_STABLES_POS.x, 0, MOUNT_STABLES_POS.z);

    const stablesPad = MeshBuilder.CreateCylinder(
      "mountStablesPad",
      { diameterTop: 4.1, diameterBottom: 4.6, height: 0.22, tessellation: 14 },
      scene
    );
    stablesPad.position.set(0, 0.11, 0);
    stablesPad.material = ruinMat;
    stablesPad.isPickable = false;
    stablesPad.parent = mountStablesNode;

    for (const px of [-1.45, 1.45]) {
      for (const pz of [-1.15, 1.15]) {
        const post = MeshBuilder.CreateCylinder(
          `stablesPost-${px}-${pz}`,
          { diameter: 0.24, height: 2.35, tessellation: 8 },
          scene
        );
        post.position.set(px, 1.25, pz);
        post.material = woodMat;
        post.isPickable = false;
        post.parent = mountStablesNode;
      }
    }

    const stablesRoof = MeshBuilder.CreateCylinder(
      "mountStablesRoof",
      { diameterTop: 0.25, diameterBottom: 4.4, height: 1.35, tessellation: 4 },
      scene
    );
    stablesRoof.position.set(0, 2.95, 0);
    stablesRoof.rotation.y = Math.PI / 4;
    stablesRoof.material = clayPotMat;
    stablesRoof.isPickable = false;
    stablesRoof.parent = mountStablesNode;

    const stablesHorseshoeCrest = MeshBuilder.CreateTorus(
      "stablesHorseshoeCrest",
      { diameter: 0.92, thickness: 0.14, tessellation: 20 },
      scene
    );
    stablesHorseshoeCrest.position.set(0, 3.55, 0);
    stablesHorseshoeCrest.rotation.x = Math.PI / 2;
    stablesHorseshoeCrest.material = goldKeyMat;
    stablesHorseshoeCrest.isPickable = false;
    stablesHorseshoeCrest.parent = mountStablesNode;

    const stablesTrough = MeshBuilder.CreateBox(
      "stablesTrough",
      { width: 1.35, height: 0.42, depth: 0.58 },
      scene
    );
    stablesTrough.position.set(-0.85, 0.38, 0.65);
    stablesTrough.material = woodMat;
    stablesTrough.isPickable = false;
    stablesTrough.parent = mountStablesNode;

    const stablesWater = MeshBuilder.CreateBox(
      "stablesWater",
      { width: 1.18, height: 0.08, depth: 0.44 },
      scene
    );
    stablesWater.position.set(-0.85, 0.58, 0.65);
    stablesWater.material = warpAwakenedMat;
    stablesWater.isPickable = false;
    stablesWater.parent = mountStablesNode;

    const stablesHayBale = MeshBuilder.CreateBox(
      "stablesHayBale",
      { width: 0.92, height: 0.56, depth: 0.64 },
      scene
    );
    stablesHayBale.position.set(0.95, 0.46, 0.72);
    stablesHayBale.material = goldKeyMat;
    stablesHayBale.isPickable = false;
    stablesHayBale.parent = mountStablesNode;

    // Stablemaster Garrick NPC standing at the Stables
    const garrickBody = MeshBuilder.CreateCylinder(
      "garrickBody",
      { diameterTop: 0.58, diameterBottom: 0.74, height: 1.05, tessellation: 10 },
      scene
    );
    garrickBody.position.set(1.25, 0.72, -0.55);
    garrickBody.material = clayRimMat;
    garrickBody.isPickable = false;
    garrickBody.parent = mountStablesNode;

    const garrickHead = MeshBuilder.CreateSphere(
      "garrickHead",
      { diameter: 0.5, segments: 10 },
      scene
    );
    garrickHead.position.set(1.25, 1.44, -0.55);
    garrickHead.material = skinMat;
    garrickHead.isPickable = false;
    garrickHead.parent = mountStablesNode;

    const garrickBrim = MeshBuilder.CreateCylinder(
      "garrickBrim",
      { diameter: 0.86, height: 0.08, tessellation: 12 },
      scene
    );
    garrickBrim.position.set(1.25, 1.68, -0.55);
    garrickBrim.material = woodMat;
    garrickBrim.isPickable = false;
    garrickBrim.parent = mountStablesNode;

    const stablesGroundHalo = MeshBuilder.CreateTorus(
      "stablesGroundHalo",
      { diameter: 3.9, thickness: 0.09, tessellation: 28 },
      scene
    );
    stablesGroundHalo.position.set(0, 0.14, 0);
    stablesGroundHalo.material = goldKeyMat;
    stablesGroundHalo.isPickable = false;
    stablesGroundHalo.parent = mountStablesNode;

    // 1f. Overworld Grand Colosseum War-Gate & Horn Monument (`COLOSSEUM_GATE_POS = -6.2, -13.5`)
    const colosseumGateNode = new TransformNode("colosseumGateNode", scene);
    colosseumGateNode.position.set(COLOSSEUM_GATE_POS.x, 0, COLOSSEUM_GATE_POS.z);

    const colosseumPad = MeshBuilder.CreateCylinder(
      "colosseumPad",
      { diameterTop: 3.4, diameterBottom: 3.9, height: 0.24, tessellation: 14 },
      scene
    );
    colosseumPad.position.set(0, 0.12, 0);
    colosseumPad.material = darkObsidianMat;
    colosseumPad.isPickable = false;
    colosseumPad.parent = colosseumGateNode;

    for (const side of [-1, 1]) {
      const colPillar = MeshBuilder.CreateCylinder(
        `colosseumPillar-${side}`,
        { diameterTop: 0.48, diameterBottom: 0.62, height: 2.65, tessellation: 10 },
        scene
      );
      colPillar.position.set(side * 1.15, 1.38, 0);
      colPillar.material = dgPillarMat;
      colPillar.isPickable = false;
      colPillar.parent = colosseumGateNode;

      const colBrazier = MeshBuilder.CreatePolyhedron(
        `colosseumBrazier-${side}`,
        { type: 1, size: 0.24 },
        scene
      );
      colBrazier.position.set(side * 1.15, 2.86, 0);
      colBrazier.material = forgeEmberMat;
      colBrazier.isPickable = false;
      colBrazier.parent = colosseumGateNode;
    }

    const colosseumArch = MeshBuilder.CreateBox(
      "colosseumArch",
      { width: 2.95, height: 0.34, depth: 0.56 },
      scene
    );
    colosseumArch.position.set(0, 2.62, 0);
    colosseumArch.material = goldKeyMat;
    colosseumArch.isPickable = false;
    colosseumArch.parent = colosseumGateNode;

    const colosseumCrown = MeshBuilder.CreateTorus(
      "colosseumCrown",
      { diameter: 1.08, thickness: 0.14, tessellation: 18 },
      scene
    );
    colosseumCrown.position.set(0, 1.72, 0);
    colosseumCrown.rotation.x = Math.PI / 2;
    colosseumCrown.material = forgeEmberMat;
    colosseumCrown.isPickable = false;
    colosseumCrown.parent = colosseumGateNode;

    const colosseumGroundHalo = MeshBuilder.CreateTorus(
      "colosseumGroundHalo",
      { diameter: 3.55, thickness: 0.09, tessellation: 28 },
      scene
    );
    colosseumGroundHalo.position.set(0, 0.14, 0);
    colosseumGroundHalo.material = forgeEmberMat;
    colosseumGroundHalo.isPickable = false;
    colosseumGroundHalo.parent = colosseumGateNode;

    // 1e. 3D Summonable Steed Rig (`heroMountNode` — Sun-Mane Courser, Glacial Dire-Stag, Obsidian War-Drake)
    const heroMountNode = new TransformNode("heroMountNode", scene);
    heroMountNode.setEnabled(false);

    const courserCoatMat = makeMat(
      "courserCoatMat",
      new Color3(0.92, 0.68, 0.24),
      new Color3(0.28, 0.18, 0.04),
      new Color3(0.95, 0.85, 0.55)
    );
    const stagCoatMat = makeMat(
      "stagCoatMat",
      new Color3(0.74, 0.94, 1.0),
      new Color3(0.22, 0.58, 0.82),
      new Color3(1.0, 1.0, 1.0)
    );
    const drakeScaleMat = makeMat(
      "drakeScaleMat",
      new Color3(0.24, 0.14, 0.28),
      new Color3(0.12, 0.04, 0.14),
      new Color3(0.85, 0.35, 0.45)
    );

    // Shared Saddle & 4 Articulated Steed Legs
    const mountSaddle = MeshBuilder.CreateBox(
      "mountSaddle",
      { width: 0.82, height: 0.22, depth: 0.78 },
      scene
    );
    mountSaddle.position.set(0, 1.08, -0.05);
    mountSaddle.material = clayRimMat;
    mountSaddle.isPickable = false;
    mountSaddle.parent = heroMountNode;

    const mountLegFL = MeshBuilder.CreateCylinder(
      "mountLegFL",
      { diameterTop: 0.22, diameterBottom: 0.16, height: 0.78, tessellation: 8 },
      scene
    );
    mountLegFL.position.set(-0.34, 0.39, 0.62);
    mountLegFL.material = woodMat;
    mountLegFL.isPickable = false;
    mountLegFL.parent = heroMountNode;

    const mountLegFR = MeshBuilder.CreateCylinder(
      "mountLegFR",
      { diameterTop: 0.22, diameterBottom: 0.16, height: 0.78, tessellation: 8 },
      scene
    );
    mountLegFR.position.set(0.34, 0.39, 0.62);
    mountLegFR.material = woodMat;
    mountLegFR.isPickable = false;
    mountLegFR.parent = heroMountNode;

    const mountLegBL = MeshBuilder.CreateCylinder(
      "mountLegBL",
      { diameterTop: 0.24, diameterBottom: 0.16, height: 0.78, tessellation: 8 },
      scene
    );
    mountLegBL.position.set(-0.34, 0.39, -0.62);
    mountLegBL.material = woodMat;
    mountLegBL.isPickable = false;
    mountLegBL.parent = heroMountNode;

    const mountLegBR = MeshBuilder.CreateCylinder(
      "mountLegBR",
      { diameterTop: 0.24, diameterBottom: 0.16, height: 0.78, tessellation: 8 },
      scene
    );
    mountLegBR.position.set(0.34, 0.39, -0.62);
    mountLegBR.material = woodMat;
    mountLegBR.isPickable = false;
    mountLegBR.parent = heroMountNode;

    // Steed 1: Sun-Mane Courser (`sun_courser`)
    const sunCourserNode = new TransformNode("sunCourserNode", scene);
    sunCourserNode.parent = heroMountNode;
    {
      const body = MeshBuilder.CreateBox(
        "courserBody",
        { width: 0.86, height: 0.68, depth: 1.68 },
        scene
      );
      body.position.set(0, 0.82, 0);
      body.material = courserCoatMat;
      body.isPickable = false;
      body.parent = sunCourserNode;

      const neck = MeshBuilder.CreateCylinder(
        "courserNeck",
        { diameterTop: 0.38, diameterBottom: 0.54, height: 0.86, tessellation: 10 },
        scene
      );
      neck.position.set(0, 1.32, 0.72);
      neck.rotation.x = 0.42;
      neck.material = courserCoatMat;
      neck.isPickable = false;
      neck.parent = sunCourserNode;

      const head = MeshBuilder.CreateBox(
        "courserHead",
        { width: 0.42, height: 0.38, depth: 0.68 },
        scene
      );
      head.position.set(0, 1.66, 1.05);
      head.rotation.x = 0.22;
      head.material = courserCoatMat;
      head.isPickable = false;
      head.parent = sunCourserNode;

      const mane = MeshBuilder.CreateBox(
        "courserMane",
        { width: 0.16, height: 0.75, depth: 0.26 },
        scene
      );
      mane.position.set(0, 1.42, 0.56);
      mane.rotation.x = 0.42;
      mane.material = goldKeyMat;
      mane.isPickable = false;
      mane.parent = sunCourserNode;

      const tail = MeshBuilder.CreateCylinder(
        "courserTail",
        { diameterTop: 0.14, diameterBottom: 0.32, height: 0.82, tessellation: 8 },
        scene
      );
      tail.position.set(0, 0.74, -1.04);
      tail.rotation.x = -0.58;
      tail.material = goldKeyMat;
      tail.isPickable = false;
      tail.parent = sunCourserNode;
    }

    const courserAuraRing = MeshBuilder.CreateTorus(
      "courserAuraRing",
      { diameter: 2.35, thickness: 0.075, tessellation: 24 },
      scene
    );
    courserAuraRing.position.set(0, 0.08, 0);
    courserAuraRing.material = goldKeyMat;
    courserAuraRing.isPickable = false;
    courserAuraRing.parent = sunCourserNode;

    // Steed 2: Glacial Dire-Stag (`frost_stag`)
    const frostStagNode = new TransformNode("frostStagNode", scene);
    frostStagNode.parent = heroMountNode;
    {
      const body = MeshBuilder.CreateBox(
        "stagBody",
        { width: 0.82, height: 0.66, depth: 1.64 },
        scene
      );
      body.position.set(0, 0.82, 0);
      body.material = stagCoatMat;
      body.isPickable = false;
      body.parent = frostStagNode;

      const neck = MeshBuilder.CreateCylinder(
        "stagNeck",
        { diameterTop: 0.34, diameterBottom: 0.5, height: 0.92, tessellation: 10 },
        scene
      );
      neck.position.set(0, 1.36, 0.7);
      neck.rotation.x = 0.32;
      neck.material = stagCoatMat;
      neck.isPickable = false;
      neck.parent = frostStagNode;

      const head = MeshBuilder.CreateBox(
        "stagHead",
        { width: 0.38, height: 0.36, depth: 0.64 },
        scene
      );
      head.position.set(0, 1.72, 0.98);
      head.rotation.x = 0.18;
      head.material = stagCoatMat;
      head.isPickable = false;
      head.parent = frostStagNode;

      for (const side of [-1, 1]) {
        const antlerMain = MeshBuilder.CreateCylinder(
          `stagAntlerMain-${side}`,
          { diameterTop: 0.04, diameterBottom: 0.12, height: 0.92, tessellation: 8 },
          scene
        );
        antlerMain.position.set(side * 0.32, 2.18, 0.86);
        antlerMain.rotation.z = side * -0.46;
        antlerMain.rotation.x = -0.22;
        antlerMain.material = warpAwakenedMat;
        antlerMain.isPickable = false;
        antlerMain.parent = frostStagNode;

        const antlerTine = MeshBuilder.CreateCylinder(
          `stagAntlerTine-${side}`,
          { diameterTop: 0.03, diameterBottom: 0.09, height: 0.54, tessellation: 8 },
          scene
        );
        antlerTine.position.set(side * 0.48, 2.28, 1.06);
        antlerTine.rotation.z = side * -0.25;
        antlerTine.rotation.x = 0.45;
        antlerTine.material = warpAwakenedMat;
        antlerTine.isPickable = false;
        antlerTine.parent = frostStagNode;
      }
    }

    const stagFrostRing = MeshBuilder.CreateTorus(
      "stagFrostRing",
      { diameter: 2.45, thickness: 0.085, tessellation: 24 },
      scene
    );
    stagFrostRing.position.set(0, 0.08, 0);
    stagFrostRing.material = warpAwakenedMat;
    stagFrostRing.isPickable = false;
    stagFrostRing.parent = frostStagNode;

    // Steed 3: Obsidian War-Drake (`war_drake`)
    const warDrakeNode = new TransformNode("warDrakeNode", scene);
    warDrakeNode.parent = heroMountNode;
    {
      const body = MeshBuilder.CreateBox(
        "drakeBody",
        { width: 0.98, height: 0.72, depth: 1.82 },
        scene
      );
      body.position.set(0, 0.84, 0);
      body.material = drakeScaleMat;
      body.isPickable = false;
      body.parent = warDrakeNode;

      const neck = MeshBuilder.CreateCylinder(
        "drakeNeck",
        { diameterTop: 0.44, diameterBottom: 0.62, height: 0.88, tessellation: 10 },
        scene
      );
      neck.position.set(0, 1.32, 0.78);
      neck.rotation.x = 0.48;
      neck.material = drakeScaleMat;
      neck.isPickable = false;
      neck.parent = warDrakeNode;

      const head = MeshBuilder.CreateBox(
        "drakeHead",
        { width: 0.52, height: 0.44, depth: 0.76 },
        scene
      );
      head.position.set(0, 1.62, 1.18);
      head.rotation.x = 0.16;
      head.material = drakeScaleMat;
      head.isPickable = false;
      head.parent = warDrakeNode;

      for (const side of [-1, 1]) {
        const horn = MeshBuilder.CreateCylinder(
          `drakeHorn-${side}`,
          { diameterTop: 0.02, diameterBottom: 0.14, height: 0.58, tessellation: 8 },
          scene
        );
        horn.position.set(side * 0.24, 1.92, 0.96);
        horn.rotation.x = -0.65;
        horn.rotation.z = side * -0.22;
        horn.material = forgeEmberMat;
        horn.isPickable = false;
        horn.parent = warDrakeNode;
      }

      const tail = MeshBuilder.CreateCylinder(
        "drakeTail",
        { diameterTop: 0.08, diameterBottom: 0.42, height: 1.25, tessellation: 8 },
        scene
      );
      tail.position.set(0, 0.68, -1.28);
      tail.rotation.x = -1.15;
      tail.material = drakeScaleMat;
      tail.isPickable = false;
      tail.parent = warDrakeNode;
    }

    const drakeWingL = MeshBuilder.CreateBox(
      "drakeWingL",
      { width: 1.55, height: 0.07, depth: 0.92 },
      scene
    );
    drakeWingL.position.set(-0.98, 1.18, 0.05);
    drakeWingL.material = forgeEmberMat;
    drakeWingL.isPickable = false;
    drakeWingL.parent = warDrakeNode;

    const drakeWingR = MeshBuilder.CreateBox(
      "drakeWingR",
      { width: 1.55, height: 0.07, depth: 0.92 },
      scene
    );
    drakeWingR.position.set(0.98, 1.18, 0.05);
    drakeWingR.material = forgeEmberMat;
    drakeWingR.isPickable = false;
    drakeWingR.parent = warDrakeNode;

    const drakeFlameRing = MeshBuilder.CreateTorus(
      "drakeFlameRing",
      { diameter: 2.6, thickness: 0.095, tessellation: 24 },
      scene
    );
    drakeFlameRing.position.set(0, 0.08, 0);
    drakeFlameRing.material = forgeEmberMat;
    drakeFlameRing.isPickable = false;
    drakeFlameRing.parent = warDrakeNode;

    // 2. Procedural Rift Blessing Shrine (`riftShrineNode`)
    const riftShrineNode = new TransformNode("riftShrineNode", scene);
    riftShrineNode.parent = riftRoot;

    const shrineDais = MeshBuilder.CreateCylinder(
      "riftShrineDais",
      { diameterTop: 2.6, diameterBottom: 3.1, height: 0.34, tessellation: 14 },
      scene
    );
    shrineDais.position.set(0, 0.17, 0);
    shrineDais.material = dgPillarMat;
    shrineDais.isPickable = false;
    shrineDais.parent = riftShrineNode;

    const shrinePillar = MeshBuilder.CreateCylinder(
      "riftShrinePillar",
      { diameterTop: 0.85, diameterBottom: 1.15, height: 1.55, tessellation: 10 },
      scene
    );
    shrinePillar.position.set(0, 0.92, 0);
    shrinePillar.material = darkObsidianMat;
    shrinePillar.isPickable = false;
    shrinePillar.parent = riftShrineNode;

    const riftShrineGem = MeshBuilder.CreatePolyhedron(
      "riftShrineGem",
      { type: 1, size: 0.42 },
      scene
    );
    riftShrineGem.position.set(0, 2.35, 0);
    riftShrineGem.scaling.set(0.9, 1.45, 0.9);
    riftShrineGem.material = riftShrineGlowMat;
    riftShrineGem.isPickable = false;
    riftShrineGem.parent = riftShrineNode;

    const riftShrineRing = MeshBuilder.CreateTorus(
      "riftShrineRing",
      { diameter: 2.4, thickness: 0.1, tessellation: 24 },
      scene
    );
    riftShrineRing.position.set(0, 0.36, 0);
    riftShrineRing.material = riftShrineGlowMat;
    riftShrineRing.isPickable = false;
    riftShrineRing.parent = riftShrineNode;

    // 3. Procedural Rift Vault Chest (`riftVaultChestNode`)
    const riftVaultChestNode = new TransformNode("riftVaultChestNode", scene);
    riftVaultChestNode.parent = riftRoot;

    const rvDais = MeshBuilder.CreateBox(
      "rvDais",
      { width: 3.2, height: 0.32, depth: 2.5 },
      scene
    );
    rvDais.position.set(0, 0.16, 0);
    rvDais.material = dgPillarMat;
    rvDais.isPickable = false;
    rvDais.parent = riftVaultChestNode;

    const rvBase = MeshBuilder.CreateBox(
      "rvBase",
      { width: 1.75, height: 0.88, depth: 1.2 },
      scene
    );
    rvBase.position.set(0, 0.76, 0);
    rvBase.material = darkObsidianMat;
    rvBase.isPickable = false;
    rvBase.parent = riftVaultChestNode;

    const rvTrim = MeshBuilder.CreateBox(
      "rvTrim",
      { width: 1.85, height: 0.2, depth: 1.28 },
      scene
    );
    rvTrim.position.set(0, 1.12, 0);
    rvTrim.material = goldKeyMat;
    rvTrim.isPickable = false;
    rvTrim.parent = riftVaultChestNode;

    const riftVaultChestLid = MeshBuilder.CreateCylinder(
      "riftVaultChestLid",
      { diameter: 1.2, height: 1.78, tessellation: 16 },
      scene
    );
    riftVaultChestLid.rotation.z = Math.PI / 2;
    riftVaultChestLid.position.set(0, 1.24, 0);
    riftVaultChestLid.material = riftVioletMat;
    riftVaultChestLid.isPickable = false;
    riftVaultChestLid.parent = riftVaultChestNode;

    const riftVaultChestRing = MeshBuilder.CreateTorus(
      "riftVaultChestRing",
      { diameter: 2.8, thickness: 0.12, tessellation: 24 },
      scene
    );
    riftVaultChestRing.position.set(0, 0.36, 0);
    riftVaultChestRing.material = goldKeyMat;
    riftVaultChestRing.isPickable = false;
    riftVaultChestRing.parent = riftVaultChestNode;

    const riftVaultRelicNode = new TransformNode("riftVaultRelicNode", scene);
    riftVaultRelicNode.parent = riftVaultChestNode;
    riftVaultRelicNode.position.set(0, 2.15, 0);
    {
      const rvGem = MeshBuilder.CreatePolyhedron(
        "rvRelicGem",
        { type: 1, size: 0.32 },
        scene
      );
      rvGem.material = riftVioletMat;
      rvGem.isPickable = false;
      rvGem.parent = riftVaultRelicNode;
    }

    // 4. Procedural Rift Guardian Hoard Chest (`riftBossChestNode`)
    const riftBossChestNode = new TransformNode("riftBossChestNode", scene);
    riftBossChestNode.parent = riftRoot;

    const rbDais = MeshBuilder.CreateBox(
      "rbDais",
      { width: 3.8, height: 0.38, depth: 2.9 },
      scene
    );
    rbDais.position.set(0, 0.19, 0);
    rbDais.material = dgPillarMat;
    rbDais.isPickable = false;
    rbDais.parent = riftBossChestNode;

    const rbBase = MeshBuilder.CreateBox(
      "rbBase",
      { width: 1.95, height: 0.98, depth: 1.32 },
      scene
    );
    rbBase.position.set(0, 0.86, 0);
    rbBase.material = glowingCrimsonMat;
    rbBase.isPickable = false;
    rbBase.parent = riftBossChestNode;

    const rbTrim = MeshBuilder.CreateBox(
      "rbTrim",
      { width: 2.05, height: 0.22, depth: 1.4 },
      scene
    );
    rbTrim.position.set(0, 1.26, 0);
    rbTrim.material = goldKeyMat;
    rbTrim.isPickable = false;
    rbTrim.parent = riftBossChestNode;

    const riftBossChestLid = MeshBuilder.CreateCylinder(
      "riftBossChestLid",
      { diameter: 1.32, height: 1.96, tessellation: 16 },
      scene
    );
    riftBossChestLid.rotation.z = Math.PI / 2;
    riftBossChestLid.position.set(0, 1.38, 0);
    riftBossChestLid.material = goldKeyMat;
    riftBossChestLid.isPickable = false;
    riftBossChestLid.parent = riftBossChestNode;

    const riftBossChestSealRing = MeshBuilder.CreateTorus(
      "riftBossChestSealRing",
      { diameter: 3.2, thickness: 0.14, tessellation: 26 },
      scene
    );
    riftBossChestSealRing.position.set(0, 0.95, 0);
    riftBossChestSealRing.material = glowingCrimsonMat;
    riftBossChestSealRing.isPickable = false;
    riftBossChestSealRing.parent = riftBossChestNode;

    const riftBossChestUnsealedRing = MeshBuilder.CreateTorus(
      "riftBossChestUnsealedRing",
      { diameter: 3.3, thickness: 0.13, tessellation: 28 },
      scene
    );
    riftBossChestUnsealedRing.position.set(0, 0.45, 0);
    riftBossChestUnsealedRing.material = goldKeyMat;
    riftBossChestUnsealedRing.isPickable = false;
    riftBossChestUnsealedRing.parent = riftBossChestNode;

    const riftBossChestRelicNode = new TransformNode("riftBossChestRelicNode", scene);
    riftBossChestRelicNode.parent = riftBossChestNode;
    riftBossChestRelicNode.position.set(0, 2.45, 0);
    {
      const rbRelicGem = MeshBuilder.CreatePolyhedron(
        "rbRelicGem",
        { type: 1, size: 0.36 },
        scene
      );
      rbRelicGem.material = goldKeyMat;
      rbRelicGem.isPickable = false;
      rbRelicGem.parent = riftBossChestRelicNode;
    }

    // 5. Procedural Rift Next-Floor Descent Portal (`riftDescentPortalNode`)
    const riftDescentPortalNode = new TransformNode("riftDescentPortalNode", scene);
    riftDescentPortalNode.parent = riftRoot;

    const descentDisc = MeshBuilder.CreateCylinder(
      "riftDescentDisc",
      { diameter: 3.2, height: 0.06, tessellation: 28 },
      scene
    );
    descentDisc.position.set(0, 0.04, 0);
    descentDisc.material = riftVortexDiscMat;
    descentDisc.isPickable = false;
    descentDisc.parent = riftDescentPortalNode;

    const descentOuterRing = MeshBuilder.CreateTorus(
      "riftDescentOuterRing",
      { diameter: 3.4, thickness: 0.13, tessellation: 28 },
      scene
    );
    descentOuterRing.position.set(0, 0.12, 0);
    descentOuterRing.material = riftVioletMat;
    descentOuterRing.isPickable = false;
    descentOuterRing.parent = riftDescentPortalNode;

    const descentInnerRing = MeshBuilder.CreateTorus(
      "riftDescentInnerRing",
      { diameter: 2.2, thickness: 0.1, tessellation: 24 },
      scene
    );
    descentInnerRing.position.set(0, 0.28, 0);
    descentInnerRing.material = goldKeyMat;
    descentInnerRing.isPickable = false;
    descentInnerRing.parent = riftDescentPortalNode;

    const descentColumn = MeshBuilder.CreateCylinder(
      "riftDescentColumn",
      { diameterTop: 1.5, diameterBottom: 2.5, height: 8.5, tessellation: 20 },
      scene
    );
    descentColumn.position.set(0, 4.25, 0);
    descentColumn.material = warpBeamMat;
    descentColumn.isPickable = false;
    descentColumn.parent = riftDescentPortalNode;

    // =========================================================
    // DYNAMIC ENEMY, ARROW, PROJECTILE, HAZARD & RUPEE REGISTRIES
    // =========================================================
    const enemyRigs = new Map<string, EnemyMeshRig>();
    const arrowRigs = new Map<string, TransformNode>();
    const projectileRigs = new Map<string, ProjectileVisualRig>();
    const hazardRigs = new Map<string, HazardVisualRig>();
    const rupeeMeshes = new Map<string, Mesh>();

    const greenRupeeMat = makeMat(
      "greenRupeeMat",
      new Color3(0.18, 0.92, 0.42),
      new Color3(0.08, 0.45, 0.18),
      new Color3(0.9, 1.0, 0.9)
    );
    const blueRupeeMat = makeMat(
      "blueRupeeMat",
      new Color3(0.22, 0.58, 1.0),
      new Color3(0.1, 0.28, 0.65),
      new Color3(0.9, 0.95, 1.0)
    );
    const redRupeeMat = makeMat(
      "redRupeeMat",
      new Color3(1.0, 0.24, 0.32),
      new Color3(0.55, 0.08, 0.14),
      new Color3(1.0, 0.9, 0.9)
    );
    const heartPickupMat = makeMat(
      "heartPickupMat",
      new Color3(1.0, 0.18, 0.38),
      new Color3(0.62, 0.06, 0.18),
      new Color3(1.0, 0.92, 0.95)
    );

    const buildPickupMesh = (id: string, isHeart: boolean): Mesh => {
      if (isHeart) {
        const leftLobe = MeshBuilder.CreateSphere(
          `heartLobeL-${id}`,
          { diameter: 0.44, segments: 12 },
          scene
        );
        leftLobe.position.set(-0.14, 0.14, 0);

        const rightLobe = MeshBuilder.CreateSphere(
          `heartLobeR-${id}`,
          { diameter: 0.44, segments: 12 },
          scene
        );
        rightLobe.position.set(0.14, 0.14, 0);

        const bottomPoint = MeshBuilder.CreateCylinder(
          `heartTip-${id}`,
          { diameterTop: 0.54, diameterBottom: 0.02, height: 0.48, tessellation: 16 },
          scene
        );
        bottomPoint.position.set(0, -0.1, 0);

        const merged =
          Mesh.MergeMeshes([leftLobe, rightLobe, bottomPoint], true, true) ??
          MeshBuilder.CreateSphere(`heartFallback-${id}`, { diameter: 0.6 }, scene);
        merged.name = `heart-${id}`;
        merged.scaling.set(1.08, 1.08, 0.58);
        merged.metadata = { editorKind: "rupee", editorId: id, isHeart: true };
        merged.isPickable = true;
        return merged;
      }

      const mesh = MeshBuilder.CreatePolyhedron(
        `rupee-${id}`,
        { type: 1, size: 0.38 },
        scene
      );
      mesh.scaling.set(0.75, 1.35, 0.55);
      mesh.metadata = { editorKind: "rupee", editorId: id, isHeart: false };
      mesh.isPickable = true;
      return mesh;
    };

    const buildArrowRig = (
      id: string,
      fromHero: boolean,
      isRock = false,
      isFrost = false,
      isReflected = false
    ): TransformNode => {
      const node = new TransformNode(`arrow-${id}`, scene);
      node.metadata = { fromHero, isReflected };
      if (isRock) {
        const rockMesh = MeshBuilder.CreatePolyhedron(
          `rockProj-${id}`,
          { type: 2, size: 0.42 },
          scene
        );
        rockMesh.scaling.set(1.18, 0.94, 1.12);
        rockMesh.material = fromHero ? goldKeyMat : crackedRockMat;
        rockMesh.parent = node;

        const trailRing = MeshBuilder.CreateTorus(
          `rockTrail-${id}`,
          { diameter: 0.88, thickness: 0.07, tessellation: 16 },
          scene
        );
        trailRing.material = fromHero ? slashMat : crackedFissureMat;
        trailRing.parent = node;
        return node;
      }

      if (isFrost) {
        const shard = MeshBuilder.CreatePolyhedron(
          `frostBoltShard-${id}`,
          { type: 1, size: 0.36 },
          scene
        );
        shard.scaling.set(0.85, 0.85, 2.15);
        shard.material = isReflected ? goldKeyMat : slashMat;
        shard.parent = node;

        const frostHalo = MeshBuilder.CreateTorus(
          `frostBoltHalo-${id}`,
          { diameter: 0.82, thickness: 0.075, tessellation: 16 },
          scene
        );
        frostHalo.rotation.x = Math.PI / 2;
        frostHalo.material = isReflected ? slashMat : iceArmorMat;
        frostHalo.parent = node;
        return node;
      }

      const shaft = MeshBuilder.CreateCylinder(
        `arrowShaft-${id}`,
        { diameter: 0.08, height: 1.35, tessellation: 8 },
        scene
      );
      shaft.rotation.x = Math.PI / 2;
      shaft.material = isReflected ? goldKeyMat : woodMat;
      shaft.parent = node;

      const tip = MeshBuilder.CreateCylinder(
        `arrowTip-${id}`,
        { diameterTop: 0.01, diameterBottom: 0.22, height: 0.36, tessellation: 8 },
        scene
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.set(0, 0, 0.72);
      tip.material = isReflected ? goldKeyMat : fromHero ? slashMat : glowingCrimsonMat;
      tip.parent = node;

      const fletchH = MeshBuilder.CreateBox(
        `arrowFletchH-${id}`,
        { width: 0.26, height: 0.03, depth: 0.28 },
        scene
      );
      fletchH.position.set(0, 0, -0.52);
      fletchH.material = isReflected ? goldKeyMat : fromHero ? slashMat : glowingCrimsonMat;
      fletchH.parent = node;

      const fletchV = MeshBuilder.CreateBox(
        `arrowFletchV-${id}`,
        { width: 0.03, height: 0.26, depth: 0.28 },
        scene
      );
      fletchV.position.set(0, 0, -0.52);
      fletchV.material = isReflected ? goldKeyMat : fromHero ? slashMat : glowingCrimsonMat;
      fletchV.parent = node;

      return node;
    };

    const buildEnemyRig = (id: string, kind: EnemyKind, zone: ZoneId): EnemyMeshRig => {
      const root = new TransformNode(`enemy-${id}`, scene);
      const body = new TransformNode(`enemyBodyNode-${id}`, scene);
      body.parent = root;

      const materials: StandardMaterial[] = [];
      const baseColors: Color3[] = [];

      const registerMat = (
        name: string,
        diff: Color3,
        em?: Color3,
        spec = new Color3(0.22, 0.22, 0.22),
        alpha = 1.0,
        specPow = 42
      ) => {
        const m = makeMat(name, diff, em, spec, alpha, specPow);
        materials.push(m);
        baseColors.push(diff.clone());
        return m;
      };

      const weapon = new TransformNode(`weapon-${id}`, scene);
      weapon.parent = body;

      let chargeCorridorRoot: TransformNode | undefined;
      let chargeCorridorBody: TransformNode | undefined;
      let chargeCorridorTip: Mesh | undefined;
      let chargeCorridorMat: StandardMaterial | undefined;
      let lungeShieldMesh: Mesh | undefined;
      let stunStarsRoot: TransformNode | undefined;
      let archerAimLine: Mesh | undefined;

      const buildCorridorRig = (corridorWidth: number, tipLength: number) => {
        const cRoot = new TransformNode(`chargeCorridorRoot-${id}`, scene);
        const cBody = new TransformNode(`chargeCorridorBody-${id}`, scene);
        cBody.parent = cRoot;

        const cMat = makeMat(
          `chargeCorridorMat-${id}`,
          new Color3(1.0, 0.36, 0.14),
          new Color3(0.95, 0.26, 0.08),
          new Color3(0, 0, 0),
          0.54
        );

        const strip = MeshBuilder.CreateBox(
          `chargeStrip-${id}`,
          { width: corridorWidth, height: 0.04, depth: 1.0 },
          scene
        );
        strip.position.set(0, 0.055, 0.5);
        strip.material = cMat;
        strip.isPickable = false;
        strip.parent = cBody;

        const railMat = makeMat(
          `chargeRailMat-${id}`,
          new Color3(1.0, 0.86, 0.26),
          new Color3(1.0, 0.72, 0.16)
        );
        const railParts: Mesh[] = [];
        const halfW = corridorWidth * 0.5;
        for (const rx of [-halfW, halfW]) {
          const rail = MeshBuilder.CreateBox(
            `chargeRail-${id}-${rx}`,
            { width: 0.1, height: 0.075, depth: 1.0 },
            scene
          );
          rail.position.set(rx, 0.07, 0.5);
          rail.isPickable = false;
          railParts.push(rail);
        }
        const mergedRails = mergeGroupWithMaterial(
          `chargeRailsMerged-${id}`,
          railParts,
          railMat,
          cBody
        );
        if (mergedRails) mergedRails.isPickable = false;

        // Forward-pointing +Z arrowhead parented directly to cRoot so scaling cBody.scaling.z never stretches the triangle!
        const cTip = createForwardArrowheadMesh(
          `chargeArrowTip-${id}`,
          corridorWidth * 0.68,
          tipLength,
          scene
        );
        cTip.material = cMat;
        cTip.parent = cRoot;

        cRoot.setEnabled(false);
        chargeCorridorRoot = cRoot;
        chargeCorridorBody = cBody;
        chargeCorridorTip = cTip;
        chargeCorridorMat = cMat;
      };

      if (kind === "slime") {
        const isDungeon = zone === "dungeon";
        const poringJellyMat = registerMat(
          `poringMat-${id}`,
          isDungeon ? new Color3(0.68, 0.36, 0.98) : new Color3(1.0, 0.48, 0.7),
          isDungeon ? new Color3(0.18, 0.06, 0.34) : new Color3(0.32, 0.08, 0.18),
          new Color3(0.95, 0.95, 1.0),
          0.93,
          80
        );

        const jellyParts: Mesh[] = [];
        const blobMesh = createSculptedPoringBodyMesh(`poringBlob-${id}`, scene);
        blobMesh.position.set(0, 0.56, 0);
        jellyParts.push(blobMesh);

        const stemNeck = MeshBuilder.CreateCylinder(
          `poringStem-${id}`,
          { diameterTop: 0.1, diameterBottom: 0.28, height: 0.28, tessellation: 12 },
          scene
        );
        stemNeck.position.set(0, 1.38, -0.14);
        stemNeck.rotation.x = -0.35;
        jellyParts.push(stemNeck);

        const stemBall = MeshBuilder.CreateSphere(
          `poringTipBall-${id}`,
          { diameter: 0.28, segments: 14 },
          scene
        );
        stemBall.position.set(0, 1.54, -0.2);
        jellyParts.push(stemBall);

        mergeGroupWithMaterial(`poringJellyMerged-${id}`, jellyParts, poringJellyMat, body);

        const whiteParts: Mesh[] = [];
        const leftSclera = MeshBuilder.CreateSphere(
          `poringLeftEyeW-${id}`,
          { diameter: 0.36, segments: 14 },
          scene
        );
        leftSclera.scaling.set(1.05, 1.28, 0.55);
        leftSclera.position.set(-0.27, 0.62, 0.68);
        leftSclera.rotation.y = -0.22;
        leftSclera.rotation.z = 0.08;
        whiteParts.push(leftSclera);

        const rightSclera = MeshBuilder.CreateSphere(
          `poringRightEyeW-${id}`,
          { diameter: 0.38, segments: 14 },
          scene
        );
        rightSclera.scaling.set(1.1, 1.32, 0.55);
        rightSclera.position.set(0.27, 0.64, 0.68);
        rightSclera.rotation.y = 0.22;
        rightSclera.rotation.z = -0.1;
        whiteParts.push(rightSclera);

        const leftShine = MeshBuilder.CreateSphere(`poringLShine-${id}`, { diameter: 0.08, segments: 8 }, scene);
        leftShine.position.set(-0.2, 0.69, 0.81);
        whiteParts.push(leftShine);

        const rightShine = MeshBuilder.CreateSphere(`poringRShine-${id}`, { diameter: 0.08, segments: 8 }, scene);
        rightShine.position.set(0.22, 0.71, 0.81);
        whiteParts.push(rightShine);

        mergeGroupWithMaterial(`poringWhites-${id}`, whiteParts, whiteEyeMat, body);

        const darkParts: Mesh[] = [];
        const leftPupil = MeshBuilder.CreateSphere(
          `poringLPupil-${id}`,
          { diameter: 0.21, segments: 12 },
          scene
        );
        leftPupil.scaling.set(0.95, 1.18, 0.5);
        leftPupil.position.set(-0.22, 0.64, 0.77);
        darkParts.push(leftPupil);

        const rightPupil = MeshBuilder.CreateSphere(
          `poringRPupil-${id}`,
          { diameter: 0.23, segments: 12 },
          scene
        );
        rightPupil.scaling.set(1.0, 1.22, 0.5);
        rightPupil.position.set(0.21, 0.6, 0.77);
        darkParts.push(rightPupil);

        const mouthL = MeshBuilder.CreateTorus(
          `poringMouthL-${id}`,
          { diameter: 0.16, thickness: 0.04, tessellation: 12 },
          scene
        );
        mouthL.rotation.x = Math.PI / 2;
        mouthL.position.set(-0.06, 0.44, 0.76);
        darkParts.push(mouthL);

        const mouthR = MeshBuilder.CreateTorus(
          `poringMouthR-${id}`,
          { diameter: 0.16, thickness: 0.04, tessellation: 12 },
          scene
        );
        mouthR.rotation.x = Math.PI / 2;
        mouthR.position.set(0.06, 0.44, 0.76);
        darkParts.push(mouthR);

        mergeGroupWithMaterial(`poringPupils-${id}`, darkParts, darkEyeMat, body);

        const blushParts: Mesh[] = [];
        for (const bx of [-0.44, 0.44]) {
          const cheek = MeshBuilder.CreateSphere(
            `poringCheek-${id}-${bx}`,
            { diameter: 0.18, segments: 10 },
            scene
          );
          cheek.scaling.set(1.3, 0.75, 0.5);
          cheek.position.set(bx, 0.48, 0.64);
          cheek.rotation.y = bx > 0 ? 0.35 : -0.35;
          blushParts.push(cheek);
        }
        mergeGroupWithMaterial(`poringBlush-${id}`, blushParts, blushMat, body);
      } else if (kind === "goblin" || kind === "archer") {
        const isArcher = kind === "archer";
        const gobSkinMat = registerMat(
          `gobSkinMat-${id}`,
          isArcher
            ? new Color3(0.28, 0.62, 0.38)
            : zone === "dungeon"
            ? new Color3(0.46, 0.32, 0.62)
            : new Color3(0.42, 0.68, 0.24),
          new Color3(0.06, 0.04, 0.02)
        );
        const skinParts: Mesh[] = [];

        const torso = MeshBuilder.CreateCylinder(
          `gobTorso-${id}`,
          { diameterTop: 0.72, diameterBottom: 0.92, height: 0.95, tessellation: 14 },
          scene
        );
        torso.position.set(0, 0.82, 0);
        torso.rotation.x = 0.15;
        skinParts.push(torso);

        for (const sx of [-0.48, 0.48]) {
          const arm = MeshBuilder.CreateCylinder(
            `gobArm-${id}-${sx}`,
            { diameterTop: 0.28, diameterBottom: 0.22, height: 0.65, tessellation: 10 },
            scene
          );
          arm.position.set(sx, 0.88, 0.12);
          arm.rotation.z = -sx * 0.35;
          skinParts.push(arm);
        }

        const head = MeshBuilder.CreateSphere(
          `gobHead-${id}`,
          { diameter: 0.82, segments: 16 },
          scene
        );
        head.scaling.set(1.06, 0.92, 1.02);
        head.position.set(0, 1.52, 0.08);
        skinParts.push(head);

        const snout = MeshBuilder.CreateCylinder(
          `gobSnout-${id}`,
          { diameterTop: 0.08, diameterBottom: 0.28, height: 0.38, tessellation: 10 },
          scene
        );
        snout.rotation.x = Math.PI / 2 + 0.15;
        snout.position.set(0, 1.46, 0.54);
        skinParts.push(snout);

        for (const ex of [-1, 1]) {
          const ear = MeshBuilder.CreateCylinder(
            `gobEar-${id}-${ex}`,
            { diameterTop: 0.04, diameterBottom: 0.28, height: 0.68, tessellation: 10 },
            scene
          );
          ear.position.set(ex * 0.58, 1.58, 0.02);
          ear.rotation.z = -ex * 1.22;
          ear.rotation.y = ex * 0.2;
          skinParts.push(ear);
        }

        mergeGroupWithMaterial(`gobSkinMerged-${id}`, skinParts, gobSkinMat, body);

        const armorParts: Mesh[] = [];
        const loin = MeshBuilder.CreateCylinder(
          `gobLoin-${id}`,
          { diameterTop: 0.88, diameterBottom: 1.04, height: 0.48, tessellation: 12 },
          scene
        );
        loin.position.set(0, 0.45, 0);
        armorParts.push(loin);

        for (const lx of [-0.24, 0.24]) {
          const boot = MeshBuilder.CreateCylinder(
            `gobBoot-${id}-${lx}`,
            { diameterTop: 0.26, diameterBottom: 0.32, height: 0.42, tessellation: 10 },
            scene
          );
          boot.position.set(lx, 0.21, 0);
          armorParts.push(boot);
        }
        if (isArcher) {
          const quiver = MeshBuilder.CreateCylinder(
            `gobQuiver-${id}`,
            { diameter: 0.34, height: 0.85, tessellation: 10 },
            scene
          );
          quiver.position.set(-0.22, 1.05, -0.45);
          quiver.rotation.z = -0.35;
          armorParts.push(quiver);
        }
        mergeGroupWithMaterial(`gobGearMerged-${id}`, armorParts, darkObsidianMat, body);

        const eyeParts: Mesh[] = [];
        for (const ex of [-0.18, 0.18]) {
          const eye = MeshBuilder.CreateSphere(`gobEye-${id}-${ex}`, { diameter: 0.16, segments: 10 }, scene);
          eye.position.set(ex, 1.56, 0.43);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`gobEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);

        if (isArcher) {
          const bowArc = MeshBuilder.CreateTorus(
            `gobBow-${id}`,
            { diameter: 1.15, thickness: 0.1, tessellation: 18 },
            scene
          );
          bowArc.rotation.y = Math.PI / 2;
          bowArc.position.set(0, 0.98, 0.58);
          bowArc.material = woodMat;
          bowArc.parent = weapon;

          const nockedArrow = MeshBuilder.CreateCylinder(
            `gobNockedArrow-${id}`,
            { diameter: 0.06, height: 0.95, tessellation: 8 },
            scene
          );
          nockedArrow.rotation.x = Math.PI / 2;
          nockedArrow.position.set(0, 0.98, 0.72);
          nockedArrow.material = glowingCrimsonMat;
          nockedArrow.parent = weapon;

          archerAimLine = MeshBuilder.CreateBox(
            `archerAim-${id}`,
            { width: 0.1, height: 0.04, depth: 9.5 },
            scene
          );
          archerAimLine.position.set(0, 0.08, 4.8);
          archerAimLine.material = glowingCrimsonMat;
          archerAimLine.parent = root;
          archerAimLine.setEnabled(false);
        } else {
          const clubShaft = MeshBuilder.CreateCylinder(
            `gobClub-${id}`,
            { diameterTop: 0.38, diameterBottom: 0.16, height: 1.25, tessellation: 12 },
            scene
          );
          clubShaft.rotation.x = Math.PI / 2;
          clubShaft.position.set(0.55, 0.9, 0.55);
          clubShaft.material = woodMat;
          clubShaft.parent = weapon;

          const spikeParts: Mesh[] = [];
          for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2;
            const spike = MeshBuilder.CreateCylinder(
              `gobSpike-${id}-${s}`,
              { diameterTop: 0.02, diameterBottom: 0.12, height: 0.28, tessellation: 8 },
              scene
            );
            spike.position.set(0.55 + Math.cos(a) * 0.22, 0.9 + Math.sin(a) * 0.22, 0.88);
            spike.rotation.z = -Math.cos(a) * (Math.PI / 2);
            spike.rotation.x = Math.sin(a) * (Math.PI / 2);
            spikeParts.push(spike);
          }
          mergeGroupWithMaterial(`gobSpikes-${id}`, spikeParts, bladeMat, weapon);

          // Ground Lunge Path Telegraph Corridor for Goblin Fighters (with +Z aligned arrowhead!)
          buildCorridorRig(1.25, 0.85);
        }
      } else if (kind === "knight") {
        // =====================================================
        // MARIO RPG-INSPIRED HIGH-DEFINITION LOW-POLY SENTINEL KNIGHT
        // Keeps the iconic chunky knight silhouette while adding multi-tone
        // enameled plate, polished silver trim, gilded gold crown/crests,
        // dark chainmail, heraldic heater shield, and glowing visor eyes!
        // =====================================================
        const knightPrimaryMat = registerMat(
          `knightPrimaryMat-${id}`,
          zone === "dungeon"
            ? new Color3(0.22, 0.42, 0.84)
            : zone === "frontier"
            ? new Color3(0.16, 0.62, 0.52)
            : new Color3(0.82, 0.16, 0.22),
          new Color3(0.08, 0.03, 0.05),
          new Color3(0.85, 0.88, 0.95),
          1.0,
          72
        );
        const knightSilverMat = registerMat(
          `knightSilverMat-${id}`,
          new Color3(0.86, 0.9, 0.96),
          new Color3(0.08, 0.09, 0.12),
          new Color3(1.0, 1.0, 1.0),
          1.0,
          96
        );
        const knightGoldMat = registerMat(
          `knightGoldMat-${id}`,
          new Color3(1.0, 0.82, 0.2),
          new Color3(0.28, 0.18, 0.02),
          new Color3(1.0, 0.95, 0.75),
          1.0,
          80
        );
        const knightPlumeMat = registerMat(
          `knightPlumeMat-${id}`,
          zone === "dungeon"
            ? new Color3(0.95, 0.28, 0.42)
            : new Color3(0.98, 0.22, 0.26),
          new Color3(0.32, 0.05, 0.08)
        );

        const primaryParts: Mesh[] = [];
        const silverParts: Mesh[] = [];
        const goldParts: Mesh[] = [];
        const chainmailParts: Mesh[] = [];
        const plumeParts: Mesh[] = [];
        const eyeParts: Mesh[] = [];

        // 1. Articulated Sabatons, Greaves, Knee Poleyns & Thigh Cuisses
        for (const lx of [-0.3, 0.3]) {
          const sabaton = MeshBuilder.CreateBox(
            `knightSabaton-${id}-${lx}`,
            { width: 0.38, height: 0.22, depth: 0.56 },
            scene
          );
          sabaton.position.set(lx, 0.11, 0.08);
          silverParts.push(sabaton);

          const sabatonToe = MeshBuilder.CreateCylinder(
            `knightToe-${id}-${lx}`,
            { diameterTop: 0.24, diameterBottom: 0.36, height: 0.2, tessellation: 12 },
            scene
          );
          sabatonToe.rotation.x = Math.PI / 2;
          sabatonToe.position.set(lx, 0.1, 0.38);
          silverParts.push(sabatonToe);

          const greave = MeshBuilder.CreateCylinder(
            `knightGreave-${id}-${lx}`,
            { diameterTop: 0.38, diameterBottom: 0.34, height: 0.52, tessellation: 14 },
            scene
          );
          greave.position.set(lx, 0.42, 0);
          primaryParts.push(greave);

          const kneePoleyn = MeshBuilder.CreatePolyhedron(
            `knightPoleyn-${id}-${lx}`,
            { type: 1, size: 0.18 },
            scene
          );
          kneePoleyn.scaling.set(1.15, 1.1, 0.75);
          kneePoleyn.position.set(lx, 0.62, 0.22);
          silverParts.push(kneePoleyn);
        }

        // 2. Chainmail Hauberk Skirt & Segmented Silver Tassets / Faulds
        const mailSkirt = MeshBuilder.CreateCylinder(
          `knightMailSkirt-${id}`,
          { diameterTop: 0.88, diameterBottom: 1.02, height: 0.38, tessellation: 16 },
          scene
        );
        mailSkirt.position.set(0, 0.68, 0);
        chainmailParts.push(mailSkirt);

        const waistFauld = MeshBuilder.CreateCylinder(
          `knightWaistFauld-${id}`,
          { diameterTop: 0.94, diameterBottom: 1.08, height: 0.22, tessellation: 16 },
          scene
        );
        waistFauld.scaling.set(1.06, 1.0, 0.86);
        waistFauld.position.set(0, 0.84, 0);
        silverParts.push(waistFauld);

        // Golden Royal Belt & Buckle
        const belt = MeshBuilder.CreateCylinder(
          `knightBelt-${id}`,
          { diameterTop: 0.98, diameterBottom: 0.98, height: 0.12, tessellation: 16 },
          scene
        );
        belt.scaling.set(1.07, 1.0, 0.87);
        belt.position.set(0, 0.94, 0);
        goldParts.push(belt);

        const beltBuckle = MeshBuilder.CreateBox(
          `knightBuckle-${id}`,
          { width: 0.28, height: 0.22, depth: 0.12 },
          scene
        );
        beltBuckle.position.set(0, 0.94, 0.42);
        goldParts.push(beltBuckle);

        // 3. Broad Barrel Cuirass + Silver Plackart V-Guard + Gilded Sun Emblem
        const cuirass = MeshBuilder.CreateCylinder(
          `knightCuirass-${id}`,
          { diameterTop: 1.32, diameterBottom: 0.94, height: 0.88, tessellation: 18 },
          scene
        );
        cuirass.scaling.set(1.08, 1.0, 0.84);
        cuirass.position.set(0, 1.32, 0);
        primaryParts.push(cuirass);

        const plackart = MeshBuilder.CreateCylinder(
          `knightPlackart-${id}`,
          { diameterTop: 1.18, diameterBottom: 0.86, height: 0.52, tessellation: 12 },
          scene
        );
        plackart.scaling.set(1.04, 1.0, 0.88);
        plackart.position.set(0, 1.18, 0.04);
        silverParts.push(plackart);

        const chestEmblem = MeshBuilder.CreatePolyhedron(
          `knightChestEmblem-${id}`,
          { type: 1, size: 0.22 },
          scene
        );
        chestEmblem.scaling.set(1.15, 1.35, 0.55);
        chestEmblem.position.set(0, 1.42, 0.52);
        goldParts.push(chestEmblem);

        // Flowing Heraldic Back Mantle Cape
        const cape = MeshBuilder.CreateBox(
          `knightCape-${id}`,
          { width: 1.18, height: 1.28, depth: 0.1 },
          scene
        );
        cape.position.set(0, 1.12, -0.48);
        cape.rotation.x = 0.2;
        plumeParts.push(cape);

        // 4. Layered Spherical Pauldrons with Silver Rims, Gold Spikes & Armored Gauntlets
        for (const side of [-1, 1]) {
          const px = side * 0.76;
          const pauldron = MeshBuilder.CreateSphere(
            `knightPauldron-${id}-${side}`,
            { diameter: 0.68, segments: 16 },
            scene
          );
          pauldron.scaling.set(1.14, 0.9, 1.04);
          pauldron.position.set(px, 1.58, 0);
          primaryParts.push(pauldron);

          const pauldronRim = MeshBuilder.CreateTorus(
            `knightPauldronRim-${id}-${side}`,
            { diameter: 0.66, thickness: 0.09, tessellation: 18 },
            scene
          );
          pauldronRim.rotation.z = -side * 0.35;
          pauldronRim.position.set(px, 1.48, 0);
          silverParts.push(pauldronRim);

          const pauldronSpike = MeshBuilder.CreateCylinder(
            `knightPauldronSpike-${id}-${side}`,
            { diameterTop: 0.02, diameterBottom: 0.18, height: 0.34, tessellation: 10 },
            scene
          );
          pauldronSpike.position.set(px + side * 0.18, 1.84, 0);
          pauldronSpike.rotation.z = -side * 0.52;
          goldParts.push(pauldronSpike);

          const upperArm = MeshBuilder.CreateCylinder(
            `knightArm-${id}-${side}`,
            { diameterTop: 0.28, diameterBottom: 0.24, height: 0.48, tessellation: 12 },
            scene
          );
          upperArm.position.set(px, 1.24, 0.1);
          chainmailParts.push(upperArm);

          const gauntlet = MeshBuilder.CreateCylinder(
            `knightGauntlet-${id}-${side}`,
            { diameterTop: 0.3, diameterBottom: 0.34, height: 0.38, tessellation: 12 },
            scene
          );
          gauntlet.rotation.x = Math.PI / 3;
          gauntlet.position.set(px, 1.06, 0.26);
          silverParts.push(gauntlet);
        }

        // 5. Armored Gorget, Great-Helm, Sculpted Silver Bevor Faceplate, Gilded Crown & Glowing Visor Eyes
        const gorget = MeshBuilder.CreateCylinder(
          `knightGorget-${id}`,
          { diameterTop: 0.82, diameterBottom: 0.96, height: 0.2, tessellation: 16 },
          scene
        );
        gorget.position.set(0, 1.78, 0);
        silverParts.push(gorget);

        const helmBarrel = MeshBuilder.CreateCylinder(
          `knightHelm-${id}`,
          { diameterTop: 0.76, diameterBottom: 0.84, height: 0.68, tessellation: 18 },
          scene
        );
        helmBarrel.position.set(0, 2.1, 0);
        primaryParts.push(helmBarrel);

        const helmDome = MeshBuilder.CreateSphere(
          `knightHelmDome-${id}`,
          { diameter: 0.78, segments: 16 },
          scene
        );
        helmDome.scaling.set(1.0, 0.88, 1.0);
        helmDome.position.set(0, 2.4, 0);
        primaryParts.push(helmDome);

        // Silver V-Bevor Lower Faceguard & Brow Visor Ridge
        const bevorGuard = MeshBuilder.CreateCylinder(
          `knightBevor-${id}`,
          { diameterTop: 0.82, diameterBottom: 0.74, height: 0.36, tessellation: 12 },
          scene
        );
        bevorGuard.position.set(0, 1.94, 0.08);
        silverParts.push(bevorGuard);

        const browRidge = MeshBuilder.CreateBox(
          `knightBrow-${id}`,
          { width: 0.66, height: 0.1, depth: 0.24 },
          scene
        );
        browRidge.position.set(0, 2.22, 0.34);
        silverParts.push(browRidge);

        // Deep Dark Visor Recess + Glowing Mario-RPG Amber Eyes Inside!
        const visorRecess = MeshBuilder.CreateBox(
          `knightVisorRecess-${id}`,
          { width: 0.58, height: 0.16, depth: 0.18 },
          scene
        );
        visorRecess.position.set(0, 2.13, 0.34);
        chainmailParts.push(visorRecess);

        for (const ex of [-0.14, 0.14]) {
          const visorEye = MeshBuilder.CreateSphere(
            `knightEye-${id}-${ex}`,
            { diameter: 0.13, segments: 10 },
            scene
          );
          visorEye.scaling.set(1.2, 0.85, 0.6);
          visorEye.position.set(ex, 2.13, 0.42);
          eyeParts.push(visorEye);
        }

        // Gilded Royal Crown Circlet + 4 Crown Peaks atop the Helmet
        const crownBand = MeshBuilder.CreateTorus(
          `knightCrownBand-${id}`,
          { diameter: 0.78, thickness: 0.08, tessellation: 20 },
          scene
        );
        crownBand.position.set(0, 2.38, 0);
        goldParts.push(crownBand);

        for (let c = 0; c < 4; c++) {
          const ca = (c / 4) * Math.PI * 2;
          const peak = MeshBuilder.CreatePolyhedron(
            `knightCrownPeak-${id}-${c}`,
            { type: 1, size: 0.11 },
            scene
          );
          peak.scaling.set(0.8, 1.45, 0.8);
          peak.position.set(Math.sin(ca) * 0.37, 2.48, Math.cos(ca) * 0.37);
          goldParts.push(peak);
        }

        // Ornate Golden Plume Holder + Sweeping Two-Tone Plume Crest
        const plumeSocket = MeshBuilder.CreateCylinder(
          `knightPlumeSocket-${id}`,
          { diameterTop: 0.22, diameterBottom: 0.16, height: 0.22, tessellation: 10 },
          scene
        );
        plumeSocket.position.set(0, 2.66, -0.04);
        goldParts.push(plumeSocket);

        const mainPlume = MeshBuilder.CreateCylinder(
          `knightPlumeMain-${id}`,
          { diameterTop: 0.12, diameterBottom: 0.46, height: 0.82, tessellation: 12 },
          scene
        );
        mainPlume.position.set(0, 2.86, -0.24);
        mainPlume.rotation.x = -0.62;
        plumeParts.push(mainPlume);

        const plumeTail = MeshBuilder.CreateSphere(
          `knightPlumeTail-${id}`,
          { diameter: 0.38, segments: 12 },
          scene
        );
        plumeTail.scaling.set(0.65, 1.35, 1.1);
        plumeTail.position.set(0, 2.68, -0.56);
        plumeTail.rotation.x = 0.5;
        goldParts.push(plumeTail);

        // 6. Heraldic Heater Shield (Silver Frame, Primary Enamel Face, Gold Sun Boss & Corner Studs)
        const shieldFrame = MeshBuilder.CreateBox(
          `knightShieldFrame-${id}`,
          { width: 0.16, height: 1.26, depth: 0.88 },
          scene
        );
        shieldFrame.position.set(-0.84, 1.16, 0.28);
        shieldFrame.rotation.y = -0.25;
        silverParts.push(shieldFrame);

        const shieldFace = MeshBuilder.CreateBox(
          `knightShieldFace-${id}`,
          { width: 0.19, height: 1.06, depth: 0.7 },
          scene
        );
        shieldFace.position.set(-0.86, 1.16, 0.28);
        shieldFace.rotation.y = -0.25;
        primaryParts.push(shieldFace);

        const shieldBoss = MeshBuilder.CreatePolyhedron(
          `knightShieldBoss-${id}`,
          { type: 1, size: 0.22 },
          scene
        );
        shieldBoss.scaling.set(0.55, 1.25, 1.05);
        shieldBoss.position.set(-0.95, 1.18, 0.31);
        shieldBoss.rotation.y = -0.25;
        goldParts.push(shieldBoss);

        // Merge Knight body groups by material to keep draw calls minimal!
        mergeGroupWithMaterial(`knightPrimaryMerged-${id}`, primaryParts, knightPrimaryMat, body);
        mergeGroupWithMaterial(`knightSilverMerged-${id}`, silverParts, knightSilverMat, body);
        mergeGroupWithMaterial(`knightGoldMerged-${id}`, goldParts, knightGoldMat, body);
        mergeGroupWithMaterial(`knightChainmailMerged-${id}`, chainmailParts, darkObsidianMat, body);
        mergeGroupWithMaterial(`knightPlumeMerged-${id}`, plumeParts, knightPlumeMat, body);
        mergeGroupWithMaterial(`knightEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);

        // 7. Ornate Royal Halberd on `weapon` Pivot
        const halberdSilverParts: Mesh[] = [];
        const halberdGoldParts: Mesh[] = [];

        const shaft = MeshBuilder.CreateCylinder(
          `halberdShaft-${id}`,
          { diameter: 0.13, height: 2.45, tessellation: 12 },
          scene
        );
        shaft.rotation.x = Math.PI / 2;
        shaft.position.set(0.8, 1.1, 0.68);
        shaft.material = darkObsidianMat;
        shaft.parent = weapon;

        for (const gz of [0.25, 1.15, 1.68]) {
          const ring = MeshBuilder.CreateTorus(
            `halberdRing-${id}-${gz}`,
            { diameter: 0.22, thickness: 0.06, tessellation: 14 },
            scene
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(0.8, 1.1, gz);
          halberdGoldParts.push(ring);
        }

        const axeHead = MeshBuilder.CreateCylinder(
          `halberdAxe-${id}`,
          { diameterTop: 0.88, diameterBottom: 0.22, height: 0.1, tessellation: 16 },
          scene
        );
        axeHead.rotation.z = Math.PI / 2;
        axeHead.scaling.set(1.15, 1.0, 0.72);
        axeHead.position.set(0.8, 1.32, 1.48);
        halberdSilverParts.push(axeHead);

        const rearSpike = MeshBuilder.CreateCylinder(
          `halberdRearSpike-${id}`,
          { diameterTop: 0.02, diameterBottom: 0.16, height: 0.36, tessellation: 10 },
          scene
        );
        rearSpike.position.set(0.8, 0.88, 1.48);
        rearSpike.rotation.x = Math.PI;
        halberdSilverParts.push(rearSpike);

        const spearTip = MeshBuilder.CreateCylinder(
          `halberdTip-${id}`,
          { diameterTop: 0.02, diameterBottom: 0.25, height: 0.62, tessellation: 12 },
          scene
        );
        spearTip.rotation.x = Math.PI / 2;
        spearTip.position.set(0.8, 1.1, 2.04);
        halberdSilverParts.push(spearTip);

        mergeGroupWithMaterial(`knightHalberdSilver-${id}`, halberdSilverParts, bladeMat, weapon);
        mergeGroupWithMaterial(`knightHalberdGold-${id}`, halberdGoldParts, knightGoldMat, weapon);

        // Ground Lunge Path Telegraph Corridor for Sentinel Knights (with +Z aligned arrowhead!)
        buildCorridorRig(1.48, 0.95);
      } else if (kind === "minion") {
        const minionMat = registerMat(
          `minionMat-${id}`,
          new Color3(0.58, 0.16, 0.76),
          new Color3(0.24, 0.05, 0.34)
        );
        const wraithParts: Mesh[] = [];

        const cloak = MeshBuilder.CreateCylinder(
          `minionCloak-${id}`,
          { diameterTop: 0.42, diameterBottom: 1.25, height: 1.35, tessellation: 14 },
          scene
        );
        cloak.position.set(0, 0.85, 0);
        wraithParts.push(cloak);

        const hood = MeshBuilder.CreateSphere(
          `minionHood-${id}`,
          { diameter: 0.76, segments: 14 },
          scene
        );
        hood.position.set(0, 1.62, 0.04);
        wraithParts.push(hood);

        for (let s = 0; s < 3; s++) {
          const a = (s / 3) * Math.PI * 2;
          const shard = MeshBuilder.CreatePolyhedron(
            `minionShard-${id}-${s}`,
            { type: 1, size: 0.22 },
            scene
          );
          shard.position.set(Math.cos(a) * 0.85, 1.15, Math.sin(a) * 0.85);
          wraithParts.push(shard);
        }
        mergeGroupWithMaterial(`minionWraithMerged-${id}`, wraithParts, minionMat, body);

        const eyeParts: Mesh[] = [];
        for (const ex of [-0.14, 0.14]) {
          const eye = MeshBuilder.CreateSphere(`minionEye-${id}-${ex}`, { diameter: 0.13, segments: 8 }, scene);
          eye.position.set(ex, 1.62, 0.36);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`minionEyes-${id}`, eyeParts, glowingYellowEyeMat, body);
      } else if (kind === "wraith") {
        // =====================================================
        // FROST WRAITH / GLACIAL SPECTER ("wraith")
        // Floating crystalline ice specter with jagged frost crown, orbiting
        // glacial shards, and a frost scepter that fires chilling bolts!
        // =====================================================
        const wraithIceMat = registerMat(
          `wraithIceMat-${id}`,
          new Color3(0.24, 0.78, 0.98),
          new Color3(0.08, 0.34, 0.56),
          new Color3(0.95, 0.98, 1.0),
          0.92,
          84
        );
        const wraithCoreMat = registerMat(
          `wraithCoreMat-${id}`,
          new Color3(0.72, 0.95, 1.0),
          new Color3(0.32, 0.72, 0.96)
        );
        const iceParts: Mesh[] = [];
        const crystalParts: Mesh[] = [];

        const shroud = MeshBuilder.CreateCylinder(
          `wraithShroud-${id}`,
          { diameterTop: 0.48, diameterBottom: 1.32, height: 1.42, tessellation: 10 },
          scene
        );
        shroud.position.set(0, 0.88, 0);
        iceParts.push(shroud);

        const mantle = MeshBuilder.CreateSphere(
          `wraithMantle-${id}`,
          { diameterX: 1.24, diameterY: 0.52, diameterZ: 0.86, segments: 12 },
          scene
        );
        mantle.position.set(0, 1.38, 0);
        iceParts.push(mantle);

        const head = MeshBuilder.CreatePolyhedron(
          `wraithHead-${id}`,
          { type: 1, size: 0.42 },
          scene
        );
        head.scaling.set(0.95, 1.22, 0.95);
        head.position.set(0, 1.78, 0.04);
        iceParts.push(head);

        for (let c = 0; c < 5; c++) {
          const ang = (c / 5) * Math.PI * 2;
          const crownShard = MeshBuilder.CreateCylinder(
            `wraithCrown-${id}-${c}`,
            { diameterTop: 0.02, diameterBottom: 0.18, height: 0.46, tessellation: 6 },
            scene
          );
          crownShard.position.set(Math.sin(ang) * 0.34, 2.15, 0.04 + Math.cos(ang) * 0.34);
          crownShard.rotation.z = -Math.sin(ang) * 0.32;
          crownShard.rotation.x = Math.cos(ang) * 0.32;
          crystalParts.push(crownShard);
        }

        for (let s = 0; s < 4; s++) {
          const a = (s / 4) * Math.PI * 2 + 0.4;
          const shard = MeshBuilder.CreatePolyhedron(
            `wraithOrbit-${id}-${s}`,
            { type: 1, size: 0.24 },
            scene
          );
          shard.scaling.set(0.75, 1.55, 0.75);
          shard.position.set(Math.cos(a) * 0.92, 1.15, Math.sin(a) * 0.92);
          crystalParts.push(shard);
        }

        mergeGroupWithMaterial(`wraithIceMerged-${id}`, iceParts, wraithIceMat, body);
        mergeGroupWithMaterial(`wraithCrystMerged-${id}`, crystalParts, wraithCoreMat, body);

        const eyeParts: Mesh[] = [];
        for (const ex of [-0.15, 0.15]) {
          const eye = MeshBuilder.CreateSphere(`wraithEye-${id}-${ex}`, { diameter: 0.14, segments: 8 }, scene);
          eye.position.set(ex, 1.78, 0.38);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`wraithEyes-${id}`, eyeParts, whiteEyeMat, body);

        const scepterShaft = MeshBuilder.CreateCylinder(
          `wraithStaff-${id}`,
          { diameter: 0.1, height: 1.45, tessellation: 8 },
          scene
        );
        scepterShaft.rotation.x = Math.PI / 2;
        scepterShaft.position.set(0.58, 1.15, 0.55);
        scepterShaft.material = wraithCoreMat;
        scepterShaft.parent = weapon;

        const scepterGem = MeshBuilder.CreatePolyhedron(
          `wraithStaffGem-${id}`,
          { type: 1, size: 0.24 },
          scene
        );
        scepterGem.position.set(0.58, 1.15, 1.32);
        scepterGem.material = slashMat;
        scepterGem.parent = weapon;
      } else if (kind === "bomber") {
        // =====================================================
        // SAPPER GREMLIN / BOMB-LOBBER ("bomber")
        // Mischievous copper-skinned gremlin with blasting goggles, a strapped
        // canvas bomb-pack on its back, and a ticking bomb held ready to lob!
        // =====================================================
        const sapperSkinMat = registerMat(
          `sapperSkinMat-${id}`,
          new Color3(0.84, 0.44, 0.18),
          new Color3(0.12, 0.05, 0.02)
        );
        const sapperPackMat = registerMat(
          `sapperPackMat-${id}`,
          new Color3(0.36, 0.26, 0.18),
          new Color3(0.05, 0.03, 0.02)
        );
        const skinParts: Mesh[] = [];
        const packParts: Mesh[] = [];
        const metalParts: Mesh[] = [];

        const torso = MeshBuilder.CreateCylinder(
          `sapperTorso-${id}`,
          { diameterTop: 0.76, diameterBottom: 0.94, height: 0.92, tessellation: 12 },
          scene
        );
        torso.position.set(0, 0.78, 0);
        skinParts.push(torso);

        const head = MeshBuilder.CreateSphere(
          `sapperHead-${id}`,
          { diameter: 0.84, segments: 14 },
          scene
        );
        head.scaling.set(1.08, 0.92, 1.0);
        head.position.set(0, 1.48, 0.06);
        skinParts.push(head);

        for (const ex of [-1, 1]) {
          const ear = MeshBuilder.CreateCylinder(
            `sapperEar-${id}-${ex}`,
            { diameterTop: 0.04, diameterBottom: 0.28, height: 0.65, tessellation: 8 },
            scene
          );
          ear.position.set(ex * 0.58, 1.52, 0);
          ear.rotation.z = -ex * 1.18;
          skinParts.push(ear);
        }

        const backpack = MeshBuilder.CreateBox(
          `sapperPack-${id}`,
          { width: 0.82, height: 0.86, depth: 0.56 },
          scene
        );
        backpack.position.set(0, 0.96, -0.46);
        packParts.push(backpack);

        for (const lx of [-0.24, 0.24]) {
          const boot = MeshBuilder.CreateCylinder(
            `sapperBoot-${id}-${lx}`,
            { diameterTop: 0.26, diameterBottom: 0.34, height: 0.4, tessellation: 10 },
            scene
          );
          boot.position.set(lx, 0.2, 0);
          packParts.push(boot);

          const goggleRim = MeshBuilder.CreateCylinder(
            `sapperGoggle-${id}-${lx}`,
            { diameter: 0.32, height: 0.18, tessellation: 12 },
            scene
          );
          goggleRim.rotation.x = Math.PI / 2;
          goggleRim.position.set(lx * 0.85, 1.56, 0.42);
          metalParts.push(goggleRim);
        }

        mergeGroupWithMaterial(`sapperSkinMerged-${id}`, skinParts, sapperSkinMat, body);
        mergeGroupWithMaterial(`sapperPackMerged-${id}`, packParts, sapperPackMat, body);
        mergeGroupWithMaterial(`sapperMetalMerged-${id}`, metalParts, goldKeyMat, body);

        // Held Bomb in throwing arm (`weapon`)
        const heldBomb = MeshBuilder.CreateSphere(
          `sapperHeldBomb-${id}`,
          { diameter: 0.68, segments: 12 },
          scene
        );
        heldBomb.position.set(0.52, 1.15, 0.52);
        heldBomb.material = darkObsidianMat;
        heldBomb.parent = weapon;

        const heldSpark = MeshBuilder.CreatePolyhedron(
          `sapperSpark-${id}`,
          { type: 1, size: 0.14 },
          scene
        );
        heldSpark.position.set(0.52, 1.55, 0.52);
        heldSpark.material = goldKeyMat;
        heldSpark.parent = weapon;
      } else if (kind === "burrower") {
        // =====================================================
        // SUBTERRANEAN TUNNEL WYRM ("burrower")
        // Segmented armored sand/stone wyrm with a surface dirt collar (attached
        // to `root` so the rumbling dirt mound stays visible while `body` burrows!)
        // =====================================================
        const wyrmShellMat = registerMat(
          `wyrmShellMat-${id}`,
          new Color3(0.72, 0.52, 0.26),
          new Color3(0.1, 0.06, 0.02)
        );
        const wyrmBellyMat = registerMat(
          `wyrmBellyMat-${id}`,
          new Color3(0.46, 0.32, 0.16),
          new Color3(0.05, 0.03, 0.01)
        );

        // Surface dirt collar parented directly to `root` so it stays on the ground when `body` submerges!
        const collarParts: Mesh[] = [];
        const dirtRing = MeshBuilder.CreateTorus(
          `wyrmDirtCollar-${id}`,
          { diameter: 1.65, thickness: 0.36, tessellation: 16 },
          scene
        );
        dirtRing.scaling.set(1.0, 0.55, 1.0);
        dirtRing.position.set(0, 0.1, 0);
        collarParts.push(dirtRing);
        mergeGroupWithMaterial(`wyrmCollarMerged-${id}`, collarParts, dirtSoilMat, root);

        const shellParts: Mesh[] = [];
        const bellyParts: Mesh[] = [];
        const mandibleParts: Mesh[] = [];

        const lowerSeg = MeshBuilder.CreateCylinder(
          `wyrmSeg1-${id}`,
          { diameterTop: 1.12, diameterBottom: 1.32, height: 0.68, tessellation: 14 },
          scene
        );
        lowerSeg.position.set(0, 0.42, 0);
        shellParts.push(lowerSeg);

        const midSeg = MeshBuilder.CreateCylinder(
          `wyrmSeg2-${id}`,
          { diameterTop: 0.96, diameterBottom: 1.16, height: 0.68, tessellation: 14 },
          scene
        );
        midSeg.position.set(0, 0.98, 0.06);
        midSeg.rotation.x = 0.14;
        bellyParts.push(midSeg);

        const headDome = MeshBuilder.CreateSphere(
          `wyrmHead-${id}`,
          { diameter: 1.08, segments: 14 },
          scene
        );
        headDome.scaling.set(1.02, 1.12, 1.08);
        headDome.position.set(0, 1.48, 0.14);
        shellParts.push(headDome);

        // Dorsal crest fin on top of the head (peeks out slightly even when burrowed!)
        const dorsalCrest = MeshBuilder.CreateCylinder(
          `wyrmCrest-${id}`,
          { diameterTop: 0.04, diameterBottom: 0.36, height: 0.52, tessellation: 8 },
          scene
        );
        dorsalCrest.position.set(0, 2.02, 0.08);
        mandibleParts.push(dorsalCrest);

        for (const mx of [-0.36, 0.36]) {
          const mandible = MeshBuilder.CreateCylinder(
            `wyrmMandible-${id}-${mx}`,
            { diameterTop: 0.03, diameterBottom: 0.22, height: 0.58, tessellation: 8 },
            scene
          );
          mandible.rotation.x = Math.PI / 2;
          mandible.rotation.y = mx > 0 ? -0.28 : 0.28;
          mandible.position.set(mx, 1.36, 0.68);
          mandibleParts.push(mandible);
        }

        mergeGroupWithMaterial(`wyrmShellMerged-${id}`, shellParts, wyrmShellMat, body);
        mergeGroupWithMaterial(`wyrmBellyMerged-${id}`, bellyParts, wyrmBellyMat, body);
        mergeGroupWithMaterial(`wyrmMandiblesMerged-${id}`, mandibleParts, boneHornMat, body);

        const eyeParts: Mesh[] = [];
        for (const ex of [-0.24, 0.24]) {
          const eye = MeshBuilder.CreateSphere(`wyrmEye-${id}-${ex}`, { diameter: 0.18, segments: 10 }, scene);
          eye.position.set(ex, 1.62, 0.58);
          eyeParts.push(eye);
        }
        mergeGroupWithMaterial(`wyrmEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);
      } else if (kind === "turret") {
        // =====================================================
        // CARVED STONE SPITTER TURRET (SHIELD BRIDGE PUZZLE OBSTACLE)
        // Stationary stone gargoyle/totem turret on a mossy octagonal pedestal
        // with a protruding stone cannon snout that spits rock boulders!
        // =====================================================
        const turretStoneMat = registerMat(
          `turretStoneMat-${id}`,
          new Color3(0.56, 0.54, 0.49),
          new Color3(0.06, 0.06, 0.05),
          new Color3(0.28, 0.28, 0.26)
        );
        const turretMossMat = registerMat(
          `turretMossMat-${id}`,
          new Color3(0.22, 0.58, 0.28),
          new Color3(0.03, 0.08, 0.04)
        );

        const stoneParts: Mesh[] = [];
        const mossParts: Mesh[] = [];
        const goldParts: Mesh[] = [];
        const eyeParts: Mesh[] = [];

        const basePedestal = MeshBuilder.CreateCylinder(
          `turretPedestal-${id}`,
          { diameterTop: 1.48, diameterBottom: 1.82, height: 0.62, tessellation: 8 },
          scene
        );
        basePedestal.position.set(0, 0.31, 0);
        stoneParts.push(basePedestal);

        const mossCap = MeshBuilder.CreateCylinder(
          `turretMossCap-${id}`,
          { diameterTop: 1.38, diameterBottom: 1.54, height: 0.16, tessellation: 10 },
          scene
        );
        mossCap.position.set(0, 0.62, 0);
        mossParts.push(mossCap);

        const totemBody = MeshBuilder.CreateCylinder(
          `turretBody-${id}`,
          { diameterTop: 1.18, diameterBottom: 1.34, height: 1.15, tessellation: 10 },
          scene
        );
        totemBody.position.set(0, 1.18, 0);
        stoneParts.push(totemBody);

        const totemCrown = MeshBuilder.CreatePolyhedron(
          `turretCrown-${id}`,
          { type: 2, size: 0.64 },
          scene
        );
        totemCrown.scaling.set(1.16, 0.62, 1.12);
        totemCrown.position.set(0, 1.82, 0);
        stoneParts.push(totemCrown);

        const crownMoss = MeshBuilder.CreateSphere(
          `turretCrownMoss-${id}`,
          { diameter: 0.92, segments: 10 },
          scene
        );
        crownMoss.scaling.set(1.1, 0.32, 1.05);
        crownMoss.position.set(0, 2.08, -0.05);
        mossParts.push(crownMoss);

        // Protruding Stone Cannon Snout Barrel (+Z forward)
        const snoutBarrel = MeshBuilder.CreateCylinder(
          `turretSnout-${id}`,
          { diameterTop: 0.56, diameterBottom: 0.68, height: 0.86, tessellation: 12 },
          scene
        );
        snoutBarrel.rotation.x = Math.PI / 2;
        snoutBarrel.position.set(0, 1.16, 0.72);
        stoneParts.push(snoutBarrel);

        const muzzleRing = MeshBuilder.CreateTorus(
          `turretMuzzleRing-${id}`,
          { diameter: 0.62, thickness: 0.12, tessellation: 16 },
          scene
        );
        muzzleRing.rotation.x = Math.PI / 2;
        muzzleRing.position.set(0, 1.16, 1.14);
        goldParts.push(muzzleRing);

        const muzzleBore = MeshBuilder.CreateCylinder(
          `turretMuzzleBore-${id}`,
          { diameter: 0.42, height: 0.22, tessellation: 12 },
          scene
        );
        muzzleBore.rotation.x = Math.PI / 2;
        muzzleBore.position.set(0, 1.16, 1.08);
        muzzleBore.material = darkObsidianMat;
        muzzleBore.parent = body;

        for (const ex of [-0.28, 0.28]) {
          const eye = MeshBuilder.CreateSphere(
            `turretEye-${id}-${ex}`,
            { diameter: 0.22, segments: 10 },
            scene
          );
          eye.scaling.set(1.1, 0.85, 0.7);
          eye.position.set(ex, 1.54, 0.54);
          eyeParts.push(eye);
        }

        mergeGroupWithMaterial(`turretStoneMerged-${id}`, stoneParts, turretStoneMat, body);
        mergeGroupWithMaterial(`turretMossMerged-${id}`, mossParts, turretMossMat, body);
        mergeGroupWithMaterial(`turretGoldMerged-${id}`, goldParts, goldKeyMat, body);
        mergeGroupWithMaterial(`turretEyesMerged-${id}`, eyeParts, glowingYellowEyeMat, body);
      } else {
        // =====================================================
        // HIGH-DEFINITION LOW-POLY BOSS RIG:
        // - Map 2 (`dungeon`): IGNIS, THE ARMORED EYE-GOLEM (Crimson-Iron Plate)
        // - Map 4 (`caverns`): CRYOS, THE GLACIAL COLOSSUS (Sapphire-Cyan Ice Plate)
        // - Map 5 (`citadel`): VAELKOR, THE OBSIDIAN SOVEREIGN (Obsidian-Gold Royal Plate)
        // - Map 6 (`desert`): SKORPIUS, THE SUN-SCORPION BEHEMOTH (Solar-Amber Chitin Plate)
        // - Map 7 (`caldera`): PYRAX, THE MAGMA WYRM (Molten Crimson-Gold Dragon Plate)
        // =====================================================
        const isCryos = zone === "caverns";
        const isVaelkor = zone === "citadel";
        const isSkorpius = zone === "desert";
        const isPyrax = zone === "caldera";
        const bossArmorMat = registerMat(
          `bossMat-${id}`,
          isCryos
            ? new Color3(0.16, 0.62, 0.96)
            : isVaelkor
            ? new Color3(0.28, 0.12, 0.44)
            : isSkorpius
            ? new Color3(0.92, 0.62, 0.14)
            : isPyrax
            ? new Color3(0.96, 0.26, 0.08)
            : new Color3(0.76, 0.11, 0.19),
          isCryos
            ? new Color3(0.06, 0.24, 0.45)
            : isVaelkor
            ? new Color3(0.12, 0.04, 0.22)
            : isSkorpius
            ? new Color3(0.32, 0.18, 0.03)
            : isPyrax
            ? new Color3(0.42, 0.08, 0.02)
            : new Color3(0.24, 0.03, 0.06),
          new Color3(0.92, 0.85, 0.95),
          1.0,
          76
        );
        const bossSilverMat = registerMat(
          `bossSilverMat-${id}`,
          isCryos ? new Color3(0.76, 0.94, 1.0) : new Color3(0.84, 0.88, 0.96),
          new Color3(0.08, 0.09, 0.14),
          new Color3(1.0, 1.0, 1.0),
          1.0,
          96
        );
        const bossGoldMat = registerMat(
          `bossGoldMat-${id}`,
          isCryos ? new Color3(0.38, 0.88, 1.0) : new Color3(1.0, 0.82, 0.22),
          isCryos ? new Color3(0.12, 0.36, 0.52) : new Color3(0.32, 0.2, 0.03),
          new Color3(1.0, 0.95, 0.78),
          1.0,
          84
        );
        const bossCapeMat = registerMat(
          `bossCapeMat-${id}`,
          isCryos
            ? new Color3(0.08, 0.32, 0.64)
            : isVaelkor
            ? new Color3(0.68, 0.08, 0.18)
            : isSkorpius
            ? new Color3(0.14, 0.52, 0.68)
            : isPyrax
            ? new Color3(0.18, 0.06, 0.04)
            : new Color3(0.34, 0.07, 0.44),
          new Color3(0.11, 0.02, 0.16),
          new Color3(0.45, 0.28, 0.55),
          1.0,
          42
        );

        const bossArmorParts: Mesh[] = [];
        const bossSilverParts: Mesh[] = [];
        const bossGoldParts: Mesh[] = [];
        const bossObsidianParts: Mesh[] = [];
        const bossCapeParts: Mesh[] = [];
        const bossHornParts: Mesh[] = [];
        const bossCrimsonParts: Mesh[] = [];

        // 1. Articulated Clawed Sabatons, Fluted Greaves, Diamond Knee Poleyns & Thigh Cuisses
        for (const lx of [-0.64, 0.64]) {
          const sabatonBase = MeshBuilder.CreateBox(
            `bossSabaton-${id}-${lx}`,
            { width: 0.76, height: 0.34, depth: 1.08 },
            scene
          );
          sabatonBase.position.set(lx, 0.17, 0.14);
          bossSilverParts.push(sabatonBase);

          for (const clawOff of [-0.2, 0, 0.2]) {
            const claw = MeshBuilder.CreateCylinder(
              `bossClaw-${id}-${lx}-${clawOff}`,
              { diameterTop: 0.02, diameterBottom: 0.18, height: 0.32, tessellation: 8 },
              scene
            );
            claw.rotation.x = Math.PI / 2;
            claw.position.set(lx + clawOff, 0.14, 0.74);
            bossGoldParts.push(claw);
          }

          const greave = MeshBuilder.CreateCylinder(
            `bossGreave-${id}-${lx}`,
            { diameterTop: 0.72, diameterBottom: 0.82, height: 1.05, tessellation: 16 },
            scene
          );
          greave.position.set(lx, 0.68, 0);
          bossObsidianParts.push(greave);

          const shinPlate = MeshBuilder.CreateCylinder(
            `bossShinPlate-${id}-${lx}`,
            { diameterTop: 0.58, diameterBottom: 0.48, height: 0.88, tessellation: 12 },
            scene
          );
          shinPlate.scaling.set(0.95, 1.0, 0.65);
          shinPlate.position.set(lx, 0.68, 0.22);
          bossArmorParts.push(shinPlate);

          const kneeGuard = MeshBuilder.CreatePolyhedron(
            `bossKnee-${id}-${lx}`,
            { type: 1, size: 0.32 },
            scene
          );
          kneeGuard.scaling.set(1.18, 1.25, 0.78);
          kneeGuard.position.set(lx, 1.12, 0.42);
          bossSilverParts.push(kneeGuard);

          const kneeSpike = MeshBuilder.CreateCylinder(
            `bossKneeSpike-${id}-${lx}`,
            { diameterTop: 0.02, diameterBottom: 0.18, height: 0.32, tessellation: 10 },
            scene
          );
          kneeSpike.rotation.x = Math.PI / 2 - 0.22;
          kneeSpike.position.set(lx, 1.16, 0.62);
          bossGoldParts.push(kneeSpike);
        }

        // 2. Armored Pelvis, Segmented Tasset Plates & Imperial Gilded War-Belt
        const pelvis = MeshBuilder.CreateCylinder(
          `bossPelvis-${id}`,
          { diameterTop: 1.72, diameterBottom: 2.02, height: 0.78, tessellation: 16 },
          scene
        );
        pelvis.position.set(0, 1.28, 0);
        bossObsidianParts.push(pelvis);

        for (let tIdx = -2; tIdx <= 2; tIdx++) {
          const angle = tIdx * 0.45;
          const tasset = MeshBuilder.CreateBox(
            `bossTasset-${id}-${tIdx}`,
            { width: 0.52, height: 0.56, depth: 0.16 },
            scene
          );
          tasset.position.set(
            Math.sin(angle) * 0.92,
            1.18,
            Math.cos(angle) * 0.78
          );
          tasset.rotation.y = angle;
          tasset.rotation.x = -0.18;
          if (Math.abs(tIdx) === 1) {
            bossSilverParts.push(tasset);
          } else {
            bossArmorParts.push(tasset);
          }
        }

        const warBelt = MeshBuilder.CreateCylinder(
          `bossWarBelt-${id}`,
          { diameterTop: 1.88, diameterBottom: 1.88, height: 0.24, tessellation: 18 },
          scene
        );
        warBelt.scaling.set(1.08, 1.0, 0.85);
        warBelt.position.set(0, 1.56, 0);
        bossGoldParts.push(warBelt);

        const beltBuckle = MeshBuilder.CreatePolyhedron(
          `bossBeltBuckle-${id}`,
          { type: 1, size: 0.34 },
          scene
        );
        beltBuckle.scaling.set(1.2, 0.95, 0.55);
        beltBuckle.position.set(0, 1.56, 0.84);
        bossSilverParts.push(beltBuckle);

        const beltGem = MeshBuilder.CreateSphere(
          `bossBeltGem-${id}`,
          { diameter: 0.26, segments: 12 },
          scene
        );
        beltGem.position.set(0, 1.56, 0.94);
        bossCrimsonParts.push(beltGem);

        // 3. Sculpted Barrel Torso, Silver Rib Plackart, Gilded Filigree & Glowing Eclipse Chest Core
        const torso = MeshBuilder.CreateCylinder(
          `bossTorso-${id}`,
          { diameterTop: 2.62, diameterBottom: 1.62, height: 1.68, tessellation: 20 },
          scene
        );
        torso.scaling.set(1.14, 1.0, 0.84);
        torso.position.set(0, 2.26, 0);
        bossArmorParts.push(torso);

        const plackart = MeshBuilder.CreateCylinder(
          `bossPlackart-${id}`,
          { diameterTop: 2.24, diameterBottom: 1.52, height: 0.98, tessellation: 16 },
          scene
        );
        plackart.scaling.set(1.08, 1.0, 0.88);
        plackart.position.set(0, 2.02, 0.06);
        bossSilverParts.push(plackart);

        for (const ribY of [1.88, 2.15, 2.42]) {
          const ribBand = MeshBuilder.CreateTorus(
            `bossRib-${id}-${ribY}`,
            { diameter: 1.92 + (ribY - 1.88) * 0.55, thickness: 0.09, tessellation: 20 },
            scene
          );
          ribBand.scaling.set(1.1, 1.0, 0.82);
          ribBand.position.set(0, ribY, 0.05);
          bossGoldParts.push(ribBand);
        }

        // Royal Velvet Mantle Cape with Gilded Trim & High Collar
        const cape = MeshBuilder.CreateBox(
          `bossCape-${id}`,
          { width: 2.48, height: 2.65, depth: 0.16 },
          scene
        );
        cape.position.set(0, 1.78, -0.86);
        cape.rotation.x = 0.19;
        bossCapeParts.push(cape);

        const capeTrimBottom = MeshBuilder.CreateBox(
          `bossCapeTrim-${id}`,
          { width: 2.54, height: 0.22, depth: 0.2 },
          scene
        );
        capeTrimBottom.position.set(0, 0.56, -1.09);
        capeTrimBottom.rotation.x = 0.19;
        bossGoldParts.push(capeTrimBottom);

        const highCollar = MeshBuilder.CreateCylinder(
          `bossCollar-${id}`,
          { diameterTop: 1.68, diameterBottom: 1.42, height: 0.46, tessellation: 16 },
          scene
        );
        highCollar.position.set(0, 3.08, -0.18);
        highCollar.rotation.x = -0.25;
        bossGoldParts.push(highCollar);

        // 4. Multi-Tiered Floating Pauldrons with Silver Rims, Gold Trim & Ivory Spikes
        for (const sx of [-1, 1]) {
          const pauldron = MeshBuilder.CreateSphere(
            `bossPauldron-${id}-${sx}`,
            { diameter: 1.44, segments: 18 },
            scene
          );
          pauldron.scaling.set(1.2, 0.88, 1.08);
          pauldron.position.set(sx * 1.52, 2.88, 0);
          bossArmorParts.push(pauldron);

          const pauldronUpper = MeshBuilder.CreateSphere(
            `bossPauldronUpper-${id}-${sx}`,
            { diameter: 1.12, segments: 16 },
            scene
          );
          pauldronUpper.scaling.set(1.15, 0.78, 1.02);
          pauldronUpper.position.set(sx * 1.38, 3.12, 0);
          bossSilverParts.push(pauldronUpper);

          const pauldronRim = MeshBuilder.CreateTorus(
            `bossPauldronRim-${id}-${sx}`,
            { diameter: 1.38, thickness: 0.14, tessellation: 20 },
            scene
          );
          pauldronRim.rotation.z = -sx * 0.32;
          pauldronRim.position.set(sx * 1.52, 2.74, 0);
          bossGoldParts.push(pauldronRim);

          const pSpike = MeshBuilder.CreateCylinder(
            `bossPSpike-${id}-${sx}`,
            { diameterTop: 0.04, diameterBottom: 0.36, height: 0.98, tessellation: 12 },
            scene
          );
          pSpike.position.set(sx * 1.95, 3.36, 0);
          pSpike.rotation.z = -sx * 0.68;
          bossHornParts.push(pSpike);

          const pSubSpike = MeshBuilder.CreateCylinder(
            `bossPSubSpike-${id}-${sx}`,
            { diameterTop: 0.03, diameterBottom: 0.24, height: 0.58, tessellation: 10 },
            scene
          );
          pSubSpike.position.set(sx * 1.56, 3.48, 0);
          pSubSpike.rotation.z = -sx * 0.36;
          bossGoldParts.push(pSubSpike);

          const arm = MeshBuilder.CreateCylinder(
            `bossArm-${id}-${sx}`,
            { diameterTop: 0.58, diameterBottom: 0.48, height: 1.15, tessellation: 14 },
            scene
          );
          arm.position.set(sx * 1.52, 2.12, 0.24);
          arm.rotation.z = -sx * 0.18;
          arm.rotation.x = -0.35;
          bossObsidianParts.push(arm);

          const vambrace = MeshBuilder.CreateCylinder(
            `bossVambrace-${id}-${sx}`,
            { diameterTop: 0.62, diameterBottom: 0.68, height: 0.68, tessellation: 14 },
            scene
          );
          vambrace.position.set(sx * 1.58, 1.72, 0.46);
          vambrace.rotation.x = Math.PI / 3.2;
          bossSilverParts.push(vambrace);

          const gauntletCuff = MeshBuilder.CreateTorus(
            `bossCuff-${id}-${sx}`,
            { diameter: 0.66, thickness: 0.1, tessellation: 16 },
            scene
          );
          gauntletCuff.position.set(sx * 1.58, 1.88, 0.36);
          gauntletCuff.rotation.x = Math.PI / 3.2;
          bossGoldParts.push(gauntletCuff);
        }

        // 5. Crowned Obsidian Great-Helm, Sculpted Silver Faceplate, Gold Crown Peaks & Twin Curved Horns
        const bossHelm = MeshBuilder.CreateSphere(
          `bossHelm-${id}`,
          { diameter: 1.24, segments: 18 },
          scene
        );
        bossHelm.scaling.set(0.98, 1.14, 1.04);
        bossHelm.position.set(0, 3.42, 0.12);
        bossObsidianParts.push(bossHelm);

        const faceplate = MeshBuilder.CreateCylinder(
          `bossFaceplate-${id}`,
          { diameterTop: 0.96, diameterBottom: 0.72, height: 0.68, tessellation: 12 },
          scene
        );
        faceplate.position.set(0, 3.24, 0.26);
        bossArmorParts.push(faceplate);

        const silverBevor = MeshBuilder.CreateCylinder(
          `bossSilverBevor-${id}`,
          { diameterTop: 0.92, diameterBottom: 0.66, height: 0.38, tessellation: 12 },
          scene
        );
        silverBevor.position.set(0, 3.08, 0.31);
        bossSilverParts.push(silverBevor);

        const browGuard = MeshBuilder.CreateBox(
          `bossBrowGuard-${id}`,
          { width: 0.92, height: 0.14, depth: 0.32 },
          scene
        );
        browGuard.position.set(0, 3.54, 0.5);
        bossGoldParts.push(browGuard);

        const helmCrownRing = MeshBuilder.CreateTorus(
          `bossHelmCrown-${id}`,
          { diameter: 1.14, thickness: 0.11, tessellation: 20 },
          scene
        );
        helmCrownRing.position.set(0, 3.74, 0.12);
        bossGoldParts.push(helmCrownRing);

        for (let c = 0; c < 5; c++) {
          const ca = (c / 5) * Math.PI * 2;
          const crownSpike = MeshBuilder.CreatePolyhedron(
            `bossCrownSpike-${id}-${c}`,
            { type: 1, size: 0.18 },
            scene
          );
          crownSpike.scaling.set(0.85, 1.6, 0.85);
          crownSpike.position.set(
            Math.sin(ca) * 0.54,
            3.92,
            0.12 + Math.cos(ca) * 0.54
          );
          bossGoldParts.push(crownSpike);
        }

        for (const hx of [-1, 1]) {
          const hornPath = [
            new Vector3(hx * 0.44, 3.58, 0.08),
            new Vector3(hx * 0.98, 3.76, 0.18),
            new Vector3(hx * 1.36, 4.12, 0.44),
            new Vector3(hx * 1.2, 4.58, 0.72),
          ];
          const horn = MeshBuilder.CreateTube(
            `bossHorn-${id}-${hx}`,
            {
              path: hornPath,
              radiusFunction: (idx) => 0.26 * (1 - idx * 0.27),
              tessellation: 14,
              cap: Mesh.CAP_ALL,
            },
            scene
          );
          bossHornParts.push(horn);

          // Golden Horn Collar Ring at base of each horn
          const hornCollar = MeshBuilder.CreateTorus(
            `bossHornCollar-${id}-${hx}`,
            { diameter: 0.54, thickness: 0.1, tessellation: 14 },
            scene
          );
          hornCollar.position.set(hx * 0.56, 3.62, 0.12);
          hornCollar.rotation.z = hx * 1.15;
          bossGoldParts.push(hornCollar);
        }

        // 6. Recessed Eclipse Core Frame, Glowing Open Eye Weak Point, Fierce Slanted Eyes & Spiked Eclipse Halo
        const coreBezel = MeshBuilder.CreateTorus(
          `bossCoreBezel-${id}`,
          { diameter: 1.08, thickness: 0.16, tessellation: 20 },
          scene
        );
        coreBezel.rotation.x = Math.PI / 2;
        coreBezel.scaling.set(1.22, 1.0, 0.78);
        coreBezel.position.set(0, 2.38, 0.82);
        bossGoldParts.push(coreBezel);

        const chestEyeSclera = MeshBuilder.CreateSphere(
          `bossChestEyeSclera-${id}`,
          { diameter: 0.96, segments: 16 },
          scene
        );
        chestEyeSclera.scaling.set(1.22, 0.78, 0.42);
        chestEyeSclera.position.set(0, 2.38, 0.84);
        chestEyeSclera.material = whiteEyeMat;
        chestEyeSclera.parent = body;

        const chestCore = MeshBuilder.CreateSphere(
          `bossChestCore-${id}`,
          { diameter: 0.56, segments: 14 },
          scene
        );
        chestCore.scaling.set(1.05, 0.95, 0.38);
        chestCore.position.set(0, 2.38, 0.98);
        bossCrimsonParts.push(chestCore);

        const chestEyePupil = MeshBuilder.CreateBox(
          `bossChestEyePupil-${id}`,
          { width: 0.12, height: 0.42, depth: 0.12 },
          scene
        );
        chestEyePupil.position.set(0, 2.38, 1.06);
        bossObsidianParts.push(chestEyePupil);

        for (const ex of [-0.23, 0.23]) {
          const eye = MeshBuilder.CreateBox(
            `bossEye-${id}-${ex}`,
            { width: 0.26, height: 0.11, depth: 0.16 },
            scene
          );
          eye.position.set(ex, 3.43, 0.64);
          eye.rotation.z = ex > 0 ? -0.26 : 0.26;
          bossCrimsonParts.push(eye);
        }

        const eclipseHalo = MeshBuilder.CreateTorus(
          `bossEclipseHalo-${id}`,
          { diameter: 2.1, thickness: 0.17, tessellation: 28 },
          scene
        );
        eclipseHalo.rotation.x = Math.PI / 2;
        eclipseHalo.position.set(0, 3.68, -0.48);
        bossCrimsonParts.push(eclipseHalo);

        for (let hIdx = 0; hIdx < 6; hIdx++) {
          const ha = (hIdx / 6) * Math.PI * 2;
          const haloRay = MeshBuilder.CreatePolyhedron(
            `bossHaloRay-${id}-${hIdx}`,
            { type: 1, size: 0.2 },
            scene
          );
          haloRay.position.set(
            Math.cos(ha) * 1.18,
            3.68 + Math.sin(ha) * 1.18,
            -0.48
          );
          bossGoldParts.push(haloRay);
        }

        // Merge Malakor body groups by material to keep draw calls ultra-fast!
        mergeGroupWithMaterial(`bossArmorMerged-${id}`, bossArmorParts, bossArmorMat, body);
        mergeGroupWithMaterial(`bossSilverMerged-${id}`, bossSilverParts, bossSilverMat, body);
        mergeGroupWithMaterial(`bossGoldMerged-${id}`, bossGoldParts, bossGoldMat, body);
        mergeGroupWithMaterial(`bossObsidianMerged-${id}`, bossObsidianParts, darkObsidianMat, body);
        mergeGroupWithMaterial(`bossCapeMerged-${id}`, bossCapeParts, bossCapeMat, body);
        mergeGroupWithMaterial(`bossHornsMerged-${id}`, bossHornParts, boneHornMat, body);
        mergeGroupWithMaterial(`bossCrimsonMerged-${id}`, bossCrimsonParts, glowingCrimsonMat, body);

        // 7. Ornate Dread Cleaver Greataxe (Gilded Shaft, Polished Silver Twin Crescent Blades & Crimson Core)
        const axeGoldParts: Mesh[] = [];
        const axeSilverParts: Mesh[] = [];
        const axeCrimsonParts: Mesh[] = [];

        const axeShaft = MeshBuilder.CreateCylinder(
          `bossAxeShaft-${id}`,
          { diameter: 0.22, height: 3.55, tessellation: 14 },
          scene
        );
        axeShaft.rotation.x = Math.PI / 2;
        axeShaft.position.set(1.55, 1.95, 0.88);
        axeShaft.material = darkObsidianMat;
        axeShaft.parent = weapon;

        for (const gz of [-0.55, 0.35, 1.35, 2.25]) {
          const gripRing = MeshBuilder.CreateTorus(
            `bossAxeRing-${id}-${gz}`,
            { diameter: 0.34, thickness: 0.08, tessellation: 14 },
            scene
          );
          gripRing.rotation.x = Math.PI / 2;
          gripRing.position.set(1.55, 1.95, gz);
          axeGoldParts.push(gripRing);
        }

        const axeCollar = MeshBuilder.CreateBox(
          `bossAxeCollar-${id}`,
          { width: 0.56, height: 0.42, depth: 0.68 },
          scene
        );
        axeCollar.position.set(1.55, 1.95, 1.88);
        axeGoldParts.push(axeCollar);

        const axeCoreGem = MeshBuilder.CreatePolyhedron(
          `bossAxeGem-${id}`,
          { type: 1, size: 0.24 },
          scene
        );
        axeCoreGem.position.set(1.55, 2.18, 1.88);
        axeCrimsonParts.push(axeCoreGem);

        for (const bx of [-0.62, 0.62]) {
          const innerBlade = MeshBuilder.CreateCylinder(
            `bossAxeInner-${id}-${bx}`,
            { diameterTop: 1.24, diameterBottom: 0.42, height: 0.16, tessellation: 16 },
            scene
          );
          innerBlade.scaling.set(1.12, 1.0, 0.64);
          innerBlade.position.set(1.55 + bx * 0.82, 1.95, 1.88);
          axeGoldParts.push(innerBlade);

          const crescentBlade = MeshBuilder.CreateCylinder(
            `bossAxeBlade-${id}-${bx}`,
            { diameterTop: 1.56, diameterBottom: 0.48, height: 0.12, tessellation: 18 },
            scene
          );
          crescentBlade.scaling.set(1.22, 1.0, 0.68);
          crescentBlade.position.set(1.55 + bx, 1.95, 1.88);
          axeSilverParts.push(crescentBlade);
        }

        const axeSpike = MeshBuilder.CreateCylinder(
          `bossAxeSpike-${id}`,
          { diameterTop: 0.03, diameterBottom: 0.36, height: 0.82, tessellation: 12 },
          scene
        );
        axeSpike.rotation.x = Math.PI / 2;
        axeSpike.position.set(1.55, 1.95, 2.82);
        axeSilverParts.push(axeSpike);

        const pommelCrystal = MeshBuilder.CreatePolyhedron(
          `bossAxePommel-${id}`,
          { type: 1, size: 0.24 },
          scene
        );
        pommelCrystal.position.set(1.55, 1.95, -0.95);
        axeGoldParts.push(pommelCrystal);

        mergeGroupWithMaterial(`bossAxeGold-${id}`, axeGoldParts, bossGoldMat, weapon);
        mergeGroupWithMaterial(`bossAxeSilver-${id}`, axeSilverParts, bladeMat, weapon);
        mergeGroupWithMaterial(`bossAxeCrimson-${id}`, axeCrimsonParts, glowingCrimsonMat, weapon);

        // Ground Lunge Path Telegraph Corridor for Boss Malakor (with +Z aligned arrowhead!)
        buildCorridorRig(2.7, 1.35);

        lungeShieldMesh = MeshBuilder.CreateSphere(
          `bossLungeShield-${id}`,
          { diameter: 4.2, segments: 16 },
          scene
        );
        lungeShieldMesh.position.set(0, 1.9, 0);
        lungeShieldMesh.material = makeMat(
          `bossLungeShieldMat-${id}`,
          new Color3(1.0, 0.2, 0.25),
          new Color3(0.9, 0.15, 0.2),
          new Color3(1, 1, 1),
          0.42
        );
        lungeShieldMesh.parent = root;
        lungeShieldMesh.setEnabled(false);
      }

      // Overhead Spinning Stun Stars for Boss & Charging Monsters when they crash into a wall/obstacle!
      if (kind !== "archer") {
        const starY =
          kind === "boss" ? 4.35 : kind === "knight" ? 2.95 : kind === "goblin" ? 2.18 : 1.95;
        const starOrbitRad = kind === "boss" ? 1.25 : kind === "knight" ? 0.82 : 0.68;
        const starSize = kind === "boss" ? 0.3 : 0.2;

        stunStarsRoot = new TransformNode(`stunStars-${id}`, scene);
        stunStarsRoot.position.set(0, starY, 0);
        stunStarsRoot.parent = root;
        const starParts: Mesh[] = [];
        for (let s = 0; s < 4; s++) {
          const angle = (s / 4) * Math.PI * 2;
          const star = MeshBuilder.CreatePolyhedron(
            `stunStar-${id}-${s}`,
            { type: 1, size: starSize },
            scene
          );
          star.position.set(Math.cos(angle) * starOrbitRad, 0, Math.sin(angle) * starOrbitRad);
          star.isPickable = false;
          starParts.push(star);
        }
        const mergedStars = mergeGroupWithMaterial(
          `stunStarsMerged-${id}`,
          starParts,
          goldKeyMat,
          stunStarsRoot
        );
        if (mergedStars) mergedStars.isPickable = false;
        stunStarsRoot.setEnabled(false);
      }

      const telegraphRing = MeshBuilder.CreateTorus(
        `telegraph-${id}`,
        {
          diameter: kind === "boss" ? 4.6 : kind === "knight" ? 2.5 : 2.1,
          thickness: kind === "boss" ? 0.18 : 0.11,
          tessellation: 28,
        },
        scene
      );
      telegraphRing.position.set(0, 0.08, 0);
      telegraphRing.material = makeMat(
        `teleMat-${id}`,
        new Color3(1.0, 0.22, 0.18),
        new Color3(0.9, 0.15, 0.1)
      );
      telegraphRing.parent = root;

      const barY = kind === "boss" ? 4.85 : kind === "knight" ? 3.2 : 2.25;
      const barW = kind === "boss" ? 2.8 : 1.25;
      const hpBarHolder = new TransformNode(`hpHolder-${id}`, scene);
      hpBarHolder.rotation.set(-0.72, 0, 0);

      const hpBarBg = MeshBuilder.CreateBox(
        `hpBg-${id}`,
        { width: barW, height: 0.16, depth: 0.06 },
        scene
      );
      hpBarBg.material = makeMat(`hpBgMat-${id}`, new Color3(0.1, 0.1, 0.14));
      hpBarBg.parent = hpBarHolder;

      const hpBarFill = MeshBuilder.CreateBox(
        `hpFill-${id}`,
        { width: barW - 0.06, height: 0.12, depth: 0.09 },
        scene
      );
      hpBarFill.material = makeMat(
        `hpFillMat-${id}`,
        new Color3(0.95, 0.25, 0.28),
        new Color3(0.45, 0.08, 0.1)
      );
      hpBarFill.parent = hpBarHolder;

      // Burnable Wooden Shield & Glacial Ice Armor nodes (for Map 3 / Frontier enemies!)
      const woodShieldNode = new TransformNode(`enemyWoodShield-${id}`, scene);
      woodShieldNode.parent = body;
      const shieldY = kind === "knight" ? 1.18 : kind === "goblin" || kind === "archer" ? 0.94 : 0.65;
      const shieldZ = kind === "knight" ? 0.64 : kind === "goblin" || kind === "archer" ? 0.62 : 0.72;
      const shieldScale = kind === "knight" ? 1.25 : 1.0;

      const bucklerWood = MeshBuilder.CreateCylinder(
        `woodBuckler-${id}`,
        { diameter: 1.08 * shieldScale, height: 0.14, tessellation: 14 },
        scene
      );
      bucklerWood.rotation.x = Math.PI / 2;
      bucklerWood.position.set(-0.22, shieldY, shieldZ);
      bucklerWood.material = woodMat;
      bucklerWood.parent = woodShieldNode;

      const bucklerRim = MeshBuilder.CreateTorus(
        `woodBucklerRim-${id}`,
        { diameter: 1.08 * shieldScale, thickness: 0.09, tessellation: 16 },
        scene
      );
      bucklerRim.rotation.x = Math.PI / 2;
      bucklerRim.position.set(-0.22, shieldY, shieldZ + 0.05);
      bucklerRim.material = ironGateMat;
      bucklerRim.parent = woodShieldNode;

      const bucklerBoss = MeshBuilder.CreateSphere(
        `woodBucklerBoss-${id}`,
        { diameter: 0.32 * shieldScale, segments: 10 },
        scene
      );
      bucklerBoss.position.set(-0.22, shieldY, shieldZ + 0.1);
      bucklerBoss.material = goldKeyMat;
      bucklerBoss.parent = woodShieldNode;
      woodShieldNode.setEnabled(false);

      // Translucent Glacial Ice / Bramble Armor Shell (blocks normal attacks until melted with the Flame Rod!)
      const iceArmorNode = new TransformNode(`enemyIceArmor-${id}`, scene);
      iceArmorNode.position.set(
        0,
        kind === "boss" ? 2.15 : kind === "knight" ? 1.22 : kind === "slime" ? 0.72 : 1.0,
        0
      );
      iceArmorNode.parent = body;
      const iceParts: Mesh[] = [];
      const iceShell = MeshBuilder.CreatePolyhedron(
        `iceShell-${id}`,
        {
          type: 1,
          size:
            kind === "boss"
              ? 1.95
              : kind === "knight"
              ? 1.28
              : kind === "slime"
              ? 0.96
              : 1.06,
        },
        scene
      );
      iceShell.scaling.set(
        1.08,
        kind === "boss" ? 1.42 : kind === "knight" ? 1.38 : 1.15,
        1.08
      );
      iceParts.push(iceShell);

      for (let c = 0; c < 4; c++) {
        const ang = (c / 4) * Math.PI * 2 + 0.4;
        const shard = MeshBuilder.CreateCylinder(
          `iceShard-${id}-${c}`,
          {
            diameterTop: 0.04,
            diameterBottom: kind === "boss" ? 0.52 : 0.34,
            height: kind === "boss" ? 1.15 : 0.75,
            tessellation: 6,
          },
          scene
        );
        const rad = kind === "boss" ? 1.48 : kind === "knight" ? 0.95 : 0.78;
        shard.position.set(Math.cos(ang) * rad, 0.25, Math.sin(ang) * rad);
        shard.rotation.z = -Math.cos(ang) * 0.55;
        shard.rotation.x = Math.sin(ang) * 0.55;
        iceParts.push(shard);
      }
      mergeGroupWithMaterial(`enemyIceArmorMerged-${id}`, iceParts, iceArmorMat, iceArmorNode);
      iceArmorNode.setEnabled(false);

      // Electrified / Spiked Shock Aura Ring (shocks Hero on contact/melee unless stunned by Boomerang!)
      const shockAuraNode = new TransformNode(`enemyShockAura-${id}`, scene);
      shockAuraNode.position.set(0, kind === "knight" ? 1.15 : kind === "slime" ? 0.66 : 0.92, 0);
      shockAuraNode.parent = body;
      const shockParts: Mesh[] = [];
      const shockRing = MeshBuilder.CreateTorus(
        `shockAuraRing-${id}`,
        { diameter: kind === "knight" ? 1.95 : 1.56, thickness: 0.085, tessellation: 20 },
        scene
      );
      shockParts.push(shockRing);

      for (let s = 0; s < 8; s++) {
        const ang = (s / 8) * Math.PI * 2;
        const spike = MeshBuilder.CreateCylinder(
          `shockSpike-${id}-${s}`,
          { diameterTop: 0.02, diameterBottom: 0.22, height: 0.56, tessellation: 6 },
          scene
        );
        const rad = kind === "knight" ? 0.98 : 0.78;
        spike.position.set(Math.cos(ang) * rad, (s % 2 === 0 ? 0.14 : -0.06), Math.sin(ang) * rad);
        spike.rotation.z = -Math.cos(ang) * 1.15;
        spike.rotation.x = Math.sin(ang) * 1.15;
        shockParts.push(spike);
      }
      mergeGroupWithMaterial(`enemyShockAuraMerged-${id}`, shockParts, shockSpikeMat, shockAuraNode);
      shockAuraNode.setEnabled(false);

      // Gold/Crimson Bounty Monster Crown & Orbiting Bounty Ring (for 5x Rupee Bounty Monsters!)
      const bountyAuraNode = new TransformNode(`enemyBountyAura-${id}`, scene);
      bountyAuraNode.position.set(0, 0, 0);
      bountyAuraNode.parent = body;

      const crownY =
        kind === "knight" ? 2.45 : kind === "goblin" || kind === "archer" ? 1.85 : 1.38;
      const bountyCrownRing = MeshBuilder.CreateTorus(
        `bountyCrownRing-${id}`,
        { diameter: kind === "knight" ? 0.86 : 0.68, thickness: 0.12, tessellation: 16 },
        scene
      );
      bountyCrownRing.position.set(0, crownY, 0);
      bountyCrownRing.material = goldKeyMat;
      bountyCrownRing.parent = bountyAuraNode;

      for (let p = 0; p < 4; p++) {
        const pAng = (p / 4) * Math.PI * 2;
        const rad = kind === "knight" ? 0.38 : 0.3;
        const spike = MeshBuilder.CreatePolyhedron(
          `bountyCrownGem-${id}-${p}`,
          { type: 1, size: 0.14 },
          scene
        );
        spike.position.set(Math.cos(pAng) * rad, crownY + 0.14, Math.sin(pAng) * rad);
        spike.material = p % 2 === 0 ? goldKeyMat : glowingCrimsonMat;
        spike.parent = bountyAuraNode;
      }

      const bountyFloorRing = MeshBuilder.CreateTorus(
        `bountyFloorRing-${id}`,
        { diameter: kind === "knight" ? 2.35 : 1.85, thickness: 0.1, tessellation: 24 },
        scene
      );
      bountyFloorRing.position.set(0, 0.14, 0);
      bountyFloorRing.material = goldKeyMat;
      bountyFloorRing.parent = bountyAuraNode;
      bountyAuraNode.setEnabled(false);

      tagHierarchyMetadata(root, "enemy", id);

      return {
        root,
        body,
        weapon,
        telegraphRing,
        hpBarHolder,
        hpBarBg,
        hpBarFill,
        barWidth: barW - 0.06,
        barY,
        materials,
        baseColors,
        chargeCorridorRoot,
        chargeCorridorBody,
        chargeCorridorTip,
        chargeCorridorMat,
        lungeShieldMesh,
        stunStarsRoot,
        archerAimLine,
        woodShieldNode,
        iceArmorNode,
        shockAuraNode,
        bountyAuraNode,
      };
    };

    const buildProjectileRig = (
      id: string,
      aoeRadius: number,
      directRadius: number
    ): ProjectileVisualRig => {
      const root = new TransformNode(`projRoot-${id}`, scene);

      const orbMat = makeMat(
        `projOrbMat-${id}`,
        new Color3(0.55, 1.0, 0.2),
        new Color3(0.45, 0.85, 0.12)
      );
      const orb = MeshBuilder.CreateSphere(
        `projOrb-${id}`,
        { diameter: 0.88, segments: 14 },
        scene
      );
      orb.material = orbMat;
      orb.parent = root;

      const outerRing = MeshBuilder.CreateTorus(
        `projOuterRing-${id}`,
        { diameter: aoeRadius * 2, thickness: 0.14, tessellation: 32 },
        scene
      );
      outerRing.material = makeMat(
        `projOuterMat-${id}`,
        new Color3(1.0, 0.45, 0.15),
        new Color3(0.95, 0.35, 0.1)
      );
      outerRing.parent = root;

      const innerCoreRing = MeshBuilder.CreateTorus(
        `projInnerRing-${id}`,
        { diameter: directRadius * 2, thickness: 0.12, tessellation: 24 },
        scene
      );
      innerCoreRing.material = makeMat(
        `projInnerMat-${id}`,
        new Color3(1.0, 0.15, 0.2),
        new Color3(0.95, 0.1, 0.15)
      );
      innerCoreRing.parent = root;

      const fillDisc = MeshBuilder.CreateCylinder(
        `projFillDisc-${id}`,
        { diameter: aoeRadius * 2, height: 0.04, tessellation: 28 },
        scene
      );
      fillDisc.material = makeMat(
        `projFillMat-${id}`,
        new Color3(0.95, 0.3, 0.15),
        new Color3(0.75, 0.2, 0.08),
        new Color3(0, 0, 0),
        0.32
      );
      fillDisc.parent = root;

      const arcDots: Mesh[] = [];
      for (let d = 0; d < 7; d++) {
        const dot = MeshBuilder.CreateSphere(
          `projArcDot-${id}-${d}`,
          { diameter: 0.24, segments: 8 },
          scene
        );
        dot.material = orbMat;
        dot.parent = root;
        arcDots.push(dot);
      }

      return { root, orb, outerRing, innerCoreRing, fillDisc, arcDots };
    };

    const buildHazardRig = (id: string, radius: number): HazardVisualRig => {
      const root = new TransformNode(`hazardRoot-${id}`, scene);

      const poolDisc = MeshBuilder.CreateCylinder(
        `hazardPool-${id}`,
        { diameter: radius * 2, height: 0.06, tessellation: 28 },
        scene
      );
      poolDisc.material = makeMat(
        `hazardPoolMat-${id}`,
        new Color3(0.38, 0.88, 0.18),
        new Color3(0.28, 0.65, 0.1),
        new Color3(0, 0, 0),
        0.65
      );
      poolDisc.parent = root;

      const rimRing = MeshBuilder.CreateTorus(
        `hazardRim-${id}`,
        { diameter: radius * 2, thickness: 0.14, tessellation: 28 },
        scene
      );
      rimRing.material = makeMat(
        `hazardRimMat-${id}`,
        new Color3(0.95, 0.42, 0.12),
        new Color3(0.85, 0.3, 0.08)
      );
      rimRing.parent = root;

      const bubMat = makeMat(
        `hazardBubMat-${id}`,
        new Color3(0.65, 1.0, 0.25),
        new Color3(0.45, 0.85, 0.15)
      );
      const bubbles: Mesh[] = [];
      for (let b = 0; b < 5; b++) {
        const bub = MeshBuilder.CreateSphere(
          `hazardBub-${id}-${b}`,
          { diameter: 0.42, segments: 10 },
          scene
        );
        bub.material = bubMat;
        bub.parent = root;
        bubbles.push(bub);
      }

      return { root, poolDisc, rimRing, bubbles };
    };

    // =========================================================
    // 3D MAGIC FIREBALL, BURNING GROUND FIRE ZONE & GOLDEN BEE BUILDERS
    // =========================================================
    const fireballRigs = new Map<string, TransformNode>();
    const fireZoneRigs = new Map<
      string,
      { root: TransformNode; disc: Mesh; ring: Mesh; flames: Mesh[] }
    >();
    const beeRigs = new Map<
      string,
      { root: TransformNode; wingL: Mesh; wingR: Mesh }
    >();

    const fireballCoreMat = makeMat(
      "fireballCoreMat",
      new Color3(1.0, 0.92, 0.28),
      new Color3(1.0, 0.78, 0.18)
    );
    const fireballCoronaMat = makeMat(
      "fireballCoronaMat",
      new Color3(1.0, 0.36, 0.12),
      new Color3(0.95, 0.25, 0.06),
      new Color3(0, 0, 0),
      0.68
    );

    const buildFireballRig = (id: string, isCharged: boolean): TransformNode => {
      const root = new TransformNode(`fireball-${id}`, scene);
      const scale = isCharged ? 1.55 : 1.0;

      const core = MeshBuilder.CreateSphere(
        `fbCore-${id}`,
        { diameter: 0.56 * scale, segments: 12 },
        scene
      );
      core.material = fireballCoreMat;
      core.isPickable = false;
      core.parent = root;

      const corona = MeshBuilder.CreateSphere(
        `fbCorona-${id}`,
        { diameter: 0.88 * scale, segments: 12 },
        scene
      );
      corona.scaling.set(0.95, 0.95, 1.35);
      corona.position.set(0, 0, -0.14 * scale);
      corona.material = fireballCoronaMat;
      corona.isPickable = false;
      corona.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `fbRing-${id}`,
        { diameter: 0.92 * scale, thickness: 0.1 * scale, tessellation: 18 },
        scene
      );
      ring.rotation.x = Math.PI / 2;
      ring.material = goldKeyMat;
      ring.isPickable = false;
      ring.parent = root;

      return root;
    };

    const buildFireZoneRig = (id: string, radius: number) => {
      const root = new TransformNode(`fireZoneRoot-${id}`, scene);

      const disc = MeshBuilder.CreateCylinder(
        `fzDisc-${id}`,
        { diameter: radius * 2, height: 0.06, tessellation: 28 },
        scene
      );
      disc.position.set(0, 0.035, 0);
      disc.material = makeMat(
        `fzDiscMat-${id}`,
        new Color3(1.0, 0.34, 0.08),
        new Color3(0.92, 0.22, 0.04),
        new Color3(0, 0, 0),
        0.58
      );
      disc.isPickable = false;
      disc.parent = root;

      const ring = MeshBuilder.CreateTorus(
        `fzRing-${id}`,
        { diameter: radius * 2, thickness: 0.16, tessellation: 28 },
        scene
      );
      ring.position.set(0, 0.08, 0);
      ring.material = fireballCoreMat;
      ring.isPickable = false;
      ring.parent = root;

      const flames: Mesh[] = [];
      for (let f = 0; f < 7; f++) {
        const tongue = MeshBuilder.CreateCylinder(
          `fzTongue-${id}-${f}`,
          { diameterTop: 0.04, diameterBottom: 0.56, height: 1.05, tessellation: 10 },
          scene
        );
        tongue.material = f % 2 === 0 ? fireballCoreMat : fireballCoronaMat;
        tongue.isPickable = false;
        tongue.parent = root;
        flames.push(tongue);
      }

      return { root, disc, ring, flames };
    };

    const buildBeeRig = (id: string) => {
      const root = new TransformNode(`beeRoot-${id}`, scene);

      const abdomen = MeshBuilder.CreateSphere(
        `beeBody-${id}`,
        { diameter: 0.42, segments: 12 },
        scene
      );
      abdomen.scaling.set(0.88, 0.82, 1.32);
      abdomen.material = goldKeyMat;
      abdomen.isPickable = false;
      abdomen.parent = root;

      const stripe = MeshBuilder.CreateTorus(
        `beeStripe-${id}`,
        { diameter: 0.38, thickness: 0.09, tessellation: 14 },
        scene
      );
      stripe.rotation.x = Math.PI / 2;
      stripe.material = darkObsidianMat;
      stripe.isPickable = false;
      stripe.parent = root;

      const stinger = MeshBuilder.CreateCylinder(
        `beeStinger-${id}`,
        { diameterTop: 0.01, diameterBottom: 0.12, height: 0.22, tessellation: 8 },
        scene
      );
      stinger.rotation.x = -Math.PI / 2;
      stinger.position.set(0, 0, -0.32);
      stinger.material = darkObsidianMat;
      stinger.isPickable = false;
      stinger.parent = root;

      const wingMat = makeMat(
        `beeWingMat-${id}`,
        new Color3(0.88, 0.96, 1.0),
        new Color3(0.45, 0.65, 0.85),
        new Color3(1, 1, 1),
        0.72
      );
      const wingL = MeshBuilder.CreateBox(
        `beeWingL-${id}`,
        { width: 0.36, height: 0.03, depth: 0.22 },
        scene
      );
      wingL.position.set(-0.22, 0.16, 0.04);
      wingL.material = wingMat;
      wingL.isPickable = false;
      wingL.parent = root;

      const wingR = MeshBuilder.CreateBox(
        `beeWingR-${id}`,
        { width: 0.36, height: 0.03, depth: 0.22 },
        scene
      );
      wingR.position.set(0.22, 0.16, 0.04);
      wingR.material = wingMat;
      wingR.isPickable = false;
      wingR.parent = root;

      return { root, wingL, wingR };
    };

    // =========================================================
    // 3D THROWN POTS/ROCKS & TICKING BOMBS / EXPLOSION SHOCKWAVES
    // =========================================================
    const thrownObjectRigs = new Map<string, TransformNode>();
    const bombRigs = new Map<
      string,
      {
        root: TransformNode;
        bodyNode: TransformNode;
        bodyMat: StandardMaterial;
        spark: Mesh;
        blastSphere: Mesh;
        blastRing: Mesh;
      }
    >();

    const buildThrownObjectRig = (
      id: string,
      kind: "clay_pot" | "light_rock"
    ): TransformNode => {
      const root = new TransformNode(`thrownObj-${id}`, scene);
      if (kind === "clay_pot") {
        const belly = MeshBuilder.CreateSphere(
          `thrownPotBelly-${id}`,
          { diameter: 0.96, segments: 12 },
          scene
        );
        belly.scaling.set(1.06, 0.94, 1.06);
        belly.material = clayPotMat;
        belly.isPickable = false;
        belly.parent = root;

        const rim = MeshBuilder.CreateTorus(
          `thrownPotRim-${id}`,
          { diameter: 0.62, thickness: 0.13, tessellation: 14 },
          scene
        );
        rim.position.set(0, 0.42, 0);
        rim.material = clayRimMat;
        rim.isPickable = false;
        rim.parent = root;
      } else {
        const stone = MeshBuilder.CreatePolyhedron(
          `thrownRock-${id}`,
          { type: 2, size: 0.54 },
          scene
        );
        stone.scaling.set(1.22, 0.86, 1.15);
        stone.material = lightRockMat;
        stone.isPickable = false;
        stone.parent = root;
      }
      return root;
    };

    const buildBombRig = (id: string) => {
      const root = new TransformNode(`bombRoot-${id}`, scene);
      const bodyNode = new TransformNode(`bombBodyNode-${id}`, scene);
      bodyNode.parent = root;

      const bodyMat = makeMat(
        `bombBodyMat-${id}`,
        new Color3(0.16, 0.22, 0.36),
        new Color3(0.04, 0.06, 0.12),
        new Color3(0.75, 0.82, 0.95),
        1.0,
        64
      );

      const sphere = MeshBuilder.CreateSphere(
        `bombSphere-${id}`,
        { diameter: 0.84, segments: 14 },
        scene
      );
      sphere.position.set(0, 0.42, 0);
      sphere.material = bodyMat;
      sphere.isPickable = false;
      sphere.parent = bodyNode;

      const cap = MeshBuilder.CreateCylinder(
        `bombCap-${id}`,
        { diameterTop: 0.24, diameterBottom: 0.3, height: 0.15, tessellation: 10 },
        scene
      );
      cap.position.set(0, 0.84, 0);
      cap.material = goldKeyMat;
      cap.isPickable = false;
      cap.parent = bodyNode;

      const fuseCord = MeshBuilder.CreateCylinder(
        `bombFuse-${id}`,
        { diameter: 0.06, height: 0.22, tessellation: 8 },
        scene
      );
      fuseCord.position.set(0, 0.98, 0);
      fuseCord.rotation.z = 0.25;
      fuseCord.material = woodMat;
      fuseCord.isPickable = false;
      fuseCord.parent = bodyNode;

      const spark = MeshBuilder.CreatePolyhedron(
        `bombSpark-${id}`,
        { type: 1, size: 0.16 },
        scene
      );
      spark.position.set(0.04, 1.1, 0);
      spark.material = fireballCoreMat;
      spark.isPickable = false;
      spark.parent = bodyNode;

      const blastSphere = MeshBuilder.CreateSphere(
        `bombBlastSphere-${id}`,
        { diameter: 1.0, segments: 16 },
        scene
      );
      blastSphere.position.set(0, 0.8, 0);
      blastSphere.material = fireballCoronaMat;
      blastSphere.isPickable = false;
      blastSphere.parent = root;
      blastSphere.setEnabled(false);

      const blastRing = MeshBuilder.CreateTorus(
        `bombBlastRing-${id}`,
        { diameter: 1.0, thickness: 0.12, tessellation: 28 },
        scene
      );
      blastRing.position.set(0, 0.14, 0);
      blastRing.material = fireballCoreMat;
      blastRing.isPickable = false;
      blastRing.parent = root;
      blastRing.setEnabled(false);

      return { root, bodyNode, bodyMat, spark, blastSphere, blastRing };
    };

    const hammerShockwaveRigs = new Map<
      string,
      { root: TransformNode; outerRing: Mesh; innerRing: Mesh; groundDisc: Mesh }
    >();
    const hammerShockDiscMat = makeMat(
      "hammerShockDiscMat",
      new Color3(1.0, 0.72, 0.22),
      new Color3(0.95, 0.58, 0.14),
      new Color3(0, 0, 0),
      0.32
    );

    const buildHammerShockwaveRig = (id: string) => {
      const root = new TransformNode(`hammerShockRoot-${id}`, scene);

      const outerRing = MeshBuilder.CreateTorus(
        `hammerShockOuter-${id}`,
        { diameter: 2.0, thickness: 0.14, tessellation: 32 },
        scene
      );
      outerRing.position.set(0, 0.14, 0);
      outerRing.material = fireballCoreMat;
      outerRing.isPickable = false;
      outerRing.parent = root;

      const innerRing = MeshBuilder.CreateTorus(
        `hammerShockInner-${id}`,
        { diameter: 1.35, thickness: 0.1, tessellation: 28 },
        scene
      );
      innerRing.position.set(0, 0.12, 0);
      innerRing.material = goldKeyMat;
      innerRing.isPickable = false;
      innerRing.parent = root;

      const groundDisc = MeshBuilder.CreateCylinder(
        `hammerShockDisc-${id}`,
        { diameter: 2.0, height: 0.03, tessellation: 28 },
        scene
      );
      groundDisc.position.set(0, 0.05, 0);
      groundDisc.material = hammerShockDiscMat;
      groundDisc.isPickable = false;
      groundDisc.parent = root;

      return { root, outerRing, innerRing, groundDisc };
    };

    // =========================================================
    // 3D BUSH CHOP LEAF, SHOVEL DIRT, CERAMIC POT & ROCK SHARD BURSTS
    // =========================================================
    const bushBurstRigs = new Map<string, BushBurstVisualRig>();
    const leafBrightMat = makeMat(
      "leafBrightMat",
      new Color3(0.46, 0.94, 0.34),
      new Color3(0.12, 0.28, 0.08),
      new Color3(0.2, 0.35, 0.15)
    );
    leafBrightMat.backFaceCulling = false;

    const leafEmeraldMat = makeMat(
      "leafEmeraldMat",
      new Color3(0.22, 0.78, 0.31),
      new Color3(0.06, 0.18, 0.07),
      new Color3(0.15, 0.3, 0.12)
    );
    leafEmeraldMat.backFaceCulling = false;

    const leafDeepMat = makeMat(
      "leafDeepMat",
      new Color3(0.14, 0.56, 0.22),
      new Color3(0.03, 0.11, 0.04),
      new Color3(0.1, 0.2, 0.08)
    );
    leafDeepMat.backFaceCulling = false;

    const buildBushBurstRig = (
      id: string,
      seed: number,
      isDirt = false,
      isCeramic = false,
      isRock = false
    ): BushBurstVisualRig => {
      const root = new TransformNode(`bushBurstRoot-${id}`, scene);
      const particles: BushLeafParticle[] = [];
      const count = 22;

      const pseudoRand = (n: number): number => {
        const x = Math.sin(seed * 19.73 + n * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      const isShard = isDirt || isCeramic || isRock;

      for (let i = 0; i < count; i++) {
        const isGrassBlade = !isShard && i % 3 === 0;
        let mesh: Mesh;
        let baseScale: Vector3;

        if (isGrassBlade) {
          mesh = MeshBuilder.CreateBox(
            `grassBlade-${id}-${i}`,
            { width: 0.09, height: 0.46, depth: 0.03 },
            scene
          );
          baseScale = new Vector3(
            0.85 + pseudoRand(i * 5 + 1) * 0.45,
            0.85 + pseudoRand(i * 5 + 2) * 0.65,
            1.0
          );
        } else {
          mesh = MeshBuilder.CreatePolyhedron(
            `leafPart-${id}-${i}`,
            { type: isShard ? 2 : 1, size: isShard ? 0.2 : 0.22 },
            scene
          );
          const s = 0.8 + pseudoRand(i * 7 + 1) * 0.55;
          baseScale = isCeramic
            ? new Vector3(1.15 * s, 0.35 * s, 0.85 * s)
            : isRock
            ? new Vector3(1.1 * s, 0.9 * s, 1.0 * s)
            : isDirt
            ? new Vector3(0.95 * s, 0.78 * s, 0.9 * s)
            : new Vector3(1.25 * s, 0.22 * s, 0.72 * s);
        }

        mesh.material = isCeramic
          ? i % 3 === 0
            ? clayRimMat
            : clayPotMat
          : isRock
          ? i % 4 === 0
            ? crackedFissureMat
            : i % 2 === 0
            ? lightRockMat
            : crackedRockMat
          : isDirt
          ? i % 3 === 0
            ? dirtPitMat
            : dirtSoilMat
          : i % 3 === 0
          ? leafBrightMat
          : i % 3 === 1
          ? leafEmeraldMat
          : leafDeepMat;
        mesh.isPickable = false;
        mesh.parent = root;

        const angle =
          (i / count) * Math.PI * 2 + (pseudoRand(i * 11 + 3) - 0.5) * 0.48;
        const speed = 2.4 + pseudoRand(i * 13 + 4) * 4.8;
        const vy = 4.8 + pseudoRand(i * 17 + 5) * 4.6;

        particles.push({
          mesh,
          vx: Math.cos(angle) * speed,
          vy,
          vz: Math.sin(angle) * speed,
          rx0: pseudoRand(i * 19 + 1) * Math.PI * 2,
          ry0: pseudoRand(i * 23 + 2) * Math.PI * 2,
          rz0: pseudoRand(i * 29 + 3) * Math.PI * 2,
          wx: (pseudoRand(i * 31 + 4) - 0.5) * 18.0,
          wy: (pseudoRand(i * 37 + 5) - 0.5) * 18.0,
          wz: (pseudoRand(i * 41 + 6) - 0.5) * 18.0,
          flutterFreq: 10.0 + pseudoRand(i * 43 + 7) * 8.0,
          flutterPhase: pseudoRand(i * 47 + 8) * Math.PI * 2,
          baseScale,
        });
      }

      return { root, particles };
    };

    // =========================================================
    // KEYBOARD & POINTER INPUT + MAP EDITOR 3D RAYCAST INTERACTION
    // =========================================================
    const pressedKeys = new Set<string>();
    let attackTriggeredOnce = false;
    let interactTriggeredOnce = false;
    let boomerangTriggeredOnce = false;
    let hookshotTriggeredOnce = false;
    let hammerTriggeredOnce = false;
    let bowTriggeredOnce = false;
    let fireRodTriggeredOnce = false;
    let shovelTriggeredOnce = false;
    let bottleTriggeredOnce = false;
    let bombTriggeredOnce = false;
    let dashTriggeredOnce = false;
    let leftMouseHeldInPlay = false;
    let rightMouseHeld = false;
    let leftMouseHeldInEditor = false;
    let isDraggingEntityInEditor = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let cursorGroundPos: { x: number; z: number } | null = null;

    const pickGroundPoint = (): { x: number; z: number } | null => {
      const snap = useGameStore.getState();
      const targetGround =
        snap.zone === "overworld"
          ? owGround
          : snap.zone === "grove"
          ? grGround
          : snap.zone === "frontier"
          ? frGround
          : snap.zone === "caverns"
          ? cvGround
          : snap.zone === "citadel"
          ? ctGround
          : snap.zone === "desert"
          ? dsGround
          : snap.zone === "caldera"
          ? caGround
          : snap.zone === "rift"
          ? riftGround
          : dgGround;
      const pick = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (m) => m === targetGround
      );
      if (pick?.hit && pick.pickedPoint) {
        return {
          x: Math.max(-40, Math.min(40, pick.pickedPoint.x)),
          z: Math.max(-40, Math.min(40, pick.pickedPoint.z)),
        };
      }
      return null;
    };

    const pickEditorEntity = (): { kind: EditorEntityKind; id: string } | null => {
      const pick = scene.pick(
        scene.pointerX,
        scene.pointerY,
        (m) => m.isEnabled() && Boolean(m.metadata?.editorKind && m.metadata?.editorId)
      );
      if (pick?.hit && pick.pickedMesh?.metadata) {
        return {
          kind: pick.pickedMesh.metadata.editorKind as EditorEntityKind,
          id: pick.pickedMesh.metadata.editorId as string,
        };
      }
      return null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Do not intercept keys if user is typing in an Editor Inspector input
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const code = e.code;
      const store = useGameStore.getState();

      // F2 or Tab toggles Unity-Style Play / Map Editor Mode!
      if (code === "F2" || code === "Tab") {
        e.preventDefault();
        store.setEditorMode(!store.editorMode);
        return;
      }

      if (store.editorMode) {
        if (code === "Delete" || code === "Backspace") {
          e.preventDefault();
          store.deleteSelectedEntity();
        } else if (code === "KeyD" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          store.duplicateSelectedEntity();
        }
        pressedKeys.add(code);
        return;
      }

      // C or I toggles Character Equipment & Glass Bottles Screen
      if ((code === "KeyC" || code === "KeyI") && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setCharacterOpen(!store.characterOpen);
        return;
      }

      // L toggles Quest Chronicle Modal
      if (code === "KeyL" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setQuestLogOpen(!store.questLogOpen);
        return;
      }

      // N toggles 3D Golden Wayfinder Guiding Path
      if (code === "KeyN" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.toggleWayfinder();
        return;
      }

      // M toggles Interactive World Atlas & Fast-Travel Map
      if (code === "KeyM" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setAtlasOpen(!store.atlasOpen);
        return;
      }

      // U toggles Master Blacksmith Forge & Weapon Enchantments
      if (code === "KeyU" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setForgeOpen(!store.forgeOpen);
        return;
      }

      // P toggles Procedural Abyssal Rift Console
      if (code === "KeyP" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setRiftOpen(!store.riftOpen);
        return;
      }

      // K toggles Spirit Companion Sanctuary & Ancient Relic Vault
      if (code === "KeyK" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setSanctuaryOpen(!store.sanctuaryOpen);
        return;
      }

      // Y whistles to summon/dismiss 3D Steed (or Shift+Y toggles Crossroads Royal Stables Modal!)
      if (code === "KeyY" && !pressedKeys.has(code)) {
        e.preventDefault();
        if (e.shiftKey) {
          store.setStablesOpen(!store.stablesOpen);
        } else {
          store.whistleToggleMount();
        }
        return;
      }

      // O toggles Grand Colosseum Wave Survival & Boss-Rush Gauntlet Modal
      if (code === "KeyO" && !pressedKeys.has(code)) {
        e.preventDefault();
        store.setColosseumOpen(!store.colosseumOpen);
        return;
      }

      if (
        code === "Space" ||
        code === "ArrowUp" ||
        code === "ArrowDown" ||
        code === "ArrowLeft" ||
        code === "ArrowRight"
      ) {
        e.preventDefault();
      }
      if (
        (code === "Space" || code === "KeyJ" || code === "KeyZ" || code === "Enter") &&
        !pressedKeys.has(code)
      ) {
        attackTriggeredOnce = true;
      }
      if (code === "KeyF" && !pressedKeys.has(code)) {
        interactTriggeredOnce = true;
      }
      if (
        (code === "KeyX" || code === "AltLeft" || code === "AltRight") &&
        !pressedKeys.has(code)
      ) {
        e.preventDefault();
        dashTriggeredOnce = true;
      }
      if ((code === "KeyQ" || code === "Digit1") && !pressedKeys.has(code)) {
        boomerangTriggeredOnce = true;
      }
      if ((code === "KeyE" || code === "Digit2") && !pressedKeys.has(code)) {
        bowTriggeredOnce = true;
      }
      if ((code === "KeyR" || code === "Digit3") && !pressedKeys.has(code)) {
        fireRodTriggeredOnce = true;
      }
      if ((code === "KeyG" || code === "Digit4") && !pressedKeys.has(code)) {
        shovelTriggeredOnce = true;
      }
      if ((code === "KeyV" || code === "Digit5") && !pressedKeys.has(code)) {
        if (code === "KeyV" && store.hero.bottles.length === 0) {
          store.whistleToggleMount();
        } else {
          bottleTriggeredOnce = true;
        }
      }
      if ((code === "KeyB" || code === "Digit6") && !pressedKeys.has(code)) {
        bombTriggeredOnce = true;
      }
      if ((code === "KeyH" || code === "Digit7") && !pressedKeys.has(code)) {
        hookshotTriggeredOnce = true;
      }
      if ((code === "KeyT" || code === "Digit8") && !pressedKeys.has(code)) {
        hammerTriggeredOnce = true;
      }
      pressedKeys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const onPointerDown = (e: PointerEvent) => {
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const store = useGameStore.getState();

      if (store.editorMode) {
        if (e.button === 2 || e.button === 1) {
          rightMouseHeld = true;
          return;
        }
        if (e.button === 0) {
          leftMouseHeldInEditor = true;
          const tool = store.editorTool;
          if (tool === "select") {
            const hitEntity = pickEditorEntity();
            if (hitEntity) {
              store.setEditorSelected(hitEntity);
              isDraggingEntityInEditor = true;
            } else {
              store.setEditorSelected(null);
              isDraggingEntityInEditor = false;
            }
          } else if (tool === "place") {
            const pt = pickGroundPoint();
            if (pt) {
              store.placeEntityAt(pt.x, pt.z);
            }
          } else if (tool === "delete") {
            const hitEntity = pickEditorEntity();
            if (hitEntity) {
              store.deleteEntity(hitEntity.kind, hitEntity.id);
            }
          } else if (tool === "terrain") {
            const pt = pickGroundPoint();
            if (pt) {
              store.applyTerrainStroke(pt.x, pt.z, 0.05);
            }
          }
        }
        return;
      }

      if (e.button === 0) {
        attackTriggeredOnce = true;
        leftMouseHeldInPlay = true;
      } else if (e.button === 2) {
        rightMouseHeld = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const store = useGameStore.getState();
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;

      if (!store.editorMode) return;

      // Right-click drag orbits camera in Editor Mode
      if (rightMouseHeld) {
        camera.alpha -= dx * 0.0065;
        camera.beta = Math.max(0.25, Math.min(1.38, camera.beta - dy * 0.0055));
        return;
      }

      const pt = pickGroundPoint();
      cursorGroundPos = pt;

      if (leftMouseHeldInEditor && pt) {
        if (store.editorTool === "select" && isDraggingEntityInEditor && store.editorSelected) {
          store.moveSelectedEntityTo(pt.x, pt.z);
        } else if (store.editorTool === "terrain") {
          store.applyTerrainStroke(pt.x, pt.z, 0.035);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2 || e.button === 1) {
        rightMouseHeld = false;
      }
      if (e.button === 0) {
        leftMouseHeldInPlay = false;
        leftMouseHeldInEditor = false;
        isDraggingEntityInEditor = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const store = useGameStore.getState();
      if (!store.editorMode) return;
      e.preventDefault();
      camera.radius = Math.max(10, Math.min(78, camera.radius + e.deltaY * 0.025));
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);

    // =========================================================
    // MAIN BABYLON RENDER & STORE VIEW SYNC LOOP
    // =========================================================
    let lastTime = performance.now();
    let fpsUpdateAccumulator = 0;
    let syncedTerrainRevision = -1;
    let syncedRiftFloorHex = "";

    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      fpsUpdateAccumulator += dt;
      if (fpsUpdateAccumulator >= 0.25) {
        fpsUpdateAccumulator = 0;
        const currentFps = Math.round(engine.getFps());
        useGameStore.getState().setFps(currentFps);
      }

      let moveX = 0;
      let moveZ = 0;
      if (pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) moveZ += 1;
      if (pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown")) moveZ -= 1;
      if (pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) moveX += 1;
      if (pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft")) moveX -= 1;

      const store = useGameStore.getState();

      if (store.editorMode) {
        // Editor Mode Free Pan with WASD / Arrow Keys (relative to camera yaw!)
        if (moveX !== 0 || moveZ !== 0) {
          const panSpeed = 24.0 * dt;
          const forwardX = -Math.cos(camera.alpha);
          const forwardZ = -Math.sin(camera.alpha);
          const rightX = -Math.sin(camera.alpha);
          const rightZ = Math.cos(camera.alpha);
          camera.target.x = Math.max(
            -42,
            Math.min(42, camera.target.x + (forwardX * moveZ + rightX * moveX) * panSpeed)
          );
          camera.target.z = Math.max(
            -42,
            Math.min(42, camera.target.z + (forwardZ * moveZ + rightZ * moveX) * panSpeed)
          );
        }
        attackTriggeredOnce = false;
        interactTriggeredOnce = false;
        boomerangTriggeredOnce = false;
        hookshotTriggeredOnce = false;
        hammerTriggeredOnce = false;
        bowTriggeredOnce = false;
        fireRodTriggeredOnce = false;
        shovelTriggeredOnce = false;
        bottleTriggeredOnce = false;
        bombTriggeredOnce = false;
        dashTriggeredOnce = false;
      } else {
        const attackPressed = attackTriggeredOnce;
        const attackHeld =
          leftMouseHeldInPlay ||
          pressedKeys.has("Space") ||
          pressedKeys.has("KeyJ") ||
          pressedKeys.has("KeyZ") ||
          pressedKeys.has("Enter");
        const blockHeld =
          rightMouseHeld ||
          pressedKeys.has("ShiftLeft") ||
          pressedKeys.has("ShiftRight");
        const interactPressed = interactTriggeredOnce;
        const boomerangPressed = boomerangTriggeredOnce;
        const hookshotPressed = hookshotTriggeredOnce;
        const hammerPressed = hammerTriggeredOnce;
        const bowPressed = bowTriggeredOnce;
        const fireRodPressed = fireRodTriggeredOnce;
        const fireRodHeld =
          pressedKeys.has("KeyR") || pressedKeys.has("Digit3");
        const shovelPressed = shovelTriggeredOnce;
        const bottlePressed = bottleTriggeredOnce;
        const bombPressed = bombTriggeredOnce;
        const dashPressed = dashTriggeredOnce;

        attackTriggeredOnce = false;
        interactTriggeredOnce = false;
        boomerangTriggeredOnce = false;
        hookshotTriggeredOnce = false;
        hammerTriggeredOnce = false;
        bowTriggeredOnce = false;
        fireRodTriggeredOnce = false;
        shovelTriggeredOnce = false;
        bottleTriggeredOnce = false;
        bombTriggeredOnce = false;
        dashTriggeredOnce = false;

        if (store.phase === "playing") {
          store.tick(dt, {
            moveX,
            moveZ,
            attackPressed,
            attackHeld,
            blockHeld,
            interactPressed,
            boomerangPressed,
            hookshotPressed,
            hammerPressed,
            bowPressed,
            fireRodPressed,
            fireRodHeld,
            shovelPressed,
            bottlePressed,
            bombPressed,
            dashPressed,
          });
        }
      }

      const snap = useGameStore.getState();
      const t = now * 0.001;
      const activeCells = snap.terrainCells[snap.zone];

      // 0. Sync Sculpted & Painted Terrain Vertex Buffers when modified
      const currentRiftFloorHex = snap.flags.riftFloorColorHex ?? "#251e38";
      if (snap.terrainRevision !== syncedTerrainRevision || currentRiftFloorHex !== syncedRiftFloorHex) {
        syncedTerrainRevision = snap.terrainRevision;
        syncedRiftFloorHex = currentRiftFloorHex;
        riftBaseColor.copyFrom(Color3.FromHexString(currentRiftFloorHex));
        applyTerrainCellsToGroundMesh(owGround, owBaseColor, snap.terrainCells.overworld);
        applyTerrainCellsToGroundMesh(grGround, grBaseColor, snap.terrainCells.grove ?? {});
        applyTerrainCellsToGroundMesh(dgGround, dgBaseColor, snap.terrainCells.dungeon);
        applyTerrainCellsToGroundMesh(frGround, frBaseColor, snap.terrainCells.frontier ?? {});
        applyTerrainCellsToGroundMesh(cvGround, cvBaseColor, snap.terrainCells.caverns ?? {});
        applyTerrainCellsToGroundMesh(ctGround, ctBaseColor, snap.terrainCells.citadel ?? {});
        applyTerrainCellsToGroundMesh(dsGround, dsBaseColor, snap.terrainCells.desert ?? {});
        applyTerrainCellsToGroundMesh(caGround, caBaseColor, snap.terrainCells.caldera ?? {});
        applyTerrainCellsToGroundMesh(atGround, atBaseColor, snap.terrainCells.atoll ?? {});
        applyTerrainCellsToGroundMesh(hlGround, hlBaseColor, snap.terrainCells.hollow ?? {});
        applyTerrainCellsToGroundMesh(skGround, skBaseColor, snap.terrainCells.sky ?? {});
        applyTerrainCellsToGroundMesh(riftGround, riftBaseColor, snap.terrainCells.rift ?? {});
      }

      // 1. Zone visibility & lighting atmosphere
      const isOverworld = snap.zone === "overworld";
      const isGrove = snap.zone === "grove";
      const isDungeon = snap.zone === "dungeon";
      const isFrontier = snap.zone === "frontier";
      const isCaverns = snap.zone === "caverns";
      const isCitadel = snap.zone === "citadel";
      const isDesert = snap.zone === "desert";
      const isCaldera = snap.zone === "caldera";
      const isAtoll = snap.zone === "atoll";
      const isHollow = snap.zone === "hollow";
      const isSky = snap.zone === "sky";
      const isRift = snap.zone === "rift";
      overworldRoot.setEnabled(isOverworld);
      groveRoot.setEnabled(isGrove);
      dungeonRoot.setEnabled(isDungeon);
      frontierRoot.setEnabled(isFrontier);
      cavernsRoot.setEnabled(isCaverns);
      citadelRoot.setEnabled(isCitadel);
      desertRoot.setEnabled(isDesert);
      calderaRoot.setEnabled(isCaldera);
      atollRoot.setEnabled(isAtoll);
      hollowRoot.setEnabled(isHollow);
      skyRoot.setEnabled(isSky);
      riftRoot.setEnabled(isRift);

      if (isOverworld) {
        scene.clearColor.set(0.08, 0.16, 0.11, 1);
        hemiLight.intensity = 0.92;
        dirLight.intensity = 0.76;
        sanctumPointLight.intensity = 0;
        heroLanternDisc.setEnabled(false);
      } else if (isGrove) {
        scene.clearColor.set(0.06, 0.15, 0.1, 1);
        hemiLight.intensity = 0.86;
        dirLight.intensity = 0.72;
        sanctumPointLight.intensity = 0;
        heroLanternDisc.setEnabled(false);
      } else if (isFrontier) {
        scene.clearColor.set(0.06, 0.14, 0.12, 1);
        hemiLight.intensity = 0.88;
        dirLight.intensity = 0.74;
        sanctumPointLight.intensity = 0;
        heroLanternDisc.setEnabled(false);
      } else if (isCaverns) {
        scene.clearColor.set(0.04, 0.09, 0.16, 1);
        hemiLight.intensity = 0.72;
        dirLight.intensity = 0.62;
        sanctumPointLight.intensity = 0.35;
        heroLanternDisc.setEnabled(false);
      } else if (isCitadel) {
        scene.clearColor.set(0.06, 0.03, 0.09, 1);
        hemiLight.intensity = 0.64;
        dirLight.intensity = 0.54;
        sanctumPointLight.intensity = snap.flags.citadelBossDefeated ? 1.45 : 0.85;
        heroLanternDisc.setEnabled(false);
      } else if (isDesert) {
        scene.clearColor.set(0.18, 0.13, 0.06, 1);
        hemiLight.intensity = 0.96;
        dirLight.intensity = 0.84;
        sanctumPointLight.intensity = 0.25;
        heroLanternDisc.setEnabled(false);
      } else if (isCaldera) {
        scene.clearColor.set(0.14, 0.04, 0.03, 1);
        hemiLight.intensity = 0.72;
        dirLight.intensity = 0.64;
        sanctumPointLight.intensity = snap.flags.calderaBossDefeated ? 1.55 : 0.95;
        heroLanternDisc.setEnabled(false);
      } else if (isAtoll) {
        scene.clearColor.set(0.04, 0.17, 0.22, 1);
        hemiLight.intensity = 0.94;
        dirLight.intensity = 0.82;
        sanctumPointLight.intensity = 0.35;
        heroLanternDisc.setEnabled(false);
      } else if (isHollow) {
        scene.clearColor.set(0.05, 0.07, 0.16, 1);
        hemiLight.intensity = 0.68;
        dirLight.intensity = 0.56;
        sanctumPointLight.intensity = 0.85;
        heroLanternDisc.setEnabled(false);
      } else if (isSky) {
        scene.clearColor.set(0.12, 0.18, 0.34, 1);
        hemiLight.intensity = 0.98;
        dirLight.intensity = 0.86;
        sanctumPointLight.intensity = 0.65;
        heroLanternDisc.setEnabled(false);
      } else if (isRift) {
        const themeId = snap.flags.riftBiome ?? "catacombs";
        if (themeId === "glacial") {
          scene.clearColor.set(0.04, 0.1, 0.18, 1);
        } else if (themeId === "brimstone") {
          scene.clearColor.set(0.14, 0.04, 0.04, 1);
        } else if (themeId === "void" || themeId === "fungal") {
          scene.clearColor.set(0.08, 0.03, 0.14, 1);
        } else if (themeId === "overgrown") {
          scene.clearColor.set(0.05, 0.14, 0.08, 1);
        } else if (themeId === "pharaoh") {
          scene.clearColor.set(0.16, 0.12, 0.05, 1);
        } else if (themeId === "starlight") {
          scene.clearColor.set(0.11, 0.14, 0.28, 1);
        } else {
          scene.clearColor.set(0.06, 0.04, 0.11, 1);
        }
        hemiLight.intensity = 0.66;
        dirLight.intensity = 0.58;
        sanctumPointLight.intensity = snap.flags.riftBossDefeated ? 1.45 : 0.85;
        heroLanternDisc.setEnabled(false);
      } else {
        // Dark Room Visibility Cone & Lantern Illumination in Dungeon Room 4 (The Dark Archery Crypt)
        // Zero extra dynamic PointLights or shadow maps — scales existing scene light uniforms!
        if (snap.dungeonRoom === "crypt" && !snap.editorMode) {
          let litCryptTorches = 0;
          for (const p of snap.mapProps) {
            if (
              p.zone === "dungeon" &&
              p.prefab === "wall_torch" &&
              p.id.startsWith("prop-dg-crypt-torch") &&
              p.lit !== false
            ) {
              litCryptTorches++;
            }
          }
          const cryptLightRatio = Math.min(1, litCryptTorches / 4);
          scene.clearColor.set(
            0.015 + cryptLightRatio * 0.035,
            0.015 + cryptLightRatio * 0.035,
            0.03 + cryptLightRatio * 0.06,
            1
          );
          hemiLight.intensity = 0.22 + cryptLightRatio * 0.48;
          dirLight.intensity = 0.16 + cryptLightRatio * 0.42;
          sanctumPointLight.intensity = snap.flags.bossDefeated ? 1.35 : 0.45;
          heroLanternDisc.setEnabled(cryptLightRatio < 1);
          if (cryptLightRatio < 1) {
            const discScale = 1.0 + cryptLightRatio * 0.65 + Math.sin(t * 9) * 0.03;
            heroLanternDisc.scaling.set(discScale, 1, discScale);
          }
        } else {
          scene.clearColor.set(0.05, 0.05, 0.09, 1);
          hemiLight.intensity = 0.58;
          dirLight.intensity = 0.48;
          sanctumPointLight.intensity = snap.flags.bossDefeated ? 1.35 : 0.72;
          heroLanternDisc.setEnabled(false);
        }
      }

      // 2. Sync Individual 3D Environment Props (`snap.mapProps`)
      const activePropIds = new Set<string>();
      for (const prop of snap.mapProps) {
        activePropIds.add(prop.id);
        let pRig = propRigs.get(prop.id);
        if (
          !pRig ||
          pRig.prefab !== prop.prefab ||
          pRig.customModelId !== prop.customModelId ||
          pRig.colorHex !== prop.colorHex
        ) {
          if (pRig) {
            if (pRig.pushTargetSocket) pRig.pushTargetSocket.dispose();
            pRig.root.dispose();
          }
          pRig = buildPropRig(prop, snap.customModels);
          propRigs.set(prop.id, pRig);
        }
        const isSmashedHidden =
          !snap.editorMode &&
          Boolean(prop.smashed) &&
          (prop.prefab === "clay_pot" ||
            prop.prefab === "light_rock" ||
            prop.prefab === "cracked_rock" ||
            prop.prefab === "briar_barrier" ||
            prop.prefab === "spiderweb_barrier");
        const showProp = prop.zone === snap.zone && !isSmashedHidden;
        pRig.root.setEnabled(showProp);
        if (pRig.pushTargetSocket) {
          const showSocket =
            prop.zone === snap.zone &&
            prop.puzzleTargetX !== undefined &&
            prop.puzzleTargetZ !== undefined;
          pRig.pushTargetSocket.setEnabled(showSocket);
          if (showSocket && prop.puzzleTargetX !== undefined && prop.puzzleTargetZ !== undefined) {
            const sockY = sampleTerrainHeight(
              activeCells,
              prop.puzzleTargetX,
              prop.puzzleTargetZ
            );
            pRig.pushTargetSocket.position.set(
              prop.puzzleTargetX,
              sockY + 0.05,
              prop.puzzleTargetZ
            );
            pRig.pushTargetSocket.rotation.y = t * 1.4;
          }
        }
        if (showProp) {
          const groundY = sampleTerrainHeight(activeCells, prop.x, prop.z);
          if (prop.prefab === "crystal_barrier") {
            pRig.root.position.set(prop.x, groundY, prop.z);
            if (pRig.crystalBarrierBody) {
              const targetBarY = snap.editorMode ? 0 : prop.y;
              pRig.crystalBarrierBody.position.y +=
                (targetBarY - pRig.crystalBarrierBody.position.y) *
                Math.min(1, dt * 10);
            }
          } else {
            pRig.root.position.set(prop.x, groundY + prop.y, prop.z);
          }
          pRig.root.rotation.y = prop.rotY;
          if (
            (prop.prefab === "briar_barrier" || prop.prefab === "spiderweb_barrier") &&
            (prop.burningTimer ?? 0) > 0
          ) {
            const burnProg = Math.max(0.15, (prop.burningTimer ?? 0) / 0.55);
            const jitter = Math.sin(t * 48) * 0.08;
            pRig.root.scaling.set(
              prop.scaleX * (burnProg + jitter),
              prop.scaleY * burnProg,
              prop.scaleZ * (burnProg - jitter)
            );
          } else if (prop.prefab === "rusted_peg" && !snap.editorMode && prop.pounded) {
            pRig.root.scaling.set(prop.scaleX * 1.08, prop.scaleY * 0.16, prop.scaleZ * 1.08);
          } else {
            pRig.root.scaling.set(prop.scaleX, prop.scaleY, prop.scaleZ);
          }

          if (prop.prefab === "bush") {
            const isCut = !snap.editorMode && snap.cutBushIds.includes(prop.id);
            if (pRig.bushFoliage) pRig.bushFoliage.setEnabled(!isCut);
            if (pRig.bushStump) pRig.bushStump.setEnabled(isCut);
          } else if (prop.prefab === "wall_torch") {
            const isLit = prop.lit !== false;
            if (pRig.torchFlame) {
              pRig.torchFlame.setEnabled(isLit);
              if (isLit) {
                const flicker = 1 + Math.sin(t * 14 + prop.x) * 0.14;
                pRig.torchFlame.scaling.set(flicker, 1.45 + Math.cos(t * 18) * 0.18, flicker);
              }
            }
            if (pRig.timedTorchRing) {
              const hasTimer = (prop.timedDuration ?? 0) > 0;
              pRig.timedTorchRing.setEnabled(hasTimer);
              if (hasTimer) {
                const dur = Math.max(1, prop.timedDuration ?? 8);
                const ratio = prop.timedSolved
                  ? 1.0
                  : isLit
                  ? Math.max(0.18, (prop.litTimer ?? dur) / dur)
                  : 0.45;
                pRig.timedTorchRing.scaling.set(ratio, 1, ratio);
              }
            }
          } else if (prop.prefab === "dirt_patch") {
            const isDug = Boolean(prop.dug) && !snap.editorMode;
            if (pRig.dirtMound) pRig.dirtMound.setEnabled(!isDug);
            if (pRig.dirtHole) pRig.dirtHole.setEnabled(isDug);
          } else if (prop.prefab === "crystal_switch") {
            const isOrange = prop.switchState === "orange";
            if (pRig.crystalOrbMat) {
              if (isOrange) {
                pRig.crystalOrbMat.diffuseColor.set(1.0, 0.56, 0.16);
                pRig.crystalOrbMat.emissiveColor.set(0.88, 0.38, 0.08);
              } else {
                pRig.crystalOrbMat.diffuseColor.set(0.22, 0.78, 1.0);
                pRig.crystalOrbMat.emissiveColor.set(0.12, 0.48, 0.88);
              }
            }
            if (pRig.crystalOrbMesh) {
              pRig.crystalOrbMesh.rotation.y = t * 1.9;
              pRig.crystalOrbMesh.position.y = 1.32 + Math.sin(t * 3.5 + prop.x) * 0.08;
            }
            if (pRig.crystalHaloRing) {
              pRig.crystalHaloRing.rotation.y = -t * 2.4;
              pRig.crystalHaloRing.position.y = 1.32 + Math.sin(t * 3.5 + prop.x) * 0.08;
            }
          } else if (prop.prefab === "eye_statue") {
            const isActivated = Boolean(prop.eyeActivated);
            if (pRig.eyeIrisMat) {
              if (isActivated) {
                pRig.eyeIrisMat.diffuseColor.set(0.22, 0.96, 0.65);
                pRig.eyeIrisMat.emissiveColor.set(0.14, 0.82, 0.52);
              } else {
                const pulse = 0.85 + Math.sin(t * 4.5 + prop.x) * 0.15;
                pRig.eyeIrisMat.diffuseColor.set(1.0, 0.28 * pulse, 0.22);
                pRig.eyeIrisMat.emissiveColor.set(0.92 * pulse, 0.2 * pulse, 0.14);
              }
            }
            if (pRig.eyeArrowMesh) {
              pRig.eyeArrowMesh.setEnabled(isActivated);
            }
          }
        }
      }
      propRigs.forEach((pRig, id) => {
        if (!activePropIds.has(id)) {
          if (pRig.pushTargetSocket) pRig.pushTargetSocket.dispose();
          pRig.root.dispose();
          propRigs.delete(id);
        }
      });

      // 3. Sync Portals (`snap.portals`)
      const activePortalIds = new Set<string>();
      for (const portal of snap.portals) {
        activePortalIds.add(portal.id);
        let ptRig = portalRigs.get(portal.id);
        if (!ptRig || ptRig.color !== portal.color) {
          if (ptRig) ptRig.root.dispose();
          ptRig = buildPortalRig(portal);
          portalRigs.set(portal.id, ptRig);
        }
        const showPortal = portal.zone === snap.zone;
        ptRig.root.setEnabled(showPortal);
        if (showPortal) {
          const groundY = sampleTerrainHeight(activeCells, portal.x, portal.z);
          ptRig.root.position.set(portal.x, groundY, portal.z);
          ptRig.ring.rotation.y = t * 1.8;
          const rScale = portal.radius / 2.0;
          ptRig.disc.scaling.set(rScale, 1, rScale);
          ptRig.ring.scaling.set(rScale, 1, rScale);
        }
      }
      portalRigs.forEach((ptRig, id) => {
        if (!activePortalIds.has(id)) {
          ptRig.root.dispose();
          portalRigs.delete(id);
        }
      });

      // 4. Sync Hero 3D Model, Equipped Armor/Gear Colors, Shield Block, Spin Attack & Tools
      if (snap.hero.equippedTunic === "red_mail") {
        tunicMat.diffuseColor.set(0.84, 0.14, 0.18);
        tunicMat.emissiveColor.set(0.18, 0.03, 0.04);
      } else if (snap.hero.equippedTunic === "blue_mail") {
        tunicMat.diffuseColor.set(0.16, 0.44, 0.88);
        tunicMat.emissiveColor.set(0.04, 0.1, 0.24);
      } else {
        tunicMat.diffuseColor.set(0.15, 0.68, 0.32);
        tunicMat.emissiveColor.set(0.03, 0.12, 0.05);
      }

      if (snap.hero.equippedOffhand === "mirror_shield") {
        shieldMat.diffuseColor.set(0.85, 0.9, 0.98);
        shieldMat.emissiveColor.set(0.18, 0.24, 0.35);
      } else {
        shieldMat.diffuseColor.set(0.2, 0.42, 0.8);
        shieldMat.emissiveColor.set(0.05, 0.1, 0.22);
      }

      if (snap.hero.equippedBoots === "swift_boots") {
        bootMat.diffuseColor.set(0.18, 0.65, 0.88);
        bootMat.emissiveColor.set(0.04, 0.14, 0.22);
      } else if (snap.hero.equippedBoots === "titan_greaves") {
        bootMat.diffuseColor.set(0.54, 0.58, 0.66);
        bootMat.emissiveColor.set(0.08, 0.09, 0.12);
      } else {
        bootMat.diffuseColor.set(0.38, 0.24, 0.14);
        bootMat.emissiveColor.set(0, 0, 0);
      }

      const stride = Math.sin(snap.hero.walkCycle);
      const heroGroundY = sampleTerrainHeight(activeCells, snap.hero.x, snap.hero.z);
      const kbLock = snap.hero.knockbackLockTimer ?? 0;
      const launchProgress = kbLock > 0 ? 1 - Math.min(1, kbLock / 0.65) : 0;
      const launchArcY = kbLock > 0 ? Math.sin(launchProgress * Math.PI) * 1.15 : 0;

      const spinTimer = snap.hero.spinAttackTimer ?? 0;
      const isSpinning = spinTimer > 0;
      const spinProgress = isSpinning ? 1 - spinTimer / 0.38 : 0;

      const dashTimer = snap.hero.dashTimer ?? 0;
      const isDashingNow = dashTimer > 0;
      const mountedSteed = snap.hero.mountedSteed ?? "none";
      const isMounted = mountedSteed !== "none" && !snap.editorMode;
      const mountHopY =
        mountedSteed === "war_drake"
          ? 0.96 + Math.sin(t * 5.8) * 0.08
          : isMounted
          ? 0.88 + Math.abs(stride) * 0.14
          : 0;

      heroRoot.position.set(
        snap.hero.x,
        heroGroundY +
          (kbLock > 0
            ? launchArcY
            : isMounted
            ? mountHopY
            : isDashingNow
            ? 0.24
            : Math.abs(stride) * 0.11),
        snap.hero.z
      );
      heroRoot.rotation.y = isSpinning
        ? snap.hero.facing + spinProgress * Math.PI * 4
        : snap.hero.facing;
      heroRoot.rotation.x =
        kbLock > 0
          ? -Math.sin(launchProgress * Math.PI) * 0.42
          : isDashingNow
          ? 0.45
          : 0;
      heroLeftBoot.position.x = isMounted ? -0.44 : -0.22;
      heroRightBoot.position.x = isMounted ? 0.44 : 0.22;
      heroLeftBoot.position.z = kbLock > 0 ? 0.16 : isMounted ? 0.05 : stride * 0.22;
      heroRightBoot.position.z = kbLock > 0 ? -0.16 : isMounted ? 0.05 : -stride * 0.22;

      const heroHurtTimer = snap.hero.hurtFlashTimer ?? 0;
      const heroBlinkHide =
        !snap.editorMode &&
        heroHurtTimer > 0 &&
        Math.floor(heroHurtTimer * 18) % 2 === 0;
      heroRoot.setEnabled(!heroBlinkHide);

      // Sync 3D Summonable Steed Rig (`heroMountNode`)
      heroMountNode.setEnabled(isMounted && !heroBlinkHide);
      if (isMounted) {
        const steedBaseY =
          mountedSteed === "war_drake"
            ? heroGroundY + 0.16 + Math.sin(t * 5.8) * 0.08
            : heroGroundY + Math.abs(stride) * 0.12;
        heroMountNode.position.set(snap.hero.x, steedBaseY, snap.hero.z);
        heroMountNode.rotation.y = snap.hero.facing;
        heroMountNode.rotation.x = isDashingNow ? 0.18 : stride * 0.06;

        sunCourserNode.setEnabled(mountedSteed === "sun_courser");
        frostStagNode.setEnabled(mountedSteed === "frost_stag");
        warDrakeNode.setEnabled(mountedSteed === "war_drake");

        const gallopSwing = stride * 0.56;
        mountLegFL.rotation.x = gallopSwing;
        mountLegBR.rotation.x = gallopSwing;
        mountLegFR.rotation.x = -gallopSwing;
        mountLegBL.rotation.x = -gallopSwing;

        if (mountedSteed === "sun_courser") {
          courserAuraRing.rotation.y = t * 2.4;
        } else if (mountedSteed === "frost_stag") {
          stagFrostRing.rotation.y = -t * 2.8;
        } else if (mountedSteed === "war_drake") {
          const wingBeat = Math.sin(t * 11.5) * 0.44;
          drakeWingL.rotation.z = wingBeat;
          drakeWingR.rotation.z = -wingBeat;
          drakeFlameRing.rotation.y = t * 3.2;
        }
      }

      if (snap.hero.isBlocking || kbLock > 0) {
        heroShieldPivot.position.set(0, 0.96, 0.56);
        heroShieldPivot.rotation.y = Math.PI / 2;
        heroBlockWard.setEnabled(true);
      } else {
        heroShieldPivot.position.set(-0.56, 0.9, 0.24);
        heroShieldPivot.rotation.y = -0.25;
        heroBlockWard.setEnabled(false);
      }

      const isBowPose = (snap.hero.bowAnimTimer ?? 0) > 0;
      const isThrowPose = (snap.hero.throwAnimTimer ?? 0) > 0;
      const isFireRodPose =
        (snap.hero.fireRodCooldown ?? 0) > 0.12 || (snap.hero.fireRodChargeTimer ?? 0) > 0;
      const isShovelPose = (snap.hero.digAnimTimer ?? 0) > 0;
      const isHammerPose = (snap.hero.hammerAnimTimer ?? 0) > 0;
      const heldObj = snap.hero.heldObject;

      heroBowNode.setEnabled(isBowPose);
      heroFireRodNode.setEnabled(isFireRodPose);
      heroShovelNode.setEnabled(isShovelPose);
      if (isShovelPose) {
        const digProg = 1 - (snap.hero.digAnimTimer ?? 0) / 0.34;
        heroShovelNode.rotation.x = 0.35 + Math.sin(digProg * Math.PI) * 0.85;
      }

      heroHammerNode.setEnabled(isHammerPose);
      if (isHammerPose) {
        const hmProg = 1 - (snap.hero.hammerAnimTimer ?? 0) / 0.42;
        const slamArc =
          hmProg < 0.38
            ? -0.95 + (hmProg / 0.38) * 2.55
            : 1.6 - ((hmProg - 0.38) / 0.62) * 0.35;
        heroHammerNode.rotation.x = slamArc;
      }

      heroHeldNode.setEnabled(Boolean(heldObj));
      if (heldObj) {
        heldPotNode.setEnabled(heldObj.kind === "clay_pot");
        heldRockNode.setEnabled(heldObj.kind === "light_rock");
        heldBombNode.setEnabled(heldObj.kind === "bomb");
        if (heldObj.kind === "bomb") {
          const ft = heldObj.fuseTimer ?? 2.4;
          const flashFreq = ft < 0.8 ? 22 : 10;
          const flashRed = Math.floor(t * flashFreq) % 2 === 0;
          if (flashRed) {
            heldBombBodyMat.diffuseColor.set(1.0, 0.22, 0.2);
            heldBombBodyMat.emissiveColor.set(0.85, 0.14, 0.1);
          } else {
            heldBombBodyMat.diffuseColor.set(0.16, 0.22, 0.36);
            heldBombBodyMat.emissiveColor.set(0.04, 0.06, 0.12);
          }
          heldBombSpark.rotation.y = t * 18;
          heldBombSpark.scaling.setAll(1 + Math.sin(t * 28) * 0.35);
        }
      }

      const showSword =
        !isBowPose &&
        !isThrowPose &&
        !isFireRodPose &&
        !isShovelPose &&
        !isHammerPose &&
        !heldObj;
      swordPivot.setEnabled(showSword);

      // Sync Charged Spin Attack Aura & Whirlwind Ring
      spinSlashRing.setEnabled(isSpinning);
      if (isSpinning) {
        spinSlashRing.rotation.y = t * 22;
        spinSlashRing.scaling.set(1.0 + spinProgress * 0.18, 0.32, 1.0 + spinProgress * 0.18);
      }

      const swordCharge = snap.hero.swordChargeTimer ?? 0;
      const fireCharge = snap.hero.fireRodChargeTimer ?? 0;
      const showChargeAura = swordCharge > 0.12 || fireCharge > 0.12;
      chargeAuraRing.setEnabled(showChargeAura);
      if (showChargeAura) {
        const isReady = swordCharge >= 0.62 || fireCharge >= 0.55;
        const pulseScale = isReady ? 1.15 + Math.sin(t * 20) * 0.16 : 0.65 + Math.min(1, Math.max(swordCharge, fireCharge)) * 0.45;
        chargeAuraRing.scaling.setAll(pulseScale);
        if (fireCharge > 0.12) {
          chargeAuraMat.diffuseColor.set(1.0, 0.45, 0.12);
          chargeAuraMat.emissiveColor.set(1.0, 0.32, 0.05);
        } else {
          chargeAuraMat.diffuseColor.set(0.35, 0.92, 1.0);
          chargeAuraMat.emissiveColor.set(0.25, 0.8, 1.0);
        }
      }

      if (snap.hero.equippedPrimary === "tempered_blade") {
        slashMat.diffuseColor.set(1.0, 0.85, 0.28);
        slashMat.emissiveColor.set(1.0, 0.72, 0.18);
      } else {
        slashMat.diffuseColor.set(0.55, 0.95, 1.0);
        slashMat.emissiveColor.set(0.45, 0.85, 1.0);
      }

      if (isSpinning && showSword) {
        swordPivot.rotation.y = 1.15;
        slashArc.setEnabled(false);
      } else if (snap.hero.isAttacking && showSword) {
        const progress = 1 - snap.hero.attackTimer / 0.24;
        swordPivot.rotation.y = -1.25 + progress * 2.5;
        slashArc.setEnabled(true);
        slashArc.rotation.y = -0.8 + progress * 1.6;
      } else if (swordCharge > 0.12 && showSword) {
        swordPivot.rotation.y = -1.35 + Math.sin(t * 24) * 0.06;
        slashArc.setEnabled(false);
      } else {
        swordPivot.rotation.y = 0.2;
        slashArc.setEnabled(false);
      }

      // Sync Boomerang 3D Mesh
      if (snap.boomerang && snap.boomerang.zone === snap.zone) {
        boomerangNode.setEnabled(true);
        boomerangNode.position.set(snap.boomerang.x, 1.0, snap.boomerang.z);
        boomerangNode.rotation.y = snap.boomerang.spinAngle;
      } else {
        boomerangNode.setEnabled(false);
      }

      // Sync Grappling Hookshot 3D Claw + Segmented Metallic Chain
      if (snap.hookshot && snap.hookshot.zone === snap.zone) {
        hookshotClawNode.setEnabled(true);
        const startX = snap.hero.x + Math.sin(snap.hero.facing) * 0.48;
        const startZ = snap.hero.z + Math.cos(snap.hero.facing) * 0.48;
        const startY = heroGroundY + 1.05;
        const endX = snap.hookshot.x;
        const endZ = snap.hookshot.z;
        const endY = sampleTerrainHeight(activeCells, endX, endZ) + 1.05;
        const yaw = Math.atan2(endX - startX, endZ - startZ);

        hookshotClawNode.position.set(endX, endY, endZ);
        hookshotClawNode.rotation.set(0, yaw, t * 14);

        for (let c = 0; c < hookshotChainLinks.length; c++) {
          const link = hookshotChainLinks[c];
          const frac = (c + 0.5) / hookshotChainLinks.length;
          link.setEnabled(true);
          link.position.set(
            startX + (endX - startX) * frac,
            startY + (endY - startY) * frac,
            startZ + (endZ - startZ) * frac
          );
          link.rotation.set(c % 2 === 0 ? Math.PI / 2 : 0, yaw, c % 2 === 0 ? 0 : Math.PI / 2);
        }
      } else {
        hookshotClawNode.setEnabled(false);
        for (let c = 0; c < hookshotChainLinks.length; c++) {
          hookshotChainLinks[c].setEnabled(false);
        }
      }

      // Sync 3D Golden Wayfinder Trail (`snap.wayfinderActive`)
      const showWayfinder =
        Boolean(snap.wayfinderActive) && !snap.editorMode && snap.phase === "playing";
      if (showWayfinder) {
        const route = resolveWayfinderRoute({
          zone: snap.zone,
          dungeonRoom: snap.dungeonRoom,
          hero: snap.hero,
          flags: snap.flags,
          portals: snap.portals,
          pinnedQuestId: snap.pinnedQuestId,
        });

        const firstStep = sampleWayfinderPolyline(route.waypoints, 0.08);
        wayfinderCompassNode.setEnabled(true);
        wayfinderCompassNode.position.set(snap.hero.x, heroGroundY + 0.04, snap.hero.z);
        wayfinderCompassNode.rotation.y = firstStep.yaw;

        const beaconGroundY = sampleTerrainHeight(activeCells, route.destX, route.destZ);
        wayfinderBeaconNode.setEnabled(true);
        wayfinderBeaconNode.position.set(route.destX, beaconGroundY, route.destZ);
        wayfinderBeaconOuterRing.rotation.y = t * 1.9;
        wayfinderBeaconInnerRing.rotation.y = -t * 2.6;
        wayfinderBeaconCrest.rotation.y = t * 2.8;
        wayfinderBeaconCrest.position.y = 2.35 + Math.sin(t * 3.8) * 0.22;

        for (let w = 0; w < wayfinderNodes.length; w++) {
          const wfNode = wayfinderNodes[w];
          if (route.totalLength < 1.2) {
            wfNode.setEnabled(false);
            continue;
          }
          const u = ((w / wayfinderNodes.length) + t * 0.36) % 1;
          const pt = sampleWayfinderPolyline(route.waypoints, u);
          const groundY = sampleTerrainHeight(activeCells, pt.x, pt.z);
          const edgeEnvelope = Math.sin(u * Math.PI);
          const scale = Math.max(0.25, 0.55 + edgeEnvelope * 0.65);
          const bobY = 0.22 + Math.sin(t * 5.2 + w * 0.65) * 0.08;

          wfNode.setEnabled(true);
          wfNode.position.set(pt.x, groundY + bobY, pt.z);
          wfNode.rotation.y = pt.yaw;
          wfNode.scaling.setAll(scale);
        }
      } else {
        wayfinderCompassNode.setEnabled(false);
        wayfinderBeaconNode.setEnabled(false);
        for (let w = 0; w < wayfinderNodes.length; w++) {
          wayfinderNodes[w].setEnabled(false);
        }
      }

      // Sync 3D Ancient Runic Warp Monolith in Active Zone
      const activeWarpMeta = WARP_STONE_META[snap.zone];
      const warpGroundY = sampleTerrainHeight(activeCells, activeWarpMeta.x, activeWarpMeta.z);
      const isWarpAwakened = Boolean(
        snap.flags.awakenedWarpZones?.includes(snap.zone) || snap.zone === "overworld"
      );
      warpMonolithNode.position.set(activeWarpMeta.x, warpGroundY, activeWarpMeta.z);
      warpCoreMesh.material = isWarpAwakened ? warpAwakenedMat : warpDormantMat;
      warpGroundSigil.material = isWarpAwakened ? warpAwakenedMat : warpDormantMat;
      warpRingInner.material = isWarpAwakened ? warpAwakenedMat : warpDormantMat;
      warpCoreMesh.rotation.y = t * (isWarpAwakened ? 2.6 : 0.8);
      warpCoreMesh.position.y = 3.3 + Math.sin(t * (isWarpAwakened ? 3.5 : 1.6)) * 0.16;
      warpRingOuter.rotation.y = t * (isWarpAwakened ? 2.1 : 0.5);
      warpRingInner.rotation.y = -t * (isWarpAwakened ? 2.9 : 0.6);
      warpGroundSigil.rotation.y = -t * 1.2;

      const distToWarp = Math.hypot(
        activeWarpMeta.x - snap.hero.x,
        activeWarpMeta.z - snap.hero.z
      );
      const showWarpBeam =
        !snap.editorMode &&
        ((snap.warpBeamTimer ?? 0) > 0 || (isWarpAwakened && distToWarp <= 4.0));
      warpBeamCylinder.setEnabled(showWarpBeam);
      if (showWarpBeam) {
        const beamPulse = 0.92 + Math.sin(t * 12) * 0.1;
        warpBeamCylinder.scaling.set(beamPulse, 1, beamPulse);
      }

      // Sync 3D Master Blacksmith Forge & Runic Anvil (Map 1 Overworld)
      const inOverworld = snap.zone === "overworld";
      forgeAnvilNode.setEnabled(inOverworld);
      if (inOverworld) {
        const forgeGroundY = sampleTerrainHeight(
          activeCells,
          FORGE_ANVIL_POS.x,
          FORGE_ANVIL_POS.z
        );
        forgeAnvilNode.position.set(FORGE_ANVIL_POS.x, forgeGroundY, FORGE_ANVIL_POS.z);
        forgeFloatingRuneRing.rotation.y = t * 2.4;
        forgeFloatingRuneRing.position.y = 1.46 + Math.sin(t * 3.8) * 0.1;
        const coalPulse = 0.95 + Math.sin(t * 8.5) * 0.08;
        forgeCoals.scaling.set(coalPulse, 1, coalPulse);
        smithArmNode.rotation.x = Math.sin(t * 6.5) * 0.55;
      }

      // Sync 3D Abyssal Rift Obelisk, Spirit Companion Sanctuary, Royal Stables & Colosseum War-Gate (Map 1 Overworld)
      riftEntranceNode.setEnabled(inOverworld);
      companionAltarNode.setEnabled(inOverworld);
      mountStablesNode.setEnabled(inOverworld);
      colosseumGateNode.setEnabled(inOverworld);
      if (inOverworld) {
        const riftEntGroundY = sampleTerrainHeight(
          activeCells,
          RIFT_ENTRANCE_POS.x,
          RIFT_ENTRANCE_POS.z
        );
        riftEntranceNode.position.set(
          RIFT_ENTRANCE_POS.x,
          riftEntGroundY,
          RIFT_ENTRANCE_POS.z
        );
        riftOuterRing.rotation.y = t * 2.4;
        riftGroundHalo.rotation.y = -t * 1.8;
        const vortexPulse = 0.92 + Math.sin(t * 5.2) * 0.1;
        riftVortexDisc.scaling.set(vortexPulse, 1, vortexPulse);

        const altarGroundY = sampleTerrainHeight(
          activeCells,
          COMPANION_ALTAR_POS.x,
          COMPANION_ALTAR_POS.z
        );
        companionAltarNode.position.set(
          COMPANION_ALTAR_POS.x,
          altarGroundY,
          COMPANION_ALTAR_POS.z
        );
        altarOrb.rotation.y = t * 2.6;
        altarOrb.position.y = 2.05 + Math.sin(t * 3.8) * 0.16;
        altarOrbitRing.rotation.y = -t * 2.2;
        altarGroundHalo.rotation.y = t * 1.5;

        const stablesGroundY = sampleTerrainHeight(
          activeCells,
          MOUNT_STABLES_POS.x,
          MOUNT_STABLES_POS.z
        );
        mountStablesNode.position.set(
          MOUNT_STABLES_POS.x,
          stablesGroundY,
          MOUNT_STABLES_POS.z
        );
        stablesHorseshoeCrest.rotation.y = t * 2.1;
        stablesGroundHalo.rotation.y = -t * 1.4;

        const colGroundY = sampleTerrainHeight(
          activeCells,
          COLOSSEUM_GATE_POS.x,
          COLOSSEUM_GATE_POS.z
        );
        colosseumGateNode.position.set(
          COLOSSEUM_GATE_POS.x,
          colGroundY,
          COLOSSEUM_GATE_POS.z
        );
        colosseumCrown.rotation.y = t * 2.8;
        colosseumCrown.position.y = 1.72 + Math.sin(t * 4.2) * 0.14;
        colosseumGroundHalo.rotation.y = -t * 1.9;
      }

      // Sync 3D Active Spirit Companion Orbiting / Following the Hero (`snap.hero.activeCompanion`)
      const activeComp = snap.hero.activeCompanion;
      const showCompanion = Boolean(activeComp) && !snap.editorMode;
      companionRoot.setEnabled(showCompanion);
      if (showCompanion && activeComp) {
        const orbitAngle = t * 2.1;
        const cx = snap.hero.x + Math.cos(orbitAngle) * 1.45;
        const cz = snap.hero.z + Math.sin(orbitAngle) * 1.45;
        const compGroundY = sampleTerrainHeight(activeCells, cx, cz);
        const hoverY =
          activeComp === "storm_wolf"
            ? compGroundY + 0.32 + Math.abs(Math.sin(t * 9.5)) * 0.16
            : compGroundY + 1.65 + Math.sin(t * 4.8) * 0.22;
        companionRoot.position.set(cx, hoverY, cz);
        companionRoot.rotation.y = orbitAngle + Math.PI / 2;

        phoenixNode.setEnabled(activeComp === "ember_phoenix");
        owlNode.setEnabled(activeComp === "frost_owl");
        wolfNode.setEnabled(activeComp === "storm_wolf");
        spriteNode.setEnabled(activeComp === "gold_sprite");

        const flap = Math.sin(t * 18) * 0.38;
        if (activeComp === "ember_phoenix") {
          phoenixWingL.rotation.z = flap;
          phoenixWingR.rotation.z = -flap;
        } else if (activeComp === "frost_owl") {
          owlWingL.rotation.z = flap;
          owlWingR.rotation.z = -flap;
        } else if (activeComp === "gold_sprite") {
          spriteCore.rotation.y = t * 3.8;
          spriteHalo.rotation.y = -t * 2.9;
        }
      }

      if (isRift) {
        // 1. Blessing Shrine
        const shrinePos = snap.flags.riftShrinePos;
        if (shrinePos) {
          riftShrineNode.setEnabled(true);
          riftShrineNode.position.set(shrinePos.x, 0, shrinePos.z);
          const claimed = Boolean(snap.flags.riftShrineClaimed);
          riftShrineGem.setEnabled(!claimed);
          riftShrineRing.setEnabled(!claimed);
          if (!claimed) {
            riftShrineGem.rotation.y = t * 2.6;
            riftShrineGem.position.y = 2.35 + Math.sin(t * 3.6) * 0.16;
            riftShrineRing.rotation.y = -t * 2.1;
          }
        } else {
          riftShrineNode.setEnabled(false);
        }

        // 2. Side Vault Chest
        const vaultPos = snap.flags.riftVaultChestPos;
        if (vaultPos) {
          riftVaultChestNode.setEnabled(true);
          riftVaultChestNode.position.set(vaultPos.x, 0, vaultPos.z);
          if (snap.flags.riftVaultChestOpened) {
            riftVaultChestLid.position.set(0, 1.54, 0.42);
            riftVaultChestRing.setEnabled(false);
            riftVaultRelicNode.setEnabled(false);
          } else {
            riftVaultChestLid.position.set(0, 1.24, 0);
            riftVaultChestRing.setEnabled(true);
            riftVaultChestRing.rotation.y = t * 2.2;
            riftVaultRelicNode.setEnabled(true);
            riftVaultRelicNode.rotation.y = t * 2.8;
            riftVaultRelicNode.position.y = 2.15 + Math.sin(t * 3.4) * 0.15;
          }
        } else {
          riftVaultChestNode.setEnabled(false);
        }

        // 3. Guardian Boss Hoard Chest
        const bossChestPos = snap.flags.riftBossChestPos;
        if (bossChestPos) {
          riftBossChestNode.setEnabled(true);
          riftBossChestNode.position.set(bossChestPos.x, 0, bossChestPos.z);
          const bossSlain = Boolean(snap.flags.riftBossDefeated);
          riftBossChestSealRing.setEnabled(!bossSlain);
          riftBossChestSealRing.rotation.y = t * 1.9;
          riftBossChestUnsealedRing.setEnabled(bossSlain);
          riftBossChestUnsealedRing.scaling.setAll(1 + Math.sin(t * 4.2) * 0.06);

          if (snap.flags.riftBossChestOpened) {
            riftBossChestLid.position.set(0, 1.72, 0.45);
            riftBossChestRelicNode.setEnabled(true);
            riftBossChestRelicNode.rotation.y = t * 2.6;
            riftBossChestRelicNode.position.y = 2.6 + Math.sin(t * 3.2) * 0.16;
          } else {
            riftBossChestLid.position.set(0, 1.38, 0);
            riftBossChestRelicNode.setEnabled(false);
          }
        } else {
          riftBossChestNode.setEnabled(false);
        }

        // 4. Next-Floor Descent Portal (unseals when Rift Guardian is slain!)
        const nextFloorPos = snap.flags.riftNextFloorPos;
        const showDescent = Boolean(nextFloorPos && snap.flags.riftBossDefeated);
        riftDescentPortalNode.setEnabled(showDescent);
        if (showDescent && nextFloorPos) {
          riftDescentPortalNode.position.set(nextFloorPos.x, 0, nextFloorPos.z);
          descentOuterRing.rotation.y = t * 2.4;
          descentInnerRing.rotation.y = -t * 3.2;
          const colPulse = 0.9 + Math.sin(t * 9) * 0.1;
          descentColumn.scaling.set(colPulse, 1, colPulse);
        }
      }

      // Sync 3D Chain-Lightning Arcs between struck enemies
      const activeArcs = (snap.lightningArcs ?? []).filter((a) => a.zone === snap.zone);
      for (let i = 0; i < lightningArcPool.length; i++) {
        const bolt = lightningArcPool[i];
        const arc = activeArcs[i];
        if (!arc) {
          bolt.setEnabled(false);
          continue;
        }
        bolt.setEnabled(true);
        const mx = (arc.x1 + arc.x2) * 0.5;
        const mz = (arc.z1 + arc.z2) * 0.5;
        const dx = arc.x2 - arc.x1;
        const dz = arc.z2 - arc.z1;
        const len = Math.max(0.2, Math.hypot(dx, dz));
        const groundY = sampleTerrainHeight(activeCells, mx, mz);
        bolt.position.set(mx, groundY + 0.95 + Math.sin(t * 42 + i) * 0.08, mz);
        bolt.rotation.y = Math.atan2(dx, dz);
        const pulseW = 0.8 + Math.sin(t * 55 + i * 2) * 0.35;
        bolt.scaling.set(pulseW, pulseW, len);
      }

      // 5. Camera Follow in Play Mode vs Free Orbit in Editor Mode
      if (!snap.editorMode) {
        camera.alpha += (-Math.PI / 2 - camera.alpha) * Math.min(1, dt * 8);
        camera.beta += (0.72 - camera.beta) * Math.min(1, dt * 8);
        camera.radius += (25 - camera.radius) * Math.min(1, dt * 8);

        if (snap.phase === "title") {
          camera.target.set(
            Math.sin(t * 0.25) * 6,
            0,
            -14 + Math.cos(t * 0.2) * 5
          );
        } else {
          camera.target.x += (snap.hero.x - camera.target.x) * Math.min(1, dt * 8);
          camera.target.z += (snap.hero.z - camera.target.z) * Math.min(1, dt * 8);
        }
      }

      // 6. Sync Sanctum Entry Key Pedestal (Map 1B Grove), 5-Room Dungeon Keys/Doors/Chests & Boss Chest
      keyNode.setEnabled(isGrove && !snap.flags.keyPickedUp);
      keyBeaconRing.setEnabled(isGrove && !snap.flags.keyPickedUp);
      if (!snap.flags.keyPickedUp) {
        keyNode.rotation.y = t * 2.2;
        if (snap.boomerang?.carryingKey && snap.boomerang.zone === "grove") {
          keyNode.position.set(snap.boomerang.x, 1.35, snap.boomerang.z);
        } else if (snap.hookshot?.carryingKey && snap.hookshot.zone === "grove") {
          keyNode.position.set(snap.hookshot.x, 1.35, snap.hookshot.z);
        } else {
          keyNode.position.set(
            DUNGEON_KEY_POS.x,
            1.6 + Math.sin(t * 3.2) * 0.2,
            DUNGEON_KEY_POS.z
          );
        }
      }

      // Room 2 (West Wing) Small Key on Pedestal Across Chasm (`DG_SMALL_KEY_POS = -31.2, 0.0`)
      const showDgSmallKey = isDungeon && !snap.flags.dgSmallKeyPickedUp;
      dgSmallKeyNode.setEnabled(showDgSmallKey);
      dgSmallKeyBeaconRing.setEnabled(showDgSmallKey);
      if (showDgSmallKey) {
        dgSmallKeyNode.rotation.y = t * 2.5;
        if (snap.boomerang?.carryingDgSmallKey && snap.boomerang.zone === "dungeon") {
          dgSmallKeyNode.position.set(snap.boomerang.x, 1.35, snap.boomerang.z);
        } else if (snap.hookshot?.carryingDgSmallKey && snap.hookshot.zone === "dungeon") {
          dgSmallKeyNode.position.set(snap.hookshot.x, 1.35, snap.hookshot.z);
        } else {
          dgSmallKeyNode.position.set(
            DG_SMALL_KEY_POS.x,
            1.65 + Math.sin(t * 3.4) * 0.18,
            DG_SMALL_KEY_POS.z
          );
        }
      }

      // Room 1 -> Room 3 East Small Key Door (`EAST_WING_DOOR_POS = 14.0, 0.0`)
      const isEastDoorOpen =
        snap.flags.eastWingDoorUnlocked && !snap.flags.eastWingArenaLocked;
      const targetEastDoorY = isEastDoorOpen ? -4.8 : 0;
      eastWingDoorNode.position.y +=
        (targetEastDoorY - eastWingDoorNode.position.y) *
        Math.min(1, dt * (isEastDoorOpen ? 7 : 26));

      // Room 3 (East Wing: Ember Sanctum) Center Flame Rod Chest (`FIRE_ROD_CHEST_POS = 26.0, 1.5`)
      if (snap.flags.fireRodChestOpened) {
        fireRodChestLid.position.set(0, 1.65, 0.42);
        fireRodChestSealRing.setEnabled(false);
        fireRodChestRelicNode.setEnabled(false);
      } else {
        fireRodChestLid.position.set(0, 1.32, 0);
        fireRodChestSealRing.setEnabled(true);
        fireRodChestSealRing.rotation.y = t * 2.0;
        fireRodChestRelicNode.setEnabled(true);
        fireRodChestRelicNode.rotation.y = t * 2.6;
        fireRodChestRelicNode.position.y = 2.25 + Math.sin(t * 3.2) * 0.16;
      }

      // Room 4 (Dark Archery Crypt) Center Big Boss Key Chest (`BIG_KEY_CHEST_POS = 26.0, -24.0`) & West Shortcut Door
      const eyeSolved = Boolean(snap.flags.dungeonEyeStatuesSolved);
      if (snap.flags.bigKeyChestOpened) {
        bigKeyChestLid.position.set(0, 1.72, 0.45);
        bigKeyChestSealRing.setEnabled(false);
        bigKeyChestUnsealedRing.setEnabled(true);
        bigKeyChestItemNode.setEnabled(false);
      } else {
        bigKeyChestLid.position.set(0, 1.38, 0);
        bigKeyChestSealRing.setEnabled(!eyeSolved);
        bigKeyChestSealRing.rotation.y = t * 2.0;
        bigKeyChestUnsealedRing.setEnabled(eyeSolved);
        if (eyeSolved) {
          bigKeyChestUnsealedRing.scaling.setAll(1 + Math.sin(t * 4.2) * 0.06);
        }
        bigKeyChestItemNode.setEnabled(eyeSolved);
        if (eyeSolved) {
          bigKeyChestItemNode.rotation.y = t * 2.8;
          bigKeyChestItemNode.position.y = 2.38 + Math.sin(t * 3.5) * 0.18;
        }
      }

      const targetCryptShortcutY = eyeSolved ? -4.8 : 0;
      cryptShortcutGateNode.position.y +=
        (targetCryptShortcutY - cryptShortcutGateNode.position.y) *
        Math.min(1, dt * 7);

      const isOwEntryOpen = Boolean(
        snap.flags.dungeonEntryUnlocked ||
          snap.flags.keyPickedUp ||
          snap.hero.hasDungeonKey
      );
      const targetOwGateY = isOwEntryOpen ? -4.8 : 0;
      owDungeonGateNode.position.y +=
        (targetOwGateY - owDungeonGateNode.position.y) *
        Math.min(1, dt * (isOwEntryOpen ? 6 : 26));

      const isGateOpen =
        snap.flags.gateUnlocked &&
        (!snap.flags.bossAwakened || snap.flags.bossDefeated);
      const targetGateY = isGateOpen ? -4.8 : 0;
      lockedGateNode.position.y +=
        (targetGateY - lockedGateNode.position.y) *
        Math.min(1, dt * (isGateOpen ? 6 : 26));

      const targetExitGateY = snap.flags.bossDefeated ? -5.0 : 0;
      bossExitGateNode.position.y +=
        (targetExitGateY - bossExitGateNode.position.y) *
        Math.min(1, dt * 6);

      chestSealRing.setEnabled(!snap.flags.bossDefeated);
      chestSealRing.rotation.y = t * 1.8;
      chestUnsealedRing.setEnabled(snap.flags.bossDefeated);
      chestUnsealedRing.scaling.setAll(1 + Math.sin(t * 4) * 0.06);

      if (snap.flags.chestUnlocked) {
        chestLid.position.set(0, 1.85, 0.45);
        zeldoCrestNode.setEnabled(true);
        zeldoCrestNode.rotation.y = t * 2.4;
        zeldoCrestNode.position.y = 2.85 + Math.sin(t * 3.0) * 0.18;
      } else {
        chestLid.position.set(0, 1.5, 0);
        zeldoCrestNode.setEnabled(false);
      }

      // 6b. Sync Map 1 Economy & Hub Loop 3D Visuals (Shop Counter Relic, SW Secret Stash Chest, Elder Rowan & Scout Lyra)
      shopProgressionNode.setEnabled(!snap.flags.shopProgressionBought);
      if (!snap.flags.shopProgressionBought) {
        shopProgressionNode.rotation.y = Math.sin(t * 2.2) * 0.35;
      }

      if (snap.flags.secretStashClaimed) {
        secretStashLid.position.set(0, 1.48, 0.38);
        secretStashGemNode.setEnabled(false);
        secretStashRing.setEnabled(false);
      } else {
        secretStashLid.position.set(0, 1.18, 0);
        secretStashGemNode.setEnabled(true);
        secretStashGemNode.rotation.y = t * 2.8;
        secretStashGemNode.position.y = 1.95 + Math.sin(t * 3.6) * 0.16;
        secretStashRing.setEnabled(true);
        secretStashRing.scaling.setAll(1 + Math.sin(t * 4.2) * 0.06);
      }

      elderRowanQuestMarker.setEnabled(!snap.flags.heirloomQuestClaimed);
      if (!snap.flags.heirloomQuestClaimed) {
        elderRowanQuestMarker.rotation.y = t * 3.2;
        elderRowanQuestMarker.position.y = 2.95 + Math.sin(t * 4.5) * 0.18;
      }

      scoutLyraCompass.rotation.y = t * 2.5;
      scoutLyraCompass.position.y = 2.75 + Math.sin(t * 3.8) * 0.14;

      // 6c. Sync Map 3 (Frontier), Map 4 (Frostpeak Caverns) & Map 5 (Obsidian Citadel) Progression Landmarks
      sapperQuestMarker.setEnabled(!snap.flags.frontierBombChestOpened);
      if (!snap.flags.frontierBombChestOpened) {
        sapperQuestMarker.rotation.y = t * 3.0;
        sapperQuestMarker.position.y = 2.75 + Math.sin(t * 4.2) * 0.16;
      }

      if (snap.flags.frontierBombChestOpened) {
        frontierBombChestLid.position.set(0, 1.62, 0.42);
        frontierBombChestRing.setEnabled(false);
        frontierBombRelicNode.setEnabled(false);
      } else {
        frontierBombChestLid.position.set(0, 1.3, 0);
        frontierBombChestRing.setEnabled(true);
        frontierBombChestRing.rotation.y = t * 2.2;
        frontierBombRelicNode.setEnabled(true);
        frontierBombRelicNode.rotation.y = t * 2.6;
        frontierBombRelicNode.position.y = 2.2 + Math.sin(t * 3.5) * 0.16;
      }

      if (snap.flags.frontierHookshotChestOpened) {
        frontierHookshotChestLid.position.set(0, 1.65, 0.42);
        frontierHookshotChestRing.setEnabled(false);
        frontierHookshotRelicNode.setEnabled(false);
      } else {
        frontierHookshotChestLid.position.set(0, 1.32, 0);
        frontierHookshotChestRing.setEnabled(true);
        frontierHookshotChestRing.rotation.y = t * 2.1;
        frontierHookshotRelicNode.setEnabled(true);
        frontierHookshotRelicNode.rotation.y = t * 2.7;
        frontierHookshotRelicNode.position.y = 2.25 + Math.sin(t * 3.4) * 0.16;
      }

      const isFrCitadelGateOpen = Boolean(
        snap.flags.frontierCitadelGateUnlocked ||
          snap.flags.cavernCrestKeyPickedUp ||
          snap.flags.hasGlacialKey
      );
      const targetFrCitadelGateY = isFrCitadelGateOpen ? -4.8 : 0;
      frCitadelGateNode.position.y +=
        (targetFrCitadelGateY - frCitadelGateNode.position.y) *
        Math.min(1, dt * (isFrCitadelGateOpen ? 6 : 26));

      if (snap.flags.cavernShovelChestOpened) {
        cavernShovelChestLid.position.set(0, 1.65, 0.42);
        cavernShovelChestRing.setEnabled(false);
        cavernShovelRelicNode.setEnabled(false);
      } else {
        cavernShovelChestLid.position.set(0, 1.32, 0);
        cavernShovelChestRing.setEnabled(true);
        cavernShovelChestRing.rotation.y = t * 2.0;
        cavernShovelRelicNode.setEnabled(true);
        cavernShovelRelicNode.rotation.y = t * 2.5;
        cavernShovelRelicNode.position.y = 2.25 + Math.sin(t * 3.3) * 0.16;
      }

      if (snap.flags.cavernHammerChestOpened) {
        cavernHammerChestLid.position.set(0, 1.65, 0.42);
        cavernHammerChestRing.setEnabled(false);
        cavernHammerRelicNode.setEnabled(false);
      } else {
        cavernHammerChestLid.position.set(0, 1.32, 0);
        cavernHammerChestRing.setEnabled(true);
        cavernHammerChestRing.rotation.y = -t * 2.1;
        cavernHammerRelicNode.setEnabled(true);
        cavernHammerRelicNode.rotation.y = t * 2.6;
        cavernHammerRelicNode.position.y = 2.28 + Math.sin(t * 3.5) * 0.16;
      }

      const showGlacialKey = isCaverns && !snap.flags.cavernCrestKeyPickedUp;
      glacialKeyNode.setEnabled(showGlacialKey);
      glacialKeyBeaconRing.setEnabled(showGlacialKey);
      if (showGlacialKey) {
        glacialKeyNode.rotation.y = t * 2.4;
        if (snap.boomerang?.carryingGlacialKey && snap.boomerang.zone === "caverns") {
          glacialKeyNode.position.set(snap.boomerang.x, 1.35, snap.boomerang.z);
        } else if (snap.hookshot?.carryingGlacialKey && snap.hookshot.zone === "caverns") {
          glacialKeyNode.position.set(snap.hookshot.x, 1.35, snap.hookshot.z);
        } else {
          glacialKeyNode.position.set(
            CAVERN_CREST_KEY_POS.x,
            1.65 + Math.sin(t * 3.4) * 0.18,
            CAVERN_CREST_KEY_POS.z
          );
        }
      }

      if (snap.flags.citadelArmoryChestOpened) {
        citadelArmoryChestLid.position.set(0, 1.68, 0.44);
        citadelArmoryChestRing.setEnabled(false);
        citadelArmoryRelicNode.setEnabled(false);
      } else {
        citadelArmoryChestLid.position.set(0, 1.34, 0);
        citadelArmoryChestRing.setEnabled(true);
        citadelArmoryChestRing.rotation.y = t * 2.2;
        citadelArmoryRelicNode.setEnabled(true);
        citadelArmoryRelicNode.rotation.y = t * 2.7;
        citadelArmoryRelicNode.position.y = 2.3 + Math.sin(t * 3.4) * 0.16;
      }

      const isCtBossGateOpen = Boolean(
        snap.flags.citadelGateUnlocked &&
          (!snap.flags.citadelBossAwakened || snap.flags.citadelBossDefeated)
      );
      const targetCtBossGateY = isCtBossGateOpen ? -4.8 : 0;
      citadelBossGateNode.position.y +=
        (targetCtBossGateY - citadelBossGateNode.position.y) *
        Math.min(1, dt * (isCtBossGateOpen ? 6 : 26));

      const targetCtExitGateY = snap.flags.citadelBossDefeated ? -5.0 : 0;
      citadelExitGateNode.position.y +=
        (targetCtExitGateY - citadelExitGateNode.position.y) * Math.min(1, dt * 6);

      citadelVictorySealRing.setEnabled(!snap.flags.citadelBossDefeated);
      citadelVictorySealRing.rotation.y = t * 1.8;
      citadelVictoryUnsealedRing.setEnabled(Boolean(snap.flags.citadelBossDefeated));
      citadelVictoryUnsealedRing.scaling.setAll(1 + Math.sin(t * 4) * 0.06);

      if (snap.flags.citadelVictoryChestOpened) {
        citadelVictoryChestLid.position.set(0, 1.85, 0.45);
        citadelVictoryCrestNode.setEnabled(true);
        citadelVictoryCrestNode.rotation.y = t * 2.4;
        citadelVictoryCrestNode.position.y = 2.85 + Math.sin(t * 3.0) * 0.18;
      } else {
        citadelVictoryChestLid.position.set(0, 1.5, 0);
        citadelVictoryCrestNode.setEnabled(false);
      }

      // 6d. Sync Map 6 (Sunscorched Oasis) & Map 7 (Skyward Caldera) Progression Landmarks
      if (snap.flags.desertOasisChestOpened) {
        desertOasisChestLid.position.set(0, 1.68, 0.44);
        desertOasisChestRing.setEnabled(false);
        desertOasisRelicNode.setEnabled(false);
      } else {
        desertOasisChestLid.position.set(0, 1.34, 0);
        desertOasisChestRing.setEnabled(true);
        desertOasisChestRing.rotation.y = t * 2.2;
        desertOasisRelicNode.setEnabled(true);
        desertOasisRelicNode.rotation.y = t * 2.7;
        desertOasisRelicNode.position.y = 2.3 + Math.sin(t * 3.4) * 0.16;
      }

      const showSolarKey = isDesert && !snap.flags.desertSolarKeyPickedUp;
      solarKeyNode.setEnabled(showSolarKey);
      solarKeyBeaconRing.setEnabled(showSolarKey);
      if (showSolarKey) {
        solarKeyNode.rotation.y = t * 2.4;
        if (snap.boomerang?.carryingSolarKey && snap.boomerang.zone === "desert") {
          solarKeyNode.position.set(snap.boomerang.x, 1.35, snap.boomerang.z);
        } else if (snap.hookshot?.carryingSolarKey && snap.hookshot.zone === "desert") {
          solarKeyNode.position.set(snap.hookshot.x, 1.35, snap.hookshot.z);
        } else {
          solarKeyNode.position.set(
            DESERT_SOLAR_KEY_POS.x,
            1.65 + Math.sin(t * 3.4) * 0.18,
            DESERT_SOLAR_KEY_POS.z
          );
        }
      }

      const isDsCalderaGateOpen = Boolean(
        snap.flags.desertCalderaGateUnlocked ||
          snap.flags.desertSolarKeyPickedUp ||
          snap.flags.hasSolarKey
      );
      const targetDsCalderaGateY = isDsCalderaGateOpen ? -4.8 : 0;
      dsCalderaGateNode.position.y +=
        (targetDsCalderaGateY - dsCalderaGateNode.position.y) *
        Math.min(1, dt * (isDsCalderaGateOpen ? 6 : 26));

      if (snap.flags.calderaForgeChestOpened) {
        calderaForgeChestLid.position.set(0, 1.68, 0.44);
        calderaForgeChestRing.setEnabled(false);
        calderaForgeRelicNode.setEnabled(false);
      } else {
        calderaForgeChestLid.position.set(0, 1.34, 0);
        calderaForgeChestRing.setEnabled(true);
        calderaForgeChestRing.rotation.y = t * 2.2;
        calderaForgeRelicNode.setEnabled(true);
        calderaForgeRelicNode.rotation.y = t * 2.7;
        calderaForgeRelicNode.position.y = 2.3 + Math.sin(t * 3.4) * 0.16;
      }

      const isCaBossGateOpen = Boolean(
        snap.flags.calderaGateUnlocked &&
          (!snap.flags.calderaBossAwakened || snap.flags.calderaBossDefeated)
      );
      const targetCaBossGateY = isCaBossGateOpen ? -4.8 : 0;
      calderaBossGateNode.position.y +=
        (targetCaBossGateY - calderaBossGateNode.position.y) *
        Math.min(1, dt * (isCaBossGateOpen ? 6 : 26));

      const targetCaExitGateY = snap.flags.calderaBossDefeated ? -5.0 : 0;
      calderaExitGateNode.position.y +=
        (targetCaExitGateY - calderaExitGateNode.position.y) *
        Math.min(1, dt * 6);

      calderaVictorySealRing.setEnabled(!snap.flags.calderaBossDefeated);
      calderaVictorySealRing.rotation.y = t * 1.8;
      calderaVictoryUnsealedRing.setEnabled(Boolean(snap.flags.calderaBossDefeated));
      calderaVictoryUnsealedRing.scaling.setAll(1 + Math.sin(t * 4) * 0.06);

      if (snap.flags.calderaVictoryChestOpened) {
        calderaVictoryChestLid.position.set(0, 1.85, 0.45);
        calderaVictoryCrestNode.setEnabled(true);
        calderaVictoryCrestNode.rotation.y = t * 2.4;
        calderaVictoryCrestNode.position.y = 2.85 + Math.sin(t * 3.0) * 0.18;
      } else {
        calderaVictoryChestLid.position.set(0, 1.5, 0);
        calderaVictoryCrestNode.setEnabled(false);
      }

      const syncBiomeChestRig = (
        rig: { lid: Mesh; ring: Mesh; relic: Mesh },
        opened: boolean
      ) => {
        rig.ring.rotation.y = t * 1.9;
        rig.ring.scaling.setAll(1 + Math.sin(t * 3.8) * 0.05);
        if (opened) {
          rig.lid.position.set(0, 1.65, 0.42);
          rig.relic.setEnabled(true);
          rig.relic.rotation.y = t * 2.4;
          rig.relic.position.y = 2.35 + Math.sin(t * 3.0) * 0.16;
        } else {
          rig.lid.position.set(0, 1.34, 0);
          rig.relic.setEnabled(false);
        }
      };
      syncBiomeChestRig(atollPearlChestRig, Boolean(snap.flags.atollPearlChestOpened));
      syncBiomeChestRig(atollVictoryChestRig, Boolean(snap.flags.atollVictoryChestOpened));
      syncBiomeChestRig(hollowSporeChestRig, Boolean(snap.flags.hollowSporeChestOpened));
      syncBiomeChestRig(hollowVictoryChestRig, Boolean(snap.flags.hollowVictoryChestOpened));
      syncBiomeChestRig(skyCelestialChestRig, Boolean(snap.flags.skyCelestialChestOpened));
      syncBiomeChestRig(skyVictoryChestRig, Boolean(snap.flags.skyVictoryChestOpened));

      // 7. Sync Enemies & Billboard Floating Health Bars
      const activeEnemyIds = new Set<string>();
      for (let eIdx = 0; eIdx < snap.enemies.length; eIdx++) {
        const enemy = snap.enemies[eIdx];
        activeEnemyIds.add(enemy.id);
        let rig = enemyRigs.get(enemy.id);
        if (!rig) {
          rig = buildEnemyRig(enemy.id, enemy.kind, enemy.zone);
          enemyRigs.set(enemy.id, rig);
        }

        const visible = enemy.zone === snap.zone && enemy.state !== "dead";
        rig.root.setEnabled(visible);
        rig.hpBarHolder.setEnabled(visible);
        if (!visible) {
          if (rig.chargeCorridorRoot) rig.chargeCorridorRoot.setEnabled(false);
          if (rig.archerAimLine) rig.archerAimLine.setEnabled(false);
          if (rig.stunStarsRoot) rig.stunStarsRoot.setEnabled(false);
          if (rig.shockAuraNode) rig.shockAuraNode.setEnabled(false);
          if (rig.bountyAuraNode) rig.bountyAuraNode.setEnabled(false);
          continue;
        }

        let bob = 0;
        if (!snap.editorMode) {
          if (enemy.kind === "slime") {
            const hopWave = Math.sin(t * 6.2 + eIdx * 1.3);
            bob = Math.max(0, hopWave) * 0.34;
            const stretchY = 1.0 + hopWave * 0.15;
            const squashXZ = 1.0 - hopWave * 0.09;
            rig.body.scaling.set(squashXZ, stretchY, squashXZ);
          } else if (enemy.kind === "minion") {
            bob = Math.sin(t * 4.5 + eIdx) * 0.22;
          } else if (enemy.kind === "wraith") {
            bob = 0.28 + Math.sin(t * 4.2 + eIdx) * 0.22;
          }
          if (enemy.kind === "burrower") {
            if (enemy.burrowed) {
              rig.body.position.y = -1.28 + Math.sin(t * 14 + eIdx) * 0.06;
              rig.hpBarHolder.setEnabled(false);
            } else {
              rig.body.position.y = 0;
            }
          }
        } else {
          rig.body.scaling.setAll(1);
          rig.body.position.y = 0;
        }

        const enemyGroundY = sampleTerrainHeight(activeCells, enemy.x, enemy.z);
        rig.root.position.set(enemy.x, enemyGroundY + bob, enemy.z);
        rig.root.rotation.y = enemy.facing;

        rig.hpBarHolder.position.set(enemy.x, enemyGroundY + rig.barY + bob, enemy.z);
        // Always face camera even when orbiting in Editor Mode!
        rig.hpBarHolder.rotation.set(-camera.beta, -camera.alpha - Math.PI / 2, 0);
        const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
        rig.hpBarFill.scaling.x = Math.max(0.001, hpRatio);
        rig.hpBarFill.position.x = -rig.barWidth * (1 - hpRatio) * 0.5;

        if (rig.archerAimLine) {
          rig.archerAimLine.setEnabled(enemy.state === "windup");
        }
        if (rig.woodShieldNode) {
          rig.woodShieldNode.setEnabled(enemy.shieldArmor === "wood");
        }
        if (rig.iceArmorNode) {
          const hasIce =
            enemy.shieldArmor === "ice" ||
            (enemy.kind === "boss" && snap.flags.bossState === "ARMORED");
          rig.iceArmorNode.setEnabled(hasIce);
          if (hasIce) {
            rig.iceArmorNode.rotation.y = t * 1.1;
          }
        }
        if (rig.shockAuraNode) {
          const shockActive = Boolean(enemy.shockArmor) && enemy.stunTimer <= 0;
          rig.shockAuraNode.setEnabled(shockActive);
          if (shockActive) {
            rig.shockAuraNode.rotation.y = -t * 7.2;
            const shockPulse = 1.0 + Math.sin(t * 28 + eIdx) * 0.12;
            rig.shockAuraNode.scaling.setAll(shockPulse);
          }
        }
        if (rig.bountyAuraNode) {
          const isBounty = Boolean(enemy.isBounty);
          rig.bountyAuraNode.setEnabled(isBounty);
          if (isBounty) {
            rig.bountyAuraNode.rotation.y = t * 2.6;
          }
        }

        if (enemy.kind === "goblin" || enemy.kind === "knight") {
          const showCorridor = enemy.state === "windup";
          if (
            rig.chargeCorridorRoot &&
            rig.chargeCorridorBody &&
            rig.chargeCorridorTip &&
            rig.chargeCorridorMat
          ) {
            rig.chargeCorridorRoot.setEnabled(showCorridor);
            if (showCorridor) {
              const pathLen = Math.max(
                2.0,
                enemy.chargePathLength || (enemy.kind === "knight" ? 5.2 : 4.5)
              );
              const tipLen = enemy.kind === "knight" ? 0.95 : 0.85;
              const bodyLen = Math.max(0.6, pathLen - tipLen * 0.5);

              rig.chargeCorridorRoot.position.set(enemy.x, enemyGroundY, enemy.z);
              rig.chargeCorridorRoot.rotation.y = enemy.chargeAngle;
              rig.chargeCorridorBody.scaling.z = bodyLen;
              rig.chargeCorridorTip.position.z = bodyLen;

              const lockThreshold = enemy.kind === "knight" ? 0.58 : 0.54;
              const lockedAim = enemy.stateTimer <= lockThreshold;
              const pulse = Math.floor(t * 15) % 2 === 0;
              rig.chargeCorridorMat.emissiveColor.set(
                lockedAim && pulse ? 1.0 : 0.95,
                lockedAim && pulse ? 0.78 : 0.28,
                lockedAim && pulse ? 0.25 : 0.08
              );
              rig.chargeCorridorMat.alpha = lockedAim ? 0.7 : 0.46;
            }
          }
        } else if (enemy.kind === "boss") {
          const showCorridor =
            enemy.state === "charge_aim" || enemy.state === "charge_lock";
          if (
            rig.chargeCorridorRoot &&
            rig.chargeCorridorBody &&
            rig.chargeCorridorTip &&
            rig.chargeCorridorMat
          ) {
            rig.chargeCorridorRoot.setEnabled(showCorridor);
            if (showCorridor) {
              const pathLen = Math.max(2.0, enemy.chargePathLength || 10.0);
              const bodyLen = Math.max(1.0, pathLen - 0.7);
              rig.chargeCorridorRoot.position.set(enemy.x, enemyGroundY, enemy.z);
              rig.chargeCorridorRoot.rotation.y = enemy.chargeAngle;
              rig.chargeCorridorBody.scaling.z = bodyLen;
              rig.chargeCorridorTip.position.z = bodyLen;

              if (enemy.state === "charge_lock") {
                const pulse = Math.floor(t * 16) % 2 === 0;
                rig.chargeCorridorMat.emissiveColor.set(
                  pulse ? 1.0 : 0.9,
                  pulse ? 0.85 : 0.15,
                  pulse ? 0.3 : 0.15
                );
                rig.chargeCorridorMat.alpha = 0.72;
              } else {
                rig.chargeCorridorMat.emissiveColor.set(0.95, 0.35, 0.1);
                rig.chargeCorridorMat.alpha = 0.48;
              }
            }
          }

          if (rig.lungeShieldMesh) {
            rig.lungeShieldMesh.setEnabled(enemy.state === "charge_lunge");
          }
        }

        // Sync spinning overhead stun stars & dizzy forward tilt for ANY monster stunned by crashing into a wall or Boomerang!
        if (rig.stunStarsRoot) {
          const isStunned = enemy.state === "stunned" || enemy.stunTimer > 0;
          rig.stunStarsRoot.setEnabled(isStunned);
          if (isStunned) {
            rig.stunStarsRoot.rotation.y = t * 5.8;
            rig.body.rotation.x = 0.24;
          } else {
            rig.body.rotation.x = 0;
          }
        }

        const isWindingOrAttacking =
          enemy.state === "windup" ||
          enemy.state === "attack" ||
          enemy.state === "charge_aim" ||
          enemy.state === "charge_lock" ||
          enemy.state === "lob_windup";
        rig.telegraphRing.setEnabled(isWindingOrAttacking);
        if (
          enemy.state === "windup" ||
          enemy.state === "charge_aim" ||
          enemy.state === "charge_lock" ||
          enemy.state === "lob_windup"
        ) {
          rig.weapon.rotation.x = enemy.kind === "archer" ? 0 : -0.85;
          rig.telegraphRing.scaling.setAll(1 + Math.sin(t * 18) * 0.12);
        } else if (enemy.state === "attack" || enemy.state === "charge_lunge") {
          rig.weapon.rotation.x = 0.65;
        } else {
          rig.weapon.rotation.x = 0;
        }

        const flashing = enemy.hitFlashTimer > 0 || enemy.stunTimer > 0;
        rig.materials.forEach((mat, idx) => {
          if (enemy.hitFlashTimer > 0) {
            mat.diffuseColor.set(1, 1, 1);
            mat.emissiveColor.set(0.85, 0.35, 0.2);
          } else if (flashing) {
            mat.diffuseColor.set(0.95, 0.9, 0.45);
            mat.emissiveColor.set(0.35, 0.3, 0.08);
          } else if (enemy.isBounty && idx === 0) {
            // Gold/Crimson Bounty Monster body tint!
            mat.diffuseColor.set(0.98, 0.72, 0.18);
            mat.emissiveColor.set(0.45, 0.16, 0.06);
          } else {
            mat.diffuseColor.copyFrom(rig!.baseColors[idx]);
            mat.emissiveColor.set(0.08, 0.04, 0.06);
          }
        });
      }

      enemyRigs.forEach((rig, id) => {
        if (!activeEnemyIds.has(id)) {
          rig.root.setEnabled(false);
          rig.hpBarHolder.setEnabled(false);
          if (rig.chargeCorridorRoot) rig.chargeCorridorRoot.setEnabled(false);
          if (rig.archerAimLine) rig.archerAimLine.setEnabled(false);
        }
      });

      // 7b. Sync 3D Arrows, Frost Bolts, Reflected Bolts & Turret Rock Boulders
      const activeArrowIds = new Set<string>();
      for (const arrow of snap.arrows) {
        let aRig = arrowRigs.get(arrow.id);
        if (aRig && aRig.metadata?.isReflected !== Boolean(arrow.isReflected)) {
          aRig.dispose();
          aRig = undefined;
        }
        if (!aRig) {
          aRig = buildArrowRig(
            arrow.id,
            arrow.fromHero,
            Boolean(arrow.isRock),
            Boolean(arrow.isFrost),
            Boolean(arrow.isReflected)
          );
          arrowRigs.set(arrow.id, aRig);
        }

        if (arrow.zone !== snap.zone && !arrow.stuckInShield) {
          aRig.setEnabled(false);
          continue;
        }

        if (arrow.stuck && arrow.stuckInShield) {
          activeArrowIds.add(arrow.id);
          aRig.setEnabled(true);
          if (aRig.parent !== heroShieldPivot) {
            aRig.parent = heroShieldPivot;
          }

          const ry = Math.PI / 2 + (arrow.stuckShieldYaw ?? 0);
          const embedDepth = 0.6;
          const sy = arrow.stuckShieldY ?? 0;
          const sz = arrow.stuckShieldZ ?? 0;
          aRig.position.set(
            -0.06 - Math.sin(ry) * embedDepth,
            sy,
            sz - Math.cos(ry) * embedDepth
          );

          const st = arrow.stuckTimer ?? 0;
          const vib = st > 4.22 ? Math.sin(t * 72) * 0.085 * ((st - 4.22) / 0.28) : 0;
          aRig.rotation.set(vib, ry, 0);
          const scaleFade = st < 0.45 ? Math.max(0.01, st / 0.45) : 1.0;
          aRig.scaling.setAll(scaleFade);
          continue;
        }

        if (aRig.parent) {
          aRig.parent = null;
        }

        if (arrow.stuck && arrow.stuckEnemyId) {
          const hostEnemy = snap.enemies.find((e) => e.id === arrow.stuckEnemyId);
          const hostRig = enemyRigs.get(arrow.stuckEnemyId);
          if (!hostEnemy || hostEnemy.zone !== snap.zone || hostEnemy.state === "dead" || !hostRig) {
            aRig.setEnabled(false);
            continue;
          }
          activeArrowIds.add(arrow.id);
          aRig.setEnabled(true);

          const cosF = Math.cos(hostEnemy.facing);
          const sinF = Math.sin(hostEnemy.facing);
          const lx = arrow.stuckLocalX ?? 0;
          const lz = arrow.stuckLocalZ ?? 0;
          const squashXZ = hostEnemy.kind === "slime" ? hostRig.body.scaling.x : 1.0;
          const stretchY = hostEnemy.kind === "slime" ? hostRig.body.scaling.y : 1.0;
          const wx = hostEnemy.x + (lx * cosF + lz * sinF) * squashXZ;
          const wz = hostEnemy.z + (-lx * sinF + lz * cosF) * squashXZ;
          const bodyHitY =
            hostEnemy.kind === "boss"
              ? 1.45
              : hostEnemy.kind === "knight"
              ? 1.12
              : hostEnemy.kind === "slime"
              ? 0.64 * stretchY
              : 0.96;

          aRig.position.set(wx, hostRig.root.position.y + bodyHitY, wz);
          aRig.rotation.y = hostEnemy.facing + (arrow.stuckLocalAngle ?? 0);

          const st = arrow.stuckTimer ?? 0;
          const vib = st > 3.72 ? Math.sin(t * 72) * 0.085 * ((st - 3.72) / 0.28) : 0;
          aRig.rotation.x = vib;
          const scaleFade = st < 0.45 ? Math.max(0.01, st / 0.45) : 1.0;
          aRig.scaling.setAll(scaleFade);
          continue;
        }

        activeArrowIds.add(arrow.id);
        aRig.setEnabled(true);
        const aGroundY = sampleTerrainHeight(activeCells, arrow.x, arrow.z);
        aRig.position.set(arrow.x, aGroundY + 1.0, arrow.z);
        aRig.rotation.y = arrow.angle;
        if (arrow.isRock) {
          aRig.rotation.x = t * 11.5;
          aRig.rotation.z = t * 8.2;
          aRig.scaling.setAll(1.0);
        } else if (arrow.stuck) {
          const st = arrow.stuckTimer ?? 0;
          // Subtle impact vibration right after sticking into a wall
          const vib = st > 2.12 ? Math.sin(t * 72) * 0.085 * ((st - 2.12) / 0.28) : 0;
          aRig.rotation.x = vib;
          // Smooth shrink-out in the final 0.45s before disappearing
          const scaleFade = st < 0.45 ? Math.max(0.01, st / 0.45) : 1.0;
          aRig.scaling.setAll(scaleFade);
        } else {
          aRig.rotation.x = 0;
          aRig.scaling.setAll(1.0);
        }
      }
      arrowRigs.forEach((aRig, id) => {
        if (!activeArrowIds.has(id)) {
          aRig.dispose();
          arrowRigs.delete(id);
        }
      });

      // 7c. Sync Magic Fire Rod Fireballs (`snap.fireballs`)
      const activeFireballIds = new Set<string>();
      for (const fb of snap.fireballs) {
        activeFireballIds.add(fb.id);
        let fbRig = fireballRigs.get(fb.id);
        if (!fbRig) {
          fbRig = buildFireballRig(fb.id, fb.isCharged);
          fireballRigs.set(fb.id, fbRig);
        }
        const showFb = fb.zone === snap.zone;
        fbRig.setEnabled(showFb);
        if (showFb) {
          const fbGroundY = sampleTerrainHeight(activeCells, fb.x, fb.z);
          fbRig.position.set(fb.x, fbGroundY + 1.15, fb.z);
          fbRig.rotation.y = fb.angle;
          fbRig.rotation.z = t * 14.0;
          const pulse = 1.0 + Math.sin(t * 22) * 0.14;
          fbRig.scaling.setAll(pulse);
        }
      }
      fireballRigs.forEach((fbRig, id) => {
        if (!activeFireballIds.has(id)) {
          fbRig.dispose();
          fireballRigs.delete(id);
        }
      });

      // 7d. Sync Charged Fireball Burning Ground Patches (`snap.fireZones`)
      const activeFireZoneIds = new Set<string>();
      for (const fz of snap.fireZones) {
        activeFireZoneIds.add(fz.id);
        let fzRig = fireZoneRigs.get(fz.id);
        if (!fzRig) {
          fzRig = buildFireZoneRig(fz.id, fz.radius);
          fireZoneRigs.set(fz.id, fzRig);
        }
        const showFz = fz.zone === snap.zone && fz.timer > 0;
        fzRig.root.setEnabled(showFz);
        if (!showFz) continue;

        const fzGroundY = sampleTerrainHeight(activeCells, fz.x, fz.z);
        const fade = fz.timer < 0.7 ? Math.max(0.05, fz.timer / 0.7) : 1.0;
        fzRig.disc.position.set(fz.x, fzGroundY + 0.05, fz.z);
        fzRig.disc.scaling.set(fade, 1, fade);
        fzRig.ring.position.set(fz.x, fzGroundY + 0.09, fz.z);
        fzRig.ring.scaling.setAll(fade * (1 + Math.sin(t * 14) * 0.06));

        fzRig.flames.forEach((fl, idx) => {
          const ang = idx * 0.92 + t * 3.4;
          const rad = (0.22 + ((idx * 0.21) % 0.58)) * fz.radius * fade;
          const flickH = 0.8 + Math.sin(t * 18 + idx * 1.7) * 0.35;
          fl.position.set(
            fz.x + Math.cos(ang) * rad,
            fzGroundY + 0.38 * flickH,
            fz.z + Math.sin(ang) * rad
          );
          fl.scaling.set(fade, flickH * fade, fade);
        });
      }
      fireZoneRigs.forEach((fzRig, id) => {
        if (!activeFireZoneIds.has(id)) {
          fzRig.root.dispose();
          fireZoneRigs.delete(id);
        }
      });

      // 7e. Sync Friendly Bottled Golden Bees (`snap.friendlyBees`)
      const activeBeeIds = new Set<string>();
      for (const bee of snap.friendlyBees) {
        activeBeeIds.add(bee.id);
        let bRig = beeRigs.get(bee.id);
        if (!bRig) {
          bRig = buildBeeRig(bee.id);
          beeRigs.set(bee.id, bRig);
        }
        const showBee = bee.zone === snap.zone && bee.timer > 0;
        bRig.root.setEnabled(showBee);
        if (showBee) {
          const bGroundY = sampleTerrainHeight(activeCells, bee.x, bee.z);
          bRig.root.position.set(
            bee.x,
            bGroundY + 1.45 + Math.sin(t * 18) * 0.22,
            bee.z
          );
          bRig.root.rotation.y = bee.facing;
          const wingFlap = Math.sin(t * 52) * 0.42;
          bRig.wingL.rotation.z = 0.25 + wingFlap;
          bRig.wingR.rotation.z = -0.25 - wingFlap;
        }
      }
      beeRigs.forEach((bRig, id) => {
        if (!activeBeeIds.has(id)) {
          bRig.root.dispose();
          beeRigs.delete(id);
        }
      });

      // 7f. Sync Thrown Pots & Light Rocks (`snap.thrownObjects`)
      const activeThrownIds = new Set<string>();
      for (const obj of snap.thrownObjects) {
        activeThrownIds.add(obj.id);
        let tRig = thrownObjectRigs.get(obj.id);
        if (!tRig) {
          tRig = buildThrownObjectRig(obj.id, obj.kind);
          thrownObjectRigs.set(obj.id, tRig);
        }
        const showThrown = obj.zone === snap.zone;
        tRig.setEnabled(showThrown);
        if (showThrown) {
          const tGroundY = sampleTerrainHeight(activeCells, obj.x, obj.z);
          tRig.position.set(obj.x, tGroundY + obj.y, obj.z);
          tRig.rotation.x = obj.flightTime * 9.5;
          tRig.rotation.z = obj.flightTime * 6.5;
        }
      }
      thrownObjectRigs.forEach((tRig, id) => {
        if (!activeThrownIds.has(id)) {
          tRig.dispose();
          thrownObjectRigs.delete(id);
        }
      });

      // 7g. Sync Placed / Thrown Bombs & Explosion Shockwaves (`snap.activeBombs`)
      const activeBombIds = new Set<string>();
      for (const bomb of snap.activeBombs) {
        activeBombIds.add(bomb.id);
        let bmRig = bombRigs.get(bomb.id);
        if (!bmRig) {
          bmRig = buildBombRig(bomb.id);
          bombRigs.set(bomb.id, bmRig);
        }
        const showBomb = bomb.zone === snap.zone;
        bmRig.root.setEnabled(showBomb);
        if (!showBomb) continue;

        const bmGroundY = sampleTerrainHeight(activeCells, bomb.x, bomb.z);
        bmRig.root.position.set(bomb.x, bmGroundY + bomb.y, bomb.z);

        if (bomb.exploded) {
          bmRig.bodyNode.setEnabled(false);
          bmRig.blastSphere.setEnabled(true);
          bmRig.blastRing.setEnabled(true);
          const prog = 1 - Math.max(0, bomb.explosionTimer ?? 0) / 0.36;
          const blastDiam = (0.4 + prog * 0.72) * 3.5 * 2;
          bmRig.blastSphere.scaling.setAll(blastDiam);
          bmRig.blastRing.scaling.setAll(blastDiam * 1.08);
        } else {
          bmRig.bodyNode.setEnabled(true);
          bmRig.blastSphere.setEnabled(false);
          bmRig.blastRing.setEnabled(false);
          const flashFreq = bomb.fuseTimer < 0.8 ? 22 : 10;
          const flashRed = Math.floor(t * flashFreq) % 2 === 0;
          if (flashRed) {
            bmRig.bodyMat.diffuseColor.set(1.0, 0.22, 0.2);
            bmRig.bodyMat.emissiveColor.set(0.85, 0.14, 0.1);
          } else {
            bmRig.bodyMat.diffuseColor.set(0.16, 0.22, 0.36);
            bmRig.bodyMat.emissiveColor.set(0.04, 0.06, 0.12);
          }
          bmRig.spark.rotation.y = t * 18;
          bmRig.spark.scaling.setAll(1 + Math.sin(t * 28) * 0.35);
          const pulse = 1 + (bomb.fuseTimer < 0.8 ? Math.sin(t * 26) * 0.08 : 0);
          bmRig.bodyNode.scaling.setAll(pulse);
        }
      }
      bombRigs.forEach((bmRig, id) => {
        if (!activeBombIds.has(id)) {
          bmRig.root.dispose();
          bombRigs.delete(id);
        }
      });

      // 7h. Sync Titan War-Hammer Radial Seismic Shockwaves (`snap.hammerShockwaves`)
      const activeShockwaveIds = new Set<string>();
      for (const sw of snap.hammerShockwaves) {
        activeShockwaveIds.add(sw.id);
        let swRig = hammerShockwaveRigs.get(sw.id);
        if (!swRig) {
          swRig = buildHammerShockwaveRig(sw.id);
          hammerShockwaveRigs.set(sw.id, swRig);
        }
        const showSw = sw.zone === snap.zone && sw.timer > 0;
        swRig.root.setEnabled(showSw);
        if (!showSw) continue;

        const swGroundY = sampleTerrainHeight(activeCells, sw.x, sw.z);
        swRig.root.position.set(sw.x, swGroundY, sw.z);

        const prog = 1 - Math.max(0, sw.timer) / Math.max(0.01, sw.maxTimer);
        const radScale = (0.28 + prog * 0.84) * sw.maxRadius;
        const fadeY = Math.max(0.2, 1 - prog * 0.72);
        swRig.outerRing.scaling.set(radScale, fadeY, radScale);
        swRig.innerRing.scaling.set(radScale * 0.78, fadeY, radScale * 0.78);
        swRig.groundDisc.scaling.set(radScale * 0.92, 1, radScale * 0.92);
        swRig.outerRing.rotation.y = t * 8.0;
        swRig.innerRing.rotation.y = -t * 10.0;
      }
      hammerShockwaveRigs.forEach((swRig, id) => {
        if (!activeShockwaveIds.has(id)) {
          swRig.root.dispose();
          hammerShockwaveRigs.delete(id);
        }
      });

      // 8. Sync Boss Arcing Projectiles & Landing AOE Telegraphs
      const activeProjIds = new Set<string>();
      for (const proj of snap.projectiles) {
        activeProjIds.add(proj.id);
        let pRig = projectileRigs.get(proj.id);
        if (!pRig) {
          pRig = buildProjectileRig(proj.id, proj.aoeRadius, proj.directHitRadius);
          projectileRigs.set(proj.id, pRig);
        }

        const showProj = proj.zone === snap.zone;
        pRig.root.setEnabled(showProj);
        if (!showProj) continue;

        const progress = Math.min(1, proj.flightTime / proj.totalFlightTime);
        const arcPeak = 6.8;
        const curX = proj.startX + (proj.targetX - proj.startX) * progress;
        const curZ = proj.startZ + (proj.targetZ - proj.startZ) * progress;
        const curY = 1.8 * (1 - progress) + 4 * arcPeak * progress * (1 - progress);

        pRig.orb.position.set(curX, curY, curZ);
        pRig.outerRing.position.set(proj.targetX, 0.08, proj.targetZ);
        pRig.innerCoreRing.position.set(proj.targetX, 0.09, proj.targetZ);
        pRig.fillDisc.position.set(proj.targetX, 0.05, proj.targetZ);
        pRig.fillDisc.scaling.setAll(0.25 + progress * 0.75);

        pRig.arcDots.forEach((dot, idx) => {
          const s = (idx + 1) / (pRig!.arcDots.length + 1);
          const dx = proj.startX + (proj.targetX - proj.startX) * s;
          const dz = proj.startZ + (proj.targetZ - proj.startZ) * s;
          const dy = 1.8 * (1 - s) + 4 * arcPeak * s * (1 - s);
          dot.position.set(dx, dy, dz);
        });
      }

      projectileRigs.forEach((pRig, id) => {
        if (!activeProjIds.has(id)) {
          pRig.root.setEnabled(false);
        }
      });

      // 9. Sync Lingering Fire / Toxin Ground Hazard Pools
      const activeHazardIds = new Set<string>();
      for (const hazard of snap.hazards) {
        activeHazardIds.add(hazard.id);
        let hRig = hazardRigs.get(hazard.id);
        if (!hRig) {
          hRig = buildHazardRig(hazard.id, hazard.radius);
          hazardRigs.set(hazard.id, hRig);
        }

        const showHazard = hazard.zone === snap.zone && hazard.timer > 0;
        hRig.root.setEnabled(showHazard);
        if (!showHazard) continue;

        const fadeScale = hazard.timer < 0.8 ? hazard.timer / 0.8 : 1.0;
        hRig.poolDisc.position.set(hazard.x, 0.04, hazard.z);
        hRig.poolDisc.scaling.set(fadeScale, 1, fadeScale);
        hRig.rimRing.position.set(hazard.x, 0.07, hazard.z);
        hRig.rimRing.scaling.setAll(fadeScale * (1 + Math.sin(t * 8) * 0.04));

        hRig.bubbles.forEach((bub, idx) => {
          const angle = idx * 1.25 + t * 1.4;
          const rad = (0.3 + ((idx * 0.17) % 0.55)) * hazard.radius * fadeScale;
          const by = 0.15 + ((t * 1.8 + idx * 0.4) % 0.75);
          bub.position.set(
            hazard.x + Math.cos(angle) * rad,
            by,
            hazard.z + Math.sin(angle) * rad
          );
        });
      }

      hazardRigs.forEach((hRig, id) => {
        if (!activeHazardIds.has(id)) {
          hRig.root.setEnabled(false);
        }
      });

      // 9b. Sync 3D Bush Chop Leaf, Shovel Dirt, Ceramic & Rock Shard Bursts
      const activeBurstIds = new Set<string>();
      for (const burst of snap.bushBursts) {
        activeBurstIds.add(burst.id);
        let bRig = bushBurstRigs.get(burst.id);
        if (!bRig) {
          bRig = buildBushBurstRig(
            burst.id,
            burst.seed,
            Boolean(burst.isDirt),
            Boolean(burst.isCeramic),
            Boolean(burst.isRock)
          );
          bushBurstRigs.set(burst.id, bRig);
        }

        const showBurst = burst.zone === snap.zone && burst.timer > 0;
        bRig.root.setEnabled(showBurst);
        if (!showBurst) continue;

        const burstGroundY = sampleTerrainHeight(activeCells, burst.x, burst.z);
        bRig.root.position.set(burst.x, burstGroundY, burst.z);

        const elapsed = Math.max(0, burst.maxTimer - burst.timer);
        const progress = Math.min(1, elapsed / burst.maxTimer);
        const drag = 1 - progress * 0.36;
        const scaleFade =
          progress > 0.68 ? Math.max(0.01, (1 - progress) / 0.32) : 1.0;

        for (const p of bRig.particles) {
          const flutterX =
            Math.sin(elapsed * p.flutterFreq + p.flutterPhase) * 0.24 * progress;
          const flutterZ =
            Math.cos(elapsed * p.flutterFreq + p.flutterPhase) * 0.24 * progress;
          const px = p.vx * elapsed * drag + flutterX;
          const pz = p.vz * elapsed * drag + flutterZ;
          const py = Math.max(
            0.04,
            0.52 + p.vy * elapsed - 0.5 * 19.5 * elapsed * elapsed
          );
          p.mesh.position.set(px, py, pz);
          p.mesh.rotation.set(
            p.rx0 + p.wx * elapsed,
            p.ry0 + p.wy * elapsed,
            p.rz0 + p.wz * elapsed
          );
          p.mesh.scaling.set(
            p.baseScale.x * scaleFade,
            p.baseScale.y * scaleFade,
            p.baseScale.z * scaleFade
          );
        }
      }

      bushBurstRigs.forEach((bRig, id) => {
        if (!activeBurstIds.has(id)) {
          bRig.root.dispose();
          bushBurstRigs.delete(id);
        }
      });

      // 10. Sync Rupees & Heart Health Pickups (pickable in Editor Mode, with parabolic pop-up arc when dropped!)
      const activeRupeeIds = new Set<string>();
      for (const rupee of snap.rupees) {
        activeRupeeIds.add(rupee.id);
        const isHeart = rupee.tier === "heart";
        let mesh = rupeeMeshes.get(rupee.id);
        if (mesh && Boolean(mesh.metadata?.isHeart) !== isHeart) {
          mesh.dispose();
          mesh = undefined;
        }
        if (!mesh) {
          mesh = buildPickupMesh(rupee.id, isHeart);
          rupeeMeshes.set(rupee.id, mesh);
        }
        mesh.material =
          rupee.tier === "heart"
            ? heartPickupMat
            : rupee.tier === "red"
            ? redRupeeMat
            : rupee.tier === "blue"
            ? blueRupeeMat
            : greenRupeeMat;

        const showRupee = rupee.zone === snap.zone && (!rupee.collected || snap.editorMode);
        mesh.setEnabled(showRupee);
        if (showRupee) {
          const rGroundY = sampleTerrainHeight(activeCells, rupee.x, rupee.z);
          const bounceLeft = !snap.editorMode ? rupee.spawnBounceTimer ?? 0 : 0;
          let bounceArcY = 0;
          if (bounceLeft > 0) {
            const bp = 1 - Math.min(1, bounceLeft / 0.46);
            bounceArcY = 4 * 1.35 * bp * (1 - bp);
          }
          mesh.position.set(
            rupee.x,
            rGroundY +
              0.65 +
              bounceArcY +
              (snap.editorMode ? 0 : Math.sin(t * 4.2 + rupee.x) * 0.14),
            rupee.z
          );
          mesh.rotation.y = snap.editorMode
            ? 0
            : t * (bounceLeft > 0 ? 11.0 : 3.0) + rupee.z;
        }
      }
      rupeeMeshes.forEach((mesh, id) => {
        if (!activeRupeeIds.has(id)) {
          mesh.dispose();
          rupeeMeshes.delete(id);
        }
      });

      // 11. Sync Editor Selection Gizmo & Terrain Brush Ring
      if (snap.editorMode && snap.editorSelected) {
        let selPos: { x: number; z: number } | null = null;
        if (snap.editorSelected.kind === "prop") {
          const p = snap.mapProps.find((it) => it.id === snap.editorSelected?.id);
          if (p && p.zone === snap.zone) selPos = { x: p.x, z: p.z };
        } else if (snap.editorSelected.kind === "enemy") {
          const e = snap.enemies.find((it) => it.id === snap.editorSelected?.id);
          if (e && e.zone === snap.zone) selPos = { x: e.x, z: e.z };
        } else if (snap.editorSelected.kind === "rupee") {
          const r = snap.rupees.find((it) => it.id === snap.editorSelected?.id);
          if (r && r.zone === snap.zone) selPos = { x: r.x, z: r.z };
        } else if (snap.editorSelected.kind === "portal") {
          const pt = snap.portals.find((it) => it.id === snap.editorSelected?.id);
          if (pt && pt.zone === snap.zone) selPos = { x: pt.x, z: pt.z };
        }

        if (selPos) {
          editorGizmoRoot.setEnabled(true);
          const gy = sampleTerrainHeight(activeCells, selPos.x, selPos.z);
          editorGizmoRoot.position.set(selPos.x, gy, selPos.z);
          selRing.rotation.y = t * 2.0;
        } else {
          editorGizmoRoot.setEnabled(false);
        }
      } else {
        editorGizmoRoot.setEnabled(false);
      }

      if (snap.editorMode && snap.editorTool === "terrain" && cursorGroundPos) {
        terrainBrushRing.setEnabled(true);
        const gy = sampleTerrainHeight(activeCells, cursorGroundPos.x, cursorGroundPos.z);
        terrainBrushRing.position.set(cursorGroundPos.x, gy + 0.14, cursorGroundPos.z);
        terrainBrushRing.scaling.setAll(snap.terrainBrushRadius);
      } else {
        terrainBrushRing.setEnabled(false);
      }

      scene.render();
    });

    const onResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full outline-none select-none cursor-crosshair"
    />
  );
}
