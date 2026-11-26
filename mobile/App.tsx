import { ElderLayout, ElderPages, ElderViewport } from "./src/ElderPages";
import {AppIcon,BrandMark,AuthBrandPanel,BrandHeader,DayHero,MenuTile,MenuRow} from "./src/Visual";
import {CareDrawer,CareSidebar,CareTabs,MenuToggle} from "./src/CareNavigation";
import {AccountProfile,PasswordRecovery,LegalLink} from "./src/AccountScreens";
import {DemoGuide} from "./src/DemoGuide";
import {Welcome} from "./src/Welcome";
import React, { useEffect, useState, useCallback, useRef, useSyncExternalStore, useContext } from "react";
import {
  AppState,
  useWindowDimensions,
  Image,
  BackHandler,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
  type LayoutChangeEvent,
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
  getServer,
  restoreServer,
  checkServer,
  saveServer,
  androidWebPackage,
} from "./src/api";
import {
  FormBusy,
  BackButton,
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
import { speak, listen, calendar } from "./src/device";
import { openDialer } from "./src/phone";
import {
  browserDemoProfiles, endBrowserDemo, guidedStep, isBrowserDemo, linkedDemoElder,
  startBrowserDemo, startGuidedDemo, subscribeDemo, switchDemoProfile,
} from "./src/demo";

function callContact(phone: string) {
  return isBrowserDemo() ? Promise.resolve("Ligação simulada na demonstração.") : openDialer(phone);
}
const profileFields: Field[] = [
  { key: "name", label: "Nome completo" },
  { key: "birth_date", label: "Nascimento", placeholder: "DD/MM/AAAA" },
  { key: "phone", label: "Telefone com DDD", phone: true },
  { key: "email", label: "E-mail para recuperação" },
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
  penis: "Pênis",
  scrotum: "Escroto",
  vulva: "Vulva",
  perineum: "Períneo",
  anus: "Ânus",
};
function useData(path: string, refreshKey = 0) {
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
  }, [path, revision, refreshKey]);
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
function Loading({ state, refresh=true }: { state: ReturnType<typeof useData>;refresh?:boolean }) {
  return (
    <>
      {refresh && <Button
        label="↻ Ver registros mais recentes"
        onPress={state.reload}
        disabled={state.loading}
      />}
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
type DemoProfile = {email: string; role: User["role"]};

function Auth({onLogin,onScreenChange,wide}:{
  onLogin:(user:User)=>void;
  onScreenChange:()=>void;
  wide:boolean;
}) {
  useEffect(()=>{if(Platform.OS!=="web")return;const handler=async(e:Event)=>{const value=(e as CustomEvent).detail;if(!value.token){setMessage(value.message);return;}try{await saveToken(value.token);const r=await api("/me");onLogin(r.user);}catch(error){setMessage((error as Error).message);}};window.addEventListener("cuidali-biometric",handler);return()=>window.removeEventListener("cuidali-biometric",handler);},[]);
  const [recovery,setRecovery]=useState(false);
  const [loginMethod,setLoginMethod]=useState<"phone"|"email">("phone");
  const [role, setRole] = useState<"elder" | "caregiver">("elder"),
    [stage, setStage] = useState<"profile" | "register" | "login">("profile"),
    [message, setMessage] = useState("");
  const demoProfiles = Platform.OS === "web" && !window.CuidaliNative ? browserDemoProfiles : [];
  const [localDemoProfiles, setLocalDemoProfiles] = useState<DemoProfile[]>([]);
  const [openingDemo, setOpeningDemo] = useState("");
  const [demoError, setDemoError] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web" || window.CuidaliNative ||
        !["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) return;
    let active = true;
    api<{items: DemoProfile[]}>("/auth/demo").then(result => {
      if (active && Array.isArray(result.items)) setLocalDemoProfiles(result.items);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(()=>{onScreenChange();},[stage,recovery]);
  async function signIn(credentials: {phone: string; password: string} | {email: string; password: string} | {demo_email: string}) {
    const result = await api<{token: string; user: User}>("/auth/login", "POST", credentials);
    await saveToken(result.token);
    onLogin(result.user);
  }
  async function openDemo(email: string) {
    if (openingDemo) return;
    setOpeningDemo(email);
    setDemoError("");
    try {
      if (localDemoProfiles.some(profile=>profile.email===email)) await signIn({demo_email: email});
      else onLogin(startBrowserDemo(email));
    } catch (error) {
      setDemoError((error as Error).message);
    } finally {
      setOpeningDemo("");
    }
  }
  const landing = stage==="profile" && demoProfiles.length>0 && !recovery;
  if (recovery) {
    return <View style={[s.card,{width:"100%",maxWidth:560,alignSelf:"center"}]}>
      <PasswordRecovery onBack={()=>setRecovery(false)}/>
    </View>;
  }
  const content = (
    <>
      {landing ? <Welcome wide={wide} busy={!!openingDemo}
        onDemo={()=>onLogin(startGuidedDemo())}
        onLogin={()=>setStage("login")}
        onRegister={()=>{
          const section=document.getElementById("cuidali-criar-conta");
          section?.scrollIntoView({block:"start"});
          section?.querySelector<HTMLElement>('[role="radio"]')?.focus({preventScroll:true});
        }}/> :
        !wide && <BrandHeader large />}
      {!!message && (
        <Text accessibilityRole="alert" style={s.success}>
          {message}
        </Text>
      )}
      {stage !== "profile" && <BackButton onPress={()=>{setMessage("");setStage("profile");}} />}
      {stage === "profile" ? (
        <>
          {!!demoProfiles.length && (
            <Card tone="blue">
              <Text accessibilityRole="header" style={s.subtitle}>Demonstração</Text>
              <Text style={s.muted}>Explore livremente com os dois perfis de exemplo.</Text>
              <View style={s.row}>
                {demoProfiles.map(profile => {
                  const label = profile.role === "elder" ? "Pessoa idosa" : "Cuidador";
                  return (
                    <Pressable key={profile.email} accessibilityRole="button"
                      accessibilityLabel={`Entrar na demonstração · ${label} · ${profile.email}`}
                      disabled={!!openingDemo}
                      accessibilityState={{disabled:!!openingDemo,busy:openingDemo===profile.email}}
                      onPress={()=>openDemo(profile.email)}
                      style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>({
                        flexGrow:1,flexBasis:205,minHeight:65,borderRadius:12,borderWidth:1,
                        borderColor:"#B7CEE9",backgroundColor:pressed||hovered?colors.light:"#FFF",
                        padding:10,gap:3,justifyContent:"center",
                      })}>
                      <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                        <AppIcon name={profile.role==="elder"?"person":"shield"} size={19}/>
                        <Text style={[s.label,{flex:1}]}>{openingDemo===profile.email?"Abrindo…":label}</Text>
                        <AppIcon name="chevron" size={15}/>
                      </View>
                      <Text style={[s.muted,{fontSize:14,lineHeight:20}]}>{profile.email}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {!!demoError && <Text accessibilityRole="alert" style={s.error}>{demoError}</Text>}
            </Card>
          )}
          <View nativeID="cuidali-criar-conta" style={[{gap:16},landing&&s.card]}>
          <Text accessibilityRole="header" style={s.title}>Como você vai usar o Cuidali?</Text>
          <View style={wide&&landing?[s.row,{alignItems:"stretch"}]:{gap:12}}>
          {(["elder", "caregiver"] as const).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              disabled={!!openingDemo}
              aria-checked={role===r}
              accessibilityState={{ checked: role === r }}
              onPress={() => setRole(r)}
              style={({pressed}) => [
                s.card,
                wide&&landing&&{flex:1,minWidth:240},
                pressed && { backgroundColor: colors.light },
                role === r && {
                  backgroundColor: colors.light,
                  borderColor: colors.blue,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={{flexDirection:'row',alignItems:'center',gap:14}}>
                <View style={{width:50,height:50,borderRadius:17,backgroundColor:role===r?'#D4E3F4':'#EEF3F8',alignItems:'center',justifyContent:'center'}}><AppIcon name={r==='elder'?'elder':'shield'} size={28}/></View>
                <View style={{flex:1,gap:7}}><Text style={s.subtitle}>{r==='elder'?'Sou o idoso':'Sou o cuidador(a)'}</Text><Text style={[s.muted,{color:'#415B76'}]}>{r==='elder'?'Meus remédios, consultas e como estou me sentindo.':'Acompanhar quem eu cuido, com sua autorização.'}</Text></View>
                <View style={{width:26,height:26,borderRadius:13,borderWidth:2,borderColor:role===r?colors.blue:'#B7C6D8',backgroundColor:role===r?colors.blue:'transparent',alignItems:'center',justifyContent:'center'}}>{role===r&&<AppIcon name="check" size={18} color="#FFF"/>}</View>
              </View>
            </Pressable>
          ))}
          </View>
          <Button label="Continuar" disabled={!!openingDemo} onPress={() => setStage("register")} />
          {!landing&&<Button
            label="Já tenho conta · Entrar"
            tone="light"
            disabled={!!openingDemo}
            onPress={() => setStage("login")}
          />}
          </View>
        </>
      ) : stage === "register" ? (
        <>
          <Text style={s.title}>Vamos criar sua conta</Text>
          <Text style={s.text}>
            Perfil: {role === "elder" ? "idoso" : "cuidador"}. Use telefone ou e-mail e senha para entrar.
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
                email: v.email,
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
              setMessage("Conta criada. Entre com telefone ou e-mail e senha.");
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
          <View style={s.row}>
            <Button label="Usar telefone" tone={loginMethod==="phone"?"blue":"light"} onPress={()=>setLoginMethod("phone")} />
            <Button label="Usar e-mail" tone={loginMethod==="email"?"blue":"light"} onPress={()=>setLoginMethod("email")} />
          </View>
          <Form key={loginMethod}
            fields={[
              loginMethod==="phone" ? {key:"phone",label:"Telefone com DDD",phone:true} : {key:"email",label:"E-mail cadastrado"},
              {key:"password",label:"Senha",secure:true},
            ]}
            submit="Entrar"
            onSave={v=>signIn(loginMethod==="phone"?{phone:v.phone,password:v.password}:{email:v.email,password:v.password})}
          />
          {Platform.OS==="web" && !!window.CuidaliNative?.biometric && <Button label="Entrar com biometria" tone="light" onPress={()=>window.CuidaliNative?.biometric?.(false)} />}
          <Button label="Esqueci minha senha" tone="light" onPress={()=>setRecovery(true)} />
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
      <View style={{flexDirection:"row",flexWrap:"wrap",justifyContent:"center",gap:16}}>
        <LegalLink kind="terms" /><LegalLink kind="privacy" />
      </View>
    </>
  );
  if (landing) return <View style={{width:"100%",gap:16}}>{content}</View>;
  return (
    <View style={{width:"100%",maxWidth:wide?1040:560,alignSelf:"center",
      flexDirection:wide?"row":"column",alignItems:wide?"flex-start":"stretch",gap:20,marginTop:wide?32:0}}>
      {wide&&<AuthBrandPanel/>}
      <View style={[s.card,{flex:wide?1:undefined,minWidth:0,padding:wide?32:16,gap:16}]}>{content}</View>
    </View>
  );
}
function Home({
  elder,
  user,
  navigate,
  doseRevision,
}: {
  elder: number;
  user: User;
  navigate: (tab: string) => void;
  doseRevision: number;
}) {
  const {width, height} = useWindowDimensions();
  const wide = width >= 1050;
  const landscape = height < 460 && width >= 560;
  const room = useContext(ElderViewport);
  const state = useData(`/elders/${elder}/dashboard`, doseRevision),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const caregiver = user.role === "caregiver";
  const pendingAlerts = state.data?.alerts?.filter((alert:CareAlert)=>alert.status==="open").length ?? 0;
  const appointmentsToday = state.data?.appointments.length ?? 0;
  const firstUnconfirmed = state.data?.doses.find((dose:{status:string})=>dose.status!=="taken");
  async function checkIn() {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/elders/${elder}/activity`,"POST");
      setMessage("Seu cuidador já pode ver que você está bem hoje.");
      state.reload();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
  if (!caregiver) {
    const doses: {time_id:number; time:string; name:string; dosage:string; status:string}[] = state.data?.doses ?? [];
    const ordered = [...doses].sort((a,b) => Number(a.status === "taken") - Number(b.status === "taken"));
    const today = new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long"});
    const spacing = room >= 560 ? 12 : 8;
    const greeting = (
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <View style={{flex:1}}>
          <Text accessibilityRole="header" style={s.title}>Olá, {user.name.split(" ")[0]}</Text>
          <Text style={s.muted}>{today}</Text>
        </View>
        <BrandMark size={52}/>
      </View>
    );
    const perPage = room >= 720 && !landscape ? 2 : 1;
    const cards = [
      ...ordered.map(d => <View key={"dose-"+d.time_id} nativeID={d.time_id === firstUnconfirmed?.time_id ? "cuidali-dose-pendente" : undefined}>
          <Card tone="blue">
            <View style={{flexDirection:"row", alignItems:"center", gap:12}}>
              <Image source={require("./assets/prototype/pills.png")} style={{width:38,height:38}} resizeMode="contain" />
              <View style={{flex:1}}><Text style={s.subtitle}>{d.time} · {d.name}</Text>
                <Text style={s.muted}>{d.dosage} · {statusLabel[d.status]}</Text></View>
            </View>
            {d.status !== "taken" && <Button label="✓ Já tomei" busy={busy}
              disabled={state.loading || !!state.error} onPress={() => dose(d.time_id, "taken")} />}
          </Card>
        </View>),
      ...(state.data?.appointments ?? []).map((appointment: any) => <Card key={"consulta-"+appointment.id} tone="yellow">
          <Image source={require("./assets/prototype/calendar.png")} style={{width:34,height:34}} resizeMode="contain" />
          <Text style={s.subtitle}>{appointment.doctor}</Text>
          <Text style={s.text}>{dateTime(appointment.scheduled_at)}</Text>
          <Button label="Ver consultas" tone="light" onPress={() => navigate("Consultas")} />
        </Card>),
    ];
    const reminders = (
      <View style={{gap:spacing}}>
        <Loading state={state} refresh={false} />
        <Text style={s.subtitle}>Lembretes de hoje</Text>
        <Text style={s.muted}>{doses.filter(d => d.status === "taken").length} de {doses.length} doses confirmadas</Text>
        <ElderPages key={`${firstUnconfirmed?.time_id ?? "taken"}:${perPage}`} label="Lembretes">
          {Array.from({length:Math.ceil(cards.length / perPage)}, (_, index) =>
            <View key={index} style={{gap:8}}>
              {cards.slice(index * perPage, (index + 1) * perPage)}
            </View>
          )}
        </ElderPages>
        {state.data && !doses.length && !appointmentsToday && <Text style={s.text}>Nenhum lembrete para hoje.</Text>}
      </View>
    );
    const actions = (
      <View style={{gap:8}}>
        {!!message && <Text accessibilityRole="alert" style={s.text}>{message}</Text>}
        <View style={{flexDirection:"row", flexWrap:"wrap", gap:8}}>
          <Button label="Estou bem hoje" tone="light" disabled={busy} onPress={checkIn} />
          <Button label="Registrar dor" tone="light" onPress={() => navigate("Dores")} />
        </View>
      </View>
    );
    if (landscape) return (
      <View style={{flexDirection:"row",alignItems:"center",gap:20,marginVertical:"auto"}}>
        <View style={{flex:1,minWidth:0,gap:16}}>{greeting}{actions}</View>
        <View style={{flex:1,minWidth:0}}>{reminders}</View>
      </View>
    );
    return (
      <View style={{flexGrow:1,justifyContent:"space-between",gap:spacing}}>
        {greeting}
        {reminders}
        {actions}
      </View>
    );
  }
  return (
    <>
      <DayHero
        name={user.name.split(" ")[0]}
        date={new Date().toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo",weekday:"long",day:"numeric",month:"long"})}
        elderName={caregiver ? state.data?.elder.name : undefined}
        summary={state.data ? {taken:state.data.doses.filter((d:any)=>d.status==='taken').length,total:state.data.doses.length} : undefined}
        wide={wide}
      />
      <Loading state={state} refresh={false} />
      {!!message && (
        <Text accessibilityRole="alert" style={s.text}>
          {message}
        </Text>
      )}
      {state.data && (
        <>
          {caregiver && (
            <Card>
              <Text accessibilityRole="header" style={s.subtitle}>Acompanhamento de hoje</Text>
              <Text style={s.muted}>
                {state.data.last_activity
                  ? `Última atividade do idoso: ${dateTime(state.data.last_activity.created_at)}`
                  : "Ainda não há atividade registrada pelo idoso."}
              </Text>
              <View style={[s.row,{alignItems:"stretch"}]}>
                <MenuTile label={pendingAlerts===1?"1 alerta aguardando":pendingAlerts+" alertas aguardando"}
                  actionLabel="Ver alertas do cuidado" subtitle="Ver pedidos e respostas"
                  icon="bell" warm={pendingAlerts>0} onPress={()=>navigate("Alertas")}/>
                <MenuTile label={appointmentsToday===1?"1 consulta hoje":appointmentsToday+" consultas hoje"}
                  actionLabel="Abrir agenda de cuidados" subtitle="Ver agenda da pessoa idosa"
                  icon="calendar" onPress={()=>navigate("Consultas")}/>
              </View>
            </Card>
          )}
          {user.role === "caregiver" && <Alerts elder={elder} caregiver onUpdated={state.reload} />}
          {user.role === "caregiver" && <Card><Text style={s.subtitle}>Acompanhamento de atividade</Text><Form fields={[{key:"inactivity_hours",label:"Alertar após quantas horas sem atividade?",placeholder:"De 1 a 168"}]} submit="Salvar acompanhamento" onSave={async v=>{await api(`/elders/${elder}/settings`,"PATCH",{inactivity_hours:Number(v.inactivity_hours)});setMessage("Acompanhamento atualizado.");state.reload();}} /></Card>}
          <Text style={s.subtitle}>Remédios de hoje</Text>
          {!state.data.doses.length && (
            <Card><Text style={s.text}>Nenhuma dose prevista para hoje.</Text></Card>
          )}
          {!!state.data.doses.length && <View style={{flexDirection:"row",flexWrap:"wrap",gap:14}}>{state.data.doses.map((d: any) => (
            <View key={d.time_id} nativeID={d.time_id===firstUnconfirmed?.time_id?"cuidali-dose-pendente":undefined}
              style={{flexGrow:1,flexBasis:wide?"46%":"100%",minWidth:0}}><Card>
              <View style={{flexDirection:'row',alignItems:'center',gap:14}}>
                <View style={{width:52,height:52,borderRadius:15,backgroundColor:colors.light,alignItems:'center',justifyContent:'center'}}>
                  <Image source={require("./assets/prototype/pills.png")} style={{width:35,height:35}} resizeMode="contain" />
                </View>
                <View style={{flex:1,gap:3}}><Text style={s.subtitle}>{d.time} · {d.name}</Text><Text style={s.text}>{d.dosage}</Text></View>
              </View>
              <View style={{alignSelf:'flex-start',paddingHorizontal:12,paddingVertical:6,borderRadius:20,backgroundColor:d.status==='taken'?'#DFF4EB':'#EAF1F9'}}>
                <Text style={{fontSize:16,lineHeight:23,fontWeight:'600',color:d.status==='taken'?'#14675C':'#385675'}}>{statusLabel[d.status]}</Text>
              </View>
            </Card></View>
          ))}</View>}
          <Text style={s.subtitle}>Consultas de hoje</Text>
          {!state.data.appointments.length && (
            <Card tone="yellow"><Text style={s.text}>Nenhuma consulta marcada para hoje.</Text></Card>
          )}
          {state.data.appointments.map((a: any) => (
            <Card key={a.id} tone="yellow"><Image source={require("./assets/prototype/calendar.png")} style={{width:48,height:56}} resizeMode="contain" />
              <Text style={s.subtitle}>
                {a.doctor} · {a.specialty}
              </Text>
              <Text style={s.text}>
                {dateTime(a.scheduled_at)}
                {"\n"}
                {a.location}
              </Text>
              <Button label="Adicionar à agenda" tone="light" onPress={()=>{
                if (isBrowserDemo()) setMessage("Consulta de exemplo. A agenda do aparelho fica fora da demonstração.");
                else calendar(a);
              }} />
            </Card>
          ))}
          <Text style={s.subtitle}>Acesso rápido</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>
            <MenuTile label="Medicamentos" actionLabel="Ver todos os medicamentos" subtitle="Horários e doses" icon="pills" onPress={()=>navigate('Medicamentos')}/>
            <MenuTile label="Consultas" actionLabel="Ver próximas consultas" subtitle="Agenda de atendimentos" icon="calendar" warm onPress={()=>navigate('Consultas')}/>
            <MenuTile label="Registros de dores" subtitle={caregiver?"Acompanhe os registros":"Conte como você está se sentindo"} icon="pain" onPress={()=>navigate('Dores')}/>
          </View>
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
  const canWrite = true;
  const caregiver = user.role === "caregiver";
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
        : caregiver
          ? contactFields.map(field => field.key === "is_primary" ? {...field,label:"Contato principal da pessoa idosa"} : field)
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
        <Loading state={state} refresh={caregiver} />
      ) : editing ? (
        <Card>
          {caregiver && <BackButton label="Voltar aos registros" onPress={()=>setEditing(null)} />}
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
          <Loading state={state} refresh={caregiver} />
          {state.data?.items.length === 0 && (
            <Text style={s.text}>Nenhum registro cadastrado.</Text>
          )}
          <ElderPages label="Registro">{state.data?.items.map((item: any) => (
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
                      ? caregiver ? "\n★ Contato principal da pessoa idosa" : "\n★ Contato principal do SOS"
                      : ""}
                  </Text>
                  {!Number(item.is_primary) && (
                    <Button
                      label={caregiver?"Definir como contato principal":"Usar no SOS"}
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
                      setMessage(await callContact(item.phone))
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
                              : "Excluir este contato? Se for o principal, escolha outro após a exclusão.",
                          () => remove(item),
                        )
                      }
                    />
                  </>
                )}
            </Card>
          ))}</ElderPages>
        </>
      )}
    </>
  );
}
// Coordinates follow the illustrated figure; left and right refer to the person.
const bodyMapPoints = [
  ["head", "head", 50, 8],
  ["chest", "upper_back", 50, 26],
  ["abdomen", "lower_back", 50, 37],
  ["left_shoulder", "right_shoulder", 66, 21],
  ["right_shoulder", "left_shoulder", 34, 21],
  ["left_arm", "right_arm", 74, 35],
  ["right_arm", "left_arm", 26, 35],
  ["left_hand", "right_hand", 85, 51],
  ["right_hand", "left_hand", 15, 51],
  ["left_hip", "right_hip", 61, 46],
  ["right_hip", "left_hip", 39, 46],
  ["left_leg", "right_leg", 61, 57],
  ["right_leg", "left_leg", 39, 57],
  ["left_knee", "right_knee", 60, 68],
  ["right_knee", "left_knee", 40, 68],
  ["left_foot", "right_foot", 63, 95],
  ["right_foot", "left_foot", 37, 95],
] as const;

function BodyMap({disabled = false, view, region, onSelect, onIntimate}: {
  view: string;
  region: string;
  onSelect: (region: string) => void;
  disabled?: boolean;
  onIntimate: () => void;
}) {
  const compact = useContext(ElderLayout);
  const room = useContext(ElderViewport);
  const {width:windowWidth, height:windowHeight} = useWindowDimensions();
  const shortWide = windowHeight < 460 && windowWidth >= 560;
  const front = view === "front";
  const height = compact
    ? Math.max(130, Math.min(shortWide ? 250 : 395, (room || 500) - (shortWide ? 165 : windowHeight >= 640 ? 350 : 316)))
    : 430;
  const width = height * 0.62;
  const hitWidth = Math.min(46, height * 0.145);
  const hitHeight = Math.min(44, height * 0.102);

  return (
    <View testID="pain-body-map" style={{width, height, alignSelf:"center"}}>
      <Image
        accessible={false}
        pointerEvents="none"
        source={front ? require("./assets/brand/mapa-dor-frente.jpg") : require("./assets/brand/mapa-dor-costas.jpg")}
        style={{width, height}}
        resizeMode="contain"
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Região íntima"
        accessibilityState={{selected:["penis","scrotum","vulva","perineum","anus"].includes(region),disabled}}
        disabled={disabled} onPress={onIntimate}
        style={{position:"absolute",left:width/2-hitWidth*.4,top:height*.49-hitHeight/2,
          width:hitWidth*.8,height:hitHeight,alignItems:"center",justifyContent:"center",zIndex:1}}>
        <View pointerEvents="none" style={{width:12,height:12,borderRadius:6,borderColor:"#FFF",borderWidth:2,
          backgroundColor:["penis","scrotum","vulva","perineum","anus"].includes(region)?colors.red:colors.blue}} />
      </Pressable>
      {bodyMapPoints.map(([frontRegion, backRegion, x, y]) => {
        const key = front ? frontRegion : backRegion;
        const selected = key === region;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={regions[key]}
            accessibilityState={{selected, disabled}} aria-pressed={selected}
            disabled={disabled}
            onPress={() => onSelect(key)}
            style={{
              position:"absolute", left:width * x / 100 - hitWidth / 2,
              top:height * y / 100 - hitHeight / 2, width:hitWidth, height:hitHeight,
              alignItems:"center", justifyContent:"center",
            }}
          >
            <View pointerEvents="none" style={{
              width:selected ? 16 : 10, height:selected ? 16 : 10, borderRadius:10,
              backgroundColor:selected ? colors.red : colors.blue,
              borderColor:"#FFF", borderWidth:2,
            }} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Pains({ elder, user }: { elder: number; user: User }) {
  const [intimate, setIntimate] = useState(false);
  const [anatomy, setAnatomy] = useState<"male"|"female"|null>(null);
  const {width, height} = useWindowDimensions();
  const shortWide = height < 460 && width >= 560;
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
        {!creating && <Text style={s.title}>Registro de dores</Text>}
        {!!message && (
          <Text accessibilityRole="alert" style={s.text}>
            {message}
          </Text>
        )}
        {user.role === "elder" && !creating && (
          <Button label="Registrar uma dor" onPress={() => setCreating(true)} />
        )}{" "}
        {state.denied ? (
          <Loading state={state} refresh={user.role === "caregiver"} />
        ) : creating ? (
          <>
            <ElderPages label="Etapa">
{intimate ? <View style={{gap:8}}>
  <Text accessibilityRole="header" style={s.subtitle}>Região íntima</Text>
  {view==="front" && <View style={s.row}>
    <Button label="Masculina" tone={anatomy==="male"?"blue":"light"} onPress={()=>setAnatomy("male")} />
    <Button label="Feminina" tone={anatomy==="female"?"blue":"light"} onPress={()=>setAnatomy("female")} />
  </View>}
  <View style={s.row}>
    {(view==="back"?["anus"]:anatomy==="male"?["penis","scrotum","perineum"]:anatomy==="female"?["vulva","perineum"]:[])
      .map(key=><Button key={key} label={regions[key]} onPress={()=>{setRegion(key);setIntimate(false);}} />)}
  </View>
  <Button label="Voltar ao corpo" tone="light" onPress={()=>setIntimate(false)} />
</View> : <View style={{gap:8,flexDirection:shortWide?"row":"column",alignItems:shortWide?"center":"stretch"}}>
          <View style={{gap:8,flex:shortWide?1:undefined}}>
            <Text style={s.subtitle}>Onde dói?</Text>
            <Text style={s.muted} accessibilityLiveRegion="polite">Local: {regions[region]}</Text>
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
                    if (v!==view && ["penis","scrotum","vulva","perineum","anus"].includes(region)) {
                      setRegion(v==="front"?"abdomen":"lower_back");
                      return;
                    }
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
          </View>
            <BodyMap
              view={view}
              region={region}
              onSelect={setRegion}
              onIntimate={()=>setIntimate(true)}
              disabled={busy}
            />
            <Pressable accessibilityRole="button" onPress={()=>setIntimate(true)} disabled={busy}
              style={{alignSelf:"center",paddingHorizontal:12,minHeight:44,justifyContent:"center"}}>
              <Text style={{color:colors.blue,fontWeight:"700",textDecorationLine:"underline"}}>Selecionar região íntima</Text>
            </Pressable>
</View>}
<View style={{gap:8}}>
            <Text style={s.subtitle}>Local: {regions[region]}</Text>
            <Text style={s.muted}>
              Também é possível selecionar pela lista:
            </Text>
            <ElderPages label="Locais">
              {Array.from({length:3}, (_, page) => (
                <View key={page} style={s.row}>
                  {Object.entries(regions)
                    .filter(([key]) => view === "front"
                      ? !["upper_back", "lower_back"].includes(key)
                      : !["chest", "abdomen"].includes(key))
                    .slice(page * 6, page * 6 + 6)
                    .map(([key, label]) => (
                      <Button key={key} label={(region === key ? "✓ " : "") + label}
                        tone={region === key ? "blue" : "light"} onPress={() => setRegion(key)} />
                    ))}
                </View>
              ))}
            </ElderPages>
</View>
<View style={{gap:8}}>
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
</View>
<View style={{gap:8}}>
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
</View>
<View style={{gap:8}}>
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
            /></View>
            </ElderPages>
          </>
        ) : (
          <>
            <Loading state={state} refresh={user.role === "caregiver"} />
            {state.data?.items.length === 0 && (
              <Text style={s.text}>Nenhuma dor registrada.</Text>
            )}
            {user.role === "caregiver" && !!state.data?.items.length && (
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
            <ElderPages label="Registro">{state.data?.items.map((p: any) => (
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
            ))}</ElderPages>
          </>
        )}
      </>
    </FormBusy.Provider>
  );
}
function Links({
  user,
  selectedElder,
  onSelect,
  onRemove,
}: {
  user: User;
  selectedElder: number;
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
      {user.role==="caregiver" && state.data && <Text style={s.muted}>
        {state.data.items.length === 1 ? "1 pessoa vinculada" : state.data.items.length+" pessoas vinculadas"}
      </Text>}
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
            Use um código de cada pessoa idosa para vinculá-la. Seus vínculos anteriores continuam disponíveis.
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
      <ElderPages label="Vínculo">{state.data?.items.map((u: any) => (
        <Card key={u.id}>
          <Text style={s.subtitle}>{u.name}</Text>
          {user.role === "caregiver" && (
            <Button
              label={Number(u.id)===selectedElder?"Voltar ao painel de "+u.name:"Acompanhar esta pessoa"}
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
      ))}</ElderPages>
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
    [message, setMessage] = useState(""), [history, setHistory] = useState(guidedStep() === "done");
  const contact = state.data?.items.find(
    (c: any) => Number(c.is_primary) === 1,
  );
  if (history) return <>
    <Text style={s.title}>Meus pedidos de ajuda</Text>
    <Button label="Voltar para o SOS" tone="light" onPress={() => setHistory(false)} />
    <Alerts elder={elder} caregiver={false} />
  </>;
  return (
    <>
      <Text style={s.title}>Precisa de ajuda?</Text>
      <Loading state={state} refresh={false} />
      {contact ? (
        <Card>
          <Text style={s.subtitle}>
            {contact.name} ({contact.relationship})
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`SOS: pedir ajuda a ${contact.name}`}
            onPress={() =>
              confirmAction(
                isBrowserDemo() ? "Registrar um pedido de ajuda de exemplo?" :
                  `Enviar pedido de ajuda aos cuidadores e ligar para ${contact.name}?`,
                async () => {
                  try {
                    const result = await api(`/elders/${elder}/sos`, "POST");
                    const detail = isBrowserDemo() ? "" : Platform.OS !== "web" || window.CuidaliNative
                      ? " " + await callContact(contact.phone) : " Use Ligar para abrir o discador.";
                    setMessage(result.message + detail);
                  } catch (e) {
                    setMessage("Não foi possível registrar o alerta. " + await callContact(contact.phone));
                  }
                },
              )
            }
            style={{
              height: 72,
              width: 128,
              borderRadius: 24,
              backgroundColor: "#FAD5D5",
              alignSelf: "center",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={[s.title, { color: colors.red }]}>☎ SOS</Text>
          </Pressable>
          <Button label={`Ligar para ${contact.name}`} tone="light" onPress={async()=>setMessage(await callContact(contact.phone))} />
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
      {!contact && <Button label="Enviar pedido de ajuda aos cuidadores" tone="red" onPress={async()=>{try { const r=await api(`/elders/${elder}/sos`,"POST");setMessage(r.message); } catch(e) {setMessage((e as Error).message);} }} />}
      <Button label="Meus pedidos de ajuda" tone="light" onPress={() => setHistory(true)} />
      {!!message && <Text accessibilityRole="alert" style={s.text}>{message}</Text>}

    </>
  );
}
type AlertStatus = "open" | "accepted" | "resolved";
type CareAlert = {id:number;kind:string;status:AlertStatus;created_at:string;accepted_name?:string};
const alertFilters = [
  {status:"all",label:"Todos"},
  {status:"open",label:"Aguardando"},
  {status:"accepted",label:"Em acompanhamento"},
  {status:"resolved",label:"Concluídos"},
] as const;
function Alerts({elder,caregiver,showFilters=false,onUpdated}:{elder:number;caregiver:boolean;showFilters?:boolean;onUpdated?:()=>void}) {
  const state=useData(`/elders/${elder}/alerts`),[message,setMessage]=useState("");
  const [filter,setFilter]=useState<AlertStatus|"all">("all");
  const items: CareAlert[] = state.data?.items ?? [];
  const filtered = filter==="all" ? items : items.filter(item=>item.status===filter);
  const visible = showFilters ? filtered : filtered.slice(0,15);
  useEffect(()=>{const t=setInterval(state.reload,15000);return ()=>clearInterval(t);},[state.reload]);
  const names:Record<string,string>={sos:"Pedido de ajuda",inactivity:"Ausência de atividade",pain:"Novo registro de dor"};
  async function update(id:number,status:string){try {const r=await api(`/elders/${elder}/alerts/${id}`,"PATCH",{status});setMessage(r.message);state.reload();onUpdated?.();}catch(e){setMessage((e as Error).message);}}
  return <><Text accessibilityRole="header" style={showFilters?s.title:s.subtitle}>Alertas e acompanhamento</Text>{!!state.error&&<Text style={s.error}>{state.error}</Text>}
    {showFilters&&state.data&&(
      <View style={[s.row,{gap:8}]} accessibilityLabel="Filtrar alertas por status">
        {alertFilters.map(option=>{
          const count=option.status==="all"?items.length:items.filter(item=>item.status===option.status).length;
          const selected=filter===option.status;
          return <Pressable key={option.status} accessibilityRole="button" aria-pressed={selected}
            onPress={()=>setFilter(option.status)}
            style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>({
              minHeight:48,paddingHorizontal:12,paddingVertical:9,borderRadius:12,justifyContent:"center",
              borderWidth:1,borderColor:selected?"#225BA5":"#D8E4F1",
              backgroundColor:selected?"#225BA5":pressed||hovered?colors.light:"#FFF",
            })}>
            <Text style={{fontSize:16,lineHeight:22,fontWeight:"700",color:selected?"#FFF":colors.dark}}>
              {option.label} ({count})
            </Text>
          </Pressable>;
        })}
      </View>
    )}
    {state.data&&!filtered.length&&<Text style={s.text}>{filter==="all"?"Nenhum alerta registrado.":"Nenhum alerta com esse status."}</Text>}
    <ElderPages label="Pedido">{visible.map(a=><Card key={a.id} tone={a.status==='open'?'yellow':undefined}>
      <Text style={s.subtitle}>{names[a.kind]}</Text>
      <View style={s.row}>
        <Text style={s.muted}>{dateTime(a.created_at)}</Text>
        <Text style={[s.muted,{backgroundColor:a.status==='open'?'#F8E8C7':'#E2F2EB',
          color:a.status==='open'?'#704A16':colors.green,fontWeight:'700',paddingHorizontal:10,paddingVertical:4,borderRadius:10}]}>
          {a.status==='open'?'Aguardando cuidador':a.status==='accepted'?'Em acompanhamento':'Concluído'}
        </Text>
      </View>
      {!!a.accepted_name&&<Text style={s.text}>Acompanhado por {a.accepted_name}</Text>}
      {caregiver&&a.status!=='resolved'&&<View style={s.row}>
        {a.status==='open'&&<Button label="Vou acompanhar" onPress={()=>update(a.id,'accepted')} />}
        <Button label="Concluir atendimento" tone={a.status==='open'?'light':'blue'} onPress={()=>confirmAction('Você verificou a situação e deseja concluir este alerta?',()=>update(a.id,'resolved'))} />
      </View>}
    </Card>)}</ElderPages>{!!message&&<Text accessibilityRole="alert" style={s.text}>{message}</Text>}</>;
}
function Assistant({elder,caregiver,navigate}:{elder:number;caregiver:boolean;navigate:(tab:string)=>void}) {
  const state=useData(`/elders/${elder}/assistant`),[message,setMessage]=useState(""),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[action,setAction]=useState<string|null>(null),[confirmations,setConfirmations]=useState<any[]>([]),[doseDate,setDoseDate]=useState("");
  const [latest, setLatest] = useState<{reply:string; mode?:string}|null>(null);
  const [useAI, setUseAI] = useState(false);
  const aiOption = state.data?.ai_available && <Pressable accessibilityRole="switch"
    accessibilityLabel="Interpretar minhas perguntas com IA" accessibilityState={{checked:useAI}}
    onPress={()=>setUseAI(value=>!value)} style={{padding:10,backgroundColor:colors.light,borderRadius:12,gap:4}}>
    <Text style={s.label}>{useAI?"✓ IA ativada":"Ativar IA para interpretar perguntas"}</Text>
    <Text style={s.muted}>Envia o texto da pergunta à OpenAI. Evite escrever dados pessoais ou de saúde.</Text>
  </Pressable>;
  const cleanup=useRef<()=>void>(()=>{});useEffect(()=>()=>cleanup.current(),[]);
  async function ask(value:string){if(busy||!value.trim())return;setBusy(true);setMessage("");try{const r=await api(`/elders/${elder}/assistant`,"POST",{message:value,use_ai:useAI});setDraft("");setLatest({reply:r.reply,mode:r.mode});setAction(r.action);setConfirmations(r.confirmation_doses||[]);setDoseDate(r.date||"");state.reload();speak(r.reply);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  const actions = <View style={{gap:8}}>
    <ElderPages label="Dose">{confirmations.map((d:any)=><Button key={d.time_id} label={`Confirmar ${d.name} · ${d.time}`} onPress={()=>confirmAction(`Você tomou ${d.name}, ${d.dosage}, da dose das ${d.time}?`,async()=>{try{await api(`/elders/${elder}/doses/${d.time_id}`,"POST",{date:doseDate,status:"taken"});setConfirmations(v=>v.filter(x=>x.time_id!==d.time_id));setMessage("Dose confirmada.");}catch(e){setMessage((e as Error).message);}})} />)}</ElderPages>
    {!!action&&<Button label={'Abrir '+(caregiver&&action==='SOS'?'Alertas':action)} onPress={()=>navigate(action)}/>}
</View>;
  if (!caregiver) return <>
    <Text style={s.title}>Seu assistente</Text>
    {!!message && <Text accessibilityRole="alert" style={s.error}>{message}</Text>}
    {latest ? <>
      <Card>{useAI&&<Text style={s.muted}>{latest.mode==="ai"?"Pergunta interpretada com IA":"Pergunta interpretada pelo Cuidali"}</Text>}<Text style={s.text}>{latest.reply}</Text><Button label="Ouvir resposta" tone="light" onPress={()=>speak(latest.reply)} /></Card>
      {actions}
      <Button label="Fazer outra pergunta" tone="light" onPress={()=>setLatest(null)} />
    </> : <ElderPages label="Assistente">
      <View key="ask" style={{gap:8}}>    <Text style={s.label}>Como posso ajudar?</Text><TextInput style={s.input} accessibilityLabel="Mensagem para o assistente" value={draft} onChangeText={setDraft} maxLength={500} multiline />
    <Button label="Enviar" busy={busy} onPress={()=>ask(draft)} />
    <Button label="Falar com o assistente" tone="light" disabled={busy} onPress={()=>{cleanup.current();cleanup.current=listen(value=>{setDraft(value);ask(value);},setMessage);}} />
</View>
      {aiOption && <View key="settings" style={{gap:8}}>{aiOption}</View>}
      <View key="shortcuts" style={{gap:8}}><Text style={s.subtitle}>Perguntas rápidas</Text>    <View style={s.row}>
      {(caregiver ? ['Remédios de hoje','Próximas consultas','Que dia é hoje?','Ver alertas'] :
        ['Meus remédios','Minhas consultas','Que dia é hoje?','Preciso de ajuda']).map(q=><Button key={q} label={q} tone="light" disabled={busy} onPress={()=>ask(q)} />)}
    </View>
</View>
    {state.data?.items.map((i:any)=><Card key={i.id}><Text style={s.muted}>Você</Text><Text style={s.text}>{i.content}</Text><Text style={s.muted}>Resposta</Text><Text style={s.text}>{i.reply}</Text><Button label="Ouvir resposta" tone="light" onPress={()=>speak(i.reply)}/></Card>)}
    </ElderPages>}
  </>;
  return <><Text style={s.title}>Seu assistente</Text><Text style={s.text}>Consulte seus medicamentos, consultas e cuidados por texto ou voz.</Text>{aiOption}
    {state.data?.items.map((i:any)=><Card key={i.id}><Text style={s.muted}>Você</Text><Text style={s.text}>{i.content}</Text><Text style={s.muted}>Resposta</Text><Text style={s.text}>{i.reply}</Text><Button label="Ouvir resposta" tone="light" onPress={()=>speak(i.reply)}/></Card>)}
    <Text style={s.label}>Como posso ajudar?</Text><TextInput style={s.input} accessibilityLabel="Mensagem para o assistente" value={draft} onChangeText={setDraft} maxLength={500} multiline />
    <Button label="Enviar" busy={busy} onPress={()=>ask(draft)} />
    <Button label="Falar com o assistente" tone="light" disabled={busy} onPress={()=>{cleanup.current();cleanup.current=listen(value=>{setDraft(value);ask(value);},setMessage);}} />
    <View style={s.row}>
      {(caregiver ? ['Remédios de hoje','Próximas consultas','Que dia é hoje?','Ver alertas'] :
        ['Meus remédios','Minhas consultas','Que dia é hoje?','Preciso de ajuda']).map(q=><Button key={q} label={q} tone="light" disabled={busy} onPress={()=>ask(q)} />)}
    </View>
{actions}{!!message&&<Text accessibilityRole="alert" style={s.error}>{message}</Text>}</>;
}
function Reminders({user,navigate,onRecorded}:{user:User;navigate:(tab:string)=>void;onRecorded:()=>void}) {
  const compact = useWindowDimensions().width < 600;
  const [notice,setNotice]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const seen=useRef(new Set<string>());
  useEffect(()=>{let alive=true;async function poll(){try{
    const data=await api('/notifications');if(!alive)return;
    if(user.role==='elder'){
      const time=new Date().toLocaleTimeString('sv-SE',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
      const due=data.doses.find((d:any)=>d.status!=='taken'&&d.time<=time&&!seen.current.has(data.date+':'+d.time_id));
      if(due){seen.current.add(data.date+':'+due.time_id);setNotice({...due,date:data.date});speak(`Lembrete de medicamento. ${due.name}, ${due.dosage}. Confira a dose antes de confirmar.`);}
    }else if(Platform.OS==='web'&&!isBrowserDemo()&&!window.CuidaliNative&&!window.CuidaliWebPush?.isEnabled()&&'Notification' in window&&Notification.permission==='granted'){
      for(const a of data.items){const key='alert:'+a.id;if(!seen.current.has(key)){seen.current.add(key);new Notification(a.kind==='sos'?'Cuidali · Pedido de ajuda':'Cuidali · Novo aviso de cuidado',{body:'Abra o painel para acompanhar.',tag:key});}}
    }
  }catch{} }
  poll();const timer=setInterval(poll,20000);return()=>{alive=false;clearInterval(timer);};},[user.id]);
  if(!notice)return null;
  async function confirm(status:string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/elders/${user.id}/doses/${notice.time_id}`,"POST",{date:notice.date,status});
      setNotice(null);
      onRecorded();
      navigate("Início");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal transparent animationType="fade" onRequestClose={()=>setNotice(null)}>
      <View style={{flex:1,justifyContent:"center",alignItems:"center",padding:16,backgroundColor:"#071B3370"}}>
      <View style={{width:"100%",maxWidth:460}} accessibilityViewIsModal>
    <Card tone="yellow">
      <View style={{flexDirection:"row",gap:12,alignItems:"center"}}>
        <AppIcon name="bell" color="#79511C"/>
        <View style={{flex:1}}>
          <Text accessibilityRole="header" style={s.subtitle}>Lembrete de medicamento</Text>
          <Text style={s.text}>{notice.time} · {notice.name} · {notice.dosage}</Text>
        </View>
      </View>
      <View style={s.row}>
        <View style={compact&&{flex:1}}><Button label="Já tomei" busy={busy} onPress={()=>confirm('taken')}/></View>
        <View style={compact&&{flex:1}}><Button label="Ainda não tomei" disabled={busy} tone="light" onPress={()=>confirm('pending')}/></View>
        <View style={compact&&{width:"100%"}}><Button label="Ver medicamentos" disabled={busy} tone="light" onPress={()=>{setNotice(null);navigate('Medicamentos');}}/></View>
      </View>
      {!!error&&<Text style={s.error}>{error}</Text>}
      <Button label="Fechar lembrete" tone="light" onPress={()=>setNotice(null)} />
    </Card>
    </View></View></Modal>
  );
}
function ServerSetup({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [address, setAddress] = useState(getServer());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function connect() {
    if (busy) return;
    setBusy(true); setError("");
    try { const server = await checkServer(address); await saveServer(server); onDone(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Card>
    <Text style={s.title}>Conectar o Cuidali</Text>
    <Text style={s.text}>Peça à pessoa responsável pela instalação o endereço do servidor Cuidali.</Text>
    <Text style={s.label}>Endereço do servidor</Text>
    <TextInput accessibilityLabel="Endereço do servidor" style={s.input} value={address}
      onChangeText={setAddress} autoCapitalize="none" autoCorrect={false} keyboardType="url"
      placeholder="https://seu-servidor" editable={!busy} />
    <Text style={s.muted}>Use o endereço fornecido pela sua organização para conectar seus cuidados.</Text>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Button label="Testar conexão e continuar" onPress={connect} busy={busy} />
    {onCancel && <Button label="Voltar" onPress={onCancel} disabled={busy} tone="light" />}
  </Card>;
}
export default function App() {
  const {width,height} = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 980;
  const [elderHeight, setElderHeight] = useState(0);
  const shortWide = height < 460 && width >= 560;
  const [setup, setSetup] = useState(false);
  const [drawerOpen,setDrawerOpen] = useState(false);
  const [railCollapsed,setRailCollapsed] = useState(()=>{
    if (Platform.OS!=="web") return false;
    try { return window.localStorage.getItem("cuidali.menu.recolhido")==="1"; }
    catch { return false; }
  });
  const [doseRevision, setDoseRevision] = useState(0);
  const [user, setUser] = useState<User | null>(null),
    [starting, setStarting] = useState(true),
    [tab, setTabState] = useState("Início"),
    [elder, setElder] = useState(0),
    [sessionMessage, setSessionMessage] = useState(""),
    [logoutBusy, setLogoutBusy] = useState(false);
  const navigationHistory = useRef<string[]>([]);
  const currentTab = useRef("Início");
  const caregiver = user?.role === "caregiver";
  const elderLayout = user?.role === "elder";
  const demo = !!user && isBrowserDemo();
  const step = useSyncExternalStore(subscribeDemo,guidedStep,()=>null);
  useEffect(() => {
    if (desktop || !user) setDrawerOpen(false);
  }, [desktop,user?.id]);
  useEffect(() => {
    if (!desktop) return;
    try { window.localStorage.setItem("cuidali.menu.recolhido",railCollapsed?"1":"0"); }
    catch { /* The layout still works without browser storage. */ }
  }, [desktop,railCollapsed]);
  function setTab(next:string) {
    const destination = caregiver && next === "SOS" ? "Alertas" : next;
    if (destination !== currentTab.current) {
      navigationHistory.current.push(currentTab.current);
      currentTab.current = destination;
      setTabState(destination);
    }
  }
  function goBack(){const previous=navigationHistory.current.pop() || "Início";currentTab.current=previous;setTabState(previous);}
  const sessionGeneration = useRef(0);
  function loggedIn(u: User, openDemoCare=false) {
    const demoStep=guidedStep();
    const demoElder=u.role==="caregiver" && (openDemoCare || demoStep==="accept" || demoStep==="switch-elder")
      ? linkedDemoElder() : 0;
    sessionGeneration.current++;
    setUser(u);
    setElder(u.role==="elder" ? Number(u.id) : demoElder);
    setDrawerOpen(false);
    navigationHistory.current = [];
    if (u.role==="elder") {
      currentTab.current=demoStep==="request" || demoStep==="switch-caregiver" || demoStep==="done" ? "SOS" : "Início";
    } else {
      currentTab.current=demoElder ? (demoStep==="switch-elder" ? "Alertas" : "Início") : "Vínculos";
    }
    setTabState(currentTab.current);
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
        if (!(await restoreServer())) { setSetup(true); return; }
        if (await restoreToken()) {
          const r = await api("/me");
          loggedIn(r.user);
        }
      } catch (e) {
        setSessionMessage(e instanceof ApiError && e.status===401 ? "" : (e as Error).message);
      } finally {
        setStarting(false);
      }
    })();
    return () => setExpiredHandler(() => {});
  }, []);
  useEffect(()=>{
    if(!user||demo||Platform.OS!=='web'||window.CuidaliNative)return;
    const restore=()=>window.CuidaliWebPush?.restore(token=>api('/push-tokens','POST',{token,platform:'web'})).catch(()=>{});
    restore();window.addEventListener('cuidali-push-ready',restore);return()=>window.removeEventListener('cuidali-push-ready',restore);
  },[user?.id,demo]);
  async function logout() {
    if (logoutBusy) return;
    if (demo) {
      endBrowserDemo();
      setUser(null);
      setElder(0);
      setSessionMessage("");
      return;
    }
    setLogoutBusy(true);
    const generation = ++sessionGeneration.current;
    if(Platform.OS==='web'&&!window.CuidaliNative)window.CuidaliWebPush?.disable(token=>api('/push-tokens','DELETE',{token})).catch(()=>{});
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

  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab, elder, step]);
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

  let screen: React.ReactNode = null;
  if (user) {
    if (tab === "Vínculos")
      screen = (
        <Links
          user={user}
          selectedElder={elder}
          onRemove={(id) => {
            if (user.role === "caregiver" && elder === id) setElder(0);
          }}
          onSelect={(id) => {
            setElder(id);
            if (id) setTab("Início");
          }}
        />
      );
    else if (tab === "Meus dados") screen=<AccountProfile user={user} onSaved={setUser} />;
    else if (tab === "Cuidados" && elderLayout)
      screen = <><Text accessibilityRole="header" style={s.title}>Meu cuidado</Text>
        <ElderPages label="Menu">
          <View key="routine" style={shortWide?s.row:{gap:8}}>
            {["Medicamentos", "Consultas", "Dores", "Contatos", "Vínculos"].map(label =>
              <Button key={label} label={label} tone="light" onPress={() => setTab(label)} />)}
          </View>
          <View key="account" style={shortWide?s.row:{gap:8}}>
            <Button label="Meus dados" tone="light" onPress={()=>setTab("Meus dados")} />
            <View style={s.row}><LegalLink kind="terms" /><LegalLink kind="privacy" /></View>
            <Button label="Avisos neste dispositivo" tone="light" onPress={() => setTab("Avisos")} />
            <Button label={demo ? "Sair da demonstração" : "Sair da conta"} tone="red" busy={logoutBusy} onPress={() => confirmAction("Sair desta conta?", logout)} />
          </View>
          {demo && <Button label="Ver como cuidador" tone="light" onPress={()=>loggedIn(switchDemoProfile(),true)} />}
        </ElderPages></>;
    else if (tab === "Avisos" && elderLayout) screen = <>
      <Text style={s.title}>Avisos</Text>
      {Platform.OS === "web" && !!window.CuidaliNative ? <>
        <Button label="Ativar avisos neste aparelho" onPress={() => {window.CuidaliNative?.setMonitoring(true);setSessionMessage("Avisos ativados.");}} />
        <Button label="Desativar avisos neste aparelho" tone="light" onPress={() => {window.CuidaliNative?.setMonitoring(false);setSessionMessage("Avisos desativados.");}} />
      </> : !demo && Platform.OS === "web" && typeof Notification !== "undefined" ?
        <Button label="Ativar avisos neste navegador" onPress={async () => {
          try {
            if (!window.CuidaliWebPush) throw new Error("Avisos indisponíveis. Tente novamente.");
            setSessionMessage(await window.CuidaliWebPush.activate(token => api("/push-tokens","POST",{token,platform:"web"})));
          } catch(error) {setSessionMessage((error as Error).message);}
        }} /> : <Text style={s.text}>Avisos indisponíveis nesta sessão.</Text>}
      </>;
    else if (tab === "Cuidados")
      screen = (
        <>
          <Text accessibilityRole="header" style={s.title}>{caregiver?"Cuidados da pessoa acompanhada":"Seu espaço de cuidado"}</Text>
          <Text style={s.subtitle}>{caregiver?"Rotina de cuidado":"Sua rotina"}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}><MenuTile label="Medicamentos" subtitle="Doses e horários" icon="pills" onPress={()=>setTab('Medicamentos')}/><MenuTile label="Consultas" subtitle="Agenda e próximos encontros" icon="calendar" warm onPress={()=>setTab('Consultas')}/></View>
          <MenuRow label="Dores" subtitle={caregiver?"Acompanhe como a pessoa idosa está se sentindo":"Registre e acompanhe como está se sentindo"} icon="pain" onPress={()=>setTab('Dores')}/>
          <MenuRow label="Contatos" subtitle="Pessoas de confiança para uma ligação" icon="contacts" onPress={()=>setTab('Contatos')}/>
          <MenuRow label="Vínculos" subtitle={caregiver?"Pessoas que você acompanha":"Quem compartilha o cuidado com você"} icon="link" onPress={()=>setTab('Vínculos')}/>
          <Text style={[s.subtitle,{marginTop:12}]}>Sua conta</Text>
          <MenuRow label="Meus dados" subtitle="Perfil, e-mail e entrada com biometria" icon="person" onPress={()=>setTab('Meus dados')}/>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}><LegalLink kind="terms" /><LegalLink kind="privacy" /></View>
          {!demo && <Text style={[s.subtitle,{marginTop:12}]}>Avisos neste dispositivo</Text>}
          {!demo && Platform.OS === "web" && !window.CuidaliNative && typeof Notification !== 'undefined' && <Button label="Ativar avisos neste navegador" tone="light" onPress={async()=>{try { if(!window.CuidaliWebPush) throw new Error("Os avisos ainda estão carregando. Tente novamente em instantes.");const message=await window.CuidaliWebPush.activate(token=>api('/push-tokens','POST',{token,platform:'web'}));setSessionMessage(message); } catch(e) {setSessionMessage((e as Error).message);}}} />}
          {Platform.OS === "web" && !!window.CuidaliNative && <Button label="Ativar avisos neste aparelho" tone="light" onPress={()=>{window.CuidaliNative?.setMonitoring(true);setSessionMessage("Acompanhamento ativado neste aparelho.");}} />}
          {Platform.OS === "web" && !!window.CuidaliNative && <Button label="Desativar avisos neste aparelho" tone="light" onPress={()=>{window.CuidaliNative?.setMonitoring(false);setSessionMessage("Avisos desativados neste aparelho.");}} />}
          <Button
            label="Sair da conta"
            tone="red"
            onPress={() => confirmAction("Sair desta conta?", logout)}
            busy={logoutBusy}
          />
        </>
      );
    else if (tab === "Assistente" && elder) screen = <Assistant key={elder} elder={elder} caregiver={caregiver} navigate={setTab} />;
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
      screen = <Home key={elder} elder={elder} user={user} navigate={setTab} doseRevision={doseRevision} />;
    else if (tab === "SOS" && !caregiver)
      screen = <SOS key={elder} elder={elder} navigate={setTab} />;
    else if (tab === "Alertas" && caregiver)
      screen = <Alerts key={elder} elder={elder} caregiver showFilters />;
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
  const Content = elderLayout ? View : ScrollView;
  return (
    <ElderLayout.Provider value={elderLayout}>
    <ElderViewport.Provider value={elderHeight}>
    <SafeAreaProvider>
      <SafeAreaView style={[s.page, elderLayout && {backgroundColor:"#FFF",overflow:"hidden"}]}>
        <StatusBar style="dark" />
        <View aria-hidden={drawerOpen&&!desktop}
          importantForAccessibility={drawerOpen&&!desktop?"no-hide-descendants":"auto"}
          style={{flex:1,flexDirection:desktop&&!elderLayout?"row":"column"}}>
        {user && desktop && !elderLayout && (
          <CareSidebar name={user.name} caregiver={caregiver} screen={tab} onNavigate={setTab}
            collapsed={railCollapsed} onToggle={()=>setRailCollapsed(value=>!value)}/>
        )}
        <KeyboardAvoidingView
          style={{ flex: 1, minWidth:0 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {user && !desktop && !elderLayout && (
            <View style={{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:16,
              borderBottomWidth:1,borderColor:"#DAE4F0",backgroundColor:"#FFF"}}>
              <MenuToggle label="Abrir menu" icon="menu" expanded={drawerOpen} controls="cuidali-mobile-menu"
                onPress={()=>setDrawerOpen(true)}/>
              <View style={{flex:1,minWidth:0}}>
                <BrandHeader name={user.name} compact onProfile={()=>setTab("Meus dados")}/>
              </View>
            </View>
          )}
          <Content {...(elderLayout ? {
            testID:"elder-content",
            onLayout:({nativeEvent}:LayoutChangeEvent)=>setElderHeight(Math.round(nativeEvent.layout.height)),
            style:[s.content,{
              flex:1,minHeight:0,overflow:"hidden",maxWidth:shortWide ? 740 : 550,
              paddingHorizontal:width >= 380 ? 22 : 16,
              paddingVertical:height < 640 ? 8 : 20,
              gap:height < 640 ? 6 : 12,
            }],
          } : {
            ref:scroll, keyboardShouldPersistTaps:"handled",
            contentContainerStyle:[s.content, desktop && {padding:32,paddingTop:28,maxWidth:user?1120:1240}],
          })}>
            {!!sessionMessage && (
              <Text accessibilityRole="alert" style={s.error}>
                {sessionMessage}
              </Text>
            )}
            {starting ? (
              <ActivityIndicator size="large" />
            ) : setup ? (
              <ServerSetup onDone={() => { setSetup(false); setSessionMessage(""); }}
                onCancel={getServer() ? () => setSetup(false) : undefined} />
            ) : user ? (
              <>
                {demo && !elderLayout && (
                  <View style={[s.row,{justifyContent:"space-between",backgroundColor:colors.light,
                    borderRadius:12,paddingLeft:12,paddingRight:6}]}>
                    <Text style={[s.muted,{fontWeight:"700",fontSize:14}]}>Dados de demonstração</Text>
                    {!step&&<Pressable accessibilityRole="button"
                      onPress={()=>loggedIn(switchDemoProfile(),true)}
                      style={{minHeight:48,justifyContent:"center",paddingHorizontal:8}}>
                      <Text style={[s.muted,{color:colors.blue,textDecorationLine:"underline"}]}>
                        {caregiver?"Ver como pessoa idosa":"Ver como cuidador"}
                      </Text>
                    </Pressable>}
                    <Pressable accessibilityRole="button" onPress={logout}
                      style={{minHeight:44,justifyContent:"center",paddingHorizontal:8}}>
                      <Text style={[s.muted,{fontSize:14,color:colors.blue,textDecorationLine:"underline"}]}>Sair da demonstração</Text>
                    </Pressable>
                  </View>
                )}
                {demo&&step&&(!elderLayout || (step==="switch-caregiver" && tab==="SOS") || (["done","request"].includes(step) && tab==="Início"))&&<DemoGuide compact={elderLayout} step={step} screen={tab} onNavigate={setTab}
                  onFindDose={()=>{
                    const dose=document.getElementById("cuidali-dose-pendente");
                    if (!elderLayout) dose?.scrollIntoView({block:"center"});
                    dose?.querySelector<HTMLElement>('[aria-label="✓ Já tomei"]')?.focus({preventScroll:true});
                  }}
                  onSwitch={()=>loggedIn(switchDemoProfile(),true)}
                  onRestart={()=>loggedIn(startGuidedDemo())}/>}
                {caregiver && tab !== "Vínculos" && (
                  <View style={{alignSelf:desktop?"flex-end":"stretch"}}>
                    <Button label="Trocar ou vincular uma pessoa idosa" tone="light" onPress={() => setTab("Vínculos")} />
                  </View>
                )}
                {tab !== "Início" && !(elderLayout && ["Cuidados","SOS","Assistente"].includes(tab)) && <BackButton onPress={goBack} />}
                {!step&&<Reminders user={user} navigate={setTab} onRecorded={()=>setDoseRevision(value=>value+1)} />}
                {elderLayout && tab !== "Início"
                  ? <View testID="elder-screen" style={{marginVertical:"auto",flexShrink:0,gap:height < 640 ? 8 : 14}}>{screen}</View>
                  : screen}

              </>
            ) : (
              <>
                <Auth wide={desktop} onLogin={loggedIn} onScreenChange={()=>scroll.current?.scrollTo({y:0,animated:false})} />
                {Platform.OS !== "web" && !androidWebPackage && <Button label="Configurar servidor" tone="light" onPress={() => setSetup(true)} />}
              </>
            )}
          </Content>
        </KeyboardAvoidingView>
        {user && (!desktop || elderLayout) && <CareTabs caregiver={caregiver} screen={tab} onNavigate={setTab}/>}
        </View>
        {user && !desktop && !elderLayout && (
          <CareDrawer name={user.name} caregiver={caregiver} screen={tab} visible={drawerOpen}
            onToggle={()=>setDrawerOpen(false)}
            onNavigate={next=>{setDrawerOpen(false);setTab(next);}}/>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
    </ElderViewport.Provider>
    </ElderLayout.Provider>
  );
}
