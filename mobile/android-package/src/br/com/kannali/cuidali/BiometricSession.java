package br.com.kannali.cuidali;
import android.app.Activity;
import android.os.Build;
import android.os.CancellationSignal;
import android.hardware.biometrics.BiometricPrompt;
import android.hardware.biometrics.BiometricManager;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.util.function.BiConsumer;
final class BiometricSession {
 private static final String KEY="cuidali-biometric-session";
 static boolean enabled(Activity a){return a.getSharedPreferences("biometric",0).contains("session");}
 static void clear(Activity a){a.getSharedPreferences("biometric",0).edit().clear().apply();try{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);ks.deleteEntry(KEY);}catch(Exception ignored){}}
 static boolean available(Activity a){
  if(Build.VERSION.SDK_INT<28)return false;
  if(Build.VERSION.SDK_INT>=30)return a.getSystemService(BiometricManager.class).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)==BiometricManager.BIOMETRIC_SUCCESS;
  android.hardware.fingerprint.FingerprintManager f=a.getSystemService(android.hardware.fingerprint.FingerprintManager.class);return f!=null&&f.isHardwareDetected()&&f.hasEnrolledFingerprints();
 }
 static void authenticate(Activity a,boolean enroll,BiConsumer<String,String> result){
  if(!available(a)){result.accept("","Cadastre uma biometria compatível nas configurações do celular. Você pode continuar usando sua senha.");return;}
  try{
   final String token=enroll?SecureSession.load(a):"";
   if(enroll&&token.isEmpty()){result.accept("","Entre com sua senha antes de ativar a biometria.");return;}
   if(enroll)clear(a);
   KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
   if(enroll){KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true).build());gen.generateKey();}
   SecretKey key=(SecretKey)ks.getKey(KEY,null);if(key==null){result.accept("","Entre com sua senha e ative a biometria em Meus dados.");return;}
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
   String[] saved=enroll?new String[0]:a.getSharedPreferences("biometric",0).getString("session","").split(":");
   if(enroll)cipher.init(Cipher.ENCRYPT_MODE,key);else cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Base64.decode(saved[0],Base64.NO_WRAP)));
   new BiometricPrompt.Builder(a).setTitle(enroll?"Ativar entrada com biometria":"Entrar no Cuidali").setSubtitle("Confirme sua identidade neste aparelho").setNegativeButton("Usar senha",a.getMainExecutor(),(dialog,which)->result.accept("","Use sua senha para continuar.")).build().authenticate(new BiometricPrompt.CryptoObject(cipher),new CancellationSignal(),a.getMainExecutor(),new BiometricPrompt.AuthenticationCallback(){
    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult auth){try{
      Cipher unlocked=auth.getCryptoObject().getCipher();
      if(enroll){String value=Base64.encodeToString(unlocked.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(unlocked.doFinal(token.getBytes("UTF-8")),Base64.NO_WRAP);a.getSharedPreferences("biometric",0).edit().putString("session",value).apply();result.accept("","Biometria ativada neste aparelho.");}
      else result.accept(new String(unlocked.doFinal(Base64.decode(saved[1],Base64.NO_WRAP)),"UTF-8"),"");
    }catch(Exception e){clear(a);result.accept("","Entre com sua senha para reativar a biometria.");}}
    @Override public void onAuthenticationError(int code,CharSequence message){result.accept("","Não foi possível confirmar a biometria. Use sua senha ou tente novamente.");}
   });
  }catch(Exception e){clear(a);result.accept("","A biometria precisa ser ativada novamente. Entre com sua senha.");}
 }
}
