import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { Lock, ShieldCheck, AlertCircle, X, KeyRound } from 'lucide-react';
import { firebaseAuth, googleProvider } from '../services/firebaseClient';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const token = await result.user.getIdToken(true);
      const response = await fetch('/api/admin/session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('This Google account is not authorized for studio administration.');
      onSuccess();
      onClose();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Administrator authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="admin-auth-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0d0d12] border border-white/10 p-6 sm:p-7 shadow-2xl space-y-6">
        <button
          id="admin-auth-close-button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-[#161620] hover:bg-[#222230] text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#16140D] border border-[#D4AF37]/30 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
            <Lock className="w-3 h-3 text-[#D4AF37]" />
            <span>Restricted Access</span>
          </div>
          <h3 className="text-xl font-light text-white tracking-tight">
            Studio Operations Console
          </h3>
          <p className="text-xs text-gray-400 font-light leading-relaxed">
            This console is reserved exclusively for studio administration and DSP engine controls. Please sign in to verify credentials.
          </p>
        </div>

        {error && (
          <div id="admin-auth-error" className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form id="admin-auth-form" onSubmit={handleSubmit} className="space-y-4 text-xs" autoComplete="off">
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              id="admin-auth-cancel-button"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white transition-colors text-xs uppercase tracking-wider"
            >
              Cancel
            </button>

            <button
              id="admin-auth-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C19A2E] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-[#D4AF37]/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 text-black" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span>HDQTRZ Vault Auth v2.4</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3" /> Encrypted Session
          </span>
        </div>
      </div>
    </div>
  );
};
