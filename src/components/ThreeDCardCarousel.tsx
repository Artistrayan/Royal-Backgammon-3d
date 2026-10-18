import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';
import cardPlayGoldImg from '../assets/images/card_play_gold_lion_sun_1792320293012.jpg';
import cardTournamentsSilverImg from '../assets/images/card_tournaments_silver_lion_sun_1792320310950.jpg';
import cardFriendsEmeraldImg from '../assets/images/card_friends_emerald_lion_sun_1792320329436.jpg';
import cardPracticeSapphireImg from '../assets/images/card_practice_sapphire_lion_sun_1792325802477.jpg';
import cardSpecialRubyImg from '../assets/images/card_special_ruby_lion_sun_1792325826121.jpg';
import { t } from '../i18n/translations';

export interface CardData {
  id: string;
  titleKey: string;
  subKey: string;
  icon: string;
  image: string;
  glowColor: number;
  edgeColor: number;
  action: () => void;
}

interface ThreeDCardCarouselProps {
  onPlayOneOnOne: () => void;
  onOpenTournaments: () => void;
  onOpenPractice: () => void;
  onOpenFriends: () => void;
  onOpenVariants: () => void;
}

export function ThreeDCardCarousel({
  onPlayOneOnOne,
  onOpenTournaments,
  onOpenPractice,
  onOpenFriends,
  onOpenVariants,
}: ThreeDCardCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeIndex, setActiveIndex] = useState(2); // Center card (Play) default
  const activeIndexRef = useRef(2);
  activeIndexRef.current = activeIndex;

  const cardsData: CardData[] = [
    {
      id: 'practice',
      titleKey: 'practice',
      subKey: 'practiceSub',
      icon: '🎓',
      image: cardPracticeSapphireImg,
      glowColor: 0x0284c7,
      edgeColor: 0x38bdf8,
      action: onOpenPractice,
    },
    {
      id: 'tournaments',
      titleKey: 'tournaments',
      subKey: 'tournamentsSub',
      icon: '🏆',
      image: cardTournamentsSilverImg,
      glowColor: 0x94a3b8,
      edgeColor: 0xe2e8f0,
      action: onOpenTournaments,
    },
    {
      id: 'play',
      titleKey: 'play',
      subKey: 'playSub',
      icon: '👥',
      image: cardPlayGoldImg,
      glowColor: 0xeab308,
      edgeColor: 0xffd700,
      action: onPlayOneOnOne,
    },
    {
      id: 'friends',
      titleKey: 'friends',
      subKey: 'friendsSub',
      icon: '🤝',
      image: cardFriendsEmeraldImg,
      glowColor: 0x10b981,
      edgeColor: 0x34d399,
      action: onOpenFriends,
    },
    {
      id: 'special',
      titleKey: 'special',
      subKey: 'specialSub',
      icon: '⭐',
      image: cardSpecialRubyImg,
      glowColor: 0xf43f5e,
      edgeColor: 0xfb7185,
      action: onOpenVariants,
    },
  ];

  // Ref tracking interaction state
  const interactionRef = useRef({
    isDragging: false,
    startX: 0,
    currentX: 0,
    pointerTiltX: 0,
    pointerTiltY: 0,
    carouselOffset: 2, // smooth continuous float for index
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 420;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 9.2);
    camera.lookAt(0, 0.1, 0);

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
      renderer.toneMappingExposure = 1.0;
    } catch (e) {
      console.warn('WebGL init notice:', e);
      return;
    }

    // 3. Studio Lighting (Neutral White)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 7, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    const centerGlowLight = new THREE.PointLight(0xffd700, 2.5, 12);
    centerGlowLight.position.set(0, 3, 4);
    scene.add(centerGlowLight);

    // 4. Circular 3D Dais / Platform
    const daisGroup = new THREE.Group();
    const daisGeo = new THREE.CylinderGeometry(4.8, 5.1, 0.35, 64);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x140c06,
      roughness: 0.4,
      metalness: 0.8,
    });
    const daisMesh = new THREE.Mesh(daisGeo, daisMat);
    daisMesh.position.set(0, -2.6, 0);
    daisGroup.add(daisMesh);

    // Glowing rim torus on dais
    const rimGeo = new THREE.TorusGeometry(4.85, 0.05, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xd4af37,
      emissiveIntensity: 0.6,
      metalness: 0.9,
      roughness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, -2.42, 0);
    daisGroup.add(rimMesh);

    scene.add(daisGroup);

    // 5. Build 3D Card Meshes with Real Thickness & Texture Materials
    const textureLoader = new THREE.TextureLoader();
    const cardMeshes: THREE.Group[] = [];

    const CARD_WIDTH = 2.75;
    const CARD_HEIGHT = 3.85;
    const CARD_THICKNESS = 0.42; // Real physical thickness (Extruded Slab!)

    cardsData.forEach((card) => {
      const cardGroup = new THREE.Group();

      // Load Lion & Sun texture with sRGB color space
      const texture = textureLoader.load(card.image, 
        (tex) => console.log(`[3D] Texture loaded: ${card.id}`),
        undefined,
        (err) => console.error(`[3D] Texture load error: ${card.id}`, err)
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Box Materials for 6 faces: [Right, Left, Top, Bottom, Front, Back]
      const goldEdgeMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.9,
        roughness: 0.2,
      });

      const topRimMat = new THREE.MeshStandardMaterial({
        color: 0xffe885,
        metalness: 0.95,
        roughness: 0.1,
      });

      const bottomRimMat = new THREE.MeshStandardMaterial({
        color: 0x5a3d12,
        metalness: 0.7,
        roughness: 0.4,
      });

      const frontFaceMat = new THREE.MeshBasicMaterial({
        map: texture,
      });

      const backFaceMat = new THREE.MeshBasicMaterial({
        map: texture,
      });

      const materials = [
        goldEdgeMat, // Right
        goldEdgeMat, // Left
        topRimMat, // Top (Leaned back, reflecting light!)
        bottomRimMat, // Bottom
        frontFaceMat, // Front
        backFaceMat, // Back
      ];

      // Main thick cuboid body
      const boxGeo = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);
      const boxMesh = new THREE.Mesh(boxGeo, materials);
      cardGroup.add(boxMesh);

      // Ornate 3D Gold Filigree Bevel Frame (Elevated on front edge)
      const frameGeo = new THREE.BoxGeometry(CARD_WIDTH + 0.08, CARD_HEIGHT + 0.08, 0.04);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.96,
        roughness: 0.14,
        emissive: 0xb8860b,
        emissiveIntensity: 0.2,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.z = CARD_THICKNESS / 2 + 0.02;
      cardGroup.add(frameMesh);

      // Contact Shadow plane under card
      const shadowGeo = new THREE.PlaneGeometry(CARD_WIDTH * 1.1, 0.8);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.75,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(0, -CARD_HEIGHT / 2 - 0.2, 0);
      cardGroup.add(shadowMesh);

      // Store in array and add to scene
      cardMeshes.push(cardGroup);
      scene.add(cardGroup);
    });

    // 6. Raycasting for Click / Tap Selection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      for (let i = 0; i < cardMeshes.length; i++) {
        const intersects = raycaster.intersectObjects(cardMeshes[i].children, true);
        if (intersects.length > 0) {
          if (i === activeIndexRef.current) {
            // Active center card clicked -> trigger action!
            royalSound.playOptionClickSound();
            triggerTelegramHaptic('heavy');
            cardsData[i].action();
          } else {
            // Adjacent card clicked -> switch to it
            royalSound.playDiceRollSound();
            triggerTelegramHaptic('light');
            setActiveIndex(i);
          }
          break;
        }
      }
    };

    canvas.addEventListener('click', handleCanvasClick);

    // 7. Touch & Mouse Swipe / Drag Handlers
    const onPointerDown = (e: PointerEvent) => {
      interactionRef.current.isDragging = true;
      interactionRef.current.startX = e.clientX;
      interactionRef.current.currentX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      interactionRef.current.pointerTiltX = ((e.clientY - centerY) / centerY) * -0.15;
      interactionRef.current.pointerTiltY = ((e.clientX - centerX) / centerX) * 0.18;

      if (interactionRef.current.isDragging) {
        interactionRef.current.currentX = e.clientX;
      }
    };

    const onPointerUp = () => {
      if (!interactionRef.current.isDragging) return;
      interactionRef.current.isDragging = false;
      const deltaX = interactionRef.current.currentX - interactionRef.current.startX;

      if (Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          // Swiped right -> prev card
          const next = Math.max(0, activeIndexRef.current - 1);
          if (next !== activeIndexRef.current) {
            royalSound.playDiceRollSound();
            triggerTelegramHaptic('light');
            setActiveIndex(next);
          }
        } else {
          // Swiped left -> next card
          const next = Math.min(cardsData.length - 1, activeIndexRef.current + 1);
          if (next !== activeIndexRef.current) {
            royalSound.playDiceRollSound();
            triggerTelegramHaptic('light');
            setActiveIndex(next);
          }
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 8. Render & Animation Loop (Exact Tilt & Perspective Angle)
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smoothly interpolate current carousel offset towards active index
      const targetOffset = activeIndexRef.current;
      interactionRef.current.carouselOffset +=
        (targetOffset - interactionRef.current.carouselOffset) * Math.min(delta * 9, 1);

      const curOffset = interactionRef.current.carouselOffset;
      const { pointerTiltX, pointerTiltY } = interactionRef.current;

      // Update positions and 3D orientations of all cards
      cardMeshes.forEach((mesh, idx) => {
        const diff = idx - curOffset;
        const absDiff = Math.abs(diff);
        const isCenter = Math.abs(diff) < 0.3;

        // Position along 3D circular arc
        const targetX = diff * 2.85;
        const targetZ = isCenter ? 0.95 : -absDiff * 1.35;
        const targetY = isCenter ? 0.2 : 0.05 - absDiff * 0.1;

        mesh.position.x += (targetX - mesh.position.x) * Math.min(delta * 12, 1);
        mesh.position.y += (targetY - mesh.position.y) * Math.min(delta * 12, 1);
        mesh.position.z += (targetZ - mesh.position.z) * Math.min(delta * 12, 1);

        // --- EXACT PITCH & YAW ANGLES (THE TILTED STATE) ---
        // 1. "یکم بالای کارت هارو بخوابین" -> pitch top back by ~0.31 rad (~18 degrees)
        const targetRotX = 0.31 + (isCenter ? pointerTiltX : 0);

        // 2. "یکم کج کن بزار ضخامتش مشخص بشه" -> base yaw angle
        const baseYaw = isCenter ? -0.14 : diff * -0.52; // -8deg center, -30deg flanks
        const targetRotY = baseYaw + (isCenter ? pointerTiltY : 0);

        // 3. Roll angle
        const targetRotZ = isCenter ? -0.035 : diff * -0.08;

        // Scale
        const targetScale = isCenter ? 1.15 : Math.max(0.78, 0.92 - absDiff * 0.08);

        mesh.rotation.x += (targetRotX - mesh.rotation.x) * Math.min(delta * 10, 1);
        mesh.rotation.y += (targetRotY - mesh.rotation.y) * Math.min(delta * 10, 1);
        mesh.rotation.z += (targetRotZ - mesh.rotation.z) * Math.min(delta * 10, 1);

        mesh.scale.setScalar(
          mesh.scale.x + (targetScale - mesh.scale.x) * Math.min(delta * 10, 1)
        );
      });

      // Subtle pulse on center light
      centerGlowLight.intensity = 3.2 + Math.sin(now * 0.003) * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
    };
  }, []);

  const activeCard = cardsData[activeIndex];

  return (
    <div
      ref={containerRef}
      className="relative z-10 w-full flex-1 flex flex-col items-center justify-center overflow-visible select-none touch-none"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Left Navigation Chevron Button */}
      <button
        type="button"
        onClick={() => {
          const next = Math.max(0, activeIndex - 1);
          if (next !== activeIndex) {
            royalSound.playDiceRollSound();
            triggerTelegramHaptic('light');
            setActiveIndex(next);
          }
        }}
        disabled={activeIndex === 0}
        className={`absolute left-2 sm:left-4 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-[#ffd700]/60 flex items-center justify-center text-[#ffd700] text-xl sm:text-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all cursor-pointer ${
          activeIndex === 0
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:scale-110 active:scale-95 hover:bg-[#ffd700]/20'
        }`}
      >
        ‹
      </button>

      {/* Right Navigation Chevron Button */}
      <button
        type="button"
        onClick={() => {
          const next = Math.min(cardsData.length - 1, activeIndex + 1);
          if (next !== activeIndex) {
            royalSound.playDiceRollSound();
            triggerTelegramHaptic('light');
            setActiveIndex(next);
          }
        }}
        disabled={activeIndex === cardsData.length - 1}
        className={`absolute right-2 sm:right-4 z-40 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-[#ffd700]/60 flex items-center justify-center text-[#ffd700] text-xl sm:text-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-all cursor-pointer ${
          activeIndex === cardsData.length - 1
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:scale-110 active:scale-95 hover:bg-[#ffd700]/20'
        }`}
      >
        ›
      </button>

      {/* Floating 3D Title Plaque beneath Active Card */}
      <div
        onClick={() => {
          royalSound.playOptionClickSound();
          triggerTelegramHaptic('heavy');
          activeCard.action();
        }}
        className="absolute bottom-2 z-30 px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-t from-black via-black/95 to-black/80 border-2 border-[#ffd700] shadow-[0_8px_30px_rgba(234,179,8,0.6)] cursor-pointer hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center text-center group"
      >
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">{activeCard.icon}</span>
          <h3 className="font-cinzel text-xl sm:text-2xl font-black text-white tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {t(activeCard.titleKey)}
          </h3>
          <svg
            className="w-4 h-4 text-[#ffd700] transform transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#ffd700] tracking-wide mt-0.5">
          {t(activeCard.subKey)}
        </span>
      </div>
    </div>
  );
}
