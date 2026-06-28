import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import type { Category, Province } from "../lib/types";

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type Condition = "new" | "used";

export default function EquipmentCreateScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<Condition>("used");
  const [shopTypeIds, setShopTypeIds] = useState<number[]>([]);
  const [price, setPrice] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [provinceDropdownOpen, setProvinceDropdownOpen] = useState(false);
  const [district, setDistrict] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [images, setImages] = useState<{ uri: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const listingId = useRef(generateId());

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    const [{ data: cats }, { data: provs }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("categories")
        .select("id, name_th, slug")
        .eq("category_type", "shop")
        .eq("is_active", true)
        .neq("slug", "space-only")
        .order("display_order"),
      supabase.from("provinces").select("id, name_th, slug").order("name_th"),
    ]);
    setCategories(cats ?? []);
    setProvinces(provs ?? []);
  }

  function toggleShopType(id: number) {
    setShopTypeIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        Alert.alert("เลือกได้สูงสุด 4 ประเภท");
        return prev;
      }
      return [...prev, id];
    });
  }

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
      base64: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    const newImages: { uri: string; path: string }[] = [];
    let failCount = 0;

    for (const asset of result.assets) {
      try {
        if (!asset.base64) { failCount++; continue; }
        const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
        const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        const storagePath = `${listingId.current}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const bytes = Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0));
        const { error } = await supabase.storage.from("listings").upload(storagePath, bytes, { contentType: mimeType });
        if (error) { failCount++; } else { newImages.push({ uri: asset.uri, path: storagePath }); }
      } catch { failCount++; }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
    if (failCount > 0) Alert.alert("อัปโหลดไม่สำเร็จ", `${failCount} รูปอัปโหลดไม่ได้`);
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
    } catch {
      Alert.alert("ไม่สามารถดึงตำแหน่งได้", "กรุณาลองใหม่");
    } finally {
      setLocationLoading(false);
    }
  }

  function removeImage(path: string) {
    setImages((prev) => prev.filter((img) => img.path !== path));
    supabase.storage.from("listings").remove([path]).then(() => {});
  }

  async function handleSubmit(status: "published" | "draft") {
    if (!title.trim()) { Alert.alert("กรุณากรอก", "ชื่อสินค้า"); return; }
    if (shopTypeIds.length === 0) { Alert.alert("กรุณาเลือก", "ประเภทร้านที่เหมาะกับสินค้านี้"); return; }
    if (!price || isNaN(Number(price))) { Alert.alert("กรุณากรอก", "ราคาที่ถูกต้อง"); return; }
    if (!provinceId) { Alert.alert("กรุณาเลือก", "จังหวัด"); return; }
    if (images.length === 0 && status === "published") { Alert.alert("กรุณาเพิ่มรูป", "ต้องมีรูปอย่างน้อย 1 รูป"); return; }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert("กรุณาเข้าสู่ระบบ"); setSubmitting(false); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, mobile, line_id")
      .eq("id", user.id)
      .single();

    if (!profile?.display_name || !profile?.mobile) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณาเพิ่มชื่อและเบอร์โทรในโปรไฟล์ก่อนลงประกาศ");
      setSubmitting(false);
      return;
    }

    const slug = `${title.trim().slice(0, 40).replace(/\s+/g, "-").replace(/[^\w฀-๿-]/g, "")}-${listingId.current.slice(0, 8)}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("listings").insert({
      id: listingId.current,
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      listing_type: "equipment",
      sale_price: Number(price),
      rent_price: null,
      condition,
      category_id: null,
      shop_type_ids: shopTypeIds,
      province_id: provinceId,
      district: district.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      slug,
      status,
      contact_name: profile.display_name,
      contact_mobile: profile.mobile,
      contact_line: profile.line_id ?? null,
      published_at: status === "published" ? new Date().toISOString() : null,
      expires_at: status === "published"
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        : null,
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

    if (status === "published") {
      Alert.alert("เผยแพร่แล้ว!", "ประกาศขายอุปกรณ์เผยแพร่เรียบร้อยแล้ว", [
        { text: "ดูประกาศของฉัน", onPress: () => router.replace("/(tabs)/my-listings") },
        { text: "ตกลง", onPress: () => router.replace("/(tabs)") },
      ]);
    } else {
      Alert.alert("บันทึกแล้ว", "บันทึกแบบร่างแล้ว", [
        { text: "ตกลง", onPress: () => router.replace("/(tabs)/my-listings") },
      ]);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={s.headerTitle}>ลงขายอุปกรณ์</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

          {/* Title */}
          <Text style={s.label}>ชื่อสินค้า *</Text>
          <TextInput
            style={s.input}
            placeholder="เช่น เครื่องชงกาแฟ ตู้แช่ โต๊ะเก้าอี้"
            value={title}
            onChangeText={setTitle}
          />

          {/* Condition */}
          <Text style={s.label}>สภาพสินค้า *</Text>
          <View style={s.row}>
            {([{ value: "new" as Condition, label: "มือ 1 (ใหม่)" }, { value: "used" as Condition, label: "มือ 2 (ใช้แล้ว)" }]).map((c) => (
              <Pressable
                key={c.value}
                style={[s.condBtn, condition === c.value && s.condBtnActive]}
                onPress={() => setCondition(c.value)}
              >
                <Text style={[s.condBtnText, condition === c.value && s.condBtnTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Shop types */}
          <Text style={s.label}>เหมาะกับร้านประเภท * (เลือกได้ 1-4)</Text>
          <View style={s.shopTypeGrid}>
            {categories.map((cat) => {
              const selected = shopTypeIds.includes(cat.id);
              const disabled = !selected && shopTypeIds.length >= 4;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => !disabled && toggleShopType(cat.id)}
                  style={[s.shopTypeChip, selected && s.shopTypeChipActive, disabled && s.shopTypeChipDisabled]}
                >
                  <Text style={[s.shopTypeText, selected && s.shopTypeTextActive]}>{cat.name_th}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price */}
          <Text style={s.label}>ราคา (บาท) *</Text>
          <TextInput
            style={s.input}
            placeholder="เช่น 5000"
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
          />

          {/* Description */}
          <Text style={s.label}>รายละเอียดสินค้า</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="บรรยายสภาพ ยี่ห้อ ขนาด ประวัติการใช้งาน..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {/* Province */}
          <Text style={s.label}>จังหวัด *</Text>
          <View style={{ zIndex: 10 }}>
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="ค้นหาจังหวัด..."
                value={provinceSearch}
                onChangeText={(t) => { setProvinceSearch(t); setProvinceDropdownOpen(true); }}
                onFocus={() => setProvinceDropdownOpen(true)}
              />
              {provinceId && (
                <Pressable
                  onPress={() => { setProvinceId(null); setProvinceSearch(""); }}
                  style={s.clearBtn}
                >
                  <Text style={s.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>
            {provinceDropdownOpen && filteredProvinces.length > 0 && (
              <View style={s.dropdown}>
                {filteredProvinces.map((p) => (
                  <Pressable
                    key={p.id}
                    style={[s.dropdownItem, p.id === provinceId && s.dropdownItemActive]}
                    onPress={() => selectProvince(p)}
                  >
                    <Text style={[s.dropdownText, p.id === provinceId && s.dropdownTextActive]}>{p.name_th}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* District */}
          <Text style={[s.label, { marginTop: 12 }]}>อำเภอ / ย่าน (ถ้ามี)</Text>
          <TextInput
            style={s.input}
            placeholder="เช่น อารีย์, นิมมาน"
            value={district}
            onChangeText={setDistrict}
          />

          {/* Location */}
          <Text style={[s.label, { marginTop: 12 }]}>พิกัดที่ตั้ง (ไม่บังคับ)</Text>
          {latitude && longitude ? (
            <View style={s.locationResult}>
              <Ionicons name="location" size={16} color="#f97316" />
              <Text style={s.locationResultText}>
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </Text>
              <Pressable onPress={() => { setLatitude(null); setLongitude(null); }}>
                <Text style={s.locationClear}>ล้าง</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[s.locationBtn, locationLoading && s.btnDisabled]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#f97316" size="small" />
              ) : (
                <>
                  <Ionicons name="locate-outline" size={16} color="#f97316" />
                  <Text style={s.locationBtnText}>ใช้ตำแหน่งปัจจุบัน</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Images */}
          <Text style={s.label}>รูปภาพ ({images.length}/10)</Text>
          <View style={s.imageGrid}>
            {images.map((img) => (
              <View key={img.path} style={s.imageThumb}>
                <Image source={{ uri: img.uri }} style={s.thumbImg} />
                <Pressable style={s.removeBtn} onPress={() => removeImage(img.path)}>
                  <Text style={s.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {images.length < 10 && (
              <Pressable style={s.addImageBtn} onPress={pickImage} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#f97316" /> : (
                  <>
                    <Text style={{ fontSize: 24 }}>📷</Text>
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>เพิ่มรูป</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Submit */}
          <View style={s.btnRow}>
            <Pressable
              style={[s.draftBtn, submitting && s.btnDisabled]}
              onPress={() => handleSubmit("draft")}
              disabled={submitting}
            >
              <Text style={s.draftBtnText}>บันทึกแบบร่าง</Text>
            </Pressable>
            <Pressable
              style={[s.publishBtn, submitting && s.btnDisabled]}
              onPress={() => handleSubmit("published")}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.publishBtnText}>เผยแพร่</Text>}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  content: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 4,
  },
  textarea: { height: 200, paddingTop: 12 },
  locationResult: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 14, paddingVertical: 12 },
  locationResultText: { flex: 1, fontSize: 13, color: "#c2410c", fontWeight: "500" },
  locationClear: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },
  locationBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", paddingVertical: 14 },
  locationBtnText: { fontSize: 14, color: "#f97316", fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  condBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  condBtnActive: { borderColor: "#f97316", backgroundColor: "#fff7ed" },
  condBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  condBtnTextActive: { color: "#f97316" },
  shopTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  shopTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  shopTypeChipActive: { backgroundColor: "#fff7ed", borderColor: "#f97316" },
  shopTypeChipDisabled: { opacity: 0.4 },
  shopTypeText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  shopTypeTextActive: { color: "#f97316", fontWeight: "700" },
  clearBtn: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
  clearBtnText: { fontSize: 16, color: "#9ca3af" },
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownItemActive: { backgroundColor: "#fff7ed" },
  dropdownText: { fontSize: 15, color: "#374151" },
  dropdownTextActive: { color: "#f97316", fontWeight: "600" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  imageThumb: { width: 90, height: 90, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute", top: 4, right: 4,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10,
    width: 20, height: 20, alignItems: "center", justifyContent: "center",
  },
  removeBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addImageBtn: {
    width: 90, height: 90, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#e5e7eb", borderStyle: "dashed",
    backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center", gap: 4,
  },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  draftBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    borderColor: "#e5e7eb", paddingVertical: 14,
    alignItems: "center", backgroundColor: "#fff",
  },
  draftBtnText: { color: "#6b7280", fontSize: 15, fontWeight: "600" },
  publishBtn: { flex: 2, backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  publishBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
});
