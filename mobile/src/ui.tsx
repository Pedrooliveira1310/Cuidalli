import {ElderLayout, ElderPages, ElderViewport} from "./ElderPages";
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
  Image,
} from "react-native";
import {
  filterPhone,
  filterCode,
  isoDate,
  isoDateTime,
  validTime,
  todaySP,
  numericMask,
  passwordError,
  passwordHelp,
  latestBirthDate,
} from "./validation";
export const FormBusy = createContext(false);
export function BackButton({onPress,label='Voltar'}:{onPress:()=>void;label?:string}) {
 return <Pressable accessibilityRole="button" accessibilityLabel={'Voltar'+(label==='Voltar'?'':' · '+label)} onPress={onPress} style={{minHeight:48,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8,paddingVertical:8}}><Text style={{fontSize:28,color:colors.blue}}>←</Text><Text style={{fontSize:18,fontWeight:'600',color:colors.blue}}>{label}</Text></Pressable>;
}
export const colors = {
  blue: "#225BA5",
  dark: "#122843",
  light: "#E8F1FD",
  yellow: "#F2D6A2",
  red: "#A62836",
  green: "#14675C",
  bg: "#F3F7F8",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  title: { fontSize: 32, lineHeight: 40, fontWeight: "800", letterSpacing: -0.8, color: colors.dark },
  subtitle: { fontSize: 22, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3, color: colors.dark },
  text: { fontSize: 18, color: "#35475F", lineHeight: 26 },
  muted: { fontSize: 16, color: "#4D6079", lineHeight: 23 },
  card: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D7E3E8",
    gap: 14,
    boxShadow: "0 3px 12px rgba(18,40,67,0.04)",
  },
  button: {
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 13,
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
    borderColor: "#879CB5",
    borderRadius: 12,
    padding: 16,
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
const buttonColors = {
  blue: { rest: colors.blue, active: "#174781" },
  red: { rest: colors.red, active: "#84202B" },
  light: { rest: "#EAF1FB", active: "#DCE9FA" },
};
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
  const room = useContext(ElderViewport);
  const compact = useContext(ElderLayout) && room > 0 && room < 540;
  const formBusy = useContext(FormBusy);
  disabled = disabled || formBusy;
  const palette = buttonColors[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        compact && {minHeight:44,paddingHorizontal:12,paddingVertical:8},
        {
          backgroundColor: pressed || hovered ? palette.active : palette.rest,
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
  newPassword?: boolean;
  birthMinAge?: number;
  phone?: boolean;
  numeric?: boolean;
  optional?: boolean;
  toggle?: boolean;
  choices?: readonly {value:string; label:string}[];
};
export const sexField:Field={
  key:"sex",label:"Sexo",
  choices:[{value:"male",label:"Masculino"},{value:"female",label:"Feminino"}],
};
function kindOf(f: Field) {
  return f.key === "scheduled_at"
    ? "datetime-local"
    : f.key === "email" ? "email" : /date$/.test(f.key)
      ? "date"
      : "text";
}
function maxOf(f: Field) {
  if (kindOf(f) === "date") return 10;
  if (kindOf(f) === "datetime-local") return 16;
  if (f.key === "recovery_code") return 6;
  if (f.key === "email") return 254;
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
  const elder = useContext(ElderLayout);
  const room = useContext(ElderViewport);
  const shortForm = elder && room > 0 && room < 420;
  const [jump, setJump] = useState<{index:number}>();
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
    [shown, setShown] = useState<Record<string,boolean>>({});
  const multiplePasswords=fields.filter(field=>field.secure).length>1;
  const locked = useRef(false),
    refs = useRef<Record<string, any>>({});
  function change(key: string, value: any) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }
  const pendingFocus = useRef<string | null>(null);
  function focusPending() {
    const key = pendingFocus.current;
    if (busy || !key) return;
    const field = refs.current[key] || refs.current[key+"0"];
    if (!field) return;
    pendingFocus.current = null;
    field.focus();
  }
  useEffect(focusPending, [busy]);
  function registerInput(key: string, input: {focus: () => void} | null) {
    refs.current[key] = input;
    if (input) focusPending();
  }
  async function save() {
    if (locked.current) return;
    const payload = { ...values },
      issues: Record<string, string> = {};
    let missing = false;
    for (const f of fields) {
      const raw = String(values[f.key] ?? "").trim();
      if (!f.optional && !f.toggle && !raw) {
        issues[f.key] = f.choices ? "Selecione uma opção." : "Preencha este campo.";
        missing = true;
        continue;
      }
      if (f.optional && !raw) continue;
      if (f.toggle) continue;
      if (f.choices && !f.choices.some(choice=>choice.value===raw)) issues[f.key]="Selecione uma opção válida.";
      if (f.key === "email" && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) issues.email="Informe um e-mail válido.";
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
          else if (f.key==="birth_date" && f.birthMinAge && d>latestBirthDate(f.birthMinAge))
            issues[f.key] = `Este perfil é para quem já completou ${f.birthMinAge} anos.`;
        }
      }
      if (kindOf(f) === "datetime-local") {
        const d = isoDateTime(raw);
        if (!d) issues[f.key] = "Informe data e horário válidos.";
        else payload[f.key] = d;
      }
      if (f.secure) {
        const issue = passwordError(raw,!!f.newPassword && f.key==="password");
        if (issue) issues[f.key] = issue;
      }
    }
    if (
      payload.start_date &&
      payload.end_date &&
      payload.end_date < payload.start_date
    )
      issues.end_date =
        "O fim do tratamento deve ser igual ou posterior ao início.";
    if (fields.some(field => field.key === "confirm_password") && values.confirm_password !== values.password)
      issues.confirm_password = "As novas senhas não coincidem.";
    setErrors(issues);
    setError(missing ? "Preencha todos os campos obrigatórios." : "");
    const first = fields.find((f) => issues[f.key]);
    if (first) {
      if (elder) setJump({index:fields.indexOf(first)});
      pendingFocus.current = first.key;
      focusPending();
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
      const currentPassword = /senha atual/i.test(message)
        ? fields.find(field => field.key === "current_password") : undefined;
      const field = currentPassword ?? fields.find((f) => {
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
        if (elder) setJump({index:fields.indexOf(field)});
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
        ? f.newPassword
          ? "new-password"
          : "current-password"
        : f.key === "email" ? "email" : /name/.test(f.key)
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
      ref: (node: HTMLInputElement | HTMLTextAreaElement | null) => registerInput(key,node),
      style: {
        minHeight: 56,
        border: `${errors[f.key] ? 2 : 1}px solid ${errors[f.key] ? colors.red : "#7B8490"}`,
        borderRadius: 12,
        padding: 14,
        ...(f.secure && {paddingRight:60}),
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
        ? React.createElement("textarea", { ...common, rows: shortForm ? 2 : 4 })
        : React.createElement("input", {
            ...common,
            type: f.secure
              ? shown[f.key]
                ? "text"
                : "password"
              : f.phone
                ? "tel"
                : type,
            ...(f.key === "birth_date"
              ? { min: "1900-01-01", max: latestBirthDate(f.birthMinAge) }
              : f.key==="end_date" ? {min:isoDate(String(values.start_date??""))??undefined} : {}),
          });
    return (
      <TextInput
        ref={(node) => registerInput(key,node)}
        accessibilityLabel={f.label}
        accessibilityState={{ disabled: busy }}
        editable={!busy}
        style={[
          styles.input,
          f.secure && {paddingRight:60},
          multiline && { minHeight: shortForm ? 68 : 120, textAlignVertical: "top" },
          !!errors[f.key] && { borderColor: colors.red, borderWidth: 2 },
        ]}
        placeholder={f.placeholder}
        value={String(value ?? "")}
        secureTextEntry={f.secure && !shown[f.key]}
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
  const inputs = fields.map((f) => (
          <View key={f.key} style={{ gap: 8 }}>
            <Text style={styles.label}>
              {f.key === "times" ? "Horários" : f.label}
              {f.optional ? " (opcional)" : ""}
            </Text>
            {f.choices ? (
              <View accessibilityRole="radiogroup" accessibilityLabel={f.label} style={styles.row}>
                {f.choices.map((choice,index)=>{
                  const checked=values[f.key]===choice.value;
                  return <Pressable key={choice.value}
                    ref={index===0 ? element=>registerInput(f.key,element) : undefined}
                    accessibilityRole="radio" accessibilityLabel={choice.label}
                    accessibilityState={{checked,disabled:busy}} disabled={busy} onPress={()=>change(f.key,choice.value)}
                    style={({pressed})=>[styles.button,{minHeight:46,borderWidth:1,
                      borderColor:checked?colors.blue:"#C6D9ED",backgroundColor:checked?colors.blue:pressed?"#D8E8FA":colors.light}]}>
                    <Text style={[styles.buttonText,{color:checked?"#FFF":colors.dark}]}>{checked?"✓ ":""}{choice.label}</Text>
                  </Pressable>;
                })}
              </View>
            ) : f.toggle ? (
              <Switch
                accessibilityLabel={f.label}
                disabled={busy}
                value={!!values[f.key]}
                onValueChange={(v) => change(f.key, v)}
              />
            ) : f.key === "times" ? (
              <>
                <ElderPages label="Horário">{(values.times as string[]).map((time, i) => (
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
                ))}</ElderPages>
                <Button
                  label="Adicionar horário"
                  disabled={busy || values.times.length >= 24}
                  tone="light"
                  onPress={() => change("times", [...values.times, ""])}
                />
              </>
            ) : f.secure ? (
              <View>
                {input(f)}
                <Pressable accessibilityRole="button"
                  accessibilityLabel={(shown[f.key]?"Ocultar senha":"Mostrar senha")+(multiplePasswords?" · "+f.label:"")}
                  accessibilityState={{disabled:busy}} disabled={busy}
                  onPress={()=>setShown(current=>({...current,[f.key]:!current[f.key]}))}
                  style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>({
                    position:"absolute",right:4,top:4,width:48,height:48,borderRadius:9,
                    alignItems:"center",justifyContent:"center",
                    backgroundColor:pressed||hovered?colors.light:"transparent",opacity:busy ? .55 : 1,
                  })}>
                  <Image accessible={false} aria-hidden
                    source={shown[f.key]?require("../assets/brand/icone-ocultar-senha.png"):require("../assets/brand/icone-mostrar-senha.png")}
                    style={{width:24,height:24,tintColor:colors.blue}} resizeMode="contain"/>
                </Pressable>
              </View>
            ) : input(f)}
            {f.newPassword && f.key==="password" && !errors[f.key] &&
              <Text style={styles.muted}>{passwordHelp}</Text>}
            {!!errors[f.key] && (
              <Text accessibilityRole="alert" style={styles.error}>
                {errors[f.key]}
              </Text>
            )}
          </View>        ));
  const feedback = !!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>;
  if (elder && fields.length === 1 && fields[0].key !== "times") return (
    <FormBusy.Provider value={busy}>
      <View style={{gap:8}}>
        {inputs}{feedback}
        <View style={styles.row}>
          <Button label={submit} onPress={save} busy={busy} />
          {onCancel && <Button label="Cancelar" tone="light" onPress={onCancel} disabled={busy} />}
        </View>
      </View>
    </FormBusy.Provider>
  );
  if (elder) return <FormBusy.Provider value={busy}>
    <ElderPages label="Campo" jump={jump}>
      {inputs}
      <View key="save" style={{gap:8}}>
        {feedback}
        <Button label={submit} onPress={save} busy={busy} />
      </View>
    </ElderPages>
    {onCancel && <Button label="Cancelar" tone="light" onPress={onCancel} disabled={busy} />}
  </FormBusy.Provider>;
  return (
    <FormBusy.Provider value={busy}>
      <View style={{gap:16}}>{inputs}{feedback}</View>
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
  flat = false,
}: {
  children: React.ReactNode;
  tone?: "blue" | "yellow" | "danger";
  flat?: boolean;
}) {
  const room = useContext(ElderViewport);
  const compact = useContext(ElderLayout) && room > 0 && room < 540;
  const palette = {
    blue: {backgroundColor:"#F8FBFF",borderColor:"#D7E5F8"},
    yellow: {backgroundColor:"#FFF9ED",borderColor:"#EAD8B4"},
    danger: {backgroundColor:"#FFF3F2",borderColor:"#E9C4C4"},
  };
  return (
    <View
      style={[
        flat ? {gap:8} : styles.card,
        !flat && compact && {padding:12,gap:8},
        tone && {borderWidth:1,...palette[tone]},
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
