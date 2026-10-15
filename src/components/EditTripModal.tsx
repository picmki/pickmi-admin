import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Car,
  Calendar,
  Clock,
  IndianRupee,
  Shield,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Tag,
  Gauge
} from 'lucide-react';
import type { Trip, TripStatus, VehicleType, TripType } from '../types';

interface EditTripModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripId: string, updates: Partial<Trip>) => Promise<void>;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  trip,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !trip) return null;

  // Determine initial pricing mode
  const initialMode: 'FIXED' | 'KMS' =
    trip.pricing_type === 'KMS' || Number(trip.allowed_km) === 0 ? 'KMS' : 'FIXED';

  const [pricingType, setPricingType] = useState<'FIXED' | 'KMS'>(initialMode);

  // Customer Information
  const [customerName, setCustomerName] = useState(trip.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(trip.customer_phone || '');

  // Route Details
  const [pickupLocation, setPickupLocation] = useState(trip.pickup_location || '');
  const [dropLocation, setDropLocation] = useState(trip.drop_location || '');
  const [distance, setDistance] = useState(trip.distance || '38.5 km');

  // Schedule & Vehicle
  const [pickupDate, setPickupDate] = useState(trip.pickup_date || 'Today');
  const [pickupTime, setPickupTime] = useState(trip.pickup_time || 'Now');
  const [vehicleType, setVehicleType] = useState<VehicleType>(trip.vehicle_type || 'Sedan');
  const [tripType, setTripType] = useState<TripType>(trip.trip_type || 'One-way');
  const [status, setStatus] = useState<TripStatus>(trip.status || 'AVAILABLE');

  // Fixed Pricing
  const [fare, setFare] = useState<number>(trip.fare || 1200);
  const [allowedKm, setAllowedKm] = useState<number>(trip.allowed_km || 45);
  const [extraKmRate, setExtraKmRate] = useState<number>(trip.extra_km_rate || 14);

  // KMS Pricing
  const [ratePerKm, setRatePerKm] = useState<number>(trip.rate_per_km || trip.extra_km_rate || 16);
  const [kmsAllowedKm, setKmsAllowedKm] = useState<string>(
    trip.allowed_km && Number(trip.allowed_km) > 0 ? String(trip.allowed_km) : ''
  );
  const [estKm, setEstKm] = useState<number>(() => {
    const num = parseFloat(trip.distance || '38.5');
    return isNaN(num) ? 38.5 : num;
  });

  // Commission & Inclusions
  const [commissionRate, setCommissionRate] = useState<number>(trip.commission_rate ?? 10);
  const [tollIncluded, setTollIncluded] = useState<'INCLUDED' | 'EXCLUDED'>(trip.toll_included || 'INCLUDED');
  const [permitIncluded, setPermitIncluded] = useState<'INCLUDED' | 'EXCLUDED'>(trip.permit_included || 'EXCLUDED');
  const [battaIncluded, setBattaIncluded] = useState<'INCLUDED' | 'EXCLUDED'>(trip.batta_included || 'INCLUDED');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever selected trip changes
  useEffect(() => {
    if (trip) {
      const mode = trip.pricing_type === 'KMS' || Number(trip.allowed_km) === 0 ? 'KMS' : 'FIXED';
      setPricingType(mode);
      setCustomerName(trip.customer_name || '');
      setCustomerPhone(trip.customer_phone || '');
      setPickupLocation(trip.pickup_location || '');
      setDropLocation(trip.drop_location || '');
      setDistance(trip.distance || '38.5 km');
      setPickupDate(trip.pickup_date || 'Today');
      setPickupTime(trip.pickup_time || 'Now');
      setVehicleType(trip.vehicle_type || 'Sedan');
      setTripType(trip.trip_type || 'One-way');
      setStatus(trip.status || 'AVAILABLE');
      setFare(trip.fare || 1200);
      setAllowedKm(trip.allowed_km || 45);
      setExtraKmRate(trip.extra_km_rate || 14);
      setRatePerKm(trip.rate_per_km || trip.extra_km_rate || 16);
      setKmsAllowedKm(trip.allowed_km && Number(trip.allowed_km) > 0 ? String(trip.allowed_km) : '');
      const num = parseFloat(trip.distance || '38.5');
      setEstKm(isNaN(num) ? 38.5 : num);
      setCommissionRate(trip.commission_rate ?? 10);
      setTollIncluded(trip.toll_included || 'INCLUDED');
      setPermitIncluded(trip.permit_included || 'EXCLUDED');
      setBattaIncluded(trip.batta_included || 'INCLUDED');
      setErrorMsg(null);
    }
  }, [trip]);

  // Live Calculations
  const kmsEstTotal = Math.round(estKm * ratePerKm);
  const displayFare = pricingType === 'FIXED' ? fare : kmsEstTotal;
  const commissionAmount = Math.round((displayFare * commissionRate) / 100);
  const driverNet = Math.max(0, displayFare - commissionAmount);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const finalFare = pricingType === 'FIXED' ? fare : kmsEstTotal;
      const finalDistance = pricingType === 'FIXED' ? distance : `${estKm} km`;
      const finalAllowedKm = pricingType === 'FIXED'
        ? allowedKm
        : (kmsAllowedKm && Number(kmsAllowedKm) > 0 ? Number(kmsAllowedKm) : 0);
      const finalExtraKmRate = pricingType === 'FIXED' ? extraKmRate : ratePerKm;

      const updates: Partial<Trip> = {
        customer_name: customerName.trim() || 'Customer',
        customer_phone: customerPhone.trim() || '+91 00000 00000',
        pickup_location: pickupLocation.trim() || 'Pickup Location',
        drop_location: dropLocation.trim() || 'Drop Location',
        distance: finalDistance,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        vehicle_type: vehicleType,
        trip_type: tripType,
        status: status,
        fare: finalFare,
        cash_to_collect: finalFare,
        allowed_km: finalAllowedKm,
        extra_km_rate: finalExtraKmRate,
        rate_per_km: pricingType === 'KMS' ? ratePerKm : undefined,
        pricing_type: pricingType,
        commission_rate: commissionRate,
        toll_included: tollIncluded,
        permit_included: permitIncluded,
        batta_included: battaIncluded,
      };

      await onSave(trip.id, updates);
      onClose();
    } catch (err: any) {
      console.error('Failed to update trip:', err);
      setErrorMsg(err.message || 'Failed to update trip');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-lg font-black tracking-wider text-white">
                Edit Trip {trip.trip_number}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold text-slate-200">
                {trip.vehicle_type}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0043DC]/30 border border-[#0043DC]/50 font-bold text-blue-200">
                {trip.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Update route, schedule, fare model, and trip inclusions.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form noValidate onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pricing Model Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Trip Pricing Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPricingType('FIXED')}
                className={`p-3.5 rounded-xl border text-left transition flex items-center space-x-3 ${
                  pricingType === 'FIXED'
                    ? 'border-[#0043DC] bg-[#0043DC]/5 ring-2 ring-[#0043DC]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  pricingType === 'FIXED' ? 'bg-[#0043DC] text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Fixed Trip</div>
                  <div className="text-xs text-slate-500 font-medium">Package fare + Extra KM rate</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPricingType('KMS')}
                className={`p-3.5 rounded-xl border text-left transition flex items-center space-x-3 ${
                  pricingType === 'KMS'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  pricingType === 'KMS' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">KMs Trip</div>
                  <div className="text-xs text-slate-500 font-medium">Direct distance rate per KM</div>
                </div>
              </button>
            </div>
          </div>

          {/* Route Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Route & Locations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pickup Address</label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Drop Destination</label>
                <input
                  type="text"
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>
          </div>

          {/* Schedule & Vehicle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <Car className="w-4 h-4 text-[#0043DC]" />
              <span>Vehicle, Schedule & Status</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Vehicle Category</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                >
                  <option value="Sedan">Sedan (Dzire / Etios)</option>
                  <option value="SUV">SUV (Innova / Ertiga)</option>
                  <option value="Hatchback">Hatchback (WagonR / Tiago)</option>
                  <option value="Prime Sedan">Prime Sedan (City / Ciaz)</option>
                  <option value="EV">EV Green (Tigor / ZS EV)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Trip Type</label>
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as TripType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                >
                  <option value="One-way">One-way Drop</option>
                  <option value="Round-trip">Round-trip Journey</option>
                  <option value="Airport Transfer">Airport Transfer</option>
                  <option value="Outstation">Outstation Package</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pickup Date</label>
                <input
                  type="text"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  placeholder="Today or YYYY-MM-DD"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pickup Time</label>
                <input
                  type="text"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="Now or HH:MM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                />
              </div>
            </div>

            {/* Status change option */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-600 mb-1">Trip Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TripStatus)}
                className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-bold"
              >
                <option value="AVAILABLE">AVAILABLE (Broadcasting)</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="ON_THE_WAY">ON_THE_WAY</option>
                <option value="ARRIVED">ARRIVED</option>
                <option value="STARTED">STARTED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Pricing Fields */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <span>Pricing Breakdown ({pricingType === 'FIXED' ? 'Fixed Trip' : 'KMs Trip'})</span>
            </div>

            {pricingType === 'FIXED' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Base Fare (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fare}
                      onChange={(e) => setFare(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Allowed KM Limit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={allowedKm}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAllowedKm(val);
                        setDistance(`${val} km`);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">KM</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Extra KM Rate (₹/KM)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={extraKmRate}
                      onChange={(e) => setExtraKmRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-10 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">/km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Commission (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Rate Per KM (₹/KM)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-[#0043DC] font-black">₹</span>
                    <input
                      type="number"
                      value={ratePerKm}
                      onChange={(e) => setRatePerKm(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-10 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">/km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Allowed KM (Coverage)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={kmsAllowedKm}
                      onChange={(e) => setKmsAllowedKm(e.target.value)}
                      placeholder="Blank = No limit"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">KM</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Est. Distance (KM)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={estKm}
                      onChange={(e) => setEstKm(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">KM</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Commission (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Financial Summary Pill */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 font-medium">
                {pricingType === 'FIXED' ? (
                  <span>Package includes <strong>{allowedKm} KM</strong> • Extra @ <strong>₹{extraKmRate}/km</strong></span>
                ) : (
                  <span>
                    Billed @ <strong>₹{ratePerKm}/km</strong>
                    {kmsAllowedKm && Number(kmsAllowedKm) > 0 ? ` • Coverage ${kmsAllowedKm} KM` : ' • Unlimited'}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 font-bold">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
                  Fare: ₹{displayFare}
                </span>
                <span className="bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-900">
                  Comm ({commissionRate}%): ₹{commissionAmount}
                </span>
                <span className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-900">
                  Driver Net: ₹{driverNet}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Inclusions */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <Shield className="w-4 h-4 text-[#0043DC]" />
              <span>Inclusions & Surcharges</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Toll Charges</label>
                <select
                  value={tollIncluded}
                  onChange={(e) => setTollIncluded(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                >
                  <option value="INCLUDED">Included in Total Fare</option>
                  <option value="EXCLUDED">Excluded (Extra on actuals)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">State / RTO Permit</label>
                <select
                  value={permitIncluded}
                  onChange={(e) => setPermitIncluded(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                >
                  <option value="INCLUDED">Included in Total Fare</option>
                  <option value="EXCLUDED">Excluded (Customer Pay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Driver Bata / Allowance</label>
                <select
                  value={battaIncluded}
                  onChange={(e) => setBattaIncluded(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
                >
                  <option value="INCLUDED">Included</option>
                  <option value="EXCLUDED">Excluded</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 tracking-wider">
              <User className="w-4 h-4 text-slate-600" />
              <span>Customer Information</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white text-xs font-bold transition shadow-md flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving Changes...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
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
