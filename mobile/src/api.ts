import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
export type User = {
  id: number;
  name: string;
  phone: string;
  role: "elder" | "caregiver";
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const base = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
let token: string | null = null;
let onExpired: () => void = () => {};
export function setExpiredHandler(handler: () => void) {
  onExpired = handler;
}
export async function restoreToken() {
  token =
    Platform.OS === "web"
      ? null
      : await SecureStore.getItemAsync("cuidali.session");
  return token;
}
export async function saveToken(value: string | null) {
  if (Platform.OS !== "web") {
    if (value) await SecureStore.setItemAsync("cuidali.session", value);
    else await SecureStore.deleteItemAsync("cuidali.session");
  }
  token = value;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (!base)
    throw new Error(
      "Configure EXPO_PUBLIC_API_URL no arquivo mobile/.env para conectar à API.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "A API retornou uma resposta inválida. Verifique a conexão.",
      );
    }
    if (!response.ok) {
      if (response.status === 401 && token) {
        await saveToken(null);
        onExpired();
      }
      throw new ApiError(
        response.status,
        result.error || "Não foi possível concluir.",
      );
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (
      error instanceof Error &&
      /Configure|resposta inválida/.test(error.message)
    )
      throw error;
    throw new Error(
      "Não foi possível conectar à API. Verifique sua conexão e tente novamente.",
    );
  } finally {
    clearTimeout(timer);
  }
}
