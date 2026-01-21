import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Image
          source={require('../../assets/images/human.jpg')}
          style={styles.image}
        />
        <View>
          <Text style={styles.headerText}>CassavAI</Text>
          <Text style={styles.headerText2}>Cassava Leaf Disease Detection</Text>
        </View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: "100%", // You can set a fixed height for the header
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-start",
    backgroundColor: "#b6b1b1ff",
    paddingHorizontal: 10, // Optional padding
  },
  row: {
    height: "100%",
    flexDirection: "row", // This makes children appear in a row
    alignItems: "center", // Vertically center the image and text
  },
  image: {
    width: 80,
    height: "80%",
    borderRadius: 25, // optional: makes it a circle
    marginRight: 10, // spacing between image and text
  },
  headerText: {
    fontSize: 35,
    fontWeight: "bold",
  },
  headerText2: {
    fontSize: 12,
  },
});
