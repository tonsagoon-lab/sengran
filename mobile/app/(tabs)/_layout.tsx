import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ emoji, label }: { emoji: string; label: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { borderTopColor: "#e5e7eb" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ดูประกาศ",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏪" label="ดูประกาศ" />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "ลงประกาศ",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="➕" label="ลงประกาศ" />
          ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          title: "ของฉัน",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="ของฉัน" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "โปรไฟล์",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="โปรไฟล์" />
          ),
        }}
      />
    </Tabs>
  );
}
