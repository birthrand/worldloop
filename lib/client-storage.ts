import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readCacheString(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function writeCacheString(
  key: string,
  value: string,
): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function deleteCacheKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function getAllCacheKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => k.startsWith("cache:"));
}
