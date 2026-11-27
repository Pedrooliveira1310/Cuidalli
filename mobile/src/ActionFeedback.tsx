import {Pressable, Text, View} from "./Appearance";
import {createContext} from "react";
import { StyleSheet} from "react-native";
import {AppIcon} from "./Visual";

export type Feedback = {message:string; error:boolean};
export const ActionFeedback = createContext<(message:string, error?:boolean)=>void>(()=>{});

export function FeedbackNotice({feedback,onDismiss}:{feedback:Feedback;onDismiss?:()=>void}) {
  const ink=feedback.error?"#8F252D":"#164F3F";
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice,{
    backgroundColor:feedback.error?"#FFF0F0":"#E7F6EE", borderColor:ink,
  }]}>
    <AppIcon name={feedback.error?"help":"check"} size={20} color={ink}/>
    <Text style={[styles.message,{color:ink}]}>{feedback.message}</Text>
    {onDismiss&&<Pressable accessibilityRole="button" accessibilityLabel="Fechar confirmação"
      onPress={onDismiss} style={styles.dismiss}>
      <AppIcon name="close" size={19} color={ink}/>
    </Pressable>}
  </View>;
}

const styles=StyleSheet.create({
  notice:{flexDirection:"row",alignItems:"center",gap:8,borderWidth:1,borderRadius:12,paddingLeft:10,paddingRight:5,minHeight:48},
  message:{flex:1,fontSize:16,lineHeight:21,fontWeight:"700",paddingVertical:8},
  dismiss:{width:44,minHeight:44,alignItems:"center",justifyContent:"center"},
});
