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
let storageQueue: Promise<void> = Promise.resolve();
const deniedListeners = new Set<(path: string, status: number) => void>();
export function onAccessDenied(
  listener: (path: string, status: number) => void,
) {
  deniedListeners.add(listener);
  return () => {
    deniedListeners.delete(listener);
  };
}
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
  token = value;
  if (Platform.OS !== "web") {
    storageQueue = storageQueue
      .catch(() => {})
      .then(() =>
        value
          ? SecureStore.setItemAsync("cuidali.session", value)
          : SecureStore.deleteItemAsync("cuidali.session"),
      );
    await storageQueue;
  }
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
  const requestToken = /^\/auth\/(login|register)$/.test(path) ? null : token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (
      !response.ok &&
      requestToken &&
      token === requestToken &&
      [401, 403, 404].includes(response.status)
    ) {
      deniedListeners.forEach((listener) => listener(path, response.status));
      if (response.status === 401) {
        const clearing = saveToken(null);
        onExpired();
        await clearing.catch(() => {});
      }
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "A API retornou uma resposta inválida. Verifique a conexão.",
      );
    }
    if (!response.ok) {
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
