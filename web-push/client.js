import {initializeApp} from 'firebase/app';
import {getMessaging,getToken,deleteToken,onMessage,isSupported} from 'firebase/messaging';
import config from './config.json';
let messaging,registeredToken='',enabled=false,observing=false;
async function activate(register,request=true){
 if(!await isSupported())throw Error('Este navegador não oferece avisos em segundo plano. Seus alertas continuam disponíveis no painel.');
 if(Notification.permission!=='granted'){
  if(!request)return;
  if(await Notification.requestPermission()!=='granted')throw Error('Permissão de avisos não concedida. Você pode ativá-la nas configurações do navegador.');
 }
 messaging??=getMessaging(initializeApp(config));
 const serviceWorkerRegistration=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'});
 registeredToken=await getToken(messaging,{serviceWorkerRegistration});
 if(!registeredToken)throw Error('Não foi possível ativar os avisos. Tente novamente.');
 await register(registeredToken);enabled=true;
 if(!observing){onMessage(messaging,p=>{const n=p.notification||p.data||{};new Notification(n.title||'Cuidali',{body:n.body||'Você tem um aviso de cuidado.',tag:p.data?.event_key||'care',icon:'/icon.svg'});});observing=true;}
 return 'Avisos ativados neste navegador, inclusive com a página fechada.';
}
async function disable(unregister){try{if(registeredToken)await unregister(registeredToken);}finally{if(messaging)await deleteToken(messaging).catch(()=>{});const reg=await navigator.serviceWorker.getRegistration('/');const subscription=await reg?.pushManager.getSubscription();await subscription?.unsubscribe();registeredToken='';enabled=false;}}
window.CuidaliWebPush={activate,restore:register=>typeof Notification!=='undefined'&&Notification.permission==='granted'?activate(register,false):Promise.resolve(),disable,isEnabled:()=>enabled};
window.dispatchEvent(new Event('cuidali-push-ready'));
