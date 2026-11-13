import {initializeApp} from 'firebase/app';
import {getMessaging,onBackgroundMessage} from 'firebase/messaging/sw';
import config from './config.json';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
const messaging=getMessaging(initializeApp(config));
onBackgroundMessage(messaging,p=>{if(!p.notification)return self.registration.showNotification('Cuidali',{body:'Você tem um novo aviso de cuidado.',icon:'/icon.svg',tag:p.data?.event_key||'care'});});
