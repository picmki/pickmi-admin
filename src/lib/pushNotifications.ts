import { supabase } from './supabase';

export interface PushNotificationPayload {
  tripId: string;
  tripNumber: string;
  fare: number;
  pickupLocation: string;
  dropLocation: string;
  assignedDriverId?: string | null;
}

/**
 * Sends a Remote Push Notification to drivers' phones via Expo Push Notification Service.
 * This delivers directly to Apple APNs and Google FCM hardware push servers,
 * ensuring the phone rings and displays the notification EVEN IF THE APP IS COMPLETELY CLOSED OR PHONE IS LOCKED!
 */
export async function sendRemotePushNotificationToDrivers(
  payload: PushNotificationPayload
): Promise<{ success: boolean; deliveredCount: number; error?: string }> {
  try {
    const pickupShort = (payload.pickupLocation || 'Pickup').split(',')[0];
    const dropShort = (payload.dropLocation || 'Drop').split(',')[0];

    // 1. Query target driver(s) push tokens from Supabase (STRICT ONLINE CHECK)
    let tokens: string[] = [];

    if (payload.assignedDriverId) {
      // Specific assigned driver: MUST BE ONLINE
      const { data, error } = await supabase
        .from('drivers')
        .select('push_token, online_status')
        .eq('id', payload.assignedDriverId)
        .maybeSingle();

      if (!error && data) {
        if (data.online_status !== 'ONLINE') {
          console.log(`ℹ️ Driver ${payload.assignedDriverId} is OFFLINE. Skipping push notification.`);
          return { success: true, deliveredCount: 0 };
        }
        if (data.push_token) {
          tokens = [data.push_token];
        }
      }
    } else {
      // Broadcast to all active drivers who are CURRENTLY ONLINE
      const { data, error } = await supabase
        .from('drivers')
        .select('push_token, online_status')
        .eq('status', 'active')
        .eq('online_status', 'ONLINE')
        .not('push_token', 'is', null);

      if (!error && data) {
        tokens = data
          .map((d: any) => d.push_token)
          .filter((t: any): t is string => typeof t === 'string' && t.trim().length > 0);
      }
    }

    // Fallback: check driver_documents table for push_token if drivers table returned none
    if (tokens.length === 0) {
      if (payload.assignedDriverId) {
        const { data: dData } = await supabase
          .from('drivers')
          .select('online_status')
          .eq('id', payload.assignedDriverId)
          .maybeSingle();

        if (dData?.online_status === 'ONLINE') {
          const { data: docData } = await supabase
            .from("driver_documents")
            .select("document_number")
            .eq("driver_id", payload.assignedDriverId)
            .eq("document_type", "push_token")
            .maybeSingle();
          if (docData?.document_number) {
            tokens = [docData.document_number];
          }
        } else {
          console.log(`ℹ️ Driver ${payload.assignedDriverId} is OFFLINE. Skipping push notification.`);
          return { success: true, deliveredCount: 0 };
        }
      } else {
        const { data: onlineDrivers } = await supabase
          .from('drivers')
          .select('id')
          .eq('status', 'active')
          .eq('online_status', 'ONLINE');

        const onlineIds = (onlineDrivers || []).map((d: any) => d.id);
        if (onlineIds.length > 0) {
          const { data: docList } = await supabase
            .from("driver_documents")
            .select("document_number")
            .in("driver_id", onlineIds)
            .eq("document_type", "push_token");
          if (docList) {
            tokens = docList
              .map((d) => d.document_number)
              .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
          }
        }
      }
    }

    // Deduplicate and filter valid Expo tokens (remove mock Expo Go tokens)
    tokens = Array.from(
      new Set(
        tokens.filter(
          (t) => typeof t === 'string' && t.startsWith('ExponentPushToken[') && !t.includes('expo_go_')
        )
      )
    );

    if (tokens.length === 0) {
      console.log('ℹ️ No registered Expo push tokens found for target drivers yet.');
      return { success: true, deliveredCount: 0 };
    }

    console.log(`📣 Sending remote push notification to ${tokens.length} driver device(s)...`);

    // 2. Build Expo Push Service payloads
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: '🚨 New Trip Received! - PickMi Driver',
      body: `Trip ${payload.tripNumber} (₹${payload.fare})\nFrom: ${pickupShort}\nTo: ${dropShort}`,
      data: {
        tripId: payload.tripId,
        fare: payload.fare,
      },
      priority: 'high',
      channelId: 'pickmi_rides',
      badge: 1,
      _displayInForeground: true,
    }));

    // 3. Dispatch to Expo Push API endpoint (CORS-enabled)
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('✅ Expo Remote Push response:', result);

    return {
      success: true,
      deliveredCount: tokens.length,
    };
  } catch (err: any) {
    console.warn('Could not dispatch Expo remote push notification:', err?.message || err);
    return {
      success: false,
      deliveredCount: 0,
      error: err?.message,
    };
  }
}
