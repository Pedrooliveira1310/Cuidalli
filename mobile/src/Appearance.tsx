import React,{createContext, forwardRef, useContext, useEffect, useState} from "react";
import * as SecureStore from "expo-secure-store";
import {
  Platform, StyleSheet, Text as NativeText, TextInput as NativeTextInput, View as NativeView,
  Pressable as NativePressable, useColorScheme,
  type TextStyle, type ViewStyle,
} from "react-native";

export type Preferences={
  size:"normal"|"large"|"largest";
  theme:"light"|"dark"|"auto";
  contrast:boolean;
  bold:boolean;
  targets:boolean;
};
export const defaults:Preferences={size:"normal",theme:"light",contrast:false,bold:false,targets:false};
const storageKey="cuidali.acessibilidade.v1";
const scale={normal:1,large:1.18,largest:1.36};
type Appearance=Preferences & {dark:boolean;factor:number};
const AppearanceContext=createContext<Appearance>({...defaults,dark:false,factor:1});
export const useAppearance=()=>useContext(AppearanceContext);

function readPreferences():Preferences {
  if(Platform.OS!=="web") return defaults;
  try {
    return parsePreferences(window.localStorage.getItem(storageKey));
  } catch { return defaults; }
}
function parsePreferences(raw:string|null):Preferences {
  try {
    const data=JSON.parse(raw??"null");
    if (!data) return defaults;
    return {
      size:data.size==="large"||data.size==="largest"?data.size:"normal",
      theme:data.theme==="dark"||data.theme==="auto"?data.theme:"light",
      contrast:data.contrast===true,bold:data.bold===true,targets:data.targets===true,
    };
  } catch { return defaults; }
}

export function usePreferences() {
  const [preferences,setPreferences]=useState(readPreferences);
  const [loaded,setLoaded]=useState(Platform.OS==="web");
  const system=useColorScheme();
  const dark=preferences.theme==="dark"||(preferences.theme==="auto"&&system==="dark");
  useEffect(()=>{
    if(Platform.OS==="web") return;
    let active=true;
    SecureStore.getItemAsync(storageKey).then(raw=>{if(active)setPreferences(parsePreferences(raw));})
      .catch(()=>{}).finally(()=>{if(active)setLoaded(true);});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(Platform.OS==="web"){
      document.documentElement.style.colorScheme=dark?"dark":"light";
      try { window.localStorage.setItem(storageKey,JSON.stringify(preferences)); } catch { /* Applies for this session. */ }
    } else if(loaded) {
      SecureStore.setItemAsync(storageKey,JSON.stringify(preferences)).catch(()=>{});
    }
  },[preferences,dark,loaded]);
  return {appearance:{...preferences,dark,factor:scale[preferences.size]},setPreferences};
}
export const AppearanceProvider=AppearanceContext.Provider;
type ColorKind="ink"|"surface"|"border"|"icon";
export function appearanceColor(color:unknown,kind:ColorKind,a:Appearance) {
  if (typeof color!=="string"||(!a.dark&&!a.contrast)) return color;
  const value=color.toLowerCase()==="white"?"#ffffff":color.toLowerCase()==="black"?"#000000":color;
  if (!/^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) return color;
  const hex=value.length===4?[...value.slice(1)].map(x=>x+x).join(""):value.slice(1);
  const [red,green,blue]=[0,2,4].map(offset=>parseInt(hex.slice(offset,offset+2),16));
  const luma=(.2126*red+.7152*green+.0722*blue)/255;
  const translucent=hex.length===8;
  if(a.contrast){
    if(translucent) return kind==="surface"?"#00000095":"transparent";
    if(kind==="border") return a.dark?"#FFFFFF":luma>.82?"#000000":luma>.5?"#FFFFFF":"#000000";
    if(kind==="surface") return a.dark?"#000000":luma>.49?"#FFFFFF":"#000000";
    return a.dark||luma>.64?"#FFFFFF":"#000000";
  }
  if(translucent) return color;
  if(kind==="border") return luma<.52?"#597487":"#456176";
  if(kind==="ink"||kind==="icon") return luma>.72?"#F6FBFF":red>green*1.22?"#FFB8B8"
    :green>red*1.5&&green>blue*.85?"#A3E7D4":"#DBECFA";
  if(luma<.32) return "#102738";
  if(red>green*1.24) return "#532B3A";
  if(red>blue*1.13&&green>blue*1.06) return "#3B3025";
  if(green>red*1.2&&green>blue*.88) return luma<.56?"#154539":"#193E38";
  if(luma<.62) return "#1F4770";
  return luma>.965?"#172B3C":"#20384D";
}

type Surface={-readonly [K in keyof (ViewStyle & TextStyle)]:(ViewStyle & TextStyle)[K]};
export function themedStyle(style:unknown,a:Appearance,kind:"text"|"view"|"control"|"input") {
  if (!a.dark&&!a.contrast&&a.factor===1&&!a.bold&&!a.targets) return style;
  const base=StyleSheet.flatten(style as Surface)??{};
  const next:Surface={...base};
  for(const key of ["backgroundColor","borderColor","borderTopColor","borderBottomColor","borderLeftColor","borderRightColor","color"] as const) {
    if(base[key]) next[key]=appearanceColor(base[key],key==="color"?"ink":key==="backgroundColor"?"surface":"border",a) as string;
  }
  if(a.contrast){
    if(kind==="input"||kind==="control"||base.borderWidth){
      next.borderWidth=Math.max(2,Number(base.borderWidth)||0);
      next.borderColor=a.dark||(typeof next.backgroundColor==="string"&&next.backgroundColor==="#000000")?"#FFFFFF":"#000000";
    }
    if(base.boxShadow) next.boxShadow="none";
  }
  if(kind==="text"||kind==="input"){
    if(a.factor!==1){
      next.fontSize=Math.round((base.fontSize??(kind==="input"?18:14))*a.factor);
      if(base.lineHeight) next.lineHeight=Math.round(base.lineHeight*a.factor);
    }
    if(a.bold) next.fontWeight=Number(base.fontWeight)>=800?base.fontWeight:"700";
    if(kind==="input"&&(a.dark||a.contrast)&&!base.color) next.color=a.dark?"#FFFFFF":"#000000";
  }
  if(a.targets&&(kind==="control"||kind==="input")&&base.position!=="absolute"){
    next.minHeight=Math.max(54,typeof base.minHeight==="number"?base.minHeight:0);
    if(typeof base.height==="number") next.height=Math.max(base.height,54);
    if(typeof base.width==="number") next.minWidth=Math.max(50,base.width);
  }
  if(a.targets&&base.flexDirection==="row"&&base.flexWrap==="wrap"&&typeof base.gap==="number") next.gap=Math.max(base.gap,12);
  return next;
}

export const Text=forwardRef<React.ComponentRef<typeof NativeText>,React.ComponentProps<typeof NativeText>>(
  ({style,...props},ref)=>{
    const a=useAppearance();
    return <NativeText ref={ref} {...props} style={themedStyle(style,a,"text") as TextStyle}/>;
  }
);
export const View=forwardRef<React.ComponentRef<typeof NativeView>,React.ComponentProps<typeof NativeView>>(
  ({style,...props},ref)=>{
    const a=useAppearance();
    return <NativeView ref={ref} {...props} style={themedStyle(style,a,"view") as ViewStyle}/>;
  }
);
export const Pressable=forwardRef<React.ComponentRef<typeof NativePressable>,React.ComponentProps<typeof NativePressable>>(
  ({style,...props},ref)=>{
    const a=useAppearance();
    const decorative=props["aria-hidden"]||props.accessible===false||props.accessibilityRole==="link";
    return <NativePressable ref={ref} {...props}
      style={state=>themedStyle(typeof style==="function"?style(state):style,a,decorative?"view":"control") as ViewStyle}/>;
  }
);
export const TextInput=forwardRef<React.ComponentRef<typeof NativeTextInput>,React.ComponentProps<typeof NativeTextInput>>(
  ({style,placeholderTextColor,...props},ref)=>{
    const a=useAppearance();
    return <NativeTextInput ref={ref} {...props} style={themedStyle(style,a,"input") as TextStyle}
      placeholderTextColor={a.contrast?(a.dark?"#FFFFFF":"#000000"):a.dark?"#ACCDDF":placeholderTextColor}/>;
  }
);
