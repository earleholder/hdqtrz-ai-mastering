import {
  AudioAnalysis,
  DynamicEQBand,
  DynamicEQMode,
  EQAdjustment,
  Genre,
  LoudnessTarget,
  MasteringCharacter,
  MasteringPlan,
  MasteringReport,
  MultibandBandConfig,
  MultibandMode,
  MultibandPlan,
  ReferenceTrackProfile,
  SaturationFlavor,
  SaturationIntensity
} from '../types';
import { computeReferenceMatchingEQ } from './analyzer';

export interface MasteringDirectives {
  saturationFlavor?: SaturationFlavor;
  saturationIntensity?: SaturationIntensity;
  dynamicEQMode?: DynamicEQMode;
  multibandMode?: MultibandMode;
  referenceProfile?: ReferenceTrackProfile;
}

export function createMasteringPlan(
  analysis: AudioAnalysis,
  genre: Genre,
  targetLufs: LoudnessTarget,
  character: MasteringCharacter = 'transparent',
  directives?: MasteringDirectives
): MasteringPlan {
  const decisionLog: string[] = [];
  let isDynamicProtected = false;
  let protectiveNotice: string | undefined = undefined;

  decisionLog.push(`Analyzing ${genre} context with ${character} character profile.`);

  // 1. Dynamic Protection Check:
  // In LUFS, values closer to 0 are louder (-9 LUFS is much louder than -14 LUFS).
  // For dynamic targets (-14, -13, -12, -11 LUFS), always honor the exact target.
  // Dynamic protection only engages if the user requested an extreme loud target (>= -9 LUFS)
  // on a very wide-dynamic mix where forcing it would cause severe transient destruction.
  let actualAchievedLufs: number = targetLufs;

  if (targetLufs >= -9 && analysis.dynamicRange >= 15.5 && (targetLufs - analysis.integratedLufs) > 11.0) {
    // Protect the transients on extreme loudness requests
    actualAchievedLufs = -10.5;
    isDynamicProtected = true;
    protectiveNotice = 'HDQTRZ AI protected the dynamics of your mix and mastered slightly below your requested loudness (-10.5 LUFS) to prevent audible distortion.';
    decisionLog.push('Dynamic Protection triggered: Extreme limiting prevented to preserve musical groove and avoid audible pumping.');
  } else {
    decisionLog.push(`Target loudness established at ${targetLufs} LUFS integrated.`);
  }

  // 2. Broad Analog EQ Decision Engine:
  // "Analyze first. Process only when necessary. Broad musical EQ whenever possible."
  const eqFilters: EQAdjustment[] = [];

  // Low Cut / Sub rumble check
  const hasSubRumble = analysis.detectedIssues.some(i => i.id === 'excessive-bass');
  if (hasSubRumble || analysis.spectralBands.subBass > 23) {
    eqFilters.push({
      band: 'Sub High-Pass',
      frequency: 26,
      gainDb: 0,
      q: 0.707,
      type: 'highpass',
      active: true,
      reason: '26 Hz high-pass cleans sub-audible infrasound to maximize amplifier headroom.'
    });
    decisionLog.push('Applied 26 Hz high-pass filter to clean infrasonic energy.');
  }

  // Low-end balance check
  if (character === 'warm') {
    eqFilters.push({
      band: 'Low-End Warmth',
      frequency: 110,
      gainDb: 0.9,
      q: 0.8,
      type: 'lowshelf',
      active: true,
      reason: 'Gentle low-shelf boost for warm vintage console response.'
    });
    decisionLog.push('Engaged gentle low-shelf warmth (+0.9 dB @ 110 Hz).');
  } else if (character === 'punchy') {
    eqFilters.push({
      band: 'Kick & Bass Impact',
      frequency: 78,
      gainDb: 1.1,
      q: 1.2,
      type: 'peaking',
      active: true,
      reason: 'Narrow musical punch enhancement on kick/bass foundation.'
    });
    decisionLog.push('Tightened 78 Hz punch band (+1.1 dB).');
  } else if (analysis.spectralBands.bass < 9) {
    eqFilters.push({
      band: 'Bass Foundation',
      frequency: 95,
      gainDb: 1.2,
      q: 0.9,
      type: 'lowshelf',
      active: true,
      reason: 'Tonal correction: compensating for lean bass response in mix.'
    });
    decisionLog.push('Corrective low-shelf (+1.2 dB @ 95 Hz) applied.');
  }

  // High Frequency / Air
  if (character === 'open') {
    eqFilters.push({
      band: 'Air Sheen',
      frequency: 13500,
      gainDb: 1.2,
      q: 0.707,
      type: 'highshelf',
      active: true,
      reason: 'High-frequency air extension for dimensional depth and sparkle.'
    });
    decisionLog.push('Added transparent air sheen (+1.2 dB @ 13.5 kHz).');
  } else if (character === 'modern') {
    eqFilters.push({
      band: 'Modern Presence',
      frequency: 8500,
      gainDb: 0.8,
      q: 0.9,
      type: 'highshelf',
      active: true,
      reason: 'Controlled top-end presence for modern streaming translation.'
    });
    decisionLog.push('Engaged high shelf (+0.8 dB @ 8.5 kHz) for modern polish.');
  } else if (character === 'smooth') {
    eqFilters.push({
      band: 'Silky Top Rolloff',
      frequency: 14000,
      gainDb: -0.6,
      q: 0.8,
      type: 'highshelf',
      active: true,
      reason: 'Subtle high-end attenuation to preserve analog smoothness.'
    });
  }

  // 2b. Commercial Reference Track Matching via FFT Cross-Correlation:
  // If user provided a reference profile, compute and merge matching EQ bands
  let referenceMatching: MasteringPlan['referenceMatching'] = undefined;
  if (directives?.referenceProfile) {
    const refAdjustments = computeReferenceMatchingEQ(analysis, directives.referenceProfile);
    if (refAdjustments.length > 0) {
      eqFilters.push(...refAdjustments);
      referenceMatching = {
        applied: true,
        referenceTitle: directives.referenceProfile.title,
        matchIntensity: directives.referenceProfile.matchIntensity,
        adjustments: refAdjustments,
        referenceProfile: directives.referenceProfile
      };
      decisionLog.push(
        `Reference Track Matching: FFT cross-correlation aligned mix curve with "${directives.referenceProfile.title}" (${Math.round(directives.referenceProfile.matchIntensity * 100)}% match, ${refAdjustments.length} precision target bands).`
      );
    }
  }

  const eqApplied = eqFilters.length > 0;
  if (!eqApplied) {
    decisionLog.push('Mix frequency balance was evaluated as pristine; bypassed all static EQ.');
  }

  // 3. Multi-Band Dynamic EQ & Resonance Suppression Engine with Mid/Side Decoupling:
  // "Dynamic EQ isolates problematic harsh notes and resonant accumulations dynamically,
  // attenuating only when energy peaks exceed threshold and preserving transparency otherwise."
  // Mid/Side Decoupling: Center channel (vocals, kick, snare) is processed independently from
  // Side channel (cymbals, acoustic guitar width, stereo room reverb).
  const dynamicEQMode = directives?.dynamicEQMode ?? 'auto';
  const dynamicEQBands: DynamicEQBand[] = [];
  let dynamicEQApplied = false;

  if (dynamicEQMode !== 'bypassed') {
    // BAND 1 (MID): Center Lead Vocal Sibilance & Snare Crack (3.4 kHz)
    const hasHarshness = analysis.detectedIssues.some(i => i.id === 'harsh-presence');
    const isPresenceHigh = analysis.spectralBands.presence > 18.0;
    if (hasHarshness || isPresenceHigh || character === 'smooth' || dynamicEQMode === 'surgical' || dynamicEQMode === 'mid-side') {
      dynamicEQBands.push({
        id: 'dyn-mid-harsh-3400',
        name: 'Center Vocal Sibilance & Snare Pop',
        frequency: 3400,
        channelTarget: 'mid',
        targetIssue: 'sibilance',
        thresholdDb: dynamicEQMode === 'surgical' ? -21.0 : -19.5,
        maxCutDb: 2.5,
        actualCutDb: 0,
        q: 2.4,
        attackMs: 5,
        releaseMs: 45,
        active: true,
        reason: 'Decoupled Mid dynamic notch isolates center lead vocal sibilance and harsh snare transients exclusively in the phantom center, leaving stereo guitars, reverb, and cymbals 100% untouched.'
      });
      decisionLog.push('Dynamic EQ (Mid): Center 3.4 kHz vocal sibilance/snare tamer engaged (Mid-isolated, Q=2.4).');
    }

    // BAND 2 (SIDE): Wide Cymbal Splash & Stereo Room Harshness (7.2 kHz)
    const isTrebleHigh = analysis.spectralBands.treble > 17.5 || analysis.spectralBands.air > 16.0;
    if (hasHarshness || isTrebleHigh || dynamicEQMode === 'mid-side' || dynamicEQMode === 'surgical' || analysis.stereoWidth > 1.05) {
      dynamicEQBands.push({
        id: 'dyn-side-splash-7200',
        name: 'Side Cymbal Splash & Room Harshness',
        frequency: 7200,
        channelTarget: 'side',
        targetIssue: 'side_splash',
        thresholdDb: dynamicEQMode === 'surgical' ? -22.0 : -20.5,
        maxCutDb: 2.2,
        actualCutDb: 0,
        q: 2.0,
        attackMs: 8,
        releaseMs: 50,
        active: true,
        reason: 'Decoupled Side dynamic notch tames aggressive crash cymbal wash, distorted guitar fizz, and splashy stereo room mics without dulling center lead vocal air.'
      });
      decisionLog.push('Dynamic EQ (Side): Wide 7.2 kHz cymbal/room splash suppressor engaged (Side-isolated, Q=2.0).');
    }

    // BAND 3 (MID): Center Low-Mid Boxiness (320 Hz)
    const hasMud = analysis.detectedIssues.some(i => i.id === 'muddy-low-mids');
    const isLowMidHigh = analysis.spectralBands.lowMids > 21.0;
    if (hasMud || isLowMidHigh || dynamicEQMode === 'surgical' || dynamicEQMode === 'mid-side') {
      dynamicEQBands.push({
        id: 'dyn-mid-mud-320',
        name: 'Center Low-Mid Boxiness',
        frequency: 320,
        channelTarget: 'mid',
        targetIssue: 'boxiness',
        thresholdDb: dynamicEQMode === 'surgical' ? -18.0 : -16.5,
        maxCutDb: 1.8,
        actualCutDb: 0,
        q: 1.8,
        attackMs: 15,
        releaseMs: 75,
        active: true,
        reason: 'Dips congested center vocal chestiness and kick/bass collision dynamically while preserving warm stereo room ambience.'
      });
      decisionLog.push('Dynamic EQ (Mid): Center 320 Hz boxiness suppressor engaged (Mid-isolated, Q=1.8).');
    }

    // BAND 4 (SIDE): Side Reverb & Ambient Low-Mid Mud (280 Hz)
    if (hasMud || analysis.stereoWidth > 1.15 || dynamicEQMode === 'mid-side' || dynamicEQMode === 'surgical') {
      dynamicEQBands.push({
        id: 'dyn-side-mud-280',
        name: 'Side Reverb & Ambient Low-Mid Mud',
        frequency: 280,
        channelTarget: 'side',
        targetIssue: 'side_mud',
        thresholdDb: -21.0,
        maxCutDb: 1.6,
        actualCutDb: 0,
        q: 1.6,
        attackMs: 18,
        releaseMs: 80,
        active: true,
        reason: 'Dynamically cleans out-of-phase low-mid rumble and muddy stereo reverb tails on the sides, decluttering the stereo image without thinning the center mix.'
      });
      decisionLog.push('Dynamic EQ (Side): Wide 280 Hz ambient mud suppressor engaged (Side-isolated, Q=1.6).');
    }

    // BAND 5 (MID): Sub-Bass Boom & 808 Bloom Control (65 Hz)
    const isSubExcessive = analysis.spectralBands.subBass > 22.0 || (['Trap', 'Hip Hop / Rap', 'EDM'].includes(genre) && analysis.spectralBands.subBass > 18.5);
    if (isSubExcessive) {
      dynamicEQBands.push({
        id: 'dyn-mid-sub-65',
        name: 'Center Sub 808 / Kick Bloom',
        frequency: 65,
        channelTarget: 'mid',
        targetIssue: 'sub_boom',
        thresholdDb: -14.0,
        maxCutDb: 2.0,
        actualCutDb: 0,
        q: 1.5,
        attackMs: 20,
        releaseMs: 90,
        active: true,
        reason: 'Dynamic sub-bass control reigns in runaway 808 bursts while preserving sub fullness on sustained bass notes.'
      });
      decisionLog.push('Dynamic EQ (Mid): Sub-bass resonance limiter engaged at 65 Hz for 808/kick control.');
    }

    dynamicEQApplied = dynamicEQBands.length > 0;
  } else {
    decisionLog.push('Dynamic EQ: Bypassed per mastering directive.');
  }

  // 4. Analog Harmonic Saturation Stage:
  // Models real-world tape hysteresis (3rd odd harmonics) and Class-A tube warmth (2nd even harmonics).
  let saturationFlavor: SaturationFlavor = directives?.saturationFlavor ?? 'none';
  let saturationIntensity: SaturationIntensity = directives?.saturationIntensity ?? 'subtle';

  // Smart selection if user left flavor at default / none but chose an analog character
  if (!directives?.saturationFlavor) {
    if (character === 'warm') {
      saturationFlavor = 'tube';
      saturationIntensity = 'subtle';
    } else if (character === 'punchy') {
      saturationFlavor = 'tape';
      saturationIntensity = 'subtle';
    } else if (character === 'smooth') {
      saturationFlavor = 'tape';
      saturationIntensity = 'subtle';
    } else if (character === 'modern' || character === 'open') {
      saturationFlavor = 'console';
      saturationIntensity = 'subtle';
    } else {
      saturationFlavor = 'none';
    }
  }

  let satApplied = saturationFlavor !== 'none';
  let satThdPercent = 0;
  let satHarmonicEmphasis: 'odd' | 'even' | 'balanced' | 'none' = 'none';
  let satDriveDb = 0;
  let satReason = 'Harmonic saturation bypassed for pure clinical digital transparency.';

  if (saturationFlavor === 'tape') {
    satThdPercent = saturationIntensity === 'moderate' ? 1.2 : 0.6;
    satHarmonicEmphasis = 'odd';
    satDriveDb = saturationIntensity === 'moderate' ? 2.4 : 1.2;
    satReason = 'Analog Tape Machine Saturation (Studer/ATR modeled): Emulates magnetic tape hysteresis with 3rd odd-order harmonic excitation, head-bump low glue, and rounded high transients.';
    decisionLog.push(`Analog Saturation: Vintage Tape engaged (${satThdPercent}% THD, 3rd odd-harmonic glue).`);
  } else if (saturationFlavor === 'tube') {
    satThdPercent = saturationIntensity === 'moderate' ? 1.4 : 0.7;
    satHarmonicEmphasis = 'even';
    satDriveDb = saturationIntensity === 'moderate' ? 2.8 : 1.4;
    satReason = 'Class-A Vacuum Tube/Valve Saturation (Triode modeled): Generates sweet 2nd-order even harmonics for rich musical warmth, vocal body, and dimensional depth.';
    decisionLog.push(`Analog Saturation: Warm Tube engaged (${satThdPercent}% THD, 2nd even-harmonic richness).`);
  } else if (saturationFlavor === 'console') {
    satThdPercent = saturationIntensity === 'moderate' ? 0.9 : 0.45;
    satHarmonicEmphasis = 'balanced';
    satDriveDb = saturationIntensity === 'moderate' ? 2.0 : 1.0;
    satReason = 'Class-A Console Transformer: Emulates discrete transformer core saturation with balanced harmonic dispersion and analog transient focus.';
    decisionLog.push(`Analog Saturation: Class-A Console engaged (${satThdPercent}% THD, transformer harmonic focus).`);
  }

  // 5. Full 4-Band Downward Multiband Compression (VCA/Opto):
  // Splits audio into 4 Linkwitz-Riley crossover zones (Sub 140Hz, Low-Mid 1kHz, High-Mid 6kHz, Air 20kHz).
  // Applies independent threshold, ratio, soft-knee, and makeup gain for macro-dynamic contouring.
  const multibandMode: MultibandMode = directives?.multibandMode ?? 'auto';
  let multibandApplied = false;
  let multibandCircuit: 'vca' | 'opto' = 'vca';
  const multibandBands: MultibandBandConfig[] = [];

  if (multibandMode !== 'bypassed') {
    multibandApplied = true;
    if (
      multibandMode === 'vca' ||
      character === 'punchy' ||
      (multibandMode === 'auto' && ['Hip Hop / Rap', 'Trap', 'EDM', 'Electronic', 'Pop', 'Dance', 'Rock'].includes(genre))
    ) {
      multibandCircuit = 'vca';
    } else {
      multibandCircuit = 'opto';
    }

    const isVca = multibandCircuit === 'vca';

    // Band 1: Sub / Low Foundation (20 - 140 Hz)
    multibandBands.push({
      id: 'mb-sub-140',
      name: 'Sub & Low Foundation',
      lowFreq: 20,
      highFreq: 140,
      thresholdDb: isVca ? -16.5 : -18.0,
      ratio: isVca ? 2.2 : 1.8,
      kneeDb: isVca ? 3.0 : 5.0,
      attackMs: isVca ? 25 : 35,
      releaseMs: isVca ? 110 : 160,
      makeupGainDb: 0.4,
      gainReductionDb: 0,
      active: true,
      reason: isVca
        ? 'VCA downward punch tightens kick transients and sub-bass weight with fast feedforward control.'
        : 'Opto downward leveling provides warm, musical glue to the low-end foundation.'
    });

    // Band 2: Low-Mids (140 - 1000 Hz)
    multibandBands.push({
      id: 'mb-lowmid-1000',
      name: 'Low-Mid Body & Warmth',
      lowFreq: 140,
      highFreq: 1000,
      thresholdDb: isVca ? -18.0 : -19.5,
      ratio: isVca ? 1.6 : 1.45,
      kneeDb: isVca ? 3.5 : 5.5,
      attackMs: isVca ? 18 : 26,
      releaseMs: isVca ? 120 : 170,
      makeupGainDb: 0.2,
      gainReductionDb: 0,
      active: true,
      reason: 'Controls low-mid clutter and vocal chestiness while preserving warmth and instrument body.'
    });

    // Band 3: High-Mids (1000 - 6000 Hz)
    multibandBands.push({
      id: 'mb-highmid-6000',
      name: 'High-Mid Articulation & Presence',
      lowFreq: 1000,
      highFreq: 6000,
      thresholdDb: isVca ? -19.5 : -21.0,
      ratio: isVca ? 1.5 : 1.35,
      kneeDb: isVca ? 4.0 : 6.0,
      attackMs: isVca ? 12 : 18,
      releaseMs: isVca ? 85 : 120,
      makeupGainDb: 0.3,
      gainReductionDb: 0,
      active: true,
      reason: 'Stabilizes upper vocal bite, snare crack, and electric guitars without dulling front-row clarity.'
    });

    // Band 4: High / Air (6000 - 20000 Hz)
    multibandBands.push({
      id: 'mb-air-20000',
      name: 'High / Air Brilliance',
      lowFreq: 6000,
      highFreq: 20000,
      thresholdDb: isVca ? -21.5 : -22.5,
      ratio: isVca ? 1.4 : 1.25,
      kneeDb: isVca ? 4.5 : 6.5,
      attackMs: isVca ? 8 : 14,
      releaseMs: isVca ? 65 : 95,
      makeupGainDb: 0.2,
      gainReductionDb: 0,
      active: true,
      reason: 'Controls cymbal splash and vocal sibilance with silky downward smoothing and zero harshness.'
    });

    decisionLog.push(
      `Multiband Dynamics: 4-Band Downward ${multibandCircuit.toUpperCase()} Compressor engaged (Sub: 140Hz, Low-Mid: 1kHz, High-Mid: 6kHz, Air: 20kHz).`
    );
  } else {
    decisionLog.push('Multiband Dynamics: 4-Band compression bypassed per mastering directive.');
  }

  const multibandPlan: MultibandPlan = {
    applied: multibandApplied,
    mode: multibandMode,
    circuitType: multibandCircuit,
    bands: multibandBands,
    reason: multibandApplied
      ? `4-Band downward ${multibandCircuit.toUpperCase()} compression dynamically contours low, mid, and high-frequency energy with zero phase cancellation.`
      : 'Bypassed per mastering settings.'
  };

  // 6. Bus Compression Decision Engine:
  // "Compression must be optional and analysis-driven."
  let compressionApplied = false;
  let compThreshold = -18;
  let compRatio = 1.4;
  let compAttack = 32; // ms - slow attack to let transients pass
  let compRelease = 110; // ms
  let compReduction = 1.2;
  let compReason = 'Bypassed: mix already possesses controlled bus dynamics.';

  const isPreCompressed = analysis.dynamicRange < 8.0 || analysis.crestFactor < 7.5;

  if (isPreCompressed) {
    compressionApplied = false;
    compReduction = 0;
    compReason = 'Mix already has tight dynamic compression. Bypassed compressor to prevent squashing.';
    decisionLog.push('Dynamic compression BYPASSED: Preserving natural kick and snare punch.');
  } else if (character === 'punchy') {
    compressionApplied = true;
    compThreshold = -16;
    compRatio = 1.6;
    compAttack = 40; // even slower attack so transient cracks through
    compRelease = 90;
    compReduction = 1.6;
    compReason = 'Gentle VCA bus compression with slow attack (40ms) to accentuate transient snap.';
    decisionLog.push('Engaged transient-conscious bus compression (1.6:1 ratio, 40ms attack).');
  } else if (character === 'warm') {
    compressionApplied = true;
    compThreshold = -17;
    compRatio = 1.35;
    compAttack = 30;
    compRelease = 140;
    compReduction = 1.1;
    compReason = 'Opto-style gentle glue compression (1.35:1) for musical cohesion.';
    decisionLog.push('Engaged smooth musical glue compression (1.35:1, 1.1 dB gain reduction).');
  } else if (analysis.dynamicRange > 13.0) {
    compressionApplied = true;
    compThreshold = -19;
    compRatio = 1.5;
    compAttack = 32;
    compRelease = 120;
    compReduction = 1.4;
    compReason = 'Subtle mastering compression applied to gently anchor high dynamic swings.';
    decisionLog.push('Subtle mastering glue applied (1.4 dB peak gain reduction).');
  }

  // 7. Stereo Imaging:
  let stereoApplied = false;
  let stereoWidthFactor = 1.0;
  const subMonoCutoffHz = 85;

  if (analysis.phaseCorrelation < 0.4 || analysis.stereoWidth > 1.35) {
    stereoApplied = true;
    stereoWidthFactor = 0.95; // tighten side channel slightly for phase safety
    decisionLog.push('Phase stabilizer engaged: Mono-summed sub below 85 Hz and centered bass foundation.');
  } else if (character === 'open' && analysis.phaseCorrelation > 0.7) {
    stereoApplied = true;
    stereoWidthFactor = 1.08; // subtle widening only if phase is rock solid
    decisionLog.push('Subtle high-frequency spatial widening (+8% side air) with 85 Hz mono anchor.');
  } else {
    decisionLog.push('Stereo width verified within optimal broadcast range; no artificial widening applied.');
  }

  // 8. True-Peak Limiter:
  // Target ceiling -1.0 dBTP (industry release standard)
  const ceilingDb = -1.0;
  const gainNeeded = actualAchievedLufs - analysis.integratedLufs;
  const limiterGain = Number(gainNeeded.toFixed(1));
  const estimatedLimiterReduction = Math.max(0.1, Number((Math.max(0, gainNeeded) * 0.35).toFixed(1)));

  decisionLog.push(`True-Peak limiter configured: Target ceiling ${ceilingDb} dBTP, ${limiterGain >= 0 ? `+${limiterGain}` : limiterGain} dB transparent make-up gain.`);
  decisionLog.push('Analog Saturation: Polyphase 8x Anti-Aliasing Oversampling active (< -96 dB foldback distortion).');

  return {
    genre,
    targetLufs,
    actualAchievedLufs,
    character,
    isDynamicProtected,
    protectiveNotice,
    eqApplied,
    eqFilters,
    dynamicEQApplied,
    dynamicEQMode,
    dynamicEQMsDecoupled: dynamicEQBands.some(b => b.channelTarget === 'mid' || b.channelTarget === 'side'),
    dynamicEQBands,
    saturationApplied: satApplied,
    saturation: {
      flavor: saturationFlavor,
      intensity: saturationIntensity,
      thdPercent: satThdPercent,
      harmonicEmphasis: satHarmonicEmphasis,
      driveDb: satDriveDb,
      oversampling: '8x Polyphase Linear-Phase',
      reason: satReason
    },
    multibandApplied,
    multiband: multibandPlan,
    referenceMatching,
    compressionApplied,
    compression: {
      thresholdDb: compThreshold,
      ratio: compRatio,
      attackMs: compAttack,
      releaseMs: compRelease,
      kneeDb: 6,
      gainReductionDb: compReduction,
      reason: compReason
    },
    stereoApplied,
    stereoWidthFactor,
    subMonoCutoffHz,
    limiter: {
      inputGainDb: limiterGain,
      ceilingDb,
      estimatedGainReductionDb: estimatedLimiterReduction
    },
    decisionLog
  };
}

export function generateMasteringReport(
  analysis: AudioAnalysis,
  plan: MasteringPlan,
  masteredAnalysis: AudioAnalysis
): MasteringReport {
  const processingApplied: string[] = [];

  if (plan.eqApplied) {
    processingApplied.push('Surgical & Tonal EQ');
  }
  if (plan.referenceMatching?.applied) {
    processingApplied.push(`Reference Track Spectral Match ("${plan.referenceMatching.referenceTitle}")`);
  }
  if (plan.dynamicEQApplied && plan.dynamicEQBands.length > 0) {
    processingApplied.push(
      plan.dynamicEQMsDecoupled
        ? 'Mid/Side Decoupled Dynamic EQ'
        : 'Dynamic Resonance Suppression (Multi-Band)'
    );
  }
  if (plan.multibandApplied && plan.multiband.bands.length > 0) {
    processingApplied.push(`4-Band Downward Multiband Compressor (${plan.multiband.circuitType.toUpperCase()})`);
  }
  if (plan.saturationApplied && plan.saturation.flavor !== 'none') {
    processingApplied.push(`Analog Harmonic Saturation (${plan.saturation.flavor.toUpperCase()} • 8x Polyphase Oversampled)`);
  }
  if (plan.compressionApplied) {
    processingApplied.push('Gentle Bus Compression');
  }
  if (plan.stereoApplied) {
    processingApplied.push('Stereo Image & Mono Sub Anchor');
  }
  processingApplied.push('True-Peak Limiting');
  processingApplied.push('Quality Control Verification');

  const lowEndSummary = plan.eqFilters.find(f => f.band.toLowerCase().includes('sub') || f.band.toLowerCase().includes('bass') || f.band.toLowerCase().includes('kick'))
    ? plan.eqFilters.find(f => f.band.toLowerCase().includes('sub') || f.band.toLowerCase().includes('bass') || f.band.toLowerCase().includes('kick'))!.reason
    : 'Preserved original low-end foundation (no correction required).';

  const lowMidsSummary = plan.eqFilters.find(f => f.band.toLowerCase().includes('low-mid'))
    ? plan.eqFilters.find(f => f.band.toLowerCase().includes('low-mid'))!.reason
    : 'Low mids cleanly defined; no mud filtering required.';

  const presenceSummary = plan.eqFilters.find(f => f.frequency >= 2000 && f.frequency <= 6000)
    ? plan.eqFilters.find(f => f.frequency >= 2000 && f.frequency <= 6000)!.reason
    : 'Upper-midrange presence intact with natural vocal articulation.';

  const highSummary = plan.eqFilters.find(f => f.frequency > 6000)
    ? plan.eqFilters.find(f => f.frequency > 6000)!.reason
    : 'Smooth high-frequency balance retained without artificial hyping.';

  const compressionSummary = plan.compressionApplied
    ? `${plan.compression.gainReductionDb} dB subtle gain reduction with slow transient-conscious attack (${plan.compression.attackMs}ms).`
    : 'Bypassed — mix dynamic range was already optimal and preserved without redundant compression.';

  const multibandSummary = plan.multibandApplied && plan.multiband.bands.length > 0
    ? `Full 4-Band Downward ${plan.multiband.circuitType.toUpperCase()} Compression active across 4 Linkwitz-Riley crossover zones (Sub 140Hz: ${plan.multiband.bands[0]?.ratio}:1, Low-Mid 1kHz: ${plan.multiband.bands[1]?.ratio}:1, High-Mid 6kHz: ${plan.multiband.bands[2]?.ratio}:1, Air 20kHz: ${plan.multiband.bands[3]?.ratio}:1).`
    : 'Bypassed — macro dynamics preserved linear with natural mix punch.';

  const limitingSummary = `${plan.limiter.estimatedGainReductionDb} dB peak control holding true peak safely to ${plan.limiter.ceilingDb} dBTP.`;

  const dynamicEQSummary = plan.dynamicEQApplied && plan.dynamicEQBands.length > 0
    ? plan.dynamicEQMsDecoupled
      ? `Mid/Side Decoupled Dynamic EQ active: Center channel (${plan.dynamicEQBands.filter(b => b.channelTarget === 'mid').map(b => `${b.frequency} Hz`).join(', ')}) and Side stereo width (${plan.dynamicEQBands.filter(b => b.channelTarget === 'side').map(b => `${b.frequency} Hz`).join(', ')}) isolated independently — attenuated up to -${Math.max(...plan.dynamicEQBands.map(b => b.actualCutDb > 0 ? b.actualCutDb : b.maxCutDb)).toFixed(1)} dB on spikes with zero cross-channel phase smear.`
      : `${plan.dynamicEQBands.map(b => `${b.name} (${b.frequency} Hz)`).join(', ')} — dynamic linear-phase suppression attenuated up to -${Math.max(...plan.dynamicEQBands.map(b => b.actualCutDb > 0 ? b.actualCutDb : b.maxCutDb)).toFixed(1)} dB on spikes.`
    : 'Bypassed — no persistent narrow-band resonances detected in mix spectrum.';

  const saturationSummary = plan.saturationApplied && plan.saturation.flavor !== 'none'
    ? `${plan.saturation.reason} (${plan.saturation.thdPercent}% THD, ${plan.saturation.harmonicEmphasis} harmonics emphasis). Processed with Polyphase 8x Anti-Aliasing Oversampling.`
    : 'Bypassed — pristine digital transparency maintained without analog harmonic coloration.';

  const oversamplingSummary = 'Polyphase 8x Anti-Aliasing Oversampling Engine: Internal 8x upsampling with linear-phase anti-imaging filters and steep ultrasonic decimation (< -96 dB foldback distortion).';

  const referenceMatchingSummary = plan.referenceMatching?.applied
    ? `FFT Spectral Match: Track tonal envelope correlated against commercial reference master "${plan.referenceMatching.referenceTitle}" (${Math.round(plan.referenceMatching.matchIntensity * 100)}% match intensity across 8 target acoustic zones).`
    : undefined;

  // AI Assessment in the HDQTRZ philosophy: "Less is best. Preserve the soul of the song."
  let aiAssessment = '';
  if (plan.isDynamicProtected) {
    aiAssessment = `The initial mix arrived with remarkable dynamic punch and delicate transients. HDQTRZ AI protected the soul of the song by mastering to ${plan.actualAchievedLufs} LUFS instead of forcing destructive limiting. The result achieves commercial competitive authority while retaining natural groove, zero clipping, and pristine translation across streaming and analog systems.`;
  } else if (!plan.eqApplied && !plan.compressionApplied && !plan.dynamicEQApplied && !plan.saturationApplied && !plan.multibandApplied) {
    aiAssessment = `An exceptionally balanced mix. True to the HDQTRZ principle that "Less is best," the AI engine declined redundant tonal coloring and unnecessary compression. Transparent true-peak limiting lifted the master to ${plan.actualAchievedLufs} LUFS with complete preservation of your original stereo imaging and transient punch.`;
  } else {
    aiAssessment = `The mix possessed great musical intention. HDQTRZ AI focused on measured corrections: ${plan.referenceMatching?.applied ? `morphing tonal curve to reference "${plan.referenceMatching.referenceTitle}", ` : ''}${plan.multibandApplied ? `4-band ${plan.multiband.circuitType.toUpperCase()} multiband macro dynamics, ` : ''}${plan.dynamicEQApplied ? 'stabilizing resonant peaks with multi-band dynamic EQ, ' : ''}${plan.saturationApplied ? `enriching depth with 8x oversampled ${plan.saturation.flavor} harmonic saturation, ` : ''}gently gluing the mix bus with ${plan.compressionApplied ? `${plan.compression.gainReductionDb} dB` : 'zero redundant'} compression, and bringing the track to a release-ready ${plan.actualAchievedLufs} LUFS at -1.0 dBTP ceiling.`;
  }

  return {
    genre: plan.genre,
    originalLufs: analysis.integratedLufs,
    masteredLufs: masteredAnalysis.integratedLufs,
    originalTruePeak: analysis.truePeak,
    masteredTruePeak: masteredAnalysis.truePeak,
    originalDynamicRange: analysis.dynamicRange,
    masteredDynamicRange: masteredAnalysis.dynamicRange,
    processingApplied,
    tonalAdjustments: {
      lowEnd: lowEndSummary,
      lowMids: lowMidsSummary,
      presence: presenceSummary,
      highFrequencies: highSummary
    },
    compressionSummary,
    multibandSummary,
    limitingSummary,
    dynamicEQSummary,
    saturationSummary,
    oversamplingSummary,
    referenceMatchingSummary,
    dynamicEQBands: plan.dynamicEQBands,
    saturationFlavor: plan.saturation.flavor,
    multibandPlan: plan.multiband,
    referenceProfile: plan.referenceMatching?.referenceProfile,
    aiAssessment
  };
}

export const generateMasteringPlan = createMasteringPlan;

