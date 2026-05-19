import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("กรุณากรอก", "อีเมลและรหัสผ่าน");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert("เข้าสู่ระบบไม่สำเร็จ", error.message);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: "sengran", path: "auth/callback" });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        Alert.alert("เกิดข้อผิดพลาด", error?.message ?? "ไม่สามารถเปิด Google login ได้");
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get("access_token");
        const refreshToken = url.searchParams.get("refresh_token");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } else {
          // Try fragment params
          const hash = result.url.split("#")[1] ?? "";
          const params = new URLSearchParams(hash);
          const at = params.get("access_token");
          const rt = params.get("refresh_token");
          if (at && rt) {
            await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          }
        }
      }
    } catch (e) {
      Alert.alert("เกิดข้อผิดพลาด", "ลอง login ใหม่อีกครั้ง");
    }
    setGoogleLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.inner}
      >
        <View style={styles.logoRow}>
          <Text style={styles.logo}>🏪</Text>
          <Text style={styles.appName}>เซ้งร้าน</Text>
        </View>

        <Text style={styles.heading}>เข้าสู่ระบบ</Text>

        {/* Google login */}
        <Pressable
          style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>เข้าสู่ระบบด้วย Google</Text>
            </>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>หรือ</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email/password */}
        <View style={styles.form}>
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
            placeholder="รหัสผ่าน"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
            )}
          </Pressable>

          <Pressable style={styles.link} onPress={() => router.push("/auth/register")}>
            <Text style={styles.linkText}>
              ยังไม่มีบัญชี? <Text style={styles.linkHighlight}>สมัครสมาชิก</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 8 },
  logo: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: "800", color: "#f97316" },
  heading: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 24 },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4285F4",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: "#374151" },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { fontSize: 13, color: "#9ca3af" },

  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 2 },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    color: "#111827",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { alignItems: "center", paddingTop: 16 },
  linkText: { fontSize: 14, color: "#6b7280" },
  linkHighlight: { color: "#f97316", fontWeight: "600" },
});
