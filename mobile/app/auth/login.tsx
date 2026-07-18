import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "../../lib/supabase";

function handleClose() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

WebBrowser.maybeCompleteAuthSession();

async function applyTokensFromUrl(url: string): Promise<boolean> {
  const hash = url.split("#")[1] ?? "";
  const p = new URLSearchParams(hash);
  const at = p.get("access_token");
  const rt = p.get("refresh_token");
  if (at && rt) {
    await supabase.auth.setSession({ access_token: at, refresh_token: rt });
    return true;
  }
  const q = url.split("?")[1] ?? "";
  const qp = new URLSearchParams(q);
  const qat = qp.get("access_token");
  const qrt = qp.get("refresh_token");
  if (qat && qrt) {
    await supabase.auth.setSession({ access_token: qat, refresh_token: qrt });
    return true;
  }
  return false;
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // Handle deep link callback (Android)
  useEffect(() => {
    const sub = Linking.addEventListener("url", async ({ url }) => {
      if (url.includes("access_token")) {
        const ok = await applyTokensFromUrl(url);
        if (ok) router.replace("/(tabs)");
      } else if (url.includes("code=")) {
        try {
          const code = new URL(url).searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) router.replace("/(tabs)");
          }
        } catch {}
      }
    });
    return () => sub.remove();
  }, []);

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
      const redirectTo = makeRedirectUri({ scheme: "sengran" });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        Alert.alert("เกิดข้อผิดพลาด", error?.message ?? "ไม่สามารถเปิด Google login ได้");
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, "sengran://");

      if (result.type === "success" && result.url) {
        const url = result.url;
        if (url.includes("access_token")) {
          const ok = await applyTokensFromUrl(url);
          if (ok) router.replace("/(tabs)");
        } else if (url.includes("code=")) {
          const code = new URL(url).searchParams.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) router.replace("/(tabs)");
          }
        }
      }
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ลอง login ใหม่อีกครั้ง");
    }
    setGoogleLoading(false);
  }

  async function handleAppleLogin() {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error("No identity token");
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) Alert.alert("เข้าสู่ระบบไม่สำเร็จ", error.message);
      else router.replace("/(tabs)");
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("เกิดข้อผิดพลาด", "ลอง Apple login ใหม่อีกครั้ง");
      }
    }
    setAppleLoading(false);
  }

  async function handleLineLogin() {
    setLineLoading(true);
    try {
      const state = `mobile_${Date.now()}`;
      const redirectUri = "https://www.xn--72ch7bybxexd0cc.com/auth/line/callback";
      const params = new URLSearchParams({
        response_type: "code",
        client_id: "2010387343",
        redirect_uri: redirectUri,
        state,
        scope: "profile openid",
      });
      const lineUrl = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
      const result = await WebBrowser.openAuthSessionAsync(lineUrl, "sengran://");
      if (result.type === "success" && result.url) {
        const ok = await applyTokensFromUrl(result.url);
        if (ok) router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ลอง LINE login ใหม่อีกครั้ง");
    }
    setLineLoading(false);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={handleClose} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
      </View>
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

        {/* LINE login */}
        <Pressable
          style={[styles.lineBtn, lineLoading && styles.btnDisabled]}
          onPress={handleLineLogin}
          disabled={lineLoading}
        >
          {lineLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.lineIcon}>L</Text>
              <Text style={styles.lineBtnText}>เข้าสู่ระบบด้วย LINE</Text>
            </>
          )}
        </Pressable>

        {/* Apple login (iOS only) */}
        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleBtn}
            onPress={handleAppleLogin}
          />
        )}

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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="รหัสผ่าน"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
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
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { height: 44, justifyContent: "center", paddingHorizontal: 8 },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 16 },
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
  lineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#06C755",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: "#06C755",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  lineIcon: { fontSize: 16, fontWeight: "800", color: "#fff" },
  lineBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  appleBtn: { width: "100%", height: 50, marginTop: 10 },

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
