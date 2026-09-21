import React from 'react';
import { X, ShieldCheck, Sparkles } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#0d0d14] border border-[#2e2e42] p-6 sm:p-10 space-y-6 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-[#171722] hover:bg-[#202030] text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#e5b83b] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>HDQTRZ Legal & Security Directives</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white">
            Terms of Service & Audio Privacy
          </h2>
        </div>

        <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
          <section className="space-y-1.5 p-4 rounded-xl bg-[#12121c] border border-[#222232]">
            <h4 className="font-bold text-white text-sm">1. Complete Ownership Guarantee</h4>
            <p className="text-neutral-400">
              Your audio remains 100% your private property. HDQTRZ AI Mastering does not claim any copyright, publishing, mechanical, or synchronization rights to any audio, compositions, stems, or recordings uploaded through this application.
            </p>
          </section>

          <section className="space-y-1.5 p-4 rounded-xl bg-[#12121c] border border-[#222232]">
            <h4 className="font-bold text-white text-sm">2. AI Model Training Immunity</h4>
            <p className="text-neutral-400">
              HDQTRZ does NOT use customer audio uploads to train generative models, voice clones, or public machine learning databases. Audio buffers are processed purely in memory for the singular purpose of mastering analysis and digital signal rendering.
            </p>
          </section>

          <section className="space-y-1.5 p-4 rounded-xl bg-[#12121c] border border-[#222232]">
            <h4 className="font-bold text-white text-sm">3. Storage & Auto-Deletion</h4>
            <p className="text-neutral-400">
              Processed masters and analysis reports are retained in temporary secure storage for up to 30 days to allow for client auditioning, level-matched A/B comparison, and remastering adjustments, after which they are permanently purged.
            </p>
          </section>

          <section className="space-y-1.5 p-4 rounded-xl bg-[#12121c] border border-[#222232]">
            <h4 className="font-bold text-white text-sm">4. HDQTRZ Mastering Philosophy</h4>
            <p className="text-neutral-400">
              Mastering is guided by Earle Holder's ethos: "Less is best. Preserve the soul of the song." The engine prioritizes natural crest factor and transient punch over unmusical distortion.
            </p>
          </section>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#57E6FF] text-black font-semibold text-xs hover:bg-[#e5b83b] transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
