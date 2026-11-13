package br.com.kannali.cuidali;
import android.app.*;
import android.content.*;
import android.os.Build;
import android.content.pm.PackageManager;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
final class NativeNotifications {
 static void channels(Context c){if(Build.VERSION.SDK_INT>=26)c.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("care-alerts","Pedidos de ajuda e lembretes",NotificationManager.IMPORTANCE_HIGH));}
 static void enable(Context c){channels(c);c.getSharedPreferences("care",0).edit().putBoolean("enabled",true).apply();FirebaseMessaging.getInstance().setAutoInitEnabled(true);FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token->register(c,token));}
 static void register(Context c,String token){if(!c.getSharedPreferences("care",0).getBoolean("enabled",false))return;c.getSharedPreferences("care",0).edit().putString("push-token",token).apply();new Thread(()->request(c,token,"POST"),"cuidali-push-register").start();}
 static void disable(Context c){c.getSharedPreferences("care",0).edit().putBoolean("enabled",false).apply();String token=c.getSharedPreferences("care",0).getString("push-token","");if(!token.isEmpty())new Thread(()->request(c,token,"DELETE"),"cuidali-push-unregister").start();FirebaseMessaging.getInstance().setAutoInitEnabled(false);FirebaseMessaging.getInstance().deleteToken();}
 private static void request(Context c,String token,String method){HttpURLConnection connection=null;try{
  String session=SecureSession.load(c),server=c.getSharedPreferences("care",0).getString("server","");if(session.isEmpty()||server.isEmpty())return;
  connection=(HttpURLConnection)new URL(server+"/push-tokens").openConnection();connection.setRequestMethod(method);connection.setRequestProperty("Authorization","Bearer "+session);connection.setRequestProperty("Content-Type","application/json");connection.setConnectTimeout(10000);connection.setReadTimeout(10000);connection.setDoOutput(true);
  JSONObject body=new JSONObject();body.put("token",token);body.put("platform","android");try(OutputStream out=connection.getOutputStream()){out.write(body.toString().getBytes("UTF-8"));}
  int status=connection.getResponseCode();c.getSharedPreferences("care",0).edit().putBoolean("registered",status>=200&&status<300).apply();
 }catch(Exception ignored){}finally{if(connection!=null)connection.disconnect();}}
 static void show(Context c,String title,String body,String key){channels(c);if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
  PendingIntent click=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(c,"care-alerts"):new Notification.Builder(c);
  c.getSystemService(NotificationManager.class).notify(key.hashCode(),builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body).setContentIntent(click).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build());
 }
}
