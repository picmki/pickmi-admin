import React, { useState, useMemo } from "react";
import {
  Play,
  Pause,
  Mic,
  Volume2,
  Building2,
  Car,
  Compass,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Star,
  UserCheck,
  X,
  User,
  ArrowRight,
  Edit2,
  Trash2,
  Check,
  CreditCard,
  Hash,
  FileText,
  Navigation,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Sparkles,
  Award,
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  Trophy,
  ArrowUpRight,
  Send
} from "lucide-react";
import type { Partner, PartnerTrip, PartnerIncentive, Driver, TripStatus, VehicleType, TripType, PartnerIncentivePlan } from "../types";
import { IncentiveSetupModal } from "./IncentiveSetupModal";
import { EditPartnerTripModal } from "./EditPartnerTripModal";

interface PartnersManagerProps {
  partners: Partner[];
  partnerTrips: PartnerTrip[];
  partnerIncentives: PartnerIncentive[];
  drivers: Driver[];
  activeSubTab?: "partners" | "partner-trips" | "partner-incentives";
  onSelectSubTab?: (tab: "partners" | "partner-trips" | "partner-incentives") => void;
  onRefresh: () => void;
  onAssignDriver: (tripId: string, driverId: string) => Promise<void>;
  onUnassignDriver: (tripId: string) => Promise<void>;
  onUpdateTripStatus: (tripId: string, status: TripStatus, driverId?: string | null) => Promise<void>;
  onCreatePartnerTrip: (tripData: Partial<PartnerTrip>) => Promise<void>;
  onUpdatePartnerTrip?: (tripId: string, tripData: Partial<PartnerTrip>) => Promise<void>;
  onDeletePartnerTrip?: (tripId: string) => Promise<void>;
  onCreatePartner: (partnerData: Partial<Partner>) => Promise<void>;
  onUpdatePartner: (partnerData: Partial<Partner> & { id: string }) => Promise<void>;
  onUpdatePartnerStatus: (partnerId: string, status: "ACTIVE" | "PENDING" | "SUSPENDED") => Promise<void>;
  onSaveIncentivePlan?: (partnerIds: string[], plan: PartnerIncentivePlan, targetTrips: number, rewardAmount: number) => Promise<void>;
  onAwardIncentive: (incentiveData: Partial<PartnerIncentive>) => Promise<void>;
  onApproveIncentive?: (incentiveId: string, notes?: string) => Promise<void>;
  onPayIncentive: (incentiveId: string, reference: string, paymentMethod?: string) => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
  onViewPartnerDetails?: (partner: Partner) => void;
}

export const PartnersManager: React.FC<PartnersManagerProps> = ({
  partners,
  partnerTrips,
  partnerIncentives,
  drivers,
  activeSubTab = "partners",
  onSelectSubTab,
  onRefresh,
  onAssignDriver,
  onUnassignDriver,
  onUpdateTripStatus,
  onCreatePartnerTrip,
  onUpdatePartnerTrip,
  onDeletePartnerTrip,
  onCreatePartner,
  onUpdatePartner,
  onUpdatePartnerStatus,
  onSaveIncentivePlan,
  onAwardIncentive,
  onApproveIncentive,
  onPayIncentive,
  onViewDriverDetails,
  onViewPartnerDetails,
}) => {
  const [currentSubTab, setCurrentSubTab] = useState<"partners" | "partner-trips" | "partner-incentives">(activeSubTab);

  React.useEffect(() => {
    if (activeSubTab) {
      setCurrentSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleSubTabChange = (tab: "partners" | "partner-trips" | "partner-incentives") => {
    setCurrentSubTab(tab);
    if (onSelectSubTab) onSelectSubTab(tab);
  };

  // -------------------------------------------------------------
  // PARTNER DIRECTORY STATE & FILTERS
  // -------------------------------------------------------------
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING" | "SUSPENDED">("ALL");
  const [partnerCityFilter, setPartnerCityFilter] = useState<string>("ALL");
  const [selectedPartnerForDetails, setSelectedPartnerForDetails] = useState<Partner | null>(null);
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<Partner | null>(null);

  // Multi-select partners for bulk incentive targets & ladder scheme
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [isIncentiveSetupModalOpen, setIsIncentiveSetupModalOpen] = useState(false);
  const [partnerForIncentiveSetup, setPartnerForIncentiveSetup] = useState<Partner | null>(null);

  const toggleSelectPartner = (pId: string) => {
    setSelectedPartnerIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const toggleSelectAllPartners = () => {
    if (selectedPartnerIds.length === filteredPartners.length && filteredPartners.length > 0) {
      setSelectedPartnerIds([]);
    } else {
      setSelectedPartnerIds(filteredPartners.map((p) => p.id));
    }
  };

  const handleSaveIncentive = async (
    partnerIds: string[],
    plan: PartnerIncentivePlan,
    targetTrips: number,
    rewardAmount: number
  ) => {
    if (onSaveIncentivePlan) {
      await onSaveIncentivePlan(partnerIds, plan, targetTrips, rewardAmount);
    } else {
      for (const id of partnerIds) {
        await onUpdatePartner({
          id,
          incentive_target_trips: targetTrips,
          incentive_reward_amount: rewardAmount,
          incentive_plan: plan,
        });
      }
    }
  };

  // Form state for Partner Create/Edit
  const [partnerForm, setPartnerForm] = useState<Partial<Partner>>({
    name: "",
    contact_person: "",
    mobile: "",
    email: "",
    city: "Bengaluru",
    fleet_size: 5,
    commission_rate: 12,
    payout_upi_id: "",
    bank_account_number: "",
    bank_ifsc: "",
    status: "ACTIVE",
    incentive_target_trips: 100,
  });

  // -------------------------------------------------------------
  // PARTNER TRIPS STATE & FILTERS
  // -------------------------------------------------------------
  const [tripSearchQuery, setTripSearchQuery] = useState("");
  const [tripStatusFilter, setTripStatusFilter] = useState<"ALL" | "PENDING_REVIEW" | "VOICE" | "AVAILABLE" | "ASSIGNED" | "COMPLETED" | "CANCELLED">("ALL");
  const [playingTripId, setPlayingTripId] = useState<string | null>(null);
  const [approvingTripId, setApprovingTripId] = useState<string | null>(null);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  const [selectedVehicleTypeFilter, setSelectedVehicleTypeFilter] = useState<string>("ALL");
  const [selectedTripForAssign, setSelectedTripForAssign] = useState<PartnerTrip | null>(null);
  const [tripToEdit, setTripToEdit] = useState<PartnerTrip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<PartnerTrip | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [onlyOnlineDrivers, setOnlyOnlineDrivers] = useState(true);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

  // Form state for Create Partner Trip
  const [tripForm, setTripForm] = useState<Partial<PartnerTrip>>({
    partner_id: "",
    partner_name: "",
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

  // -------------------------------------------------------------
  // INCENTIVES & SPENDING FLOW STATE & FILTERS
  // -------------------------------------------------------------
  const [incentiveSearchQuery, setIncentiveSearchQuery] = useState("");
  const [incentiveStatusFilter, setIncentiveStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("ALL");
  const [incentiveTypeFilter, setIncentiveTypeFilter] = useState<string>("ALL");
  const [isAwardIncentiveModalOpen, setIsAwardIncentiveModalOpen] = useState(false);
  const [selectedIncentiveForPayout, setSelectedIncentiveForPayout] = useState<PartnerIncentive | null>(null);
  const [payoutReferenceInput, setPayoutReferenceInput] = useState("");
  const [payoutMethodInput, setPayoutMethodInput] = useState("UPI");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Form state for Awarding Incentive
  const [awardForm, setAwardForm] = useState<Partial<PartnerIncentive>>({
    partner_id: "",
    partner_name: "",
    amount: 5000,
    type: "MILESTONE_TARGET",
    title: "",
    description: "",
    status: "PAID",
    payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
    payment_method: "UPI",
  });

  // -------------------------------------------------------------
  // METRICS CALCULATIONS
  // -------------------------------------------------------------
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

  const pendingReviewTripsCount = useMemo(() => {
    return partnerTrips.filter((t) => t.status === "PENDING_REVIEW").length;
  }, [partnerTrips]);

  const voiceTripsCount = useMemo(() => {
    return partnerTrips.filter((t) => t.created_method === "voice").length;
  }, [partnerTrips]);

  const availableTripsCount = useMemo(() => {
    return partnerTrips.filter((t) => t.status === "AVAILABLE").length;
  }, [partnerTrips]);

  const assignedTripsCount = useMemo(() => {
    return partnerTrips.filter((t) => ["ASSIGNED", "ON_THE_WAY", "ARRIVED", "STARTED"].includes(t.status)).length;
  }, [partnerTrips]);

  const totalPartnerFleet = useMemo(() => {
    return partners.reduce((sum, p) => sum + (p.fleet_size || 0), 0);
  }, [partners]);

  const totalPartnerRevenue = useMemo(() => {
    return partnerTrips.reduce((sum, t) => sum + (t.fare || 0), 0);
  }, [partnerTrips]);

  // Incentive Spending Metrics
  const totalIncentiveSpent = useMemo(() => {
    return partnerIncentives
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [partnerIncentives]);

  const totalIncentiveEarned = useMemo(() => {
    return partnerIncentives.reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [partnerIncentives]);

  const totalIncentivePending = useMemo(() => {
    return partnerIncentives
      .filter((i) => i.status === "PENDING")
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [partnerIncentives]);

  const pendingIncentivesCount = useMemo(() => {
    return partnerIncentives.filter((i) => i.status === "PENDING").length;
  }, [partnerIncentives]);

  // Unique cities from partners
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set);
  }, [partners]);

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const q = partnerSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.contact_person.toLowerCase().includes(q) ||
        p.mobile.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q);

      const matchesStatus = partnerStatusFilter === "ALL" || p.status === partnerStatusFilter;
      const matchesCity = partnerCityFilter === "ALL" || p.city.toLowerCase() === partnerCityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [partners, partnerSearchQuery, partnerStatusFilter, partnerCityFilter]);

  // Filtered partner trips
  const filteredTrips = useMemo(() => {
    return partnerTrips.filter((t) => {
      const q = tripSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.trip_number.toLowerCase().includes(q) ||
        t.partner_name.toLowerCase().includes(q) ||
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
      } else if (tripStatusFilter === "CANCELLED") {
        matchesStatus = t.status === "CANCELLED";
      }

      const matchesVehicle = selectedVehicleTypeFilter === "ALL" || t.vehicle_type === selectedVehicleTypeFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [partnerTrips, tripSearchQuery, tripStatusFilter, selectedVehicleTypeFilter]);

  // Filtered Incentives
  const filteredIncentives = useMemo(() => {
    return partnerIncentives.filter((inc) => {
      const q = incentiveSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inc.partner_name.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        (inc.description || "").toLowerCase().includes(q) ||
        (inc.payout_reference || "").toLowerCase().includes(q);

      const matchesStatus = incentiveStatusFilter === "ALL" || inc.status === incentiveStatusFilter;
      const matchesType = incentiveTypeFilter === "ALL" || inc.type === incentiveTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [partnerIncentives, incentiveSearchQuery, incentiveStatusFilter, incentiveTypeFilter]);

  // Drivers available for assignment modal
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

  // Handle open assign modal
  const handleOpenAssignModal = (trip: PartnerTrip) => {
    setSelectedTripForAssign(trip);
    setSelectedDriverId(trip.assigned_driver_id || "");
    setDriverSearchQuery("");
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

  // Handle save partner
  const handleSavePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.mobile) {
      alert("Company Name and Mobile Number are required");
      return;
    }

    if (partnerToEdit) {
      await onUpdatePartner({
        ...partnerForm,
        id: partnerToEdit.id,
      });
      setPartnerToEdit(null);
    } else {
      await onCreatePartner(partnerForm);
      setIsAddPartnerModalOpen(false);
    }

    setPartnerForm({
      name: "",
      contact_person: "",
      mobile: "",
      email: "",
      city: "Bengaluru",
      fleet_size: 5,
      commission_rate: 12,
      payout_upi_id: "",
      bank_account_number: "",
      bank_ifsc: "",
      status: "ACTIVE",
      incentive_target_trips: 100,
    });
  };

  // Handle create partner trip submit
  const handleCreateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripForm.partner_id || !tripForm.pickup_location || !tripForm.drop_location) {
      alert("Please select a partner and enter both pickup and drop locations.");
      return;
    }

    const selectedPartner = partners.find((p) => p.id === tripForm.partner_id);

    await onCreatePartnerTrip({
      ...tripForm,
      partner_name: selectedPartner?.name || tripForm.partner_name || "Partner Fleet",
      status: "AVAILABLE",
    });

    setIsCreateTripModalOpen(false);
    setTripForm({
      partner_id: "",
      partner_name: "",
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
    handleSubTabChange("partner-trips");
  };

  // Handle submit Award Incentive
  const handleAwardIncentiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardForm.partner_id || !awardForm.title || !awardForm.amount) {
      alert("Please select a partner and specify title & amount.");
      return;
    }

    const selectedPartner = partners.find((p) => p.id === awardForm.partner_id);

    await onAwardIncentive({
      ...awardForm,
      partner_name: selectedPartner?.name || awardForm.partner_name || "Partner Fleet",
      payment_method: awardForm.status === "PAID" ? (selectedPartner?.payout_upi_id ? `UPI (${selectedPartner.payout_upi_id})` : "Bank Transfer") : awardForm.payment_method,
    });

    setIsAwardIncentiveModalOpen(false);
    setAwardForm({
      partner_id: "",
      partner_name: "",
      amount: 5000,
      type: "MILESTONE_TARGET",
      title: "",
      description: "",
      status: "PAID",
      payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
      payment_method: "UPI",
    });
  };

  // Handle execute Payout Release
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
    <div className="space-y-6">

      {/* ======================================================== */}
      {/* 2. SUB-TAB 1: PARTNER DIRECTORY                          */}
      {/* ======================================================== */}
      {currentSubTab === "partners" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Partner Directory</h2>
              <p className="text-xs text-slate-500">
                Manage registered travel & fleet partners, agency commissions, fleet size, and incentive earnings
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={onRefresh}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center space-x-1.5 text-xs font-bold"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => {
                  setPartnerForIncentiveSetup(null);
                  setIsIncentiveSetupModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition shadow-md shadow-amber-500/20 flex items-center space-x-2"
                title="Setup Target Trips, Amount & Multi-Stage Ladders"
              >
                <Trophy className="w-4 h-4" />
                <span>Setup Incentive Ladder</span>
              </button>

              <button
                onClick={() => {
                  setPartnerToEdit(null);
                  setPartnerForm({
                    name: "",
                    contact_person: "",
                    mobile: "",
                    email: "",
                    city: "Bengaluru",
                    fleet_size: 5,
                    commission_rate: 12,
                    payout_upi_id: "",
                    bank_account_number: "",
                    bank_ifsc: "",
                    status: "ACTIVE",
                    incentive_target_trips: 100,
                  });
                  setIsAddPartnerModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-[#0043DC]/20 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register Partner</span>
              </button>
            </div>
          </div>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Total Partners</span>
                <Building2 className="w-4 h-4 text-[#0043DC]" />
              </div>
              <div className="text-2xl font-black text-slate-900">{partners.length}</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {partners.filter((p) => p.status === "ACTIVE").length} Verified & Active
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Fleet Capacity</span>
                <Car className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{totalPartnerFleet}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">Total registered cabs</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Total Incentive Spend</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                ₹{totalIncentiveSpent.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                ₹{totalIncentiveEarned.toLocaleString("en-IN")} total earned
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Gross Volume</span>
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                ₹{totalPartnerRevenue.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">Platform commissions active</div>
            </div>
          </div>

          {/* Search, Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search partners by company name, contact person, mobile, or city..."
                value={partnerSearchQuery}
                onChange={(e) => setPartnerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {(["ALL", "ACTIVE", "PENDING", "SUSPENDED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setPartnerStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    partnerStatusFilter === status
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {status}
                </button>
              ))}

              {uniqueCities.length > 0 && (
                <select
                  value={partnerCityFilter}
                  onChange={(e) => setPartnerCityFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                >
                  <option value="ALL">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Bulk Multi-Select Actions Toolbar */}
          {selectedPartnerIds.length > 0 && (
            <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border-2 border-[#0043DC]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#0043DC] text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {selectedPartnerIds.length}
                </span>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    {selectedPartnerIds.length} Partner{selectedPartnerIds.length > 1 ? "s" : ""} Selected
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Apply common incentive scheme or multi-stage target ladder simultaneously
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setPartnerForIncentiveSetup(null);
                    setIsIncentiveSetupModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black transition shadow-sm flex items-center space-x-1.5"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>Setup Target / Incentive ({selectedPartnerIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPartnerIds([])}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Partners Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredPartners.length > 0 && selectedPartnerIds.length === filteredPartners.length}
                        onChange={toggleSelectAllPartners}
                        className="rounded text-[#0043DC] focus:ring-[#0043DC] cursor-pointer w-4 h-4"
                        title="Select All Partners"
                      />
                    </th>
                    <th className="p-4">Partner & Agency</th>
                    <th className="p-4">Contact Person</th>
                    <th className="p-4">City</th>
                    <th className="p-4">Fleet Size</th>
                    <th className="p-4">Incentive Earned</th>
                    <th className="p-4">Platform Spend</th>
                    <th className="p-4">Target Progress</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPartners.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                        No partners match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPartners.map((partner) => {
                      const earned = partner.incentive_earned || 0;
                      const paid = partner.incentive_paid || 0;
                      const pending = partner.incentive_pending || 0;
                      const target = partner.incentive_target_trips || 100;
                      const current = partner.current_cycle_trips || partner.total_trips || 0;
                      const progressPct = Math.min(100, Math.round((current / target) * 100));

                      return (
                        <tr key={partner.id} className={`hover:bg-slate-50/80 transition ${selectedPartnerIds.includes(partner.id) ? "bg-blue-50/40" : ""}`}>
                          <td className="p-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedPartnerIds.includes(partner.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectPartner(partner.id);
                              }}
                              className="rounded text-[#0043DC] focus:ring-[#0043DC] cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0043DC] to-blue-500 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {partner.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => onViewPartnerDetails ? onViewPartnerDetails(partner) : setSelectedPartnerForDetails(partner)}
                                  className="font-bold text-slate-900 hover:text-[#0043DC] transition text-left flex items-center space-x-1 group"
                                  title="Open Partner & Agency Dashboard"
                                >
                                  <span>{partner.name}</span>
                                  <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-[#0043DC] transition" />
                                </button>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ID: {partner.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold text-slate-800">{partner.contact_person}</div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              <a
                                href={`tel:${partner.mobile}`}
                                className="hover:text-[#0043DC] flex items-center space-x-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{partner.mobile}</span>
                              </a>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center space-x-1 text-slate-700 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{partner.city || "Bengaluru"}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0043DC] font-extrabold text-xs">
                              {partner.fleet_size || 0} Cabs
                            </span>
                          </td>

                          {/* INCENTIVE EARNED COLUMN */}
                          <td className="p-4">
                            <div className="font-black text-slate-900">
                              ₹{earned.toLocaleString("en-IN")}
                            </div>
                            {pending > 0 ? (
                              <div className="text-[10px] text-amber-600 font-extrabold flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>₹{pending.toLocaleString("en-IN")} Pending</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 font-semibold">
                                All settled
                              </div>
                            )}
                          </td>

                          {/* PLATFORM SPEND ON INCENTIVE COLUMN */}
                          <td className="p-4">
                            <div className="font-black text-emerald-700">
                              ₹{paid.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Directly paid out
                            </div>
                          </td>

                          {/* TARGET PROGRESS */}
                          <td className="p-4 min-w-[150px]">
                            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                              <span className="text-slate-900 font-extrabold">{current}/{target} trips</span>
                              <span className="text-[#0043DC] font-black">{progressPct}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  progressPct >= 100
                                    ? "bg-emerald-500"
                                    : progressPct >= 70
                                    ? "bg-[#0043DC]"
                                    : "bg-amber-400"
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <span className="text-slate-500 font-semibold truncate max-w-[90px]">
                                {partner.incentive_plan?.stages && partner.incentive_plan.stages.length > 1
                                  ? `${partner.incentive_plan.stages.length} Stages`
                                  : `₹${(partner.incentive_reward_amount || (partner.incentive_plan?.stages?.[0]?.reward_amount) || 1000).toLocaleString("en-IN")}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPartnerForIncentiveSetup(partner);
                                  setIsIncentiveSetupModalOpen(true);
                                }}
                                className="text-[#0043DC] hover:underline font-extrabold"
                                title="Configure this partner's target trips and amount"
                              >
                                Edit Target
                              </button>
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                partner.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : partner.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {partner.status}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {partner.status === "PENDING" && (
                                <button
                                  onClick={() => onUpdatePartnerStatus(partner.id, "ACTIVE")}
                                  className="px-2.5 py-1 rounded-lg border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white transition font-black text-xs flex items-center space-x-1 shadow-sm"
                                  title="Approve Partner Account"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Approve</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setPartnerForIncentiveSetup(partner);
                                  setIsIncentiveSetupModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
                                title="Setup Target Trips, Incentive Amount & Multi-Stage Ladder for this partner"
                              >
                                <Target className="w-3.5 h-3.5" />
                              </button>

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
                                className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 transition"
                                title="Award Incentive / Bonus"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onViewPartnerDetails ? onViewPartnerDetails(partner) : setSelectedPartnerForDetails(partner)}
                                className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-[#0043DC] text-[#0043DC] hover:text-white transition font-bold text-xs flex items-center space-x-1.5 shadow-2xs"
                                title="Open Full Partner & Agency Dashboard"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-[11px]">Dashboard</span>
                              </button>

                              <button
                                onClick={() => {
                                  setPartnerToEdit(partner);
                                  setPartnerForm({ ...partner });
                                  setIsAddPartnerModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                                title="Edit Partner"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SUB-TAB 2: PARTNER TRIPS & DRIVER DISPATCH            */}
      {/* ======================================================== */}
      {currentSubTab === "partner-trips" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Partner Trips & Dispatch</h2>
              <p className="text-xs text-slate-500">
                Dispatch available trips to partner fleet, assign chauffeurs, and track live status
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={onRefresh}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center space-x-1.5 text-xs font-bold"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => {
                  setTripForm({
                    partner_id: partners[0]?.id || "",
                    partner_name: partners[0]?.name || "",
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
                className="px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-[#0043DC]/20 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Partner Trip</span>
              </button>
            </div>
          </div>
          {/* Dispatch Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-2">
                <span>Available For Dispatch</span>
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              </div>
              <div className="text-3xl font-black text-emerald-950">{availableTripsCount}</div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                Awaiting driver assignment
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200/90 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-blue-800 text-xs font-bold mb-2">
                <span>Assigned & Active</span>
                <Car className="w-4 h-4 text-[#0043DC]" />
              </div>
              <div className="text-3xl font-black text-blue-950">{assignedTripsCount}</div>
              <div className="text-[11px] text-blue-700 font-semibold mt-1">Chauffeurs en route / running</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Completed Trips</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {partnerTrips.filter((t) => t.status === "COMPLETED").length}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">Successfully fulfilled</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Total Bookings</span>
                <Compass className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-slate-900">{partnerTrips.length}</div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">Across all partners</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by trip number, partner name, customer, pickup or drop..."
                value={tripSearchQuery}
                onChange={(e) => setTripSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  { key: "ALL", label: `All (${partnerTrips.length})` },
                  { key: "PENDING_REVIEW", label: `Pending Review (${pendingReviewTripsCount})`, highlight: "amber" },
                  { key: "VOICE", label: `🎙 Voice (${voiceTripsCount})`, highlight: "indigo" },
                  { key: "AVAILABLE", label: `Available (${availableTripsCount})`, highlight: "emerald" },
                  { key: "ASSIGNED", label: "Assigned" },
                  { key: "COMPLETED", label: "Completed" },
                  { key: "CANCELLED", label: "Cancelled" },
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
                      : tab.key === "PENDING_REVIEW" && pendingReviewTripsCount > 0
                      ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200/80"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <select
                value={selectedVehicleTypeFilter}
                onChange={(e) => setSelectedVehicleTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="ALL">All Vehicles</option>
                <option value="Sedan">Sedan</option>
                <option value="Prime Sedan">Prime Sedan</option>
                <option value="SUV">SUV</option>
                <option value="EV">EV</option>
              </select>
            </div>
          </div>

          {/* Partner Trips List */}
          <div className="space-y-4">
            {filteredTrips.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 font-medium">
                No partner trips found matching your filters.
              </div>
            ) : (
              filteredTrips.map((trip) => {
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
                    {/* Top Row: Trip #, Partner Tag, Method Badge, Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {trip.trip_number}
                        </span>
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                          <Building2 className="w-3.5 h-3.5 text-[#0043DC]" />
                          <span>{trip.partner_name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {trip.trip_type}
                        </span>

                        {/* Method Badge: Voice vs Manual */}
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
                            title="Edit Partner Trip"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTripToDelete(trip)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 transition"
                            title="Delete Partner Trip"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Route, Customer Info, Vehicle & Fare */}
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
                                {trip.partner_travel_name || trip.partner_name || "Pickmi Fleet"}
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
                                <span>Voice dispatch requires admin approval before assigning driver</span>
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
                                onClick={() => handleOpenAssignModal(trip)}
                                className="w-full py-2 px-3 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-extrabold transition shadow-md shadow-[#0043DC]/20 flex items-center justify-center space-x-1.5"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Assign Driver to Trip</span>
                              </button>
                            </div>
                          ) : assignedDriver ? (
                            <div className="w-full flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div>
                                  <div className="text-xs font-bold text-slate-900">
                                    {assignedDriver.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {assignedDriver.vehicle?.vehicle_number || "Driver Assigned"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleOpenAssignModal(trip)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#0043DC] bg-blue-50 hover:bg-blue-100 transition"
                                >
                                  Reassign
                                </button>
                                <button
                                  onClick={() => onUnassignDriver(trip.id)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Unassign Driver"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2 text-xs font-bold text-slate-500">
                              Status: {trip.status}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Manual Trip Layout */
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Route Details */}
                        <div className="md:col-span-5 space-y-2">
                          <div className="flex items-start space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Pickup Location
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
                                Drop Location
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

                        {/* Customer Info & Vehicle */}
                        <div className="md:col-span-3 space-y-2 border-l border-slate-100 pl-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Customer / Passenger
                            </div>
                            <div className="text-xs font-extrabold text-slate-900">
                              {trip.customer_name}
                            </div>
                            <a
                              href={`tel:${trip.customer_phone}`}
                              className="text-[11px] text-[#0043DC] font-semibold hover:underline flex items-center space-x-1 mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{trip.customer_phone}</span>
                            </a>
                          </div>

                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Vehicle Category
                            </div>
                            <span className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5">
                              <Car className="w-3 h-3 text-[#0043DC]" />
                              <span>{trip.vehicle_type}</span>
                            </span>
                          </div>
                        </div>

                        {/* Commercials / Payout */}
                        <div className="md:col-span-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">Customer Fare</div>
                              <div className="text-sm font-black text-slate-900">
                                ₹{trip.fare?.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-emerald-600 font-bold uppercase">Driver Payout</div>
                              <div className="text-sm font-black text-emerald-700">
                                ₹{trip.driver_payout?.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-blue-600 font-bold uppercase">Commission</div>
                              <div className="text-sm font-black text-[#0043DC]">
                                ₹{trip.commission_amount?.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                            {isAvailable ? (
                              <button
                                onClick={() => handleOpenAssignModal(trip)}
                                className="w-full py-2 px-3 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-extrabold transition shadow-md shadow-[#0043DC]/20 flex items-center justify-center space-x-1.5"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Assign Driver to Trip</span>
                              </button>
                            ) : assignedDriver ? (
                              <div className="w-full flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {assignedDriver.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium">
                                      {assignedDriver.vehicle?.vehicle_number || "Driver Assigned"}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleOpenAssignModal(trip)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#0043DC] bg-blue-50 hover:bg-blue-100 transition"
                                  >
                                    Reassign
                                  </button>
                                  <button
                                    onClick={() => onUnassignDriver(trip.id)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Unassign Driver"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenAssignModal(trip)}
                                className="w-full py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                              >
                                Assign Driver
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Progress Updates */}
                    {!isVoiceTrip && !isAvailable && trip.status !== "COMPLETED" && trip.status !== "CANCELLED" && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 font-medium">
                          Progress Actions:
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {trip.status === "ASSIGNED" && (
                            <button
                              onClick={() => onUpdateTripStatus(trip.id, "ON_THE_WAY")}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            >
                              Mark On The Way
                            </button>
                          )}
                          {trip.status === "ON_THE_WAY" && (
                            <button
                              onClick={() => onUpdateTripStatus(trip.id, "ARRIVED")}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              Mark Arrived
                            </button>
                          )}
                          {(trip.status === "ARRIVED" || trip.status === "ASSIGNED") && (
                            <button
                              onClick={() => onUpdateTripStatus(trip.id, "STARTED")}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100"
                            >
                              Start Trip
                            </button>
                          )}
                          <button
                            onClick={() => onUpdateTripStatus(trip.id, "COMPLETED")}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            Mark Completed
                          </button>
                          <button
                            onClick={() => onUpdateTripStatus(trip.id, "CANCELLED")}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                          >
                            Cancel
                          </button>
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
      {/* 4. SUB-TAB 3: INCENTIVES & SPENDING MANAGEMENT FLOW      */}
      {/* ======================================================== */}
      {currentSubTab === "partner-incentives" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Incentives & Payouts</h2>
              <p className="text-xs text-slate-500">
                Track incentive earnings, milestones, bonuses, and manage partner payout settlements
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={onRefresh}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center space-x-1.5 text-xs font-bold"
                title="Refresh Data"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => {
                  setPartnerForIncentiveSetup(null);
                  setIsIncentiveSetupModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black transition shadow-md shadow-amber-500/20 flex items-center space-x-2"
                title="Configure Target Trips, Reward Amounts & Multi-Stage Ladder"
              >
                <Trophy className="w-4 h-4" />
                <span>Setup Incentive Ladder</span>
              </button>

              <button
                onClick={() => {
                  setAwardForm({
                    partner_id: partners[0]?.id || "",
                    partner_name: partners[0]?.name || "",
                    amount: 5000,
                    type: "MILESTONE_TARGET",
                    title: "Volume Target Incentive Bonus",
                    description: "Awarded for achieving weekly fleet targets.",
                    status: "PAID",
                    payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
                    payment_method: "UPI",
                  });
                  setIsAwardIncentiveModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-bold transition shadow-md shadow-[#0043DC]/20 flex items-center space-x-2"
              >
                <Award className="w-4 h-4" />
                <span>Award / Spend Incentive</span>
              </button>
            </div>
          </div>
          {/* Spending & Performance Analytics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-900 to-[#0043DC] text-white rounded-2xl p-4.5 shadow-md shadow-[#0043DC]/20">
              <div className="flex items-center justify-between text-blue-200 text-xs font-bold mb-2">
                <span>Total Incentive Spend</span>
                <DollarSign className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="text-3xl font-black">
                ₹{totalIncentiveSpent.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-blue-100 font-semibold mt-1">
                Direct platform payouts released
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Total Incentives Earned</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                ₹{totalIncentiveEarned.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-1">
                Across {partners.length} fleet partners
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-2">
                <span>Pending Settlement</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-amber-950">
                ₹{totalIncentivePending.toLocaleString("en-IN")}
              </div>
              <div className="text-[11px] text-amber-700 font-semibold mt-1">
                {pendingIncentivesCount} bonuses awaiting payout
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
                <span>Active Schemes</span>
                <Target className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-black text-purple-900">4 Tiers</div>
              <div className="text-[11px] text-purple-600 font-semibold mt-1">
                Milestone & Peak Rush active
              </div>
            </div>
          </div>

          {/* Active Campaigns & Tier Incentives Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-1 shadow-2xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tier 1 · Starter</span>
                <span className="text-xs font-black text-[#0043DC]">₹3,000 Bonus</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900">50 Trips / Month</div>
              <p className="text-[11px] text-slate-500">Achieve 50 verified trips to unlock the Starter Fleet milestone.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-1 shadow-2xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Tier 2 · Gold</span>
                <span className="text-xs font-black text-amber-600">₹8,000 Bonus</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900">100 Trips / Month</div>
              <p className="text-[11px] text-slate-500">For mid-size fleet partners completing 100+ monthly city bookings.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-1 shadow-2xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">Tier 3 · Platinum</span>
                <span className="text-xs font-black text-purple-700">₹20,000 Bonus</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900">200+ Trips / Month</div>
              <p className="text-[11px] text-slate-500">Major fleet operators providing continuous airport & outstation capacity.</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 space-y-1 shadow-2xs hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Special Surge</span>
                <span className="text-xs font-black text-emerald-700">₹10,000 Bonus</span>
              </div>
              <div className="text-xs font-extrabold text-slate-900">Weekend Peak Blitz</div>
              <p className="text-[11px] text-slate-500">Zero driver cancellations during peak weekend rush hours.</p>
            </div>
          </div>

          {/* Search, Filter Bar & Award Incentive Button */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search incentive records by partner name, title, reference #, or note..."
                value={incentiveSearchQuery}
                onChange={(e) => setIncentiveSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {(["ALL", "PAID", "PENDING"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setIncentiveStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    incentiveStatusFilter === status
                      ? status === "PAID"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : status === "PENDING"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {status === "PAID"
                    ? `Paid Spend (${partnerIncentives.filter((i) => i.status === "PAID").length})`
                    : status === "PENDING"
                    ? `Pending (${pendingIncentivesCount})`
                    : status}
                </button>
              ))}

              <select
                value={incentiveTypeFilter}
                onChange={(e) => setIncentiveTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
              >
                <option value="ALL">All Categories</option>
                <option value="MILESTONE_TARGET">Milestone Target</option>
                <option value="PEAK_PERFORMANCE">Peak Performance</option>
                <option value="FLEET_EXPANSION">Fleet Expansion</option>
                <option value="FESTIVAL_BONUS">Festival Campaign</option>
                <option value="MANUAL_DISCRETIONARY">Discretionary</option>
              </select>
            </div>
          </div>

          {/* Partner Incentive Spending Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="p-4">Partner Agency</th>
                    <th className="p-4">Incentive Title & Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Amount (₹)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment Reference</th>
                    <th className="p-4">Issued Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredIncentives.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No incentive records match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredIncentives.map((inc) => {
                      const isPaid = inc.status === "PAID";
                      const partner = partners.find((p) => p.id === inc.partner_id);

                      return (
                        <tr key={inc.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4">
                            <div className="font-extrabold text-slate-900">{inc.partner_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {inc.partner_id}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-800">{inc.title}</div>
                            {inc.description && (
                              <div className="text-[11px] text-slate-500 max-w-xs truncate">
                                {inc.description}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
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
                            {isPaid ? (
                              <div>
                                <div className="font-mono text-[11px] text-slate-800 font-bold">
                                  {inc.payout_reference || "PAID_SYSTEM"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {inc.payment_method || "UPI"}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-700 font-medium">
                                Awaiting Payout
                              </div>
                            )}
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
                                  <span className="text-[11px] text-emerald-600 font-bold inline-flex items-center space-x-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Settled</span>
                                  </span>
                                );
                              }

                              if (isPend) {
                                return (
                                  <button
                                    onClick={async () => {
                                      if (onApproveIncentive) {
                                        await onApproveIncentive(inc.id, "Approved by Admin");
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-[11px] font-extrabold transition shadow-xs flex items-center space-x-1 ml-auto"
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
                                      setPayoutReferenceInput(
                                        "UPI_PAY_" + Math.floor(100000 + Math.random() * 900000)
                                      );
                                      setPayoutMethodInput(
                                        partner?.payout_upi_id ? `UPI (${partner.payout_upi_id})` : "Bank Transfer"
                                      );
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition shadow-xs flex items-center space-x-1 ml-auto"
                                    title="Mark payout as complete and release funds"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>💳 Mark Complete / Pay</span>
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
                  {selectedTripForAssign.partner_name} · Required: {selectedTripForAssign.vehicle_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedTripForAssign(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trip Summary Card */}
            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs space-y-1.5 text-blue-950">
              <div className="flex items-center justify-between">
                <span>Passenger: <strong>{selectedTripForAssign.customer_name}</strong></span>
                <span className="font-bold text-[#0043DC]">Fare: ₹{selectedTripForAssign.fare?.toLocaleString("en-IN")}</span>
              </div>
              <div className="truncate text-slate-600">
                <strong>From:</strong> {selectedTripForAssign.pickup_location}
              </div>
              <div className="truncate text-slate-600">
                <strong>To:</strong> {selectedTripForAssign.drop_location}
              </div>
            </div>

            {/* Driver Filter & Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Select Chauffeur / Driver
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-slate-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyOnlineDrivers}
                    onChange={(e) => setOnlyOnlineDrivers(e.target.checked)}
                    className="rounded text-[#0043DC] focus:ring-[#0043DC]"
                  />
                  <span>Online drivers only ({drivers.filter((d) => d.online_status === "ONLINE").length})</span>
                </label>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search driver by name, phone, or car plate..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            {/* Drivers List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {filteredDriversForAssignment.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium">
                  No online drivers match your search.
                </div>
              ) : (
                filteredDriversForAssignment.map((driver) => {
                  const isSelected = selectedDriverId === driver.id;
                  const isVehicleMatch =
                    driver.vehicle?.vehicle_type === selectedTripForAssign.vehicle_type;

                  return (
                    <div
                      key={driver.id}
                      onClick={() => setSelectedDriverId(driver.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-50/80 border-[#0043DC] ring-1 ring-[#0043DC]"
                          : "border-slate-100 hover:bg-slate-50"
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
                            <span className="font-extrabold text-slate-900 text-xs">
                              {driver.name}
                            </span>
                            {isVehicleMatch && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                                Match: {driver.vehicle?.vehicle_type}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {driver.mobile} · {driver.vehicle?.vehicle_number || "No Car Plate"} ({driver.vehicle?.vehicle_model || driver.vehicle?.vehicle_type || "Standard"})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{driver.rating?.toFixed(1) || "5.0"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {driver.total_trips || 0} trips
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
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTripForAssign(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedDriverId || isAssigningDriver}
                onClick={handleConfirmAssignDriver}
                className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 disabled:opacity-50 text-white font-extrabold text-xs transition shadow-md shadow-[#0043DC]/20"
              >
                {isAssigningDriver ? "Dispatching..." : "Confirm & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REGISTER / EDIT PARTNER                         */}
      {/* ======================================================== */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {partnerToEdit ? "Edit Fleet Partner" : "Register New Fleet Partner"}
              </h3>
              <button
                onClick={() => setIsAddPartnerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartnerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Company / Travel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PickMi Partner Fleet"
                  value={partnerForm.name || ""}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthik Palani"
                    value={partnerForm.contact_person || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 12345"
                    value={partnerForm.mobile || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, mobile: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="contact@agency.com"
                    value={partnerForm.email || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Base City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={partnerForm.city || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fleet Size</label>
                  <input
                    type="number"
                    min={1}
                    value={partnerForm.fleet_size || 5}
                    onChange={(e) => setPartnerForm({ ...partnerForm, fleet_size: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Commission %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={partnerForm.commission_rate ?? 12}
                    onChange={(e) => setPartnerForm({ ...partnerForm, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={partnerForm.status || "ACTIVE"}
                    onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <div className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                  Payout & Banking Details
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">UPI ID</label>
                  <input
                    type="text"
                    placeholder="partner@icici"
                    value={partnerForm.payout_upi_id || ""}
                    onChange={(e) => setPartnerForm({ ...partnerForm, payout_upi_id: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 font-semibold text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Bank Account #</label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={partnerForm.bank_account_number || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bank_account_number: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 font-semibold text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Bank IFSC</label>
                    <input
                      type="text"
                      placeholder="HDFC0001289"
                      value={partnerForm.bank_ifsc || ""}
                      onChange={(e) => setPartnerForm({ ...partnerForm, bank_ifsc: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 font-semibold text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold transition shadow-md shadow-[#0043DC]/20"
                >
                  {partnerToEdit ? "Save Changes" : "Register Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREATE PARTNER TRIP                             */}
      {/* ======================================================== */}
      {isCreateTripModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Create Partner Booking
              </h3>
              <button
                onClick={() => setIsCreateTripModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Partner Agency *</label>
                <select
                  required
                  value={tripForm.partner_id || ""}
                  onChange={(e) => {
                    const found = partners.find((p) => p.id === e.target.value);
                    setTripForm({
                      ...tripForm,
                      partner_id: e.target.value,
                      partner_name: found?.name || "",
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                >
                  <option value="">-- Select Partner --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer / Passenger Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Passenger Name"
                    value={tripForm.customer_name || ""}
                    onChange={(e) => setTripForm({ ...tripForm, customer_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Mobile *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 12345"
                    value={tripForm.customer_phone || ""}
                    onChange={(e) => setTripForm({ ...tripForm, customer_phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pickup Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koramangala 4th Block, Bengaluru"
                  value={tripForm.pickup_location || ""}
                  onChange={(e) => setTripForm({ ...tripForm, pickup_location: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Drop Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kempegowda Airport BLR Terminal 2"
                  value={tripForm.drop_location || ""}
                  onChange={(e) => setTripForm({ ...tripForm, drop_location: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Trip Type</label>
                  <select
                    value={tripForm.trip_type || "Airport Transfer"}
                    onChange={(e) => setTripForm({ ...tripForm, trip_type: e.target.value as TripType })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  >
                    <option value="One-way">One-way</option>
                    <option value="Airport Transfer">Airport Transfer</option>
                    <option value="Round-trip">Round-trip</option>
                    <option value="Outstation">Outstation</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type Required</label>
                  <select
                    value={tripForm.vehicle_type || "Sedan"}
                    onChange={(e) => setTripForm({ ...tripForm, vehicle_type: e.target.value as VehicleType })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="Prime Sedan">Prime Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="EV">EV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Fare (₹)</label>
                  <input
                    type="number"
                    value={tripForm.fare || 1200}
                    onChange={(e) => {
                      const fare = parseFloat(e.target.value) || 0;
                      setTripForm({
                        ...tripForm,
                        fare,
                        driver_payout: Math.round(fare * 0.85),
                        commission_amount: Math.round(fare * 0.15),
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-emerald-700 block mb-1">Driver Payout (₹)</label>
                  <input
                    type="number"
                    value={tripForm.driver_payout || 1000}
                    onChange={(e) => setTripForm({ ...tripForm, driver_payout: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-blue-700 block mb-1">Commission (₹)</label>
                  <input
                    type="number"
                    value={tripForm.commission_amount || 200}
                    onChange={(e) => setTripForm({ ...tripForm, commission_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Special Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. VIP guest, clean AC car required"
                  value={tripForm.notes || ""}
                  onChange={(e) => setTripForm({ ...tripForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTripModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold transition shadow-md shadow-[#0043DC]/20"
                >
                  Create & List Available
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: AWARD / SPEND INCENTIVE MODAL                   */}
      {/* ======================================================== */}
      {isAwardIncentiveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Award Partner Incentive
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Allocate bonus reward and record platform incentive spending.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAwardIncentiveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAwardIncentiveSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Partner Agency *</label>
                <select
                  required
                  value={awardForm.partner_id || ""}
                  onChange={(e) => {
                    const found = partners.find((p) => p.id === e.target.value);
                    setAwardForm({
                      ...awardForm,
                      partner_id: e.target.value,
                      partner_name: found?.name || "",
                      payment_method: found?.payout_upi_id ? `UPI (${found.payout_upi_id})` : "Bank Transfer",
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                >
                  <option value="">-- Select Fleet Partner --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city}) · Earned: ₹{(p.incentive_earned || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Incentive Category</label>
                  <select
                    value={awardForm.type || "MILESTONE_TARGET"}
                    onChange={(e) => setAwardForm({ ...awardForm, type: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  >
                    <option value="MILESTONE_TARGET">Milestone Target (Trips)</option>
                    <option value="PEAK_PERFORMANCE">Peak Performance</option>
                    <option value="FLEET_EXPANSION">Fleet Expansion</option>
                    <option value="FESTIVAL_BONUS">Festival Campaign</option>
                    <option value="MANUAL_DISCRETIONARY">Discretionary Reward</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Incentive Amount (₹) *</label>
                  <input
                    type="number"
                    min={500}
                    step={100}
                    required
                    value={awardForm.amount || 5000}
                    onChange={(e) => setAwardForm({ ...awardForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Incentive Title / Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100 Trips Milestone Target Bonus"
                  value={awardForm.title || ""}
                  onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description / Achievement Details</label>
                <input
                  type="text"
                  placeholder="e.g. Completed 100 trips within cycle with zero cancellations."
                  value={awardForm.description || ""}
                  onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              {/* Payout Settlement Option */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
                <label className="font-bold text-slate-800 block">Payout Settlement Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAwardForm({ ...awardForm, status: "PAID" })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      awardForm.status === "PAID"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Pay Immediately
                    <div className="text-[10px] font-normal text-slate-400">Accounted in Platform Spend</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAwardForm({ ...awardForm, status: "PENDING" })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition text-center ${
                      awardForm.status === "PENDING"
                        ? "bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ⏳ Queue for Settlement
                    <div className="text-[10px] font-normal text-slate-400">Mark as Pending Payout</div>
                  </button>
                </div>

                {awardForm.status === "PAID" && (
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Payout Reference</label>
                      <input
                        type="text"
                        value={awardForm.payout_reference || ""}
                        onChange={(e) => setAwardForm({ ...awardForm, payout_reference: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-slate-200 font-mono text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block">Payment Method</label>
                      <input
                        type="text"
                        value={awardForm.payment_method || "UPI"}
                        onChange={(e) => setAwardForm({ ...awardForm, payment_method: e.target.value })}
                        className="w-full p-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAwardIncentiveModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold transition shadow-md shadow-[#0043DC]/20"
                >
                  Confirm & Award Incentive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: RELEASE / PAY INCENTIVE PAYOUT                  */}
      {/* ======================================================== */}
      {selectedIncentiveForPayout && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Release Incentive Payout
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Settle pending incentive bonus to partner account.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncentiveForPayout(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-center justify-between">
                <span>Partner: <strong>{selectedIncentiveForPayout.partner_name}</strong></span>
                <span className="font-black text-emerald-700 text-base">
                  ₹{selectedIncentiveForPayout.amount?.toLocaleString("en-IN")}
                </span>
              </div>
              <div>Title: <strong>{selectedIncentiveForPayout.title}</strong></div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Payment Method / Route</label>
                <input
                  type="text"
                  value={payoutMethodInput}
                  onChange={(e) => setPayoutMethodInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Bank / UPI Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI_PAY_881920 or UTR Number"
                  value={payoutReferenceInput}
                  onChange={(e) => setPayoutReferenceInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedIncentiveForPayout(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingPayout}
                onClick={handleExecutePayout}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs transition shadow-md shadow-emerald-600/20"
              >
                {isProcessingPayout ? "Releasing..." : "Confirm Payout Released"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: PARTNER DETAILS DRAWER                          */}
      {/* ======================================================== */}
      {selectedPartnerForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#0043DC] text-white font-black flex items-center justify-center text-sm shadow-md shadow-[#0043DC]/20">
                  {selectedPartnerForDetails.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {selectedPartnerForDetails.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedPartnerForDetails.city} · Fleet Partner ID: {selectedPartnerForDetails.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPartnerForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Partner Contact & Fleet Overview */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Contact Details</span>
                <div className="font-extrabold text-slate-900">{selectedPartnerForDetails.contact_person}</div>
                <div className="text-slate-600 font-medium">{selectedPartnerForDetails.mobile}</div>
                <div className="text-slate-500 text-[11px] truncate">{selectedPartnerForDetails.email}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Fleet & Commercials</span>
                <div className="font-extrabold text-slate-900">
                  {selectedPartnerForDetails.fleet_size} Vehicles Registered
                </div>
                <div className="text-slate-600 font-medium">
                  Commission: {selectedPartnerForDetails.commission_rate}%
                </div>
                <div className="text-emerald-700 font-bold text-[11px]">
                  Gross Volume: ₹{selectedPartnerForDetails.total_revenue?.toLocaleString("en-IN") || 0}
                </div>
              </div>
            </div>

            {/* INCENTIVES & EARNINGS CARD */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-black text-amber-900 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Incentives & Bonus Earnings</span>
                </div>
                <span className="text-xs font-black text-amber-900">
                  ₹{(selectedPartnerForDetails.incentive_earned || 0).toLocaleString("en-IN")} Earned
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-amber-200/60">
                <div className="bg-white/80 p-2 rounded-lg">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Earned</div>
                  <div className="font-black text-slate-900">
                    ₹{(selectedPartnerForDetails.incentive_earned || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-white/80 p-2 rounded-lg">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Paid Out</div>
                  <div className="font-black text-emerald-700">
                    ₹{(selectedPartnerForDetails.incentive_paid || 0).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-white/80 p-2 rounded-lg">
                  <div className="text-[10px] text-amber-600 font-bold uppercase">Pending</div>
                  <div className="font-black text-amber-700">
                    ₹{(selectedPartnerForDetails.incentive_pending || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Banking Details */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1.5 text-blue-950">
              <div className="font-bold flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4 text-[#0043DC]" />
                <span>Payout & Banking Information</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">UPI ID:</span>{" "}
                  <strong>{selectedPartnerForDetails.payout_upi_id || "Not Provided"}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Bank IFSC:</span>{" "}
                  <strong>{selectedPartnerForDetails.bank_ifsc || "Not Provided"}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Account #:</span>{" "}
                  <strong>{selectedPartnerForDetails.bank_account_number || "Not Provided"}</strong>
                </div>
              </div>
            </div>

            {/* Partner Incentive History in Drawer */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                <span>Incentive History for {selectedPartnerForDetails.name}</span>
                <span className="text-[11px] text-slate-500">
                  {partnerIncentives.filter((i) => i.partner_id === selectedPartnerForDetails.id).length} Records
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {partnerIncentives.filter((i) => i.partner_id === selectedPartnerForDetails.id).length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No incentives recorded yet for this partner.
                  </div>
                ) : (
                  partnerIncentives
                    .filter((i) => i.partner_id === selectedPartnerForDetails.id)
                    .map((inc) => (
                      <div key={inc.id} className="pt-2 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800">{inc.title}</div>
                          <div className="text-[10px] text-slate-400">{inc.type.replace("_", " ")}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">₹{inc.amount?.toLocaleString("en-IN")}</div>
                          <span
                            className={`text-[9px] font-black uppercase ${
                              inc.status === "PAID" ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {inc.status}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="flex items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedPartnerForDetails(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const partner = selectedPartnerForDetails;
                  setSelectedPartnerForDetails(null);
                  setAwardForm({
                    partner_id: partner.id,
                    partner_name: partner.name,
                    amount: 5000,
                    type: "MILESTONE_TARGET",
                    title: "Volume Target Incentive Bonus",
                    description: `Bonus for ${partner.name}`,
                    status: "PAID",
                    payout_reference: "UPI_INC_" + Math.floor(10000 + Math.random() * 90000),
                    payment_method: partner.payout_upi_id ? `UPI (${partner.payout_upi_id})` : "Bank Transfer",
                  });
                  setIsAwardIncentiveModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-md shadow-amber-500/20"
              >
                Award Incentive
              </button>
            </div>
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
          partners={partners}
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
                This will permanently delete this partner trip from the platform and database. This action cannot be reversed.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Partner:</span>
                <span className="font-bold text-slate-800">{tripToDelete.partner_name}</span>
              </div>
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
          onClose={() => {
            setIsIncentiveSetupModalOpen(false);
            setPartnerForIncentiveSetup(null);
          }}
          partners={partners}
          selectedPartnerIds={selectedPartnerIds}
          initialPartner={partnerForIncentiveSetup}
          onSaveIncentivePlan={handleSaveIncentive}
        />
      )}
    </div>
  );
};