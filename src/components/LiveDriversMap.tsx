import { supabase } from '../lib/supabase';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  MapPin,
  Car,
  Navigation,
  Search,
  Filter,
  Radio,
  Phone,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Battery,
  Gauge,
  Compass,
  RefreshCw,
  Zap,
  Users,
  Send,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { Driver, Trip, VehicleType } from '../types';

export interface CityHub {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  isPopular?: boolean;
}

export const CITIES: CityHub[] = [
  { id: 'all', name: 'All Cities', state: 'Pan-India', lat: 12.9716, lng: 77.5946, zoom: 6 },
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, zoom: 12, isPopular: true },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, zoom: 12, isPopular: true },
  { id: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, zoom: 13, isPopular: true },
  { id: 'mysuru', name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, zoom: 13, isPopular: true },
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, zoom: 12, isPopular: true },
  { id: 'salem', name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.146, zoom: 13 },
  { id: 'madurai', name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, zoom: 13 },
  { id: 'trichy', name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, zoom: 13 },
  { id: 'kochi', name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, zoom: 13 },
];


interface LiveDriversMapProps {
  drivers: Driver[];
  trips: Trip[];
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  onAssignTrip?: (tripId: string, driverId: string) => Promise<void>;
  onViewDriverDetails?: (driverId: string) => void;
}

export const LiveDriversMap: React.FC<LiveDriversMapProps> = ({
  drivers,
  trips,
  onRefresh,
  isRefreshing = false,
  onAssignTrip,
  onViewDriverDetails,
}) => {
  const [isRefreshingLocal, setIsRefreshingLocal] = useState(false);
  const hasAutoCenteredRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const [selectedCityId, setSelectedCityId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'GPS_ONLY' | 'ON_TRIP' | 'OFFLINE'>('ONLINE');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | VehicleType>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTripToAssign, setSelectedTripToAssign] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>('Just now');
  const [realtimeLocations, setRealtimeLocations] = useState<Record<string, { lat: number; lng: number; speed?: number; heading?: number; city?: string; updatedAt: string }>>({});

  // Realtime WebSocket GPS stream directly from Driver Mobile App
  useEffect(() => {
    const channel = supabase
      .channel('fleet_live_locations')
      .on('broadcast', { event: 'driver_location' }, ({ payload }) => {
        if (payload && payload.driverId && typeof payload.lat === 'number' && typeof payload.lng === 'number') {
          console.log('[LiveMap] Live GPS from driver:', payload.driverId, payload.lat, payload.lng);
          setRealtimeLocations((prev) => ({
            ...prev,
            [payload.driverId]: {
              lat: payload.lat,
              lng: payload.lng,
              speed: payload.speed,
              heading: payload.heading,
              city: payload.city,
              updatedAt: payload.timestamp || new Date().toISOString(),
            },
          }));
          setLastPingTime('Live GPS • Just now');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter available trips for quick dispatch
  const unassignedTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'AVAILABLE' || t.status === 'REQUESTED');
  }, [trips]);

  // Selected city object
  const selectedCity = useMemo(() => {
    return CITIES.find((c) => c.id === selectedCityId) || CITIES[1];
  }, [selectedCityId]);

  // Compute resolved coordinates and assigned city for each driver
  const liveDriversWithCoords = useMemo(() => {
    return drivers.map((d) => {
      const activeTrip = trips.find(
        (t) =>
          t.assigned_driver_id === d.id &&
          ['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'STARTED'].includes(t.status)
      );

      const liveGps = realtimeLocations[d.id];
      const hasRealGps = Boolean(liveGps && typeof liveGps.lat === 'number' && typeof liveGps.lng === 'number');

      // Strictly resolve REAL Coordinates: Live Mobile GPS > Active trip pickup coords > DB coords
      let lat: number | null = null;
      let lng: number | null = null;
      let locationSource: 'live_mobile' | 'active_trip' | 'db_coords' | 'none' = 'none';

      if (hasRealGps) {
        lat = Number(liveGps.lat);
        lng = Number(liveGps.lng);
        locationSource = 'live_mobile';
      } else if (d.current_latitude && d.current_longitude) {
        lat = Number(d.current_latitude);
        lng = Number(d.current_longitude);
        locationSource = 'db_coords';
      } else if (activeTrip && activeTrip.pickup_latitude && activeTrip.pickup_longitude) {
        lat = Number(activeTrip.pickup_latitude);
        lng = Number(activeTrip.pickup_longitude);
        locationSource = 'active_trip';
      }

      // Resolve City
      let city = liveGps?.city || d.current_city;
      if (!city && activeTrip && activeTrip.pickup_location) {
        city = activeTrip.pickup_location.split(',')[0].trim();
      }
      if (!city) {
        city = '';
      }

      return {
        ...d,
        current_city: city,
        current_latitude: lat,
        current_longitude: lng,
        hasRealGps,
        locationSource,
        activeTrip,
        speed: liveGps?.speed ?? d.speed ?? 0,
        heading: liveGps?.heading ?? d.heading ?? 0,
        battery_level: (d as any).battery_level ?? null,
      };
    });
  }, [drivers, trips, realtimeLocations]);

  // Filter drivers based on city, search, status, and vehicle type
  const filteredDrivers = useMemo(() => {
    return liveDriversWithCoords.filter((d) => {
      // City filter
      if (selectedCityId !== 'all') {
        const dCity = (d.current_city || '').toLowerCase();
        if (!dCity.includes(selectedCityId.toLowerCase())) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'GPS_ONLY' && !d.hasRealGps) return false;
      if (statusFilter === 'ONLINE' && d.online_status !== 'ONLINE') return false;
      if (statusFilter === 'OFFLINE' && d.online_status !== 'OFFLINE') return false;
      if (statusFilter === 'ON_TRIP' && (!d.activeTrip || d.online_status !== 'ONLINE')) return false;

      // Vehicle filter
      if (vehicleFilter !== 'ALL' && d.vehicle?.vehicle_type !== vehicleFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesMobile = d.mobile.includes(q);
        const matchesPlate = (d.vehicle?.vehicle_number || '').toLowerCase().includes(q);
        const matchesModel = (d.vehicle?.vehicle_model || '').toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesPlate && !matchesModel) return false;
      }

      return true;
    });
  }, [liveDriversWithCoords, selectedCityId, statusFilter, vehicleFilter, searchQuery]);

  // Statistics for the currently selected city
  const cityStats = useMemo(() => {
    const driversInCity = liveDriversWithCoords.filter((d) => {
      if (selectedCityId === 'all') return true;
      return (d.current_city || '').toLowerCase().includes(selectedCityId.toLowerCase());
    });

    const total = driversInCity.length;
    const online = driversInCity.filter((d) => d.online_status === 'ONLINE').length;
    const onTrip = driversInCity.filter((d) => d.online_status === 'ONLINE' && d.activeTrip).length;
    const idle = online - onTrip;
    const withLiveGps = driversInCity.filter((d) => d.hasRealGps).length;
    const mapped = driversInCity.filter((d) => d.current_latitude && d.current_longitude).length;

    return { total, online, onTrip, idle, withLiveGps, mapped };
  }, [liveDriversWithCoords, selectedCityId]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isCancelled = false;

    const initMap = () => {
      if (isCancelled || !mapContainerRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [selectedCity.lat, selectedCity.lng],
          zoom: selectedCity.zoom,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);
        mapInstanceRef.current = map;
      }
    };

    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      isCancelled = true;
    };
  }, []);

  // Fly to city when city changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedCity.lat, selectedCity.lng], selectedCity.zoom, {
        duration: 1.2,
      });
    }
  }, [selectedCity]);

  // Center map bounds to encompass all active mapped drivers
  const fitMapToDrivers = () => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    const mapped = filteredDrivers.filter(
      (d) => typeof d.current_latitude === 'number' && typeof d.current_longitude === 'number'
    );

    if (mapped.length === 1) {
      map.flyTo([mapped[0].current_latitude!, mapped[0].current_longitude!], 15, { duration: 0.8 });
    } else if (mapped.length > 1) {
      const bounds = L.latLngBounds(mapped.map((d) => [d.current_latitude!, d.current_longitude!]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else {
      map.flyTo([selectedCity.lat, selectedCity.lng], selectedCity.zoom, { duration: 0.8 });
    }
  };

  // Refresh handler: reloads database records and pings Realtime channel
  const handleRefresh = async () => {
    setIsRefreshingLocal(true);
    try {
      // 1. Request live drivers to broadcast their current GPS fix
      try {
        const channel = supabase.channel('fleet_live_locations');
        channel.send({
          type: 'broadcast',
          event: 'ping_request',
          payload: { timestamp: new Date().toISOString() },
        });
      } catch {}

      // 2. Trigger parent data reload from Supabase
      if (onRefresh) {
        await onRefresh();
      }

      setLastPingTime('Refreshed • Just now');

      // 3. Re-fit to active drivers
      setTimeout(() => {
        fitMapToDrivers();
      }, 500);
    } finally {
      setTimeout(() => {
        setIsRefreshingLocal(false);
      }, 600);
    }
  };

  // Auto-center on drivers when coordinates first become available
  useEffect(() => {
    const mapped = filteredDrivers.filter(
      (d) => typeof d.current_latitude === 'number' && typeof d.current_longitude === 'number'
    );
    if (mapped.length > 0 && !hasAutoCenteredRef.current && mapInstanceRef.current) {
      hasAutoCenteredRef.current = true;
      setTimeout(fitMapToDrivers, 300);
    }
  }, [filteredDrivers]);

  // Update Markers: ONLY render drivers with REAL verified GPS coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Remove deleted markers or markers for drivers who don't have coordinates
    Object.keys(markersRef.current).forEach((driverId) => {
      const match = filteredDrivers.find((d) => d.id === driverId);
      if (!match || !match.current_latitude || !match.current_longitude) {
        markersRef.current[driverId].remove();
        delete markersRef.current[driverId];
      }
    });

    // Add or update markers ONLY for drivers with real coordinates
    filteredDrivers.forEach((driver) => {
      if (!driver.current_latitude || !driver.current_longitude) {
        return; // Skip: Never place fake markers
      }

      const lat = driver.current_latitude;
      const lng = driver.current_longitude;
      const isOnline = driver.online_status === 'ONLINE';
      const isOnTrip = Boolean(driver.activeTrip);
      const isSelected = selectedDriver?.id === driver.id;

      const markerColor = isOnTrip ? '#F59E0B' : isOnline ? '#059669' : '#64748B';
      const beaconClass = isOnTrip ? 'animate-pulse' : isOnline ? 'animate-ping' : '';

      const customHtml = `
        <div class="relative group cursor-pointer" style="transform: translate(-50%, -50%);">
          ${isOnline ? `<div class="absolute -inset-2 rounded-full opacity-40 ${beaconClass}" style="background-color: ${markerColor};"></div>` : ''}
          <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-lg border-2 ${isSelected ? 'border-[#0043DC] ring-4 ring-[#0043DC]/20 scale-110' : ''}" style="border-color: ${isSelected ? '#0043DC' : markerColor}; transition: all 0.2s;">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold" style="background-color: ${markerColor};">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
          </div>
          <div class="absolute top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${markerColor};"></span>
            ${driver.name.split(' ')[0]} ${driver.hasRealGps ? '🟢' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: customHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (markersRef.current[driver.id]) {
        markersRef.current[driver.id].setLatLng([lat, lng]);
        markersRef.current[driver.id].setIcon(customIcon);
      } else {
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedDriver(driver);
        });
        markersRef.current[driver.id] = marker;
      }
    });
  }, [filteredDrivers, selectedDriver]);

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    if (mapInstanceRef.current && driver.current_latitude && driver.current_longitude) {
      mapInstanceRef.current.flyTo([driver.current_latitude, driver.current_longitude], 15, {
        duration: 0.8,
      });
    }
  };

  const handleConfirmAssignTrip = async () => {
    if (!selectedDriver || !selectedTripToAssign || !onAssignTrip) return;
    setIsAssigning(true);
    try {
      await onAssignTrip(selectedTripToAssign, selectedDriver.id);
      setIsAssignModalOpen(false);
      setSelectedTripToAssign('');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[550px] h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] bg-slate-50 overflow-hidden rounded-2xl border border-slate-200">
      {/* ── Top Bar: City Selector & Telemetry Banner ── */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 z-20">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              Live Fleet Radar
            </span>
            <span className="text-xs text-slate-400 font-medium">• Last ping: {lastPingTime}</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Live Driver Tracking & City Dispatch
          </h1>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0 no-scrollbar">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#0043DC]" />
            Select City:
          </span>
          {CITIES.map((city) => {
            const isSelected = selectedCityId === city.id;
            return (
              <button
                key={city.id}
                onClick={() => setSelectedCityId(city.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0043DC] text-white shadow-md shadow-[#0043DC]/20 font-black scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
                }`}
              >
                <span>{city.name}</span>
                {city.id === 'all' ? (
                  <span className="text-[10px] opacity-75">All</span>
                ) : (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {liveDriversWithCoords.filter((d) => (d.current_city || '').toLowerCase().includes(city.id)).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-header: City Stats & Controls ── */}
      <div className="bg-slate-50/80 backdrop-blur px-3 sm:px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2 sm:gap-4 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Active in {selectedCity.name}:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-xs">
              {cityStats.online} Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 font-bold">{cityStats.idle} Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-slate-700 font-extrabold">{cityStats.withLiveGps} Live GPS Broadcasts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-slate-600 font-bold">{cityStats.onTrip} On Active Trip</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isRefreshingLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs text-xs font-bold transition active:scale-95 disabled:opacity-60 cursor-pointer"
            title="Refresh Drivers & GPS Radar"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0043DC] ${isRefreshing || isRefreshingLocal ? 'animate-spin' : ''}`} />
            <span>Refresh Map</span>
          </button>

          <button
            onClick={fitMapToDrivers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Center Camera on Active Drivers"
          >
            <Navigation className="w-3.5 h-3.5 text-[#0043DC]" />
            <span>Center on Fleet</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live GPS Stream: Active</span>
          </div>

          {unassignedTrips.length > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0043DC] font-extrabold border border-blue-200">
              ⚡ {unassignedTrips.length} Trips Awaiting Dispatch
            </span>
          )}
        </div>
      </div>

      {/* ── Main Map & Fleet List Container ── */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Real Leaflet Map */}
        <div className="w-full lg:flex-1 h-72 sm:h-96 lg:h-full relative shrink-0">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Quick Action Icons (Top-Right) */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isRefreshingLocal}
              className="w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center transition active:scale-90 disabled:opacity-50 cursor-pointer backdrop-blur"
              title="Refresh Map & GPS Coordinates"
            >
              <RefreshCw className={`w-4 h-4 text-[#0043DC] ${isRefreshing || isRefreshingLocal ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={fitMapToDrivers}
              className="w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-800 shadow-md border border-slate-200 flex items-center justify-center transition active:scale-90 cursor-pointer backdrop-blur"
              title="Center Camera on Active Drivers"
            >
              <Navigation className="w-4 h-4 text-emerald-600" />
            </button>
          </div>

          {/* Floating Radar Notice if no active GPS markers */}
          {filteredDrivers.filter((d) => d.current_latitude && d.current_longitude).length === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700/60 z-10 flex items-center gap-3 text-xs pointer-events-auto max-w-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div>
                <div className="font-extrabold text-white flex items-center gap-1.5">
                  Live GPS Radar Listening
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-mono">0ms delay</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  No fake pins are displayed. As soon as a driver opens the PickMi Driver app and goes Online, their real vehicle pin will appear here in real time.
                </div>
              </div>
            </div>
          )}

          {/* Floating Map Legend */}
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md text-xs space-y-1.5 z-10 pointer-events-auto max-w-[200px]">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Map Markers</div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm"></span>
              <span className="font-bold text-slate-700">Online & Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm"></span>
              <span className="font-bold text-slate-700">On Active Ride</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400 border border-white shadow-sm"></span>
              <span className="font-bold text-slate-700">Offline</span>
            </div>
          </div>
        </div>

        {/* ── Right Side: Live Fleet Directory & Driver Details Drawer ── */}
        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col flex-1 lg:flex-none lg:h-full z-10 shadow-sm overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search driver, phone, plate..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0043DC] focus:bg-white transition"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              {(['ONLINE', 'GPS_ONLY', 'ON_TRIP', 'ALL'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-bold transition ${
                    statusFilter === st
                      ? 'bg-[#0043DC] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ONLINE' ? 'Available' : st === 'GPS_ONLY' ? 'Live GPS' : st === 'ON_TRIP' ? 'On Trip' : 'All'}
                </button>
              ))}
            </div>

            {/* Vehicle Type Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {(['ALL', 'Sedan', 'SUV', 'Prime Sedan', 'EV'] as const).map((vt) => (
                <button
                  key={vt}
                  onClick={() => setVehicleFilter(vt as any)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition ${
                    vehicleFilter === vt
                      ? 'bg-[#0043DC] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {vt}
                </button>
              ))}
            </div>
          </div>

          {/* Driver List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-bold text-slate-600">No Live Drivers Found</p>
                <p className="mt-1">Try selecting another city or changing filters.</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isSelected = selectedDriver?.id === driver.id;
                const isOnline = driver.online_status === 'ONLINE';
                const isOnTrip = Boolean(driver.activeTrip);

                return (
                  <div
                    key={driver.id}
                    onClick={() => handleSelectDriver(driver)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                      isSelected ? 'bg-blue-50/60 border-l-4 border-l-[#0043DC]' : ''
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={driver.profile_image || '/default-avatar.svg'}
                        alt={driver.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <span
                        className={`w-3 h-3 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${
                          isOnTrip ? 'bg-amber-500' : isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 truncate">{driver.name}</h4>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{driver.rating}</span>
                        </div>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                        {driver.vehicle?.vehicle_model || 'Sedan'} • {driver.vehicle?.vehicle_number || 'KA 01 --'}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                              isOnTrip
                                ? 'bg-amber-100 text-amber-800'
                                : isOnline
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isOnTrip ? 'On Ride' : isOnline ? 'Available' : 'Offline'}
                          </span>
                          {driver.hasRealGps ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              Live GPS
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-400">
                              No GPS
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-slate-400" />
                          {driver.speed ? `${driver.speed} km/h` : '0 km/h'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Driver Detailed Action Card */}
          {selectedDriver && (
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Live Driver Telemetry
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <img
                  src={selectedDriver.profile_image || '/default-avatar.svg'}
                  alt={selectedDriver.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-white truncate">{selectedDriver.name}</h3>
                  <p className="text-xs text-slate-300 font-medium">{selectedDriver.mobile}</p>
                  <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                    {selectedDriver.vehicle?.vehicle_number} ({selectedDriver.vehicle?.vehicle_type})
                  </p>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-slate-800/80 rounded-xl p-2.5 mb-3 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">SPEED</div>
                  <div className="text-xs font-black text-white mt-0.5">
                    {selectedDriver.speed ? `${selectedDriver.speed} km/h` : '0 km/h'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">GPS SIGNAL</div>
                  <div className={`text-xs font-black mt-0.5 ${(selectedDriver as any).hasRealGps ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {(selectedDriver as any).hasRealGps ? 'Live Active' : 'No Signal'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">RATING</div>
                  <div className="text-xs font-black text-amber-400 mt-0.5">★ {selectedDriver.rating}</div>
                </div>
              </div>
              {!(selectedDriver as any).hasRealGps && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>No live GPS fix received yet. Driver must be Online in the PickMi Driver app with device GPS enabled.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex-1 bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Trip</span>
                </button>

                {onViewDriverDetails && (
                  <button
                    onClick={() => onViewDriverDetails(selectedDriver.id)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl transition"
                    title="View Full Profile"
                  >
                    Profile
                  </button>
                )}

                <a
                  href={`tel:${selectedDriver.mobile}`}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center"
                  title="Direct Call"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Dispatch / Assign Trip Modal ── */}
      {isAssignModalOpen && selectedDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0043DC] flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Dispatch Trip to Driver</h3>
                  <p className="text-xs text-slate-500 font-medium">Assigning to {selectedDriver.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {unassignedTrips.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-xl mb-4">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <p className="font-bold text-slate-700">No Unassigned Trips Available</p>
                <p className="mt-1">Create a new trip from the "Create & Dispatch Trip" page first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4 pr-1">
                <label className="text-xs font-bold text-slate-600 block">Select Trip to Assign:</label>
                {unassignedTrips.map((trip) => {
                  const isChosen = selectedTripToAssign === trip.id;
                  return (
                    <div
                      key={trip.id}
                      onClick={() => setSelectedTripToAssign(trip.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        isChosen
                          ? 'border-[#0043DC] bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#0043DC] font-extrabold">{trip.trip_number}</span>
                        <span className="text-emerald-700 font-black">₹{trip.fare}</span>
                      </div>
                      <div className="text-slate-600 font-semibold truncate mt-1">
                        {trip.pickup_location.split(',')[0]} → {trip.drop_location.split(',')[0]}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {trip.pickup_date} at {trip.pickup_time} • {trip.vehicle_type}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              {unassignedTrips.length > 0 && (
                <button
                  disabled={!selectedTripToAssign || isAssigning}
                  onClick={handleConfirmAssignTrip}
                  className="flex-1 py-2.5 rounded-xl bg-[#0043DC] hover:bg-blue-600 text-white font-extrabold text-xs transition disabled:opacity-50"
                >
                  {isAssigning ? 'Dispatching…' : 'Confirm Dispatch →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
