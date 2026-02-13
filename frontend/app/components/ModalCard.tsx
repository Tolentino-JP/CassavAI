import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";

type ModalCardProps = {
  visible: boolean;
  title: string;
  width: number;
  onClose: () => void;
  children?: ReactNode;
};

export default function ModalCard({
  visible,
  title,
  width,
  onClose,
  children,
}: ModalCardProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { width }]}>
          <View style={styles.header}>
            <AppText weight="bold" style={styles.title}>
              {title}
            </AppText>
            <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  header: {
    height: 54,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    color: "#0f172a",
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
});
