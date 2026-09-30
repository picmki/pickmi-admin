import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle,
  Clock,
  Car,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  FileText,
  ToggleLeft,
  ToggleRight,
  X,
  Eye,
} from 'lucide-react';
import type { Driver } from '../types';

interface DriversManagerProps {
  drivers: Driver[];
  onToggleOnline: (driverId: string, currentStatus: 'ONLINE' | 'OFFLINE') => Promise<void>;
  onToggleDeposit: (driverId: string, currentStatus: 'PAID' | 'PENDING') => Promise<void>;
  onInspectDocuments: (driver: Driver) => void;
  onAddDriver: (payload: any) => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
}

export const DriversManager: React.FC<DriversManagerProps> = ({
  drivers,
  onToggleOnline,
  onToggleDeposit,
  onInspectDocuments,
  onAddDriver,
  onViewDriverDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Driver Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [vehicleModel, setVehicleModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.mobile.includes(searchTerm) ||
      d.vehicle?.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !vehicleNumber || !vehicleModel) {
      alert('Please fill all required fields');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddDriver({
        name,
        mobile,
        email,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel,
      });
      setIsAddModalOpen(false);
      setName('');
      setMobile('');
      setEmail('');
      setVehicleNumber('');
      setVehicleModel('');
    } catch (err: any) {
      alert('Failed to register driver: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Driver Fleet Management</h2>
          <p className="text-xs text-slate-500">
            Monitor live driver logins, online telemetry, vehicle details & verification status
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-lg shadow-emerald-500/25 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, mobile, vehicle number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="text-xs text-slate-500 pr-3 font-mono">
          Total: <span className="font-bold text-slate-900">{drivers.length}</span> drivers
        </div>
      </div>

      {/* Fleet Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Driver Profile</th>
                <th className="py-3 px-4">Vehicle Details</th>
                <th className="py-3 px-4">Online Status</th>
                <th className="py-3 px-4">Security Deposit</th>
                <th className="py-3 px-4">Performance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => {
                  const isOnline = driver.online_status === 'ONLINE';
                  const isDepositPaid = driver.deposit_status === 'PAID';

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/40 transition">
                      {/* Driver Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            onClick={() => onViewDriverDetails?.(driver.id)}
                            src={
                              driver.profile_image ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
                            }
                            alt={driver.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          />
                          <div>
                            <div onClick={() => onViewDriverDetails?.(driver.id)} className="font-bold text-slate-900 text-sm hover:text-[#0043DC] cursor-pointer transition">{driver.name}</div>
                            <div className="flex items-center space-x-1 text-[11px] text-slate-500 font-mono">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{driver.mobile}</span>
                            </div>
                            {driver.email && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                {driver.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-200">
                          {driver.vehicle?.vehicle_number || 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {driver.vehicle?.vehicle_type || 'Sedan'} • {driver.vehicle?.vehicle_model || 'Standard'}
                        </div>
                      </td>

                      {/* Live Online Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onToggleOnline(driver.id, driver.online_status)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition border ${
                            isOnline
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-700'
                          }`}
                          title="Click to toggle Online/Offline"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          ></span>
                          <span>{driver.online_status}</span>
                        </button>
                      </td>

                      {/* Deposit Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onToggleDeposit(driver.id, driver.deposit_status)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                            isDepositPaid
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
                              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                          }`}
                          title="Click to toggle ₹250 Deposit status"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{driver.deposit_status}</span>
                        </button>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          {isDepositPaid ? '₹250 Active' : '₹250 Due'}
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1 text-yellow-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{driver.rating}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {driver.total_trips} trips completed
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewDriverDetails?.(driver.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#0043DC] hover:bg-[#0038b8] text-xs font-bold text-white transition inline-flex items-center space-x-1.5 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Details</span>
                          </button>
                          <button
                            onClick={() => onInspectDocuments(driver)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition inline-flex items-center space-x-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>Docs</span>
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

      {/* Add New Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                <span>Register New Driver</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 00000"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="driver@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="KA 01 AB 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 uppercase focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Prime Sedan">Prime Sedan</option>
                    <option value="EV">EV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maruti Dzire White 2024"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div>• Initial status: <strong className="text-emerald-700">ONLINE</strong></div>
                <div>• Default documents: Created with <strong className="text-amber-700">Pending Review</strong></div>
                <div>• ₹250 Deposit: Marked <strong className="text-amber-700">Pending</strong> until paid</div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? 'Registering...' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
