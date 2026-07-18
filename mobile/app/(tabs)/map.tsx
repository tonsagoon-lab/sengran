import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { resolveImageUrl } from "../../lib/image-url";
import type { Listing } from "../../lib/types";

const fmt = new Intl.NumberFormat("th-TH");
const MODE_KEY = "map_default_mode";
const GPS_TIMEOUT_MS = 12_000;

type MapMode =
  | { type: "nearby"; lat: number; lng: number }
  | { type: "province"; provinceId: number; name: string };

type Province = { id: number; name_th: string };
type Category = { id: number; name_th: string; slug: string; icon: string | null };

const TYPE_COLOR: Record<string, string> = {
  sale: "#1d4ed8",
  rent: "#15803d",
  both: "#7c3aed",
};

function priceLabel(item: Listing): string {
  if (item.listing_type === "rent" && item.rent_price)
    return `฿${fmt.format(item.rent_price)}/ด.`;
  if (item.sale_price) return `฿${fmt.format(item.sale_price)}`;
  return "ติดต่อ";
}

type FilterType = "all" | "sale" | "rent" | "both";
type TimeFilter = "all" | "1m" | "3m" | "6m" | "12m";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "sale", label: "เซ้ง" },
  { key: "rent", label: "เช่า" },
  { key: "both", label: "เซ้ง+เช่า" },
];

const TIME_FILTERS: { key: TimeFilter; label: string; months: number | null }[] = [
  { key: "all", label: "ทั้งหมด", months: null },
  { key: "12m", label: "12 เดือน", months: 12 },
  { key: "6m", label: "6 เดือน", months: 6 },
  { key: "3m", label: "3 เดือน", months: 3 },
  { key: "1m", label: "1 เดือน", months: 1 },
];

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

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f3f4f6; }
  .map-pin-wrap {
    display: flex; flex-direction: column; align-items: center; cursor: pointer;
    width: 100%; height: 100%; justify-content: flex-end;
  }
  .map-pin-bubble {
    color: #fff; border-radius: 8px; padding: 4px 10px;
    font-size: 12px; font-weight: 700; white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.28); letter-spacing: -0.3px; line-height: 1.4;
  }
  .map-pin-tail { display: block; margin-top: -1px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15)); }
  .cluster-bubble {
    background: #f97316; color: #fff; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 3px solid #fff; width: 100%; height: 100%;
  }
  .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .leaflet-control-attribution { font-size: 9px !important; }
  .user-dot { width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(37,99,235,0.4); }
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

  var THAILAND_BOUNDS = [[5.5, 97.3], [20.5, 105.7]];
  var TYPE_COLOR = { sale: '#1d4ed8', rent: '#15803d', both: '#7c3aed' };

  var map = L.map('map', {
    zoomControl: false,
    maxBounds: THAILAND_BOUNDS,
    maxBoundsViscosity: 0.8,
  }).setView([13.7563, 100.5018], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19, minZoom: 6,
  }).addTo(map);

  var cluster = L.markerClusterGroup({
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction: function(c) {
      var count = c.getChildCount();
      var size = count < 10 ? 36 : count < 50 ? 42 : 50;
      return L.divIcon({
        html: '<div class="cluster-bubble">' + count + '</div>',
        className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
      });
    },
  });
  map.addLayer(cluster);

  var allListings = [];
  var currentTypeFilter = 'all';
  var currentProvinceId = null;
  var currentCategoryId = null;
  var currentTimeCutoff = null; // epoch ms; null = no time filter
  var userMarker = null;

  function inThailand(lat, lng) {
    return lat >= 5.5 && lat <= 20.5 && lng >= 97.3 && lng <= 105.7;
  }
  function passesFilter(l) {
    if (!inThailand(l.latitude, l.longitude)) return false;
    if (currentProvinceId != null && l.province_id !== currentProvinceId) return false;
    if (currentCategoryId != null && l.category_id !== currentCategoryId) return false;
    if (currentTimeCutoff != null) {
      if (!l.published_at_ms || l.published_at_ms < currentTimeCutoff) return false;
    }
    if (currentTypeFilter === 'all') return true;
    if (currentTypeFilter === 'sale') return l.listing_type === 'sale' || l.listing_type === 'both';
    if (currentTypeFilter === 'rent') return l.listing_type === 'rent' || l.listing_type === 'both';
    if (currentTypeFilter === 'both') return l.listing_type === 'both';
    return true;
  }

  function priceLabel(l) {
    if (l.listing_type === 'rent' && l.rent_price) return '฿' + l.rent_price.toLocaleString('th-TH') + '/ด.';
    if (l.sale_price) return '฿' + l.sale_price.toLocaleString('th-TH');
    return 'ติดต่อ';
  }

  function render(fit) {
    cluster.clearLayers();
    var shown = allListings.filter(passesFilter);
    shown.forEach(function(l) {
      var color = TYPE_COLOR[l.listing_type] || '#f97316';
      var label = priceLabel(l);
      var w = Math.max(60, label.length * 8 + 20);
      var icon = L.divIcon({
        className: '',
        html: '<div class="map-pin-wrap">' +
              '<div class="map-pin-bubble" style="background:' + color + '">' + label + '</div>' +
              '<svg class="map-pin-tail" width="14" height="10" viewBox="0 0 14 10"><polygon points="7,10 0,0 14,0" fill="' + color + '"/></svg>' +
              '</div>',
        iconSize: [w, 34], iconAnchor: [w/2, 34],
      });
      var marker = L.marker([l.latitude, l.longitude], { icon: icon });
      marker.on('click', function() { post({ type: 'select', id: l.id }); });
      cluster.addLayer(marker);
    });
    if (fit && shown.length > 1) {
      var bounds = L.latLngBounds(shown.map(function(l) { return [l.latitude, l.longitude]; }));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } else if (fit && shown.length === 1) {
      map.setView([shown[0].latitude, shown[0].longitude], 13);
    }
  }

  window.setListings = function(data) {
    allListings = data;
    render(false);
    post({ type: 'ready' });
  };
  window.setTypeFilter = function(f) { currentTypeFilter = f; render(false); };
  window.setProvinceFilter = function(pid) { currentProvinceId = pid; render(true); };
  window.setTimeCutoff = function(cutoff) { currentTimeCutoff = cutoff; render(false); };
  window.setCategoryFilter = function(cid) { currentCategoryId = cid; render(false); };
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

export default function MapScreen() {
  const webRef = useRef<WebView>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [byId, setById] = useState<Record<string, Listing>>({});
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [webReady, setWebReady] = useState(false);
  const [mode, setMode] = useState<MapMode | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [provincePickerOpen, setProvincePickerOpen] = useState(false);
  const [initChecked, setInitChecked] = useState(false);
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);

  useEffect(() => {
    fetchListings();
    fetchProvinces();
    fetchCategories();
    loadSavedMode();
  }, []);

  useEffect(() => {
    if (webReady && listings.length > 0) {
      const payload = listings.map((l) => ({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        province_id: l.province_id,
        category_id: l.category_id,
        listing_type: l.listing_type,
        sale_price: l.sale_price,
        rent_price: l.rent_price,
        published_at_ms: l.published_at ? Date.parse(l.published_at) : null,
      }));
      webRef.current?.injectJavaScript(
        `window.setListings(${JSON.stringify(payload)}); true;`
      );
      applyMode(mode);
    }
  }, [webReady, listings]);

  useEffect(() => {
    if (webReady) {
      webRef.current?.injectJavaScript(
        `window.setTypeFilter(${JSON.stringify(filterType)}); true;`
      );
    }
  }, [webReady, filterType]);

  useEffect(() => {
    if (!webReady) return;
    const entry = TIME_FILTERS.find((t) => t.key === timeFilter);
    const cutoff =
      entry?.months != null ? Date.now() - entry.months * 30 * 24 * 3600 * 1000 : null;
    webRef.current?.injectJavaScript(
      `window.setTimeCutoff(${cutoff == null ? "null" : cutoff}); true;`
    );
  }, [webReady, timeFilter]);

  useEffect(() => {
    if (!webReady) return;
    webRef.current?.injectJavaScript(
      `window.setCategoryFilter(${categoryId == null ? "null" : categoryId}); true;`
    );
  }, [webReady, categoryId]);

  async function fetchListings() {
    const { data } = await supabase
      .from("listings")
      .select(`
        id, slug, title, listing_type, sale_price, rent_price,
        latitude, longitude, district, published_at, province_id, category_id,
        listing_images(storage_path, display_order),
        provinces(name_th),
        categories(name_th, slug)
      `)
      .eq("status", "published")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("published_at", { ascending: false })
      .limit(300);
    const rows = (data ?? []) as unknown as Listing[];
    const idMap: Record<string, Listing> = {};
    rows.forEach((r) => { idMap[r.id] = r; });
    setListings(rows);
    setById(idMap);
    setLoading(false);
  }

  async function fetchProvinces() {
    const { data } = await supabase
      .from("provinces")
      .select("id, name_th")
      .order("name_th");
    setProvinces((data ?? []) as Province[]);
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from("categories")
      .select("id, name_th, slug, icon")
      .eq("category_type", "shop")
      .eq("is_active", true)
      .order("display_order");
    setCategories((data ?? []) as Category[]);
  }

  async function loadSavedMode() {
    try {
      const raw = await AsyncStorage.getItem(MODE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as MapMode;
        if (saved.type === "nearby") {
          // re-request GPS silently so it's current
          try {
            const loc = await getPositionWithTimeout();
            const next = { type: "nearby" as const, lat: loc.coords.latitude, lng: loc.coords.longitude };
            setMode(next);
            AsyncStorage.setItem(MODE_KEY, JSON.stringify(next));
          } catch {
            setMode(saved);
          }
        } else {
          setMode(saved);
        }
      } else {
        // First visit — try nearby by default; fall back to intro on denial/timeout
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            setShowIntro(true);
            return;
          }
          const loc = await getPositionWithTimeout();
          const next: MapMode = {
            type: "nearby",
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
          await AsyncStorage.setItem(MODE_KEY, JSON.stringify(next));
          setMode(next);
        } catch {
          setShowIntro(true);
        }
      }
    } catch {
      setShowIntro(true);
    } finally {
      setInitChecked(true);
    }
  }

  function applyMode(m: MapMode | null) {
    if (!m || !webReady) return;
    if (m.type === "nearby") {
      webRef.current?.injectJavaScript(
        `window.setProvinceFilter(null); window.centerOn(${m.lat}, ${m.lng}, 12); true;`
      );
    } else if (m.type === "province") {
      webRef.current?.injectJavaScript(
        `window.setProvinceFilter(${m.provinceId}); true;`
      );
    }
  }

  useEffect(() => {
    if (webReady && mode) applyMode(mode);
  }, [webReady, mode]);

  function openProvincePicker() {
    // iOS can't stack two Modals reliably — dismiss intro first, then open picker after the animation.
    setShowIntro(false);
    setTimeout(() => setProvincePickerOpen(true), 300);
  }

  async function pickNearby() {
    setGpsLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setGpsLoading(false);
      openProvincePicker();
      return;
    }
    try {
      const loc = await getPositionWithTimeout();
      const next: MapMode = { type: "nearby", lat: loc.coords.latitude, lng: loc.coords.longitude };
      await AsyncStorage.setItem(MODE_KEY, JSON.stringify(next));
      setMode(next);
      setShowIntro(false);
    } catch {
      openProvincePicker();
    } finally {
      setGpsLoading(false);
    }
  }

  async function pickProvince(p: Province) {
    const next: MapMode = { type: "province", provinceId: p.id, name: p.name_th };
    await AsyncStorage.setItem(MODE_KEY, JSON.stringify(next));
    setMode(next);
    setShowIntro(false);
    setProvincePickerOpen(false);
  }

  function openChangeLocation() {
    setSelected(null);
    setShowIntro(true);
  }

  function handleMessage(e: { nativeEvent: { data: string } }) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "loaded") setWebReady(true);
      else if (msg.type === "select" && msg.id) {
        const listing = byId[msg.id];
        if (listing) setSelected(listing);
      }
    } catch {}
  }

  const cover = useMemo(() => {
    if (!selected) return null;
    return selected.listing_images
      ?.slice()
      .sort((a, b) => a.display_order - b.display_order)[0] ?? null;
  }, [selected]);
  const coverUrl = cover ? resolveImageUrl(cover.storage_path) : null;

  function openMaps() {
    if (!selected) return;
    const url = Platform.OS === "ios"
      ? `maps:?q=${selected.latitude},${selected.longitude}`
      : `geo:${selected.latitude},${selected.longitude}?q=${selected.latitude},${selected.longitude}`;
    Linking.openURL(url);
  }

  const modeLabel = mode?.type === "nearby"
    ? "ใกล้ตัวคุณ"
    : mode?.type === "province"
    ? mode.name
    : null;

  const typeLabel = FILTERS.find((f) => f.key === filterType)?.label ?? "ทั้งหมด";
  const timeLabel = TIME_FILTERS.find((t) => t.key === timeFilter)?.label ?? "ทั้งหมด";
  const categoryLabel =
    categoryId == null
      ? "ทุกหมวด"
      : categories.find((c) => c.id === categoryId)?.name_th ?? "ทุกหมวด";

  const typeActive = filterType !== "all";
  const categoryActive = categoryId !== null;
  const timeActive = timeFilter !== "all";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header — prominent location button */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="map" size={20} color="#f97316" />
          <Text style={styles.headerTitle}>แผนที่เซ้ง</Text>
        </View>
        <Pressable style={styles.locHero} onPress={openChangeLocation}>
          <Ionicons name="location" size={16} color="#fff" />
          <Text style={styles.locHeroText} numberOfLines={1}>
            {modeLabel ?? "เลือกตำแหน่ง"}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#fff" />
        </Pressable>
      </View>

      {/* Filter chips — tap to open selection sheet */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            style={[styles.chip, typeActive && styles.chipActive]}
            onPress={() => setTypeSheetOpen(true)}
          >
            <Text style={[styles.chipText, typeActive && styles.chipTextActive]}>
              ประเภท: {typeLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={typeActive ? "#fff" : "#9ca3af"}
            />
          </Pressable>

          <Pressable
            style={[styles.chip, categoryActive && styles.chipActive]}
            onPress={() => setCategorySheetOpen(true)}
          >
            <Text style={[styles.chipText, categoryActive && styles.chipTextActive]}>
              หมวด: {categoryLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={categoryActive ? "#fff" : "#9ca3af"}
            />
          </Pressable>

          <Pressable
            style={[styles.chip, timeActive && styles.chipActive]}
            onPress={() => setTimeSheetOpen(true)}
          >
            <Text style={[styles.chipText, timeActive && styles.chipTextActive]}>
              เวลา: {timeLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={timeActive ? "#fff" : "#9ca3af"}
            />
          </Pressable>
        </ScrollView>
      </View>

      {/* Map (WebView + Leaflet) */}
      <View style={styles.mapWrap}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html: LEAFLET_HTML, baseUrl: "https://sengran.local/" }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          style={styles.map}
        />
        {(loading || !webReady) && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color="#f97316" size="large" />
          </View>
        )}

        {/* My location button — only when in nearby mode or no mode */}
        {mode?.type !== "province" && (
          <Pressable style={styles.locBtn} onPress={pickNearby}>
            <Ionicons name="locate" size={20} color="#374151" />
          </Pressable>
        )}
      </View>

      {/* Bottom card when marker selected */}
      {selected && (
        <View style={styles.card}>
          <Pressable
            style={styles.cardInner}
            onPress={() => router.push(`/listing/${selected.slug}`)}
          >
            <View style={styles.cardImg}>
              {coverUrl ? (
                <ExpoImage source={{ uri: coverUrl }} style={styles.cardImgInner} contentFit="cover" cachePolicy="memory-disk" transition={150} />
              ) : (
                <View style={[styles.cardImgInner, styles.cardImgPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>🏪</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardPrice}>{priceLabel(selected)}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>{selected.title}</Text>
              {(selected.district || (selected as any).provinces?.name_th) && (
                <View style={styles.cardLoc}>
                  <Ionicons name="location-outline" size={11} color="#9ca3af" />
                  <Text style={styles.cardLocText} numberOfLines={1}>
                    {[selected.district, (selected as any).provinces?.name_th].filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}
            </View>
            <Pressable style={styles.navBtn} onPress={openMaps}>
              <Ionicons name="navigate" size={18} color="#fff" />
            </Pressable>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={16} color="#6b7280" />
          </Pressable>
        </View>
      )}

      {/* Intro modal — pick nearby or province */}
      <Modal
        visible={initChecked && showIntro}
        transparent
        animationType="fade"
        onRequestClose={() => { if (mode) setShowIntro(false); }}
      >
        <View style={styles.introBackdrop}>
          <View style={styles.introCard}>
            <Text style={styles.introEmoji}>📍</Text>
            <Text style={styles.introTitle}>ค้นหาร้านในแผนที่</Text>
            <Text style={styles.introSub}>
              เลือกดูร้านใกล้ตัว หรือดูตามจังหวัดที่สนใจ
            </Text>

            <Pressable
              style={[styles.introBtn, styles.introBtnPrimary]}
              onPress={pickNearby}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="locate" size={18} color="#fff" />
                  <Text style={styles.introBtnPrimaryText}>ใกล้ตัวฉัน</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.introBtn, styles.introBtnSecondary]}
              onPress={openProvincePicker}
              disabled={gpsLoading}
            >
              <Ionicons name="map-outline" size={18} color="#f97316" />
              <Text style={styles.introBtnSecondaryText}>เลือกจังหวัด</Text>
            </Pressable>

            {mode && (
              <Pressable onPress={() => setShowIntro(false)}>
                <Text style={styles.introSkip}>ยกเลิก</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Type picker sheet */}
      <Modal
        visible={typeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTypeSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setTypeSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>เลือกประเภท</Text>
              <Pressable onPress={() => setTypeSheetOpen(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={styles.provinceRow}
                onPress={() => {
                  setFilterType(f.key);
                  setTypeSheetOpen(false);
                }}
              >
                <Text style={styles.provinceRowText}>{f.label}</Text>
                {filterType === f.key && (
                  <Ionicons name="checkmark" size={18} color="#f97316" />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category picker sheet */}
      <Modal
        visible={categorySheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategorySheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setCategorySheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>เลือกหมวดหมู่</Text>
              <Pressable onPress={() => setCategorySheetOpen(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>
            <FlatList
              data={[{ id: -1, name_th: "ทุกหมวด", slug: "all", icon: null } as Category, ...categories]}
              keyExtractor={(c) => String(c.id)}
              renderItem={({ item }) => {
                const isAll = item.id === -1;
                const active = isAll ? categoryId === null : categoryId === item.id;
                return (
                  <Pressable
                    style={styles.provinceRow}
                    onPress={() => {
                      setCategoryId(isAll ? null : item.id);
                      setCategorySheetOpen(false);
                    }}
                  >
                    <Text style={styles.provinceRowText}>{item.name_th}</Text>
                    {active && <Ionicons name="checkmark" size={18} color="#f97316" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Time picker sheet */}
      <Modal
        visible={timeSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setTimeSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>ช่วงเวลาที่ประกาศ</Text>
              <Pressable onPress={() => setTimeSheetOpen(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>
            {TIME_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                style={styles.provinceRow}
                onPress={() => {
                  setTimeFilter(f.key);
                  setTimeSheetOpen(false);
                }}
              >
                <Text style={styles.provinceRowText}>{f.label}</Text>
                {timeFilter === f.key && (
                  <Ionicons name="checkmark" size={18} color="#f97316" />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Province picker sheet */}
      <Modal
        visible={provincePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProvincePickerOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setProvincePickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>เลือกจังหวัด</Text>
              <Pressable onPress={() => setProvincePickerOpen(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </Pressable>
            </View>
            <FlatList
              data={provinces}
              keyExtractor={(p) => String(p.id)}
              renderItem={({ item }) => (
                <Pressable style={styles.provinceRow} onPress={() => pickProvince(item)}>
                  <Text style={styles.provinceRowText}>{item.name_th}</Text>
                  {mode?.type === "province" && mode.provinceId === item.id && (
                    <Ionicons name="checkmark" size={18} color="#f97316" />
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 8,
  },
  headerTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  locHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f97316",
    maxWidth: 220,
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  locHeroText: { fontSize: 13, fontWeight: "700", color: "#fff", flexShrink: 1 },

  filterBar: { flexGrow: 0, flexShrink: 0 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    maxWidth: 200,
  },
  chipActive: { backgroundColor: "#f97316", borderColor: "#f97316" },
  chipText: { fontSize: 12.5, fontWeight: "600", color: "#374151", flexShrink: 1 },
  chipTextActive: { color: "#fff" },

  mapWrap: { flex: 1 },
  map: { flex: 1, backgroundColor: "#f3f4f6" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(249,250,251,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  locBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  card: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  cardInner: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  cardImg: { width: 72, height: 72, borderRadius: 10, overflow: "hidden" },
  cardImgInner: { width: 72, height: 72 },
  cardImgPlaceholder: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 2 },
  cardPrice: { fontSize: 15, fontWeight: "700", color: "#f97316" },
  cardTitle: { fontSize: 13, color: "#374151", lineHeight: 18 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cardLocText: { fontSize: 11, color: "#9ca3af", flex: 1 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },

  // Intro modal
  introBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  introCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  introEmoji: { fontSize: 40 },
  introTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  introSub: { fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 6 },
  introBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  introBtnPrimary: { backgroundColor: "#f97316" },
  introBtnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  introBtnSecondary: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#f97316" },
  introBtnSecondaryText: { color: "#f97316", fontSize: 15, fontWeight: "700" },
  introSkip: { fontSize: 13, color: "#9ca3af", marginTop: 4, paddingVertical: 4 },

  // Province sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  provinceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  provinceRowText: { fontSize: 15, color: "#374151" },
});
