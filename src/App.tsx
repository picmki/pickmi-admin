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
import { CustomersManager } from './components/CustomersManager';
import { BillingManager } from './components/BillingManager';
import { DriverWalletsManager } from './components/DriverWalletsManager';
import {
  supabase,
  checkDatabaseConnection,
  getDrivers,
  getTrips,
  getPendingDocuments,
  createTrip,
  updateTripStatus,
  deleteTrip,
  updateTripSettlement,
  createDriver,
  updateDriverOnlineStatus,
  updateDriverDepositStatus,
  verifyDocument,
  verifyAllDriverDocuments,
  approveDriverTripRequest,
  rejectDriverTripRequest,
} from './lib/supabase';
import type { Driver, DriverDocument, Trip, TripStatus, NavTab } from './types';
import { AlertCircle, Menu, LayoutDashboard, Navigation, MapPin, Users } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
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

  // Load database status and entities
  const loadDatabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const conn = await checkDatabaseConnection();
      setSupabaseStatus(conn);

      if (conn.tablesExist) {
        const [driversData, tripsData, docsData] = await Promise.all([
          getDrivers(),
          getTrips(),
          getPendingDocuments(),
        ]);
        setDrivers(driversData);
        setTrips(tripsData);
        setDocuments(docsData);
      } else {
        // Fallback to rich mock data if tables are not yet migrated
        const { INITIAL_MOCK_DRIVERS, INITIAL_MOCK_TRIPS, INITIAL_MOCK_DOCUMENTS } = await import(
          './mockData'
        );
        setDrivers(INITIAL_MOCK_DRIVERS);
        setTrips(INITIAL_MOCK_TRIPS);
        setDocuments(INITIAL_MOCK_DOCUMENTS);
      }
    } catch (err: any) {
      console.warn('Error syncing database, using mock fallback:', err);
      const { INITIAL_MOCK_DRIVERS, INITIAL_MOCK_TRIPS, INITIAL_MOCK_DOCUMENTS } = await import(
        './mockData'
      );
      setDrivers(INITIAL_MOCK_DRIVERS);
      setTrips(INITIAL_MOCK_TRIPS);
      setDocuments(INITIAL_MOCK_DOCUMENTS);
    } finally {
      setIsSyncing(false);
    }
  }, []);

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

  const handleVerifyDocument = async (docId: string, status: 'Verified' | 'Rejected', reason?: string) => {
    await verifyDocument(docId, status, reason);
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, verification_status: status, rejection_reason: reason || null } : doc
      )
    );
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
      <div className="ml-0 md:ml-64 flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
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
              onVerifyDocument={handleVerifyDocument}
              onVerifyAllDocuments={handleVerifyAllDocuments}
              onAssignTrip={(driverId) => {
                setCurrentTab('create-trip');
              }}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersManager
              trips={trips}
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 flex items-center justify-around py-2 shadow-lg">
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
