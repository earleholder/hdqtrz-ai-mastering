import React, { useCallback, useEffect, useState } from 'react';
import { Check, Sparkles, X, ShieldCheck, LogIn, LoaderCircle, RefreshCw } from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { firebaseAuth as auth, googleProvider } from '../services/firebaseClient';

type CheckoutState = 'idle' | 'signing-in' | 'creating' | 'pending' | 'verifying' | 'unlocking' | 'error';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planName: string) => void;
  trackToUnlock?: {
    id: string;
    recordId: string;
    title: string;
    duration: number;
    genre: string;
  } | null;
  userCredits?: number;
  onUseCredit?: () => void;
  onPaymentUnlocked?: (recordId: string) => void;
  isAdminLoggedIn?: boolean;
}

async function authenticatedJson<T>(user: User, input: string, init?: RequestInit): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'The payment service is unavailable.');
  return body as T;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  trackToUnlock,
  onUseCredit,
  onPaymentUnlocked,
  isAdminLoggedIn = false,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle');
  const [error, setError] = useState('');

  const storageKey = trackToUnlock ? `hdqtrz_pending_order:${trackToUnlock.id}` : '';

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setFirebaseUser(user);
    setAuthReady(true);
  }), []);

  const finishPaidOrder = useCallback(async (user: User, orderId: string) => {
    if (!trackToUnlock || !onPaymentUnlocked) return;
    setCheckoutState('unlocking');
    const result = await authenticatedJson<{ unlocked: boolean; trackId: string }>(
      user,
      `/api/orders/${encodeURIComponent(orderId)}/consume`,
      { method: 'POST', body: JSON.stringify({ trackId: trackToUnlock.id }) },
    );
    if (!result.unlocked || result.trackId !== trackToUnlock.id) throw new Error('The paid order did not match this track.');
    sessionStorage.removeItem(storageKey);
    onPaymentUnlocked(trackToUnlock.recordId);
  }, [onPaymentUnlocked, storageKey, trackToUnlock]);

  const checkPayment = useCallback(async () => {
    if (!firebaseUser || !trackToUnlock || !storageKey) return;
    const orderId = sessionStorage.getItem(storageKey);
    if (!orderId) return;
    setError('');
    setCheckoutState('verifying');
    try {
      const status = await authenticatedJson<{ status: string; trackId: string }>(
        firebaseUser,
        `/api/orders/${encodeURIComponent(orderId)}/status`,
      );
      if (status.trackId !== trackToUnlock.id) throw new Error('This payment belongs to a different track.');
      if (status.status === 'paid' || status.status === 'consumed') {
        await finishPaidOrder(firebaseUser, orderId);
      } else {
        setCheckoutState('pending');
      }
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Could not verify payment.');
      setCheckoutState('error');
    }
  }, [firebaseUser, finishPaidOrder, storageKey, trackToUnlock]);

  useEffect(() => {
    if (!isOpen || !firebaseUser || !storageKey || !sessionStorage.getItem(storageKey)) return;
    void checkPayment();
    const onFocus = () => void checkPayment();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkPayment, firebaseUser, isOpen, storageKey]);

  const signIn = async () => {
    setError('');
    setCheckoutState('signing-in');
    try {
      await signInWithPopup(auth, googleProvider);
      setCheckoutState('idle');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google Sign-In failed.');
      setCheckoutState('error');
    }
  };

  const startCheckout = async () => {
    if (!firebaseUser || !trackToUnlock) return;
    setError('');
    setCheckoutState('creating');
    try {
      const order = await authenticatedJson<{ orderId: string; checkoutUrl: string }>(
        firebaseUser,
        '/api/orders',
        { method: 'POST', body: JSON.stringify({ trackId: trackToUnlock.id }) },
      );
      sessionStorage.setItem(storageKey, order.orderId);
      setCheckoutState('pending');
      const checkoutWindow = window.open(order.checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!checkoutWindow) throw new Error('Please allow pop-ups so Stripe Checkout can open.');
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Could not start checkout.');
      setCheckoutState('error');
    }
  };

  if (!isOpen) return null;
  const busy = ['signing-in', 'creating', 'verifying', 'unlocking'].includes(checkoutState);
  const hasPendingOrder = Boolean(storageKey && sessionStorage.getItem(storageKey));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-xl bg-[#0A0A0A] border border-white/10 p-6 sm:p-10 space-y-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-md bg-[#111111] hover:bg-[#1A1A1A] text-gray-400 hover:text-white border border-white/5 transition-colors" aria-label="Close pricing">
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#111111] border border-white/5 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
            <Sparkles className="w-3 h-3" />
            <span>{trackToUnlock ? 'Unlock Full 24-Bit Master' : 'Single-Song Mastering'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
            {trackToUnlock ? 'Unlock Full Master for Release' : 'One Song. One Price.'}
          </h2>
          <p className="text-xs text-gray-400 font-light">
            {trackToUnlock
              ? <>You auditioned the preview of <strong className="text-white font-medium">"{trackToUnlock.title}"</strong>. Payment unlocks this track only.</>
              : 'Upload and master a song first; then unlock that exact track for one clear price.'}
          </p>
        </div>

        {isAdminLoggedIn && trackToUnlock && onUseCredit && (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#18150a] via-[#211b0c] to-[#12110a] border border-[#D4AF37] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider">Admin Access Active</span>
              <p className="text-xs text-gray-300 mt-1">Studio administrator bypass; no customer payment is recorded.</p>
            </div>
            <button onClick={onUseCredit} className="px-6 py-3 rounded-md bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider">
              Unlock Master (Admin)
            </button>
          </div>
        )}

        <div className="max-w-md mx-auto w-full">
          <div className="rounded-xl bg-gradient-to-b from-[#15130c] to-[#0F0F0F] border border-[#D4AF37]/60 p-6 sm:p-8 space-y-6 shadow-xl shadow-black/30">
            <div className="space-y-5">
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] block mb-2">One Song · One-Time Payment</span>
                <h3 className="text-xl font-medium text-white">Single Master</h3>
              </div>
              <div className="font-mono text-center">
                <span className="text-4xl font-light text-white">$9.99</span>
                <span className="text-xs text-gray-400"> / song</span>
              </div>
              <ul className="space-y-3 text-xs text-gray-200 font-light">
                {['Complete 24-bit WAV studio master', '16-bit reference WAV deliverable', 'Full mastering diagnostics report', 'Secure automatic unlock for this song'].map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!trackToUnlock ? (
              <div className="w-full py-3.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-xs text-center">
                Upload and master a song to purchase its download.
              </div>
            ) : !authReady || busy ? (
              <div className="flex items-center justify-center gap-2 py-3.5 text-xs text-[#D4AF37]">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                {checkoutState === 'unlocking' ? 'Unlocking paid master…' : 'Please wait…'}
              </div>
            ) : !firebaseUser ? (
              <button onClick={signIn} className="w-full py-3.5 rounded-md bg-white text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Sign in with Google to Pay
              </button>
            ) : hasPendingOrder ? (
              <button onClick={() => void checkPayment()} className="w-full py-3.5 rounded-md bg-[#D4AF37] hover:bg-[#C19A2E] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Check Payment Status
              </button>
            ) : (
              <button onClick={() => void startCheckout()} className="w-full py-3.5 rounded-md bg-[#D4AF37] hover:bg-[#C19A2E] text-black text-xs font-bold uppercase tracking-wider">
                Master One Song — $9.99
              </button>
            )}

            {firebaseUser && <p className="text-[10px] text-center text-gray-500">Signed in as {firebaseUser.email}</p>}
            {(checkoutState === 'pending' || checkoutState === 'verifying') && (
              <p className="text-[11px] text-center text-[#D4AF37]">Stripe Checkout is open. Return here after payment to verify and unlock.</p>
            )}
            {error && <p role="alert" className="text-[11px] text-center text-red-400">{error}</p>}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 pt-3 border-t border-white/5 font-light">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
          <span>Stripe verifies payment server-side. No Stripe secret key is exposed to your browser.</span>
        </div>
      </div>
    </div>
  );
};
