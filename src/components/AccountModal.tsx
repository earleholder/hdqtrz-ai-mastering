import React, { useState, useEffect } from 'react';
import { User, X, Shield, Key, CreditCard, Sparkles, Check } from 'lucide-react';
import { UserProfile } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (user: Partial<UserProfile>) => void;
  onOpenPricing: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onOpenPricing
}) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setSaved(false);
    }
  }, [isOpen, user.name, user.email]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ name: name.trim(), email: email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0d0d14] border border-[#2e2e42] p-6 sm:p-8 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-[#171722] hover:bg-[#202030] text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#1a1710] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">Creator Account</h3>
            <p className="text-xs text-neutral-400">Manage your credentials, subscription, and credits</p>
          </div>
        </div>

        {/* Plan / Subscription Status Banner */}
        <div className="p-4 rounded-2xl bg-[#13131c] border border-[#232333] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono-studio">Current Tier</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm capitalize">
                {user.subscriptionTier === 'admin' ? 'Studio Owner (Admin)' : `${user.subscriptionTier} Plan`}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1e1a12] text-[#d4af37] text-[10px] font-mono-studio border border-[#d4af37]/30">
                {user.subscriptionTier === 'admin' ? 'Unlimited Masters' : `${user.creditsRemaining} credits left`}
              </span>
            </div>
          </div>
          {user.subscriptionTier !== 'admin' && (
            <button
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-black font-semibold text-xs hover:bg-[#e5b83b] transition-colors"
            >
              Upgrade Plan
            </button>
          )}
        </div>

        {/* Profile Details Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-neutral-400">Display Name / Producer Alias</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Artist / Producer Alias"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white placeholder-neutral-600 focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white placeholder-neutral-600 focus:outline-none focus:border-[#d4af37]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saved ? (
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Profile Updated</span>
              </span>
            ) : <div />}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1f1f2e] hover:bg-[#28283d] border border-[#35354f] text-white font-semibold text-xs transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
