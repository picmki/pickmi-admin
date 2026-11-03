import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Edit3,
  MapPin,
  Car,
  Phone,
  IndianRupee,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowRight,
  X,
  Mic,
  MicOff,
  Image,
  Upload,
  Camera,
  Paperclip,
  Check,
  Copy,
  PlusCircle,
  Eye,
  Loader2,
  Navigation
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import type { Trip, Driver, TripStatus, VehicleType, TripType } from '../types';

interface LiveChatAgentProps {
  trips: Trip[];
  drivers: Driver[];
  onUpdateTripDetails: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  onUpdateTripStatus: (tripId: string, status: TripStatus, driverId?: string) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
  onCreateTrip?: (payload: any) => Promise<Trip | void>;
  onNavigateToTrips?: () => void;
  onViewDriverDetails?: (driverId: string) => void;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

export interface ExtractedBookingPayload {
  bookingId: string;
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
  allowed_km: number;
  vehicle_type: VehicleType;
  trip_type: TripType;
  payment_method: string;
  status: TripStatus;
  toll_included: 'INCLUDED' | 'EXCLUDED';
  permit_included: 'INCLUDED' | 'EXCLUDED';
  batta_included: 'INCLUDED' | 'EXCLUDED';
  assigned_driver_id?: string | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  trips?: Trip[];
  imageUrl?: string;
  actionType?: 'details' | 'edit' | 'delete_confirm' | 'image_review' | 'stats' | 'general';
  pendingDeleteTrip?: Trip;
  editingTripId?: string;
  reviewPayload?: ExtractedBookingPayload;
}

export const LiveChatAgent: React.FC<LiveChatAgentProps> = ({
  trips,
  drivers,
  onUpdateTripDetails,
  onUpdateTripStatus,
  onDeleteTrip,
  onCreateTrip,
  onNavigateToTrips,
  onViewDriverDetails,
  isFloating = false,
  onCloseFloating,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('pickmi_agent_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'msg_welcome',
        sender: 'agent',
        text: `👋 **Hello Admin! I'm your PickMi Fleet Operations Agent.**\n\nI can execute actions on your trips via chat or images:\n• 📷 **Upload/Paste Image**: Upload a booking screenshot (e.g., from WhatsApp or portals) to automatically extract details, review, and create trips!\n• 🔍 **Search & View**: *"Show trip PM-847291"* or *"Find trips for Priya"*\n• ✏️ **Edit Trips**: *"Edit trip PM-847291 change fare to 1400"* or *"Change status to COMPLETED"*\n• 🗑️ **Delete Trips**: *"Delete trip PM-847291"*\n• 📊 **Analytics**: *"Fleet summary"* or *"Active trips"*\n\nYou can click the quick prompt chips or the 📎 paperclip button below to upload an image!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionType: 'general',
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  // Active inline edit states for existing trips: key = tripId
  const [inlineEditState, setInlineEditState] = useState<{
    [tripId: string]: {
      fare: number;
      customer_name: string;
      customer_phone: string;
      pickup_location: string;
      drop_location: string;
      vehicle_type: VehicleType;
      status: TripStatus;
      assigned_driver_id: string;
    };
  }>({});

  // Active review states for newly uploaded images: key = messageId
  const [activeReviewState, setActiveReviewState] = useState<{
    [messageId: string]: ExtractedBookingPayload;
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem('pickmi_agent_chat_history', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isScanningImage]);

  // Audio chime
  const playSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch {}
  };

  // Setup Web Speech API for voice dictation
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        setIsListening(false);
      }
    }
  };

  const copyTripNumber = (num: string, tripId: string) => {
    navigator.clipboard.writeText(num);
    setCopiedTripId(tripId);
    setTimeout(() => setCopiedTripId(null), 2000);
  };

  // Smart Parser for Booking Screenshot OCR Text
  const parseBookingOCR = (rawText: string): ExtractedBookingPayload => {
    const clean = rawText.replace(/\r/g, '');

    // 1. Booking ID
    const bookingMatch = clean.match(/(?:BOOKING|TRIP|ORDER|ID|Ref)\s*[:#\-]?\s*([A-Za-z0-9_-]+)/i);
    const bookingId = bookingMatch ? bookingMatch[1].trim() : String(Math.floor(10000000 + Math.random() * 90000000));
    const trip_number = `PM-${bookingId}`;

    // 2. Route (e.g. Trichy — Sulur or Bangalore to Chennai)
    let pickupCity = '';
    let dropCity = '';
    const routeMatch = clean.match(
      /([A-Za-z\s]{3,30}?)\s*(?:—|–|->|→|—|-->|\s+to\s+|-)\s*([A-Za-z\s]{3,30}?)(?:,|\(|\n|for|\s+Outstation|\s+Round|\s+One)/i
    );
    if (routeMatch) {
      pickupCity = routeMatch[1].replace(/^[.\s]+/, '').trim();
      dropCity = routeMatch[2].trim();
    }

    // 3. Detailed Pickup Address
    let pickupAddress = '';
    const addressMatch =
      clean.match(/(?:at|Pickup|Pick-up)\s*\n*\s*([A-Za-z0-9,\s\-\/]+?\d{6})/i) ||
      clean.match(/(?:at|Pickup)\s*\n*\s*([A-Za-z0-9,\s\-\/]{10,80})/i);

    if (addressMatch) {
      pickupAddress = addressMatch[1].replace(/\s+/g, ' ').replace(/^Pickup\s*/i, '').trim();
    } else if (pickupCity) {
      pickupAddress = `${pickupCity}, Tamil Nadu`;
    }

    // 4. Trip Type
    let tripType: TripType = 'Outstation';
    if (/Round\s*Trip/i.test(clean)) tripType = 'Round-trip';
    else if (/Airport/i.test(clean)) tripType = 'Airport Transfer';
    else if (/One\s*Way/i.test(clean)) tripType = 'One-way';
    else if (/Outstation/i.test(clean)) tripType = 'Outstation';

    // 5. Vehicle Type
    let vehicleType: VehicleType = 'Sedan';
    if (/Dzire|Etios|Amaze|Xcent|Sedan/i.test(clean)) vehicleType = 'Sedan';
    else if (/Innova|Ertiga|Crysta|SUV|Xylo/i.test(clean)) vehicleType = 'SUV';
    else if (/EV|Electric|Tigor|ZS/i.test(clean)) vehicleType = 'EV';
    else if (/WagonR|Indica|Swift|Hatchback|i10/i.test(clean)) vehicleType = 'Hatchback';
    else if (/Prime|Ciaz|Honda City/i.test(clean)) vehicleType = 'Prime Sedan';

    // 6. Km limit / distance
    let distance = '50 km';
    let allowedKm = 50;
    const kmMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:Km|kms|kilometers)/i);
    if (kmMatch) {
      allowedKm = parseFloat(kmMatch[1]);
      distance = `${allowedKm} km`;
    }

    // 7. Date & Time
    let pickupDate = 'Today';
    let pickupTime = 'Now';
    const dateMatch =
      clean.match(/(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i) ||
      clean.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dateMatch) {
      pickupDate = dateMatch[1].trim();
    }
    const timeMatch = clean.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
    if (timeMatch) {
      pickupTime = timeMatch[1].trim();
    }

    // 8. Fare
    let fare = 0;
    const fareMatch = clean.match(/(?:CONFIRM\s*@|FARE\s*[:₹@]?|TOTAL\s*[:₹@]?|PRICE\s*[:₹@]?|@\s*)(\d{3,6})/i);
    if (fareMatch) {
      fare = parseInt(fareMatch[1], 10);
    } else if (allowedKm > 0) {
      fare = Math.round(allowedKm * 10);
    } else {
      fare = 1500;
    }

    return {
      bookingId,
      trip_number,
      customer_name: `Booking #${bookingId}`,
      customer_phone: '+91 98000 00000',
      pickup_location: pickupAddress || (pickupCity ? `${pickupCity}, Tamil Nadu` : 'Srirangam, Tiruchirappalli, Tamil Nadu 620005'),
      pickup_latitude: 10.7905,
      pickup_longitude: 78.7047,
      drop_location: dropCity ? `${dropCity}, Tamil Nadu` : 'Sulur, Tamil Nadu',
      drop_latitude: 11.0267,
      drop_longitude: 77.1264,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      fare,
      distance,
      allowed_km: allowedKm,
      vehicle_type: vehicleType,
      trip_type: tripType,
      payment_method: 'Cash',
      status: 'AVAILABLE',
      toll_included: 'INCLUDED',
      permit_included: 'EXCLUDED',
      batta_included: 'INCLUDED',
      assigned_driver_id: null,
    };
  };

  // Perform Image OCR Pipeline
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const userMsgId = `usr_${Date.now()}`;
      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text: '📷 Uploaded Booking Screenshot for Automatic Trip Creation',
        imageUrl: dataUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsScanningImage(true);
      setScanProgress('Initializing OCR engine...');

      try {
        const worker = await createWorker('eng');
        setScanProgress('Extracting text from booking card...');

        // Pass 1: standard OCR
        const ret1 = await worker.recognize(dataUrl);
        const text1 = ret1.data.text || '';

        // Pass 2: Inspect bottom button region (e.g. green CONFIRM @3915)
        let buttonText = '';
        try {
          const img = new window.Image();
          img.src = dataUrl;
          await new Promise((res) => {
            img.onload = res;
          });

          const canvas = document.createElement('canvas');
          const cropH = Math.floor(img.height * 0.35);
          const cropY = img.height - cropH;
          canvas.width = img.width;
          canvas.height = cropH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, cropY, img.width, cropH, 0, 0, img.width, cropH);
            const cropDataUrl = canvas.toDataURL('image/png');
            const ret2 = await worker.recognize(cropDataUrl);
            buttonText = ret2.data.text || '';
          }
        } catch (canvasErr) {
          console.warn('Canvas button OCR note:', canvasErr);
        }

        await worker.terminate();

        const combinedText = `${text1}\n${buttonText}`;
        const parsed = parseBookingOCR(combinedText);

        const agentMsgId = `agent_${Date.now()}`;
        setActiveReviewState((prev) => ({
          ...prev,
          [agentMsgId]: parsed,
        }));

        setMessages((prev) => [
          ...prev,
          {
            id: agentMsgId,
            sender: 'agent',
            text: `📋 **Booking Extracted from Screenshot!**\n\nI have parsed the image and extracted details for **Booking #${parsed.bookingId}** (${parsed.pickup_location.split(',')[0]} → ${parsed.drop_location.split(',')[0]}).\n\nPlease review or edit the details below, then click **Confirm & Create Trip**:`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionType: 'image_review',
            imageUrl: dataUrl,
            reviewPayload: parsed,
          },
        ]);
        playSound();
      } catch (err: any) {
        console.error('OCR processing error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: `agent_${Date.now()}`,
            sender: 'agent',
            text: `⚠️ **Could not read image**: ${err?.message || 'Error running OCR'}. Please ensure the booking card text is legible and try again.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsScanningImage(false);
        setScanProgress('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Clipboard Paste
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        processImageFile(file);
      }
    }
  };

  // Execute Trip Creation from Review Card
  const handleConfirmCreateTrip = async (msgId: string) => {
    const payload = activeReviewState[msgId];
    if (!payload) return;

    try {
      if (onCreateTrip) {
        await onCreateTrip(payload);
      }

      // Convert to Trip object for preview card in chat
      const createdTrip: Trip = {
        id: 'trip_' + Date.now(),
        trip_number: payload.trip_number,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        pickup_location: payload.pickup_location,
        pickup_latitude: payload.pickup_latitude,
        pickup_longitude: payload.pickup_longitude,
        drop_location: payload.drop_location,
        drop_latitude: payload.drop_latitude,
        drop_longitude: payload.drop_longitude,
        pickup_date: payload.pickup_date,
        pickup_time: payload.pickup_time,
        fare: payload.fare,
        distance: payload.distance,
        vehicle_type: payload.vehicle_type,
        trip_type: payload.trip_type,
        payment_method: payload.payment_method,
        status: payload.status,
        assigned_driver_id: payload.assigned_driver_id || null,
        otp: String(Math.floor(1000 + Math.random() * 9000)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Remove from active review state
      setActiveReviewState((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `agent_${Date.now()}`,
          sender: 'agent',
          text: `🎉 **Trip #${payload.trip_number} Created Successfully!**\n\nThe booking has been converted into an active fleet trip and is now **AVAILABLE** for dispatch.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          trips: [createdTrip],
          actionType: 'details',
        },
      ]);
      playSound();
    } catch (e: any) {
      alert(`Could not create trip: ${e?.message || 'Unknown error'}`);
    }
  };

  // Helper to find trips matching a query or ID
  const findMatchingTrips = (query: string): Trip[] => {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Exact or partial trip number match
    const tripNumMatch = cleanQuery.match(/(?:pm[-_ ]?)?(\d{4,7})/i);
    if (tripNumMatch) {
      const digits = tripNumMatch[1];
      const byNum = trips.filter(
        (t) =>
          t.trip_number.toLowerCase().includes(digits) ||
          t.id.toLowerCase().includes(digits)
      );
      if (byNum.length > 0) return byNum;
    }

    // 2. Exact ID match
    const byId = trips.filter(
      (t) => t.id.toLowerCase() === cleanQuery || t.trip_number.toLowerCase() === cleanQuery
    );
    if (byId.length > 0) return byId;

    // 3. Search by customer name, phone, locations, or driver name
    return trips.filter((t) => {
      const custMatch = t.customer_name?.toLowerCase().includes(cleanQuery);
      const phoneMatch = t.customer_phone?.replace(/\s+/g, '').includes(cleanQuery.replace(/\s+/g, ''));
      const pickupMatch = t.pickup_location?.toLowerCase().includes(cleanQuery);
      const dropMatch = t.drop_location?.toLowerCase().includes(cleanQuery);
      const driverMatch = t.driver?.name?.toLowerCase().includes(cleanQuery);
      const statusMatch = t.status.toLowerCase() === cleanQuery;
      return custMatch || phoneMatch || pickupMatch || dropMatch || driverMatch || statusMatch;
    });
  };

  // Main NLP Processing Function for Text
  const processUserInstruction = (rawInput: string) => {
    const input = rawInput.trim();
    if (!input) return;

    const lower = input.toLowerCase();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(async () => {
      setIsTyping(false);
      playSound();

      // Check if user is confirming an image review or delete
      const lastMsg = messages[messages.length - 1];

      // Confirm image review creation
      if (
        lastMsg?.actionType === 'image_review' &&
        (lower === 'yes' ||
          lower.includes('confirm') ||
          lower.includes('create') ||
          lower.includes('proceed') ||
          lower.includes('ok'))
      ) {
        handleConfirmCreateTrip(lastMsg.id);
        return;
      }

      // Confirm delete
      if (
        lastMsg?.actionType === 'delete_confirm' &&
        lastMsg.pendingDeleteTrip &&
        (lower === 'yes' ||
          lower.includes('confirm') ||
          lower.includes('delete it') ||
          lower.includes('proceed') ||
          lower.includes('ok'))
      ) {
        const tripToDelete = lastMsg.pendingDeleteTrip;
        try {
          await onDeleteTrip(tripToDelete.id);
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `🗑️ **Trip #${tripToDelete.trip_number} Deleted Successfully**\n\nThe trip for customer **${tripToDelete.customer_name}** has been removed.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actionType: 'general',
            },
          ]);
        } catch (err: any) {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `⚠️ **Failed to delete trip**: ${err?.message || 'Unknown error'}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
        return;
      }

      // Check for DELETE intent
      const isDeleteIntent =
        lower.startsWith('delete') ||
        lower.startsWith('remove') ||
        lower.startsWith('cancel and delete') ||
        lower.includes('delete trip') ||
        lower.includes('remove trip');

      if (isDeleteIntent) {
        const matched = findMatchingTrips(input);
        if (matched.length === 1) {
          const target = matched[0];
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `⚠️ **Confirmation Required to Delete Trip**\n\nYou asked to delete Trip **#${target.trip_number}**. Please confirm below before I proceed:`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actionType: 'delete_confirm',
              pendingDeleteTrip: target,
              trips: [target],
            },
          ]);
          return;
        } else if (matched.length > 1) {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `🔍 I found **${matched.length} trips** matching your request. Which one would you like to delete? Click the **Delete** button on the specific trip card:`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              trips: matched.slice(0, 5),
              actionType: 'details',
            },
          ]);
          return;
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `❌ I couldn't find any trip matching "${input}". Please provide a valid Trip ID (e.g. *delete trip PM-847291*) or customer name.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          return;
        }
      }

      // Check for EDIT / UPDATE intent
      const isEditIntent =
        lower.startsWith('edit') ||
        lower.startsWith('update') ||
        lower.startsWith('change') ||
        lower.startsWith('modify') ||
        lower.startsWith('set ') ||
        lower.includes('change fare') ||
        lower.includes('update trip') ||
        lower.includes('edit trip') ||
        lower.includes('change status') ||
        lower.includes('assign driver');

      if (isEditIntent) {
        const matched = findMatchingTrips(input);
        if (matched.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `❌ I couldn't identify which trip you want to edit. Try specifying the Trip ID:\n*"Edit trip PM-847291 fare 1500"* or *"Change status of PM-847291 to COMPLETED"*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          return;
        }

        const targetTrip = matched[0];
        const updates: Partial<Trip> = {};
        const changesSummary: string[] = [];

        // Fare update
        const fareMatch = input.match(/(?:fare|amount|price)(?:\s*(?:to|is|=)?\s*(?:₹|rs\.?)?\s*)(\d+)/i);
        if (fareMatch) {
          const newFare = Number(fareMatch[1]);
          updates.fare = newFare;
          changesSummary.push(`Fare updated to **₹${newFare.toLocaleString('en-IN')}**`);
        }

        // Status update
        const statusKeywords: { [k: string]: TripStatus } = {
          available: 'AVAILABLE',
          assigned: 'ASSIGNED',
          accepted: 'ACCEPTED',
          'on the way': 'ON_THE_WAY',
          ontheway: 'ON_THE_WAY',
          arrived: 'ARRIVED',
          started: 'STARTED',
          completed: 'COMPLETED',
          complete: 'COMPLETED',
          cancelled: 'CANCELLED',
          cancel: 'CANCELLED',
        };

        for (const [key, val] of Object.entries(statusKeywords)) {
          if (
            lower.includes(`status to ${key}`) ||
            lower.includes(`status ${key}`) ||
            lower.includes(`mark ${key}`) ||
            (lower.includes(key) && (lower.includes('change') || lower.includes('set')))
          ) {
            updates.status = val;
            changesSummary.push(`Status changed to **${val}**`);
            break;
          }
        }

        // Customer Name
        const custMatch = input.match(/customer(?:\s+name)?\s+(?:to\s+)?([A-Za-z\s]+?)(?=\s+(?:phone|fare|pickup|drop|status|vehicle)|$)/i);
        if (custMatch && custMatch[1].trim() && !['to', 'name', 'details', 'trip'].includes(custMatch[1].trim().toLowerCase())) {
          const newName = custMatch[1].trim();
          updates.customer_name = newName;
          changesSummary.push(`Customer name updated to **${newName}**`);
        }

        // Phone
        const phoneMatch = input.match(/(?:phone|mobile|contact)(?:\s*(?:to|is|=)?\s*)(\+?[\d\s-]{10,14})/i);
        if (phoneMatch) {
          const newPhone = phoneMatch[1].trim();
          updates.customer_phone = newPhone;
          changesSummary.push(`Customer phone updated to **${newPhone}**`);
        }

        // Pickup Location
        const pickupMatch = input.match(/pickup(?:\s+location)?\s+(?:to\s+)?([^,]+?)(?=\s+(?:drop|fare|phone|customer|status|vehicle)|$)/i);
        if (pickupMatch && pickupMatch[1].trim().length > 3) {
          const newPickup = pickupMatch[1].trim();
          updates.pickup_location = newPickup;
          changesSummary.push(`Pickup updated to **${newPickup}**`);
        }

        // Drop Location
        const dropMatch = input.match(/drop(?:\s+location)?\s+(?:to\s+)?([^,]+?)(?=\s+(?:pickup|fare|phone|customer|status|vehicle)|$)/i);
        if (dropMatch && dropMatch[1].trim().length > 3) {
          const newDrop = dropMatch[1].trim();
          updates.drop_location = newDrop;
          changesSummary.push(`Drop location updated to **${newDrop}**`);
        }

        // Vehicle Type
        const vehicleMatch = input.match(/(?:vehicle|car)(?:\s+type)?\s+(?:to\s+)?(sedan|suv|hatchback|prime sedan|ev)/i);
        if (vehicleMatch) {
          const vType = vehicleMatch[1].toLowerCase();
          const normalizedType: VehicleType =
            vType === 'suv'
              ? 'SUV'
              : vType === 'hatchback'
              ? 'Hatchback'
              : vType === 'ev'
              ? 'EV'
              : vType === 'prime sedan'
              ? 'Prime Sedan'
              : 'Sedan';
          updates.vehicle_type = normalizedType;
          changesSummary.push(`Vehicle type changed to **${normalizedType}**`);
        }

        // Driver Assignment
        const assignMatch = input.match(/assign(?:\s+driver)?\s+([A-Za-z\s]+?)(?:\s+to|\s+for|$)/i);
        if (assignMatch) {
          const drvQuery = assignMatch[1].trim().toLowerCase();
          const matchedDriver = drivers.find((d) => d.name.toLowerCase().includes(drvQuery));
          if (matchedDriver) {
            updates.assigned_driver_id = matchedDriver.id;
            updates.driver = matchedDriver;
            updates.status = 'ASSIGNED';
            changesSummary.push(`Assigned driver **${matchedDriver.name}**`);
          }
        }

        if (Object.keys(updates).length > 0) {
          try {
            if (updates.status) {
              await onUpdateTripStatus(targetTrip.id, updates.status, updates.assigned_driver_id || targetTrip.assigned_driver_id || undefined);
            }
            await onUpdateTripDetails(targetTrip.id, updates);

            const updatedTrip: Trip = {
              ...targetTrip,
              ...updates,
              updated_at: new Date().toISOString(),
            };

            setMessages((prev) => [
              ...prev,
              {
                id: `agent_${Date.now()}`,
                sender: 'agent',
                text: `✅ **Successfully Updated Trip #${targetTrip.trip_number}**\n\n${changesSummary.map((s) => `• ${s}`).join('\n')}\n\nHere are the updated trip details:`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                trips: [updatedTrip],
                actionType: 'details',
              },
            ]);
            return;
          } catch (e: any) {
            setMessages((prev) => [
              ...prev,
              {
                id: `agent_${Date.now()}`,
                sender: 'agent',
                text: `⚠️ **Update Failed**: ${e?.message || 'Could not save updates.'}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            return;
          }
        } else {
          // Open interactive inline editor
          setInlineEditState((prev) => ({
            ...prev,
            [targetTrip.id]: {
              fare: targetTrip.fare || 1000,
              customer_name: targetTrip.customer_name || '',
              customer_phone: targetTrip.customer_phone || '',
              pickup_location: targetTrip.pickup_location || '',
              drop_location: targetTrip.drop_location || '',
              vehicle_type: targetTrip.vehicle_type || 'Sedan',
              status: targetTrip.status || 'AVAILABLE',
              assigned_driver_id: targetTrip.assigned_driver_id || '',
            },
          }));

          setMessages((prev) => [
            ...prev,
            {
              id: `agent_${Date.now()}`,
              sender: 'agent',
              text: `✏️ **Interactive Trip Editor for #${targetTrip.trip_number}**\n\nTweak values below and click **Save Updates**:`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              trips: [targetTrip],
              actionType: 'edit',
              editingTripId: targetTrip.id,
            },
          ]);
          return;
        }
      }

      // Check for STATS / SUMMARY
      if (lower.includes('stats') || lower.includes('summary') || lower.includes('analytics') || lower.includes('how many')) {
        const totalTrips = trips.length;
        const available = trips.filter((t) => t.status === 'AVAILABLE').length;
        const ongoing = trips.filter((t) => ['ON_THE_WAY', 'STARTED', 'ARRIVED'].includes(t.status)).length;
        const completed = trips.filter((t) => t.status === 'COMPLETED').length;
        const totalFare = trips
          .filter((t) => t.status !== 'CANCELLED')
          .reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
        const onlineDrivers = drivers.filter((d) => d.online_status === 'ONLINE').length;

        setMessages((prev) => [
          ...prev,
          {
            id: `agent_${Date.now()}`,
            sender: 'agent',
            text: `📊 **Fleet Realtime Summary**\n\n• **Total Trips**: ${totalTrips}\n• 🟢 **Available for Dispatch**: ${available}\n• 🚗 **Active on Road**: ${ongoing}\n• ✅ **Completed**: ${completed}\n• 💰 **Total Pipeline Fare**: ₹${totalFare.toLocaleString('en-IN')}\n• 📱 **Online Drivers**: ${onlineDrivers} / ${drivers.length}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionType: 'stats',
          },
        ]);
        return;
      }

      // Specific search or trip details query
      const matched = findMatchingTrips(input);
      if (matched.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `agent_${Date.now()}`,
            sender: 'agent',
            text:
              matched.length === 1
                ? `🎯 **Found Trip #${matched[0].trip_number}** for **${matched[0].customer_name}**:`
                : `🔍 Found **${matched.length} matching trips** for "${input}":`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            trips: matched.slice(0, 6),
            actionType: 'details',
          },
        ]);
        return;
      }

      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: `agent_${Date.now()}`,
          sender: 'agent',
          text: `🤖 I'm here to help with fleet operations! You can:\n• 📷 **Upload/Paste a screenshot** of a booking to auto-create trips\n• 🔍 *"Show trip PM-847291"*\n• ✏️ *"Edit trip PM-847291 change fare to 1400"*\n• 🗑️ *"Delete trip PM-847291"*\n• 🚗 *"Show active trips"*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionType: 'general',
        },
      ]);
    }, 450);
  };

  // Save inline edit on existing trip
  const handleSaveInlineEdit = async (tripId: string) => {
    const editValues = inlineEditState[tripId];
    if (!editValues) return;

    try {
      if (editValues.status) {
        await onUpdateTripStatus(tripId, editValues.status, editValues.assigned_driver_id || undefined);
      }
      await onUpdateTripDetails(tripId, {
        fare: editValues.fare,
        customer_name: editValues.customer_name,
        customer_phone: editValues.customer_phone,
        pickup_location: editValues.pickup_location,
        drop_location: editValues.drop_location,
        vehicle_type: editValues.vehicle_type,
        assigned_driver_id: editValues.assigned_driver_id || null,
        driver: drivers.find((d) => d.id === editValues.assigned_driver_id),
      });

      setInlineEditState((prev) => {
        const next = { ...prev };
        delete next[tripId];
        return next;
      });

      const updated = trips.find((t) => t.id === tripId);
      const displayTrip = updated ? { ...updated, ...editValues } : null;

      setMessages((prev) => [
        ...prev,
        {
          id: `agent_${Date.now()}`,
          sender: 'agent',
          text: `✅ **Trip #${displayTrip?.trip_number || tripId} Updated Successfully!**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          trips: displayTrip ? [displayTrip as Trip] : undefined,
          actionType: 'details',
        },
      ]);
      playSound();
    } catch (e: any) {
      alert(`Failed to save: ${e?.message || 'Error updating trip'}`);
    }
  };

  const handleRequestDelete = (trip: Trip) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: `⚠️ **Confirm Deletion of Trip #${trip.trip_number}**\nAre you sure you want to delete this trip for customer **${trip.customer_name}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionType: 'delete_confirm',
        pendingDeleteTrip: trip,
        trips: [trip],
      },
    ]);
  };

  const handleConfirmDelete = async (trip: Trip) => {
    try {
      await onDeleteTrip(trip.id);
      setMessages((prev) => [
        ...prev,
        {
          id: `agent_${Date.now()}`,
          sender: 'agent',
          text: `🗑️ **Trip #${trip.trip_number} Has Been Deleted**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionType: 'general',
        },
      ]);
      playSound();
    } catch (e: any) {
      alert(`Could not delete trip: ${e?.message || 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ASSIGNED':
      case 'ACCEPTED':
        return 'bg-blue-50 text-[#0043DC] border-blue-200';
      case 'ON_THE_WAY':
      case 'ARRIVED':
      case 'STARTED':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`relative flex flex-col bg-slate-50 overflow-hidden ${
        isFloating
          ? 'fixed bottom-4 right-4 w-[430px] max-w-[95vw] h-[650px] max-h-[85vh] rounded-3xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200'
          : 'h-[calc(100dvh-135px)] md:h-[calc(100vh-100px)] rounded-2xl border border-slate-200 shadow-xs'
      }`}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#0043DC]/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white p-6 transition-all">
          <Upload className="w-14 h-14 mb-3 animate-bounce" />
          <h3 className="text-lg font-black tracking-tight">Drop Booking Screenshot Here</h3>
          <p className="text-xs text-blue-100 mt-1 text-center">
            The AI Agent will scan the booking card, extract details, and create the trip!
          </p>
        </div>
      )}

      {/* Agent Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0043DC] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[#0043DC]/20">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-400/50" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black tracking-tight text-slate-900">
                PickMi Live Chat Agent
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0043DC] rounded-full border border-blue-200/60">
                AI Agent & OCR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              Image-to-Trip Enabled • {trips.length} Trips Synced
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              if (confirm('Clear chat conversation history?')) {
                setMessages([
                  {
                    id: `msg_welcome_${Date.now()}`,
                    sender: 'agent',
                    text: '🧹 Chat cleared! How can I help you manage trips today?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
                localStorage.removeItem('pickmi_agent_chat_history');
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Clear Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isFloating && onCloseFloating && (
            <button
              onClick={onCloseFloating}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const reviewData = msg.actionType === 'image_review' ? activeReviewState[msg.id] || msg.reviewPayload : null;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                  isUser
                    ? 'bg-[#0043DC] text-white'
                    : 'bg-gradient-to-tr from-slate-900 to-slate-700 text-white'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Content */}
              <div className={`max-w-[88%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Uploaded Image Thumbnail Preview */}
                {msg.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-1 max-w-xs shadow-xs">
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded screenshot"
                      className="w-full h-auto max-h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                      title="Click to view full size"
                    />
                  </div>
                )}

                {/* Message Bubble Text */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#0043DC] text-white rounded-tr-xs font-medium'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs font-normal'
                  }`}
                >
                  {msg.text}
                </div>

                {/* IMAGE REVIEW & EDIT CARD FOR CREATING TRIP */}
                {msg.actionType === 'image_review' && reviewData && (
                  <div className="bg-white rounded-2xl border-2 border-[#0043DC]/30 p-3.5 shadow-md w-full max-w-md text-left space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="font-mono font-black text-xs text-slate-900">
                          Review #{reviewData.trip_number}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        AI Extracted
                      </span>
                    </div>

                    {/* Review Editable Fields */}
                    <div className="space-y-2.5 text-xs">
                      {/* Customer Name & Phone */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            value={reviewData.customer_name}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, customer_name: e.target.value },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={reviewData.customer_phone}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, customer_phone: e.target.value },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Pickup Location */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          Pickup Location
                        </label>
                        <input
                          type="text"
                          value={reviewData.pickup_location}
                          onChange={(e) =>
                            setActiveReviewState((prev) => ({
                              ...prev,
                              [msg.id]: { ...reviewData, pickup_location: e.target.value },
                            }))
                          }
                          className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>

                      {/* Drop Location */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                          Drop Location
                        </label>
                        <input
                          type="text"
                          value={reviewData.drop_location}
                          onChange={(e) =>
                            setActiveReviewState((prev) => ({
                              ...prev,
                              [msg.id]: { ...reviewData, drop_location: e.target.value },
                            }))
                          }
                          className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                        />
                      </div>

                      {/* Trip Type & Vehicle */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Trip Type
                          </label>
                          <select
                            value={reviewData.trip_type}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, trip_type: e.target.value as TripType },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value="Round-trip">Round-trip</option>
                            <option value="Outstation">Outstation</option>
                            <option value="One-way">One-way</option>
                            <option value="Airport Transfer">Airport Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Vehicle Type
                          </label>
                          <select
                            value={reviewData.vehicle_type}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, vehicle_type: e.target.value as VehicleType },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                          >
                            <option value="Sedan">Sedan (Dzire / Etios)</option>
                            <option value="SUV">SUV (Innova / Ertiga)</option>
                            <option value="Hatchback">Hatchback</option>
                            <option value="Prime Sedan">Prime Sedan</option>
                            <option value="EV">EV Electric</option>
                          </select>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Pickup Date
                          </label>
                          <input
                            type="text"
                            value={reviewData.pickup_date}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, pickup_date: e.target.value },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Pickup Time
                          </label>
                          <input
                            type="text"
                            value={reviewData.pickup_time}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, pickup_time: e.target.value },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Fare & Distance */}
                      <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                        <div>
                          <label className="text-[10px] font-black text-[#0043DC] uppercase">
                            Total Fare (₹)
                          </label>
                          <input
                            type="number"
                            value={reviewData.fare}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, fare: Number(e.target.value) },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-black text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 uppercase">
                            Distance Limit
                          </label>
                          <input
                            type="text"
                            value={reviewData.distance}
                            onChange={(e) =>
                              setActiveReviewState((prev) => ({
                                ...prev,
                                [msg.id]: { ...reviewData, distance: e.target.value },
                              }))
                            }
                            className="w-full mt-0.5 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Confirm & Create */}
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReviewState((prev) => {
                            const next = { ...prev };
                            delete next[msg.id];
                            return next;
                          });
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `agent_${Date.now()}`,
                              sender: 'agent',
                              text: 'Creation cancelled.',
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            },
                          ]);
                        }}
                        className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmCreateTrip(msg.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Create Trip</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TRIP DETAIL CARDS */}
                {msg.trips && msg.trips.length > 0 && (
                  <div className="space-y-3 pt-1 w-full">
                    {msg.trips.map((trip) => {
                      const isEditing = inlineEditState[trip.id] !== undefined;
                      const editForm = inlineEditState[trip.id];

                      return (
                        <div
                          key={trip.id}
                          className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm hover:border-slate-300 transition w-full max-w-md text-left"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-black text-xs text-slate-900">
                                #{trip.trip_number}
                              </span>
                              <button
                                onClick={() => copyTripNumber(trip.trip_number, trip.id)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                                title="Copy Trip Number"
                              >
                                {copiedTripId === trip.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(
                                trip.status
                              )}`}
                            >
                              {trip.status}
                            </span>
                          </div>

                          {/* INLINE EDIT FORM */}
                          {isEditing && editForm ? (
                            <div className="py-2.5 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Customer Name
                                  </label>
                                  <input
                                    type="text"
                                    value={editForm.customer_name}
                                    onChange={(e) =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: { ...prev[trip.id], customer_name: e.target.value },
                                      }))
                                    }
                                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Phone
                                  </label>
                                  <input
                                    type="text"
                                    value={editForm.customer_phone}
                                    onChange={(e) =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: { ...prev[trip.id], customer_phone: e.target.value },
                                      }))
                                    }
                                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Fare (₹)
                                  </label>
                                  <input
                                    type="number"
                                    value={editForm.fare}
                                    onChange={(e) =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: { ...prev[trip.id], fare: Number(e.target.value) },
                                      }))
                                    }
                                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Vehicle Type
                                  </label>
                                  <select
                                    value={editForm.vehicle_type}
                                    onChange={(e) =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: {
                                          ...prev[trip.id],
                                          vehicle_type: e.target.value as VehicleType,
                                        },
                                      }))
                                    }
                                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                                  >
                                    <option value="Sedan">Sedan</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Hatchback">Hatchback</option>
                                    <option value="Prime Sedan">Prime Sedan</option>
                                    <option value="EV">EV</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">
                                  Pickup Location
                                </label>
                                <input
                                  type="text"
                                  value={editForm.pickup_location}
                                  onChange={(e) =>
                                    setInlineEditState((prev) => ({
                                      ...prev,
                                      [trip.id]: { ...prev[trip.id], pickup_location: e.target.value },
                                    }))
                                  }
                                  className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase">
                                  Drop Location
                                </label>
                                <input
                                  type="text"
                                  value={editForm.drop_location}
                                  onChange={(e) =>
                                    setInlineEditState((prev) => ({
                                      ...prev,
                                      [trip.id]: { ...prev[trip.id], drop_location: e.target.value },
                                    }))
                                  }
                                  className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Status
                                  </label>
                                  <select
                                    value={editForm.status}
                                    onChange={(e) =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: {
                                          ...prev[trip.id],
                                          status: e.target.value as TripStatus,
                                        },
                                      }))
                                    }
                                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                                  >
                                    <option value="AVAILABLE">AVAILABLE</option>
                                    <option value="ASSIGNED">ASSIGNED</option>
                                    <option value="ON_THE_WAY">ON_THE_WAY</option>
                                    <option value="ARRIVED">ARRIVED</option>
                                    <option value="STARTED">STARTED</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    Assign Driver
                                  </label>
                                  <select
                                    value={editForm.assigned_driver_id}
                                    onChange={(e) =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: {
                                          ...prev[trip.id],
                                          assigned_driver_id: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                                  >
                                    <option value="">(None - Unassigned)</option>
                                    {drivers.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.name} ({d.online_status})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlineEditState((prev) => {
                                      const next = { ...prev };
                                      delete next[trip.id];
                                      return next;
                                    })
                                  }
                                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-bold rounded-lg hover:bg-slate-100 transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineEdit(trip.id)}
                                  className="px-3 py-1 bg-[#0043DC] hover:bg-[#0036b3] text-white text-[11px] font-extrabold rounded-lg shadow-xs transition"
                                >
                                  Save Updates
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* NORMAL TRIP VIEW */
                            <div className="py-2 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">
                                    {trip.customer_name}
                                  </p>
                                  <a
                                    href={`tel:${trip.customer_phone}`}
                                    className="text-[11px] text-slate-500 hover:text-[#0043DC] font-medium flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {trip.customer_phone}
                                  </a>
                                </div>
                                <div className="text-right">
                                  <div className="font-black text-sm text-slate-900 flex items-center justify-end">
                                    <IndianRupee className="w-3.5 h-3.5 mr-0.5 text-[#0043DC]" />
                                    {trip.fare?.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium">
                                    {trip.distance || 'N/A'} • {trip.vehicle_type}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-[11px]">
                                <div className="flex items-start space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                                  <span className="text-slate-700 line-clamp-1">
                                    <span className="font-semibold text-slate-900">From: </span>
                                    {trip.pickup_location}
                                  </span>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                                  <span className="text-slate-700 line-clamp-1">
                                    <span className="font-semibold text-slate-900">To: </span>
                                    {trip.drop_location}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <Car className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    {trip.driver ? (
                                      <span className="font-bold text-slate-800">
                                        Driver: {trip.driver.name}
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 font-medium">Unassigned</span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{trip.pickup_time || 'Now'}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() =>
                                      setInlineEditState((prev) => ({
                                        ...prev,
                                        [trip.id]: {
                                          fare: trip.fare || 1000,
                                          customer_name: trip.customer_name || '',
                                          customer_phone: trip.customer_phone || '',
                                          pickup_location: trip.pickup_location || '',
                                          drop_location: trip.drop_location || '',
                                          vehicle_type: trip.vehicle_type || 'Sedan',
                                          status: trip.status || 'AVAILABLE',
                                          assigned_driver_id: trip.assigned_driver_id || '',
                                        },
                                      }))
                                    }
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition"
                                  >
                                    <Edit3 className="w-3 h-3 text-slate-600" />
                                    <span>Edit</span>
                                  </button>

                                  <select
                                    value={trip.status}
                                    onChange={(e) =>
                                      onUpdateTripStatus(trip.id, e.target.value as TripStatus)
                                    }
                                    className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition border-none cursor-pointer"
                                  >
                                    <option value="AVAILABLE">AVAILABLE</option>
                                    <option value="ASSIGNED">ASSIGNED</option>
                                    <option value="ON_THE_WAY">ON_THE_WAY</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                </div>

                                <button
                                  onClick={() => handleRequestDelete(trip)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* DELETE CONFIRMATION CARD */}
                {msg.actionType === 'delete_confirm' && msg.pendingDeleteTrip && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3 max-w-sm text-xs space-y-2 mt-1">
                    <div className="flex items-center space-x-2 text-rose-800 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Are you sure you want to permanently delete this trip?</span>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => {
                          setMessages((prev) => [
                            ...prev,
                            {
                              id: `agent_${Date.now()}`,
                              sender: 'agent',
                              text: 'Deletion cancelled.',
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            },
                          ]);
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:bg-white rounded-lg text-[11px] font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(msg.pendingDeleteTrip!)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black flex items-center space-x-1 shadow-xs transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Confirm Delete</span>
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] text-slate-400 font-medium px-1 ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* OCR Image Scanning Progress Animation */}
        {isScanningImage && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs pl-2">
            <div className="w-7 h-7 rounded-xl bg-[#0043DC] text-white flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm space-y-1">
              <div className="flex items-center space-x-2 font-bold text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-[#0043DC]" />
                <span>AI Optical Character Recognition (OCR)</span>
              </div>
              <p className="text-[11px] text-slate-500">{scanProgress || 'Analyzing screenshot...'}</p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isScanningImage && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs pl-2">
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center space-x-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0043DC] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0043DC] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0043DC] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] font-medium text-slate-500 ml-1">Agent thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-200/80 bg-white/70 backdrop-blur-xs flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-[11px] font-black transition flex items-center space-x-1 shadow-xs hover:opacity-90 active:scale-95"
        >
          <Camera className="w-3 h-3" />
          <span>Upload Image</span>
        </button>
        <button
          onClick={() => processUserInstruction('show all trips')}
          className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] font-bold transition flex items-center space-x-1"
        >
          <span>📋</span>
          <span>All Trips</span>
        </button>
        <button
          onClick={() => processUserInstruction('show available trips')}
          className="shrink-0 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-full text-[11px] font-bold transition flex items-center space-x-1"
        >
          <span>🟢</span>
          <span>Available Trips</span>
        </button>
        <button
          onClick={() => processUserInstruction('fleet summary')}
          className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-[11px] font-bold transition flex items-center space-x-1"
        >
          <span>📊</span>
          <span>Summary</span>
        </button>
      </div>

      {/* Input Box Footer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          processUserInstruction(inputText);
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
      >
        {/* Hidden File Input for Image Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processImageFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {/* Upload / Image Scan Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl text-slate-500 hover:text-[#0043DC] hover:bg-blue-50 border border-slate-200 transition"
          title="Upload or Scan Booking Screenshot (You can also drag-and-drop or paste Ctrl+V)"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Voice dictation button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-xl transition ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
          title={isListening ? 'Listening... click to stop' : 'Voice Input (Click to speak)'}
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isListening
              ? 'Listening to your instruction...'
              : "Type instruction, paste screenshot (Ctrl+V), or ask agent..."
          }
          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0043DC]/20 focus:border-[#0043DC] transition"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-[#0043DC] hover:bg-[#0036b3] disabled:opacity-40 disabled:hover:bg-[#0043DC] text-white font-bold transition shadow-md shadow-[#0043DC]/20 active:scale-95 shrink-0"
          title="Send Instruction"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
