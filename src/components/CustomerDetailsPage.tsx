import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Car,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  X,
  ExternalLink,
  DollarSign,
  User,
  KeyRound,
  Send,
  Receipt,
  FileText
} from 'lucide-react';
import type { Trip, Driver } from '../types';
import type { CustomerDetailRecord } from './WebsiteManager';

interface CustomerDetailsPageProps {
  customer: CustomerDetailRecord;
  trips: Trip[];
  drivers: Driver[];
  onBack: () => void;
  onAssignDriver: (tripId: string, driverId: string) => Promise<void>;
  onUpdateCustomer: (customer: { id?: string; mobile: string; name: string; email?: string; city?: string; gender?: string }) => Promise<void>;
  onDeleteCustomer: (phone: string, id?: string) => Promise<void>;
  onDispatchForCustomer: (name: string, phone: string) => void;
  onViewDriverDetails?: (driverId: string) => void;
}

export const CustomerDetailsPage: React.FC<CustomerDetailsPageProps> = ({
  customer,
  trips,
  drivers,
  onBack,
  onAssignDriver,
  onUpdateCustomer,
  onDeleteCustomer,
  onDispatchForCustomer,
  onViewDriverDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'payments' | 'profile'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editPhone, setEditPhone] = useState(customer.phone);
  const [editEmail, setEditEmail] = useState(customer.email || '');
  const [editCity, setEditCity] = useState(customer.city || 'Bengaluru');
  const [editGender, setEditGender] = useState(customer.gender || 'Male');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Customer Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Assign Driver Modal State
  const [selectedTripForAssign, setSelectedTripForAssign] = useState<Trip | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter trips for this customer
  const customerTrips = useMemo(() => {
    return trips.filter(
      (t) =>
        t.customer_phone?.trim() === customer.phone.trim() ||
        (customer.id && (t as any).customer_id === customer.id)
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [trips, customer.phone, customer.id]);

  // Financial & Metrics Computations
  const metrics = useMemo(() => {
    const totalBookings = customerTrips.length;
    const completed = customerTrips.filter((t) => t.status === 'COMPLETED');
    const cancelled = customerTrips.filter((t) => t.status === 'CANCELLED');
    const active = customerTrips.filter((t) => ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'STARTED'].includes(t.status));
    const pending = customerTrips.filter((t) => t.status === 'AVAILABLE' || t.status === 'REQUESTED');

    const totalSpent = completed.reduce((sum, t) => sum + (t.fare || 0), 0);
    const totalGrossBilled = customerTrips.reduce((sum, t) => sum + (t.fare || 0), 0);

    // Advance paid vs Cash to Driver
    let totalAdvancePaid = 0;
    let totalCashPaid = 0;

    customerTrips.forEach((t) => {
      const mode = (t.payment_method || '').toLowerCase();
      const fare = t.fare || 0;
      if (mode.includes('advance')) {
        totalAdvancePaid += 100;
        totalCashPaid += Math.max(0, fare - 100);
      } else {
        totalCashPaid += fare;
      }
    });

    const avgFare = completed.length > 0 ? Math.round(totalSpent / completed.length) : 0;
    const completionRate = totalBookings > 0 ? Math.round((completed.length / totalBookings) * 100) : 0;

    // Preferred Vehicle Category
    const vehMap: Record<string, number> = {};
    customerTrips.forEach((t) => {
      const v = t.vehicle_type || 'Sedan';
      vehMap[v] = (vehMap[v] || 0) + 1;
    });
    let preferredVehicle = 'Sedan';
    let maxVehCount = 0;
    Object.entries(vehMap).forEach(([v, count]) => {
      if (count > maxVehCount) {
        maxVehCount = count;
        preferredVehicle = v;
      }
    });

    return {
      totalBookings,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      activeCount: active.length,
      pendingCount: pending.length,
      totalSpent,
      totalGrossBilled,
      totalAdvancePaid,
      totalCashPaid,
      avgFare,
      completionRate,
      preferredVehicle
    };
  }, [customerTrips]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editPhone.trim()) return;

    setIsSaving(true);
    try {
      await onUpdateCustomer({
        id: customer.id,
        mobile: editPhone.trim(),
        name: editName.trim(),
        email: editEmail.trim(),
        city: editCity.trim(),
        gender: editGender
      });
      customer.name = editName.trim();
      customer.phone = editPhone.trim();
      customer.email = editEmail.trim();
      customer.city = editCity.trim();
      customer.gender = editGender;
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDeleteCustomer(customer.phone, customer.id);
      setIsDeleteModalOpen(false);
      onBack();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignDriverSubmit = async () => {
    if (!selectedTripForAssign || !selectedDriverId) return;
    setIsAssigning(true);
    try {
      await onAssignDriver(selectedTripForAssign.id, selectedDriverId);
      setSelectedTripForAssign(null);
      setSelectedDriverId('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => onDispatchForCustomer(customer.name, customer.phone)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-[#0043DC]/20"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Dispatch Ride</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition"
            title="Delete Customer Account"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Customer Profile & Financial Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          {/* Customer Identity */}
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              {customer.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{customer.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Customer</span>
                </span>
                {metrics.totalSpent >= 2000 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    VIP Tier
                  </span>
                )}
                {metrics.totalBookings >= 2 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                    Repeat Rider
                  </span>
                )}
              </div>

              {/* Contact Pills */}
              <div className="flex items-center space-x-4 text-xs text-slate-500 mt-2 flex-wrap gap-y-1">
                <div className="flex items-center space-x-1 font-mono text-slate-800">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.phone}</span>
                  <button
                    onClick={() => handleCopy(customer.phone, 'phone')}
                    className="p-1 text-slate-400 hover:text-blue-600 transition"
                    title="Copy Phone"
                  >
                    {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {customer.email && (
                  <div className="flex items-center space-x-1 text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.email}</span>
                  </div>
                )}

                <div className="flex items-center space-x-1 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customer.city || 'Bengaluru, Karnataka'}</span>
                </div>

                <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>Active Since {new Date(customer.lastTripDate).getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* High-Level Financial Snapshot */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:space-x-6 bg-slate-50 px-3 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-slate-200/80 self-stretch lg:self-auto justify-around">
            <div className="text-center sm:text-left">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                ₹{metrics.totalSpent.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">Lifetime Billing</div>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="text-center sm:text-left">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Rides</div>
              <div className="text-xl sm:text-2xl font-black text-[#0043DC] mt-0.5">
                {metrics.totalBookings}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">{metrics.completedCount} Completed</div>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="text-center sm:text-left">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Fare</div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
                ₹{metrics.avgFare}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Per Trip</div>
            </div>
          </div>
        </div>

        {/* 6 Key Performance Metric Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-6">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Completed Rides</div>
            <div className="text-lg font-black text-emerald-600 mt-1">{metrics.completedCount}</div>
            <div className="text-[10px] text-slate-400">{metrics.completionRate}% completion</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cancelled Rides</div>
            <div className="text-lg font-black text-red-500 mt-1">{metrics.cancelledCount}</div>
            <div className="text-[10px] text-slate-400">Zero cancellation fee</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Advance Paid</div>
            <div className="text-lg font-black text-[#0043DC] mt-1">₹{metrics.totalAdvancePaid.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-400">Online Razorpay / Card</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cash to Driver</div>
            <div className="text-lg font-black text-slate-800 mt-1">₹{metrics.totalCashPaid.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-400">Paid directly at trip end</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Preferred Cab</div>
            <div className="text-lg font-black text-slate-900 mt-1">{metrics.preferredVehicle}</div>
            <div className="text-[10px] text-slate-400">Most frequent choice</div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Rides</div>
            <div className="text-lg font-black text-amber-600 mt-1">{metrics.activeCount}</div>
            <div className="text-[10px] text-slate-400">Currently live on road</div>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs (Overview, Bookings, Payments, Profile) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'overview'
              ? 'bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'bookings'
              ? 'bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>All Bookings & Trips ({customerTrips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'payments'
              ? 'bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments & Fare Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'profile'
              ? 'bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Customer Profile</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DASHBOARD OVERVIEW                                */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Activity & Booking Cards (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Recent Bookings by {customer.name}
              </h3>
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-xs font-bold text-[#0043DC] hover:underline"
              >
                View all ({customerTrips.length}) &rarr;
              </button>
            </div>

            {customerTrips.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 font-bold text-xs">
                No trips booked by this customer yet.
              </div>
            ) : (
              <div className="space-y-3">
                {customerTrips.slice(0, 3).map((trip) => (
                  <div key={trip.id} className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{trip.trip_number || trip.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                          {trip.trip_type || 'One-way'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">₹{trip.fare?.toLocaleString('en-IN')}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          trip.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : trip.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : ['ASSIGNED', 'STARTED'].includes(trip.status)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {trip.status}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="font-medium truncate">{trip.pickup_location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"></span>
                        <span className="font-medium truncate">{trip.drop_location}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span>📅 {trip.pickup_date} at {trip.pickup_time}</span>
                        <span>🚗 {trip.vehicle_type}</span>
                        <span className="font-mono font-bold text-slate-700">OTP: {trip.otp || '****'}</span>
                      </div>

                      {trip.status === 'AVAILABLE' && (
                        <button
                          onClick={() => setSelectedTripForAssign(trip)}
                          className="px-3 py-1 bg-[#0043DC] text-white text-[11px] font-bold rounded-lg shadow-xs hover:bg-blue-600 transition"
                        >
                          Assign Driver
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Customer Behavior & Quick Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Travel Profile & Preferences
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Travel City</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{customer.city || 'Bengaluru, Karnataka'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preferred Vehicle Class</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>{metrics.preferredVehicle} Cab</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Habits</div>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Pay Full to Driver / Advance ₹100</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Standing</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                    100% In Good Standing
                  </span>
                  <span className="text-slate-400">0 Disputes</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => onDispatchForCustomer(customer.name, customer.phone)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Booking for {customer.name}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ALL BOOKINGS LIST                                 */}
      {/* ======================================================== */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900">All Trips & Bookings by {customer.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Complete chronological record of booked journeys</p>
            </div>
            <button
              onClick={() => onDispatchForCustomer(customer.name, customer.phone)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0043DC] text-white text-xs font-bold shadow-xs hover:bg-blue-600 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Booking</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Schedule</th>
                  <th className="p-3.5">Cab & Chauffeur</th>
                  <th className="p-3.5">Fare & Payment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {customerTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                      No bookings recorded for this customer.
                    </td>
                  </tr>
                ) : (
                  customerTrips.map((b) => {
                    const isPending = b.status === 'AVAILABLE' || b.status === 'REQUESTED' || (b.status as any) === 'PENDING';
                    const isAssigned = ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'STARTED'].includes(b.status);
                    const isCompleted = b.status === 'COMPLETED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="font-mono font-black text-slate-900">{b.trip_number || b.id}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">OTP: {b.otp || '****'}</div>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <div className="truncate text-slate-900 font-semibold flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                            <span className="truncate">{b.pickup_location}</span>
                          </div>
                          <div className="truncate text-slate-500 text-[11px] flex items-center space-x-1.5 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                            <span className="truncate">{b.drop_location}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.pickup_date}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{b.pickup_time} · {b.trip_type || 'One-way'}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.vehicle_type}</div>
                          {b.driver ? (
                            <div className="text-[11px] text-emerald-600 flex items-center space-x-1 mt-0.5">
                              <span>Chauffeur: {b.driver.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5 inline-block">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <div className="font-black text-slate-900">₹{b.fare?.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                            {b.payment_method || 'Pay to Driver'}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : isAssigned
                              ? 'bg-blue-100 text-blue-700'
                              : isPending
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          {isPending && (
                            <button
                              onClick={() => setSelectedTripForAssign(b)}
                              className="px-3 py-1.5 rounded-lg bg-[#0043DC] hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition"
                            >
                              Assign Driver
                            </button>
                          )}
                          {isAssigned && (
                            <button
                              onClick={() => setSelectedTripForAssign(b)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                            >
                              Reassign
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
      )}

      {/* ======================================================== */}
      {/* TAB 3: PAYMENTS & FARE LEDGER                            */}
      {/* ======================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">
              Payment & Fare Settlement Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Gross Billing</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  ₹{metrics.totalGrossBilled.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Across {metrics.totalBookings} total bookings</div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70">
                <div className="text-[11px] font-bold text-blue-600 uppercase">Advance Paid Online</div>
                <div className="text-2xl font-black text-[#0043DC] mt-1">
                  ₹{metrics.totalAdvancePaid.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-blue-700/80 mt-0.5">Online gateway confirmed</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                <div className="text-[11px] font-bold text-emerald-600 uppercase">Cash Paid to Chauffeurs</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  ₹{metrics.totalCashPaid.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-700/80 mt-0.5">Direct driver collections</div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Transaction & Billing Ledger ({customerTrips.length})
              </h4>
              <span className="text-xs text-slate-400">All amounts in Indian Rupee (INR)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Date & Booking Ref</th>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5">Total Fare</th>
                    <th className="p-3.5">Advance Online</th>
                    <th className="p-3.5">Due to Chauffeur</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {customerTrips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    customerTrips.map((t) => {
                      const isAdvance = (t.payment_method || '').toLowerCase().includes('advance');
                      const fare = t.fare || 0;
                      const advance = isAdvance ? 100 : 0;
                      const cashDue = isAdvance ? Math.max(0, fare - 100) : fare;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-slate-900">{t.trip_number || t.id}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleDateString('en-IN')}</div>
                          </td>

                          <td className="p-3.5 max-w-xs truncate">
                            <div className="truncate font-semibold text-slate-800">{t.pickup_location.split(',')[0]} ➔ {t.drop_location.split(',')[0]}</div>
                            <div className="text-[11px] text-slate-400">{t.vehicle_type} · {t.trip_type || 'One-way'}</div>
                          </td>

                          <td className="p-3.5 font-black text-slate-900 text-xs">
                            ₹{fare.toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5">
                            {advance > 0 ? (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                ₹{advance} Paid
                              </span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>

                          <td className="p-3.5 font-bold text-slate-800">
                            ₹{cashDue.toLocaleString('en-IN')}
                          </td>

                          <td className="p-3.5 text-slate-600 text-[11px]">
                            {t.payment_method || 'Cash on Delivery'}
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CUSTOMER PROFILE & SETTINGS                       */}
      {/* ======================================================== */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Customer Account Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage personal information and contact preferences</p>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Full Name</span>
              <div className="font-bold text-slate-900 text-sm">{customer.name}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Registered Mobile</span>
              <div className="font-bold text-slate-900 font-mono text-sm">{customer.phone}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
              <div className="font-bold text-slate-900 text-sm">{customer.email || 'Not provided'}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary City</span>
              <div className="font-bold text-slate-900 text-sm">{customer.city || 'Bengaluru, Karnataka'}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Gender</span>
              <div className="font-bold text-slate-900 text-sm">{customer.gender || 'Not specified'}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Account Verification Status</span>
              <div className="font-bold text-emerald-600 text-sm flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Account (OTP Confirmed)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: EDIT CUSTOMER                                   */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-[#0043DC]" />
                <span>Edit Customer Profile</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Operating City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-bold text-xs transition shadow-md shadow-[#0043DC]/20 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DELETE CUSTOMER                                 */}
      {/* ======================================================== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Delete Customer Account?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>{customer.name}</strong> ({customer.phone})?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ASSIGN CHAUFFEUR                                */}
      {/* ======================================================== */}
      {selectedTripForAssign && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Assign Chauffeur to {selectedTripForAssign.trip_number || selectedTripForAssign.id}
              </h3>
              <button
                onClick={() => setSelectedTripForAssign(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl text-xs space-y-1 text-blue-900">
              <div>Route: {selectedTripForAssign.pickup_location.split(',')[0]} ➔ {selectedTripForAssign.drop_location.split(',')[0]}</div>
              <div>Fare: ₹{selectedTripForAssign.fare?.toLocaleString('en-IN')}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Select Online Driver</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Available Chauffeur --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.online_status === 'ONLINE' ? '🟢 ONLINE' : '⚪ OFFLINE'}) · {d.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTripForAssign(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDriverId || isAssigning}
                onClick={handleAssignDriverSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs transition shadow-md shadow-[#0043DC]/20"
              >
                {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
