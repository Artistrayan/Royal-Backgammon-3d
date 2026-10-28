import React from 'react';
import boardClosedExactImg from '../assets/images/board_closed_exact_matching_lid_1792324316682.jpg';

interface ThreeDLoginBoardProps {
  isOpening: boolean;
}

/**
 * A single, clean closed-board image avoids the doubled WebGL faces and visible
 * edge seams from the previous 3D box. On login, the lid splits at the hinge
 * and both halves swing open before the home screen is shown.
 */
export function ThreeDLoginBoard({ isOpening }: ThreeDLoginBoardProps) {
  return (
    <div
      className="relative isolate mx-auto aspect-[.9] w-full max-w-[min(82vw,390px)] overflow-visible [perspective:1400px] sm:max-w-[min(72vw,430px)]"
      aria-label="Royal backgammon board with lion and sun emblem"
    >
      <img
        src={boardClosedExactImg}
        alt="Closed royal backgammon board with lion and sun emblem"
        draggable={false}
        className={`absolute inset-0 h-full w-full rounded-[3px] object-contain drop-shadow-[0_18px_26px_rgba(0,0,0,.65)] transition-opacity duration-200 ${isOpening ? 'opacity-0' : 'opacity-100'}`}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className={`absolute inset-y-0 left-0 w-1/2 overflow-hidden ${isOpening ? 'animate-[royal-board-open-left_1050ms_cubic-bezier(.2,.7,.15,1)_forwards]' : 'opacity-0'}`}
          style={{
            backgroundImage: `url(${boardClosedExactImg})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '200% 100%',
            backgroundPosition: 'left center',
            transformOrigin: '100% 50%',
            backfaceVisibility: 'hidden',
          }}
        />
        <div
          className={`absolute inset-y-0 right-0 w-1/2 overflow-hidden ${isOpening ? 'animate-[royal-board-open-right_1050ms_cubic-bezier(.2,.7,.15,1)_forwards]' : 'opacity-0'}`}
          style={{
            backgroundImage: `url(${boardClosedExactImg})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '200% 100%',
            backgroundPosition: 'right center',
            transformOrigin: '0% 50%',
            backfaceVisibility: 'hidden',
          }}
        />
      </div>

      <style>{`
        @keyframes royal-board-open-left {
          0% { opacity: 1; transform: rotateY(0deg); }
          18% { opacity: 1; transform: rotateY(0deg); }
          100% { opacity: 0; transform: rotateY(-112deg); }
        }
        @keyframes royal-board-open-right {
          0% { opacity: 1; transform: rotateY(0deg); }
          18% { opacity: 1; transform: rotateY(0deg); }
          100% { opacity: 0; transform: rotateY(112deg); }
        }
      `}</style>
    </div>
  );
}
