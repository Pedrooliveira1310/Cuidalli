import React from 'react';
import {View,Text,Image,Pressable,Platform} from 'react-native';
import {colors,styles as s} from './ui';

const paths:Record<string,string>={
 home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
 chat:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z',
 help:'M12 8v5m0 4h.01M10.3 3.8 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z',
 person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 pills:'m8 4-5 5a6 6 0 0 0 8 8l5-5a6 6 0 0 0-8-8Zm-3 3 8 8',
 calendar:'M4 5h16v16H4ZM4 10h16M8 2v6m8-6v6M8 14h2m4 0h2m-8 3h2',
 pain:'M12 3v18M3 12h18M6 6l12 12M6 18 18 6',
 contacts:'M8 4H4v16h16v-4M12 4h8v8M20 4 10 14',
 link:'m9 15 6-6M7 14l-2 2a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6M17 10l2-2a4 4 0 0 0-6-6L9 6a4 4 0 0 0 0 6',
 check:'m5 12 4 4L19 6',
 chevron:'m9 5 7 7-7 7',
 shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
};
export function AppIcon({name,size=26,color=colors.blue}:{name:string;size?:number;color?:string}){
 if(Platform.OS==='web')return React.createElement('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth:1.9,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,style:{flexShrink:0}},React.createElement('path',{d:paths[name]||paths.person}));
 return <Text style={{fontSize:size,color}}>{name==='check'?'✓':name==='help'?'!':name==='chevron'?'›':'+'}</Text>;
}
export function BrandHeader({onProfile,name,large=false}:{onProfile?:()=>void;name?:string;large?:boolean}){
 return <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:large?14:8,marginBottom:large?8:0}}>
  <View style={{width:large?72:48,height:large?72:48,borderRadius:large?22:16,overflow:'hidden',backgroundColor:'#FFF',borderWidth:1,borderColor:'#E3EAF2'}}><Image source={require('../assets/brand/logo-mark.png')} accessibilityLabel="Logo Cuidali: cuidado entre gerações" style={{width:'100%',height:'100%'}} resizeMode="contain"/></View>
  <View style={{flex:1}}><Text style={{fontSize:large?32:23,fontWeight:'800',color:colors.dark,letterSpacing:-.6}}>Cuidali</Text><Text style={{fontSize:16,color:'#52677E',lineHeight:23}}>Cuidar é estar por perto.</Text></View>
  {onProfile&&<Pressable accessibilityRole="button" accessibilityLabel="Abrir meus dados" onPress={onProfile} style={{width:48,height:48,borderRadius:24,backgroundColor:'#DFEAF6',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#C5D8ED'}}><Text style={{fontSize:20,fontWeight:'700',color:colors.blue}}>{(name||'C').slice(0,1).toUpperCase()}</Text></Pressable>}
 </View>;
}
export function DayHero({name,date,summary}:{name:string;date:string;summary?:{taken:number;total:number}}){
 return <View style={{backgroundColor:'#E8F0FA',padding:24,borderRadius:28,borderWidth:1,borderColor:'#D6E3F3',gap:10,overflow:'hidden'}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:'#4B7EA9'}}/><Text style={{fontSize:16,fontWeight:'700',color:'#43658A'}}>SEU DIA, COM MAIS CUIDADO</Text></View>
  <Text style={[s.title,{fontSize:34,lineHeight:42,letterSpacing:-.7}]}>Olá, {name}</Text>
  <Text style={[s.text,{color:'#415B76'}]}>{date.charAt(0).toUpperCase()+date.slice(1)}</Text>
  <View style={{height:1,backgroundColor:'#CBDBEC',marginVertical:4}}/>
  <Text style={{fontSize:18,lineHeight:26,color:'#294D73'}}>{summary&&summary.total>0?`${summary.taken} de ${summary.total} doses confirmadas hoje`:'Seus lembretes e cuidados, em um só lugar.'}</Text>
 </View>;
}
export function MenuTile({label,subtitle,icon,onPress,warm=false,actionLabel}:{label:string;subtitle:string;icon:string;onPress:()=>void;warm?:boolean;actionLabel?:string}){
 return <Pressable accessibilityRole="button" accessibilityLabel={actionLabel||label} onPress={onPress} style={({pressed})=>({flexGrow:1,flexBasis:'45%',minWidth:150,minHeight:156,padding:20,borderRadius:24,borderWidth:1,borderColor:warm?'#E9D8B6':'#D8E4F0',backgroundColor:pressed?'#E5EEF8':warm?'#FCF6E9':'#FFF',gap:12})}>
  <View style={{width:48,height:48,borderRadius:16,backgroundColor:warm?'#F4E4C4':'#EAF1F9',alignItems:'center',justifyContent:'center'}}><AppIcon name={icon} color={warm?'#815C24':colors.blue}/></View>
  <View style={{gap:5}}><Text style={{fontSize:18,lineHeight:26,fontWeight:'700',color:colors.dark}}>{label}</Text><Text style={{fontSize:16,lineHeight:23,color:'#53677D'}}>{subtitle}</Text></View>
 </Pressable>;
}
export function MenuRow({label,subtitle,icon,onPress}:{label:string;subtitle:string;icon:string;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:16,padding:18,minHeight:90,backgroundColor:pressed?'#EAF1F9':'#FFF',borderRadius:22,borderWidth:1,borderColor:'#E0E8F1'})}>
  <View style={{width:46,height:46,borderRadius:15,backgroundColor:'#EAF1F9',alignItems:'center',justifyContent:'center'}}><AppIcon name={icon}/></View>
  <View style={{flex:1,gap:4}}><Text style={{fontSize:20,fontWeight:'700',color:colors.dark}}>{label}</Text><Text style={{fontSize:16,lineHeight:22,color:'#53677D'}}>{subtitle}</Text></View><AppIcon name="chevron" size={21}/>
 </Pressable>;
}
