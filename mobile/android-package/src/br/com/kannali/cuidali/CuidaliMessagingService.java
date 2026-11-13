package br.com.kannali.cuidali;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
public final class CuidaliMessagingService extends FirebaseMessagingService {
 @Override public void onNewToken(String token){NativeNotifications.register(this,token);}
 @Override public void onMessageReceived(RemoteMessage message){try{if(SecureSession.load(this).isEmpty()||!getSharedPreferences("care",0).getBoolean("enabled",false))return;}catch(Exception e){return;}RemoteMessage.Notification n=message.getNotification();NativeNotifications.show(this,n!=null&&n.getTitle()!=null?n.getTitle():message.getData().getOrDefault("title","Cuidali"),n!=null&&n.getBody()!=null?n.getBody():message.getData().getOrDefault("body","Você tem um novo aviso de cuidado."),message.getData().getOrDefault("event_key",message.getMessageId()!=null?message.getMessageId():"care"));}
}
