import React, { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Car,
  Calendar,
  Clock,
  IndianRupee,
  Mic,
  User,
  Phone,
  AlertCircle,
  FileText,
  Navigation,
  Sparkles,
  Check
} from "lucide-react";
import type { PartnerTrip, TripStatus, VehicleType, TripType, Partner } from "../types";

interface EditPartnerTripModalProps {
  trip: PartnerTrip | null;
  isOpen: boolean;
  partners?: Partner[];
  onClose: () => void;
  onSave: (tripId: string, updates: Partial<PartnerTrip>) => Promise<void>;
}

export const EditPartnerTripModal: React.FC<EditPartnerTripModalProps> = ({
  trip,
  isOpen,
  partners = [],
  onClose,
  onSave,
}) => {
  if (!isOpen || !trip) return null;

  const isVoiceTrip = trip.created_method === "voice" || Boolean(trip.is_voice_trip) || Boolean(trip.audio_url);

  const [customerName, setCustomerName] = useState(trip.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(trip.customer_phone || "");
  const [pickupLocation, setPickupLocation] = useState(trip.pickup_location || "");
  const [dropLocation, setDropLocation] = useState(trip.drop_location || "");
  const [pickupDate, setPickupDate] = useState(trip.pickup_date || "Today");
  const [pickupTime, setPickupTime] = useState(trip.pickup_time || "Now");
  const [tripType, setTripType] = useState<TripType>(trip.trip_type || "Airport Transfer");
  const [vehicleType, setVehicleType] = useState<VehicleType>(trip.vehicle_type || "Sedan");
  const [fare, setFare] = useState<number>(trip.fare || 1200);
  const [driverPayout, setDriverPayout] = useState<number>(trip.driver_payout || 1000);
  const [commissionAmount, setCommissionAmount] = useState<number>(trip.commission_amount || 200);
  const [status, setStatus] = useState<TripStatus>(trip.status || "AVAILABLE");
  const [partnerId, setPartnerId] = useState<string>(trip.partner_id || "");
  const [partnerName, setPartnerName] = useState<string>(trip.partner_name || "");
  const [notes, setNotes] = useState(trip.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (trip) {
      setCustomerName(trip.customer_name || "");
      setCustomerPhone(trip.customer_phone || "");
      setPickupLocation(trip.pickup_location || "");
      setDropLocation(trip.drop_location || "");
      setPickupDate(trip.pickup_date || "Today");
      setPickupTime(trip.pickup_time || "Now");
      setTripType(trip.trip_type || "Airport Transfer");
      setVehicleType(trip.vehicle_type || "Sedan");
      setFare(trip.fare || 1200);
      setDriverPayout(trip.driver_payout || 1000);
      setCommissionAmount(trip.commission_amount || 200);
      setStatus(trip.status || "AVAILABLE");
      setPartnerId(trip.partner_id || "");
      setPartnerName(trip.partner_name || "");
      setNotes(trip.notes || "");
      setErrorMsg(null);
    }
  }, [trip]);

  // Recalculate commission when fare or payout changes
  const handleFareChange = (newFare: number) => {
    setFare(newFare);
    // default 85% payout / 15% commission if not manually adjusted
    const newComm = Math.max(0, newFare - driverPayout);
    setCommissionAmount(newComm);
  };

  const handlePayoutChange = (newPayout: number) => {
    setDriverPayout(newPayout);
    const newComm = Math.max(0, fare - newPayout);
    setCommissionAmount(newComm);
  };

  const handlePartnerSelect = (selectedId: string) => {
    setPartnerId(selectedId);
    const found = partners.find((p) => p.id === selectedId);
    if (found) {
      setPartnerName(found.name);
      // Recalculate with partner's commission rate
      const comm = Math.round(fare * ((found.commission_rate || 15) / 100));
      setCommissionAmount(comm);
      setDriverPayout(Math.max(0, fare - comm));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLocation.trim() || !dropLocation.trim()) {
      setErrorMsg("Pickup and Drop locations are required.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("Customer name and phone number are required.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onSave(trip.id, {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        pickup_location: pickupLocation.trim(),
        drop_location: dropLocation.trim(),
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        trip_type: tripType,
        vehicle_type: vehicleType,
        fare: Number(fare) || 0,
        driver_payout: Number(driverPayout) || 0,
        commission_amount: Number(commissionAmount) || 0,
        status: status,
        partner_id: partnerId || trip.partner_id,
        partner_name: partnerName || trip.partner_name,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      console.error("Error updating partner trip:", err);
      setErrorMsg(err?.message || "Failed to save trip changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0043DC] flex items-center justify-center font-bold">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-900">Edit Partner Trip</h3>
                <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-slate-100 text-slate-700">
                  {trip.trip_number}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Update route, customer info, commercial settlement, and dispatch status.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Partner Agency Assignment */}
          {partners.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Assigned Fleet Partner / Agency
              </label>
              <select
                value={partnerId}
                onChange={(e) => handlePartnerSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.city}) — {p.commission_rate}% Platform Fee
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Customer Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Customer Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Customer Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>
          </div>

          {/* 3. Route Details */}
          {isVoiceTrip ? (
            <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200/90 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-[#0043DC] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-800 flex items-center space-x-2">
                  <span>Voice Dispatch Trip (Audio Booking)</span>
                  <span className="text-[10px] font-mono bg-blue-100 text-[#0043DC] px-1.5 py-0.5 rounded font-bold">
                    00:${String(trip.audio_duration || 4).padStart(2, "0")}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Pickup and drop details are spoken in the partner audio recording.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pickup Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    type="text"
                    required={!isVoiceTrip}
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="e.g. Kempegowda Intl Airport, T2"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Drop Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                  <input
                    type="text"
                    required={!isVoiceTrip}
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    placeholder="e.g. Indiranagar 100ft Road"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Schedule & Vehicle / Service Type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Pickup Date
              </label>
              <input
                type="text"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                placeholder="Today / YYYY-MM-DD"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Pickup Time
              </label>
              <input
                type="text"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                placeholder="Now / 10:30 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Prime Sedan">Prime Sedan</option>
                <option value="Hatchback">Hatchback</option>
                <option value="EV">EV</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Trip Type
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value as TripType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="Airport Transfer">Airport Transfer</option>
                <option value="One-way">One-way</option>
                <option value="Round-trip">Round-trip</option>
                <option value="Outstation">Outstation</option>
              </select>
            </div>
          </div>

          {/* 5. Commercials & Financial Settlement */}
          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-[#0043DC]" />
                <span>Commercials & Payout Split</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const f = Number(fare) || 1200;
                  const comm = Math.round(f * 0.15);
                  setCommissionAmount(comm);
                  setDriverPayout(f - comm);
                }}
                className="text-[11px] text-[#0043DC] font-bold hover:underline"
              >
                Auto-calc 15% Platform Split
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Customer Fare (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={fare}
                  onChange={(e) => handleFareChange(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-emerald-600 mb-1">
                  Driver Payout (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={driverPayout}
                  onChange={(e) => handlePayoutChange(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-blue-600 mb-1">
                  Commission (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-[#0043DC] focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>
          </div>

          {/* 6. Trip Status & Dispatch Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Trip Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TripStatus)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="PENDING_REVIEW">PENDING_REVIEW (Awaiting Admin Review)</option>
                <option value="AVAILABLE">AVAILABLE (Open for Chauffeurs)</option>
                <option value="ASSIGNED">ASSIGNED (Driver Confirmed)</option>
                <option value="ON_THE_WAY">ON_THE_WAY (Driver Dispatched)</option>
                <option value="ARRIVED">ARRIVED (At Pickup)</option>
                <option value="STARTED">STARTED (In Transit)</option>
                <option value="COMPLETED">COMPLETED (Fulfilled)</option>
                <option value="CANCELLED">CANCELLED (Void)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Special Dispatch Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. VIP guest, flight delayed 20 min"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black transition shadow-md shadow-[#0043DC]/20 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Trip Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
