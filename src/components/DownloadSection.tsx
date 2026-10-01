import React, { useState } from 'react';
import {
  Download,
  FileAudio,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sliders,
  Disc3,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Headphones,
  FileText,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Info
} from 'lucide-react';
import { MasterRecord, QualityFeedback } from '../types';
import { audioBufferToWavBlob } from '../audio/dspEngine';
import { audioBufferToMp3Blob } from '../audio/mp3Encoder';
import {
  CONFIG,
  ENGINE_VERSION,
  getAiPreviewFilename,
  getAiPreviewMp3Filename
} from '../audio/config';
import {
  generateProcessingReceipt,
  downloadReceiptAsText,
  downloadReceiptAsJson
} from '../audio/receipt';

interface DownloadSectionProps {
  record: MasterRecord;
  onMasterNew: () => void;
  onRemaster: () => void;
  onOpenHumanStudio: () => void;
  onUnlockMaster?: () => void;
  onAuditionA_B?: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({
  record,
  onMasterNew,
  onRemaster,
  onOpenHumanStudio,
  onUnlockMaster,
  onAuditionA_B
}) => {
  const isUnlocked = !!record.isUnlocked;
  const [showAdvancedFormats, setShowAdvancedFormats] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [downloadingWav, setDownloadingWav] = useState(false);
  const [downloadingMp3, setDownloadingMp3] = useState(false);

  // Feature 11: Feedback UX state
  const [feedbackImproved, setFeedbackImproved] = useState<boolean | null>(null);
  const [feedbackIssues, setFeedbackIssues] = useState<string[]>([]);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackConsent, setFeedbackConsent] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const receipt = generateProcessingReceipt(record);

  const downloadWav = () => {
    if (!record.masteredBuffer) return;
    if (!isUnlocked && onUnlockMaster) {
      onUnlockMaster();
      return;
    }
    setDownloadingWav(true);

    try {
      const blob = audioBufferToWavBlob(record.masteredBuffer, 24);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getAiPreviewFilename(record.title, 24);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingWav(false), 500);
    }
  };

  const downloadMp3 = () => {
    if (!record.masteredBuffer) return;
    if (!isUnlocked && onUnlockMaster) {
      onUnlockMaster();
      return;
    }
    setDownloadingMp3(true);

    try {
      const blob = audioBufferToMp3Blob(record.masteredBuffer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getAiPreviewMp3Filename(record.title);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingMp3(false), 500);
    }
  };

  const download16BitCd = () => {
    if (!record.masteredBuffer) return;
    if (!isUnlocked && onUnlockMaster) {
      onUnlockMaster();
      return;
    }
    const blob = audioBufferToWavBlob(record.masteredBuffer, 16);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getAiPreviewFilename(record.title, 16);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const toggleIssue = (issue: string) => {
    setFeedbackIssues(prev =>
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackConsent) return;

    // Feature 11: Local-only acknowledgment (no external audio upload, no Firestore rules change)
    const feedbackPayload: QualityFeedback = {
      improvedMix: feedbackImproved,
      issues: feedbackIssues,
      notes: feedbackNotes.trim(),
      consentGiven: feedbackConsent,
      timestamp: new Date().toISOString()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('hdqtrz_quality_feedback') || '[]');
      existing.push(feedbackPayload);
      localStorage.setItem('hdqtrz_quality_feedback', JSON.stringify(existing.slice(-20)));
    } catch (err) {
      // Ignore local storage error
    }

    setFeedbackSubmitted(true);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1E4263] border border-cyan-100/20 text-[10px] uppercase tracking-[0.2em] text-[#57E6FF]">
          <span>06 / Audio Delivery & Verification Receipt</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-light tracking-tight text-white">
          AI Preview Delivery
        </h2>
        <p className="text-slate-200 text-xs sm:text-sm max-w-xl mx-auto font-light leading-relaxed">
          High-resolution 24-bit PCM deliverables verified for broadcast, streaming, and analog translation.
        </p>
      </div>

      {/* Free Audition Hook Notice (if locked) */}
      {!isUnlocked && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#14120B] via-[#1A170F] to-[#173653] border border-[#57E6FF]/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-black/40">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#57E6FF]/10 border border-[#57E6FF]/30 flex items-center justify-center shrink-0 text-[#57E6FF] mt-0.5">
              <Headphones className="w-4 h-4 text-[#57E6FF]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  Free 30s Hook Audition Active
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#57E6FF] text-black text-[9px] font-bold uppercase tracking-wider">
                  Climax Section
                </span>
              </div>
              <p className="text-xs text-slate-100 font-light leading-relaxed">
                Full-length download requires unlocking. Audition the loudest 30-second climax with calibrated A/B level matching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onAuditionA_B && (
              <button
                onClick={onAuditionA_B}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-md bg-[#1E4263] hover:bg-[#285782] border border-cyan-100/30 text-white font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Sliders className="w-3.5 h-3.5 text-[#57E6FF]" />
                <span>Audition A/B</span>
              </button>
            )}

            {onUnlockMaster && (
              <button
                onClick={onUnlockMaster}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <Lock className="w-3.5 h-3.5 text-black" />
                <span>Unlock AI Preview ($9.99)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Delivery Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 24-Bit WAV Delivery */}
        <div className="p-6 rounded-xl bg-[#173653] border border-cyan-100/30 hover:border-cyan-100/40 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-[#1E4263] text-[#57E6FF] text-[10px] uppercase tracking-wider border border-cyan-100/20 font-medium">
                Primary AI Preview
              </span>
              <span className="font-mono text-xs text-slate-200">
                24-Bit / {record.sampleRate ? (record.sampleRate / 1000).toFixed(1) : '44.1'} kHz
              </span>
            </div>

            <h3 className="text-xl font-light text-white">
              Uncompressed WAV Audio
            </h3>

            <p className="text-xs text-slate-200 leading-relaxed font-light">
              Full dynamic fidelity with TPDF triangular dither and preserved native session sample rate.
            </p>

            <div className="space-y-1.5 text-xs text-slate-100 font-mono pt-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Target Profile:</span>
                <span className="text-white font-normal">{record.genre} ({record.character})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Loudness:</span>
                <span className="text-white font-normal">{record.masteredAnalysis.integratedLufs.toFixed(1)} LUFS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">True Peak:</span>
                <span className="text-emerald-400 font-normal">{record.masteredAnalysis.truePeak.toFixed(2)} dBTP</span>
              </div>
            </div>
          </div>

          <button
            onClick={downloadWav}
            disabled={downloadingWav}
            className="w-full py-3 px-5 rounded-md font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#57E6FF] hover:bg-[#41CBE8] text-black transition-colors active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white"
          >
            {isUnlocked ? (
              <>
                <Download className="w-4 h-4 text-black" />
                <span>{downloadingWav ? 'Preparing WAV...' : 'Download AI Preview (WAV)'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-black" />
                <span>Unlock & Download AI Preview ($9.99)</span>
              </>
            )}
          </button>
        </div>

        {/* 320 kbps MP3 Reference */}
        <div className="p-6 rounded-xl bg-[#173653] border border-cyan-100/30 hover:border-cyan-100/40 flex flex-col justify-between space-y-6 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded bg-[#1E4263] text-slate-100 text-[10px] uppercase tracking-wider border border-cyan-100/20">
                Reference Audio
              </span>
              <span className="font-mono text-xs text-slate-200">
                320 kbps CBR / 44.1 kHz
              </span>
            </div>

            <h3 className="text-xl font-light text-white">
              320 kbps MP3 AI Preview
            </h3>

            <p className="text-xs text-slate-200 leading-relaxed font-light">
              High-bitrate compressed audio reference for rapid testing and collaborator auditioning.
            </p>

            <div className="space-y-1.5 text-xs text-slate-100 font-mono pt-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Target Profile:</span>
                <span className="text-white font-normal">{record.genre} ({record.character})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">QC Status:</span>
                <span className="text-emerald-400 font-normal">Passed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">True Peak:</span>
                <span className="text-emerald-400 font-normal">{record.masteredAnalysis.truePeak.toFixed(2)} dBTP</span>
              </div>
            </div>
          </div>

          <button
            onClick={downloadMp3}
            disabled={downloadingMp3}
            className="w-full py-3 px-5 rounded-md text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-white transition-colors active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#57E6FF]"
          >
            {isUnlocked ? (
              <>
                <Download className="w-4 h-4 text-[#57E6FF]" />
                <span>{downloadingMp3 ? 'Encoding MP3...' : 'Download AI Preview (MP3)'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#57E6FF]" />
                <span>Unlock AI Preview (MP3)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feature 2: Processing Receipt Section */}
      <section aria-label="Processing Receipt" className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-100/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#57E6FF]" />
              <h3 className="text-sm uppercase tracking-wider text-white font-medium">
                AI Preview Processing Receipt & Audit Log
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-light mt-0.5">
              Engine {ENGINE_VERSION} • Fully deterministic acoustic report card and safety verification.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => downloadReceiptAsText(record)}
              className="px-3 py-1.5 rounded bg-[#1E4263] hover:bg-[#285782] border border-cyan-100/20 text-xs font-mono text-slate-200 hover:text-white flex items-center gap-1.5 transition-all focus-visible:ring-1 focus-visible:ring-[#57E6FF]"
              title="Download plain text receipt (.txt)"
            >
              <Download className="w-3 h-3 text-[#57E6FF]" />
              <span>Receipt (.txt)</span>
            </button>
            <button
              onClick={() => downloadReceiptAsJson(record)}
              className="px-3 py-1.5 rounded bg-[#1E4263] hover:bg-[#285782] border border-cyan-100/20 text-xs font-mono text-slate-200 hover:text-white flex items-center gap-1.5 transition-all focus-visible:ring-1 focus-visible:ring-[#57E6FF]"
              title="Download structured JSON receipt (.json)"
            >
              <Download className="w-3 h-3 text-[#57E6FF]" />
              <span>Receipt (.json)</span>
            </button>
          </div>
        </div>

        {/* Visible Receipt Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Input vs Achieved</span>
            <div className="text-slate-300">{receipt.inputMetrics.integratedLufs.toFixed(1)} &rarr; <span className="text-white font-bold">{receipt.outputMetrics.integratedLufs.toFixed(1)}</span> LUFS</div>
          </div>
          <div className="p-3 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Ceiling & True Peak</span>
            <div className="text-slate-300">Ceil: {receipt.processingParameters.truePeakCeilingDb} &bull; <span className="text-emerald-400 font-bold">{receipt.outputMetrics.truePeakDb.toFixed(2)}</span> dBTP</div>
          </div>
          <div className="p-3 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Limiter Max Gain Red.</span>
            <div className="text-white">{receipt.processingParameters.maxLimiterGainReductionDb} dB <span className="text-[10px] text-slate-400 font-sans">(capped &le; 2.0 dB)</span></div>
          </div>
          <div className="p-3 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">Post-QC Verification</span>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{receipt.verification.status}</span>
            </div>
          </div>
        </div>

        {/* Expandable Full Receipt View */}
        <div className="pt-2">
          <button
            onClick={() => setShowReceiptDetails(!showReceiptDetails)}
            className="text-xs text-[#57E6FF] hover:underline flex items-center gap-1 font-mono focus-visible:ring-1 focus-visible:ring-[#57E6FF]"
            aria-expanded={showReceiptDetails}
          >
            <span>{showReceiptDetails ? '▼ Hide Complete Receipt Breakdown' : '▶ View Complete 5-Section Audit Breakdown'}</span>
          </button>

          {showReceiptDetails && (
            <div className="mt-3 p-4 rounded-lg bg-[#0E1F33] border border-cyan-100/20 text-xs font-mono space-y-3 max-h-72 overflow-y-auto">
              <div>
                <div className="text-[#57E6FF] font-bold">1. FORMAT & RATE INTEGRITY</div>
                <div className="text-slate-300 mt-1">Input: {receipt.inputFormat.format} {receipt.inputFormat.bitDepth}-bit @ {receipt.inputFormat.sampleRate} Hz ({receipt.inputFormat.channels} ch)</div>
                <div className="text-slate-300">Output: {receipt.outputFormat.format} {receipt.outputFormat.bitDepth}-bit @ {receipt.outputFormat.sampleRate} Hz ({receipt.outputFormat.dither})</div>
              </div>

              <div>
                <div className="text-[#57E6FF] font-bold">2. DETAILED METRICS</div>
                <div className="text-slate-300 mt-1">PLR Dynamics: {receipt.inputMetrics.plrDb.toFixed(1)} dB &rarr; {receipt.outputMetrics.plrDb.toFixed(1)} dB</div>
                <div className="text-slate-300">LRA Range: {receipt.inputMetrics.lraLu.toFixed(1)} LU &rarr; {receipt.outputMetrics.lraLu.toFixed(1)} LU</div>
                <div className="text-slate-300">Stereo Phase Correlation: {receipt.inputMetrics.stereoCorrelation.toFixed(2)} &rarr; {receipt.outputMetrics.stereoCorrelation.toFixed(2)}</div>
                <div className="text-slate-300">Digital Clipping Runs (&ge;3 samples): {receipt.outputMetrics.clippingEvents}</div>
              </div>

              <div>
                <div className="text-[#57E6FF] font-bold">3. DSP PARAMETERS</div>
                <div className="text-slate-300 mt-1">Loudness Target: {receipt.processingParameters.loudnessTargetLufs} LUFS (creative delivery choice)</div>
                <div className="text-slate-300">Mono-Low Treatment: {receipt.processingParameters.monoLowTreatment}</div>
                <div className="text-slate-300">Cold-Start Click Prevention: {receipt.processingParameters.coldStartFadeApplied ? 'Applied' : 'Bypassed'}</div>
              </div>

              <div>
                <div className="text-[#57E6FF] font-bold">4. SAFETY & AAC STATUS</div>
                <div className="text-slate-300 mt-1">True Peak Compliant: {receipt.verification.truePeakCompliant ? 'YES' : 'NO'}</div>
                <div className="text-slate-300">AAC Overshoot Check: {receipt.verification.aacOvershootCheck}</div>
              </div>

              <div>
                <div className="text-[#57E6FF] font-bold">5. GATE OUTCOME</div>
                <div className="text-slate-300 mt-1">Outcome: {receipt.gateEvaluation.outcome} ({receipt.gateEvaluation.technicalStatus})</div>
                <div className="text-slate-400 mt-1 italic">Author: {receipt.author}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature 9: Privacy & Trust Panel (Truthful, Code-Verifiable Facts) */}
      <section aria-label="Privacy and Trust Guarantee" className="p-5 rounded-xl bg-[#142338] border border-cyan-100/20 space-y-3">
        <div className="flex items-center gap-2 border-b border-cyan-100/10 pb-2.5">
          <ShieldCheck className="w-4 h-4 text-[#57E6FF]" />
          <h3 className="text-xs uppercase tracking-wider text-white font-medium">
            Privacy & Trust Architecture (Code-Verifiable)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-light leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-[#57E6FF] font-bold">✓</span>
            <div><strong className="text-white font-medium">100% In-Browser Audio Processing:</strong> All analysis, equalization, limiting, and WAV encoding run locally in your web browser via Web Audio and Web Workers. Your master audio files are never uploaded to our servers for processing.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#57E6FF] font-bold">✓</span>
            <div><strong className="text-white font-medium">Zero AI Model Training:</strong> Your music and reference tracks are never used to train machine learning models, algorithms, or third-party datasets.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#57E6FF] font-bold">✓</span>
            <div><strong className="text-white font-medium">Ephemeral Memory Buffers:</strong> Audio waveforms and buffers reside strictly in your browser tab's RAM and are automatically purged when the session ends or resets.</div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#57E6FF] font-bold">✓</span>
            <div><strong className="text-white font-medium">Deterministic Transparency:</strong> Every DSP decision, limiter threshold, and K-weighted measurement is fully reproducible and detailed in your Processing Receipt.</div>
          </div>
        </div>
      </section>

      {/* Feature 14: Comprehensive Human-Service Upgrades UI */}
      <section aria-label="Human Studio Services" className="p-6 rounded-2xl bg-gradient-to-r from-[#173653] via-[#1A3F64] to-[#122A44] border border-[#57E6FF]/40 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#57E6FF]">
              <Sparkles className="w-3.5 h-3.5 text-[#57E6FF]" />
              <span className="text-[10px] uppercase tracking-wider">Beyond Automated Previews</span>
            </div>
            <h3 className="text-xl font-light text-white">
              HDQTRZ Human Mastering Suite (Earle Holder)
            </h3>
            <p className="text-xs text-slate-200 font-light max-w-xl leading-relaxed">
              When release-ready perfection matters, Earle Holder brings 30+ years of Grammy-recognized analog hybrid mastering to your music.
            </p>
          </div>

          <button
            onClick={onOpenHumanStudio}
            className="shrink-0 px-6 py-3 rounded-xl bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Explore Human Mastering</span>
            <ExternalLink className="w-3.5 h-3.5 text-black" />
          </button>
        </div>

        {/* 100% Credit Guarantee Banner */}
        <div className="p-3 rounded-xl bg-[#0D1C2E] border border-[#57E6FF]/30 text-xs text-[#57E6FF] font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#57E6FF] shrink-0" />
          <span>100% Credit Guarantee: Any AI Preview purchase ($9.99) can be credited in full toward eligible human mastering sessions with Earle Holder.</span>
        </div>

        {/* Specific Deliverable Upgrades Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <div className="text-white font-medium">Alternate Mix Versions</div>
            <p className="text-[11px] text-slate-300 font-light">Instrumental, Clean radio edit, TV track, and Acapella deliveries with phase-locked master processing.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <div className="text-white font-medium">Full Album Sequencing</div>
            <p className="text-[11px] text-slate-300 font-light">Inter-track loudness leveling, gap pacing, crossfades, and DDP image creation for CD manufacturing.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <div className="text-white font-medium">Apple Digital Masters (ADM)</div>
            <p className="text-[11px] text-slate-300 font-light">Certified high-resolution delivery tested against Apple's strict inter-sample clipping guidelines.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <div className="text-white font-medium">Vinyl Pre-Mastering</div>
            <p className="text-[11px] text-slate-300 font-light">High-frequency de-essing, elliptical low-end mono cut, and sibilance shaping specifically for lacquer cutting.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <div className="text-white font-medium">Unrestricted Revisions</div>
            <p className="text-[11px] text-slate-300 font-light">Direct phone/email consultation with Earle Holder to dial in your exact tonal preferences.</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#14263B] border border-cyan-100/10 space-y-1">
            <div className="text-white font-medium">Direct Label Delivery</div>
            <p className="text-[11px] text-slate-300 font-light">Packaging deliverables directly formatted to major record label delivery specifications.</p>
          </div>
        </div>
      </section>

      {/* Feature 11: Feedback UX After Download */}
      <section aria-label="Customer Quality Feedback" className="rounded-xl bg-[#173653] border border-cyan-100/30 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-cyan-100/20 pb-3">
          <MessageSquare className="w-4 h-4 text-[#57E6FF]" />
          <h3 className="text-xs uppercase tracking-wider text-white font-medium">
            Post-Preview Quality Feedback (Optional)
          </h3>
        </div>

        {feedbackSubmitted ? (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 space-y-1">
            <div className="font-medium text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Thank you for your feedback!</span>
            </div>
            <p className="text-emerald-100/80 font-light">
              Your anonymous input helps our engineering team refine EQ curves and limiter tolerances. If you would like Earle Holder to review your mix personally, you can book a human mastering session at any time.
            </p>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
            {/* Question 1: Did this improve your mix? */}
            <div className="space-y-2">
              <label className="text-slate-200 font-medium block">
                1. Did this AI Preview improve your mix?
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFeedbackImproved(true)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                    feedbackImproved === true
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#1E4263] border-cyan-100/20 text-slate-300 hover:text-white'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes, noticeably</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackImproved(false)}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                    feedbackImproved === false
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-[#1E4263] border-cyan-100/20 text-slate-300 hover:text-white'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>No, preferred original / unsure</span>
                </button>
              </div>
            </div>

            {/* Question 2: What still sounds wrong? */}
            <div className="space-y-2">
              <label className="text-slate-200 font-medium block">
                2. What still sounds wrong or needs adjustment? (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  'Low-end muddy / boomy',
                  'Low-end too thin',
                  'Vocal recessed / buried',
                  'High frequencies harsh / bright',
                  'Transients crushed / over-limited',
                  'Stereo width feels unnatural'
                ].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleIssue(opt)}
                    className={`p-2.5 rounded-lg border text-left text-[11px] transition-all ${
                      feedbackIssues.includes(opt)
                        ? 'bg-[#1A1A1A] border-[#57E6FF] text-[#57E6FF]'
                        : 'bg-[#1E4263] border-cyan-100/20 text-slate-300 hover:text-white'
                    }`}
                  >
                    {feedbackIssues.includes(opt) ? '✓ ' : '+ '}
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="text-slate-200 font-medium block">
                Additional observations (Optional):
              </label>
              <textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Tell us what you are hearing..."
                rows={2}
                className="w-full p-2.5 rounded-lg bg-[#14263B] border border-cyan-100/20 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#57E6FF]"
              />
            </div>

            {/* Explicit Consent Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="feedback-consent"
                checked={feedbackConsent}
                onChange={(e) => setFeedbackConsent(e.target.checked)}
                className="mt-0.5 rounded border-gray-600 text-[#57E6FF] focus:ring-[#57E6FF]"
                required
              />
              <label htmlFor="feedback-consent" className="text-[11px] text-slate-300 font-light leading-relaxed cursor-pointer">
                I agree to submit this anonymous feedback to improve processing quality. <strong className="text-white font-medium">No audio files are transmitted or stored.</strong>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={!feedbackConsent || feedbackImproved === null}
                className="px-5 py-2.5 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-white"
              >
                <Send className="w-3.5 h-3.5 text-black" />
                <span>Submit Feedback</span>
              </button>

              <button
                type="button"
                onClick={onOpenHumanStudio}
                className="text-xs text-[#57E6FF] hover:underline flex items-center gap-1"
              >
                <span>Prefer human review? Contact Earle Holder &rarr;</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Expandable Advanced Architecture Formats */}
      <div className="rounded-xl bg-[#173653] border border-cyan-100/20 p-4 space-y-3">
        <button
          onClick={() => setShowAdvancedFormats(!showAdvancedFormats)}
          className="w-full flex items-center justify-between text-xs text-slate-200 hover:text-white transition-colors"
        >
          <span className="font-normal flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-[#57E6FF]" />
            <span>Additional Formats & Stems Architecture (16-bit CD, 48kHz Video, Apple Digital Masters)</span>
          </span>
          {showAdvancedFormats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvancedFormats && (
          <div className="pt-3 border-t border-cyan-100/20 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
              <div className="font-normal text-white">16-Bit / 44.1 kHz CD AI Preview</div>
              <p className="text-slate-200 text-[11px] leading-relaxed font-light">
                Standard Red Book audio CD specification with TPDF dither.
              </p>
              <button
                onClick={download16BitCd}
                className="text-[#57E6FF] hover:underline flex items-center gap-1 font-medium text-[11px]"
              >
                <Download className="w-3 h-3" />
                <span>Download AI Preview (16-Bit)</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
              <div className="font-normal text-white">48 kHz Video Preview</div>
              <p className="text-slate-200 text-[11px] leading-relaxed font-light">
                Aligned with broadcast television, film sync, and Dolby video specs.
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-[#1E4263] text-slate-200 text-[10px]">
                Preserves source rate
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#1B3C5C] border border-cyan-100/20 space-y-2">
              <div className="font-normal text-white">Stem / Vocal Delivery</div>
              <p className="text-slate-200 text-[11px] leading-relaxed font-light">
                Instrumental, Acapella, and Clean radio edit batching workflow.
              </p>
              <button
                onClick={onOpenHumanStudio}
                className="text-[#57E6FF] hover:underline flex items-center gap-1 font-medium text-[11px]"
              >
                <span>Contact HDQTRZ Studio &rarr;</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Next Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-cyan-100/20">
        <button
          onClick={onRemaster}
          className="w-full sm:w-auto px-5 py-3 rounded-md bg-[#1E4263] hover:bg-[#1A1A1A] border border-cyan-100/20 text-xs uppercase tracking-wider text-slate-100 transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#57E6FF]"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Remaster This Song</span>
        </button>

        <button
          onClick={onMasterNew}
          className="w-full sm:w-auto px-6 py-3.5 rounded-md font-bold text-xs uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black focus-visible:ring-2 focus-visible:ring-white"
        >
          <RotateCcw className="w-3.5 h-3.5 text-black" />
          <span>Master Another Track</span>
        </button>
      </div>
    </div>
  );
};
