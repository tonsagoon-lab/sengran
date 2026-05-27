import { createContext, useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  getUnreadMessageCount,
  getUnreadNotificationCount,
} from "../lib/notifications";

export const SessionContext = createContext<Session | null>(null);

export type UnreadCounts = { messages: number; notifications: number };
export const UnreadCountsContext = createContext<{
  counts: UnreadCounts;
  refresh: () => void;
}>({ counts: { messages: 0, notifications: 0 }, refresh: () => {} });

// Push notification setup is handled in a separate native module
// that is only included in development/production builds (not Expo Go)
async function setupPush(_userId: string) {
  // No-op in Expo Go — will be implemented in dev/production build
}

function setupNotificationListeners() {
  return () => {};
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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="listing/[slug]" />
        </Stack>
      </UnreadCountsContext.Provider>
    </SessionContext.Provider>
  );
}
