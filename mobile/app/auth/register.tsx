import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const mobileRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function handleRegister() {
    if (!displayName.trim() || !mobile.trim() || !email.trim() || !password) {
      Alert.alert("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password.length < 8) {
      Alert.alert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim(), mobile: mobile.trim() },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("สมัครสมาชิกไม่สำเร็จ", error.message);
      return;
    }

    // If Supabase email confirmation is disabled, session is returned immediately
    if (data.session) {
      router.replace("/(tabs)");
    } else {
      // Email confirmation still required — go to login
      Alert.alert(
        "สมัครสมาชิกสำเร็จ",
        "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วเข้าสู่ระบบ",
        [{ text: "ตกลง", onPress: () => router.replace("/auth/login") }]
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <Text style={styles.logo}>🏪</Text>
            <Text style={styles.appName}>เซ้งร้าน</Text>
          </View>

          <Text style={styles.heading}>สมัครสมาชิก</Text>

          <Text style={styles.label}>ชื่อที่แสดง</Text>
          <TextInput
            style={styles.input}
            placeholder="ชื่อร้านหรือชื่อผู้ลงประกาศ"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
            onSubmitEditing={() => mobileRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>เบอร์โทรศัพท์</Text>
          <TextInput
            ref={mobileRef}
            style={styles.input}
            placeholder="0812345678"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>อีเมล</Text>
          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
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
            <Text style={styles.linkText}>
              มีบัญชีอยู่แล้ว?{" "}
              <Text style={styles.linkHighlight}>เข้าสู่ระบบ</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 },
  logo: { fontSize: 36 },
  appName: { fontSize: 26, fontWeight: "800", color: "#f97316" },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
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
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", paddingTop: 20 },
  linkText: { fontSize: 14, color: "#6b7280" },
  linkHighlight: { color: "#f97316", fontWeight: "600" },
});
