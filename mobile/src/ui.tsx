import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
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
import {
  filterPhone,
  filterCode,
  isoDate,
  isoDateTime,
  validTime,
  todaySP,
  numericMask,
} from "./validation";
export const FormBusy = createContext(false);
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
  const formBusy = useContext(FormBusy);
  disabled = disabled || formBusy;
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
function kindOf(f: Field) {
  return f.key === "scheduled_at"
    ? "datetime-local"
    : /date$/.test(f.key)
      ? "date"
      : "text";
}
function maxOf(f: Field) {
  if (kindOf(f) === "date") return 10;
  if (kindOf(f) === "datetime-local") return 16;
  if (f.phone) return 30;
  if (f.secure) return 72;
  if (f.key === "code") return 12;
  if (f.key === "notes") return 1000;
  if (/relationship|dosage/.test(f.key)) return 60;
  if (f.key === "location") return 200;
  return 100;
}
export function Form({
  fields,
  initial = {},
  submit,
  onSave,
  onCancel,
  onBusyChange,
}: {
  fields: Field[];
  initial?: Record<string, any>;
  submit: string;
  onSave: (values: any) => Promise<void>;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v = { ...initial };
    if (fields.some((f) => f.key === "times"))
      v.times = Array.isArray(v.times) ? v.times : [""];
    if (Platform.OS !== "web")
      for (const f of fields) {
        if (kindOf(f) === "date" && v[f.key]) v[f.key] = calendarDate(v[f.key]);
        if (kindOf(f) === "datetime-local" && v[f.key]) {
          const [d, t] = v[f.key].split("T");
          v[f.key] = `${calendarDate(d)} ${t}`;
        }
      }
    return v;
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [shown, setShown] = useState(false);
  const locked = useRef(false),
    refs = useRef<Record<string, any>>({});
  function change(key: string, value: any) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!busy && pendingFocus.current) {
      const key = pendingFocus.current;
      pendingFocus.current = null;
      (refs.current[key] || refs.current[key + "0"])?.focus();
    }
  }, [busy]);
  async function save() {
    if (locked.current) return;
    const payload = { ...values },
      issues: Record<string, string> = {};
    let missing = false;
    for (const f of fields) {
      const raw = String(values[f.key] ?? "").trim();
      if (!f.optional && !f.toggle && !raw) {
        issues[f.key] = "Preencha este campo.";
        missing = true;
        continue;
      }
      if (f.toggle) continue;
      if (f.phone && !/^[0-9]{10,15}$/.test(raw.replace(/[\s()+. -]/g, "")))
        issues[f.key] = "Informe telefone com DDD (10 a 15 dígitos).";
      if (f.key === "code" && !/^[A-F0-9]{12}$/.test(raw))
        issues[f.key] = "Informe os 12 caracteres hexadecimais do código.";
      if (f.key === "times") {
        const times: string[] = values.times || [];
        if (
          times.length < 1 ||
          times.length > 24 ||
          times.some((t) => !validTime(t))
        )
          issues.times = "Complete de 1 a 24 horários válidos (HH:MM).";
        else if (new Set(times).size !== times.length)
          issues.times = "Não repita horários.";
      }
      if (kindOf(f) === "date") {
        const d = isoDate(raw);
        if (!d) issues[f.key] = "Informe uma data válida.";
        else {
          payload[f.key] = d;
          if (f.key === "birth_date" && (d < "1900-01-01" || d > todaySP()))
            issues[f.key] = "Nascimento deve estar entre 1900 e hoje.";
        }
      }
      if (kindOf(f) === "datetime-local") {
        const d = isoDateTime(raw);
        if (!d) issues[f.key] = "Informe data e horário válidos.";
        else payload[f.key] = d;
      }
      if (
        f.secure &&
        (Array.from(raw).reduce(
          (n, c) =>
            n +
            (c.codePointAt(0)! > 0xffff
              ? 4
              : c.codePointAt(0)! > 0x7ff
                ? 3
                : c.codePointAt(0)! > 0x7f
                  ? 2
                  : 1),
          0,
        ) > 72 ||
          (submit === "Criar conta" && Array.from(raw).length < 8))
      )
        issues[f.key] =
          "A senha deve ter ao menos 8 caracteres e no máximo 72 bytes.";
    }
    if (
      payload.start_date &&
      payload.end_date &&
      payload.end_date < payload.start_date
    )
      issues.end_date =
        "O fim do tratamento deve ser igual ou posterior ao início.";
    setErrors(issues);
    setError(missing ? "Preencha todos os campos obrigatórios." : "");
    const first = fields.find((f) => issues[f.key]);
    if (first) {
      (refs.current[first.key] || refs.current[first.key + "0"])?.focus();
      return;
    }
    locked.current = true;
    setBusy(true);
    onBusyChange?.(true);
    try {
      await onSave(payload);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Não foi possível salvar.";
      const field = fields.find((f) => {
        const name =
          (
            {
              phone: "telefone",
              password: "senha",
              birth_date: "nascimento",
              code: "código",
              end_date: "fim do tratamento",
              notes: "observação",
              times: "horário",
            } as Record<string, string>
          )[f.key] || f.label.toLowerCase();
        return message.toLowerCase().includes(name);
      });
      if (field) {
        setErrors({ [field.key]: message });
        pendingFocus.current = field.key;
      } else setError(message);
    } finally {
      locked.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  function input(
    f: Field,
    key = f.key,
    value = values[f.key],
    onChange = (v: string) => change(f.key, v),
    type = kindOf(f),
  ) {
    const multiline = f.key === "notes";
    const autoComplete = f.phone
      ? "tel"
      : f.secure
        ? submit === "Criar conta"
          ? "new-password"
          : "current-password"
        : /name/.test(f.key)
          ? "name"
          : "off";
    const update = (v: string) => {
      if (f.phone) v = filterPhone(v);
      if (f.key === "code") v = filterCode(v);
      if (
        Platform.OS !== "web" &&
        ["date", "datetime-local", "time"].includes(type)
      )
        v = numericMask(v, type as any);
      onChange(v);
    };
    const common = {
      "aria-label": f.label,
      disabled: busy,
      value: String(value ?? ""),
      maxLength: maxOf(f),
      autoComplete,
      ref: (node: any) => {
        refs.current[key] = node;
      },
      style: {
        minHeight: 56,
        border: `${errors[f.key] ? 2 : 1}px solid ${errors[f.key] ? colors.red : "#7B8490"}`,
        borderRadius: 12,
        padding: 14,
        fontSize: 18,
        color: "#1A2635",
        backgroundColor: "white",
        width: "100%",
        boxSizing: "border-box" as const,
      },
      onChange: (event: any) => update(event.target.value),
      "aria-invalid": !!errors[f.key],
    };
    if (Platform.OS === "web")
      return multiline
        ? React.createElement("textarea", { ...common, rows: 4 })
        : React.createElement("input", {
            ...common,
            type: f.secure
              ? shown
                ? "text"
                : "password"
              : f.phone
                ? "tel"
                : type,
            ...(f.key === "birth_date"
              ? { min: "1900-01-01", max: todaySP() }
              : {}),
          });
    return (
      <TextInput
        ref={(node) => {
          refs.current[key] = node;
        }}
        accessibilityLabel={f.label}
        accessibilityState={{ disabled: busy }}
        editable={!busy}
        style={[
          styles.input,
          multiline && { minHeight: 120, textAlignVertical: "top" },
          !!errors[f.key] && { borderColor: colors.red, borderWidth: 2 },
        ]}
        placeholder={f.placeholder}
        value={String(value ?? "")}
        secureTextEntry={f.secure && !shown}
        autoComplete={autoComplete}
        autoCapitalize={f.key === "code" ? "characters" : "none"}
        multiline={multiline}
        maxLength={maxOf(f)}
        keyboardType={
          f.phone
            ? "phone-pad"
            : ["date", "datetime-local", "time"].includes(type) || f.numeric
              ? "number-pad"
              : "default"
        }
        onChangeText={update}
      />
    );
  }
  return (
    <FormBusy.Provider value={busy}>
      <View style={{ gap: 16 }}>
        {fields.map((f) => (
          <View key={f.key} style={{ gap: 8 }}>
            <Text style={styles.label}>
              {f.key === "times" ? "Horários" : f.label}
              {f.optional ? " (opcional)" : ""}
            </Text>
            {f.toggle ? (
              <Switch
                accessibilityLabel={f.label}
                disabled={busy}
                value={!!values[f.key]}
                onValueChange={(v) => change(f.key, v)}
              />
            ) : f.key === "times" ? (
              <>
                {(values.times as string[]).map((time, i) => (
                  <View key={i} style={{ gap: 8 }}>
                    {input(
                      { ...f, label: `Horário ${i + 1}` },
                      "times" + i,
                      time,
                      (v) => {
                        const times = [...values.times];
                        times[i] = v;
                        change("times", times);
                      },
                      "time",
                    )}
                    <Button
                      label={`Remover horário ${i + 1}`}
                      disabled={busy || values.times.length === 1}
                      tone="light"
                      onPress={() =>
                        change(
                          "times",
                          values.times.filter(
                            (_: string, j: number) => i !== j,
                          ),
                        )
                      }
                    />
                  </View>
                ))}
                <Button
                  label="Adicionar horário"
                  disabled={busy || values.times.length >= 24}
                  tone="light"
                  onPress={() => change("times", [...values.times, ""])}
                />
              </>
            ) : (
              input(f)
            )}
            {f.secure && (
              <Button
                label={shown ? "Ocultar senha" : "Mostrar senha"}
                disabled={busy}
                tone="light"
                onPress={() => setShown(!shown)}
              />
            )}
            {!!errors[f.key] && (
              <Text accessibilityRole="alert" style={styles.error}>
                {errors[f.key]}
              </Text>
            )}
          </View>
        ))}
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
      <View style={{ gap: 16, marginTop: 16 }}>
        <Button label={submit} onPress={save} busy={busy} disabled={busy} />
        {onCancel && (
          <Button
            label="Cancelar"
            tone="light"
            onPress={onCancel}
            disabled={busy}
          />
        )}
      </View>
    </FormBusy.Provider>
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

export function calendarDate(value: string) {
  return value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3/$2/$1");
}
