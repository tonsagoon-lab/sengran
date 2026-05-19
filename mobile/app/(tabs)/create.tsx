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
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import type { Category, Province } from "../../lib/types";

type ListingType = "sale" | "rent" | "both";

const LISTING_TYPES: { value: ListingType; label: string; emoji: string }[] = [
  { value: "sale", label: "เซ้ง", emoji: "🏷️" },
  { value: "rent", label: "ให้เช่า", emoji: "🔑" },
  { value: "both", label: "เซ้งและให้เช่า", emoji: "🤝" },
];

export default function CreateListingScreen() {
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [district, setDistrict] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [images, setImages] = useState<{ uri: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const listingId = useRef(crypto.randomUUID());

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    const [{ data: cats }, { data: provs }] = await Promise.all([
      supabase.from("categories").select("id, name_th, slug").eq("is_active", true).order("display_order"),
      supabase.from("provinces").select("id, name_th, slug").order("name_th"),
    ]);
    setCategories(cats ?? []);
    setProvinces(provs ?? []);
  }

  async function pickImage() {
    if (images.length >= 10) {
      Alert.alert("ครบแล้ว", "อัปโหลดได้สูงสุด 10 รูป");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
    });

    if (result.canceled) return;

    setUploading(true);
    const newImages: { uri: string; path: string }[] = [];

    for (const asset of result.assets) {
      try {
        const ext = asset.uri.split(".").pop() ?? "jpg";
        const path = `${listingId.current}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { error } = await supabase.storage
          .from("listings")
          .upload(path, blob, { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });

        if (!error) {
          newImages.push({ uri: asset.uri, path });
        }
      } catch {
        // skip failed uploads
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
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
      Alert.alert("ข้อมูลไม่ครบ", "กรุณาเพิ่มชื่อและเบอร์โทรในโปรไฟล์ก่อนลงประกาศ");
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
      deposit: deposit ? parseInt(deposit) : null,
      district: district.trim() || null,
      category_id: categoryId,
      province_id: provinceId,
      slug,
      status,
      contact_name: profile.display_name,
      contact_phone: profile.mobile,
      published_at: status === "published" ? new Date().toISOString() : null,
    });

    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
      setSubmitting(false);
      return;
    }

    // Insert images
    if (images.length > 0) {
      await supabase.from("listing_images").insert(
        images.map((img, i) => ({
          listing_id: listingId.current,
          storage_path: img.path,
          display_order: i,
        }))
      );
    }

    Alert.alert(
      status === "published" ? "เผยแพร่แล้ว!" : "บันทึกแล้ว",
      status === "published" ? "ประกาศของคุณเผยแพร่เรียบร้อยแล้ว" : "บันทึกแบบร่างแล้ว",
      [{ text: "ตกลง", onPress: resetForm }]
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setSalePrice("");
    setRentPrice("");
    setDeposit("");
    setDistrict("");
    setCategoryId(null);
    setProvinceId(null);
    setImages([]);
    listingId.current = crypto.randomUUID();
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>ลงประกาศใหม่</Text>

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

          {/* Description */}
          <Text style={styles.label}>รายละเอียด</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="บรรยายร้านค้า สภาพแวดล้อม เหตุผลที่เซ้ง..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
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
          <Text style={styles.label}>เงินมัดจำ (บาท)</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น 16000"
            value={deposit}
            onChangeText={setDeposit}
            keyboardType="number-pad"
          />

          {/* Category */}
          <Text style={styles.label}>หมวดหมู่</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.chip, categoryId === cat.id && styles.chipActive]}
                  onPress={() => setCategoryId(categoryId === cat.id ? null : cat.id)}
                >
                  <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
                    {cat.name_th}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Province */}
          <Text style={styles.label}>จังหวัด</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {provinces.map((prov) => (
                <Pressable
                  key={prov.id}
                  style={[styles.chip, provinceId === prov.id && styles.chipActive]}
                  onPress={() => setProvinceId(provinceId === prov.id ? null : prov.id)}
                >
                  <Text style={[styles.chipText, provinceId === prov.id && styles.chipTextActive]}>
                    {prov.name_th}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* District */}
          <Text style={styles.label}>ย่าน/แขวง</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น สีลม, อารีย์"
            value={district}
            onChangeText={setDistrict}
          />

          {/* Images */}
          <Text style={styles.label}>รูปภาพ ({images.length}/10)</Text>
          <View style={styles.imageGrid}>
            {images.map((img) => (
              <View key={img.path} style={styles.imageThumb}>
                <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                <Pressable style={styles.removeBtn} onPress={() => removeImage(img.path)}>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  textarea: { minHeight: 100 },
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
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  imageThumb: { width: 90, height: 90, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
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
});
