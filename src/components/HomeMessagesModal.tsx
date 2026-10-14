import React, { useState, useEffect, useRef } from 'react';
import { RoyalCrownIcon } from './RoyalIcons';
import { royalSound } from '../libgdx/Gdx3DEngine';
import { triggerTelegramHaptic } from '../telegram/telegramMiniApp';

export interface PrivateChatMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  text: string;
  timestamp: number;
}

export interface GlobalChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  level: number;
  text: string;
  timestamp: number;
}

export interface SystemMessageItem {
  id: string;
  title: string;
  text: string;
  tag: 'امنیت' | 'خزانه' | 'تورنمنت' | 'پاداش';
  dateStr: string;
  isRead?: boolean;
}

interface HomeMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUsername: string;
  playerLevel: number;
  onSendGlobalMessage?: (text: string) => void;
  globalMessages?: GlobalChatMessage[];
  onSendPrivateMessage?: (targetUserId: string, text: string) => void;
  privateMessages?: PrivateChatMessage[];
}

const DEFAULT_SYSTEM_MESSAGES: SystemMessageItem[] = [
  {
    id: 'sys-1',
    title: 'تایید هویت تلگرام فعال شد',
    text: 'احراز هویت حساب تلگرام شما با موفقیت ثبت شد. پلتفرم با امنیت بالا فعال است.',
    tag: 'امنیت',
    dateStr: 'امروز',
  },
  {
    id: 'sys-2',
    title: 'کارمزد ۱۵٪ بازی‌های آنلاین',
    text: 'کلیه مسابقات آنلاین ۵ گانه دارای کارمزد ۱۵٪ شفاف هستند و در دفتر کل ثبت می‌شوند.',
    tag: 'خزانه',
    dateStr: 'امروز',
  },
  {
    id: 'sys-3',
    title: 'سوپر لیگ ۱۰ نفره قهرمانان',
    text: 'مسابقات سطح ۵ به صورت لیگ ۱۰ نفره با مجموع جوایز ۲۱۲.۵ تتر آغاز به کار کرد.',
    tag: 'تورنمنت',
    dateStr: 'دیروز',
  },
  {
    id: 'sys-4',
    title: 'واریز و برداشت تتر TRC20',
    text: 'آدرس ولت اختصاصی پلتفرم فعال است. حداقل مبلغ برداشت ۵ تتر با تایید سریع است.',
    tag: 'پاداش',
    dateStr: '۲ روز پیش',
  },
];

const INITIAL_GLOBAL_MESSAGES: GlobalChatMessage[] = [
  {
    id: 'gm-1',
    senderId: 'sys-host',
    senderName: 'ROYAL_SALOON',
    level: 50,
    text: 'به چت جهانی باشگاه سلطنتی تخته نرد خوش آمدید!',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'gm-2',
    senderId: 'user-cyrus',
    senderName: 'CYRUS_THE_GREAT',
    level: 18,
    text: 'کسی برای سطح ۲ (۲ تتر) آماده است؟ مسابقه ۲ دستی',
    timestamp: Date.now() - 1800000,
  },
  {
    id: 'gm-3',
    senderId: 'user-darius',
    senderName: 'DARIUS_SHAH',
    level: 29,
    text: 'تخته و تاس‌ها فوق‌العاده طراحی شدند، دست‌مریزاد!',
    timestamp: Date.now() - 900000,
  },
];

export function HomeMessagesModal({
  isOpen,
  onClose,
  currentUserId,
  currentUsername,
  playerLevel,
  onSendGlobalMessage,
  globalMessages = [],
  onSendPrivateMessage,
  privateMessages = [],
}: HomeMessagesModalProps) {
  const [activeTab, setActiveTab] = useState<'private' | 'system' | 'global'>('global');
  const [inputText, setInputText] = useState('');
  const [localGlobalList, setLocalGlobalList] = useState<GlobalChatMessage[]>(INITIAL_GLOBAL_MESSAGES);
  const [localPrivateList, setLocalPrivateList] = useState<PrivateChatMessage[]>([
    {
      id: 'pm-demo-1',
      fromUserId: 'support-agent',
      fromUsername: 'پشتیبان رسمی',
      toUserId: currentUserId,
      text: 'درود! هرگونه سوال در مورد واریز تتر یا قوانین ۵ سطح داشتید در خدمتیم.',
      timestamp: Date.now() - 7200000,
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (globalMessages && globalMessages.length > 0) {
      setLocalGlobalList(globalMessages);
    }
  }, [globalMessages]);

  useEffect(() => {
    if (privateMessages && privateMessages.length > 0) {
      setLocalPrivateList(privateMessages);
    }
  }, [privateMessages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, activeTab, localGlobalList, localPrivateList]);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;

    royalSound.playOptionClickSound();
    triggerTelegramHaptic('light');

    if (activeTab === 'global') {
      const newMsg: GlobalChatMessage = {
        id: `gm-${Date.now()}`,
        senderId: currentUserId,
        senderName: currentUsername,
        level: playerLevel,
        text: clean.slice(0, 80),
        timestamp: Date.now(),
      };
      setLocalGlobalList((prev) => [...prev, newMsg]);
      onSendGlobalMessage?.(clean.slice(0, 80));
    } else if (activeTab === 'private') {
      const newPriv: PrivateChatMessage = {
        id: `pm-${Date.now()}`,
        fromUserId: currentUserId,
        fromUsername: currentUsername,
        toUserId: 'support-agent',
        text: clean.slice(0, 120),
        timestamp: Date.now(),
      };
      setLocalPrivateList((prev) => [...prev, newPriv]);
      onSendPrivateMessage?.('support-agent', clean.slice(0, 120));
    }

    setInputText('');
  };

  const handleQuickTemplate = (templateText: string) => {
    setInputText(templateText);
    royalSound.playOptionClickSound();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in text-[#e8dfd0] select-none">
      <div className="relative w-full max-w-[500px] h-[480px] max-h-[92vh] rounded-2xl border border-[#c8a668] bg-gradient-to-b from-[#081b13] via-[#04120a] to-[#010804] p-4 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-2.5 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base text-[#c8a668]">✉️</span>
            <div>
              <h2 className="font-cinzel text-[11px] font-bold tracking-[0.18em] text-[#f5dca8] uppercase">
                مرکز پیام‌های بازی (MESSAGES)
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#a39e93]">
                پیام‌های خصوصی • اطلاعیه‌های سیستم • چت زنده جهانی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* 3 Main Tabs: خصوصی | سیستم | جهانی */}
        <div className="grid grid-cols-3 gap-1 bg-[#020b06] p-1 rounded-lg border border-[#c8a668]/30 mb-2.5 shrink-0 text-center font-cinzel text-[8.5px] font-bold tracking-wider">
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              setActiveTab('private');
            }}
            className={`py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'private'
                ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c] shadow-sm'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            👤 پیام‌های خصوصی
          </button>
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              setActiveTab('system');
            }}
            className={`py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c] shadow-sm'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            📢 پیام‌های سیستم
          </button>
          <button
            type="button"
            onClick={() => {
              royalSound.playOptionClickSound();
              setActiveTab('global');
            }}
            className={`py-1.5 rounded transition-all cursor-pointer ${
              activeTab === 'global'
                ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c] shadow-sm'
                : 'text-[#8e8a80] hover:text-[#d0c7b6]'
            }`}
          >
            🌐 چت جهانی زنده
          </button>
        </div>

        {/* Tab 1: Private Messages */}
        {activeTab === 'private' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-2.5 py-1 rounded bg-[#020a06] border border-[#c8a668]/20 mb-2 flex items-center justify-between text-[8px] font-cinzel text-[#c8a668]">
              <span>گفتگوی مستقیم با دوستان و پشتیبان</span>
              <span className="text-[#52f29c]">انتقال امن P2P</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {localPrivateList.map((m) => {
                const isMe = m.fromUserId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[7.5px] font-cinzel text-[#8e8a80] mb-0.5">
                      {isMe ? 'شما' : m.fromUsername}
                    </span>
                    <div
                      className={`max-w-[82%] px-3 py-1.5 rounded-xl text-[10px] font-cormorant leading-snug ${
                        isMe
                          ? 'bg-[#0c2f20] border border-[#52f29c]/50 text-[#e8fce8]'
                          : 'bg-[#181a17] border border-[#c8a668]/30 text-[#e8dfd0]'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Tab 2: System Messages */}
        {activeTab === 'system' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            {DEFAULT_SYSTEM_MESSAGES.map((s) => (
              <div
                key={s.id}
                className="rounded-lg bg-[#030e09] border border-[#c8a668]/40 p-2.5 hover:border-[#52f29c]/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <RoyalCrownIcon className="w-3 h-3 text-[#c8a668]" />
                    <h4 className="font-cinzel text-[9.5px] font-bold text-[#f5dca8]">
                      {s.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-cinzel px-1.5 py-0.2 rounded bg-[#0a271b] border border-[#52f29c]/40 text-[#52f29c]">
                      {s.tag}
                    </span>
                    <span className="text-[7.5px] font-cormorant text-[#8e8a80]">
                      {s.dateStr}
                    </span>
                  </div>
                </div>
                <p className="font-cormorant text-[10px] text-[#cfc7b6] leading-relaxed text-right">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Global Chat */}
        {activeTab === 'global' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-2.5 py-1 rounded bg-[#020a06] border border-[#c8a668]/20 mb-2 flex items-center justify-between text-[8px] font-cinzel text-[#c8a668]">
              <span>اتاق گفتگوی عمومی بازیکنان فعال</span>
              <span className="text-[#52f29c]">🔴 زنده • متن مختصر</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
              {localGlobalList.map((m) => {
                const isMe = m.senderId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-1.5 p-1.5 rounded-lg border text-right ${
                      isMe
                        ? 'bg-[#0a2318]/90 border-[#52f29c]/35'
                        : 'bg-[#030d08]/80 border-[#c8a668]/25'
                    }`}
                  >
                    <span className="text-[7px] font-cinzel px-1 rounded bg-[#020704] border border-[#c8a668]/30 text-[#e8d5b0] shrink-0">
                      LVL {m.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-cinzel text-[8px] font-bold text-[#f5dca8] truncate">
                          {isMe ? `${m.senderName} (شما)` : m.senderName}
                        </span>
                        <span className="text-[7px] font-mono text-[#7a7469]">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="font-cormorant text-[9.5px] text-[#d6cdbd] leading-tight break-words mt-0.5">
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Template Chips for Fast, Brief Chat */}
            <div className="flex items-center gap-1 overflow-x-auto py-1 mt-1 shrink-0 no-scrollbar">
              <button
                type="button"
                onClick={() => handleQuickTemplate('سلام! کسی مسابقه میده؟')}
                className="px-2 py-0.5 rounded bg-[#020c07] border border-[#c8a668]/30 font-cormorant text-[8.5px] text-[#e8d5b0] hover:text-white hover:border-[#52f29c] whitespace-nowrap cursor-pointer"
              >
                👋 سلام! کسی مسابقه میده؟
              </button>
              <button
                type="button"
                onClick={() => handleQuickTemplate('بازی عالی بود، دست‌مریزاد!')}
                className="px-2 py-0.5 rounded bg-[#020c07] border border-[#c8a668]/30 font-cormorant text-[8.5px] text-[#e8d5b0] hover:text-white hover:border-[#52f29c] whitespace-nowrap cursor-pointer"
              >
                👏 بازی عالی بود!
              </button>
              <button
                type="button"
                onClick={() => handleQuickTemplate('منتظر حریف در سطح ۲ نقره هستم')}
                className="px-2 py-0.5 rounded bg-[#020c07] border border-[#c8a668]/30 font-cormorant text-[8.5px] text-[#e8d5b0] hover:text-white hover:border-[#52f29c] whitespace-nowrap cursor-pointer"
              >
                ⚔️ منتظر حریف در سطح ۲
              </button>
            </div>
          </div>
        )}

        {/* Input Bar (Visible in Private and Global tabs) */}
        {activeTab !== 'system' && (
          <form onSubmit={handleSendMessage} className="mt-2 pt-2 border-t border-[#c8a668]/20 flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              maxLength={80}
              placeholder={activeTab === 'global' ? 'پیام مختصر شما در چت جهانی (حداکثر ۸۰ کاراکتر)...' : 'پیام خصوصی شما...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 h-8 px-3 rounded-lg bg-[#020a06] border border-[#c8a668]/40 font-cormorant text-[10px] text-[#e8dfd0] placeholder-[#6b665c] focus:outline-none focus:border-[#52f29c]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`h-8 px-3 rounded-lg font-cinzel text-[8px] font-bold tracking-wider transition-all cursor-pointer shrink-0 ${
                inputText.trim()
                  ? 'brass-button-surface border border-[#fff2cf] text-[#140e05] hover:brightness-110 active:scale-95 shadow-md'
                  : 'bg-[#0f1712] border border-[#333] text-[#666] cursor-not-allowed'
              }`}
            >
              ارسال ➔
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
