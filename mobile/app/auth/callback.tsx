import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const accessToken = params.access_token as string;
    const refreshToken = params.refresh_token as string;

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => router.replace("/(tabs)"));
    } else {
      router.replace("/(tabs)");
    }
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#f97316" />
    </View>
  );
}
