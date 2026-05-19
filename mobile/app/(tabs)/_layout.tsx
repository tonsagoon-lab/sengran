import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
};

const TABS: TabConfig[] = [
  { name: "index",   label: "หน้าแรก",   icon: "home-outline",     iconActive: "home" },
  { name: "browse",  label: "ค้นหา",     icon: "search-outline",   iconActive: "search" },
  { name: "create",  label: "ลงประกาศ",  icon: "add",              iconActive: "add", primary: true },
  { name: "saved",   label: "บันทึก",    icon: "bookmark-outline", iconActive: "bookmark" },
  { name: "profile", label: "โปรไฟล์",   icon: "person-outline",   iconActive: "person" },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes.map((route, index) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;

        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (tab.primary) {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
              <View style={styles.primaryBtn}>
                <Ionicons name="add" size={26} color="#fff" />
              </View>
              <Text style={styles.tabLabelInactive}>{tab.label}</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <Ionicons
              name={focused ? tab.iconActive : tab.icon}
              size={24}
              color={focused ? "#f97316" : "#9ca3af"}
            />
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  tabLabel: { fontSize: 10, fontWeight: "500", color: "#9ca3af" },
  tabLabelActive: { color: "#f97316", fontWeight: "700" },
  tabLabelInactive: { fontSize: 10, fontWeight: "500", color: "#9ca3af" },
  primaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="browse" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="saved" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="my-listings" options={{ href: null }} />
    </Tabs>
  );
}
