import fs from 'fs';
import path from 'path';

/**
 * Generates a spec-compliant GLTF 2.0 Binary (.glb) file at public/royal_backgammon.glb
 * representing the Royal Backgammon 3D board node hierarchy and meshes for libGDX GLBLoader.
 */
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create simple cube geometry buffer (positions + normals + indices) for binary GLB chunk
const positions = new Float32Array([
  // Left & Right cabinet bounding box vertices
  -5.36, 0.0, -3.86,   5.36, 0.0, -3.86,   5.36, 0.62, -3.86,  -5.36, 0.62, -3.86,
  -5.36, 0.0,  3.86,   5.36, 0.0,  3.86,   5.36, 0.62,  3.86,  -5.36, 0.62,  3.86,
]);

const indices = new Uint16Array([
  0, 1, 2, 2, 3, 0,
  4, 5, 6, 6, 7, 4,
  0, 4, 7, 7, 3, 0,
  1, 5, 6, 6, 2, 1,
  3, 2, 6, 6, 7, 3,
  0, 1, 5, 5, 4, 0,
]);

const posBytes = Buffer.from(positions.buffer);
const idxBytes = Buffer.from(indices.buffer);
const binBuffer = Buffer.concat([posBytes, idxBytes]);

const gltfJson = {
  asset: {
    version: '2.0',
    generator: 'libGDX RoyalBackgammon GLB Exporter',
  },
  scene: 0,
  scenes: [
    {
      name: 'RoyalBackgammonGLBScene',
      nodes: [0],
    },
  ],
  nodes: [
    {
      name: 'RoyalBackgammonBoard',
      children: [1, 2, 3, 4, 5],
    },
    {
      name: 'RightLeafCase',
      mesh: 0,
      translation: [2.68, 0, 0],
    },
    {
      name: 'LeftLeafPivot',
      mesh: 0,
      translation: [0, 0.62, 0],
      rotation: [0, 0, -1, 0], // Closed 180 deg initially
    },
    {
      name: 'CenterClaspPlaque',
      translation: [0, 0.638, 0],
    },
    {
      name: 'Dice1',
      translation: [1.88, 0.35, -0.22],
    },
    {
      name: 'Dice2',
      translation: [2.58, 0.35, -0.26],
    },
  ],
  materials: [
    {
      name: 'WalnutFrameMaterial',
      pbrMetallicRoughness: {
        baseColorFactor: [0.26, 0.16, 0.10, 1.0],
        metallicFactor: 0.06,
        roughnessFactor: 0.42,
      },
    },
    {
      name: 'EmeraldFeltMaterial',
      pbrMetallicRoughness: {
        baseColorFactor: [0.08, 0.18, 0.13, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.88,
      },
    },
    {
      name: 'BrushedBrassMaterial',
      pbrMetallicRoughness: {
        baseColorFactor: [0.81, 0.66, 0.39, 1.0],
        metallicFactor: 0.86,
        roughnessFactor: 0.26,
      },
    },
  ],
  meshes: [
    {
      name: 'BackgammonCabinetMesh',
      primitives: [
        {
          attributes: { POSITION: 0 },
          indices: 1,
          material: 0,
        },
      ],
    },
  ],
  buffers: [
    {
      byteLength: binBuffer.byteLength,
    },
  ],
  bufferViews: [
    {
      buffer: 0,
      byteOffset: 0,
      byteLength: posBytes.byteLength,
      target: 34962,
    },
    {
      buffer: 0,
      byteOffset: posBytes.byteLength,
      byteLength: idxBytes.byteLength,
      target: 34963,
    },
  ],
  accessors: [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126,
      count: 8,
      type: 'VEC3',
      max: [5.36, 0.62, 3.86],
      min: [-5.36, 0.0, -3.86],
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5123,
      count: indices.length,
      type: 'SCALAR',
    },
  ],
};

let jsonStr = JSON.stringify(gltfJson);
while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) {
  jsonStr += ' ';
}
const jsonChunkData = Buffer.from(jsonStr, 'utf8');

let binPadding = (4 - (binBuffer.byteLength % 4)) % 4;
const binChunkData =
  binPadding > 0 ? Buffer.concat([binBuffer, Buffer.alloc(binPadding, 0)]) : binBuffer;

const totalLength = 12 + 8 + jsonChunkData.byteLength + 8 + binChunkData.byteLength;
const glbHeader = Buffer.alloc(12);
glbHeader.writeUInt32LE(0x46546c67, 0); // 'glTF' magic
glbHeader.writeUInt32LE(2, 4); // version 2
glbHeader.writeUInt32LE(totalLength, 8);

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonChunkData.byteLength, 0);
jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(binChunkData.byteLength, 0);
binChunkHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

const finalGlb = Buffer.concat([
  glbHeader,
  jsonChunkHeader,
  jsonChunkData,
  binChunkHeader,
  binChunkData,
]);

fs.writeFileSync(path.join(publicDir, 'royal_backgammon.glb'), finalGlb);
console.log('Generated public/royal_backgammon.glb (' + finalGlb.byteLength + ' bytes)');
