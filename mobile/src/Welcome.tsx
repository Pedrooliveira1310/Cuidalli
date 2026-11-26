import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon, BrandHeader } from "./Visual";
import { colors, styles as shared } from "./ui";

export function Welcome({wide,onDemo,onLogin,onRegister}:{
  wide:boolean;
  onDemo:(role:"elder"|"caregiver")=>void;
  onLogin:()=>void;
  onRegister:()=>void;
}) {
  return (
    <View style={[styles.welcome,wide&&styles.welcomeWide]}>
      <View style={styles.header}>
        <View style={styles.brand}><BrandHeader compact/></View>
        <View style={styles.accountActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Já tenho conta · Entrar"
            style={({pressed,hovered}: {pressed:boolean;hovered?:boolean})=>[styles.accountButton,(pressed||hovered)&&styles.accountHover]}
            onPress={onLogin}><Text style={styles.loginText}>Entrar</Text></Pressable>
          <Pressable accessibilityRole="button"
            style={({pressed,hovered}: {pressed:boolean;hovered?:boolean})=>[styles.accountButton,styles.registerButton,(pressed||hovered)&&styles.registerHover]}
            onPress={onRegister}><Text style={styles.registerText}>Criar conta</Text></Pressable>
        </View>
      </View>
      <View style={[styles.hero,wide&&styles.heroWide]}>
        <View style={styles.copy}>
          <Text accessibilityRole="header" aria-level={1} style={[styles.headline,wide&&styles.headlineWide]}>
            Cuidar de perto, mesmo à distância.
          </Text>
          <Text style={styles.lead}>
            A pessoa idosa organiza seus remédios e consultas. Quem ela autoriza acompanha a rotina e os pedidos de ajuda.
          </Text>
          <View style={styles.demo}>
            <Text accessibilityRole="header" style={styles.demoTitle}>Experimente a demonstração</Text>
            <View style={styles.actions}>
              <DemoButton label="Pessoa idosa" icon="elder" onPress={()=>onDemo("elder")} />
              <DemoButton label="Cuidador" icon="shield" onPress={()=>onDemo("caregiver")} />
            </View>
          </View>
        </View>
        <Image
          source={require("../assets/brand/cuidado-em-familia.jpg")}
          accessibilityLabel="Pessoa idosa usando o celular ao lado da filha"
          style={[styles.photo,wide&&styles.photoWide]}
          resizeMode="cover"
        />
      </View>
      <View style={[styles.features,wide&&styles.featuresWide]}>
        <Benefit icon="calendar" title="Rotina de cuidados" description="Veja os horários de remédios e consultas."/>
        <Benefit icon="link" title="Acompanhamento com autorização" description="Escolha quem pode acompanhar sua rotina."/>
        <Benefit icon="help" title="Pedido de ajuda" description="Avise seus cuidadores e acompanhe a resposta."/>
      </View>
    </View>
  );
}

function DemoButton({label,icon,onPress}:{label:string;icon:string;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({pressed,hovered}: {pressed:boolean;hovered?:boolean})=>[styles.demoButton,(pressed||hovered)&&styles.demoHover]}>
    <AppIcon name={icon} size={22} color="#15584D"/>
    <Text style={styles.demoButtonText}>{label}</Text>
  </Pressable>;
}

function Benefit({icon,title,description}:{icon:string;title:string;description:string}) {
  return <View style={styles.benefit}>
    <View style={styles.benefitIcon}><AppIcon name={icon} size={22} color={colors.green}/></View>
    <View style={styles.benefitCopy}>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={shared.muted}>{description}</Text>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  welcome:{gap:14},
  welcomeWide:{gap:22},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  brand:{flexShrink:1,minWidth:0},
  accountActions:{flexDirection:"row",gap:4,flexShrink:0},
  accountButton:{minHeight:44,justifyContent:"center",paddingHorizontal:10,borderRadius:12},
  accountHover:{backgroundColor:"#DDECEE"},
  loginText:{fontSize:15,fontWeight:"700",color:colors.dark},
  registerButton:{borderWidth:1,borderColor:"#C8DAD7",backgroundColor:"#FFF"},
  registerHover:{backgroundColor:"#E7F4EF"},
  registerText:{fontSize:15,fontWeight:"700",color:colors.green},
  hero:{
    backgroundColor:"#123449",borderRadius:26,padding:20,gap:24,overflow:"hidden",
  },
  heroWide:{flexDirection:"row",alignItems:"center",padding:24,gap:32},
  copy:{flex:1,minWidth:0,gap:15,paddingVertical:6},
  headline:{fontSize:36,lineHeight:40,fontWeight:"800",letterSpacing:-1.3,color:"#FFF"},
  headlineWide:{fontSize:55,lineHeight:58,letterSpacing:-2.4},
  lead:{fontSize:17,lineHeight:25,color:"#DCEAED",maxWidth:470},
  demo:{gap:9,marginTop:6},
  demoTitle:{fontSize:16,lineHeight:22,color:"#C6E8DC",fontWeight:"700"},
  actions:{flexDirection:"row",flexWrap:"wrap",gap:8},
  demoButton:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,minHeight:48,
    paddingHorizontal:12,borderRadius:12,backgroundColor:"#E8F6EE",borderWidth:1,borderColor:"#99C6B5"},
  demoHover:{backgroundColor:"#CFEDE1"},
  demoButtonText:{fontSize:16,fontWeight:"700",color:"#123449"},
  photo:{width:"100%",height:200,borderRadius:15,backgroundColor:"#DDE9E4"},
  photoWide:{width:"47%",height:365,borderRadius:19},
  features:{gap:8},
  featuresWide:{flexDirection:"row",alignItems:"stretch",gap:12},
  benefit:{flex:1,minWidth:0,padding:14,flexDirection:"row",alignItems:"flex-start",gap:11,
    borderWidth:1,borderColor:"#D7E3E2",backgroundColor:"#FFF",borderRadius:16},
  benefitIcon:{width:38,height:38,borderRadius:12,backgroundColor:"#E8F4EF",alignItems:"center",justifyContent:"center"},
  benefitCopy:{flex:1,minWidth:0,gap:3},
  benefitTitle:{fontSize:17,lineHeight:22,fontWeight:"700",color:colors.dark},
});
