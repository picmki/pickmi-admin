import React, { useState, useMemo } from "react";
import {
  Clock,
  Car,
  DollarSign,
  Tag,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Percent,
  X,
  Sparkles,
  Zap,
  Info
} from "lucide-react";

export interface VehicleCategory {
  id: string;
  categoryName: string;
  models: string;
  seats: number;
  luggage: number;
  hasAc: boolean;
  tag: string;
  badge: string;
  ratingScore: number;
  reviewCount: string;
  isActive: boolean;
  minKmOneWay: number;
  minKmPerDayRound: number;
  driverAllowanceRound?: number;
  driverAllowanceOneway?: number;
  interstateCharge?: number;
  rentalExtraKmRate: number;
  rentalExtraHrRate: number;
  rentalPackageFares?: {
    [packageId: string]: number;
  };
  baseRatePerKm: {
    incity: number;
    intercity_oneway: number;
    intercity_round: number;
    airport: number;
    rental_extra_km: number;
  };
  baseFareMin: {
    incity: number;
    intercity_oneway: number;
    intercity_round: number;
    airport: number;
  };
}

export interface RentalPackage {
  id: string;
  hours: number;
  km: number;
  label: string;
  description: string;
  popular?: boolean;
}

export const DEFAULT_RENTAL_PACKAGES: RentalPackage[] = [
  { id: "rent-2h20k", hours: 2, km: 20, label: "2 Hours / 20 KMs", description: "Quick city chores & short meetings", popular: false },
  { id: "rent-4h40k", hours: 4, km: 40, label: "4 Hours / 40 KMs", description: "Half day city shopping & multiple stops", popular: true },
  { id: "rent-8h80k", hours: 8, km: 80, label: "8 Hours / 80 KMs (Full Day)", description: "Full day business meetings & city tour", popular: true },
  { id: "rent-12h120k", hours: 12, km: 120, label: "12 Hours / 120 KMs", description: "Extended day out & corporate trips", popular: false }
];

export interface PricingConfig {
  interstateMode: "auto" | "all" | "none";
  interstateFee: number;
  tollOneway: number;
  tollRound: number;
  tollAirport: number;
  tollIncity: number;
  driverOneway: number;
  driverRound: number;
  driverAirport: number;
  driverIncity: number;
  gstRate: number;
}

export interface CouponItem {
  id: string;
  code: string;
  discountType: "percent" | "flat";
  value: number;
  maxDiscount: number;
  minAmount: number;
  desc: string;
  isActive: boolean;
}

const DEFAULT_FLEET: VehicleCategory[] = [
  {
    id: "hatchback",
    categoryName: "Hatchback",
    models: "Swift, Indica or similar",
    seats: 4,
    luggage: 2,
    hasAc: true,
    tag: "Budget & Compact",
    badge: "Popular",
    ratingScore: 4.6,
    reviewCount: "2,350",
    isActive: true,
    minKmOneWay: 130,
    minKmPerDayRound: 300,
    driverAllowanceRound: 300,
    driverAllowanceOneway: 300,
    interstateCharge: 400,
    rentalExtraKmRate: 14,
    rentalExtraHrRate: 120,
    rentalPackageFares: {
      "rent-2h20k": 799,
      "rent-4h40k": 1399,
      "rent-8h80k": 2399,
      "rent-12h120k": 3299
    },
    baseRatePerKm: {
      incity: 15,
      intercity_oneway: 14,
      intercity_round: 13,
      airport: 18,
      rental_extra_km: 14
    },
    baseFareMin: {
      incity: 220,
      intercity_oneway: 1820,
      intercity_round: 3900,
      airport: 650
    }
  },
  {
    id: "sedan",
    categoryName: "Sedan",
    models: "Dzire, Etios or similar",
    seats: 4,
    luggage: 3,
    hasAc: true,
    tag: "Spacious & Comfortable",
    badge: "Best Value",
    ratingScore: 4.8,
    reviewCount: "4,820",
    isActive: true,
    minKmOneWay: 130,
    minKmPerDayRound: 300,
    driverAllowanceRound: 400,
    driverAllowanceOneway: 400,
    interstateCharge: 500,
    rentalExtraKmRate: 16,
    rentalExtraHrRate: 150,
    rentalPackageFares: {
      "rent-2h20k": 949,
      "rent-4h40k": 1649,
      "rent-8h80k": 2799,
      "rent-12h120k": 3899
    },
    baseRatePerKm: {
      incity: 18,
      intercity_oneway: 15,
      intercity_round: 14,
      airport: 21,
      rental_extra_km: 16
    },
    baseFareMin: {
      incity: 290,
      intercity_oneway: 1950,
      intercity_round: 4200,
      airport: 820
    }
  },
  {
    id: "suv",
    categoryName: "SUV",
    models: "Ertiga, Innova or similar",
    seats: 6,
    luggage: 4,
    hasAc: true,
    tag: "Extra Space for Families",
    badge: "Family Favorite",
    ratingScore: 4.7,
    reviewCount: "1,950",
    isActive: true,
    minKmOneWay: 130,
    minKmPerDayRound: 300,
    driverAllowanceRound: 500,
    driverAllowanceOneway: 500,
    interstateCharge: 1000,
    rentalExtraKmRate: 20,
    rentalExtraHrRate: 200,
    rentalPackageFares: {
      "rent-2h20k": 1499,
      "rent-4h40k": 2499,
      "rent-8h80k": 4199,
      "rent-12h120k": 5699
    },
    baseRatePerKm: {
      incity: 24,
      intercity_oneway: 20,
      intercity_round: 19,
      airport: 28,
      rental_extra_km: 20
    },
    baseFareMin: {
      incity: 440,
      intercity_oneway: 2600,
      intercity_round: 5700,
      airport: 1180
    }
  },
  {
    id: "innova",
    categoryName: "Toyota Innova",
    models: "Toyota Innova (7-Seater)",
    seats: 7,
    luggage: 5,
    hasAc: true,
    tag: "Spacious & Reliable Highway Cruiser",
    badge: "Spacious 7-Seater",
    ratingScore: 4.9,
    reviewCount: "1,220",
    isActive: true,
    minKmOneWay: 130,
    minKmPerDayRound: 300,
    driverAllowanceRound: 600,
    driverAllowanceOneway: 600,
    interstateCharge: 1200,
    rentalExtraKmRate: 23,
    rentalExtraHrRate: 250,
    rentalPackageFares: {
      "rent-2h20k": 1899,
      "rent-4h40k": 3099,
      "rent-8h80k": 5199,
      "rent-12h120k": 6999
    },
    baseRatePerKm: {
      incity: 28,
      intercity_oneway: 21,
      intercity_round: 20,
      airport: 32,
      rental_extra_km: 23
    },
    baseFareMin: {
      incity: 580,
      intercity_oneway: 2730,
      intercity_round: 6000,
      airport: 1450
    }
  },
  {
    id: "innova_crysta",
    categoryName: "Luxury",
    models: "Innova Crysta Executive",
    seats: 7,
    luggage: 5,
    hasAc: true,
    tag: "Ultimate Highway Luxury & Captain Seats",
    badge: "Executive Class",
    ratingScore: 4.95,
    reviewCount: "860",
    isActive: true,
    minKmOneWay: 130,
    minKmPerDayRound: 300,
    driverAllowanceRound: 700,
    driverAllowanceOneway: 700,
    interstateCharge: 1500,
    rentalExtraKmRate: 27,
    rentalExtraHrRate: 300,
    rentalPackageFares: {
      "rent-2h20k": 2399,
      "rent-4h40k": 3799,
      "rent-8h80k": 6399,
      "rent-12h120k": 8699
    },
    baseRatePerKm: {
      incity: 34,
      intercity_oneway: 22,
      intercity_round: 21,
      airport: 38,
      rental_extra_km: 27
    },
    baseFareMin: {
      incity: 690,
      intercity_oneway: 2860,
      intercity_round: 6300,
      airport: 1750
    }
  }
];

const DEFAULT_PRICING: PricingConfig = {
  interstateMode: "auto",
  interstateFee: 500,
  tollOneway: 180,
  tollRound: 360,
  tollAirport: 110,
  tollIncity: 0,
  driverOneway: 300,
  driverRound: 400,
  driverAirport: 0,
  driverIncity: 0,
  gstRate: 5
};

const DEFAULT_COUPONS: CouponItem[] = [
  {
    id: "c-1",
    code: "FLASH15",
    discountType: "percent",
    value: 15,
    maxDiscount: 350,
    minAmount: 1200,
    desc: "15% off up to ₹350 on highway trips",
    isActive: true
  },
  {
    id: "c-2",
    code: "PICKMI50",
    discountType: "flat",
    value: 50,
    maxDiscount: 50,
    minAmount: 500,
    desc: "Flat ₹50 off on first outstation ride",
    isActive: true
  },
  {
    id: "c-3",
    code: "AIRPORT100",
    discountType: "flat",
    value: 100,
    maxDiscount: 100,
    minAmount: 900,
    desc: "₹100 discount on airport transfers",
    isActive: true
  },
  {
    id: "c-4",
    code: "SUPERVIP",
    discountType: "percent",
    value: 20,
    maxDiscount: 600,
    minAmount: 3000,
    desc: "20% off up to ₹600 for corporate rides",
    isActive: false
  }
];

export const WebsitePricingRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"fleet" | "pricing" | "rentals" | "offers" | "simulator">("fleet");

  // Rental Packages state
  const [rentalPackages, setRentalPackages] = useState<RentalPackage[]>(() => {
    try {
      const saved = localStorage.getItem("pickmi_admin_rentals");
      return saved ? JSON.parse(saved) : DEFAULT_RENTAL_PACKAGES;
    } catch {
      return DEFAULT_RENTAL_PACKAGES;
    }
  });

  const [editingRentalPkg, setEditingRentalPkg] = useState<RentalPackage | null>(null);
  const [isRentalPkgModalOpen, setIsRentalPkgModalOpen] = useState(false);
  const [editingRentalRatesVehicle, setEditingRentalRatesVehicle] = useState<VehicleCategory | null>(null);
  const [isRentalRatesModalOpen, setIsRentalRatesModalOpen] = useState(false);

  // Load from localStorage or defaults
  const [fleet, setFleet] = useState<VehicleCategory[]>(() => {
    try {
      const saved = localStorage.getItem("pickmi_admin_fleet");
      return saved ? JSON.parse(saved) : DEFAULT_FLEET;
    } catch {
      return DEFAULT_FLEET;
    }
  });

  const [pricing, setPricing] = useState<PricingConfig>(() => {
    try {
      const saved = localStorage.getItem("pickmi_admin_pricing");
      return saved ? JSON.parse(saved) : DEFAULT_PRICING;
    } catch {
      return DEFAULT_PRICING;
    }
  });

  const [coupons, setCoupons] = useState<CouponItem[]>(() => {
    try {
      const saved = localStorage.getItem("pickmi_admin_coupons");
      return saved ? JSON.parse(saved) : DEFAULT_COUPONS;
    } catch {
      return DEFAULT_COUPONS;
    }
  });

  const [flashSaleActive, setFlashSaleActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("pickmi_admin_flash_active");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [flashDiscountPct, setFlashDiscountPct] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pickmi_admin_flash_pct");
      return saved ? Number(saved) : 15;
    } catch {
      return 15;
    }
  });

    // Sync latest fleet and pricing rules from backend API
  React.useEffect(() => {
    fetch("http://localhost:4200/api/fleet-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.fleet && Array.isArray(data.fleet) && data.fleet.length > 0) {
          setFleet(data.fleet);
          localStorage.setItem("pickmi_admin_fleet", JSON.stringify(data.fleet));
        }
        if (data.pricing) {
          setPricing(data.pricing);
          localStorage.setItem("pickmi_admin_pricing", JSON.stringify(data.pricing));
        }
        if (data.rentalPackages) {
          setRentalPackages(data.rentalPackages);
          localStorage.setItem("pickmi_admin_rentals", JSON.stringify(data.rentalPackages));
        }
        if (data.coupons) {
          setCoupons(data.coupons);
          localStorage.setItem("pickmi_admin_coupons", JSON.stringify(data.coupons));
        }
      })
      .catch(() => {});
  }, []);

  // Toast banner state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist handlers
  const saveFleet = (newFleet: VehicleCategory[]) => {
    setFleet(newFleet);
    localStorage.setItem("pickmi_admin_fleet", JSON.stringify(newFleet));
    try {
      fetch("http://localhost:4200/api/fleet-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fleet: newFleet, rentalPackages, pricing })
      }).catch(() => {});
    } catch {}
    showToast("Vehicle fleet updated and synced to website.");
  };

  const saveRentalPackages = (newPkgs: RentalPackage[]) => {
    setRentalPackages(newPkgs);
    localStorage.setItem("pickmi_admin_rentals", JSON.stringify(newPkgs));
    try {
      fetch("http://localhost:4200/api/fleet-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fleet, rentalPackages: newPkgs, pricing })
      }).catch(() => {});
    } catch {}
    showToast("Hourly rental packages updated and saved.");
  };

  const savePricing = () => {
    localStorage.setItem("pickmi_admin_pricing", JSON.stringify(pricing));
    try {
      fetch("http://localhost:4200/api/fleet-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fleet, rentalPackages, pricing, coupons })
      }).catch(() => {});
    } catch {}
    showToast("Pricing rules and interstate configurations saved and synced.");
  };

  const saveCoupons = (newCoupons: CouponItem[]) => {
    setCoupons(newCoupons);
    localStorage.setItem("pickmi_admin_coupons", JSON.stringify(newCoupons));
    try {
      fetch("http://localhost:4200/api/fleet-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fleet, rentalPackages, pricing, coupons: newCoupons })
      }).catch(() => {});
    } catch {}
    showToast("Coupons list updated and synced to website.");
  };

  const saveFlashSale = (active: boolean, pct: number) => {
    setFlashSaleActive(active);
    setFlashDiscountPct(pct);
    localStorage.setItem("pickmi_admin_flash_active", JSON.stringify(active));
    localStorage.setItem("pickmi_admin_flash_pct", String(pct));
    showToast("Flash sale settings updated.");
  };

  const resetAllDefaults = () => {
    if (confirm("Reset all fleet categories, pricing rules, and flash sales to factory defaults?")) {
      setFleet(DEFAULT_FLEET);
      setPricing(DEFAULT_PRICING);
      setCoupons(DEFAULT_COUPONS);
      setRentalPackages(DEFAULT_RENTAL_PACKAGES);
      setFlashSaleActive(true);
      setFlashDiscountPct(15);
      localStorage.removeItem("pickmi_admin_fleet");
      localStorage.removeItem("pickmi_admin_pricing");
      localStorage.removeItem("pickmi_admin_coupons");
      localStorage.removeItem("pickmi_admin_rentals");
      localStorage.removeItem("pickmi_admin_flash_active");
      localStorage.removeItem("pickmi_admin_flash_pct");
      showToast("Reset all rules to factory defaults.");
    }
  };

  // Modals state
  const [editingVehicle, setEditingVehicle] = useState<VehicleCategory | null>(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const handleDeleteVehicle = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete vehicle category "${name}"? This will remove it from the fleet.`)) {
      const updated = fleet.filter((f) => f.id !== id);
      saveFleet(updated);
      setIsVehicleModalOpen(false);
    }
  };

  const handleDeleteCoupon = (id: string, codeStr: string) => {
    if (window.confirm(`Are you sure you want to delete promo coupon "${codeStr}"?`)) {
      const updated = coupons.filter((c) => c.id !== id);
      saveCoupons(updated);
      setIsCouponModalOpen(false);
    }
  };

  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);

  // Simulator State
  const [simService, setSimService] = useState<"oneway" | "round" | "airport" | "rental">("oneway");
  const [simVehicleId, setSimVehicleId] = useState<string>("sedan");
  const [simDistance, setSimDistance] = useState<number>(120);
  const [simInterstateCross, setSimInterstateCross] = useState<boolean>(true);
  const [simSelectedCoupon, setSimSelectedCoupon] = useState<string>("FLASH15");

  // Simulator Calculation
  const simCalculation = useMemo(() => {
    const selCat = fleet.find((f) => f.id === simVehicleId) || fleet[0];
    if (!selCat) {
      return {
        rate: 0,
        baseFare: 0,
        tolls: 0,
        driver: 0,
        interstate: 0,
        discount: 0,
        gst: 0,
        finalTotal: 0,
        originalTotal: 0,
        selectedCategory: DEFAULT_FLEET[0]
      };
    }

    let rate = selCat.baseRatePerKm.intercity_oneway;
    let calculatedBase = 0;
    let billableKm = simDistance;
    let minKmRule = "";
    let isMinKmApplied = false;
    let tolls = pricing.tollOneway;
    let driver = selCat.driverAllowanceOneway !== undefined ? selCat.driverAllowanceOneway : pricing.driverOneway;

    if (simService === "round") {
      rate = selCat.baseRatePerKm.intercity_round;
      const minRoundKm = selCat.minKmPerDayRound ?? 250;
      if (simDistance < minRoundKm) {
        billableKm = minRoundKm;
        isMinKmApplied = true;
      }
      minKmRule = `Min ${minRoundKm} km/day guarantee applied`;
      calculatedBase = Math.round(billableKm * rate);
      tolls = pricing.tollRound;
      driver = selCat.driverAllowanceRound !== undefined ? selCat.driverAllowanceRound : pricing.driverRound;
    } else if (simService === "oneway") {
      rate = selCat.baseRatePerKm.intercity_oneway;
      const minOnewayKm = selCat.minKmOneWay ?? 130;
      if (simDistance < minOnewayKm) {
        billableKm = minOnewayKm;
        isMinKmApplied = true;
      }
      minKmRule = `Min ${minOnewayKm} km guarantee applied`;
      calculatedBase = Math.round(billableKm * rate);
      tolls = pricing.tollOneway;
      driver = pricing.driverOneway;
    } else if (simService === "airport") {
      rate = selCat.baseRatePerKm.airport;
      const minAirport = selCat.baseFareMin.airport;
      calculatedBase = Math.max(minAirport, Math.round(simDistance * rate));
      tolls = pricing.tollAirport;
      driver = pricing.driverAirport;
    } else if (simService === "rental") {
      const pkg = rentalPackages.find((p) => p.id === "rent-4h40k") || rentalPackages[1] || rentalPackages[0];
      calculatedBase = selCat.rentalPackageFares?.[pkg?.id || "rent-4h40k"] ?? 1649;
      rate = selCat.rentalExtraKmRate ?? 16;
      billableKm = pkg?.km || 40;
      minKmRule = `${pkg?.hours || 4}h / ${pkg?.km || 40}km Package (${selCat.rentalExtraKmRate ?? 16}/extra km, ₹${selCat.rentalExtraHrRate ?? 150}/extra hr)`;
      tolls = 0;
      driver = 0;
    }
    const vehicleInterstate = selCat.interstateCharge !== undefined ? selCat.interstateCharge : pricing.interstateFee;
    const interstate = simInterstateCross && pricing.interstateMode !== "none" ? vehicleInterstate : 0;
    const subtotal = calculatedBase + tolls + driver + interstate;

    // Discount
    let discount = 0;
    if (flashSaleActive && flashDiscountPct > 0) {
      discount = Math.round((subtotal * flashDiscountPct) / 100);
    }
    if (simSelectedCoupon) {
      const coup = coupons.find((c) => c.code === simSelectedCoupon && c.isActive);
      if (coup && subtotal >= coup.minAmount) {
        let coupSaving = coup.discountType === "percent" ? Math.round((subtotal * coup.value) / 100) : coup.value;
        if (coup.maxDiscount) coupSaving = Math.min(coupSaving, coup.maxDiscount);
        discount = Math.max(discount, coupSaving);
      }
    }

    const taxableAmount = Math.max(0, subtotal - discount);
    const gst = Math.round((taxableAmount * pricing.gstRate) / 100);
    const finalTotal = taxableAmount + gst;
    const originalTotal = subtotal + Math.round((subtotal * pricing.gstRate) / 100);

    return {
      rate,
      baseFare: calculatedBase,
      tolls,
      driver,
      interstate,
      discount,
      gst,
      finalTotal,
      originalTotal,
      selectedCategory: selCat
    };
  }, [fleet, pricing, coupons, flashSaleActive, flashDiscountPct, simService, simVehicleId, simDistance, simInterstateCross, simSelectedCoupon]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center space-x-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Matching User Screenshot */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[#0043DC] text-[11px] font-black tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#0043DC] animate-pulse"></span>
            <span>ADMIN CONTROL PANEL</span>
          </div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Fleet, Pricing & Interstate Rules</h1>
          <p className="text-xs text-slate-500 max-w-2xl font-medium">
            Update car fleet types, basic per-km fares, interstate cross-border permits, tolls, and promotional flash sale offers in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={resetAllDefaults}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Reset Factory Defaults</span>
          </button>
          <a
            href="http://localhost:4200"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-500/20 transition cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Test Customer View</span>
          </a>
        </div>
      </div>

      {/* 4 Metric / KPI Summary Cards Matching User Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Vehicle Fleet */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0043DC] flex items-center justify-center flex-shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE VEHICLE FLEET</div>
            <div className="text-xl font-black text-slate-950 mt-0.5">{fleet.filter((f) => f.isActive).length} Categories</div>
            <div className="text-[11px] text-slate-500 font-medium truncate max-w-[170px]">Hatchback, Sedan, SUV, Innova</div>
          </div>
        </div>

        {/* Card 2: Basic KMS Fare Range */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">BASIC KMS FARE RANGE</div>
            <div className="text-xl font-black text-slate-950 mt-0.5">₹14 – ₹29 / km</div>
            <div className="text-[11px] text-slate-500 font-medium">Distance × Rate is basic fare</div>
          </div>
        </div>

        {/* Card 3: Interstate Cross Permit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">INTERSTATE CROSS PERMIT</div>
            <div className="text-xl font-black text-slate-950 mt-0.5">₹{pricing.interstateFee} · {pricing.interstateMode === "auto" ? "Auto" : pricing.interstateMode === "all" ? "Always" : "Off"}</div>
            <div className="text-[11px] text-slate-500 font-medium">Auto-detects State Border Crossings</div>
          </div>
        </div>

        {/* Card 4: Flash Sale Offers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">FLASH SALE OFFERS</div>
            <div className="text-xl font-black text-slate-950 mt-0.5">{flashSaleActive ? flashDiscountPct + "% Off Active" : "Inactive"}</div>
            <div className="text-[11px] text-slate-500 font-medium">Dynamic Strikethrough Pricing</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Matching User Screenshot */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-3 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("fleet")}
          className={"flex items-center space-x-2 px-5 py-3 text-xs font-black border-b-2 transition cursor-pointer whitespace-nowrap " + (
            activeTab === "fleet" ? "border-[#0043DC] text-[#0043DC]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Car className="w-4 h-4" />
          <span>Cars Fleet & Rates</span>
        </button>

        <button
          onClick={() => setActiveTab("pricing")}
          className={"flex items-center space-x-2 px-5 py-3 text-xs font-black border-b-2 transition cursor-pointer whitespace-nowrap " + (
            activeTab === "pricing" ? "border-[#0043DC] text-[#0043DC]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <DollarSign className="w-4 h-4" />
          <span>KMS Fares, Tolls & Interstate Permit</span>
        </button>

        <button
          onClick={() => setActiveTab("rentals")}
          className={"flex items-center space-x-2 px-5 py-3 text-xs font-black border-b-2 transition cursor-pointer whitespace-nowrap " + (
            activeTab === "rentals" ? "border-[#0043DC] text-[#0043DC]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Hourly Rentals</span>
        </button>

        <button
          onClick={() => setActiveTab("offers")}
          className={"flex items-center space-x-2 px-5 py-3 text-xs font-black border-b-2 transition cursor-pointer whitespace-nowrap " + (
            activeTab === "offers" ? "border-[#0043DC] text-[#0043DC]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Tag className="w-4 h-4" />
          <span>Offers & Flash Sale</span>
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={"flex items-center space-x-2 px-5 py-3 text-xs font-black border-b-2 transition cursor-pointer whitespace-nowrap " + (
            activeTab === "simulator" ? "border-[#0043DC] text-[#0043DC]" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Live Fare Simulator & Preview</span>
        </button>
      </div>

      {/* TAB 1: CARS FLEET & RATES */}
      {activeTab === "fleet" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 p-6 shadow-xs space-y-5 -mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Car Categories & Fleet Master</h2>
              <p className="text-xs text-slate-500 font-medium">Manage vehicle details, models, passenger/luggage capacities, AC, ratings, badges, and per-km pricing rates.</p>
            </div>
            <button
              onClick={() => {
                setEditingVehicle({
                  id: "veh_" + Date.now(),
                  categoryName: "",
                  models: "",
                  seats: 4,
                  luggage: 3,
                  hasAc: true,
                  tag: "",
                  badge: "",
                  ratingScore: 4.8,
                  reviewCount: "1,000",
                  isActive: true,
                  baseRatePerKm: { incity: 20, intercity_oneway: 18, intercity_round: 15, airport: 22, rental_extra_km: 18 },
                  minKmOneWay: 130,
                  minKmPerDayRound: 250,
                  rentalExtraKmRate: 16,
                  rentalExtraHrRate: 150,
                  rentalPackageFares: {
                    "rent-2h20k": 949,
                    "rent-4h40k": 1649,
                    "rent-8h80k": 2799,
                    "rent-12h120k": 3899
                  },
                  baseFareMin: { incity: 300, intercity_oneway: 2210, intercity_round: 3625, airport: 900 }
                });
                setIsVehicleModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Vehicle Category</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Category & Type</th>
                  <th className="py-3 px-4">Included Models</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Per-KM Rates (₹/km)</th>
                  <th className="py-3 px-4">Min Billable KMs (1-Way / Round)</th>
                  <th className="py-3 px-4">Ratings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {fleet.map((veh) => (
                  <tr key={veh.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0043DC] flex items-center justify-center font-black">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                            <span>{veh.categoryName}</span>
                            {veh.badge && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-[#0043DC] font-black">
                                {veh.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{veh.tag}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-normal text-slate-600 max-w-xs">{veh.models}</td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {veh.seats} Seats • {veh.luggage} Bags • {veh.hasAc ? "AC" : "Non-AC"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 font-bold text-slate-900">
                        <div>1-Way: <span className="text-[#0043DC]">₹{veh.baseRatePerKm.intercity_oneway}</span>/km</div>
                        <div className="text-[11px] text-slate-500 font-normal">Round: ₹{veh.baseRatePerKm.intercity_round}/km</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="text-slate-900 flex items-center space-x-1">
                        <span className="text-[#0043DC]">1-Way: {veh.minKmOneWay ?? 130} KM</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Min ₹{((veh.minKmOneWay ?? 130) * veh.baseRatePerKm.intercity_oneway).toLocaleString('en-IN')})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                        Round: {veh.minKmPerDayRound ?? 300} KM/day <span className="text-slate-400 font-normal">(₹{((veh.minKmPerDayRound ?? 250) * veh.baseRatePerKm.intercity_round).toLocaleString('en-IN')}/d)</span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center space-x-1.5">
                        <span>Driver: 1-Way ₹{veh.driverAllowanceOneway ?? 300} • Round ₹{veh.driverAllowanceRound ?? 400}/d</span>
                        <span>•</span>
                        <span>Interstate: ₹{veh.interstateCharge ?? 500}</span>
                      </div>
                      <div className="text-[10px] text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded mt-1 font-bold">
                        Rental: ₹{veh.rentalExtraKmRate ?? 16}/km • ₹{veh.rentalExtraHrRate ?? 150}/hr
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-amber-500">
                      ★ {veh.ratingScore} <span className="text-slate-400 font-normal">({veh.reviewCount})</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingVehicle(JSON.parse(JSON.stringify(veh)));
                            setIsVehicleModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-[#0043DC] transition cursor-pointer"
                          title="Edit Category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(veh.id, veh.categoryName)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const updated = fleet.map((f) => (f.id === veh.id ? { ...f, isActive: !f.isActive } : f));
                            saveFleet(updated);
                          }}
                          className={"px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer " + (
                            veh.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}
                        >
                          {veh.isActive ? "Active" : "Disabled"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING RULES */}
      {activeTab === "pricing" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 p-6 shadow-xs space-y-6 -mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Pricing Engine & Inclusions Configuration</h2>
              <p className="text-xs text-slate-500 font-medium">Configure KMS base calculation, interstate border permits, tolls, chauffeur allowance, and GST tax.</p>
            </div>
            <button
              onClick={savePricing}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Pricing Rules</span>
            </button>
          </div>

          <div className="rounded-xl p-4 bg-blue-50/70 border border-blue-200/60 flex items-start space-x-3 text-xs text-slate-700">
            <Info className="w-5 h-5 text-[#0043DC] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 font-bold block mb-1">KMS-Based Basic Fare Calculation Rule:</strong>
              Basic Vehicle Fare = <code className="bg-white px-2 py-0.5 rounded border border-blue-200 font-bold text-[#0043DC]">Math.max(Minimum Base Fare, Distance (KM) × Vehicle Per-KM Rate)</code>. Each vehicle category sets its own per-km rates under the Fleet tab.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Interstate Border Crossing Permit</h3>
                    <div className="text-[11px] text-slate-500">Cross-state commercial tax & road entry permit</div>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">Active</span>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Application Mode</label>
                  <select
                    value={pricing.interstateMode}
                    onChange={(e) => setPricing({ ...pricing, interstateMode: e.target.value as any })}
                    className="w-full text-xs font-medium rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  >
                    <option value="auto">Auto-detect State Crossing from Pickup & Drop (Recommended)</option>
                    <option value="all">Always Apply to All Intercity Trips</option>
                    <option value="none">Disabled (No Interstate Charges)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Interstate State Permit Fee (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={pricing.interstateFee}
                      onChange={(e) => setPricing({ ...pricing, interstateFee: Number(e.target.value) })}
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Default ₹350 per cross-border trip. Displayed in Fare Inclusions.</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tolls & Highway FASTag Charges</h3>
                  <div className="text-[11px] text-slate-500">Included highway fastag charges for standard routes</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Intercity 1-Way (₹)</label>
                  <input
                    type="number"
                    value={pricing.tollOneway}
                    onChange={(e) => setPricing({ ...pricing, tollOneway: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Intercity Round (₹)</label>
                  <input
                    type="number"
                    value={pricing.tollRound}
                    onChange={(e) => setPricing({ ...pricing, tollRound: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Airport Toll (₹)</label>
                  <input
                    type="number"
                    value={pricing.tollAirport}
                    onChange={(e) => setPricing({ ...pricing, tollAirport: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">In-City Toll (₹)</label>
                  <input
                    type="number"
                    value={pricing.tollIncity}
                    onChange={(e) => setPricing({ ...pricing, tollIncity: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chauffeur / Driver Allowance</h3>
                  <div className="text-[11px] text-slate-500">Driver food, stay & duty allowance for highway runs</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">1-Way Driver Batta (₹)</label>
                  <input
                    type="number"
                    value={pricing.driverOneway}
                    onChange={(e) => setPricing({ ...pricing, driverOneway: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Round-Trip Batta (₹)</label>
                  <input
                    type="number"
                    value={pricing.driverRound}
                    onChange={(e) => setPricing({ ...pricing, driverRound: Number(e.target.value) })}
                    className="w-full p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0043DC] flex items-center justify-center font-black">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Regulatory GST Tax</h3>
                  <div className="text-[11px] text-slate-500">Mandatory GST on commercial passenger road transport</div>
                </div>
              </div>

              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">GST Tax Percentage (%)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    value={pricing.gstRate}
                    onChange={(e) => setPricing({ ...pricing, gstRate: Number(e.target.value) })}
                    className="w-32 p-2.5 text-sm font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                  <span className="text-xs text-slate-500">Standard 5% tax on road transportation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: HOURLY RENTALS */}
      {activeTab === "rentals" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 p-6 shadow-xs space-y-6 -mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-slate-900">Hourly Rental Packages & Fleet Pricing</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-[#0043DC] font-black">City Local Rentals</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Configure city rental durations, kilometer allowances, extra KM rates, and extra hour charges synced with the website.</p>
            </div>
            <button
              onClick={() => {
                setEditingRentalPkg({
                  id: "rent-" + Date.now().toString(36),
                  hours: 6,
                  km: 60,
                  label: "6 Hours / 60 KMs",
                  description: "Custom city rental package",
                  popular: false
                });
                setIsRentalPkgModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Package</span>
            </button>
          </div>

          {/* Quick Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <span className="text-[11px] font-bold text-blue-700">Active Packages</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{rentalPackages.length} Available</div>
              <div className="text-[11px] text-slate-500">2h/20km to 12h/120km</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600">Extra KM Rate Range</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">₹14 - ₹27 /km</div>
              <div className="text-[11px] text-slate-500">Based on vehicle class</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600">Extra Hour Rate Range</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">₹120 - ₹300 /hr</div>
              <div className="text-[11px] text-slate-500">Chauffeur waiting charge</div>
            </div>
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
              <span className="text-[11px] font-bold text-emerald-700">Driver Allowance & Fuel</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">Included</div>
              <div className="text-[11px] text-slate-500">In all local rental packages</div>
            </div>
          </div>

          {/* Packages Duration & Allowance Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Standard Rental Package Definitions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rentalPackages.map((pkg) => (
                <div key={pkg.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0043DC] transition shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-black text-slate-900">{pkg.label}</span>
                        {pkg.popular && (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Popular</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{pkg.description}</div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingRentalPkg(JSON.parse(JSON.stringify(pkg)));
                        setIsRentalPkgModalOpen(true);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0043DC] transition cursor-pointer"
                      title="Edit Package"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Duration</span>
                      <strong className="text-xs text-slate-900 font-black">{pkg.hours} Hours</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Included KM</span>
                      <strong className="text-xs text-slate-900 font-black">{pkg.km} KMs</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Rental Matrix Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Vehicle Rental Pricing Matrix</h3>
                <p className="text-[11px] text-slate-500">Base prices displayed directly on cab selection cards when customers pick a rental package.</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Vehicle Category</th>
                    <th className="py-3 px-4">2h / 20km</th>
                    <th className="py-3 px-4">4h / 40km</th>
                    <th className="py-3 px-4">8h / 80km (Full Day)</th>
                    <th className="py-3 px-4">12h / 120km</th>
                    <th className="py-3 px-4">Extra KM Rate</th>
                    <th className="py-3 px-4">Extra Hour Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {fleet.map((veh) => {
                    const fares = veh.rentalPackageFares || {};
                    return (
                      <tr key={veh.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{veh.categoryName}</div>
                          <div className="text-[11px] text-slate-400">{veh.models}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{fares["rent-2h20k"] ?? 799}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{fares["rent-4h40k"] ?? 1399}
                        </td>
                        <td className="py-3.5 px-4 font-black text-[#0043DC]">
                          ₹{fares["rent-8h80k"] ?? 2399}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{fares["rent-12h120k"] ?? 3299}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          ₹{veh.rentalExtraKmRate ?? 16} /km
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          ₹{veh.rentalExtraHrRate ?? 150} /hr
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setEditingRentalRatesVehicle(JSON.parse(JSON.stringify(veh)));
                              setIsRentalRatesModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-[#0043DC] transition cursor-pointer"
                            title="Edit Rental Pricing"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OFFERS */}
      {activeTab === "offers" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 p-6 shadow-xs space-y-6 -mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Promotions & Discount Campaigns</h2>
              <p className="text-xs text-slate-500 font-medium">Control homepage flash banners, strikethrough customer discounts, and active promo coupon codes.</p>
            </div>
            <button
              onClick={() => {
                setEditingCoupon({
                  id: "c_" + Date.now(),
                  code: "",
                  discountType: "percent",
                  value: 15,
                  maxDiscount: 300,
                  minAmount: 1000,
                  desc: "",
                  isActive: true
                });
                setIsCouponModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white text-xs font-black shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Coupon</span>
            </button>
          </div>

          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/20 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Promotional Flash Sale Engine</h3>
                  <div className="text-[11px] text-slate-500">Applies automatic strikethrough pricing across all customer cab cards</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-600">Flash Sale Status:</span>
                <button
                  onClick={() => saveFlashSale(!flashSaleActive, flashDiscountPct)}
                  className={"px-4 py-1.5 rounded-full text-xs font-black transition cursor-pointer " + (
                    flashSaleActive ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "bg-slate-200 text-slate-600"
                  )}
                >
                  {flashSaleActive ? "ACTIVE (ON)" : "PAUSED (OFF)"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={flashDiscountPct}
                  onChange={(e) => saveFlashSale(flashSaleActive, Number(e.target.value))}
                  className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Live Customer Banner Preview</label>
                <div className="p-3 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>FLAT {flashDiscountPct}% OFF ON INTERCITY TRIPS</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">Auto Applied</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount Details</th>
                  <th className="py-3 px-4">Min Ride Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-black text-slate-900 tracking-wider">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-[#0043DC]">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {c.discountType === "percent" ? c.value + "% Off (Max ₹" + c.maxDiscount + ")" : "Flat ₹" + c.value + " Off"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">{c.desc}</div>
                    </td>
                    <td className="py-3 px-4 font-bold">₹{c.minAmount}</td>
                    <td className="py-3 px-4">
                      <span className={"px-2 py-0.5 rounded text-[11px] font-bold " + (c.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingCoupon(JSON.parse(JSON.stringify(c)));
                            setIsCouponModalOpen(true);
                          }}
                          className="p-1 rounded hover:bg-blue-50 text-slate-500 hover:text-[#0043DC] transition cursor-pointer"
                          title="Edit Coupon"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(c.id, c.code)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const updated = coupons.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x));
                            saveCoupons(updated);
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {c.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200/80 p-6 shadow-xs space-y-6 -mt-6">
          <div>
            <h2 className="text-base font-black text-slate-900">Real-Time Fare Calculator & Live Card Preview</h2>
            <p className="text-xs text-slate-500 font-medium">Test distance-based pricing formulas and view the exact cab card rendered for customer bookings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-5 rounded-2xl border border-slate-200 p-5 bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Simulator Parameters</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Service Type</label>
                  <select
                    value={simService}
                    onChange={(e) => setSimService(e.target.value as any)}
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 p-2 bg-white"
                  >
                    <option value="oneway">Intercity One-Way</option>
                    <option value="round">Intercity Round-Trip</option>
                    <option value="airport">Airport Transfer</option>
                    <option value="rental">Hourly Rental</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Vehicle Category</label>
                  <select
                    value={simVehicleId}
                    onChange={(e) => setSimVehicleId(e.target.value)}
                    className="w-full text-xs font-medium rounded-xl border border-slate-200 p-2 bg-white"
                  >
                    {fleet.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.categoryName} (₹{f.baseRatePerKm.intercity_oneway}/km)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>Trip Distance</span>
                  <span className="text-[#0043DC] font-black">{simDistance} KM</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="800"
                  step="5"
                  value={simDistance}
                  onChange={(e) => setSimDistance(Number(e.target.value))}
                  className="w-full accent-[#0043DC] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simInterstateCross}
                    onChange={(e) => setSimInterstateCross(e.target.checked)}
                    className="w-4 h-4 accent-[#0043DC] rounded"
                  />
                  <span>Interstate State Border Crossing</span>
                </label>
                <span className="text-xs font-bold text-amber-600">+₹{pricing.interstateFee}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center justify-between">
                  <span>Base Rate:</span>
                  <span className="font-bold text-slate-900">₹{simCalculation.rate} / km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Calculated Base KMS Fare:</span>
                  <span className="font-bold text-slate-900">₹{simCalculation.baseFare.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Included Highway Tolls:</span>
                  <span className="font-bold text-slate-900">₹{simCalculation.tolls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Chauffeur Allowance:</span>
                  <span className="font-bold text-slate-900">₹{simCalculation.driver}</span>
                </div>
                {simCalculation.interstate > 0 && (
                  <div className="flex items-center justify-between text-amber-700">
                    <span>Interstate Border Permit:</span>
                    <span className="font-bold">₹{simCalculation.interstate}</span>
                  </div>
                )}
                {simCalculation.discount > 0 && (
                  <div className="flex items-center justify-between text-rose-600 font-bold">
                    <span>Discount Savings:</span>
                    <span>-₹{simCalculation.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>GST ({pricing.gstRate}%):</span>
                  <span className="font-bold text-slate-900">₹{simCalculation.gst}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-950">
                  <span>Final Customer Fare:</span>
                  <span className="text-[#0043DC] text-base">₹{simCalculation.finalTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">LIVE CUSTOMER CARD PREVIEW</span>
                <span className="text-[11px] font-bold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Matches Site Exactly</span>
                </span>
              </div>

              <div className="rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-lg shadow-blue-500/5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-base font-black text-slate-900">{simCalculation.selectedCategory.categoryName}</h4>
                      {simCalculation.selectedCategory.badge && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#0043DC]">
                          {simCalculation.selectedCategory.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{simCalculation.selectedCategory.models}</p>
                    <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-600 font-bold">
                      <span>★ {simCalculation.selectedCategory.ratingScore}</span>
                      <span>•</span>
                      <span>{simCalculation.selectedCategory.seats} Seats</span>
                      <span>•</span>
                      <span>{simCalculation.selectedCategory.luggage} Bags</span>
                      <span>•</span>
                      <span className="text-emerald-600">AC</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {simCalculation.discount > 0 && (
                      <div className="text-xs text-slate-400 line-through font-bold">
                        ₹{simCalculation.originalTotal.toLocaleString()}
                      </div>
                    )}
                    <div className="text-2xl font-black text-[#0043DC]">
                      ₹{simCalculation.finalTotal.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">All inclusive (Tolls + Taxes)</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md">
                    ✓ Free cancellation up to 2 hours prior
                  </span>
                  <button className="px-4 py-2 rounded-xl bg-[#0043DC] text-white text-xs font-black shadow-md">
                    Select Cab
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {isVehicleModalOpen && editingVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingVehicle.id ? "Edit Vehicle Category" : "Add Vehicle Category"}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Category Name</label>
                <input
                  type="text"
                  value={editingVehicle.categoryName}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, categoryName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC] placeholder-slate-400"
                  placeholder="e.g. Hatchback, Sedan, SUV"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Included Car Models</label>
                <input
                  type="text"
                  value={editingVehicle.models}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, models: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC] placeholder-slate-400"
                  placeholder="e.g. Wagon R, Celerio, Tata Tiago"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">1-Way Per-KM Rate (₹)</label>
                  <input
                    type="number"
                    value={editingVehicle.baseRatePerKm.intercity_oneway}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        baseRatePerKm: { ...editingVehicle.baseRatePerKm, intercity_oneway: Number(e.target.value) }
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Round Per-KM Rate (₹)</label>
                  <input
                    type="number"
                    value={editingVehicle.baseRatePerKm.intercity_round}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        baseRatePerKm: { ...editingVehicle.baseRatePerKm, intercity_round: Number(e.target.value) }
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-900">Min KM for 1-Way (KM)</label>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Per Trip</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={editingVehicle.minKmOneWay ?? 130}
                      onChange={(e) => {
                        const km = Number(e.target.value);
                        setEditingVehicle({
                          ...editingVehicle,
                          minKmOneWay: km,
                          baseFareMin: {
                            ...editingVehicle.baseFareMin,
                            intercity_oneway: km * editingVehicle.baseRatePerKm.intercity_oneway
                          }
                        });
                      }}
                      className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC]"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">KM</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    Effective min fare: <strong className="text-slate-900 font-bold">₹{((editingVehicle.minKmOneWay ?? 130) * editingVehicle.baseRatePerKm.intercity_oneway).toLocaleString('en-IN')}</strong> ({editingVehicle.minKmOneWay ?? 130} km × ₹{editingVehicle.baseRatePerKm.intercity_oneway}/km)
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-900">Min KM/Day for Round (KM/day)</label>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Per Day</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={editingVehicle.minKmPerDayRound ?? 250}
                      onChange={(e) => {
                        const km = Number(e.target.value);
                        setEditingVehicle({
                          ...editingVehicle,
                          minKmPerDayRound: km,
                          baseFareMin: {
                            ...editingVehicle.baseFareMin,
                            intercity_round: km * editingVehicle.baseRatePerKm.intercity_round
                          }
                        });
                      }}
                      className="w-full p-2.5 pr-14 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC] focus:border-[#0043DC]"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">KM/Day</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium">
                    Effective min fare/day: <strong className="text-slate-900 font-bold">₹{((editingVehicle.minKmPerDayRound ?? 250) * editingVehicle.baseRatePerKm.intercity_round).toLocaleString('en-IN')}</strong> ({editingVehicle.minKmPerDayRound ?? 250} km × ₹{editingVehicle.baseRatePerKm.intercity_round}/km)
                  </div>
                </div>
              </div>

                            <div className="grid grid-cols-3 gap-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
                <div>
                  <label className="font-bold text-slate-900 block mb-1">1-Way Driver Batta (₹/Trip)</label>
                  <input
                    type="number"
                    value={editingVehicle.driverAllowanceOneway ?? 300}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        driverAllowanceOneway: Number(e.target.value)
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">Charged once per 1-way trip</div>
                </div>
                <div>
                  <label className="font-bold text-slate-900 block mb-1">Round Driver Batta (₹/Day)</label>
                  <input
                    type="number"
                    value={editingVehicle.driverAllowanceRound ?? 400}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        driverAllowanceRound: Number(e.target.value)
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">Charged per calendar day</div>
                </div>
                <div>
                  <label className="font-bold text-slate-900 block mb-1">Interstate Permit (₹)</label>
                  <input
                    type="number"
                    value={editingVehicle.interstateCharge ?? 500}
                    onChange={(e) =>
                      setEditingVehicle({
                        ...editingVehicle,
                        interstateCharge: Number(e.target.value)
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">Border crossing permit fee</div>
                </div>
              </div>

              {/* Hourly Rental Configuration in Vehicle Edit Modal */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-[#0043DC]" />
                    <span>Hourly Rental Rates & Packages</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">City Local Packages</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Rental Extra KM Rate (₹/km)</label>
                    <input
                      type="number"
                      value={editingVehicle.rentalExtraKmRate ?? 16}
                      onChange={(e) =>
                        setEditingVehicle({
                          ...editingVehicle,
                          rentalExtraKmRate: Number(e.target.value),
                          baseRatePerKm: { ...editingVehicle.baseRatePerKm, rental_extra_km: Number(e.target.value) }
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Rental Extra Hour Rate (₹/hr)</label>
                    <input
                      type="number"
                      value={editingVehicle.rentalExtraHrRate ?? 150}
                      onChange={(e) =>
                        setEditingVehicle({
                          ...editingVehicle,
                          rentalExtraHrRate: Number(e.target.value)
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg text-slate-900 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Standard Package Base Fares (₹)</label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">2h / 20km</span>
                      <input
                        type="number"
                        value={editingVehicle.rentalPackageFares?.['rent-2h20k'] ?? 949}
                        onChange={(e) =>
                          setEditingVehicle({
                            ...editingVehicle,
                            rentalPackageFares: {
                              ...(editingVehicle.rentalPackageFares || {}),
                              'rent-2h20k': Number(e.target.value)
                            }
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded-md text-slate-900 bg-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">4h / 40km</span>
                      <input
                        type="number"
                        value={editingVehicle.rentalPackageFares?.['rent-4h40k'] ?? 1649}
                        onChange={(e) =>
                          setEditingVehicle({
                            ...editingVehicle,
                            rentalPackageFares: {
                              ...(editingVehicle.rentalPackageFares || {}),
                              'rent-4h40k': Number(e.target.value)
                            }
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded-md text-slate-900 bg-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">8h / 80km</span>
                      <input
                        type="number"
                        value={editingVehicle.rentalPackageFares?.['rent-8h80k'] ?? 2799}
                        onChange={(e) =>
                          setEditingVehicle({
                            ...editingVehicle,
                            rentalPackageFares: {
                              ...(editingVehicle.rentalPackageFares || {}),
                              'rent-8h80k': Number(e.target.value)
                            }
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded-md text-slate-900 bg-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">12h / 120km</span>
                      <input
                        type="number"
                        value={editingVehicle.rentalPackageFares?.['rent-12h120k'] ?? 3899}
                        onChange={(e) =>
                          setEditingVehicle({
                            ...editingVehicle,
                            rentalPackageFares: {
                              ...(editingVehicle.rentalPackageFares || {}),
                              'rent-12h120k': Number(e.target.value)
                            }
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded-md text-slate-900 bg-white font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {fleet.some((f) => f.id === editingVehicle.id) ? (
                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(editingVehicle.id, editingVehicle.categoryName || "this category")}
                  className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Category</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exists = fleet.some((f) => f.id === editingVehicle.id);
                    const updated = exists ? fleet.map((f) => (f.id === editingVehicle.id ? editingVehicle : f)) : [...fleet, editingVehicle];
                    saveFleet(updated);
                    setIsVehicleModalOpen(false);
                  }}
                  className="px-5 py-2 text-xs font-black bg-[#0043DC] hover:bg-blue-600 text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rental Package Modal */}
      {isRentalPkgModalOpen && editingRentalPkg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingRentalPkg.id ? "Edit Rental Package" : "Add Rental Package"}
              </h3>
              <button onClick={() => setIsRentalPkgModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Package Title / Label</label>
                <input
                  type="text"
                  value={editingRentalPkg.label}
                  onChange={(e) => setEditingRentalPkg({ ...editingRentalPkg, label: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  placeholder="e.g. 4 Hours / 40 KMs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    value={editingRentalPkg.hours}
                    onChange={(e) => setEditingRentalPkg({ ...editingRentalPkg, hours: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Included Distance (KMs)</label>
                  <input
                    type="number"
                    value={editingRentalPkg.km}
                    onChange={(e) => setEditingRentalPkg({ ...editingRentalPkg, km: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Short Description</label>
                <input
                  type="text"
                  value={editingRentalPkg.description}
                  onChange={(e) => setEditingRentalPkg({ ...editingRentalPkg, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  placeholder="e.g. Half day city shopping & multiple stops"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pkg-popular"
                  checked={Boolean(editingRentalPkg.popular)}
                  onChange={(e) => setEditingRentalPkg({ ...editingRentalPkg, popular: e.target.checked })}
                  className="w-4 h-4 text-[#0043DC] rounded"
                />
                <label htmlFor="pkg-popular" className="font-bold text-slate-800 cursor-pointer">
                  Tag as "Popular" Package
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {rentalPackages.some((p) => p.id === editingRentalPkg.id) ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this rental package?")) {
                      const updated = rentalPackages.filter((p) => p.id !== editingRentalPkg.id);
                      saveRentalPackages(updated);
                      setIsRentalPkgModalOpen(false);
                    }
                  }}
                  className="flex items-center space-x-1 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRentalPkgModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exists = rentalPackages.some((p) => p.id === editingRentalPkg.id);
                    const updated = exists
                      ? rentalPackages.map((p) => (p.id === editingRentalPkg.id ? editingRentalPkg : p))
                      : [...rentalPackages, editingRentalPkg];
                    saveRentalPackages(updated);
                    setIsRentalPkgModalOpen(false);
                  }}
                  className="px-5 py-2 text-xs font-black bg-[#0043DC] hover:bg-blue-600 text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  Save Package
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Rental Pricing for a Vehicle */}
      {isRentalRatesModalOpen && editingRentalRatesVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rental Rates: {editingRentalRatesVehicle.categoryName}
                </h3>
                <span className="text-[11px] text-slate-400">{editingRentalRatesVehicle.models}</span>
              </div>
              <button onClick={() => setIsRentalRatesModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Extra KM Rate (₹/km)</label>
                  <input
                    type="number"
                    value={editingRentalRatesVehicle.rentalExtraKmRate ?? 16}
                    onChange={(e) =>
                      setEditingRentalRatesVehicle({
                        ...editingRentalRatesVehicle,
                        rentalExtraKmRate: Number(e.target.value),
                        baseRatePerKm: {
                          ...editingRentalRatesVehicle.baseRatePerKm,
                          rental_extra_km: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Extra Hour Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={editingRentalRatesVehicle.rentalExtraHrRate ?? 150}
                    onChange={(e) =>
                      setEditingRentalRatesVehicle({
                        ...editingRentalRatesVehicle,
                        rentalExtraHrRate: Number(e.target.value)
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-2">Package Base Fares (₹)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">2 Hours / 20 KMs</span>
                    <input
                      type="number"
                      value={editingRentalRatesVehicle.rentalPackageFares?.['rent-2h20k'] ?? 949}
                      onChange={(e) =>
                        setEditingRentalRatesVehicle({
                          ...editingRentalRatesVehicle,
                          rentalPackageFares: {
                            ...(editingRentalRatesVehicle.rentalPackageFares || {}),
                            'rent-2h20k': Number(e.target.value)
                          }
                        })
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">4 Hours / 40 KMs</span>
                    <input
                      type="number"
                      value={editingRentalRatesVehicle.rentalPackageFares?.['rent-4h40k'] ?? 1649}
                      onChange={(e) =>
                        setEditingRentalRatesVehicle({
                          ...editingRentalRatesVehicle,
                          rentalPackageFares: {
                            ...(editingRentalRatesVehicle.rentalPackageFares || {}),
                            'rent-4h40k': Number(e.target.value)
                          }
                        })
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">8 Hours / 80 KMs (Full Day)</span>
                    <input
                      type="number"
                      value={editingRentalRatesVehicle.rentalPackageFares?.['rent-8h80k'] ?? 2799}
                      onChange={(e) =>
                        setEditingRentalRatesVehicle({
                          ...editingRentalRatesVehicle,
                          rentalPackageFares: {
                            ...(editingRentalRatesVehicle.rentalPackageFares || {}),
                            'rent-8h80k': Number(e.target.value)
                          }
                        })
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600 block mb-1">12 Hours / 120 KMs</span>
                    <input
                      type="number"
                      value={editingRentalRatesVehicle.rentalPackageFares?.['rent-12h120k'] ?? 3899}
                      onChange={(e) =>
                        setEditingRentalRatesVehicle({
                          ...editingRentalRatesVehicle,
                          rentalPackageFares: {
                            ...(editingRentalRatesVehicle.rentalPackageFares || {}),
                            'rent-12h120k': Number(e.target.value)
                          }
                        })
                      }
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRentalRatesModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = fleet.map((f) => (f.id === editingRentalRatesVehicle.id ? editingRentalRatesVehicle : f));
                  saveFleet(updated);
                  setIsRentalRatesModalOpen(false);
                }}
                className="px-5 py-2 text-xs font-black bg-[#0043DC] hover:bg-blue-600 text-white rounded-xl shadow-md transition cursor-pointer"
              >
                Save Rental Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {isCouponModalOpen && editingCoupon && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCoupon.id ? "Edit Coupon" : "Add Coupon"}
              </h3>
              <button onClick={() => setIsCouponModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  placeholder="e.g. FLASH20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={editingCoupon.discountType}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    value={editingCoupon.value}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, value: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    value={editingCoupon.maxDiscount}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, maxDiscount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Ride Value (₹)</label>
                  <input
                    type="number"
                    value={editingCoupon.minAmount}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, minAmount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 bg-white font-black text-base focus:outline-none focus:ring-2 focus:ring-[#0043DC]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={editingCoupon.desc}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, desc: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. 15% discount on all bookings"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {coupons.some((c) => c.id === editingCoupon.id) ? (
                <button
                  type="button"
                  onClick={() => handleDeleteCoupon(editingCoupon.id, editingCoupon.code)}
                  className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Coupon</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const exists = coupons.some((c) => c.id === editingCoupon.id);
                    const updated = exists ? coupons.map((c) => (c.id === editingCoupon.id ? editingCoupon : c)) : [...coupons, editingCoupon];
                    saveCoupons(updated);
                    setIsCouponModalOpen(false);
                  }}
                  className="px-5 py-2 text-xs font-black bg-[#0043DC] hover:bg-blue-600 text-white rounded-xl shadow-md transition cursor-pointer"
                >
                  Save Coupon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
