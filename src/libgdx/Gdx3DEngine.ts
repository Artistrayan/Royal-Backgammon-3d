import * as THREE from 'three';
import {
  buildAndLoadRoyalBackgammonGLB,
  BuiltBackgammonGLB,
  BOARD_METRICS,
  STANDARD_STARTING_CHECKERS,
  getStandardPoint3DPosition,
  createSampledCheckerTopTexture,
  createDieFaceTexture,
} from './BackgammonGLBBuilder';

export type BoardLocation =
  | number // 1..24
  | 'bar-light'
  | 'bar-dark'
  | 'off-light'
  | 'off-dark';

export interface CheckerState3D {
  id: number;
  isLight: boolean;
  location: BoardLocation;
  stackIndex: number;
}

/**
 * Synthesizes luxury physical sound effects (brass clasp click, walnut wood unfolding,
 * ivory dice rolling, and checker placement) using Web Audio API.
 */
class RoyalSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playBoardOpenSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1180, now);
    clickOsc.frequency.exponentialRampToValueAtTime(340, now + 0.065);
    clickGain.gain.setValueAtTime(0.14, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.075);

    const thudTime = now + 1.15;
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(115, thudTime);
    thudOsc.frequency.exponentialRampToValueAtTime(38, thudTime + 0.22);
    thudGain.gain.setValueAtTime(0.22, thudTime);
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.24);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(thudTime);
    thudOsc.stop(thudTime + 0.25);
  }

  public playDiceRollSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const offset of [0.02, 0.14, 0.26, 0.39, 0.51]) {
      const t = now + offset;
      const dOsc = ctx.createOscillator();
      const dGain = ctx.createGain();
      dOsc.type = 'triangle';
      dOsc.frequency.setValueAtTime(840 + Math.random() * 420, t);
      dOsc.frequency.exponentialRampToValueAtTime(240, t + 0.045);
      dGain.gain.setValueAtTime(0.09, t);
      dGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      dOsc.connect(dGain);
      dGain.connect(ctx.destination);
      dOsc.start(t);
      dOsc.stop(t + 0.055);
    }
  }

  public playCheckerMoveSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.065);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playCheckerHitSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Crisp brass-rimmed checker strike + low walnut resonance
    const strikeOsc = ctx.createOscillator();
    const strikeGain = ctx.createGain();
    strikeOsc.type = 'triangle';
    strikeOsc.frequency.setValueAtTime(680, now);
    strikeOsc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
    strikeGain.gain.setValueAtTime(0.24, now);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    strikeOsc.connect(strikeGain);
    strikeGain.connect(ctx.destination);
    strikeOsc.start(now);
    strikeOsc.stop(now + 0.1);

    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(1120, now + 0.015);
    ringOsc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
    ringGain.gain.setValueAtTime(0.12, now + 0.015);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    ringOsc.connect(ringGain);
    ringGain.connect(ctx.destination);
    ringOsc.start(now + 0.015);
    ringOsc.stop(now + 0.155);
  }

  public playDoublingCubeSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const [offset, freq] of [
      [0, 440],
      [0.09, 660],
      [0.18, 880],
    ] as const) {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.11);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.125);
    }
  }

  public playVictoryFanfareSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playTypeTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720 + Math.random() * 180, now);
    gain.gain.setValueAtTime(0.016, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.02);
  }

  public playOptionClickSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }
}

export const royalSound = new RoyalSoundEngine();

/**
 * libGDX Environment Equivalent: Manages physically-based parlor lighting
 */
export class GdxEnvironment {
  public ambientLight: THREE.AmbientLight;
  public warmKeyLight: THREE.SpotLight;
  public brassRimLight: THREE.DirectionalLight;
  public emeraldFillLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.ambientLight = new THREE.AmbientLight('#fff4dc', 0.92);
    scene.add(this.ambientLight);

    this.warmKeyLight = new THREE.SpotLight(
      '#ffdf9e',
      78,
      45,
      Math.PI / 2.8,
      0.55,
      1.35
    );
    this.warmKeyLight.position.set(2.2, 14.8, 6.2);
    this.warmKeyLight.castShadow = true;
    this.warmKeyLight.shadow.mapSize.width = 2048;
    this.warmKeyLight.shadow.mapSize.height = 2048;
    this.warmKeyLight.shadow.camera.near = 4;
    this.warmKeyLight.shadow.camera.far = 28;
    this.warmKeyLight.shadow.bias = -0.0004;
    scene.add(this.warmKeyLight);

    this.brassRimLight = new THREE.DirectionalLight('#ffdca0', 1.85);
    this.brassRimLight.position.set(-7, 9, -6);
    scene.add(this.brassRimLight);

    this.emeraldFillLight = new THREE.PointLight('#2d8a61', 3.5, 22);
    this.emeraldFillLight.position.set(-4, 4.5, 6);
    scene.add(this.emeraldFillLight);
  }
}

/**
 * libGDX ModelInstance Equivalent: Wraps the parsed .glb scene graph,
 * including the LeftLeafPivot hinge, 30 Standard Checkers, Right-Side Pair of 3D Dice, and 3D Doubling Cube.
 */
export class GdxModelInstance {
  public readonly root: THREE.Group;
  public readonly boardNode: THREE.Object3D | undefined;
  public readonly leftLeafPivot: THREE.Object3D | undefined;
  public readonly rightLeafNode: THREE.Object3D | undefined;
  public readonly centerClaspPlaque: THREE.Object3D | undefined;
  public readonly die1: THREE.Object3D | undefined;
  public readonly die2: THREE.Object3D | undefined;
  public readonly doublingCube: THREE.Object3D | undefined;
  public readonly checkerNodes = new Map<number, THREE.Object3D>();
  public readonly interactiveMeshes: THREE.Mesh[] = [];
  private checkersReparentedToBoard = false;

  constructor(gltfScene: THREE.Group) {
    this.root = gltfScene;
    this.boardNode = this.root.getObjectByName('RoyalBackgammonBoard');
    this.leftLeafPivot =
      this.root.getObjectByName('LeftLeafPivot') ||
      this.root.getObjectByName('LeftLeafHingePivot');
    this.rightLeafNode =
      this.root.getObjectByName('RightLeafCase') ||
      this.root.getObjectByName('RightLeafFixed');
    this.centerClaspPlaque = this.root.getObjectByName('CenterClaspPlaque');
    this.die1 =
      this.root.getObjectByName('Dice1') ||
      this.root.getObjectByName('RightSide3DDie_1');
    this.die2 =
      this.root.getObjectByName('Dice2') ||
      this.root.getObjectByName('RightSide3DDie_2');
    this.doublingCube = this.root.getObjectByName('DoublingCube');

    for (let id = 0; id < 30; id++) {
      const node = this.root.getObjectByName(`Checker_${id}`);
      if (node) {
        this.checkerNodes.set(id, node);
      }
    }

    this.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Only add interactive elements, exclude the board itself to improve click precision
        if (
          mesh.name.startsWith('Checker_') ||
          mesh.name.includes('Dice') ||
          mesh.name.includes('Die') ||
          mesh.name === 'DoublingCube'
        ) {
          this.interactiveMeshes.push(mesh);
        }
      }
    });
  }

  /**
   * Once the board is open, ensures all 30 checkers live directly inside `boardNode`
   * so any checker can move smoothly between the left and right halves of the board.
   */
  public ensureCheckersInBoardSpace() {
    if (this.checkersReparentedToBoard || !this.boardNode) return;
    this.checkersReparentedToBoard = true;

    this.checkerNodes.forEach((node, id) => {
      if (node.parent !== this.boardNode) {
        this.boardNode!.add(node);
      }
      const std = STANDARD_STARTING_CHECKERS.find((c) => c.id === id);
      if (std) {
        const pos = getStandardPoint3DPosition(std.point, std.stackIndex);
        node.position.set(pos.x, pos.y, pos.z);
        node.rotation.set(0, 0, 0);
      }
    });
  }
}

/**
 * Exact 3D Euler rotations so a given die value (1..6) faces straight up (+Y)
 * according to the box face order in BackgammonGLBBuilder:
 * [+X: 4, -X: 3, +Y: 6, -Y: 1, +Z: 2, -Z: 5]
 */
function getDieTargetEulerForTopValue(
  value: number,
  yawOffset: number
): { rx: number; ry: number; rz: number } {
  switch (value) {
    case 6:
      return { rx: 0, ry: yawOffset, rz: 0 };
    case 1:
      return { rx: Math.PI, ry: yawOffset, rz: 0 };
    case 4:
      return { rx: 0, ry: yawOffset, rz: Math.PI / 2 };
    case 3:
      return { rx: 0, ry: yawOffset, rz: -Math.PI / 2 };
    case 2:
      return { rx: -Math.PI / 2, ry: yawOffset, rz: 0 };
    case 5:
      return { rx: Math.PI / 2, ry: yawOffset, rz: 0 };
    default:
      return { rx: 0, ry: yawOffset, rz: 0 };
  }
}

/**
 * Exact 3D Euler rotations so a Doubling Cube value (2, 4, 8, 16, 32, 64) faces straight up (+Y)
 * according to the box face order in BackgammonGLBBuilder:
 * [+X: 4, -X: 8, +Y: 64, -Y: 2, +Z: 16, -Z: 32]
 */
function getDoublingCubeTargetEuler(
  cubeValue: number
): { rx: number; ry: number; rz: number } {
  switch (cubeValue) {
    case 64:
    case 1:
      return { rx: 0, ry: 0, rz: 0 };
    case 2:
      return { rx: Math.PI, ry: 0, rz: 0 };
    case 4:
      return { rx: 0, ry: 0, rz: Math.PI / 2 };
    case 8:
      return { rx: 0, ry: 0, rz: -Math.PI / 2 };
    case 16:
      return { rx: -Math.PI / 2, ry: 0, rz: 0 };
    case 32:
      return { rx: Math.PI / 2, ry: 0, rz: 0 };
    default:
      return { rx: 0, ry: 0, rz: 0 };
  }
}

interface ActiveCheckerAnimation {
  checkerId: number;
  mesh: THREE.Object3D;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  arcHeight: number;
  isCaptureHit: boolean;
  elapsed: number;
  duration: number;
}

/**
 * libGDX AnimationController Equivalent:
 * - Unfolds the board from closed (0) to open (1) via LeftLeafPivot
 * - Animates the pair of 3D dice rolling on the right side of the board
 * - Animates 3D checkers hopping in a realistic 3D parabolic arc with banking & hit sound
 * - Animates the 3D Doubling Cube rotating & moving to the owner's rail
 */
export class GdxAnimationController {
  public openProgress = 0; // 0 = Closed, 1 = Open
  public targetProgress = 0;
  public isAnimating = false;
  private readonly durationSeconds = 1.45;

  // 3D Dice roll state (Right Side of Board)
  private diceAnimation: {
    elapsed: number;
    duration: number;
    val1: number;
    val2: number;
    targetRot1: { rx: number; ry: number; rz: number };
    targetRot2: { rx: number; ry: number; rz: number };
  } | null = null;

  // 3D Doubling Cube animation state
  private cubeAnimation: {
    elapsed: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    targetRot: { rx: number; ry: number; rz: number };
  } | null = null;

  // 3D Checker move animations
  private checkerAnimations: ActiveCheckerAnimation[] = [];

  constructor(
    private readonly instance: GdxModelInstance,
    private readonly onOpenComplete: () => void
  ) {
    this.applyPose(0);
  }

  public triggerOpen() {
    if (this.targetProgress === 1) return;
    this.targetProgress = 1;
    this.isAnimating = true;
    royalSound.playBoardOpenSound();
    setTimeout(() => {
      royalSound.playDiceRollSound();
    }, 950);
  }

  public rollDice(val1: number, val2: number) {
    royalSound.playDiceRollSound();
    this.diceAnimation = {
      elapsed: 0,
      duration: 0.58,
      val1,
      val2,
      targetRot1: getDieTargetEulerForTopValue(
        val1,
        (Math.random() - 0.5) * 0.45
      ),
      targetRot2: getDieTargetEulerForTopValue(
        val2,
        (Math.random() - 0.5) * 0.45
      ),
    };
  }

  public animateDoublingCubeTo(
    cubeValue: number,
    owner: 'center' | 'light' | 'dark'
  ) {
    const cube = this.instance.doublingCube;
    if (!cube) return;

    const cubeSize = BOARD_METRICS.dieSize * 1.16;
    const baseY = BOARD_METRICS.frameHeight + cubeSize / 2 + 0.01;
    const targetZ =
      owner === 'light' ? 1.55 : owner === 'dark' ? -1.55 : -1.25;
    const targetX = 0.22;

    this.cubeAnimation = {
      elapsed: 0,
      duration: 0.48,
      startPos: cube.position.clone(),
      endPos: new THREE.Vector3(targetX, baseY, targetZ),
      targetRot: getDoublingCubeTargetEuler(cubeValue),
    };
  }

  public animateCheckerTo(
    checkerId: number,
    targetPos: { x: number; y: number; z: number },
    isCaptureHit = false
  ) {
    this.instance.ensureCheckersInBoardSpace();
    const mesh = this.instance.checkerNodes.get(checkerId);
    if (!mesh) return;

    this.checkerAnimations = this.checkerAnimations.filter(
      (a) => a.checkerId !== checkerId
    );

    const startPos = mesh.position.clone();
    const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    const dist = startPos.distanceTo(endPos);
    const arcHeight = Math.min(1.22, Math.max(0.45, dist * 0.13));

    this.checkerAnimations.push({
      checkerId,
      mesh,
      startPos,
      endPos,
      arcHeight,
      isCaptureHit,
      elapsed: 0,
      duration: Math.min(0.25, Math.max(0.15, 0.12 + dist * 0.01)),
    });
  }

  public snapAllCheckers(states: CheckerState3D[]) {
    this.instance.ensureCheckersInBoardSpace();
    this.checkerAnimations = [];
    for (const st of states) {
      const mesh = this.instance.checkerNodes.get(st.id);
      if (mesh) {
        const pos = getStandardPoint3DPosition(st.location, st.stackIndex);
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.rotation.set(0, 0, 0);
      }
    }
  }

  public update(deltaSec: number) {
    // 1. Board Unfolding Animation
    if (this.isAnimating) {
      const step = deltaSec / this.durationSeconds;
      if (this.openProgress < this.targetProgress) {
        this.openProgress = Math.min(
          this.targetProgress,
          this.openProgress + step
        );
      }

      const t = this.openProgress;
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.applyPose(eased);

      if (Math.abs(this.openProgress - this.targetProgress) < 0.0001) {
        this.openProgress = this.targetProgress;
        this.isAnimating = false;
        this.applyPose(1);
        this.instance.ensureCheckersInBoardSpace();
        this.onOpenComplete();
      }
    } else {
      this.applyPose(this.openProgress);
      if (this.openProgress >= 0.999) {
        this.instance.ensureCheckersInBoardSpace();
      }
    }

    // 2. 3D Dice Roll Animation on the Right Side
    if (this.diceAnimation && this.instance.die1 && this.instance.die2) {
      this.diceAnimation.elapsed += deltaSec;
      const t = Math.min(
        1,
        this.diceAnimation.elapsed / this.diceAnimation.duration
      );
      const easeOut = 1 - Math.pow(1 - t, 3);
      const bounceY = Math.sin(t * Math.PI * 2) * (1 - t) * 0.85;
      const baseY =
        BOARD_METRICS.floorThickness + 0.025 + BOARD_METRICS.dieSize / 2;

      const d1 = this.instance.die1;
      const d2 = this.instance.die2;

      // Keep the pair of 3D dice clearly on the right half playing field
      d1.position.set(
        2.15 + Math.sin(t * Math.PI) * 0.25,
        baseY + Math.max(0, bounceY),
        -0.18 + (1 - easeOut) * 0.35
      );
      d2.position.set(
        2.98 - Math.sin(t * Math.PI) * 0.22,
        baseY + Math.max(0, bounceY * 0.85),
        0.22 - (1 - easeOut) * 0.35
      );

      const extraSpins = (1 - easeOut) * Math.PI * 4;
      d1.rotation.set(
        this.diceAnimation.targetRot1.rx + extraSpins,
        this.diceAnimation.targetRot1.ry + extraSpins * 0.7,
        this.diceAnimation.targetRot1.rz
      );
      d2.rotation.set(
        this.diceAnimation.targetRot2.rx - extraSpins,
        this.diceAnimation.targetRot2.ry - extraSpins * 0.8,
        this.diceAnimation.targetRot2.rz
      );

      if (t >= 1) {
        d1.position.set(2.15, baseY, -0.18);
        d2.position.set(2.98, baseY, 0.22);
        d1.rotation.set(
          this.diceAnimation.targetRot1.rx,
          this.diceAnimation.targetRot1.ry,
          this.diceAnimation.targetRot1.rz
        );
        d2.rotation.set(
          this.diceAnimation.targetRot2.rx,
          this.diceAnimation.targetRot2.ry,
          this.diceAnimation.targetRot2.rz
        );
        this.diceAnimation = null;
      }
    }

    // 3. 3D Doubling Cube Animation
    if (this.cubeAnimation && this.instance.doublingCube) {
      this.cubeAnimation.elapsed += deltaSec;
      const t = Math.min(
        1,
        this.cubeAnimation.elapsed / this.cubeAnimation.duration
      );
      const easeOut = 1 - Math.pow(1 - t, 3);
      const cube = this.instance.doublingCube;
      cube.position.lerpVectors(
        this.cubeAnimation.startPos,
        this.cubeAnimation.endPos,
        easeOut
      );
      cube.position.y += Math.sin(t * Math.PI) * 0.65;

      const spin = (1 - easeOut) * Math.PI * 2;
      cube.rotation.set(
        this.cubeAnimation.targetRot.rx + spin,
        this.cubeAnimation.targetRot.ry + spin * 0.5,
        this.cubeAnimation.targetRot.rz
      );

      if (t >= 1) {
        cube.position.copy(this.cubeAnimation.endPos);
        cube.rotation.set(
          this.cubeAnimation.targetRot.rx,
          this.cubeAnimation.targetRot.ry,
          this.cubeAnimation.targetRot.rz
        );
        this.cubeAnimation = null;
      }
    }

    // 4. 3D Checker Parabolic Arc Hop Animations with Flight Banking
    if (this.checkerAnimations.length > 0) {
      const remaining: ActiveCheckerAnimation[] = [];
      for (const anim of this.checkerAnimations) {
        anim.elapsed += deltaSec;
        const t = Math.min(1, anim.elapsed / anim.duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, eased);
        anim.mesh.position.y += Math.sin(t * Math.PI) * anim.arcHeight;

        // Subtle aerodynamic banking tilt along the jump trajectory
        const bankFactor = Math.sin(t * Math.PI) * 0.18;
        const dx = anim.endPos.x - anim.startPos.x;
        const dz = anim.endPos.z - anim.startPos.z;
        anim.mesh.rotation.set(
          Math.sign(dz) * bankFactor,
          0,
          -Math.sign(dx) * bankFactor
        );

        if (t < 1) {
          remaining.push(anim);
        } else {
          anim.mesh.position.copy(anim.endPos);
          anim.mesh.rotation.set(0, 0, 0);
          if (anim.isCaptureHit) {
            royalSound.playCheckerHitSound();
          } else {
            royalSound.playCheckerMoveSound();
          }
        }
      }
      this.checkerAnimations = remaining;
    }
  }

  public applyPose(t: number) {
    // 1. Left Leaf Hinge Rotation: folds -180 deg (-PI) when closed (t=0) and 0 deg when open (t=1)
    if (this.instance.leftLeafPivot) {
      this.instance.leftLeafPivot.rotation.z = -Math.PI * (1 - t);
    }

    // 2. Fixed, Centered Board Pose: shifts by -halfWidth/2 (-2.68) when folded closed so case is centered
    if (this.instance.boardNode) {
      this.instance.boardNode.position.x = -2.68 * (1 - t);
      this.instance.boardNode.position.z = 0;
      this.instance.boardNode.rotation.set(0, 0.05 * (1 - t), 0);
    }

    // 3. Central Brass Clasp Plaque:
    if (this.instance.centerClaspPlaque) {
      const claspScale = Math.max(0.001, (t - 0.55) / 0.45);
      this.instance.centerClaspPlaque.scale.set(claspScale, 1, claspScale);
      this.instance.centerClaspPlaque.visible = t > 0.55;
    }
  }
}

export type BoardZoomLevel = 'xl' | 'max';

/**
 * Main libGDX 3D Engine Runtime (Fixed Board, Extra-Large Full-Stage 3D View, Interactive Checkers, Right-Side 3D Dice & 3D Doubling Cube)
 */
export class Gdx3DEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private environment: GdxEnvironment;
  private boardStageGroup = new THREE.Group();
  private modelInstance: GdxModelInstance | null = null;
  private animController: GdxAnimationController | null = null;
  private builtGlb: BuiltBackgammonGLB | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private rafId: number | null = null;
  private isHovered = false;
  private isGameStage = false;
  private zoomLevel: BoardZoomLevel = 'xl';
  private disposed = false;

  // 3D Highlight Rings for Selected Checker, Valid Destination Points & Right-Side 3D Dice Roll Zone
  private highlightGroup = new THREE.Group();
  private selectedRingMesh: THREE.Mesh;
  private targetRingMeshes: THREE.Group[] = [];
  private hitTargetLocMap = new Map<THREE.Object3D, BoardLocation>();
  private diceTouchZoneMesh: THREE.Mesh;
  private diceReadyRingMesh: THREE.Mesh;
  private isDiceReadyToRoll = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: {
      onBoardReady: (glbUrl: string, byteSize: number) => void;
      onBoardTouchStartOpen: () => void;
      onBoardFullyOpened: () => void;
      onBoardHoverChange: (hovered: boolean) => void;
      onCheckerClicked: (checkerId: number) => void;
      onLocationClicked: (loc: BoardLocation) => void;
      onDiceClicked: () => void;
      onDoublingCubeClicked?: () => void;
    }
  ) {
    // Mobile GPU Tier Detection: scale down shadows, pixel ratio, and antialiasing on budget mobile devices
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const memory = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 4 : 4;
    const isLowEndDevice = isMobile && (cores <= 4 || memory <= 2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isLowEndDevice,
      alpha: true,
      powerPreference: isLowEndDevice ? 'default' : 'high-performance',
      precision: isLowEndDevice ? 'mediump' : 'highp',
    });
    this.renderer.setPixelRatio(
      isLowEndDevice
        ? Math.min(window.devicePixelRatio || 1, 1.25)
        : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !isLowEndDevice;
    if (!isLowEndDevice) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const dom = this.renderer.domElement;
    dom.style.display = 'block';
    dom.style.width = '100%';
    dom.style.height = '100%';
    dom.style.touchAction = 'none'; // Eliminate 300ms mobile tap latency
    container.appendChild(dom);

    this.scene = new THREE.Scene();
    this.scene.add(this.boardStageGroup);

    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 0.5, 100);
    this.updateCameraFraming(aspect);

    this.environment = new GdxEnvironment(this.scene);

    const shadowPlaneGeom = new THREE.PlaneGeometry(34, 24);
    shadowPlaneGeom.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.ShadowMaterial({
      opacity: 0.58,
      color: '#020805',
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    // Build 3D Selection & Valid Destination Rings inside boardStageGroup
    this.selectedRingMesh = this.createHighlightRing('#f7e09e', 0.37);
    this.selectedRingMesh.visible = false;
    this.highlightGroup.add(this.selectedRingMesh);

    // Right-Side 3D Dice Touch Pad & Golden Roll Ring (centered on the pair of 3D dice at x=2.56, z=0.02)
    const dicePadGeom = new THREE.CylinderGeometry(1.1, 1.1, 0.6, 24);
    const dicePadMat = new THREE.MeshBasicMaterial({
      color: '#f5dca8',
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    this.diceTouchZoneMesh = new THREE.Mesh(dicePadGeom, dicePadMat);
    this.diceTouchZoneMesh.position.set(
      2.56,
      BOARD_METRICS.floorThickness + 0.25,
      0.02
    );
    this.diceTouchZoneMesh.name = 'RightSideDiceTouchPad';
    this.highlightGroup.add(this.diceTouchZoneMesh);

    this.diceReadyRingMesh = this.createHighlightRing('#f7d788', 0.92);
    this.diceReadyRingMesh.position.set(
      2.56,
      BOARD_METRICS.floorThickness + 0.032,
      0.02
    );
    this.diceReadyRingMesh.visible = false;
    this.highlightGroup.add(this.diceReadyRingMesh);

    this.boardStageGroup.add(this.highlightGroup);

    this.initGLBModel();
    this.bindEvents();
    this.startRenderLoop();
  }

  private createHighlightRing(colorHex: string, radius: number): THREE.Mesh {
    const geom = new THREE.RingGeometry(radius * 0.78, radius * 1.08, 32);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    return new THREE.Mesh(geom, mat);
  }

  public setDiceReadyToRoll(ready: boolean) {
    this.isDiceReadyToRoll = ready;
    this.diceReadyRingMesh.visible = ready;
  }

  /**
   * Computes the normalized 2D screen percentage (0..100) of the Right-Side 3D Dice pair
   * so the interactive "ROLL" badge sits directly on the 3D dice.
   */
  public getDiceScreenPosition(): { xPercent: number; yPercent: number } {
    const worldPos = new THREE.Vector3(
      2.56,
      BOARD_METRICS.floorThickness + 0.38,
      0.02
    );
    this.boardStageGroup.localToWorld(worldPos);
    worldPos.project(this.camera);

    const xPercent = ((worldPos.x + 1) / 2) * 100;
    const yPercent = ((-worldPos.y + 1) / 2) * 100;
    return {
      xPercent: Math.max(55, Math.min(90, xPercent)),
      yPercent: Math.max(25, Math.min(75, yPercent)),
    };
  }

  public setGameStageMode(isGame: boolean) {
    this.isGameStage = isGame;
    this.forceResize();
  }

  public setBoardZoomLevel(level: BoardZoomLevel) {
    this.zoomLevel = level;
    this.forceResize();
  }

  public forceResize() {
    this.handleResize();
  }

  private updateCameraFraming(aspect: number) {
    const isPortrait = aspect < 1.0;
    if (this.isGameStage) {
      const isMax = this.zoomLevel === 'max';
      this.boardStageGroup.scale.set(1.0, 1.0, 1.0);

      // Safe framing dimensions covering the full 3D board, border, bear-off trays and dice
      const targetBoardWidthUnits = isPortrait ? 13.8 : (isMax ? 12.2 : 13.4);
      const targetBoardHeightUnits = isPortrait ? 10.4 : (isMax ? 8.6 : 9.6);

      const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const hFovRad =
        2 * Math.atan(Math.tan(vFovRad / 2) * Math.max(0.35, aspect));
      const distByWidth = targetBoardWidthUnits / 2 / Math.tan(hFovRad / 2);
      const distByHeight = targetBoardHeightUnits / 2 / Math.tan(vFovRad / 2);

      const requiredDist = Math.max(distByWidth, distByHeight);
      // Balanced camera pitch angle (54 degrees) so both near & far checkers and points are completely visible:
      const pitchAngle = isPortrait ? 1.02 : 0.94;
      const camY = Math.sin(pitchAngle) * requiredDist;
      const camZ = Math.cos(pitchAngle) * requiredDist;

      this.camera.position.set(0, camY, camZ);
      this.camera.lookAt(0, 0, 0); // Symmetrically centered
      this.camera.updateProjectionMatrix();
    } else {
      this.boardStageGroup.scale.set(1.0, 1.0, 1.0);

      const targetBoardWidthUnits = isPortrait ? 13.5 : 12.6;
      const targetBoardHeightUnits = isPortrait ? 10.2 : 9.2;

      const vFovRad = THREE.MathUtils.degToRad(this.camera.fov);
      const hFovRad =
        2 * Math.atan(Math.tan(vFovRad / 2) * Math.max(0.35, aspect));
      const distByWidth = targetBoardWidthUnits / 2 / Math.tan(hFovRad / 2);
      const distByHeight = targetBoardHeightUnits / 2 / Math.tan(vFovRad / 2);

      const requiredDist = Math.max(distByWidth, distByHeight);
      const pitchAngle = isPortrait ? 0.96 : 0.90;
      const camY = Math.sin(pitchAngle) * requiredDist;
      const camZ = Math.cos(pitchAngle) * requiredDist;

      this.camera.position.set(0, camY, camZ);
      this.camera.lookAt(0, 0, 0); // Symmetrically centered
      this.camera.updateProjectionMatrix();
    }
  }

  private async initGLBModel() {
    try {
      const built = await buildAndLoadRoyalBackgammonGLB();
      if (this.disposed) return;
      this.builtGlb = built;

      this.modelInstance = new GdxModelInstance(built.gltf.scene);
      this.boardStageGroup.add(this.modelInstance.root);

      this.animController = new GdxAnimationController(
        this.modelInstance,
        () => {
          this.callbacks.onBoardFullyOpened();
        }
      );

      this.callbacks.onBoardReady(built.glbUrl, built.glbBuffer.byteLength);
    } catch (err) {
      console.error('Failed to build/load GLB model:', err);
    }
  }

  public openBoard() {
    if (!this.animController) return;
    if (this.animController.targetProgress === 0) {
      this.callbacks.onBoardTouchStartOpen();
      this.animController.triggerOpen();
    }
  }

  public roll3DDice(val1: number, val2: number) {
    if (!this.animController) return;
    this.animController.rollDice(val1, val2);
  }

  public setDoublingCubeState(
    cubeValue: number,
    owner: 'center' | 'light' | 'dark'
  ) {
    if (!this.animController) return;
    royalSound.playDoublingCubeSound();
    this.animController.animateDoublingCubeTo(cubeValue, owner);
  }

  public animateCheckerMove(
    checkerId: number,
    toLocation: BoardLocation,
    toStackIndex: number,
    isCaptureHit = false
  ) {
    if (!this.animController) return;
    const pos = getStandardPoint3DPosition(toLocation, toStackIndex);
    this.animController.animateCheckerTo(checkerId, pos, isCaptureHit);
  }

  public syncAllCheckers(states: CheckerState3D[]) {
    if (!this.animController) return;
    this.animController.snapAllCheckers(states);
  }

  /**
   * Highlights the selected checker and creates clickable 3D target disks on valid destination points.
   * Single-die destinations are highlighted in Emerald (#52f29c); Combined multi-die destinations in Gold (#f7d774).
   */
  public setHighlights(
    selectedCheckerPos: { x: number; y: number; z: number } | null,
    validTargets: {
      location: BoardLocation;
      stackIndex: number;
      isCombinedMove?: boolean;
    }[]
  ) {
    if (selectedCheckerPos) {
      this.selectedRingMesh.position.set(
        selectedCheckerPos.x,
        selectedCheckerPos.y + BOARD_METRICS.checkerHeight + 0.015,
        selectedCheckerPos.z
      );
      this.selectedRingMesh.visible = true;
    } else {
      this.selectedRingMesh.visible = false;
    }

    for (const group of this.targetRingMeshes) {
      this.highlightGroup.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    }
    this.targetRingMeshes = [];
    this.hitTargetLocMap.clear();

    for (const target of validTargets) {
      const pos = getStandardPoint3DPosition(
        target.location,
        target.stackIndex
      );

      const hitGroup = new THREE.Group();
      hitGroup.position.set(pos.x, pos.y + 0.02, pos.z);

      const colorHex = target.isCombinedMove ? '#f7d774' : '#52f29c';
      const ring = this.createHighlightRing(colorHex, 0.34);
      hitGroup.add(ring);

      const hitCylGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
      const hitCylMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: target.isCombinedMove ? 0.24 : 0.18,
      });
      const hitCyl = new THREE.Mesh(hitCylGeom, hitCylMat);
      hitCyl.position.y = 0.1;
      hitGroup.add(hitCyl);

      this.hitTargetLocMap.set(hitCyl, target.location);
      this.hitTargetLocMap.set(ring, target.location);

      this.highlightGroup.add(hitGroup);
      this.targetRingMeshes.push(hitGroup);
    }
  }

  /**
   * Live-updates the 3D Checker & 3D Dice materials when the user equips different items in the Store!
   */
  public async applyEquippedCosmetics(
    checkerSetId: string,
    diceSetId: string
  ) {
    if (!this.modelInstance) return;

    const isIvorySet = checkerSetId.includes('ivory');
    const isCrownSet = checkerSetId.includes('crown');
    const checkerStyle: 'gold-silver' | 'ivory-ebony' | 'crown-crest' =
      isIvorySet
        ? 'ivory-ebony'
        : isCrownSet
        ? 'crown-crest'
        : 'gold-silver';
    const lightTopTex = await createSampledCheckerTopTexture(
      true,
      checkerStyle
    );
    const darkTopTex = await createSampledCheckerTopTexture(
      false,
      checkerStyle
    );

    const lightRimColor = isIvorySet ? '#e8dcc4' : '#d6af57';
    const darkRimColor = isIvorySet ? '#1c1815' : '#8b949e';

    this.modelInstance.checkerNodes.forEach((node, id) => {
      const std = STANDARD_STARTING_CHECKERS.find((c) => c.id === id);
      if (!std) return;
      const mesh = node as THREE.Mesh;
      if (Array.isArray(mesh.material) && mesh.material.length >= 2) {
        const sideMat = mesh.material[0] as THREE.MeshStandardMaterial;
        const topMat = mesh.material[1] as THREE.MeshStandardMaterial;
        sideMat.color.set(std.isLight ? lightRimColor : darkRimColor);
        sideMat.metalness = isIvorySet ? 0.25 : 0.78;
        sideMat.roughness = isIvorySet ? 0.22 : 0.25;
        topMat.map = std.isLight ? lightTopTex : darkTopTex;
        topMat.needsUpdate = true;
        sideMat.needsUpdate = true;
      }
    });

    // Update 3D Dice style on Right Side (matching [+X: 4, -X: 3, +Y: 6, -Y: 1, +Z: 2, -Z: 5])
    const isObsidianDice = diceSetId.includes('obsidian');
    const isBrassDice = diceSetId.includes('brass');
    const diceStyle: 'bone-ivory' | 'obsidian-night' | 'antique-brass' =
      isObsidianDice
        ? 'obsidian-night'
        : isBrassDice
        ? 'antique-brass'
        : 'bone-ivory';

    const faceOrder = [4, 3, 6, 1, 2, 5];
    const newDiceMaterials = faceOrder.map(
      (pips) =>
        new THREE.MeshStandardMaterial({
          map: createDieFaceTexture(pips, diceStyle),
          roughness: isBrassDice ? 0.24 : 0.16,
          metalness: isBrassDice ? 0.75 : 0.08,
        })
    );

    for (const dieNode of [this.modelInstance.die1, this.modelInstance.die2]) {
      if (dieNode && (dieNode as THREE.Mesh).isMesh) {
        (dieNode as THREE.Mesh).material = newDiceMaterials;
      }
    }
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleTapOrClick = (clientX: number, clientY: number) => {
      if (!this.modelInstance || !this.animController) return;
      updatePointer(clientX, clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);

      // 1. If board is closed, clicking anywhere on the board unfolds it (only in game mode)
      if (this.isGameStage && this.animController.openProgress < 0.95) {
        const hits = this.raycaster.intersectObjects(
          this.modelInstance.interactiveMeshes,
          false
        );
        if (hits.length > 0) {
          this.openBoard();
        }
        return;
      }

      // 2. Check if user clicked a valid destination highlight target
      if (this.targetRingMeshes.length > 0) {
        const targetHits = this.raycaster.intersectObjects(
          this.targetRingMeshes,
          true
        );
        if (targetHits.length > 0) {
          let obj: THREE.Object3D | null = targetHits[0].object;
          while (obj) {
            const loc = this.hitTargetLocMap.get(obj);
            if (loc !== undefined) {
              this.callbacks.onLocationClicked(loc);
              return;
            }
            obj = obj.parent;
          }
        }
      }

      // 3. Check if user tapped the Right-Side 3D Dice Touch Zone
      const diceZoneHits = this.raycaster.intersectObject(
        this.diceTouchZoneMesh,
        false
      );
      if (diceZoneHits.length > 0) {
        this.callbacks.onDiceClicked();
        return;
      }

      // 4. Check if user clicked the Pair of 3D Dice, 3D Doubling Cube, or a 3D Checker
      const hits = this.raycaster.intersectObjects(
        this.modelInstance.interactiveMeshes,
        false
      );
      if (hits.length > 0) {
        for (const hit of hits) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr) {
            if (curr.name === 'DoublingCube') {
              this.callbacks.onDoublingCubeClicked?.();
              return;
            }
            if (
              curr.name === 'Dice1' ||
              curr.name === 'Dice2' ||
              curr.name === 'RightSide3DDie_1' ||
              curr.name === 'RightSide3DDie_2' ||
              curr.name === 'RightSideDiceGroup'
            ) {
              this.callbacks.onDiceClicked();
              return;
            }
            if (curr.name && curr.name.startsWith('Checker_')) {
              const id = parseInt(curr.name.replace('Checker_', ''), 10);
              if (!Number.isNaN(id)) {
                this.callbacks.onCheckerClicked(id);
                return;
              }
            }
            curr = curr.parent;
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.modelInstance) return;
      updatePointer(e.clientX, e.clientY);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(
        this.modelInstance.interactiveMeshes,
        false
      );
      const nowHovered = hits.length > 0;
      if (nowHovered !== this.isHovered) {
        this.isHovered = nowHovered;
        this.callbacks.onBoardHoverChange(nowHovered);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      handleTapOrClick(e.clientX, e.clientY);
    };

    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (!this.container || this.disposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.updateCameraFraming(aspect);
    this.renderer.setSize(w, h);
  };

  private startRenderLoop() {
    let pulseClock = 0;
    const render = () => {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(render);
      const delta = Math.min(this.clock.getDelta(), 0.1);
      pulseClock += delta * 4.2;

      if (this.animController) {
        this.animController.update(delta);
        this.highlightGroup.visible = this.animController.openProgress >= 0.96;
      }

      if (this.diceReadyRingMesh.visible) {
        const s = 1 + Math.sin(pulseClock) * 0.08;
        this.diceReadyRingMesh.scale.set(s, s, s);
        const mat = this.diceReadyRingMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.55 + Math.sin(pulseClock) * 0.35;
      }

      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  public dispose() {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('resize', this.handleResize);

    // Deep scene resource disposal to eliminate WebGL memory leaks
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => {
            if ((mat as any).map) (mat as any).map.dispose();
            mat.dispose();
          });
        } else if (obj.material) {
          if ((obj.material as any).map) (obj.material as any).map.dispose();
          obj.material.dispose();
        }
      }
    });

    for (const group of this.targetRingMeshes) {
      this.highlightGroup.remove(group);
    }
    this.targetRingMeshes = [];

    if (this.builtGlb) {
      URL.revokeObjectURL(this.builtGlb.glbUrl);
    }

    const dom = this.renderer.domElement;
    if (dom && dom.parentElement) {
      dom.parentElement.removeChild(dom);
    }
    this.renderer.dispose();
  }
}
