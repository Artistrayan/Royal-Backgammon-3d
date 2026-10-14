import React, { useState, useEffect, useCallback } from 'react';
import { RoyalCrownIcon } from './RoyalIcons';
import { royalSound } from '../libgdx/Gdx3DEngine';

export interface SupportTicketItem {
  id: string;
  userId: string;
  username: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  adminReply?: string;
  createdAt: number;
  updatedAt: number;
}

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

export function CustomerSupportModal({
  isOpen,
  onClose,
  userId,
  username,
}: CustomerSupportModalProps) {
  const [activeTab, setActiveTab] = useState<'ticket' | 'history' | 'faq'>('ticket');
  const [category, setCategory] = useState<'deposit' | 'withdrawal' | 'match_dispute' | 'tech_issue' | 'feedback'>('deposit');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!userId) return;
    setIsLoadingTickets(true);
    try {
      const res = await fetch(`/api/support/list?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingTickets(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen, fetchTickets]);

  if (!isOpen) return null;

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setAlertNotice({ type: 'error', text: 'لطفاً موضوع و متن پیام خود را وارد نمایید.' });
      return;
    }

    setIsSubmitting(true);
    setAlertNotice(null);

    try {
      const res = await fetch('/api/support/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username,
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (res.ok) {
        royalSound.playOptionClickSound();
        setSubject('');
        setMessage('');
        setAlertNotice({ type: 'success', text: 'تیکت شما با موفقیت ثبت شد. تیم پشتیبانی به زودی پاسخ خواهد داد.' });
        fetchTickets();
        setTimeout(() => setActiveTab('history'), 1200);
      } else {
        setAlertNotice({ type: 'error', text: 'خطا در ثبت تیکت. لطفاً دوباره تلاش نمایید.' });
      }
    } catch {
      setAlertNotice({ type: 'error', text: 'خطا در ارتباط با سرور پشتیبانی.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in text-[#e8dfd0]">
      <div className="relative w-full max-w-[560px] max-h-[92vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#081a12] via-[#04120a] to-[#020905] p-4 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-2.5 mb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <RoyalCrownIcon className="w-4 h-3.5 text-[#c8a668]" />
            <div>
              <h2 className="font-cinzel text-[11px] font-semibold tracking-[0.16em] text-[#f5dca8] uppercase">
                🎧 پشتیبانی ۲۴/۷ سلطنتی (CUSTOMER SUPPORT)
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#a39e93]">
                رسیدگی فوری به تراکنش‌های تتر، گزارش تخلفات و پاسخ مستقیم اپراتور
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

        {/* Sub-tabs */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/20 pb-2 mb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                royalSound.playOptionClickSound();
                setActiveTab('ticket');
              }}
              className={`px-3 py-1 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'ticket'
                  ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c] shadow-sm'
                  : 'text-[#8e8a80] hover:text-[#d0c7b6]'
              }`}
            >
              ✉️ ثبت تیکت جدید
            </button>
            <button
              type="button"
              onClick={() => {
                royalSound.playOptionClickSound();
                setActiveTab('history');
                fetchTickets();
              }}
              className={`px-3 py-1 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#0f3422] border border-[#c8a668]/60 text-[#f5dca8] shadow-sm'
                  : 'text-[#8e8a80] hover:text-[#d0c7b6]'
              }`}
            >
              📋 تیکت‌های من ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => {
                royalSound.playOptionClickSound();
                setActiveTab('faq');
              }}
              className={`px-3 py-1 rounded font-cinzel text-[8.5px] font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-[#0f3422] border border-[#c8a668]/60 text-[#f5dca8] shadow-sm'
                  : 'text-[#8e8a80] hover:text-[#d0c7b6]'
              }`}
            >
              📖 قوانین و آدرس رسمی
            </button>
          </div>

          <a
            href="https://t.me/RoyalBackgammonSupport"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded bg-[#0b2b1d] border border-[#52f29c]/40 hover:bg-[#12402b] text-[#52f29c] font-cinzel text-[7.5px] font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
          >
            ✈️ تلگرام مستقیم
          </a>
        </div>

        {alertNotice && (
          <div
            className={`px-3 py-1.5 rounded mb-2.5 text-[9px] font-cormorant flex items-center justify-between ${
              alertNotice.type === 'success'
                ? 'bg-[#072416] border border-[#52f29c]/50 text-[#72f2b3]'
                : 'bg-[#2a0e0e] border border-[#f56565]/50 text-[#fed7d7]'
            }`}
          >
            <span>{alertNotice.text}</span>
            <button
              type="button"
              onClick={() => setAlertNotice(null)}
              className="text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Submit Ticket */}
        {activeTab === 'ticket' && (
          <form onSubmit={handleSubmitTicket} className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-cinzel text-[7px] text-[#b99656] tracking-wider block mb-1">
                  دسته‌بندی تیکت
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-[28px] px-2 rounded bg-[#020b06] border border-[#c8a668]/40 text-[#f5dca8] font-cinzel text-[8px] focus:outline-none focus:border-[#52f29c]"
                >
                  <option value="deposit">واریز و پیگیری شارژ حساب (Deposit)</option>
                  <option value="withdrawal">برداشت وجه و تسویه حساب (Withdrawal)</option>
                  <option value="match_dispute">گزارش داوری مسابقه یا تخلف حریف</option>
                  <option value="tech_issue">مشکل فنی بازی و اتصال اینترنت</option>
                  <option value="feedback">انتقادات، پیشنهادات و سوالات عمومی</option>
                </select>
              </div>

              <div>
                <label className="font-cinzel text-[7px] text-[#b99656] tracking-wider block mb-1">
                  موضوع تیکت
                </label>
                <input
                  type="text"
                  placeholder="مثال: پیگیری واریز تتر با هش تراکنش"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-[28px] px-2 rounded bg-[#020b06] border border-[#c8a668]/40 text-[#f5dca8] font-cormorant text-[10px] focus:outline-none focus:border-[#52f29c]"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[90px]">
              <label className="font-cinzel text-[7px] text-[#b99656] tracking-wider block mb-1">
                متن کامل پیام (شامل شناسه تراکنش یا جزئیات بازی)
              </label>
              <textarea
                rows={4}
                placeholder="توضیحات کامل مشکل یا درخواست خود را بنویسید..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full flex-1 p-2 rounded bg-[#020b06] border border-[#c8a668]/40 text-[#f5dca8] font-cormorant text-[11px] leading-relaxed focus:outline-none focus:border-[#52f29c] resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-cormorant text-[8.5px] text-[#8e8a80]">
                پاسخ ادمین در بخش «تیکت‌های من» قابل مشاهده و پیگیری است.
              </span>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded brass-button-surface font-cinzel text-[8.5px] font-bold text-[#140e05] tracking-wider cursor-pointer hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'در حال ارسال...' : 'ثبت تیکت رسمی'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Ticket History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
            {isLoadingTickets ? (
              <div className="text-center py-6 font-cormorant text-[#a39e93] text-xs">
                در حال دریافت وضعیت تیکت‌ها...
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 font-cormorant text-[#a39e93] text-xs bg-[#020a06] border border-[#c8a668]/20 rounded-lg p-4">
                هنوز هیچ تیکتی ثبت نکرده‌اید. برای ارتباط با پشتیبانی، از تب «ثبت تیکت جدید» استفاده نمایید.
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg bg-[#020a06] border border-[#c8a668]/30 p-2.5 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-cinzel text-[8.5px] font-bold text-[#f5dca8]">
                      {t.subject}
                    </span>
                    <span
                      className={`text-[7px] font-cinzel px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        t.status === 'answered'
                          ? 'bg-[#0a2f1c] text-[#52f29c] border border-[#52f29c]/50'
                          : 'bg-[#291e0a] text-[#f5dca8] border border-[#c8a668]/40'
                      }`}
                    >
                      {t.status === 'answered' ? 'پاسخ داده شد' : 'در انتظار بررسی'}
                    </span>
                  </div>

                  <p className="font-cormorant text-[9.5px] text-[#ccc2af] bg-[#04120a] p-2 rounded border border-[#c8a668]/15">
                    {t.message}
                  </p>

                  {t.adminReply && (
                    <div className="mt-1 p-2 rounded bg-[#051c11] border border-[#52f29c]/40 text-[#72f2b3]">
                      <div className="flex items-center gap-1 font-cinzel text-[7px] text-[#52f29c] font-bold mb-0.5">
                        <span>🛡️ پاسخ رسمی پشتیبانی:</span>
                      </div>
                      <p className="font-cormorant text-[9.5px] text-[#d6fce7] leading-relaxed">
                        {t.adminReply}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[7px] font-cinzel text-[#7e7a70] pt-0.5">
                    <span>شناسه: {t.id}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: FAQ & Official Address */}
        {activeTab === 'faq' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[#d8cfbe] font-cormorant text-[10px] leading-relaxed">
            <div className="p-2.5 rounded bg-[#020b06] border border-[#c8a668]/30">
              <h4 className="font-cinzel text-[8px] font-bold text-[#f5dca8] mb-1">
                📌 آدرس رسمی و تایید شده واریز تتر (TRC-20)
              </h4>
              <p className="font-mono text-[9px] text-[#52f29c] select-all bg-[#051810] p-1.5 rounded border border-[#52f29c]/30 break-all">
                TBMvBiVB6mhu1gnaAAE1Pg5YohKvV1NSnB
              </p>
              <p className="text-[8.5px] text-[#8e8a80] mt-1">
                توجه: واریز تنها از طریق شبکه TRC-20 ترون پشتیبانی می‌شود. پس از ارسال، هش تراکنش (TxHash) را در بخش کیف پول وارد کنید.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[#020b06] border border-[#c8a668]/30">
              <h4 className="font-cinzel text-[8px] font-bold text-[#f5dca8] mb-1">
                ⚖️ کارمزد پلتفرم و محاسبه جوایز (۱۵٪ RAKE)
              </h4>
              <p>
                طبق قوانین بین‌المللی مسابقات، کارمزد پلتفرم برای نگهداری سرور، ضدتقلب و توسعه پایدار برابر با ۱۵٪ از مجموع مبالغ ورودی هر میز است. ۸۵٪ کل استخر به برنده مسابقه پرداخت می‌گردد.
              </p>
            </div>

            <div className="p-2.5 rounded bg-[#020b06] border border-[#c8a668]/30">
              <h4 className="font-cinzel text-[8px] font-bold text-[#f5dca8] mb-1">
                💳 قوانین برداشت وجه (WITHDRAWAL RULES)
              </h4>
              <p>
                حداقل مبلغ برداشت ۵ تتر می‌باشد. به دلیل تدابیر امنیتی و محافظت از دارایی کاربران، برداشت‌ها از طریق صف اعتبارسنجی خودکار در کمتر از ۱ ساعت به آدرس مقصد ارسال می‌شود.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
