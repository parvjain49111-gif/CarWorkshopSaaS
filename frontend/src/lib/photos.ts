import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Platform } from "react-native";

export type PhotoSource = "camera" | "library";

const MAX_WIDTH = 1280; // px — keeps photos sharp but well under 1MB after JPEG compression
const COMPRESS = 0.55; // 0–1, JPEG quality

async function compressToBase64(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_WIDTH } }],
      {
        compress: COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
    return uri;
  } catch (e) {
    console.warn("image compress failed", e);
    return uri;
  }
}

export async function pickPhoto(
  source: PhotoSource,
): Promise<string | null> {
  if (source === "camera") {
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
    }
    const res = await ImagePicker.launchCameraAsync({
      // Don't request base64 here — manipulator will produce the resized base64.
      quality: 1,
      mediaTypes: ["images"],
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    return await compressToBase64(res.assets[0].uri);
  }

  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    quality: 1,
    mediaTypes: ["images"],
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return await compressToBase64(res.assets[0].uri);
}
