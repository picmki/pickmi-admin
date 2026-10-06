import React, { useState } from 'react';
import {
  Navigation,
  Car,
  Calendar,
  Clock,
  User,
  Phone,
  IndianRupee,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  Sliders,
  Radio
} from 'lucide-react';
import type { Driver, VehicleType, TripType } from '../types';

interface CreateTripPageProps {
  drivers: Driver[];
  onSubmit: (payload: any) => Promise<void>;
  onNavigateToTrips: () => void;
}

const PRESET_LOCATIONS = [
  { name: 'Kempegowda International Airport (BLR), Terminal 2', lat: 13.1989, lng: 77.7068 },
  { name: 'Koramangala 5th Block, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar 100ft Road Metro Station', lat: 12.9784, lng: 77.6408 },
  { name: 'Electronic City Phase 1, Wipro Gate', lat: 12.8452, lng: 77.6602 },
  { name: 'Whitefield ITPL Main Road', lat: 12.9866, lng: 77.7335 },
  { name: 'MG Road Trinity Circle, Bengaluru', lat: 12.9738, lng: 77.6192 },
  { name: 'Mysuru Suburban Bus Stand', lat: 12.3052, lng: 76.6552 },
];

export const CreateTripPage: React.FC<CreateTripPageProps> = ({
  drivers,
  onSubmit,
  onNavigateToTrips,
}) => {
  // Passenger
  const [customerName, setCustomerName] = useState('Rahul Nair');
  const [customerPhone, setCustomerPhone] = useState('+91 98450 67890');

  // Route
  const [pickupLocation, setPickupLocation] = useState(PRESET_LOCATIONS[1].name);
  const [pickupLat, setPickupLat] = useState(PRESET_LOCATIONS[1].lat);
  const [pickupLng, setPickupLng] = useState(PRESET_LOCATIONS[1].lng);

  const [dropLocation, setDropLocation] = useState(PRESET_LOCATIONS[0].name);
  const [dropLat, setDropLat] = useState(PRESET_LOCATIONS[0].lat);
  const [dropLng, setDropLng] = useState(PRESET_LOCATIONS[0].lng);

  // Timing
  const [pickupDate, setPickupDate] = useState('Today');
  const [pickupTime, setPickupTime] = useState('Now');
  const [tripType, setTripType] = useState<TripType>('One-way');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');

  // Pricing & Distance
  const [fare, setFare] = useState<number>(1250);
  const [distance, setDistance] = useState('38.5 km');
  const [allowedKm, setAllowedKm] = useState<number>(45);
  const [extraKmRate, setExtraKmRate] = useState<number>(14);

  // Fee Inclusions / Exclusions Breakdown (User Audio Requirements)
  const [tollIncluded, setTollIncluded] = useState<'INCLUDED' | 'EXCLUDED'>('INCLUDED');
  const [permitIncluded, setPermitIncluded] = useState<'INCLUDED' | 'EXCLUDED'>('EXCLUDED');
  const [battaIncluded, setBattaIncluded] = useState<'INCLUDED' | 'EXCLUDED'>('INCLUDED');
  const [hillChargesApplicable, setHillChargesApplicable] = useState<'APPLICABLE' | 'NOT_APPLICABLE'>('NOT_APPLICABLE');

  // Cash Collection
  const [cashToCollect, setCashToCollect] = useState<number>(1250);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [assignedDriverId, setAssignedDriverId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePickupPreset = (preset: (typeof PRESET_LOCATIONS)[0]) => {
    setPickupLocation(preset.name);
    setPickupLat(preset.lat);
    setPickupLng(preset.lng);
  };

  const handleDropPreset = (preset: (typeof PRESET_LOCATIONS)[0]) => {
    setDropLocation(preset.name);
    setDropLat(preset.lat);
    setDropLng(preset.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payloadName = (customerName || "").trim() || "Guest Rider";
    const payloadPhone = (customerPhone || "").trim() || "+91 00000 00000";
    const payloadPickup = (pickupLocation || "").trim() || "Pickup Location";
    const payloadDrop = (dropLocation || "").trim() || "Drop Location";
    try {
      if (assignedDriverId) {
        const targetDriver = drivers.find((d) => d.id === assignedDriverId);
        if (targetDriver && targetDriver.status !== "active") {
          alert("Cannot dispatch trip: Selected driver has unverified documents. Please verify driver documents first.");
          setIsSubmitting(false);
          return;
        }
      }

      await onSubmit({
        customer_name: payloadName,
        customer_phone: payloadPhone,
        pickup_location: payloadPickup,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        drop_location: payloadDrop,
        drop_latitude: dropLat,
        drop_longitude: dropLng,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        fare,
        distance,
        vehicle_type: vehicleType,
        trip_type: tripType,
        payment_method: paymentMethod,
        assigned_driver_id: assignedDriverId || null,
        toll_included: tollIncluded,
        permit_included: permitIncluded,
        batta_included: battaIncluded,
        hill_charges_applicable: hillChargesApplicable,
        cash_to_collect: cashToCollect,
        allowed_km: allowedKm,
        extra_km_rate: extraKmRate,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onNavigateToTrips();
      }, 1200);
    } catch (err: any) {
      alert('Failed to dispatch trip: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-[#0043DC]/10 border border-[#0043DC]/20 text-[#0043DC] flex items-center justify-center font-bold">
            <Navigation className="w-6 h-6 text-[#0043DC]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create & Dispatch Trip</h1>
            <p className="text-sm text-slate-500">
              Configure passenger booking, pricing breakdown, extra km rules & live driver dispatch
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToTrips}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-[#0043DC] px-4 py-2 rounded-xl border border-slate-200 hover:border-[#0043DC]/30 bg-white transition"
        >
          <span>View All Trips</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm font-medium">
            <strong>Trip Dispatched Successfully!</strong> Remote Push Notification sent to drivers' phones. Navigating to trips list...
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Passenger Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-[#0043DC]" />
            <h2 className="text-base font-bold text-slate-900">1. Customer Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Customer Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Nair"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98450 XXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Route & Locations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">2. Route & Location Details</h2>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">Popular Route Presets:</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LOCATIONS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleDropPreset(preset)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0043DC]/10 hover:text-[#0043DC] text-slate-700 border border-slate-200 transition"
                >
                  {preset.name.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Pickup Address *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                 
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Enter pickup address or landmark"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Drop Destination *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-rose-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                 
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  placeholder="Enter drop location or landmark"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-transparent transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Schedule, Vehicle & Trip Type */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Car className="w-5 h-5 text-[#0043DC]" />
            <h2 className="text-base font-bold text-slate-900">3. Vehicle Category & Schedule</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Vehicle Category
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
              >
                <option value="Sedan">Sedan (Dzire / Etios)</option>
                <option value="SUV">SUV (Innova / Ertiga)</option>
                <option value="Hatchback">Hatchback (WagonR / Tiago)</option>
                <option value="Prime Sedan">Prime Sedan (City / Ciaz)</option>
                <option value="EV">EV Green (Tigor / ZS EV)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Trip Type
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value as TripType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] font-medium"
              >
                <option value="One-way">One-way Drop</option>
                <option value="Round-trip">Round-trip Journey</option>
                <option value="Airport Transfer">Airport Transfer</option>
                <option value="Outstation">Outstation Package</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Pickup Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  placeholder="Today / DD-MM-YYYY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Pickup Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="Now / 04:30 PM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Specific Inclusions / Exclusions (Audio Requirement) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">4. Fee Inclusions & Rules Breakdown</h2>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
              Reflected on Driver Mobile App
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Toll */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Toll Plaza
              </label>
              <select
                value={tollIncluded}
                onChange={(e) => setTollIncluded(e.target.value as 'INCLUDED' | 'EXCLUDED')}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="INCLUDED">✅ Included in Fare</option>
                <option value="EXCLUDED">❌ Excluded (Customer Pays)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                {tollIncluded === 'INCLUDED' ? 'Driver will not charge extra toll' : 'Driver collects toll slip amount'}
              </p>
            </div>

            {/* Permit */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                State / RTO Permit
              </label>
              <select
                value={permitIncluded}
                onChange={(e) => setPermitIncluded(e.target.value as 'INCLUDED' | 'EXCLUDED')}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="INCLUDED">✅ Included in Fare</option>
                <option value="EXCLUDED">❌ Excluded (Extra by Customer)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                {permitIncluded === 'INCLUDED' ? 'Border tax included in bill' : 'Interstate border tax paid by rider'}
              </p>
            </div>

            {/* Driver Batta */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Driver Batta / Food
              </label>
              <select
                value={battaIncluded}
                onChange={(e) => setBattaIncluded(e.target.value as 'INCLUDED' | 'EXCLUDED')}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="INCLUDED">✅ Included in Fare</option>
                <option value="EXCLUDED">❌ Excluded (Paid to Driver)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Daily driver allowance coverage
              </p>
            </div>

            {/* Hill Charges */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Hill / Ghat Road Fee
              </label>
              <select
                value={hillChargesApplicable}
                onChange={(e) => setHillChargesApplicable(e.target.value as 'APPLICABLE' | 'NOT_APPLICABLE')}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="NOT_APPLICABLE">⚪ Not Applicable (Plains)</option>
                <option value="APPLICABLE">⛰️ Applicable (Ghat Section)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Ooty / Kodaikanal / Coorg routes
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Pricing, Distance & Extra Km Formula (Audio 2 Requirement) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">5. Fare, Distance & Extra KM Formula</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Base Fare (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                 
                  min={1}
                  value={fare}
                  onChange={(e) => {
                    const f = Number(e.target.value);
                    setFare(f);
                    setCashToCollect(f);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            {/* ALLOWED KM LIMIT */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Allowed KM Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={allowedKm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAllowedKm(val);
                    setDistance(`${val} km`);
                  }}
                  placeholder="45"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-12 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">KM</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Extra KM Rate (₹/KM)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min={1}
                  value={extraKmRate}
                  onChange={(e) => setExtraKmRate(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">/km</span>
              </div>
            </div>
          </div>

          {/* Audio 2 Formula Illustration Card */}
          <div className="bg-[#0043DC]/5 border border-[#0043DC]/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div>
              <strong className="text-[#0043DC]">💡 Extra Distance Rule:</strong> Base trip includes up to <strong>{allowedKm} KM</strong>. Any distance beyond {allowedKm} KM will be charged at <strong>₹{extraKmRate}/KM</strong> and automatically added to driver's cash collection bill!
            </div>
            <div className="flex-shrink-0 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[#0043DC] font-bold">
              Formula: Extra KM × ₹{extraKmRate}
            </div>
          </div>
        </div>

        {/* Section 6: Cash Collection from Customer & Driver Assignment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Radio className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">6. Driver Cash Settlement & Assignment</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Cash to Collect */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-800">
                💰 Cash to Collect from Customer *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-emerald-600 font-bold">₹</span>
                <input
                  type="number"
                 
                  min={0}
                  value={cashToCollect}
                  onChange={(e) => setCashToCollect(Number(e.target.value))}
                  className="w-full bg-white border border-emerald-300 rounded-xl pl-8 pr-4 py-2 text-base font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-emerald-700">Exact cash amount driver must receive from rider</p>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="Cash">Cash to Driver</option>
                <option value="Online">Online / Pre-paid</option>
                <option value="UPI">UPI Direct</option>
              </select>
            </div>

            {/* Driver Assignment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Assign Specific Driver (Optional)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Only verified drivers can take trips</span>
              </div>
              <select
                value={assignedDriverId}
                onChange={(e) => {
                  const sId = e.target.value;
                  const found = drivers.find((d) => d.id === sId);
                  if (found && found.status !== "active") {
                    alert(`⚠️ Cannot Assign ${found.name}: Documents & vehicle details are pending verification. You can only assign trips to drivers verified by Admin.`);
                    return;
                  }
                  setAssignedDriverId(sId);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="">⚡ Broadcast to ALL Online Verified Drivers</option>
                {drivers.map((d) => {
                  const isVerified = d.status === "active";
                  return (
                    <option key={d.id} value={d.id} disabled={!isVerified}>
                      {d.name} ({d.mobile}) • {isVerified ? "✅ Verified" : "⚠️ Docs Pending (Locked)"} • {d.online_status}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Submit & Dispatch Button */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onNavigateToTrips}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-black text-sm tracking-wide shadow-lg shadow-[#0043DC]/25 active:scale-95 transition disabled:opacity-50"
          >
            <Navigation className="w-4 h-4" />
            <span>{isSubmitting ? 'DISPATCHING TO FLEET...' : 'DISPATCH TRIP & SEND PUSH NOTIFICATION'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
