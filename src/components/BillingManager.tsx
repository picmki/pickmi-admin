import React, { useState } from 'react';
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  DollarSign,
  Phone,
  Car,
  Calendar,
  FileText,
  Send,
  MessageCircle,
  ExternalLink,
  Edit3,
  CheckCheck,
  Printer,
  ChevronRight,
  TrendingUp,
  Wallet,
  Building,
  RefreshCw,
  HelpCircle,
  X,
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
      extra_km_charges?: number;
      total_fare?: number;
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
  const [filter, setFilter] = useState<'UNVERIFIED' | 'EXCESS_CASH' | 'PAYOUT_DUE' | 'SETTLED' | 'ALL'>('UNVERIFIED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [isEditingBill, setIsEditingBill] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commissionRate, setCommissionRate] = useState<number>(10); // 10% default platform commission

  // Bill Editing Form State
  const [editActualKm, setEditActualKm] = useState<number>(0);
  const [editTollCharges, setEditTollCharges] = useState<number>(0);
  const [editPermitCharges, setEditPermitCharges] = useState<number>(0);
  const [editHillCharges, setEditHillCharges] = useState<number>(0);
  const [editBattaCharges, setEditBattaCharges] = useState<number>(0);
  const [editCashCollected, setEditCashCollected] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');

  // Get completed trips (and any trip marked with settlement)
  const completedTrips = trips.filter(
    (t) => t.status === 'COMPLETED' || t.settlement_status === 'SETTLED' || t.completed_at
  );

  // Helper to compute bill components for a trip
  const calculateTripBilling = (t: Trip) => {
    const baseFare = Number(t.fare) || 0;
    const allowedKm = Number(t.allowed_km) || 50;
    
    // Parse distance from string e.g. "42.5 km" or use actual_km
    let kmDistance = 0;
    if (t.actual_km) {
      kmDistance = Number(t.actual_km);
    } else if (t.distance) {
      const parsed = parseFloat(t.distance);
      kmDistance = isNaN(parsed) ? 0 : parsed;
    }

    const extraKmRate = Number(t.extra_km_rate) || 14;
    const extraKm = t.extra_km !== undefined ? Number(t.extra_km) : Math.max(0, kmDistance - allowedKm);
    const extraKmCharges = t.extra_km_charges !== undefined ? Number(t.extra_km_charges) : extraKm * extraKmRate;

    // Toll charges (if excluded or incurred)
    const tollCharges = Number(t.toll_charges || 0);
    
    // Permit charges (interstate)
    const permitCharges = Number(t.permit_charges || (t.permit_included === 'EXCLUDED' ? 300 : 0));

    // Hill charges
    const hillCharges = Number(t.hill_charges || (t.hill_charges_applicable === 'APPLICABLE' ? 400 : 0));

    // Driver Batta
    const battaCharges = Number(t.batta_charges || (t.batta_included === 'EXCLUDED' ? 300 : 0));

    // Gross Bill for the Customer
    const grossTotal = baseFare + extraKmCharges + tollCharges + permitCharges + hillCharges + battaCharges;

    // Company Platform Commission (10% on base fare or gross)
    const commRate = t.commission_rate !== undefined ? t.commission_rate : commissionRate;
    const companyCommission = Math.round((baseFare * commRate) / 100);

    // Driver Net Earning for this trip
    const driverNetShare = grossTotal - companyCommission;

    // Cash actually collected by driver from passenger
    const cashCollected =
      t.cash_to_collect !== undefined
        ? Number(t.cash_to_collect)
        : t.payment_method === 'Cash'
        ? grossTotal
        : 0;

    // Net settlement balance between Driver & Company
    // If cashCollected > driverNetShare: Driver has company money (Driver owes company)
    // If cashCollected < driverNetShare: Driver was underpaid / online trip (Company owes driver)
    const netBalance = cashCollected - driverNetShare;

    const isSettled = t.settlement_status === 'SETTLED';
    const isExcessCash = netBalance > 0;
    const isPayoutDue = netBalance < 0;

    return {
      baseFare,
      allowedKm,
      actualKm: kmDistance,
      extraKm,
      extraKmRate,
      extraKmCharges,
      tollCharges,
      permitCharges,
      hillCharges,
      battaCharges,
      grossTotal,
      companyCommission,
      driverNetShare,
      cashCollected,
      netBalance,
      isSettled,
      isExcessCash,
      isPayoutDue,
    };
  };

  // Aggregated KPIs
  let totalGrossBilling = 0;
  let totalCashWithDrivers = 0;
  let totalExcessToCollect = 0;
  let totalPayoutDueToDrivers = 0;
  let totalUnverifiedCount = 0;
  let totalSettledCount = 0;

  completedTrips.forEach((t) => {
    const calc = calculateTripBilling(t);
    totalGrossBilling += calc.grossTotal;
    totalCashWithDrivers += calc.cashCollected;
    if (!calc.isSettled) {
      totalUnverifiedCount++;
      if (calc.isExcessCash) {
        totalExcessToCollect += calc.netBalance;
      } else if (calc.isPayoutDue) {
        totalPayoutDueToDrivers += Math.abs(calc.netBalance);
      }
    } else {
      totalSettledCount++;
    }
  });

  // Filtered trips
  const filteredTrips = completedTrips.filter((t) => {
    const calc = calculateTripBilling(t);
    const assignedDriver = drivers.find((d) => d.id === t.assigned_driver_id) || t.driver;

    const matchesSearch =
      t.trip_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assignedDriver?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assignedDriver?.mobile || '').includes(searchQuery) ||
      (assignedDriver?.vehicle?.vehicle_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'UNVERIFIED') {
      return !calc.isSettled;
    }
    if (filter === 'EXCESS_CASH') {
      return !calc.isSettled && calc.isExcessCash;
    }
    if (filter === 'PAYOUT_DUE') {
      return !calc.isSettled && calc.isPayoutDue;
    }
    if (filter === 'SETTLED') {
      return calc.isSettled;
    }
    return true;
  });

  // Open Edit / View Details
  const handleOpenDetails = (trip: Trip) => {
    const calc = calculateTripBilling(trip);
    setSelectedTrip(trip);
    setEditActualKm(calc.actualKm);
    setEditTollCharges(calc.tollCharges);
    setEditPermitCharges(calc.permitCharges);
    setEditHillCharges(calc.hillCharges);
    setEditBattaCharges(calc.battaCharges);
    setEditCashCollected(calc.cashCollected);
    setEditNotes(trip.settlement_notes || '');
    setIsEditingBill(false);
  };

  // Mark Trip Settlement
  const handleMarkSettled = async (trip: Trip) => {
    setIsProcessing(true);
    try {
      await onUpdateTripSettlement(trip.id, {
        settlement_status: 'SETTLED',
        settled_at: new Date().toISOString(),
        excess_cash_returned: true,
        driver_payout_completed: true,
      });
      if (selectedTrip?.id === trip.id) {
        setSelectedTrip((prev) => (prev ? { ...prev, settlement_status: 'SETTLED', settled_at: new Date().toISOString() } : null));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Adjusted Bill
  const handleSaveAdjustedBill = async () => {
    if (!selectedTrip) return;
    setIsProcessing(true);
    try {
      const allowedKm = Number(selectedTrip.allowed_km) || 50;
      const extraKm = Math.max(0, editActualKm - allowedKm);
      const extraKmRate = Number(selectedTrip.extra_km_rate) || 14;
      const extraKmCharges = extraKm * extraKmRate;
      const baseFare = Number(selectedTrip.fare) || 0;
      const newGross = baseFare + extraKmCharges + editTollCharges + editPermitCharges + editHillCharges + editBattaCharges;

      await onUpdateTripSettlement(selectedTrip.id, {
        settlement_status: selectedTrip.settlement_status || 'PENDING',
        actual_km: editActualKm,
        extra_km: extraKm,
        extra_km_charges: extraKmCharges,
        toll_charges: editTollCharges,
        permit_charges: editPermitCharges,
        hill_charges: editHillCharges,
        batta_charges: editBattaCharges,
        total_fare: newGross,
        settlement_notes: editNotes,
      });

      setSelectedTrip((prev) =>
        prev
          ? {
              ...prev,
              actual_km: editActualKm,
              extra_km: extraKm,
              extra_km_charges: extraKmCharges,
              toll_charges: editTollCharges,
              permit_charges: editPermitCharges,
              hill_charges: editHillCharges,
              batta_charges: editBattaCharges,
              total_fare: newGross,
              settlement_notes: editNotes,
            }
          : null
      );
      setIsEditingBill(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Trip Billing & Driver Settlements</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0043DC]/10 text-[#0043DC] border border-[#0043DC]/20">
              PickMi Financial Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile completed trips, verified cash collections, extra km rates, tolls, permits, and hill charges. Reclaim excess cash or dispatch driver payouts.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trip #, driver name, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0043DC]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Unverified Settlements */}
        <div
          onClick={() => setFilter('UNVERIFIED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === 'UNVERIFIED'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Pending Settlement</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{totalUnverifiedCount}</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
              Unverified Trips
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requires admin payment audit</p>
        </div>

        {/* KPI 2: Excess Cash with Drivers (Must recover) */}
        <div
          onClick={() => setFilter('EXCESS_CASH')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === 'EXCESS_CASH'
              ? 'bg-rose-500/10 border-rose-500/40 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Excess Cash to Recover</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-700">₹{totalExcessToCollect.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-md">
              From Drivers
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cash collected exceeds driver earnings</p>
        </div>

        {/* KPI 3: Company Payouts Due to Drivers */}
        <div
          onClick={() => setFilter('PAYOUT_DUE')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === 'PAYOUT_DUE'
              ? 'bg-blue-500/10 border-blue-500/40 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Payouts Due to Drivers</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-[#0043DC]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#0043DC]">₹{totalPayoutDueToDrivers.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">
              UPI / Bank Pay
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Online trips & driver reimbursements</p>
        </div>

        {/* KPI 4: Settled & Verified */}
        <div
          onClick={() => setFilter('SETTLED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filter === 'SETTLED'
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Settled & Cleared</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{totalSettledCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">
              Trips Closed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Accounts balanced & verified</p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('UNVERIFIED')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              filter === 'UNVERIFIED'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Unverified / Pending Settlement ({totalUnverifiedCount})</span>
          </button>

          <button
            onClick={() => setFilter('EXCESS_CASH')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              filter === 'EXCESS_CASH'
                ? 'border-rose-500 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            <span>Driver Must Return Cash (₹{totalExcessToCollect.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setFilter('PAYOUT_DUE')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              filter === 'PAYOUT_DUE'
                ? 'border-[#0043DC] text-[#0043DC] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-[#0043DC]" />
            <span>Pay to Driver (₹{totalPayoutDueToDrivers.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setFilter('SETTLED')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              filter === 'SETTLED'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Settled ({totalSettledCount})</span>
          </button>

          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              filter === 'ALL'
                ? 'border-slate-800 text-slate-900 bg-slate-100/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>All Completed ({completedTrips.length})</span>
          </button>
        </div>

        {/* Commission Setting Quick Toggle */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 py-1">
          <span className="font-semibold text-slate-700">Platform Comm:</span>
          <select
            value={commissionRate}
            onChange={(e) => setCommissionRate(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value={5}>5%</option>
            <option value={10}>10% (Default)</option>
            <option value={15}>15%</option>
            <option value={20}>20%</option>
          </select>
        </div>
      </div>

      {/* Trips Table / Cards */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Trips Found in This Settlement Bucket</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filter === 'UNVERIFIED'
              ? 'Awesome! All completed trip payments and driver accounts are settled and verified.'
              : 'Try changing your search keywords or select another filter view.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => {
            const calc = calculateTripBilling(trip);
            const assignedDriver = drivers.find((d) => d.id === trip.assigned_driver_id) || trip.driver;

            return (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all p-5 shadow-sm hover:shadow-md flex flex-col space-y-4"
              >
                {/* Trip Card Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-black text-xs">
                      {trip.trip_number}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{trip.customer_name}</span>
                    <span className="text-xs text-slate-400 font-mono">({trip.customer_phone})</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                      {trip.trip_type}
                    </span>
                  </div>

                  {/* Settlement Status Badge */}
                  <div className="flex items-center space-x-2">
                    {calc.isSettled ? (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Settled & Verified</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Payment Unverified / Pending Settlement</span>
                      </span>
                    )}

                    <span className="text-xs text-slate-400">
                      {trip.completed_at ? new Date(trip.completed_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: Trip Route & Assigned Driver */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Driver Column */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Assigned Driver
                    </span>
                    {assignedDriver ? (
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 text-xs">{assignedDriver.name}</span>
                          <span className="text-slate-400 font-mono">({assignedDriver.mobile})</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span>{assignedDriver.vehicle?.vehicle_number || 'Vehicle Assigned'}</span>
                          <span>•</span>
                          <span>{trip.vehicle_type}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">No Driver Record Attached</p>
                    )}
                  </div>

                  {/* Route & Distance Column */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Route & Distance Run
                    </span>
                    <div className="space-y-1">
                      <p className="text-slate-700 truncate" title={trip.pickup_location}>
                        📍 <span className="font-medium">From:</span> {trip.pickup_location}
                      </p>
                      <p className="text-slate-700 truncate" title={trip.drop_location}>
                        🏁 <span className="font-medium">To:</span> {trip.drop_location}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        Total Distance: <strong>{trip.distance}</strong> (Allowed: {calc.allowedKm} km)
                      </p>
                    </div>
                  </div>

                  {/* Payment Method & Customer Cash In Hand */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Passenger Payment
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Payment Mode:</span>
                      <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
                        {trip.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Cash with Driver:</span>
                      <span className="font-black text-slate-900 text-sm">
                        ₹{calc.cashCollected.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Calculation Summary (Per KMs, Toll, Permit, Hill Charges) */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Itemized Bill Breakdown
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Extra Km Rate: <strong className="text-white">₹{calc.extraKmRate}/km</strong>
                    </div>
                  </div>

                  {/* Line items row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    {/* Base Fare */}
                    <div>
                      <p className="text-slate-400 text-[10px]">Base Package</p>
                      <p className="font-bold text-white text-sm">₹{calc.baseFare.toLocaleString()}</p>
                    </div>

                    {/* Extra KM */}
                    <div>
                      <p className="text-slate-400 text-[10px]">
                        Extra KM ({calc.extraKm > 0 ? `${calc.extraKm.toFixed(1)} km` : '0 km'})
                      </p>
                      <p className="font-bold text-white text-sm">₹{calc.extraKmCharges.toLocaleString()}</p>
                    </div>

                    {/* Toll Charges */}
                    <div>
                      <p className="text-slate-400 text-[10px]">
                        Toll Charges ({trip.toll_included === 'INCLUDED' ? 'Included' : 'Excluded'})
                      </p>
                      <p className="font-bold text-white text-sm">₹{calc.tollCharges.toLocaleString()}</p>
                    </div>

                    {/* State Permit */}
                    <div>
                      <p className="text-slate-400 text-[10px]">
                        State Permit ({trip.permit_included === 'INCLUDED' ? 'Included' : 'Extra'})
                      </p>
                      <p className="font-bold text-white text-sm">₹{calc.permitCharges.toLocaleString()}</p>
                    </div>

                    {/* Hill Station */}
                    <div>
                      <p className="text-slate-400 text-[10px]">
                        Hill Charges ({trip.hill_charges_applicable === 'APPLICABLE' ? 'Applied' : 'None'})
                      </p>
                      <p className="font-bold text-white text-sm">₹{calc.hillCharges.toLocaleString()}</p>
                    </div>

                    {/* Driver Batta */}
                    <div>
                      <p className="text-slate-400 text-[10px]">Driver Batta</p>
                      <p className="font-bold text-white text-sm">₹{calc.battaCharges.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Bottom financial reconciliation strip */}
                  <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span className="text-slate-400">Total Gross Bill: </span>
                        <strong className="text-white text-sm">₹{calc.grossTotal.toLocaleString()}</strong>
                      </div>
                      <span className="text-slate-600">|</span>
                      <div>
                        <span className="text-slate-400">Platform Comm ({commissionRate}%): </span>
                        <strong className="text-amber-400">₹{calc.companyCommission.toLocaleString()}</strong>
                      </div>
                      <span className="text-slate-600">|</span>
                      <div>
                        <span className="text-slate-400">Driver Net Share: </span>
                        <strong className="text-emerald-400 text-sm">₹{calc.driverNetShare.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Balance Alert Result */}
                    <div className="flex items-center space-x-2">
                      {calc.isExcessCash ? (
                        <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center space-x-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Driver owes ₹{calc.netBalance.toLocaleString()} excess cash</span>
                        </div>
                      ) : calc.isPayoutDue ? (
                        <div className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold flex items-center space-x-1.5">
                          <ArrowUpRight className="w-4 h-4 text-blue-400" />
                          <span>PickMi owes ₹{Math.abs(calc.netBalance).toLocaleString()} to driver</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center space-x-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>Balanced (₹0 diff)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DRIVER-CENTRIC CALLS TO ACTION (CTAs) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenDetails(trip)}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center space-x-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit KMs / Tolls & View Invoice</span>
                    </button>

                    {assignedDriver?.mobile && (
                      <a
                        href={`tel:${assignedDriver.mobile}`}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center space-x-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Call Driver</span>
                      </a>
                    )}
                  </div>

                  {/* Primary Reconciliation CTA Button */}
                  <div className="flex items-center space-x-2">
                    {/* If driver collected excess cash */}
                    {calc.isExcessCash && !calc.isSettled && (
                      <>
                        <a
                          href={`https://wa.me/${assignedDriver?.mobile?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${assignedDriver?.name || 'Driver'}, regarding PickMi Trip ${trip.trip_number}: You have collected ₹${calc.cashCollected} cash. Your net earning is ₹${calc.driverNetShare}. Please transfer the excess ₹${calc.netBalance} to PickMi UPI/Account.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Reminder</span>
                        </a>

                        <button
                          onClick={() => handleMarkSettled(trip)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md flex items-center space-x-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Confirm ₹{calc.netBalance.toLocaleString()} Collected & Settle</span>
                        </button>
                      </>
                    )}

                    {/* If company owes driver */}
                    {calc.isPayoutDue && !calc.isSettled && (
                      <button
                        onClick={() => handleMarkSettled(trip)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-md flex items-center space-x-1.5"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Mark ₹{Math.abs(calc.netBalance).toLocaleString()} Paid & Settle</span>
                      </button>
                    )}

                    {/* Exact balance */}
                    {!calc.isExcessCash && !calc.isPayoutDue && !calc.isSettled && (
                      <button
                        onClick={() => handleMarkSettled(trip)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md flex items-center space-x-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Verify Payment & Settle</span>
                      </button>
                    )}

                    {calc.isSettled && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Settled on {trip.settled_at ? new Date(trip.settled_at).toLocaleDateString() : 'Verified'}</span>
                        </span>
                        <button
                          onClick={() => handleOpenDetails(trip)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Receipt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill Editor & Printable Invoice Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-black">
                    {selectedTrip.trip_number}
                  </span>
                  <h3 className="text-base font-black text-slate-900">Trip Bill Calculation & Settlement</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review and customize itemized charges (per km, toll, permit, hill route).
                </p>
              </div>

              <button
                onClick={() => setSelectedTrip(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Customer & Route info */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Customer</span>
                  <p className="font-bold text-slate-800">{selectedTrip.customer_name}</p>
                  <p className="text-slate-500 font-mono">{selectedTrip.customer_phone}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Driver</span>
                  <p className="font-bold text-slate-800">
                    {drivers.find((d) => d.id === selectedTrip.assigned_driver_id)?.name || selectedTrip.driver?.name || 'Driver'}
                  </p>
                  <p className="text-slate-500 font-mono">
                    {drivers.find((d) => d.id === selectedTrip.assigned_driver_id)?.mobile || selectedTrip.driver?.mobile || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Form / Adjustments */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 uppercase text-xs tracking-wider">
                    Itemized Cost Adjustments
                  </h4>
                  <button
                    onClick={() => setIsEditingBill(!isEditingBill)}
                    className="text-[11px] font-bold text-[#0043DC] hover:underline flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingBill ? 'Cancel Edit' : 'Edit Charges / Tolls'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Actual KM */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Actual KM Run</label>
                    {isEditingBill ? (
                      <input
                        type="number"
                        value={editActualKm}
                        onChange={(e) => setEditActualKm(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-900 mt-1">{editActualKm} km</p>
                    )}
                    <span className="text-[10px] text-slate-400">Allowed: {selectedTrip.allowed_km || 50} km</span>
                  </div>

                  {/* Toll Charges */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Toll Charges (₹)</label>
                    {isEditingBill ? (
                      <input
                        type="number"
                        value={editTollCharges}
                        onChange={(e) => setEditTollCharges(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-900 mt-1">₹{editTollCharges}</p>
                    )}
                    <span className="text-[10px] text-slate-400">State highway / FASTag</span>
                  </div>

                  {/* State Permit Charges */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Permit Charges (₹)</label>
                    {isEditingBill ? (
                      <input
                        type="number"
                        value={editPermitCharges}
                        onChange={(e) => setEditPermitCharges(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-900 mt-1">₹{editPermitCharges}</p>
                    )}
                    <span className="text-[10px] text-slate-400">Interstate border entry</span>
                  </div>

                  {/* Hill Route Charges */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Hill Route (₹)</label>
                    {isEditingBill ? (
                      <input
                        type="number"
                        value={editHillCharges}
                        onChange={(e) => setEditHillCharges(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-900 mt-1">₹{editHillCharges}</p>
                    )}
                    <span className="text-[10px] text-slate-400">Ghat road surcharge</span>
                  </div>

                  {/* Driver Batta */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Driver Batta (₹)</label>
                    {isEditingBill ? (
                      <input
                        type="number"
                        value={editBattaCharges}
                        onChange={(e) => setEditBattaCharges(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-900 mt-1">₹{editBattaCharges}</p>
                    )}
                    <span className="text-[10px] text-slate-400">Food / night allowance</span>
                  </div>

                  {/* Cash In Hand */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cash Collected (₹)</label>
                    {isEditingBill ? (
                      <input
                        type="number"
                        value={editCashCollected}
                        onChange={(e) => setEditCashCollected(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-900 mt-1">₹{editCashCollected}</p>
                    )}
                    <span className="text-[10px] text-slate-400">Collected from passenger</span>
                  </div>
                </div>

                {isEditingBill && (
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => setIsEditingBill(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAdjustedBill}
                      disabled={isProcessing}
                      className="px-4 py-1.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold"
                    >
                      Save Bill Calculations
                    </button>
                  </div>
                )}
              </div>

              {/* Settlement Equation Box */}
              {(() => {
                const baseFare = Number(selectedTrip.fare) || 0;
                const allowedKm = Number(selectedTrip.allowed_km) || 50;
                const extraKm = Math.max(0, editActualKm - allowedKm);
                const extraKmRate = Number(selectedTrip.extra_km_rate) || 14;
                const extraKmCharges = extraKm * extraKmRate;
                const grossTotal = baseFare + extraKmCharges + editTollCharges + editPermitCharges + editHillCharges + editBattaCharges;
                const companyComm = Math.round((baseFare * commissionRate) / 100);
                const driverNet = grossTotal - companyComm;
                const balance = editCashCollected - driverNet;

                return (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Live Settlement Reconciliation
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gross Total Bill to Customer:</span>
                        <span className="font-bold text-white">₹{grossTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Company Commission ({commissionRate}%):</span>
                        <span className="font-bold text-amber-400">- ₹{companyComm.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1">
                        <span className="text-slate-300 font-bold">Driver Net Earnings:</span>
                        <span className="font-black text-emerald-400">₹{driverNet.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cash Already in Driver's Hand:</span>
                        <span className="font-bold text-white">₹{editCashCollected.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-1 text-sm font-black">
                        <span>Net Balance:</span>
                        {balance > 0 ? (
                          <span className="text-rose-400">Driver must return ₹{balance.toLocaleString()}</span>
                        ) : balance < 0 ? (
                          <span className="text-blue-400">Company owes driver ₹{Math.abs(balance).toLocaleString()}</span>
                        ) : (
                          <span className="text-emerald-400">Balanced (₹0)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <button
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold flex items-center space-x-1.5 hover:bg-slate-100"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Invoice</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200"
                >
                  Close
                </button>
                {selectedTrip.settlement_status !== 'SETTLED' && (
                  <button
                    onClick={() => handleMarkSettled(selectedTrip)}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Confirm & Mark Settled</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
