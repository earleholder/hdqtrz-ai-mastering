import React, { useState } from 'react';
import { Award, CheckCircle2, ExternalLink, Headphones, Sparkles, X, Shield, Mail, Phone, Calendar, Send, Copy, Check } from 'lucide-react';
import { saveInquiry } from '../services/inquiryService';

interface HumanStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HumanStudioModal: React.FC<HumanStudioModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [projectType, setProjectType] = useState('Single Track Master (Analog Hybrid) — $85');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const studioEmail = 'earle.holder@gmail.com';

  const buildMailtoUrl = () => {
    const subject = encodeURIComponent(`[HDQTRZ Studio Booking Inquiry] - ${name.trim() || 'New Client'}`);
    const body = encodeURIComponent(
      `HDQTRZ Studio Booking Inquiry\n` +
      `==============================\n\n` +
      `Artist / Client Name: ${name}\n` +
      `Client Email: ${email}\n` +
      `Mastering Service Requested: ${projectType}\n` +
      `Submission Date: ${new Date().toLocaleString()}\n\n` +
      `Project Notes & Target Release Goals:\n` +
      `-------------------------------------\n` +
      `${notes || 'None provided'}\n\n` +
      `-- Sent via HDQTRZ Mastering Client Studio Portal`
    );
    return `mailto:${studioEmail}?subject=${subject}&body=${body}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Persist inquiry into storage for Admin Operations Console
    saveInquiry({
      name: name.trim(),
      email: email.trim(),
      serviceType: projectType,
      notes: notes.trim()
    });

    // 2. Trigger direct mailto dispatch so user's email client opens pre-filled
    const mailtoUrl = buildMailtoUrl();
    window.location.href = mailtoUrl;

    // 3. Display submission confirmation with mailto backup options
    setSubmitted(true);
  };

  const handleCopyEmailDetails = () => {
    const text =
      `To: ${studioEmail}\n` +
      `Subject: [HDQTRZ Studio Booking Inquiry] - ${name}\n\n` +
      `Artist / Client Name: ${name}\n` +
      `Client Email: ${email}\n` +
      `Service: ${projectType}\n\n` +
      `Project Notes:\n${notes}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleReset = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-[#0d0d14] border border-[#d4af37]/50 p-6 sm:p-10 space-y-8 gold-glow max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-[#171722] hover:bg-[#222232] text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Earle Holder quote and branding */}
        <div className="space-y-3 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b1810] border border-[#d4af37]/40 text-xs text-[#e5b83b]">
            <Award className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>HDQTRZ Mastering Studios</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Human Analog Hybrid Mastering
          </h2>
          <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed font-display italic">
            "Less is best. Preserve the soul of the song." — Earle Holder, Chief Mastering Engineer
          </p>
        </div>

        {/* Distinction between AI and Human Studio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-5 rounded-2xl bg-[#12121c] border border-[#222232] space-y-3">
            <h4 className="font-semibold text-white font-display text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
              <span>HDQTRZ AI Mastering</span>
            </h4>
            <p className="text-neutral-400 leading-relaxed">
              Instant, automated 32-bit DSP algorithmic mastering based on Earle Holder's decision logic. Ideal for fast release cycles, mixtapes, beat tapes, and independent budget distribution.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#181510] border border-[#d4af37]/40 space-y-3 gold-glow-subtle">
            <h4 className="font-semibold text-[#f5d061] font-display text-sm flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#d4af37]" />
              <span>HDQTRZ Analog Studio</span>
            </h4>
            <p className="text-neutral-300 leading-relaxed">
              Hands-on mastery by Earle Holder with customized analog mastering consoles, vacuum tubes, discrete Rupert Neve and Manley processors, custom lacquer vinyl cuts, and personal mix critiques.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3 p-5 rounded-2xl bg-[#101017] border border-[#222230] text-xs">
          <h4 className="font-semibold text-neutral-200 uppercase tracking-wider font-display">
            What's Included in Studio Booking:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
              <span>Bespoke custom analog outboard signal chain</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
              <span>Stem mastering & multitrack balance correction</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
              <span>Vinyl lacquer cut preparation & DDP CD images</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
              <span>Direct engineer mix feedback before final approval</span>
            </div>
          </div>
        </div>

        {/* Booking Inquiry Form */}
        {submitted ? (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#141d14] border border-emerald-500/50 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white font-display">Inquiry Registered & Dispatched</h4>
              <p className="text-xs text-neutral-300 max-w-lg mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{name}</strong>! Your inquiry for <strong className="text-[#D4AF37]">{projectType}</strong> has been saved directly to Earle Holder's studio log, and an email draft has been generated for dispatch to <strong className="text-white">{studioEmail}</strong>.
              </p>
            </div>

            {/* Email Dispatch Trigger / Fallback Controls */}
            <div className="p-4 rounded-xl bg-[#0d140d] border border-emerald-500/20 space-y-3 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Client Dispatch</span>
                </span>
                <span className="text-[10px] text-neutral-500">Recipient: {studioEmail}</span>
              </div>

              <p className="text-neutral-400 text-[11px] leading-relaxed">
                If your default mail app did not open automatically, click the button below to trigger it or copy the details:
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={buildMailtoUrl()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open in Mail App</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmailDetails}
                  className="px-4 py-2 rounded-lg bg-[#1a261a] hover:bg-[#253625] border border-emerald-500/30 text-emerald-300 text-xs transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Email Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="ml-auto text-xs text-neutral-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Submit another project
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-[#171722] hover:bg-[#222232] text-neutral-300 text-xs font-medium transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-neutral-400">Your Name / Artist Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Artist / Band / Producer Alias"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@label.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Mastering Service Required</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white focus:outline-none focus:border-[#d4af37]"
              >
                <option>Single Track Master (Analog Hybrid) — $85</option>
                <option>Stem Mastering (Up to 8 Stems) — $150</option>
                <option>EP Mastering Package (4-6 Tracks) — $320</option>
                <option>Full Album Mastering (10-14 Tracks) — $650</option>
                <option>Vinyl Lacquer Disc Preparation</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400">Project Notes / Target Release Date</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us about the project, reference tracks, or specific sonic goals..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#171722] border border-[#2b2b3b] text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5b83b] to-[#c29b28] text-black font-display font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>Submit Studio Booking Request</span>
              <ExternalLink className="w-4 h-4 text-black" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
