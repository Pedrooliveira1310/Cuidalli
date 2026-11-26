import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BrandHeader } from "./Visual";
import { Button, colors, styles as shared } from "./ui";

export function Welcome({wide,onDemo,onLogin,onRegister}:{
  wide:boolean;
  onDemo:(role:"elder"|"caregiver")=>void;
  onLogin:()=>void;
  onRegister:()=>void;
}) {
  return (
    <View style={[styles.welcome,wide&&styles.welcomeWide]}>
      <View style={styles.header}><BrandHeader compact/></View>
      <View style={[styles.hero,wide&&styles.heroWide]}>
        <View style={styles.copy}>
          <Text accessibilityRole="header" aria-level={1} style={[styles.headline,wide&&styles.headlineWide]}>
            Cuidar de perto, mesmo à distância.
          </Text>
          <Text style={styles.lead}>
            A pessoa idosa organiza seus remédios e consultas. Quem ela autoriza acompanha a rotina e os pedidos de ajuda.
          </Text>
          <Text accessibilityRole="header" style={shared.subtitle}>Demonstração</Text>
          <View style={styles.actions}>
            <Button label="Pessoa idosa" onPress={()=>onDemo("elder")} />
            <Button label="Cuidador" tone="light" onPress={()=>onDemo("caregiver")} />
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Já tenho conta · Entrar"
              style={styles.link} onPress={onLogin}><Text style={styles.linkText}>Entrar</Text></Pressable>
            <Pressable accessibilityRole="button"
              style={styles.link} onPress={onRegister}><Text style={styles.linkText}>Criar conta</Text></Pressable>
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
        <Benefit title="Minha rotina" description="Horários de remédios, consultas e registros em um lugar só."/>
        <Benefit title="Cuidado compartilhado" description="O cuidador acompanha as informações que a pessoa idosa autoriza."/>
        <Benefit title="Pedido de ajuda" description="A pessoa idosa pede ajuda e acompanha a resposta do cuidador."/>
      </View>
    </View>
  );
}

function Benefit({title,description}:{title:string;description:string}) {
  return <View style={styles.benefit}>
    <Text style={styles.benefitTitle}>{title}</Text>
    <Text style={shared.muted}>{description}</Text>
  </View>;
}

const styles=StyleSheet.create({
  welcome:{gap:16},
  welcomeWide:{gap:20},
  header:{alignSelf:"stretch",maxWidth:300},
  hero:{
    backgroundColor:"#F8FBF9",borderWidth:1,borderColor:"#D4E4DF",
    borderRadius:24,padding:18,gap:20,overflow:"hidden",
  },
  heroWide:{flexDirection:"row",alignItems:"center",padding:28,gap:32},
  copy:{flex:1,minWidth:0,gap:14,alignItems:"flex-start"},
  headline:{fontSize:37,lineHeight:41,fontWeight:"800",letterSpacing:-1.6,color:colors.dark},
  headlineWide:{fontSize:53,lineHeight:57,letterSpacing:-2.4},
  lead:{fontSize:18,lineHeight:27,color:"#345066",maxWidth:495},
  actions:{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:9},
  link:{minHeight:48,justifyContent:"center",paddingHorizontal:9},
  linkText:{fontSize:17,fontWeight:"700",color:colors.blue,textDecorationLine:"underline"},
  photo:{width:"100%",height:215,borderRadius:16,backgroundColor:"#DDE9E4"},
  photoWide:{width:"46%",height:345,borderRadius:18},
  features:{gap:8},
  featuresWide:{flexDirection:"row",alignItems:"stretch",gap:12},
  benefit:{flex:1,minWidth:0,padding:16,borderWidth:1,borderColor:"#D9E5EB",backgroundColor:"#FFF",borderRadius:14,gap:4},
  benefitTitle:{fontSize:19,lineHeight:24,fontWeight:"800",color:colors.dark},
});
