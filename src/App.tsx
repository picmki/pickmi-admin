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
} from './lib/supabase';
import type { Driver, DriverDocument, Trip, TripStatus, NavTab, WebsiteBooking, WebsiteUser, WebsiteDriverApplication, WebsiteContactSubmission } from './types';
import { AlertCircle, Menu, LayoutDashboard, Navigation, MapPin, Users } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
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
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailRecord | null>(null);
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
            localStorage.setItem('pickmi_cached_drivers', JSON.stringify(liveDrivers));
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
        const { INITIAL_MOCK_DRIVERS, INITIAL_MOCK_TRIPS, INITIAL_MOCK_DOCUMENTS } = await import('./mockData');
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
  const handleCreateTrip = async (payload: any): Promise<void> => {
    const newTrip = await createTrip(payload);
    setTrips((prev) => [newTrip, ...prev]);
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
        <main className="p-4 sm:p-6 md:p-8 flex-1">
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

          {currentTab === 'driver-details' && (
            <DriverDetailsPage
              driver={drivers.find((d) => d.id === selectedDriverId) || drivers[0]}
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

          {(currentTab === 'website-bookings' || currentTab === 'website-book-cab' || currentTab === 'website-users' || currentTab === 'website-applications' || currentTab === 'website-inquiries') && (
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
          onClick={() => setCurrentTab('create-trip')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
            currentTab === 'create-trip' ? 'text-[#0043DC]' : 'text-slate-500'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span>Dispatch</span>
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
