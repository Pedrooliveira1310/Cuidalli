import React from "react";
import {StyleSheet} from "react-native";
import {Pressable, Text, View} from "./Appearance";
import {AppIcon} from "./Visual";
import {colors,styles as s} from "./ui";

export const careInk="#123449";
const tones={
  blue:{background:"#E7F1FC",ink:colors.blue},
  green:{background:"#E3F4EC",ink:colors.green},
  amber:{background:"#FFF1DB",ink:"#805214"},
  red:{background:"#FCE9E9",ink:colors.red},
};
type Tone=keyof typeof tones;

export function CareIcon({icon,tone="blue"}:{icon:string;tone?:Tone}) {
  return <View style={[styles.icon,{backgroundColor:tones[tone].background}]}>
    <AppIcon name={icon} color={tones[tone].ink} size={23}/>
  </View>;
}

export function ScreenHeading({label,description,icon,action}:{
  label:string;description?:string;icon:string;action?:React.ReactNode;
}) {
  return <View style={styles.heading}>
    <View style={{flexDirection:"row",alignItems:"center",gap:12,flexGrow:1,flexShrink:1}}>
      <CareIcon icon={icon}/>
      <View style={{flexShrink:1,minWidth:0}}>
        <Text accessibilityRole="header" style={s.title}>{label}</Text>
        {!!description&&<Text style={s.muted}>{description}</Text>}
      </View>
    </View>
    {action}
  </View>;
}

export function Metric({label,value,icon,tone="blue",onPress,actionLabel}:{
  label:string;value:number;icon:string;tone?:Tone;onPress?:()=>void;actionLabel?:string;
}) {
  const content=<>
    <CareIcon icon={icon} tone={tone}/>
    <View style={{flexShrink:1,gap:1}}>
      <Text style={{fontSize:26,fontWeight:"800",color:careInk}}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  </>;
  const style=[styles.metric,tone==="amber"&&{backgroundColor:"#FFF8EB",borderColor:"#ECD7AC"}];
  return onPress?<Pressable accessibilityRole="button" accessibilityLabel={actionLabel??`${label}: ${value}`}
    onPress={onPress} style={style}>{content}</Pressable>:<View style={style}>{content}</View>;
}

export function Status({label,tone="blue",icon}:{label:string;tone?:Tone;icon?:string}) {
  const {background,ink}=tones[tone];
  return <View style={[styles.status,{backgroundColor:background,borderColor:background}]}>
    {icon&&<AppIcon name={icon} size={15} color={ink}/>}
    <Text style={{color:ink,fontSize:14,fontWeight:"700",flexShrink:1}}>{label}</Text>
  </View>;
}

export function TimelineRow({title,detail,time,icon,status,tone="blue",onPress}:{
  title:string;detail?:string;time?:string;icon:string;status?:string;tone?:Tone;onPress?:()=>void;
}) {
  const content=<>
    <View style={{width:13,height:13,borderRadius:7,borderWidth:2,borderColor:tones[tone].ink,
      backgroundColor:tone==="green"?tones[tone].ink:"#FFF"}}/>
    <CareIcon icon={icon} tone={tone}/>
    <View style={{flex:1,minWidth:75,gap:3}}>
      <Text style={s.label}>{title}</Text>
      {!!detail&&<Text style={s.muted}>{detail}</Text>}
    </View>
    {(time||status)&&<View style={{alignItems:"flex-end",gap:4,maxWidth:"47%"}}>
      {!!time&&<Text style={{fontSize:15,fontWeight:"800",color:careInk,textAlign:"right"}}>{time}</Text>}
      {!!status&&<Status label={status} tone={tone}/>}
    </View>}
    {onPress&&<AppIcon name="chevron" size={17}/>}
  </>;
  return onPress?<Pressable accessibilityRole="button" onPress={onPress} style={styles.timeline}>{content}</Pressable>
    :<View style={styles.timeline}>{content}</View>;
}

export function FilterBar<T extends string>({label,items,selected,onChange}:{
  label:string;items:readonly {value:T;label:string}[];selected:T;onChange:(value:T)=>void;
}) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={[s.row,{gap:6}]}>
    {items.map(item=><Pressable key={item.value} accessibilityRole="tab" accessibilityLabel={item.label}
      accessibilityState={{selected:item.value===selected}} onPress={()=>onChange(item.value)}
      style={({pressed})=>[styles.filter,{backgroundColor:item.value===selected?colors.blue:pressed?"#DEEBF9":"#FFF"}]}>
      <Text style={{fontSize:15,fontWeight:"700",color:item.value===selected?"#FFF":careInk}}>
        {item.value===selected?"✓ ":""}{item.label}
      </Text>
    </Pressable>)}
  </View>;
}

export function Initials({name}:{name:string}) {
  return <View style={styles.initials}>
    <Text style={{fontSize:23,fontWeight:"800",color:colors.blue}}>{name.trim().split(/\s+/).slice(0,2).map(word=>word.charAt(0)).join("").toUpperCase()}</Text>
  </View>;
}

const styles=StyleSheet.create({
  icon:{width:41,height:41,flexShrink:0,borderRadius:13,alignItems:"center",justifyContent:"center"},
  heading:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:10},
  metric:{flexGrow:1,flexBasis:142,minWidth:0,minHeight:74,flexDirection:"row",alignItems:"center",gap:9,padding:11,
    borderRadius:16,borderWidth:1,borderColor:"#D7E4F0",backgroundColor:"#FFF"},
  metricLabel:{fontSize:15,fontWeight:"700",color:"#35475F"},
  status:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:8,paddingVertical:4,borderRadius:12,borderWidth:1},
  timeline:{flexDirection:"row",alignItems:"center",gap:8,borderBottomWidth:1,borderColor:"#D9E6F0",paddingVertical:9},
  filter:{minHeight:43,borderRadius:12,borderWidth:1,borderColor:"#CBDDEF",justifyContent:"center",paddingHorizontal:11},
  initials:{width:54,height:54,borderRadius:15,backgroundColor:"#E5F0FE",borderWidth:1,borderColor:"#BFD7F1",
    alignItems:"center",justifyContent:"center",flexShrink:0},
});
