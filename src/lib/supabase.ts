import { sendRemotePushNotificationToDrivers } from './pushNotifications';
import { createClient } from '@supabase/supabase-js';
import type { Driver, DriverDocument, Trip, Vehicle } from '../types';

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
      vehicle:vehicles(*),
      documents:driver_documents(*)
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

// DOCUMENTS API
export async function getPendingDocuments(): Promise<DriverDocument[]> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select(`
      *,
      driver:drivers(name, mobile)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((doc: any) => ({
    ...doc,
    driver_name: doc.driver?.name || 'Unknown Driver',
    driver_mobile: doc.driver?.mobile || 'N/A',
  }));
}

export async function syncDriverVerificationStatus(driverId: string) {
  const { data: docs } = await supabase
    .from('driver_documents')
    .select('verification_status')
    .eq('driver_id', driverId);

  if (!docs || docs.length === 0) return 'inactive';

  const anyRejected = docs.some((d) => d.verification_status === 'Rejected');
  const allVerified = docs.every((d) => d.verification_status === 'Verified');

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
}

export async function verifyDocument(
  docId: string,
  verification_status: 'Verified' | 'Rejected',
  rejection_reason?: string
) {
  const { data, error } = await supabase
    .from('driver_documents')
    .update({
      verification_status,
      rejection_reason: verification_status === 'Rejected' ? rejection_reason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId)
    .select('driver_id')
    .single();

  if (error) throw error;
  if (data?.driver_id) {
    await syncDriverVerificationStatus(data.driver_id);
  }
}

export async function verifyAllDriverDocuments(driverId: string) {
  const { error: docError } = await supabase
    .from('driver_documents')
    .update({
      verification_status: 'Verified',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('driver_id', driverId);
  if (docError) throw docError;

  const { error: drvError } = await supabase
    .from('drivers')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId);
  if (drvError) throw drvError;
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
  return ((data as any[]) || []).map((t) => ({
    ...t,
    driver: Array.isArray(t.driver) ? t.driver[0] : t.driver,
    trip_requests: (t.trip_requests || []).map((r: any) => ({
      ...r,
      driver: Array.isArray(r.driver) ? r.driver[0] : r.driver,
    })),
  }));
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
    allowed_km: payload.allowed_km || 50,
    extra_km_rate: payload.extra_km_rate || 14,
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
    total_fare?: number;
  }
) {
  const payload: any = {
    settlement_status: settlementData.settlement_status,
    updated_at: new Date().toISOString(),
  };
  if (settlementData.settled_at !== undefined) payload.settled_at = settlementData.settled_at;
  if (settlementData.excess_cash_returned !== undefined) payload.excess_cash_returned = settlementData.excess_cash_returned;
  if (settlementData.driver_payout_completed !== undefined) payload.driver_payout_completed = settlementData.driver_payout_completed;
  if (settlementData.settlement_notes !== undefined) payload.settlement_notes = settlementData.settlement_notes;
  if (settlementData.toll_charges !== undefined) payload.toll_charges = settlementData.toll_charges;
  if (settlementData.permit_charges !== undefined) payload.permit_charges = settlementData.permit_charges;
  if (settlementData.hill_charges !== undefined) payload.hill_charges = settlementData.hill_charges;
  if (settlementData.batta_charges !== undefined) payload.batta_charges = settlementData.batta_charges;
  if (settlementData.actual_km !== undefined) payload.actual_km = settlementData.actual_km;
  if (settlementData.extra_km !== undefined) payload.extra_km = settlementData.extra_km;
  if (settlementData.extra_km_charges !== undefined) payload.extra_km_charges = settlementData.extra_km_charges;
  if (settlementData.total_fare !== undefined) payload.total_fare = settlementData.total_fare;

  const { error } = await supabase.from('trips').update(payload).eq('id', tripId);
  if (error) {
    console.warn('Trip settlement Supabase note:', error.message);
  }
}

export async function deleteTrip(tripId: string): Promise<boolean> {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) {
    console.error("Error deleting trip from Supabase:", error);
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
