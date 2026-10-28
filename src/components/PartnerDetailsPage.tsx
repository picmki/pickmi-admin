import React, { useState, useMemo } from "react";
import {
  Play,
  Pause,
  Mic,
  Volume2,
  ArrowLeft,
  Building2,
  Compass,
  Search,
  Car,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  UserCheck,
  X,
  User,
  Edit2,
  Trash2,
  Check,
  CreditCard,
  Hash,
  FileText,
  Navigation,
  Sparkles,
  Award,
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  Trophy,
  ArrowUpRight,
  Send,
  Copy,
  Plus,
  RefreshCw,
  ExternalLink,
  Users
} from "lucide-react";
import type { Partner, PartnerTrip, PartnerIncentive, Driver, TripStatus, VehicleType, TripType, PartnerIncentivePlan } from "../types";
import { IncentiveSetupModal } from "./IncentiveSetupModal";
import { EditPartnerTripModal } from "./EditPartnerTripModal";

interface PartnerDetailsPageProps {
  partner: Partner;
  partnerTrips: PartnerTrip[];
  partnerIncentives: PartnerIncentive[];
  drivers: Driver[];
  onBack: () => void;
  onAssignDriver: (tripId: string, driverId: string) => Promise<void>;
  onUnassignDriver: (tripId: string) => Promise<void>;
  onUpdateTripStatus: (tripId: string, status: TripStatus, driverId?: string | null) => Promise<void>;
  onCreatePartnerTrip: (tripData: Partial<PartnerTrip>) => Promise<void>;
  onUpdatePartnerTrip?: (tripId: string, tripData: Partial<PartnerTrip>) => Promise<void>;
  onDeletePartnerTrip?: (tripId: string) => Promise<void>;
  onSaveIncentivePlan?: (partnerIds: string[], plan: PartnerIncentivePlan, targetTrips: number, rewardAmount: number) => Promise<void>;
  onAwardIncentive: (incentiveData: Partial<PartnerIncentive>) => Promise<void>;
  onApproveIncentive?: (incentiveId: string, notes?: string) => Promise<void>;
  onPayIncentive: (incentiveId: string, reference: string, paymentMethod?: string) => Promise<void>;
  onUpdatePartner: (partnerData: Partial<Partner> & { id: string }) => Promise<void>;
  onUpdatePartnerStatus: (partnerId: string, status: "ACTIVE" | "PENDING" | "SUSPENDED") => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
}

export const PartnerDetailsPage: React.FC<PartnerDetailsPageProps> = ({
  partner,
  partnerTrips,
  partnerIncentives,
  drivers,
  onBack,
  onAssignDriver,
  onUnassignDriver,
  onUpdateTripStatus,
  onCreatePartnerTrip,
  onUpdatePartnerTrip,
  onDeletePartnerTrip,
  onSaveIncentivePlan,
  onAwardIncentive,
  onApproveIncentive,
  onPayIncentive,
  onUpdatePartner,
  onUpdatePartnerStatus,
  onViewDriverDetails,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "trips" | "fleet" | "incentives" | "profile">("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Trips filter state
  const [tripStatusFilter, setTripStatusFilter] = useState<"ALL" | "PENDING_REVIEW" | "VOICE" | "AVAILABLE" | "ASSIGNED" | "COMPLETED">("ALL");
  const [playingTripId, setPlayingTripId] = useState<string | null>(null);
  const [approvingTripId, setApprovingTripId] = useState<string | null>(null);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  const [tripSearchQuery, setTripSearchQuery] = useState("");

  // Modals state
  const [isEditPartnerModalOpen, setIsEditPartnerModalOpen] = useState(false);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [isAwardIncentiveModalOpen, setIsAwardIncentiveModalOpen] = useState(false);
  const [selectedTripForAssign, setSelectedTripForAssign] = useState<PartnerTrip | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [onlyOnlineDrivers, setOnlyOnlineDrivers] = useState(true);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<PartnerTrip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<PartnerTrip | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [selectedIncentiveForPayout, setSelectedIncentiveForPayout] = useState<PartnerIncentive | null>(null);
  const [isIncentiveSetupModalOpen, setIsIncentiveSetupModalOpen] = useState(false);
  const [payoutReferenceInput, setPayoutReferenceInput] = useState("");
  const [payoutMethodInput, setPayoutMethodInput] = useState("UPI");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Edit Partner Form State
  const [editForm, setEditForm] = useState<Partial<Partner>>({
    ...partner,
  });

  // Create Trip Form State
  const [newTripForm, setNewTripForm] = useState<Partial<PartnerTrip>>({
    partner_id: partner.id,
    partner_name: partner.name,
    customer_name: "",
    customer_phone: "",
    pickup_location: "",
    drop_location: "",
    pickup_date: "Today",
    pickup_time: "Now",
    trip_type: "Airport Transfer",
    vehicle_type: "Sedan",
    fare: 1200,
    driver_payout: 1000,
    commission_amount: 200,
    notes: "",
  });

  // Award Incentive Form State
  const [awardForm, setAwardForm] = useState<Partial<PartnerIncentive>>({
    partner_id: partner.id,
    partner_name: partner.name,
    amount: 5000,
    type: "MILESTONE_TARGET",
    title: "100 Trips Target Bonus",
    description: `Performance incentive for ${partner.name}`,
    status: "PAID",
    payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
    payment_method: partner.payout_upi_id ? `UPI (${partner.payout_upi_id})` : "Bank Transfer",
  });

  const handleToggleAudioPlay = (trip: PartnerTrip) => {
    if (playingTripId === trip.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingTripId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audioUrl = trip.audio_base64 || trip.audio_url;

    const playSyntheticAudio = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + (trip.audio_duration || 4));
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (trip.audio_duration || 4));
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        setPlayingTripId(trip.id);
        setTimeout(() => {
          try { osc.stop(); } catch {}
          setPlayingTripId(null);
        }, (trip.audio_duration || 4) * 1000);
      } catch {
        setPlayingTripId(null);
      }
    };

    if (audioUrl && (audioUrl.startsWith("http") || audioUrl.startsWith("blob:") || audioUrl.startsWith("data:"))) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingTripId(null);
      audio.onerror = () => playSyntheticAudio();
      audio.play()
        .then(() => setPlayingTripId(trip.id))
        .catch(() => playSyntheticAudio());
    } else {
      playSyntheticAudio();
    }
  };

  const handleApproveVoiceTrip = async (tripId: string) => {
    try {
      setApprovingTripId(tripId);
      await onUpdateTripStatus(tripId, "AVAILABLE");
    } catch (err: any) {
      alert("Failed to approve trip: " + (err?.message || "Unknown error"));
    } finally {
      setApprovingTripId(null);
    }
  };

  const handleRejectVoiceTrip = async (tripId: string) => {
    if (window.confirm("Are you sure you want to reject this voice trip?")) {
      await onUpdateTripStatus(tripId, "CANCELLED");
    }
  };

  // Partner's specific trips
  const partnerTripsList = useMemo(() => {
    return partnerTrips.filter((t) => t.partner_id === partner.id);
  }, [partnerTrips, partner.id]);

  // Partner's specific incentives
  const partnerIncentivesList = useMemo(() => {
    return partnerIncentives.filter((i) => i.partner_id === partner.id);
  }, [partnerIncentives, partner.id]);

  // Filtered trips for this partner
  const filteredPartnerTrips = useMemo(() => {
    return partnerTripsList.filter((t) => {
      const q = tripSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.trip_number.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.customer_phone.toLowerCase().includes(q) ||
        t.pickup_location.toLowerCase().includes(q) ||
        t.drop_location.toLowerCase().includes(q);

      let matchesStatus = true;
      if (tripStatusFilter === "PENDING_REVIEW") {
        matchesStatus = t.status === "PENDING_REVIEW";
      } else if (tripStatusFilter === "VOICE") {
        matchesStatus = t.created_method === "voice";
      } else if (tripStatusFilter === "AVAILABLE") {
        matchesStatus = t.status === "AVAILABLE";
      } else if (tripStatusFilter === "ASSIGNED") {
        matchesStatus = ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "STARTED"].includes(t.status);
      } else if (tripStatusFilter === "COMPLETED") {
        matchesStatus = t.status === "COMPLETED";
      }

      return matchesSearch && matchesStatus;
    });
  }, [partnerTripsList, tripSearchQuery, tripStatusFilter]);

  // Filtered drivers for assign modal
  const filteredDriversForAssignment = useMemo(() => {
    return drivers.filter((d) => {
      const q = driverSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.mobile.toLowerCase().includes(q) ||
        (d.vehicle?.vehicle_number || "").toLowerCase().includes(q) ||
        (d.vehicle?.vehicle_model || "").toLowerCase().includes(q);

      const matchesOnline = !onlyOnlineDrivers || d.online_status === "ONLINE";
      return matchesSearch && matchesOnline;
    });
  }, [drivers, driverSearchQuery, onlyOnlineDrivers]);

  // Partner metrics calculations
  const totalPartnerTripsCount = partnerTripsList.length;
  const availableTripsCount = partnerTripsList.filter((t) => t.status === "AVAILABLE").length;
  const inProgressTripsCount = partnerTripsList.filter((t) => ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "STARTED"].includes(t.status)).length;
  const completedTripsCount = partnerTripsList.filter((t) => t.status === "COMPLETED").length;

  const totalGrossRevenue = partnerTripsList.reduce((sum, t) => sum + (t.fare || 0), 0) || partner.total_revenue || 0;
  const totalCommissionEarned = Math.round(totalGrossRevenue * ((partner.commission_rate || 12) / 100));
  const totalDriverPayoutsDisbursed = partnerTripsList.reduce((sum, t) => sum + (t.driver_payout || 0), 0);

  const totalIncentiveEarned = partnerIncentivesList.reduce((sum, i) => sum + (i.amount || 0), 0) || partner.incentive_earned || 0;
  const totalIncentivePaid = partnerIncentivesList.filter((i) => i.status === "PAID").reduce((sum, i) => sum + (i.amount || 0), 0) || partner.incentive_paid || 0;
  const totalIncentivePending = partnerIncentivesList.filter((i) => i.status === "PENDING").reduce((sum, i) => sum + (i.amount || 0), 0) || partner.incentive_pending || 0;

  const targetTrips = partner.incentive_target_trips || 100;
  const currentTrips = partner.current_cycle_trips || totalPartnerTripsCount;
  const targetProgressPct = Math.min(100, Math.round((currentTrips / targetTrips) * 100));

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handle confirm assign driver
  const handleConfirmAssignDriver = async () => {
    if (!selectedTripForAssign || !selectedDriverId) return;
    try {
      setIsAssigningDriver(true);
      await onAssignDriver(selectedTripForAssign.id, selectedDriverId);
      setSelectedTripForAssign(null);
      setSelectedDriverId("");
    } catch (err) {
      console.error("Assignment failed:", err);
      alert("Failed to assign driver. Please try again.");
    } finally {
      setIsAssigningDriver(false);
    }
  };

  // Handle edit partner submit
  const handleEditPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePartner({
      ...editForm,
      id: partner.id,
    });
    setIsEditPartnerModalOpen(false);
  };

  // Handle create trip submit
  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripForm.pickup_location || !newTripForm.drop_location) {
      alert("Please provide pickup and drop locations.");
      return;
    }

    await onCreatePartnerTrip({
      ...newTripForm,
      partner_id: partner.id,
      partner_name: partner.name,
      status: "AVAILABLE",
    });

    setIsCreateTripModalOpen(false);
    setNewTripForm({
      partner_id: partner.id,
      partner_name: partner.name,
      customer_name: "",
      customer_phone: "",
      pickup_location: "",
      drop_location: "",
      pickup_date: "Today",
      pickup_time: "Now",
      trip_type: "Airport Transfer",
      vehicle_type: "Sedan",
      fare: 1200,
      driver_payout: 1000,
      commission_amount: 200,
      notes: "",
    });
  };

  // Handle award incentive submit
  const handleAwardIncentiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAwardIncentive({
      ...awardForm,
      partner_id: partner.id,
      partner_name: partner.name,
    });
    setIsAwardIncentiveModalOpen(false);
  };

  // Handle execute payout
  const handleExecutePayout = async () => {
    if (!selectedIncentiveForPayout) return;
    try {
      setIsProcessingPayout(true);
      const ref = payoutReferenceInput.trim() || ("UPI_PAY_" + Math.floor(100000 + Math.random() * 900000));
      await onPayIncentive(selectedIncentiveForPayout.id, ref, payoutMethodInput);
      setSelectedIncentiveForPayout(null);
      setPayoutReferenceInput("");
    } catch (err) {
      console.error("Payout failed:", err);
      alert("Failed to release payout.");
    } finally {
      setIsProcessingPayout(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* ======================================================== */}
      {/* 1. TOP BREADCRUMB & BACK ACTION                          */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-[#0043DC] bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs transition group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Partner Directory</span>
        </button>

        <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
          <span>Partner Directory</span>
          <span>/</span>
          <span className="font-bold text-slate-800">{partner.name}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PARTNER & AGENCY HERO PROFILE BANNER                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative gradient background ring */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4">
            {/* Agency Logo / Initials Badge */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-[#0043DC] to-blue-500 text-white font-black flex items-center justify-center text-xl shadow-lg shadow-[#0043DC]/25 shrink-0">
              {partner.name.substring(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  {partner.name}
                </h1>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                    partner.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : partner.status === "PENDING"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {partner.status}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0043DC] text-[11px] font-bold">
                  Verified Fleet Agency
                </span>
              </div>

              {/* Contact and Location pills */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
                <span className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-[#0043DC]" />
                  <strong className="text-slate-800">{partner.contact_person}</strong> (Owner / Director)
                </span>
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{partner.city || "Bengaluru"}</span>
                </span>
                <span className="flex items-center space-x-1 text-slate-800 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{partner.rating?.toFixed(1) || "5.0"} Rating</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: {partner.id}
                </span>
              </div>

              {/* Direct phone and email links */}
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                <a
                  href={`tel:${partner.mobile}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center space-x-1.5 transition"
                >
                  <Phone className="w-3 h-3 text-[#0043DC]" />
                  <span>{partner.mobile}</span>
                </a>
                <a
                  href={`mailto:${partner.email}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center space-x-1.5 transition"
                >
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{partner.email}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setNewTripForm({
                  partner_id: partner.id,
                  partner_name: partner.name,
                  customer_name: "",
                  customer_phone: "",
                  pickup_location: "",
                  drop_location: "",
                  pickup_date: "Today",
                  pickup_time: "Now",
                  trip_type: "Airport Transfer",
                  vehicle_type: "Sedan",
                  fare: 1200,
                  driver_payout: 1000,
                  commission_amount: 200,
                  notes: "",
                });
                setIsCreateTripModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition shadow-md shadow-[#0043DC]/20 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch Trip</span>
            </button>

            <button
              onClick={() => {
                setAwardForm({
                  partner_id: partner.id,
                  partner_name: partner.name,
                  amount: 5000,
                  type: "MILESTONE_TARGET",
                  title: "100 Trips Milestone Target Bonus",
                  description: `Performance incentive reward for ${partner.name}`,
                  status: "PAID",
                  payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
                  payment_method: partner.payout_upi_id ? `UPI (${partner.payout_upi_id})` : "Bank Transfer",
                });
                setIsAwardIncentiveModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-md shadow-amber-500/20 flex items-center space-x-2"
            >
              <Award className="w-4 h-4" />
              <span>Award Incentive</span>
            </button>

            <button
              onClick={() => {
                setEditForm({ ...partner });
                setIsEditPartnerModalOpen(true);
              }}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
              title="Edit Partner Agency Info"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {partner.status === "PENDING" ? (
              <button
                onClick={() => onUpdatePartnerStatus(partner.id, "ACTIVE")}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center space-x-1.5 shadow-sm"
                title="Approve Partner Account"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Partner</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const nextStatus = partner.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                  onUpdatePartnerStatus(partner.id, nextStatus);
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border transition ${
                  partner.status === "ACTIVE"
                    ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                {partner.status === "ACTIVE" ? "Suspend Partner" : "Activate Partner"}
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. MINI DASHBOARD METRICS FOR THIS SPECIFIC PARTNER      */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-6 mt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Dispatched
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {totalPartnerTripsCount} Trips
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {completedTripsCount} fulfilled
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Gross Volume
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              ₹{totalGrossRevenue.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Total booking value
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Platform Fee ({partner.commission_rate || 12}%)
            </div>
            <div className="text-xl font-black text-[#0043DC] mt-0.5">
              ₹{totalCommissionEarned.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Platform revenue
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/80">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
              Incentives Earned
            </div>
            <div className="text-xl font-black text-amber-900 mt-0.5">
              ₹{totalIncentiveEarned.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-amber-700 font-bold mt-0.5">
              ₹{totalIncentivePaid.toLocaleString("en-IN")} paid out
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Fleet Capacity
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {partner.fleet_size} Cabs
            </div>
            <div className="text-[10px] text-[#0043DC] font-semibold mt-0.5">
              Registered fleet
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Fulfillment Rate
            </div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              98.4%
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              High service level
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center space-x-2 pt-6 mt-6 border-t border-slate-100 overflow-x-auto">
          {[
            { id: "overview", label: "Mini Dashboard & Overview", icon: TrendingUp },
            { id: "trips", label: `Trips & Dispatch (${partnerTripsList.length})`, icon: Compass },
            { id: "fleet", label: `Fleet Roster (${partner.fleet_size} Cabs)`, icon: Car },
            { id: "incentives", label: `Incentives & Payouts (₹${(totalIncentiveEarned/1000).toFixed(0)}k)`, icon: Award },
            { id: "profile", label: "Agency Profile & Bank Info", icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center space-x-2 whitespace-nowrap ${
                  isActive
                    ? "bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SUB-TAB VIEW 1: MINI DASHBOARD & OVERVIEW             */}
      {/* ======================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Target Milestone & Goal Card (7 cols) */}
            <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Monthly Milestone Target & Performance
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Cycle status towards the next incentive milestone tier.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                  {targetProgressPct >= 100 ? "Milestone Unlocked! 🎉" : `${targetProgressPct}% Achieved`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">
                    Trips Completed: <strong>{currentTrips}</strong> of {targetTrips} Goal
                  </span>
                  <span className="text-[#0043DC] font-black">
                    {Math.max(0, targetTrips - currentTrips)} trips to go
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      targetProgressPct >= 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-[#0043DC]"
                    }`}
                    style={{ width: `${targetProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Tier breakdown cards */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Available Dispatch</span>
                  <div className="text-lg font-black text-emerald-600">{availableTripsCount}</div>
                  <div className="text-[10px] text-slate-400">Ready for chauffeurs</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">In Transit / Running</span>
                  <div className="text-lg font-black text-blue-600">{inProgressTripsCount}</div>
                  <div className="text-[10px] text-slate-400">Active on road</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Fulfilled Bookings</span>
                  <div className="text-lg font-black text-slate-900">{completedTripsCount}</div>
                  <div className="text-[10px] text-slate-400">Successfully closed</div>
                </div>
              </div>
            </div>

            {/* Commercials & Payout Card (5 cols) */}
            <div className="md:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0043DC] flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Commercials & Banking
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Registered settlement routes and financial agreement.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Agreement Commission:</span>
                    <strong className="text-slate-900 font-extrabold text-sm">{partner.commission_rate || 12}%</strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Payout UPI ID:</span>
                    <div className="flex items-center space-x-1 font-mono font-bold text-slate-800">
                      <span>{partner.payout_upi_id || "None"}</span>
                      {partner.payout_upi_id && (
                        <button
                          onClick={() => handleCopy(partner.payout_upi_id || "", "upi")}
                          className="p-1 text-slate-400 hover:text-[#0043DC]"
                          title="Copy UPI ID"
                        >
                          {copiedField === "upi" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Bank IFSC:</span>
                    <div className="flex items-center space-x-1 font-mono font-bold text-slate-800">
                      <span>{partner.bank_ifsc || "None"}</span>
                      {partner.bank_ifsc && (
                        <button
                          onClick={() => handleCopy(partner.bank_ifsc || "", "ifsc")}
                          className="p-1 text-slate-400 hover:text-[#0043DC]"
                          title="Copy IFSC"
                        >
                          {copiedField === "ifsc" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Account:</span>
                <span className="font-mono font-bold text-slate-800">{partner.bank_account_number || "Not on file"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUB-TAB VIEW 2: TRIPS & DISPATCH                      */}
      {/* ======================================================== */}
      {activeTab === "trips" && (
        <div className="space-y-6">
          {/* Top Filter and Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search partner bookings by trip #, customer name, route..."
                value={tripSearchQuery}
                onChange={(e) => setTripSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  { key: "ALL", label: `All (${partnerTripsList.length})` },
                  { key: "PENDING_REVIEW", label: `Pending Review (${partnerTripsList.filter((t) => t.status === "PENDING_REVIEW").length})`, highlight: "amber" },
                  { key: "VOICE", label: `🎙 Voice (${partnerTripsList.filter((t) => t.created_method === "voice").length})`, highlight: "indigo" },
                  { key: "AVAILABLE", label: `Available (${availableTripsCount})`, highlight: "emerald" },
                  { key: "ASSIGNED", label: "Assigned" },
                  { key: "COMPLETED", label: "Completed" },
                ] as Array<{ key: any; label: string; highlight?: string }>).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTripStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    tripStatusFilter === tab.key
                      ? tab.highlight === "amber"
                        ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-300"
                        : tab.highlight === "emerald"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : tab.highlight === "indigo"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-900 text-white"
                      : tab.key === "PENDING_REVIEW" && partnerTripsList.some((t) => t.status === "PENDING_REVIEW")
                      ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200/80"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                onClick={() => {
                  setNewTripForm({
                    partner_id: partner.id,
                    partner_name: partner.name,
                    customer_name: "",
                    customer_phone: "",
                    pickup_location: "",
                    drop_location: "",
                    pickup_date: "Today",
                    pickup_time: "Now",
                    trip_type: "Airport Transfer",
                    vehicle_type: "Sedan",
                    fare: 1200,
                    driver_payout: 1000,
                    commission_amount: 200,
                    notes: "",
                  });
                  setIsCreateTripModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#0043DC] text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-[#0043DC]/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Trip</span>
              </button>
            </div>
          </div>

          {/* Trips List */}
          <div className="space-y-4">
            {filteredPartnerTrips.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 font-medium">
                No trips found for {partner.name} matching your filter.
              </div>
            ) : (
              filteredPartnerTrips.map((trip) => {
                const assignedDriver =
                  trip.driver || drivers.find((d) => d.id === trip.assigned_driver_id);
                const isVoiceTrip = trip.created_method === "voice" || Boolean(trip.notes?.toLowerCase().includes("voice"));
                const isPendingReview = trip.status === "PENDING_REVIEW";
                const isAvailable = trip.status === "AVAILABLE";

                return (
                  <div
                    key={trip.id}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-xs space-y-4 ${
                      isPendingReview
                        ? "border-amber-300 ring-2 ring-amber-100 hover:shadow-md"
                        : isAvailable
                        ? "border-emerald-300 ring-2 ring-emerald-100/80 hover:shadow-md"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {trip.trip_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {trip.trip_type}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0043DC] text-[11px] font-bold">
                          {trip.vehicle_type}
                        </span>

                        {/* Method: Voice vs Manual */}
                        {isVoiceTrip ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
                            <Mic className="w-3 h-3 text-indigo-600" />
                            <span>Voice Recording</span>
                            {trip.audio_duration ? <span className="opacity-75 font-mono">({trip.audio_duration}s)</span> : null}
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-semibold">
                            <span>✍️ Manual Entry</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                            isPendingReview
                              ? "bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-100"
                              : isAvailable
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : trip.status === "ASSIGNED"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : trip.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : trip.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPendingReview
                                ? "bg-amber-500 animate-ping"
                                : isAvailable
                                ? "bg-emerald-500 animate-ping"
                                : trip.status === "ASSIGNED"
                                ? "bg-blue-500"
                                : trip.status === "COMPLETED"
                                ? "bg-emerald-500"
                                : "bg-indigo-500"
                            }`}
                          />
                          <span>{isPendingReview ? "Pending Approval" : trip.status}</span>
                        </span>

                        <div className="text-xs font-bold text-slate-500 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{trip.pickup_date} · {trip.pickup_time}</span>
                        </div>

                        <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                          <button
                            type="button"
                            onClick={() => setTripToEdit(trip)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-[#0043DC] transition"
                            title="Edit Trip Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTripToDelete(trip)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 transition"
                            title="Delete Trip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Route and Commercials */}
                    {isVoiceTrip ? (
                      /* Dedicated Voice Trip View: Voice Player + Created Info + Admin Approval (No Pickup/Drop Details) */
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Voice Recording Player & Creation Info */}
                        <div className="md:col-span-7 space-y-2.5">
                          {/* Audio Player Box */}
                          <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/40 p-3 rounded-xl border border-blue-200/90 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center space-x-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleAudioPlay(trip)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition shadow-xs ${
                                  playingTripId === trip.id
                                    ? "bg-rose-600 text-white animate-pulse"
                                    : "bg-[#0043DC] hover:bg-blue-700 text-white"
                                }`}
                                title={playingTripId === trip.id ? "Pause recording" : "Listen to Voice Recording"}
                              >
                                {playingTripId === trip.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5 fill-current" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-black text-slate-800 truncate">
                                    Voice Recording Dispatch
                                  </span>
                                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#0043DC] px-1.5 py-0.5 rounded shrink-0">
                                    00:{String(trip.audio_duration || 4).padStart(2, "0")}
                                  </span>
                                </div>
                                <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                                  {playingTripId === trip.id ? "Playing customer audio..." : "Tap play to listen to audio booking"}
                                </div>
                              </div>
                            </div>

                            {/* Mini waveform bars */}
                            <div className="flex items-center space-x-1 shrink-0 pr-1">
                              {[12, 22, 16, 26, 18, 24, 14, 28, 20].map((h, idx) => (
                                <span
                                  key={idx}
                                  className={`w-0.5 rounded-full transition-all duration-200 ${
                                    playingTripId === trip.id
                                      ? "bg-[#0043DC] animate-pulse"
                                      : "bg-blue-300"
                                  }`}
                                  style={{
                                    height: playingTripId === trip.id ? `${h}px` : `${Math.round(h * 0.45)}px`,
                                    animationDelay: `${idx * 80}ms`
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Created info when user created that trip */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                            <div className="flex items-center space-x-1 font-bold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[11px] text-slate-500 font-semibold">Created:</span>
                              <span className="text-slate-900 font-black text-xs">
                                {trip.trip_date || trip.pickup_date} · {trip.trip_time || trip.pickup_time || "Recent"}
                              </span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center space-x-1 font-medium text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[11px] text-slate-500">Partner:</span>
                              <span className="font-extrabold text-[#0043DC] text-xs">
                                {partner.name || trip.partner_travel_name || trip.partner_name || "Pickmi Fleet"}
                              </span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              🎙 Voice Only Booking
                            </span>
                          </div>
                        </div>

                        {/* Approval Action & Status */}
                        <div className="md:col-span-5 bg-slate-50 rounded-xl p-3 border border-slate-200/70 flex flex-col justify-center">
                          {isPendingReview ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleApproveVoiceTrip(trip.id)}
                                  disabled={approvingTripId === trip.id}
                                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
                                >
                                  {approvingTripId === trip.id ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>Approving...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      <span>✓ Approve Voice Trip</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectVoiceTrip(trip.id)}
                                  className="py-2 px-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center justify-center"
                                  title="Reject Voice Trip"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-[10px] text-amber-700 font-semibold text-center bg-amber-50 border border-amber-200/60 rounded-md py-1 px-1.5 flex items-center justify-center space-x-1">
                                <AlertCircle className="w-3 h-3 shrink-0 text-amber-600" />
                                <span>Voice dispatch requires admin review before driver assignment</span>
                              </div>
                            </div>
                          ) : isAvailable ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-black border border-amber-200">
                                  ⏳ Waiting for Driver
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700">✓ Approved</span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedTripForAssign(trip);
                                  setSelectedDriverId("");
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-extrabold transition shadow-md shadow-[#0043DC]/20 flex items-center justify-center space-x-1.5"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Assign Driver to Trip</span>
                              </button>
                            </div>
                          ) : assignedDriver ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 text-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="font-bold text-slate-900">{assignedDriver.name}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setSelectedTripForAssign(trip);
                                    setSelectedDriverId(assignedDriver.id);
                                  }}
                                  className="text-[10px] font-bold text-[#0043DC] bg-blue-50 px-2 py-1 rounded"
                                >
                                  Reassign
                                </button>
                                <button
                                  onClick={() => onUnassignDriver(trip.id)}
                                  className="text-[10px] text-rose-600 hover:bg-rose-50 p-1 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedTripForAssign(trip);
                                setSelectedDriverId("");
                              }}
                              className="w-full py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
                            >
                              Assign Driver
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Manual Trip Layout: Route and Commercials */
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5 space-y-2">
                          <div className="flex items-start space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Pickup
                              </div>
                              <div className="text-xs font-bold text-slate-800 leading-tight">
                                {trip.pickup_location}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Drop
                              </div>
                              <div className="text-xs font-bold text-slate-800 leading-tight">
                                {trip.drop_location}
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-600">Manual Trip:</span>
                            <span className="truncate">{trip.notes || "Direct manual dispatch entry"}</span>
                          </div>
                        </div>

                        <div className="md:col-span-3 space-y-1.5 border-l border-slate-100 pl-3">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Passenger
                          </div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {trip.customer_name}
                          </div>
                          <a
                            href={`tel:${trip.customer_phone}`}
                            className="text-[11px] text-[#0043DC] font-semibold hover:underline flex items-center space-x-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{trip.customer_phone}</span>
                          </a>
                        </div>

                        <div className="md:col-span-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Fare</div>
                              <div className="text-sm font-black text-slate-900">₹{trip.fare}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Payout</div>
                              <div className="text-sm font-black text-emerald-700">₹{trip.driver_payout}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-blue-600 font-bold uppercase">Fee</div>
                              <div className="text-sm font-black text-[#0043DC]">₹{trip.commission_amount}</div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-200/60">
                            {isAvailable ? (
                              <button
                                onClick={() => {
                                  setSelectedTripForAssign(trip);
                                  setSelectedDriverId("");
                                }}
                                className="w-full py-2 px-3 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-extrabold transition shadow-md shadow-[#0043DC]/20 flex items-center justify-center space-x-1.5"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Assign Driver to Trip</span>
                              </button>
                            ) : assignedDriver ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 text-xs">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="font-bold text-slate-900">{assignedDriver.name}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => {
                                      setSelectedTripForAssign(trip);
                                      setSelectedDriverId(assignedDriver.id);
                                    }}
                                    className="text-[10px] font-bold text-[#0043DC] bg-blue-50 px-2 py-1 rounded"
                                  >
                                    Reassign
                                  </button>
                                  <button
                                    onClick={() => onUnassignDriver(trip.id)}
                                    className="text-[10px] text-rose-600 hover:bg-rose-50 p-1 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTripForAssign(trip);
                                  setSelectedDriverId("");
                                }}
                                className="w-full py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
                              >
                                Assign Driver
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SUB-TAB VIEW 3: FLEET ROSTER                          */}
      {/* ======================================================== */}
      {activeTab === "fleet" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Registered Vehicle Fleet ({partner.fleet_size} Cabs)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Vehicles and models registered under {partner.name}.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-bold text-[#0043DC] bg-blue-50 px-3 py-1.5 rounded-xl">
                <Car className="w-4 h-4" />
                <span>Commercial Permit Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: partner.fleet_size || 5 }).map((_, idx) => {
                const vehicleModels = [
                  { model: "Maruti Suzuki Dzire 2024", type: "Sedan", plate: `KA 01 MJ ${4820 + idx}` },
                  { model: "Toyota Innova Crysta", type: "SUV", plate: `KA 05 AB ${1090 + idx}` },
                  { model: "Tata Tigor EV", type: "EV", plate: `KA 04 KL ${5560 + idx}` },
                  { model: "Hyundai Aura Prime", type: "Prime Sedan", plate: `KA 03 MN ${9940 + idx}` },
                ];
                const veh = vehicleModels[idx % vehicleModels.length];

                return (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-2 hover:border-[#0043DC] transition">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#0043DC] text-[10px] font-black uppercase">
                        {veh.type}
                      </span>
                      <span className="flex items-center space-x-1 text-emerald-600 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    </div>

                    <div className="font-extrabold text-sm text-slate-900">{veh.model}</div>
                    <div className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                      {veh.plate}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SUB-TAB VIEW 4: INCENTIVES & BONUS LEDGER             */}
      {/* ======================================================== */}
      {activeTab === "incentives" && (
        <div className="space-y-6">
          {/* Incentive Summary Banner */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-3xl p-6 shadow-md shadow-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-100">
                Partner Bonus Payouts
              </span>
              <h2 className="text-2xl font-black">
                ₹{totalIncentiveEarned.toLocaleString("en-IN")} Total Incentives Earned
              </h2>
              <p className="text-xs text-amber-100">
                ₹{totalIncentivePaid.toLocaleString("en-IN")} settled · ₹{totalIncentivePending.toLocaleString("en-IN")} pending payout
              </p>
            </div>

            <button
              onClick={() => {
                setAwardForm({
                  partner_id: partner.id,
                  partner_name: partner.name,
                  amount: 5000,
                  type: "MILESTONE_TARGET",
                  title: "Target Milestone Bonus",
                  description: `Incentive reward for ${partner.name}`,
                  status: "PAID",
                  payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
                  payment_method: partner.payout_upi_id ? `UPI (${partner.payout_upi_id})` : "Bank Transfer",
                });
                setIsAwardIncentiveModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-amber-800 hover:bg-amber-50 font-black text-xs transition shadow-md whitespace-nowrap flex items-center space-x-1.5"
            >
              <Award className="w-4 h-4 text-amber-600" />
              <span>Award New Incentive</span>
            </button>
          </div>

          {/* Target Scheme & Multi-Stage Ladder Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <span>{partner.incentive_plan?.cycle_name || "Active Incentive Target Ladder"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0043DC] text-[10px] font-black uppercase">
                      {partner.incentive_plan?.cycle_type || "WEEKLY"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target trips required to unlock bonus payouts for this partner agency
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsIncentiveSetupModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-black text-xs transition shadow-sm flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Target className="w-4 h-4" />
                <span>Customize Incentive Scheme</span>
              </button>
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(partner.incentive_plan?.stages && partner.incentive_plan.stages.length > 0
                ? partner.incentive_plan.stages
                : [
                    { stage: 1, title: "Stage 1 Target", target_trips: partner.incentive_target_trips || 10, reward_amount: partner.incentive_reward_amount || 1000 },
                    { stage: 2, title: "Stage 2 Milestone", target_trips: (partner.incentive_target_trips || 10) * 2, reward_amount: (partner.incentive_reward_amount || 1000) * 2.5 },
                  ]
              ).map((stage, idx) => {
                const partnerTripsCount = partner.current_cycle_trips || partner.total_trips || 0;
                const isCompleted = partnerTripsCount >= stage.target_trips;
                const pct = Math.min(100, Math.round((partnerTripsCount / stage.target_trips) * 100));

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition ${
                      isCompleted
                        ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-slate-50/60 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${isCompleted ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"}`}>
                          {stage.stage}
                        </span>
                        <span className="font-extrabold text-xs text-slate-900">{stage.title}</span>
                      </div>
                      {isCompleted ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Achieved</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-xl font-black text-slate-900">
                        ₹{stage.reward_amount.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">
                        Target: {stage.target_trips} completed trips
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCompleted ? "bg-emerald-500" : "bg-[#0043DC]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incentives Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="p-4">Incentive Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment Reference</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {partnerIncentivesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        No incentive bonuses recorded yet for this partner.
                      </td>
                    </tr>
                  ) : (
                    partnerIncentivesList.map((inc) => {
                      const isPaid = inc.status === "PAID";
                      return (
                        <tr key={inc.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 flex items-center space-x-2">
                              <span>{inc.title}</span>
                              {inc.stage && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold text-[10px]">
                                  Stage {inc.stage}
                                </span>
                              )}
                            </div>
                            {inc.description && (
                              <div className="text-[11px] text-slate-500">{inc.description}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {inc.type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-sm text-slate-900">
                              ₹{inc.amount?.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="p-4">
                            {(() => {
                              const isSettled = inc.status === "PAID" || inc.status === "COMPLETED";
                              const isAppr = inc.status === "APPROVED";
                              const isPend = inc.status === "PENDING";
                              
                              if (isSettled) {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 w-fit bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>COMPLETED</span>
                                  </span>
                                );
                              }
                              if (isAppr) {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 w-fit bg-blue-50 text-blue-700 border border-blue-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span>APPROVED</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 w-fit bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>PENDING APPROVAL</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-[11px] font-bold text-slate-800">
                              {inc.payout_reference || (inc.status === "APPROVED" ? "Awaiting Transfer" : "Pending Approval")}
                            </div>
                            <div className="text-[10px] text-slate-400">{inc.payment_method || "UPI"}</div>
                          </td>
                          <td className="p-4 text-slate-500 text-[11px]">
                            {new Date(inc.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="p-4 text-right">
                            {(() => {
                              const isSettled = inc.status === "PAID" || inc.status === "COMPLETED";
                              const isAppr = inc.status === "APPROVED";
                              const isPend = inc.status === "PENDING";

                              if (isSettled) {
                                return (
                                  <span className="text-[11px] font-extrabold text-emerald-600 flex items-center justify-end space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Settled</span>
                                  </span>
                                );
                              }

                              if (isPend) {
                                return (
                                  <button
                                    onClick={async () => {
                                      if (onApproveIncentive) {
                                        await onApproveIncentive(inc.id, "Verified by Admin");
                                      }
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-[11px] font-extrabold transition shadow-xs flex items-center space-x-1 ml-auto"
                                    title="Approve this payout request"
                                  >
                                    <span>✓ Approve</span>
                                  </button>
                                );
                              }

                              if (isAppr) {
                                return (
                                  <button
                                    onClick={() => {
                                      setSelectedIncentiveForPayout(inc);
                                      setPayoutReferenceInput("UPI_PAY_" + Math.floor(100000 + Math.random() * 900000));
                                      setPayoutMethodInput(partner.payout_upi_id ? `UPI (${partner.payout_upi_id})` : "Bank Transfer");
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition shadow-xs flex items-center space-x-1 ml-auto"
                                    title="Mark payout as complete and release funds"
                                  >
                                    <span>💳 Mark as Complete / Paid</span>
                                  </button>
                                );
                              }

                              return null;
                            })()}
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

      {/* ======================================================== */}
      {/* 8. SUB-TAB VIEW 5: AGENCY PROFILE & BANK INFO            */}
      {/* ======================================================== */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Official Agency Profile & Contract Terms
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Legal entity details, commission terms, and verified banking info.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditForm({ ...partner });
                  setIsEditPartnerModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400">Legal Company Details</span>
                <div className="text-sm font-black text-slate-900">{partner.name}</div>
                <div className="text-slate-600">Managing Director: <strong>{partner.contact_person}</strong></div>
                <div className="text-slate-600">Base City: <strong>{partner.city || "Bengaluru"}</strong></div>
                <div className="text-slate-600">Total Fleet Vehicles: <strong>{partner.fleet_size} Cabs</strong></div>
              </div>

              <div className="p-4 bg-blue-50/70 rounded-2xl space-y-2 border border-blue-100 text-blue-950">
                <span className="text-[10px] font-black uppercase text-blue-700">Contract & Settlement Info</span>
                <div className="text-sm font-black text-[#0043DC]">Platform Commission: {partner.commission_rate || 12}%</div>
                <div>Payout UPI: <strong>{partner.payout_upi_id || "Not configured"}</strong></div>
                <div>Bank Account: <strong>{partner.bank_account_number || "Not configured"}</strong></div>
                <div>Bank IFSC: <strong>{partner.bank_ifsc || "Not configured"}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ASSIGN DRIVER TO PARTNER TRIP                   */}
      {/* ======================================================== */}
      {selectedTripForAssign && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Assign Driver to Trip {selectedTripForAssign.trip_number}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {partner.name} · Required: {selectedTripForAssign.vehicle_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedTripForAssign(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs space-y-1 text-blue-950">
              <div>Passenger: <strong>{selectedTripForAssign.customer_name}</strong> ({selectedTripForAssign.customer_phone})</div>
              <div className="truncate">From: {selectedTripForAssign.pickup_location}</div>
              <div className="truncate">To: {selectedTripForAssign.drop_location}</div>
              <div className="font-bold text-[#0043DC]">Fare: ₹{selectedTripForAssign.fare} · Driver Payout: ₹{selectedTripForAssign.driver_payout}</div>
            </div>

            {/* Driver Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Select Chauffeur</label>
                <label className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyOnlineDrivers}
                    onChange={(e) => setOnlyOnlineDrivers(e.target.checked)}
                    className="rounded text-[#0043DC]"
                  />
                  <span>Online drivers only</span>
                </label>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search driver by name, phone, or plate..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            {/* Drivers list */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {filteredDriversForAssignment.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                const isVehicleMatch = driver.vehicle?.vehicle_type === selectedTripForAssign.vehicle_type;

                return (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected ? "bg-blue-50/80 border-[#0043DC] ring-1 ring-[#0043DC]" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs overflow-hidden">
                          {driver.profile_image ? (
                            <img src={driver.profile_image} alt={driver.name} className="w-full h-full object-cover" />
                          ) : (
                            driver.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span
                          className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute bottom-0 right-0 ${
                            driver.online_status === "ONLINE" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-xs">{driver.name}</span>
                          {isVehicleMatch && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                              Match: {driver.vehicle?.vehicle_type}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {driver.mobile} · {driver.vehicle?.vehicle_number || "No Plate"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{driver.rating?.toFixed(1) || "5.0"}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-[#0043DC] bg-[#0043DC] text-white" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTripForAssign(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDriverId || isAssigningDriver}
                onClick={handleConfirmAssignDriver}
                className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-[#0043DC]/20"
              >
                {isAssigningDriver ? "Dispatching..." : "Confirm & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE TRIP MODAL                               */}
      {/* ======================================================== */}
      {isCreateTripModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Dispatch Trip for {partner.name}
              </h3>
              <button onClick={() => setIsCreateTripModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Passenger Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Passenger Name"
                    value={newTripForm.customer_name || ""}
                    onChange={(e) => setNewTripForm({ ...newTripForm, customer_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Passenger Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 12345"
                    value={newTripForm.customer_phone || ""}
                    onChange={(e) => setNewTripForm({ ...newTripForm, customer_phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pickup Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koramangala, Bengaluru"
                  value={newTripForm.pickup_location || ""}
                  onChange={(e) => setNewTripForm({ ...newTripForm, pickup_location: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Drop Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BLR Airport Terminal 2"
                  value={newTripForm.drop_location || ""}
                  onChange={(e) => setNewTripForm({ ...newTripForm, drop_location: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type</label>
                  <select
                    value={newTripForm.vehicle_type || "Sedan"}
                    onChange={(e) => setNewTripForm({ ...newTripForm, vehicle_type: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="Prime Sedan">Prime Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="EV">EV</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trip Fare (₹)</label>
                  <input
                    type="number"
                    value={newTripForm.fare || 1200}
                    onChange={(e) => {
                      const fare = parseFloat(e.target.value) || 0;
                      setNewTripForm({
                        ...newTripForm,
                        fare,
                        driver_payout: Math.round(fare * 0.85),
                        commission_amount: Math.round(fare * 0.15),
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTripModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] text-white font-extrabold shadow-md shadow-[#0043DC]/20"
                >
                  Create & List Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: AWARD INCENTIVE MODAL                           */}
      {/* ======================================================== */}
      {isAwardIncentiveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Award Incentive to {partner.name}
              </h3>
              <button onClick={() => setIsAwardIncentiveModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAwardIncentiveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Incentive Category</label>
                <select
                  value={awardForm.type || "MILESTONE_TARGET"}
                  onChange={(e) => setAwardForm({ ...awardForm, type: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                >
                  <option value="MILESTONE_TARGET">Milestone Target (Trips)</option>
                  <option value="PEAK_PERFORMANCE">Peak Performance</option>
                  <option value="FLEET_EXPANSION">Fleet Expansion</option>
                  <option value="FESTIVAL_BONUS">Festival Campaign</option>
                  <option value="MANUAL_DISCRETIONARY">Discretionary</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Incentive Amount (₹)</label>
                  <input
                    type="number"
                    min={500}
                    step={100}
                    required
                    value={awardForm.amount || 5000}
                    onChange={(e) => setAwardForm({ ...awardForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={awardForm.status || "PAID"}
                    onChange={(e) => setAwardForm({ ...awardForm, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="PAID">Pay Now (Platform Spend)</option>
                    <option value="PENDING">Mark as Pending Payout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Incentive Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Trips Volume Milestone Bonus"
                  value={awardForm.title || ""}
                  onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAwardIncentiveModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-md shadow-amber-500/20"
                >
                  Award Incentive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: RELEASE PAYOUT MODAL                            */}
      {/* ======================================================== */}
      {selectedIncentiveForPayout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Release Incentive Payout
              </h3>
              <button onClick={() => setSelectedIncentiveForPayout(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl space-y-1 text-xs text-emerald-950">
              <div>Incentive: <strong>{selectedIncentiveForPayout.title}</strong></div>
              <div className="text-base font-black text-emerald-700">₹{selectedIncentiveForPayout.amount}</div>
              <div>Route: <strong>{payoutMethodInput}</strong></div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Bank / UPI Reference</label>
              <input
                type="text"
                value={payoutReferenceInput}
                onChange={(e) => setPayoutReferenceInput(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
              />
            </div>

            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedIncentiveForPayout(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayout}
                onClick={handleExecutePayout}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md shadow-emerald-600/20"
              >
                {isProcessingPayout ? "Releasing..." : "Confirm Released"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: EDIT PARTNER MODAL                              */}
      {/* ======================================================== */}
      {isEditPartnerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Edit Partner Agency Details
              </h3>
              <button onClick={() => setIsEditPartnerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPartnerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Agency Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={editForm.contact_person || ""}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={editForm.mobile || ""}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Base City</label>
                  <input
                    type="text"
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fleet Size</label>
                  <input
                    type="number"
                    value={editForm.fleet_size || 5}
                    onChange={(e) => setEditForm({ ...editForm, fleet_size: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Commission %</label>
                  <input
                    type="number"
                    value={editForm.commission_rate ?? 12}
                    onChange={(e) => setEditForm({ ...editForm, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <span className="font-bold text-slate-800 block">Banking & Payout</span>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block">UPI ID</label>
                  <input
                    type="text"
                    value={editForm.payout_upi_id || ""}
                    onChange={(e) => setEditForm({ ...editForm, payout_upi_id: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Bank Account #</label>
                    <input
                      type="text"
                      value={editForm.bank_account_number || ""}
                      onChange={(e) => setEditForm({ ...editForm, bank_account_number: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Bank IFSC</label>
                    <input
                      type="text"
                      value={editForm.bank_ifsc || ""}
                      onChange={(e) => setEditForm({ ...editForm, bank_ifsc: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPartnerModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] text-white font-extrabold shadow-md shadow-[#0043DC]/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EDIT PARTNER TRIP MODAL
      ───────────────────────────────────────────────────────────── */}
      {tripToEdit && (
        <EditPartnerTripModal
          trip={tripToEdit}
          isOpen={!!tripToEdit}
          partners={[partner]}
          onClose={() => setTripToEdit(null)}
          onSave={async (tripId, updates) => {
            if (onUpdatePartnerTrip) {
              await onUpdatePartnerTrip(tripId, updates);
            }
            setTripToEdit(null);
          }}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          DELETE PARTNER TRIP CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Delete Trip {tripToDelete.trip_number}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently delete this trip assigned to {partner.name}. This action cannot be reversed.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{tripToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="font-bold text-slate-800 truncate max-w-[210px]">
                  {tripToDelete.pickup_location} → {tripToDelete.drop_location}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fare:</span>
                <span className="font-black text-slate-900">₹{tripToDelete.fare}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeletingTrip}
                onClick={() => setTripToDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Keep Trip
              </button>
              <button
                type="button"
                disabled={isDeletingTrip}
                onClick={async () => {
                  try {
                    setIsDeletingTrip(true);
                    if (onDeletePartnerTrip) {
                      await onDeletePartnerTrip(tripToDelete.id);
                    }
                    setTripToDelete(null);
                  } catch (err) {
                    console.error("Delete failed:", err);
                    alert("Failed to delete trip.");
                  } finally {
                    setIsDeletingTrip(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeletingTrip ? 'Deleting...' : 'Yes, Delete Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isIncentiveSetupModalOpen && (
        <IncentiveSetupModal
          isOpen={isIncentiveSetupModalOpen}
          onClose={() => setIsIncentiveSetupModalOpen(false)}
          partners={[partner]}
          selectedPartnerIds={[partner.id]}
          initialPartner={partner}
          onSaveIncentivePlan={async (ids, plan, trips, amt) => {
            if (onSaveIncentivePlan) {
              await onSaveIncentivePlan(ids, plan, trips, amt);
            } else {
              await onUpdatePartner({
                id: partner.id,
                incentive_target_trips: trips,
                incentive_reward_amount: amt,
                incentive_plan: plan,
              });
            }
          }}
        />
      )}
    </div>
  );
};