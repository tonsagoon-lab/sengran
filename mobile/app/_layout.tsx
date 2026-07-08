import { createContext, useEffect, useRef, useState } from "react";
import { Platform, StatusBar } from "react-native";
import { Stack, router } from "expo-router";
import { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import {
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "../lib/notifications";

// Skip expo-notifications in Expo Go on Android (removed in SDK 53)
const isExpoGo = Constants.executionEnvironment === "storeClient";

function getNotifications() {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    return null;
  }
}

export const SessionContext = createContext<Session | null>(null);

export type UnreadCounts = { messages: number; notifications: number };
export const UnreadCountsContext = createContext<{
  counts: UnreadCounts;
  refresh: () => void;
}>({ counts: { messages: 0, notifications: 0 }, refresh: () => {} });

getNotifications()?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function setupPush(userId: string) {
  try {
    const N = getNotifications();
    if (!N) return;

    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("default", {
        name: "default",
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existing } = await N.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const token = (await N.getExpoPushTokenAsync()).data;
    await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
  } catch {
    // push notifications ไม่ได้รับการสนับสนุนบน simulator หรือ Expo Go
  }
}

function setupNotificationListeners() {
  try {
    const N = getNotifications();
    if (!N) return () => {};
    const sub = N.addNotificationResponseReceivedListener((response) => {
      const slug = response.notification.request.content.data?.slug as string | undefined;
      if (slug) router.push(`/listing/${slug}`);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadCounts(session.user.id);
        setupPush(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        loadCounts(session.user.id);
        setupPush(session.user.id);
      } else {
        setCounts({ messages: 0, notifications: 0 });
        stopTimer();
      }
    });

    return () => { subscription.unsubscribe(); stopTimer(); };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    timerRef.current = setInterval(() => loadCounts(session.user.id), 60_000);
    return stopTimer;
  }, [session?.user?.id]);

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function loadCounts(userId: string) {
    const [messages, notifications] = await Promise.all([
      getUnreadMessageCount(userId),
      getUnreadNotificationCount(userId),
    ]);
    setCounts({ messages, notifications });
  }

  function refresh() {
    if (session?.user?.id) loadCounts(session.user.id);
  }

  return (
    <SessionContext.Provider value={session}>
      <UnreadCountsContext.Provider value={{ counts, refresh }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="listing/[slug]" />
          <Stack.Screen name="legal/privacy" />
          <Stack.Screen name="legal/terms" />
        </Stack>
      </UnreadCountsContext.Provider>
    </SessionContext.Provider>
  );
}
