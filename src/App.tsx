import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { AnalysisView } from './components/AnalysisView';
import { PreferencesView } from './components/PreferencesView';
import { MasteringProgress } from './components/MasteringProgress';
import { ComparisonPlayer } from './components/ComparisonPlayer';
import { MasteringReport } from './components/MasteringReport';
import { DownloadSection } from './components/DownloadSection';
import { MasterHistory } from './components/MasterHistory';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAuthModal } from './components/AdminAuthModal';
import { PricingModal } from './components/PricingModal';
import { HumanStudioModal } from './components/HumanStudioModal';
import { AccountModal } from './components/AccountModal';
import { LegalModal } from './components/LegalModal';
import { InstructionsModal } from './components/InstructionsModal';

import {
  AudioAnalysis,
  DynamicEQMode,
  Genre,
  LoudnessTarget,
  MasteringCharacter,
  MasterRecord,
  MultibandMode,
  ReferenceTrackProfile,
  SaturationFlavor,
  SaturationIntensity,
  TrackMetadata,
  UserProfile
} from './types';
import { analyzeAudioBuffer } from './audio/analyzer';
import { generateMasteringPlan, generateMasteringReport } from './audio/decisionEngine';
import { executeDspMastering } from './audio/dspEngine';
import { findAuditionWindow } from './audio/auditionWindow';
import { ShieldCheck, Sparkles, ExternalLink, Disc3 } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { firebaseAuth } from './services/firebaseClient';

type WorkflowStep = 'upload' | 'analysis' | 'preferences' | 'processing' | 'result';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'master' | 'history' | 'admin'>('master');

  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [activeBuffer, setActiveBuffer] = useState<AudioBuffer | null>(null);
  const [activeMetadata, setActiveMetadata] = useState<TrackMetadata | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AudioAnalysis | null>(null);

  // Directives
  const [selectedGenre, setSelectedGenre] = useState<Genre>('Hip Hop / Rap');
  const [selectedLufs, setSelectedLufs] = useState<LoudnessTarget>(-11);
  const [selectedCharacter, setSelectedCharacter] = useState<MasteringCharacter>('transparent');
  const [selectedDynamicEQMode, setSelectedDynamicEQMode] = useState<DynamicEQMode>('auto');
  const [selectedSaturationFlavor, setSelectedSaturationFlavor] = useState<SaturationFlavor>('none');
  const [selectedSaturationIntensity, setSelectedSaturationIntensity] = useState<SaturationIntensity>('subtle');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Output record
  const [currentMasterRecord, setCurrentMasterRecord] = useState<MasterRecord | null>(null);

  // Vault / History
  const [masterRecords, setMasterRecords] = useState<MasterRecord[]>([]);

  // User session
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const savedUser = localStorage.getItem('hdqtrz_user_profile');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          return {
            id: parsed.id || 'user_hdqtrz_creator',
            name: parsed.name || '',
            email: parsed.email || '',
            subscriptionTier: parsed.subscriptionTier || 'artist',
            creditsRemaining: typeof parsed.creditsRemaining === 'number' ? parsed.creditsRemaining : 3,
            createdAt: parsed.createdAt || new Date().toISOString()
          };
        }
      }
    } catch {
      // fallback
    }
    return {
      id: 'user_hdqtrz_creator',
      name: '',
      email: '',
      subscriptionTier: 'artist',
      creditsRemaining: 3,
      createdAt: new Date().toISOString()
    };
  });

  // Modals & Unlock Target
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [trackToUnlock, setTrackToUnlock] = useState<{ id: string; recordId: string; title: string; duration: number; genre: string } | null>(null);
  const [showHumanStudioModal, setShowHumanStudioModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
    if (!firebaseUser) {
      setIsAdminLoggedIn(false);
      return;
    }
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Not authorized');
      setIsAdminLoggedIn(true);
      setUser((current) => ({
        ...current,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Earle Holder',
        email: firebaseUser.email || 'earle.holder@gmail.com',
        subscriptionTier: 'admin',
        creditsRemaining: 9999,
      }));
    } catch {
      setIsAdminLoggedIn(false);
    }
  }), []);

  // Handle uploaded audio
  const handleAudioReady = (buffer: AudioBuffer, metadata: TrackMetadata) => {
    setIsProcessing(true);
    setProcessingStage('Analyzing dynamic range, LUFS, and spectral frequencies...');

    setTimeout(() => {
      try {
        const analysis = analyzeAudioBuffer(buffer);
        setActiveBuffer(buffer);
        setActiveMetadata(metadata);
        setCurrentAnalysis(analysis);
        setIsProcessing(false);
        setCurrentStep('analysis');
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    }, 200);
  };

  // Start DSP mastering pipeline
  const handleStartMastering = async (
    genre: Genre,
    targetLufs: LoudnessTarget,
    character: MasteringCharacter,
    directives?: {
      dynamicEQMode: DynamicEQMode;
      saturationFlavor: SaturationFlavor;
      saturationIntensity: SaturationIntensity;
      multibandMode?: MultibandMode;
      referenceProfile?: ReferenceTrackProfile;
      referenceMatchIntensity?: number;
    }
  ) => {
    if (!activeBuffer || !currentAnalysis || !activeMetadata) return;

    setSelectedGenre(genre);
    setSelectedLufs(targetLufs);
    setSelectedCharacter(character);
    if (directives?.dynamicEQMode) setSelectedDynamicEQMode(directives.dynamicEQMode);
    if (directives?.saturationFlavor) setSelectedSaturationFlavor(directives.saturationFlavor);
    if (directives?.saturationIntensity) setSelectedSaturationIntensity(directives.saturationIntensity);

    setCurrentStep('processing');
    setIsProcessing(true);
    setProcessingProgress(5);
    setProcessingStage('Generating HDQTRZ Decision Plan...');

    try {
      // 1. Generate surgical decision plan based on Earle Holder philosophy
      const plan = generateMasteringPlan(currentAnalysis, genre, targetLufs, character, directives);

      // 2. Execute precision DSP pipeline using OfflineAudioContext with QC loop
      const result = await executeDspMastering(activeBuffer, plan, (stage, progress) => {
        setProcessingStage(stage);
        setProcessingProgress(progress);
      });

      // 3. Generate mastering report
      const report = generateMasteringReport(currentAnalysis, plan, result.masteredAnalysis);

      // 4. Calculate high-energy 30-second audition preview window
      const previewWindow = findAuditionWindow(result.masteredBuffer || activeBuffer, 30);

      // 5. Create master record (automatically unlocked with unlimited master privileges if admin)
      const newRecord: MasterRecord = {
        id: crypto.randomUUID(),
        userId: user.id,
        title: activeMetadata.name,
        genre,
        targetLufs,
        character,
        originalAnalysis: currentAnalysis,
        masteredAnalysis: result.masteredAnalysis,
        plan,
        report,
        timestamp: new Date().toISOString(),
        duration: activeBuffer.duration,
        sampleRate: activeBuffer.sampleRate,
        originalBuffer: activeBuffer,
        masteredBuffer: result.masteredBuffer,
        isUnlocked: isAdminLoggedIn, // Automatically full master unlocked for Admin, 30s preview for customers
        previewWindow
      };

      setCurrentMasterRecord(newRecord);
      setMasterRecords(prev => [newRecord, ...prev]);

      setIsProcessing(false);
      setCurrentStep('result');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert('Mastering DSP error occurred. Please try again.');
      setCurrentStep('preferences');
    }
  };

  // Open unlock modal for current track
  const handleOpenUnlockModal = (record?: MasterRecord) => {
    const target = record || currentMasterRecord;
    if (!target) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target.id);
    const stableId = isUuid ? target.id : (target.id = crypto.randomUUID());
    setTrackToUnlock({
      id: stableId,
      recordId: target.id,
      title: target.title,
      duration: target.duration,
      genre: target.genre
    });
    setShowPricingModal(true);
  };

  // Unlock only the exact local record after an authenticated paid-order consume,
  // or through the separate administrator bypass.
  const handleUnlockTrack = (recordId?: string) => {
    const idToMatch = recordId || currentMasterRecord?.id;
    if (!idToMatch) return;

    setCurrentMasterRecord(prev =>
      prev && prev.id === idToMatch ? { ...prev, isUnlocked: true } : prev
    );
    setMasterRecords(prev =>
      prev.map(rec => rec.id === idToMatch ? { ...rec, isUnlocked: true } : rec)
    );
    setShowPricingModal(false);
    setTrackToUnlock(null);
  };

  // Remaster current track
  const handleRemaster = () => {
    setCurrentStep('preferences');
  };

  // Start a new mastering session
  const handleMasterNew = () => {
    setActiveBuffer(null);
    setActiveMetadata(null);
    setCurrentAnalysis(null);
    setCurrentMasterRecord(null);
    setCurrentStep('upload');
    setActiveTab('master');
  };

  // Select record from Vault
  const handleSelectRecordFromHistory = (record: MasterRecord) => {
    setCurrentMasterRecord(record);
    setActiveBuffer(record.originalBuffer || null);
    setCurrentAnalysis(record.originalAnalysis);
    setActiveTab('master');
    setCurrentStep('result');
  };

  // Remaster from Vault
  const handleRemasterFromHistory = (record: MasterRecord) => {
    setCurrentMasterRecord(record);
    setActiveBuffer(record.originalBuffer || null);
    setCurrentAnalysis(record.originalAnalysis);
    setActiveMetadata({
      name: record.title,
      format: 'WAV',
      sampleRate: record.sampleRate,
      bitDepth: 24,
      duration: record.duration,
      fileSize: 45000000,
      channels: 2
    });
    setSelectedGenre(record.genre);
    setSelectedLufs(record.targetLufs);
    setSelectedCharacter(record.character);
    setActiveTab('master');
    setCurrentStep('preferences');
  };

  // Delete from history
  const handleDeleteRecord = (id: string) => {
    setMasterRecords(prev => prev.filter(r => r.id !== id));
  };

  // Admin Authentication handlers (Restricted to Earle Holder)
  const handleAdminAuthSuccess = () => {
    setIsAdminLoggedIn(true);
    // Switch to Earle Holder administrator profile with unlimited masters
    setUser({
      id: 'admin_earle_holder',
      name: 'Earle Holder',
      email: 'earle.holder@gmail.com',
      subscriptionTier: 'admin',
      creditsRemaining: 9999,
      createdAt: '2024-01-01T00:00:00.000Z'
    });
    // Immediately unlock any current or pending master records
    setCurrentMasterRecord(prev => prev ? { ...prev, isUnlocked: true } : null);
    setMasterRecords(prev => prev.map(rec => ({ ...rec, isUnlocked: true })));
    setActiveTab('admin');
  };

  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('hdqtrz_admin_token');
    } catch {
      // ignore
    }
    void signOut(firebaseAuth);
    setIsAdminLoggedIn(false);
    // Reset to user profile from localStorage if saved, or empty defaults for creator
    let restored: UserProfile | null = null;
    try {
      const savedUser = localStorage.getItem('hdqtrz_user_profile');
      if (savedUser) {
        restored = JSON.parse(savedUser);
      }
    } catch {
      restored = null;
    }
    setUser(restored || {
      id: 'user_hdqtrz_creator',
      name: '',
      email: '',
      subscriptionTier: 'artist',
      creditsRemaining: 3,
      createdAt: new Date().toISOString()
    });
    setActiveTab('master');
  };

  const handleSelectTab = (tab: 'master' | 'history' | 'admin') => {
    if (tab === 'admin' && !isAdminLoggedIn) {
      setShowAdminAuthModal(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-[#d4af37]/30 selection:text-[#d4af37] font-sans">
      {/* Studio Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenHumanStudio={() => setShowHumanStudioModal(true)}
        onOpenPricing={() => setShowPricingModal(true)}
        onOpenAccount={() => setShowAccountModal(true)}
        onOpenLegal={() => setShowLegalModal(true)}
        onOpenInstructions={() => setShowInstructionsModal(true)}
        onOpenAdminAuth={() => setShowAdminAuthModal(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        userCredits={isAdminLoggedIn ? 9999 : user.creditsRemaining}
        isProcessing={isProcessing}
        currentStep={currentStep}
      />

      {/* Main Studio Console Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {activeTab === 'master' && (
          <div>
            {currentStep === 'upload' && (
              <UploadSection
                onAudioReady={handleAudioReady}
                isAnalyzing={isProcessing}
                onOpenInstructions={() => setShowInstructionsModal(true)}
              />
            )}

            {currentStep === 'analysis' && currentAnalysis && activeMetadata && (
              <AnalysisView
                analysis={currentAnalysis}
                metadata={activeMetadata}
                onProceed={() => setCurrentStep('preferences')}
                onReUpload={handleMasterNew}
              />
            )}

            {currentStep === 'preferences' && (
              <PreferencesView
                initialGenre={selectedGenre}
                initialLufs={selectedLufs}
                initialCharacter={selectedCharacter}
                initialDynamicEQMode={selectedDynamicEQMode}
                initialSaturationFlavor={selectedSaturationFlavor}
                initialSaturationIntensity={selectedSaturationIntensity}
                onStartMastering={handleStartMastering}
                onBack={() => setCurrentStep('analysis')}
              />
            )}

            {currentStep === 'processing' && (
              <MasteringProgress
                currentStage={processingStage}
                progressPct={processingProgress}
                genre={selectedGenre}
                targetLufs={selectedLufs}
              />
            )}

            {currentStep === 'result' && currentMasterRecord && (
              <div className="space-y-12">
                {/* 1. Loudness-Matched A/B Audition Player */}
                <ComparisonPlayer
                  record={currentMasterRecord}
                  onProceedToDownload={() => {
                    const downloadEl = document.getElementById('download-area');
                    downloadEl?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onRemaster={handleRemaster}
                  onUnlockMaster={() => handleOpenUnlockModal(currentMasterRecord)}
                />

                {/* 2. Official HDQTRZ AI Mastering Report */}
                <div id="report-area">
                  <MasteringReport record={currentMasterRecord} />
                </div>

                {/* 3. Delivery Downloads & Human Studio Upsell */}
                <div id="download-area">
                  <DownloadSection
                    record={currentMasterRecord}
                    onMasterNew={handleMasterNew}
                    onRemaster={handleRemaster}
                    onOpenHumanStudio={() => setShowHumanStudioModal(true)}
                    onUnlockMaster={() => handleOpenUnlockModal(currentMasterRecord)}
                    onAuditionA_B={() => {
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <MasterHistory
            records={masterRecords}
            onSelectRecord={handleSelectRecordFromHistory}
            onRemasterRecord={handleRemasterFromHistory}
            onDeleteRecord={handleDeleteRecord}
            onNewMaster={handleMasterNew}
            onUnlockRecord={handleOpenUnlockModal}
          />
        )}

        {activeTab === 'admin' && (
          isAdminLoggedIn ? (
            <AdminDashboard onLogout={handleAdminLogout} />
          ) : (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-[#111] border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-light text-white">Administrator Restricted</h3>
              <p className="text-xs text-gray-400 font-light">
                Please sign in with authorized studio credentials to access engine operations.
              </p>
              <button
                onClick={() => setShowAdminAuthModal(true)}
                className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C19A2E] text-black font-bold text-xs uppercase tracking-wider transition-all"
              >
                Sign In to Console
              </button>
            </div>
          )
        )}
      </main>

      {/* Studio Footer (Clean Minimalism) */}
      <footer className="px-4 sm:px-8 py-4 bg-[#0A0A0A] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] uppercase tracking-widest text-gray-500">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-gray-400 font-medium tracking-wider">Engine V.2.4.1</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Cloud Rendering: Active</span>
          </span>
          <button
            onClick={() => setShowHumanStudioModal(true)}
            className="hover:text-[#D4AF37] transition-colors"
          >
            Analog Human Suite
          </button>
          <button
            onClick={() => setShowInstructionsModal(true)}
            className="hover:text-white transition-colors"
          >
            Guide & Instructions
          </button>
          <button
            onClick={() => setShowPricingModal(true)}
            className="hover:text-white transition-colors"
          >
            Pricing
          </button>
          <button
            onClick={() => setShowLegalModal(true)}
            className="hover:text-white transition-colors"
          >
            Terms & Copyright
          </button>
        </div>

        <div className="flex items-center gap-4 text-center md:text-right text-gray-500">
          <span>Professional Sound. Intelligent Mastering. © {new Date().getFullYear()} HDQTRZ Studios.</span>
          {/* Discreet Studio Owner Lock Trigger */}
          <button
            onClick={() => {
              if (isAdminLoggedIn) {
                setActiveTab('admin');
              } else {
                setShowAdminAuthModal(true);
              }
            }}
            className="text-gray-600 hover:text-[#D4AF37] transition-colors p-1"
            title="Studio Admin Access"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* Global Modals */}
      <InstructionsModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
      />

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => {
          setShowPricingModal(false);
          setTrackToUnlock(null);
        }}
        trackToUnlock={trackToUnlock}
        userCredits={isAdminLoggedIn ? 999 : user.creditsRemaining}
        isAdminLoggedIn={isAdminLoggedIn}
        onUseCredit={() => {
          handleUnlockTrack(trackToUnlock?.recordId);
        }}
        onPaymentUnlocked={(recordId) => {
          handleUnlockTrack(recordId);
        }}
        onSelectPlan={() => {
          // Checkout is created by PricingModal only after authentication.
        }}
      />

      <HumanStudioModal
        isOpen={showHumanStudioModal}
        onClose={() => setShowHumanStudioModal(false)}
      />

      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        user={user}
        onUpdateUser={(updated) => {
          setUser(prev => {
            const next = { ...prev, ...updated };
            try {
              if (next.subscriptionTier !== 'admin') {
                localStorage.setItem('hdqtrz_user_profile', JSON.stringify(next));
              }
            } catch (e) {
              console.error(e);
            }
            return next;
          });
        }}
        onOpenPricing={() => setShowPricingModal(true)}
      />

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
      />

      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onSuccess={handleAdminAuthSuccess}
      />
    </div>
  );
}
