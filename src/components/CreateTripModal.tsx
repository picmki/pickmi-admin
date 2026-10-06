import React, { useState } from 'react';
import { X, MapPin, Car, IndianRupee, User, Phone, CheckCircle, Navigation } from 'lucide-react';
import type { Driver, VehicleType } from '../types';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  onSubmit: (payload: any) => Promise<void>;
}

const PRESET_LOCATIONS = [
  { name: 'Kempegowda International Airport (BLR)', lat: 13.1989, lng: 77.7068 },
  { name: 'Koramangala 5th Block, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Indiranagar 100ft Road Metro Station', lat: 12.9784, lng: 77.6408 },
  { name: 'Electronic City Phase 1, Wipro Gate', lat: 12.8452, lng: 77.6602 },
  { name: 'Whitefield ITPL Main Road', lat: 12.9866, lng: 77.7335 },
  { name: 'MG Road Trinity Circle, Bengaluru', lat: 12.9738, lng: 77.6192 },
  { name: 'Mysuru Suburban Bus Stand', lat: 12.3052, lng: 76.6552 },
];

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  drivers,
  onSubmit,
}) => {
  const [customerName, setCustomerName] = useState('Rahul Nair');
  const [customerPhone, setCustomerPhone] = useState('+91 98450 67890');
  const [pickupLocation, setPickupLocation] = useState(PRESET_LOCATIONS[1].name);
  const [pickupLat, setPickupLat] = useState(PRESET_LOCATIONS[1].lat);
  const [pickupLng, setPickupLng] = useState(PRESET_LOCATIONS[1].lng);

  const [dropLocation, setDropLocation] = useState(PRESET_LOCATIONS[0].name);
  const [dropLat, setDropLat] = useState(PRESET_LOCATIONS[0].lat);
  const [dropLng, setDropLng] = useState(PRESET_LOCATIONS[0].lng);

  const [fare, setFare] = useState<number>(1150);
  const [distance, setDistance] = useState('38.5 km');
  const [allowedKm, setAllowedKm] = useState<number>(45);
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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
        fare,
        distance,
        allowed_km: allowedKm,
        vehicle_type: vehicleType,
        payment_method: paymentMethod,
        assigned_driver_id: assignedDriverId || null,
      });
      onClose();
    } catch (err: any) {
      alert('Failed to dispatch trip: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dispatch New Trip</h2>
              <p className="text-xs text-slate-400">Broadcasts ride to online drivers or assigns directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Mobile</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="tel"
                 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Pickup Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Pickup Address</label>
              <span className="text-[10px] text-emerald-400 font-medium">Quick Pickups</span>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
               
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_LOCATIONS.slice(1, 4).map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handlePickupPreset(p)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-emerald-300 hover:bg-slate-700/60 border border-slate-750 transition"
                >
                  {p.name.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Drop Location */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Drop Address</label>
              <span className="text-[10px] text-rose-400 font-medium">Quick Drops</span>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-rose-400" />
              <input
                type="text"
               
                value={dropLocation}
                onChange={(e) => setDropLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_LOCATIONS.slice(0, 3).map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handleDropPreset(p)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700/60 border border-slate-750 transition"
                >
                  {p.name.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Fare & Distance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Fare (₹)</label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="number"
                 
                  min={50}
                  value={fare}
                  onChange={(e) => setFare(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Allowed KM Limit</label>
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
                  className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="45"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-bold pointer-events-none">KM</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Prime Sedan">Prime Sedan</option>
                <option value="EV">EV</option>
              </select>
            </div>
          </div>

          {/* Assign Driver (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assign Driver <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => {
                  const sId = e.target.value;
                  const found = drivers.find((d) => d.id === sId);
                  if (found && found.status !== "active") {
                    alert(`⚠️ Cannot Assign ${found.name}: Documents & vehicle are unverified. Please verify driver documents first.`);
                    return;
                  }
                  setAssignedDriverId(sId);
                }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Broadcast to All Online Verified Drivers</option>
                {drivers.map((d) => {
                  const isVerified = d.status === "active";
                  return (
                    <option key={d.id} value={d.id} disabled={!isVerified}>
                      {d.name} ({d.online_status}) • {isVerified ? "✅ Verified" : "⚠️ Docs Pending (Locked)"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Cash">Cash to Driver</option>
                <option value="Online">Online / UPI</option>
                <option value="Wallet">Corporate Wallet</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/25 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Dispatch Trip Live</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
