import { useState } from "react";
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
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!displayName.trim() || !mobile.trim() || !email.trim() || !password) {
      Alert.alert("กรุณากรอก", "ข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password.length < 8) {
      Alert.alert("รหัสผ่าน", "ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          mobile: mobile.trim(),
        },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert("สมัครสมาชิกไม่สำเร็จ", error.message);
    } else {
      Alert.alert(
        "สมัครสมาชิกสำเร็จ",
        "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
        [{ text: "ตกลง", onPress: () => router.replace("/auth/login") }]
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>สมัครสมาชิก</Text>

          <Text style={styles.label}>ชื่อที่แสดง</Text>
          <TextInput
            style={styles.input}
            placeholder="ชื่อร้านหรือชื่อผู้ลงประกาศ"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.label}>เบอร์โทรศัพท์</Text>
          <TextInput
            style={styles.input}
            placeholder="0812345678"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            style={styles.input}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>สมัครสมาชิก</Text>
            )}
          </Pressable>

          <Pressable style={styles.link} onPress={() => router.back()}>
            <Text style={styles.linkText}>มีบัญชีอยู่แล้ว? <Text style={styles.linkHighlight}>เข้าสู่ระบบ</Text></Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, gap: 4 },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 2, marginTop: 8 },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#111827",
  },
  btn: {
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", paddingTop: 16 },
  linkText: { fontSize: 14, color: "#6b7280" },
  linkHighlight: { color: "#f97316", fontWeight: "600" },
});
