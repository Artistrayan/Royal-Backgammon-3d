import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import boardClosedExactImg from '../assets/images/board_closed_exact_matching_lid_1792324316682.jpg';
import boardOpenExactImg from '../assets/images/board_open_exact_walnut_lion_sun_1792324299531.jpg';

interface ThreeDLoginBoardProps {
  isOpening: boolean;
}

export function ThreeDLoginBoard({ isOpening }: ThreeDLoginBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isOpeningRef = useRef(isOpening);
  isOpeningRef.current = isOpening;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    // Angled from below to make the top lean forward towards the user
    camera.position.set(0, 2.0, 6.0);
    camera.lookAt(0, 0.5, 0);

    // 2. WebGL Renderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
    } catch (e) {
      console.warn('WebGL init notice:', e);
      return;
    }

    // 3. Studio Lighting (Royal Warm Gold + Ambient Palace Glow)
    const ambientLight = new THREE.AmbientLight(0xfffae6, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5dd, 2.6);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-5, 4, 3);
    scene.add(fillLight);

    const spotLight = new THREE.SpotLight(0xffd700, 3.6, 14, Math.PI / 3.5, 0.4);
    spotLight.position.set(0, 6, 4);
    scene.add(spotLight);

    // 4. Circular 3D Dais underneath
    const daisGroup = new THREE.Group();
    const daisGeo = new THREE.CylinderGeometry(3.6, 3.9, 0.35, 64);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x180f08,
      metalness: 0.85,
      roughness: 0.35,
    });
    const daisMesh = new THREE.Mesh(daisGeo, daisMat);
    daisMesh.position.set(0, -1.8, 0);
    daisGroup.add(daisMesh);

    // Glowing golden rim on dais
    const rimGeo = new THREE.TorusGeometry(3.65, 0.045, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xd4af37,
      emissiveIntensity: 0.65,
      metalness: 0.95,
      roughness: 0.15,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, -1.62, 0);
    daisGroup.add(rimMesh);

    scene.add(daisGroup);

    // 5. Backgammon Board Geometry & Textures
    const textureLoader = new THREE.TextureLoader();

    const closedTex = textureLoader.load(boardClosedExactImg);
    closedTex.colorSpace = THREE.SRGBColorSpace;

    const openTex = textureLoader.load(boardOpenExactImg);
    openTex.colorSpace = THREE.SRGBColorSpace;

    // Dimensions: Portrait vertical when closed!
    const BOARD_HALF_W = 2.3;
    const BOARD_H = 3.4;
    const BOARD_THICKNESS = 0.32;

    const boardRootGroup = new THREE.Group();
    boardRootGroup.position.set(0, -0.15, 0);

    // Shared Walnut & Gold Materials
    const walnutSideMat = new THREE.MeshStandardMaterial({
      color: 0x3d220d,
      metalness: 0.4,
      roughness: 0.4,
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.92,
      roughness: 0.2,
      emissive: 0x7a5203,
      emissiveIntensity: 0.2,
    });

    // --- BASE TRAY (Stationary Right Half when opened) ---
    // Materials: [Right, Left, Top, Bottom, Front (Interior), Back (Bottom)]
    const baseTrayMat = [
      walnutSideMat, // Right
      walnutSideMat, // Left (Center Hinge line)
      walnutSideMat, // Top
      walnutSideMat, // Bottom
      new THREE.MeshStandardMaterial({
        map: openTex, // Right half of open board
        metalness: 0.3,
        roughness: 0.28,
      }),
      walnutSideMat, // Back exterior
    ];

    const baseTrayGeo = new THREE.BoxGeometry(BOARD_HALF_W, BOARD_H, BOARD_THICKNESS);
    const baseTrayMesh = new THREE.Mesh(baseTrayGeo, baseTrayMat);
    // Positioned with its left edge along the center spine (x = 0)
    baseTrayMesh.position.set(BOARD_HALF_W / 2, 0, -BOARD_THICKNESS / 2);
    boardRootGroup.add(baseTrayMesh);

    // --- SWINGING LID (Opens 180° from right to left across center hinge) ---
    // Pivot is located at the center spine (x = 0)
    const lidPivotGroup = new THREE.Group();
    lidPivotGroup.position.set(0, 0, BOARD_THICKNESS / 2);

    const lidMat = [
      walnutSideMat, // Right
      walnutSideMat, // Left
      walnutSideMat, // Top
      walnutSideMat, // Bottom
      new THREE.MeshStandardMaterial({
        map: closedTex, // Top exterior face (Lion & Sun embossed walnut)
        metalness: 0.4,
        roughness: 0.25,
      }),
      new THREE.MeshStandardMaterial({
        map: openTex, // Inside lid (Left half of open board when flipped 180°)
        metalness: 0.3,
        roughness: 0.28,
      }),
    ];

    const lidGeo = new THREE.BoxGeometry(BOARD_HALF_W, BOARD_H, BOARD_THICKNESS);
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    // When closed, the lid sits on the right half directly over the base tray
    lidMesh.position.set(BOARD_HALF_W / 2, 0, 0);
    lidPivotGroup.add(lidMesh);

    // Add 3 Brass Hinges on the center spine (left edge of the lid)
    for (let i = -1; i <= 1; i++) {
      const hingeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 16);
      const hingeMesh = new THREE.Mesh(hingeGeo, goldTrimMat);
      hingeMesh.position.set(0, i * 1.1, 0);
      boardRootGroup.add(hingeMesh);
    }

    // Add 2 Brass Latches on the right opening edge
    const latchesGroup = new THREE.Group();
    for (let i = -0.5; i <= 0.5; i += 1) {
      const latchGeo = new THREE.BoxGeometry(0.12, 0.28, 0.08);
      const latchMesh = new THREE.Mesh(latchGeo, goldTrimMat);
      latchMesh.position.set(BOARD_HALF_W + 0.04, i * 1.5, 0);
      latchesGroup.add(latchMesh);
    }
    lidMesh.add(latchesGroup);

    boardRootGroup.add(lidPivotGroup);
    scene.add(boardRootGroup);

    // 6. Mouse / Touch Pointer Parallax Tilt
    const tilt = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      tilt.x = ((e.clientY - centerY) / centerY) * -0.15;
      tilt.y = ((e.clientX - centerX) / centerX) * 0.2;
    };
    window.addEventListener('pointermove', onPointerMove);

    // 7. Animation Loop with Smooth Right-to-Left Unfolding
    let lidAngle = 0; // 0 = closed, -Math.PI = fully open to the left

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Target angle for lid: when isOpening is true, rotate 180 degrees to the left!
      const targetAngle = isOpeningRef.current ? -Math.PI : 0;
      lidAngle += (targetAngle - lidAngle) * 0.065;
      lidPivotGroup.rotation.y = lidAngle;

      // Parallax rotation of the entire board
      // When opening, board centers itself smoothly so the 2 open halves are balanced
      const targetCenterX = isOpeningRef.current ? 0 : -BOARD_HALF_W / 2;
      boardRootGroup.position.x += (targetCenterX - boardRootGroup.position.x) * 0.07;

      boardRootGroup.rotation.x = 0.28 + tilt.x; // Tilted slightly towards camera
      boardRootGroup.rotation.y = tilt.y;

      // Light intensity pulse
      spotLight.intensity = 3.6 + Math.sin(performance.now() * 0.003) * 0.4;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative z-20 w-full flex-1 max-w-[620px] max-h-[380px] flex items-center justify-center overflow-visible select-none pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
