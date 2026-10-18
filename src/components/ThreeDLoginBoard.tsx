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

    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 2.0, 6.0);
    camera.lookAt(0, 0.5, 0);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xfffae6, 1.25));
    const keyLight = new THREE.DirectionalLight(0xfff5dd, 2.6);
    keyLight.position.set(4, 7, 5);
    scene.add(keyLight);

    const textureLoader = new THREE.TextureLoader();
    const closedTex = textureLoader.load(boardClosedExactImg);
    const openTex = textureLoader.load(boardOpenExactImg);
    closedTex.colorSpace = THREE.SRGBColorSpace;
    openTex.colorSpace = THREE.SRGBColorSpace;

    const BOARD_HALF_W = 1.35;
    const BOARD_H = 3.6;
    const BOARD_THICKNESS = 0.35;
    const walnutSideMat = new THREE.MeshStandardMaterial({ color: 0x3d220d, metalness: 0.4, roughness: 0.4 });

    const boardRootGroup = new THREE.Group();
    boardRootGroup.position.set(0, 0, 0);

    // Base tray (Right half)
    const baseMat = [
      walnutSideMat, walnutSideMat, walnutSideMat, walnutSideMat,
      new THREE.MeshStandardMaterial({ map: openTex, metalness: 0.3, roughness: 0.28 }),
      walnutSideMat
    ];
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(BOARD_HALF_W, BOARD_H, BOARD_THICKNESS), baseMat);
    baseMesh.position.set(BOARD_HALF_W / 2, 0, 0);
    boardRootGroup.add(baseMesh);

    // Lid (Left half)
    const lidPivotGroup = new THREE.Group();
    lidPivotGroup.position.set(0, 0, 0);
    const lidMat = [
      walnutSideMat, walnutSideMat, walnutSideMat, walnutSideMat,
      new THREE.MeshStandardMaterial({ map: closedTex, metalness: 0.4, roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ map: openTex, metalness: 0.3, roughness: 0.28 })
    ];
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(BOARD_HALF_W, BOARD_H, BOARD_THICKNESS), lidMat);
    lidMesh.position.set(-BOARD_HALF_W / 2, 0, 0);
    lidPivotGroup.add(lidMesh);
    boardRootGroup.add(lidPivotGroup);
    scene.add(boardRootGroup);

    let lidAngle = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const targetAngle = isOpeningRef.current ? Math.PI : 0;
      lidAngle += (targetAngle - lidAngle) * 0.06;
      lidPivotGroup.rotation.y = lidAngle;
      boardRootGroup.rotation.x = -0.5;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative z-20 w-full flex-1 max-w-[620px] max-h-[380px] flex items-center justify-center overflow-visible select-none pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
