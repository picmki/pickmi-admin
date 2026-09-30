import React, { useState } from 'react';
import {
  MapPin,
  PlusCircle,
  Search,
  Filter,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Phone,
  Shield,
  Send,
  Sliders,
  IndianRupee,
  Navigation,
  Trash2,
  Eye,
  AlertTriangle,
  X,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  ArrowRight,
  User,
  KeyRound
} from 'lucide-react';
import type { Driver, Trip, TripStatus } from '../types';

interface TripsManagerProps {
  trips: Trip[];
  drivers: Driver[];
  onOpenCreateModal: () => void;
  onUpdateTripStatus: (tripId: string, status: TripStatus, driverId?: string) => Promise<void>;
  onAssignDriver: (tripId: string, driverId: string) => Promise<void>;
  onApproveDriverRequest?: (tripId: string, driverId: string) => Promise<void>;
  onRejectDriverRequest?: (tripId: string, driverId?: string) => Promise<void>;
  onDeleteTrip?: (tripId: string) => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
}

export const TripsManager: React.FC<TripsManagerProps> = ({
  trips,
  drivers,
  onOpenCreateModal,
  onUpdateTripStatus,
  onAssignDriver,
  onApproveDriverRequest,
  onRejectDriverRequest,
  onDeleteTrip,
  onViewDriverDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | TripStatus>('ALL');
  const [selectedTripForAssign, setSelectedTripForAssign] = useState<Trip | null>(null);
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [tripToCancel, setTripToCancel] = useState<Trip | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const onlineDrivers = drivers.filter((d) => d.online_status === 'ONLINE');

  const filteredTrips = trips.filter((t) => {
    const matchesFilter = selectedFilter === 'ALL' ? true : t.status === selectedFilter;
    const matchesSearch =
      (t.trip_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customer_phone || '').includes(searchTerm) ||
      (t.pickup_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.drop_location || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApproveRequest = async (tripId: string, driverId: string) => {
    setIsProcessing(true);
    try {
      if (onApproveDriverRequest) {
        await onApproveDriverRequest(tripId, driverId);
      } else {
        await onAssignDriver(tripId, driverId);
      }
      if (selectedTripForDetails && selectedTripForDetails.id === tripId) {
        const assignedDrv = drivers.find((d) => d.id === driverId);
        setSelectedTripForDetails({
          ...selectedTripForDetails,
          status: 'ASSIGNED',
          assigned_driver_id: driverId,
          driver: assignedDrv,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async (tripId: string, driverId?: string) => {
    setIsProcessing(true);
    try {
      if (onRejectDriverRequest) {
        await onRejectDriverRequest(tripId, driverId);
      } else {
        await onUpdateTripStatus(tripId, 'AVAILABLE');
      }
      if (selectedTripForDetails && selectedTripForDetails.id === tripId) {
        setSelectedTripForDetails({
          ...selectedTripForDetails,
          status: 'AVAILABLE',
          assigned_driver_id: null,
          trip_requests: (selectedTripForDetails.trip_requests || []).filter((r) => r.driver_id !== driverId),
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedTripForAssign || !selectedDriverId) return;
    setIsProcessing(true);
    try {
      await onAssignDriver(selectedTripForAssign.id, selectedDriverId);
      if (selectedTripForDetails && selectedTripForDetails.id === selectedTripForAssign.id) {
        const assignedDrv = drivers.find((d) => d.id === selectedDriverId);
        setSelectedTripForDetails({
          ...selectedTripForDetails,
          status: 'ASSIGNED',
          assigned_driver_id: selectedDriverId,
          driver: assignedDrv,
        });
      }
      setSelectedTripForAssign(null);
      setSelectedDriverId('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!tripToCancel) return;
    setIsProcessing(true);
    try {
      await onUpdateTripStatus(tripToCancel.id, 'CANCELLED');
      if (selectedTripForDetails && selectedTripForDetails.id === tripToCancel.id) {
        setSelectedTripForDetails({ ...selectedTripForDetails, status: 'CANCELLED' });
      }
      setTripToCancel(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;
    setIsProcessing(true);
    try {
      if (onDeleteTrip) {
        await onDeleteTrip(tripToDelete.id);
      }
      if (selectedTripForDetails && selectedTripForDetails.id === tripToDelete.id) {
        setSelectedTripForDetails(null);
      }
      setTripToDelete(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-blue-50 text-[#0043DC] border-blue-200';
      case 'REQUESTED':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold animate-pulse';
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ON_THE_WAY':
      case 'ARRIVED':
      case 'STARTED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const copyToClipboard = (text: string, type: 'otp' | 'phone') => {
    navigator.clipboard?.writeText(text);
    if (type === 'otp') {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Trips & Fleet Dispatch Center</h2>
          <p className="text-xs text-slate-500">
            Realtime database stream: View inside details, dispatch rides, cancel or delete trip records
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-md shadow-[#0043DC]/20 self-start sm:self-auto active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Dispatch New Trip</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {/* Status Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 lg:pb-0">
          {(['ALL', 'AVAILABLE', 'REQUESTED', 'ASSIGNED', 'ARRIVED', 'STARTED', 'COMPLETED', 'CANCELLED'] as const).map(
            (status) => {
              const count = status === 'ALL' ? trips.length : trips.filter((t) => t.status === status).length;
              const isActive = selectedFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#0043DC] text-white shadow-sm'
                      : status === 'REQUESTED' && count > 0
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {status} ({count})
                </button>
              );
            }
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by trip #, customer, route..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
          />
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredTrips.map((trip) => {
          return (
            <div
              key={trip.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-[#0043DC]/40 hover:shadow-md transition shadow-sm flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                {/* Top Row: Trip Number, Vehicle Badge, Status & Delete Shortcut */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-black text-slate-900">{trip.trip_number}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-600">
                      {trip.vehicle_type}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(trip.status)}`}>
                      {trip.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTripToDelete(trip);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Fare & Cash to Collect Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Trip Fare</div>
                    <div className="text-xl font-black text-slate-900">₹{trip.fare}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">Driver Cash to Collect</div>
                    <div className="text-lg font-black text-emerald-600">
                      ₹{trip.cash_to_collect || trip.fare}
                    </div>
                  </div>
                </div>

                {/* Breakdown Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                    trip.toll_included === 'INCLUDED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    Toll: {trip.toll_included || 'INCLUDED'}
                  </span>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                    trip.permit_included === 'INCLUDED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    Permit: {trip.permit_included || 'EXCLUDED'}
                  </span>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                    trip.batta_included === 'INCLUDED'
                      ? 'bg-blue-50 text-[#0043DC] border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    Batta: {trip.batta_included || 'INCLUDED'}
                  </span>

                  {trip.hill_charges_applicable === 'APPLICABLE' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      ⛰️ Hill Route
                    </span>
                  )}
                </div>

                {/* Distance & Extra Km Rule */}
                <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
                  <span>Est: <strong>{trip.distance}</strong></span>
                  <span>Limit: <strong>{trip.allowed_km || 50} km</strong></span>
                  <span className="text-[#0043DC] font-bold">Extra: ₹{trip.extra_km_rate || 14}/km</span>
                </div>

                {/* Route */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                    <span className="text-slate-700 font-medium line-clamp-1">{trip.pickup_location}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                    <span className="text-slate-700 font-medium line-clamp-1">{trip.drop_location}</span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-900">{trip.customer_name}</span>
                  <span className="text-slate-500 font-mono">{trip.customer_phone}</span>
                </div>

                {/* Driver Info / Request Card */}
                <div className="text-xs">
                  {trip.status === 'REQUESTED' || (trip.trip_requests && trip.trip_requests.some((r) => r.status === 'PENDING')) ? (
                    (() => {
                      const req = (trip.trip_requests || []).find((r) => r.status === 'PENDING') || trip.trip_requests?.[0];
                      const reqDriver = req?.driver || (req?.driver_id ? drivers.find((d) => d.id === req.driver_id) : null);
                      const reqDriverId = req?.driver_id || reqDriver?.id || '';

                      return (
                        <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                                🚕 Driver Requested Trip
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                              Pending Approval
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs">
                                {reqDriver?.name || 'Driver ' + reqDriverId.substring(0, 8)}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {reqDriver?.mobile || 'Phone on file'}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => reqDriverId && handleApproveRequest(trip.id, reqDriverId)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectRequest(trip.id, reqDriverId)}
                                disabled={isProcessing}
                                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : trip.assigned_driver_id ? (
                    <div
                      onClick={() => onViewDriverDetails?.(trip.assigned_driver_id!)}
                      className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 hover:bg-emerald-100/70 hover:border-emerald-300 transition cursor-pointer"
                      title="Click to view full driver details"
                    >
                      <UserCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                      <span className="font-bold truncate flex-1">
                        Assigned: {trip.driver?.name || 'Driver ' + trip.assigned_driver_id.substring(0, 8)}
                      </span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded font-bold text-emerald-700 border border-emerald-200">
                        View Profile →
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-[#0043DC] bg-blue-50 p-2 rounded-xl border border-blue-200">
                      <Send className="w-4 h-4 flex-shrink-0" />
                      <span className="font-bold">Broadcast to All Online Drivers</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* View Details Button */}
                <button
                  onClick={() => setSelectedTripForDetails(trip)}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-200"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Details</span>
                </button>

                {/* Approve Driver Request (if requested) */}
                {trip.status === 'REQUESTED' && (
                  <button
                    onClick={() => {
                      const req = (trip.trip_requests || []).find((r) => r.status === 'PENDING') || trip.trip_requests?.[0];
                      const reqDriverId = req?.driver_id || '';
                      if (reqDriverId) {
                        handleApproveRequest(trip.id, reqDriverId);
                      } else {
                        setSelectedTripForAssign(trip);
                        setSelectedDriverId('');
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Assign</span>
                  </button>
                )}

                {/* Assign Driver (if unassigned & available) */}
                {!trip.assigned_driver_id && trip.status === 'AVAILABLE' && (
                  <button
                    onClick={() => {
                      setSelectedTripForAssign(trip);
                      setSelectedDriverId('');
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-sm text-center"
                  >
                    Assign
                  </button>
                )}

                {/* Cancel Button (if active) */}
                {trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setTripToCancel(trip)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200"
                  >
                    Cancel
                  </button>
                )}

                {/* Mark Completed (if started) */}
                {trip.status === 'STARTED' && (
                  <button
                    onClick={() => onUpdateTripStatus(trip.id, 'COMPLETED')}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm text-center"
                  >
                    Mark Done
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => setTripToDelete(trip)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-slate-200 hover:border-rose-200"
                  title="Delete Trip Record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. TRIP FULL DETAILS MODAL (Inside of the page)
      ───────────────────────────────────────────────────────────── */}
      {selectedTripForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-lg font-black tracking-wider text-white">
                    {selectedTripForDetails.trip_number}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold text-slate-200">
                    {selectedTripForDetails.vehicle_type}
                  </span>
                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${getStatusBadge(selectedTripForDetails.status)}`}>
                    {selectedTripForDetails.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Created {new Date(selectedTripForDetails.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {/* Delete in modal header */}
                <button
                  onClick={() => setTripToDelete(selectedTripForDetails)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                  title="Delete Trip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {/* Close Button */}
                <button
                  onClick={() => setSelectedTripForDetails(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Customer & OTP Authentication Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Details Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
                    <User className="w-3.5 h-3.5 text-[#0043DC]" />
                    <span>Customer Information</span>
                  </div>
                  <div className="font-black text-slate-900 text-base">{selectedTripForDetails.customer_name}</div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`tel:${selectedTripForDetails.customer_phone}`}
                      className="text-xs font-mono font-bold text-[#0043DC] hover:underline flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{selectedTripForDetails.customer_phone}</span>
                    </a>
                    <button
                      onClick={() => copyToClipboard(selectedTripForDetails.customer_phone, 'phone')}
                      className="p-1 rounded text-slate-400 hover:text-slate-600"
                      title="Copy Phone"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Type: <span className="font-bold text-slate-700">{selectedTripForDetails.trip_type || 'One-way'}</span>
                  </div>
                </div>

                {/* Ride Security OTP Card */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-amber-800 tracking-wider">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ride Start OTP</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">
                      Security Code
                    </span>
                  </div>
                  <div className="my-2 flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-amber-950 tracking-widest">
                      {selectedTripForDetails.otp || '4821'}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedTripForDetails.otp || '4821', 'otp')}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition shadow-2xs"
                    >
                      {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-tight">
                    Driver must enter this 4-digit code in the mobile app to verify passenger and start trip.
                  </p>
                </div>
              </div>

              {/* Journey & Navigation Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 tracking-wider">
                  <div className="flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#0043DC]" />
                    <span>Route & Navigation</span>
                  </div>
                  <span className="text-slate-600 font-bold font-mono">Distance: {selectedTripForDetails.distance}</span>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Pickup */}
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 flex-shrink-0 ring-4 ring-emerald-100" />
                    <div className="flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Pickup Location</div>
                      <div className="text-xs font-semibold text-slate-800">{selectedTripForDetails.pickup_location}</div>
                      {selectedTripForDetails.pickup_latitude && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          GPS: {selectedTripForDetails.pickup_latitude.toFixed(4)}, {selectedTripForDetails.pickup_longitude?.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drop */}
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 flex-shrink-0 ring-4 ring-rose-100" />
                    <div className="flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Drop-off Location</div>
                      <div className="text-xs font-semibold text-slate-800">{selectedTripForDetails.drop_location}</div>
                      {selectedTripForDetails.drop_latitude && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          GPS: {selectedTripForDetails.drop_latitude.toFixed(4)}, {selectedTripForDetails.drop_longitude?.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Google Maps link */}
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(selectedTripForDetails.pickup_location)}&destination=${encodeURIComponent(selectedTripForDetails.drop_location)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-bold text-[#0043DC] hover:underline"
                  >
                    <span>Open Route in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Pricing & Commercial Rules */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase text-slate-400 tracking-wider">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fare & Commercial Breakdown</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Fare</div>
                    <div className="text-lg font-black text-slate-900">₹{selectedTripForDetails.fare}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-emerald-600">Cash to Collect</div>
                    <div className="text-lg font-black text-emerald-600">₹{selectedTripForDetails.cash_to_collect || selectedTripForDetails.fare}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Payment Mode</div>
                    <div className="text-xs font-black text-slate-800 uppercase mt-1">{selectedTripForDetails.payment_method || 'Cash'}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Extra Km Rate</div>
                    <div className="text-xs font-black text-[#0043DC] mt-1">₹{selectedTripForDetails.extra_km_rate || 14}/km (over {selectedTripForDetails.allowed_km || 50}km)</div>
                  </div>
                </div>

                {/* Specific Breakdown Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                  <div className={`p-2 rounded-xl border text-xs font-bold ${
                    selectedTripForDetails.toll_included === 'INCLUDED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    Toll: {selectedTripForDetails.toll_included || 'INCLUDED'}
                  </div>
                  <div className={`p-2 rounded-xl border text-xs font-bold ${
                    selectedTripForDetails.permit_included === 'INCLUDED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    Permit: {selectedTripForDetails.permit_included || 'EXCLUDED'}
                  </div>
                  <div className={`p-2 rounded-xl border text-xs font-bold ${
                    selectedTripForDetails.batta_included === 'INCLUDED'
                      ? 'bg-blue-50 text-[#0043DC] border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    Batta: {selectedTripForDetails.batta_included || 'INCLUDED'}
                  </div>
                  <div className={`p-2 rounded-xl border text-xs font-bold ${
                    selectedTripForDetails.hill_charges_applicable === 'APPLICABLE'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {selectedTripForDetails.hill_charges_applicable === 'APPLICABLE' ? '⛰️ Hill Charge' : 'No Hill Charge'}
                  </div>
                </div>
              </div>

              {/* Driver & Assignment Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 tracking-wider">
                  <div className="flex items-center space-x-1.5">
                    <Car className="w-3.5 h-3.5 text-[#0043DC]" />
                    <span>Assigned Fleet Driver</span>
                  </div>
                </div>

                {selectedTripForDetails.assigned_driver_id ? (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                        {selectedTripForDetails.driver?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {selectedTripForDetails.driver?.name || 'Driver ' + selectedTripForDetails.assigned_driver_id.substring(0, 8)}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {selectedTripForDetails.driver?.mobile || 'No phone registered'}
                        </div>
                        {selectedTripForDetails.driver?.vehicle?.vehicle_number && (
                          <div className="text-[11px] text-slate-600 font-medium">
                            {selectedTripForDetails.driver.vehicle.vehicle_model} • {selectedTripForDetails.driver.vehicle.vehicle_number}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          onViewDriverDetails?.(selectedTripForDetails.assigned_driver_id!);
                          setSelectedTripForDetails(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition border border-emerald-200"
                      >
                        View Driver Profile →
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTripForAssign(selectedTripForDetails);
                          setSelectedDriverId('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Send className="w-5 h-5 text-[#0043DC] animate-pulse" />
                      <div>
                        <div className="text-xs font-bold text-[#0043DC]">Unassigned (Broadcasting to All Drivers)</div>
                        <div className="text-[11px] text-slate-500">Trip is published and visible to all online drivers.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTripForAssign(selectedTripForDetails);
                        setSelectedDriverId('');
                      }}
                      className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white text-xs font-bold transition shadow-sm"
                    >
                      Assign Driver Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                {/* Delete button */}
                <button
                  onClick={() => setTripToDelete(selectedTripForDetails)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Trip</span>
                </button>

                {/* Cancel Trip (if active) */}
                {selectedTripForDetails.status !== 'COMPLETED' && selectedTripForDetails.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setTripToCancel(selectedTripForDetails)}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition border border-amber-200"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Trip</span>
                  </button>
                )}

                {/* Mark Completed (if started) */}
                {selectedTripForDetails.status === 'STARTED' && (
                  <button
                    onClick={async () => {
                      await onUpdateTripStatus(selectedTripForDetails.id, 'COMPLETED');
                      setSelectedTripForDetails({ ...selectedTripForDetails, status: 'COMPLETED' });
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Completed</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedTripForDetails(null)}
                className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition border border-slate-300 shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Delete Trip {tripToDelete.trip_number}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently delete this trip record from the database. This action cannot be reversed.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{tripToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fare:</span>
                <span className="font-bold text-slate-800">₹{tripToDelete.fare}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-rose-600">{tripToDelete.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setTripToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Keep Trip
              </button>
              <button
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {isProcessing ? 'Deleting...' : 'Yes, Delete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. CANCEL CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {tripToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Cancel Trip {tripToCancel.trip_number}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to cancel this trip? The driver and customer will be notified of this cancellation.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{tripToCancel.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">{tripToCancel.pickup_location} → {tripToCancel.drop_location}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                disabled={isProcessing}
                onClick={() => setTripToCancel(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                No, Go Back
              </button>
              <button
                disabled={isProcessing}
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {isProcessing ? 'Cancelling...' : 'Yes, Cancel Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. DRIVER ASSIGNMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      {selectedTripForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Assign Driver to Trip {selectedTripForAssign.trip_number}
            </h3>
            <p className="text-xs text-slate-500">
              Select an active driver to assign this trip directly.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Select Online Driver
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="">-- Choose a Driver --</option>
                {onlineDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.mobile}) • Online
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedTripForAssign(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!selectedDriverId || isProcessing}
                onClick={handleConfirmAssign}
                className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isProcessing ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
