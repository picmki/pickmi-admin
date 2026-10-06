
const FALLBACK_DL = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80';
const FALLBACK_DL_BACK = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
const FALLBACK_RC = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80';
const FALLBACK_INS = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80';
const FALLBACK_PMT = 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80';
const FALLBACK_AVATAR = '/default-avatar.png';

export function getSafeDocUrl(url?: string | null, type?: string | null): string {
  if (!url || url.startsWith('file://')) {
    const t = (type || '').toLowerCase();
    if (t.includes('back')) return FALLBACK_DL_BACK;
    if (t.includes('rc')) return FALLBACK_RC;
    if (t.includes('insurance')) return FALLBACK_INS;
    if (t.includes('permit')) return FALLBACK_PMT;
    return FALLBACK_DL;
  }
  return url;
}

import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  User,
  Phone,
  Calendar,
  X,
  Search,
  ShieldCheck,
  CheckCheck,
  Car,
  ChevronRight,
  ExternalLink,
  Sparkles,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import type { Driver, DriverDocument } from '../types';

interface DocumentVerificationProps {
  drivers: Driver[];
  documents: DriverDocument[];
  onVerifyDocument: (docId: string, status: 'Verified' | 'Rejected', reason?: string) => Promise<void>;
  onVerifyAllDocuments: (driverId: string) => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
}

export const DocumentVerification: React.FC<DocumentVerificationProps> = ({
  drivers,
  documents,
  onVerifyDocument,
  onVerifyAllDocuments,
  onViewDriverDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DriverDocument | null>(null);
  const [rejectionModalDoc, setRejectionModalDoc] = useState<DriverDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Document image is blurry or expired');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Group documents by driver_id
  const driversWithDocs = drivers.map((driver) => {
    const driverDocs = documents.filter((doc) => doc.driver_id === driver.id);
    const pendingCount = driverDocs.filter((d) => d.verification_status === 'Pending').length;
    const verifiedCount = driverDocs.filter((d) => d.verification_status === 'Verified').length;
    const rejectedCount = driverDocs.filter((d) => d.verification_status === 'Rejected').length;
    const totalCount = driverDocs.length;

    let overallStatus: 'pending' | 'verified' | 'rejected' | 'no_docs' = 'no_docs';
    if (totalCount > 0) {
      if (pendingCount > 0) {
        overallStatus = 'pending';
      } else if (rejectedCount > 0) {
        overallStatus = 'rejected';
      } else if (verifiedCount === totalCount) {
        overallStatus = 'verified';
      }
    }

    return {
      driver,
      docs: driverDocs,
      pendingCount,
      verifiedCount,
      rejectedCount,
      totalCount,
      overallStatus,
    };
  });

  // Calculate high-level counters
  const totalPendingDrivers = driversWithDocs.filter((d) => d.pendingCount > 0).length;
  const totalVerifiedDrivers = driversWithDocs.filter((d) => d.totalCount > 0 && d.pendingCount === 0 && d.rejectedCount === 0).length;
  const totalRejectedDrivers = driversWithDocs.filter((d) => d.rejectedCount > 0).length;
  const totalPendingDocsCount = documents.filter((d) => d.verification_status === 'Pending').length;

  // Filter based on active tab and search query
  const filteredDrivers = driversWithDocs.filter((item) => {
    // Search query filter
    const matchesSearch =
      item.driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.driver.mobile.includes(searchQuery) ||
      (item.driver.vehicle?.vehicle_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pending') {
      return item.pendingCount > 0;
    }
    if (activeTab === 'verified') {
      return item.totalCount > 0 && item.pendingCount === 0 && item.rejectedCount === 0;
    }
    if (activeTab === 'rejected') {
      return item.rejectedCount > 0;
    }
    return item.totalCount > 0;
  });

  // Selected driver for inspection modal
  const selectedDriverGroup = driversWithDocs.find((d) => d.driver.id === selectedDriverId);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleApproveSingleDoc = async (docId: string, driverName?: string) => {
    setIsProcessing(true);
    try {
      await onVerifyDocument(docId, 'Verified');
      showToast(`Document verified successfully!`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAllForDriver = async (driverId: string, driverName: string) => {
    setIsProcessing(true);
    try {
      await onVerifyAllDocuments(driverId);
      showToast(`🎉 All documents for ${driverName} have been verified & driver activated!`);
      // Close inspection modal if open
      if (selectedDriverId === driverId) {
        setSelectedDriverId(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionModalDoc) return;
    setIsProcessing(true);
    try {
      await onVerifyDocument(rejectionModalDoc.id, 'Rejected', rejectionReason);
      setRejectionModalDoc(null);
      showToast(`Document marked as Rejected.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-200" />
            <span className="font-semibold text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and KPI summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Driver Document Verification Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0043DC]/10 text-[#0043DC] border border-[#0043DC]/20">
              Driver-by-Driver Review
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Review driver onboarding dossiers. When all documents for a driver are verified, they are automatically removed from the Pending queue.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search driver, mobile, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0043DC]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-500/10 border-amber-500/30 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Pending Review</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-700">{totalPendingDrivers}</span>
            <span className="text-xs text-slate-500 font-medium">drivers</span>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md ml-auto">
              {totalPendingDocsCount} docs
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('verified')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'verified'
              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Fully Verified</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-700">{totalVerifiedDrivers}</span>
            <span className="text-xs text-slate-500 font-medium">drivers activated</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('rejected')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'rejected'
              ? 'bg-rose-500/10 border-rose-500/30 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Action Required / Rejected</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <BadgeAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-700">{totalRejectedDrivers}</span>
            <span className="text-xs text-slate-500 font-medium">need resubmission</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeTab === 'all'
              ? 'bg-blue-500/10 border-blue-500/30 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Enrolled Fleet</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-[#0043DC]">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {driversWithDocs.filter((d) => d.totalCount > 0).length}
            </span>
            <span className="text-xs text-slate-500 font-medium">with documents</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'pending'
                ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Review ({totalPendingDrivers})</span>
          </button>

          <button
            onClick={() => setActiveTab('verified')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'verified'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Fully Verified ({totalVerifiedDrivers})</span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'rejected'
                ? 'border-rose-500 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Needs Resubmission ({totalRejectedDrivers})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'all'
                ? 'border-[#0043DC] text-[#0043DC] bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>All Drivers ({driversWithDocs.filter((d) => d.totalCount > 0).length})</span>
          </button>
        </div>
      </div>

      {/* Driver List by Driver */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'pending'
              ? 'All Driver Documents are Verified!'
              : 'No Drivers Found Matching This Filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'Great job! There are no pending document verification requests at this moment. Drivers can now receive and accept rides.'
              : 'Try changing your search keywords or select another status tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDrivers.map(({ driver, docs, pendingCount, verifiedCount, rejectedCount, totalCount }) => {
            const hasPending = pendingCount > 0;
            const isAllVerified = totalCount > 0 && pendingCount === 0 && rejectedCount === 0;

            return (
              <div
                key={driver.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all p-5 shadow-sm hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Driver identity */}
                <div className="flex items-start space-x-4 min-w-[280px]">
                  <div className="relative">
                    <img
                      src={
                        driver.profile_image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=0043DC&color=fff`
                      }
                      alt={driver.name}
                      className="w-13 h-13 rounded-2xl object-cover border border-slate-200"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        driver.online_status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      title={driver.online_status}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-black text-slate-900 hover:text-[#0043DC] cursor-pointer"
                        onClick={() => setSelectedDriverId(driver.id)}>
                        {driver.name}
                      </h3>
                      {isAllVerified && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </span>
                      )}
                      {hasPending && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 animate-pulse flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{pendingCount} Pending</span>
                        </span>
                      )}
                      {rejectedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          {rejectedCount} Rejected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{driver.mobile}</span>
                      </span>
                      {driver.vehicle && (
                        <span className="flex items-center space-x-1 font-mono font-medium text-slate-700">
                          <Car className="w-3 h-3 text-slate-400" />
                          <span>{driver.vehicle.vehicle_number}</span>
                          <span className="text-slate-400 font-sans">({driver.vehicle.vehicle_type})</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">
                      ID: <span className="font-mono">{driver.id}</span> • Total trips: {driver.total_trips || 0}
                    </p>
                  </div>
                </div>

                {/* Document Status Chips / Badges */}
                <div className="flex-1 flex flex-wrap gap-2 items-center">
                  {docs.map((doc) => {
                    const isDocPending = doc.verification_status === 'Pending';
                    const isDocVerified = doc.verification_status === 'Verified';
                    const isDocRejected = doc.verification_status === 'Rejected';

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className={`group px-3 py-1.5 rounded-xl border text-xs cursor-pointer transition flex items-center space-x-1.5 ${
                          isDocPending
                            ? 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100'
                            : isDocVerified
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50/80 border-rose-200 text-rose-800 hover:bg-rose-100'
                        }`}
                        title="Click to preview document"
                      >
                        {isDocPending && <Clock className="w-3 h-3 text-amber-600" />}
                        {isDocVerified && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {isDocRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                        <span className="font-semibold">{doc.document_type}</span>
                        <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    );
                  })}
                </div>

                {/* Primary Driver Action Buttons */}
                <div className="flex items-center space-x-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    onClick={() => setSelectedDriverId(driver.id)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center space-x-1.5"
                  >
                    <span>Inspect All ({totalCount})</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {hasPending && (
                    <button
                      onClick={() => handleApproveAllForDriver(driver.id, driver.name)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Approve All</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Document Detailed Inspection Modal */}
      {selectedDriverGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={
                    selectedDriverGroup.driver.profile_image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDriverGroup.driver.name)}&background=0043DC&color=fff`
                  }
                  alt={selectedDriverGroup.driver.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-black text-slate-900">{selectedDriverGroup.driver.name}</h2>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-blue-50 text-[#0043DC] border border-blue-200">
                      Dossier Verification
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                    <span>{selectedDriverGroup.driver.mobile}</span>
                    <span>•</span>
                    <span>{selectedDriverGroup.driver.vehicle?.vehicle_number || 'No Vehicle'}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">
                      {selectedDriverGroup.pendingCount} of {selectedDriverGroup.totalCount} Pending Review
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {selectedDriverGroup.pendingCount > 0 && (
                  <button
                    onClick={() => handleApproveAllForDriver(selectedDriverGroup.driver.id, selectedDriverGroup.driver.name)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition shadow-md shadow-[#0043DC]/20 flex items-center space-x-1.5"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Approve All ({selectedDriverGroup.pendingCount})</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedDriverId(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Documents Grid */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedDriverGroup.docs.map((doc) => {
                  const isPending = doc.verification_status === 'Pending';
                  const isVerified = doc.verification_status === 'Verified';
                  const isRejected = doc.verification_status === 'Rejected';

                  return (
                    <div
                      key={doc.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition"
                    >
                      <div>
                        {/* Doc Title & Status */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{doc.document_type}</h4>
                            {doc.document_number && (
                              <p className="text-[11px] font-mono text-slate-500 mt-0.5">#{doc.document_number}</p>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {doc.verification_status}
                          </span>
                        </div>

                        {/* Image Preview with click to enlarge */}
                        <div
                          onClick={() => setPreviewDoc(doc)}
                          className="relative mt-3 rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200 aspect-[16/10] cursor-pointer group flex items-center justify-center"
                        >
                          <img
                            src={getSafeDocUrl(doc.document_url, doc.document_type)}
                            alt={doc.document_type}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>Click to Zoom</span>
                          </div>
                        </div>

                        {/* Validity & Rejection info */}
                        {doc.valid_until && (
                          <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Valid until: <strong className="text-slate-700">{doc.valid_until}</strong></span>
                          </div>
                        )}

                        {doc.rejection_reason && (
                          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                            <strong>Reason:</strong> {doc.rejection_reason}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApproveSingleDoc(doc.id, selectedDriverGroup.driver.name)}
                              disabled={isProcessing}
                              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center space-x-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Verify & Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectionModalDoc(doc)}
                              disabled={isProcessing}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center space-x-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between text-xs">
                            <span className="text-slate-500">Status: <strong className="text-slate-800">{doc.verification_status}</strong></span>
                            <button
                              onClick={() => handleApproveSingleDoc(doc.id, selectedDriverGroup.driver.name)}
                              className="text-[11px] font-bold text-[#0043DC] hover:underline"
                            >
                              Re-verify
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Driver Status in System: <strong className="uppercase text-slate-800">{selectedDriverGroup.driver.status}</strong>
              </span>
              <button
                onClick={() => setSelectedDriverId(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Document Image Lightbox */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewDoc.document_type}</h3>
                <p className="text-xs text-slate-500">{previewDoc.driver_name} • {previewDoc.driver_mobile}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
              <img
                src={getSafeDocUrl(previewDoc.document_url, previewDoc.document_type)}
                alt={previewDoc.document_type}
                className="max-h-[60vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-500">
                Document Number: <strong className="text-slate-900 font-mono">{previewDoc.document_number || 'N/A'}</strong>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    handleApproveSingleDoc(previewDoc.id);
                    setPreviewDoc(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] text-white font-bold text-xs transition"
                >
                  Approve This Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal with Reason */}
      {rejectionModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Reject Document</span>
            </h3>
            <p className="text-xs text-slate-500">
              Provide a reason for rejecting this {rejectionModalDoc.document_type}. The driver will receive an app notification with instructions to re-upload.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Rejection Reason</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              >
                <option value="Document image is blurry or unreadable">Document image is blurry or unreadable</option>
                <option value="Document has expired">Document has expired</option>
                <option value="Name / details mismatch vehicle records">Name / details mismatch vehicle records</option>
                <option value="Incorrect document uploaded">Incorrect document uploaded</option>
                <option value="Both front and back sides required">Both front and back sides required</option>
                <option value="Government watermark or signature missing">Government watermark or signature missing</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setRejectionModalDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
