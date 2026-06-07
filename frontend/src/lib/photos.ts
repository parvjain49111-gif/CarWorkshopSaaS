import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export type PhotoSource = "camera" | "library";

export async function pickPhoto(
  source: PhotoSource,
): Promise<string | null> {
  if (source === "camera") {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
    }
    const res = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.5,
      mediaTypes: ["images"],
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
  }

  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    base64: true,
    quality: 0.5,
    mediaTypes: ["images"],
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
}
