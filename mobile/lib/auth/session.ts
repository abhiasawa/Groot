import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "supabase-jwt";

/**
 * Retrieve the stored Supabase JWT from secure storage.
 */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Persist a Supabase JWT to secure storage.
 */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Remove the stored Supabase JWT from secure storage.
 */
export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
