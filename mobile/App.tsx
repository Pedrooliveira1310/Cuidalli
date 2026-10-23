import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  AppState,
  BackHandler,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  onAccessDenied,
  ApiError,
  api,
  saveToken,
  restoreToken,
  setExpiredHandler,
  User,
} from "./src/api";
import {
  FormBusy,
  Button,
  Card,
  Form,
  Field,
  styles as s,
  colors,
  confirmAction,
  dateTime,
  localInput,
  calendarDate,
} from "./src/ui";
import { openDialer } from "./src/phone";
const profileFields: Field[] = [
  { key: "name", label: "Nome completo" },
  { key: "birth_date", label: "Nascimento", placeholder: "DD/MM/AAAA" },
  { key: "phone", label: "Telefone com DDD", phone: true },
  { key: "password", label: "Senha (8 a 72 caracteres)", secure: true },
];
const contactFields: Field[] = [
  { key: "name", label: "Nome do contato" },
  { key: "phone", label: "Telefone com DDD", phone: true },
  { key: "relationship", label: "Parentesco" },
  { key: "is_primary", label: "Contato principal do SOS", toggle: true },
];
const medicationFields: Field[] = [
  { key: "name", label: "Medicamento" },
  { key: "dosage", label: "Dosagem", placeholder: "Ex.: 50 mg" },
  {
    key: "times",
    label: "Horários",
  },
  { key: "start_date", label: "Início do uso", placeholder: "DD/MM/AAAA" },
  { key: "end_date", label: "Fim do uso", placeholder: "DD/MM/AAAA" },
];
const appointmentFields: Field[] = [
  { key: "doctor", label: "Médico(a)" },
  { key: "specialty", label: "Especialidade" },
  {
    key: "scheduled_at",
    label: "Data e hora (São Paulo)",
    placeholder: "DD/MM/AAAA HH:MM",
  },
  { key: "location", label: "Local" },
];
const statusLabel: Record<string, string> = {
  taken: "✓ Já tomou",
  pending: "Ainda não — pode confirmar depois",
  unconfirmed: "Sem confirmação",
};
const regions: Record<string, string> = {
  head: "Cabeça",
  chest: "Peito",
  abdomen: "Abdômen",
  upper_back: "Costas superiores",
  lower_back: "Lombar",
  left_shoulder: "Ombro esquerdo",
  right_shoulder: "Ombro direito",
  left_arm: "Braço esquerdo",
  right_arm: "Braço direito",
  left_hand: "Mão esquerda",
  right_hand: "Mão direita",
  left_hip: "Quadril esquerdo",
  right_hip: "Quadril direito",
  left_leg: "Perna esquerda",
  right_leg: "Perna direita",
  left_knee: "Joelho esquerdo",
  right_knee: "Joelho direito",
  left_foot: "Pé esquerdo",
  right_foot: "Pé direito",
};
function useData(path: string) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [denied, setDenied] = useState(false);
  const requestVersion = useRef(0);
  const reload = useCallback(() => {
    requestVersion.current++;
    setLoading(true);
    setRevision((v) => v + 1);
  }, []);
  useEffect(
    () =>
      onAccessDenied((denied, status) => {
        if (denied === path || denied.startsWith(path + "/")) {
          requestVersion.current++;
          setLoading(false);
          setDenied(true);
          setData(null);
          setError(
            status === 401
              ? "Sua sessão expirou. Entre novamente."
              : "Acesso indisponível. Atualize a lista.",
          );
        }
      }),
    [path],
  );
  useEffect(() => {
    let active = true;
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    api(path)
      .then((v) => {
        if (active && version === requestVersion.current) {
          setData(v);
          setDenied(false);
        }
      })
      .catch((e) => {
        if (
          active &&
          (version === requestVersion.current ||
            (e instanceof ApiError && [401, 403, 404].includes(e.status)))
        ) {
          if (e instanceof ApiError && [401, 403, 404].includes(e.status))
            setData(null);
          setError("Não foi possível atualizar os dados. " + e.message);
        }
      })
      .finally(() => {
        if (active && version === requestVersion.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  useEffect(() => {
    let day = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") reload();
    });
    const timer = setInterval(() => {
      const today = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date());
      if (today !== day) {
        day = today;
        reload();
      }
    }, 1000);
    const visible = () => {
      if (document.visibilityState === "visible") reload();
    };
    if (Platform.OS === "web")
      document.addEventListener("visibilitychange", visible);
    return () => {
      subscription.remove();
      clearInterval(timer);
      if (Platform.OS === "web")
        document.removeEventListener("visibilitychange", visible);
    };
  }, [reload]);
  return { data: denied ? null : data, error, loading, reload, denied };
}
function Loading({ state }: { state: ReturnType<typeof useData> }) {
  return (
    <>
      <Button
        label="Atualizar lista"
        onPress={state.reload}
        disabled={state.loading}
      />
      {state.loading && (
        <View accessibilityLabel="Carregando">
          <ActivityIndicator size="large" />
          <Text style={s.text}>Carregando…</Text>
        </View>
      )}
      {!!state.error && (
        <Card>
          <Text style={s.error} accessibilityRole="alert">
            {state.error}
          </Text>
          <Button label="Tentar novamente" onPress={state.reload} />
        </Card>
      )}
    </>
  );
}
function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [role, setRole] = useState<"elder" | "caregiver">("elder"),
    [stage, setStage] = useState<"profile" | "register" | "login">("profile"),
    [message, setMessage] = useState("");
  return (
    <>
      <Text style={s.title}>Cuidali</Text>
      <Text style={s.muted}>Kannali Corp · Cuidando de vidas</Text>
      {!!message && (
        <Text accessibilityRole="alert" style={s.success}>
          {message}
        </Text>
      )}
      {stage === "profile" ? (
        <>
          <Text style={s.title}>Como você vai usar o Cuidali?</Text>
          <Text style={s.text}>
            Escolha uma opção para configurarmos o app do jeito certo.
          </Text>
          {(["elder", "caregiver"] as const).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === r }}
              onPress={() => setRole(r)}
              style={[
                s.card,
                role === r && {
                  backgroundColor: colors.light,
                  borderColor: colors.blue,
                  borderWidth: 2,
                },
              ]}
            >
              <Text style={s.subtitle}>
                {r === "elder" ? "Sou o idoso" : "Sou o cuidador(a)"}{" "}
                {role === r ? "●" : "○"}
              </Text>
              <Text style={s.text}>
                {r === "elder"
                  ? "Quero acompanhar meus remédios, consultas e registrar como estou."
                  : "Quero acompanhar os cuidados de alguém com sua autorização."}
              </Text>
            </Pressable>
          ))}
          <Button label="Continuar" onPress={() => setStage("register")} />
          <Button
            label="Já tenho conta · Entrar"
            tone="light"
            onPress={() => setStage("login")}
          />
        </>
      ) : stage === "register" ? (
        <>
          <Text style={s.title}>Vamos criar sua conta</Text>
          <Text style={s.text}>
            Perfil: {role === "elder" ? "idoso" : "cuidador"}. Use seu telefone
            e uma senha para entrar.
          </Text>
          <Form
            key={"register" + role}
            fields={[
              ...profileFields,
              ...(role === "elder"
                ? [
                    {
                      key: "contact_name",
                      label: "Nome do contato de emergência",
                    },
                    {
                      key: "contact_phone",
                      label: "Telefone do contato com DDD",
                      phone: true,
                    },
                    {
                      key: "contact_relationship",
                      label: "Parentesco do contato",
                    },
                  ]
                : []),
            ]}
            submit="Criar conta"
            onSave={async (v) => {
              await api("/auth/register", "POST", {
                role,
                name: v.name,
                birth_date: v.birth_date,
                phone: v.phone,
                password: v.password,
                ...(role === "elder"
                  ? {
                      emergency_contact: {
                        name: v.contact_name,
                        phone: v.contact_phone,
                        relationship: v.contact_relationship,
                      },
                    }
                  : {}),
              });
              setMessage("Conta criada. Entre com telefone e senha.");
              setStage("login");
            }}
          />
          <Button
            label="Já tenho conta · Entrar"
            tone="light"
            onPress={() => setStage("login")}
          />
          <Button
            label="Alterar perfil"
            tone="light"
            onPress={() => setStage("profile")}
          />
        </>
      ) : (
        <>
          <Text style={s.title}>Que bom te ver de novo</Text>
          <Text style={s.text}>Entre para acompanhar seus cuidados.</Text>
          {Platform.OS === "web" && (
            <Text style={s.muted}>
              No navegador, a sessão fica apenas na memória. No aplicativo,
              usamos armazenamento seguro.
            </Text>
          )}
          <Form
            fields={[
              { key: "phone", label: "Telefone com DDD", phone: true },
              { key: "password", label: "Senha", secure: true },
            ]}
            submit="Entrar"
            onSave={async (v) => {
              const result = await api("/auth/login", "POST", v);
              await saveToken(result.token);
              onLogin(result.user);
            }}
          />
          <Button
            label="Não tenho conta · Criar conta"
            tone="light"
            onPress={() => {
              setMessage("");
              setStage("profile");
            }}
          />
        </>
      )}
    </>
  );
}
function Home({
  elder,
  user,
  navigate,
}: {
  elder: number;
  user: User;
  navigate: (tab: string) => void;
}) {
  const state = useData(`/elders/${elder}/dashboard`),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function dose(id: number, status: string) {
    if (busy || state.loading || state.error || !state.data) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/elders/${elder}/doses/${id}`, "POST", {
        date: state.data.date,
        status,
      });
      setMessage("Dose registrada.");
      state.reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={s.title}>Olá, {user.name.split(" ")[0]}</Text>
      <Text style={s.muted}>
        {new Date().toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </Text>
      <Loading state={state} />
      {!!message && (
        <Text accessibilityRole="alert" style={s.text}>
          {message}
        </Text>
      )}
      {state.data && (
        <>
          <Card>
            <Text style={s.subtitle}>{state.data.elder.name}</Text>
            {user.role === "caregiver" && (
              <Text style={s.text}>
                {state.data.last_activity
                  ? `Última atividade do idoso: ${dateTime(state.data.last_activity.created_at)}`
                  : "Ainda não há atividade registrada pelo idoso."}
              </Text>
            )}
          </Card>
          <Text style={s.subtitle}>Remédios de hoje</Text>
          {!state.data.doses.length && (
            <Text style={s.text}>Nenhuma dose prevista para hoje.</Text>
          )}
          {state.data.doses.map((d: any) => (
            <Card key={d.time_id} tone="blue">
              <Text style={s.subtitle}>
                ♧ {d.time} · {d.name}
              </Text>
              <Text style={s.text}>{d.dosage}</Text>
              <Text style={s.text}>{statusLabel[d.status]}</Text>
              {user.role === "elder" && d.status !== "taken" && (
                <>
                  <Button
                    label="✓ Já tomei"
                    disabled={busy || state.loading || !!state.error}
                    onPress={() => dose(d.time_id, "taken")}
                  />
                  <Button
                    label="Ainda não"
                    tone="light"
                    disabled={busy || state.loading || !!state.error}
                    onPress={() => dose(d.time_id, "pending")}
                  />
                </>
              )}
            </Card>
          ))}
          <Text style={s.subtitle}>Consultas de hoje</Text>
          {!state.data.appointments.length && (
            <Text style={s.text}>Nenhuma consulta marcada para hoje.</Text>
          )}
          {state.data.appointments.map((a: any) => (
            <Card key={a.id} tone="yellow">
              <Text style={s.subtitle}>
                {a.doctor} · {a.specialty}
              </Text>
              <Text style={s.text}>
                {dateTime(a.scheduled_at)}
                {"\n"}
                {a.location}
              </Text>
            </Card>
          ))}
          <Button
            label="Ver todos os medicamentos"
            tone="light"
            onPress={() => navigate("Medicamentos")}
          />
          <Button
            label="Ver próximas consultas"
            tone="light"
            onPress={() => navigate("Consultas")}
          />
          <Button
            label="Registros de dores"
            tone="light"
            onPress={() => navigate("Dores")}
          />
          {user.role === "caregiver" && (
            <>
              <Text style={s.subtitle}>Histórico de doses</Text>
              {!state.data.dose_history.length && (
                <Text style={s.text}>Nenhuma confirmação registrada.</Text>
              )}
              {state.data.dose_history.map((d: any) => (
                <Card key={d.id}>
                  <Text style={s.text}>
                    {calendarDate(d.dose_date)} · {d.time.slice(0, 5)} ·{" "}
                    {d.name}
                    {"\n"}
                    {statusLabel[d.status]}
                    {"\n"}Registrado: {dateTime(d.recorded_at)}
                  </Text>
                </Card>
              ))}
            </>
          )}
          <Button label="Atualizar dados" onPress={state.reload} />
        </>
      )}
    </>
  );
}
function Resources({
  elder,
  user,
  kind,
}: {
  elder: number;
  user: User;
  kind: "medications" | "appointments" | "contacts";
}) {
  const path = `/elders/${elder}/${kind}`,
    state = useData(path),
    [editing, setEditing] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const canWrite = user.role === "caregiver" || kind === "contacts";
  const label = {
    medications: "Medicamentos",
    appointments: "Consultas",
    contacts: "Contatos de emergência",
  }[kind];
  const fields =
    kind === "medications"
      ? medicationFields
      : kind === "appointments"
        ? appointmentFields
        : contactFields;
  async function remove(item: any) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api(`${path}/${item.id}`, "DELETE");
      setMessage(r.message);
      state.reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={s.title}>{label}</Text>
      {!!message && (
        <Text style={s.text} accessibilityRole="alert">
          {message}
        </Text>
      )}
      {state.denied ? (
        <Loading state={state} />
      ) : editing ? (
        <Card>
          <Text style={s.subtitle}>{editing.id ? "Editar" : "Adicionar"}</Text>
          <Form
            key={editing.id || "new"}
            fields={fields}
            initial={editing}
            submit="Salvar"
            onCancel={() => setEditing(null)}
            onSave={async (values) => {
              let payload: any;
              if (kind === "medications")
                payload = {
                  name: values.name,
                  dosage: values.dosage,
                  start_date: values.start_date,
                  end_date: values.end_date,
                  times: values.times,
                };
              else if (kind === "appointments")
                payload = {
                  doctor: values.doctor,
                  specialty: values.specialty,
                  scheduled_at: values.scheduled_at,
                  location: values.location,
                };
              else
                payload = {
                  name: values.name,
                  phone: values.phone,
                  relationship: values.relationship,
                  is_primary: !!values.is_primary,
                };
              const r = await api(
                path + (editing.id ? `/${editing.id}` : ""),
                editing.id ? "PATCH" : "POST",
                payload,
              );
              setMessage(r.message);
              setEditing(null);
              state.reload();
            }}
          />
        </Card>
      ) : (
        <>
          {canWrite && (
            <Button
              label={`Adicionar ${kind === "medications" ? "medicamento" : kind === "appointments" ? "consulta" : "contato"}`}
              onPress={() => {
                setMessage("");
                setEditing({ is_primary: false });
              }}
            />
          )}
          <Loading state={state} />
          {state.data?.items.length === 0 && (
            <Text style={s.text}>Nenhum registro cadastrado.</Text>
          )}
          {state.data?.items.map((item: any) => (
            <Card
              key={item.id}
              tone={
                kind === "appointments"
                  ? "yellow"
                  : kind === "medications"
                    ? "blue"
                    : undefined
              }
            >
              <Text style={s.subtitle}>{item.name || item.doctor}</Text>
              {kind === "medications" ? (
                <>
                  <Text style={s.text}>
                    {item.dosage} ·{" "}
                    {Number(item.active) ? "Ativo" : "Desativado"}
                    {"\n"}
                    {calendarDate(item.start_date)} até{" "}
                    {calendarDate(item.end_date)}
                    {"\n"}Horários:{" "}
                    {item.times.map((t: any) => t.time).join(", ")}
                  </Text>
                </>
              ) : kind === "appointments" ? (
                <>
                  <Text style={s.text}>
                    {item.specialty}
                    {"\n"}
                    {dateTime(item.scheduled_at)}
                    {"\n"}
                    {item.location}
                    {"\n"}
                    {Number(item.cancelled) ? "Cancelada" : "Agendada"}
                  </Text>
                </>
              ) : (
                <>
                  <Text selectable style={s.text}>
                    {item.relationship} · {item.phone}
                    {Number(item.is_primary)
                      ? "\n★ Contato principal do SOS"
                      : ""}
                  </Text>
                  {!Number(item.is_primary) && (
                    <Button
                      label="Usar no SOS"
                      disabled={busy}
                      onPress={async () => {
                        if (busy) return;
                        setBusy(true);
                        try {
                          await api(`${path}/${item.id}`, "PATCH", {
                            name: item.name,
                            phone: item.phone,
                            relationship: item.relationship,
                            is_primary: true,
                          });
                          state.reload();
                        } catch (e) {
                          setMessage((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  )}
                  <Button
                    label={`Abrir discador: ${item.name}`}
                    tone="light"
                    onPress={async () =>
                      setMessage(await openDialer(item.phone))
                    }
                  />
                </>
              )}
              {canWrite &&
                !(kind === "medications" && !Number(item.active)) &&
                !(kind === "appointments" && Number(item.cancelled)) && (
                  <>
                    <Button
                      label="Editar"
                      tone="light"
                      disabled={busy}
                      onPress={() =>
                        setEditing({
                          ...item,
                          ...(kind === "medications"
                            ? {
                                times: item.times.map((t: any) => t.time),
                              }
                            : {}),
                          ...(kind === "appointments"
                            ? { scheduled_at: localInput(item.scheduled_at) }
                            : {}),
                          is_primary: !!Number(item.is_primary),
                        })
                      }
                    />
                    <Button
                      label={
                        kind === "medications"
                          ? "Desativar"
                          : kind === "appointments"
                            ? "Cancelar consulta"
                            : "Excluir contato"
                      }
                      tone="red"
                      disabled={busy}
                      onPress={() =>
                        confirmAction(
                          kind === "medications"
                            ? "Desativar este medicamento? O histórico será preservado."
                            : kind === "appointments"
                              ? "Cancelar esta consulta?"
                              : "Excluir este contato? Se for principal, o SOS ficará sem contato até você escolher outro.",
                          () => remove(item),
                        )
                      }
                    />
                  </>
                )}
            </Card>
          ))}
        </>
      )}
    </>
  );
}
function BodyMap({
  disabled = false,
  view,
  region,
  onSelect,
}: {
  view: string;
  region: string;
  onSelect: (r: string) => void;
  disabled?: boolean;
}) {
  const points: [string, number, number][] = [
    ["head", 45, 2],
    ["left_shoulder", 66, 22],
    ["right_shoulder", 24, 22],
    [view === "front" ? "chest" : "upper_back", 45, 26],
    [view === "front" ? "abdomen" : "lower_back", 45, 41],
    ["left_arm", 74, 38],
    ["right_arm", 16, 38],
    ["left_hand", 77, 53],
    ["right_hand", 13, 53],
    ["left_hip", 56, 55],
    ["right_hip", 34, 55],
    ["left_leg", 56, 66],
    ["right_leg", 34, 66],
    ["left_knee", 56, 77],
    ["right_knee", 34, 77],
    ["left_foot", 56, 89],
    ["right_foot", 34, 89],
  ];
  // Costas espelham a posição visual, mantendo os lados anatômicos do paciente.
  return (
    <View
      style={{ height: 460, width: "100%", maxWidth: 280, alignSelf: "center" }}
    >
      {points.map(([r, x, y]) => (
        <Pressable
          key={r}
          accessibilityRole="button"
          accessibilityLabel={regions[r]}
          disabled={disabled}
          accessibilityState={{ selected: r === region, disabled }}
          onPress={() => onSelect(r)}
          style={{
            position: "absolute",
            left: `${view === "front" ? x : 90 - x}%` as any,
            top: `${y}%` as any,
            width: 56,
            height: 56,
            marginLeft: -14,
            marginTop: -5,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              height: r === "head" ? 50 : 38,
              width: r === "head" ? 45 : 32,
              borderRadius: 18,
              backgroundColor: r === region ? colors.blue : "#CEE1F4",
              borderWidth: r === region ? 3 : 1,
              borderColor: colors.blue,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}
function Pains({ elder, user }: { elder: number; user: User }) {
  const path = `/elders/${elder}/pains`,
    state = useData(path),
    [creating, setCreating] = useState(false),
    [view, setView] = useState("front"),
    [region, setRegion] = useState("left_knee"),
    [type, setType] = useState("Pontada"),
    [intensity, setIntensity] = useState(4),
    [onset, setOnset] = useState("Hoje"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function seen(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`${path}/${id}/seen`, "POST");
      state.reload();
      setMessage("Visualização registrada.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormBusy.Provider value={busy}>
      <>
        <Text style={s.title}>Registro de dores</Text>
        {!!message && (
          <Text accessibilityRole="alert" style={s.text}>
            {message}
          </Text>
        )}
        {user.role === "elder" && !creating && (
          <Button label="Registrar uma dor" onPress={() => setCreating(true)} />
        )}{" "}
        {state.denied ? (
          <Loading state={state} />
        ) : creating ? (
          <>
            <Text style={s.subtitle}>Onde dói?</Text>
            <View style={s.row}>
              {[
                ["front", "Frente"],
                ["back", "Costas"],
              ].map(([v, l]) => (
                <Button
                  key={v}
                  label={(view === v ? "✓ " : "") + l}
                  tone={view === v ? "blue" : "light"}
                  onPress={() => {
                    setView(v);
                    if (
                      v !== view &&
                      ["chest", "abdomen", "upper_back", "lower_back"].includes(
                        region,
                      )
                    )
                      setRegion(
                        v === "front"
                          ? region === "lower_back"
                            ? "abdomen"
                            : "chest"
                          : region === "abdomen"
                            ? "lower_back"
                            : "upper_back",
                      );
                  }}
                />
              ))}
            </View>
            <Text style={s.muted}>
              Direita e esquerda são sempre os lados da pessoa que sente a dor.
            </Text>
            <BodyMap
              view={view}
              region={region}
              onSelect={setRegion}
              disabled={busy}
            />
            <Text style={s.subtitle}>Local: {regions[region]}</Text>
            <Text style={s.muted}>
              Também é possível selecionar pela lista:
            </Text>
            <View style={s.row}>
              {Object.entries(regions)
                .filter(([k]) =>
                  view === "front"
                    ? !["upper_back", "lower_back"].includes(k)
                    : !["chest", "abdomen"].includes(k),
                )
                .map(([k, l]) => (
                  <Button
                    key={k}
                    label={(region === k ? "✓ " : "") + l}
                    tone={region === k ? "blue" : "light"}
                    onPress={() => setRegion(k)}
                  />
                ))}
            </View>
            <Text style={s.subtitle}>Como é a dor?</Text>
            <View style={s.row}>
              {[
                "Pontada",
                "Queimação",
                "Latejante",
                "Aperto / peso",
                "Formigamento",
                "Constante",
              ].map((t) => (
                <Button
                  key={t}
                  label={(type === t ? "✓ " : "") + t}
                  tone={type === t ? "blue" : "light"}
                  onPress={() => setType(t)}
                />
              ))}
            </View>
            <Text style={s.subtitle}>Quanto está doendo? {intensity}/10</Text>
            <Text style={s.muted}>
              1–2 leve; 3–4 média; 5–6 forte; 7–8 muito forte; 9–10 máxima. O
              registro não é um diagnóstico.
            </Text>
            <View style={s.row}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  label={String(n) + (intensity === n ? " ✓" : "")}
                  tone={intensity === n ? "blue" : "light"}
                  onPress={() => setIntensity(n)}
                />
              ))}
            </View>
            <Text style={s.subtitle}>Desde quando?</Text>
            {["Hoje", "Alguns dias", "Mais de 1 semana"].map((o) => (
              <Button
                key={o}
                label={(onset === o ? "✓ " : "") + o}
                tone={onset === o ? "blue" : "light"}
                onPress={() => setOnset(o)}
              />
            ))}
            <Form
              fields={[{ key: "notes", label: "Observação", optional: true }]}
              submit="Salvar registro de dor"
              onBusyChange={setBusy}
              onCancel={() => setCreating(false)}
              onSave={async (v) => {
                const r = await api(path, "POST", {
                  view,
                  region,
                  type,
                  intensity,
                  onset,
                  notes: v.notes || "",
                });
                setMessage(r.message);
                setCreating(false);
                state.reload();
              }}
            />
          </>
        ) : (
          <>
            <Loading state={state} />
            {state.data?.items.length === 0 && (
              <Text style={s.text}>Nenhuma dor registrada.</Text>
            )}
            {!!state.data?.items.length && (
              <Card>
                <Text style={s.subtitle}>Evolução da intensidade</Text>
                <Text style={s.muted}>
                  Últimos 7 registros, do mais antigo ao mais recente. Cada
                  barra representa um registro real.
                </Text>
                {state.data.items
                  .slice(0, 7)
                  .reverse()
                  .map((p: any) => (
                    <View
                      key={p.id}
                      accessibilityLabel={`${dateTime(p.created_at)}: intensidade ${p.intensity} de 10`}
                    >
                      <Text style={s.muted}>
                        {dateTime(p.created_at)} · {p.intensity}/10
                      </Text>
                      <View
                        style={{
                          height: 16,
                          borderRadius: 8,
                          width: `${Number(p.intensity) * 10}%`,
                          backgroundColor:
                            Number(p.intensity) >= 7 ? colors.red : colors.blue,
                        }}
                      />
                    </View>
                  ))}
              </Card>
            )}
            {state.data?.items.map((p: any) => (
              <Card key={p.id}>
                <Text style={s.subtitle}>
                  {p.intensity}/10 · {regions[p.region]}
                </Text>
                <Text style={s.text}>
                  {p.type} · {p.view === "front" ? "Frente" : "Costas"}
                  {"\n"}Início: {p.onset}
                  {"\n"}
                  {dateTime(p.created_at)}
                  {p.notes ? "\n" + p.notes : ""}
                </Text>
                {p.views.length ? (
                  p.views.map((v: any) => (
                    <Text key={v.caregiver_id} style={s.muted}>
                      Visto por {v.name} em {dateTime(v.viewed_at)}
                    </Text>
                  ))
                ) : (
                  <Text style={s.muted}>
                    Ainda sem visualizações de cuidadores.
                  </Text>
                )}
                {user.role === "caregiver" &&
                  !p.views.some(
                    (v: any) => Number(v.caregiver_id) === Number(user.id),
                  ) && (
                    <Button
                      label="Marcar como visto"
                      disabled={busy}
                      onPress={() => seen(p.id)}
                    />
                  )}
              </Card>
            ))}
          </>
        )}
      </>
    </FormBusy.Provider>
  );
}
function Links({
  user,
  onSelect,
  onRemove,
}: {
  user: User;
  onSelect: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const state = useData("/links"),
    [code, setCode] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      setCode(await api("/link-codes", "POST"));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/link-codes/${code.id}`, "DELETE");
      setCode(null);
      setMessage("Código revogado.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={s.title}>Pessoas vinculadas</Text>
      {!!message && (
        <Text accessibilityRole="alert" style={s.text}>
          {message}
        </Text>
      )}
      {user.role === "elder" ? (
        <Card>
          <Text style={s.text}>
            O código autoriza um cuidador a acompanhar seus registros e
            gerenciar medicamentos, consultas e contatos. Compartilhe apenas com
            alguém de confiança.
          </Text>
          <Button
            label="Gerar código por 10 minutos"
            busy={busy}
            onPress={generate}
          />
          {code && (
            <>
              <Text selectable style={s.title}>
                {code.code}
              </Text>
              <Text style={s.text}>
                Uso único · expira em 10 minutos após a geração. Gerar outro
                código invalida o anterior.
              </Text>
              <Button
                label="Revogar código"
                tone="red"
                disabled={busy}
                onPress={revoke}
              />
            </>
          )}
        </Card>
      ) : (
        <Card>
          <Text style={s.text}>
            Peça à pessoa idosa que gere e compartilhe um código. Ao usá-lo,
            você recebe acesso aos cuidados dela.
          </Text>
          <Form
            fields={[{ key: "code", label: "Código de vinculação" }]}
            submit="Concluir vinculação"
            onSave={async (v) => {
              const r = await api("/links/redeem", "POST", v);
              state.reload();
              setMessage(r.message);
              onSelect(Number(r.elder_id));
            }}
          />
        </Card>
      )}
      <Loading state={state} />
      {state.data?.items.length === 0 && (
        <Text style={s.text}>Você ainda não possui vínculos.</Text>
      )}
      {state.data?.items.map((u: any) => (
        <Card key={u.id}>
          <Text style={s.subtitle}>{u.name}</Text>
          {user.role === "caregiver" && (
            <Button
              label="Acompanhar esta pessoa"
              onPress={() => onSelect(Number(u.id))}
            />
          )}
          <Button
            label="Remover vínculo"
            tone="red"
            disabled={busy}
            onPress={() =>
              confirmAction(
                `Remover vínculo com ${u.name}? O cuidador perderá acesso aos dados.`,
                async () => {
                  setBusy(true);
                  try {
                    await api(`/links/${u.id}`, "DELETE");
                    state.reload();
                    onRemove(Number(u.id));
                    setMessage("Vínculo removido.");
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                },
              )
            }
          />
        </Card>
      ))}
    </>
  );
}
function SOS({
  elder,
  navigate,
}: {
  elder: number;
  navigate: (tab: string) => void;
}) {
  const state = useData(`/elders/${elder}/contacts`),
    [message, setMessage] = useState("");
  const contact = state.data?.items.find(
    (c: any) => Number(c.is_primary) === 1,
  );
  return (
    <>
      <Text style={s.title}>Precisa de ajuda?</Text>
      <Loading state={state} />
      <Text style={s.text}>
        O SOS abre o discador com seu contato principal. Você precisa iniciar a
        ligação no telefone.
      </Text>
      {contact ? (
        <Card>
          <Text style={s.subtitle}>
            {contact.name} ({contact.relationship})
          </Text>
          <Text selectable style={s.text}>
            {contact.phone}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`SOS: abrir discador para ${contact.name}`}
            onPress={() =>
              confirmAction(
                `Abrir o discador para ${contact.name}?`,
                async () => {
                  setMessage(await openDialer(contact.phone));
                },
              )
            }
            style={{
              height: 180,
              width: 180,
              borderRadius: 90,
              backgroundColor: "#FAD5D5",
              alignSelf: "center",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={[s.title, { color: colors.red }]}>☎ SOS</Text>
          </Pressable>
        </Card>
      ) : (
        !state.loading &&
        !state.error && (
          <View style={{ gap: 12 }}>
            <Text style={s.text}>
              Não há contato principal. Cadastre ou escolha um em Contatos.
            </Text>
            <Button
              label="Escolher ou cadastrar contato"
              onPress={() => navigate("Contatos")}
            />
          </View>
        )
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={s.text}>
          {message}
        </Text>
      )}
      <Text style={s.muted}>
        Notificações remotas de emergência e monitoramento de inatividade estão
        previstos para a sprint 3.
      </Text>
    </>
  );
}
function Assistant({ navigate }: { navigate: (tab: string) => void }) {
  const [answer, setAnswer] = useState("");
  return (
    <>
      <Text style={s.title}>Assistente</Text>
      <Text style={s.text}>Como posso te ajudar hoje?</Text>
      <Text style={s.muted}>
        Atalhos do Cuidali. Esta versão não usa inteligência artificial nem
        reconhecimento de voz.
      </Text>
      <Button
        label="Meus remédios"
        tone="light"
        onPress={() => navigate("Medicamentos")}
      />
      <Button
        label="Minhas consultas"
        tone="light"
        onPress={() => navigate("Consultas")}
      />
      <Button
        label="Que dia é hoje?"
        tone="light"
        onPress={() =>
          setAnswer(
            new Date().toLocaleDateString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              dateStyle: "full",
            }),
          )
        }
      />
      <Button
        label="Preciso de ajuda"
        tone="red"
        onPress={() => navigate("SOS")}
      />
      {!!answer && (
        <Card>
          <Text accessibilityLiveRegion="polite" style={s.text}>
            {answer}
          </Text>
        </Card>
      )}
    </>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [starting, setStarting] = useState(true),
    [tab, setTab] = useState("Início"),
    [elder, setElder] = useState(0),
    [sessionMessage, setSessionMessage] = useState(""),
    [logoutBusy, setLogoutBusy] = useState(false);
  const sessionGeneration = useRef(0);
  function loggedIn(u: User) {
    sessionGeneration.current++;
    setUser(u);
    setElder(u.role === "elder" ? Number(u.id) : 0);
    setTab(u.role === "elder" ? "Início" : "Vínculos");
    setSessionMessage("");
  }
  useEffect(() => {
    setExpiredHandler(() => {
      setUser(null);
      setElder(0);
      setSessionMessage("Sua sessão expirou. Entre novamente.");
    });
    (async () => {
      try {
        if (await restoreToken()) {
          const r = await api("/me");
          loggedIn(r.user);
        }
      } catch (e) {
        setSessionMessage((e as Error).message);
      } finally {
        setStarting(false);
      }
    })();
    return () => setExpiredHandler(() => {});
  }, []);
  async function logout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    const generation = ++sessionGeneration.current;
    const revocation = api("/auth/logout", "POST").then(
      () => true,
      () => false,
    );
    const clearing = saveToken(null).then(
      () => true,
      () => false,
    );
    setUser(null);
    setElder(0);
    setSessionMessage(
      "Você saiu neste dispositivo. Revogando sessão no servidor…",
    );
    setLogoutBusy(false);
    const [revoked, cleared] = await Promise.all([revocation, clearing]);
    if (generation === sessionGeneration.current)
      setSessionMessage(
        (revoked
          ? "Você saiu da conta."
          : "Você saiu neste dispositivo. Não foi possível revogar a sessão no servidor; ela permanecerá válida até expirar.") +
          (cleared ? "" : " Não foi possível limpar o armazenamento seguro."),
      );
  }

  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab, elder]);
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (
        ["Medicamentos", "Consultas", "Contatos", "Dores", "Vínculos"].includes(
          tab,
        )
      ) {
        setTab("Cuidados");
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [tab]);

  const tabs = ["Início", "Assistente", "SOS", "Cuidados"];
  let screen: React.ReactNode = null;
  if (user) {
    if (tab === "Vínculos")
      screen = (
        <Links
          user={user}
          onRemove={(id) => {
            if (user.role === "caregiver" && elder === id) setElder(0);
          }}
          onSelect={(id) => {
            setElder(id);
            if (id) setTab("Início");
          }}
        />
      );
    else if (tab === "Cuidados")
      screen = (
        <>
          <Text style={s.title}>Seus cuidados</Text>
          {["Medicamentos", "Consultas", "Contatos", "Dores", "Vínculos"].map(
            (t) => (
              <Button key={t} label={t} onPress={() => setTab(t)} />
            ),
          )}
          <Button
            label="Sair da conta"
            tone="red"
            onPress={() => confirmAction("Sair desta conta?", logout)}
            busy={logoutBusy}
          />
        </>
      );
    else if (tab === "Assistente") screen = <Assistant navigate={setTab} />;
    else if (!elder)
      screen = (
        <>
          <Text style={s.title}>Quem você vai acompanhar?</Text>
          <Text style={s.text}>
            Selecione um idoso vinculado ou conclua uma vinculação.
          </Text>
          <Button label="Ver vínculos" onPress={() => setTab("Vínculos")} />
        </>
      );
    else if (tab === "Início")
      screen = <Home key={elder} elder={elder} user={user} navigate={setTab} />;
    else if (tab === "SOS")
      screen = <SOS key={elder} elder={elder} navigate={setTab} />;
    else if (tab === "Dores")
      screen = <Pains key={elder} elder={elder} user={user} />;
    else
      screen = (
        <Resources
          key={`${elder}-${tab}`}
          elder={elder}
          user={user}
          kind={
            tab === "Medicamentos"
              ? "medications"
              : tab === "Consultas"
                ? "appointments"
                : "contacts"
          }
        />
      );
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.page}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {!!sessionMessage && (
              <Text accessibilityRole="alert" style={s.error}>
                {sessionMessage}
              </Text>
            )}
            {starting ? (
              <ActivityIndicator size="large" />
            ) : user ? (
              <>
                {user.role === "caregiver" && (
                  <Button
                    label="Selecionar outro idoso · Vínculos"
                    tone="light"
                    onPress={() => setTab("Vínculos")}
                  />
                )}{" "}
                {screen}
              </>
            ) : (
              <Auth onLogin={loggedIn} />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {user && (
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderColor: "#ABB4C0",
              backgroundColor: "white",
            }}
          >
            {tabs.map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                aria-selected={
                  tab === t ||
                  (t === "Cuidados" &&
                    [
                      "Medicamentos",
                      "Consultas",
                      "Contatos",
                      "Dores",
                      "Vínculos",
                    ].includes(tab))
                }
                accessibilityState={{
                  selected:
                    tab === t ||
                    (t === "Cuidados" &&
                      [
                        "Medicamentos",
                        "Consultas",
                        "Contatos",
                        "Dores",
                        "Vínculos",
                      ].includes(tab)),
                }}
                accessibilityLabel={t}
                onPress={() => setTab(t)}
                style={{
                  flex: 1,
                  minHeight: 72,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    color: t === "SOS" ? colors.red : colors.blue,
                  }}
                >
                  {{ Início: "⌂", Assistente: "☏", SOS: "⚠", Cuidados: "♧" }[t]}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: t === "SOS" ? colors.red : colors.dark,
                    fontWeight:
                      tab === t ||
                      (t === "Cuidados" &&
                        [
                          "Medicamentos",
                          "Consultas",
                          "Contatos",
                          "Dores",
                          "Vínculos",
                        ].includes(tab))
                        ? "700"
                        : "400",
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
