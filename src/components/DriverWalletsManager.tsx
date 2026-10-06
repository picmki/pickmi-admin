import React, { useState, useEffect } from 'react';
import {
  Wallet,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Car,
  CheckCircle2,
  X,
  History,
  ShieldAlert,
  CreditCard,
  User,
} from 'lucide-react';
import type { Driver, Trip, WalletTransaction } from '../types';
import { supabase } from '../lib/supabase';

interface DriverWalletsManagerProps {
  drivers: Driver[];
  trips: Trip[];
  onViewDriverDetails?: (driverId: string) => void;
}

export const DriverWalletsManager: React.FC<DriverWalletsManagerProps> = ({
  drivers,
  trips,
  onViewDriverDetails,
}) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [driverBalances, setDriverBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'NEGATIVE' | 'POSITIVE'>('ALL');

  // Modal state for applying penalty
  const [selectedDriverForPenalty, setSelectedDriverForPenalty] = useState<Driver | null>(null);
  const [penaltyAmount, setPenaltyAmount] = useState<string>('500');
  const [penaltyCategory, setPenaltyCategory] = useState<string>('Late Customer Cancellation Fine');
  const [penaltyNotes, setPenaltyNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal state for viewing ledger
  const [selectedDriverForLedger, setSelectedDriverForLedger] = useState<Driver | null>(null);

  // 1. Fetch wallet transactions from Supabase
  const fetchWalletData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setTransactions(data as WalletTransaction[]);
        calculateBalances(data as WalletTransaction[]);
      }
    } catch (err) {
      console.warn('Error fetching wallet transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBalances = (txs: WalletTransaction[]) => {
    const balances: Record<string, number> = {};

    drivers.forEach((d) => {
      balances[d.id] = 0;
    });

    txs.forEach((tx) => {
      const drvId = tx.driver_id;
      const amt = Number(tx.amount || 0);
      if (!balances[drvId]) balances[drvId] = 0;
      balances[drvId] += amt;
    });

    setDriverBalances(balances);
  };

  useEffect(() => {
    fetchWalletData();

    // Realtime listener for wallet transactions
    const channel = supabase
      .channel('admin_wallet_sync_' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions' },
        () => {
          fetchWalletData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [drivers]);

  // Handle Penalty Submission
  const handleApplyPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverForPenalty) return;

    const amt = parseFloat(penaltyAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid deduction amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const description = `${penaltyCategory}${penaltyNotes.trim() ? ` • ${penaltyNotes.trim()}` : ''}`;
      const deductionAmount = -Math.abs(amt); // Negative value for deduction

      const newTx: WalletTransaction = {
        id: `txn_pen_${Date.now()}`,
        driver_id: selectedDriverForPenalty.id,
        amount: deductionAmount,
        type: 'PENALTY',
        description,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('wallet_transactions').insert(newTx);
      if (error) throw error;

      // Update local state
      setTransactions((prev) => [newTx, ...prev]);
      setDriverBalances((prev) => ({
        ...prev,
        [selectedDriverForPenalty.id]: (prev[selectedDriverForPenalty.id] || 0) + deductionAmount,
      }));

      setSuccessToast(
        `Applied penalty of ₹${amt.toLocaleString('en-IN')} to ${selectedDriverForPenalty.name}. Wallet balance updated!`
      );
      setTimeout(() => setSuccessToast(null), 4000);

      // Reset modal
      setSelectedDriverForPenalty(null);
      setPenaltyNotes('');
      setPenaltyAmount('500');
    } catch (err: any) {
      console.error('Failed to apply penalty:', err);
      alert('Error applying penalty: ' + (err?.message || 'Database error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((d) => {
    const balance = driverBalances[d.id] || 0;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile.includes(searchQuery);

    if (!matchesSearch) return false;
    if (filterMode === 'NEGATIVE') return balance < 0;
    if (filterMode === 'POSITIVE') return balance > 0;
    return true;
  });

  const negativeDriversCount = Object.values(driverBalances).filter((b) => b < 0).length;
  const totalNegativeAmount = Object.values(driverBalances)
    .filter((b) => b < 0)
    .reduce((acc, b) => acc + Math.abs(b), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-sm font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Driver Wallets & Penalties
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-black bg-blue-100 text-[#0043DC] rounded-full">
              Live Balance Tracker
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage driver wallet ledgers, apply penalties/deductions, and track negative balances payable via Razorpay.
          </p>
        </div>

        <button
          onClick={fetchWalletData}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Balances</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Drivers
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0043DC] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{drivers.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Registered Fleet Partners</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Negative Balance Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {negativeDriversCount} {negativeDriversCount === 1 ? 'Driver' : 'Drivers'}
          </div>
          <p className="text-[11px] text-rose-500 font-semibold mt-1">
            Prompted with Razorpay CTA in Driver App
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Outstanding Due
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalNegativeAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unpaid penalties & platform fees</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search driver name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterMode === 'ALL'
                ? 'bg-[#0043DC] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Drivers ({drivers.length})
          </button>
          <button
            onClick={() => setFilterMode('NEGATIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              filterMode === 'NEGATIVE'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Negative Due ({negativeDriversCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('POSITIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterMode === 'POSITIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Positive Balance
          </button>
        </div>
      </div>

      {/* Drivers Wallet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Driver Partner</th>
                <th className="py-3 px-4">Phone / City</th>
                <th className="py-3 px-4">Online Status</th>
                <th className="py-3 px-4 text-right">Wallet Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No drivers match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const balance = driverBalances[driver.id] || 0;
                  const isNegative = balance < 0;

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Driver Avatar & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              driver.profile_image ||
                              '/default-avatar.svg'
                            }
                            alt={driver.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900">{driver.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{driver.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Mobile & City */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{driver.mobile}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {driver.current_city || 'Bengaluru'}
                        </span>
                      </td>

                      {/* Online Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            driver.online_status === 'ONLINE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              driver.online_status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {driver.online_status}
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-sm font-black tracking-tight ${
                            isNegative
                              ? 'text-rose-600'
                              : balance > 0
                              ? 'text-emerald-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {isNegative ? '-' : balance > 0 ? '+' : ''}₹{Math.abs(balance).toFixed(2)}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isNegative ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            Penalty Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedDriverForPenalty(driver)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Apply Penalty</span>
                          </button>

                          <button
                            onClick={() => setSelectedDriverForLedger(driver)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            title="View Ledger"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: APPLY PENALTY / DEDUCTION ── */}
      {selectedDriverForPenalty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-rose-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base">Apply Penalty to Driver</h3>
              </div>
              <button
                onClick={() => setSelectedDriverForPenalty(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleApplyPenalty} className="p-6 space-y-4">
              {/* Driver Summary Pill */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Driver Partner</p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {selectedDriverForPenalty.name}
                  </p>
                  <p className="text-xs text-slate-500">{selectedDriverForPenalty.mobile}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Current Balance</p>
                  <p
                    className={`text-sm font-black ${
                      (driverBalances[selectedDriverForPenalty.id] || 0) < 0
                        ? 'text-rose-600'
                        : 'text-slate-700'
                    }`}
                  >
                    ₹{(driverBalances[selectedDriverForPenalty.id] || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Deduction Amount */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Penalty / Deduction Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={penaltyAmount}
                    onChange={(e) => setPenaltyAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex gap-2 mt-2">
                  {['250', '500', '1000', '2000'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPenaltyAmount(chip)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition ${
                        penaltyAmount === chip
                          ? 'bg-rose-50 border-rose-300 text-rose-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      ₹{chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason Category
                </label>
                <select
                  value={penaltyCategory}
                  onChange={(e) => setPenaltyCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Late Customer Cancellation Fine">
                    Late Customer Cancellation Fine
                  </option>
                  <option value="Platform Fee / Commission Due">
                    Platform Fee / Commission Due
                  </option>
                  <option value="Customer Complaint / Service Fine">
                    Customer Complaint / Service Fine
                  </option>
                  <option value="Vehicle Fitness / Cleanliness Violation">
                    Vehicle Fitness / Cleanliness Violation
                  </option>
                  <option value="Safety & Speed Rules Violation">
                    Safety & Speed Rules Violation
                  </option>
                  <option value="Administrative Recovery Deduction">
                    Administrative Recovery Deduction
                  </option>
                </select>
              </div>

              {/* Custom Notes */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes / Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Passenger reported driver cancelled after arriving 15m late."
                  value={penaltyNotes}
                  onChange={(e) => setPenaltyNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Realtime Alert Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <span className="font-bold">⚡ Driver App Synchronized:</span> The driver will
                immediately see a negative balance and a <strong>"Pay via Razorpay"</strong> button on
                their phone to clear this balance.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDriverForPenalty(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Applying Deduction…' : 'Apply & Deduct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW DRIVER LEDGER ── */}
      {selectedDriverForLedger && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Driver Wallet Ledger</h3>
                <p className="text-xs text-slate-400">
                  {selectedDriverForLedger.name} • {selectedDriverForLedger.mobile}
                </p>
              </div>
              <button
                onClick={() => setSelectedDriverForLedger(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {transactions.filter((tx) => tx.driver_id === selectedDriverForLedger.id).length ===
              0 ? (
                <p className="text-center text-xs text-slate-400 py-8">
                  No recorded ledger transactions for this driver yet.
                </p>
              ) : (
                transactions
                  .filter((tx) => tx.driver_id === selectedDriverForLedger.id)
                  .map((tx) => {
                    const isNeg = Number(tx.amount) < 0;
                    return (
                      <div
                        key={tx.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isNeg ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isNeg
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-emerald-100 text-emerald-600'
                            }`}
                          >
                            {isNeg ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{tx.description}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {new Date(tx.created_at).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-black ${
                              isNeg ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isNeg ? '-' : '+'}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase font-bold">
                            {tx.type}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDriverForLedger(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
