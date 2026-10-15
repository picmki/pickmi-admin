import React, { useState } from 'react';
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Search,
  Car,
  Calendar,
  Phone,
  IndianRupee,
  ShieldCheck,
  Check,
  X,
  MapPin,
  Gauge,
  Wallet,
  Building,
  Plus,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { Trip, Driver } from '../types';

interface BillingManagerProps {
  trips: Trip[];
  drivers: Driver[];
  onUpdateTripSettlement: (
    tripId: string,
    settlementData: {
      settlement_status: 'PENDING' | 'SETTLED' | 'DISPUTED';
      settled_at?: string;
      excess_cash_returned?: boolean;
      driver_payout_completed?: boolean;
      settlement_notes?: string;
      toll_charges?: number;
      permit_charges?: number;
      hill_charges?: number;
      batta_charges?: number;
      actual_km?: number;
      extra_km?: number;
      extra_km_rate?: number;
      extra_km_charges?: number;
      commission_rate?: number;
      total_fare?: number;
      fare?: number;
      cash_to_collect?: number;
      driver_id?: string | null;
    }
  ) => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
}

export const BillingManager: React.FC<BillingManagerProps> = ({
  trips,
  drivers,
  onUpdateTripSettlement,
  onViewDriverDetails,
}) => {
  // Selected Trip for dedicated Fare Update Page (null means in list view)
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Filter in list view
  const [filter, setFilter] = useState<'PENDING' | 'SETTLED' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ── Fare & Settlement Edit Form State ──
  const [fareMode, setFareMode] = useState<'KM_BASED' | 'FIXED'>('KM_BASED');
  const [baseFare, setBaseFare] = useState<number>(0);
  const [actualKm, setActualKm] = useState<number>(0);
  const [allowedKm, setAllowedKm] = useState<number>(0);
  const [extraKmRate, setExtraKmRate] = useState<number>(14);

  // Additional Charges
  const [tollAmount, setTollAmount] = useState<number>(0);
  const [tollIncluded, setTollIncluded] = useState<boolean>(true);

  const [permitAmount, setPermitAmount] = useState<number>(0);
  const [permitIncluded, setPermitIncluded] = useState<boolean>(true);

  const [hillAmount, setHillAmount] = useState<number>(0);
  const [hillIncluded, setHillIncluded] = useState<boolean>(false);

  const [battaAmount, setBattaAmount] = useState<number>(0);
  const [battaIncluded, setBattaIncluded] = useState<boolean>(true);

  // Cash & Commission
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [commissionPercent, setCommissionPercent] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');

  // Filter all completed trips (or trips with settlement data)
  const completedTrips = trips.filter(
    (t) => t.status === 'COMPLETED' || t.settlement_status === 'SETTLED' || t.completed_at
  );

  // Filtered list
  const filteredTrips = completedTrips.filter((t) => {
    const isSettled = t.settlement_status === 'SETTLED';
    if (filter === 'PENDING' && isSettled) return false;
    if (filter === 'SETTLED' && !isSettled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const driver = drivers.find((d) => d.id === t.assigned_driver_id) || t.driver;
      const matchTrip = (t.trip_number || '').toLowerCase().includes(q);
      const matchCust = (t.customer_name || '').toLowerCase().includes(q);
      const matchDriver = driver ? driver.name.toLowerCase().includes(q) || driver.mobile.includes(q) : false;
      const matchLoc = (t.pickup_location || '').toLowerCase().includes(q) || (t.drop_location || '').toLowerCase().includes(q);
      if (!matchTrip && !matchCust && !matchDriver && !matchLoc) return false;
    }

    return true;
  });

  // Open the dedicated Fare Update Page for a trip
  const handleOpenFareUpdatePage = (trip: Trip) => {
    setActiveTrip(trip);
    setSaveSuccessMsg('');

    // 1. Odometer Distance reported by driver on trip completion
    let driverKm = 0;
    if (trip.actual_km && Number(trip.actual_km) > 0) {
      driverKm = Number(trip.actual_km);
    } else if (trip.extra_km && Number(trip.extra_km) > 0) {
      driverKm = Number(trip.extra_km);
    } else if (trip.distance) {
      const p = parseFloat(trip.distance);
      driverKm = isNaN(p) ? 0 : p;
    }
    setActualKm(driverKm);

    const allowed = Number(trip.allowed_km) || 0;
    setAllowedKm(allowed);

    // 2. Mileage rate
    const rate = Number(trip.extra_km_rate) || 15;
    setExtraKmRate(rate);

    // 3. Base fare
    const initialFare = Number(trip.fare) || 0;
    setBaseFare(initialFare);

    // 4. Cash collected by driver from passenger
    const collected = Number(trip.cash_to_collect) || Number(trip.total_fare) || initialFare;
    setCashCollected(collected);

    // 5. Surcharges entered by driver
    setTollAmount(Number(trip.toll_charges) || Number(trip.toll_estimate) || 0);
    setTollIncluded(trip.toll_included === 'INCLUDED');

    setPermitAmount(Number(trip.parking_charges) || 0);
    setPermitIncluded(trip.permit_included === 'INCLUDED');

    setHillAmount(0);
    setHillIncluded(trip.hill_charges_applicable !== 'APPLICABLE');

    setBattaAmount(0);
    setBattaIncluded(trip.batta_included === 'INCLUDED');

    const commRate = Number(trip.commission_rate) || 10;
    setCommissionPercent(commRate);
    setNotes(trip.settlement_notes || '');
    setFareMode(trip.extra_km_rate || driverKm > 0 ? 'KM_BASED' : 'FIXED');
  };

  // ── Computations for the active trip ──
  // In KM_BASED mode: Base Fare is strictly (actualKm * extraKmRate)
  const effectiveBaseFare = fareMode === 'KM_BASED' ? actualKm * extraKmRate : baseFare;
  const computedExtraKm = 0;
  const computedExtraKmAmount = 0;

  // Additional charges added on top of fare if NOT included
  const extraTollToAdd = !tollIncluded ? tollAmount : 0;
  const extraPermitToAdd = !permitIncluded ? permitAmount : 0;
  const extraHillToAdd = !hillIncluded ? hillAmount : 0;
  const extraBattaToAdd = !battaIncluded ? battaAmount : 0;

  const totalTripGrossFare =
    effectiveBaseFare +
    extraTollToAdd +
    extraPermitToAdd +
    extraHillToAdd +
    extraBattaToAdd;

  const platformFee = Math.round((totalTripGrossFare * commissionPercent) / 100);
  const netDriverEarnings = totalTripGrossFare - platformFee;

  // Final Settlement Outcome
  // If driver collected cash from customer:
  // Net settlement balance = Net driver earnings - Cash already collected
  const netSettlementBalance = netDriverEarnings - cashCollected;
  const companyOwesDriver = netSettlementBalance > 0 ? netSettlementBalance : 0;
  const driverOwesCompany = netSettlementBalance < 0 ? Math.abs(netSettlementBalance) : 0;

  // Save handler
  const handleSaveFareSettlement = async (markAsFullySettled: boolean = false) => {
    if (!activeTrip) return;
    setIsSaving(true);
    try {
      const settlementStatus = markAsFullySettled ? 'SETTLED' : 'PENDING';

      await onUpdateTripSettlement(activeTrip.id, {
        settlement_status: settlementStatus,
        settled_at: markAsFullySettled ? new Date().toISOString() : undefined,
        actual_km: actualKm,
        extra_km: computedExtraKm,
        extra_km_rate: extraKmRate,
        extra_km_charges: computedExtraKmAmount,
        commission_rate: commissionPercent,
        toll_charges: tollAmount,
        permit_charges: permitAmount,
        hill_charges: hillAmount,
        batta_charges: battaAmount,
        total_fare: totalTripGrossFare,
        fare: effectiveBaseFare,
        cash_to_collect: cashCollected,
        settlement_notes: notes,
        driver_id: activeTrip.assigned_driver_id || undefined,
      });

      setSaveSuccessMsg(
        markAsFullySettled
          ? 'Trip successfully settled & finalized! Driver earnings and ledger updated.'
          : 'Driver fare & charges updated successfully!'
      );
      setShowSuccessModal(true);

      // Update activeTrip locally
      setActiveTrip((prev) =>
        prev
          ? {
              ...prev,
              settlement_status: settlementStatus,
              actual_km: actualKm,
              extra_km: computedExtraKm,
              extra_km_charges: computedExtraKmAmount,
              toll_charges: tollAmount,
              total_fare: totalTripGrossFare,
              fare: effectiveBaseFare,
            }
          : null
      );
    } catch (err) {
      console.error('Error saving settlement:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW 2: DEDICATED TRIP PRICING & FARE UPDATE PAGE
  // ─────────────────────────────────────────────────────────────
  if (activeTrip) {
    const assignedDriver =
      drivers.find((d) => d.id === activeTrip.assigned_driver_id) || activeTrip.driver;
    const isSettled = activeTrip.settlement_status === 'SETTLED';

    return (
      <div className="space-y-6 animate-in fade-in pb-12">
        {/* Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTrip(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#0043DC]" />
              <span>Back to Completed Trips</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-sm text-[#0043DC] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  {activeTrip.trip_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    isSettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isSettled ? '✓ Fully Settled' : '● Needs Fare Update'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSaveFareSettlement(false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSaveFareSettlement(true)}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {isSaving ? 'Processing...' : '✓ Finalize & Settle Trip'}
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        {/* ── TOP SECTION: FULL DETAIL ABOUT TRIP PRICING & EXECUTION ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-[#0043DC]" />
              <h2 className="text-base font-black text-slate-900">Trip Overview & Customer Billing</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Completed on{' '}
              {activeTrip.completed_at
                ? new Date(activeTrip.completed_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Route & Timing */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Route & Schedule
              </span>
              <div className="space-y-2">
                <div className="flex items-start space-x-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Pickup:</span>
                    <span className="text-slate-600">{activeTrip.pickup_location}</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Drop:</span>
                    <span className="text-slate-600">{activeTrip.drop_location}</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between font-medium">
                <span>Trip Type: <strong>{activeTrip.trip_type}</strong></span>
                <span>Vehicle: <strong>{activeTrip.vehicle_type}</strong></span>
              </div>
            </div>

            {/* Column 2: Driver Details */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Assigned Driver
              </span>
              {assignedDriver ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0043DC] flex items-center justify-center font-black text-sm">
                      {assignedDriver.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{assignedDriver.name}</h4>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {assignedDriver.mobile}
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80 text-[11px] flex justify-between">
                    <span className="text-slate-500">Plate Number:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {assignedDriver.vehicle?.vehicle_number || 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No driver assigned to this trip</p>
              )}
            </div>

            {/* Column 3: Customer & Payment Details */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Customer & Cash Collected
              </span>
              <div className="space-y-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{activeTrip.customer_name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{activeTrip.customer_phone}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 block uppercase">Cash Collected by Driver</span>
                    <span className="text-base font-black text-emerald-900">₹{cashCollected.toLocaleString()}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800 text-[10px] font-extrabold uppercase">
                    {activeTrip.payment_method || 'Cash'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Pricing Summary Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {/* Card 1: Driver Reported Distance */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Driver Distance
              </span>
              <span className="text-lg font-black mt-1 block text-blue-400">{actualKm} km</span>
              <span className="text-[10px] text-slate-400">Odometer reported</span>
            </div>

            {/* Card 2: Per KM Rate */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Per KM Rate
              </span>
              <span className="text-lg font-black mt-1 block text-amber-400">₹{extraKmRate}/km</span>
              <span className="text-[10px] text-slate-400">Mileage rate</span>
            </div>

            {/* Card 3: Base Fare (KMs × Rate) */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {fareMode === 'KM_BASED' ? 'Base Distance Fare' : 'Fixed Base Fare'}
              </span>
              <span className="text-lg font-black mt-1 block text-emerald-400">
                ₹{effectiveBaseFare.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">
                {fareMode === 'KM_BASED' ? `${actualKm} km × ₹${extraKmRate}/km` : 'Agreed lump-sum'}
              </span>
            </div>

            {/* Card 4: Total Gross Bill */}
            <div className="p-3.5 bg-[#0043DC] text-white rounded-xl">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">
                Total Gross Fare
              </span>
              <span className="text-lg font-black mt-1 block text-white">
                ₹{totalTripGrossFare.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-100">Base + extra charges</span>
            </div>

            {/* Card 5: Cash Collected from Customer */}
            <div className="p-3.5 bg-emerald-950 text-white rounded-xl border border-emerald-800/40 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                Cash Collected
              </span>
              <span className="text-lg font-black mt-1 block text-emerald-400">
                ₹{cashCollected.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-200/70">From customer ({activeTrip.payment_method || 'Cash'})</span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: INTERACTIVE DRIVER FARE & ADDITIONAL CHARGES UPDATE ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Update Driver Settlement & Charges</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-[#0043DC] font-bold">Step 2</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize KMs rate, specify tolls, permits, ghat charges, and calculate net payout.
              </p>
            </div>

            {/* Fare Mode Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFareMode('KM_BASED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  fareMode === 'KM_BASED' ? 'bg-[#0043DC] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KMs Based Fare
              </button>
              <button
                type="button"
                onClick={() => setFareMode('FIXED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  fareMode === 'FIXED' ? 'bg-[#0043DC] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fixed Lump-Sum
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN: BASE FARE & KMS DETAILS */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                1. Base Fare & Mileage Reconciliation
              </h4>

              <div className="space-y-3.5">
                {fareMode === 'KM_BASED' ? (
                  <>
                    {/* Enter KMs, Rate per KM, and Commission Percentage */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Total KMs Run <span className="text-[#0043DC] font-black">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={actualKm || ''}
                            onChange={(e) => setActualKm(Number(e.target.value) || 0)}
                            placeholder="e.g. 100"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:ring-2 focus:ring-[#0043DC]/10 shadow-xs"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            km
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Per KM Rate (₹/km) <span className="text-[#0043DC] font-black">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={extraKmRate || ''}
                            onChange={(e) => setExtraKmRate(Number(e.target.value) || 0)}
                            placeholder="e.g. 15"
                            className="w-full pl-3.5 pr-12 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:ring-2 focus:ring-[#0043DC]/10 shadow-xs"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            ₹/km
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Commission (%) <span className="text-[#0043DC] font-black">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={commissionPercent || ''}
                            onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
                            placeholder="e.g. 10"
                            min="0"
                            max="100"
                            className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:ring-2 focus:ring-[#0043DC]/10 shadow-xs"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Non-editable auto-calculated Base Fare */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Base Fare (₹)
                        </label>
                        <span className="text-[11px] font-bold text-[#0043DC] font-mono">
                          {actualKm} km × ₹{extraKmRate}/km
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          readOnly
                          value={`₹${(actualKm * extraKmRate).toLocaleString('en-IN')}`}
                          className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-900 cursor-not-allowed select-none shadow-xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                          Non-editable (Auto)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">
                        Automatically calculated as Total KMs multiplied by Per KM rate.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fixed Agreed Driver Amount (₹) <span className="text-[#0043DC] font-black">*</span>
                      </label>
                      <input
                        type="number"
                        value={baseFare}
                        onChange={(e) => setBaseFare(Number(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:ring-2 focus:ring-[#0043DC]/10 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Commission (%) <span className="text-[#0043DC] font-black">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={commissionPercent || ''}
                          onChange={(e) => setCommissionPercent(Number(e.target.value) || 0)}
                          placeholder="e.g. 10"
                          min="0"
                          max="100"
                          className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:ring-2 focus:ring-[#0043DC]/10 shadow-xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: ADDITIONAL CHARGES (TOLL, PERMIT, HILLS, BATTA) */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                2. Tolls, Permits & Special Surcharges
              </h4>

              <div className="space-y-3">
                {/* Toll Charges */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-800">Highway Toll Charges (₹)</label>
                    <input
                      type="number"
                      value={tollAmount}
                      onChange={(e) => setTollAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={tollIncluded}
                      onChange={(e) => setTollIncluded(e.target.checked)}
                      className="rounded text-[#0043DC]"
                    />
                    <span>Included in Base</span>
                  </label>
                </div>

                {/* State Permit Charges */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-800">State Entry Permit (₹)</label>
                    <input
                      type="number"
                      value={permitAmount}
                      onChange={(e) => setPermitAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={permitIncluded}
                      onChange={(e) => setPermitIncluded(e.target.checked)}
                      className="rounded text-[#0043DC]"
                    />
                    <span>Included</span>
                  </label>
                </div>

                {/* Hill Station / Ghat Charges */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-800">Hill / Ghat Surcharge (₹)</label>
                    <input
                      type="number"
                      value={hillAmount}
                      onChange={(e) => setHillAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={hillIncluded}
                      onChange={(e) => setHillIncluded(e.target.checked)}
                      className="rounded text-[#0043DC]"
                    />
                    <span>Included</span>
                  </label>
                </div>

                {/* Driver Batta */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-800">Driver Daily Batta / Night (₹)</label>
                    <input
                      type="number"
                      value={battaAmount}
                      onChange={(e) => setBattaAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer pt-4">
                    <input
                      type="checkbox"
                      checked={battaIncluded}
                      onChange={(e) => setBattaIncluded(e.target.checked)}
                      className="rounded text-[#0043DC]"
                    />
                    <span>Included</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── NET SETTLEMENT CALCULATION SUMMARY ── */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Final Settlement Reconciliation Summary
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Total Gross Bill:</span>
                <span className="text-base font-black text-white mt-0.5 block">
                  ₹{totalTripGrossFare.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Platform Commission ({commissionPercent}%):</span>
                <span className="text-base font-black text-rose-400 mt-0.5 block">
                  - ₹{platformFee.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Net Driver Earnings:</span>
                <span className="text-base font-black text-blue-400 mt-0.5 block">
                  ₹{netDriverEarnings.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">Cash with Driver:</span>
                <span className="text-base font-black text-amber-400 mt-0.5 block">
                  ₹{cashCollected.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Bottom Final Action Badge */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {companyOwesDriver > 0 ? (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold block uppercase">Payout Due to Driver</span>
                      <span className="text-lg font-black text-white">₹{companyOwesDriver.toLocaleString()}</span>
                    </div>
                  </div>
                ) : driverOwesCompany > 0 ? (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold block uppercase">Excess Cash to Recover from Driver</span>
                      <span className="text-lg font-black text-white">₹{driverOwesCompany.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-500/20 border border-blue-500/40 rounded-xl text-blue-400 flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold block uppercase">Exact Match</span>
                      <span className="text-sm font-black text-white">₹0.00 Balance (Settled)</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTrip(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveFareSettlement(true)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : '✓ Settle & Update Driver Fare'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Floating Success Modal Popup */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-50">
                <CheckCircle className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Settlement Saved & Finalized!</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {saveSuccessMsg || 'The fare settlement has been saved to database and driver ledger is updated.'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Trip Reference:</span>
                  <span className="font-extrabold text-slate-900">{activeTrip.trip_number}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Gross Trip Bill:</span>
                  <span className="font-extrabold text-emerald-600">₹{totalTripGrossFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Net Driver Earnings:</span>
                  <span className="font-extrabold text-[#0043DC]">₹{netDriverEarnings.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Audit Status:</span>
                  <span className="font-black text-emerald-600">Settled ✓</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTrip(null);
                }}
                className="w-full py-3.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                Done & Return to Billing List
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: CLEAN COMPLETED TRIPS LIST (SIMPLE & INTUITIVE)
  // ─────────────────────────────────────────────────────────────
  const totalCompleted = completedTrips.length;
  const pendingUpdateCount = completedTrips.filter((t) => t.settlement_status !== 'SETTLED').length;
  const settledCount = completedTrips.filter((t) => t.settlement_status === 'SETTLED').length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0043DC]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#0043DC] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              Trip Settlements & Audits
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Trip Billing & Driver Settlements</h1>
          <p className="text-xs text-slate-500 font-medium">
            Review completed trips, update driver mileage rates, add tolls/permits, and finalize settlements.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trip #, driver, route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0043DC] shadow-xs"
          />
        </div>
      </div>

      {/* ── Quick KPI Stat Pills ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilter('ALL')}
          className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Completed Trips</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0043DC]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalCompleted} Trips</div>
          <div className="mt-0.5 text-xs text-slate-500 font-medium">Recorded in fleet history</div>
        </div>

        <div
          onClick={() => setFilter('PENDING')}
          className={`p-4 bg-white border rounded-2xl transition cursor-pointer shadow-xs ${
            filter === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Awaiting Fare Update</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{pendingUpdateCount} Trips</div>
          <div className="mt-0.5 text-xs text-slate-500 font-medium">Pending driver fare reconciliation</div>
        </div>

        <div
          onClick={() => setFilter('SETTLED')}
          className={`p-4 bg-white border rounded-2xl transition cursor-pointer shadow-xs ${
            filter === 'SETTLED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Settled & Finalized</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{settledCount} Trips</div>
          <div className="mt-0.5 text-xs text-slate-500 font-medium">Dispatched & ledger balanced</div>
        </div>
      </div>

      {/* ── Filter Tabs & Controls ── */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'PENDING'
                ? 'bg-[#0043DC] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Needs Fare Update</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'PENDING' ? 'bg-white/20' : 'bg-slate-200'}`}>
              {pendingUpdateCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('SETTLED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'SETTLED'
                ? 'bg-[#0043DC] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Settled Trips</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'SETTLED' ? 'bg-white/20' : 'bg-slate-200'}`}>
              {settledCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filter === 'ALL'
                ? 'bg-[#0043DC] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === 'ALL' ? 'bg-white/20' : 'bg-slate-200'}`}>
              {totalCompleted}
            </span>
          </button>
        </div>

        <div className="text-xs font-bold text-slate-500 pr-2 hidden sm:block">
          Showing <strong>{filteredTrips.length}</strong> trips
        </div>
      </div>

      {/* ── Table of Completed Trips ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Trip # & Date</th>
                <th className="py-3 px-4">Driver Details</th>
                <th className="py-3 px-4">Route (Pickup → Drop)</th>
                <th className="py-3 px-4">KMs Run</th>
                <th className="py-3 px-4">Cash Collected</th>
                <th className="py-3 px-4">Total Fare</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-slate-600">No completed trips found</p>
                    <p className="text-[11px] mt-0.5">Trips marked as COMPLETED will appear here for billing.</p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const driver = drivers.find((d) => d.id === trip.assigned_driver_id) || trip.driver;
                  const isSettled = trip.settlement_status === 'SETTLED';
                  const cash = Number(trip.cash_to_collect) || Number(trip.fare) || 0;
                  const fare = Number(trip.total_fare) || Number(trip.fare) || 0;

                  return (
                    <tr key={trip.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 font-mono text-xs">{trip.trip_number}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {trip.completed_at
                            ? new Date(trip.completed_at).toLocaleDateString()
                            : trip.pickup_date || 'Recent'}
                        </div>
                        <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {trip.trip_type || 'One-way'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {driver ? (
                          <div>
                            <div className="font-black text-slate-900">{driver.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{driver.mobile}</div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {driver.vehicle?.vehicle_number || trip.vehicle_type}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No Driver</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate font-semibold text-slate-800" title={trip.pickup_location}>
                          📍 {trip.pickup_location}
                        </div>
                        <div className="truncate text-slate-500 text-[11px] mt-0.5" title={trip.drop_location}>
                          🏁 {trip.drop_location}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {trip.actual_km ? `${trip.actual_km} km` : trip.distance || '—'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                        ₹{cash.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                        ₹{fare.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            isSettled
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                          }`}
                        >
                          {isSettled ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{isSettled ? 'Settled' : 'Needs Fare Update'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenFareUpdatePage(trip)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <span>Update Driver Fare</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Completed Trips Billing View (Screens < 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredTrips.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400">
              <p className="font-bold text-slate-600">No completed trips found</p>
              <p className="text-[11px] mt-0.5">Completed trips will appear here for billing.</p>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const driver = drivers.find((d) => d.id === trip.assigned_driver_id) || trip.driver;
              const isSettled = trip.settlement_status === 'SETTLED';
              const cash = Number(trip.cash_to_collect) || Number(trip.fare) || 0;
              const fare = Number(trip.total_fare) || Number(trip.fare) || 0;

              return (
                <div key={trip.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  {/* Trip Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-slate-900 font-mono text-sm">{trip.trip_number}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {trip.completed_at ? new Date(trip.completed_at).toLocaleDateString() : trip.pickup_date || 'Recent'}
                      </span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isSettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isSettled ? 'Settled' : 'Pending Settle'}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-start space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <span className="text-slate-800 font-medium line-clamp-1">{trip.pickup_location}</span>
                    </div>
                    <div className="flex items-start space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <span className="text-slate-800 font-medium line-clamp-1">{trip.drop_location}</span>
                    </div>
                  </div>

                  {/* Driver & Financials */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Driver:</span>
                      <span className="font-bold text-slate-800">{driver ? driver.name : 'Unassigned'}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Total Fare</span>
                      <span className="font-black text-slate-900 text-sm">₹{fare.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-500 block font-medium">Cash: ₹{cash}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleOpenFareUpdatePage(trip)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-bold text-xs transition shadow-xs text-center"
                    >
                      {isSettled ? 'Review / Edit Settlement' : '⚡ Update Fare & Settle'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
