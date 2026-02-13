import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
type BottomNavProps = {
  onBrowse: () => void;
  onCamera: () => void;
  onScan: () => void;
};

export default function BottomNav({ onBrowse, onCamera, onScan }: BottomNavProps) {
  return (
    <View style={styles.nav}>
      <Pressable style={styles.sideAction} onPress={onBrowse}>
        <View style={styles.iconCircle}>
          <Ionicons name="image-outline" size={18} color="#1f6f43" />
        </View>
      </Pressable>

      <Pressable style={styles.scanButton} onPress={onCamera}>
        <View style={styles.scanOuter}>
          <View style={styles.scanInner}>
            <Ionicons name="camera-outline" size={22} color="#fff" />
          </View>
        </View>
      </Pressable>

      <Pressable style={styles.sideAction} onPress={onScan}>
        <View style={styles.iconCircle}>
          <Ionicons name="scan-outline" size={18} color="#1f6f43" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: "110%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    paddingBottom: 3,
    paddingTop: 3,
  },
  sideAction: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 0,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#1f6f43",
    alignItems: "center",
    justifyContent: "center",
  },
  scanButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -0,
  },
  scanOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#1f6f43",
    alignItems: "center",
    justifyContent: "center",
  },
  scanInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1f6f43",
    alignItems: "center",
    justifyContent: "center",
  },
});
