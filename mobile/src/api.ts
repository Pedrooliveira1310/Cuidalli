import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { normalizeServer } from "./server";
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
const buildAddress = process.env.EXPO_PUBLIC_API_URL || "";
export const androidWebPackage = buildAddress === "cuidali-android-same-origin" && Platform.OS === "web";
let base = (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : buildAddress).replace(/\/$/, "");
export function getServer() { return base; }
export async function restoreServer() {
  if (Platform.OS !== "web") {
    const stored = await SecureStore.getItemAsync("cuidali.server");
    if (stored) base = normalizeServer(stored);
  }
  return base;
}
export async function checkServer(value: string) {
  const address = normalizeServer(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${address}/health`, { signal: controller.signal });
    const result = await response.json();
    if (!response.ok || result.status !== "ok") throw new Error();
    return address;
  } catch {
    throw new Error("Servidor indisponível. Confira sua conexão e tente novamente.");
  } finally { clearTimeout(timer); }
}
export async function saveServer(value: string) {
  const address = normalizeServer(value);
  // A sessão de um servidor nunca deve ser enviada a outro.
  await saveToken(null);
  if (Platform.OS !== "web") await SecureStore.setItemAsync("cuidali.server", address);
  base = address;
}
let token: string | null = null;
let usingCookie = false;
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
      ? (window.CuidaliNative?.restoreSession() || null)
      : await SecureStore.getItemAsync("cuidali.session");
  usingCookie = Platform.OS === "web" && typeof window !== "undefined" && !window.CuidaliNative;
  return token || (usingCookie ? "cookie" : null);
}
export async function saveToken(value: string | null) {
  token = value;
  usingCookie = false;
  if (Platform.OS === "web" && typeof window !== "undefined" && window.CuidaliNative) window.CuidaliNative.configureSession(value || "");
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
      "Não foi possível conectar ao Cuidali. Tente novamente em instantes.",
    );
  const requestToken = /^\/auth\/(login|register)$/.test(path) ? null : token;
  const cookieRequest = usingCookie;
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
      (requestToken || cookieRequest) &&
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
