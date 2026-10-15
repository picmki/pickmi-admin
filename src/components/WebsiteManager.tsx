import { AdminBookCabModal } from './AdminBookCabModal';
import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  Car,
  UserCheck,
  Clock,
  Phone,
  Mail,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  User,
  X,
  MessageSquare,
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  AlertTriangle,
  Plus
} from 'lucide-react';
import type { Trip, Driver, WebsiteBooking, WebsiteUser, WebsiteDriverApplication, WebsiteContactSubmission } from '../types';

export interface CustomerDetailRecord {
  id?: string;
  phone: string;
  name: string;
  email?: string;
  city?: string;
  gender?: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalSpend: number;
  lastTripDate: string;
  trips: Trip[];
  isVerified?: boolean;
}

interface WebsiteManagerProps {
  openBookCabModal?: boolean;
  onCloseBookCabModal?: () => void;
  trips: Trip[];
  drivers: Driver[];
  websiteBookings: WebsiteBooking[];
  websiteUsers: WebsiteUser[];
  driverApplications: WebsiteDriverApplication[];
  contactSubmissions: WebsiteContactSubmission[];
  activeSubTab?: 'bookings' | 'users' | 'applications' | 'inquiries';
  onRefresh: () => void;
  onAssignDriver: (tripId: string, driverId: string) => Promise<void>;
  onApproveDriverApplication?: (app: WebsiteDriverApplication) => Promise<void>;
  onUpdateInquiryStatus?: (id: string, status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED') => Promise<void>;
  onUpdateCustomer?: (customer: { id?: string; mobile: string; name: string; email?: string; city?: string; gender?: string }) => Promise<void>;
  onDeleteCustomer?: (phone: string, id?: string) => Promise<void>;
  onDispatchForCustomer?: (name: string, phone: string) => void;
  onViewCustomerDetails: (customer: CustomerDetailRecord) => void;
  onViewDriverDetails?: (driverId: string) => void;
}

export const WebsiteManager: React.FC<WebsiteManagerProps> = ({
  openBookCabModal = false,
  onCloseBookCabModal,
  trips,
  drivers,
  websiteBookings,
  websiteUsers,
  driverApplications,
  contactSubmissions,
  activeSubTab = 'bookings',
  onRefresh,
  onAssignDriver,
  onApproveDriverApplication,
  onUpdateInquiryStatus,
  onUpdateCustomer,
  onDeleteCustomer,
  onDispatchForCustomer,
  onViewCustomerDetails,
  onViewDriverDetails,
}) => {
  // Admin Book Cab Modal state
  const [isBookCabModalOpen, setIsBookCabModalOpen] = useState(openBookCabModal);
  const [selectedCustomerForBooking, setSelectedCustomerForBooking] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  } | null>(null);

  React.useEffect(() => {
    if (openBookCabModal) {
      setIsBookCabModalOpen(true);
    }
  }, [openBookCabModal]);

  // Booking state
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState<any | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Customer Management state (End-to-End Table View, View, Edit, Delete)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'vip' | 'repeat' | 'recent'>('all');
  // customer view modal replaced by dedicated CustomerDetailsPage
  const [customerToEdit, setCustomerToEdit] = useState<CustomerDetailRecord | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerDetailRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Aggregate Customer Records from websiteUsers & trips
  const customersList = useMemo(() => {
    const map = new Map<string, CustomerDetailRecord>();

    // Seed from websiteUsers
    websiteUsers.forEach((u) => {
      const cleanPhone = (u.mobile || '').trim();
      if (cleanPhone) {
        map.set(cleanPhone, {
          id: u.id,
          phone: cleanPhone,
          name: u.name || 'Website Customer',
          email: u.email || '',
          city: u.city || 'Bengaluru',
          gender: u.gender || 'Not specified',
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          totalSpend: 0,
          lastTripDate: u.created_at || new Date().toISOString(),
          trips: [],
          isVerified: true
        });
      }
    });

    // Populate and aggregate trips
    trips.forEach((trip) => {
      const phone = (trip.customer_phone || '').trim();
      if (!phone) return;

      const isCompleted = trip.status === 'COMPLETED';
      const isCancelled = trip.status === 'CANCELLED';
      const existing = map.get(phone);

      if (existing) {
        existing.totalTrips += 1;
        if (isCompleted) {
          existing.completedTrips += 1;
          existing.totalSpend += (trip.fare || 0);
        }
        if (isCancelled) {
          existing.cancelledTrips += 1;
        }
        if (new Date(trip.created_at) > new Date(existing.lastTripDate)) {
          existing.lastTripDate = trip.created_at;
        }
        if (trip.customer_name && (!existing.name || existing.name === 'Website Customer')) {
          existing.name = trip.customer_name;
        }
        existing.trips.push(trip);
      } else {
        map.set(phone, {
          phone,
          name: trip.customer_name || 'Website Rider',
          email: '',
          city: trip.pickup_location?.split(',')[1]?.trim() || 'Bengaluru',
          totalTrips: 1,
          completedTrips: isCompleted ? 1 : 0,
          cancelledTrips: isCancelled ? 1 : 0,
          totalSpend: isCompleted ? (trip.fare || 0) : 0,
          lastTripDate: trip.created_at,
          trips: [trip],
          isVerified: true
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Sort by last trip date descending
      return new Date(b.lastTripDate).getTime() - new Date(a.lastTripDate).getTime();
    });
  }, [websiteUsers, trips]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const q = customerSearchQuery.toLowerCase().trim();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (customerFilter === 'vip') return c.totalSpend >= 2000;
      if (customerFilter === 'repeat') return c.totalTrips >= 2;
      if (customerFilter === 'recent') {
        const daysAgo = (Date.now() - new Date(c.lastTripDate).getTime()) / (1000 * 3600 * 24);
        return daysAgo <= 14;
      }
      return true;
    });
  }, [customersList, customerSearchQuery, customerFilter]);

  // Trips from website
  const filteredBookings = useMemo(() => {
    return trips.filter((b) => {
      const matchesSearch =
        (b.trip_number || '').toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
        (b.customer_name || '').toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
        (b.customer_phone || '').includes(bookingSearchTerm) ||
        (b.pickup_location || '').toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
        (b.drop_location || '').toLowerCase().includes(bookingSearchTerm.toLowerCase());

      let matchesStatus = true;
      if (bookingStatusFilter === 'PENDING') {
        matchesStatus = b.status === 'AVAILABLE' || b.status === 'REQUESTED' || (b.status as any) === 'PENDING';
      } else if (bookingStatusFilter === 'ASSIGNED') {
        matchesStatus = ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'STARTED'].includes(b.status);
      } else if (bookingStatusFilter === 'COMPLETED') {
        matchesStatus = b.status === 'COMPLETED';
      } else if (bookingStatusFilter === 'CANCELLED') {
        matchesStatus = b.status === 'CANCELLED';
      }

      return matchesSearch && matchesStatus;
    });
  }, [trips, bookingSearchTerm, bookingStatusFilter]);

  // Handle Driver Assignment
  const handleExecuteAssign = async () => {
    if (!selectedBookingForAssign || !selectedDriverId) return;
    setIsAssigning(true);
    try {
      await onAssignDriver(selectedBookingForAssign.id, selectedDriverId);
      setSelectedBookingForAssign(null);
      setSelectedDriverId('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssigning(false);
    }
  };

  // Open Edit Customer Modal
  const handleOpenEdit = (customer: CustomerDetailRecord) => {
    setCustomerToEdit(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditEmail(customer.email || '');
    setEditCity(customer.city || 'Bengaluru');
    setEditGender(customer.gender || 'Male');
  };

  // Save Customer Edits
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit || !editName.trim() || !editPhone.trim()) return;

    setIsSavingCustomer(true);
    try {
      if (onUpdateCustomer) {
        await onUpdateCustomer({
          id: customerToEdit.id,
          mobile: editPhone.trim(),
          name: editName.trim(),
          email: editEmail.trim(),
          city: editCity.trim(),
          gender: editGender
        });
      }
      setCustomerToEdit(null);
      onRefresh();
    } catch (err) {
      console.error('Save customer error:', err);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Delete Customer
  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      if (onDeleteCustomer) {
        await onDeleteCustomer(customerToDelete.phone, customerToDelete.id);
      }
      setCustomerToDelete(null);
      onRefresh();
    } catch (err) {
      console.error('Delete customer error:', err);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4 text-blue-300" />
            <span>Dedicated Website Module</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {activeSubTab === 'users'
              ? 'Website Customer Directory'
              : activeSubTab === 'bookings'
              ? 'Website Bookings & Dispatch'
              : activeSubTab === 'applications'
              ? 'Driver Partner Applications'
              : 'Website Support Inquiries'}
          </h1>
          <p className="text-blue-100/80 text-sm mt-1 max-w-xl">
            {activeSubTab === 'users'
              ? 'View complete customer list with lifetime metrics, trip histories, and full profile editing & management.'
              : activeSubTab === 'bookings'
              ? 'Real-time dispatch and chauffeur assignment for rides booked through the public website.'
              : 'Public website submissions connected to your Supabase backend.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-stretch md:self-auto w-full md:w-auto">
          <button
            onClick={() => {
              setSelectedCustomerForBooking(null);
              setIsBookCabModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-400/20 transition cursor-pointer"
          >
            <Car className="w-4 h-4 text-slate-950" />
            <span>Book a Cab for Customer</span>
          </button>
          <button
            onClick={onRefresh}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Supabase</span>
          </button>
          <a
            href="http://localhost:4200"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black shadow-lg shadow-blue-500/30 transition"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Website</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Website Bookings</div>
            <div className="text-2xl font-black text-slate-900">{trips.length}</div>
            <div className="text-[11px] text-emerald-600 font-bold">Live in Supabase</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Awaiting Driver</div>
            <div className="text-2xl font-black text-amber-600">
              {trips.filter((b) => b.status === 'AVAILABLE' || b.status === 'REQUESTED' || (b.status as any) === 'PENDING').length}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Ready for Dispatch</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Total Customers</div>
            <div className="text-2xl font-black text-slate-900">{customersList.length}</div>
            <div className="text-[11px] text-purple-600 font-bold">Registered Riders</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">Driver Inquiries</div>
            <div className="text-2xl font-black text-slate-900">{driverApplications.length}</div>
            <div className="text-[11px] text-slate-400 font-medium">Onboarding Pipeline</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: CUSTOMERS TABLE VIEW (Requested by User)      */}
      {/* ======================================================== */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header & Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name, phone, email, city..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All Customers' },
                  { id: 'vip', label: 'VIP (₹2000+)' },
                  { id: 'repeat', label: 'Repeat Riders (2+)' },
                  { id: 'recent', label: 'Recent (14 days)' }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCustomerFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    customerFilter === f.id
                      ? 'bg-[#0043DC] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customers Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">City / Location</th>
                  <th className="p-3.5">Bookings</th>
                  <th className="p-3.5">Lifetime Spend</th>
                  <th className="p-3.5">Last Ride</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                      No customer records match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.phone} className="hover:bg-slate-50/80 transition">
                      {/* Customer Profile */}
                      <td className="p-3.5">
                        <div
                          onClick={() => {
                            if (onViewCustomerDetails) onViewCustomerDetails(cust);
                            
                          }}
                          className="flex items-center space-x-3 cursor-pointer group"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-100 group-hover:bg-blue-200 text-[#0043DC] font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0 transition">
                            {cust.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#0043DC] text-xs flex items-center space-x-1.5 transition">
                              <span>{cust.name}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Verified
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              ID: {cust.id || cust.phone.replace(/\D/g, '').slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5 font-mono text-slate-900 text-xs">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{cust.phone}</span>
                          <button
                            onClick={() => copyToClipboard(cust.phone)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Copy Phone"
                          >
                            {copiedPhone === cust.phone ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {cust.email && (
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{cust.email}</span>
                          </div>
                        )}
                      </td>

                      {/* City */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{cust.city || 'Bengaluru'}</span>
                        </div>
                      </td>

                      {/* Bookings Count */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 text-xs">{cust.totalTrips} Rides</span>
                          {cust.totalTrips >= 2 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Repeat
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {cust.completedTrips} Completed · {cust.cancelledTrips} Cancelled
                        </div>
                      </td>

                      {/* Total Spend */}
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-xs">
                          ₹{cust.totalSpend.toLocaleString('en-IN')}
                        </div>
                        {cust.totalSpend >= 2000 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            VIP
                          </span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="p-3.5">
                        <div className="text-slate-800 text-xs">
                          {new Date(cust.lastTripDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(cust.lastTripDate).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Actions: View, Edit, Delete, Dispatch */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => {
                              if (onViewCustomerDetails) onViewCustomerDetails(cust);
                              
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition"
                            title="Open Customer Dashboard & Booking Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Customer */}
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-emerald-600 transition"
                            title="Edit Customer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Dispatch */}
                          {onDispatchForCustomer && (
                            <button
                              onClick={() => onDispatchForCustomer(cust.name, cust.phone)}
                              className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0043DC] transition"
                              title="Dispatch Cab for Customer"
                            >
                              <Car className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Customer */}
                          <button
                            onClick={() => setCustomerToDelete(cust)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Customers View (Screens < 768px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">
                No registered customers found.
              </div>
            ) : (
              filteredCustomers.map((cust) => (
                <div key={cust.phone} className="p-4 space-y-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                        {cust.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                          {cust.totalSpend >= 2000 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`tel:${cust.phone}`}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Rides Booked</span>
                      <span className="font-bold text-slate-800">{cust.totalTrips} Rides</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Lifetime Spend</span>
                      <span className="font-black text-slate-900">₹{cust.totalSpend.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onViewCustomerDetails(cust)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-600 transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {onDispatchForCustomer && (
                      <button
                        onClick={() => onDispatchForCustomer(cust.name, cust.phone)}
                        className="px-3 py-1.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs"
                      >
                        Dispatch
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: WEBSITE BOOKINGS TABLE                        */}
      {/* ======================================================== */}
      {activeSubTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by customer, booking ref, location..."
                value={bookingSearchTerm}
                onChange={(e) => setBookingSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
              {(['ALL', 'PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setBookingStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    bookingStatusFilter === st
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Trip Ref / Source</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Schedule & Fare</th>
                  <th className="p-3.5">Chauffeur</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                      No website bookings found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const isPending = b.status === 'AVAILABLE' || b.status === 'REQUESTED' || (b.status as any) === 'PENDING';
                    const isAssigned = ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'STARTED'].includes(b.status);
                    const isCompleted = b.status === 'COMPLETED';

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-black text-slate-900 font-mono">{b.trip_number || b.id}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                              Website
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">OTP: {b.otp || '****'}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.customer_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{b.customer_phone}</span>
                          </div>
                        </td>

                        <td className="p-3.5 max-w-xs">
                          <div className="truncate text-slate-800 font-semibold flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                            <span className="truncate">{b.pickup_location}</span>
                          </div>
                          <div className="truncate text-slate-500 text-[11px] flex items-center space-x-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                            <span className="truncate">{b.drop_location}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">₹{b.fare?.toLocaleString('en-IN') || 0}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {b.pickup_date} · {b.vehicle_type}
                          </div>
                        </td>

                        <td className="p-3.5">
                          {b.driver ? (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center space-x-1">
                                <span>{b.driver.name}</span>
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Assigned</span>
                              </div>
                              <div className="text-[11px] text-slate-400">{b.driver.mobile}</div>
                            </div>
                          ) : (
                            <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : isAssigned
                                ? 'bg-blue-100 text-blue-700'
                                : isPending
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          {isPending && (
                            <button
                              onClick={() => setSelectedBookingForAssign(b)}
                              className="px-3 py-1.5 rounded-lg bg-[#0043DC] hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition"
                            >
                              Assign Driver
                            </button>
                          )}
                          {isAssigned && (
                            <button
                              onClick={() => setSelectedBookingForAssign(b)}
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
      {/* SECTION 3: DRIVER APPLICATIONS                           */}
      {/* ======================================================== */}
      {activeSubTab === 'applications' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900">Driver Partner Applications from Website</h3>
            <span className="text-xs text-slate-500">Total received: {driverApplications.length}</span>
          </div>

          {driverApplications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold">
              No driver partner applications submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {driverApplications.map((app) => (
                <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.phone_number} · {app.city}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                    <div>Vehicle: <strong>{app.vehicle_type}</strong></div>
                    <div>Plate: <strong>{app.vehicle_number || 'Pending'}</strong></div>
                    <div className="col-span-2">DL No: <strong>{app.license_number || 'Submitted'}</strong></div>
                  </div>

                  {app.status === 'PENDING' && onApproveDriverApplication && (
                    <button
                      onClick={() => onApproveDriverApplication(app)}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm"
                    >
                      ✓ Approve & Onboard to Fleet
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: CONTACT INQUIRIES                             */}
      {/* ======================================================== */}
      {activeSubTab === 'inquiries' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
          <h3 className="text-base font-black text-slate-900 mb-4">Contact & Support Tickets from Website</h3>
          {contactSubmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold">
              No support tickets or contact submissions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {contactSubmissions.map((inq) => (
                <div key={inq.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-sm">{inq.name} ({inq.phone || inq.email})</div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                      {inq.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-blue-600">{inq.topic}</div>
                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100">
                    {inq.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT CUSTOMER                                   */}
      {/* ======================================================== */}
      {customerToEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-[#0043DC]" />
                <span>Edit Customer Profile</span>
              </h3>
              <button
                onClick={() => setCustomerToEdit(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Ramesh Kumar"
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
                  placeholder="+91 98401 23456"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name@example.com"
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
                    placeholder="Bengaluru"
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
                  onClick={() => setCustomerToEdit(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-bold text-xs transition shadow-md shadow-[#0043DC]/20 disabled:opacity-50"
                >
                  {isSavingCustomer ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CUSTOMER CONFIRMATION                    */}
      {/* ======================================================== */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Delete Customer Profile?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong>{customerToDelete.name}</strong> ({customerToDelete.phone})?
                This customer record will be removed from the database.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCustomer}
                onClick={handleConfirmDeleteCustomer}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                {isDeletingCustomer ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ASSIGN DRIVER TO WEBSITE TRIP                   */}
      {/* ======================================================== */}
      {selectedBookingForAssign && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Assign Chauffeur to {selectedBookingForAssign.trip_number || selectedBookingForAssign.id}
              </h3>
              <button
                onClick={() => setSelectedBookingForAssign(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl text-xs space-y-1 text-blue-900">
              <div>Customer: <strong>{selectedBookingForAssign.customer_name}</strong> ({selectedBookingForAssign.customer_phone})</div>
              <div className="truncate">Pickup: {selectedBookingForAssign.pickup_location}</div>
              <div>Fare: ₹{selectedBookingForAssign.fare?.toLocaleString('en-IN')}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Select Online Chauffeur</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Available Driver --</option>
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
                onClick={() => setSelectedBookingForAssign(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDriverId || isAssigning}
                onClick={handleExecuteAssign}
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
