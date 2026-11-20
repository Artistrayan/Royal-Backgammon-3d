import React, { useEffect, useRef } from 'react';
import { Gdx3DEngine } from '../libgdx/Gdx3DEngine';

interface ThreeDLoginBoardProps {
  isOpening: boolean;
}

/**
 * Login-stage rendering of the actual procedural Royal Backgammon GLB.
 * The same Three.js model builder and hinged-leaf animation controller used
 * by the game board are used here; no flat image is used as the board.
 */
export function ThreeDLoginBoard({ isOpening }: ThreeDLoginBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Gdx3DEngine | null>(null);
  const openingRef = useRef(isOpening);

  useEffect(() => {
    openingRef.current = isOpening;
  }, [isOpening]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let engine: Gdx3DEngine | null = null;

    try {
      engine = new Gdx3DEngine(container, {
        onBoardReady: () => {
          if (!disposed && openingRef.current) engine?.openBoard();
        },
        onBoardTouchStartOpen: () => undefined,
        onBoardFullyOpened: () => undefined,
        onBoardHoverChange: () => undefined,
        onCheckerClicked: () => undefined,
        onLocationClicked: () => undefined,
        onDiceClicked: () => undefined,
        onDoublingCubeClicked: () => undefined,
      });
      engineRef.current = engine;
      if (openingRef.current) engine.openBoard();
    } catch (error) {
      console.error('[LoginBoard] Failed to initialize the 3D backgammon board:', error);
    }

    return () => {
      disposed = true;
      engine?.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isOpening) engineRef.current?.openBoard();
  }, [isOpening]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-full w-full overflow-visible"
      aria-label="Interactive 3D royal backgammon board with a lion and sun emblem"
    />
  );
}
