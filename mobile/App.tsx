import {View, Text, Pressable, TextInput} from "./src/Appearance";
import {AppearanceProvider,themedStyle,useAppearance,usePreferences} from "./src/Appearance";
import {AccessibilityPanel,ReadScreenButton,UtilityButton} from "./src/AccessibilityPanel";
import {CareIcon,FilterBar,Initials,Metric,ScreenHeading,Status,TimelineRow} from "./src/CarePanels";
import {CareHistory,CareSchedule,WeekPicker,type Appointment,type Medicine} from "./src/CareRecords";
import {todaySP} from "./src/validation";
import { ElderLayout, ElderPages, ElderViewport } from "./src/ElderPages";
import {AppIcon,BrandMark,AuthBrandPanel,BrandHeader,DayHero,MenuTile,MenuRow} from "./src/Visual";
import {CareDrawer,CareSidebar,CareTabs,MenuToggle} from "./src/CareNavigation";
import {AccountProfile,PasswordRecovery,LegalLink} from "./src/AccountScreens";
import {Welcome} from "./src/Welcome";
import {ElderCalendar} from "./src/Calendar";
import {ActionFeedback, FeedbackNotice, type Feedback} from "./src/ActionFeedback";
import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import {
  AppState,
  useWindowDimensions,
  Image,
  BackHandler,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
  sexField,
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
  endBrowserDemo, isBrowserDemo, linkedDemoElder, startBrowserDemo, switchDemoProfile,
} from "./src/demo";

function callContact(phone: string) {
  return isBrowserDemo() ? Promise.resolve("Ligação simulada na demonstração.") : openDialer(phone);
}
const profileFields: Field[] = [
  { key: "name", label: "Nome completo" },
  { key: "birth_date", label: "Nascimento", placeholder: "DD/MM/AAAA" },
  { key: "phone", label: "Telefone com DDD", phone: true },
  { key: "email", label: "E-mail para recuperação" },
  { key: "password", label: "Senha", secure: true, newPassword: true },
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
  const showDemo = Platform.OS === "web" && !window.CuidaliNative;
  useEffect(()=>{onScreenChange();},[stage,recovery]);
  async function signIn(credentials: {phone: string; password: string} | {email: string; password: string}) {
    const result = await api<{token: string; user: User}>("/auth/login", "POST", credentials);
    await saveToken(result.token);
    onLogin(result.user);
  }
  const landing = stage==="profile" && showDemo && !recovery;
  if (recovery) {
    return <View style={[s.card,{width:"100%",maxWidth:560,alignSelf:"center"}]}>
      <PasswordRecovery onBack={()=>setRecovery(false)}/>
    </View>;
  }
  const content = (
    <>
      {landing ? <Welcome wide={wide}
        onDemo={role=>onLogin(startBrowserDemo(role))}
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
          <View nativeID="cuidali-criar-conta" style={[{gap:16},landing&&s.card]}>
          <Text accessibilityRole="header" style={s.title}>Como você vai usar o Cuidali?</Text>
          <View style={wide&&landing?[s.row,{alignItems:"stretch"}]:{gap:12}}>
          {(["elder", "caregiver"] as const).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"

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
          <Button label="Continuar" onPress={() => setStage("register")} />
          {!landing&&<Button
            label="Já tenho conta · Entrar"
            tone="light"

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
              ...profileFields.flatMap(field=>field.key==="birth_date" && role==="elder"
                ? [{...field,birthMinAge:60},sexField] : [field]),
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
                      sex: v.sex,
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
          <Text accessibilityRole="header" style={s.title}>Entrar no Cuidali</Text>
          <View style={{flexDirection:"row",gap:4,padding:4,borderRadius:14,backgroundColor:"#E9F0F3"}}>
            {(["phone","email"] as const).map(method=>{
              const selected=loginMethod===method;
              const label=method==="phone"?"Usar telefone":"Usar e-mail";
              return <Pressable key={method} accessibilityRole="button" aria-pressed={selected}
                onPress={()=>setLoginMethod(method)}
                style={({pressed})=>({flex:1,minWidth:0,minHeight:44,paddingHorizontal:6,alignItems:"center",
                  justifyContent:"center",borderRadius:10,borderWidth:1,
                  borderColor:selected?"#C7D9E2":"transparent",backgroundColor:selected?"#FFF":pressed?"#DDE8EC":"transparent"})}>
                <Text style={{fontSize:16,textAlign:"center",fontWeight:selected?"800":"600",color:colors.dark}}>{label}</Text>
              </Pressable>;
            })}
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
          <View style={{flexDirection:"row",gap:12,flexWrap:"wrap",justifyContent:"space-between"}}>
            <Pressable accessibilityRole="button" style={{minHeight:44,justifyContent:"center"}} onPress={()=>setRecovery(true)}>
              <Text style={{fontSize:16,color:colors.blue,fontWeight:"700"}}>Esqueci minha senha</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Não tenho conta · Criar conta"
              style={{minHeight:44,justifyContent:"center"}} onPress={()=>{setMessage("");setStage("profile");}}>
              <Text style={{fontSize:16,color:colors.blue,fontWeight:"700"}}>Criar conta</Text>
            </Pressable>
          </View>
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
  navigate: (tab: string, day?:string) => void;
  doseRevision: number;
}) {
  const {width, height} = useWindowDimensions();
  const wide = width >= 1050;
  const landscape = height < 460 && width >= 560;
  const room = useContext(ElderViewport);
  const state = useData(`/elders/${elder}/dashboard`, doseRevision),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [activitySettingsOpen,setActivitySettingsOpen]=useState(false);
  const notify=useContext(ActionFeedback);
  const [checkInBusy,setCheckInBusy]=useState(false);
  const [checkInUntil,setCheckInUntil]=useState(0);
  const checkInInFlight=useRef(false);
  const caregiver = user.role === "caregiver";
  useEffect(()=>{
    if(caregiver || !state.data?.check_in_remaining_seconds) return;
    const until=Date.now()+1000*state.data.check_in_remaining_seconds;
    setCheckInUntil(current=>Math.max(current,until));
  },[caregiver,state.data]);
  useEffect(()=>{
    if(!checkInUntil) return;
    const timeout=setTimeout(()=>setCheckInUntil(current=>current===checkInUntil?0:current),Math.max(0,checkInUntil-Date.now()));
    return ()=>clearTimeout(timeout);
  },[checkInUntil]);
  const pendingAlerts = state.data?.alerts?.filter((alert:CareAlert)=>alert.status==="open").length ?? 0;
  const appointmentsToday = state.data?.appointments.length ?? 0;
  const firstUnconfirmed = state.data?.doses.find((dose:{status:string})=>dose.status!=="taken");
  async function checkIn() {
    if (checkInInFlight.current || Date.now()<checkInUntil) return;
    checkInInFlight.current=true;
    setCheckInBusy(true);
    try {
      const result=await api<{message:string;check_in_remaining_seconds:number}>(`/elders/${elder}/activity`,"POST");
      setCheckInUntil(Date.now()+1000*result.check_in_remaining_seconds);
      notify(result.message);
      state.reload();
    } catch (error) {
      notify((error as Error).message,true);
    } finally {
      checkInInFlight.current=false;
      setCheckInBusy(false);
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
      notify("Dose registrada.");
      state.reload();
    } catch (e) {
      notify((e as Error).message,true);
    } finally {
      setBusy(false);
    }
  }
  if (!caregiver) {
    const doses: {time_id:number; time:string; name:string; dosage:string; status:string}[] = state.data?.doses ?? [];
    const ordered = [...doses].sort((a,b) => Number(a.status === "taken") - Number(b.status === "taken"));
    const today = new Date().toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long"});
    const spacing = room >= 560 ? 12 : 8;
    const taken = doses.filter(d => d.status === "taken").length;
    const greeting = (
      <View style={{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#E8F4F0",
        borderRadius:18,paddingHorizontal:12,paddingVertical:room < 540 ? 6 : 12}}>
        <BrandMark size={room < 540 ? 36 : 44}/>
        <View style={{flex:1}}>
          <Text accessibilityRole="header" style={[s.title,room < 540 && {fontSize:25,lineHeight:30}]}>Olá, {user.name.split(" ")[0]}</Text>
          <Text style={[s.muted,{color:"#385D58"},room < 540 && {fontSize:14,lineHeight:19}]}>
            {today.charAt(0).toUpperCase()+today.slice(1)}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Atualizar dados"
          disabled={state.loading} onPress={state.reload}
          style={({pressed})=>({minWidth:44,minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:12,
            backgroundColor:pressed?"#CFE7DE":"#F7FCFA"})}>
          <Text style={{color:colors.blue,fontSize:25}}>↻</Text>
        </Pressable>
      </View>
    );
    const perPage = room >= 720 && !landscape ? 2 : 1;
    const cards = [
      ...ordered.map(d => <View key={"dose-"+d.time_id}>
          <Card tone="blue">
            <View style={{flexDirection:"row", alignItems:"center", gap:12}}>
              <View style={{alignItems:"center",justifyContent:"center",borderRadius:12,backgroundColor:"#E1ECF7",width:58,minHeight:49}}>
                <Text style={{fontSize:17,fontWeight:"800",color:colors.blue}}>{d.time}</Text>
              </View>
              <View style={{flex:1}}><Text style={s.subtitle}>{d.name}</Text>
                <Text style={[s.muted,d.status==="taken"&&{color:colors.green}]}>{d.dosage} · {statusLabel[d.status]}</Text></View>
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
        <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:6,flexWrap:"wrap"}}>
          <Text style={s.subtitle}>Lembretes de hoje</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir calendário" onPress={()=>navigate("Calendário")}
            style={{minHeight:44,flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:7,borderRadius:10,backgroundColor:"#E8F4F0"}}>
            <AppIcon name="calendar" size={19} color={colors.green}/>
            <Text style={{fontSize:15,fontWeight:"700",color:colors.green}}>Calendário</Text>
          </Pressable>
        </View>
        {!!doses.length && <Text accessibilityRole="progressbar" accessibilityLabel="Doses confirmadas"
          aria-valuemin={0} aria-valuemax={Math.max(1,doses.length)} aria-valuenow={taken}
          accessibilityValue={{min:0,max:Math.max(1,doses.length),now:taken}} style={s.muted}>
          {taken} de {doses.length} doses confirmadas
        </Text>}
        {!!doses.length && room >= 540 && <View style={{height:6,borderRadius:6,backgroundColor:"#DDE8ED",overflow:"hidden"}}>
          <View style={{height:6,width:`${taken / doses.length * 100}%`,backgroundColor:colors.green}} />
        </View>}
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
          <Button label={checkInUntil?"✓ Aviso enviado":"Estou bem hoje"}
            tone={checkInUntil?"light":"blue"} busy={checkInBusy}
            disabled={!!checkInUntil||!state.data||state.denied} onPress={checkIn} />
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
      <View style={{flexGrow:1,justifyContent:room >= 620?"center":"space-between",gap:room >= 620 ? 24 : spacing}}>
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
        elderName={state.data?.elder.name}
        onElder={()=>navigate("Vínculos")}
        wide={wide}
      />
      <Loading state={state} refresh={false}/>
      {!!message&&<Text accessibilityRole="alert" style={s.text}>{message}</Text>}
      {state.data&&<>
        <Text accessibilityRole="header" style={s.subtitle}>Acompanhamento de hoje</Text>
        <View style={[s.row,{alignItems:"stretch"}]}>
          <Metric label="Doses previstas" icon="pills" value={state.data.doses.length}
            actionLabel="Ver todos os medicamentos" onPress={()=>navigate("Medicamentos")}/>
          <Metric label="Alertas aguardando" icon="bell" value={pendingAlerts} tone={pendingAlerts?"amber":"blue"}
            actionLabel="Ver alertas do cuidado" onPress={()=>navigate("Alertas")}/>
          <Metric label="Consultas hoje" icon="calendar" value={appointmentsToday}
            actionLabel="Abrir agenda de cuidados" onPress={()=>navigate("Agenda")}/>
        </View>
        <View style={{flexDirection:wide?"row":"column",alignItems:"flex-start",gap:14}}>
          <View style={{flex:wide?1.4:undefined,width:wide?undefined:"100%",minWidth:0,gap:12}}>
            <Card>
              <View style={{flexDirection:"row",gap:9,alignItems:"center"}}>
                <CareIcon icon="clock"/><Text accessibilityRole="header" style={s.subtitle}>Rotina de hoje</Text>
              </View>
              {!state.data.doses.length&&!appointmentsToday&&<Text style={s.text}>Nenhuma dose ou consulta prevista para hoje.</Text>}
              {[
                ...state.data.doses.map((d:any)=>({key:"d"+d.time_id,title:d.name,detail:d.dosage,time:d.time,
                  icon:"pills",status:d.status==="taken"?"Dose confirmada":d.status==="pending"?"Pendente":"Dose prevista",
                  tone:d.status==="taken"?"green" as const:"blue" as const})),
                ...state.data.appointments.map((a:Appointment)=>({key:"a"+a.id,title:a.specialty,detail:a.doctor+" · "+a.location,
                  time:localInput(a.scheduled_at).slice(11,16),icon:"calendar",status:"Consulta",tone:"blue" as const})),
              ].sort((a,b)=>a.time.localeCompare(b.time)).map(({key,...item})=><TimelineRow key={key} {...item}/>)}
            </Card>
            <Alerts elder={elder} caregiver onUpdated={state.reload} onOpenAll={()=>navigate("Alertas")} />
          </View>
          <View style={{flex:wide?1:undefined,width:wide?undefined:"100%",minWidth:0,gap:12}}>
            <WeekPicker selected={state.data.date} onChange={day=>navigate("Agenda",day)}/>
            <Card>
              <Text accessibilityRole="header" style={s.subtitle}>Ações rápidas</Text>
              <View style={[s.row,{alignItems:"stretch"}]}>
                <MenuTile label="Consultas" actionLabel="Ver próximas consultas" subtitle="Agende e acompanhe" icon="calendar" onPress={()=>navigate("Consultas")}/>
                <MenuTile label="Registros de dores" subtitle="Veja os locais de dor" icon="pain" warm onPress={()=>navigate("Dores")}/>
              </View>
              <Button label="Ver histórico de cuidados" tone="light" onPress={()=>navigate("Histórico")}/>
            </Card>
            <Card>
              <Text accessibilityRole="header" style={s.subtitle}>Atividade</Text>
              <Text style={s.muted}>{state.data.last_activity
                ? `Último registro em ${dateTime(state.data.last_activity.created_at)}`
                : "Ainda não há atividade registrada pela pessoa idosa."}</Text>
              <Button label={activitySettingsOpen?"Fechar configurações de atividade":"Configurar aviso de inatividade"}
                tone="light" onPress={()=>setActivitySettingsOpen(value=>!value)}/>
              {activitySettingsOpen && <Form
                fields={[{key:"inactivity_hours",label:"Alertar após quantas horas sem atividade?",placeholder:"De 1 a 168"}]}
                submit="Salvar acompanhamento" onSave={async v=>{
                  await api(`/elders/${elder}/settings`,"PATCH",{inactivity_hours:Number(v.inactivity_hours)});
                  setMessage("Acompanhamento atualizado.");
                  setActivitySettingsOpen(false);
                  state.reload();
                }}/>}
            </Card>
          </View>
        </View>
        <Button label="Atualizar dados" tone="light" onPress={state.reload}/>
      </>}
    </>
  );
}
function CalendarScreen({elder,onOpenAppointments,onBack}:{elder:number;onOpenAppointments:()=>void;onBack:()=>void}) {
  const state=useData(`/elders/${elder}/appointments`);
  return <>
    <Loading state={state} refresh={!!state.error}/>
    {state.data && !state.denied && <ElderCalendar appointments={state.data.items} onOpenAppointments={onOpenAppointments} onBack={onBack}/>}
  </>;
}

function CareAgendaScreen({elder,onOpenAppointments,initialDay}:{elder:number;onOpenAppointments:()=>void;initialDay:string}) {
  const appointments=useData(`/elders/${elder}/appointments`);
  const medications=useData(`/elders/${elder}/medications`);
  return <>
    <Loading state={appointments} refresh={!!appointments.error}/>
    <Loading state={medications} refresh={!!medications.error}/>
    {!appointments.denied&&!medications.denied&&appointments.data&&medications.data&&
      <CareSchedule appointments={appointments.data.items} medications={medications.data.items} onAppointments={onOpenAppointments} initialDay={initialDay}/>}
  </>;
}

function CareRoutineSummary({elder}:{elder:number}) {
  const state=useData(`/elders/${elder}/dashboard`);
  if(!state.data) return <Loading state={state} refresh={!!state.error}/>;
  const doses:{time_id:number;name:string;dosage:string;time:string;status:string}[]=state.data.doses;
  const confirmed=doses.filter(dose=>dose.status==="taken").length;
  return <>
    <View style={[s.row,{alignItems:"stretch"}]}>
      <Metric label="Doses do dia" icon="pills" value={doses.length}/>
      <Metric label="Doses confirmadas" icon="check" tone="green" value={confirmed}/>
      <Metric label="A confirmar" icon="clock" tone="amber" value={doses.length-confirmed}/>
    </View>
    <Card>
      <Text accessibilityRole="header" style={s.subtitle}>Cuidados de hoje</Text>
      {!doses.length&&<Text style={s.muted}>Nenhuma dose prevista para hoje.</Text>}
      {doses.map(dose=><TimelineRow key={dose.time_id} title={dose.name} detail={dose.dosage} time={dose.time}
        status={dose.status==="taken"?"Confirmada":"A confirmar"} icon="pills" tone={dose.status==="taken"?"green":"blue"}/>)}
    </Card>
  </>;
}

const painRegionName=(region:string)=>regions[region]??region;
function CareHistoryScreen({elder}:{elder:number}) {
  const dashboard=useData(`/elders/${elder}/dashboard`);
  const appointments=useData(`/elders/${elder}/appointments`);
  const pains=useData(`/elders/${elder}/pains`);
  return <>
    <Loading state={dashboard} refresh={!!dashboard.error}/>
    <Loading state={appointments} refresh={!!appointments.error}/>
    <Loading state={pains} refresh={!!pains.error}/>
    {dashboard.data&&appointments.data&&pains.data&&<CareHistory doses={dashboard.data.dose_history}
      appointments={appointments.data.items} pains={pains.data.items} regionName={painRegionName}/>}
  </>;
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
    [busy, setBusy] = useState(false);
  const notify=useContext(ActionFeedback);
  const canWrite = true;
  const caregiver = user.role === "caregiver";
  const [filter,setFilter]=useState<"all"|"upcoming"|"past"|"cancelled">("all");
  const [search,setSearch]=useState("");
  const cutoff=Date.now();
  const appointmentStatus=(a:Appointment)=>Number(a.cancelled)?"cancelled":
    Date.parse(a.scheduled_at.replace(" ","T")+"Z")<cutoff?"past":"upcoming";
  const resources=state.data?.items??[];
  const visible=kind==="appointments"&&caregiver
    ? resources.filter((a:Appointment)=>(filter==="all"||filter===appointmentStatus(a))&&
      (a.doctor+" "+a.specialty+" "+a.location).toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))
    : resources;
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
      notify(r.message);
      state.reload();
    } catch (e) {
      notify((e as Error).message,true);
    } finally {
      setBusy(false);
    }
  }
  const room = useContext(ElderViewport);
  const tight = !caregiver && room > 0 && room < 420;
  const addRecord = canWrite && (<Button
              label={`Adicionar ${kind === "medications" ? "medicamento" : kind === "appointments" ? "consulta" : "contato"}`}
              onPress={() => {
                setEditing({ is_primary: false });
              }}
            />);
  return (
    <>
      {!editing && caregiver && <ScreenHeading label={label}
        icon={kind==="medications"?"pills":kind==="appointments"?"calendar":"contacts"}
        description={kind==="medications"?"Prescrições, dosagens e horários.":kind==="appointments"?"Acompanhe os atendimentos registrados.":undefined}
        action={!state.denied?addRecord:null}/>}
      {!editing && !caregiver && <View style={tight?s.row:{gap:8}}>
        <Text accessibilityRole="header" style={tight?s.subtitle:s.title}>{label}</Text>
        {!state.denied && addRecord}
      </View>}
      {state.denied ? (
        <Loading state={state} refresh={caregiver} />
      ) : editing ? (
        <Card flat={tight}>
          {caregiver && <BackButton label="Voltar aos registros" onPress={()=>setEditing(null)} />}
          <Text accessibilityRole="header" style={s.subtitle}>{editing.id ? "Editar" : "Adicionar"} · {label}</Text>
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
              notify(r.message);
              setEditing(null);
              state.reload();
            }}
          />
        </Card>
      ) : (
        <>
          <Loading state={state} refresh={caregiver} />
          {caregiver&&kind==="appointments"&&state.data&&<>
            <View style={[s.row,{alignItems:"stretch"}]}>
              <Metric label="Próximas" icon="calendar" value={resources.filter((a:Appointment)=>appointmentStatus(a)==="upcoming").length}/>
              <Metric label="Datas passadas" icon="clock" value={resources.filter((a:Appointment)=>appointmentStatus(a)==="past").length}/>
              <Metric label="Canceladas" icon="close" tone="red" value={resources.filter((a:Appointment)=>appointmentStatus(a)==="cancelled").length}/>
            </View>
            <FilterBar label="Filtrar consultas"
              items={[{value:"all",label:"Todas"},{value:"upcoming",label:"Próximas"},{value:"past",label:"Datas passadas"},{value:"cancelled",label:"Canceladas"}]}
              selected={filter} onChange={setFilter}/>
            <TextInput accessibilityLabel="Buscar consulta" placeholder="Buscar consulta" value={search} onChangeText={setSearch} style={s.input}/>
          </>}
          {caregiver&&kind==="medications"&&state.data&&<View style={[s.row,{alignItems:"stretch"}]}>
            <Metric label="Medicamentos ativos" icon="pills" value={resources.filter((m:Medicine)=>Number(m.active)).length}/>
            <Metric label="Doses previstas hoje" icon="clock" value={resources.filter((m:Medicine)=>Number(m.active)&&m.start_date<=todaySP()&&m.end_date>=todaySP())
              .reduce((total:number,m:Medicine)=>total+m.times.length,0)}/>
          </View>}
          {state.data?.items.length === 0 && (
            <Text style={s.text}>Nenhum registro cadastrado.</Text>
          )}
          {!!resources.length&&!visible.length&&<Text style={s.muted}>Nenhum registro encontrado.</Text>}
          <ElderPages label="Registro">{visible.map((item: any) => (
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
              <View style={tight?{flexDirection:"row",alignItems:"center",gap:12}:{gap:8}}>
              <View style={tight?{flex:1,minWidth:0,gap:6}:{gap:8}}>
              <View style={{flexDirection:"row",alignItems:"center",gap:9}}>
                {caregiver&&<CareIcon icon={kind==="medications"?"pills":kind==="appointments"?"calendar":"contacts"}/>}
                <Text style={[s.subtitle,{flexShrink:1}]}>{item.name || item.doctor}</Text>
              </View>
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
                  </Text>
                  <Status label={Number(item.cancelled)?"Cancelada":appointmentStatus(item)==="past"?"Data passada":"Agendada"}
                    tone={Number(item.cancelled)?"red":"blue"} icon={Number(item.cancelled)?"close":"calendar"}/>
                  {caregiver&&appointmentStatus(item)==="upcoming"&&<Button label="Adicionar à agenda do aparelho" tone="light" onPress={()=>{
                    if(isBrowserDemo()) notify("Consulta de exemplo. A agenda do aparelho fica fora da demonstração.");
                    else calendar(item);
                  }}/>}
                </>
              ) : (
                <>
                  <Text selectable style={s.text}>
                    {item.relationship} · {item.phone}
                    {Number(item.is_primary)
                      ? caregiver ? "\n★ Contato principal da pessoa idosa" : "\n★ Contato principal do SOS"
                      : ""}
                  </Text>
                  <View style={s.row}>
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
                          notify((e as Error).message,true);
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
                      notify(await callContact(item.phone))
                    }
                  />
                  </View>
                </>
              )}
              </View>
              {canWrite &&
                !(kind === "medications" && !Number(item.active)) &&
                !(kind === "appointments" && Number(item.cancelled)) && (
                  <>
                    <View style={tight?{gap:6}:s.row}>
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
                    </View>
                  </>
                )}
              </View>
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

const intimateRegions = ["penis","scrotum","vulva","perineum","anus"];

function BodyMap({disabled = false, view, selectedRegions, onSelect, onIntimate, compactMap = false}: {
  view: string;
  selectedRegions: string[];
  onSelect?: (region: string) => void;
  onIntimate?: () => void;
  disabled?: boolean;
  compactMap?: boolean;
}) {
  const compact = useContext(ElderLayout);
  const room = useContext(ElderViewport);
  const {targets}=useAppearance();
  const {width:windowWidth, height:windowHeight} = useWindowDimensions();
  const shortWide = windowHeight < 460 && windowWidth >= 560;
  const front = view === "front";
  const editable=!!onSelect;
  const height = !editable ? 156 : compactMap ? 148 : targets ? 360 : compact
    ? Math.max(130, Math.min(shortWide ? 250 : 395, (room || 500) - (shortWide ? 165 : windowHeight >= 640 ? 350 : 316)))
    : 430;
  const width = height * 0.62;
  const hitWidth = Math.min(46, height * 0.145);
  const hitHeight = Math.min(44, height * 0.102);
  const intimateSelected=selectedRegions.some(region=>intimateRegions.includes(region));

  return (
    <View testID={editable?"pain-body-map":"pain-location-preview"} style={{width, height, alignSelf:"center"}}>
      <Image
        accessible={false}
        pointerEvents="none"
        source={front ? require("./assets/brand/mapa-dor-frente.jpg") : require("./assets/brand/mapa-dor-costas.jpg")}
        style={{width, height}}
        resizeMode="contain"
      />
      {onIntimate ? <Pressable accessibilityRole="button" accessibilityLabel="Região íntima"
        accessibilityState={{selected:intimateSelected,disabled}} disabled={disabled} onPress={onIntimate}
        style={{position:"absolute",left:width/2-hitWidth*.4,top:height*.49-hitHeight/2,
          width:hitWidth*.8,height:hitHeight,zIndex:1,alignItems:"center",justifyContent:"center"}}>
        <View pointerEvents="none" style={{width:14,height:14,borderRadius:intimateSelected?3:7,borderColor:"#FFF",borderWidth:2,
          backgroundColor:intimateSelected?colors.red:colors.blue}}/>
      </Pressable> : intimateSelected && <View pointerEvents="none"
        style={{position:"absolute",left:width/2-7,top:height*.49-7,width:14,height:14,borderRadius:7,
          backgroundColor:colors.red,borderColor:"#FFF",borderWidth:2}}/>}
      {bodyMapPoints.map(([frontRegion, backRegion, x, y]) => {
        const key = front ? frontRegion : backRegion;
        const selected = selectedRegions.includes(key);
        if (!editable) return selected ? <View key={key} pointerEvents="none" style={{
          position:"absolute",left:width*x/100-7,top:height*y/100-7,width:14,height:14,
          borderRadius:7,backgroundColor:colors.red,borderColor:"#FFF",borderWidth:2}}/> : null;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={regions[key]}
            accessibilityState={{selected, disabled}} aria-pressed={selected}
            disabled={disabled}
            onPress={() => onSelect?.(key)}
            style={{
              position:"absolute", left:width * x / 100 - hitWidth / 2,
              top:height * y / 100 - hitHeight / 2, width:hitWidth, height:hitHeight,
              alignItems:"center", justifyContent:"center",
            }}
          >
            <View pointerEvents="none" style={{
              width:selected ? 19 : 11, height:selected ? 19 : 11, borderRadius:10,
              backgroundColor:selected ? colors.red : colors.blue,
              borderColor:"#FFF", borderWidth:2,
            }} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Pains({ elder, user, onBack, onOpenProfile }: { elder: number; user: User; onBack:()=>void;onOpenProfile:()=>void }) {
  const notify=useContext(ActionFeedback);
  const [intimate, setIntimate] = useState(false);
  const [step,setStep]=useState(0);
  const [stepJump,setStepJump]=useState<{index:number}>();
  const {width, height} = useWindowDimensions();
  const shortWide = height < 460 && width >= 560;
  const path = `/elders/${elder}/pains`,
    state = useData(path),
    [creating, setCreating] = useState(false),
    [view, setView] = useState("front"),
    [locations, setLocations] = useState<{view:string;region:string}[]>([]),
    [type, setType] = useState("Pontada"),
    [intensity, setIntensity] = useState<number|null>(null),
    [onset, setOnset] = useState("Hoje"),
    [busy, setBusy] = useState(false);
  const selectedRegions=locations.filter(location=>location.view===view).map(location=>location.region);
  const hasIntimateSelection=selectedRegions.some(region=>intimateRegions.includes(region));
  const intimateOptions=view==="back"?["anus"]:user.sex==="male"?["penis","scrotum","perineum"]
    :user.sex==="female"?["vulva","perineum"]:[];
  function selectRegion(region:string) {
    setLocations(current=>current.some(location=>location.view===view && location.region===region)
      ? current.filter(location=>location.view!==view || location.region!==region)
      : [...current,{view,region}]);
  }
  const firstLocation=locations[0];
  const locationLabel=locations.length>1 ? `${locations.length} regiões marcadas` : firstLocation
    ? `Local: ${regions[firstLocation.region]}${view!==firstLocation.view?(firstLocation.view==="front"?" · Frente":" · Costas"):""}`
    : "Toque no corpo para marcar a dor.";
  function startRecord() {
    setLocations([]);
    setView("front");
    setType("Pontada");
    setIntensity(null);
    setOnset("Hoje");
    setIntimate(false);
    setStep(0);
    setStepJump(undefined);
    setCreating(true);
  }
  const returnToBody=creating && (step>0 || intimate);
  function backInPains() {
    if (busy) return;
    if (returnToBody) {
      setIntimate(false);
      setStepJump({index:0});
    } else if (creating) {
      setCreating(false);
    } else {
      onBack();
    }
  }
  async function seen(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`${path}/${id}/seen`, "POST");
      state.reload();
      notify("Visualização registrada.");
    } catch (e) {
      notify((e as Error).message,true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormBusy.Provider value={busy}>
      <>
        {user.role==="elder" && <BackButton label={returnToBody?"Voltar ao corpo":"Voltar"} onPress={backInPains}/>}
        {!creating && (user.role==="caregiver"
          ? <ScreenHeading label="Sintomas e dores" description="Acompanhe os locais e a intensidade registrados." icon="pain"/>
          : <Text style={s.title}>Registro de dores</Text>)}
        {user.role === "elder" && !creating && (
          <Button label="Registrar uma dor" onPress={startRecord} />
        )}{" "}
        {state.denied ? (
          <Loading state={state} refresh={user.role === "caregiver"} />
        ) : creating ? (
          <>
            <ElderPages label="Etapa" jump={stepJump} onPageChange={setStep}>
              <View style={{gap:8,flexDirection:shortWide?"row":"column",alignItems:shortWide?"center":"stretch"}}>
                <View style={{gap:8,flex:shortWide?1:undefined}}>
                  <Text style={s.subtitle}>Onde dói?</Text>
                  <Text style={[s.muted,locations.length>0&&{color:colors.green}]} accessibilityLiveRegion="polite">{locationLabel}</Text>
                  <View style={s.row}>
                    {([["front","Frente"],["back","Costas"]] as const).map(([side,label])=>(
                      <Button key={side} label={(view===side?"✓ ":"")+label} tone={view===side?"blue":"light"}
                        onPress={()=>{setView(side);setIntimate(false);}}/>
                    ))}
                  </View>
                  {hasIntimateSelection && <Pressable accessibilityRole="button" disabled={busy}
                    onPress={()=>setLocations(current=>current.filter(location=>location.view!==view || !intimateRegions.includes(location.region)))}
                    style={{alignSelf:"flex-start",minHeight:44,justifyContent:"center",paddingHorizontal:6}}>
                    <Text style={{color:colors.blue,fontSize:16,fontWeight:"700"}}>Limpar seleção íntima</Text>
                  </Pressable>}
                </View>
                <View style={{gap:8,flexDirection:intimate?"row":"column",alignItems:"center",flex:shortWide?1.25:undefined}}>
                  <BodyMap view={view} selectedRegions={selectedRegions} onSelect={selectRegion}
                    onIntimate={()=>setIntimate(value=>!value)} compactMap={intimate} disabled={busy}/>
                  {intimate && <View style={{flex:1,minWidth:0,gap:8}}>
                    <Text accessibilityRole="header" style={s.label}>Região íntima</Text>
                    {!intimateOptions.length && <>
                      <Text style={s.muted}>Preencha o campo Sexo em Meus dados para ver as opções.</Text>
                      <Button label="Abrir Meus dados" tone="light" onPress={onOpenProfile}/>
                    </>}
                    {intimateOptions.map(key=><Button key={key} label={(selectedRegions.includes(key)?"Desmarcar ":"")+regions[key]}
                        tone={selectedRegions.includes(key)?"blue":"light"} onPress={()=>selectRegion(key)}/>)}
                  </View>}
                </View>
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
            <Text style={s.subtitle}>Quanto está doendo?{intensity!==null?` ${intensity}/10`:""}</Text>
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
            <View style={s.row}>{["Hoje", "Alguns dias", "Mais de 1 semana"].map((o) => (
              <Button
                key={o}
                label={(onset === o ? "✓ " : "") + o}
                tone={onset === o ? "blue" : "light"}
                onPress={() => setOnset(o)}
              />
            ))}</View>
</View>
<View style={{gap:8}}>
            <Form
              fields={[{ key: "notes", label: "Observação", optional: true }]}
              submit="Salvar registro de dor"
              onBusyChange={setBusy}
              onCancel={() => setCreating(false)}
              onSave={async (v) => {
                if (!locations.length) throw new Error("Marque pelo menos uma região no corpo antes de salvar.");
                if (intensity===null) throw new Error("Escolha a intensidade da dor de 1 a 10 antes de salvar.");
                const r = await api(path, "POST", {
                  locations,
                  type,
                  intensity,
                  onset,
                  notes: v.notes || "",
                });
                notify(r.message);
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
                <View style={{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:8}}>
                  {user.role==="caregiver"&&<CareIcon icon="pain" tone={Number(p.intensity)>=7?"red":"blue"}/>}
                  <Text style={[s.subtitle,{flexShrink:1}]}>{p.intensity}/10 · {regions[p.region]}</Text>
                  {user.role==="caregiver"&&<Status label={Number(p.intensity)>=7?"Intensa":Number(p.intensity)>=4?"Moderada":"Leve"}
                    tone={Number(p.intensity)>=7?"red":Number(p.intensity)>=4?"amber":"green"}/>}
                </View>
                <View style={{flexDirection:"row",alignItems:"flex-start",gap:10}}>
                {user.role==="caregiver" && <BodyMap view={p.view} selectedRegions={[p.region]}/>}
                <View style={{flex:1,minWidth:0,gap:8}}>
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
                </View>
                </View>
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
function CareSubject({elder,onOpen}:{elder:number;onOpen:()=>void}) {
  const {data}=useData("/links");
  const current=data?.items?.find((person:{id:number|string})=>Number(person.id)===elder);
  return <Pressable accessibilityRole="button"
    accessibilityLabel={current?`Acompanhando ${current.name}. Trocar ou vincular uma pessoa idosa`:"Trocar ou vincular uma pessoa idosa"}
    onPress={onOpen}
    style={({pressed})=>({flexDirection:"row",alignItems:"center",gap:10,minHeight:52,
      paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:"#CFE1DE",borderRadius:13,
      backgroundColor:pressed?"#DCEFE8":"#F7FBFA"})}>
    <AppIcon name="elder" size={23} color={colors.green}/>
    <View style={{flex:1,minWidth:0}}>
      <Text style={{fontSize:14,lineHeight:18,fontWeight:"700",color:colors.green}}>Pessoa acompanhada</Text>
      <Text style={s.label} numberOfLines={1}>{current?.name ?? "Selecionar pessoa"}</Text>
    </View>
    <Text style={{fontSize:15,fontWeight:"700",color:colors.blue}}>{current?"Trocar":"Vínculos"}</Text>
    <AppIcon name="chevron" size={16}/>
  </Pressable>;
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
  const room = useContext(ElderViewport);
  const state = useData("/links"),
    [code, setCode] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [adding, setAdding] = useState(false);
  const caregiver=user.role==="caregiver";
  const [personSearch,setPersonSearch]=useState("");
  const linkedPeople:{id:number|string;name:string}[]|undefined=state.data?.items;
  const displayedPeople=caregiver?linkedPeople?.filter(person=>person.name.toLocaleLowerCase("pt-BR")
    .includes(personSearch.trim().toLocaleLowerCase("pt-BR"))):linkedPeople;
  const showLinkForm=caregiver && (adding || linkedPeople?.length===0);
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
      {caregiver?<ScreenHeading label="Meus idosos" description="Pessoas vinculadas ao seu perfil de cuidador." icon="elder"/>
        :<Text accessibilityRole="header" style={room>0&&room<420?s.subtitle:s.title}>Pessoas vinculadas</Text>}
      {user.role==="caregiver" && state.data && <Text style={s.muted}>
        {state.data.items.length === 1 ? "1 pessoa vinculada" : state.data.items.length+" pessoas vinculadas"}
      </Text>}
      {!!message && (
        <Text accessibilityRole="alert" style={s.text}>
          {message}
        </Text>
      )}
      <Loading state={state} refresh={user.role==="caregiver"} />
      {caregiver&&!!linkedPeople?.length&&<TextInput accessibilityLabel="Buscar pessoa idosa por nome"
        placeholder="Buscar pessoa idosa por nome" value={personSearch} onChangeText={setPersonSearch} style={s.input}/>}
      {caregiver&&!!linkedPeople?.length&&!displayedPeople?.length&&<Text style={s.muted}>Nenhuma pessoa encontrada.</Text>}
      {state.data?.items.length === 0 && (
        <Text style={s.text}>Você ainda não possui vínculos.</Text>
      )}
      <ElderPages label="Vínculos">
        {user.role==="elder" && <Card key="code">
          {code ? <>
            <Text selectable style={s.title}>{code.code}</Text>
            <Text style={s.muted}>Uso único. Válido por 10 minutos.</Text>
            <View style={s.row}>
              <Button label="Revogar código" tone="red" disabled={busy} onPress={revoke} />
              <Button label="Gerar outro código" tone="light" busy={busy} onPress={generate} />
            </View>
          </> : <>
            <Text style={s.text}>Compartilhe o código somente com um cuidador de confiança.</Text>
            <Button label="Gerar código por 10 minutos" busy={busy} onPress={generate} />
          </>}
        </Card>}
        {displayedPeople?.map(person => (
        <Card key={person.id} tone={caregiver && Number(person.id)===selectedElder?"blue":undefined}>
          <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
            {caregiver?<Initials name={person.name}/>:<AppIcon name="person" color={colors.green}/>}
            <View style={{flex:1,minWidth:0}}>
              <Text style={s.subtitle}>{person.name}</Text>
              {caregiver && Number(person.id)===selectedElder && <Status label="Em acompanhamento" icon="check" tone="green"/>}
            </View>
          </View>
          {caregiver && (
            <Button
              label={Number(person.id)===selectedElder?"Voltar ao painel de "+person.name:"Acompanhar esta pessoa"}
              onPress={() => onSelect(Number(person.id))}
            />
          )}
          <Button
            label="Remover vínculo"
            tone="red"
            disabled={busy}
            onPress={() =>
              confirmAction(
                `Remover vínculo com ${person.name}? O cuidador perderá acesso aos dados.`,
                async () => {
                  setBusy(true);
                  try {
                    await api(`/links/${person.id}`, "DELETE");
                    state.reload();
                    onRemove(Number(person.id));
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
      {caregiver && !showLinkForm && !!linkedPeople?.length &&
        <Button label="Adicionar vínculo" tone="light" onPress={()=>setAdding(true)}/>}
      {showLinkForm && <Card>
        <Text accessibilityRole="header" style={s.subtitle}>Novo vínculo</Text>
        <Text style={s.muted}>Peça à pessoa idosa o código gerado em Vínculos.</Text>
        <Form fields={[{key:"code", label:"Código de vinculação"}]} submit="Concluir vinculação"
          onCancel={linkedPeople?.length?()=>setAdding(false):undefined}
          onSave={async values=>{
            const result=await api("/links/redeem","POST",values);
            state.reload();
            setMessage(result.message);
            onSelect(Number(result.elder_id));
          }}/>
      </Card>}
    </>
  );
}
function SOS({elder,navigate}:{elder:number;navigate:(tab:string)=>void}) {
  const {width,height}=useWindowDimensions();
  const landscape=height<460 && width>=560;
  const state=useData(`/elders/${elder}/contacts`);
  const [message,setMessage]=useState("");
  const [sendError,setSendError]=useState(false);
  const [history,setHistory]=useState(false);
  const [sending,setSending]=useState(false);
  const inFlight=useRef(false);
  const contact=state.data?.items.find((c:any)=>Number(c.is_primary)===1);
  const demo=isBrowserDemo();
  const shouldDial=!!contact && !demo && (Platform.OS!=="web" || !!window.CuidaliNative);

  async function sendRequest() {
    if (inFlight.current) return;
    inFlight.current=true;
    setSending(true);
    setMessage("");
    setSendError(false);
    try {
      let status:string;
      try {
        const result=await api(`/elders/${elder}/sos`,"POST");
        status=result.message;
      } catch (error) {
        status=(error as Error).message || "Não foi possível enviar o pedido.";
        setSendError(true);
      }
      if (shouldDial) status+=" "+await callContact(contact.phone);
      setMessage(status);
    } finally {
      inFlight.current=false;
      setSending(false);
    }
  }
  function askForHelp() {
    if (inFlight.current) return;
    const prompt=demo?"Registrar um pedido de ajuda de exemplo?":shouldDial
      ? `Avisar seus cuidadores e abrir o discador para ${contact.name}?`
      : "Enviar pedido de ajuda aos cuidadores?";
    confirmAction(prompt,sendRequest);
  }
  if (history) return <>
    <Text accessibilityRole="header" style={s.title}>Meus pedidos de ajuda</Text>
    <Button label="Voltar para o SOS" tone="light" onPress={()=>setHistory(false)} />
    <Alerts elder={elder} caregiver={false}/>
  </>;
  return <>
    <Text accessibilityRole="header" style={s.title}>Precisa de ajuda?</Text>
    <Loading state={state} refresh={false}/>
    <View style={{flexDirection:landscape?"row":"column",gap:10,alignItems:landscape?"flex-start":"stretch"}}>
    <View style={{flex:landscape?1.15:undefined,minWidth:0}}>
    {contact ? <Card tone="danger">
      <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
        <View style={{backgroundColor:"#FADEDE",width:40,height:40,borderRadius:12,alignItems:"center",justifyContent:"center"}}>
          <AppIcon name="help" color={colors.red} size={22}/>
        </View>
        <View style={{flex:1,minWidth:0}}>
          <Text style={{fontSize:14,lineHeight:19,color:colors.red,fontWeight:"700"}}>Contato de confiança</Text>
          <Text style={s.label}>{contact.name} ({contact.relationship})</Text>
          <Text selectable style={{fontSize:15,lineHeight:20,color:colors.dark}}>{contact.phone}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`SOS: pedir ajuda a ${contact.name}`}
        accessibilityState={{busy:sending,disabled:sending}} disabled={sending} onPress={askForHelp}
        style={({pressed})=>[s.button,{backgroundColor:pressed?"#7F202C":colors.red,opacity:sending ? .7 : 1}]}>
        {sending?<ActivityIndicator color="#FFF"/>:<Text style={s.buttonText}>Pedir ajuda</Text>}
      </Pressable>
      <Button label={`Ligar para ${contact.name}`} tone="light" disabled={sending}
        onPress={async()=>setMessage(await callContact(contact.phone))}/>
    </Card> : !state.loading && <View style={{gap:8}}>
      <Button label="Enviar pedido de ajuda aos cuidadores" tone="red" busy={sending} onPress={askForHelp}/>
      {!state.error && <>
        <Text style={s.muted}>Escolha um contato de confiança para poder ligar por aqui.</Text>
        <Button label="Escolher ou cadastrar contato" tone="light" onPress={()=>navigate("Contatos")}/>
      </>}
    </View>}
    </View>
    <View style={{flex:landscape?1:undefined,minWidth:0,gap:8}}>
      <Button label="Meus pedidos de ajuda" tone="light" onPress={()=>setHistory(true)}/>
      {!!message && <FeedbackNotice feedback={{message,error:sendError}} onDismiss={()=>setMessage("")}/>}
    </View>
    </View>
  </>;
}
type AlertStatus = "open" | "accepted" | "resolved";
type CareAlert = {id:number;kind:string;status:AlertStatus;created_at:string;accepted_name?:string};
const alertFilters = [
  {status:"all",label:"Todos"},
  {status:"open",label:"Aguardando"},
  {status:"accepted",label:"Em acompanhamento"},
  {status:"resolved",label:"Concluídos"},
] as const;
function Alerts({elder,caregiver,showFilters=false,onUpdated,onOpenAll}:{elder:number;caregiver:boolean;showFilters?:boolean;onUpdated?:()=>void;onOpenAll?:()=>void}) {
  const state=useData(`/elders/${elder}/alerts`);
  const notify=useContext(ActionFeedback);
  const [filter,setFilter]=useState<AlertStatus|"all">("all");
  const [category,setCategory]=useState<"all"|"pain"|"sos"|"inactivity">("all");
  const items: CareAlert[] = state.data?.items ?? [];
  const byCategory=category==="all"?items:items.filter(item=>item.kind===category);
  const filtered = filter==="all" ? byCategory : byCategory.filter(item=>item.status===filter);
  const visible = onOpenAll ? filtered.filter(item=>item.status!=="resolved")
    .sort((a,b)=>Number(b.status==="open")-Number(a.status==="open") || Number(b.kind==="sos")-Number(a.kind==="sos"))
    .slice(0,3) : filtered;
  useEffect(()=>{const t=setInterval(state.reload,15000);return ()=>clearInterval(t);},[state.reload]);
  const names:Record<string,string>={sos:"Pedido de ajuda",inactivity:"Ausência de atividade",pain:"Novo registro de dor"};
  async function update(id:number,status:string){try {const r=await api(`/elders/${elder}/alerts/${id}`,"PATCH",{status});notify(r.message);state.reload();onUpdated?.();}catch(e){notify((e as Error).message,true);}}
  return <>{showFilters?<ScreenHeading label="Notificações" icon="bell" description="Pedidos de ajuda, registros de dor e avisos de inatividade."/>
    :<Text accessibilityRole="header" style={s.subtitle}>Alertas e acompanhamento</Text>}
    {!!state.error&&<Text style={s.error}>{state.error}</Text>}
    {showFilters&&state.data&&<FilterBar label="Tipo de notificação" selected={category} onChange={setCategory}
      items={[{value:"all",label:"Todas"},{value:"sos",label:"Pedidos de ajuda"},
        {value:"pain",label:"Dores"},{value:"inactivity",label:"Inatividade"}]}/>}
    {showFilters&&state.data&&(
      <View style={[s.row,{gap:8}]} accessibilityLabel="Filtrar alertas por status">
        {alertFilters.map(option=>{
          const count=option.status==="all"?byCategory.length:byCategory.filter(item=>item.status===option.status).length;
          const selected=filter===option.status;
          return <Pressable key={option.status} accessibilityRole="button" aria-pressed={selected}
            onPress={()=>setFilter(option.status)}
            style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>({
              minHeight:48,paddingHorizontal:12,paddingVertical:9,borderRadius:12,justifyContent:"center",
              borderWidth:1,borderColor:selected?"#225BA5":"#D8E4F1",
              backgroundColor:selected?"#225BA5":pressed||hovered?colors.light:"#FFF",
            })}>
            <Text style={{fontSize:16,lineHeight:22,fontWeight:"700",color:selected?"#FFF":colors.dark}}>
              {selected?"✓ ":""}{option.label} ({count})
            </Text>
          </Pressable>;
        })}
      </View>
    )}
    {state.data&&!visible.length&&<Text style={s.muted}>{onOpenAll?"Nenhum alerta em aberto.":filter==="all"?"Nenhum alerta registrado.":"Nenhum alerta com esse status."}</Text>}
    <ElderPages label="Pedido">{visible.map(a=><Card key={a.id} testID="care-alert"
      tone={a.status==="open"?(a.kind==="sos"?"danger":"yellow"):undefined}>
      <View style={{flexDirection:"row",alignItems:"center",gap:9}}>
        <CareIcon icon={a.kind==="sos"?"help":a.kind==="pain"?"pain":"clock"}
          tone={a.status==="open"?(a.kind==="sos"?"red":"amber"):"blue"}/>
        <Text style={[s.subtitle,{flexShrink:1}]}>{names[a.kind]}</Text>
      </View>
      <View style={s.row}>
        <Text style={s.muted}>{dateTime(a.created_at)}</Text>
        <Status label={a.status==='open'?'Aguardando cuidador':a.status==='accepted'?'Em acompanhamento':'Concluído'}
          icon={a.status==='resolved'?"check":"clock"} tone={a.status==='open'?"amber":"green"}/>
      </View>
      {!!a.accepted_name&&<Text style={s.text}>Acompanhado por {a.accepted_name}</Text>}
      {caregiver&&a.status!=='resolved'&&<View style={s.row}>
        {a.status==='open'&&<Button label="Vou acompanhar" onPress={()=>update(a.id,'accepted')} />}
        <Button label="Concluir atendimento" tone={a.status==='open'?'light':'blue'} onPress={()=>confirmAction('Você verificou a situação e deseja concluir este alerta?',()=>update(a.id,'resolved'))} />
      </View>}
    </Card>)}</ElderPages>
    {onOpenAll && <Pressable accessibilityRole="button" onPress={onOpenAll}
      style={{alignSelf:"flex-start",minHeight:44,justifyContent:"center"}}>
      <Text style={{fontSize:16,color:colors.blue,fontWeight:"700"}}>Ver todos os alertas</Text>
    </Pressable>}
    </>;
}
type ChatTurn = {id:number; content:string; reply:string};
type ChatDose = {time_id:number; name:string; dosage:string; time:string};
type ChatReply = {id:number; reply:string; action:string|null; confirmation_doses:ChatDose[]; date:string; mode:string};

function ChatBubble({text,own=false,onListen,live=false}:{
  text:string;own?:boolean;onListen?:()=>void;live?:boolean;
}) {
  return <View style={{alignSelf:own?"flex-end":"flex-start",maxWidth:"92%",minWidth:0,
    paddingHorizontal:13,paddingVertical:9,gap:3,borderWidth:1,borderColor:own?"#C7E4D8":"#D9E6EC",
    backgroundColor:own?"#123449":"#FFF",borderRadius:16,borderTopLeftRadius:own?16:5,borderTopRightRadius:own?5:16}}>
    <Text style={{fontSize:14,fontWeight:"800",color:own?"#D6E8FA":colors.blue}}>{own?"Você":"Cuidali"}</Text>
    <Text style={[s.text,own&&{color:"#FFF"}]} accessibilityLiveRegion={live?"polite":undefined}>{text}</Text>
    {onListen && <Pressable accessibilityRole="button" accessibilityLabel="Ouvir resposta" onPress={onListen}
      style={({pressed})=>({alignSelf:"flex-start",justifyContent:"center",minHeight:44,paddingHorizontal:7,
        borderRadius:9,backgroundColor:pressed?"#E3EEF9":"transparent"})}>
      <Text style={{fontSize:15,fontWeight:"700",color:colors.blue}}>Ouvir resposta</Text>
    </Pressable>}
  </View>;
}

function Assistant({elder,caregiver,navigate,onClose,onDoseRecorded,recentQuestions}:{
  elder:number;caregiver:boolean;navigate:(tab:string)=>void;onClose:()=>void;onDoseRecorded:()=>void;
  recentQuestions:React.RefObject<string[]>;
}) {
  const appearance=useAppearance();
  const path=`/elders/${elder}/assistant`;
  const state=useData(path);
  const [draft,setDraft]=useState("");
  const [pending,setPending]=useState<string|null>(null);
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const [sent,setSent]=useState<ChatTurn[]>([]);
  const [latest,setLatest]=useState<ChatReply|null>(null);
  const [savingDose,setSavingDose]=useState(false);
  const requestInFlight=useRef(false);
  const doseInFlight=useRef(false);
  const speechCleanup=useRef<()=>void>(()=>{});
  const transcript=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const nearBottom=useRef(true);
  const mounted=useRef(false);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;speechCleanup.current();};
  },[]);

  const saved:ChatTurn[]=state.data?.items ?? [];
  const turnsById=new Map(saved.map(turn=>[Number(turn.id),turn]));
  for (const turn of sent) turnsById.set(turn.id,turn);
  const turns=[...turnsById.values()].sort((a,b)=>a.id-b.id);

  async function ask(value:string) {
    const question=value.trim();
    if (!question || requestInFlight.current) return;
    requestInFlight.current=true;
    nearBottom.current=true;
    setPending(question);
    setDraft("");
    setFeedback(null);
    try {
      const response=await api<ChatReply>(path,"POST",{message:question,previous_messages:recentQuestions.current});
      if (!mounted.current) return;
      recentQuestions.current=response.mode==="urgent"?[]:[...recentQuestions.current,question].slice(-3);
      setSent(current=>[...current,{id:response.id,content:question,reply:response.reply}]);
      setLatest(response);
      state.reload();
      speak(response.reply);
    } catch(error) {
      if (mounted.current) {
        setDraft(current=>current||question);
        setFeedback({message:(error as Error).message,error:true});
      }
    } finally {
      requestInFlight.current=false;
      if (mounted.current) setPending(null);
    }
  }

  function startVoice() {
    speechCleanup.current();
    setFeedback(null);
    speechCleanup.current=listen(value=>{speechCleanup.current();void ask(value);},message=>setFeedback({message,error:true}));
  }

  function confirmDose(dose:ChatDose,response:ChatReply) {
    confirmAction(`Você tomou ${dose.name}, ${dose.dosage}, da dose das ${dose.time}?`,async()=>{
      if (doseInFlight.current) return;
      doseInFlight.current=true;
      setSavingDose(true);
      try {
        await api(`/elders/${elder}/doses/${dose.time_id}`,"POST",{date:response.date,status:"taken"});
        setLatest(current=>current?.id===response.id?{
          ...current,confirmation_doses:current.confirmation_doses.filter(item=>item.time_id!==dose.time_id)
        }:current);
        onDoseRecorded();
        setFeedback({message:"Dose confirmada.",error:false});
      } catch(error) {
        setFeedback({message:(error as Error).message,error:true});
      } finally {
        doseInFlight.current=false;
        setSavingDose(false);
      }
    });
  }

  return <View style={{flex:1,minHeight:0,width:"100%",maxWidth:760,alignSelf:"center",
    borderRadius:17,borderWidth:1,borderColor:"#D5E4E9",backgroundColor:"#FFF",overflow:"hidden"}}>
    <View style={{flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:10,paddingVertical:7,
      borderBottomWidth:1,borderColor:"#315C78",backgroundColor:"#123449"}}>
      <BrandMark size={36}/>
      <Text accessibilityRole="header" style={[s.subtitle,{flex:1,color:"#FFF",fontSize:20}]}>Seu assistente</Text>
      <ReadScreenButton screenId="cuidali-chat-leitura" onUnavailable={message=>setFeedback({message,error:true})}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar assistente" onPress={onClose}
        style={({pressed})=>({width:44,height:44,borderRadius:12,backgroundColor:pressed?"#D6E8E2":"#EAF4F1",
          alignItems:"center",justifyContent:"center"})}>
        <AppIcon name="close" size={22} color={colors.green}/>
      </Pressable>
    </View>
    {state.denied ? <View style={{padding:12}}><Loading state={state}/></View> : <>
      <ScrollView nativeID="cuidali-chat-leitura" ref={transcript} testID="assistant-transcript"
        style={themedStyle({flex:1,minHeight:0,backgroundColor:"#F3F8FA"},appearance,"view") as any}
        contentContainerStyle={{paddingHorizontal:12,paddingTop:12,paddingBottom:10,gap:12}}
        keyboardShouldPersistTaps="handled" scrollEventThrottle={32}
        onScroll={({nativeEvent})=>{
          nearBottom.current=nativeEvent.contentSize.height-nativeEvent.layoutMeasurement.height-nativeEvent.contentOffset.y<48;
        }}
        onContentSizeChange={()=>{if(nearBottom.current)transcript.current?.scrollToEnd({animated:false});}}>
        {!turns.length && !pending && !state.loading && !state.error && <>
          <ChatBubble text="Olá! Posso conversar, responder perguntas ou ajudar com seus cuidados. Como posso ajudar?"/>
          <Text style={s.muted}>{caregiver?"Esta conversa é visível para a pessoa idosa e os cuidadores vinculados.":"Seus cuidadores vinculados também podem ler esta conversa."}</Text>
          <View style={s.row}>
            <Button label="Medicamentos de hoje" tone="light" onPress={()=>void ask("Quais são os medicamentos de hoje?")}/>
            <Button label="Próximas consultas" tone="light" onPress={()=>void ask("Quais são as próximas consultas?")}/>
          </View>
        </>}
        {!turns.length && <Loading state={state} refresh={!!state.error}/>}
        {turns.map(turn=><View key={turn.id} style={{gap:6}}>
          <ChatBubble text={turn.content} own/>
          <ChatBubble text={turn.reply} live={latest?.id===turn.id} onListen={()=>speak(turn.reply)}/>
          {latest?.id===turn.id && <View style={{gap:6,alignItems:"flex-start"}}>
            {latest.confirmation_doses.map(dose=><Button key={dose.time_id}
              label={`Confirmar ${dose.name} · ${dose.time}`} tone="light" disabled={savingDose}
              onPress={()=>confirmDose(dose,latest)}/>)}
            {!!latest.action && <Button
              label={"Abrir "+(caregiver&&latest.action==="SOS"?"Alertas":latest.action)}
              onPress={()=>navigate(latest.action!)}/>}
          </View>}
        </View>)}
        {!!pending && <View style={{gap:8}}>
          <ChatBubble text={pending} own/>
          <Text style={s.muted} accessibilityLiveRegion="polite">Preparando a resposta…</Text>
        </View>}
      </ScrollView>
      <View style={{padding:8,gap:6,borderTopWidth:1,borderColor:"#DCE8ED"}}>
        {feedback && <FeedbackNotice feedback={feedback} onDismiss={()=>setFeedback(null)}/>}
        <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Falar com o assistente"
            accessibilityState={{disabled:!!pending}} disabled={!!pending} onPress={startVoice}
            style={({pressed})=>({width:44,height:44,borderRadius:12,alignItems:"center",justifyContent:"center",
              backgroundColor:pressed?"#D8E8FA":colors.light,opacity:pending ? .5 : 1})}>
            <AppIcon name="microphone" size={21}/>
          </Pressable>
          <TextInput style={[s.input,{flex:1,minWidth:0,minHeight:46,maxHeight:70,paddingVertical:9,paddingHorizontal:10}]}
            accessibilityLabel="Mensagem para o assistente" placeholder="Digite sua mensagem"
            value={draft} onChangeText={setDraft} maxLength={500} multiline/>
          <Pressable accessibilityRole="button" accessibilityLabel="Enviar"
            accessibilityState={{disabled:!!pending||!draft.trim(),busy:!!pending}} disabled={!!pending||!draft.trim()}
            onPress={()=>void ask(draft)}
            style={({pressed})=>({width:46,height:46,borderRadius:12,alignItems:"center",justifyContent:"center",
              backgroundColor:pressed?"#184781":colors.blue,opacity:!draft.trim()||pending ? .56 : 1})}>
            {pending?<ActivityIndicator size="small" color="#FFF"/>:<AppIcon name="send" size={22} color="#FFF"/>}
          </Pressable>
        </View>
      </View>
    </>}
  </View>;
}
function CaregiverNotices({onOpenAlerts}:{onOpenAlerts:()=>void}) {
  const [feedback,setFeedback]=useState("");
  const [busy,setBusy]=useState(false);
  const browser=Platform.OS==="web";
  const native=browser?window.CuidaliNative:undefined;
  const supported=browser && typeof Notification!=="undefined"
    && "serviceWorker" in navigator && "PushManager" in window;
  const blocked=supported && Notification.permission==="denied";

  async function activate() {
    const push=window.CuidaliWebPush;
    if (!push) {
      setFeedback("As notificações ainda estão carregando. Tente novamente em instantes.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const result=await push.activate(token=>api("/push-tokens","POST",{token,platform:"web"}));
      setFeedback(result);
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <Card>
    <Text accessibilityRole="header" style={s.subtitle}>Notificações de cuidado</Text>
    <Text style={s.muted}>Receba no celular avisos de SOS, novos registros de dor e períodos sem atividade da pessoa que você acompanha.</Text>
    {native ? <>
      <Button label="Ativar notificações" onPress={()=>{
        native.setMonitoring(true);
        setFeedback("Se o Android pedir permissão, toque em Permitir para receber os avisos.");
      }}/>
      <Button label="Desativar notificações" tone="light" onPress={()=>{
        native.setMonitoring(false);
        setFeedback("Notificações desativadas neste aparelho.");
      }}/>
    </> : supported && !blocked
      ? <Button label="Ativar notificações" busy={busy} onPress={activate}/>
      : <Text style={s.text}>{blocked
        ? "As notificações estão bloqueadas. Você pode liberá-las nas configurações do navegador."
        : "As notificações estão indisponíveis neste navegador. Você pode acompanhar os avisos na aba Alertas."}</Text>}
    <Button label="Abrir alertas" tone="light" onPress={onOpenAlerts}/>
    {!!feedback && <Text accessibilityRole="alert" style={s.text}>{feedback}</Text>}
  </Card>;
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
  const {appearance,setPreferences}=usePreferences();
  return <AppearanceProvider value={appearance}><Cuidali onPreferencesChange={setPreferences}/></AppearanceProvider>;
}

function Cuidali({onPreferencesChange}:{onPreferencesChange:React.ComponentProps<typeof AccessibilityPanel>["onChange"]}) {
  const {width,height} = useWindowDimensions();
  const appearance=useAppearance();
  const [accessibilityOpen,setAccessibilityOpen]=useState(false);
  const closeAccessibility=useCallback(()=>setAccessibilityOpen(false),[]);
  const desktop = Platform.OS === "web" && width >= 980;
  const [elderHeight, setElderHeight] = useState(0);
  const shortWide = height < 460 && width >= 560;
  const [setup, setSetup] = useState(false);
  const [drawerOpen,setDrawerOpen] = useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const recentAssistantQuestions=useRef<string[]>([]);
  const [feedback,setFeedback]=useState<Feedback|null>(null);
  const notify=useCallback((message:string,error=false)=>setFeedback({message,error}),[]);
  const closeAssistant=useCallback(()=>setAssistantOpen(false),[]);
  useEffect(()=>{
    if(!feedback) return;
    const timeout=setTimeout(()=>setFeedback(null),feedback.error?15000:11000);
    return ()=>clearTimeout(timeout);
  },[feedback]);
  const [railCollapsed,setRailCollapsed] = useState(()=>{
    if (Platform.OS!=="web") return false;
    try { return window.localStorage.getItem("cuidali.menu.recolhido")==="1"; }
    catch { return false; }
  });
  const [doseRevision, setDoseRevision] = useState(0);
  const [agendaDay,setAgendaDay]=useState(todaySP);
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
  const [pinchZoom,setPinchZoom]=useState(false);
  useEffect(()=>{
    if (Platform.OS!=="web" || !window.visualViewport) return;
    const viewport=window.visualViewport;
    const update=()=>setPinchZoom(viewport.scale>1.05);
    update();
    viewport.addEventListener("resize",update);
    return ()=>viewport.removeEventListener("resize",update);
  },[]);
  const compactOverflow=elderLayout && (pinchZoom || width<300 || height<340 || (width<560 && height<460));
  const demo = !!user && isBrowserDemo();
  useEffect(() => {
    if (desktop || !user) setDrawerOpen(false);
  }, [desktop,user?.id]);
  useEffect(() => {
    if (!desktop) return;
    try { window.localStorage.setItem("cuidali.menu.recolhido",railCollapsed?"1":"0"); }
    catch { /* The layout still works without browser storage. */ }
  }, [desktop,railCollapsed]);
  function setTab(next:string,day?:string) {
    if(next==="Agenda") setAgendaDay(day??todaySP());
    if (next==="Assistente" && elder) {
      setAssistantOpen(true);
      return;
    }
    if (next==="Assistente") next="Vínculos";
    const destination = caregiver && next === "SOS" ? "Alertas" : next;
    if (destination !== currentTab.current) {
      navigationHistory.current.push(currentTab.current);
      currentTab.current = destination;
      setTabState(destination);
    }
  }
  function goBack(){const previous=navigationHistory.current.pop() || "Início";currentTab.current=previous;setTabState(previous);}
  const sessionGeneration = useRef(0);
  function loggedIn(u: User) {
    const demoElder = u.role==="caregiver" && isBrowserDemo() ? linkedDemoElder() : 0;
    sessionGeneration.current++;
    setUser(u);
    setElder(u.role==="elder" ? Number(u.id) : demoElder);
    setDrawerOpen(false);
    setAssistantOpen(false);
    setFeedback(null);
    navigationHistory.current = [];
    currentTab.current = u.role==="elder" || demoElder ? "Início" : "Vínculos";
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
    recentAssistantQuestions.current=[];
    if(!user||!elder) setAssistantOpen(false);
  },[user?.id,elder]);
  useEffect(()=>{
    if(!assistantOpen||Platform.OS!=="web") return;
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key==="Escape"&&!event.defaultPrevented) closeAssistant();
    };
    window.addEventListener("keydown",closeOnEscape);
    return ()=>window.removeEventListener("keydown",closeOnEscape);
  },[assistantOpen,closeAssistant]);
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
  }, [tab, elder]);
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (
        ["Medicamentos", "Calendário", "Consultas", "Contatos", "Dores", "Vínculos"].includes(
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
          {demo && <Button label="Ver como cuidador" tone="light" onPress={()=>loggedIn(switchDemoProfile())} />}
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
          <ScreenHeading label={caregiver?"Cuidados":"Seu espaço de cuidado"}
            description={caregiver?"Acompanhe a rotina da pessoa selecionada.":undefined} icon="elder"/>
          {!!elder&&<CareRoutineSummary elder={elder}/>}
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}><MenuTile label="Medicamentos" subtitle="Doses e horários" icon="pills" onPress={()=>setTab('Medicamentos')}/><MenuTile label="Consultas" subtitle="Agenda e próximos encontros" icon="calendar" warm onPress={()=>setTab('Consultas')}/></View>
          <MenuRow label="Dores" subtitle={caregiver?"Acompanhe como a pessoa idosa está se sentindo":"Registre e acompanhe como está se sentindo"} icon="pain" onPress={()=>setTab('Dores')}/>
          <MenuRow label="Histórico de cuidados" subtitle="Registros, consultas passadas e doses" icon="history" onPress={()=>setTab("Histórico")}/>
          <MenuRow label="Contatos" subtitle="Pessoas de confiança para uma ligação" icon="contacts" onPress={()=>setTab('Contatos')}/>
          <MenuRow label="Vínculos" subtitle={caregiver?"Pessoas que você acompanha":"Quem compartilha o cuidado com você"} icon="link" onPress={()=>setTab('Vínculos')}/>
          <Text style={[s.subtitle,{marginTop:12}]}>Sua conta</Text>
          <MenuRow label="Meus dados" subtitle="Perfil, e-mail e entrada com biometria" icon="person" onPress={()=>setTab('Meus dados')}/>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}><LegalLink kind="terms" /><LegalLink kind="privacy" /></View>
          {!demo && caregiver && <CaregiverNotices onOpenAlerts={()=>setTab("Alertas")}/>}
          <Button
            label="Sair da conta"
            tone="red"
            onPress={() => confirmAction("Sair desta conta?", logout)}
            busy={logoutBusy}
          />
        </>
      );
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
      screen = <Pains key={elder} elder={elder} user={user} onBack={goBack} onOpenProfile={()=>setTab("Meus dados")} />;
    else if (tab === "Agenda" && caregiver)
      screen = <CareAgendaScreen key={`${elder}:${agendaDay}`} elder={elder} initialDay={agendaDay} onOpenAppointments={()=>setTab("Consultas")} />;
    else if (tab === "Histórico" && caregiver)
      screen = <CareHistoryScreen key={elder} elder={elder}/>;
    else if (tab === "Calendário" && elderLayout)
      screen = <CalendarScreen key={elder} elder={elder} onOpenAppointments={()=>setTab("Consultas")} onBack={goBack} />;
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
  const fixedContent=elderLayout && !compactOverflow && appearance.size==="normal" && !appearance.targets;
  const Content = fixedContent ? View : ScrollView;
  const readingId="cuidali-conteudo-atual";
  const landscapeTools=elderLayout&&shortWide;
  const tools=<View style={{flexDirection:landscapeTools?"column":"row",alignItems:"center",gap:appearance.targets?12:6}}>
    <ReadScreenButton key={tab} screenId={readingId} onUnavailable={message=>notify(message,true)} showLabel={desktop&&!elderLayout}/>
    <UtilityButton icon="accessibility" label="Acessibilidade" onPress={()=>setAccessibilityOpen(true)} showLabel={desktop&&!elderLayout}/>
  </View>;
  return (
    <ElderLayout.Provider value={elderLayout}>
    <ElderViewport.Provider value={elderHeight}>
    <ActionFeedback.Provider value={notify}>
    <SafeAreaProvider>
      <SafeAreaView style={themedStyle([s.page, elderLayout ? {backgroundColor:"#FAFCFC"} : {backgroundColor:"#EDF4FA"}],appearance,"view") as any}>
        <StatusBar style={appearance.dark?"light":"dark"} />
        <View aria-hidden={(drawerOpen&&!desktop)||assistantOpen||accessibilityOpen}
          importantForAccessibility={(drawerOpen&&!desktop)||assistantOpen||accessibilityOpen?"no-hide-descendants":"auto"}
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
            <View style={{flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:9,
              borderBottomWidth:1,borderColor:"#315C78",backgroundColor:"#123449",borderBottomLeftRadius:16,borderBottomRightRadius:16}}>
              <MenuToggle dark label="Abrir menu" icon="menu" expanded={drawerOpen} controls="cuidali-mobile-menu"
                onPress={()=>setDrawerOpen(true)}/>
              <View style={{flex:1,minWidth:0}}>
                <BrandHeader name={user.name} compact dark onProfile={()=>setTab("Meus dados")}/>
              </View>
              {tools}
            </View>
          )}
          {(!user||elderLayout||desktop)&&<View style={landscapeTools?{position:"absolute",right:8,top:8,zIndex:2}:
            {width:"100%",maxWidth:elderLayout?550:1390,alignSelf:"center",
              paddingTop:4,paddingBottom:2,paddingHorizontal:elderLayout?16:25,alignItems:"flex-end"}}>
            {tools}
          </View>}
          <Content nativeID={readingId} {...(fixedContent ? {
            testID:elderLayout?"elder-content":undefined,
            onLayout:elderLayout?({nativeEvent}:LayoutChangeEvent)=>setElderHeight(Math.round(nativeEvent.layout.height)):undefined,
            style:[s.content,{
              flex:1,minHeight:0,overflow:"hidden",maxWidth:shortWide ? Math.min(740,width-116) : 550,
              paddingHorizontal:width >= 380 ? 22 : 16,
              paddingVertical:height < 640 ? 8 : 20,
              gap:height < 640 ? 6 : 12,
            }],
          } : {
            ref:scroll, keyboardShouldPersistTaps:"handled",
            testID:elderLayout?"elder-content":undefined,
            contentContainerStyle:[s.content, elderLayout
              ? {maxWidth:landscapeTools?Math.min(740,width-116):550,paddingHorizontal:12,paddingVertical:10,gap:8}
              : desktop && {padding:28,paddingTop:12,paddingBottom:user?82:28,maxWidth:user?1390:1240}],
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
                    <Pressable accessibilityRole="button"
                      onPress={()=>loggedIn(switchDemoProfile())}
                      style={{minHeight:48,justifyContent:"center",paddingHorizontal:8}}>
                      <Text style={[s.muted,{color:colors.blue,textDecorationLine:"underline"}]}>
                        {caregiver?"Ver como pessoa idosa":"Ver como cuidador"}
                      </Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={logout}
                      style={{minHeight:44,justifyContent:"center",paddingHorizontal:8}}>
                      <Text style={[s.muted,{fontSize:14,color:colors.blue,textDecorationLine:"underline"}]}>Sair da demonstração</Text>
                    </Pressable>
                  </View>
                )}
                {caregiver && tab !== "Vínculos" && tab !== "Início" && (
                  <View style={{alignSelf:desktop?"flex-end":"stretch"}}>
                    <CareSubject elder={elder} onOpen={()=>setTab("Vínculos")}/>
                  </View>
                )}
                {tab !== "Início" && !(elderLayout && (["Cuidados","SOS","Dores"].includes(tab)||(shortWide&&tab==="Calendário"))) && <BackButton onPress={goBack} />}
                {!demo&&<Reminders user={user} navigate={setTab} onRecorded={()=>setDoseRevision(value=>value+1)} />}
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
        {!!user && !!elder && desktop && !elderLayout && <Pressable accessibilityRole="button" accessibilityLabel="Abrir assistente"
          onPress={()=>setTab("Assistente")} style={({pressed})=>({position:"absolute",right:18,bottom:18,
            minHeight:52,borderRadius:26,paddingHorizontal:17,gap:8,backgroundColor:pressed?"#144C3D":colors.green,
            alignItems:"center",flexDirection:"row",boxShadow:"0 5px 18px #12344933"})}>
          <AppIcon name="chat" size={23} color="#FFF"/>
          <Text style={{color:"#FFF",fontWeight:"800",fontSize:16}}>Assistente</Text>
        </Pressable>}
        {feedback && <View pointerEvents="box-none" style={{position:"absolute",top:8,left:12,right:12,alignItems:"center"}}>
          <View style={{width:"100%",maxWidth:520}}>
            <FeedbackNotice feedback={feedback} onDismiss={()=>setFeedback(null)}/>
          </View>
        </View>}
        {user && !desktop && !elderLayout && (
          <CareDrawer name={user.name} caregiver={caregiver} screen={tab} visible={drawerOpen}
            onToggle={()=>setDrawerOpen(false)}
            onNavigate={next=>{setDrawerOpen(false);setTab(next);}}/>
        )}
        {!!user && !!elder && <Modal visible={assistantOpen} transparent onRequestClose={closeAssistant}>
          <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1}}>
            <Pressable accessible={false} focusable={false} aria-hidden onPress={closeAssistant}
              style={{position:"absolute",top:0,right:0,bottom:0,left:0,backgroundColor:"#102C4660"}}/>
            <SafeAreaView pointerEvents="box-none" style={{flex:1,justifyContent:"flex-end",alignItems:"flex-end",
              paddingHorizontal:width<560?8:18,paddingBottom:width<560?8:16,paddingTop:8}}>
              <View accessibilityViewIsModal accessibilityLabel="Assistente Cuidali"
                style={{flex:1,maxHeight:width<560?Math.min(650,height*.87):640,width:"100%",maxWidth:440,
                  borderRadius:18,boxShadow:"0 10px 30px #12344940"}}>
                <Assistant key={`${user.id}:${elder}`} elder={elder} caregiver={caregiver} onClose={closeAssistant}
                  navigate={destination=>{closeAssistant();setTab(destination);}}
                  onDoseRecorded={()=>setDoseRevision(value=>value+1)} recentQuestions={recentAssistantQuestions}/>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>}
        <AccessibilityPanel visible={accessibilityOpen} onClose={closeAccessibility} onChange={onPreferencesChange}/>
      </SafeAreaView>
    </SafeAreaProvider>
    </ActionFeedback.Provider>
    </ElderViewport.Provider>
    </ElderLayout.Provider>
  );
}
