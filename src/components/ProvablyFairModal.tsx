/**
 * Provably Fair Cryptographic Dice Verifier & Audit Modal
 *
 * Implements HMAC-SHA256 roll audit:
 * 1. Verifies SHA-256(serverSeed) === serverSeedHash commitment
 * 2. Deterministic roll reproduction using rejection sampling
 * 3. Client seed customization and historical roll audit log
 */

import React, { useState } from 'react';
import { auditProvablyFairRoll, VerificationAuditReport } from '../engine/provablyFairVerification';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverSeedHash: string;
  clientSeed: string;
  currentNonce: number;
  revealedServerSeed?: string;
  onUpdateClientSeed: (newSeed: string) => void;
}

export function ProvablyFairModal({
  isOpen,
  onClose,
  serverSeedHash,
  clientSeed,
  currentNonce,
  revealedServerSeed,
  onUpdateClientSeed,
}: ProvablyFairModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'verify' | 'client_seed'>('info');
  const [customSeed, setCustomSeed] = useState<string>(clientSeed);
  const [auditServerSeed, setAuditServerSeed] = useState<string>(revealedServerSeed || '');
  const [auditServerSeedHash, setAuditServerSeedHash] = useState<string>(serverSeedHash || '');
  const [auditClientSeed, setAuditClientSeed] = useState<string>(clientSeed || '');
  const [auditNonce, setAuditNonce] = useState<number>(currentNonce || 1);
  const [auditReport, setAuditReport] = useState<VerificationAuditReport | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    setIsVerifying(true);
    try {
      const res = await auditProvablyFairRoll(
        auditServerSeed,
        auditServerSeedHash,
        auditClientSeed,
        auditNonce
      );
      setAuditReport(res);
    } catch (e: any) {
      alert(`خطا در ممیزی: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-[620px] max-h-[92vh] rounded-xl border border-[#c8a668]/70 bg-gradient-to-b from-[#061911] via-[#04120c] to-[#020a06] p-4 sm:p-5 shadow-2xl flex flex-col text-[#e8dfd0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c8a668]/30 pb-3 mb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.16em] text-[#f5dca8] uppercase">
                PROVABLY FAIR CRYPTOGRAPHIC AUDIT
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#0b291d] border border-[#52f29c]/40 font-cinzel text-[7px] text-[#52f29c] font-bold">
                HMAC-SHA256
              </span>
            </div>
            <p className="font-cormorant text-[10px] text-[#a39e93]">
              سیستم تاس‌های اثبات‌پذیر منصفانه، عدم امکان تقلب و بازرسی ریاضی پرتاب‌ها
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#c8a668] hover:text-white hover:bg-[#c8a668]/20 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#c8a668]/25 mb-3 shrink-0">
          {[
            { id: 'info', label: 'ACTIVE SESSION COMMITMENT' },
            { id: 'verify', label: '1-CLICK ROLL VERIFIER (ممیزی تاس)' },
            { id: 'client_seed', label: 'CHANGE CLIENT SEED' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 font-cinzel text-[8px] font-bold tracking-wider transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'border-[#f5dca8] text-[#f5dca8]'
                  : 'border-transparent text-[#8e8a80] hover:text-[#cbbca0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[8.5px]">
          {activeTab === 'info' && (
            <div className="space-y-3">
              {/* Commitment Box */}
              <div className="p-3 rounded-lg bg-[#020a06] border border-[#c8a668]/35 space-y-2">
                <span className="font-cinzel text-[8px] text-[#8e8a80] block">
                  CURRENT SERVER SEED HASH (تعهد رمزنگاری شده قبل از بازی):
                </span>
                <p className="p-2 rounded bg-black/70 border border-white/10 font-mono text-[8px] text-[#52f29c] break-all select-all">
                  {serverSeedHash || 'd85f8e916a04ef058564bc7a61d15582f3484f9adbe4580231cfb504d602336c'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-cinzel">
                  <div>
                    <span className="text-[#8e8a80] block text-[7px]">CLIENT SEED (کلید شما):</span>
                    <span className="text-[#ffe4a0] font-mono text-[8px]">{clientSeed || 'user-seed-auto'}</span>
                  </div>
                  <div>
                    <span className="text-[#8e8a80] block text-[7px]">CURRENT NONCE (شماره تاس):</span>
                    <span className="text-[#ffe4a0] font-bold text-[8.5px]">#{currentNonce}</span>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="p-3 rounded-lg bg-[#061911]/80 border border-[#c8a668]/20 space-y-1.5 font-cormorant text-[9.5px] text-[#a39e93] leading-relaxed">
                <h4 className="font-cinzel text-[9.5px] text-[#f5dca8] font-bold">
                  چرا این سیستم ۱۰۰٪ غیرقابل تقلب است؟
                </h4>
                <p>
                  <strong>۱. تعهد هش (Commitment):</strong> پیش از پرتاب حتی یک تاس در بازی، سرور هش SHA-256 کلید مخفی خود
                  (Server Seed) را به مرورگر شما می‌فرستد. از آنجا که هش یک‌طرفه است، سرور بعد از شروع بازی نمی‌تواند
                  کلید خود را دستکاری کند؛ هرگونه تغییر در بذر سرور باعث مغایرت در هش تعهد شده خواهد شد.
                </p>
                <p>
                  <strong>۲. نقش شما (Client Seed):</strong> شما می‌توانید هر زمان کلید تصادفی خود را تغییر دهید. نتیجه تاس حاصل
                  ترکیب ریاضی دوطرفه کلید سرور و کلید شماست.
                </p>
                <p>
                  <strong>۳. افشای کلید بعد از پایان مسابقه:</strong> در انتهای بازی، سرور کلید مخفی را آشکار می‌کند تا شما با فرمول
                  HMAC-SHA256 درستی تک‌تک تاس‌ها را حساب و تایید کنید.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div>
                  <label className="font-cinzel text-[7.5px] text-[#8e8a80] block mb-0.5">
                    REVEALED SERVER SEED (بذر آشکارشده سرور):
                  </label>
                  <input
                    type="text"
                    value={auditServerSeed}
                    onChange={(e) => setAuditServerSeed(e.target.value)}
                    placeholder="e.g. 4a2f8b9c..."
                    className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-[#c8a668]/40 font-mono text-[8px] text-[#f5dca8] outline-none"
                  />
                </div>

                <div>
                  <label className="font-cinzel text-[7.5px] text-[#8e8a80] block mb-0.5">
                    UPFRONT COMMITMENT HASH (هش تعهد):
                  </label>
                  <input
                    type="text"
                    value={auditServerSeedHash}
                    onChange={(e) => setAuditServerSeedHash(e.target.value)}
                    placeholder="SHA-256 Commitment Hash"
                    className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-[#c8a668]/40 font-mono text-[8px] text-[#f5dca8] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-cinzel text-[7.5px] text-[#8e8a80] block mb-0.5">
                      CLIENT SEED:
                    </label>
                    <input
                      type="text"
                      value={auditClientSeed}
                      onChange={(e) => setAuditClientSeed(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black/70 border border-[#c8a668]/40 font-mono text-[8px] text-[#f5dca8] outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-cinzel text-[7.5px] text-[#8e8a80] block mb-0.5">
                      NONCE (شماره راند):
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={auditNonce}
                      onChange={(e) => setAuditNonce(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-black/70 border border-[#c8a668]/40 font-mono text-[8px] text-[#f5dca8] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isVerifying || !auditServerSeed || !auditServerSeedHash}
                  onClick={handleRunAudit}
                  className="w-full py-2 rounded brass-button-surface border border-[#ead4a4]/80 font-cinzel text-[8.5px] font-bold text-[#140e05] cursor-pointer mt-2 transition-transform active:scale-[0.99]"
                >
                  {isVerifying ? 'VERIFYING VIA WEB CRYPTO...' : 'AUDIT & VERIFY DETERMINISTIC DICE'}
                </button>
              </div>

              {/* Audit Result Display */}
              {auditReport && (
                <div
                  className={`p-3 rounded-lg border space-y-1.5 font-cinzel ${
                    auditReport.isValid
                      ? 'bg-[#0b291d] border-[#52f29c]'
                      : 'bg-[#2b100d] border-[#f87171]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[9px] text-white">
                      {auditReport.isValid ? '✓ AUDIT PASSED: 100% PROVABLY FAIR' : '✕ AUDIT FAILED'}
                    </span>
                    <span className="text-[11px] font-bold text-[#ffe4a0]">
                      DICE: [{auditReport.calculatedDice[0]}, {auditReport.calculatedDice[1]}]
                    </span>
                  </div>
                  <p className="font-cormorant text-[9.5px] text-[#e8dfd0]">{auditReport.message}</p>
                  <div className="pt-1 border-t border-white/10 font-mono text-[7px] text-[#a39e93] break-all">
                    HMAC-SHA256: {auditReport.hmacSignatureHex}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'client_seed' && (
            <div className="space-y-3">
              <p className="font-cormorant text-[9.5px] text-[#a39e93]">
                می‌توانید کلمه یا عبارت شانس خود را به عنوان Client Seed وارد کنید تا در تولید تمام تاس‌های بعدی دخیل شود:
              </p>
              <div>
                <label className="font-cinzel text-[7.5px] text-[#8e8a80] block mb-1">
                  ENTER CUSTOM CLIENT SEED:
                </label>
                <input
                  type="text"
                  value={customSeed}
                  onChange={(e) => setCustomSeed(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/70 border border-[#c8a668]/50 font-mono text-[9px] text-[#52f29c] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdateClientSeed(customSeed);
                  alert('کلید کاربری شما با موفقیت به روز شد!');
                }}
                className="px-4 py-1.5 rounded brass-button-surface border border-[#ead4a4]/80 font-cinzel text-[8.5px] font-bold text-[#140e05] cursor-pointer"
              >
                APPLY NEW CLIENT SEED
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
