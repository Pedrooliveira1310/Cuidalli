package br.com.kannali.cuidali;
import android.app.*;
import android.content.*;
import android.os.*;
import android.speech.tts.TextToSpeech;
import org.json.*;
import java.net.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
public final class CareService extends Service {
 private ScheduledExecutorService worker;
 private TextToSpeech voice;
 private boolean voiceReady;
 private static final String CHANNEL="care-alerts",MONITOR="care-monitor";
 private Notification.Builder notification(String channel,String title,String body) {
  Intent launch=new Intent(this,MainActivity.class);
  PendingIntent click=PendingIntent.getActivity(this,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,channel):new Notification.Builder(this);
  return builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body).setContentIntent(click).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE);
 }
 @Override public void onCreate(){super.onCreate();NotificationManager manager=getSystemService(NotificationManager.class);
  if(Build.VERSION.SDK_INT>=26){manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Pedidos de ajuda e lembretes",NotificationManager.IMPORTANCE_HIGH));manager.createNotificationChannel(new NotificationChannel(MONITOR,"Acompanhamento ativo",NotificationManager.IMPORTANCE_LOW));}
  startForeground(10,notification(MONITOR,"Cuidali está acompanhando seus cuidados","Toque para abrir. Você pode desativar os avisos no aplicativo.").setOngoing(true).build());
  voice=new TextToSpeech(this,status->{voiceReady=status==TextToSpeech.SUCCESS;if(voiceReady)voice.setLanguage(new Locale("pt","BR"));});
  worker=Executors.newSingleThreadScheduledExecutor();worker.scheduleWithFixedDelay(()->poll(),0,20,TimeUnit.SECONDS);
 }
 @Override public int onStartCommand(Intent i,int flags,int id){return START_STICKY;}
 private void alert(String key,String title,String body,boolean spoken) {
  android.content.SharedPreferences seen=getSharedPreferences("notice",0);if(seen.getBoolean(key,false))return;
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
  getSystemService(NotificationManager.class).notify(key.hashCode(),notification(CHANNEL,title,body).build());
  seen.edit().putBoolean(key,true).apply();
  if(spoken&&voiceReady)voice.speak(body,TextToSpeech.QUEUE_ADD,null,key);
 }
 private void poll(){HttpURLConnection c=null;try {
  String token=SecureSession.load(this),server=getSharedPreferences("care",0).getString("server","");if(token.isEmpty()||server.isEmpty()){stopSelf();return;}
  c=(HttpURLConnection)new URL(server+"/notifications").openConnection();c.setRequestProperty("Authorization","Bearer "+token);c.setConnectTimeout(8000);c.setReadTimeout(8000);
  int status=c.getResponseCode();if(status==401||status==403){SecureSession.save(this,"");stopSelf();return;}if(status!=200)return;
  ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] b=new byte[4096];for(int n;(n=in.read(b))!=-1;){if(bytes.size()+n>262144)return;bytes.write(b,0,n);}}
  JSONObject data=new JSONObject(bytes.toString("UTF-8"));String user=getSharedPreferences("care",0).getString("user","");
  if(data.optString("role").equals("caregiver")){
   JSONArray items=data.optJSONArray("items");if(items!=null)for(int j=0;j<items.length();j++){JSONObject a=items.getJSONObject(j);String kind=a.getString("kind");String title=kind.equals("sos")?"Pedido de ajuda":kind.equals("pain")?"Novo registro de dor":"Ausência de atividade";alert(user+"-alert-"+a.getLong("id"),"Cuidali · "+title,"Abra o Cuidali para acompanhar a situação.",false);}
  }else{
   java.text.SimpleDateFormat clock=new java.text.SimpleDateFormat("HH:mm",Locale.US);clock.setTimeZone(TimeZone.getTimeZone("America/Sao_Paulo"));String time=clock.format(new Date());
   JSONArray doses=data.optJSONArray("doses");if(doses!=null)for(int j=0;j<doses.length();j++){JSONObject d=doses.getJSONObject(j);if(!d.optString("status").equals("taken")&&d.getString("time").compareTo(time)<=0)alert(user+"-dose-"+data.getString("date")+"-"+d.getLong("time_id"),"Cuidali · Horário do medicamento","Você tem um medicamento para confirmar. Abra o Cuidali para conferir.",true);}
   JSONArray appointments=data.optJSONArray("appointments");if(appointments!=null)for(int j=0;j<appointments.length();j++){JSONObject a=appointments.getJSONObject(j);java.text.SimpleDateFormat fmt=new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss",Locale.US);fmt.setTimeZone(TimeZone.getTimeZone("UTC"));long delta=fmt.parse(a.getString("scheduled_at")).getTime()-System.currentTimeMillis();if(delta>=0&&delta<=3600000)alert(user+"-appointment-"+a.getLong("id"),"Cuidali · Consulta em breve","Você tem uma consulta na próxima hora. Confira os detalhes no Cuidali.",true);}
  }
 }catch(Exception ignored){}finally{if(c!=null)c.disconnect();}}
 @Override public void onTimeout(int startId,int type){stopSelf();}
 @Override public android.os.IBinder onBind(Intent i){return null;}
 @Override public void onDestroy(){if(worker!=null)worker.shutdownNow();if(voice!=null){voice.stop();voice.shutdown();}super.onDestroy();}
}
