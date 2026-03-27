import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  Alert,
  BackHandler,
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  Text,
  ScrollView,
  Modal
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
import Header from "./Header";
import { pickImageFromLibrary, takePhoto } from "../../utils/UseImagePicker";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import ModalCard from "./ModalCard";
import leafDescriptions from "../../assets/text/leaf_description.json";
import guideInstructions from "../../assets/text/guide_instructions.json";
import locationData from "@/assets/text/locations.json"


const C = {
  bg: "#0a1a0f",
  bgMid: "#0f2318",
  surface: "#132b1a",
  card: "#1a3522",
  accent: "#2dc270",
  accentGlow: "rgba(45,194,112,0.18)",
  accentDim: "rgba(45,194,112,0.08)",
  border: "#1f6f43",
  borderSoft: "rgba(31,111,67,0.4)",
  text: "#e8f5ee",
  textMuted: "#7ab893",
  textDim: "#3d7a55",
  white: "#ffffff",
  scanLine: "rgba(45,194,112,0.7)",
  hudBg: "rgba(10,26,15,0.9)",
};


interface IndividualModelResult {
  class_id: number;
  class_name: String;
  confidence: number;
}

interface PredictionResponse {
  error?: string;
  annotated_image_base64: string;
  detection: {
    label: string;
    confidence: number;
    bbox: [number, number, number, number];
  };
  ensemble: {
    class_id: number;
    class_name: string;
    confidence: number;
    probabilities: number[];
  };
  individual_models: IndividualModelResult;
}

type DropdownPickerProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (val: string) => void;
  disabled: boolean;
};

function CornerBrackets({
  size,
  color,
  thickness = 3,
  length = 28,
}: {
  size: number;
  color: string;
  thickness?: number;
  length?: number;
}) {
  const b: any = {
    position: "absolute",
    width: length,
    height: length,
    borderColor: color,
  };
  return (
    <>
      <View style={[b, { top: 0, left: 0, borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: 6 }]} />
      <View style={[b, { top: 0, right: 0, borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: 6 }]} />
      <View style={[b, { bottom: 0, left: 0, borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: 6 }]} />
      <View style={[b, { bottom: 0, right: 0, borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: 6 }]} />
    </>
  );
}

function ConfBadge({ value }: { value: number }) {
  const pct = value * 100;
  const color = pct >= 80 ? C.accent : pct >= 60 ? "#e0a85c" : "#e05c5c";
  return (
    <View style={[badgeStyles.wrap, { borderColor: color }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[badgeStyles.text, { color }]}>{pct.toFixed(1)}%</Text>
    </View>
  );
}
const badgeStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "700" },
});

type LocationData = {
  Provinces: {
    [province: string]: {
      Cities: {
        [city: string]: {
          Barangay: string[];
        };
      };
    };
  };
};

function ResultRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      {typeof value === "string" ? <Text style={rowStyles.value}>{value}</Text> : value}
    </View>
  );
}
const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "rgba(31,111,67,0.15)" },
  label: { fontSize: 12, color: C.textMuted, letterSpacing: 0.3 },
  value: { fontSize: 13, color: C.text, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
});

function DropdownPicker({ label, value, options, onSelect, disabled }: DropdownPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <Text style={{ color: value ? "#fff" : "#888", flex: 1 }}>
          {value || `Select ${label}`}
        </Text>
        <Text style={{ color: "#888" }}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={[
                    styles.dropdownItem,
                    value === opt && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: value === opt ? "#6ee7b7" : "#fff", fontSize: 14 }}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [topTab, setTopTab] = useState<"scan" | "results">("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideLanguage, setGuideLanguage] = useState<"en" | "tl">("en");
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const horizontalPadding = 20;
  const contentWidth = Math.min(width - horizontalPadding * 2, 520);
  const imageSize = Math.min(contentWidth, height * 0.46);
  const modalWidth = Math.min(contentWidth, 420);
  const mainPaddingBottom = height < 700 ? 36 : 70;

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [locationVisible, setLocationVisible] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");

  const data = locationData as LocationData;

  useEffect(() => () => { if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current); }, []);

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert("Exit app", "Do you want to exit the app?", [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  const startTimer = () => {
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsedTime(Date.now() - start), 50);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const formatTime = (ms: number) => {
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(2)}s`;
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}s`;
  };

  const handleBrowseFiles = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) { setImageUri(uri); setTopTab("scan"); setResultsVisible(false); }
  };

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) { setImageUri(uri); setTopTab("scan"); setResultsVisible(false); }
  };

  const submitScan = async () => {
    if (!province || !city || !barangay) {
      Alert.alert("Missing Info", "Please fill all location fields.");
      return;
    }

    setLocationVisible(false);

    try {
      setIsScanning(true);
      setElapsedTime(0);
      startTimer();

      const filename = imageUri!.split("/").pop() ?? "photo.jpg";
      const type = filename.endsWith(".png") ? "image/png" : "image/jpeg";

      const formData = new FormData();
      formData.append("file", { uri: imageUri!, name: filename, type } as any);
      formData.append("province", province);
      formData.append("city", city);
      formData.append("barangay", barangay);

      const response = await fetch(
        "https://quadrantlike-artie-pokiest.ngrok-free.dev/predict",
        { method: "POST", body: formData }
      );

      const data = await response.json();
      setResult(data);
      setResultsVisible(true);
      setTopTab("results");

    } catch (error) {
      console.error(error);
      alert("Failed to send image to backend");
    } finally {
      stopTimer();
      setIsScanning(false);
    }
  };

  const handleScan = async () => {
    if (!imageUri) { setErrorVisible(true); return; }
    setLocationVisible(true);
  };

  type GuideIconToken = "camera" | "browse" | "scan";
  type IoniconName = ComponentProps<typeof Ionicons>["name"];

  const renderGuideText = (text: string): ReactNode[] => {
    const tokenRegex = /\[\[(camera|browse|scan)\]\]/g;
    const iconNameByToken: Record<GuideIconToken, IoniconName> = {
      camera: "camera-outline",
      browse: "image-outline",
      scan: "scan-outline",
    };
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let iconIndex = 0;
    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
      const token = match[1] as GuideIconToken;
      nodes.push(<Ionicons key={`guide-icon-${token}-${iconIndex++}`} name={iconNameByToken[token]} size={16} color={C.accent} />);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Header />
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>

        {/* ── Tab bar ── */}
        <View style={[styles.tabBarWrap, { width: contentWidth }]}>
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabItem, topTab === "scan" && styles.tabItemActive]}
              onPress={() => setTopTab("scan")}
            >
              <Ionicons name="scan-outline" size={15} color={topTab === "scan" ? C.accent : C.textDim} />
              <Text style={[styles.tabLabel, topTab === "scan" && styles.tabLabelActive]}>Scan</Text>
            </Pressable>

            <Pressable
              style={[styles.tabItem, topTab === "results" && styles.tabItemActive]}
              onPress={() => { if (result) { setTopTab("results"); setResultsVisible(true); } }}
            >
              <Ionicons name="stats-chart-outline" size={15} color={topTab === "results" ? C.accent : C.textDim} />
              <Text style={[styles.tabLabel, topTab === "results" && styles.tabLabelActive]}>Results</Text>
              {result && topTab !== "results" && <View style={styles.tabDot} />}
            </Pressable>
          </View>
        </View>

        {/* ── Main scan area ── */}
        <View style={[styles.mainArea, { paddingBottom: mainPaddingBottom }]}>

          {/* Guide button */}
          <Pressable style={styles.guideBtn} onPress={() => setGuideVisible(true)}>
            <Ionicons name="help-outline" size={16} color={C.accent} />
          </Pressable>

          {/* Scan frame */}
          <View style={[styles.frameOuter, { width: imageSize, height: imageSize }]}>
            <View style={styles.frameInner}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} />
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconRing}>
                    <Ionicons name="leaf-outline" size={40} color={C.border} />
                  </View>
                  <Text style={styles.emptyTitle}>No image selected</Text>
                  <Text style={styles.emptyHint}>Use the controls below to get started</Text>
                </View>
              )}
            </View>

            <CornerBrackets size={imageSize} color={isScanning ? C.accent : C.border} thickness={2.5} length={24} />

            {imageUri && (
              <Pressable
                style={styles.clearBtn}
                onPress={() => {
                  setImageUri(null);
                  setTopTab("scan");
                  setResultsVisible(false);
                  setIsScanning(false);
                }}
                hitSlop={10}
              >
                <Ionicons name="close" size={14} color={C.text} />
              </Pressable>
            )}

            {/* Scanning overlay — no animations, just HUD */}
            {isScanning && (
              <View style={[StyleSheet.absoluteFill, styles.scanOverlay]} pointerEvents="none">
                <View style={styles.scanTint} />
                <View style={styles.scanHud}>
                  <ActivityIndicator size="small" color={C.accent} />
                  <Text style={styles.scanTime}>{formatTime(elapsedTime)}</Text>
                  <Text style={styles.scanLabel}>Analyzing…</Text>
                </View>
              </View>
            )}
          </View>

          {/* Status pills */}
          {!isScanning && imageUri && !resultsVisible && (
            <View style={styles.readyPill}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>Ready to scan</Text>
            </View>
          )}
          {!imageUri && (
            <View style={styles.readyPill}>
              <Ionicons name="arrow-down-outline" size={12} color={C.textDim} />
              <Text style={styles.hintText}>Take a photo or browse your gallery</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Bottom nav ── */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomNav onBrowse={handleBrowseFiles} onCamera={handleTakePhoto} onScan={handleScan} />
      </View>

      {/* ── Results modal ── */}
      <ModalCard visible={resultsVisible} title="Scan Results" width={modalWidth} onClose={() => { setResultsVisible(false); setTopTab("scan"); }}>
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {result && (
            <>
              {result.error ? (
                <View style={styles.errorState}>
                  <Ionicons name="warning-outline" size={32} color="#e05c5c" />
                  <Text style={styles.errorMsg}>{result.error}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.resultImageWrap}>
                    <Image source={{ uri: `data:image/png;base64,${result.annotated_image_base64}` }} style={styles.resultImage} resizeMode="contain" />
                    <CornerBrackets size={220} color={C.border} thickness={2} length={18} />
                  </View>

                  <View style={styles.classHeadline}>
                    <Text style={styles.classLabel}>Detected Disease</Text>
                    <Text style={styles.className}>{result.ensemble.class_name}</Text>
                  </View>

                  <View style={styles.statsCard}>
                    <ResultRow label="Processing Time" value={formatTime(elapsedTime)} />
                    <ResultRow label="Detection Label" value={result.detection.label} />
                    <ResultRow label="Detection Confidence" value={<ConfBadge value={result.detection.confidence} />} />
                    <ResultRow label="Classification Confidence" value={<ConfBadge value={result.ensemble.confidence} />} />
                  </View>

                  <View style={styles.descCard}>
                    <View style={styles.descHeader}>
                      <Ionicons name="information-circle-outline" size={16} color={C.accent} />
                      <Text style={styles.descTitle}>Description</Text>
                    </View>
                    <Text style={styles.descText}>
                      {leafDescriptions[result.ensemble.class_name as keyof typeof leafDescriptions]?.description}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </ModalCard>

      {/* ── Error modal ── */}
      <ModalCard visible={errorVisible} title="No Image Selected" width={modalWidth} onClose={() => setErrorVisible(false)}>
        <View style={styles.errModalBody}>
          <View style={styles.errIconRing}>
            <Ionicons name="image-outline" size={28} color={C.accent} />
          </View>
          <Text style={styles.errModalText}>
            Please take a photo or select an image from your gallery before scanning.
          </Text>
        </View>
      </ModalCard>

      {/* ── Guide modal ── */}
      <ModalCard visible={guideVisible} title="How to Use" width={modalWidth} onClose={() => setGuideVisible(false)}>
        <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={styles.guideContent} showsVerticalScrollIndicator={false}>
          <View style={styles.langRow}>
            {(["tl", "en"] as const).map((lang) => (
              <Pressable key={lang} style={[styles.langPill, guideLanguage === lang && styles.langPillActive]} onPress={() => setGuideLanguage(lang)}>
                <Text style={[styles.langText, guideLanguage === lang && styles.langTextActive]}>
                  {lang === "en" ? "English" : "Tagalog"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.guideIntro}>{guideInstructions.intro[guideLanguage]}</Text>

          {guideInstructions.steps[guideLanguage].map((step, i) => (
            <View key={`step-${i}`} style={styles.guideRow}>
              <View style={styles.guideNumWrap}>
                <Text style={styles.guideNum}>{i + 1}</Text>
              </View>
              <AppText style={styles.guideText}>{renderGuideText(step)}</AppText>
            </View>
          ))}

          <View style={styles.guideDivider} />
          <Text style={styles.guideSectionTitle}>{guideInstructions.photoTipsTitle[guideLanguage]}</Text>

          {guideInstructions.photoTips[guideLanguage].map((tip, i) => (
            <View key={`tip-${i}`} style={styles.guideRow}>
              <View style={styles.guideBulletWrap}>
                <View style={styles.guideBulletDot} />
              </View>
              <AppText style={styles.guideText}>{renderGuideText(tip)}</AppText>
            </View>
          ))}
        </ScrollView>
      </ModalCard>

      {/* ── Location modal ── */}
      <ModalCard
        visible={locationVisible}
        title="Enter Location"
        width={modalWidth}
        onClose={() => setLocationVisible(false)}
      >
        <View style={{ padding: 16, gap: 12 }}>

          {/* Province */}
          <DropdownPicker
            label="Province"
            value={province}
            options={Object.keys(locationData.Provinces)}
            onSelect={(val) => {
              setProvince(val);
              setCity("");
              setBarangay("");
            }}
            disabled={false}
          />

          {/* City / Municipality */}
          <DropdownPicker
            label="City / Municipality"
            value={city}
            options={
              province
                ? Object.keys(data.Provinces[province].Cities)
                : []
            }
            onSelect={(val) => {
              setCity(val);
              setBarangay("");
            }}
            disabled={!province}
          />

          {/* Barangay */}
          <DropdownPicker
            label="Barangay"
            value={barangay}
            options={
              province && city
                ? data.Provinces[province].Cities[city].Barangay
                : []
            }
            onSelect={setBarangay}
            disabled={!city}
          />

          <Pressable style={styles.submitBtn} onPress={submitScan}>
            <Text style={styles.submitText}>Continue Scan</Text>
          </Pressable>

        </View>
      </ModalCard>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flex: 1 },
  content: { flex: 7.5, backgroundColor: C.bg, alignItems: "center", paddingTop: 16 },

  tabBarWrap: { marginBottom: 20, paddingHorizontal: 4 },
  tabBar: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 14, padding: 5, borderWidth: 1, borderColor: C.borderSoft, gap: 4 },
  tabItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  tabItemActive: { backgroundColor: C.accentDim, borderWidth: 1, borderColor: "rgba(45,194,112,0.25)" },
  tabLabel: { fontSize: 13, fontWeight: "600", color: C.textDim, letterSpacing: 0.3 },
  tabLabelActive: { color: C.accent },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, position: "absolute", top: 6, right: 10 },

  mainArea: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 14 },

  guideBtn: { position: "absolute", right: 18, top: -4, width: 32, height: 32, borderRadius: 10, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.borderSoft, alignItems: "center", justifyContent: "center" },

  frameOuter: { borderRadius: 20, overflow: "hidden", backgroundColor: C.surface, shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  frameInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%", borderRadius: 18, resizeMode: "contain" },

  emptyState: { alignItems: "center", gap: 10, paddingHorizontal: 24 },
  emptyIconRing: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(31,111,67,0.12)", borderWidth: 1, borderColor: C.borderSoft, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textMuted, letterSpacing: 0.3 },
  emptyHint: { fontSize: 12, color: C.textDim, textAlign: "center", lineHeight: 18 },

  clearBtn: { position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(10,26,15,0.85)", borderWidth: 1, borderColor: C.borderSoft, alignItems: "center", justifyContent: "center" },

  scanOverlay: { justifyContent: "flex-end" },
  scanTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(45,194,112,0.04)" },
  scanHud: { margin: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.hudBg, borderWidth: 1, borderColor: "rgba(45,194,112,0.2)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  scanTime: { fontSize: 13, fontWeight: "700", color: C.accent },
  scanLabel: { fontSize: 12, color: C.textMuted, flex: 1 },

  readyPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderSoft },
  readyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  readyText: { fontSize: 12, color: C.accent, fontWeight: "600" },
  hintText: { fontSize: 12, color: C.textDim },

  bottom: { flex: 1, backgroundColor: "#ffffff" },

  modalContent: { padding: 18, gap: 16, backgroundColor: C.bg },
  resultImageWrap: { width: 220, height: 220, alignSelf: "center", borderRadius: 14, overflow: "hidden", backgroundColor: C.surface },
  resultImage: { width: "100%", height: "100%" },
  classHeadline: { alignItems: "center", gap: 4 },
  classLabel: { fontSize: 11, color: C.textDim, letterSpacing: 1, textTransform: "uppercase" },
  className: { fontSize: 18, fontWeight: "800", color: C.text, textAlign: "center", letterSpacing: 0.3 },
  statsCard: { backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(31,111,67,0.2)" },
  descCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(31,111,67,0.2)", gap: 8 },
  descHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  descTitle: { fontSize: 12, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },
  descText: { fontSize: 13, color: C.textMuted, lineHeight: 20, textAlign: "justify" },
  errorState: { alignItems: "center", gap: 12, paddingVertical: 32 },
  errorMsg: { fontSize: 14, color: "#e05c5c", textAlign: "center" },

  errModalBody: { alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 28, paddingHorizontal: 20, backgroundColor: C.bg },
  errIconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.borderSoft, alignItems: "center", justifyContent: "center" },
  errModalText: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 21 },

  guideContent: { padding: 18, gap: 12, backgroundColor: C.bg },
  langRow: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 12, padding: 4, gap: 4, borderWidth: 1, borderColor: C.borderSoft, marginBottom: 4 },
  langPill: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: "center" },
  langPillActive: { backgroundColor: C.accentDim, borderWidth: 1, borderColor: "rgba(45,194,112,0.25)" },
  langText: { fontSize: 13, fontWeight: "600", color: C.textDim },
  langTextActive: { color: C.accent },
  guideIntro: { fontSize: 13, color: C.textMuted, lineHeight: 20 },
  guideRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  guideNumWrap: { width: 22, height: 22, borderRadius: 7, backgroundColor: C.accentDim, borderWidth: 1, borderColor: C.borderSoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  guideNum: { fontSize: 11, fontWeight: "800", color: C.accent },
  guideBulletWrap: { width: 22, alignItems: "center", paddingTop: 8 },
  guideBulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.border },
  guideText: { flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 20 },
  guideDivider: { height: 1, backgroundColor: C.borderSoft, marginVertical: 6 },
  guideSectionTitle: { fontSize: 12, fontWeight: "700", color: C.textDim, letterSpacing: 0.8, textTransform: "uppercase" },

  inputLabel: { fontSize: 12, color: C.textMuted },
  input: {
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 8,
    padding: 10,
    color: C.text,
    backgroundColor: C.surface,
    flexDirection: "row",   // ← add this
    alignItems: "center",   // ← add this
  },
  submitBtn: { marginTop: 10, backgroundColor: C.accent, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "700" },

  inputDisabled: {
    opacity: 0.4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dropdown: {
    backgroundColor: "#1e1e2e",
    borderRadius: 12,
    width: "100%",
    maxHeight: 320,
    padding: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  dropdownTitle: {
    color: "#aaa",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: "#2a2a3e",
  },
});