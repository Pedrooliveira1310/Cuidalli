import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
export const colors = {
  blue: "#3B659D",
  dark: "#1A365D",
  light: "#CEE1F4",
  yellow: "#F3D7A0",
  red: "#9E3131",
  green: "#267244",
  bg: "#F7FAFC",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.dark },
  subtitle: { fontSize: 22, fontWeight: "700", color: colors.dark },
  text: { fontSize: 18, color: "#303842", lineHeight: 26 },
  muted: { fontSize: 16, color: "#555D67", lineHeight: 23 },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D5DAE1",
    gap: 12,
  },
  button: {
    minHeight: 56,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.blue,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#7B8490",
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    backgroundColor: "#FFF",
    color: "#1A2635",
  },
  label: { fontSize: 18, fontWeight: "600", color: "#303842" },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  error: { color: colors.red, fontSize: 18, lineHeight: 26 },
  success: { color: colors.green, fontSize: 18, lineHeight: 26 },
});
export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  tone = "blue",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "blue" | "red" | "light";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor:
            tone === "red"
              ? colors.red
              : tone === "light"
                ? "#E6EDF6"
                : colors.blue,
          opacity: busy || disabled ? 0.6 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            tone === "light" && { color: colors.dark },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export type Field = {
  key: string;
  label: string;
  placeholder?: string;
  secure?: boolean;
  phone?: boolean;
  numeric?: boolean;
  optional?: boolean;
  toggle?: boolean;
};
export function Form({
  fields,
  initial = {},
  submit,
  onSave,
  onCancel,
}: {
  fields: Field[];
  initial?: Record<string, any>;
  submit: string;
  onSave: (values: any) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    if (busy) return;
    setError("");
    if (
      fields.some(
        (f) => !f.optional && !f.toggle && !String(values[f.key] ?? "").trim(),
      )
    ) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setBusy(true);
    try {
      await onSave(values);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      {fields.map((f) => (
        <View key={f.key} style={{ gap: 8 }}>
          <Text style={styles.label}>
            {f.label}
            {f.optional ? " (opcional)" : ""}
          </Text>
          {f.toggle ? (
            <Switch
              accessibilityLabel={f.label}
              value={!!values[f.key]}
              onValueChange={(v) => setValues({ ...values, [f.key]: v })}
            />
          ) : (
            <TextInput
              accessibilityLabel={f.label}
              editable={!busy}
              style={styles.input}
              placeholder={f.placeholder}
              placeholderTextColor="#626C78"
              value={String(values[f.key] ?? "")}
              secureTextEntry={f.secure}
              autoCapitalize="none"
              keyboardType={
                f.phone ? "phone-pad" : f.numeric ? "number-pad" : "default"
              }
              onChangeText={(v) => setValues({ ...values, [f.key]: v })}
            />
          )}
        </View>
      ))}
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button label={submit} onPress={save} busy={busy} />
      {onCancel && (
        <Button
          label="Cancelar"
          tone="light"
          onPress={onCancel}
          disabled={busy}
        />
      )}
    </View>
  );
}
export function confirmAction(message: string, action: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(message)) action();
  } else
    Alert.alert("Confirmar", message, [
      { text: "Voltar", style: "cancel" },
      { text: "Confirmar", style: "destructive", onPress: action },
    ]);
}
export function Card({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "blue" | "yellow";
}) {
  return (
    <View
      style={[
        styles.card,
        tone && {
          backgroundColor: tone === "blue" ? colors.light : colors.yellow,
          borderWidth: 0,
        },
      ]}
    >
      {children}
    </View>
  );
}
export function dateTime(utc: string) {
  return new Date(utc.replace(" ", "T") + "Z").toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}
export function localInput(utc: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(utc.replace(" ", "T") + "Z"));
  return parts.replace(" ", "T");
}
