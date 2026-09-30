import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, ShieldCheck, RefreshCw, Terminal } from 'lucide-react';

interface SchemaSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
}

const SQL_SCHEMA = `-- PickMi Driver & Admin Unified Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/awwrbgwpzgtbunrvsmyu/sql/new

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE online_status AS ENUM ('ONLINE', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE document_verification_status AS ENUM ('Verified', 'Pending', 'Rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('Sedan', 'SUV', 'Hatchback', 'Prime Sedan', 'EV');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM (
    'AVAILABLE', 'REQUESTED', 'ASSIGNED', 'ACCEPTED',
    'ON_THE_WAY', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE trip_type AS ENUM ('One-way', 'Round-trip', 'Airport Transfer', 'Outstation');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM ('PAID', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.drivers (
  id TEXT PRIMARY KEY DEFAULT ('drv_' || substr(md5(random()::text), 1, 12)),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  profile_image TEXT,
  status driver_status DEFAULT 'active',
  online_status online_status DEFAULT 'OFFLINE',
  rating NUMERIC(3, 2) DEFAULT 4.90,
  total_trips INTEGER DEFAULT 0,
  deposit_status deposit_status DEFAULT 'PENDING',
  deposit_amount NUMERIC(10, 2) DEFAULT 250.00,
  deposit_paid_at TIMESTAMPTZ,
  deposit_expires_at TIMESTAMPTZ,
  deposit_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY DEFAULT ('veh_' || substr(md5(random()::text), 1, 12)),
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL UNIQUE,
  vehicle_type vehicle_type DEFAULT 'Sedan',
  vehicle_model TEXT NOT NULL,
  vehicle_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_documents (
  id TEXT PRIMARY KEY DEFAULT ('doc_' || substr(md5(random()::text), 1, 12)),
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_number TEXT,
  valid_until TEXT,
  verification_status document_verification_status DEFAULT 'Pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
  id TEXT PRIMARY KEY DEFAULT ('trip_' || substr(md5(random()::text), 1, 12)),
  trip_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_latitude NUMERIC(10, 7) NOT NULL,
  pickup_longitude NUMERIC(10, 7) NOT NULL,
  drop_location TEXT NOT NULL,
  drop_latitude NUMERIC(10, 7) NOT NULL,
  drop_longitude NUMERIC(10, 7) NOT NULL,
  pickup_date TEXT NOT NULL DEFAULT 'Today',
  pickup_time TEXT NOT NULL DEFAULT 'Now',
  fare NUMERIC(10, 2) NOT NULL,
  distance TEXT NOT NULL,
  vehicle_type vehicle_type DEFAULT 'Sedan',
  status trip_status DEFAULT 'AVAILABLE',
  assigned_driver_id TEXT REFERENCES public.drivers(id) ON DELETE SET NULL,
  otp TEXT DEFAULT '4821',
  trip_type trip_type DEFAULT 'One-way',
  payment_method TEXT DEFAULT 'Cash',
  extra_km_rate NUMERIC(10, 2) DEFAULT 14.00,
  toll_status TEXT DEFAULT 'INCLUDED',
  toll_estimate NUMERIC(10, 2) DEFAULT 0,
  toll_charges NUMERIC(10, 2) DEFAULT 0,
  parking_charges NUMERIC(10, 2) DEFAULT 0,
  extra_km NUMERIC(10, 2) DEFAULT 0,
  extra_km_charges NUMERIC(10, 2) DEFAULT 0,
  total_fare NUMERIC(10, 2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trip_requests (
  id TEXT PRIMARY KEY DEFAULT ('req_' || substr(md5(random()::text), 1, 12)),
  trip_id TEXT REFERENCES public.trips(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT ('txn_' || substr(md5(random()::text), 1, 12)),
  driver_id TEXT REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and permissive policies
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all on drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on driver_documents" ON public.driver_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on trip_requests" ON public.trip_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on wallet_transactions" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_documents;
`;

export const SchemaSetupModal: React.FC<SchemaSetupModalProps> = ({
  isOpen,
  onClose,
  onRefresh,
  isSyncing,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Supabase SQL Schema Setup</h3>
              <p className="text-xs text-slate-400">1-click migration script to create all database tables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
          <div className="font-bold flex items-center space-x-1.5">
            <span>⚡ How to apply in 60 seconds:</span>
          </div>
          <ol className="list-decimal pl-4 space-y-0.5 text-slate-300">
            <li>Click <strong>Copy SQL Code</strong> below.</li>
            <li>Open the Supabase SQL Editor in your browser.</li>
            <li>Paste and click <strong>RUN</strong>.</li>
            <li>Click <strong>Test Connection</strong> to activate realtime sync.</li>
          </ol>
        </div>

        <div className="flex-1 relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Code'}</span>
            </button>
          </div>
          <pre className="p-4 text-[11px] font-mono text-emerald-400/90 overflow-auto h-64 selection:bg-emerald-500/30">
            {SQL_SCHEMA}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <a
            href="https://supabase.com/dashboard/project/awwrbgwpzgtbunrvsmyu/sql/new"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:underline font-bold"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={() => {
                onRefresh();
              }}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
