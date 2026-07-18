import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const LOCATION_KEY = "user_location";
const DENIED_KEY = "user_location_denied";
const DEFAULT_RADIUS_KM = 15;

// กัน race — ถ้ามีการเรียกซ้ำใน session เดียว (เช่น OAuth ทั้ง WebBrowser กับ Linking ยิงพร้อมกัน)
// Set.has + Set.add เป็น sync จึง atomic ใน JS single-thread
const handledUserIds = new Set<string>();

/**
 * ยิงหลังสมัครสมาชิกเสร็จ — สร้าง alert_preferences รัศมี 15 กม. จากตำแหน่งปัจจุบัน
 * ถ้าผู้ใช้ยังไม่มี pref อยู่และดึงตำแหน่งได้ (cached หรือขอ permission แล้วได้)
 * เงียบเสมอ — ถ้าผิดพลาดหรือปฏิเสธ ก็ข้ามไป
 */
export async function setupNearbyAlertAfterSignup(userId: string): Promise<void> {
  if (handledUserIds.has(userId)) return;
  handledUserIds.add(userId);
  try {
    const { count } = await supabase
      .from("alert_preferences")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count ?? 0) > 0) return;

    let coords: { lat: number; lng: number } | null = null;

    const cached = await AsyncStorage.getItem(LOCATION_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
          coords = { lat: parsed.lat, lng: parsed.lng };
        }
      } catch {
        // ignore parse errors — fall through to permission flow
      }
    }

    if (!coords) {
      const denied = await AsyncStorage.getItem(DENIED_KEY);
      if (denied) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        await AsyncStorage.setItem(DENIED_KEY, "1");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.LocationAccuracy.Balanced,
      });
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(coords));
    }

    await supabase.from("alert_preferences").insert({
      user_id: userId,
      is_active: true,
      radius_km: DEFAULT_RADIUS_KM,
      center_lat: coords.lat,
      center_lng: coords.lng,
    });
  } catch {
    // silent — nothing user-facing depends on this
  }
}
