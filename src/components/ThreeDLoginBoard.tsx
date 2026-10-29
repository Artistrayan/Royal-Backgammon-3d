import React from 'react';
import boardClosedExactImg from '../assets/images/closed_board_lion_sun_emblem_1791745629203.jpg';

interface ThreeDLoginBoardProps {
  isOpening: boolean;
}

/**
 * Keep the Lion and Sun artwork while neutralizing the flag-like green, white,
 * and red background colors. The neutral treatment is applied consistently to
 * the closed board and its animated opening panels.
 */
export function ThreeDLoginBoard({ isOpening }: ThreeDLoginBoardProps) {
  const neutralArtwork = {
    filter: 'grayscale(1) sepia(.28) brightness(.82) contrast(1.12)',
  } as const;

  return (
    <div
      className="relative isolate mx-auto aspect-[.9] w-full max-w-[min(82vw,390px)] overflow-visible [perspective:1400px] sm:max-w-[min(72vw,430px)]"
      aria-label="Royal backgammon board with lion and sun emblem"
    >
      <img
        src={boardClosedExactImg}
        alt="Closed royal backgammon board with lion and sun emblem"
        draggable={false}
        style={neutralArtwork}
        className={`absolute inset-0 h-full w-full rounded-[3px] object-contain drop-shadow-[0_18px_26px_rgba(0,0,0,.65)] transition-opacity duration-200 ${isOpening ? 'opacity-0' : 'opacity-100'}`}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className={`absolute inset-y-0 left-0 w-1/2 overflow-hidden ${isOpening ? 'opacity-100' : 'opacity-0'}`}
          style={{
            ...neutralArtwork,
            animation: isOpening ? 'royal-board-open-left 1050ms cubic-bezier(0.2,0.7,0.15,1) forwards' : 'none',
            backgroundImage: `url(${boardClosedExactImg})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '200% 100%',
            backgroundPosition: 'left center',
            transformOrigin: '100% 50%',
            backfaceVisibility: 'hidden',
          }}
        />
        <div
          className={`absolute inset-y-0 right-0 w-1/2 overflow-hidden ${isOpening ? 'opacity-100' : 'opacity-0'}`}
          style={{
            ...neutralArtwork,
            animation: isOpening ? 'royal-board-open-right 1050ms cubic-bezier(0.2,0.7,0.15,1) forwards' : 'none',
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
