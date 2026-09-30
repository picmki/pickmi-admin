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
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [markingDriver, setMarkingDriver] = useState<Driver | null>(null);
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
    if (!markingDriver) return;
    setIsProcessing(true);
    try {
      const generatedRef = paymentRef || `${paymentMode.substring(0, 3).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
      await onUpdateDeposit(markingDriver.id, 'PAID', generatedRef);
      setMarkingDriver(null);
      setPaymentRef('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPending = async (driverId: string) => {
    if (confirm('Are you sure you want to reset this driver deposit status to PENDING?')) {
      await onUpdateDeposit(driverId, 'PENDING');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Driver Security Deposit Ledger</h2>
          <p className="text-xs text-slate-500">
            Mandatory annual ₹250 driver security deposit & subscription tracking
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          {(['ALL', 'PAID', 'PENDING'] as const).map((tab) => {
            const count =
              tab === 'ALL' ? drivers.length : tab === 'PAID' ? paidDrivers.length : pendingDrivers.length;
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isActive ? 'bg-[#0043DC] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Deposit Escrow</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">₹{totalCollected.toLocaleString('en-IN')}</div>
          <div className="mt-1 text-xs text-slate-500">₹250.00 flat per verified driver</div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Paid Drivers</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{paidDrivers.length}</div>
          <div className="mt-1 text-xs text-slate-500">Authorized to receive trips</div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Collections</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{pendingDrivers.length}</div>
          <div className="mt-1 text-xs text-slate-500">₹{(pendingDrivers.length * 250).toLocaleString('en-IN')} due</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search driver, mobile, or payment reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Ref ID</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Validity Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const isPaid = driver.deposit_status === 'PAID';

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{driver.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{driver.mobile}</div>
                        <div className="text-[10px] text-slate-500">
                          {driver.vehicle?.vehicle_number || 'No vehicle'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isPaid
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{driver.deposit_status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                        ₹{(Number(driver.deposit_amount) || 250).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {driver.deposit_payment_id || (
                          <span className="text-slate-500 italic">Not Recorded</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {driver.deposit_paid_at ? (
                          new Date(driver.deposit_paid_at).toLocaleDateString()
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {driver.deposit_expires_at ? (
                          <span className="text-emerald-700 font-medium">
                            {new Date(driver.deposit_expires_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPaid ? (
                          <button
                            onClick={() => handleResetPending(driver.id)}
                            className="text-[11px] text-slate-500 hover:text-amber-700 transition"
                          >
                            Reset to Pending
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setMarkingDriver(driver);
                              setPaymentRef(`UPI_${Date.now().toString(36).toUpperCase()}`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-slate-900 font-bold text-xs border border-purple-500/30 transition shadow-md"
                          >
                            Mark as Paid
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
      </div>

      {/* Record Deposit Modal */}
      {markingDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-purple-400" />
                <span>Record ₹250 Security Deposit</span>
              </h3>
              <button
                onClick={() => setMarkingDriver(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Record manual or gateway payment for <strong className="text-slate-900">{markingDriver.name}</strong> ({markingDriver.mobile}). This grants a 1-year active validity.
            </p>

            <form onSubmit={handleMarkPaidSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount</label>
                <input
                  type="text"
                  disabled
                  value="₹250.00 (Annual Deposit)"
                  className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200/50 rounded-xl text-xs text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Channel</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                >
                  <option value="UPI / QR">UPI / QR Code</option>
                  <option value="Cash Offline">Cash at Office / Hub</option>
                  <option value="Razorpay">Razorpay Gateway</option>
                  <option value="Bank Transfer">Bank Transfer / IMPS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI_294812398412"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setMarkingDriver(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-900 font-bold text-xs transition shadow-lg shadow-purple-500/20"
                >
                  {isProcessing ? 'Saving...' : 'Authorize & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
