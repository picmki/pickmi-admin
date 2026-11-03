import { LoginPage } from './components/LoginPage';
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { TripsManager } from './components/TripsManager';
import { LiveDriversMap } from './components/LiveDriversMap';
import { DriversManager } from './components/DriversManager';
import { DocumentVerification } from './components/DocumentVerification';
import { SecurityDepositTracker } from './components/SecurityDepositTracker';
import { CreateTripPage } from './components/CreateTripPage';
import { SchemaSetupModal } from './components/SchemaSetupModal';
import { DriverDetailsPage } from './components/DriverDetailsPage';
import { CustomerDetailsPage } from './components/CustomerDetailsPage';
import type { CustomerDetailRecord } from './components/WebsiteManager';
import { CustomersManager } from './components/CustomersManager';
import { BillingManager } from './components/BillingManager';
import { DriverWalletsManager } from './components/DriverWalletsManager';
import { WebsiteManager } from './components/WebsiteManager';
import { PartnersManager } from './components/PartnersManager';
import { PartnerDetailsPage } from './components/PartnerDetailsPage';
import { LiveChatAgent } from './components/LiveChatAgent';
import { INITIAL_MOCK_DRIVERS, INITIAL_MOCK_TRIPS, INITIAL_MOCK_DOCUMENTS, INITIAL_MOCK_PARTNERS, INITIAL_MOCK_PARTNER_TRIPS, INITIAL_MOCK_PARTNER_INCENTIVES } from './mockData';
import {
  supabase,
  checkDatabaseConnection,
  getDrivers,
  getTrips,
  getPendingDocuments,
  createTrip,
  updateTripStatus,
  updateTripDetails,
  deleteTrip,
  updateTripSettlement,
  createDriver,
  updateDriverOnlineStatus,
  updateDriverDepositStatus,
  updateDriverAccountStatus,
  verifyDocument,
  verifyAllDriverDocuments,
  approveDriverTripRequest,
  rejectDriverTripRequest,
  getWebsiteBookings,
  getWebsiteUsers,
  getWebsiteDriverApplications,
  getWebsiteContactSubmissions,
  approveWebsiteDriverApplication,
  updateWebsiteContactStatus,
  updateCustomerProfile,
  deleteCustomerProfile,
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  getPartnerTrips,
  createPartnerTrip,
  assignDriverToPartnerTrip,
  updatePartnerTripStatus,
  updatePartnerTripDetails,
  deletePartnerTrip,
  getPartnerIncentives,
  createPartnerIncentive,
  payPartnerIncentive,
  approvePartnerIncentive,
} from './lib/supabase';
import type { Driver, DriverDocument, Trip, TripStatus, NavTab, WebsiteBooking, WebsiteUser, WebsiteDriverApplication, WebsiteContactSubmission, Partner, PartnerTrip, PartnerIncentive, PartnerIncentivePlan } from './types';
import { AlertCircle, Menu, LayoutDashboard, Navigation, MapPin, Users, Bot } from 'lucide-react';

const VALID_TABS: NavTab[] = [
  'overview',
  'live-chat',
  'live-drivers',
  'trips',
  'create-trip',
  'billing',
  'driver-wallets',
  'drivers',
  'documents',
  'deposits',
  'partners',
  'partner-trips',
  'partner-incentives',
  'partner-details',
  'driver-details',
  'customers',
  'customer-details',
  'website-bookings',
  'website-book-cab',
  'website-users',
  'website-applications',
  'website-inquiries',
  'website-pricing-rules',
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '').trim() as NavTab;
      if (hash && VALID_TABS.includes(hash)) {
        return hash;
      }
      try {
        const saved = localStorage.getItem('pickmi_admin_active_tab') as NavTab;
        if (saved && VALID_TABS.includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'overview';
  });
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const cached = localStorage.getItem('pickmi_cached_drivers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const cached = localStorage.getItem('pickmi_cached_trips');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [documents, setDocuments] = useState<DriverDocument[]>(() => {
    try {
      const cached = localStorage.getItem('pickmi_cached_documents');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [websiteBookings, setWebsiteBookings] = useState<WebsiteBooking[]>([]);
  const [websiteUsers, setWebsiteUsers] = useState<WebsiteUser[]>([]);
  const [driverApplications, setDriverApplications] = useState<WebsiteDriverApplication[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<WebsiteContactSubmission[]>([]);
  const [partners, setPartners] = useState<Partner[]>(() => {
    try {
      const cached = localStorage.getItem("pickmi_cached_partners");
      if (cached) {
        const parsed = JSON.parse(cached);
        const real = Array.isArray(parsed) ? parsed.filter((p: any) => p && p.id && !p.id.startsWith("part_00") && p.id !== "ptn_mvj95a6a") : [];
        return real;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [partnerIncentives, setPartnerIncentives] = useState<PartnerIncentive[]>(() => {
    try {
      const cached = localStorage.getItem("pickmi_cached_partner_incentives");
      if (cached) {
        const parsed = JSON.parse(cached);
        const real = Array.isArray(parsed) ? parsed.filter((i: any) => i && i.id && !i.id.startsWith("inc_00")) : [];
        return real;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [partnerTrips, setPartnerTrips] = useState<PartnerTrip[]>(() => {
    try {
      const cached = localStorage.getItem("pickmi_cached_partner_trips");
      if (cached) {
        const parsed = JSON.parse(cached);
        const real = Array.isArray(parsed) ? parsed.filter((t: any) => t && t.id && !t.id.startsWith("pt_00") && t.partner_id !== "ptn_mvj95a6a") : [];
        return real;
      }
      return [];
    } catch {
      return [];
    }
  });
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(() => {
    try {
      const cached = localStorage.getItem("pickmi_cached_partners");
      if (cached) {
        const parsed = JSON.parse(cached);
        const real = Array.isArray(parsed) ? parsed.filter((p: any) => p && p.id && !p.id.startsWith("part_00") && p.id !== "ptn_mvj95a6a") : [];
        if (real.length > 0) return real[0];
      }
      return null;
    } catch {
      return null;
    }
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pickmi_admin_selected_driver_id') || null;
    } catch {
      return null;
    }
  });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailRecord | null>(() => {
    try {
      const saved = localStorage.getItem('pickmi_admin_selected_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [customerBackTab, setCustomerBackTab] = useState<NavTab>('website-users');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('pickmi_admin_authenticated') === 'true');

  const [supabaseStatus, setSupabaseStatus] = useState<{
    ok: boolean;
    tablesExist: boolean;
    message: string;
  }>({
    ok: false,
    tablesExist: false,
    message: 'Connecting to Supabase...',
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Load database status and entities (Fast, parallel, non-blocking)
  const loadDatabase = useCallback(async () => {
    setIsSyncing(true);

    // 1. Check connection concurrently
    checkDatabaseConnection().then(setSupabaseStatus).catch(() => {});

    // 2. Load Trips concurrently (resolves in ~200-300ms)
    const tripsPromise = getTrips()
      .then((liveTrips) => {
        if (liveTrips) {
          setTrips(liveTrips);
          try {
            localStorage.setItem('pickmi_cached_trips', JSON.stringify(liveTrips));
          } catch {}
        }
        return liveTrips;
      })
      .catch((err) => {
        console.error('getTrips error:', err);
        return null;
      });

    // 3. Load Drivers concurrently (resolves fast without heavy documents join)
    const driversPromise = getDrivers()
      .then((liveDrivers) => {
        if (liveDrivers && liveDrivers.length > 0) {
          setDrivers(liveDrivers);
          try {
            // Strip heavy base64 profile_image so browser localStorage quota (5MB) is never exceeded
            const lightDrivers = liveDrivers.map((d: any) => ({
              ...d,
              profile_image: d.profile_image && d.profile_image.length > 500 ? '' : d.profile_image,
              documents: []
            }));
            localStorage.setItem('pickmi_cached_drivers', JSON.stringify(lightDrivers));
          } catch {}
        }
        return liveDrivers;
      })
      .catch((err) => {
        console.error('getDrivers error:', err);
        return null;
      });

    // 4. Load Website data
    getWebsiteBookings().then(setWebsiteBookings).catch(() => {});
    getWebsiteUsers().then(setWebsiteUsers).catch(() => {});
    getWebsiteDriverApplications().then(setDriverApplications).catch(() => {});
    getWebsiteContactSubmissions().then(setContactSubmissions).catch(() => {});

    // 4b. Load Partners & Partner Trips
    // Clear stale deleted partner from local storage cache
    try {
      const cachedP = localStorage.getItem("pickmi_cached_partners");
      if (cachedP && (cachedP.includes("ptn_mvj95a6a") || cachedP.includes("part_00"))) {
        localStorage.removeItem("pickmi_cached_partners");
        localStorage.removeItem("pickmi_cached_partner_trips");
        localStorage.removeItem("pickmi_cached_partner_incentives");
      }
    } catch {}

    getPartners()
      .then((livePartners) => {
        const valid = Array.isArray(livePartners) ? livePartners.filter((p: any) => p && p.id !== "ptn_mvj95a6a") : [];
        setPartners(valid);
        if (valid.length > 0) {
          setSelectedPartner((prev) => {
            if (!prev || (prev.id && (prev.id.startsWith("part_00") || prev.id === "ptn_mvj95a6a"))) return valid[0];
            const found = valid.find((p) => p.id === prev.id);
            return found || valid[0];
          });
          try {
            localStorage.setItem("pickmi_cached_partners", JSON.stringify(valid));
          } catch {}
        } else {
          setSelectedPartner(null);
          try {
            localStorage.removeItem("pickmi_cached_partners");
          } catch {}
        }
      })
      .catch(() => {});

    getPartnerIncentives()
      .then((liveIncentives) => {
        const valid = Array.isArray(liveIncentives) ? liveIncentives : [];
        setPartnerIncentives(valid);
        try {
          if (valid.length > 0) {
            localStorage.setItem("pickmi_cached_partner_incentives", JSON.stringify(valid));
          } else {
            localStorage.removeItem("pickmi_cached_partner_incentives");
          }
        } catch {}
      })
      .catch(() => {});

    getPartnerTrips()
      .then((liveTrips) => {
        const valid = Array.isArray(liveTrips) ? liveTrips.filter((t: any) => t && t.partner_id && t.partner_id !== "ptn_mvj95a6a") : [];
        setPartnerTrips(valid);
        try {
          if (valid.length > 0) {
            localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(valid));
          } else {
            localStorage.removeItem("pickmi_cached_partner_trips");
          }
        } catch {}
      })
      .catch(() => {});


    // 5. Load Pending Documents in background
    const docsPromise = getPendingDocuments()
      .then((liveDocs) => {
        if (liveDocs) {
          setDocuments(liveDocs);
          try {
            localStorage.setItem('pickmi_cached_documents', JSON.stringify(liveDocs));
          } catch {}
        }
        return liveDocs;
      })
      .catch(() => null);

    // Concurrently handle mock fallback only if DB completely empty/offline
    Promise.allSettled([tripsPromise, driversPromise, docsPromise]).then(async ([tRes, dRes]) => {
      const liveDriversLoaded = dRes.status === 'fulfilled' && dRes.value && dRes.value.length > 0;
      if (!liveDriversLoaded && drivers.length === 0) {
        setDrivers(INITIAL_MOCK_DRIVERS);
        setTrips(INITIAL_MOCK_TRIPS);
        setDocuments(INITIAL_MOCK_DOCUMENTS);
      }
      setIsSyncing(false);
    });
  }, [drivers.length]);

  useEffect(() => {
    loadDatabase();

    // Subscribe to realtime database changes on trips & drivers
    const channel = supabase
      .channel('pickmi_admin_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        getTrips().then(setTrips).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => {
        getDrivers().then(setDrivers).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, () => {
        getPendingDocuments().then(setDocuments).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'website_bookings' }, () => {
        getWebsiteBookings().then(setWebsiteBookings).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'website_driver_applications' }, () => {
        getWebsiteDriverApplications().then(setDriverApplications).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'website_contact_submissions' }, () => {
        getWebsiteContactSubmissions().then(setContactSubmissions).catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDatabase]);

  // Trip Handlers
  const handleCreateTrip = async (payload: any): Promise<Trip> => {
    try {
      const newTrip = await createTrip(payload);
      setTrips((prev) => [newTrip, ...prev]);
      return newTrip;
    } catch (e: any) {
      console.warn("Could not save to Supabase, creating locally:", e);
      const tripNum = payload.trip_number || ('PM-' + Math.floor(100000 + Math.random() * 900000));
      const localTrip: Trip = {
        id: 'trip_' + Date.now(),
        trip_number: tripNum,
        customer_name: payload.customer_name || 'Customer',
        customer_phone: payload.customer_phone || '+91 98000 00000',
        pickup_location: payload.pickup_location || 'Pickup Point',
        pickup_latitude: payload.pickup_latitude || 12.9716,
        pickup_longitude: payload.pickup_longitude || 77.5946,
        drop_location: payload.drop_location || 'Drop Point',
        drop_latitude: payload.drop_latitude || 12.9352,
        drop_longitude: payload.drop_longitude || 77.6245,
        pickup_date: payload.pickup_date || 'Today',
        pickup_time: payload.pickup_time || 'Now',
        fare: Number(payload.fare) || 1200,
        distance: payload.distance || '35 km',
        vehicle_type: payload.vehicle_type || 'Sedan',
        trip_type: payload.trip_type || 'One-way',
        payment_method: payload.payment_method || 'Cash',
        status: (payload.status || 'AVAILABLE') as TripStatus,
        assigned_driver_id: payload.assigned_driver_id || null,
        allowed_km: payload.allowed_km || 50,
        cash_to_collect: payload.cash_to_collect !== undefined ? payload.cash_to_collect : payload.fare,
        toll_included: payload.toll_included || 'INCLUDED',
        permit_included: payload.permit_included || 'EXCLUDED',
        batta_included: payload.batta_included || 'INCLUDED',
        otp: String(Math.floor(1000 + Math.random() * 9000)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setTrips((prev) => {
        const updated = [localTrip, ...prev];
        try {
          localStorage.setItem('pickmi_cached_trips', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      return localTrip;
    }
  };

  const handleUpdateTripStatus = async (tripId: string, status: TripStatus, driverId?: string) => {
    await updateTripStatus(tripId, status, driverId);
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === tripId) {
          return {
            ...t,
            status,
            assigned_driver_id: driverId !== undefined ? driverId : t.assigned_driver_id,
            completed_at: status === 'COMPLETED' ? new Date().toISOString() : t.completed_at,
            driver: driverId ? drivers.find((d) => d.id === driverId) : t.driver,
          };
        }
        return t;
      })
    );
  };


  const handleAssignDriverToPartnerTrip = async (tripId: string, driverId: string) => {
    await assignDriverToPartnerTrip(tripId, driverId);
    setPartnerTrips((prev) => {
      const updated = prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: "ASSIGNED" as TripStatus,
              assigned_driver_id: driverId,
              driver: drivers.find((d) => d.id === driverId) || t.driver,
            }
          : t
      );
      try {
        localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleUnassignDriverFromPartnerTrip = async (tripId: string) => {
    await updatePartnerTripStatus(tripId, "AVAILABLE", null);
    setPartnerTrips((prev) => {
      const updated = prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: "AVAILABLE" as TripStatus,
              assigned_driver_id: null,
              driver: undefined,
            }
          : t
      );
      try {
        localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleUpdatePartnerTripStatus = async (
    tripId: string,
    status: TripStatus,
    driverId?: string | null
  ) => {
    await updatePartnerTripStatus(tripId, status, driverId);
    setPartnerTrips((prev) => {
      const updated = prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status,
              ...(driverId !== undefined ? { assigned_driver_id: driverId } : {}),
            }
          : t
      );
      try {
        localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCreatePartnerTrip = async (tripData: Partial<PartnerTrip>) => {
    const created = await createPartnerTrip(tripData);
    setPartnerTrips((prev) => {
      const updated = [created, ...prev];
      try {
        localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleUpdatePartnerTrip = async (tripId: string, tripData: Partial<PartnerTrip>) => {
    await updatePartnerTripDetails(tripId, tripData);
    setPartnerTrips((prev) => {
      const updated = prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              ...tripData,
              updated_at: new Date().toISOString(),
            }
          : t
      );
      try {
        localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeletePartnerTrip = async (tripId: string) => {
    await deletePartnerTrip(tripId);
    setPartnerTrips((prev) => {
      const updated = prev.filter((t) => t.id !== tripId);
      try {
        localStorage.setItem("pickmi_cached_partner_trips", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCreatePartner = async (partnerData: Partial<Partner>) => {
    const created = await createPartner(partnerData);
    setPartners((prev) => {
      const updated = [created, ...prev];
      try {
        localStorage.setItem("pickmi_cached_partners", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleUpdatePartner = async (partnerData: Partial<Partner> & { id: string }) => {
    await updatePartner(partnerData);
    setPartners((prev) => {
      const updated = prev.map((p) => (p.id === partnerData.id ? { ...p, ...partnerData } : p));
      try {
        localStorage.setItem("pickmi_cached_partners", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSaveIncentivePlan = async (
    partnerIds: string[],
    plan: PartnerIncentivePlan,
    targetTrips: number,
    rewardAmount: number
  ) => {
    for (const pId of partnerIds) {
      await handleUpdatePartner({
        id: pId,
        incentive_target_trips: targetTrips,
        incentive_reward_amount: rewardAmount,
        incentive_plan: plan,
      });
    }
  };


  const handleAwardIncentive = async (incentiveData: Partial<PartnerIncentive>) => {
    const created = await createPartnerIncentive(incentiveData);
    setPartnerIncentives((prev) => {
      const updated = [created, ...prev];
      try {
        localStorage.setItem("pickmi_cached_partner_incentives", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setPartners((prev) => {
      const updated = prev.map((p) => {
        if (p.id === created.partner_id) {
          const amt = created.amount || 0;
          return {
            ...p,
            incentive_earned: (p.incentive_earned || 0) + amt,
            ...(created.status === "PAID"
              ? { incentive_paid: (p.incentive_paid || 0) + amt }
              : { incentive_pending: (p.incentive_pending || 0) + amt }),
          };
        }
        return p;
      });
      try {
        localStorage.setItem("pickmi_cached_partners", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleApproveIncentive = async (incentiveId: string, notes?: string) => {
    await approvePartnerIncentive(incentiveId, notes);
    setPartnerIncentives((prev) => {
      const updated = prev.map((i) => {
        if (i.id === incentiveId) {
          return {
            ...i,
            status: "APPROVED" as const,
            approved_at: new Date().toISOString(),
          };
        }
        return i;
      });
      try {
        localStorage.setItem("pickmi_cached_partner_incentives", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handlePayIncentive = async (incentiveId: string, reference: string, paymentMethod?: string) => {
    await payPartnerIncentive(incentiveId, reference, paymentMethod);
    let targetPartnerId = "";
    let targetAmount = 0;

    setPartnerIncentives((prev) => {
      const updated = prev.map((i) => {
        if (i.id === incentiveId) {
          targetPartnerId = i.partner_id;
          targetAmount = i.amount;
          return {
            ...i,
            status: "PAID" as const,
            paid_at: new Date().toISOString(),
            payout_reference: reference,
            ...(paymentMethod ? { payment_method: paymentMethod } : {}),
          };
        }
        return i;
      });
      try {
        localStorage.setItem("pickmi_cached_partner_incentives", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (targetPartnerId && targetAmount > 0) {
      setPartners((prev) => {
        const updated = prev.map((p) => {
          if (p.id === targetPartnerId) {
            return {
              ...p,
              incentive_paid: (p.incentive_paid || 0) + targetAmount,
              incentive_pending: Math.max(0, (p.incentive_pending || 0) - targetAmount),
            };
          }
          return p;
        });
        try {
          localStorage.setItem("pickmi_cached_partners", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const handleUpdatePartnerStatus = async (
    partnerId: string,
    status: "ACTIVE" | "PENDING" | "SUSPENDED"
  ) => {
    await updatePartnerStatus(partnerId, status);
    setPartners((prev) => {
      const updated = prev.map((p) => (p.id === partnerId ? { ...p, status } : p));
      try {
        localStorage.setItem("pickmi_cached_partners", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleAssignDriver = async (tripId: string, driverId: string) => {
    await handleUpdateTripStatus(tripId, 'ASSIGNED', driverId);
  };

  const handleApproveDriverRequest = async (tripId: string, driverId: string) => {
    await approveDriverTripRequest(tripId, driverId);
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: 'ASSIGNED',
              assigned_driver_id: driverId,
              driver: drivers.find((d) => d.id === driverId) || t.driver,
            }
          : t
      )
    );
  };

  const handleRejectDriverRequest = async (tripId: string, driverId?: string) => {
    await rejectDriverTripRequest(tripId, driverId);
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: 'AVAILABLE',
              assigned_driver_id: null,
              trip_requests: (t.trip_requests || []).filter((r) => r.driver_id !== driverId),
            }
          : t
      )
    );
  };

  
  const handleUpdateTripDetails = async (tripId: string, updates: Partial<Trip>) => {
    try {
      const updated = await updateTripDetails(tripId, updates);
      if (updated) {
        setTrips((prev) =>
          prev.map((t) => (t.id === tripId ? { ...t, ...updated } : t))
        );
        return;
      }
    } catch (e: any) {
      console.warn("Could not update in Supabase, updating locally:", e);
    }
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              ...updates,
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
    } catch (e) {
      console.warn("Could not delete from Supabase, removing locally:", e);
    }
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const handleUpdateTripSettlement = async (tripId: string, settlementData: any) => {
    try {
      await updateTripSettlement(tripId, settlementData);
    } catch (e) {
      console.warn("Settlement update note:", e);
    }
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? {
              ...t,
              ...settlementData,
              updated_at: new Date().toISOString(),
            }
          : t
      )
    );
  };

  const handleQuickDispatch = async (preset: string) => {
    let payload: any = {
      customer_name: 'Walk-in / Phone Rider',
      customer_phone: '+91 99000 88000',
      pickup_location: 'Koramangala 5th Block, Bengaluru',
      pickup_latitude: 12.9352,
      pickup_longitude: 77.6245,
      drop_location: 'Kempegowda International Airport (BLR), Terminal 2',
      drop_latitude: 13.1989,
      drop_longitude: 77.7068,
      fare: 1250,
      distance: '42.5 km',
      vehicle_type: 'Sedan',
      trip_type: 'Airport Transfer',
      payment_method: 'Cash',
      cash_to_collect: 1250,
      allowed_km: 45,
      extra_km_rate: 14,
      toll_included: 'INCLUDED',
      permit_included: 'EXCLUDED',
      batta_included: 'INCLUDED',
      hill_charges_applicable: 'NOT_APPLICABLE',
    };

    if (preset === 'City Ride') {
      payload = {
        ...payload,
        drop_location: 'Whitefield ITPL Main Gate, Bengaluru',
        drop_latitude: 12.9866,
        drop_longitude: 77.7335,
        fare: 520,
        distance: '16.8 km',
        vehicle_type: 'Hatchback',
        trip_type: 'One-way',
        cash_to_collect: 520,
      };
    } else if (preset === 'Outstation Trip') {
      payload = {
        ...payload,
        drop_location: 'Mysuru Palace, Mysuru',
        drop_latitude: 12.3051,
        drop_longitude: 76.6551,
        fare: 3200,
        distance: '145 km',
        vehicle_type: 'Sedan',
        trip_type: 'Outstation',
        allowed_km: 150,
        cash_to_collect: 3200,
        toll_included: 'EXCLUDED',
      };
    }

    await handleCreateTrip(payload);
    setCurrentTab('trips');
  };

  // Driver Handlers
  const handleAddDriver = async (payload: any) => {
    const created = await createDriver(payload);
    setDrivers((prev) => [created, ...prev]);
  };

  const handleUpdateDriverStatus = async (driverId: string, status: 'active' | 'inactive' | 'suspended') => {
    await updateDriverAccountStatus(driverId, status);
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? {
              ...d,
              status,
              online_status: status !== 'active' ? 'OFFLINE' : d.online_status,
            }
          : d
      )
    );
  };

  const handleToggleOnline = async (driverId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    await updateDriverOnlineStatus(driverId, nextStatus);
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, online_status: nextStatus } : d))
    );
  };

  const handleToggleDeposit = async (driverId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    await updateDriverDepositStatus(driverId, nextStatus);
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, deposit_status: nextStatus } : d))
    );
  };

  const handleUpdateDeposit = async (driverId: string, status: 'PAID' | 'PENDING', paymentId?: string) => {
    await updateDriverDepositStatus(driverId, status, paymentId);
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, deposit_status: status } : d))
    );
  };

  const handleVerifyAllDocuments = async (driverId: string) => {
    await verifyAllDriverDocuments(driverId);
    setDocuments((prev) =>
      prev.map((doc) => (doc.driver_id === driverId ? { ...doc, verification_status: 'Verified', rejection_reason: null } : doc))
    );
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, status: 'active' } : d))
    );
  };

  const handleVerifyDocument = async (
    docId: string,
    status: 'Verified' | 'Rejected',
    reason?: string,
    fallbackDriverId?: string,
    fallbackDocType?: string
  ) => {
    try {
      const res = await verifyDocument(docId, status, reason, fallbackDriverId, fallbackDocType);
      const drvId = res?.driverId || fallbackDriverId;
      setDocuments((prev) =>
        prev.map((doc) => {
          if (
            doc.id === docId ||
            (fallbackDriverId && fallbackDocType && doc.driver_id === fallbackDriverId && doc.document_type === fallbackDocType)
          ) {
            return { ...doc, verification_status: status, rejection_reason: reason || null };
          }
          return doc;
        })
      );
      if (drvId) {
        getDrivers().then(setDrivers).catch(() => {});
      }
    } catch (err) {
      console.error('handleVerifyDocument error:', err);
      throw err;
    }
  };

  const pendingDocCount = documents.filter((d) => d.verification_status === 'Pending').length;
  const onlineDriverCount = drivers.filter((d) => d.online_status === 'ONLINE').length;
  const activeTripCount = trips.filter((t) => t.status === 'ASSIGNED' || t.status === 'STARTED' || t.status === 'ARRIVED').length;
  const pendingSettlementCount = trips.filter(
    (t) => (t.status === 'COMPLETED' || t.completed_at) && t.settlement_status !== 'SETTLED'
  ).length;

    if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'schema') {
            setIsSetupModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        pendingDocCount={pendingDocCount}
        onlineDriverCount={onlineDriverCount}
        activeTripCount={activeTripCount}
        pendingSettlementCount={pendingSettlementCount}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area offset by Sidebar width (w-64 = 16rem = 256px) */}
      <div className="ml-0 md:ml-64 flex-1 flex flex-col min-h-screen pb-24 md:pb-6">
        <Header
          supabaseStatus={supabaseStatus}
          isSyncing={isSyncing}
          onRefresh={loadDatabase}
          onOpenCreateTrip={() => setCurrentTab('create-trip')}
          onOpenLiveChat={() => setCurrentTab('live-chat')}
          onOpenSetupModal={() => setIsSetupModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          onLogout={() => {
            localStorage.removeItem('pickmi_admin_authenticated');
            setIsAuthenticated(false);
          }}
        />

        {/* Database Warning Banner */}
        {!supabaseStatus.tablesExist && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Connected to <strong>https://awwrbgwpzgtbunrvsmyu.supabase.co</strong>. Database tables not detected yet.
              </span>
            </div>
            <button
              onClick={() => setIsSetupModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 transition"
            >
              SQL Schema Setup
            </button>
          </div>
        )}

        {/* Main Routed Page Content */}
        <main className={`${currentTab === 'live-chat' ? 'p-2 sm:p-4 md:p-8' : 'p-4 sm:p-6 md:p-8'} flex-1`}>
          {currentTab === 'overview' && (
            <DashboardOverview
              drivers={drivers}
              trips={trips}
              documents={documents}
              onOpenCreateTrip={() => setCurrentTab('create-trip')}
              onNavigateTab={setCurrentTab}
              onQuickDispatch={handleQuickDispatch}
            />
          )}

          {currentTab === 'live-chat' && (
            <LiveChatAgent
              trips={trips}
              drivers={drivers}
              onUpdateTripDetails={handleUpdateTripDetails}
              onUpdateTripStatus={handleUpdateTripStatus}
              onDeleteTrip={handleDeleteTrip}
              onCreateTrip={handleCreateTrip}
              onNavigateToTrips={() => setCurrentTab('trips')}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'create-trip' && (
            <CreateTripPage
              drivers={drivers}
              onSubmit={handleCreateTrip}
              onNavigateToTrips={() => setCurrentTab('trips')}
            />
          )}

          {currentTab === 'live-drivers' && (
            <LiveDriversMap
              drivers={drivers}
              trips={trips}
              onRefresh={loadDatabase}
              isRefreshing={isSyncing}
              onAssignTrip={handleAssignDriver}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {(currentTab === "partners" || currentTab === "partner-trips" || currentTab === "partner-incentives") && (
            <PartnersManager
              partners={partners}
              partnerTrips={partnerTrips}
              partnerIncentives={partnerIncentives}
              drivers={drivers}
              activeSubTab={
                currentTab === "partner-trips"
                  ? "partner-trips"
                  : currentTab === "partner-incentives"
                  ? "partner-incentives"
                  : "partners"
              }
              onSelectSubTab={(tab) => setCurrentTab(tab)}
              onRefresh={loadDatabase}
              onAssignDriver={handleAssignDriverToPartnerTrip}
              onUnassignDriver={handleUnassignDriverFromPartnerTrip}
              onUpdateTripStatus={handleUpdatePartnerTripStatus}
              onCreatePartnerTrip={handleCreatePartnerTrip}
              onUpdatePartnerTrip={handleUpdatePartnerTrip}
              onDeletePartnerTrip={handleDeletePartnerTrip}
              onCreatePartner={handleCreatePartner}
              onUpdatePartner={handleUpdatePartner}
              onUpdatePartnerStatus={handleUpdatePartnerStatus}
              onSaveIncentivePlan={handleSaveIncentivePlan}
              onAwardIncentive={handleAwardIncentive}
              onApproveIncentive={handleApproveIncentive}
              onPayIncentive={handlePayIncentive}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab("driver-details");
              }}
              onViewPartnerDetails={(partner) => {
                setSelectedPartner(partner);
                setCurrentTab("partner-details");
              }}
            />
          )}


          {currentTab === 'trips' && (
            <TripsManager
              trips={trips}
              drivers={drivers}
              onOpenCreateModal={() => setCurrentTab('create-trip')}
              onUpdateTripStatus={handleUpdateTripStatus}
              onUpdateTripDetails={handleUpdateTripDetails}
              onAssignDriver={handleAssignDriver}
              onApproveDriverRequest={handleApproveDriverRequest}
              onRejectDriverRequest={handleRejectDriverRequest}
              onDeleteTrip={handleDeleteTrip}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'billing' && (
            <BillingManager
              trips={trips}
              drivers={drivers}
              onUpdateTripSettlement={handleUpdateTripSettlement}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'driver-wallets' && (
            <DriverWalletsManager
              drivers={drivers}
              trips={trips}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'drivers' && (
            <DriversManager
              drivers={drivers}
              onToggleOnline={handleToggleOnline}
              onToggleDeposit={handleToggleDeposit}
              onUpdateDriverStatus={handleUpdateDriverStatus}
              onInspectDocuments={() => setCurrentTab('documents')}
              onAddDriver={handleAddDriver}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          
          {currentTab === 'partner-details' && (
            <PartnerDetailsPage
              partner={
                (selectedPartner && partners.find((p) => p.id === selectedPartner.id)) ||
                selectedPartner ||
                partners[0] ||
                INITIAL_MOCK_PARTNERS[0]
              }
              partnerTrips={partnerTrips}
              partnerIncentives={partnerIncentives}
              drivers={drivers}
              onBack={() => setCurrentTab('partners')}
              onAssignDriver={handleAssignDriverToPartnerTrip}
              onUnassignDriver={handleUnassignDriverFromPartnerTrip}
              onUpdateTripStatus={handleUpdatePartnerTripStatus}
              onCreatePartnerTrip={handleCreatePartnerTrip}
              onUpdatePartnerTrip={handleUpdatePartnerTrip}
              onDeletePartnerTrip={handleDeletePartnerTrip}
              onSaveIncentivePlan={handleSaveIncentivePlan}
              onAwardIncentive={handleAwardIncentive}
              onApproveIncentive={handleApproveIncentive}
              onPayIncentive={handlePayIncentive}
              onUpdatePartner={async (partnerData) => {
                await handleUpdatePartner(partnerData);
                setSelectedPartner((prev) => (prev && prev.id === partnerData.id ? { ...prev, ...partnerData } : prev));
              }}
              onUpdatePartnerStatus={async (partnerId, status) => {
                await handleUpdatePartnerStatus(partnerId, status);
                setSelectedPartner((prev) => (prev && prev.id === partnerId ? { ...prev, status } : prev));
              }}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'driver-details' && (
            (() => {
              const currentDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
              if (!currentDriver) {
                return (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto mt-8">
                    <div className="w-10 h-10 rounded-full border-4 border-[#0043DC] border-t-transparent animate-spin mx-auto mb-4" />
                    <h3 className="text-base font-bold text-slate-800">Loading Driver Profile</h3>
                    <p className="text-xs text-slate-500 mt-1">Retrieving latest telemetry and documents from fleet database...</p>
                    <button
                      onClick={() => setCurrentTab('drivers')}
                      className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Back to Drivers List
                    </button>
                  </div>
                );
              }
              return (
                <DriverDetailsPage
                  driver={currentDriver}
                  trips={trips}
                  onBack={() => setCurrentTab('drivers')}
                  onToggleOnline={handleToggleOnline}
                  onToggleDeposit={handleToggleDeposit}
                  onUpdateDriverStatus={handleUpdateDriverStatus}
                  onVerifyDocument={handleVerifyDocument}
                  onVerifyAllDocuments={handleVerifyAllDocuments}
                  onAssignTrip={(driverId) => {
                    setCurrentTab('create-trip');
                  }}
                />
              );
            })()
          )}

          {currentTab === 'customer-details' && selectedCustomer && (
            <CustomerDetailsPage
              customer={selectedCustomer}
              trips={trips}
              drivers={drivers}
              onBack={() => setCurrentTab(customerBackTab)}
              onAssignDriver={handleAssignDriver}
              onUpdateCustomer={async (cust) => {
                await updateCustomerProfile(cust);
                setSelectedCustomer((prev) =>
                  prev ? { ...prev, ...cust, phone: cust.mobile || prev.phone } : null
                );
                setWebsiteUsers((prev) => {
                  const exists = prev.some((u) => u.mobile === cust.mobile);
                  if (exists) {
                    return prev.map((u) => (u.mobile === cust.mobile ? { ...u, ...cust } : u));
                  }
                  return [{ id: cust.id || 'usr_' + Date.now(), ...cust, created_at: new Date().toISOString() }, ...prev];
                });
                setTrips((prev) =>
                  prev.map((t) => (t.customer_phone === cust.mobile ? { ...t, customer_name: cust.name } : t))
                );
              }}
              onDeleteCustomer={async (phone, id) => {
                await deleteCustomerProfile(phone, id);
                setWebsiteUsers((prev) => prev.filter((u) => u.mobile !== phone && u.id !== id));
              }}
              onDispatchForCustomer={(name, phone) => {
                handleCreateTrip({
                  customer_name: name,
                  customer_phone: phone,
                  pickup_location: "Koramangala 5th Block, Bengaluru",
                  pickup_latitude: 12.9352,
                  pickup_longitude: 77.6245,
                  drop_location: "Kempegowda International Airport (BLR), Terminal 2",
                  drop_latitude: 13.1989,
                  drop_longitude: 77.7068,
                  fare: 1250,
                  distance: "42.5 km",
                  vehicle_type: "Sedan",
                  trip_type: "Airport Transfer",
                  payment_method: "Cash",
                  cash_to_collect: 1250,
                  allowed_km: 45,
                  extra_km_rate: 14,
                  toll_included: "INCLUDED",
                  permit_included: "EXCLUDED",
                  batta_included: "INCLUDED",
                  hill_charges_applicable: "NOT_APPLICABLE",
                });
                setCurrentTab("website-bookings");
              }}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersManager
              trips={trips}
              onViewCustomerDetails={(cust) => {
                setSelectedCustomer(cust);
                setCurrentTab('customer-details');
              }}
              onDispatchForCustomer={(name, phone) => {
                handleCreateTrip({
                  customer_name: name,
                  customer_phone: phone,
                  pickup_location: "Koramangala 5th Block, Bengaluru",
                  pickup_latitude: 12.9352,
                  pickup_longitude: 77.6245,
                  drop_location: "Kempegowda International Airport (BLR), Terminal 2",
                  drop_latitude: 13.1989,
                  drop_longitude: 77.7068,
                  fare: 1250,
                  distance: "42.5 km",
                  vehicle_type: "Sedan",
                  trip_type: "Airport Transfer",
                  payment_method: "Cash",
                  cash_to_collect: 1250,
                  allowed_km: 45,
                  extra_km_rate: 14,
                  toll_included: "INCLUDED",
                  permit_included: "EXCLUDED",
                  batta_included: "INCLUDED",
                  hill_charges_applicable: "NOT_APPLICABLE",
                });
                setCurrentTab("trips");
              }}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentVerification
              drivers={drivers}
              documents={documents}
              onVerifyDocument={handleVerifyDocument}
              onVerifyAllDocuments={handleVerifyAllDocuments}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}

          {currentTab === 'deposits' && (
            <SecurityDepositTracker
              drivers={drivers}
              onUpdateDeposit={handleUpdateDeposit}
            />
          )}

          {(currentTab === 'website-bookings' || currentTab === 'website-book-cab' || currentTab === 'website-users' || currentTab === 'website-applications' || currentTab === 'website-inquiries' || currentTab === 'website-pricing-rules') && (
            <WebsiteManager
              openBookCabModal={currentTab === 'website-book-cab'}
              onCloseBookCabModal={() => setCurrentTab('website-bookings')}
              onViewCustomerDetails={(cust) => {
                setSelectedCustomer(cust);
                setCustomerBackTab('website-users');
                setCurrentTab('customer-details');
              }}
              trips={trips}
              drivers={drivers}
              websiteBookings={websiteBookings}
              websiteUsers={websiteUsers}
              driverApplications={driverApplications}
              contactSubmissions={contactSubmissions}
              activeSubTab={
                currentTab === 'website-users'
                  ? 'users'
                  : currentTab === 'website-applications'
                  ? 'applications'
                  : currentTab === 'website-inquiries'
                  ? 'inquiries'
                  : currentTab === 'website-pricing-rules'
                  ? 'pricing-rules'
                  : 'bookings'
              }
              onRefresh={loadDatabase}
              onAssignDriver={handleAssignDriver}
              onApproveDriverApplication={async (app) => {
                await approveWebsiteDriverApplication(app);
                setDriverApplications((prev) =>
                  prev.map((a) => (a.id === app.id ? { ...a, status: 'APPROVED' } : a))
                );
                await getDrivers().then(setDrivers);
              }}
              onUpdateInquiryStatus={async (id, status) => {
                await updateWebsiteContactStatus(id, status);
                setContactSubmissions((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, status } : c))
                );
              }}
              onUpdateCustomer={async (cust) => {
                await updateCustomerProfile(cust);
                setWebsiteUsers((prev) => {
                  const exists = prev.some((u) => u.mobile === cust.mobile);
                  if (exists) {
                    return prev.map((u) => (u.mobile === cust.mobile ? { ...u, ...cust } : u));
                  }
                  return [{ id: cust.id || 'usr_' + Date.now(), ...cust, created_at: new Date().toISOString() }, ...prev];
                });
                setTrips((prev) =>
                  prev.map((t) => (t.customer_phone === cust.mobile ? { ...t, customer_name: cust.name } : t))
                );
              }}
              onDeleteCustomer={async (phone, id) => {
                await deleteCustomerProfile(phone, id);
                setWebsiteUsers((prev) => prev.filter((u) => u.mobile !== phone && u.id !== id));
              }}
              onDispatchForCustomer={(name, phone) => {
                handleCreateTrip({
                  customer_name: name,
                  customer_phone: phone,
                  pickup_location: "Koramangala 5th Block, Bengaluru",
                  pickup_latitude: 12.9352,
                  pickup_longitude: 77.6245,
                  drop_location: "Kempegowda International Airport (BLR), Terminal 2",
                  drop_latitude: 13.1989,
                  drop_longitude: 77.7068,
                  fare: 1250,
                  distance: "42.5 km",
                  vehicle_type: "Sedan",
                  trip_type: "Airport Transfer",
                  payment_method: "Cash",
                  cash_to_collect: 1250,
                  allowed_km: 45,
                  extra_km_rate: 14,
                  toll_included: "INCLUDED",
                  permit_included: "EXCLUDED",
                  batta_included: "INCLUDED",
                  hill_charges_applicable: "NOT_APPLICABLE",
                });
                setCurrentTab("website-bookings");
              }}
              onViewDriverDetails={(driverId) => {
                setSelectedDriverId(driverId);
                setCurrentTab('driver-details');
              }}
            />
          )}
        </main>
      </div>

      {/* Supabase Schema Modal */}
      <SchemaSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onRefresh={loadDatabase}
        isSyncing={isSyncing}
      />
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-30 flex items-center justify-around pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] px-1 shadow-lg shadow-slate-900/10">
        <button
          onClick={() => setCurrentTab('overview')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            currentTab === 'overview' ? 'text-[#0043DC]' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('trips')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            currentTab === 'trips' ? 'text-[#0043DC]' : 'text-slate-500'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Trips</span>
        </button>

        <button
          onClick={() => setCurrentTab('live-chat')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            currentTab === 'live-chat' ? 'text-[#0043DC]' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${
            currentTab === 'live-chat' ? 'bg-[#0043DC]/10 text-[#0043DC]' : ''
          }`}>
            <Bot className="w-5 h-5" />
          </div>
          <span>Live Chat</span>
        </button>

        <button
          onClick={() => setCurrentTab('drivers')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            currentTab === 'drivers' ? 'text-[#0043DC]' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Drivers</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-slate-500"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
