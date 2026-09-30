import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Car,
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import type { Trip, CustomerRecord } from '../types';

interface CustomersManagerProps {
  trips: Trip[];
  onDispatchForCustomer: (name: string, phone: string) => void;
  onViewTripDetails?: (tripId: string) => void;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  trips,
  onDispatchForCustomer,
  onViewTripDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'vip' | 'repeat' | 'recent'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Group & aggregate customers from trips data
  const customers = useMemo(() => {
    const map = new Map<string, CustomerRecord>();

    trips.forEach((trip) => {
      const phoneKey = (trip.customer_phone || 'Unknown Phone').trim();
      const existing = map.get(phoneKey);

      const isCompleted = trip.status === 'COMPLETED';
      const isCancelled = trip.status === 'CANCELLED';

      if (!existing) {
        map.set(phoneKey, {
          phone: phoneKey,
          name: trip.customer_name || 'Valued Customer',
          totalTrips: 1,
          completedTrips: isCompleted ? 1 : 0,
          cancelledTrips: isCancelled ? 1 : 0,
          totalSpend: isCompleted ? trip.fare : 0,
          lastTripDate: trip.created_at,
          lastLocation: `${trip.pickup_location.split(',')[0]} ➔ ${trip.drop_location.split(',')[0]}`,
          preferredVehicle: trip.vehicle_type,
          trips: [trip],
        });
      } else {
        existing.totalTrips += 1;
        if (isCompleted) {
          existing.completedTrips += 1;
          existing.totalSpend += trip.fare;
        }
        if (isCancelled) {
          existing.cancelledTrips += 1;
        }
        if (new Date(trip.created_at) > new Date(existing.lastTripDate)) {
          existing.lastTripDate = trip.created_at;
          existing.lastLocation = `${trip.pickup_location.split(',')[0]} ➔ ${trip.drop_location.split(',')[0]}`;
        }
        existing.trips.push(trip);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [trips]);

  // Metrics
  const totalCustomers = customers.length;
  const totalCustomerSpend = customers.reduce((sum, c) => sum + c.totalSpend, 0);
  const totalCompletedTrips = customers.reduce((sum, c) => sum + c.completedTrips, 0);
  const avgSpendPerCustomer = totalCustomers > 0 ? Math.round(totalCustomerSpend / totalCustomers) : 0;

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.lastLocation.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (tierFilter === 'vip') return c.totalSpend >= 2000;
    if (tierFilter === 'repeat') return c.totalTrips >= 2;
    if (tierFilter === 'recent') {
      const daysAgo = (Date.now() - new Date(c.lastTripDate).getTime()) / (1000 * 3600 * 24);
      return daysAgo <= 7;
    }

    return true;
  });

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    onDispatchForCustomer(newCustName.trim(), newCustPhone.trim());
    setShowAddCustomerModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Customer Management & CRM</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#0043DC] border border-blue-200">
              {totalCustomers} Registered Customers
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time customer booking records, lifetime value, trip histories, and instant dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2.5 bg-[#0043DC] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-[#0043DC]/20 transition-all flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer / Quick Dispatch</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Customers</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{totalCustomers}</span>
            <span className="text-[11px] text-emerald-600 font-bold">100% active database</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0043DC] flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Completed Rides</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{totalCompletedTrips}</span>
            <span className="text-[11px] text-slate-500 font-medium">Customer cab bookings</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Car className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Customer Spend</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">₹{totalCustomerSpend.toLocaleString('en-IN')}</span>
            <span className="text-[11px] text-emerald-600 font-bold">Gross booking volume</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg. Spend / Customer</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">₹{avgSpendPerCustomer}</span>
            <span className="text-[11px] text-slate-500 font-medium">Customer lifetime value</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone (+91), or route..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC] outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All Customers' },
            { id: 'vip', label: 'VIP Spenders (₹2k+)' },
            { id: 'repeat', label: 'Repeat Riders (2+)' },
            { id: 'recent', label: 'Active This Week' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTierFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                tierFilter === f.id
                  ? 'bg-[#0043DC] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Phone / Contact</th>
                <th className="py-3.5 px-4">Total Rides</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4">Preferred Vehicle</th>
                <th className="py-3.5 px-4">Last Route Booked</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers match your search filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isVip = cust.totalSpend >= 2000;
                  return (
                    <tr key={cust.phone} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0043DC] flex items-center justify-center font-bold text-sm">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900">{cust.name}</span>
                              {isVip && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded uppercase">
                                  VIP
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {cust.totalTrips > 1 ? `${cust.totalTrips} bookings recorded` : '1 booking recorded'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2 font-mono text-slate-800 font-bold">
                          <span>{cust.phone}</span>
                          <a
                            href={`tel:${cust.phone}`}
                            title="Call Customer"
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-emerald-600 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Total Rides */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-900">{cust.totalTrips}</span>
                          <span className="text-[11px] text-emerald-600 font-semibold">({cust.completedTrips} done)</span>
                        </div>
                      </td>

                      {/* Total Spend */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          ₹{cust.totalSpend.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                          {cust.preferredVehicle || 'Sedan'}
                        </span>
                      </td>

                      {/* Last Route */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-600 text-[11px]">
                        {cust.lastLocation}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedCustomer(cust)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
                          >
                            View Trips
                          </button>
                          <button
                            onClick={() => onDispatchForCustomer(cust.name, cust.phone)}
                            className="px-2.5 py-1 rounded-lg bg-[#0043DC] hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
                          >
                            Book Ride
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

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0043DC] text-white flex items-center justify-center font-black text-lg">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
                    <span>{selectedCustomer.phone}</span>
                    <span>•</span>
                    <span className="font-sans font-bold text-emerald-600">₹{selectedCustomer.totalSpend} Spent</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* List of customer's trips */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                All Bookings by {selectedCustomer.name} ({selectedCustomer.trips.length})
              </span>

              {selectedCustomer.trips.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">{t.trip_number}</span>
                    <span className="font-bold text-slate-900 font-mono">₹{t.fare}</span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-700">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="truncate">{t.pickup_location}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="truncate">{t.drop_location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                    <span>
                      ALLOWED KM: <strong className="font-mono text-slate-700">{t.allowed_km || 50} KM</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded font-extrabold text-[10px] bg-white border border-slate-200">
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const c = selectedCustomer;
                  setSelectedCustomer(null);
                  onDispatchForCustomer(c.name, c.phone);
                }}
                className="px-4 py-2 rounded-xl bg-[#0043DC] text-white text-xs font-bold hover:bg-blue-700 shadow-md"
              >
                Dispatch New Ride for {selectedCustomer.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">New Customer Quick Booking</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+91 98450 99881"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-medium border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#0043DC] text-white text-xs font-bold hover:bg-blue-700 shadow-md"
                >
                  Proceed to Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
