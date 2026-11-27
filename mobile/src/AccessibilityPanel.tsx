import React,{useEffect,useRef,useState} from "react";
import {Modal, Platform, ScrollView} from "react-native";
import {Pressable, Text, View, type Preferences, useAppearance} from "./Appearance";
import {AppIcon} from "./Visual";
import {Button, colors, styles as s} from "./ui";

const sizes=[{value:"normal",label:"Normal",symbol:"A"},{value:"large",label:"Grande",symbol:"A+"},
  {value:"largest",label:"Muito grande",symbol:"A++"}] as const;
const themes=[{value:"light",label:"Claro"},{value:"dark",label:"Escuro"},{value:"auto",label:"Automático"}] as const;
const toggles=[
  {key:"contrast",label:"Alto contraste",detail:"Preto e branco com bordas mais grossas."},
  {key:"bold",label:"Texto em negrito",detail:"Aumenta o peso das letras em todas as telas."},
  {key:"targets",label:"Botões maiores",detail:"Aumenta a área de toque e a distância entre ações."},
] as const;

export function AccessibilityPanel({visible,onClose,onChange}:{
  visible:boolean;onClose:()=>void;onChange:React.Dispatch<React.SetStateAction<Preferences>>;
}) {
  const prefs=useAppearance();
  const [message,setMessage]=useState("");
  useEffect(()=>{
    if(!visible||Platform.OS!=="web") return;
    const dismiss=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!event.defaultPrevented) onClose();};
    window.addEventListener("keydown",dismiss);
    return ()=>window.removeEventListener("keydown",dismiss);
  },[visible,onClose]);
  function update<K extends keyof Preferences>(key:K,value:Preferences[K]) {
    onChange(current=>({...current,[key]:value}));
  }
  return <Modal visible={visible} transparent onRequestClose={onClose}>
    <View style={{flex:1,backgroundColor:"#12284380",padding:12,justifyContent:"center",alignItems:"center"}}>
      <View accessibilityViewIsModal style={[s.card,{width:"100%",maxWidth:590,maxHeight:"96%",minHeight:0,padding:13}]}>
        <View style={{flexDirection:"row",alignItems:"center",gap:8,justifyContent:"space-between"}}>
          <Text accessibilityRole="header" style={[s.subtitle,{flex:1}]}>Acessibilidade</Text>
          <ReadScreenButton screenId="cuidali-preferencias-leitura" onUnavailable={setMessage}/>
          <UtilityButton icon="close" label="Fechar acessibilidade" onPress={onClose}/>
        </View>
        <ScrollView nativeID="cuidali-preferencias-leitura" keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:14,paddingBottom:6}}>
          {!!message&&<Text accessibilityRole="alert" style={s.error}>{message}</Text>}
          <Text accessibilityRole="header" style={s.label}>Tamanho da letra</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Tamanho da letra" style={s.row}>
            {sizes.map(size=><PreferenceChoice key={size.value} selected={size.value===prefs.size}
              label={size.label} symbol={size.symbol} onPress={()=>update("size",size.value)}/>)}
          </View>
          <View style={{padding:12,borderRadius:12,borderWidth:1,borderColor:"#B7CDDF",backgroundColor:"#EDF5FD"}}>
            <Text style={s.text}>Prévia. Seus próximos cuidados aparecem aqui.</Text>
          </View>
          <Text accessibilityRole="header" style={s.label}>Aparência</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Aparência" style={s.row}>
            {themes.map(theme=><PreferenceChoice key={theme.value} selected={theme.value===prefs.theme}
              label={theme.label} onPress={()=>update("theme",theme.value)}/>)}
          </View>
          {toggles.map(item=><Pressable key={item.key} accessibilityRole="switch" accessibilityLabel={item.label}
            accessibilityHint={item.detail} accessibilityState={{checked:prefs[item.key]}} aria-checked={prefs[item.key]}
            onPress={()=>update(item.key,!prefs[item.key])}
            style={{minHeight:54,flexDirection:"row",alignItems:"center",gap:10,paddingVertical:5,
              borderTopColor:"#D7E3E8",borderTopWidth:1}}>
            <View style={{flex:1,minWidth:0}}><Text style={s.label}>{item.label}</Text><Text style={s.muted}>{item.detail}</Text></View>
            <View aria-hidden style={{minWidth:42,minHeight:30,alignItems:"center",justifyContent:"center",paddingHorizontal:4,
              borderWidth:2,borderColor:prefs[item.key]?colors.green:"#8298AA",borderRadius:13,
              backgroundColor:prefs[item.key]?colors.green:"#F1F5F8"}}>
              <Text style={{fontSize:15,fontWeight:"800",color:prefs[item.key]?"#FFF":colors.dark}}>{prefs[item.key]?"✓":"—"}</Text>
            </View>
          </Pressable>)}
          <Button label="Concluir" onPress={onClose}/>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function PreferenceChoice({label,symbol,selected,onPress}:{
  label:string;symbol?:string;selected:boolean;onPress:()=>void;
}) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{checked:selected}} aria-checked={selected} onPress={onPress}
    style={{flexGrow:1,minHeight:44,paddingHorizontal:10,paddingVertical:7,
      justifyContent:"center",alignItems:"center",borderWidth:selected?2:1,borderRadius:12,
      borderColor:selected?colors.blue:"#B7CDDF",backgroundColor:selected?colors.blue:"#EDF5FD"}}>
    {!!symbol&&<Text style={{color:selected?"#FFF":colors.dark,fontWeight:"800",fontSize:19}}>{symbol}</Text>}
    <Text style={{color:selected?"#FFF":colors.dark,fontWeight:"700",fontSize:14,textAlign:"center"}}>{selected?"✓ ":""}{label}</Text>
  </Pressable>;
}

export function UtilityButton({icon,label,onPress,showLabel=false}:{
  icon:string;label:string;onPress:()=>void;showLabel?:boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({pressed})=>({minWidth:44,minHeight:44,flexShrink:0,flexDirection:"row",gap:6,paddingHorizontal:9,
      alignItems:"center",justifyContent:"center",borderRadius:12,borderWidth:1,borderColor:"#C9DDEA",
      backgroundColor:pressed?"#D8E9FB":"#F0F6FC"})}>
    <AppIcon name={icon} size={22}/>
    {showLabel&&<Text style={{fontSize:15,fontWeight:"700",color:colors.blue}}>{label}</Text>}
  </Pressable>;
}

function spokenContent(id:string) {
  const root=document.getElementById(id);
  if(!root) return "";
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const parent=node.parentElement;
      if(!parent||!node.textContent?.trim()||parent.closest('[aria-hidden="true"], input, textarea'))
        return NodeFilter.FILTER_REJECT;
      if(!parent.getClientRects().length||getComputedStyle(parent).visibility==="hidden") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const fragments:string[]=[];
  while(walker.nextNode()) fragments.push(walker.currentNode.textContent!.trim());
  return fragments.join(". ");
}

export function ReadScreenButton({screenId,onUnavailable,showLabel=false}:{
  screenId:string;onUnavailable:(message:string)=>void;showLabel?:boolean;
}) {
  const [reading,setReading]=useState(false);
  const generation=useRef(0);
  useEffect(()=>()=>{generation.current++;if(Platform.OS==="web") window.speechSynthesis?.cancel();},[screenId]);
  function toggle() {
    if(Platform.OS!=="web"){
      onUnavailable("A leitura desta tela está disponível na versão web do Cuidali.");
      return;
    }
    const speech=window.speechSynthesis;
    if(reading){
      generation.current++;
      speech?.cancel();
      setReading(false);
      return;
    }
    if(!speech&&!window.CuidaliNative){
      onUnavailable("A leitura em voz alta não está disponível neste navegador.");
      return;
    }
    const text=spokenContent(screenId);
    if(!text){
      onUnavailable("Esta tela ainda não tem conteúdo para ler.");
      return;
    }
    if(window.CuidaliNative){
      window.CuidaliNative.speak(text.slice(0,3900));
      return;
    }
    speech.cancel();
    setReading(true);
    const active=++generation.current;
    const parts=text.match(/.{1,210}(?:\s|$)|.{1,210}/gu)??[];
    const say=(index:number)=>{
      if(active!==generation.current) return;
      if(index>=parts.length){setReading(false);return;}
      const utterance=new SpeechSynthesisUtterance(parts[index]);
      utterance.lang="pt-BR";utterance.rate=.89;
      utterance.onend=()=>say(index+1);
      utterance.onerror=event=>{
        if(active!==generation.current) return;
        setReading(false);
        if(event.error!=="canceled"&&event.error!=="interrupted") onUnavailable("A leitura em voz alta não pôde ser iniciada.");
      };
      speech.speak(utterance);
    };
    say(0);
  }
  return <UtilityButton icon={reading?"stop":"speaker"} label={reading?"Parar leitura":"Ler tela em voz alta"}
    onPress={toggle} showLabel={showLabel}/>;
}
