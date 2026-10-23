import { Linking } from "react-native";
/** Opening a dialer cannot establish that a call was placed or answered. */
export async function openDialer(phone: string): Promise<string> {
  try {
    await Linking.openURL(`tel:${phone}`);
    return "Solicitamos a abertura do discador. Não há confirmação de ligação ou de recebimento.";
  } catch {
    return "Este dispositivo não conseguiu abrir o discador. Use o número exibido.";
  }
}
