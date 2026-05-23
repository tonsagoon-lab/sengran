import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { Category, Province } from "../../lib/types";

type ListingType = "sale" | "rent" | "both";
type ImageItem = { uri: string; path: string; isExisting: boolean };

const LISTING_TYPES: { value: ListingType; label: string; emoji: string }[] = [
  { value: "sale", label: "เซ้ง", emoji: "🏷️" },
  { value: "rent", label: "ให้เช่า", emoji: "🔑" },
  { value: "both", label: "เซ้งและให้เช่า", emoji: "🤝" },
];

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [district, setDistrict] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
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
  const [images, setImages] = useState<ImageItem[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadListing();
  }, [id]);

  async function loadListing() {
    const [{ data: listing }, { data: cats }, { data: provs }] = await Promise.all([
      supabase
        .from("listings")
        .select(`id, title, description, listing_type, sale_price, rent_price, district,
          category_id, province_id, latitude, longitude,
          listing_images(id, storage_path, display_order),
          provinces(id, name_th, slug)`)
        .eq("id", id)
        .single(),
      supabase.from("categories").select("id, name_th, slug").eq("is_active", true).order("display_order"),
      supabase.from("provinces").select("id, name_th, slug").order("name_th"),
    ]);

    setCategories((cats ?? []) as Category[]);
    setProvinces((provs ?? []) as Province[]);

    if (listing) {
      setTitle(listing.title ?? "");
      setDescription(listing.description ?? "");
      setListingType((listing.listing_type as ListingType) ?? "sale");
      setSalePrice(listing.sale_price ? String(listing.sale_price) : "");
      setRentPrice(listing.rent_price ? String(listing.rent_price) : "");
      setDistrict(listing.district ?? "");
      setCategoryId(listing.category_id ?? null);
      setProvinceId(listing.province_id ?? null);
      setLatitude(listing.latitude ?? null);
      setLongitude(listing.longitude ?? null);

      if (listing.latitude && listing.longitude) {
        setLocationLabel("พิกัดที่บันทึกไว้");
      }

      const prov = (listing.provinces as any);
      if (prov?.name_th) {
        setProvinceSearch(prov.name_th);
      }

      const imgs = ((listing.listing_images ?? []) as { id: string; storage_path: string; display_order: number }[])
        .slice()
        .sort((a, b) => a.display_order - b.display_order)
        .map((img) => ({
          uri: resolveImageUrl(img.storage_path),
          path: img.storage_path,
          isExisting: true,
        }));
      setImages(imgs);
    }
    setLoading(false);
  }

  // ── Province ──────────────────────────────────────────────
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

  // ── Location ──────────────────────────────────────────────
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
    if (!text.trim()) { setPlaceResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setLocationLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=6&countrycodes=th&accept-language=th`,
          { headers: { "User-Agent": "SengranApp/1.0" } }
        );
        setPlaceResults((await res.json()) ?? []);
        setPlaceDropdownOpen(true);
      } catch { setPlaceResults([]); }
      finally { setLocationLoading(false); }
    }, 600);
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

  // ── Images ────────────────────────────────────────────────
  async function pickImage() {
    if (images.length >= 10) { Alert.alert("ครบแล้ว", "อัปโหลดได้สูงสุด 10 รูป"); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("ต้องการสิทธิ์", "กรุณาอนุญาตให้แอปเข้าถึงรูปภาพ"); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      base64: true,
    });

    if (result.canceled || result.assets.length === 0) return;
    setUploading(true);
    const newImages: ImageItem[] = [];
    let failCount = 0;

    for (const asset of result.assets) {
      try {
        if (!asset.base64) { failCount++; continue; }
        const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
        const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
        const storagePath = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const bytes = Uint8Array.from(atob(asset.base64), (c) => c.charCodeAt(0));
        const { error } = await supabase.storage.from("listings").upload(storagePath, bytes, { contentType: mimeType });
        if (error) { failCount++; }
        else { newImages.push({ uri: asset.uri, path: storagePath, isExisting: false }); }
      } catch { failCount++; }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
    if (failCount > 0) Alert.alert("อัปโหลดไม่สำเร็จ", `${failCount} รูปอัปโหลดไม่ได้`);
  }

  function removeImage(path: string, isExisting: boolean) {
    setImages((prev) => prev.filter((img) => img.path !== path));
    if (isExisting) {
      setRemovedPaths((prev) => [...prev, path]);
    } else {
      supabase.storage.from("listings").remove([path]).then(() => {});
    }
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(status: "published" | "draft") {
    if (!title.trim()) { Alert.alert("กรุณากรอก", "ชื่อประกาศ"); return; }
    setSubmitting(true);

    const { error } = await supabase.from("listings").update({
      title: title.trim(),
      description: description.trim() || null,
      listing_type: listingType,
      sale_price: salePrice ? parseInt(salePrice) : null,
      rent_price: rentPrice ? parseInt(rentPrice) : null,
      district: district.trim() || null,
      category_id: categoryId,
      province_id: provinceId,
      latitude,
      longitude,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    }).eq("id", id);

    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
      setSubmitting(false);
      return;
    }

    // Remove deleted existing images
    if (removedPaths.length > 0) {
      await supabase.from("listing_images").delete().in("storage_path", removedPaths);
      await supabase.storage.from("listings").remove(removedPaths);
    }

    // Insert new images
    const newImgs = images.filter((img) => !img.isExisting);
    const existingCount = images.filter((img) => img.isExisting).length;
    if (newImgs.length > 0) {
      await supabase.from("listing_images").insert(
        newImgs.map((img, i) => ({
          listing_id: id,
          storage_path: img.path,
          display_order: existingCount + i,
        }))
      );
    }

    Alert.alert("บันทึกแล้ว", "แก้ไขประกาศเรียบร้อย", [
      { text: "ตกลง", onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>แก้ไขประกาศ</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {/* Type */}
          <Text style={styles.label}>ประเภทประกาศ *</Text>
          <View style={styles.typeRow}>
            {LISTING_TYPES.map((t) => (
              <Pressable key={t.value} style={[styles.typeBtn, listingType === t.value && styles.typeBtnActive]} onPress={() => setListingType(t.value)}>
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, listingType === t.value && styles.typeLabelActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>ชื่อประกาศ *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="ชื่อประกาศ" />

          {/* Description */}
          <Text style={styles.label}>รายละเอียด</Text>
          <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="บรรยายร้านค้า..." multiline numberOfLines={8} textAlignVertical="top" />

          {/* Prices */}
          {(listingType === "sale" || listingType === "both") && (
            <>
              <Text style={styles.label}>ราคาเซ้ง (บาท)</Text>
              <TextInput style={styles.input} value={salePrice} onChangeText={setSalePrice} keyboardType="number-pad" placeholder="เช่น 150000" />
            </>
          )}
          {(listingType === "rent" || listingType === "both") && (
            <>
              <Text style={styles.label}>ค่าเช่า/เดือน (บาท)</Text>
              <TextInput style={styles.input} value={rentPrice} onChangeText={setRentPrice} keyboardType="number-pad" placeholder="เช่น 8000" />
            </>
          )}

          {/* Category */}
          <Text style={styles.label}>หมวดหมู่</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <Pressable key={cat.id} style={[styles.chip, categoryId === cat.id && styles.chipActive]} onPress={() => setCategoryId(categoryId === cat.id ? null : cat.id)}>
                  <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>{cat.name_th}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Province */}
          <Text style={styles.label}>จังหวัด</Text>
          <View style={styles.dropdownContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="พิมพ์ค้นหาจังหวัด..."
                value={provinceSearch}
                onChangeText={(text) => { setProvinceSearch(text); setProvinceDropdownOpen(true); if (!text) setProvinceId(null); }}
                onFocus={() => setProvinceDropdownOpen(true)}
              />
              {provinceId !== null && (
                <Pressable style={styles.clearBtn} onPress={() => { setProvinceId(null); setProvinceSearch(""); setProvinceDropdownOpen(false); }}>
                  <Text style={styles.clearBtnText}>✕</Text>
                </Pressable>
              )}
            </View>
            {provinceDropdownOpen && filteredProvinces.length > 0 && (
              <View style={styles.dropdown}>
                {filteredProvinces.map((prov) => (
                  <Pressable key={prov.id} style={[styles.dropdownItem, provinceId === prov.id && styles.dropdownItemActive]} onPress={() => selectProvince(prov)}>
                    <Text style={[styles.dropdownItemText, provinceId === prov.id && styles.dropdownItemTextActive]}>{prov.name_th}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* District */}
          <Text style={styles.label}>ย่าน/แขวง หรือสถานที่ใกล้เคียง</Text>
          <TextInput style={styles.input} value={district} onChangeText={setDistrict} placeholder="เช่น สีลม, อารีย์, ใกล้ BTS อโศก" />

          {/* Location */}
          <Text style={styles.label}>พิกัดที่ตั้ง (ไม่บังคับ)</Text>
          {latitude && longitude ? (
            <View style={styles.locationResult}>
              <Ionicons name="location" size={16} color="#f97316" />
              <Text style={styles.locationResultText} numberOfLines={1}>{locationLabel}</Text>
              <Pressable onPress={clearLocation}><Text style={styles.locationClear}>เปลี่ยน</Text></Pressable>
            </View>
          ) : (
            <>
              <Pressable style={[styles.locationBtn, locationLoading && styles.btnDisabled]} onPress={getCurrentLocation} disabled={locationLoading}>
                {locationLoading ? <ActivityIndicator color="#f97316" size="small" /> : <Text style={styles.locationBtnText}>📍  ใช้ตำแหน่งปัจจุบัน</Text>}
              </Pressable>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>หรือพิมพ์ค้นหา</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.dropdownContainer}>
                <View style={styles.inputRow}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="เช่น เซ็นทรัลบางนา, BTS อโศก, หมู่บ้าน..." value={placeSearch} onChangeText={handlePlaceSearch} autoCorrect={false} />
                  {locationLoading && <ActivityIndicator color="#f97316" size="small" style={{ marginLeft: 8 }} />}
                </View>
                {placeDropdownOpen && placeResults.length > 0 && (
                  <View style={styles.dropdown}>
                    {placeResults.map((place, i) => (
                      <Pressable key={i} style={styles.dropdownItem} onPress={() => selectPlace(place)}>
                        <Ionicons name="location-outline" size={14} color="#9ca3af" style={{ marginTop: 2 }} />
                        <Text style={[styles.dropdownItemText, { flex: 1 }]} numberOfLines={2}>{place.display_name}</Text>
                      </Pressable>
                    ))}
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
                <Pressable style={styles.removeBtn} onPress={() => removeImage(img.path, img.isExisting)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {images.length < 10 && (
              <Pressable style={styles.addImageBtn} onPress={pickImage} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#f97316" /> : (
                  <>
                    <Text style={styles.addImageIcon}>📷</Text>
                    <Text style={styles.addImageText}>เพิ่มรูป</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable style={[styles.draftBtn, submitting && styles.btnDisabled]} onPress={() => handleSubmit("draft")} disabled={submitting}>
              <Text style={styles.draftBtnText}>บันทึกแบบร่าง</Text>
            </Pressable>
            <Pressable style={[styles.publishBtn, submitting && styles.btnDisabled]} onPress={() => handleSubmit("published")} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>บันทึก</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  content: { padding: 16, gap: 4, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, borderWidth: 1, borderColor: "#e5e7eb", color: "#111827",
  },
  textarea: { minHeight: 160 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center", paddingVertical: 12, backgroundColor: "#fff" },
  typeBtnActive: { borderColor: "#f97316", backgroundColor: "#fff7ed" },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: "#6b7280", fontWeight: "600" },
  typeLabelActive: { color: "#f97316" },
  chipScroll: { maxHeight: 50 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  chipActive: { backgroundColor: "#fff7ed", borderColor: "#f97316" },
  chipText: { fontSize: 13, color: "#6b7280" },
  chipTextActive: { color: "#f97316", fontWeight: "600" },
  dropdownContainer: { position: "relative", zIndex: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
  clearBtnText: { fontSize: 16, color: "#9ca3af" },
  dropdown: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb",
    marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, overflow: "hidden",
  },
  dropdownItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  dropdownItemActive: { backgroundColor: "#fff7ed" },
  dropdownItemText: { fontSize: 15, color: "#374151" },
  dropdownItemTextActive: { color: "#f97316", fontWeight: "600" },
  locationBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderRadius: 10, borderWidth: 1.5, borderColor: "#f97316", paddingVertical: 12 },
  locationBtnText: { fontSize: 14, color: "#f97316", fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { fontSize: 12, color: "#9ca3af" },
  locationResult: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff7ed", borderRadius: 10, borderWidth: 1, borderColor: "#fed7aa", paddingHorizontal: 14, paddingVertical: 12 },
  locationResultText: { fontSize: 13, color: "#92400e", flex: 1 },
  locationClear: { fontSize: 13, color: "#f97316", fontWeight: "600" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  imageThumb: { width: 90, height: 90, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbImg: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  removeBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  addImageBtn: { width: 90, height: 90, borderRadius: 8, borderWidth: 1.5, borderColor: "#e5e7eb", borderStyle: "dashed", backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center", gap: 4 },
  addImageIcon: { fontSize: 24 },
  addImageText: { fontSize: 11, color: "#9ca3af" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  draftBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", paddingVertical: 14, alignItems: "center", backgroundColor: "#fff" },
  draftBtnText: { color: "#6b7280", fontSize: 15, fontWeight: "600" },
  publishBtn: { flex: 2, backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  publishBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
});
