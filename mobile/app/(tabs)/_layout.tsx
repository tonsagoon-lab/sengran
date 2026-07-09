import { useContext } from "react";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UnreadCountsContext } from "../_layout";

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
};

const TABS: TabConfig[] = [
  { name: "index",       label: "ร้านเซ้ง",  icon: "home-outline",          iconActive: "home" },
  { name: "map",         label: "แผนที่",    icon: "map-outline",           iconActive: "map" },
  { name: "create",      label: "ลงประกาศ", icon: "add",                   iconActive: "add", primary: true },
  { name: "browse",      label: "ขายอุปกรณ์", icon: "cart-outline",          iconActive: "cart" },
  { name: "my-listings", label: "ของฉัน",   icon: "document-text-outline", iconActive: "document-text" },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { counts } = useContext(UnreadCountsContext);
  const totalUnread = counts.messages + counts.notifications;

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
              <View style={styles.topIndicator} />
              <View style={styles.primaryBtn}>
                <Ionicons name="add" size={28} color="#fff" />
              </View>
              <Text style={styles.tabLabelInactive}>{tab.label}</Text>
            </Pressable>
          );
        }

        const showUnreadBadge = tab.name === "my-listings";

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <View style={styles.topIndicator}>
              {focused && <View style={styles.topIndicatorPill} />}
            </View>
            <View style={styles.iconWrap}>
              {focused && <View style={styles.activeGlow} />}
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={focused ? "#fb923c" : "#9ca3af"}
              />
              {showUnreadBadge && totalUnread > 0 && (
                <View style={styles.badgeDot}>
                  {totalUnread <= 9 && (
                    <Text style={styles.badgeDotText}>{totalUnread}</Text>
                  )}
                </View>
              )}
            </View>
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
    backgroundColor: "#0f172a",
    paddingTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 2,
    paddingBottom: 2,
    minHeight: 48,
  },
  topIndicator: {
    height: 2.5,
    width: "100%",
    alignItems: "center",
    marginBottom: 3,
  },
  topIndicatorPill: {
    height: 2.5,
    width: 22,
    borderRadius: 2,
    backgroundColor: "#f97316",
  },
  iconWrap: {
    position: "relative",
    width: 36,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  activeGlow: {
    position: "absolute",
    width: 32,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(249, 115, 22, 0.12)",
  },
  badgeDot: {
    position: "absolute",
    top: 0,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#0f172a",
  },
  badgeDotText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "#94a3b8",
    letterSpacing: 0.2,
  },
  tabLabelActive: { color: "#fb923c", fontWeight: "700" },
  tabLabelInactive: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "#94a3b8",
    letterSpacing: 0.2,
  },
  primaryBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -12,
    borderWidth: 3,
    borderColor: "#0f172a",
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 7,
  },
});

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="browse" />
      <Tabs.Screen name="my-listings" />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="alerts" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
    </Tabs>
  );
}
