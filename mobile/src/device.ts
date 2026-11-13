import { Platform } from 'react-native';
declare global { interface Window { CuidaliNative?: { speak(text:string):void; openDialer(phone:string):void; listen():void; configureSession(token:string):void; restoreSession():string; setMonitoring(enabled:boolean):void; openCalendar(title:string,location:string,start:string):void }; webkitSpeechRecognition?: any; SpeechRecognition?: any; } }
export function speak(text:string) {
  if(Platform.OS!=='web') return;
  if(window.CuidaliNative) { window.CuidaliNative.speak(text); return; }
  if(window.speechSynthesis) { speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='pt-BR'; u.rate=.9; speechSynthesis.speak(u); }
}
export function listen(onText:(text:string)=>void,onError:(text:string)=>void):()=>void {
  if(Platform.OS!=='web') {onError('Use o campo de texto neste dispositivo.');return ()=>{};}
  if(window.CuidaliNative) {
    const handler=(e:Event)=>onText((e as CustomEvent).detail);
    window.addEventListener('cuidali-speech',handler); window.CuidaliNative.listen();
    return ()=>window.removeEventListener('cuidali-speech',handler);
  }
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech) {onError('Seu navegador não oferece entrada por voz. Você pode escrever sua mensagem.');return ()=>{};}
  const r=new Speech();r.lang='pt-BR';r.interimResults=false;
  r.onresult=(e:any)=>onText(e.results[0][0].transcript);
  r.onerror=()=>onError('Não foi possível ouvir. Confira a permissão do microfone ou escreva sua mensagem.'); r.start();
  return ()=>r.abort();
}
export function calendar(appointment:any) {
  const start=new Date(appointment.scheduled_at.replace(' ','T')+'Z');
  if(Platform.OS==='web'&&window.CuidaliNative) {window.CuidaliNative.openCalendar(appointment.specialty,appointment.location,start.toISOString());return;}
  if(Platform.OS!=='web')return;
  const clean=(x:string)=>x.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Cuidali//Agenda//PT-BR','BEGIN:VEVENT',`UID:consulta-${appointment.id}@cuidali`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+3600000))}`,`SUMMARY:${clean(appointment.specialty)}`,`LOCATION:${clean(appointment.location)}`,`DESCRIPTION:${clean('Consulta com '+appointment.doctor)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const url=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='consulta-cuidali.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
