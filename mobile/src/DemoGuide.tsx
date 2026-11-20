import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { GuidedStep } from "./demo";
import { Button, colors, styles as shared } from "./ui";

const steps: Record<GuidedStep,{number:number;title:string;description:string}> = {
  dose:{number:1,title:"Confirme uma dose",description:"Na rotina de Maria, toque em Já tomei no cartão do remédio sem confirmação."},
  request:{number:2,title:"Registre um pedido de ajuda",description:"Abra o SOS e confirme o envio de um pedido de exemplo."},
  "switch-caregiver":{number:2,title:"O pedido foi registrado",description:"Troque para o perfil de Ana pra ver o pedido na aba Alertas."},
  accept:{number:3,title:"Assuma o acompanhamento",description:"Em Alertas, toque em Vou acompanhar no pedido de Maria."},
  "switch-elder":{number:3,title:"Ana assumiu o pedido",description:"Volte ao perfil de Maria pra ver a resposta."},
  done:{number:4,title:"Maria já consegue ver a resposta",description:"Abaixo aparece quem assumiu o pedido. Você pode explorar o app ou recomeçar a história."},
};

export function DemoGuide({step,screen,onNavigate,onFindDose,onSwitch,onRestart}:{
  step:GuidedStep;
  screen:string;
  onNavigate:(screen:string)=>void;
  onFindDose:()=>void;
  onSwitch:()=>void;
  onRestart:()=>void;
}) {
  const current=steps[step];
  return (
    <View style={styles.panel}>
      <View style={styles.progress} accessibilityLabel={"Etapa "+current.number+" de 4"}>
        {[1,2,3,4].map(number=><View key={number} style={[styles.segment,
          number<=current.number&&styles.segmentFilled]}/>)}
      </View>
      <Text style={styles.step}>Demonstração guiada · {current.number} de 4</Text>
      <Text accessibilityRole="header" aria-live="polite" style={shared.subtitle}>{current.title}</Text>
      <Text style={shared.muted}>{step==="accept"&&screen!=="Alertas"
        ?"Confira a dose no painel de Ana e abra Alertas pra assumir o pedido." : current.description}</Text>
      {step==="dose" && screen!=="Início" && <Button label="Abrir rotina de Maria" onPress={()=>onNavigate("Início")}/>}
      {step==="dose" && screen==="Início" && <Button label="Ir para a dose" onPress={onFindDose}/>}
      {step==="request" && screen!=="SOS" && <Button label="Abrir SOS de exemplo" onPress={()=>onNavigate("SOS")}/>}
      {step==="switch-caregiver" && <Button label="Ver como Ana" onPress={onSwitch}/>}
      {step==="accept" && screen!=="Alertas" && <Button label="Ver alertas da demonstração" onPress={()=>onNavigate("Alertas")}/>}
      {step==="switch-elder" && <Button label="Voltar para Maria" onPress={onSwitch}/>}
      {step==="done" && screen!=="SOS" && <Button label="Ver a resposta do pedido" onPress={()=>onNavigate("SOS")}/>}
      {step==="done" && screen==="SOS" && <Button label="Recomeçar demonstração" tone="light" onPress={onRestart}/>}
    </View>
  );
}

const styles=StyleSheet.create({
  panel:{borderWidth:1,borderColor:"#C8E2D9",backgroundColor:"#F4FBF8",borderRadius:16,padding:14,gap:6},
  step:{fontSize:15,lineHeight:21,fontWeight:"700",color:colors.green},
  progress:{flexDirection:"row",gap:5,marginBottom:3},
  segment:{flex:1,height:4,borderRadius:2,backgroundColor:"#D7E8E2"},
  segmentFilled:{backgroundColor:"#207E6C"},
});
