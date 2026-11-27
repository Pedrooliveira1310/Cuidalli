import React,{useMemo,useState} from "react";
import {Platform,useWindowDimensions} from "react-native";
import {Pressable,Text,TextInput,View} from "./Appearance";
import {CareIcon,FilterBar,ScreenHeading,Status,TimelineRow} from "./CarePanels";
import {AppIcon} from "./Visual";
import {Button,Card,calendarDate,colors,dateTime,localInput,styles as s} from "./ui";
import {todaySP} from "./validation";

export type Appointment={id:number;doctor:string;specialty:string;location:string;scheduled_at:string;cancelled:number|boolean|string};
export type Medicine={id:number;name:string;dosage:string;active:number|boolean|string;start_date:string;end_date:string;times:{id:number;time:string}[]};
export type DoseRecord={id:number;name:string;dosage:string;time:string;status:string;recorded_at:string;dose_date:string};
export type PainRecord={id:number;region:string;type:string;intensity:number;created_at:string;notes:string};

const weekdays=new Intl.DateTimeFormat("pt-BR",{weekday:"short",timeZone:"UTC"});
const fullDate=new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const dayDate=(key:string)=>new Date(key+"T12:00:00Z");
function addDay(key:string,count:number) {
  const date=dayDate(key);
  date.setUTCDate(date.getUTCDate()+count);
  return date.toISOString().slice(0,10);
}
const weekStart=(key:string)=>addDay(key,-((dayDate(key).getUTCDay()+6)%7));

export function WeekPicker({selected,onChange}:{selected:string;onChange:(day:string)=>void}) {
  const first=weekStart(selected);
  const month=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(dayDate(selected));
  return <Card>
    <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
      <Text accessibilityRole="header" style={[s.subtitle,{flex:1}]}>{month[0].toUpperCase()+month.slice(1)}</Text>
      {[[-7,"Semana anterior"],[7,"Próxima semana"]] .map(([delta,label])=><Pressable key={label}
        accessibilityRole="button" accessibilityLabel={String(label)} onPress={()=>onChange(addDay(selected,Number(delta)))}
        style={{width:44,minHeight:44,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:colors.light}}>
        <View style={{transform:[{rotate:Number(delta)<0?"180deg":"0deg"}]}}><AppIcon name="chevron" size={20}/></View>
      </Pressable>)}
    </View>
    <View style={{flexDirection:"row",justifyContent:"space-between",gap:2}}>
      {Array.from({length:7},(_,index)=>{
        const key=addDay(first,index), date=dayDate(key), active=key===selected;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={fullDate.format(date)}
          accessibilityState={{selected:active}} onPress={()=>onChange(key)} style={{flex:1,minWidth:0,minHeight:50,
            alignItems:"center",justifyContent:"center",gap:2,borderRadius:11,borderWidth:active?2:0,
            borderColor:colors.blue,backgroundColor:active?colors.blue:"#F1F6FB"}}>
          <Text style={{fontSize:12,color:active?"#FFF":colors.dark}}>{weekdays.format(date).replace(".","")}</Text>
          <Text style={{fontSize:17,fontWeight:"800",color:active?"#FFF":colors.dark,textDecorationLine:active?"underline":"none"}}>{date.getUTCDate()}</Text>
        </Pressable>;
      })}
    </View>
  </Card>;
}

export function CareSchedule({appointments,medications,onAppointments,initialDay}:{
  appointments:Appointment[];medications:Medicine[];onAppointments:()=>void;initialDay:string;
}) {
  const [day,setDay]=useState(initialDay);
  const [mode,setMode]=useState<"day"|"week">("day");
  const dates=mode==="day"?[day]:Array.from({length:7},(_,i)=>addDay(weekStart(day),i));
  const items=dates.map(key=>{
    const scheduled=appointments.filter(a=>!Number(a.cancelled)&&localInput(a.scheduled_at).slice(0,10)===key);
    return {key,list:[
      ...scheduled.map(a=>({id:"a"+a.id,title:a.specialty,detail:a.doctor+" · "+a.location,
        time:localInput(a.scheduled_at).slice(11,16),icon:"calendar",status:"Consulta"})),
      ...(key<todaySP()?[]:medications.filter(m=>Number(m.active)&&key>=m.start_date&&key<=m.end_date)
        .flatMap(m=>m.times.map(t=>({id:"m"+t.id,title:m.name,detail:m.dosage,time:t.time,icon:"pills",status:"Dose prevista"})))),
    ].sort((a,b)=>a.time.localeCompare(b.time))};
  });
  return <>
    <ScreenHeading label="Agenda" description="Consultas e doses previstas." icon="calendar"
      action={<Button label="Gerenciar consultas" onPress={onAppointments}/>}/>
    <WeekPicker selected={day} onChange={setDay}/>
    <FilterBar label="Período da agenda" items={[{value:"day",label:"Dia"},{value:"week",label:"Semana"}]} selected={mode} onChange={setMode}/>
    {items.map(({key,list})=><Card key={key}>
      <Text accessibilityRole="header" style={s.subtitle}>{fullDate.format(dayDate(key))}</Text>
      {!list.length&&<Text style={s.muted}>Nenhum compromisso para este dia.</Text>}
      {list.map(item=><TimelineRow key={item.id} {...item}/>)}
    </Card>)}
  </>;
}

type RecordKind="doses"|"appointments"|"pains";
type Entry={id:string;kind:RecordKind;title:string;detail:string;date:string;status:string;icon:string};
const historyFilters=[{value:"all",label:"Todos"},{value:"doses",label:"Medicamentos"},{value:"appointments",label:"Consultas"},
  {value:"pains",label:"Dores"}] as const;

export function CareHistory({doses,appointments,pains,regionName}:{
  doses:DoseRecord[];appointments:Appointment[];pains:PainRecord[];regionName:(region:string)=>string;
}) {
  const [filter,setFilter]=useState<"all"|RecordKind>("all");
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState("");
  const {width}=useWindowDimensions();
  const wide=width>=1170;
  const records=useMemo<Entry[]>(()=>[
    ...doses.map((d):Entry=>({id:"m"+d.id,kind:"doses",title:d.name,detail:`${d.dosage} · ${calendarDate(d.dose_date)} às ${d.time.slice(0,5)}`,
      date:d.recorded_at,status:d.status==="taken"?"Dose confirmada":"Dose pendente",icon:"pills"})),
    ...appointments.filter(a=>Number(a.cancelled)||Date.parse(a.scheduled_at.replace(" ","T")+"Z")<=Date.now())
      .map((a):Entry=>({id:"a"+a.id,kind:"appointments",title:a.specialty,detail:a.doctor+" · "+a.location,
        date:a.scheduled_at,status:Number(a.cancelled)?"Consulta cancelada":"Horário passado",icon:"calendar"})),
    ...pains.map((p):Entry=>({id:"p"+p.id,kind:"pains",title:regionName(p.region),
      detail:`${p.type} · ${p.intensity}/10${p.notes?" · "+p.notes:""}`,date:p.created_at,status:"Dor registrada",icon:"pain"})),
  ].sort((a,b)=>b.date.localeCompare(a.date)),[appointments,doses,pains,regionName]);
  const filtered=records.filter(item=>(filter==="all"||item.kind===filter)&&
    `${item.title} ${item.detail} ${item.status}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")));
  const active=filtered.find(item=>item.id===selected);

  function exportHistory() {
    const cell=(value:string)=>`"${(/^[=+\-@\t\r\n]/.test(value)?"'":"")+value.replaceAll('"','""')}"`;
    const rows=[["Data","Registro","Detalhes","Situação"],...filtered.map(x=>[dateTime(x.date),x.title,x.detail,x.status])];
    const url=URL.createObjectURL(new Blob(["\uFEFF",rows.map(row=>row.map(cell).join(";")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;link.download="cuidali-historico.csv";link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <>
    <ScreenHeading label="Histórico de cuidados" icon="history" description="Registros da pessoa acompanhada."
      action={Platform.OS==="web"&&!!filtered.length?<Button label="Exportar histórico" onPress={exportHistory} tone="light"/>:null}/>
    <FilterBar label="Filtrar histórico" items={historyFilters} selected={filter} onChange={setFilter}/>
    <TextInput accessibilityLabel="Buscar no histórico" placeholder="Buscar no histórico" value={query} onChangeText={setQuery} style={s.input}/>
    <View style={{flexDirection:wide?"row":"column",alignItems:"stretch",gap:12}}>
      <View style={{flex:wide?1:undefined,minWidth:0}}><Card>
        <Text accessibilityRole="header" style={s.subtitle}>Registros recentes · {filtered.length}</Text>
        {!filtered.length&&<Text style={s.muted}>Nenhum registro encontrado.</Text>}
        {filtered.map(item=><React.Fragment key={item.id}>
          <TimelineRow title={item.title} time={dateTime(item.date)} status={item.status} icon={item.icon}
            onPress={()=>setSelected(current=>current===item.id?"":item.id)}/>
          {!wide&&active?.id===item.id&&<Text style={s.text}>{item.detail}</Text>}
        </React.Fragment>)}
      </Card></View>
      {wide&&<View style={{flex:0.72,minWidth:0}}><Card>
        {active?<><CareIcon icon={active.icon}/><Text style={s.subtitle}>{active.title}</Text>
          <Status label={active.status}/><Text style={s.text}>{active.detail}</Text></>:
          <Text style={s.muted}>Selecione um registro para ver os detalhes.</Text>}
      </Card></View>}
    </View>
  </>;
}
