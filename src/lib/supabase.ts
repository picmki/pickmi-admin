import { sendRemotePushNotificationToDrivers } from './pushNotifications';
import { createClient } from '@supabase/supabase-js';
import type { Driver, DriverDocument, Trip, Vehicle, WebsiteBooking, WebsiteUser, WebsiteDriverApplication, WebsiteContactSubmission, Partner, PartnerTrip, PartnerIncentive, TripStatus } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://awwrbgwpzgtbunrvsmyu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MVv7fXTjS6R79oXLOHuCLA_ij0lDSRE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function checkDatabaseConnection(): Promise<{ ok: boolean; message: string; tablesExist: boolean }> {
  try {
    const { data, error } = await supabase.from('drivers').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        return {
          ok: true,
          tablesExist: false,
          message: 'Connected to Supabase, but schema tables are not yet created. Run schema.sql in Supabase SQL Editor.',
        };
      }
      return { ok: false, tablesExist: false, message: error.message };
    }
    return { ok: true, tablesExist: true, message: 'Connected to Supabase with active schema tables.' };
  } catch (err: any) {
    return { ok: false, tablesExist: false, message: err.message || 'Unknown network error' };
  }
}

// DRIVERS API
export async function getDrivers(): Promise<Driver[]> {
  const { data: drivers, error } = await supabase
    .from('drivers')
    .select(`
      *,
      vehicle:vehicles(id, vehicle_number, vehicle_type, vehicle_model)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
  return ((drivers as any[]) || []).map((d) => ({
    ...d,
    vehicle: Array.isArray(d.vehicle) ? d.vehicle[0] : d.vehicle,
    documents: Array.isArray(d.documents) ? d.documents : [],
  }));
}

export async function getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching driver documents for ' + driverId, error);
    return [];
  }
  return (data || []) as DriverDocument[];
}

export async function createDriver(payload: {
  name: string;
  mobile: string;
  email?: string;
  vehicle_type: string;
  vehicle_number: string;
  vehicle_model: string;
}): Promise<Driver> {
  // 1. Insert driver
  const driverId = 'drv_' + Math.random().toString(36).substring(2, 10);
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .insert([
      {
        id: driverId,
        name: payload.name,
        mobile: payload.mobile,
        email: payload.email || null,
        status: 'active',
        online_status: 'ONLINE',
        rating: 5.0,
        total_trips: 0,
        deposit_status: 'PENDING',
        deposit_amount: 250.0,
      },
    ])
    .select()
    .single();

  if (driverError) throw driverError;

  // 2. Insert vehicle
  const { error: vehError } = await supabase.from('vehicles').insert([
    {
      driver_id: driverId,
      vehicle_number: payload.vehicle_number.toUpperCase().trim(),
      vehicle_type: payload.vehicle_type,
      vehicle_model: payload.vehicle_model,
    },
  ]);
  if (vehError) console.warn('Vehicle creation warning:', vehError);

  // 3. Create default document placeholders
  const docTypes = [
    'Driving Licence (Front)',
    'Driving Licence (Back)',
    'RC',
    'Insurance',
    'Permit',
  ];
  await supabase.from('driver_documents').insert(
    docTypes.map((docType) => ({
      driver_id: driverId,
      document_type: docType,
      document_url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80',
      verification_status: 'Pending',
    }))
  );

  return driver;
}

export async function updateDriverOnlineStatus(driverId: string, status: 'ONLINE' | 'OFFLINE') {
  const { error } = await supabase
    .from('drivers')
    .update({ online_status: status, updated_at: new Date().toISOString() })
    .eq('id', driverId);
  if (error) throw error;
}

export async function updateDriverDepositStatus(driverId: string, status: 'PAID' | 'PENDING', paymentId?: string) {
  const isPaid = status === 'PAID';
  const now = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(now.getFullYear() + 1);

  const { error } = await supabase
    .from('drivers')
    .update({
      deposit_status: status,
      deposit_paid_at: isPaid ? now.toISOString() : null,
      deposit_expires_at: isPaid ? nextYear.toISOString() : null,
      deposit_payment_id: isPaid ? (paymentId || 'MANUAL_' + Date.now().toString(36).toUpperCase()) : null,
      updated_at: now.toISOString(),
    })
    .eq('id', driverId);
  if (error) throw error;
}

export async function updateDriverAccountStatus(
  driverId: string,
  status: 'active' | 'inactive' | 'suspended'
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status !== 'active') {
    updateData.online_status = 'OFFLINE';
  }

  const { error } = await supabase
    .from('drivers')
    .update(updateData)
    .eq('id', driverId);

  if (error) {
    console.error('updateDriverAccountStatus error:', error);
    throw error;
  }
  return status;
}

// DOCUMENTS API
export async function getPendingDocuments(): Promise<DriverDocument[]> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select(`
      *,
      driver:drivers(name, mobile)
    `)
    .neq('document_type', 'push_token')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((doc: any) => ({
    ...doc,
    driver_name: doc.driver?.name || 'Unknown Driver',
    driver_mobile: doc.driver?.mobile || 'N/A',
  }));
}

export async function syncDriverVerificationStatus(driverId: string) {
  try {
    const { data: docs, error } = await supabase
      .from('driver_documents')
      .select('verification_status, document_type')
      .eq('driver_id', driverId);

    if (error || !docs || docs.length === 0) return 'inactive';

    // Ignore push_token
    const realDocs = docs.filter((d: any) => d.document_type !== 'push_token');
    if (realDocs.length === 0) return 'inactive';

    const anyRejected = realDocs.some((d: any) => d.verification_status === 'Rejected');
    const allVerified = realDocs.every((d: any) => d.verification_status === 'Verified');

    let newStatus: 'active' | 'suspended' | 'inactive' = 'inactive';
    if (anyRejected) {
      newStatus = 'suspended';
    } else if (allVerified) {
      newStatus = 'active';
    }

    await supabase
      .from('drivers')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driverId);

    return newStatus;
  } catch (err) {
    console.warn('syncDriverVerificationStatus warning:', err);
    return 'inactive';
  }
}

export async function verifyDocument(
  docId: string,
  verification_status: 'Verified' | 'Rejected',
  rejection_reason?: string,
  fallbackDriverId?: string,
  fallbackDocType?: string
) {
  let driverId: string | null = fallbackDriverId || null;

  // 1. First fetch or update by ID
  const updatePayload = {
    verification_status,
    rejection_reason: verification_status === 'Rejected' ? (rejection_reason || 'Document does not meet requirements') : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('driver_documents')
    .update(updatePayload)
    .eq('id', docId)
    .select('driver_id');

  if (error) {
    console.error('verifyDocument ID update error:', error);
  }

  if (data && data.length > 0 && data[0].driver_id) {
    driverId = data[0].driver_id;
  } else if (fallbackDriverId && fallbackDocType) {
    // 2. Fallback by driver_id + document_type if synthetic/placeholder ID was used
    const { data: fbData } = await supabase
      .from('driver_documents')
      .update(updatePayload)
      .eq('driver_id', fallbackDriverId)
      .eq('document_type', fallbackDocType)
      .select('driver_id');

    if (fbData && fbData.length > 0 && fbData[0].driver_id) {
      driverId = fbData[0].driver_id;
    }
  }

  // 3. Sync driver active/suspended status
  if (driverId) {
    await syncDriverVerificationStatus(driverId);
  }

  return { success: true, driverId };
}

export async function verifyAllDriverDocuments(driverId: string) {
  // 1. Update all real documents to Verified
  const { error: docError } = await supabase
    .from('driver_documents')
    .update({
      verification_status: 'Verified',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('driver_id', driverId)
    .neq('document_type', 'push_token');
  if (docError) {
    console.error('verifyAllDriverDocuments doc error:', docError);
  }

  // 2. Update driver status to active
  const { error: drvError } = await supabase
    .from('drivers')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId);
  if (drvError) {
    console.error('verifyAllDriverDocuments driver error:', drvError);
  }

  return { success: true };
}

// TRIPS API
export async function getTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      driver:drivers(id, name, mobile, rating),
      trip_requests(
        id,
        trip_id,
        driver_id,
        status,
        requested_at,
        driver:drivers(id, name, mobile, rating, online_status)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data as any[]) || []).map((t) => {
    let parsedMeta: any = {};
    if (t.toll_status && typeof t.toll_status === 'string' && t.toll_status.startsWith('{')) {
      try {
        parsedMeta = JSON.parse(t.toll_status);
      } catch {}
    } else if (t.toll_status === 'SETTLED') {
      parsedMeta = { settlement_status: 'SETTLED' };
    }

    return {
      ...t,
      settlement_status: parsedMeta.settlement_status || t.settlement_status || (t.status === 'COMPLETED' ? 'PENDING' : undefined),
      settled_at: parsedMeta.settled_at || t.settled_at,
      actual_km: parsedMeta.actual_km !== undefined ? parsedMeta.actual_km : t.actual_km,
      settlement_notes: parsedMeta.settlement_notes || t.settlement_notes,
      commission_rate: parsedMeta.commission_rate !== undefined ? parsedMeta.commission_rate : t.commission_rate,
      extra_km_rate: parsedMeta.extra_km_rate !== undefined ? parsedMeta.extra_km_rate : t.extra_km_rate,
      driver: Array.isArray(t.driver) ? t.driver[0] : t.driver,
      trip_requests: (t.trip_requests || []).map((r: any) => ({
        ...r,
        driver: Array.isArray(r.driver) ? r.driver[0] : r.driver,
      })),
    };
  });
}

export async function createTrip(payload: {
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  pickup_latitude: number;
  pickup_longitude: number;
  drop_location: string;
  drop_latitude: number;
  drop_longitude: number;
  pickup_date?: string;
  pickup_time?: string;
  fare: number;
  distance: string;
  vehicle_type: string;
  trip_type?: string;
  payment_method?: string;
  assigned_driver_id?: string | null;
  toll_included?: 'INCLUDED' | 'EXCLUDED';
  permit_included?: 'INCLUDED' | 'EXCLUDED';
  batta_included?: 'INCLUDED' | 'EXCLUDED';
  hill_charges_applicable?: 'APPLICABLE' | 'NOT_APPLICABLE';
  cash_to_collect?: number;
  allowed_km?: number;
  extra_km_rate?: number;
}): Promise<Trip> {
  const tripNum = 'PM-' + Math.floor(100000 + Math.random() * 900000);
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  const insertData = {
    trip_number: tripNum,
    customer_name: payload.customer_name,
    customer_phone: payload.customer_phone,
    pickup_location: payload.pickup_location,
    pickup_latitude: payload.pickup_latitude,
    pickup_longitude: payload.pickup_longitude,
    drop_location: payload.drop_location,
    drop_latitude: payload.drop_latitude,
    drop_longitude: payload.drop_longitude,
    pickup_date: payload.pickup_date || 'Today',
    pickup_time: payload.pickup_time || 'Now',
    fare: payload.fare,
    distance: payload.distance,
    vehicle_type: payload.vehicle_type,
    trip_type: payload.trip_type || 'One-way',
    payment_method: payload.payment_method || 'Cash',
    status: payload.assigned_driver_id ? 'ASSIGNED' : 'AVAILABLE',
    assigned_driver_id: payload.assigned_driver_id || null,
    otp: otp,
    toll_included: payload.toll_included || 'INCLUDED',
    permit_included: payload.permit_included || 'EXCLUDED',
    batta_included: payload.batta_included || 'INCLUDED',
    hill_charges_applicable: payload.hill_charges_applicable || 'NOT_APPLICABLE',
    cash_to_collect: payload.cash_to_collect !== undefined ? payload.cash_to_collect : payload.fare,
    allowed_km: payload.allowed_km !== undefined ? payload.allowed_km : 50,
    extra_km_rate: payload.extra_km_rate !== undefined ? payload.extra_km_rate : 14,
  };

  const { data, error } = await supabase
    .from('trips')
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;

  // Dispatch Remote Push Notification to drivers (wakes phones even when app is closed)
  sendRemotePushNotificationToDrivers({
    tripId: data.id,
    tripNumber: data.trip_number || tripNum,
    fare: data.fare,
    pickupLocation: data.pickup_location,
    dropLocation: data.drop_location,
    assignedDriverId: data.assigned_driver_id,
  }).catch((err) => console.warn('Push notification background dispatch error:', err));

  return data;
}

export async function updateTripStatus(tripId: string, status: string, driverId?: string) {
  const updatePayload: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (driverId !== undefined) {
    updatePayload.assigned_driver_id = driverId;
  }
  if (status === 'COMPLETED') {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from('trips').update(updatePayload).eq('id', tripId);
  if (error) throw error;

  if (status === 'ASSIGNED' && driverId) {
    // Fetch trip details for push notification
    supabase.from('trips').select('*').eq('id', tripId).single().then(({ data: t }) => {
      if (t) {
        sendRemotePushNotificationToDrivers({
          tripId: t.id,
          tripNumber: t.trip_number || `#PM${t.id.substring(0, 5)}`,
          fare: t.fare,
          pickupLocation: t.pickup_location,
          dropLocation: t.drop_location,
          assignedDriverId: driverId,
        }).catch(() => {});
      }
    });
  }
}

export async function updateTripSettlement(
  tripId: string,
  settlementData: {
    settlement_status: 'PENDING' | 'SETTLED' | 'DISPUTED';
    settled_at?: string;
    excess_cash_returned?: boolean;
    driver_payout_completed?: boolean;
    settlement_notes?: string;
    toll_charges?: number;
    permit_charges?: number;
    hill_charges?: number;
    batta_charges?: number;
    actual_km?: number;
    extra_km?: number;
    extra_km_charges?: number;
    extra_km_rate?: number;
    total_fare?: number;
    fare?: number;
    cash_to_collect?: number;
    commission_rate?: number;
    driver_id?: string;
  }
) {
  // Store all settlement metadata safely in toll_status as JSON so it is 100% saved in Supabase
  const settlementMeta = {
    settlement_status: settlementData.settlement_status,
    settled_at: settlementData.settled_at || (settlementData.settlement_status === 'SETTLED' ? new Date().toISOString() : undefined),
    actual_km: settlementData.actual_km,
    extra_km: settlementData.extra_km,
    extra_km_rate: settlementData.extra_km_rate,
    extra_km_charges: settlementData.extra_km_charges,
    commission_rate: settlementData.commission_rate,
    toll_charges: settlementData.toll_charges,
    permit_charges: settlementData.permit_charges,
    hill_charges: settlementData.hill_charges,
    batta_charges: settlementData.batta_charges,
    settlement_notes: settlementData.settlement_notes,
    total_fare: settlementData.total_fare,
    fare: settlementData.fare,
  };

  // Only send columns that physically exist in public.trips schema
  const payload: any = {
    toll_status: JSON.stringify(settlementMeta),
    updated_at: new Date().toISOString(),
  };

  if (settlementData.total_fare !== undefined) payload.total_fare = settlementData.total_fare;
  if (settlementData.fare !== undefined) payload.fare = settlementData.fare;
  if (settlementData.cash_to_collect !== undefined) payload.cash_to_collect = settlementData.cash_to_collect;
  if (settlementData.extra_km !== undefined) payload.extra_km = settlementData.extra_km;
  if (settlementData.extra_km_charges !== undefined) payload.extra_km_charges = settlementData.extra_km_charges;
  if (settlementData.toll_charges !== undefined) payload.toll_charges = settlementData.toll_charges;
  if (settlementData.permit_charges !== undefined) payload.parking_charges = settlementData.permit_charges;

  const { error } = await supabase.from('trips').update(payload).eq('id', tripId);
  if (error) {
    console.error('Trip settlement Supabase error:', error.message);
    throw error;
  }

  // If settled and driver_id provided, record in wallet_transactions
  if (settlementData.settlement_status === 'SETTLED' && settlementData.driver_id) {
    try {
      await supabase.from('wallet_transactions').insert({
        id: `tx_settle_${tripId}_${Date.now()}`,
        driver_id: settlementData.driver_id,
        amount: settlementData.total_fare || 0,
        type: 'WALLET_SETTLEMENT',
        description: `Trip #${tripId} audit settled by admin`,
        trip_id: tripId,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Wallet transaction insert note:', e);
    }
  }

  return true;
}

export async function deleteTrip(tripId: string): Promise<boolean> {
  try {
    // 1. Delete from trips in Supabase
    await supabase.from("trips").delete().eq("id", tripId);
    // 2. Delete from partner_trips in Supabase
    await supabase.from("partner_trips").delete().eq("id", tripId);
    // 3. Delete from local partner app backend & db.json
    try {
      await fetch(BACKEND_API_BASE + '/trips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId })
      });
    } catch (_) {}
  } catch (error) {
    console.error("Error deleting trip:", error);
    throw error;
  }
  return true;
}

export async function approveDriverTripRequest(tripId: string, driverId: string) {
  // 1. Assign driver to trip
  await updateTripStatus(tripId, 'ASSIGNED', driverId);

  // 2. Update trip_requests status to APPROVED
  await supabase
    .from('trip_requests')
    .update({
      status: 'APPROVED',
      assigned_at: new Date().toISOString(),
    })
    .eq('trip_id', tripId)
    .eq('driver_id', driverId);

  // 3. Mark other pending requests for this trip as REJECTED
  await supabase
    .from('trip_requests')
    .update({
      status: 'REJECTED',
    })
    .eq('trip_id', tripId)
    .neq('driver_id', driverId);

  // 4. Dispatch remote push notification directly to approved driver
  const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
  if (trip) {
    await sendRemotePushNotificationToDrivers({
      tripId: trip.id,
      tripNumber: trip.trip_number || `#PM${trip.id.substring(0, 5)}`,
      fare: trip.fare,
      pickupLocation: trip.pickup_location,
      dropLocation: trip.drop_location,
      assignedDriverId: driverId,
    }).catch(() => {});
  }
}

export async function rejectDriverTripRequest(tripId: string, driverId?: string) {
  // Revert trip status to AVAILABLE
  await supabase
    .from('trips')
    .update({
      status: 'AVAILABLE',
      assigned_driver_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId);

  if (driverId) {
    await supabase
      .from('trip_requests')
      .update({ status: 'REJECTED' })
      .eq('trip_id', tripId)
      .eq('driver_id', driverId);
  } else {
    await supabase
      .from('trip_requests')
      .update({ status: 'REJECTED' })
      .eq('trip_id', tripId);
  }
}

const ALLOWED_TRIP_COLUMNS = new Set([
  'customer_name',
  'customer_phone',
  'pickup_location',
  'pickup_latitude',
  'pickup_longitude',
  'drop_location',
  'drop_latitude',
  'drop_longitude',
  'pickup_date',
  'pickup_time',
  'fare',
  'distance',
  'vehicle_type',
  'trip_type',
  'payment_method',
  'status',
  'assigned_driver_id',
  'otp',
  'toll_included',
  'permit_included',
  'batta_included',
  'hill_charges_applicable',
  'cash_to_collect',
  'allowed_km',
  'extra_km_rate',
  'completed_at',
  'settlement_status',
  'settled_at',
  'excess_cash_returned',
  'driver_payout_completed',
  'settlement_notes',
  'toll_charges',
  'permit_charges',
  'hill_charges',
  'batta_charges',
  'actual_km',
  'extra_km',
  'extra_km_charges',
  'total_fare',
]);

export async function updateTripDetails(tripId: string, updates: any): Promise<Trip> {
  const dbPayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  for (const [key, val] of Object.entries(updates)) {
    if (ALLOWED_TRIP_COLUMNS.has(key) && val !== undefined) {
      dbPayload[key] = val;
    }
  }

  const { data, error } = await supabase
    .from('trips')
    .update(dbPayload)
    .eq('id', tripId)
    .select(`
      *,
      driver:drivers(id, name, mobile, rating),
      trip_requests(
        id,
        trip_id,
        driver_id,
        status,
        requested_at,
        driver:drivers(id, name, mobile, rating, online_status)
      )
    `)
    .single();

  if (error) {
    console.warn('Trip update Supabase error:', error.message);
    throw error;
  }

  return {
    ...data,
    driver: Array.isArray(data.driver) ? data.driver[0] : data.driver,
    trip_requests: (data.trip_requests || []).map((r: any) => ({
      ...r,
      driver: Array.isArray(r.driver) ? r.driver[0] : r.driver,
    })),
    ...updates,
  } as Trip;
}


// ==========================================
// WEBSITE MODULE INTEGRATION APIS
// ==========================================

export async function getWebsiteBookings(): Promise<WebsiteBooking[]> {
  try {
    const { data, error } = await supabase
      .from('website_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('website_bookings fetch note:', error.message);
      return [];
    }
    return (data || []) as WebsiteBooking[];
  } catch (err) {
    console.warn('getWebsiteBookings exception:', err);
    return [];
  }
}

export async function updateWebsiteBookingStatus(bookingId: string, status: string) {
  const { error } = await supabase
    .from('website_bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) console.warn('updateWebsiteBookingStatus note:', error.message);
}

export async function getWebsiteUsers(): Promise<WebsiteUser[]> {
  try {
    const { data, error } = await supabase
      .from('website_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as WebsiteUser[];
    }
  } catch (err) {
    console.warn('website_users query note:', err);
  }
  return [];
}

export async function getWebsiteDriverApplications(): Promise<WebsiteDriverApplication[]> {
  try {
    const { data, error } = await supabase
      .from('website_driver_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []) as WebsiteDriverApplication[];
  } catch (err) {
    return [];
  }
}

export async function approveWebsiteDriverApplication(app: WebsiteDriverApplication) {
  try {
    // 1. Create Driver in fleet
    await createDriver({
      name: app.full_name,
      mobile: app.phone_number,
      email: app.email || undefined,
      vehicle_type: app.vehicle_type || 'Sedan',
      vehicle_number: app.vehicle_number || ('TN' + Math.floor(10 + Math.random() * 89) + 'AB' + Math.floor(1000 + Math.random() * 8999)),
      vehicle_model: app.vehicle_type + ' Fleet'
    });

    // 2. Mark application approved
    await supabase
      .from('website_driver_applications')
      .update({ status: 'APPROVED' })
      .eq('id', app.id);
  } catch (err) {
    console.error('approveWebsiteDriverApplication error:', err);
    throw err;
  }
}

export async function getWebsiteContactSubmissions(): Promise<WebsiteContactSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('website_contact_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []) as WebsiteContactSubmission[];
  } catch (err) {
    return [];
  }
}

export async function updateWebsiteContactStatus(id: string, status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED') {
  await supabase
    .from('website_contact_submissions')
    .update({ status })
    .eq('id', id);
}


export async function updateCustomerProfile(payload: {
  id?: string;
  mobile: string;
  name: string;
  email?: string;
  city?: string;
  gender?: string;
}) {
  try {
    await supabase
      .from('website_users')
      .upsert([{
        mobile: payload.mobile,
        name: payload.name,
        email: payload.email || null,
        city: payload.city || null,
        gender: payload.gender || null,
        updated_at: new Date().toISOString()
      }], { onConflict: 'mobile' });
  } catch (e) {
    console.warn('website_users update note:', e);
  }

  try {
    await supabase
      .from('trips')
      .update({
        customer_name: payload.name,
        customer_phone: payload.mobile,
        updated_at: new Date().toISOString()
      })
      .eq('customer_phone', payload.mobile);
  } catch (e) {
    console.warn('trips customer update note:', e);
  }
}

export async function deleteCustomerProfile(phone: string, id?: string) {
  try {
    if (id) {
      await supabase.from('website_users').delete().eq('id', id);
    }
    await supabase.from('website_users').delete().eq('mobile', phone);
  } catch (e) {
    console.warn('website_users delete note:', e);
  }
}

// ==========================================
// PARTNER & PARTNER TRIPS MANAGEMENT API (Connected with Live Database & Mobile App)
// ==========================================

const BACKEND_API_BASE = 'http://localhost:3000/api';

export async function getPartners(): Promise<Partner[]> {
  // 1. Fetch live partners from backend database
  try {
    const res = await fetch(`${BACKEND_API_BASE}/partners`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.partners)) {
        return data.partners.map((p: any) => ({
          id: p.id,
          name: p.name || p.travel_name || "Fleet Partner",
          contact_person: p.contact_person || p.contact_person_name || "Contact Person",
          mobile: p.mobile || p.mobile_number || "",
          email: p.email || "",
          city: p.city || p.location || "Bengaluru",
          fleet_size: p.fleet_size || p.vehicle_count || 5,
          status: (p.status || "ACTIVE").toUpperCase() === "APPROVED" ? "ACTIVE" : (p.status || "ACTIVE").toUpperCase(),
          rating: p.rating || 5.0,
          commission_rate: p.commission_rate ?? 12,
          payout_upi_id: p.payout_upi_id || (p.payout ? p.payout.upi_id : ""),
          bank_account_number: p.bank_account_number || "",
          bank_ifsc: p.bank_ifsc || "",
          total_trips: p.total_trips || (p.trip_stats ? (p.trip_stats.completed_trips || 0) + (p.trip_stats.active_trips || 0) : 0),
          total_revenue: p.total_revenue || (p.trip_stats ? p.trip_stats.lifetime_earnings || 0 : 0),
          incentive_earned: p.incentive_earned ?? 0,
          incentive_paid: p.incentive_paid ?? 0,
          incentive_pending: p.incentive_pending ?? 0,
          incentive_target_trips: p.incentive_target_trips ?? 10,
          incentive_reward_amount: p.incentive_reward_amount ?? 1000,
          incentive_plan: p.incentive_plan || undefined,
          current_cycle_trips: p.current_cycle_trips ?? p.total_trips ?? 0,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString(),
        }));
      }
    }
  } catch (err: any) {
    console.warn("getPartners local api fallback note:", err?.message);
  }

  // 2. Supabase Cloud Fallback
  try {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return (data || []) as Partner[];
    }
  } catch (err: any) {
    console.warn("getPartners error:", err?.message);
  }

  return [];
}

export async function createPartner(payload: Partial<Partner>): Promise<Partner> {
  const newPartner: Partner = {
    id: payload.id || "ptn_" + Math.random().toString(36).substring(2, 9),
    name: payload.name || "Fleet Partner",
    contact_person: payload.contact_person || "Contact Person",
    mobile: payload.mobile || "",
    email: payload.email || "",
    city: payload.city || "Bengaluru",
    fleet_size: payload.fleet_size || 5,
    status: payload.status || "ACTIVE",
    rating: payload.rating || 5.0,
    commission_rate: payload.commission_rate ?? 12,
    payout_upi_id: payload.payout_upi_id || "",
    bank_account_number: payload.bank_account_number || "",
    bank_ifsc: payload.bank_ifsc || "",
    total_trips: 0,
    total_revenue: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await fetch(`${BACKEND_API_BASE}/partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newPartner,
        travel_name: newPartner.name,
        contact_person_name: newPartner.contact_person,
        mobile_number: newPartner.mobile,
        location: newPartner.city,
        vehicle_count: newPartner.fleet_size,
        status: newPartner.status === "ACTIVE" ? "approved" : newPartner.status.toLowerCase(),
      }),
    });
  } catch (e) {
    console.warn("createPartner backend note:", e);
  }

  try {
    await supabase.from("partners").insert([newPartner]);
  } catch (e) {}

  return newPartner;
}

export async function updatePartner(partner: Partial<Partner> & { id: string }): Promise<void> {
  try {
    await fetch(`${BACKEND_API_BASE}/partners`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: partner.id,
        travel_name: partner.name,
        contact_person_name: partner.contact_person,
        mobile_number: partner.mobile,
        location: partner.city,
        vehicle_count: partner.fleet_size,
        status: partner.status ? (partner.status === "ACTIVE" ? "approved" : partner.status.toLowerCase()) : undefined,
        incentive_target_trips: partner.incentive_target_trips,
        incentive_reward_amount: partner.incentive_reward_amount,
        incentive_plan: partner.incentive_plan,
        current_cycle_trips: partner.current_cycle_trips,
      }),
    });
  } catch (e) {
    console.warn("updatePartner backend note:", e);
  }

  try {
    await supabase
      .from("partners")
      .update({
        ...partner,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partner.id);
  } catch (e) {
    console.warn("updatePartner note:", e);
  }
}

export async function updatePartnerStatus(
  partnerId: string,
  status: "ACTIVE" | "PENDING" | "SUSPENDED"
): Promise<void> {
  try {
    const mapped = status.toLowerCase() === "active" ? "approved" : status.toLowerCase();
    await fetch(`${BACKEND_API_BASE}/admin/change-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: partnerId, status: mapped }),
    });
  } catch (e) {
    console.warn("updatePartnerStatus note:", e);
  }

  try {
    await supabase
      .from("partners")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", partnerId);
  } catch (e) {
    console.warn("updatePartnerStatus note:", e);
  }
}

export async function getPartnerTrips(): Promise<PartnerTrip[]> {
  // 1. Fetch live trips from backend database
  try {
    const res = await fetch(`${BACKEND_API_BASE}/trips`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.trips)) {
        const partnerTripsOnly = data.trips.filter((t: any) => (t.partner_id && t.partner_id !== "ptn_mvj95a6a") || (t.partnerId && t.partnerId !== "ptn_mvj95a6a"));
        return partnerTripsOnly.map((t: any) => ({
          id: t.id,
          trip_number: t.trip_number || `PT-${t.id.slice(-6)}`,
          partner_id: t.partner_id || t.partnerId,
          partner_name: t.partner_travel_name || t.partner_name || "Partner Fleet",
          customer_name: t.customer_name || "Customer",
          customer_phone: t.customer_phone || t.customer_mobile || "",
          pickup_location: t.pickup_location || "",
          drop_location: t.drop_location || "",
          pickup_date: t.pickup_date || t.trip_date || "Today",
          pickup_time: t.pickup_time || t.trip_time || "Now",
          trip_type: (t.trip_type || "One-way") as any,
          vehicle_type: (t.vehicle_type || "Sedan") as any,
          fare: Number(t.fare || t.total_fare || 1000),
          driver_payout: Number(t.driver_payout || Math.round((t.fare || 1000) * 0.85)),
          commission_amount: Number(t.commission_amount || Math.round((t.fare || 1000) * 0.15)),
          status: (t.status === "driver_assigned" ? "ASSIGNED" : (t.status === "pending_review" ? "PENDING_REVIEW" : (t.status || "AVAILABLE").toUpperCase())) as TripStatus,
          assigned_driver_id: t.assigned_driver_id || (t.driver ? t.driver.id : null),
          driver: t.driver ? {
            id: t.driver.id,
            name: t.driver.name,
            mobile: t.driver.mobile,
            rating: t.driver.rating || 4.9,
            online_status: "ONLINE",
            vehicle: {
              vehicle_number: t.driver.vehicle_number || "KA-01-MJ-5520",
              vehicle_type: t.vehicle_type || "Sedan",
              vehicle_model: t.driver.vehicle_model || "Maruti Suzuki Dzire",
            }
          } : undefined,
          notes: t.notes || (t.created_method === "voice" ? "Created via AI Voice Recording" : "Created via Partner Mobile App"),
          created_method: (t.created_method || (t.notes?.toLowerCase().includes("voice") ? "voice" : "manual")) as "manual" | "voice",
          audio_url: t.audio_url || null,
          audio_base64: t.audio_base64 || (typeof t.audio_url === "string" && t.audio_url.startsWith("data:audio/") ? t.audio_url : null),
          audio_duration: t.audio_duration ? Number(t.audio_duration) : (t.created_method === "voice" ? 6 : undefined),
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString(),
        }));
      }
    }
  } catch (err: any) {
    console.warn("getPartnerTrips local API note:", err?.message);
  }

  // 2. Supabase Fallback
  try {
    const { data, error } = await supabase
      .from("partner_trips")
      .select(`
        *,
        driver:drivers(id, name, mobile, rating, online_status, vehicle:vehicles(vehicle_number, vehicle_type, vehicle_model))
      `)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return ((data as any[]) || []).map((t) => ({
        ...t,
        driver: Array.isArray(t.driver) ? t.driver[0] : t.driver,
      }));
    }
  } catch (err: any) {
    console.warn("getPartnerTrips error:", err?.message);
  }

  return [];
}

export async function createPartnerTrip(payload: Partial<PartnerTrip>): Promise<PartnerTrip> {
  const newTrip: PartnerTrip = {
    id: payload.id || "pt_" + Math.random().toString(36).substring(2, 9),
    trip_number: payload.trip_number || "PT-" + Math.floor(100000 + Math.random() * 900000),
    partner_id: payload.partner_id || "",
    partner_name: payload.partner_name || "Partner Fleet",
    customer_name: payload.customer_name || "Customer",
    customer_phone: payload.customer_phone || "",
    pickup_location: payload.pickup_location || "",
    drop_location: payload.drop_location || "",
    pickup_date: payload.pickup_date || "Today",
    pickup_time: payload.pickup_time || "Now",
    trip_type: payload.trip_type || "One-way",
    vehicle_type: payload.vehicle_type || "Sedan",
    fare: payload.fare || 1000,
    driver_payout: payload.driver_payout || Math.round((payload.fare || 1000) * 0.85),
    commission_amount: payload.commission_amount || Math.round((payload.fare || 1000) * 0.15),
    status: (payload.status as TripStatus) || "AVAILABLE",
    assigned_driver_id: payload.assigned_driver_id || null,
    notes: payload.notes || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await fetch(`${BACKEND_API_BASE}/trips/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newTrip,
        pickup_date: newTrip.pickup_date,
        pickup_time: newTrip.pickup_time,
        total_fare: newTrip.fare,
        created_method: "manual"
      }),
    });
  } catch (e) {
    console.warn("createPartnerTrip backend note:", e);
  }

  try {
    await supabase.from("partner_trips").insert([newTrip]);
  } catch (e) {}

  return newTrip;
}

export async function assignDriverToPartnerTrip(
  tripId: string,
  driverId: string
): Promise<void> {
  try {
    await fetch(`${BACKEND_API_BASE}/trips/assign-driver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, driverId }),
    });
  } catch (e) {
    console.warn("assignDriverToPartnerTrip backend note:", e);
  }

  try {
    await supabase
      .from("partner_trips")
      .update({
        status: "ASSIGNED",
        assigned_driver_id: driverId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId);
  } catch (e) {
    console.warn("assignDriverToPartnerTrip note:", e);
  }
}

export async function updatePartnerTripStatus(
  tripId: string,
  status: TripStatus,
  driverId?: string | null
): Promise<void> {
  try {
    if (status === "ASSIGNED" && driverId) {
      await fetch(`${BACKEND_API_BASE}/trips/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, driverId }),
      });
    } else {
      const backendStatus =
        status === "AVAILABLE"
          ? "available"
          : status === "PENDING_REVIEW"
          ? "pending_review"
          : status.toLowerCase();

      await fetch(`${BACKEND_API_BASE}/trips/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, status: backendStatus }),
      });
    }
  } catch (e) {
    console.warn("updatePartnerTripStatus backend note:", e);
  }

  try {
    const payload: any = { status, updated_at: new Date().toISOString() };
    if (driverId !== undefined) {
      payload.assigned_driver_id = driverId;
    }
    await supabase.from("partner_trips").update(payload).eq("id", tripId);
  } catch (e) {
    console.warn("updatePartnerTripStatus note:", e);
  }
}

export async function updatePartnerTripDetails(
  tripId: string,
  updates: Partial<PartnerTrip>
): Promise<void> {
  try {
    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    delete payload.driver;
    delete payload.id;
    await supabase.from("partner_trips").update(payload).eq("id", tripId);
  } catch (e) {
    console.warn("updatePartnerTripDetails note:", e);
  }
}

export async function deletePartnerTrip(tripId: string): Promise<boolean> {
  try {
    // 1. Delete from partner_trips in Supabase
    await supabase.from("partner_trips").delete().eq("id", tripId);
    // 2. Delete from trips table in Supabase
    await supabase.from("trips").delete().eq("id", tripId);
    // 3. Delete from local partner app backend & db.json
    try {
      await fetch(BACKEND_API_BASE + '/trips/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId })
      });
    } catch (_) {}
  } catch (e) {
    console.warn("deletePartnerTrip error:", e);
  }
  return true;
}

export async function getPartnerIncentives(): Promise<PartnerIncentive[]> {
  const list: PartnerIncentive[] = [];
  try {
    const res = await fetch("http://localhost:3000/api/financial/payout-requests");
    const json = await res.json();
    if (json && json.success && Array.isArray(json.requests)) {
      json.requests.forEach((r: any) => {
        list.push({
          id: r.id,
          partner_id: r.partner_id,
          partner_name: r.partner_name || "Partner Fleet",
          amount: Number(r.amount || 0),
          type: "MILESTONE_TARGET",
          title: r.stage_title || `Stage ${r.stage}`,
          description: `Milestone Claim: ${r.completed_trips || r.target_trips}/${r.target_trips} trips completed`,
          status: r.status === "COMPLETED" ? "PAID" : r.status,
          paid_at: r.completed_at || r.paid_at || null,
          approved_at: r.approved_at || null,
          payout_reference: r.payout_reference || null,
          payment_method: r.payment_method || "Bank Transfer",
          created_at: r.requested_at || new Date().toISOString(),
          stage: r.stage,
          target_trips: r.target_trips,
          completed_trips: r.completed_trips
        });
      });
    }
  } catch (err) {
    console.warn("Backend payout-requests fetch note:", err);
  }

  try {
    const { data } = await supabase
      .from("partner_incentives")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const existingIds = new Set(list.map(i => i.id));
      data.forEach((d: any) => {
        if (!existingIds.has(d.id)) {
          list.push(d as PartnerIncentive);
        }
      });
    }
  } catch (err: any) {
    console.warn("getPartnerIncentives error:", err?.message);
  }
  return list;
}

export async function approvePartnerIncentive(
  incentiveId: string,
  notes?: string
): Promise<void> {
  try {
    await fetch("http://localhost:3000/api/financial/payout-requests/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: incentiveId, notes })
    });
  } catch (e) {
    console.warn("approvePartnerIncentive backend error:", e);
  }

  try {
    await supabase
      .from("partner_incentives")
      .update({
        status: "APPROVED",
        approved_at: new Date().toISOString(),
      })
      .eq("id", incentiveId);
  } catch (e) {
    console.warn("approvePartnerIncentive note:", e);
  }
}

export async function createPartnerIncentive(
  payload: Partial<PartnerIncentive>
): Promise<PartnerIncentive> {
  const newInc: PartnerIncentive = {
    id: payload.id || "inc_" + Math.random().toString(36).substring(2, 9),
    partner_id: payload.partner_id || "",
    partner_name: payload.partner_name || "Partner Fleet",
    amount: payload.amount || 0,
    type: payload.type || "MILESTONE_TARGET",
    title: payload.title || "Fleet Incentive",
    description: payload.description || "",
    status: payload.status || "PENDING",
    paid_at: payload.status === "PAID" ? new Date().toISOString() : null,
    payout_reference: payload.payout_reference || null,
    payment_method: payload.payment_method || "UPI",
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("partner_incentives")
      .insert([newInc])
      .select()
      .single();

    if (!error && data) return data as PartnerIncentive;
  } catch (e) {
    console.warn("createPartnerIncentive note:", e);
  }

  return newInc;
}

export async function payPartnerIncentive(
  incentiveId: string,
  reference: string,
  paymentMethod?: string
): Promise<void> {
  try {
    await fetch("http://localhost:3000/api/financial/payout-requests/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: incentiveId, reference, paymentMethod })
    });
  } catch (e) {
    console.warn("payPartnerIncentive backend error:", e);
  }

  try {
    await supabase
      .from("partner_incentives")
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
        payout_reference: reference,
        ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      })
      .eq("id", incentiveId);
  } catch (e) {
    console.warn("payPartnerIncentive note:", e);
  }
}
