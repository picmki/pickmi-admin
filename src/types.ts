export type DriverStatus = 'active' | 'inactive' | 'suspended';
export type OnlineStatus = 'ONLINE' | 'OFFLINE';
export type DocumentVerificationStatus = 'Verified' | 'Pending' | 'Rejected';
export type VehicleType = 'Sedan' | 'SUV' | 'Hatchback' | 'Prime Sedan' | 'EV';
export type TripStatus =
  | 'AVAILABLE'
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';
export type TripType = 'One-way' | 'Round-trip' | 'Airport Transfer' | 'Outstation';
export type DepositStatus = 'PAID' | 'PENDING';
export type SettlementStatus = 'PENDING' | 'SETTLED' | 'DISPUTED';

export type NavTab =
  | "overview"
  | "create-trip"
  | "trips"
  | "live-drivers"
  | "billing"
  | "driver-wallets"
  | "drivers"
  | "driver-details"
  | "customers"
  | "documents"
  | "deposits"
  | "schema";

export interface CustomerRecord {
  phone: string;
  name: string;
  email?: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalSpend: number;
  lastTripDate: string;
  lastLocation: string;
  preferredVehicle: string;
  trips: Trip[];
}

export interface Driver {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  profile_image: string | null;
  status: DriverStatus;
  online_status: OnlineStatus;
  rating: number;
  total_trips: number;
  deposit_status: DepositStatus;
  deposit_amount: number;
  deposit_paid_at: string | null;
  deposit_expires_at: string | null;
  deposit_payment_id: string | null;
  push_token?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  current_city?: string | null;
  last_location_update?: string | null;
  speed?: number | null;
  heading?: number | null;
  battery_level?: number | null;
  created_at: string;
  updated_at: string;
  // Joined vehicle and docs
  vehicle?: Vehicle;
  documents?: DriverDocument[];
}

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  vehicle_model: string;
  vehicle_image?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: string;
  document_url: string;
  document_number?: string | null;
  valid_until?: string | null;
  verification_status: DocumentVerificationStatus;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  driver_name?: string;
  driver_mobile?: string;
}

export interface Trip {
  id: string;
  trip_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  pickup_latitude: number;
  pickup_longitude: number;
  drop_location: string;
  drop_latitude: number;
  drop_longitude: number;
  pickup_date: string;
  pickup_time: string;
  fare: number;
  distance: string;
  vehicle_type: VehicleType;
  status: TripStatus;
  assigned_driver_id: string | null;
  otp: string;
  trip_type: TripType;
  payment_method: string;
  extra_km_rate?: number;
  allowed_km?: number;
  cash_to_collect?: number;
  toll_included?: 'INCLUDED' | 'EXCLUDED';
  permit_included?: 'INCLUDED' | 'EXCLUDED';
  batta_included?: 'INCLUDED' | 'EXCLUDED';
  hill_charges_applicable?: 'APPLICABLE' | 'NOT_APPLICABLE';
  toll_status?: string;
  toll_estimate?: number;
  toll_charges?: number;
  parking_charges?: number;
  permit_charges?: number;
  hill_charges?: number;
  batta_charges?: number;
  extra_km?: number;
  extra_km_charges?: number;
  actual_km?: number;
  total_fare?: number | null;
  commission_rate?: number;
  settlement_status?: SettlementStatus;
  settled_at?: string | null;
  settlement_notes?: string | null;
  excess_cash_returned?: boolean;
  driver_payout_completed?: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  driver?: Driver;
  trip_requests?: TripRequestItem[];
}

export interface TripRequestItem {
  id: string;
  trip_id: string;
  driver_id: string;
  status: string;
  requested_at: string;
  driver?: {
    id: string;
    name: string;
    mobile: string;
    rating?: number;
    online_status?: string;
  };
}


export interface WalletTransaction {
  id: string;
  driver_id: string;
  amount: number;
  type: "TRIP_EARNING" | "DRIVER_DEPOSIT" | "WITHDRAWAL" | "PLATFORM_FEE" | "BONUS" | "PENALTY" | "WALLET_SETTLEMENT";
  description: string;
  trip_id?: string;
  created_at: string;
  driver_name?: string;
}
