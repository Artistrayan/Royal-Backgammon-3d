import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import closedBoardEmblemUrl from '../assets/images/closed_board_lion_sun_emblem_1791745629203.jpg';
import checkersGoldSilverUrl from '../assets/images/checkers_gold_silver_lion_1791747212473.jpg';
import checkersIvoryEbonyUrl from '../assets/images/checkers_ivory_ebony_lion_1791747221934.jpg';
import boardCenterCrestUrl from '../assets/images/board_center_lion_sun_crest_1791747231807.jpg';

/**
 * Loads an image URL into an HTMLImageElement safely.
 */
function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Loads the Lion & Sun back-of-board image into a CanvasTexture so GLTFExporter embeds it cleanly into the binary .glb.
 */
async function loadClosedBoardEmblemTexture(): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1365;
  const ctx = canvas.getContext('2d')!;

  const img = await loadImageElement(closedBoardEmblemUrl);
  if (img) {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(212, 175, 102, 0.85)';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  } else {
    ctx.fillStyle = '#18392b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a circular checker top medallion texture sampled directly from the user's saved checker photos
 * (Gold/Silver Lion & Sun or Ivory/Ebony Lion & Sun) with a luxury fluted metallic rim.
 */
export async function createSampledCheckerTopTexture(
  isLightPlayer: boolean,
  style: 'gold-silver' | 'ivory-ebony' | 'crown-crest' = 'gold-silver'
): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cx = 256;
  const cy = 256;

  // Base metallic/ivory fill
  ctx.fillStyle = isLightPlayer ? '#d4b26f' : '#23272a';
  ctx.fillRect(0, 0, 512, 512);

  const sourceUrl =
    style === 'ivory-ebony'
      ? checkersIvoryEbonyUrl
      : style === 'crown-crest'
      ? boardCenterCrestUrl
      : checkersGoldSilverUrl;

  const img = await loadImageElement(sourceUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.clip();

  if (img) {
    if (style === 'crown-crest') {
      // Center medallion crop
      const s = Math.min(img.width, img.height) * 0.78;
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 16, 16, 480, 480);
      if (!isLightPlayer) {
        // Darken obsidian/silver tint for player 2 so the two teams are unmistakably distinct
        ctx.fillStyle = 'rgba(10, 16, 22, 0.58)';
        ctx.fillRect(0, 0, 512, 512);
      }
    } else {
      // Sample left checker (Gold / Ivory) for Light Player, or right checker (Silver / Ebony) for Dark Player
      const s = Math.min(img.width * 0.44, img.height * 0.78);
      const centerSampleX = isLightPlayer ? img.width * 0.27 : img.width * 0.73;
      const centerSampleY = img.height * 0.5;
      const sx = Math.max(0, centerSampleX - s / 2);
      const sy = Math.max(0, centerSampleY - s / 2);
      ctx.drawImage(img, sx, sy, s, s, 16, 16, 480, 480);
    }
  }
  ctx.restore();

  // Ornate concentric coin-edge & recessed bezel rings
  const rimGrad = ctx.createLinearGradient(0, 0, 512, 512);
  if (isLightPlayer) {
    rimGrad.addColorStop(0, '#f7e5b7');
    rimGrad.addColorStop(0.5, '#c9a155');
    rimGrad.addColorStop(1, '#8a6627');
  } else {
    rimGrad.addColorStop(0, '#d8dee6');
    rimGrad.addColorStop(0.5, '#7c858e');
    rimGrad.addColorStop(1, '#2b3036');
  }

  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, 242, 0, Math.PI * 2);
  ctx.stroke();

  // Inner beaded rope detail
  ctx.strokeStyle = isLightPlayer
    ? 'rgba(255, 240, 195, 0.85)'
    : 'rgba(210, 220, 230, 0.75)';
  ctx.lineWidth = 5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(cx, cy, 218, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * High-resolution procedural PBR texture generators for the Royal Backgammon GLB model.
 */
function createWalnutWoodTexture(darkness = 1.0): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const baseR = Math.round(66 * darkness);
  const baseG = Math.round(41 * darkness);
  const baseB = Math.round(25 * darkness);
  ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 420; i++) {
    const y = Math.random() * 1024;
    const thickness = 1 + Math.random() * 5;
    const alpha = 0.04 + Math.random() * 0.12;
    const isDark = Math.random() > 0.35;
    ctx.strokeStyle = isDark
      ? `rgba(18, 9, 4, ${alpha})`
      : `rgba(118, 78, 48, ${alpha * 0.85})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(0, y);
    const freq = 0.003 + Math.random() * 0.004;
    const amp = 4 + Math.random() * 14;
    for (let x = 0; x <= 1024; x += 32) {
      const dy = Math.sin(x * freq + i) * amp;
      ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }

  for (let k = 0; k < 6; k++) {
    const cx = 150 + Math.random() * 724;
    const cy = 150 + Math.random() * 724;
    for (let r = 12; r < 180; r += 9) {
      ctx.strokeStyle = `rgba(22, 11, 5, 0.045)`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 2.6, r * 0.55, 0.04, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createIvoryPointTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#e5d8bc');
  grad.addColorStop(0.5, '#dfd0b2');
  grad.addColorStop(1, '#d2c19f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 240; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const len = 20 + Math.random() * 90;
    ctx.strokeStyle =
      Math.random() > 0.5
        ? 'rgba(165, 140, 102, 0.08)'
        : 'rgba(255, 250, 240, 0.12)';
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len * 0.2, y + len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEmeraldFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const radGrad = ctx.createRadialGradient(512, 512, 60, 512, 512, 680);
  radGrad.addColorStop(0, '#184230');
  radGrad.addColorStop(0.65, '#123324');
  radGrad.addColorStop(1, '#0b2217');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 16000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle =
      Math.random() > 0.5
        ? 'rgba(38, 92, 67, 0.11)'
        : 'rgba(6, 20, 13, 0.14)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCrownBrassPlaqueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#9a783d');
  grad.addColorStop(0.3, '#c8a86b');
  grad.addColorStop(0.5, '#e0c690');
  grad.addColorStop(0.7, '#b39050');
  grad.addColorStop(1, '#7c5d28');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#4a3514';
  ctx.lineWidth = 14;
  ctx.strokeRect(24, 24, 464, 464);

  ctx.strokeStyle = '#f2deb4';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 440, 440);

  ctx.save();
  ctx.translate(256, 265);
  ctx.strokeStyle = '#2d1e08';
  ctx.fillStyle = '#3b280c';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-115, 65);
  ctx.lineTo(-145, -65);
  ctx.lineTo(-60, 5);
  ctx.lineTo(0, -95);
  ctx.lineTo(60, 5);
  ctx.lineTo(145, -65);
  ctx.lineTo(115, 65);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-60, 5);
  ctx.lineTo(0, 62);
  ctx.lineTo(60, 5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-110, 96);
  ctx.lineTo(110, 96);
  ctx.stroke();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDieFaceTexture(
  pips: number,
  style: 'bone-ivory' | 'obsidian-night' | 'antique-brass' = 'bone-ivory'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 175);
  if (style === 'obsidian-night') {
    grad.addColorStop(0, '#1e2226');
    grad.addColorStop(0.75, '#121518');
    grad.addColorStop(1, '#090b0d');
  } else if (style === 'antique-brass') {
    grad.addColorStop(0, '#dfc387');
    grad.addColorStop(0.7, '#b5924d');
    grad.addColorStop(1, '#85662a');
  } else {
    grad.addColorStop(0, '#f6eedc');
    grad.addColorStop(0.8, '#e8dcc4');
    grad.addColorStop(1, '#d4c4a5');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle =
    style === 'obsidian-night'
      ? 'rgba(212, 178, 111, 0.35)'
      : 'rgba(160, 140, 105, 0.35)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  const pipCoords: Record<number, [number, number][]> = {
    1: [[128, 128]],
    2: [
      [72, 72],
      [184, 184],
    ],
    3: [
      [68, 68],
      [128, 128],
      [188, 188],
    ],
    4: [
      [72, 72],
      [184, 72],
      [72, 184],
      [184, 184],
    ],
    5: [
      [68, 68],
      [188, 68],
      [128, 128],
      [68, 188],
      [188, 188],
    ],
    6: [
      [72, 62],
      [184, 62],
      [72, 128],
      [184, 128],
      [72, 194],
      [184, 194],
    ],
  };

  const coords = pipCoords[pips] || pipCoords[1];
  for (const [px, py] of coords) {
    ctx.fillStyle =
      style === 'obsidian-night'
        ? '#e5c483'
        : style === 'antique-brass'
        ? '#1d1407'
        : '#2b1e12';
    ctx.beginPath();
    ctx.arc(px, py, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 235, 190, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an inlaid brushed-brass point number plaque texture (1..24) for the top & bottom walnut rails
 */
export function createPointNumberPlaqueTexture(
  pointNum: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 84;
  const ctx = canvas.getContext('2d')!;

  // Dark walnut frame blend with subtle brass cartouche border
  ctx.fillStyle = '#24150c';
  ctx.fillRect(0, 0, 128, 84);

  const grad = ctx.createLinearGradient(0, 0, 128, 84);
  grad.addColorStop(0, '#8d6c34');
  grad.addColorStop(0.5, '#d8b778');
  grad.addColorStop(1, '#7a5b28');

  ctx.strokeStyle = grad;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 116, 72);

  ctx.fillStyle = '#f2dca6';
  ctx.font = 'bold 44px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(pointNum), 64, 45);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a royal gold/ebony engraved texture for the 3D Doubling Cube faces (2, 4, 8, 16, 32, 64)
 */
export function createDoublingCubeFaceTexture(
  cubeVal: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createRadialGradient(128, 128, 18, 128, 128, 180);
  bgGrad.addColorStop(0, '#1f180e');
  bgGrad.addColorStop(0.7, '#120d07');
  bgGrad.addColorStop(1, '#090603');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 256, 256);

  const brassGrad = ctx.createLinearGradient(0, 0, 256, 256);
  brassGrad.addColorStop(0, '#b58e49');
  brassGrad.addColorStop(0.5, '#f5dea8');
  brassGrad.addColorStop(1, '#8c692c');

  ctx.strokeStyle = brassGrad;
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 236, 236);

  ctx.strokeStyle = 'rgba(245, 222, 168, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 208, 208);

  ctx.fillStyle = brassGrad;
  ctx.font = cubeVal >= 16 ? 'bold 112px Cinzel, serif' : 'bold 126px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cubeVal), 128, 134);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a 3D triangular point mesh (inlaid marquetry point)
 */
function createTrianglePointGeometry(
  baseWidth: number,
  length: number,
  thickness: number,
  pointingDown: boolean
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = baseWidth / 2;
  shape.moveTo(-halfW, 0);
  shape.lineTo(halfW, 0);
  shape.lineTo(0, pointingDown ? length : -length);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });

  geom.rotateX(Math.PI / 2);
  return geom;
}

/**
 * Board Geometry Constants shared with Gdx3DEngine for exact 3D Checker & Dice positioning
 */
export const BOARD_METRICS = {
  halfWidth: 5.36,
  fullDepth: 7.72,
  frameHeight: 0.62,
  floorThickness: 0.14,
  outerBorder: 0.36,
  barWidth: 0.38,
  trayWidth: 0.56,
  dividerWidth: 0.12,
  gap: 0.015,
  checkerRadius: 0.315,
  checkerHeight: 0.15,
  dieSize: 0.42,
};

/**
 * Computes the exact 3D world (X, Y, Z) position on the open board for any Backgammon point (1..24),
 * central bar ('bar-light' | 'bar-dark'), or right bear-off tray ('off-light' | 'off-dark').
 *
 * Standard Backgammon Point Numbering:
 * - Points 1..6:   Bottom-Right quadrant (from right outer edge toward center bar)
 * - Points 7..12:  Bottom-Left quadrant  (from center bar toward left outer edge)
 * - Points 13..18: Top-Left quadrant     (from left outer edge toward center bar)
 * - Points 19..24: Top-Right quadrant    (from center bar toward right outer edge)
 */
export function getStandardPoint3DPosition(
  location: number | 'bar-light' | 'bar-dark' | 'off-light' | 'off-dark',
  stackIndex: number
): { x: number; y: number; z: number } {
  const {
    halfWidth,
    fullDepth,
    floorThickness,
    outerBorder,
    barWidth,
    trayWidth,
    dividerWidth,
    gap,
    checkerRadius,
    checkerHeight,
  } = BOARD_METRICS;

  const playFieldWidth =
    halfWidth - barWidth - outerBorder - trayWidth - dividerWidth;
  const playFieldDepth = fullDepth - outerBorder * 2;
  const pointSpacing = playFieldWidth / 6;

  const leftHalfLeftMostX = -(gap + barWidth + playFieldWidth);
  const rightHalfLeftMostX = gap + barWidth;

  const topZBase = -(playFieldDepth / 2);
  const bottomZBase = playFieldDepth / 2;
  const baseSurfaceY = floorThickness + 0.036;

  // Bar positions
  if (location === 'bar-light' || location === 'bar-dark') {
    const isLight = location === 'bar-light';
    const zSign = isLight ? -1 : 1;
    const zPos = zSign * (0.65 + (stackIndex % 4) * (checkerRadius * 1.9));
    const yLayer = Math.floor(stackIndex / 4);
    return {
      x: 0,
      y: BOARD_METRICS.frameHeight + 0.02 + yLayer * checkerHeight,
      z: zPos,
    };
  }

  // Bear-off tray positions (Right outer tray)
  if (location === 'off-light' || location === 'off-dark') {
    const isLight = location === 'off-light';
    const trayCenterX =
      gap + barWidth + playFieldWidth + dividerWidth + trayWidth / 2;
    const startZ = isLight ? -(playFieldDepth / 2 - 0.35) : playFieldDepth / 2 - 0.35;
    const dirZ = isLight ? 1 : -1;
    return {
      x: trayCenterX,
      y: baseSurfaceY + (stackIndex % 2) * 0.02,
      z: startZ + dirZ * stackIndex * 0.21,
    };
  }

  // Points 1..24
  const pt = Math.max(1, Math.min(24, location));
  let isTopRow = false;
  let px = 0;

  if (pt >= 1 && pt <= 6) {
    // Bottom-Right: pt 1 is col 5 (rightmost), pt 6 is col 0 (nearest bar)
    isTopRow = false;
    const col = 6 - pt; // 5..0
    px = rightHalfLeftMostX + (col + 0.5) * pointSpacing;
  } else if (pt >= 7 && pt <= 12) {
    // Bottom-Left: pt 7 is col 5 (nearest bar), pt 12 is col 0 (leftmost)
    isTopRow = false;
    const col = 12 - pt; // 5..0
    px = leftHalfLeftMostX + (col + 0.5) * pointSpacing;
  } else if (pt >= 13 && pt <= 18) {
    // Top-Left: pt 13 is col 0 (leftmost), pt 18 is col 5 (nearest bar)
    isTopRow = true;
    const col = pt - 13; // 0..5
    px = leftHalfLeftMostX + (col + 0.5) * pointSpacing;
  } else {
    // Top-Right (19..24): pt 19 is col 0 (nearest bar), pt 24 is col 5 (rightmost)
    isTopRow = true;
    const col = pt - 19; // 0..5
    px = rightHalfLeftMostX + (col + 0.5) * pointSpacing;
  }

  // Stack up to 5 checkers neatly along the triangle; if > 5, stack a second tier slightly elevated
  const maxPerLayer = 5;
  const layer = Math.floor(stackIndex / maxPerLayer);
  const idxInLayer = stackIndex % maxPerLayer;
  const spacingZ = checkerRadius * 1.98;
  const startZ = isTopRow
    ? topZBase + checkerRadius + 0.08
    : bottomZBase - checkerRadius - 0.08;
  const dirZ = isTopRow ? 1 : -1;

  const cz =
    startZ +
    dirZ * (idxInLayer * spacingZ + (layer > 0 ? spacingZ * 0.35 : 0));
  const cy = baseSurfaceY + layer * (checkerHeight * 0.95);

  return { x: px, y: cy, z: cz };
}

export interface BuiltBackgammonGLB {
  glbBuffer: ArrayBuffer;
  glbUrl: string;
  gltf: GLTF;
}

/**
 * Standard Backgammon Starting Setup (30 Checkers total: 15 Light, 15 Dark)
 * Light (Player 1 - moves 24 -> 1):
 *   2 on Pt 24, 5 on Pt 13, 3 on Pt 8, 5 on Pt 6
 * Dark (Player 2 - moves 1 -> 24):
 *   2 on Pt 1, 5 on Pt 12, 3 on Pt 17, 5 on Pt 19
 */
export const STANDARD_STARTING_CHECKERS: {
  id: number;
  isLight: boolean;
  point: number;
  stackIndex: number;
}[] = (() => {
  const list: {
    id: number;
    isLight: boolean;
    point: number;
    stackIndex: number;
  }[] = [];
  let idCounter = 0;

  const addStack = (point: number, count: number, isLight: boolean) => {
    for (let s = 0; s < count; s++) {
      list.push({
        id: idCounter++,
        isLight,
        point,
        stackIndex: s,
      });
    }
  };

  // Player 1 (Light / Gold-Ivory): 15 checkers
  addStack(24, 2, true);
  addStack(13, 5, true);
  addStack(8, 3, true);
  addStack(6, 5, true);

  // Player 2 (Dark / Silver-Ebony): 15 checkers
  addStack(1, 2, false);
  addStack(12, 5, false);
  addStack(17, 3, false);
  addStack(19, 5, false);

  return list;
})();

/**
 * Builds the complete Royal Backgammon 3D Scene (with 30 Standard Checkers sampled from user photos
 * and Pair of 3D Dice on the Right Side), exports it to binary .glb, and parses via GLTFLoader.
 */
export async function buildAndLoadRoyalBackgammonGLB(): Promise<BuiltBackgammonGLB> {
  const rootScene = new THREE.Scene();
  rootScene.name = 'RoyalBackgammonGLBScene';

  const boardRoot = new THREE.Group();
  boardRoot.name = 'RoyalBackgammonBoard';
  rootScene.add(boardRoot);

  // Load procedural & photo-sampled textures
  const walnutTex = createWalnutWoodTexture(1.0);
  const darkWalnutPointTex = createWalnutWoodTexture(0.68);
  const ivoryPointTex = createIvoryPointTexture();
  const emeraldFeltTex = createEmeraldFeltTexture();
  const crownPlaqueTex = createCrownBrassPlaqueTexture();
  const closedBoardEmblemTex = await loadClosedBoardEmblemTexture();

  // Sampled Lion & Sun Checker Textures from user's uploaded photos
  const lightCheckerTopTex = await createSampledCheckerTopTexture(
    true,
    'gold-silver'
  );
  const darkCheckerTopTex = await createSampledCheckerTopTexture(
    false,
    'gold-silver'
  );

  const walnutFrameMat = new THREE.MeshStandardMaterial({
    name: 'WalnutCabinetMaterial',
    map: walnutTex,
    roughness: 0.4,
    metalness: 0.08,
  });

  const darkWalnutRecessMat = new THREE.MeshStandardMaterial({
    name: 'WalnutTrayMaterial',
    map: darkWalnutPointTex,
    roughness: 0.5,
    metalness: 0.05,
  });

  const pointWalnutMat = new THREE.MeshStandardMaterial({
    name: 'InlaidWalnutPointMaterial',
    map: darkWalnutPointTex,
    roughness: 0.42,
    metalness: 0.06,
  });

  const pointIvoryMat = new THREE.MeshStandardMaterial({
    name: 'InlaidIvoryPointMaterial',
    map: ivoryPointTex,
    roughness: 0.36,
    metalness: 0.04,
  });

  const emeraldFeltMat = new THREE.MeshStandardMaterial({
    name: 'EmeraldBaizeFeltMaterial',
    map: emeraldFeltTex,
    roughness: 0.88,
    metalness: 0.02,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    name: 'AntiqueBrassHardwareMaterial',
    color: new THREE.Color('#c8a25a'),
    roughness: 0.26,
    metalness: 0.86,
  });

  const crownPlaqueMat = new THREE.MeshStandardMaterial({
    name: 'RoyalCrownPlaqueMaterial',
    map: crownPlaqueTex,
    roughness: 0.28,
    metalness: 0.78,
  });

  const closedBoardEmblemMat = new THREE.MeshStandardMaterial({
    name: 'ClosedBoardLionSunEmblemMaterial',
    map: closedBoardEmblemTex,
    roughness: 0.34,
    metalness: 0.22,
  });

  const {
    halfWidth,
    fullDepth,
    frameHeight,
    floorThickness,
    outerBorder,
    barWidth,
    trayWidth,
    dividerWidth,
    gap,
    checkerRadius,
    checkerHeight,
    dieSize,
  } = BOARD_METRICS;

  function buildHalfCabinet(
    side: 'left' | 'right',
    parentGroup: THREE.Group,
    yOffset = 0
  ) {
    const isLeft = side === 'left';
    const sign = isLeft ? -1 : 1;
    const halfCenterX = sign * (gap + halfWidth / 2);

    // 1. Solid Walnut Base Floor
    const baseGeom = new THREE.BoxGeometry(halfWidth, floorThickness, fullDepth);
    const baseMesh = new THREE.Mesh(baseGeom, walnutFrameMat);
    baseMesh.position.set(halfCenterX, floorThickness / 2 + yOffset, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    parentGroup.add(baseMesh);

    // Exterior Lion & Sun back cover on Left Half (visible when folded closed)
    if (isLeft) {
      const lidTrimGeom = new THREE.BoxGeometry(
        halfWidth - 0.34,
        0.018,
        fullDepth - 0.34
      );
      const lidTrimMesh = new THREE.Mesh(lidTrimGeom, brassMat);
      lidTrimMesh.position.set(halfCenterX, -0.009 + yOffset, 0);
      parentGroup.add(lidTrimMesh);

      const emblemPlaneGeom = new THREE.PlaneGeometry(
        halfWidth - 0.46,
        fullDepth - 0.46
      );
      emblemPlaneGeom.rotateZ(Math.PI);
      emblemPlaneGeom.rotateX(Math.PI / 2);

      const emblemMesh = new THREE.Mesh(emblemPlaneGeom, closedBoardEmblemMat);
      emblemMesh.name = 'ClosedTopLionSunEmblem';
      emblemMesh.position.set(halfCenterX, -0.021 + yOffset, 0);
      emblemMesh.castShadow = false;
      emblemMesh.receiveShadow = true;
      parentGroup.add(emblemMesh);
    }

    // 2. Emerald Green Felt Playing Surface
    const playFieldWidth =
      halfWidth - barWidth - outerBorder - trayWidth - dividerWidth;
    const playFieldDepth = fullDepth - outerBorder * 2;
    const playFieldStartX = isLeft
      ? -(gap + barWidth + playFieldWidth / 2)
      : gap + barWidth + playFieldWidth / 2;

    const feltGeom = new THREE.BoxGeometry(playFieldWidth, 0.02, playFieldDepth);
    const feltMesh = new THREE.Mesh(feltGeom, emeraldFeltMat);
    feltMesh.name = isLeft ? 'LeftFeltSurface' : 'RightFeltSurface';
    feltMesh.position.set(playFieldStartX, floorThickness + 0.01 + yOffset, 0);
    feltMesh.receiveShadow = true;
    parentGroup.add(feltMesh);

    // 3. Top and Bottom Outer Frame Rails
    const railGeom = new THREE.BoxGeometry(halfWidth, frameHeight, outerBorder);
    const topRail = new THREE.Mesh(railGeom, walnutFrameMat);
    topRail.position.set(
      halfCenterX,
      frameHeight / 2 + yOffset,
      -(fullDepth / 2 - outerBorder / 2)
    );
    topRail.castShadow = true;
    topRail.receiveShadow = true;
    parentGroup.add(topRail);

    const bottomRail = new THREE.Mesh(railGeom, walnutFrameMat);
    bottomRail.position.set(
      halfCenterX,
      frameHeight / 2 + yOffset,
      fullDepth / 2 - outerBorder / 2
    );
    bottomRail.castShadow = true;
    bottomRail.receiveShadow = true;
    parentGroup.add(bottomRail);

    // 4. Inner Central Spine Bar Rail
    const barGeom = new THREE.BoxGeometry(
      barWidth,
      frameHeight,
      fullDepth - outerBorder * 2
    );
    const barRail = new THREE.Mesh(barGeom, walnutFrameMat);
    barRail.position.set(
      sign * (gap + barWidth / 2),
      frameHeight / 2 + yOffset,
      0
    );
    barRail.castShadow = true;
    barRail.receiveShadow = true;
    parentGroup.add(barRail);

    // 5. Outer Edge Frame Rail
    const outerRailGeom = new THREE.BoxGeometry(
      outerBorder,
      frameHeight,
      fullDepth - outerBorder * 2
    );
    const outerRail = new THREE.Mesh(outerRailGeom, walnutFrameMat);
    outerRail.position.set(
      sign * (gap + halfWidth - outerBorder / 2),
      frameHeight / 2 + yOffset,
      0
    );
    outerRail.castShadow = true;
    outerRail.receiveShadow = true;
    parentGroup.add(outerRail);

    // 6. Divider Wall between Playing Field and Bear-off Tray
    const dividerWallGeom = new THREE.BoxGeometry(
      dividerWidth,
      frameHeight * 0.92,
      fullDepth - outerBorder * 2
    );
    const dividerWall = new THREE.Mesh(dividerWallGeom, walnutFrameMat);
    const dividerX = sign * (gap + barWidth + playFieldWidth + dividerWidth / 2);
    dividerWall.position.set(dividerX, (frameHeight * 0.92) / 2 + yOffset, 0);
    dividerWall.castShadow = true;
    dividerWall.receiveShadow = true;
    parentGroup.add(dividerWall);

    // 7. Bear-Off Tray Floor & Middle Bridge Divider
    const trayCenterX =
      sign * (gap + barWidth + playFieldWidth + dividerWidth + trayWidth / 2);
    const trayFloorGeom = new THREE.BoxGeometry(
      trayWidth,
      0.025,
      playFieldDepth
    );
    const trayFloor = new THREE.Mesh(trayFloorGeom, darkWalnutRecessMat);
    trayFloor.position.set(trayCenterX, floorThickness + 0.012 + yOffset, 0);
    trayFloor.receiveShadow = true;
    parentGroup.add(trayFloor);

    const trayBridgeGeom = new THREE.BoxGeometry(
      trayWidth,
      frameHeight * 0.88,
      0.24
    );
    const trayBridge = new THREE.Mesh(trayBridgeGeom, walnutFrameMat);
    trayBridge.position.set(trayCenterX, (frameHeight * 0.88) / 2 + yOffset, 0);
    trayBridge.castShadow = true;
    trayBridge.receiveShadow = true;
    parentGroup.add(trayBridge);

    // 8. 12 Inlaid Triangular Points (6 Top pointing down, 6 Bottom pointing up)
    const numPoints = 6;
    const pointSpacing = playFieldWidth / numPoints;
    const pointBaseW = pointSpacing * 0.89;
    const pointLength = playFieldDepth * 0.435;
    const pointThick = 0.016;

    const leftMostEdgeX = isLeft
      ? -(gap + barWidth + playFieldWidth)
      : gap + barWidth;

    const topZBase = -(playFieldDepth / 2);
    const bottomZBase = playFieldDepth / 2;
    const pointY = floorThickness + 0.02 + yOffset;

    const topPointDownGeom = createTrianglePointGeometry(
      pointBaseW,
      pointLength,
      pointThick,
      true
    );
    const bottomPointUpGeom = createTrianglePointGeometry(
      pointBaseW,
      pointLength,
      pointThick,
      false
    );

    const numPlaqueGeom = new THREE.PlaneGeometry(0.28, 0.18);
    numPlaqueGeom.rotateX(-Math.PI / 2);
    const topRailZ = -(fullDepth / 2 - outerBorder / 2);
    const bottomRailZ = fullDepth / 2 - outerBorder / 2;
    const railTopY = frameHeight + 0.003 + yOffset;

    for (let i = 0; i < 6; i++) {
      const px = leftMostEdgeX + (i + 0.5) * pointSpacing;

      const topMat = i % 2 === 0 ? pointIvoryMat : pointWalnutMat;
      const topPointMesh = new THREE.Mesh(topPointDownGeom, topMat);
      topPointMesh.position.set(px, pointY, topZBase);
      topPointMesh.receiveShadow = true;
      parentGroup.add(topPointMesh);

      const bottomMat = i % 2 === 0 ? pointWalnutMat : pointIvoryMat;
      const bottomPointMesh = new THREE.Mesh(bottomPointUpGeom, bottomMat);
      bottomPointMesh.position.set(px, pointY, bottomZBase);
      bottomPointMesh.receiveShadow = true;
      parentGroup.add(bottomPointMesh);

      // Engraved Brass Point Numbers (1..24) inlaid on the Top & Bottom Walnut Frame Rails
      const topPointNum = isLeft ? 13 + i : 19 + i;
      const bottomPointNum = isLeft ? 12 - i : 6 - i;

      const topNumMat = new THREE.MeshStandardMaterial({
        map: createPointNumberPlaqueTexture(topPointNum),
        roughness: 0.3,
        metalness: 0.72,
      });
      const topNumMesh = new THREE.Mesh(numPlaqueGeom, topNumMat);
      topNumMesh.name = `PointLabel_${topPointNum}`;
      topNumMesh.position.set(px, railTopY, topRailZ);
      parentGroup.add(topNumMesh);

      const bottomNumMat = new THREE.MeshStandardMaterial({
        map: createPointNumberPlaqueTexture(bottomPointNum),
        roughness: 0.3,
        metalness: 0.72,
      });
      const bottomNumMesh = new THREE.Mesh(numPlaqueGeom, bottomNumMat);
      bottomNumMesh.name = `PointLabel_${bottomPointNum}`;
      bottomNumMesh.position.set(px, railTopY, bottomRailZ);
      parentGroup.add(bottomNumMesh);
    }
  }

  // Right Half Group (Static on table, anchored at y = 0)
  const rightHalfGroup = new THREE.Group();
  rightHalfGroup.name = 'RightLeafCase';
  boardRoot.add(rightHalfGroup);
  buildHalfCabinet('right', rightHalfGroup, 0);

  // Left Half Pivot Group (Positioned at the central hinge axis: x = 0, y = frameHeight, z = 0)
  const leftLeafPivot = new THREE.Group();
  leftLeafPivot.name = 'LeftLeafPivot';
  leftLeafPivot.position.set(0, frameHeight, 0);
  boardRoot.add(leftLeafPivot);
  buildHalfCabinet('left', leftLeafPivot, -frameHeight);

  // 9. Central Brass Hinges & Royal Crown Brass Clasp Plaque on the Spine
  const hingeGroup = new THREE.Group();
  hingeGroup.name = 'CentralSpineHardware';
  boardRoot.add(hingeGroup);

  const hingeCylGeom = new THREE.CylinderGeometry(0.068, 0.068, 0.62, 24);
  hingeCylGeom.rotateX(Math.PI / 2);

  for (const hz of [-2.18, 2.18]) {
    const hingeMesh = new THREE.Mesh(hingeCylGeom, brassMat);
    hingeMesh.position.set(0, frameHeight + 0.01, hz);
    hingeMesh.castShadow = true;
    hingeGroup.add(hingeMesh);

    for (const rOffset of [-0.18, 0, 0.18]) {
      const ringGeom = new THREE.CylinderGeometry(0.076, 0.076, 0.03, 24);
      ringGeom.rotateX(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeom, brassMat);
      ringMesh.position.set(0, frameHeight + 0.01, hz + rOffset);
      hingeGroup.add(ringMesh);
    }
  }

  const claspGroup = new THREE.Group();
  claspGroup.name = 'CenterClaspPlaque';
  claspGroup.position.set(0, frameHeight + 0.018, 0);
  boardRoot.add(claspGroup);

  const plaqueGeom = new THREE.BoxGeometry(0.66, 0.032, 0.72);
  const plaqueMesh = new THREE.Mesh(plaqueGeom, crownPlaqueMat);
  plaqueMesh.castShadow = true;
  claspGroup.add(plaqueMesh);

  // 10. 30 Sculpted 3D Checkers in Standard Backgammon Arrangement (Sampled from Uploaded Photos)
  const lightSideMat = new THREE.MeshStandardMaterial({
    name: 'LightCheckerSideMaterial',
    color: new THREE.Color('#d4b26f'),
    roughness: 0.24,
    metalness: 0.78,
  });
  const lightTopMat = new THREE.MeshStandardMaterial({
    name: 'LightCheckerTopMaterial',
    map: lightCheckerTopTex,
    roughness: 0.28,
    metalness: 0.55,
  });

  const darkSideMat = new THREE.MeshStandardMaterial({
    name: 'DarkCheckerSideMaterial',
    color: new THREE.Color('#6e7680'),
    roughness: 0.26,
    metalness: 0.75,
  });
  const darkTopMat = new THREE.MeshStandardMaterial({
    name: 'DarkCheckerTopMaterial',
    map: darkCheckerTopTex,
    roughness: 0.3,
    metalness: 0.52,
  });

  // CylinderGeometry has 3 material groups: [0: side, 1: top cap, 2: bottom cap]
  const checkerCylGeom = new THREE.CylinderGeometry(
    checkerRadius,
    checkerRadius * 1.02,
    checkerHeight,
    36,
    1,
    false
  );
  checkerCylGeom.translate(0, checkerHeight / 2, 0);

  for (const item of STANDARD_STARTING_CHECKERS) {
    const mats = item.isLight
      ? [lightSideMat, lightTopMat, lightSideMat]
      : [darkSideMat, darkTopMat, darkSideMat];
    const checkerMesh = new THREE.Mesh(checkerCylGeom, mats);
    checkerMesh.name = `Checker_${item.id}`;
    checkerMesh.castShadow = true;
    checkerMesh.receiveShadow = true;

    const pos = getStandardPoint3DPosition(item.point, item.stackIndex);

    // Attach checkers on points 7..18 to LeftLeafPivot so when the board folds/unfolds on Home,
    // left-side checkers fold naturally with the left cabinet leaf!
    if (item.point >= 7 && item.point <= 18) {
      checkerMesh.position.set(pos.x, pos.y - frameHeight, pos.z);
      leftLeafPivot.add(checkerMesh);
    } else {
      checkerMesh.position.set(pos.x, pos.y, pos.z);
      rightHalfGroup.add(checkerMesh);
    }
  }

  // 11. Pair of 3D Dice on the Right Side (سمت راست تخته)
  // Material order for BoxGeometry: [+X (4), -X (3), +Y (6), -Y (1), +Z (2), -Z (5)]
  const buildDieMaterials = () => [
    new THREE.MeshStandardMaterial({ map: createDieFaceTexture(4), roughness: 0.22 }), // +X
    new THREE.MeshStandardMaterial({ map: createDieFaceTexture(3), roughness: 0.22 }), // -X
    new THREE.MeshStandardMaterial({ map: createDieFaceTexture(6), roughness: 0.22 }), // +Y (Top)
    new THREE.MeshStandardMaterial({ map: createDieFaceTexture(1), roughness: 0.22 }), // -Y (Bottom)
    new THREE.MeshStandardMaterial({ map: createDieFaceTexture(2), roughness: 0.22 }), // +Z (Front)
    new THREE.MeshStandardMaterial({ map: createDieFaceTexture(5), roughness: 0.22 }), // -Z (Back)
  ];

  const dieGeom = new THREE.BoxGeometry(dieSize, dieSize, dieSize);

  const die1 = new THREE.Mesh(dieGeom, buildDieMaterials());
  die1.name = 'Dice1';
  die1.position.set(2.15, floorThickness + 0.025 + dieSize / 2, -0.18);
  die1.rotation.y = 0.28;
  die1.castShadow = true;
  die1.receiveShadow = true;
  rightHalfGroup.add(die1);

  const die2 = new THREE.Mesh(dieGeom, buildDieMaterials());
  die2.name = 'Dice2';
  die2.position.set(2.98, floorThickness + 0.025 + dieSize / 2, 0.22);
  die2.rotation.y = -0.36;
  die2.castShadow = true;
  die2.receiveShadow = true;
  rightHalfGroup.add(die2);

  // 12. Sculpted 3D Doubling Cube (2, 4, 8, 16, 32, 64) on the Central Bar Rail
  // Material order for BoxGeometry: [+X: 4, -X: 8, +Y: 64, -Y: 2, +Z: 16, -Z: 32]
  const cubeSize = dieSize * 1.16;
  const cubeGeom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cubeMaterials = [
    new THREE.MeshStandardMaterial({
      map: createDoublingCubeFaceTexture(4),
      roughness: 0.22,
      metalness: 0.55,
    }), // +X
    new THREE.MeshStandardMaterial({
      map: createDoublingCubeFaceTexture(8),
      roughness: 0.22,
      metalness: 0.55,
    }), // -X
    new THREE.MeshStandardMaterial({
      map: createDoublingCubeFaceTexture(64),
      roughness: 0.22,
      metalness: 0.55,
    }), // +Y (Top default when undoubled = 64)
    new THREE.MeshStandardMaterial({
      map: createDoublingCubeFaceTexture(2),
      roughness: 0.22,
      metalness: 0.55,
    }), // -Y (Bottom = 2)
    new THREE.MeshStandardMaterial({
      map: createDoublingCubeFaceTexture(16),
      roughness: 0.22,
      metalness: 0.55,
    }), // +Z (Front = 16)
    new THREE.MeshStandardMaterial({
      map: createDoublingCubeFaceTexture(32),
      roughness: 0.22,
      metalness: 0.55,
    }), // -Z (Back = 32)
  ];

  const doublingCube = new THREE.Mesh(cubeGeom, cubeMaterials);
  doublingCube.name = 'DoublingCube';
  doublingCube.position.set(0.22, frameHeight + cubeSize / 2 + 0.01, -1.25);
  doublingCube.castShadow = true;
  doublingCube.receiveShadow = true;
  rightHalfGroup.add(doublingCube);

  // Export the scene to a real GLB binary buffer (model/gltf-binary)
  const exporter = new GLTFExporter();
  const glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      rootScene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(
            new Error(
              'Expected binary GLB ArrayBuffer output from GLTFExporter'
            )
          );
        }
      },
      (err) => reject(err),
      { binary: true }
    );
  });

  const blob = new Blob([glbBuffer], { type: 'model/gltf-binary' });
  const glbUrl = URL.createObjectURL(blob);

  const loader = new GLTFLoader();
  const gltf = await new Promise<GLTF>((resolve, reject) => {
    loader.parse(
      glbBuffer,
      '',
      (parsedGltf) => resolve(parsedGltf),
      (err) => reject(err)
    );
  });

  gltf.scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  return {
    glbBuffer,
    glbUrl,
    gltf,
  };
}
