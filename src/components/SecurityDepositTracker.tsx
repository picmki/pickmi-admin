import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  Calendar,
  Receipt,
  Search,
  PlusCircle,
  X,
  CreditCard,
  UserCheck,
  UserX,
  ArrowRight,
  Filter,
} from 'lucide-react';
import type { Driver } from '../types';

interface SecurityDepositTrackerProps {
  drivers: Driver[];
  onUpdateDeposit: (driverId: string, status: 'PAID' | 'PENDING', paymentId?: string) => Promise<void>;
}

export const SecurityDepositTracker: React.FC<SecurityDepositTrackerProps> = ({
  drivers,
  onUpdateDeposit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'PAID' | 'PENDING' | 'ALL'>('PENDING');
  const [markingDriver, setMarkingDriver] = useState<Driver | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedDriverIdForRecord, setSelectedDriverIdForRecord] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI / QR');
  const [isProcessing, setIsProcessing] = useState(false);

  const paidDrivers = drivers.filter((d) => d.deposit_status === 'PAID');
  const pendingDrivers = drivers.filter((d) => d.deposit_status === 'PENDING');
  const totalCollected = paidDrivers.reduce((sum, d) => sum + (Number(d.deposit_amount) || 250), 0);

  const filteredDrivers = drivers.filter((d) => {
    const matchesFilter = filter === 'ALL' ? true : d.deposit_status === filter;
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.mobile.includes(searchTerm) ||
      (d.deposit_payment_id && d.deposit_payment_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDriver = markingDriver || drivers.find((d) => d.id === selectedDriverIdForRecord);
    if (!targetDriver) return;

    setIsProcessing(true);
    try {
      const generatedRef = paymentRef || `${paymentMode.substring(0, 3).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
      await onUpdateDeposit(targetDriver.id, 'PAID', generatedRef);
      setMarkingDriver(null);
      setIsRecordModalOpen(false);
      setSelectedDriverIdForRecord('');
      setPaymentRef('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPending = async (driverId: string) => {
    if (confirm('Are you sure you want to reset this driver deposit status to UNPAID (Pending)?')) {
      await onUpdateDeposit(driverId, 'PENDING');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0043DC]"></span>
            <span className="text-xs font-black uppercase tracking-wider text-[#0043DC] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              Deposit Escrow Management
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">Driver Security Deposit Ledger</h2>
          <p className="text-xs text-slate-500 font-medium">
            Annual ₹250 mandatory driver security deposit • Authorizes drivers to receive dispatched trips
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedDriverIdForRecord(pendingDrivers[0]?.id || '');
            setPaymentRef(`UPI_${Date.now().toString(36).toUpperCase()}`);
            setIsRecordModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-[#0043DC] hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 transition self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Record Deposit Payment</span>
        </button>
      </div>

      {/* ── Interactive KPI Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Collected Escrow */}
        <div
          onClick={() => setFilter('ALL')}
          className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Escrow Balance</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0043DC]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            Across {paidDrivers.length} verified paid drivers
          </div>
        </div>

        {/* Paid Drivers KPI */}
        <div
          onClick={() => setFilter('PAID')}
          className={`p-5 bg-white border rounded-2xl transition cursor-pointer shadow-xs ${
            filter === 'PAID' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Paid Drivers (Active)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{paidDrivers.length} Drivers</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            Authorized & eligible to accept trips
          </div>
        </div>

        {/* Unpaid Drivers KPI */}
        <div
          onClick={() => setFilter('PENDING')}
          className={`p-5 bg-white border rounded-2xl transition cursor-pointer shadow-xs ${
            filter === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Unpaid Drivers (Pending)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{pendingDrivers.length} Drivers</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            ₹{(pendingDrivers.length * 250).toLocaleString('en-IN')} pending collection
          </div>
        </div>
      </div>

      {/* ── Main List Tabs & Search Bar ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* List Selector Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
            {/* Paid Drivers List Tab */}
            <button
              onClick={() => setFilter('PAID')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                filter === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Paid Drivers List</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filter === 'PAID' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {paidDrivers.length}
              </span>
            </button>

            {/* Unpaid Drivers List Tab */}
            <button
              onClick={() => setFilter('PENDING')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                filter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Unpaid Drivers List</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pendingDrivers.length}
              </span>
            </button>

            {/* All Drivers Tab */}
            <button
              onClick={() => setFilter('ALL')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[#0043DC] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>All Drivers</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {drivers.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search driver, phone, plate, or ref ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0043DC] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Active List Summary Label */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500 font-semibold">
          <div>
            Showing{' '}
            <strong className="text-slate-900">
              {filter === 'PAID'
                ? 'Paid Drivers'
                : filter === 'PENDING'
                ? 'Unpaid Drivers'
                : 'All Drivers'}
            </strong>{' '}
            ({filteredDrivers.length} results)
          </div>
          {filter === 'PENDING' && (
            <div className="text-amber-700 font-bold text-[11px] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Unpaid drivers cannot receive trip dispatches until deposit is recorded</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Ledger Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Driver Details</th>
                <th className="py-3 px-4">Deposit Status</th>
                <th className="py-3 px-4">Deposit Amount</th>
                <th className="py-3 px-4">Payment Reference ID</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Validity (1 Year)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-slate-600">No records found</p>
                    <p className="text-[11px] mt-0.5">Try switching tabs or adjusting search query.</p>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const isPaid = driver.deposit_status === 'PAID';

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">{driver.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{driver.mobile}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {driver.vehicle?.vehicle_number || 'No vehicle assigned'} • {driver.vehicle?.vehicle_type || 'Sedan'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isPaid
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          {isPaid ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{isPaid ? 'PAID (AUTHORIZED)' : 'UNPAID (PENDING)'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                        ₹{(Number(driver.deposit_amount) || 250).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {driver.deposit_payment_id ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-800">
                            {driver.deposit_payment_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unpaid / Pending</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {driver.deposit_paid_at ? (
                          new Date(driver.deposit_paid_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {driver.deposit_expires_at ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {new Date(driver.deposit_expires_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPaid ? (
                          <button
                            onClick={() => handleResetPending(driver.id)}
                            className="text-[11px] text-slate-400 hover:text-amber-700 font-bold transition hover:underline cursor-pointer"
                          >
                            Reset to Unpaid
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setMarkingDriver(driver);
                              setPaymentRef(`UPI_${Date.now().toString(36).toUpperCase()}`);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-sm cursor-pointer"
                          >
                            Mark as Paid →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Deposit Records View (Screens < 768px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredDrivers.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400">
              No deposit records matching filter.
            </div>
          ) : (
            filteredDrivers.map((driver) => {
              const isPaid = driver.deposit_status === 'PAID';
              return (
                <div key={driver.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <img
                        src={driver.profile_image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                        alt={driver.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{driver.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{driver.mobile}</div>
                        <div className="text-[10px] text-slate-400">{driver.vehicle?.vehicle_number || 'Sedan'}</div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {driver.deposit_status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Escrow Amount</span>
                      <span className="font-black text-slate-900 text-sm">₹250.00</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Validity</span>
                      <span className="font-semibold text-slate-700 text-[11px]">{isPaid ? '1 Year Active' : 'Pending'}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400 font-mono">
                      Ref: {driver.deposit_payment_id || 'N/A'}
                    </div>

                    <button
                      onClick={() => {
                        if (isPaid) {
                          handleResetPending(driver.id);
                        } else {
                          setMarkingDriver(driver);
                          setPaymentRef(`UPI_${Date.now().toString(36).toUpperCase()}`);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                        isPaid
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isPaid ? 'Edit Deposit' : 'Record Payment'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Record Deposit Modal (For Row click OR Top button) ── */}
      {(markingDriver || isRecordModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0043DC] flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Record Security Deposit</h3>
                  <p className="text-[11px] text-slate-500 font-medium">₹250.00 Annual Driver Guarantee Escrow</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMarkingDriver(null);
                  setIsRecordModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMarkPaidSubmit} className="space-y-3.5">
              {/* Select Driver if opened via top button */}
              {isRecordModalOpen && !markingDriver ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Driver to Authorize:
                  </label>
                  <select
                    value={selectedDriverIdForRecord}
                    onChange={(e) => setSelectedDriverIdForRecord(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:bg-white"
                  >
                    {pendingDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.mobile}) — {d.vehicle?.vehicle_number || 'No Vehicle'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0043DC] flex items-center justify-center font-black text-sm">
                    {markingDriver?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{markingDriver?.name}</h4>
                    <p className="text-[11px] font-mono text-slate-600">{markingDriver?.mobile}</p>
                    <p className="text-[10px] text-slate-400">
                      {markingDriver?.vehicle?.vehicle_number || 'No vehicle'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deposit Amount</label>
                <input
                  type="text"
                  disabled
                  value="₹250.00 (Annual Security Escrow)"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 font-extrabold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0043DC] focus:bg-white"
                >
                  <option value="UPI / QR">UPI / QR Code</option>
                  <option value="Cash Offline">Cash at Office / Hub</option>
                  <option value="Razorpay">Razorpay Gateway</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Reference / Transaction UTR
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI_294812398412 or CASH_RECEIPT_102"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-[#0043DC] focus:bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMarkingDriver(null);
                    setIsRecordModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'Recording...' : 'Authorize & Mark as Paid →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
