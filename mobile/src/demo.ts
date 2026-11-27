import type { User } from "./api";
import { isoDateTime, todaySP } from "./validation";

type Role = User["role"];
type DemoUser = User & { email: string; birth_date: string };
type RecordId = { id: number };
type Medication = RecordId & {
  name: string; dosage: string; start_date: string; end_date: string;
  active: boolean; times: {id: number; time: string}[];
};
type Appointment = RecordId & {
  doctor: string; specialty: string; location: string; scheduled_at: string; cancelled: boolean;
};
type Contact = RecordId & {name: string; phone: string; relationship: string; is_primary: boolean};
type Dose = RecordId & {
  time_id: number; dose_date: string; status: "taken" | "pending"; recorded_at: string;
  name: string; dosage: string; time: string;
};
type Alert = RecordId & {
  kind: "sos" | "pain"; status: "open" | "accepted" | "resolved";
  created_at: string; accepted_name?: string;
};
type Pain = RecordId & {
  view: string; region: string; type: string; intensity: number; onset: string;
  notes: string; created_at: string; views: {name: string; viewed_at: string}[];
};
type DemoState = {
  role: Role | null;
  users: Record<Role, DemoUser>;
  nextId: number;
  linked: boolean;
  link: {code: string; expiresAt: number} | null;
  lastActivity: {created_at: string} | null;
  checkInAt?: number;
  hours: number;
  medications: Medication[];
  appointments: Appointment[];
  contacts: Contact[];
  doses: Dose[];
  alerts: Alert[];
  pains: Pain[];
  messages: (RecordId & {content: string; reply: string})[];
};

const profiles: Record<Role, DemoUser> = {
  elder: {id:-101,role:"elder",name:"Maria Almeida",email:"maria.cuidali@example.com",phone:"0000000001",birth_date:"1960-05-01",sex:"female"},
  caregiver: {id:-102,role:"caregiver",name:"Ana Silva",email:"ana.cuidali@example.com",phone:"0000000002",birth_date:"1988-04-17"},
};
const storageKey = "cuidali.demo.v1";
const now = () => new Date().toISOString().slice(0,19).replace("T"," ");
const dateInSaoPaulo = (utc: string) => new Intl.DateTimeFormat("sv-SE",{
  timeZone:"America/Sao_Paulo",
}).format(new Date(utc.replace(" ","T")+"Z"));

function seed(): DemoState {
  const date = todaySP();
  return {
    role:null, users:{elder:{...profiles.elder},caregiver:{...profiles.caregiver}},
    nextId:20,linked:true,link:null,lastActivity:null,hours:24,
    medications:[
      {id:1,name:"Losartana",dosage:"50 mg",start_date:date,end_date:"2099-12-31",active:true,times:[{id:3,time:"08:00"}]},
      {id:2,name:"Metformina",dosage:"500 mg",start_date:date,end_date:"2099-12-31",active:true,times:[{id:4,time:"20:00"}]},
    ],
    appointments:[{id:5,doctor:"Dra. Helena Costa",specialty:"Clínica geral",location:"Clínica de demonstração",
      scheduled_at:date+" 17:30:00",cancelled:false}],
    contacts:[{id:6,name:"Ana Silva",phone:profiles.caregiver.phone,relationship:"Filha",is_primary:true}],
    doses:[{id:7,time_id:3,dose_date:date,status:"taken",recorded_at:now(),name:"Losartana",dosage:"50 mg",time:"08:00"}],
    alerts:[{id:8,kind:"sos",status:"open",created_at:now()}],
    pains:[],messages:[],
  };
}

let current: DemoState | undefined;
let storedStateRead = false;
function load(): DemoState | undefined {
  if (storedStateRead || current || typeof window === "undefined" || window.CuidaliNative) return current;
  storedStateRead = true;
  try {
    const value = window.sessionStorage.getItem(storageKey);
    if (value) {
      const parsed: DemoState = JSON.parse(value);
      if (parsed.users?.elder?.id === profiles.elder.id &&
          (parsed.role === null || parsed.role === "elder" || parsed.role === "caregiver")) {
        parsed.users.elder.sex ??= profiles.elder.sex;
        current = parsed;
      }
    }
  } catch {
    // Opening a demo still works when the browser blocks storage.
  }
  return current;
}
function persist(state: DemoState) {
  try {
    if (typeof window !== "undefined") window.sessionStorage.setItem(storageKey,JSON.stringify(state));
  } catch {
    // The demonstration continues in memory.
  }
}
export function isBrowserDemo(): boolean {
  return Boolean(load()?.role);
}
export function startBrowserDemo(role: Role): User {
  const state = current = load() ?? seed();
  state.role = role;
  persist(state);
  return state.users[role];
}
export function switchDemoProfile(): User {
  const state=load();
  if (!state?.role) throw new Error("Abra um perfil de demonstração.");
  state.role=state.role==="elder" ? "caregiver" : "elder";
  persist(state);
  return state.users[state.role];
}
export function linkedDemoElder() {
  const state=load();
  return state?.linked ? state.users.elder.id : 0;
}
export function endBrowserDemo() {
  const state = load();
  if (state) {
    state.role = null;
    persist(state);
  }
}

export class DemoRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function find<T extends RecordId>(items: T[],id: number): T {
  const item = items.find(entry=>entry.id===id);
  if (!item) throw new DemoRequestError(404,"Registro de demonstração não encontrado.");
  return item;
}
function checkInRemaining(state:DemoState) {
  return Math.max(0,Math.ceil(((state.checkInAt??0)+900000-Date.now())/1000));
}
function dashboard(state: DemoState) {
  const date = todaySP();
  const doses = state.medications
    .filter(item=>item.active && item.start_date<=date && item.end_date>=date)
    .flatMap(item=>item.times.map(({id,time})=>({
      time_id:id,time,name:item.name,dosage:item.dosage,
      status:state.doses.find(record=>record.time_id===id && record.dose_date===date)?.status ?? "unconfirmed",
    }))).sort((a,b)=>a.time.localeCompare(b.time));
  return {
    date,elder:state.users.elder,last_activity:state.lastActivity,doses,
    check_in_remaining_seconds:checkInRemaining(state),
    alerts:state.alerts,
    appointments:state.appointments.filter(item=>!item.cancelled && dateInSaoPaulo(item.scheduled_at)===date),
    dose_history:state.doses,
  };
}
type Data = Record<string, unknown>;
const value = (data: Data,key: string) => String(data[key] ?? "").trim();

function saveMedication(state: DemoState,id: number,method: string,data: Data) {
  if (method==="DELETE") {
    find(state.medications,id).active=false;
    return {message:"Medicamento desativado."};
  }
  const item = id ? find(state.medications,id) : undefined;
  const times: string[] = Array.isArray(data.times) ? data.times : [];
  const record: Medication = {
    id:item?.id ?? state.nextId++,name:value(data,"name"),dosage:value(data,"dosage"),
    start_date:value(data,"start_date"),end_date:value(data,"end_date"),active:true,
    times:times.map(time=>({time,id:item?.times.find(slot=>slot.time===time)?.id ?? state.nextId++})),
  };
  if (item) Object.assign(item,record);
  else state.medications.push(record);
  return {message:"Medicamento salvo."};
}

function saveAppointment(state: DemoState,id: number,method: string,data: Data) {
  if (method==="DELETE") {
    find(state.appointments,id).cancelled=true;
    return {message:"Consulta cancelada."};
  }
  const local = isoDateTime(value(data,"scheduled_at"));
  if (!local) throw new DemoRequestError(422,"Informe a data e o horário da consulta.");
  const item = id ? find(state.appointments,id) : undefined;
  // The demonstration uses the current São Paulo civil offset (UTC−3).
  const scheduled = new Date(local+":00-03:00").toISOString().slice(0,19).replace("T"," ");
  const record: Appointment = {
    id:item?.id ?? state.nextId++,doctor:value(data,"doctor"),specialty:value(data,"specialty"),
    location:value(data,"location"),scheduled_at:scheduled,cancelled:false,
  };
  if (item) Object.assign(item,record);
  else state.appointments.push(record);
  return {message:"Consulta salva."};
}

function saveContact(state: DemoState,id: number,method: string,data: Data) {
  if (method==="DELETE") {
    find(state.contacts,id);
    state.contacts=state.contacts.filter(item=>item.id!==id);
    return {message:"Contato excluído."};
  }
  const item = id ? find(state.contacts,id) : undefined;
  const record: Contact = {
    id:item?.id ?? state.nextId++,name:value(data,"name"),phone:value(data,"phone").replace(/\D/g,""),
    relationship:value(data,"relationship"),is_primary:data.is_primary===true,
  };
  if (record.is_primary) state.contacts.forEach(contact=>{contact.is_primary=false;});
  if (item) Object.assign(item,record);
  else state.contacts.push(record);
  return {message:"Contato salvo."};
}

function answer(state: DemoState,role: Role,content: string) {
  const query = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const summary = dashboard(state);
  const pending = summary.doses.filter(dose=>dose.status!=="taken");
  let action: string | null = null;
  let confirmation_doses: typeof pending = [];
  let reply = "Na demonstração, posso mostrar os remédios, as consultas e os cuidados de exemplo.";
  if (/\b(sos|ajuda|socorro|emergencia|alertas?)\b/.test(query)) {
    action = role==="elder" ? "SOS" : "Alertas";
    reply = role==="elder" ? "Abra o SOS para registrar um pedido de ajuda de exemplo." : "Abra Alertas para acompanhar os pedidos de ajuda de exemplo.";
  } else if (/\bcalendario\b/.test(query)) {
    action = role==="elder"?"Calendário":"Consultas";
    reply = "Você pode ver os dias com consultas cadastradas na demonstração.";
  } else if (role==="elder" && /estou bem hoje|avisar.*que estou bem/.test(query)) {
    action="Início";
    reply="Na tela Início, toque em “Estou bem hoje” para registrar um aviso de exemplo.";
  } else if (/consulta|agenda/.test(query)) {
    action = "Consultas";
    reply = "Abra Consultas para ver os atendimentos cadastrados na demonstração.";
  } else if (/remedio|medica|dose|tomei/.test(query)) {
    action = "Medicamentos";
    if (role==="elder" && /tomei|confirmar dose/.test(query)) confirmation_doses = pending;
    reply = pending.length ? "Doses sem confirmação: "+pending.map(dose=>dose.name+" às "+dose.time).join(", ")+"."
      : "As doses de hoje estão em dia na demonstração.";
  } else if (/que dia|data de hoje|que horas|hora atual/.test(query)) {
    reply = new Date().toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
  } else if (/\bdor(es)?\b|doendo/.test(query)) {
    action="Dores";
    reply="Abra Dores para ver ou registrar um exemplo.";
  }
  const id=state.nextId++;
  state.messages.push({id,content,reply});
  return {id,reply,action,confirmation_doses,date:summary.date,mode:"demo"};
}

function dispatch(state: DemoState,role: Role,path: string,method: string,data: Data) {
  const user = state.users[role];
  const other = state.users[role==="elder" ? "caregiver" : "elder"];
  if (path==="/me" && method==="GET") return {user};
  if (path==="/me" && method==="PATCH") {
    // Keep the demo identity fixed and never retain credentials or contact details entered here.
    const sex=data.sex;
    if (role==="elder" && sex!=null && sex!=="male" && sex!=="female")
      throw new DemoRequestError(422,"Selecione uma opção válida para sexo.");
    const updated = {...user,name:value(data,"name") || user.name};
    if (role==="elder" && (sex==="male"||sex==="female")) updated.sex=sex;
    state.users[role] = updated;
    return {user:updated,message:updated.sex!==user.sex?"Sexo atualizado na demonstração.":"Nome atualizado na demonstração."};
  }
  if (path==="/notifications" && method==="GET") {
    if (role==="caregiver") return {role,items:[]};
    return {...dashboard(state),role};
  }
  if (path==="/links" && method==="GET") return {items:state.linked?[other]:[]};
  if (path==="/links/"+other.id && method==="DELETE") {
    state.linked=false;
    return {message:"Vínculo removido na demonstração."};
  }
  if (path==="/link-codes" && method==="POST" && role==="elder") {
    const code = Date.now().toString(16).toUpperCase().slice(-12).padStart(12,"0");
    state.link={code,expiresAt:Date.now()+600000};
    return {id:1,code};
  }
  if (path==="/link-codes/1" && method==="DELETE" && role==="elder") {
    state.link=null;
    return {message:"Código revogado."};
  }
  if (path==="/links/redeem" && method==="POST" && role==="caregiver") {
    if (state.link?.code!==value(data,"code") || state.link.expiresAt<Date.now()) {
      throw new DemoRequestError(422,"Gere um código no perfil de pessoa idosa da demonstração.");
    }
    state.linked=true;
    state.link=null;
    return {elder_id:other.id,message:"Vinculação concluída."};
  }

  const match = /^\/elders\/(-?\d+)\/([a-z]+)(?:\/(\d+))?(\/seen)?$/.exec(path);
  if (!match || Number(match[1])!==state.users.elder.id) throw new DemoRequestError(404,"Opção indisponível na demonstração.");
  if (role==="caregiver" && !state.linked) throw new DemoRequestError(403,"Vincule a pessoa idosa da demonstração.");
  const [, , resource,idPart,seen] = match;
  const id = Number(idPart ?? 0);
  switch (resource) {
    case "dashboard": return dashboard(state);
    case "medications": return method==="GET" ? {items:state.medications} : saveMedication(state,id,method,data);
    case "appointments": return method==="GET" ? {items:state.appointments} : saveAppointment(state,id,method,data);
    case "contacts": return method==="GET" ? {items:state.contacts} : saveContact(state,id,method,data);
    case "activity":
      if (role==="elder" && method==="POST") {
        const remaining=checkInRemaining(state);
        if (remaining) return {message:"Seu aviso já foi enviado há pouco.",check_in_remaining_seconds:remaining};
        state.checkInAt=Date.now();
        state.lastActivity={created_at:now()};
        return {message:"Aviso enviado na demonstração.",check_in_remaining_seconds:900};
      }
      break;
    case "settings":
      if (method==="GET") return {inactivity_hours:state.hours};
      if (role==="caregiver" && method==="PATCH") {
        const hours = Number(data.inactivity_hours);
        if (!Number.isInteger(hours) || hours<1 || hours>168) throw new DemoRequestError(422,"Escolha entre 1 e 168 horas.");
        state.hours=hours;
        return {message:"Acompanhamento atualizado."};
      }
      break;
    case "doses": {
      if (role!=="elder" || method!=="POST") break;
      const {date,doses} = dashboard(state);
      const dose = doses.find(item=>item.time_id===id);
      if (!dose || value(data,"date")!==date) throw new DemoRequestError(422,"Escolha uma dose de hoje.");
      const status = data.status==="taken" || dose.status==="taken" ? "taken" : "pending";
      const previous = state.doses.find(item=>item.time_id===id && item.dose_date===date);
      const record: Dose = {...dose,id:previous?.id ?? state.nextId++,dose_date:date,status,recorded_at:now()};
      if (previous) Object.assign(previous,record);
      else state.doses.unshift(record);
      state.lastActivity={created_at:record.recorded_at};
      return {message:"Dose registrada."};
    }
    case "sos":
      if (role==="elder" && method==="POST") {
        const created_at=now();
        state.alerts.unshift({id:state.nextId++,kind:"sos",status:"open",created_at});
        state.lastActivity={created_at};
        return {message:"Pedido registrado na demonstração."};
      }
      break;
    case "alerts": {
      if (method==="GET") return {items:state.alerts};
      if (role!=="caregiver" || method!=="PATCH") break;
      const alert=find(state.alerts,id);
      if (alert.status!=="resolved") {
        alert.status=data.status==="resolved" ? "resolved" : "accepted";
        alert.accepted_name=user.name;
      }
      return {message:alert.status==="resolved" ? "Alerta concluído." : "Você assumiu o acompanhamento."};
    }
    case "pains":
      if (method==="GET") return {items:state.pains};
      if (method!=="POST") break;
      if (seen && role==="caregiver") {
        const pain=find(state.pains,id);
        if (!pain.views.length) pain.views.push({name:user.name,viewed_at:now()});
        return {message:"Visualização registrada."};
      }
      if (!seen && role==="elder") {
        const locations=Array.isArray(data.locations)?data.locations:[data];
        for (const location of locations) {
          state.pains.unshift({id:state.nextId++,view:value(location,"view"),region:value(location,"region"),type:value(data,"type"),
            intensity:Number(data.intensity),onset:value(data,"onset"),notes:value(data,"notes"),created_at:now(),views:[]});
        }
        state.alerts.unshift({id:state.nextId++,kind:"pain",status:"open",created_at:now()});
        return {message:locations.length===1?"Dor registrada na demonstração.":"Dores registradas na demonstração."};
      }
      break;
    case "assistant":
      if (method==="GET") return {items:state.messages.slice(-30)};
      if (method==="POST") return answer(state,role,value(data,"message"));
  }
  throw new DemoRequestError(405,"Essa ação está indisponível na demonstração.");
}

export function browserDemoRequest(path: string,method: string,body: unknown) {
  const state=load();
  if (!state?.role) throw new DemoRequestError(401,"Abra um perfil de demonstração.");
  const data = body && typeof body==="object" ? body as Data : {};
  const result = dispatch(state,state.role,path,method,data);
  if (method!=="GET") persist(state);
  return result;
}
