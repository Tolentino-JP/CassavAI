import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Button, Image, View } from 'react-native';
import AppText from "./AppText";

export default function Predict() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const pickImage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      aspect: [4, 3],
    });

    if (!res.canceled) {
      setImage(res.assets[0].uri);
    }
  };

  const sendToBackend = async () => {
    
    if (!image) {
        alert("Please select an image first");
        return;
    }
    
    const filename = image.split("/").pop() ?? "photo.jpg";
    const type = "image/jpeg";

    const formData = new FormData();
    formData.append("file", {
      uri: image,
      name: filename,
      type: type,
    } as any);

    const response = await fetch("http://192.168.254.112:8000/predict", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setResult(JSON.stringify(data, null, 2));
  };

  return (
    <View style={{ marginTop: 80, padding: 20 }}>
      <Button title="Pick Image" onPress={pickImage} />

      {image && <Image source={{ uri: image }} style={{ width: 300, height: 300 }} />}

      <Button title="Send to Backend" onPress={sendToBackend} />

      {result && <AppText>{result}</AppText>}
    </View>
  );
}
