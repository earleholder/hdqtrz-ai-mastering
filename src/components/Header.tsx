import React from 'react';
import { Disc3, History, Sliders, Activity, User, ExternalLink } from 'lucide-react';

interface HeaderProps {
  activeTab: 'master' | 'history' | 'admin';
  onSelectTab: (tab: 'master' | 'history' | 'admin') => void;
  onOpenHumanStudio: () => void;
  onOpenPricing: () => void;
  onOpenAccount: () => void;
  onOpenLegal: () => void;
  onOpenInstructions: () => void;
  onOpenAdminAuth?: () => void;
  isAdminLoggedIn?: boolean;
  userCredits?: number;
  isProcessing?: boolean;
  currentStep?: 'upload' | 'analysis' | 'preferences' | 'processing' | 'result';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenHumanStudio,
  onOpenPricing,
  onOpenAccount,
  onOpenInstructions,
  onOpenAdminAuth,
  isAdminLoggedIn = false,
  userCredits = 0,
  isProcessing,
  currentStep = 'upload'
}) => {
  const steps = [
    { id: 'upload', label: '01 Upload' },
    { id: 'analysis', label: '02 Analyze' },
    { id: 'preferences', label: '03 Preferences' },
    { id: 'processing', label: '04 Master' },
    { id: 'result', label: '05 Compare' }
  ];

  return (
    <nav className="sticky top-0 z-40 bg-[#173653] border-b border-cyan-100/30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            className="flex items-baseline space-x-2 cursor-pointer select-none group"
            onClick={() => onSelectTab('master')}
          >
            <span className="text-2xl font-bold tracking-tighter text-[#57E6FF] group-hover:text-[#f3d97b] transition-colors">
              HDQTRZ
            </span>
            <span className="text-xs uppercase tracking-widest text-slate-200 font-medium">
              AI Preview
            </span>
          </div>

          {/* Workflow Step Breadcrumbs (Clean Minimalism) */}
          {activeTab === 'master' && (
            <div className="hidden md:flex items-center space-x-5 text-[10px] uppercase tracking-[0.2em] font-medium">
              {steps.map((s) => {
                const isActive = currentStep === s.id;
                return (
                  <span
                    key={s.id}
                    className={`transition-all ${
                      isActive
                        ? 'text-[#57E6FF] border-b border-[#57E6FF] pb-1'
                        : 'text-slate-300'
                    }`}
                  >
                    {s.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Right Navigation & Tools */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* View Tabs */}
            <div className="flex items-center bg-[#1E4263] p-1 rounded-md border border-cyan-100/20">
              <button
                onClick={() => onSelectTab('master')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-all uppercase tracking-wider rounded ${
                  activeTab === 'master'
                    ? 'bg-[#1A1A1A] border border-[#57E6FF] text-[#57E6FF] font-medium'
                    : 'text-slate-200 hover:text-white border border-transparent'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span className="hidden sm:inline">Studio</span>
              </button>

              <button
                onClick={() => onSelectTab('history')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-all uppercase tracking-wider rounded ${
                  activeTab === 'history'
                    ? 'bg-[#1A1A1A] border border-[#57E6FF] text-[#57E6FF] font-medium'
                    : 'text-slate-200 hover:text-white border border-transparent'
                }`}
              >
                <History className="w-3 h-3" />
                <span className="hidden sm:inline">Vault</span>
              </button>

              {/* Admin Tab - Only visible to authenticated studio administrator (Earle Holder) */}
              {isAdminLoggedIn && (
                <button
                  onClick={() => onSelectTab('admin')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-all uppercase tracking-wider rounded ${
                    activeTab === 'admin'
                      ? 'bg-[#1A1A1A] border border-[#57E6FF] text-[#57E6FF] font-medium'
                      : 'text-slate-200 hover:text-white border border-transparent'
                  }`}
                  title="Mastering Admin Console"
                >
                  <Activity className="w-3 h-3 text-[#57E6FF]" />
                  <span className="hidden md:inline text-[#57E6FF]">Admin</span>
                </button>
              )}
            </div>

            {/* Human Studio Upsell */}
            <button
              onClick={onOpenHumanStudio}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 hover:border-cyan-100/30 text-slate-100 hover:text-white text-xs uppercase tracking-wider transition-colors"
            >
              <span>Human Studio</span>
              <ExternalLink className="w-2.5 h-2.5 text-[#57E6FF]" />
            </button>

            {/* Guide & Instructions */}
            <button
              onClick={onOpenInstructions}
              className="text-xs uppercase tracking-wider text-slate-100 hover:text-[#57E6FF] transition-colors px-2 py-1 flex items-center gap-1"
              title="Mastering Instructions & Best Practices"
            >
              <span>Guide</span>
            </button>

            {/* Pricing (for customers) or Unlimited Admin Badge */}
            {isAdminLoggedIn ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A180E] border border-[#57E6FF]/40 text-[#57E6FF] text-[10px] font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57E6FF] animate-pulse" />
                <span>Unlimited Masters</span>
              </div>
            ) : (
              <button
                onClick={onOpenPricing}
                className="hidden sm:inline text-xs uppercase tracking-wider text-slate-200 hover:text-white transition-colors px-2 py-1"
              >
                Pricing
              </button>
            )}

            {/* Account */}
            <button
              onClick={onOpenAccount}
              className={`h-8 w-8 rounded-full border flex items-center justify-center transition-colors ${
                isAdminLoggedIn
                  ? 'bg-[#18150D] border-[#57E6FF] text-[#57E6FF]'
                  : 'bg-[#1A1A1A] border-cyan-100/30 text-slate-100 hover:text-white hover:border-[#57E6FF]/50'
              }`}
              title={isAdminLoggedIn ? 'Earle Holder (Admin - No Charge)' : 'Account & Purchased Masters'}
            >
              <User className="w-3.5 h-3.5" />
            </button>

            {/* Status indicator dot */}
            <div
              className="h-8 w-8 rounded-full bg-[#1A1A1A] border border-cyan-100/30 flex items-center justify-center"
              title={isProcessing ? 'DSP Processing Active' : 'HDQTRZ Engine Ready'}
            >
              <div
                className={`h-2 w-2 rounded-full bg-[#57E6FF] ${
                  isProcessing ? 'animate-ping' : ''
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
