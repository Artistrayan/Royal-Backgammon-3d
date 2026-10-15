import React from 'react';

export const HomeClosedBoardShowcase: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <div className="w-[85%] h-[85%] bg-[#3d2b1f] border-[12px] border-[#c8a668] rounded-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative flex items-center justify-center">
        {/* Marquetry pattern placeholder */}
        <div className="w-full h-full bg-[#3d2b1f] opacity-80" />
        
        {/* Brass Medallion */}
        <div className="absolute w-24 h-24 bg-[#c8a668] rounded-full border-4 border-[#b99656] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
           <span className="text-[#3d2b1f] font-bold text-lg">Lion & Sun</span>
        </div>
        
        {/* Brass Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[6px] border-l-[6px] border-[#c8a668]" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[6px] border-r-[6px] border-[#c8a668]" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[6px] border-l-[6px] border-[#c8a668]" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[6px] border-r-[6px] border-[#c8a668]" />
      </div>
    </div>
  );
};
