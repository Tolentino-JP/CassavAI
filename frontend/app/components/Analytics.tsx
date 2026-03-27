import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_URL = "https://quadrantlike-artie-pokiest.ngrok-free.dev"; 


const C = {
  bg: "#0a1a0f",
  surface: "#132b1a",
  card: "#1a3522",
  cardAlt: "#1f3d28",
  accent: "#2dc270",
  accentDim: "rgba(45,194,112,0.08)",
  accentGlow: "rgba(45,194,112,0.18)",
  border: "#1f6f43",
  borderSoft: "rgba(31,111,67,0.35)",
  text: "#e8f5ee",
  textMuted: "#7ab893",
  textDim: "#3d7a55",
  danger: "#e05c5c",
  warn: "#e0a85c",
  overlay: "rgba(5,14,8,0.82)",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScanRecord {
  id: number;
  time_created: string;      
  prediction: string;
  province: string;
  city: string;
  barangay: string;
  confidence: number;
}

interface ClassDistribution {
  class_name: string;
  count: number;
  avg_confidence: number;
}

interface AnalyticsData {
  total_scans: number;
  avg_confidence: number;
  top_class: string;
  class_distribution: ClassDistribution[];
  recent_scans: { id: number; class_name: string; confidence: number; timestamp: string }[];
}

// ─── Derive AnalyticsData from raw ScanRecords ────────────────────────────────
function deriveAnalytics(records: ScanRecord[]): AnalyticsData {
  if (records.length === 0) {
    return {
      total_scans: 0,
      avg_confidence: 0,
      top_class: "—",
      class_distribution: [],
      recent_scans: [],
    };
  }

  const avg_confidence =
    records.reduce((s, r) => s + r.confidence, 0) / records.length;

  const classMap: Record<string, { count: number; confSum: number }> = {};
  records.forEach((r) => {
    if (!classMap[r.prediction]) classMap[r.prediction] = { count: 0, confSum: 0 };
    classMap[r.prediction].count += 1;
    classMap[r.prediction].confSum += r.confidence;
  });

  const class_distribution: ClassDistribution[] = Object.entries(classMap)
    .map(([class_name, { count, confSum }]) => ({
      class_name,
      count,
      avg_confidence: confSum / count,
    }))
    .sort((a, b) => b.count - a.count);

  const top_class = class_distribution[0]?.class_name ?? "—";

  const recent_scans = [...records]
    .sort(
      (a, b) =>
        new Date(b.time_created).getTime() - new Date(a.time_created).getTime()
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      class_name: r.prediction,
      confidence: r.confidence,
      timestamp: r.time_created,
    }));

  return { total_scans: records.length, avg_confidence, top_class, class_distribution, recent_scans };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function confColor(v: number) {
  return v >= 0.8 ? C.accent : v >= 0.6 ? C.warn : C.danger;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function topDisease(records: ScanRecord[]) {
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.prediction] = (counts[r.prediction] ?? 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HBar({
  label,
  count,
  max,
  delay,
}: {
  label: string;
  count: number;
  max: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: max > 0 ? count / max : 0,
      duration: 800,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [count, max]);
  const short = label.length > 24 ? label.slice(0, 22) + "…" : label;
  return (
    <View style={hbarS.row}>
      <Text style={hbarS.label} numberOfLines={1}>{short}</Text>
      <View style={hbarS.trackRow}>
        <View style={hbarS.track}>
          <Animated.View
            style={[
              hbarS.fill,
              {
                width: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={hbarS.count}>{count}</Text>
      </View>
    </View>
  );
}
const hbarS = StyleSheet.create({
  row: { marginBottom: 12 },
  label: { fontSize: 12, color: C.textMuted, marginBottom: 4, letterSpacing: 0.2 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(45,194,112,0.1)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4, backgroundColor: C.accent },
  count: { fontSize: 12, color: C.text, width: 28, textAlign: "right" },
});

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={scS.card}>
      <View style={scS.iconBox}>
        <Ionicons name={icon} size={18} color={C.accent} />
      </View>
      <Text style={scS.label}>{label}</Text>
      <Text style={scS.value} numberOfLines={2}>{value}</Text>
      {sub ? <Text style={scS.sub}>{sub}</Text> : null}
    </View>
  );
}
const scS = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: C.borderSoft,
    gap: 3,
    minWidth: 90,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  label: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  value: { fontSize: 18, fontWeight: "700", color: C.text, lineHeight: 22 },
  sub: { fontSize: 10, color: C.textDim, marginTop: 1 },
});

function SectionHeader({ title }: { title: string }) {
  return <Text style={shS.text}>{title}</Text>;
}
const shS = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textDim,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
});

function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={ddS.wrap}>
      <Text style={ddS.label}>{label}</Text>
      <Pressable style={ddS.trigger} onPress={() => setOpen(true)}>
        <Text
          style={[ddS.triggerText, !value && ddS.placeholder]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={ddS.backdrop} onPress={() => setOpen(false)}>
          <View style={ddS.sheet}>
            <View style={ddS.sheetHeader}>
              <Text style={ddS.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={18} color={C.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Pressable
                style={[ddS.option, !value && ddS.optionActive]}
                onPress={() => {
                  onSelect("");
                  setOpen(false);
                }}
              >
                <Text style={[ddS.optionText, !value && ddS.optionTextActive]}>
                  — All —
                </Text>
                {!value && <Ionicons name="checkmark" size={14} color={C.accent} />}
              </Pressable>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={[ddS.option, value === opt && ddS.optionActive]}
                  onPress={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[ddS.optionText, value === opt && ddS.optionTextActive]}
                  >
                    {opt}
                  </Text>
                  {value === opt && (
                    <Ionicons name="checkmark" size={14} color={C.accent} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
const ddS = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 10,
    color: C.textDim,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    gap: 6,
  },
  triggerText: { flex: 1, fontSize: 13, color: C.text, fontWeight: "600" },
  placeholder: { color: C.textDim, fontWeight: "400" },
  backdrop: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.borderSoft,
    maxHeight: 420,
    padding: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31,111,67,0.1)",
  },
  optionActive: {
    backgroundColor: "rgba(45,194,112,0.07)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  optionText: { fontSize: 14, color: C.textMuted },
  optionTextActive: { color: C.accent, fontWeight: "700" },
});

function LocationCard({
  name,
  records,
  level,
}: {
  name: string;
  records: ScanRecord[];
  level: "province" | "city" | "barangay";
}) {
  const [expanded, setExpanded] = useState(false);
  const rotAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const top = topDisease(records);
  const healthy = records.filter((r) => r.prediction === "Healthy").length;
  const diseased = records.length - healthy;
  const avgConf =
    records.reduce((s, r) => s + r.confidence, 0) / records.length;
  const col = confColor(avgConf);

  const toggle = () => {
    const toVal = expanded ? 0 : 1;
    Animated.parallel([
      Animated.timing(rotAnim, {
        toValue: toVal,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: toVal,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setExpanded(!expanded);
  };

  const levelIcon: any =
    level === "province"
      ? "map-outline"
      : level === "city"
      ? "business-outline"
      : "home-outline";

  return (
    <View style={lcS.card}>
      <Pressable style={lcS.header} onPress={toggle}>
        <View style={lcS.iconWrap}>
          <Ionicons name={levelIcon} size={14} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lcS.name}>{name}</Text>
          <Text style={lcS.meta}>
            {records.length} scan{records.length !== 1 ? "s" : ""} · Top:{" "}
            {top.split(" ").slice(0, 2).join(" ")}
          </Text>
        </View>
        <View style={[lcS.confBadge, { borderColor: col }]}>
          <Text style={[lcS.confText, { color: col }]}>
            {(avgConf * 100).toFixed(0)}%
          </Text>
        </View>
        <Animated.View
          style={{
            transform: [
              {
                rotate: rotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
            marginLeft: 6,
          }}
        >
          <Ionicons name="chevron-down" size={14} color={C.textDim} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <Animated.View style={[lcS.body, { opacity: fadeAnim }]}>
          <View style={lcS.pills}>
            <View style={lcS.pill}>
              <View style={[lcS.pillDot, { backgroundColor: C.accent }]} />
              <Text style={lcS.pillText}>Healthy: {healthy}</Text>
            </View>
            <View style={lcS.pill}>
              <View style={[lcS.pillDot, { backgroundColor: C.danger }]} />
              <Text style={lcS.pillText}>Diseased: {diseased}</Text>
            </View>
          </View>
          {Object.entries(groupBy(records, (r) => r.prediction))
            .sort((a, b) => b[1].length - a[1].length)
            .map(([disease, recs]) => (
              <View key={disease} style={lcS.diseaseRow}>
                <Text style={lcS.diseaseName} numberOfLines={1}>
                  {disease}
                </Text>
                <View style={lcS.diseaseBar}>
                  <View
                    style={[
                      lcS.diseaseFill,
                      {
                        width: `${(recs.length / records.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={lcS.diseaseCount}>{recs.length}</Text>
              </View>
            ))}
        </Animated.View>
      )}
    </View>
  );
}
const lcS = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.borderSoft,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 13, fontWeight: "700", color: C.text },
  meta: { fontSize: 11, color: C.textDim, marginTop: 2 },
  confBadge: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  confText: { fontSize: 11, fontWeight: "700" },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,111,67,0.15)",
  },
  pills: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, color: C.textMuted },
  diseaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  diseaseName: { fontSize: 11, color: C.textMuted, width: 130 },
  diseaseBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(45,194,112,0.1)",
    overflow: "hidden",
  },
  diseaseFill: { height: "100%", borderRadius: 3, backgroundColor: C.accent },
  diseaseCount: {
    fontSize: 11,
    color: C.text,
    width: 20,
    textAlign: "right",
  },
});

function RecentRow({
  record,
  index,
}: {
  record: ScanRecord;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);
  const col = confColor(record.confidence);
  const date = new Date(record.time_created).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
  return (
    <Animated.View style={[rrS.row, { opacity: fadeAnim }]}>
      <View style={rrS.dot} />
      <View style={{ flex: 1 }}>
        <Text style={rrS.prediction} numberOfLines={1}>
          {record.prediction}
        </Text>
        <Text style={rrS.location}>
          {record.barangay}, {record.city}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={[rrS.badge, { borderColor: col }]}>
          <Text style={[rrS.badgeText, { color: col }]}>
            {(record.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        <Text style={rrS.date}>{date}</Text>
      </View>
    </Animated.View>
  );
}
const rrS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31,111,67,0.12)",
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    opacity: 0.7,
  },
  prediction: { fontSize: 13, color: C.text, fontWeight: "600" },
  location: { fontSize: 11, color: C.textDim, marginTop: 2 },
  badge: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  date: { fontSize: 10, color: C.textDim },
});

// ─── Tab bar ──────────────────────────────────────────────────────────────────
type TabKey = "overview" | "location" | "records";
const TABS: { key: TabKey; icon: any; label: string }[] = [
  { key: "overview", icon: "stats-chart-outline", label: "Overview" },
  { key: "location", icon: "map-outline",          label: "Location" },
  { key: "records",  icon: "list-outline",         label: "Records"  },
];

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function Analytics() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab]       = useState<TabKey>("overview");
  const [analytics, setAnalytics]       = useState<AnalyticsData | null>(null);
  const [records, setRecords]           = useState<ScanRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [serverError, setServerError]   = useState<string | null>(null);

  const [filterProvince, setFilterProvince] = useState("");
  const [filterCity, setFilterCity]         = useState("");

  const headerFade  = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-10)).current;

  // ─── Fetch from FastAPI ─────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setServerError(null);
    try {
      const response = await fetch(`${API_URL}/analytics`);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const json = await response.json();             // { data: ScanRecord[] }
      const fetchedRecords: ScanRecord[] = json.data ?? [];

      setRecords(fetchedRecords);
      setAnalytics(deriveAnalytics(fetchedRecords));
    } catch (err: any) {
      setServerError(err.message ?? "Failed to connect to server.");
      setRecords([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    loadData();
  }, []);

  const handleRefresh = () => loadData();

  // ─── Derived filter options ─────────────────────────────────────────────────
  const provinces = useMemo(
    () => [...new Set(records.map((r) => r.province))].sort(),
    [records]
  );
  const cities = useMemo(
    () =>
      [
        ...new Set(
          records
            .filter((r) => !filterProvince || r.province === filterProvince)
            .map((r) => r.city)
        ),
      ].sort(),
    [records, filterProvince]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterProvince && r.province !== filterProvince) return false;
      if (filterCity     && r.city     !== filterCity)     return false;
      return true;
    });
  }, [records, filterProvince, filterCity]);

  const byProvince = useMemo(
    () => groupBy(filteredRecords, (r) => r.province),
    [filteredRecords]
  );
  const byCity = useMemo(
    () => groupBy(filteredRecords, (r) => r.city),
    [filteredRecords]
  );
  const byBarangay = useMemo(
    () => groupBy(filteredRecords, (r) => r.barangay),
    [filteredRecords]
  );

  const maxCount = analytics
    ? Math.max(...analytics.class_distribution.map((d) => d.count), 1)
    : 1;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      {/* ── Top bar ── */}
      <Animated.View
        style={[
          styles.topBar,
          {
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={20} color={C.accent} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>CassavAI · Database Overview</Text>
        </View>
        <Pressable style={styles.refreshBtn} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={18} color={C.textMuted} />
        </Pressable>
      </Animated.View>

      <View style={styles.divider} />

      {/* ── Tab navigation ── */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons
              name={t.icon}
              size={15}
              color={activeTab === t.key ? C.accent : C.textDim}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === t.key && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loaderText}>Loading analytics…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Server error banner ── */}
          {serverError && (
            <View style={styles.banner}>
              <Ionicons name="cloud-offline-outline" size={14} color={C.warn} />
              <Text style={styles.bannerText}>{serverError}</Text>
            </View>
          )}

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
          {activeTab === "overview" && analytics && (
            <>
              <SectionHeader title="Overview" />
              <View style={styles.cardRow}>
                <StatCard
                  icon="scan-outline"
                  label="Total Scans"
                  value={String(analytics.total_scans)}
                />
                <StatCard
                  icon="trending-up-outline"
                  label="Avg Confidence"
                  value={`${(analytics.avg_confidence * 100).toFixed(1)}%`}
                />
              </View>
              <View style={[styles.cardRow, { marginTop: 10 }]}>
                <StatCard
                  icon="leaf-outline"
                  label="Top Detection"
                  value={analytics.top_class.split(" ").slice(0, 2).join(" ")}
                  sub={analytics.top_class}
                />
                <StatCard
                  icon="location-outline"
                  label="Provinces"
                  value={String(provinces.length)}
                  sub="in database"
                />
              </View>

              <View style={{ height: 24 }} />
              <SectionHeader title="Disease Distribution" />
              <View style={styles.section}>
                <View style={styles.legendRow}>
                  <Text style={styles.legendText}>Disease class</Text>
                  <Text style={styles.legendText}>Count</Text>
                </View>
                {analytics.class_distribution.map((item, i) => (
                  <HBar
                    key={item.class_name}
                    label={item.class_name}
                    count={item.count}
                    max={maxCount}
                    delay={i * 70}
                  />
                ))}
              </View>

              <View style={{ height: 24 }} />
              <SectionHeader title="Recent Scans" />
              <View style={styles.section}>
                {analytics.recent_scans.map((s, i) => (
                  <RecentRow
                    key={s.id}
                    index={i}
                    record={
                      records.find((r) => r.id === s.id) ?? {
                        id: s.id,
                        time_created: s.timestamp,
                        prediction: s.class_name,
                        province: "—",
                        city: "—",
                        barangay: "—",
                        confidence: s.confidence,
                      }
                    }
                  />
                ))}
              </View>
            </>
          )}

          {/* ══════════════ LOCATION TAB ══════════════ */}
          {activeTab === "location" && (
            <>
              <View style={styles.filterCard}>
                <View style={styles.filterHeader}>
                  <Ionicons name="options-outline" size={14} color={C.accent} />
                  <Text style={styles.filterTitle}>Filter by Location</Text>
                  {(filterProvince || filterCity) && (
                    <Pressable
                      onPress={() => {
                        setFilterProvince("");
                        setFilterCity("");
                      }}
                      style={styles.clearFilterBtn}
                    >
                      <Text style={styles.clearFilterText}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.filterRow}>
                  <Dropdown
                    label="Province"
                    value={filterProvince}
                    options={provinces}
                    onSelect={(v) => {
                      setFilterProvince(v);
                      setFilterCity("");
                    }}
                    placeholder="All provinces"
                  />
                  <Dropdown
                    label="City / Municipality"
                    value={filterCity}
                    options={cities}
                    onSelect={setFilterCity}
                    placeholder="All cities"
                  />
                </View>
                <View style={styles.filterResult}>
                  <Ionicons
                    name="document-text-outline"
                    size={12}
                    color={C.textDim}
                  />
                  <Text style={styles.filterResultText}>
                    {filteredRecords.length} record
                    {filteredRecords.length !== 1 ? "s" : ""} found
                    {filterProvince ? ` · ${filterProvince}` : ""}
                    {filterCity ? ` · ${filterCity}` : ""}
                  </Text>
                </View>
              </View>

              <View style={{ height: 20 }} />
              <SectionHeader
                title={`By Province (${Object.keys(byProvince).length})`}
              />
              {Object.entries(byProvince)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([name, recs]) => (
                  <LocationCard
                    key={name}
                    name={name}
                    records={recs}
                    level="province"
                  />
                ))}

              <View style={{ height: 20 }} />
              <SectionHeader
                title={`By City / Municipality (${Object.keys(byCity).length})`}
              />
              {Object.entries(byCity)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([name, recs]) => (
                  <LocationCard
                    key={name}
                    name={name}
                    records={recs}
                    level="city"
                  />
                ))}

              <View style={{ height: 20 }} />
              <SectionHeader
                title={`By Barangay (${Object.keys(byBarangay).length})`}
              />
              {Object.entries(byBarangay)
                .sort((a, b) => b[1].length - a[1].length)
                .map(([name, recs]) => (
                  <LocationCard
                    key={name}
                    name={name}
                    records={recs}
                    level="barangay"
                  />
                ))}
            </>
          )}

          {/* ══════════════ RECORDS TAB ══════════════ */}
          {activeTab === "records" && (
            <>
              <View style={styles.filterCard}>
                <View style={styles.filterHeader}>
                  <Ionicons name="options-outline" size={14} color={C.accent} />
                  <Text style={styles.filterTitle}>Filter Records</Text>
                  {(filterProvince || filterCity) && (
                    <Pressable
                      onPress={() => {
                        setFilterProvince("");
                        setFilterCity("");
                      }}
                      style={styles.clearFilterBtn}
                    >
                      <Text style={styles.clearFilterText}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.filterRow}>
                  <Dropdown
                    label="Province"
                    value={filterProvince}
                    options={provinces}
                    onSelect={(v) => {
                      setFilterProvince(v);
                      setFilterCity("");
                    }}
                    placeholder="All provinces"
                  />
                  <Dropdown
                    label="City / Municipality"
                    value={filterCity}
                    options={cities}
                    onSelect={setFilterCity}
                    placeholder="All cities"
                  />
                </View>
                <View style={styles.filterResult}>
                  <Ionicons
                    name="document-text-outline"
                    size={12}
                    color={C.textDim}
                  />
                  <Text style={styles.filterResultText}>
                    {filteredRecords.length} record
                    {filteredRecords.length !== 1 ? "s" : ""} found
                  </Text>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <SectionHeader title="All Records" />
              <View style={styles.section}>
                {filteredRecords.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="search-outline"
                      size={28}
                      color={C.textDim}
                    />
                    <Text style={styles.emptyText}>
                      No records match the current filter.
                    </Text>
                  </View>
                ) : (
                  filteredRecords
                    .sort(
                      (a, b) =>
                        new Date(b.time_created).getTime() -
                        new Date(a.time_created).getTime()
                    )
                    .map((record, i) => (
                      <RecentRow key={record.id} record={record} index={i} />
                    ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.surface,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 19, fontWeight: "800", color: C.text, letterSpacing: 0.3 },
  subtitle: { fontSize: 11, color: C.textDim, marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(45,194,112,0.05)",
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: { height: 1, backgroundColor: C.borderSoft },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: C.accentDim,
    borderWidth: 1,
    borderColor: "rgba(45,194,112,0.22)",
  },
  tabLabel: { fontSize: 12, fontWeight: "600", color: C.textDim },
  tabLabelActive: { color: C.accent },

  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loaderText: { color: C.textMuted, fontSize: 14 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(224,168,92,0.1)",
    borderWidth: 1,
    borderColor: "rgba(224,168,92,0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  bannerText: { flex: 1, color: C.warn, fontSize: 11, lineHeight: 16 },

  cardRow: { flexDirection: "row", gap: 10 },

  section: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },

  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  legendText: { fontSize: 10, color: C.textDim, letterSpacing: 0.4 },

  filterCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  filterTitle: { flex: 1, fontSize: 13, fontWeight: "700", color: C.text },
  clearFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(224,168,92,0.1)",
    borderWidth: 1,
    borderColor: "rgba(224,168,92,0.25)",
  },
  clearFilterText: { fontSize: 11, color: C.warn, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 10 },
  filterResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,111,67,0.15)",
  },
  filterResultText: { fontSize: 11, color: C.textDim },

  emptyState: { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 13, color: C.textDim, textAlign: "center" },
});