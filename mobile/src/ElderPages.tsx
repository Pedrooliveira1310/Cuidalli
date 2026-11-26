import React, {createContext, useContext, useEffect, useState} from "react";
import {Pressable, Text, View} from "react-native";

export const ElderLayout = createContext(false);
export const ElderViewport = createContext(0);

export function ElderPages({children, label = "Página", jump}: {children: React.ReactNode; label?: string; jump?: {index:number}}) {
  const compact = useContext(ElderLayout);
  const [selected, setSelected] = useState(0);
  useEffect(() => { if (jump) setSelected(jump.index); }, [jump]);
  const pages = React.Children.toArray(children);
  const index = Math.min(selected, Math.max(0, pages.length - 1));
  if (!compact || pages.length < 2) return <>{children}</>;
  return <View style={{gap: 8}}>
    <View style={{gap: 8}}>{pages[index]}</View>
    <View style={{flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4}}>
      <PageButton label="Anterior" disabled={index === 0} onPress={() => setSelected(index - 1)} />
      <Text accessibilityLiveRegion="polite" style={{color: "#35475F", fontSize: 15}}>{label} {index + 1} de {pages.length}</Text>
      <PageButton label="Próximo" disabled={index === pages.length - 1} onPress={() => setSelected(index + 1)} />
    </View>
  </View>;
}

function PageButton({label, disabled, onPress}: {label: string; disabled: boolean; onPress: () => void}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={{minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 10,
      backgroundColor: "#E8F1FD", opacity: disabled ? 0.42 : 1}}>
    <Text style={{fontSize: 16, fontWeight: "700", color: "#225BA5"}}>{label}</Text>
  </Pressable>;
}

