import React, { useState, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  DollarSign,
  HardDrive,
  Layers,
  Save,
  Shield,
  Sliders,
  Users,
  Clock,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Lock,
  Mail,
  Trash2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { AdminMetrics, Genre, LoudnessTarget, StudioBookingInquiry } from '../types';
import { getStoredInquiries, updateInquiryStatus, deleteInquiry } from '../services/inquiryService';

interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  // Navigation tab state inside Admin
  const [activeTab, setActiveTab] = useState<'engine' | 'inquiries'>('engine');

  // Engine Configuration state
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(250);
  const [maxDurationMin, setMaxDurationMin] = useState(15);
  const [truePeakCeilingDb, setTruePeakCeilingDb] = useState(-1.0);
  const [retentionDays, setRetentionDays] = useState(30);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Inbound inquiries state
  const [inquiries, setInquiries] = useState<StudioBookingInquiry[]>([]);

  useEffect(() => {
    setInquiries(getStoredInquiries());
  }, []);

  const refreshInquiries = () => {
    setInquiries(getStoredInquiries());
  };

  const handleStatusChange = (id: string, newStatus: StudioBookingInquiry['status']) => {
    updateInquiryStatus(id, newStatus);
    refreshInquiries();
  };

  const handleDeleteInquiry = (id: string) => {
    if (window.confirm('Delete this inquiry from records?')) {
      deleteInquiry(id);
      refreshInquiries();
    }
  };

  // Simulated metrics
  const metrics: AdminMetrics = {
    totalUsers: 1420,
    totalUploads: 4892,
    completedMasters: 4810,
    processingFailures: 82,
    storageUsedGb: 642.8,
    avgProcessingTimeSec: 4.8,
    revenueUsd: 18450.0,
    popularGenres: [
      { genre: 'Hip Hop / Rap', count: 1640 },
      { genre: 'Trap', count: 980 },
      { genre: 'R&B / Soul', count: 720 },
      { genre: 'Pop', count: 540 },
      { genre: 'Rock', count: 410 },
      { genre: 'House', count: 320 }
    ],
    lufsDistribution: [
      { target: -11, count: 2180 },
      { target: -10, count: 1240 },
      { target: -9, count: 720 },
      { target: -12, count: 420 },
      { target: -14, count: 190 },
      { target: -13, count: 60 }
    ]
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-100/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#1E4263] text-[#57E6FF] text-[10px] uppercase tracking-[0.2em] border border-cyan-100/20">
              Engine Operations Console
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-300 font-mono">HDQTRZ Cluster v2.4</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight mt-1">
            Studio Engine Operations
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#234A6A] border border-cyan-100/30 text-xs text-slate-100 font-mono">
            <Lock className="w-3.5 h-3.5 text-[#57E6FF]" />
            <span>earle.holder@gmail.com</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#264E6D] hover:bg-[#222222] border border-cyan-100/30 text-slate-200 hover:text-white text-xs uppercase tracking-wider transition-colors"
              title="Lock & Exit Admin Console"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-200" />
              <span>Lock Console</span>
            </button>
          )}

          <span className="text-xs text-slate-200 font-mono hidden md:inline">
            Avg DSP Render: <strong className="text-[#57E6FF] font-medium">{metrics.avgProcessingTimeSec}s</strong>
          </span>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-cyan-100/20 pb-2">
        <button
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'engine'
              ? 'bg-[#181818] text-[#57E6FF] border border-[#57E6FF]/30'
              : 'text-slate-200 hover:text-white hover:bg-[#121212]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>DSP Engine & Metrics</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('inquiries');
            refreshInquiries();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors relative ${
            activeTab === 'inquiries'
              ? 'bg-[#181818] text-[#57E6FF] border border-[#57E6FF]/30'
              : 'text-slate-200 hover:text-white hover:bg-[#121212]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Inbound Studio Bookings</span>
          {inquiries.filter(i => i.status === 'new').length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
              {inquiries.filter(i => i.status === 'new').length} new
            </span>
          )}
        </button>
      </div>

      {activeTab === 'inquiries' ? (
        /* Inbound Studio Inquiries Inbox */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#173653] border border-cyan-100/20">
            <div>
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#57E6FF]" />
                <span>Earle Holder Human Mastering Requests</span>
              </h3>
              <p className="text-xs text-slate-200 font-light mt-0.5">
                All booking inquiries dispatched to <strong className="text-slate-100">earle.holder@gmail.com</strong> are also cataloged here in real-time.
              </p>
            </div>

            <button
              onClick={refreshInquiries}
              className="px-3 py-1.5 rounded-lg bg-[#234A6A] hover:bg-[#2D5878] border border-cyan-100/30 text-xs text-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-[#57E6FF]" />
              <span>Refresh</span>
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#173653] border border-cyan-100/20 space-y-3">
              <Mail className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm text-slate-100">No Studio Inquiries Yet</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                When artists request Human Analog Hybrid Mastering or stem sessions, their submissions appear here and dispatch directly to your email.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((inquiry) => {
                const mailtoReply = `mailto:${inquiry.email}?subject=${encodeURIComponent(`HDQTRZ Mastering Studio — Follow up on ${inquiry.serviceType}`)}&body=${encodeURIComponent(`Hi ${inquiry.name},\n\nThank you for reaching out regarding your project for ${inquiry.serviceType}.\n\nEarle Holder\nHDQTRZ Mastering Studios`)}`;

                return (
                  <div
                    key={inquiry.id}
                    className="p-5 rounded-xl bg-[#173653] border border-cyan-100/20 hover:border-white/15 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-cyan-100/20">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-sm font-semibold text-white">{inquiry.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider ${
                            inquiry.status === 'new'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : inquiry.status === 'contacted'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : inquiry.status === 'booked'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-800 text-slate-200'
                          }`}>
                            {inquiry.status}
                          </span>
                        </div>
                        <span className="text-xs text-[#57E6FF] font-medium block mt-0.5">
                          {inquiry.serviceType}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <span className="font-mono text-[11px]">
                          {new Date(inquiry.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-300 text-[10px] uppercase tracking-wider block">Client Email</span>
                        <a
                          href={`mailto:${inquiry.email}`}
                          className="text-white hover:text-[#57E6FF] transition-colors font-mono flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-300" />
                          <span>{inquiry.email}</span>
                        </a>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-300 text-[10px] uppercase tracking-wider block">Dispatch Status</span>
                        <span className="text-emerald-400 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Email generated for earle.holder@gmail.com</span>
                        </span>
                      </div>
                    </div>

                    {inquiry.notes && (
                      <div className="p-3 rounded-lg bg-[#1E4263] border border-cyan-100/20 text-xs text-slate-100 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-slate-300 block">Project Notes</span>
                        <p className="whitespace-pre-wrap font-light leading-relaxed text-slate-100">
                          {inquiry.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-300">Update Status:</span>
                        <select
                          value={inquiry.status}
                          onChange={(e) => handleStatusChange(inquiry.id, e.target.value as StudioBookingInquiry['status'])}
                          className="px-2.5 py-1 rounded bg-[#234A6A] border border-cyan-100/30 text-xs text-slate-100 focus:outline-none focus:border-[#57E6FF]"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="booked">Booked</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={mailtoReply}
                          className="px-3 py-1.5 rounded-lg bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Reply to Client</span>
                        </a>

                        <button
                          onClick={() => handleDeleteInquiry(inquiry.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-colors"
                          title="Delete inquiry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-1">
          <div className="flex items-center justify-between text-slate-300 text-[10px] uppercase tracking-wider">
            <span>Completed Masters</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-light text-white">
            {metrics.completedMasters.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-300 font-mono">
            {(100 - (metrics.processingFailures / metrics.totalUploads) * 100).toFixed(1)}% success rate
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-1">
          <div className="flex items-center justify-between text-slate-300 text-[10px] uppercase tracking-wider">
            <span>Active Creators</span>
            <Users className="w-3.5 h-3.5 text-[#57E6FF]" />
          </div>
          <div className="font-mono text-2xl font-light text-white">
            {metrics.totalUsers.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-300 font-mono">+184 this week</span>
        </div>

        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-1">
          <div className="flex items-center justify-between text-slate-300 text-[10px] uppercase tracking-wider">
            <span>Mastering Revenue</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-light text-white">
            ${metrics.revenueUsd.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-300 font-mono">Stripe processing</span>
        </div>

        <div className="p-4 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-1">
          <div className="flex items-center justify-between text-slate-300 text-[10px] uppercase tracking-wider">
            <span>Encrypted Storage</span>
            <HardDrive className="w-3.5 h-3.5 text-slate-200" />
          </div>
          <div className="font-mono text-2xl font-light text-white">
            {metrics.storageUsedGb} GB
          </div>
          <span className="text-[10px] text-slate-300 font-mono">Retention: {retentionDays}d</span>
        </div>
      </div>

      {/* Analytics Charts: Popular Genres & LUFS Targets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Popular Genres */}
        <div className="p-5 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-[#57E6FF] font-medium">
              Popular Mastering Genres
            </h3>
            <span className="text-[10px] text-slate-300 font-mono">Distribution</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {metrics.popularGenres.map((pg, i) => {
              const pct = Math.round((pg.count / metrics.completedMasters) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-slate-100">
                    <span>{pg.genre}</span>
                    <span className="text-slate-300">{pg.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1E4263] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct * 2.2}%` }}
                      className="h-full bg-[#57E6FF] rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected LUFS Targets */}
        <div className="p-5 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-widest text-[#57E6FF] font-medium">
              Selected Loudness Targets
            </h3>
            <span className="text-[10px] text-slate-300 font-mono">User Preference</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {metrics.lufsDistribution.map((ld, i) => {
              const pct = Math.round((ld.count / metrics.completedMasters) * 100);
              const isDefault = ld.target === -11;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-slate-100">
                    <span className={isDefault ? 'text-[#57E6FF] font-medium' : ''}>
                      {ld.target} LUFS {isDefault && '(Recommended Default)'}
                    </span>
                    <span className="text-slate-300">{ld.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1E4263] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct * 2.2}%` }}
                      className={`h-full rounded-full ${isDefault ? 'bg-[#57E6FF]' : 'bg-gray-700'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Configuration Controls Form */}
      <form onSubmit={handleSaveConfig} className="p-6 rounded-xl bg-[#173653] border border-cyan-100/20 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-cyan-100/20">
          <div>
            <h3 className="text-sm font-normal text-white">
              System & Mastering Engine Parameters
            </h3>
            <p className="text-xs text-slate-200 font-light">
              Update technical thresholds, storage quotas, and monetization limits.
            </p>
          </div>

          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Config Saved</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-slate-200 block text-[11px] uppercase tracking-wider">Max Upload Size (MB)</label>
            <input
              type="number"
              value={maxUploadSizeMb}
              onChange={(e) => setMaxUploadSizeMb(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-[#1E4263] border border-cyan-100/30 text-white font-mono focus:outline-none focus:border-[#57E6FF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-200 block text-[11px] uppercase tracking-wider">Max Duration (Minutes)</label>
            <input
              type="number"
              value={maxDurationMin}
              onChange={(e) => setMaxDurationMin(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-[#1E4263] border border-cyan-100/30 text-white font-mono focus:outline-none focus:border-[#57E6FF]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-200 block text-[11px] uppercase tracking-wider">True Peak Ceiling (dBTP)</label>
            <input
              type="number"
              step="0.1"
              value={truePeakCeilingDb}
              onChange={(e) => setTruePeakCeilingDb(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md bg-[#1E4263] border border-cyan-100/30 text-white font-mono focus:outline-none focus:border-[#57E6FF]"
            />
          </div>

          <div className="space-y-1">
            <span className="text-slate-200 block text-[11px] uppercase tracking-wider">Customer Price</span>
            <div className="w-full px-3 py-2 rounded-md bg-[#15130c] border border-[#57E6FF]/40 text-[#57E6FF] font-mono">
              $9.99 per track · One-time payment
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-md bg-[#57E6FF] hover:bg-[#41CBE8] text-black font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5 text-black" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
        </>
      )}
    </div>
  );
};
