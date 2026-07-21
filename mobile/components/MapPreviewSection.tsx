import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

const GPS_TIMEOUT_MS = 12_000;

async function getPositionWithTimeout() {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
  if (last) return last;
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("gps-timeout")), GPS_TIMEOUT_MS)
    ),
  ]);
}

type Pin = {
  id: string;
  latitude: number;
  longitude: number;
  listing_type: "sale" | "rent" | "both";
  sale_price: number | null;
  rent_price: number | null;
};

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #eef2f7; }
  .cluster-bubble {
    background: #f97316; color: #fff; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.28);
    border: 3px solid #fff; width: 100%; height: 100%;
  }
  .pin-dot {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
  .user-dot {
    width: 16px; height: 16px; border-radius: 50%; background: #2563eb;
    border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(37,99,235,0.4);
  }
  .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .leaflet-control-attribution { font-size: 8px !important; padding: 0 4px !important; }
  .leaflet-control-zoom { display: none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
  var post = function(msg) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  };
  var TYPE_COLOR = { sale: '#1d4ed8', rent: '#15803d', both: '#7c3aed' };
  var THAILAND_BOUNDS = [[5.5, 97.3], [20.5, 105.7]];
  // Bangkok + ปริมณฑล (BMR) default view
  // Covers Nonthaburi, Pathum Thani, Samut Prakan, Samut Sakhon, Nakhon Pathom
  var DEFAULT_BOUNDS = [[13.4, 99.9], [14.1, 101.0]];

  var map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    maxBounds: THAILAND_BOUNDS,
    maxBoundsViscosity: 0.8,
  }).fitBounds(DEFAULT_BOUNDS, { padding: [8, 8] });

  var userMarker = null;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OSM', maxZoom: 18, minZoom: 5,
  }).addTo(map);

  var cluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: false,
    iconCreateFunction: function(c) {
      var count = c.getChildCount();
      var size = count < 10 ? 32 : count < 50 ? 38 : 44;
      return L.divIcon({
        html: '<div class="cluster-bubble">' + count + '</div>',
        className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
      });
    },
  });
  map.addLayer(cluster);

  cluster.on('clusterclick', function() { post({ type: 'openFull' }); });

  window.setPins = function(data) {
    cluster.clearLayers();
    data.forEach(function(p) {
      var color = TYPE_COLOR[p.listing_type] || '#f97316';
      var icon = L.divIcon({
        className: '',
        html: '<div class="pin-dot" style="background:' + color + '"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      });
      var m = L.marker([p.latitude, p.longitude], { icon: icon });
      m.on('click', function() { post({ type: 'openFull' }); });
      cluster.addLayer(m);
    });
    post({ type: 'ready' });
  };

  window.centerOn = function(lat, lng, zoom) {
    if (userMarker) { map.removeLayer(userMarker); }
    userMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
    }).addTo(map);
    map.flyTo([lat, lng], zoom || 13, { duration: 0.8 });
  };

  post({ type: 'loaded' });
</script>
</body>
</html>`;

export function MapPreviewSection() {
  const webRef = useRef<WebView>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [webReady, setWebReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    fetchPins();
  }, []);

  async function goToMyLocation() {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(
          "ต้องการสิทธิ์ตำแหน่ง",
          "กรุณาอนุญาตให้แอปเข้าถึงตำแหน่งของคุณในการตั้งค่า"
        );
        return;
      }
      const pos = await getPositionWithTimeout();
      const { latitude, longitude } = pos.coords;
      webRef.current?.injectJavaScript(
        `window.centerOn(${latitude}, ${longitude}, 13); true;`
      );
    } catch {
      Alert.alert("ไม่พบตำแหน่ง", "ลองใหม่อีกครั้งหรือเปิด GPS");
    } finally {
      setGpsLoading(false);
    }
  }

  useEffect(() => {
    if (webReady && pins.length > 0) {
      webRef.current?.injectJavaScript(
        `window.setPins(${JSON.stringify(pins)}); true;`
      );
    }
  }, [webReady, pins]);

  async function fetchPins() {
    const { data } = await supabase
      .from("listings")
      .select("id, latitude, longitude, listing_type, sale_price, rent_price")
      .eq("status", "published")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("published_at", { ascending: false })
      .limit(100);
    setPins((data ?? []) as Pin[]);
    setLoaded(true);
  }

  function handleMessage(e: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "loaded") setWebReady(true);
      else if (msg.type === "openFull") router.push("/(tabs)/map");
    } catch {}
  }

  const showLoader = !loaded || !webReady;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="map" size={16} color="#f97316" />
          <Text style={styles.title}>แผนที่ร้าน</Text>
          <Pressable
            style={styles.gpsChip}
            onPress={goToMyLocation}
            hitSlop={8}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons name="locate" size={12} color="#2563eb" />
            )}
            <Text style={styles.gpsChipText}>ตำแหน่งของฉัน</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.expandChip}
          onPress={() => router.push("/(tabs)/map")}
          hitSlop={8}
        >
          <Text style={styles.expandChipText}>ดูแบบเต็มจอ</Text>
          <Ionicons name="arrow-forward" size={12} color="#f97316" />
        </Pressable>
      </View>

      <View style={styles.mapWrap}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: LEAFLET_HTML, baseUrl: "https://sengran.local/" }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          scrollEnabled={false}
          style={styles.map}
          androidLayerType="hardware"
        />
        {showLoader && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator color="#f97316" size="small" />
          </View>
        )}

        {/* Tap catcher — top area lets user tap-to-open, but middle is interactive for pan */}
        <Pressable
          style={styles.openOverlay}
          onPress={() => router.push("/(tabs)/map")}
        >
          <View style={styles.openOverlayInner}>
            <Ionicons name="expand" size={13} color="#fff" />
            <Text style={styles.openOverlayText}>ขยาย</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827" },
  expandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  expandChipText: { fontSize: 12, fontWeight: "600", color: "#f97316" },
  gpsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginLeft: 4,
  },
  gpsChipText: { fontSize: 11, fontWeight: "600", color: "#2563eb" },

  mapWrap: {
    height: 260,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#eef2f7",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  map: { flex: 1, backgroundColor: "#eef2f7" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(238,242,247,0.6)",
  },
  openOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  openOverlayInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.75)",
  },
  openOverlayText: { fontSize: 11, fontWeight: "700", color: "#fff" },
});
