import React, { useState, useEffect, useCallback } from 'react';
import { RoyalCrownIcon } from './RoyalIcons';
import { royalSound } from '../libgdx/Gdx3DEngine';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'treasury' | 'users' | 'ledger' | 'withdrawals' | 'support' | 'rooms'>('treasury');

  // Admin Data State
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User balance adjustment state
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<any | null>(null);
  const [balanceDelta, setBalanceDelta] = useState('');
  const [balanceNote, setBalanceNote] = useState('');

  // Support Reply State
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Withdrawal action state
  const [withdrawTxHashInput, setWithdrawTxHashInput] = useState<Record<string, string>>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        royalSound.playVictoryFanfareSound();
        setIsAuthenticated(true);
        loadAdminData();
      } else {
        setPinError('رمز ورود ادمین نادرست است.');
      }
    } catch {
      setPinError('خطا در برقراری ارتباط با سرور مدیریت.');
    }
  };

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ovRes, uRes, lRes, wRes, tRes, rRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/users'),
        fetch('/api/admin/ledger'),
        fetch('/api/admin/withdrawals'),
        fetch('/api/admin/support'),
        fetch('/api/admin/rooms'),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (lRes.ok) setLedger(await lRes.json());
      if (wRes.ok) setWithdrawals(await wRes.json());
      if (tRes.ok) setTickets(await tRes.json());
      if (rRes.ok) setRooms(await rRes.json());
    } catch (err) {
      console.warn('Failed to fetch admin data', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAdminData();
      const interval = setInterval(loadAdminData, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isAuthenticated, loadAdminData]);

  if (!isOpen) return null;

  const handleAdjustBalance = async () => {
    if (!selectedUserForBalance || !balanceDelta) return;
    const delta = parseFloat(balanceDelta);
    if (isNaN(delta) || delta === 0) return;

    try {
      const res = await fetch('/api/admin/users/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForBalance.id,
          deltaAmount: delta,
          note: balanceNote.trim() || 'تغییر دستی توسط مدیر سیستم',
        }),
      });
      if (res.ok) {
        royalSound.playOptionClickSound();
        setActionAlert({ type: 'success', message: `موجودی کاربر ${selectedUserForBalance.username} با موفقیت به‌روزرسانی شد.` });
        setSelectedUserForBalance(null);
        setBalanceDelta('');
        setBalanceNote('');
        loadAdminData();
      }
    } catch {
      setActionAlert({ type: 'error', message: 'خطا در ثبت تغییر موجودی.' });
    }
  };

  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    try {
      const res = await fetch('/api/admin/users/toggle-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          banned: !currentBanned,
          reason: !currentBanned ? 'مسدودسازی توسط مدیریت به دلیل تخلف' : '',
        }),
      });
      if (res.ok) {
        royalSound.playOptionClickSound();
        setActionAlert({ type: 'success', message: !currentBanned ? 'کاربر مسدود شد.' : 'مسدودیت کاربر برطرف شد.' });
        loadAdminData();
      }
    } catch {
      setActionAlert({ type: 'error', message: 'خطا در اعمال وضعیت کاربر.' });
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, action: 'approve' | 'reject') => {
    const txHash = withdrawTxHashInput[withdrawalId] || '';
    try {
      const res = await fetch('/api/admin/withdrawals/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId,
          action,
          adminTxHash: txHash,
        }),
      });
      if (res.ok) {
        royalSound.playOptionClickSound();
        setActionAlert({
          type: 'success',
          message: action === 'approve' ? 'درخواست برداشت تایید و در دفتر کل ثبت شد.' : 'درخواست رد شد و مبلغ به کیف پول کاربر بازگشت.',
        });
        loadAdminData();
      }
    } catch {
      setActionAlert({ type: 'error', message: 'خطا در پردازش درخواست برداشت.' });
    }
  };

  const handleSendTicketReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch('/api/admin/support/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          reply: replyText.trim(),
        }),
      });
      if (res.ok) {
        royalSound.playOptionClickSound();
        setActionAlert({ type: 'success', message: 'پاسخ تیکت با موفقیت ارسال گردید.' });
        setReplyTicketId(null);
        setReplyText('');
        loadAdminData();
      }
    } catch {
      setActionAlert({ type: 'error', message: 'خطا در ارسال پاسخ تیکت.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-fade-in text-[#e8dfd0]">
      <div className="relative w-full max-w-[620px] max-h-[94vh] rounded-xl border border-[#c8a668] bg-gradient-to-b from-[#091a12] via-[#04120a] to-[#010804] p-4 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-2.5 mb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <RoyalCrownIcon className="w-5 h-4 text-[#f5dca8]" />
            <div>
              <h2 className="font-cinzel text-[11.5px] font-bold tracking-[0.18em] text-[#f5dca8] uppercase">
                👑 پنل مدیریت مستقل و سیستم حسابداری سلطنتی
              </h2>
              <p className="font-cormorant text-[9.5px] text-[#a39e93]">
                کنترل کامل بازیکنان، خزانه‌داری ۱۵٪ کارمزد، مانیتورینگ بازی‌ها و دفتر کل
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

        {/* PIN Security Check if not authenticated */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full border border-[#c8a668]/60 bg-[#020b06] flex items-center justify-center mb-3 shadow-lg">
              <span className="text-xl">🔒</span>
            </div>
            <h3 className="font-cinzel text-[11px] font-bold text-[#f5dca8] mb-1">
              ورود امن به پنل مدیریت بازی
            </h3>
            <p className="font-cormorant text-[10px] text-[#8e8a80] max-w-[320px] mb-4">
              لطفاً پین‌کد مدیریت سیستم را وارد کنید. (پیش‌فرض: royal777)
            </p>

            <form onSubmit={handleLogin} className="w-full max-w-[260px] flex flex-col gap-2">
              <input
                type="password"
                placeholder="رمز عبور مدیریت (PIN)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full h-[32px] px-3 rounded bg-[#020a06] border border-[#c8a668]/60 text-center font-mono text-[12px] text-[#52f29c] tracking-widest focus:outline-none focus:border-[#52f29c]"
              />
              {pinError && (
                <span className="text-[9px] font-cormorant text-[#f56565] block">{pinError}</span>
              )}
              <button
                type="submit"
                className="w-full h-[30px] rounded brass-button-surface font-cinzel text-[8.5px] font-bold text-[#140e05] tracking-wider cursor-pointer hover:brightness-110 active:scale-95 transition-all mt-1"
              >
                تایید و ورود به پنل
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Admin Tabs */}
            <div className="flex items-center justify-between border-b border-[#c8a668]/20 pb-2 mb-2.5 shrink-0 overflow-x-auto gap-1">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    royalSound.playOptionClickSound();
                    setActiveTab('treasury');
                  }}
                  className={`px-2.5 py-1 rounded font-cinzel text-[8px] font-bold tracking-wider cursor-pointer transition-all ${
                    activeTab === 'treasury'
                      ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c]'
                      : 'text-[#8e8a80] hover:text-[#d0c7b6]'
                  }`}
                >
                  💰 خزانه و کارمزد ۱۵٪
                </button>
                <button
                  type="button"
                  onClick={() => {
                    royalSound.playOptionClickSound();
                    setActiveTab('users');
                  }}
                  className={`px-2.5 py-1 rounded font-cinzel text-[8px] font-bold tracking-wider cursor-pointer transition-all ${
                    activeTab === 'users'
                      ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c]'
                      : 'text-[#8e8a80] hover:text-[#d0c7b6]'
                  }`}
                >
                  👥 کاربران ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    royalSound.playOptionClickSound();
                    setActiveTab('ledger');
                  }}
                  className={`px-2.5 py-1 rounded font-cinzel text-[8px] font-bold tracking-wider cursor-pointer transition-all ${
                    activeTab === 'ledger'
                      ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c]'
                      : 'text-[#8e8a80] hover:text-[#d0c7b6]'
                  }`}
                >
                  📑 دفتر کل حسابداری
                </button>
                <button
                  type="button"
                  onClick={() => {
                    royalSound.playOptionClickSound();
                    setActiveTab('withdrawals');
                  }}
                  className={`px-2.5 py-1 rounded font-cinzel text-[8px] font-bold tracking-wider cursor-pointer transition-all ${
                    activeTab === 'withdrawals'
                      ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c]'
                      : 'text-[#8e8a80] hover:text-[#d0c7b6]'
                  }`}
                >
                  💳 برداشت‌ها ({withdrawals.filter((w) => w.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    royalSound.playOptionClickSound();
                    setActiveTab('support');
                  }}
                  className={`px-2.5 py-1 rounded font-cinzel text-[8px] font-bold tracking-wider cursor-pointer transition-all ${
                    activeTab === 'support'
                      ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c]'
                      : 'text-[#8e8a80] hover:text-[#d0c7b6]'
                  }`}
                >
                  🎧 تیکت‌ها ({tickets.filter((t) => t.status === 'open').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    royalSound.playOptionClickSound();
                    setActiveTab('rooms');
                  }}
                  className={`px-2.5 py-1 rounded font-cinzel text-[8px] font-bold tracking-wider cursor-pointer transition-all ${
                    activeTab === 'rooms'
                      ? 'bg-[#0f3422] border border-[#52f29c]/60 text-[#52f29c]'
                      : 'text-[#8e8a80] hover:text-[#d0c7b6]'
                  }`}
                >
                  🎲 میزهای فعال ({rooms.length})
                </button>
              </div>

              <button
                type="button"
                onClick={loadAdminData}
                className="px-2 py-0.5 rounded bg-[#0b2417] border border-[#c8a668]/40 hover:bg-[#123824] text-[#e3c485] font-cinzel text-[7px] cursor-pointer shrink-0"
              >
                🔄 {isLoading ? 'در حال همگام‌سازی...' : 'بروزرسانی'}
              </button>
            </div>

            {/* Alert banner */}
            {actionAlert && (
              <div
                className={`px-3 py-1.5 rounded mb-2 text-[9px] font-cormorant flex items-center justify-between ${
                  actionAlert.type === 'success'
                    ? 'bg-[#072416] border border-[#52f29c]/50 text-[#72f2b3]'
                    : 'bg-[#2a0e0e] border border-[#f56565]/50 text-[#fed7d7]'
                }`}
              >
                <span>{actionAlert.message}</span>
                <button type="button" onClick={() => setActionAlert(null)} className="text-xs font-bold px-1">
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: TREASURY & 15% RAKE ACCOUNTING */}
            {activeTab === 'treasury' && (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0 text-[#e8dfd0]">
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#062416] to-[#021009] border border-[#52f29c]/50 shadow-md">
                    <span className="font-cinzel text-[7px] text-[#a39e93] block">
                      سود خالص کارمزد ۱۵٪ (TOTAL RAKE)
                    </span>
                    <span className="font-cinzel text-[16px] font-extrabold text-[#52f29c] tabular-nums block mt-0.5">
                      {overview?.treasuryStats?.totalRakeCollectedUsdt?.toFixed(2) ?? '0.00'} USDT
                    </span>
                    <span className="font-cormorant text-[8px] text-[#8e8a80]">
                      کسر خودکار ۱۵٪ از تمامی میزها
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#1c1809] to-[#090802] border border-[#c8a668]/50 shadow-md">
                    <span className="font-cinzel text-[7px] text-[#a39e93] block">
                      گردش مالی کل مسابقات
                    </span>
                    <span className="font-cinzel text-[16px] font-extrabold text-[#f5dca8] tabular-nums block mt-0.5">
                      {overview?.treasuryStats?.totalVolumeTurnoverUsdt?.toFixed(2) ?? '0.00'} USDT
                    </span>
                    <span className="font-cormorant text-[8px] text-[#8e8a80]">
                      مجموع مبالغ ورودی استخرهای بازی
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-[#091522] to-[#030910] border border-[#63b3ed]/40 shadow-md">
                    <span className="font-cinzel text-[7px] text-[#a39e93] block">
                      مجموع واریزی‌ها (DEPOSITS)
                    </span>
                    <span className="font-cinzel text-[16px] font-extrabold text-[#63b3ed] tabular-nums block mt-0.5">
                      {overview?.treasuryStats?.totalDepositedUsdt?.toFixed(2) ?? '0.00'} USDT
                    </span>
                    <span className="font-cormorant text-[8px] text-[#8e8a80]">
                      تتر وارد شده به خزانه پلتفرم
                    </span>
                  </div>
                </div>

                {/* Second Row KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-[#020b06] border border-[#c8a668]/30">
                    <span className="font-cinzel text-[6.5px] text-[#8e8a80] block">
                      کل برداشت‌های تسویه‌شده
                    </span>
                    <span className="font-cinzel text-[12px] font-bold text-[#f6ad55] tabular-nums">
                      {overview?.treasuryStats?.totalWithdrawnUsdt?.toFixed(2) ?? '0.00'} USDT
                    </span>
                  </div>

                  <div className="p-2 rounded bg-[#020b06] border border-[#c8a668]/30">
                    <span className="font-cinzel text-[6.5px] text-[#8e8a80] block">
                      برداشت‌های در انتظار تایید
                    </span>
                    <span className="font-cinzel text-[12px] font-bold text-[#fc8181] tabular-nums">
                      {overview?.treasuryStats?.totalPendingWithdrawalsUsdt?.toFixed(2) ?? '0.00'} USDT
                    </span>
                  </div>

                  <div className="p-2 rounded bg-[#020b06] border border-[#c8a668]/30">
                    <span className="font-cinzel text-[6.5px] text-[#8e8a80] block">
                      مجموع دارایی کاربران نزد بازی
                    </span>
                    <span className="font-cinzel text-[12px] font-bold text-[#52f29c] tabular-nums">
                      {overview?.treasuryStats?.totalUsersBalanceUsdt?.toFixed(2) ?? '0.00'} USDT
                    </span>
                  </div>
                </div>

                {/* 15% Rake Breakdown Table */}
                <div className="rounded-lg bg-[#020a06] border border-[#c8a668]/40 p-2.5">
                  <h4 className="font-cinzel text-[8.5px] font-bold text-[#f5dca8] mb-2 flex items-center justify-between">
                    <span>جدول رسمی محاسبه کارمزد ۱۵٪ در ۵ سطح مسابقات</span>
                    <span className="text-[7.5px] text-[#52f29c]">تضمین ۱۰۰٪ تراز مالی بدون روزنه</span>
                  </h4>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[7.5px] font-cinzel">
                    <div className="p-1.5 rounded bg-[#071911] border border-[#cd7f32]/40">
                      <span className="block text-[#cd7f32] font-bold">سطح ۱ (۱ تتر)</span>
                      <span className="block text-[#ccc] mt-0.5">مجموع پات: ۲.۰ USDT</span>
                      <span className="block text-[#52f29c] font-bold">کارمزد ۱۵٪: ۰.۳۰$</span>
                      <span className="block text-[#f5dca8]">جایزه برنده: ۱.۷۰$</span>
                    </div>

                    <div className="p-1.5 rounded bg-[#071911] border border-[#c0c0c0]/40">
                      <span className="block text-[#c0c0c0] font-bold">سطح ۲ (۲ تتر)</span>
                      <span className="block text-[#ccc] mt-0.5">مجموع پات: ۴.۰ USDT</span>
                      <span className="block text-[#52f29c] font-bold">کارمزد ۱۵٪: ۰.۶۰$</span>
                      <span className="block text-[#f5dca8]">جایزه برنده: ۳.۴۰$</span>
                    </div>

                    <div className="p-1.5 rounded bg-[#071911] border border-[#e5c158]/40">
                      <span className="block text-[#e5c158] font-bold">سطح ۳ (۵ تتر)</span>
                      <span className="block text-[#ccc] mt-0.5">مجموع پات: ۱۰.۰ USDT</span>
                      <span className="block text-[#52f29c] font-bold">کارمزد ۱۵٪: ۱.۵۰$</span>
                      <span className="block text-[#f5dca8]">جایزه برنده: ۸.۵۰$</span>
                    </div>

                    <div className="p-1.5 rounded bg-[#071911] border border-[#9ae6b4]/40">
                      <span className="block text-[#9ae6b4] font-bold">سطح ۴ (۱۰ تتر)</span>
                      <span className="block text-[#ccc] mt-0.5">مجموع پات: ۲۰.۰ USDT</span>
                      <span className="block text-[#52f29c] font-bold">کارمزد ۱۵٪: ۳.۰۰$</span>
                      <span className="block text-[#f5dca8]">جایزه برنده: ۱۷.۰۰$</span>
                    </div>

                    <div className="p-1.5 rounded bg-[#071911] border border-[#f6ad55]/40">
                      <span className="block text-[#f6ad55] font-bold">سطح ۵ (لیگ ۱۰ نفره)</span>
                      <span className="block text-[#ccc] mt-0.5">ورودی کل: ۲۵۰ USDT</span>
                      <span className="block text-[#52f29c] font-bold">کارمزد ۱۵٪: ۳۷.۵۰$</span>
                      <span className="block text-[#f5dca8]">جوایز: ۲۱۲.۵۰$</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USERS MANAGEMENT */}
            {activeTab === 'users' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                {selectedUserForBalance && (
                  <div className="p-2.5 rounded-lg bg-[#0a2318] border border-[#52f29c]/60 mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-cinzel text-[8.5px] font-bold text-[#52f29c]">
                        تغییر موجودی کاربر: {selectedUserForBalance.username} (موجودی فعلی: {selectedUserForBalance.usdtBalance} USDT)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedUserForBalance(null)}
                        className="text-xs text-[#8e8a80] hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="مقدار به تتر (مثال: +10 یا -5)"
                        value={balanceDelta}
                        onChange={(e) => setBalanceDelta(e.target.value)}
                        className="h-[28px] px-2 rounded bg-[#020b06] border border-[#c8a668]/40 text-[#52f29c] font-mono text-[10px]"
                      />
                      <input
                        type="text"
                        placeholder="دلیل و شماره سند حسابداری"
                        value={balanceNote}
                        onChange={(e) => setBalanceNote(e.target.value)}
                        className="h-[28px] px-2 rounded bg-[#020b06] border border-[#c8a668]/40 text-[#f5dca8] font-cormorant text-[10px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForBalance(null)}
                        className="px-2.5 py-1 rounded bg-[#181a19] text-[#8e8a80] text-[8px] font-cinzel"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={handleAdjustBalance}
                        className="px-3 py-1 rounded brass-button-surface text-[#140e05] font-cinzel text-[8px] font-bold"
                      >
                        ثبت تغییر و ایجاد سند رسمی
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="p-2 rounded bg-[#020a06] border border-[#c8a668]/30 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-cinzel text-[9px] font-bold text-[#f5dca8] truncate">
                            {u.username}
                          </span>
                          <span className="text-[7px] font-cinzel px-1.5 py-0.2 rounded bg-[#081a12] border border-[#52f29c]/40 text-[#52f29c]">
                            LVL {u.level} • {u.rating} ELO
                          </span>
                          {u.isBanned && (
                            <span className="text-[6.5px] font-cinzel px-1.5 py-0.2 rounded bg-[#381111] border border-[#f56565]/60 text-[#fed7d7]">
                              مسدود (BANNED)
                            </span>
                          )}
                        </div>
                        <div className="font-cormorant text-[8.5px] text-[#8e8a80] flex items-center gap-2 mt-0.5">
                          <span>شناسه: {u.id}</span>
                          <span>برد/باخت: {u.wins}/{u.losses}</span>
                          <span>موجودی: <strong className="text-[#52f29c] font-cinzel font-bold">{u.usdtBalance.toFixed(2)} USDT</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForBalance(u);
                            setBalanceDelta('');
                          }}
                          className="px-2 py-1 rounded bg-[#0c2a1c] border border-[#52f29c]/40 hover:bg-[#143d2a] text-[#52f29c] font-cinzel text-[7px] font-bold cursor-pointer"
                        >
                          تغییر موجودی
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBan(u.id, Boolean(u.isBanned))}
                          className={`px-2 py-1 rounded font-cinzel text-[7px] font-bold cursor-pointer ${
                            u.isBanned
                              ? 'bg-[#183624] text-[#72f2b3] border border-[#52f29c]/40'
                              : 'bg-[#2e1313] text-[#fc8181] border border-[#f56565]/40 hover:bg-[#3d1818]'
                          }`}
                        >
                          {u.isBanned ? 'رفع مسدودیت' : 'مسدود کردن'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: FINANCIAL AUDIT LEDGER */}
            {activeTab === 'ledger' && (
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 text-[8px] font-mono">
                <div className="flex items-center justify-between text-[#8e8a80] font-cinzel text-[7px] px-2 py-1 border-b border-[#c8a668]/30">
                  <span>زمان / کاربر</span>
                  <span>نوع تراکنش</span>
                  <span>مبلغ</span>
                  <span>تراز حساب</span>
                </div>
                {ledger.length === 0 ? (
                  <div className="text-center py-8 font-cormorant text-[#8e8a80] text-xs">
                    هنوز تراکنشی در دفتر کل ثبت نشده است.
                  </div>
                ) : (
                  ledger.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-1.5 rounded bg-[#020a06] border border-[#c8a668]/15 flex items-center justify-between text-[#ddd4c4]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#8e8a80]">{rec.dateIso?.slice(11, 19)}</span>
                          <span className="font-bold text-[#f5dca8] truncate max-w-[100px]">{rec.username}</span>
                        </div>
                        <span className="font-cormorant text-[7.5px] text-[#8e8a80] block truncate">
                          {rec.description}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold block ${
                            rec.amountUsdt > 0 ? 'text-[#52f29c]' : 'text-[#fc8181]'
                          }`}
                        >
                          {rec.amountUsdt > 0 ? `+${rec.amountUsdt}` : rec.amountUsdt} USDT
                        </span>
                        <span className="text-[6.5px] text-[#8e8a80]">
                          مانده: {rec.balanceAfter?.toFixed(2)} USDT
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: WITHDRAWALS QUEUE */}
            {activeTab === 'withdrawals' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-8 font-cormorant text-[#8e8a80] text-xs">
                    هیچ درخواست برداشتی در صف وجود ندارد.
                  </div>
                ) : (
                  withdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded bg-[#020a06] border border-[#c8a668]/30 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-cinzel text-[9.5px] font-bold text-[#f5dca8]">
                            {w.amountUsdt} USDT
                          </span>
                          <span className="text-[7px] font-cinzel px-1.5 py-0.2 rounded bg-[#081a12] border border-[#52f29c]/40 text-[#52f29c]">
                            {w.network}
                          </span>
                          <span
                            className={`text-[7px] font-cinzel px-1.5 py-0.2 rounded ${
                              w.status === 'pending'
                                ? 'bg-[#3b2a09] text-[#f6e05e]'
                                : w.status === 'approved'
                                ? 'bg-[#0d2e1b] text-[#52f29c]'
                                : 'bg-[#361313] text-[#fc8181]'
                            }`}
                          >
                            {w.status === 'pending' ? 'در انتظار بررسی' : w.status === 'approved' ? 'تسویه شد' : 'رد شد'}
                          </span>
                        </div>
                        <div className="font-cormorant text-[8.5px] text-[#a39e93] mt-0.5">
                          <span>کاربر: <strong>{w.username}</strong></span> • 
                          <span className="font-mono text-[8px] text-[#e3c485] ml-1 select-all">{w.destinationAddress}</span>
                        </div>
                      </div>

                      {w.status === 'pending' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="text"
                            placeholder="هش تراکنش (اختیاری)"
                            value={withdrawTxHashInput[w.id] || ''}
                            onChange={(e) =>
                              setWithdrawTxHashInput({
                                ...withdrawTxHashInput,
                                [w.id]: e.target.value,
                              })
                            }
                            className="w-[110px] h-[26px] px-1.5 rounded bg-[#04120a] border border-[#c8a668]/30 font-mono text-[8px] text-[#52f29c]"
                          />
                          <button
                            type="button"
                            onClick={() => handleProcessWithdrawal(w.id, 'approve')}
                            className="px-2 py-1 rounded bg-[#0c2a1c] border border-[#52f29c]/50 text-[#52f29c] font-cinzel text-[7.5px] font-bold hover:bg-[#123826] cursor-pointer"
                          >
                            تایید و پرداخت
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProcessWithdrawal(w.id, 'reject')}
                            className="px-2 py-1 rounded bg-[#2a1010] border border-[#f56565]/50 text-[#fc8181] font-cinzel text-[7.5px] font-bold hover:bg-[#381616] cursor-pointer"
                          >
                            رد و عودت
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: SUPPORT TICKETS */}
            {activeTab === 'support' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                {tickets.length === 0 ? (
                  <div className="text-center py-8 font-cormorant text-[#8e8a80] text-xs">
                    تیکتی برای بررسی وجود ندارد.
                  </div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded bg-[#020a06] border border-[#c8a668]/30 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-cinzel text-[9px] font-bold text-[#f5dca8]">{t.subject}</span>
                          <span className="text-[7px] font-cinzel text-[#8e8a80]">از {t.username}</span>
                        </div>
                        <span
                          className={`text-[7px] font-cinzel px-1.5 py-0.2 rounded ${
                            t.status === 'open' ? 'bg-[#3b2a09] text-[#f6e05e]' : 'bg-[#0d2e1b] text-[#52f29c]'
                          }`}
                        >
                          {t.status === 'open' ? 'باز' : 'پاسخ داده شد'}
                        </span>
                      </div>

                      <p className="font-cormorant text-[9.5px] text-[#ccc] bg-[#04120a] p-2 rounded border border-[#c8a668]/15">
                        {t.message}
                      </p>

                      {t.adminReply && (
                        <div className="p-1.5 rounded bg-[#051c11] border border-[#52f29c]/40 text-[#72f2b3] text-[8.5px] font-cormorant">
                          <strong>پاسخ شما:</strong> {t.adminReply}
                        </div>
                      )}

                      {replyTicketId === t.id ? (
                        <div className="mt-1 flex flex-col gap-1.5">
                          <textarea
                            rows={2}
                            placeholder="متن پاسخ خود به کاربر را تایپ کنید..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full p-2 rounded bg-[#04120a] border border-[#52f29c]/50 text-[#f5dca8] font-cormorant text-[10px]"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReplyTicketId(null)}
                              className="px-2 py-0.5 rounded bg-[#181a19] text-[#8e8a80] text-[7.5px] font-cinzel"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendTicketReply(t.id)}
                              className="px-3 py-0.5 rounded brass-button-surface text-[#140e05] font-cinzel text-[7.5px] font-bold"
                            >
                              ارسال پاسخ به کاربر
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyTicketId(t.id);
                              setReplyText('');
                            }}
                            className="px-2.5 py-1 rounded bg-[#0c2a1c] border border-[#52f29c]/40 text-[#52f29c] font-cinzel text-[7.5px] font-bold cursor-pointer"
                          >
                            ✍️ پاسخ به این تیکت
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 6: ACTIVE ROOMS */}
            {activeTab === 'rooms' && (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                {rooms.length === 0 ? (
                  <div className="text-center py-8 font-cormorant text-[#8e8a80] text-xs">
                    در حال حاضر هیچ مسابقه آنلاینی در جریان نیست.
                  </div>
                ) : (
                  rooms.map((r) => (
                    <div
                      key={r.roomId}
                      className="p-2.5 rounded bg-[#020a06] border border-[#c8a668]/30 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-cinzel text-[9.5px] font-bold text-[#f5dca8]">
                            سطح {r.tierId} • ورودی {r.entryFeeUsdt} USDT
                          </span>
                          <span className="text-[7px] font-cinzel text-[#52f29c] bg-[#072416] px-1.5 py-0.2 rounded border border-[#52f29c]/40">
                            جایزه برنده: {r.prizePoolUsdt} USDT
                          </span>
                        </div>
                        <div className="font-cormorant text-[9.5px] text-[#ccc] mt-0.5">
                          سفید: <strong>{r.playerLight?.user?.username}</strong> vs سیاه: <strong>{r.playerDark?.user?.username}</strong>
                        </div>
                      </div>
                      <span className="font-mono text-[7px] text-[#8e8a80]">{r.roomId}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
