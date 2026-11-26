import React, { useEffect, useId, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon, BrandMark } from "./Visual";
import { colors } from "./ui";

type Entry = { screen: string; label: string; icon: string };
type NavigationProps = {
  caregiver: boolean;
  screen: string;
  onNavigate: (screen: string) => void;
};
type SidebarProps = NavigationProps & {
  name: string;
  collapsed?: boolean;
  drawer?: boolean;
  onToggle: () => void;
};

const routine: Entry[] = [
  { screen: "Medicamentos", label: "Medicamentos", icon: "pills" },
  { screen: "Consultas", label: "Consultas", icon: "calendar" },
  { screen: "Dores", label: "Dores", icon: "pain" },
  { screen: "Contatos", label: "Contatos", icon: "contacts" },
];
const account: Entry[] = [
  { screen: "Vínculos", label: "Vínculos", icon: "link" },
  { screen: "Meus dados", label: "Meus dados", icon: "person" },
];
const careScreens = [...routine, ...account].map(item => item.screen);
const navy = "#123449";
const pale = "#D0E3F8";
const accent = "#8CE1D1";

function primary(caregiver: boolean): Entry[] {
  return [
    { screen: "Início", label: "Início", icon: "home" },
    { screen: "Assistente", label: "Assistente", icon: "chat" },
    caregiver ? { screen: "Alertas", label: "Alertas", icon: "bell" } : { screen: "SOS", label: "SOS", icon: "help" },
    { screen: "Cuidados", label: caregiver ? "Cuidados" : "Idoso", icon: caregiver ? "grid" : "elder" },
  ];
}
function isSelected(item: Entry, screen: string) {
  return item.screen === screen || (item.screen === "Cuidados" && careScreens.includes(screen));
}

export function MenuToggle({label,icon,expanded,controls,dark,onPress}:{
  label: string;
  icon: string;
  expanded?: boolean;
  controls?: string;
  dark?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{expanded}} aria-expanded={expanded} aria-controls={controls}
      onPress={onPress}
      style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>[
        styles.toggle,
        {backgroundColor: dark ? (pressed||hovered ? "#36628F" : "#254C74") : (pressed||hovered ? "#D9E9FC" : colors.light)},
      ]}>
      <AppIcon name={icon} size={23} color={dark?"#FFF":colors.blue}/>
    </Pressable>
  );
}

function SidebarItem({item,selected,collapsed,shortcut,onPress}:{
  item: Entry;
  selected: boolean;
  collapsed?: boolean;
  shortcut?: boolean;
  onPress: () => void;
}) {
  const emergency = item.screen === "SOS";
  return (
    <Pressable accessibilityRole={shortcut ? "button" : "tab"}
      accessibilityLabel={shortcut ? "Ir para "+item.label : item.label}
      accessibilityState={shortcut ? undefined : {selected}}
      aria-selected={shortcut ? undefined : selected}
      aria-current={shortcut && selected ? "page" : undefined}
      onPress={onPress}
      style={({pressed,hovered}:{pressed:boolean;hovered?:boolean})=>[
        styles.sideItem, collapsed && styles.sideIcon,
        {backgroundColor: emergency
          ? (selected||pressed||hovered ? "#853C4A" : "#692D3C")
          : (selected||pressed||hovered ? "#254F78" : "transparent")},
      ]}>
      {selected && <View pointerEvents="none" style={[styles.selectedMark, emergency && {backgroundColor:"#FFC0C0"}]}/>}
      <AppIcon name={item.icon} size={shortcut?20:23} color={emergency?"#FFDADA":selected?accent:pale}/>
      {!collapsed && <Text style={[
        styles.sideLabel,
        (selected||emergency) && {color:"#FFF",fontWeight:"700"},
      ]}>{item.label}</Text>}
    </Pressable>
  );
}

function ShortcutGroup({title,items,screen,onNavigate,expanded,onToggle}:{
  title: string; items: Entry[]; screen: string; expanded: boolean;
  onNavigate: (screen: string) => void; onToggle: () => void;
}) {
  const id = useId();
  return (
    <View style={styles.group}>
      <Pressable accessibilityRole="button" accessibilityLabel={title}
        accessibilityState={{expanded}} aria-expanded={expanded} aria-controls={id}
        onPress={onToggle}
        style={({pressed})=>[styles.groupToggle,pressed&&{backgroundColor:"#254F78"}]}>
        <Text style={styles.groupTitle}>{title}</Text>
        <AppIcon name={expanded?"up":"down"} size={17} color={pale}/>
      </Pressable>
      {expanded && <View nativeID={id} style={styles.groupItems}>
        {items.map(item=><SidebarItem key={item.screen} item={item} selected={screen===item.screen}
          shortcut onPress={()=>onNavigate(item.screen)}/>)}
      </View>}
    </View>
  );
}

export function CareSidebar({name,caregiver,screen,onNavigate,collapsed=false,drawer=false,onToggle}:SidebarProps) {
  const toggleLabel = drawer ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu";
  const [routineOpen,setRoutineOpen] = useState(true);
  const [accountOpen,setAccountOpen] = useState(()=>account.some(item=>item.screen===screen));
  return (
    <View style={[styles.sidebar,drawer?styles.drawer:collapsed?styles.sidebarCompact:styles.sidebarWide]}>
      <View style={[styles.sideHeader,collapsed&&{justifyContent:"center"}]}>
        {!collapsed && <View style={styles.sideBrand}>
          <BrandMark size={39}/>
          <Text style={styles.sideBrandName}>Cuidali</Text>
        </View>}
        <MenuToggle label={toggleLabel} icon={drawer?"close":"sidebar"} dark
          expanded={drawer ? undefined : !collapsed}
          controls={drawer ? undefined : "cuidali-menu-items"} onPress={onToggle}/>
      </View>
      <ScrollView style={styles.sideScroll}
        contentContainerStyle={styles.sideScrollContent} keyboardShouldPersistTaps="handled">
        <View nativeID="cuidali-menu-items" accessibilityRole="tablist" accessibilityLabel="Navegação principal" style={styles.sideLinks}>
          {primary(caregiver).map(item=><SidebarItem key={item.screen} item={item}
            selected={isSelected(item,screen)} collapsed={collapsed} onPress={()=>onNavigate(item.screen)}/>)}
        </View>
        {!collapsed && <>
          <ShortcutGroup title="Rotina de cuidados" items={routine} screen={screen} onNavigate={onNavigate}
            expanded={routineOpen} onToggle={()=>setRoutineOpen(value=>!value)}/>
          <ShortcutGroup title="Minha conta" items={account} screen={screen} onNavigate={onNavigate}
            expanded={accountOpen} onToggle={()=>setAccountOpen(value=>!value)}/>
        </>}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir meus dados"
        onPress={()=>onNavigate("Meus dados")}
        style={({pressed})=>[styles.profile,collapsed&&styles.sideIcon,pressed&&{backgroundColor:"#365F89"}]}>
        <View style={styles.avatar}><Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text></View>
        {!collapsed && <View style={styles.profileText}>
          <Text numberOfLines={1} style={styles.profileName}>{name}</Text>
          <Text style={styles.profileRole}>{caregiver?"Cuidador":"Pessoa idosa"}</Text>
        </View>}
      </Pressable>
    </View>
  );
}

export function CareDrawer({visible,onToggle,...props}:SidebarProps & {visible:boolean}) {
  const reduceMotion = Platform.OS==="web" && typeof window.matchMedia==="function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(()=>{
    if (Platform.OS!=="web" || !visible) return;
    const dismiss=(event:KeyboardEvent)=>{
      if (event.key!=="Escape") return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener("keydown",dismiss);
    return ()=>window.removeEventListener("keydown",dismiss);
  },[onToggle,visible]);
  return (
    <Modal visible={visible} transparent animationType={reduceMotion?"none":"fade"} onRequestClose={onToggle}>
      <View style={styles.overlay}>
        <Pressable accessible={false} focusable={false} aria-hidden style={styles.backdrop} onPress={onToggle}/>
        <SafeAreaView nativeID="cuidali-mobile-menu" accessibilityViewIsModal style={styles.drawerArea}>
          <CareSidebar {...props} drawer onToggle={onToggle}/>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function CareTabs({caregiver,screen,onNavigate}:NavigationProps) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel="Navegação principal" style={styles.dock}>
      {primary(caregiver).map(item=>{
        const selected=isSelected(item,screen);
        const emergency=item.screen==="SOS";
        const ink=emergency?colors.red:selected?colors.blue:colors.dark;
        return (
          <Pressable key={item.screen} accessibilityRole="tab" accessibilityLabel={item.label}
            accessibilityState={{selected}} aria-selected={selected} onPress={()=>onNavigate(item.screen)}
            style={({pressed})=>[
              styles.dockItem,
              {backgroundColor:emergency?(selected||pressed?"#FDE5E7":"#FFF5F5"):selected||pressed?colors.light:"transparent"},
            ]}>
            <AppIcon name={item.icon} size={23} color={ink}/>
            <Text style={{fontSize:14,color:ink,fontWeight:selected||emergency?"700":"500"}}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles=StyleSheet.create({
  toggle:{width:48,height:48,borderRadius:13,alignItems:"center",justifyContent:"center",flexShrink:0},
  sidebar:{backgroundColor:navy,padding:12,gap:14,minHeight:0},
  sidebarWide:{width:248},
  sidebarCompact:{width:74},
  drawer:{flex:1},
  drawerArea:{width:"86%",maxWidth:340,backgroundColor:navy},
  sideHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  sideBrand:{flexDirection:"row",alignItems:"center",gap:9,minWidth:0},
  sideBrandName:{fontSize:23,letterSpacing:-.5,color:"#FFF",fontWeight:"800"},
  sideScroll:{flex:1,minHeight:0},
  sideScrollContent:{paddingBottom:12,gap:12},
  sideLinks:{gap:5},
  sideItem:{minHeight:49,overflow:"hidden",flexDirection:"row",alignItems:"center",gap:11,paddingHorizontal:12,borderRadius:11},
  sideIcon:{justifyContent:"center",paddingHorizontal:0},
  sideLabel:{flexShrink:1,color:pale,fontSize:17,lineHeight:22,fontWeight:"600"},
  selectedMark:{position:"absolute",left:0,top:10,bottom:10,width:3,borderRadius:3,backgroundColor:accent},
  group:{borderTopWidth:1,borderColor:"#325575",paddingTop:5},
  groupToggle:{minHeight:46,flexDirection:"row",alignItems:"center",paddingHorizontal:11,justifyContent:"space-between",gap:6,borderRadius:10},
  groupTitle:{color:pale,fontSize:15,fontWeight:"700",flexShrink:1},
  groupItems:{paddingLeft:4,gap:2},
  profile:{minHeight:54,flexDirection:"row",alignItems:"center",gap:9,paddingHorizontal:8,borderRadius:12,backgroundColor:"#254C74"},
  avatar:{width:36,height:36,borderRadius:18,alignItems:"center",justifyContent:"center",backgroundColor:"#E8F1FC"},
  avatarInitial:{color:navy,fontSize:17,fontWeight:"800"},
  profileText:{flex:1,minWidth:0,gap:2},
  profileName:{color:"#FFF",fontSize:15,fontWeight:"700"},
  profileRole:{color:pale,fontSize:13},
  overlay:{flex:1,flexDirection:"row"},
  backdrop:{position:"absolute",top:0,right:0,bottom:0,left:0,backgroundColor:"#071B33A8"},
  dock:{flexDirection:"row",gap:4,padding:5,backgroundColor:"#FFF",borderTopWidth:1,borderColor:"#D7E3E8"},
  dockItem:{flex:1,minWidth:0,minHeight:56,alignItems:"center",justifyContent:"center",gap:4,paddingHorizontal:2,borderRadius:14},
});
