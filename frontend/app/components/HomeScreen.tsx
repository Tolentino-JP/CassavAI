import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  Alert,
  BackHandler,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  Text,
  ScrollView
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
  }
  individual_models: IndividualModelResult;
}

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
  const [scanBoxHeight, setScanBoxHeight] = useState(0);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const horizontalPadding = 16;
  const contentWidth = Math.min(width - horizontalPadding * 2, 520);
  const imageSize = Math.min(contentWidth, height * 0.48);
  const modalWidth = Math.min(contentWidth, 420);
  const mainPaddingBottom = height < 700 ? 36 : 70;

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    if (!isScanning) {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [isScanning, scanAnim]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        "Exit app",
        "Do you want to exit the app?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", style: "destructive", onPress: () => BackHandler.exitApp() },
        ]
      );
      return true;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);
  
  const startTimer = () => {
    const start = Date.now();

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - start);
    }, 50);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;

    if (totalSeconds < 60) {
      return `${totalSeconds.toFixed(2)}s`; 
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${minutes}:${seconds.toString().padStart(2, "0")}s`;
  };

  // Handlers for bottom navigation actions
  const handleBrowseFiles = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) {
      setImageUri(uri);
      setTopTab("scan");
      setResultsVisible(false);
    }
  };

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      setImageUri(uri);
      setTopTab("scan");
      setResultsVisible(false);
    }
  };

  const handleScan = async () => {

    if (!imageUri) {
      setErrorVisible(true);
      return;
    }

    if (isScanning) return;

    try {

      // Start animation
      setIsScanning(true);

      setElapsedTime(0);
      startTimer();

      // ---- SEND TO BACKEND ----
      const filename = imageUri.split("/").pop() ?? "photo.jpg";
      const type = filename.endsWith(".png")
        ? "image/png"
        : "image/jpeg";

      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      const response = await fetch("https://quadrantlike-artie-pokiest.ngrok-free.dev/predict", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Save result
      setResult(data);
      // Show results screen
      setResultsVisible(true);
      setTopTab("results");
      
    } catch (error) {
      
      console.error(error);
      alert("Failed to send image to backend");

    } finally {
      // Stop animation
      stopTimer();

      setIsScanning(false);
    }
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
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      const token = match[1] as GuideIconToken;
      nodes.push(
        <Ionicons
          key={`guide-icon-${token}-${iconIndex++}`}
          name={iconNameByToken[token]}
          size={16}
          color="#1f6f43"
        />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      {/* // Header area */}
      <View style={styles.header}>
        <Header />
      </View>

      {/* // Main content area */}
      <View style={styles.content}>
        {/* // Scan and Result tabs */}
        <View style={[styles.topTabsWrap, { width: contentWidth }]}>
          <View style={styles.topTabs}>
            <View style={[styles.tabPill, topTab === "scan" && styles.tabPillActive]}>
              <Ionicons name="arrow-up-outline" size={18} color="#0f172a" />
              <AppText weight="bold" style={styles.tabText}>Scan</AppText>
            </View>

            <View style={[styles.tab, topTab === "results" && styles.tabPillActive]}>
              <Ionicons name="checkbox-outline" size={18} color="#0f172a" />
              <AppText weight="bold" style={styles.tabText}>Results</AppText>
            </View>
          </View>
        </View>

        {/* // Main image and scanning area */}
        <View style={[styles.mainArea, { paddingBottom: mainPaddingBottom }]}>
          {/* // Guide Button */}
          <Pressable
            style={styles.infoFloating}
            onPress={() => setGuideVisible(true)}
          >
            <Ionicons name="information-circle-outline" size={28} color="#1f6f43" />
          </Pressable>

          {/* // Image Container */}
          <View style={[styles.imageWrap, { width: imageSize, height: imageSize }]}>
            <View
              style={styles.imageWrapInner}
              onLayout={(e) => setScanBoxHeight(e.nativeEvent.layout.height)}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} />
              ) : (
                <AppText weight="semibold" style={styles.placeholder}>
                  No image selected
                </AppText>
              )}
            </View>

            {imageUri && (
              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setImageUri(null);
                  setTopTab("scan");
                  setResultsVisible(false);
                  setIsScanning(false);
                }}
                hitSlop={10}
              >
                <Ionicons name="close" size={18} color="#1f2937" />
              </Pressable>
            )}

            {isScanning && (
              <View style={styles.scanOverlay} pointerEvents="none">
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(0, scanBoxHeight - 6)],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <View style={styles.scanHud}>
                  <ActivityIndicator color="#0f172a" />
                  <AppText weight="semibold" style={styles.scanText}>
                    {formatTime(elapsedTime)} Scanning...
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>


      {/* // Bottom navigation area */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomNav
          onBrowse={handleBrowseFiles}
          onCamera={handleTakePhoto}
          onScan={handleScan}
        />
      </View>

      <ModalCard
        visible={resultsVisible}
        title="Results"
        width={modalWidth}
        onClose={() => { setResultsVisible(false); setTopTab("scan"); }}
      >
        <ScrollView style={{ maxHeight: 500, backgroundColor: "#bfe7cc" }} contentContainerStyle={{ padding: 18 }}>
          {result && (
            <View style={styles.modalBody}>
              {result.error ? (
                <Text style={{ color: "red", textAlign: "center", fontSize: 30 }}>
                  {result.error}
                </Text>
              ) : (
                <>
                  {/*Show Annotated Image*/}
                  <Image
                    source={{
                      uri: `data:image/png;base64,${result.annotated_image_base64}`,
                    }}
                    style={{ width: 250, height: 250, alignSelf: "center" }}
                    resizeMode="contain"
                  />

                  <Text style={styles.textResult}>Processing Time</Text>
                  <Text>
                    {formatTime(elapsedTime)}
                  </Text>

                  {/*Detection Info*/}
                  <Text style={ styles.textResult }>
                    Object Detection
                  </Text>
                  <Text>
                    Label: {result.detection.label}
                  </Text>
                  <Text>
                    Confidence: {(result.detection.confidence) * 100}%
                  </Text>

                  {/*Classification Result*/}
                  <Text style={ styles.textResult }>Classification </Text>
                  <Text>
                    Class: {result.ensemble.class_name}
                  </Text>
                  <Text>
                    Confidence: {(result.ensemble.confidence)* 100}%
                  </Text>

                  <Text style={ styles.textResult }> Description:</Text>
                  <Text style={ { textAlign: "justify", marginTop:10} }>
                    {leafDescriptions[result.ensemble.class_name as keyof typeof leafDescriptions].description}
                  </Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </ModalCard>

      <ModalCard
        visible={errorVisible}
        title="Take a photo or select an image"
        width={modalWidth}
        onClose={() => setErrorVisible(false)}
      >
        <View style={styles.errorBody}>
          <Ionicons name="alert-circle-outline" size={28} color="#0f172a" />
          <AppText weight="semibold" style={styles.errorText}>
            Please select or take a photo before scanning.
          </AppText>
        </View>
      </ModalCard>

      <ModalCard
        visible={guideVisible}
        title="Guide"
        width={modalWidth}
        onClose={() => setGuideVisible(false)}
      >
        <ScrollView
          style={{ maxHeight: 500, backgroundColor: "#bfe7cc" }}
          contentContainerStyle={styles.guideContent}
        >
          <View style={styles.langToggle}>
            <Pressable
              style={[
                styles.langTogglePill,
                guideLanguage === "tl" && styles.langTogglePillActive,
              ]}
              onPress={() => setGuideLanguage("tl")}
              accessibilityRole="button"
              accessibilityState={{ selected: guideLanguage === "tl" }}
            >
              <AppText
                weight="bold"
                style={[
                  styles.langToggleText,
                  guideLanguage === "tl" && styles.langToggleTextActive,
                ]}
              >
                Tagalog
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.langTogglePill,
                guideLanguage === "en" && styles.langTogglePillActive,
              ]}
              onPress={() => setGuideLanguage("en")}
              accessibilityRole="button"
              accessibilityState={{ selected: guideLanguage === "en" }}
            >
              <AppText
                weight="bold"
                style={[
                  styles.langToggleText,
                  guideLanguage === "en" && styles.langToggleTextActive,
                ]}
              >
                English
              </AppText>
            </Pressable>
          </View>

          <AppText weight="semibold" style={styles.guideIntro}>
            {guideInstructions.intro[guideLanguage]}
          </AppText>

          {guideInstructions.steps[guideLanguage].map((step, index) => (
            <View key={`step-${index}`} style={styles.guideRow}>
              <AppText weight="bold" style={styles.guideNum}>
                {index + 1}.
              </AppText>
              <AppText style={styles.guideText}>{renderGuideText(step)}</AppText>
            </View>
          ))}

          <AppText weight="bold" style={styles.guideSectionTitle}>
            {guideInstructions.photoTipsTitle[guideLanguage]}
          </AppText>

          {guideInstructions.photoTips[guideLanguage].map((tip, index) => (
            <View key={`tip-${index}`} style={styles.guideRow}>
              <AppText weight="bold" style={styles.guideBullet}>
                •
              </AppText>
              <AppText style={styles.guideText}>{renderGuideText(tip)}</AppText>
            </View>
          ))}
        </ScrollView>
      </ModalCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flex: 1,
  },
  content: {
    flex: 7.5,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#bfe7cc",
    paddingTop: 14,
  },
  mainArea: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  infoFloating: {
    position: "absolute",
    right: 18,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabsWrap: {
    paddingHorizontal: 1,
    marginBottom: 12,
  },
  topTabs: {
    backgroundColor: "rgba(19, 170, 5, 0.35)",
    borderRadius: 22,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 10,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginHorizontal: 6,
    flex: 1,
  },
  tabPillActive: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 18,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    flex: 1,
  },
  tabText: {
    fontSize: 16,
    color: "#0f172a",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    resizeMode: "contain",
  },
  imageWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 2,
    borderStyle: "dotted",
    borderColor: "#1f6f43",
  },
  imageWrapInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    color: "#3a5b43",
    fontSize: 18,
    textAlign: "center",
    alignSelf: "center",
  },
  bottom: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scanOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  scanLine: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  scanHud: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  scanText: {
    color: "#0f172a",
    fontSize: 14,
  },
  modalBody: {
    minHeight: 260,
  },
  guideContent: {
    padding: 18,
  },
  guideIntro: {
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  guideSectionTitle: {
    fontSize: 14,
    color: "#0f172a",
    marginTop: 14,
    marginBottom: 10,
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  guideNum: {
    width: 22,
    fontSize: 14,
    color: "#1f6f43",
    paddingTop: 1,
  },
  guideBullet: {
    width: 22,
    fontSize: 16,
    color: "#1f6f43",
    lineHeight: 18,
  },
  guideText: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    lineHeight: 20,
  },
  langToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 6,
    borderRadius: 18,
    backgroundColor: "rgba(19, 170, 5, 0.35)",
    marginBottom: 12,
  },
  langTogglePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  langTogglePillActive: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  langToggleText: {
    fontSize: 14,
    color: "#0f172a",
  },
  langToggleTextActive: {
    color: "#1f6f43",
  },
  errorBody: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#0f172a",
    textAlign: "center",
  },
  textResult:{
    marginTop: 12,
    fontWeight: "bold",
  }
});

