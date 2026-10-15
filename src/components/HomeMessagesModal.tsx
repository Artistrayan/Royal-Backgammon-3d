import React, { useState } from 'react';

export interface GlobalChatMessage { id: string; text: string; sender: string; }
export interface PrivateChatMessage { id: string; text: string; sender: string; }

export const HomeMessagesModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'private' | 'system' | 'global'>('private');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[80%] h-[60%] bg-[#0a1f16] border border-[#c8a668] rounded-lg p-6 flex flex-col">
        <div className="flex gap-4 mb-4 border-b border-[#c8a668]/30 pb-2">
          {['private', 'system', 'global'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`capitalize ${activeTab === tab ? 'text-[#c8a668]' : 'text-gray-400'}`}>
              {tab}
            </button>
          ))}
          <button onClick={onClose} className="ml-auto text-white">X</button>
        </div>
        <div className="flex-grow overflow-y-auto text-white">
          {activeTab} messages content here.
        </div>
      </div>
    </div>
  );
};
