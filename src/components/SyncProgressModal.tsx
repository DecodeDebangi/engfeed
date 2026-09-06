'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, X, Shield, Zap } from 'lucide-react';

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [apiKey, setApiKey] = useState('engfeed_secret_admin_key_2026');
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setIsSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/trigger-sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data);
        onRefreshData();
      } else {
        setError(data.error || 'Failed to trigger sync');
      }
    } catch (err: any) {
      setError(err.message || 'Network error triggering sync');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Live RSS Ingestion Worker</h3>
              <p className="text-xs text-slate-400">Trigger on-demand polling across 48+ engineering blogs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin Authorization Key</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            placeholder="Enter ADMIN_API_KEY..."
          />
        </div>

        {/* Sync Trigger Action */}
        <div>
          <button
            onClick={handleStartSync}
            disabled={isSyncing}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 active:from-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Ingesting Engineering Feeds...' : 'Poll & Refresh All Feeds Now'}</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sync Output */}
        {result && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-2 text-xs text-emerald-200 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ingestion Complete!</span>
            </div>
            <p>Processed <strong>{result.stats?.totalFeedsProcessed}</strong> engineering blogs.</p>
            <p>Inserted <strong>{result.stats?.totalNewArticlesInserted}</strong> new articles into PostgreSQL.</p>
          </div>
        )}

      </div>
    </div>
  );
};
