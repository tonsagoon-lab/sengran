import { createContext, useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const SessionContext = createContext<Session | null>(null);

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={session}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="listing/[slug]" options={{ headerShown: false }} />
      </Stack>
    </SessionContext.Provider>
  );
}
