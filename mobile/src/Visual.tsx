import React from 'react';
import {View,Text,Image,Pressable,Platform} from 'react-native';
import {colors,styles as s} from './ui';

const paths:Record<string,string>={
 home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
 chat:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5Z',
 microphone:'M12 2a3 3 0 0 0-3 3v7a3 3 0 1 0 6 0V5a3 3 0 0 0-3-3ZM5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8',
 send:'m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2',
 help:'M12 8v5m0 4h.01M10.3 3.8 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z',
 person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 pills:'m8 4-5 5a6 6 0 0 0 8 8l5-5a6 6 0 0 0-8-8Zm-3 3 8 8',
 calendar:'M4 5h16v16H4ZM4 10h16M8 2v6m8-6v6M8 14h2m4 0h2m-8 3h2',
 contacts:'M8 4H4v16h16v-4M12 4h8v8M20 4 10 14',
 link:'m9 15 6-6M7 14l-2 2a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6M17 10l2-2a4 4 0 0 0-6-6L9 6a4 4 0 0 0 0 6',
 check:'m5 12 4 4L19 6',
 chevron:'m9 5 7 7-7 7',
 shield:'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9m-8 12a2 2 0 0 0 4 0',
 grid:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
 heart:'M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.9 8.9 8.8-8.9a5.5 5.5 0 0 0 0-7.8Z',
 menu:'M4 6h16M4 12h16M4 18h16',
 sidebar:'M3 4h18v16H3ZM9 4v16',
 close:'M6 6l12 12M18 6 6 18',
 down:'m5 9 7 7 7-7',
 up:'m5 15 7-7 7 7',
};
export function AppIcon({name,size=26,color=colors.blue}:{name:string;size?:number;color?:string}){
 if(name==='elder'||name==='pain') return <Image accessible={false}
   source={name==='elder'?require('../assets/prototype/elder.png'):require('../assets/brand/icone-dor.png')}
   style={{width:size,height:size,tintColor:color,flexShrink:0}} resizeMode="contain"/>;
 if(Platform.OS==='web')return React.createElement('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth:1.9,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,style:{flexShrink:0}},React.createElement('path',{d:paths[name]||paths.person}));
 const fallback:Record<string,string> = {check:'✓',help:'!',chevron:'›',menu:'☰',sidebar:'☰',close:'×',down:'⌄',up:'⌃',microphone:'🎙',send:'➤'};
 return <Text style={{fontSize:size,color}}>{fallback[name]??'+'}</Text>;
}
export function BrandMark({size=48}:{size?:number}){
 return <View style={{width:size,height:size,borderRadius:Math.round(size/3),overflow:'hidden',backgroundColor:'#FFF',borderWidth:1,borderColor:'#E3EAF2'}}>
  <Image source={require('../assets/brand/logo-mark.png')} accessibilityLabel="Logo Cuidali: cuidado entre gerações" style={{width:'100%',height:'100%'}} resizeMode="contain"/>
 </View>;
}
export function BrandHeader({onProfile,name,large=false,compact=false}:{onProfile?:()=>void;name?:string;large?:boolean;compact?:boolean}){
 return <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:large?14:8,marginBottom:large?8:0}}>
  <BrandMark size={large?72:compact?38:48}/>
  <View style={{flex:1}}><Text style={{fontSize:large?32:24,fontWeight:'800',color:colors.dark,letterSpacing:-.8}}>Cuidali</Text>{!compact&&<Text style={{fontSize:15,color:'#4D6079',lineHeight:22}}>Cuidar é estar por perto.</Text>}</View>
  {onProfile&&<Pressable accessibilityRole="button" accessibilityLabel="Abrir meus dados" onPress={onProfile} style={{width:48,height:48,borderRadius:24,backgroundColor:'#DFEAF6',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#C5D8ED'}}><Text style={{fontSize:20,fontWeight:'700',color:colors.blue}}>{(name||'C').slice(0,1).toUpperCase()}</Text></Pressable>}
 </View>;
}
export function AuthBrandPanel(){
  return (
    <View style={{width:'43%',minHeight:530,backgroundColor:'#123449',borderRadius:28,
      padding:32,justifyContent:'center',gap:24,overflow:'hidden'}}>
      <View pointerEvents="none" style={{position:'absolute',top:-70,right:-155,
        width:500,height:500,borderRadius:250,borderWidth:70,borderColor:'#FFFFFF0C'}}/>
      <View style={{width:92,height:92,backgroundColor:'#FFF',borderRadius:25,overflow:'hidden'}}>
        <Image source={require('../assets/brand/logo-mark.png')} accessibilityLabel="Logo Cuidali: cuidado entre gerações"
          style={{width:'100%',height:'100%'}} resizeMode="contain"/>
      </View>
      <View style={{gap:8}}>
        <Text style={{color:'#ACD5FF',fontSize:22,fontWeight:'800'}}>Cuidali</Text>
        <Text style={{color:'#FFF',fontSize:42,lineHeight:48,fontWeight:'800',letterSpacing:-1.2}}>
          Cuidar é estar por perto.
        </Text>
        <Text style={{color:'#D6E8FA',fontSize:18,lineHeight:27}}>
          Organize medicamentos e consultas e compartilhe a rotina com pessoas de confiança.
        </Text>
      </View>
    </View>
  );
}
export function DayHero({name,date,summary,elderName,wide}:{
  name:string;
  date:string;
  summary?:{taken:number;total:number};
  elderName?:string;
  wide:boolean;
}){
  const progress = summary?.total ? Math.round(summary.taken * 100 / summary.total) : 0;
  return (
    <View style={{
      backgroundColor:'#123449', padding:wide?24:18, borderRadius:21, gap:16,
      flexDirection:wide?'row':'column', alignItems:wide?'center':'stretch', overflow:'hidden',
    }}>
      <View pointerEvents="none" style={{
        position:'absolute', right:-90, top:-150, width:420, height:420, borderRadius:210,
        borderWidth:52, borderColor:'#FFFFFF0C',
      }}/>
      <View style={{flex:wide?1:undefined, minWidth:0,gap:8}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
          <AppIcon name="calendar" size={19} color="#A9D5FC"/>
          <Text style={[s.muted,{color:'#D6E8FA',flexShrink:1}]}>
            {date.charAt(0).toUpperCase()+date.slice(1)}
          </Text>
        </View>
        <Text accessibilityRole="header" style={[s.title,{fontSize:wide?42:34,lineHeight:wide?50:42,color:'#FFF'}]}>
          Olá, {name}
        </Text>
        {elderName && <Text style={[s.text,{color:'#D6E8FA'}]}>Acompanhando {elderName}</Text>}
      </View>
      {summary && (
        <View style={{width:wide?252:'100%',padding:13,borderRadius:14,backgroundColor:'#0B293C',gap:7}}>
          <Text style={{color:'#FFF',fontSize:18,fontWeight:'700',lineHeight:24}}>Medicação de hoje</Text>
          {!!summary.total && (
            <View accessible accessibilityRole="progressbar" accessibilityLabel="Doses confirmadas"
              aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.taken}
              accessibilityValue={{min:0,max:summary.total,now:summary.taken}}
              style={{height:9,borderRadius:5,backgroundColor:'#3E6083',overflow:'hidden'}}>
              <View style={{width:`${progress}%`,height:'100%',backgroundColor:'#7FE0CA'}}/>
            </View>
          )}
          <Text style={[s.muted,{color:'#D6E8FA'}]}>
            {summary.total ? `${summary.taken} de ${summary.total} doses confirmadas hoje` : 'Nenhuma dose programada'}
          </Text>
        </View>
      )}
    </View>
  );
}
export function MenuTile({label,subtitle,icon,onPress,warm=false,actionLabel}:{label:string;subtitle:string;icon:string;onPress:()=>void;warm?:boolean;actionLabel?:string}){
 return <Pressable accessibilityRole="button" accessibilityLabel={actionLabel||label} onPress={onPress} style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>({flexGrow:1,flexBasis:144,minWidth:0,minHeight:126,padding:16,borderRadius:18,borderWidth:1,borderColor:warm?'#E9D8B6':'#D8E4F0',backgroundColor:pressed||hovered?(warm?'#FFF0D1':'#E5EEF8'):warm?'#FFF9ED':'#FFF',gap:10})}>
  <View style={{width:48,height:48,borderRadius:16,backgroundColor:warm?'#F4E4C4':'#EAF1F9',alignItems:'center',justifyContent:'center'}}><AppIcon name={icon} color={warm?'#815C24':colors.blue}/></View>
  <View style={{gap:4}}><Text style={{fontSize:18,lineHeight:25,fontWeight:'700',color:colors.dark}}>{label}</Text><Text style={s.muted}>{subtitle}</Text></View>
 </Pressable>;
}
export function MenuRow({label,subtitle,icon,onPress,busy=false}:{label:string;subtitle:string;icon:string;onPress:()=>void;busy?:boolean}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{busy,disabled:busy}}
   disabled={busy} onPress={onPress} style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>({flexDirection:'row',alignItems:'center',gap:12,padding:16,minHeight:78,backgroundColor:pressed||hovered?'#EAF1F9':'#FFF',borderRadius:18,borderWidth:1,borderColor:'#DCE5F1'})}>
  <View style={{width:46,height:46,borderRadius:15,backgroundColor:'#EAF1F9',alignItems:'center',justifyContent:'center'}}><AppIcon name={icon}/></View>
  <View style={{flex:1,gap:4}}><Text style={{fontSize:20,fontWeight:'700',color:colors.dark}}>{label}</Text><Text style={{fontSize:16,lineHeight:22,color:'#53677D'}}>{subtitle}</Text></View><AppIcon name="chevron" size={21}/>
 </Pressable>;
}
