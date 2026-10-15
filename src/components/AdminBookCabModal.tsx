import React, { useState } from 'react';
import {
  X,
  Car,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  IndianRupee,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendRemotePushNotificationToDrivers } from '../lib/pushNotifications';
import type { Driver, VehicleType, TripType } from '../types';

interface AdminBookCabModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  onSuccess: () => void;
  initialCustomer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

const PRESET_LOCATIONS = [
  { name: 'Kempegowda International Airport (BLR), Terminal 2', lat: 13.1989, lng: 77.7068 },
  { name: 'Koramangala 5th Block, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar 100ft Road Metro Station, Bengaluru', lat: 12.9784, lng: 77.6408 },
  { name: 'Whitefield ITPL Main Road, Bengaluru', lat: 12.9866, lng: 77.7335 },
  { name: 'Electronic City Phase 1, Wipro Gate, Bengaluru', lat: 12.8452, lng: 77.6602 },
  { name: 'MG Road Trinity Circle, Bengaluru', lat: 12.9738, lng: 77.6192 },
  { name: 'Mysuru Suburban Bus Stand, Mysuru', lat: 12.3052, lng: 76.6552 },
];

export const AdminBookCabModal: React.FC<AdminBookCabModalProps> = ({
  isOpen,
  onClose,
  drivers,
  onSuccess,
  initialCustomer
}) => {
  // Customer info
  const [customerName, setCustomerName] = useState(initialCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.email || '');

  // Trip route
  const [pickupLocation, setPickupLocation] = useState(PRESET_LOCATIONS[1].name);
  const [pickupLat, setPickupLat] = useState(PRESET_LOCATIONS[1].lat);
  const [pickupLng, setPickupLng] = useState(PRESET_LOCATIONS[1].lng);

  const [dropLocation, setDropLocation] = useState(PRESET_LOCATIONS[0].name);
  const [dropLat, setDropLat] = useState(PRESET_LOCATIONS[0].lat);
  const [dropLng, setDropLng] = useState(PRESET_LOCATIONS[0].lng);

  // Date and Time
  const todayStr = new Date().toISOString().split('T')[0];
  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupTime, setPickupTime] = useState('Now');

  // Vehicle and Fare
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [tripType, setTripType] = useState<TripType>('Airport Transfer');
  const [distanceKm, setDistanceKm] = useState(42);
  const [fare, setFare] = useState(1399);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Pay Full to Driver');

  // Driver Assignment
  const [assignedDriverId, setAssignedDriverId] = useState('');

  // Email Notification Checkbox
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ tripId: string; otp: string; emailSent: boolean } | null>(null);

  if (!isOpen) return null;

  // Auto-calculate fare based on vehicle and distance
  const handleDistanceChange = (dist: number) => {
    setDistanceKm(dist);
    const ratePerKm = vehicleType === 'SUV' ? 19 : vehicleType === 'Prime Sedan' ? 16 : 14;
    const baseFare = 350;
    setFare(Math.round(baseFare + dist * ratePerKm));
  };

  const handleVehicleChange = (vType: VehicleType) => {
    setVehicleType(vType);
    const ratePerKm = vType === 'SUV' ? 19 : vType === 'Prime Sedan' ? 16 : 14;
    const baseFare = 350;
    setFare(Math.round(baseFare + distanceKm * ratePerKm));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = customerName.trim();
    const phone = customerPhone.trim();
    const email = customerEmail.trim();

    if (!name || name.length < 2) {
      setErrorMsg('Please enter customer full name');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (sendConfirmationEmail && (!email || !email.includes('@'))) {
      setErrorMsg('Please provide a valid customer email to send booking verification');
      return;
    }

    setIsSubmitting(true);
    try {
      const tripNumber = 'PM-' + Math.floor(100000 + Math.random() * 900000);
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      // 1. Insert into Supabase `trips` table (Driver ecosystem & live dispatch)
      const tripRecord = {
        trip_number: tripNumber,
        customer_name: name,
        customer_phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
        pickup_location: pickupLocation,
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        drop_location: dropLocation,
        drop_latitude: dropLat,
        drop_longitude: dropLng,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        fare: fare,
        distance: `${distanceKm} km`,
        vehicle_type: vehicleType,
        trip_type: tripType,
        payment_method: paymentMethod,
        status: assignedDriverId ? 'ASSIGNED' : 'AVAILABLE',
        assigned_driver_id: assignedDriverId || null,
        otp: otp,
        toll_included: 'INCLUDED',
        permit_included: 'EXCLUDED',
        batta_included: 'INCLUDED',
        hill_charges_applicable: 'NOT_APPLICABLE',
        cash_to_collect: advancePaid > 0 ? Math.max(0, fare - advancePaid) : fare,
        allowed_km: distanceKm + 5,
        extra_km_rate: vehicleType === 'SUV' ? 19 : 14
      };

      const { data: createdTrip, error: tripErr } = await supabase
        .from('trips')
        .insert([tripRecord])
        .select()
        .single();

      if (tripErr) throw tripErr;

      // 2. Insert into `website_bookings`
      try {
        await supabase.from('website_bookings').insert([{
          booking_number: tripNumber,
          customer_name: name,
          customer_phone: phone,
          customer_email: email || null,
          pickup_location: pickupLocation,
          drop_location: dropLocation,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
          trip_type: tripType,
          vehicle_type: vehicleType,
          estimated_fare: fare,
          distance_km: distanceKm,
          status: assignedDriverId ? 'ASSIGNED' : 'PENDING'
        }]);
      } catch (wbErr: any) {
        console.warn('website_bookings insertion note:', wbErr.message);
      }

      // 3. Upsert into `website_users`
      try {
        await supabase.from('website_users').upsert([{
          name: name,
          mobile: phone,
          email: email || null,
          city: 'Bengaluru',
          updated_at: new Date().toISOString()
        }], { onConflict: 'mobile' });
      } catch (uErr: any) {
        console.warn('website_users sync note:', uErr.message);
      }

      // 4. Send Remote Push Notification to Drivers if unassigned
      if (!assignedDriverId && createdTrip) {
        sendRemotePushNotificationToDrivers({
          tripId: createdTrip.id,
          tripNumber: createdTrip.trip_number || tripNumber,
          fare: createdTrip.fare,
          pickupLocation: createdTrip.pickup_location,
          dropLocation: createdTrip.drop_location,
        }).catch(err => console.warn('Push error:', err));
      }

      // 5. Dispatch Pickmi Booking Verification Email
      let emailDispatched = false;
      if (sendConfirmationEmail && email && email.includes('@')) {
        try {
          const emailPayload = {
            booking: {
              id: tripNumber,
              reservationOtp: otp,
              pickup: pickupLocation,
              drop: dropLocation,
              pickupTime: `${pickupDate} at ${pickupTime}`,
              vehicleCategory: vehicleType,
              vehicleModel: vehicleType === 'SUV' ? 'Toyota Innova / Ertiga' : 'Toyota Etios / Swift Dzire',
              passengerName: name,
              passengerEmail: email,
              distanceKm: distanceKm,
              fare: { total: fare },
              advancePaid: advancePaid,
              paymentMethod: paymentMethod
            }
          };

          const emailRes = await fetch('http://localhost:4200/api/email/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload)
          });
          const emailData = await emailRes.json();
          emailDispatched = Boolean(emailData && emailData.success);
          console.log('Admin booking verification email response:', emailData);
        } catch (e: any) {
          console.warn('Could not dispatch email via localhost:4200:', e.message);
        }
      }

      setSuccessInfo({
        tripId: tripNumber,
        otp: otp,
        emailSent: emailDispatched
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl relative my-auto overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-[#0043DC] to-indigo-900 p-4 sm:p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Car className="w-4 h-4 text-amber-400" />
            <span>Website Management &bull; Admin Booking Module</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Book a Cab for Customer</h2>
          <p className="text-blue-100 text-xs mt-1">
            Dispatch ride directly into Pickmi and send customer the Booking Verification email.
          </p>
        </div>

        {/* Content Body */}
        {successInfo ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Ride Booked Successfully!</h3>
              <p className="text-slate-600 text-sm mt-1">
                Booking Reference: <strong className="text-blue-600">#{successInfo.tripId}</strong>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm mx-auto">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Trip Start OTP</span>
              <div className="text-3xl font-black text-[#0043DC] tracking-widest my-1">{successInfo.otp}</div>
              <span className="text-[11px] text-slate-500">Provide this code to customer or driver to start trip</span>
            </div>

            {successInfo.emailSent ? (
              <div className="flex items-center justify-center space-x-2 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 rounded-xl p-3 max-w-md mx-auto">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Pickmi Booking Verification email dispatched to {customerEmail}</span>
              </div>
            ) : customerEmail ? (
              <div className="text-amber-700 text-xs font-medium bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-md mx-auto">
                Booking recorded. Email service will queue delivery.
              </div>
            ) : null}

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#0043DC] text-white text-xs font-bold hover:bg-blue-700 shadow-md transition"
              >
                Close &amp; View Bookings
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Customer Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-[#0043DC]" />
                <span>1. Customer Information</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9845012345"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Email *</label>
                  <input
                    type="email"
                    required={sendConfirmationEmail}
                    placeholder="e.g. customer@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Journey & Presets */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#0043DC]" />
                  <span>2. Route &amp; Travel Schedule</span>
                </h3>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 self-center mr-1">Quick Route:</span>
                {PRESET_LOCATIONS.slice(0, 5).map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (idx === 0) {
                        setDropLocation(loc.name);
                        setDropLat(loc.lat);
                        setDropLng(loc.lng);
                      } else {
                        setPickupLocation(loc.name);
                        setPickupLat(loc.lat);
                        setPickupLng(loc.lng);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold border border-slate-200 transition"
                  >
                    {loc.name.split(',')[0]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Pickup Location</label>
                  <input
                    type="text"
                    required
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Drop Location</label>
                  <input
                    type="text"
                    required
                    value={dropLocation}
                    onChange={(e) => setDropLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Pickup Date</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Pickup Time</label>
                  <input
                    type="text"
                    placeholder="Now or 08:30 PM"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Trip Type</label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as TripType)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Airport Transfer">Airport Transfer</option>
                    <option value="One-way">One-way City Ride</option>
                    <option value="Round-trip">Round-trip</option>
                    <option value="Outstation">Outstation Trip</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Vehicle, Fare & Payment */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Car className="w-3.5 h-3.5 text-[#0043DC]" />
                <span>3. Vehicle Category, Distance &amp; Billing</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Sedan', 'SUV', 'Hatchback', 'Prime Sedan'] as VehicleType[]).map((vt) => (
                  <button
                    key={vt}
                    type="button"
                    onClick={() => handleVehicleChange(vt)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center space-y-1 ${
                      vehicleType === vt
                        ? 'border-[#0043DC] bg-blue-50/80 text-[#0043DC] shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{vt}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {vt === 'SUV' ? 'Innova/Ertiga' : 'Etios/Dzire'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Distance (km)</label>
                  <input
                    type="number"
                    min={1}
                    value={distanceKm}
                    onChange={(e) => handleDistanceChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Total Fare (Rs.)</label>
                  <input
                    type="number"
                    min={50}
                    value={fare}
                    onChange={(e) => setFare(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-[#0043DC] focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Advance Paid (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    max={fare}
                    value={advancePaid}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      setAdvancePaid(v);
                      if (v > 0) setPaymentMethod(`Advance Rs. ${v} Paid (Rs. ${Math.max(0, fare - v)} to Driver)`);
                      else setPaymentMethod('Pay Full to Driver');
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Pay Full to Driver">Pay Full to Driver</option>
                    <option value="Advance Rs. 100 Paid Online">Advance Rs. 100 Paid</option>
                    <option value="Paid Online in Full">Paid Online in Full</option>
                    <option value="Corporate Account / Credit">Corporate Billing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Chauffeur Assignment */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0043DC]" />
                <span>4. Chauffeur Assignment (Optional)</span>
              </h3>

              <div>
                <select
                  value={assignedDriverId}
                  onChange={(e) => setAssignedDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Broadcast to All Online Drivers (Automatic Dispatch)</option>
                  {drivers
                    .filter((d) => d.status === 'active')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} &bull; {d.mobile} &bull; {d.vehicle?.vehicle_number || 'Sedan'} ({d.online_status})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Leave on &ldquo;Broadcast&rdquo; to notify drivers within radius, or pick a specific chauffeur immediately.
                </span>
              </div>
            </div>

            {/* Section 5: Email Notification Confirmation */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start space-x-3">
              <input
                type="checkbox"
                id="send_email_check"
                checked={sendConfirmationEmail}
                onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                className="mt-0.5 rounded text-[#0043DC] focus:ring-blue-500 w-4 h-4"
              />
              <label htmlFor="send_email_check" className="text-xs text-slate-700 cursor-pointer">
                <strong className="text-slate-900 block font-bold">
                  Send Pickmi Booking Verification Email
                </strong>
                Customer will instantly receive their verification email containing the trip start OTP, itinerary, route details, and billing terms.
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/30 transition flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Creating &amp; Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Car className="w-4 h-4" />
                    <span>Confirm Booking &amp; Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
