import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "./BottomNav";
import Header from "./Header";

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>

      <View style={styles.header}>
        <Header />
      </View>
      
      <View style={styles.content}>
        <Text>Main content goes here</Text>
      </View>
  
      <View style={styles.bottom}>
        <BottomNav />
      </View>


    </SafeAreaView>
    
  )
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#b1f6c8"
  },
  bottom: {
    flex: 1.5,
    backgroundColor: "#eee",
  },
});

