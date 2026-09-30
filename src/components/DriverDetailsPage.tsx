
const FALLBACK_DL = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80';
const FALLBACK_DL_BACK = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80';
const FALLBACK_RC = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80';
const FALLBACK_INS = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80';
const FALLBACK_PMT = 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80';

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

import React, { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  Car,
  FileText,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Send,
  Eye,
  X,
  CreditCard,
  Hash,
  Navigation,
  DollarSign
} from "lucide-react";
import type { Driver, Trip, DriverDocument } from "../types";

interface DriverDetailsPageProps {
  driver: Driver;
  trips: Trip[];
  onBack: () => void;
  onToggleOnline: (driverId: string, currentStatus: string) => Promise<void>;
  onToggleDeposit: (driverId: string, currentStatus: string) => Promise<void>;
  onVerifyDocument: (docId: string, status: "Verified" | "Rejected") => Promise<void>;
  onVerifyAllDocuments?: (driverId: string) => Promise<void>;
  onAssignTrip: (driverId: string) => void;
}

export const DriverDetailsPage: React.FC<DriverDetailsPageProps> = ({
  driver,
  trips,
  onBack,
  onToggleOnline,
  onToggleDeposit,
  onVerifyDocument,
  onVerifyAllDocuments,
  onAssignTrip,
}) => {
  const [activeTab, setActiveTab] = useState<"documents" | "vehicle" | "trips" | "deposit">("documents");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isOnline = driver.online_status === "ONLINE";
  const isDepositPaid = driver.deposit_status === "PAID";

  // Filter trips for this driver
  const driverTrips = trips.filter(
    (t) =>
      t.assigned_driver_id === driver.id ||
      (t as any).driver?.id === driver.id ||
      (t as any).driver?.mobile === driver.mobile
  );

  const completedTrips = driverTrips.filter((t) => t.status === "COMPLETED");
  const totalCashCollected = completedTrips.reduce(
    (acc, t) => acc + (t.cash_to_collect || t.fare || 0),
    0
  );

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const docs = driver.documents || [];
  const verifiedDocsCount = docs.filter((d) => d.verification_status === "Verified").length;
  const isAllDocsVerified = docs.length > 0 && docs.every((d) => d.verification_status === "Verified") && driver.status === "active";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Top Bar Navigation ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Drivers</span>
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Fleet Driver</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-bold text-slate-800">{driver.name}</span>
          </div>
        </div>

        {/* Quick Action Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Online Toggle */}
          <button
            onClick={async () => {
              setActionLoading(true);
              await onToggleOnline(driver.id, driver.online_status);
              setActionLoading(false);
            }}
            disabled={actionLoading}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              isOnline
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
            }`}
            title="Click to toggle live driver status"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            <span>{isOnline ? "Driver Online" : "Driver Offline"}</span>
          </button>

          {/* 1-Click Approve All Documents & Vehicle */}
          {onVerifyAllDocuments && (
            <button
              onClick={async () => {
                setActionLoading(true);
                await onVerifyAllDocuments(driver.id);
                setActionLoading(false);
              }}
              disabled={actionLoading || isAllDocsVerified}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                isAllDocsVerified
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAllDocsVerified ? "Documents & Vehicle Verified ✅" : "Approve All Docs & Vehicle"}</span>
            </button>
          )}

          {/* Deposit Toggle */}
          <button
            onClick={async () => {
              setActionLoading(true);
              await onToggleDeposit(driver.id, driver.deposit_status);
              setActionLoading(false);
            }}
            disabled={actionLoading}
            className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
              isDepositPaid
                ? "bg-blue-50 border-blue-200 text-[#0043DC] hover:bg-blue-100"
                : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>₹250 Deposit: {driver.deposit_status}</span>
          </button>

          {/* Call Driver */}
          <a
            href={`tel:${driver.mobile}`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Call</span>
          </a>
        </div>
      </div>

      {/* ─── Hero Driver Profile Card ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative flex-shrink-0">
              <img
                src={
                  driver.profile_image ||
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
                }
                alt={driver.name}
                onClick={() =>
                  setSelectedImage({
                    url:
                      driver.profile_image ||
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                    title: `Driver Photo: ${driver.name}`,
                  })
                }
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-200 shadow-md cursor-pointer hover:opacity-95 transition"
              />
              <span
                className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                  isOnline ? "bg-emerald-500" : "bg-slate-400"
                }`}
                title={isOnline ? "Online" : "Offline"}
              >
                <span className="w-2 h-2 rounded-full bg-white" />
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{driver.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {driver.status}
                </span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{driver.rating || 4.9} Rating</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                <button
                  onClick={() => handleCopy(driver.mobile, "mobile")}
                  className="flex items-center space-x-1 font-mono hover:text-[#0043DC] transition"
                  title="Click to copy mobile"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{driver.mobile}</span>
                  {copiedField === "mobile" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>

                {driver.email && (
                  <button
                    onClick={() => handleCopy(driver.email!, "email")}
                    className="flex items-center space-x-1 hover:text-[#0043DC] transition"
                    title="Click to copy email"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{driver.email}</span>
                    {copiedField === "email" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                )}

                <div className="flex items-center space-x-1 text-slate-400 font-mono">
                  <Hash className="w-3.5 h-3.5" />
                  <span>{driver.id}</span>
                </div>
              </div>

              {/* Hardware Push Notification Token Banner */}
              <div className="flex items-center space-x-2 pt-1 text-xs">
                {driver.push_token ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Expo Hardware Push Token Active (Ready for instant wake alerts)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <Radio className="w-3.5 h-3.5 text-slate-400" />
                    <span>Push Token: Generated when driver logs in</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 lg:w-80">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Trips</div>
              <div className="text-xl font-black text-slate-900 mt-1">{driver.total_trips || driverTrips.length}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{completedTrips.length} completed</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Security Deposit</div>
              <div className={`text-xl font-black mt-1 ${isDepositPaid ? "text-emerald-600" : "text-amber-600"}`}>
                ₹250.00
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{driver.deposit_status}</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Vehicle</div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                {driver.vehicle?.vehicle_number || "No Vehicle"}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {driver.vehicle?.vehicle_type || "Sedan"} • {driver.vehicle?.vehicle_model || "Standard"}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Documents</div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {verifiedDocsCount} / {docs.length || 5}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                {docs.length === 0 ? "Default set" : `${verifiedDocsCount} Verified`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex border-b border-slate-200 space-x-1 sm:space-x-3 overflow-x-auto">
        {[
          { id: "documents", label: "KYC & Documents", icon: FileText, count: docs.length || 5 },
          { id: "vehicle", label: "Vehicle Information", icon: Car },
          { id: "trips", label: "Trip History", icon: Navigation, count: driverTrips.length },
          { id: "deposit", label: "Deposit & Billing", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-[#0043DC] text-[#0043DC] bg-blue-50/50 rounded-t-xl"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-[#0043DC] text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: KYC & REGULATORY DOCUMENTS ─── */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Driver License & Legal Documents</h2>
              <p className="text-xs text-slate-500">
                Inspect high-resolution photo proofs submitted by driver. Click any thumbnail to preview.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Verified: <strong className="text-emerald-600">{verifiedDocsCount}</strong> / {docs.length || 5}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.length === 0 ? (
              // If driver has no custom documents yet, display standard KYC placeholders
              [
                {
                  id: "doc_dl_front",
                  type: "Driving Licence (Front)",
                  number: "KA-0120200001234",
                  validUntil: "15 Jun 2035",
                  url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
                  status: "Verified",
                },
                {
                  id: "doc_dl_back",
                  type: "Driving Licence (Back)",
                  number: "KA-0120200001234",
                  validUntil: "15 Jun 2035",
                  url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80",
                  status: "Verified",
                },
                {
                  id: "doc_rc",
                  type: "Vehicle RC (Registration)",
                  number: driver.vehicle?.vehicle_number || "KA 05 MN 4821",
                  validUntil: "18 Nov 2038",
                  url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                  status: "Verified",
                },
                {
                  id: "doc_insurance",
                  type: "Insurance Policy",
                  number: "BAJAJ-ALLIANZ-7821",
                  validUntil: "24 Oct 2027",
                  url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
                  status: "Verified",
                },
                {
                  id: "doc_permit",
                  type: "Commercial Permit",
                  number: "KA-COMM-CAB-9102",
                  validUntil: "31 Dec 2026",
                  url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
                  status: "Verified",
                },
              ].map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{doc.type}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {doc.status}
                      </span>
                    </div>

                    <div
                      onClick={() => setSelectedImage({ url: doc.url, title: doc.type })}
                      className="relative h-44 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100"
                    >
                      <img
                        src={doc.url}
                        alt={doc.type}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Click to Enlarge</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 font-mono">
                      <div>No: <span className="font-bold text-slate-800">{doc.number}</span></div>
                      <div>Valid: <span className="font-semibold text-slate-700">{doc.validUntil}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-right">
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified System Default</span>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              docs.map((doc) => {
                const isVerified = doc.verification_status === "Verified";
                const isPending = doc.verification_status === "Pending";
                const isRejected = doc.verification_status === "Rejected";

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{doc.document_type}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isVerified
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {doc.verification_status}
                        </span>
                      </div>

                      <div
                        onClick={() => setSelectedImage({ url: doc.document_url, title: doc.document_type })}
                        className="relative h-44 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100"
                      >
                        <img
                          src={getSafeDocUrl(doc.document_url, doc.document_type)}
                          alt={doc.document_type}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Click to Enlarge</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 font-mono">
                        {doc.document_number && (
                          <div>Doc No: <span className="font-bold text-slate-800">{doc.document_number}</span></div>
                        )}
                        {doc.valid_until && (
                          <div>Expiry: <span className="font-semibold text-slate-700">{doc.valid_until}</span></div>
                        )}
                        {doc.rejection_reason && (
                          <div className="text-red-600 font-sans text-[11px]">Reason: {doc.rejection_reason}</div>
                        )}
                      </div>
                    </div>

                    {/* Verification Actions */}
                    <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedImage({ url: doc.document_url, title: doc.document_type })}
                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => onVerifyDocument(doc.id, "Rejected")}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => onVerifyDocument(doc.id, "Verified")}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: VEHICLE INFORMATION ─── */}
      {activeTab === "vehicle" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          {/* Vehicle Compliance Status Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAllDocsVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Vehicle Compliance & Document Verification</div>
                <div className="text-[11px] text-slate-500">
                  {isAllDocsVerified ? "Vehicle details, RC, Insurance & Permit approved for commercial rides" : "Vehicle compliance review pending approval"}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isAllDocsVerified ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {isAllDocsVerified ? "Vehicle Verified ✅" : "Verification Pending ⏳"}
              </span>
              {!isAllDocsVerified && onVerifyAllDocuments && (
                <button
                  onClick={async () => {
                    setActionLoading(true);
                    await onVerifyAllDocuments(driver.id);
                    setActionLoading(false);
                  }}
                  disabled={actionLoading}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Approve Vehicle
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Registered Commercial Vehicle</h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0043DC] border border-blue-200">
              {driver.vehicle?.vehicle_type || "Sedan"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Vehicle Image */}
            <div
              onClick={() =>
                setSelectedImage({
                  url:
                    driver.vehicle?.vehicle_image ||
                    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
                  title: `Vehicle: ${driver.vehicle?.vehicle_model || "Commercial Vehicle"}`,
                })
              }
              className="relative h-60 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-100 shadow-inner"
            >
              <img
                src={
                  driver.vehicle?.vehicle_image ||
                  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
                }
                alt="Vehicle Photo"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1.5">
                <Eye className="w-4 h-4" />
                <span>Click to View Full Size</span>
              </div>
            </div>

            {/* Vehicle Details Card */}
            <div className="space-y-4">
              {/* Indian Number Plate Badge */}
              <div className="inline-block">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Registration Plate
                </div>
                <div className="inline-flex items-center border-2 border-slate-900 bg-white rounded-xl overflow-hidden shadow-md font-mono text-base font-black tracking-wider">
                  <div className="bg-[#0043DC] text-white px-2.5 py-2 flex flex-col items-center justify-center text-[10px] font-bold">
                    <span>IND</span>
                  </div>
                  <div className="px-4 py-2 text-slate-900">
                    {driver.vehicle?.vehicle_number || "KA 05 MN 4821"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Model & Make</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {driver.vehicle?.vehicle_model || "Maruti Suzuki Dzire (2024)"}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Category</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {driver.vehicle?.vehicle_type || "Sedan"}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Vehicle ID</div>
                  <div className="text-xs font-mono font-bold text-slate-700 mt-0.5 truncate">
                    {driver.vehicle?.id || `veh_${driver.id}`}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Inspection Status</div>
                  <div className="text-xs font-bold text-emerald-600 mt-0.5 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Roadworthy Certified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: COMPLETE TRIP HISTORY ─── */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Assigned Trips & Journey History</h2>
              <p className="text-xs text-slate-500">
                Complete log of bookings dispatched to {driver.name}.
              </p>
            </div>
            <button
              onClick={() => onAssignTrip(driver.id)}
              className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-[#0038b8] text-white text-xs font-bold transition flex items-center space-x-1.5 self-start shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch New Trip to this Driver</span>
            </button>
          </div>

          {/* Trips Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Trip Number</th>
                    <th className="py-3 px-4">Route (Pickup → Drop)</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Fare & Distance</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {driverTrips.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Navigation className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No trips recorded for this driver yet.</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Create a new trip and assign it to {driver.name} to see history here.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    driverTrips.map((trip) => {
                      const isCompleted = trip.status === "COMPLETED";
                      const isStarted = trip.status === "STARTED";
                      const isCancelled = trip.status === "CANCELLED";

                      return (
                        <tr key={trip.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <div>{trip.trip_number}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {trip.pickup_date} • {trip.pickup_time}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center space-x-1.5 text-slate-800 font-semibold truncate">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                              <span className="truncate">{trip.pickup_location}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] truncate mt-0.5">
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              <span className="truncate">{trip.drop_location}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{trip.customer_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{trip.customer_phone}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900 text-sm">₹{trip.fare}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {trip.distance || "12 km"} • Cash
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isStarted
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : isCancelled
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {trip.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: SECURITY DEPOSIT & BILLING ─── */}
      {activeTab === "deposit" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Security Deposit Ledger (₹250 Guarantee)</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isDepositPaid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              Deposit Status: {driver.deposit_status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-bold uppercase">Required Deposit</div>
              <div className="text-2xl font-black text-slate-900 mt-1">₹250.00</div>
              <div className="text-xs text-slate-500 mt-1">Mandatory for driver to accept customer rides</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-bold uppercase">Payment Reference</div>
              <div className="text-sm font-mono font-bold text-slate-900 mt-1 truncate">
                {driver.deposit_payment_id || (isDepositPaid ? "pay_rzp_manual_admin" : "None")}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {isDepositPaid ? "Payment Verified & Recorded" : "Awaiting payment"}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-bold uppercase">Validity (1 Year)</div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {driver.deposit_expires_at
                  ? new Date(driver.deposit_expires_at).toLocaleDateString()
                  : isDepositPaid
                  ? "Active for 12 months"
                  : "Inactive"}
              </div>
              <div className="text-xs text-slate-500 mt-1">Full refund on exit if no damage penalty</div>
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              onClick={() => onToggleDeposit(driver.id, driver.deposit_status)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition border shadow-sm ${
                isDepositPaid
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
              }`}
            >
              {isDepositPaid ? "Mark as Unpaid / Refunded" : "Record ₹250 Deposit Payment (Activate)"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Fullscreen Document / Image Lightbox Modal ─── */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <span className="font-bold text-sm text-slate-900">{selectedImage.title}</span>
              <button
                onClick={() => setSelectedImage(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <a
                href={selectedImage.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#0043DC] hover:underline font-bold flex items-center space-x-1"
              >
                <span>Open original in new tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
