import React, { useState, useEffect } from 'react';
import { User, X, Check, Download, LoaderCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { firebaseAuth } from '../services/firebaseClient';
import { downloadStoredFile, type StoredDelivery } from '../services/deliveryStorage';

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
  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [deliveryStatus, setDeliveryStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [activeDownload, setActiveDownload] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setSaved(false);
      const firebaseUser = firebaseAuth.currentUser;
      if (firebaseUser) {
        setDeliveryStatus('loading');
        void firebaseUser.getIdToken().then((token) => fetch('/api/deliveries', {
          headers: { Authorization: `Bearer ${token}` },
        })).then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || 'Could not load downloads.');
          setDeliveries((body.deliveries || []).sort((a: StoredDelivery, b: StoredDelivery) =>
            String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
          setDeliveryStatus('idle');
        }).catch(() => setDeliveryStatus('error'));
      } else {
        setDeliveries([]);
        setDeliveryStatus('idle');
      }
    }
  }, [isOpen, user.name, user.email]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ name: name.trim(), email: email.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const downloadDelivery = async (delivery: StoredDelivery, format: 'wav' | 'mp3') => {
    const path = format === 'wav' ? delivery.wavPath : delivery.mp3Path;
    const filename = path.split('/').pop() || `HDQTRZ_Master.${format}`;
    const key = `${delivery.orderId}:${format}`;
    setActiveDownload(key);
    try {
      await downloadStoredFile(path, filename);
    } finally {
      setActiveDownload('');
    }
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
          <div className="w-12 h-12 rounded-2xl bg-[#1a1710] border border-[#57E6FF]/40 flex items-center justify-center text-[#57E6FF]">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold text-white">Creator Account</h3>
            <p className="text-xs text-neutral-400">Manage your profile and purchased masters</p>
          </div>
        </div>

        {/* Simple pay-per-track pricing status */}
        <div className="p-4 rounded-2xl bg-[#13131c] border border-[#232333] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono-studio">Mastering Service</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm capitalize">
                {user.subscriptionTier === 'admin' ? 'Studio Owner Access' : '$9.99 per mastered track'}
              </span>
              <span className="px-2 py-0.5 rounded bg-[#1e1a12] text-[#57E6FF] text-[10px] font-mono-studio border border-[#57E6FF]/30">
                {user.subscriptionTier === 'admin' ? 'No charge' : 'One-time payment'}
              </span>
            </div>
          </div>
          {user.subscriptionTier !== 'admin' && (
            <button
              onClick={() => {
                onClose();
                onOpenPricing();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#57E6FF] text-black font-semibold text-xs hover:bg-[#e5b83b] transition-colors"
            >
              View Price
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
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white placeholder-neutral-600 focus:outline-none focus:border-[#57E6FF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-neutral-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white placeholder-neutral-600 focus:outline-none focus:border-[#57E6FF]"
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

        <div className="space-y-3 border-t border-[#232333] pt-5">
          <div>
            <h4 className="text-sm font-semibold text-white">Purchased Masters</h4>
            <p className="text-[11px] text-neutral-500">Secure WAV and MP3 downloads saved to this Google account.</p>
          </div>
          {deliveryStatus === 'loading' ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400"><LoaderCircle className="w-4 h-4 animate-spin" /> Loading downloads...</div>
          ) : deliveryStatus === 'error' ? (
            <p className="text-xs text-red-400">Downloads could not be loaded. Close and reopen your account to retry.</p>
          ) : deliveries.length === 0 ? (
            <p className="text-xs text-neutral-500">No purchased masters are saved yet.</p>
          ) : deliveries.map((delivery) => (
            <div key={delivery.orderId} className="p-3 rounded-xl bg-[#13131c] border border-[#232333] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{delivery.title}</p>
                <p className="text-[10px] text-neutral-500">{delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString() : 'Paid master'}</p>
              </div>
              <div className="flex gap-2">
                {(['wav', 'mp3'] as const).map((format) => {
                  const key = `${delivery.orderId}:${format}`;
                  return <button key={format} type="button" disabled={activeDownload === key} onClick={() => void downloadDelivery(delivery, format)} className="px-3 py-2 rounded-lg bg-[#1f1f2e] hover:bg-[#28283d] text-[#57E6FF] text-[10px] font-bold uppercase flex items-center gap-1.5 disabled:opacity-50">
                    <Download className="w-3 h-3" /> {activeDownload === key ? 'Preparing' : format}
                  </button>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
