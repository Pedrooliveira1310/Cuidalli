import React, {useContext, useState} from "react";
import {Pressable, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {ElderPages, ElderViewport} from "./ElderPages";
import {BackButton, colors, localInput, styles as s} from "./ui";
import {todaySP} from "./validation";
import {AppIcon} from "./Visual";

type Appointment = {id:number; doctor:string; scheduled_at:string; location:string; cancelled:boolean|number|string};
const monthFormat = new Intl.DateTimeFormat("pt-BR", {month:"long", year:"numeric", timeZone:"UTC"});
const dayFormat = new Intl.DateTimeFormat("pt-BR", {weekday:"long", day:"numeric", month:"long", timeZone:"UTC"});
const week = ["D", "S", "T", "Q", "Q", "S", "S"];
const dateKey=(date:Date)=>date.toISOString().slice(0,10);
const calendarDay=(date:string)=>new Date(date+"T12:00:00Z");

export function ElderCalendar({appointments, onOpenAppointments, onBack}:{
  appointments:Appointment[]; onOpenAppointments:()=>void;onBack:()=>void;
}) {
  const today=todaySP();
  const [selected,setSelected]=useState(today);
  const date=calendarDay(selected);
  const monthStart=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
  const monthLength=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  const leading=monthStart.getUTCDay();
  const room=useContext(ElderViewport);
  const {width,height}=useWindowDimensions();
  const split=width>=560&&height<460;
  const cellHeight=split ? (height<380?28:33) : room>0&&room<530 ? 34 : 40;
  const byDate=new Map<string, Appointment[]>();
  for(const appointment of appointments) {
    if(Number(appointment.cancelled)) continue;
    const key=localInput(appointment.scheduled_at).slice(0,10);
    byDate.set(key,[...(byDate.get(key)??[]),appointment]);
  }
  function changeMonth(offset:number) {
    const next=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset,1));
    const nextKey=dateKey(next);
    setSelected(today.startsWith(nextKey.slice(0,7))?today:nextKey);
  }
  const title=<View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:6}}>
    <Text accessibilityRole="header" style={s.subtitle}>Calendário</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Gerenciar consultas" onPress={onOpenAppointments} style={styles.manage}>
      <Text style={{fontSize:15,color:colors.blue,fontWeight:"700"}}>Consultas</Text>
    </Pressable>
  </View>;
  const calendar=<View style={[styles.calendar,split&&{flex:1}]}>
      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" style={styles.arrow} onPress={()=>changeMonth(-1)}>
          <View style={{transform:[{rotate:"180deg"}]}}><AppIcon name="chevron" size={23}/></View>
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={styles.month}>{monthFormat.format(monthStart)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" style={styles.arrow} onPress={()=>changeMonth(1)}>
          <AppIcon name="chevron" size={23}/>
        </Pressable>
      </View>
      <View style={styles.week}>{week.map((label,index)=><Text key={index} style={styles.weekday}>{label}</Text>)}</View>
      {Array.from({length:Math.ceil((leading+monthLength)/7)},(_,row)=><View key={row} style={styles.week}>
        {week.map((_,col)=>{
          const day=row*7+col-leading+1;
          if(day<1||day>monthLength) return <View key={col} style={{flex:1,height:cellHeight}}/>;
          const key=monthStart.toISOString().slice(0,8)+String(day).padStart(2,"0");
          const active=key===selected;
          const events=byDate.get(key)?.length??0;
          return <Pressable key={col} accessibilityRole="button" accessibilityState={{selected:active}}
            accessibilityLabel={dayFormat.format(calendarDay(key))+(events ? `, ${events} ${events===1?"consulta":"consultas"}`:"")}
            onPress={()=>setSelected(key)} style={({pressed})=>[styles.day,{height:cellHeight},
              key===today&&styles.today,pressed&&{backgroundColor:colors.light},active&&styles.selected]}>
            <Text style={[styles.number,active&&{color:"#FFF"}]}>{day}</Text>
            {!!events&&<View style={[styles.dot,active&&{backgroundColor:"#FFF"}]}/>}
          </Pressable>;
        })}
      </View>)}
    </View>;
  const events=<View style={{gap:6}}>
    <Text style={[s.muted,{fontWeight:"700"}]} accessibilityLiveRegion="polite">{dayFormat.format(date)}</Text>
    {!byDate.has(selected)&&<Text style={s.text}>Nenhuma consulta para este dia.</Text>}
    <ElderPages key={selected} label="Consulta">{(byDate.get(selected)??[]).map(item=>
      <View key={item.id} style={styles.event}>
        <Text style={styles.time}>{localInput(item.scheduled_at).slice(11,16)}</Text>
        <View style={{flex:1,minWidth:0}}>
          <Text style={[s.text,{fontWeight:"700"}]} numberOfLines={1}>{item.doctor}</Text>
          <Text style={s.muted} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>
    )}</ElderPages>
  </View>;
  return <View style={split?{flexDirection:"row",alignItems:"center",gap:14}:{gap:6}} testID="elder-calendar">
    {split ? <>
      {calendar}
      <View style={{flex:1,gap:8}}><BackButton onPress={onBack}/>{title}{events}</View>
    </> : <>{title}{calendar}{events}</>}
  </View>;
}

const styles=StyleSheet.create({
  calendar:{backgroundColor:"#FFF",borderWidth:1,borderColor:"#D6E7E4",borderRadius:15,paddingHorizontal:6,paddingBottom:5,gap:2},
  monthRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  arrow:{width:44,minHeight:44,justifyContent:"center",alignItems:"center"},
  month:{flex:1,textAlign:"center",fontSize:17,fontWeight:"800",color:colors.dark,textTransform:"capitalize"},
  manage:{paddingHorizontal:10,minHeight:44,justifyContent:"center",backgroundColor:colors.light,borderRadius:10},
  week:{flexDirection:"row",gap:2},
  weekday:{flex:1,textAlign:"center",fontSize:14,fontWeight:"700",color:colors.green},
  day:{flex:1,alignItems:"center",justifyContent:"center",borderRadius:8},
  number:{fontSize:17,color:colors.dark,fontWeight:"700"},
  today:{backgroundColor:"#E5F4EC"},
  selected:{backgroundColor:colors.green},
  dot:{position:"absolute",bottom:3,width:4,height:4,borderRadius:2,backgroundColor:colors.green},
  event:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#EAF5F2",borderRadius:10,padding:7},
  time:{color:colors.green,fontWeight:"800",fontSize:17},
});
