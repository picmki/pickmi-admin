import React, { useState } from 'react';
import {
  Navigation,
  Car,
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  CheckCircle2,
  Sliders,
  Tag,
  Gauge,
} from 'lucide-react';
import type { Driver, VehicleType, TripType } from '../types';

interface CreateTripPageProps {
  drivers: Driver[];
  onSubmit: (payload: any) => Promise<any>;
  onNavigateToTrips: () => void;
}

export const CreateTripPage: React.FC<CreateTripPageProps> = ({
  drivers: _drivers,
  onSubmit,
  onNavigateToTrips,
}) => {
  // Route
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupLat, setPickupLat] = useState(12.9352);
  const [pickupLng, setPickupLng] = useState(77.6245);

  const [dropLocation, setDropLocation] = useState('');
  const [dropLat, setDropLat] = useState(13.1989);
  const [dropLng, setDropLng] = useState(77.7068);

  // Timing
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [pickupTime, setPickupTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Date & Time helper utilities
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTimeStr = (offsetMinutes = 0) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + offsetMinutes);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDisplayTime = (time24: string) => {
    if (!time24 || time24.toLowerCase() === 'now') return 'Now';
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  const [tripType, setTripType] = useState<TripType>('One-way');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');

  // Pricing Model Type: 'FIXED' or 'KMS'
  const [pricingType, setPricingType] = useState<'FIXED' | 'KMS'>('FIXED');

  // Fixed Trip States
  const [fare, setFare] = useState<number>(1250);
  const [distance, setDistance] = useState('38.5 km');
  const [allowedKm, setAllowedKm] = useState<number>(45);
  const [extraKmRate, setExtraKmRate] = useState<number>(14);

  // KMs Trip States
  const [ratePerKm, setRatePerKm] = useState<number>(16);
  const [estKm, setEstKm] = useState<number>(38.5);
  const [kmsAllowedKm, setKmsAllowedKm] = useState<string>(''); // Optional allowed km coverage

  // Platform Commission (%)
  const [commissionRate, setCommissionRate] = useState<number>(10);

  // Fee Inclusions / Exclusions Breakdown (User Audio Requirements)
  const [tollIncluded, setTollIncluded] = useState<'INCLUDED' | 'EXCLUDED'>('INCLUDED');
  const [permitIncluded, setPermitIncluded] = useState<'INCLUDED' | 'EXCLUDED'>('EXCLUDED');
  const [battaIncluded, setBattaIncluded] = useState<'INCLUDED' | 'EXCLUDED'>('INCLUDED');
  const [hillChargesApplicable, setHillChargesApplicable] = useState<'APPLICABLE' | 'NOT_APPLICABLE'>('NOT_APPLICABLE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Dynamic calculations
  const fixedCommissionAmount = Math.round((fare * commissionRate) / 100);
  const fixedDriverNet = Math.max(0, fare - fixedCommissionAmount);

  const kmsEstTotal = Math.round(estKm * ratePerKm);
  const kmsCommissionAmount = Math.round((kmsEstTotal * commissionRate) / 100);
  const kmsDriverNet = Math.max(0, kmsEstTotal - kmsCommissionAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payloadPickup = (pickupLocation || "").trim() || "Pickup Location";
    const payloadDrop = (dropLocation || "").trim() || "Drop Location";

    const finalFare = pricingType === 'FIXED' ? fare : kmsEstTotal;
    const finalDistance = pricingType === 'FIXED' ? distance : `${estKm} km`;
    const finalAllowedKm = pricingType === 'FIXED' ? allowedKm : (kmsAllowedKm && Number(kmsAllowedKm) > 0 ? Number(kmsAllowedKm) : 0);
    const finalExtraKmRate = pricingType === 'FIXED' ? extraKmRate : ratePerKm;

    // Auto-geocode addresses to real coordinates
    let finalPickupLat = pickupLat;
    let finalPickupLng = pickupLng;
    let finalDropLat = dropLat;
    let finalDropLng = dropLng;

    const geocodeLocation = async (text: string) => {
      if (!text || text.trim().length === 0) return null;
      try {
        const parts = text.split(",").map(s => s.trim()).filter(Boolean);
        const q = parts.slice(0, 3).join(", ");
        const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(q) + "&limit=1");
        const data = await res.json();
        if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      } catch (e) {}
      try {
        const city = text.split(",")[0].trim();
        const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(city) + "&limit=1");
        const data = await res.json();
        if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      } catch (e) {}
      return null;
    };

    try {
      const [pGeo, dGeo] = await Promise.all([
        geocodeLocation(payloadPickup),
        geocodeLocation(payloadDrop)
      ]);
      if (pGeo) {
        finalPickupLat = pGeo.lat;
        finalPickupLng = pGeo.lng;
      }
      if (dGeo) {
        finalDropLat = dGeo.lat;
        finalDropLng = dGeo.lng;
      }
    } catch (e) {}

    try {
      await onSubmit({
        customer_name: "Customer",
        customer_phone: "+91 00000 00000",
        pickup_location: payloadPickup,
        pickup_latitude: finalPickupLat,
        pickup_longitude: finalPickupLng,
        drop_location: payloadDrop,
        drop_latitude: finalDropLat,
        drop_longitude: finalDropLng,
        pickup_date: pickupDate === getTodayDateStr() ? 'Today' : pickupDate,
        pickup_time: formatDisplayTime(pickupTime),
        fare: finalFare,
        distance: finalDistance,
        vehicle_type: vehicleType,
        trip_type: tripType,
        payment_method: 'Cash',
        assigned_driver_id: null,
        toll_included: tollIncluded,
        permit_included: permitIncluded,
        batta_included: battaIncluded,
        hill_charges_applicable: hillChargesApplicable,
        cash_to_collect: finalFare,
        allowed_km: finalAllowedKm,
        extra_km_rate: finalExtraKmRate,
        pricing_type: pricingType,
        commission_rate: commissionRate,
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
    <div className="max-w-5xl mx-auto space-y-5 px-1 sm:px-0 pb-24">
      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm font-medium">
            <strong>Trip Dispatched Successfully!</strong> Remote Push Notification sent to drivers' phones. Navigating to trips list...
          </div>
        </div>
      )}

      {/* Main Form */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Route & Locations */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">1. Route & Location Details</h2>
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

        {/* Section 2: Schedule, Vehicle & Trip Type */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Car className="w-5 h-5 text-[#0043DC]" />
            <h2 className="text-base font-bold text-slate-900">2. Vehicle Category & Schedule</h2>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pickup Date *
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setPickupDate(getTodayDateStr())}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded transition ${
                      pickupDate === getTodayDateStr()
                        ? 'bg-[#0043DC] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupDate(getTomorrowDateStr())}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded transition ${
                      pickupDate === getTomorrowDateStr()
                        ? 'bg-[#0043DC] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pickup Time *
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setPickupTime(getCurrentTimeStr(0))}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupTime(getCurrentTimeStr(30))}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupTime(getCurrentTimeStr(60))}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    +1h
                  </button>
                </div>
              </div>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Specific Inclusions / Exclusions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">3. Fee Inclusions & Rules Breakdown</h2>
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

        {/* Section 4: Pricing Structure & Model Selector */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                4. Pricing Structure ({pricingType === 'FIXED' ? 'Fixed Trip' : 'KMs Trip'})
              </h2>
            </div>

            {/* Trip Creation Model Switcher */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setPricingType('FIXED')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  pricingType === 'FIXED'
                    ? 'bg-[#0043DC] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Fixed Trip</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingType('KMS')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  pricingType === 'KMS'
                    ? 'bg-[#0043DC] text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>KMs Trip</span>
              </button>
            </div>
          </div>

          {pricingType === 'FIXED' ? (
            /* ================= FIXED TRIP FORM ================= */
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Base Fare */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Base Fare (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fare}
                      onChange={(e) => setFare(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>
                </div>

                {/* 2. Allowed KM Limit */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Allowed KM Limit *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
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

                {/* 3. Extra KM Rate */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Extra KM Rate (₹/KM) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={extraKmRate}
                      onChange={(e) => setExtraKmRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-12 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">/km</span>
                  </div>
                </div>

                {/* 4. Platform Commission */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Platform Commission (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">%</span>
                  </div>
                </div>
              </div>

              {/* Fixed Formula & Commission Summary Card */}
              <div className="bg-[#0043DC]/5 border border-[#0043DC]/15 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-700">
                <div className="space-y-1">
                  <div>
                    <strong className="text-[#0043DC]">💡 Fixed Trip Rule:</strong> Base trip includes up to <strong>{allowedKm} KM</strong>. Any distance beyond {allowedKm} KM will be charged at <strong>₹{extraKmRate}/KM</strong>.
                  </div>
                  <div className="text-slate-500 font-medium">
                    Formula: Extra KM × ₹{extraKmRate}
                  </div>
                </div>

                {/* Financial Summary Pill */}
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-500">Base Fare:</span> <strong className="text-slate-900 font-bold">₹{fare}</strong>
                  </div>
                  <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    <span className="text-amber-800">Comm ({commissionRate}%):</span> <strong className="text-amber-900 font-bold">₹{fixedCommissionAmount}</strong>
                  </div>
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800">Driver Net:</span> <strong className="text-emerald-900 font-bold">₹{fixedDriverNet}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= KMS TRIP FORM ================= */
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Rate Per KM */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Rate Per KM (₹/KM) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-[#0043DC] font-black">₹</span>
                    <input
                      type="number"
                      value={ratePerKm}
                      onChange={(e) => setRatePerKm(Number(e.target.value))}
                      placeholder="16"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-12 py-2.5 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">/km</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Direct kilometer pricing</p>
                </div>

                {/* 2. Allowed KM / Coverage (Optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Allowed KM (Optional)</span>
                    <span className="text-[10px] text-[#0043DC] font-bold">coverage</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={kmsAllowedKm}
                      onChange={(e) => setKmsAllowedKm(e.target.value)}
                      placeholder="e.g. 50 (blank = no limit)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-12 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">KM</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {kmsAllowedKm && Number(kmsAllowedKm) > 0
                      ? `Shows as ${kmsAllowedKm} KM Coverage in Driver App`
                      : 'Leave blank to hide Coverage in Driver App'}
                  </p>
                </div>

                {/* 3. Estimated Distance */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Estimated Route (KM) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={estKm}
                      onChange={(e) => setEstKm(Number(e.target.value))}
                      placeholder="38.5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-12 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">KM</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Trip distance estimate</p>
                </div>

                {/* 4. Platform Commission */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Platform Commission (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">PickMi platform fee (default 10%)</p>
                </div>
              </div>

              {/* KMs Trip Live Breakdown & Formula Card */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-700">
                <div className="space-y-1">
                  <div>
                    <strong className="text-emerald-700">🛣️ KMs Trip:</strong> {kmsAllowedKm && Number(kmsAllowedKm) > 0 ? (
                      <span>Coverage of <strong>{kmsAllowedKm} KM</strong> set. Billed @ <strong>₹{ratePerKm}/KM</strong>.</span>
                    ) : (
                      <span>Pure distance billing @ <strong>₹{ratePerKm}/KM</strong> (no coverage limit).</span>
                    )}
                  </div>
                  <div className="text-slate-500 font-medium">
                    Formula: Distance ({estKm} KM) × ₹{ratePerKm}/KM = <strong className="text-slate-900">₹{kmsEstTotal}</strong>
                  </div>
                </div>

                {/* Commission & Net Share Breakdown */}
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
                    <span className="text-slate-500">Est. Total:</span> <strong className="text-emerald-700 font-bold text-sm">₹{kmsEstTotal}</strong>
                  </div>
                  <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
                    <span className="text-amber-800">Comm ({commissionRate}%):</span> <strong className="text-amber-900 font-bold">₹{kmsCommissionAmount}</strong>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg shadow-sm">
                    <span>Driver Net:</span> <strong className="font-bold">₹{kmsDriverNet}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit & Dispatch Button */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onNavigateToTrips}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition text-center"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 sm:px-8 py-3.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[#0043DC]/25 active:scale-95 transition disabled:opacity-50"
          >
            <Navigation className="w-4 h-4 shrink-0" />
            <span>{isSubmitting ? 'DISPATCHING TO FLEET...' : 'DISPATCH TRIP & SEND PUSH NOTIFICATION'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
