# Launch Readiness & Operational Safeguards Plan
**HDQTRZ AI Preview Mastering Pipeline (Engine Version: 2.4.0)**

---

## 1. Operational Safeguards & Architecture

### 1.1 Centralized Engine Versioning
* Current Version: `ENGINE_VERSION = '2.4.0'` defined in `src/audio/config.ts`.
* Every mastering run, export receipt, and diagnostic audit stamp is keyed with this exact version string for deterministic reproducibility.

### 1.2 Resource & Memory Safeguards
* **File Duration Limit**: 15 minutes (900 seconds) enforced pre-analysis.
* **File Size Cap**: 250 MB maximum per upload (`SAFEGUARDS.maxFileSizeBytes`).
* **Processing Timeout**: 60 seconds (`SAFEGUARDS.processingTimeoutMs`) across offline audio context rendering loops.
* **Ephemeral In-Memory Buffers**: Audio data resides solely in browser memory (Web Audio `AudioBuffer`). Zero audio persistence to remote disks or unauthorized cloud buckets.

### 1.3 Incident Rollback & Kill-Switch Mechanism
In the event that abnormal DSP behavior, audio corruption, or unexpected regression is reported in production:
1. **Frontend Feature Kill-Switch**: The `CONFIG.gate` policy can immediately transition any questionable processing directive into a mandatory `BLOCK` state, halting audio generation without client crashes.
2. **Git Deployment Rollback**: Because all production deployments are synced from exact main branch commits with verifiable SHAs, instant rollback to previous verified commit tags (e.g., `6d0e676`) can be triggered within seconds.
3. **Receipt Traceability**: Customer-submitted Processing Receipts provide exact input metrics, DSP parameters, and verification flags without containing raw audio or personally identifiable information (PII).

---

## 2. Beta Validation Protocol (30–50 Real-Mix Validation)
*Status: Scheduled for human engineering team execution; not marked complete.*

### Cohort Breakdown:
* **Hip Hop / Trap (8–10 tracks)**: Heavy 808 sub-bass, 30–60 Hz mono-summing integrity, rapid hi-hat transient preservation.
* **R&B / Soul (6–8 tracks)**: Lead vocal intimacy, warmth preservation, sibilance control around 6–8 kHz.
* **Rock / Alternative (6–8 tracks)**: Aggressive drum transients, stereo guitar width, bus compression breathing.
* **Electronic / EDM / House (6–8 tracks)**: Extreme RMS density, kick-bass punch, 4-band multiband behavior under high continuous energy.
* **Acoustic / Jazz / Classical (4–6 tracks)**: Ultra-high dynamic crest factor (>14 dB), zero audible pumping, low harmonic coloration.
* **Short-Program Tracks (<60 seconds, 4 tracks)**: Verification of low-confidence LRA flag handling per EBU Tech 3342.

---

## 3. Multi-System Listening Test Protocol
*Status: Scheduled for studio listening panel; not marked complete.*

To guarantee translation beyond computer speakers, auditioning must be completed across 5 standardized acoustic playback environments:
1. **Studio Main Monitors**: High-end flat response (ATC / Barefoot / Genelec) in acoustically treated rooms to inspect sub-100Hz phase correlation and air extension.
2. **Open-Back Reference Headphones**: Sennheiser HD650 / Audeze LCD-X to verify stereo imaging, micro-transients, and dither floor.
3. **Consumer Wireless Earbuds**: Apple AirPods Pro / Sony WF-1000XM5 with AAC Bluetooth compression active to inspect codec overshoot.
4. **Automotive Sound System**: Standard multi-driver car audio system to test real-world cabin resonance and low-end translation.
5. **Smartphone Mono Speaker**: iPhone / Android built-in speaker to confirm zero comb filtering or vocal cancellation from the 100 Hz mono-low filter.

---

## 4. Reference-Tool Comparison Tolerances
*Status: Validation protocol established.*

Measurements derived from HDQTRZ's BS.1770-4 K-weighting filter and 4x Polyphase True Peak detector must align with industry gold-standard meters (iZotope Insight 2, TC Electronic Master X HD, NUGEN VisLM, and FabFilter Pro-L2):
* **Integrated Loudness (LUFS)**: Maximum discrepancy &le; &plusmn;0.2 LUFS.
* **True Peak (dBTP)**: Maximum discrepancy &le; &plusmn;0.1 dBTP across 4x oversampled inter-sample peaks.
* **Loudness Range (LRA)**: Maximum discrepancy &le; &plusmn;0.3 LU on full-length programs (&ge; 60 seconds).
* **Peak-to-Loudness Ratio (PLR)**: Maximum discrepancy &le; &plusmn;0.2 dB.

---

## 5. False Pass & False Block Review Criteria
*Status: Continuous telemetry and user feedback audit.*

* **False Block Review**: Mixes flagged as BLOCK must genuinely violate electrical clipping runs (&ge;10 runs of &ge;3 flat-top samples), exceed true peak ceiling (>0.0 dBTP), have negative stereo correlation (<0.0), or exceed -9 LUFS input level. Clean 32-bit floating point exports near full scale with intact crest factor must not be blocked.
* **False Pass Review**: Tracks that technically pass all electrical checks but suffer from aesthetic defects (dark top, flat arrangement, dull dynamics) are passed with clear **Aesthetic Risk Indicators** and a prominent recommendation for human mastering review.

---

## 6. Privacy & Legal Compliance Review
*Status: Verified against codebase architecture.*

* **100% Client-Side Processing**: Audio data is parsed and processed via Web Audio API and Web Workers in local browser memory.
* **Zero Audio Uploads**: No raw unmastered, mastered, or reference audio files are transmitted to HDQTRZ remote servers or third-party storage buckets during AI Preview generation.
* **No AI Model Training**: Customer musical compositions, arrangements, and stems are never collected or utilized to train machine learning models.
* **Safe Metadata / Receipt Privacy**: Processing Receipts and audit logs deliberately exclude private user IDs, tokens, or email addresses.

---

## 7. Terms & 100% Credit Guarantee Policy
*Status: Copy and policy integrated into UI.*

* **Customer Credit Guarantee**: 100% of any AI Preview purchase ($9.99) can be credited in full toward eligible analog human mastering sessions with Earle Holder at HDQTRZ Mastering Studios.
* **Transparent Limitations**: Automated processing receipts and UI explicitly state that automated acoustic measurements cannot judge vocal balance, emotional impact, or artistic intent.

---

## 8. Reference-Track Comparison Architecture Roadmap (Feature 13)
*Status: Architectural specification.*

* Currently, reference tracks uploaded in the preferences stage are analyzed strictly in client memory to extract spectral centroid, dynamic envelope, and frequency tilt.
* **Follow-up Roadmap**: Full dual-track level-matched listening audition (Original Mix vs AI Preview vs Reference Track with rights confirmation check) is slated for Engine Version 2.5 to ensure zero performance degradation on low-powered mobile browsers.
