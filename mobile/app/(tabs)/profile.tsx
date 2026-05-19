import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";
import { SessionContext } from "../_layout";

type Profile = {
  display_name: string | null;
  mobile: string | null;
  line_id: string | null;
  avatar_url: string | null;
};

export default function ProfileScreen() {
  const session = useContext(SessionContext);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email ?? "");

    const { data } = await supabase
      .from("profiles")
      .select("display_name, mobile, line_id, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setDisplayName(data.display_name ?? "");
      setMobile(data.mobile ?? "");
      setLineId(data.line_id ?? "");
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!displayName.trim() || !mobile.trim()) {
      Alert.alert("กรุณากรอก", "ชื่อที่แสดงและเบอร์โทร");
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        mobile: mobile.trim(),
        line_id: lineId.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } else {
      Alert.alert("บันทึกแล้ว", "อัปเดตข้อมูลโปรไฟล์เรียบร้อย");
    }
  }

  async function handleLogout() {
    Alert.alert("ออกจากระบบ", "ยืนยันการออกจากระบบ?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ออกจากระบบ",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <Text style={styles.guestEmoji}>👤</Text>
          <Text style={styles.guestTitle}>ยังไม่ได้เข้าสู่ระบบ</Text>
          <Text style={styles.guestSub}>เข้าสู่ระบบเพื่อลงประกาศและจัดการโปรไฟล์</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loginBtnText}>เข้าสู่ระบบ</Text>
          </Pressable>
          <Pressable style={styles.registerBtn} onPress={() => router.push("/auth/register")}>
            <Text style={styles.registerBtnText}>สมัครสมาชิก</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>โปรไฟล์</Text>

          {/* Avatar placeholder */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          </View>

          <Text style={styles.emailText}>{email}</Text>

          <Text style={styles.label}>ชื่อที่แสดง *</Text>
          <TextInput
            style={styles.input}
            placeholder="ชื่อร้านหรือชื่อผู้ติดต่อ"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.label}>เบอร์โทร *</Text>
          <TextInput
            style={styles.input}
            placeholder="0812345678"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>LINE ID</Text>
          <TextInput
            style={styles.input}
            placeholder="@yourlineid"
            value={lineId}
            onChangeText={setLineId}
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>บันทึก</Text>
            )}
          </Pressable>

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>ออกจากระบบ</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 24, paddingBottom: 40, gap: 4 },
  heading: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  avatarContainer: { alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  avatarEmoji: { fontSize: 36 },
  emailText: { textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 20 },
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
  saveBtn: {
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  logoutBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff",
  },
  logoutBtnText: { color: "#dc2626", fontSize: 15, fontWeight: "600" },
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  guestEmoji: { fontSize: 64, marginBottom: 8 },
  guestTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  guestSub: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 8 },
  loginBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, width: "100%", alignItems: "center" },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  registerBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 48, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  registerBtnText: { color: "#374151", fontSize: 16, fontWeight: "600" },
});
