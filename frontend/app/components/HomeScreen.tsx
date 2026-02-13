import { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
import Header from "./Header";
import { pickImageFromLibrary, takePhoto } from "../../utils/UseImagePicker";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import ModalCard from "./ModalCard";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [topTab, setTopTab] = useState<"scan" | "results">("scan");
  const [isScanning, setIsScanning] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [scanBoxHeight, setScanBoxHeight] = useState(0);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const horizontalPadding = 16;
  const contentWidth = Math.min(width - horizontalPadding * 2, 520);
  const imageSize = Math.min(contentWidth, height * 0.48);
  const modalWidth = Math.min(contentWidth, 420);
  const mainPaddingBottom = height < 700 ? 36 : 70;

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

  const handleScan = () => {
    if (!imageUri) {
      setErrorVisible(true);
      return;
    }
    if (isScanning) return;

    setIsScanning(true);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      setResultsVisible(true);
      setTopTab("results");
      scanTimeoutRef.current = null;
    }, 1400);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Header />
      </View>

      <View style={styles.content}>
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

        <View style={[styles.mainArea, { paddingBottom: mainPaddingBottom }]}>
          <Pressable
            style={styles.infoFloating}
            onPress={() => setGuideVisible(true)}
          >
            <Ionicons name="information-circle-outline" size={28} color="#1f6f43" />
          </Pressable>

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
                    Scanning...
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

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
        onClose={() => setResultsVisible(false)}
      >
        <View style={styles.modalBody} />
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
        <View style={styles.modalBody} />
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
    height: 260,
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
});
