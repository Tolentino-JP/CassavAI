import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AppText from "./AppText";

export default function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Image
          source={require('../../assets/images/cassavai_logo.png')}
          style={styles.image}
        />
        <View>
          <AppText weight="bold" style={styles.headerText}>CassavAI</AppText>
          <AppText style={styles.headerText2}>Cassava Leaf Disease Detection</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: "#ffffff", // white yung header sah
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  row: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 80,
    height: "80%",
    borderRadius: 25,
    marginRight: 10,
  },
  headerText: {
    fontSize: 35,
    fontWeight: "bold",
    color: "#1f6f43",
  },
  headerText2: {
    fontSize: 12,
    color: "#2dc270",
  },
});
