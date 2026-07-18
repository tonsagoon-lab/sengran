import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { SessionContext } from "../_layout";
import type { Category, Province } from "../../lib/types";

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type FormType = null | "shop";
type ListingType = "sale" | "rent" | "both";

const LISTING_TYPES: { value: ListingType; label: string; emoji: string }[] = [
  { value: "sale", label: "เซ้ง", emoji: "🏷️" },
  { value: "rent", label: "ให้เช่า", emoji: "🔑" },
  { value: "both", label: "เซ้งและให้เช่า", emoji: "🤝" },
];

function LoginPrompt() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const redirectTo = makeRedirectUri({ path: "auth/callback" });
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
      if (error || !data.url) { Alert.alert("เกิดข้อผิดพลาด", error?.message); setGoogleLoading(false); return; }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success" && result.url) {
        const hash = result.url.split("#")[1] ?? "";
        const p = new URLSearchParams(hash);
        const at = p.get("access_token"); const rt = p.get("refresh_token");
        if (at && rt) await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      }
    } catch { Alert.alert("เกิดข้อผิดพลาด"); }
    setGoogleLoading(false);
  }

  async function handleLine() {
    setLineLoading(true);
    try {
      const params = new URLSearchParams({ response_type: "code", client_id: "2010387343", redirect_uri: "https://www.xn--72ch7bybxexd0cc.com/auth/line/callback", state: `mobile_${Date.now()}`, scope: "profile openid" });
      const result = await WebBrowser.openAuthSessionAsync(`https://access.line.me/oauth2/v2.1/authorize?${params}`, "sengran://");
      if (result.type === "success" && result.url) {
        const hash = result.url.split("#")[1] ?? "";
        const p = new URLSearchParams(hash);
        const at = p.get("access_token"); const rt = p.get("refresh_token");
        if (at && rt) await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      }
    } catch { Alert.alert("เกิดข้อผิดพลาด"); }
    setLineLoading(false);
  }

  async function handleApple() {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!credential.identityToken) throw new Error("no token");
      const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: credential.identityToken });
      if (error) Alert.alert("เข้าสู่ระบบไม่สำเร็จ", error.message);
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED") Alert.alert("เกิดข้อผิดพลาด");
    }
    setAppleLoading(false);
  }

  return (
    <SafeAreaView style={lp.container}>
      <View style={lp.inner}>
        <Text style={lp.emoji}>🏪</Text>
        <Text style={lp.title}>เข้าสู่ระบบเพื่อลงประกาศ</Text>
        <Text style={lp.sub}>สร้างประกาศเซ้งร้านหรือขายอุปกรณ์ได้ฟรี</Text>

        <Pressable style={[lp.googleBtn, googleLoading && lp.disabled]} onPress={handleGoogle} disabled={googleLoading}>
          {googleLoading ? <ActivityIndicator color="#374151" /> : <><Text style={lp.googleIcon}>G</Text><Text style={lp.googleText}>เข้าสู่ระบบด้วย Google</Text></>}
        </Pressable>

        <Pressable style={[lp.lineBtn, lineLoading && lp.disabled]} onPress={handleLine} disabled={lineLoading}>
          {lineLoading ? <ActivityIndicator color="#fff" /> : <><Text style={lp.lineIcon}>L</Text><Text style={lp.lineText}>เข้าสู่ระบบด้วย LINE</Text></>}
        </Pressable>

        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={lp.appleBtn}
            onPress={handleApple}
          />
        )}

        <Pressable style={lp.emailBtn} onPress={() => router.push("/auth/login")}>
          <Text style={lp.emailText}>เข้าสู่ระบบด้วยอีเมล / สมัครสมาชิก</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const lp = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  inner: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 32 },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: "#e5e7eb", width: "100%", marginBottom: 10 },
  googleIcon: { fontSize: 18, fontWeight: "800", color: "#4285F4" },
  googleText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  lineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#06C755", borderRadius: 12, paddingVertical: 14, width: "100%", marginBottom: 10 },
  lineIcon: { fontSize: 16, fontWeight: "800", color: "#fff" },
  lineText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  appleBtn: { width: "100%", height: 50, marginBottom: 10 },
  emailBtn: { paddingVertical: 14, width: "100%" },
  emailText: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  disabled: { opacity: 0.6 },
});

export default function CreateListingScreen() {
  const session = useContext(SessionContext);
  const [formType, setFormType] = useState<FormType>(null);
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenuePeriod, setRevenuePeriod] = useState<"monthly_last" | "quarterly_avg" | "yearly">("monthly_last");
  const [district, setDistrict] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [images, setImages] = useState<{ uri: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempMobile, setTempMobile] = useState("");
  const pendingStatus = useRef<"published" | "draft" | null>(null);
  const listingId = useRef(generateId());
  const userId = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    supabase.auth.getUser().then(({ data: { user } }) => { userId.current = user?.id ?? null; });
    loadOptions();
    return () => { mountedRef.current = false; };
  }, []);

  async function loadOptions() {
    const [{ data: cats }, { data: provs }] = await Promise.all([
      supabase.from("categories").select("id, name_th, slug").eq("is_active", true).order("display_order"),
      supabase.from("provinces").select("id, name_th, slug").order("name_th"),
    ]);
    setCategories(cats ?? []);
    setProvinces(provs ?? []);
  }

  async function getCurrentLocation() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตให้แอปเข้าถึงตำแหน่งที่ตั้ง");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      setLocationLabel("ตำแหน่งปัจจุบัน");
      setPlaceSearch("");
      setPlaceResults([]);
      setPlaceDropdownOpen(false);
    } catch {
      Alert.alert("ไม่สามารถดึงตำแหน่งได้", "กรุณาลองใหม่");
    } finally {
      setLocationLoading(false);
    }
  }

  function handlePlaceSearch(text: string) {
    setPlaceSearch(text);
    setPlaceDropdownOpen(true);
    if (!text.trim()) {
      setPlaceResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchPlace(text), 600);
  }

  async function searchPlace(query: string) {
    if (!query.trim()) return;
    setLocationLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=th&accept-language=th`,
        { headers: { "User-Agent": "SengranApp/1.0" } }
      );
      const data = await res.json();
      setPlaceResults(data ?? []);
      setPlaceDropdownOpen(true);
    } catch {
      setPlaceResults([]);
    } finally {
      setLocationLoading(false);
    }
  }

  function selectPlace(place: { display_name: string; lat: string; lon: string }) {
    setLatitude(parseFloat(place.lat));
    setLongitude(parseFloat(place.lon));
    const label = place.display_name.split(",")[0];
    setLocationLabel(label);
    setPlaceSearch(label);
    setPlaceResults([]);
    setPlaceDropdownOpen(false);
  }

  function clearLocation() {
    setLatitude(null);
    setLongitude(null);
    setLocationLabel("");
    setPlaceSearch("");
    setPlaceResults([]);
    setPlaceDropdownOpen(false);
  }

  const selectedProvince = provinces.find((p) => p.id === provinceId);

  const filteredProvinces = provinceSearch.trim()
    ? provinces.filter((p) =>
        p.name_th.includes(provinceSearch.trim()) ||
        (p.name_en ?? "").toLowerCase().includes(provinceSearch.trim().toLowerCase())
      ).slice(0, 8)
    : provinces.slice(0, 8);

  function selectProvince(prov: Province) {
    setProvinceId(prov.id);
    setProvinceSearch(prov.name_th);
    setProvinceDropdownOpen(false);
  }

  function clearProvince() {
    setProvinceId(null);
    setProvinceSearch("");
    setProvinceDropdownOpen(false);
  }

  async function pickImage() {
    if (images.length >= 10) {
      Alert.alert("ครบแล้ว", "อัปโหลดได้สูงสุด 10 รูป");
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตให้แอปเข้าถึงรูปภาพ");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
    });

    if (result.canceled || result.assets.length === 0) return;

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { Alert.alert("กรุณาเข้าสู่ระบบใหม่"); return; }
    if (!userId.current) userId.current = currentUser.id;

    setUploading(true);
    const newImages: { uri: string; path: string }[] = [];
    let failCount = 0;

    for (const asset of result.assets) {
      try {
        const resized = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1600 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );
        const mimeType = "image/jpeg";
        const uid = userId.current ?? (await supabase.auth.getUser()).data.user?.id;
        const storagePath = `${uid}/${listingId.current}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

        const response = await fetch(resized.uri);
        const arrayBuffer = await response.arrayBuffer();

        const { error } = await supabase.storage
          .from("listings")
          .upload(storagePath, arrayBuffer, { contentType: mimeType });

        if (error) {
          console.error("upload error:", error.message);
          failCount++;
        } else {
          newImages.push({ uri: asset.uri, path: storagePath });
        }
      } catch (e) {
        console.error("upload exception:", e);
        failCount++;
      }
    }

    if (!mountedRef.current) {
      if (newImages.length > 0) {
        await supabase.storage
          .from("listings")
          .remove(newImages.map((i) => i.path))
          .catch(() => {});
      }
      return;
    }
    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);

    if (failCount > 0) {
      Alert.alert("อัปโหลดไม่สำเร็จ", `${failCount} รูปอัปโหลดไม่ได้ กรุณาลองใหม่`);
    }
  }

  function removeImage(path: string) {
    setImages((prev) => prev.filter((img) => img.path !== path));
    supabase.storage.from("listings").remove([path]).then(() => {});
  }

  async function handleSubmit(status: "published" | "draft") {
    if (!title.trim()) {
      Alert.alert("กรุณากรอก", "ชื่อประกาศ");
      return;
    }
    if (images.length === 0 && status === "published") {
      Alert.alert("กรุณาเพิ่มรูป", "ต้องมีรูปอย่างน้อย 1 รูป");
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("กรุณาเข้าสู่ระบบ");
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, mobile")
      .eq("id", user.id)
      .single();

    if (!profile?.display_name || !profile?.mobile) {
      pendingStatus.current = status;
      setTempName(profile?.display_name ?? "");
      setTempMobile(profile?.mobile ?? "");
      setProfileModalVisible(true);
      setSubmitting(false);
      return;
    }

    const slug = `${title.trim().slice(0, 40).replace(/\s+/g, "-").replace(/[^\w฀-๿-]/g, "")}-${listingId.current.slice(0, 8)}`;

    const { error } = await supabase.from("listings").insert({
      id: listingId.current,
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      listing_type: listingType,
      sale_price: salePrice ? parseInt(salePrice) : null,
      rent_price: rentPrice ? parseInt(rentPrice) : null,
      revenue_amount: revenueAmount ? parseInt(revenueAmount) : null,
      revenue_period: revenueAmount ? revenuePeriod : null,
      district: district.trim() || null,
      category_id: categoryId,
      province_id: provinceId,
      slug,
      status,
      contact_name: profile.display_name,
      contact_mobile: profile.mobile,
      latitude,
      longitude,
      published_at: status === "published" ? new Date().toISOString() : null,
    });

    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
      setSubmitting(false);
      return;
    }

    if (images.length > 0) {
      await supabase.from("listing_images").insert(
        images.map((img, i) => ({
          listing_id: listingId.current,
          storage_path: img.path,
          display_order: i,
        }))
      );
    }

    resetForm();
    if (status === "published") {
      Alert.alert("เผยแพร่แล้ว!", "ประกาศของคุณเผยแพร่เรียบร้อยแล้ว", [
        { text: "ดูประกาศของฉัน", onPress: () => router.push("/(tabs)/my-listings") },
        { text: "ตกลง", onPress: () => router.push("/(tabs)") },
      ]);
    } else {
      Alert.alert("บันทึกแล้ว", "บันทึกแบบร่างแล้ว", [
        { text: "ตกลง", onPress: () => router.push("/(tabs)/my-listings") },
      ]);
    }
  }

  async function confirmProfile() {
    if (!tempName.trim() || !tempMobile.trim()) {
      Alert.alert("กรุณากรอก", "ชื่อและเบอร์โทรให้ครบ");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ display_name: tempName.trim(), mobile: tempMobile.trim() }).eq("id", user.id);
    setProfileModalVisible(false);
    if (pendingStatus.current) handleSubmit(pendingStatus.current);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setSalePrice("");
    setRentPrice("");
    setDistrict("");
    setCategoryId(null);
    setProvinceId(null);
    setProvinceSearch("");
    setProvinceDropdownOpen(false);
    clearLocation();
    setImages([]);
    listingId.current = generateId();
  }

  if (!session) return <LoginPrompt />;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* ── Type chooser ── */}
          {formType === null ? (
            <View style={{ flex: 1, paddingTop: 16 }}>
              <Text style={styles.heading}>ลงประกาศใหม่</Text>
              <Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 28 }}>
                เลือกประเภทที่ต้องการลง
              </Text>
              <View style={{ gap: 14 }}>
                <Pressable
                  onPress={() => setFormType("shop")}
                  style={({ pressed }) => ({
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: pressed ? "#f97316" : "#e5e7eb",
                    backgroundColor: pressed ? "#fff7ed" : "#fff",
                    padding: 24,
                    alignItems: "center",
                    gap: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  })}
                >
                  <Text style={{ fontSize: 48 }}>🏪</Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>เซ้งร้าน</Text>
                  <Text style={{ fontSize: 13, color: "#6b7280", textAlign: "center" }}>
                    ลงประกาศเซ้ง / ให้เช่าพื้นที่ร้านค้า
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/equipment-create")}
                  style={({ pressed }) => ({
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: pressed ? "#f97316" : "#e5e7eb",
                    backgroundColor: pressed ? "#fff7ed" : "#fff",
                    padding: 24,
                    alignItems: "center",
                    gap: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  })}
                >
                  <Text style={{ fontSize: 48 }}>🔧</Text>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>ขายอุปกรณ์</Text>
                  <Text style={{ fontSize: 13, color: "#6b7280", textAlign: "center" }}>
                    ลงขายอุปกรณ์ร้านค้า มือหนึ่ง มือสอง
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
          <>
          <Text style={styles.heading}>เซ้งร้าน — ลงประกาศ</Text>

          {/* Type picker */}
          <Text style={styles.label}>ประเภทประกาศ *</Text>
          <View style={styles.typeRow}>
            {LISTING_TYPES.map((t) => (
              <Pressable
                key={t.value}
                style={[styles.typeBtn, listingType === t.value && styles.typeBtnActive]}
                onPress={() => setListingType(t.value)}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, listingType === t.value && styles.typeLabelActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>ชื่อประกาศ *</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น เซ้งร้านกาแฟย่านสีลม"
            value={title}
            onChangeText={setTitle}
          />

          {/* Description — bigger */}
          <Text style={styles.label}>รายละเอียด</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="บรรยายร้านค้า สภาพแวดล้อม เหตุผลที่เซ้ง..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          {/* Prices */}
          {(listingType === "sale" || listingType === "both") && (
            <>
              <Text style={styles.label}>ราคาเซ้ง (บาท)</Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น 150000"
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="number-pad"
              />
            </>
          )}
          {(listingType === "rent" || listingType === "both") && (
            <>
              <Text style={styles.label}>ค่าเช่า/เดือน (บาท)</Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น 8000"
                value={rentPrice}
                onChangeText={setRentPrice}
                keyboardType="number-pad"
              />
            </>
          )}

          {/* Revenue */}
          <Text style={styles.label}>รายได้ (ถ้ามี)</Text>
          <View style={styles.revenueRow}>
            {([
              { value: "monthly_last", label: "เดือนล่าสุด" },
              { value: "quarterly_avg", label: "เฉลี่ย 3 ด." },
              { value: "yearly", label: "ต่อปี" },
            ] as const).map((p) => (
              <Pressable
                key={p.value}
                style={[styles.chip, revenuePeriod === p.value && styles.chipActive]}
                onPress={() => setRevenuePeriod(p.value)}
              >
                <Text style={[styles.chipText, revenuePeriod === p.value && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="รายได้ (บาท) — ไม่บังคับ"
            value={revenueAmount}
            onChangeText={setRevenueAmount}
            keyboardType="number-pad"
          />

          {/* Category */}
          <Text style={styles.label}>หมวดหมู่</Text>
          <Pressable style={styles.selectBtn} onPress={() => setCategoryDropdownOpen(true)}>
            <Text style={[styles.selectBtnText, !categoryId && { color: "#9ca3af" }]}>
              {categoryId ? categories.find((c) => c.id === categoryId)?.name_th : "เลือกหมวดหมู่..."}
            </Text>
            <Text style={{ color: "#9ca3af" }}>▾</Text>
          </Pressable>

          {/* Province — search input + dropdown */}
          <Text style={styles.label}>จังหวัด</Text>
          <View style={styles.provinceContainer}>
            <View style={styles.provinceInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="พิมพ์ค้นหาจังหวัด..."
                value={provinceSearch}
                onChangeText={(text) => {
                  setProvinceSearch(text);
                  setProvinceDropdownOpen(true);
                  if (!text) setProvinceId(null);
                }}
                onFocus={() => setProvinceDropdownOpen(true)}
              />
              {provinceId !== null && (
                <Pressable style={styles.provinceClear} onPress={clearProvince}>
                  <Text style={styles.provinceClearText}>✕</Text>
                </Pressable>
              )}
            </View>
            {provinceDropdownOpen && filteredProvinces.length > 0 && (
              <View style={styles.dropdown}>
                {filteredProvinces.map((prov) => (
                  <Pressable
                    key={prov.id}
                    style={[
                      styles.dropdownItem,
                      provinceId === prov.id && styles.dropdownItemActive,
                    ]}
                    onPress={() => selectProvince(prov)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        provinceId === prov.id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {prov.name_th}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* District */}
          <Text style={styles.label}>ย่าน/แขวง หรือสถานที่ใกล้เคียง</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น สีลม, อารีย์, ใกล้ BTS อโศก"
            value={district}
            onChangeText={setDistrict}
          />

          {/* Location */}
          <Text style={styles.label}>พิกัดที่ตั้ง (ไม่บังคับ)</Text>

          {latitude && longitude ? (
            /* Selected state */
            <View style={styles.locationResult}>
              <Ionicons name="location" size={16} color="#f97316" />
              <Text style={styles.locationResultText} numberOfLines={1}>{locationLabel}</Text>
              <Pressable onPress={clearLocation}>
                <Text style={styles.locationClear}>เปลี่ยน</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* GPS button */}
              <Pressable
                style={[styles.locationBtn, locationLoading && styles.btnDisabled]}
                onPress={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator color="#f97316" size="small" />
                ) : (
                  <Text style={styles.locationBtnText}>📍  ใช้ตำแหน่งปัจจุบัน</Text>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.mapUrlRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>หรือพิมพ์ค้นหา</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Place search */}
              <View style={styles.provinceContainer}>
                <View style={styles.provinceInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="เช่น เซ็นทรัลบางนา, BTS อโศก, หมู่บ้าน..."
                    value={placeSearch}
                    onChangeText={handlePlaceSearch}
                    autoCorrect={false}
                  />
                  {locationLoading && (
                    <ActivityIndicator color="#f97316" size="small" style={{ marginLeft: 8 }} />
                  )}
                </View>
                {placeDropdownOpen && placeResults.length > 0 && (
                  <View style={styles.dropdown}>
                    {placeResults.map((place, i) => (
                      <Pressable
                        key={i}
                        style={styles.dropdownItem}
                        onPress={() => selectPlace(place)}
                      >
                        <Ionicons name="location-outline" size={14} color="#9ca3af" style={{ marginTop: 2 }} />
                        <Text style={[styles.dropdownItemText, { flex: 1 }]} numberOfLines={2}>
                          {place.display_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {placeDropdownOpen && placeSearch.trim().length > 1 && placeResults.length === 0 && !locationLoading && (
                  <View style={[styles.dropdown, { padding: 12 }]}>
                    <Text style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>ไม่พบสถานที่</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Images */}
          <Text style={styles.label}>รูปภาพ ({images.length}/10)</Text>
          <View style={styles.imageGrid}>
            {images.map((img) => (
              <View key={img.path} style={styles.imageThumb}>
                <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removeImage(img.path)}
                  hitSlop={12}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {images.length < 10 && (
              <Pressable style={styles.addImageBtn} onPress={pickImage} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color="#f97316" />
                ) : (
                  <>
                    <Text style={styles.addImageIcon}>📷</Text>
                    <Text style={styles.addImageText}>เพิ่มรูป</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Submit buttons */}
          <View style={styles.btnRow}>
            <Pressable
              style={[styles.draftBtn, submitting && styles.btnDisabled]}
              onPress={() => handleSubmit("draft")}
              disabled={submitting}
            >
              <Text style={styles.draftBtnText}>บันทึกแบบร่าง</Text>
            </Pressable>
            <Pressable
              style={[styles.publishBtn, submitting && styles.btnDisabled]}
              onPress={() => handleSubmit("published")}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishBtnText}>เผยแพร่</Text>
              )}
            </Pressable>
          </View>
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={categoryDropdownOpen} animationType="slide" transparent onRequestClose={() => setCategoryDropdownOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCategoryDropdownOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>เลือกหมวดหมู่</Text>
            <ScrollView>
              <Pressable
                style={[styles.modalItem, !categoryId && styles.modalItemActive]}
                onPress={() => { setCategoryId(null); setCategoryDropdownOpen(false); }}
              >
                <Text style={[styles.modalItemText, !categoryId && styles.modalItemTextActive]}>ไม่ระบุหมวดหมู่</Text>
              </Pressable>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.modalItem, categoryId === cat.id && styles.modalItemActive]}
                  onPress={() => { setCategoryId(cat.id); setCategoryDropdownOpen(false); }}
                >
                  <Text style={[styles.modalItemText, categoryId === cat.id && styles.modalItemTextActive]}>
                    {cat.name_th}
                  </Text>
                  {categoryId === cat.id && <Text style={{ color: "#f97316" }}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Profile info Modal */}
      <Modal visible={profileModalVisible} animationType="slide" transparent onRequestClose={() => setProfileModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={[styles.modalOverlay, { justifyContent: "flex-start" }]}>
          <View style={[styles.modalSheet, styles.modalSheetTop]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>กรอกข้อมูลติดต่อ</Text>
            <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              ต้องการชื่อและเบอร์โทรเพื่อลงประกาศ
            </Text>
            <Text style={styles.label}>ชื่อที่แสดง *</Text>
            <TextInput
              style={[styles.input, { marginBottom: 12 }]}
              placeholder="ชื่อร้านหรือชื่อผู้ติดต่อ"
              value={tempName}
              onChangeText={setTempName}
            />
            <Text style={styles.label}>เบอร์โทรศัพท์ *</Text>
            <TextInput
              style={[styles.input, { marginBottom: 20 }]}
              placeholder="0812345678"
              value={tempMobile}
              onChangeText={setTempMobile}
              keyboardType="phone-pad"
            />
            <View style={styles.btnRow}>
              <Pressable style={styles.draftBtn} onPress={() => setProfileModalVisible(false)}>
                <Text style={styles.draftBtnText}>ยกเลิก</Text>
              </Pressable>
              <Pressable style={styles.publishBtn} onPress={confirmProfile}>
                <Text style={styles.publishBtnText}>ตกลง</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 16, gap: 4, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#111827",
  },
  textarea: { minHeight: 160 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  typeBtnActive: { borderColor: "#f97316", backgroundColor: "#fff7ed" },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  typeLabelActive: { color: "#f97316" },
  chipScroll: { maxHeight: 50 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  revenueRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#fff7ed", borderColor: "#f97316" },
  chipText: { fontSize: 13, color: "#6b7280" },
  chipTextActive: { color: "#f97316", fontWeight: "600" },

  // Province search
  provinceContainer: { position: "relative", zIndex: 10 },
  provinceInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  provinceClear: {
    width: 32,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  provinceClearText: { fontSize: 16, color: "#9ca3af" },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemActive: { backgroundColor: "#fff7ed" },
  dropdownItemText: { fontSize: 15, color: "#374151" },
  dropdownItemTextActive: { color: "#f97316", fontWeight: "600" },

  // Images
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  imageThumb: { width: 90, height: 90, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  removeBtnText: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 16 },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addImageIcon: { fontSize: 24 },
  addImageText: { fontSize: 11, color: "#9ca3af" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  draftBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  draftBtnText: { color: "#6b7280", fontSize: 15, fontWeight: "600" },
  publishBtn: {
    flex: 2,
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  publishBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },

  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#f97316",
    paddingVertical: 12,
    gap: 8,
  },
  locationBtnText: { fontSize: 14, color: "#f97316", fontWeight: "600" },
  mapUrlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { fontSize: 12, color: "#9ca3af", flexShrink: 0 },
  locationResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationResultText: { fontSize: 13, color: "#92400e", flex: 1 },
  locationClear: { fontSize: 13, color: "#f97316", fontWeight: "600" },

  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectBtnText: { fontSize: 15, color: "#111827" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "75%",
  },
  modalSheetTop: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginTop: 0,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12 },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalItemActive: { backgroundColor: "#fff7ed" },
  modalItemText: { fontSize: 15, color: "#374151" },
  modalItemTextActive: { color: "#f97316", fontWeight: "600" },
});
