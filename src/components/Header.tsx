import React from 'react';
import { Database, PlusCircle, RefreshCw, Car } from 'lucide-react';

interface HeaderProps {
  supabaseStatus: { ok: boolean; tablesExist: boolean; message: string };
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenCreateTrip: () => void;
  onOpenSetupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  supabaseStatus,
  isSyncing,
  onRefresh,
  onOpenCreateTrip,
  onOpenSetupModal,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="px-6 h-16 flex items-center justify-between">
        {/* Title area */}
        <div className="flex items-center space-x-3">
          <div className="text-sm font-bold text-slate-800">
            PickMi Fleet Command
          </div>
          <span className="text-slate-300">|</span>
          <div className="text-xs text-slate-500 hidden sm:block">
            Realtime Driver Tracking, Dispatch & Security Deposits
          </div>
        </div>

        {/* Database Status & Quick CTA */}
        <div className="flex items-center space-x-3">
          {/* Supabase Status Pill */}
          <div
            onClick={!supabaseStatus.tablesExist ? onOpenSetupModal : undefined}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
              supabaseStatus.tablesExist
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
            title={supabaseStatus.message}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  supabaseStatus.tablesExist ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  supabaseStatus.tablesExist ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <Database className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">
              {supabaseStatus.tablesExist ? 'Database Live' : 'Schema Needed'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
            title="Refresh database"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#0043DC]' : ''}`} />
          </button>

          {/* Create Trip CTA */}
          <button
            onClick={onOpenCreateTrip}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs tracking-wide transition shadow-md shadow-[#0043DC]/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Trip</span>
          </button>
        </div>
      </div>
    </header>
  );
};
