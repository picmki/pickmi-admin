import React from 'react';
import {
  Users,
  MapPin,
  FileCheck2,
  ShieldCheck,
  TrendingUp,
  Car,
  AlertCircle,
  PlusCircle,
  Clock,
  ArrowRight,
  Send,
  Navigation
} from 'lucide-react';
import type { Driver, DriverDocument, Trip, NavTab } from '../types';

interface DashboardOverviewProps {
  drivers: Driver[];
  trips: Trip[];
  documents: DriverDocument[];
  onOpenCreateTrip: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onQuickDispatch: (preset: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  drivers,
  trips,
  documents,
  onOpenCreateTrip,
  onNavigateTab,
  onQuickDispatch,
}) => {
  const onlineDrivers = drivers.filter((d) => d.online_status === 'ONLINE');
  const activeTrips = trips.filter((t) => t.status === 'ASSIGNED' || t.status === 'STARTED' || t.status === 'ARRIVED');
  const pendingDocs = documents.filter((d) => d.verification_status === 'Pending');
  const paidDeposits = drivers.filter((d) => d.deposit_status === 'PAID');
  const todayTrips = trips.filter((t) => t.pickup_date === 'Today');

  const stats = [
    {
      title: 'Online Drivers',
      value: onlineDrivers.length,
      subtitle: `${drivers.length} registered fleet`,
      icon: Users,
      color: 'text-[#0043DC]',
      bg: 'bg-blue-50 border-blue-100',
      actionTab: 'drivers' as NavTab,
    },
    {
      title: 'Active Trips',
      value: activeTrips.length,
      subtitle: `${trips.length} total bookings`,
      icon: Navigation,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      actionTab: 'trips' as NavTab,
    },
    {
      title: 'Pending Verifications',
      value: pendingDocs.length,
      subtitle: 'DL, RC & insurance reviews',
      icon: FileCheck2,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      actionTab: 'documents' as NavTab,
    },
    {
      title: 'Security Deposits',
      value: paidDeposits.length,
      subtitle: '₹250/yr paid accounts',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      actionTab: 'deposits' as NavTab,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0043DC] to-[#1E6BFF] rounded-2xl p-6 text-white shadow-lg shadow-[#0043DC]/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-white/20 rounded-md">Live Command</span>
            <span className="text-xs text-blue-100">Supabase Connected Fleet Engine</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">PickMi Fleet Control Center</h1>
          <p className="text-xs text-blue-100 max-w-xl">
            Realtime operations hub for automated dispatching, driver compliance, document approval and safety.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenCreateTrip}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-[#0043DC] font-black text-xs transition shadow-md hover:bg-blue-50 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create & Dispatch Trip</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(s.actionTab)}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#0043DC]/40 hover:shadow-md transition cursor-pointer shadow-sm group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.title}</span>
                <div className={`w-9 h-9 rounded-xl ${s.bg} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{s.value}</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span>{s.subtitle}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0043DC] transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Dispatch Presets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Instant Quick Dispatch Presets</h3>
            <p className="text-xs text-slate-500">1-click test trips that instantly wake drivers' phones via Push Notifications</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-[#0043DC] font-bold border border-blue-100">
            Live Testing
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onQuickDispatch('Airport Express')}
            className="p-4 rounded-xl border border-slate-200 hover:border-[#0043DC] hover:bg-blue-50/50 text-left transition space-y-1 group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-[#0043DC]">
              <span>Koramangala ➔ Airport (BLR)</span>
              <Send className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">₹1,250 • 42 km • Sedan • Toll Included</p>
          </button>

          <button
            onClick={() => onQuickDispatch('City Ride')}
            className="p-4 rounded-xl border border-slate-200 hover:border-[#0043DC] hover:bg-blue-50/50 text-left transition space-y-1 group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-[#0043DC]">
              <span>Indiranagar ➔ Whitefield ITPL</span>
              <Send className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">₹520 • 16 km • Hatchback • Cash</p>
          </button>

          <button
            onClick={() => onQuickDispatch('Outstation Trip')}
            className="p-4 rounded-xl border border-slate-200 hover:border-[#0043DC] hover:bg-blue-50/50 text-left transition space-y-1 group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-[#0043DC]">
              <span>Bengaluru ➔ Mysuru Palace</span>
              <Send className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">₹3,400 • 145 km • SUV • Batta Included</p>
          </button>
        </div>
      </div>
    </div>
  );
};
