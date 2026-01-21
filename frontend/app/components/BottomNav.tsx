import { StyleSheet, Text, View } from "react-native";
import { pickImageFromLibrary, takePhoto } from "../../utils/UseImagePicker";


export default function BottomNav() {

    const handleBrowseFiles = async () => {
        const imageUri = await pickImageFromLibrary();

        if (imageUri) {
        console.log("Selected image:", imageUri);
        // 👉 send to backend OR store in global state
        }
    };

    const handleTakePhoto = async () => {
        const imageUri = await takePhoto();

        if (imageUri) {
        console.log("Selected image:", imageUri);
        // 👉 send to backend OR store in global state
        }
    };

    return (
        <View style={styles.nav}>
        <Text onPress={handleBrowseFiles}>Browse Files</Text>
        <Text onPress={handleTakePhoto}>Take a Photo</Text>
        <Text>Scan</Text>
        </View>
    );
}

const styles = StyleSheet.create({
  nav: {
    height: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
});
