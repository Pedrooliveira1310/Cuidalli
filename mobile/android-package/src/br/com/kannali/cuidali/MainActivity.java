package br.com.kannali.cuidali;



import android.app.Activity;

import android.app.AlertDialog;

import android.content.ActivityNotFoundException;

import android.content.Intent;

import android.graphics.Color;

import android.net.Uri;

import android.os.Bundle;

import android.text.InputType;

import android.view.View;

import android.view.inputmethod.InputMethodManager;

import android.webkit.WebResourceRequest;

import android.webkit.WebResourceResponse;

import android.webkit.WebSettings;

import android.webkit.WebView;

import android.webkit.WebViewClient;

import android.widget.Button;

import android.widget.EditText;

import android.widget.LinearLayout;

import android.widget.ScrollView;

import android.widget.TextView;



import org.json.JSONObject;

import java.io.ByteArrayInputStream;

import java.io.ByteArrayOutputStream;

import java.io.IOException;

import java.net.HttpURLConnection;

import java.net.URL;

import java.nio.charset.StandardCharsets;

import java.util.Collections;

import java.util.HashMap;

import java.util.Locale;

import java.util.Map;

import java.util.concurrent.ExecutorService;

import java.util.concurrent.Executors;

import java.util.regex.Matcher;

import java.util.regex.Pattern;



public final class MainActivity extends Activity {

    private static final String ENTRY = "/__cuidali_app__/index.html";

    private static final int BLUE = Color.rgb(26, 54, 93);

    private static final int BG = Color.rgb(247, 250, 252);

    private static final Pattern ADDRESS = Pattern.compile("^(https?)://([a-z0-9.-]+)(?::([0-9]{1,5}))?/?$", Pattern.CASE_INSENSITIVE);

    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    private WebView web;

    private android.speech.tts.TextToSpeech voice;

    private boolean voiceReady;

    private String activeServer="";



    @Override public void onCreate(Bundle state) {

        super.onCreate(state);

        getWindow().setStatusBarColor(BLUE);

        getWindow().setNavigationBarColor(BLUE);

        voice=new android.speech.tts.TextToSpeech(this,status->{voiceReady=status==android.speech.tts.TextToSpeech.SUCCESS;if(voiceReady)voice.setLanguage(new Locale("pt","BR"));});

        NativeNotifications.channels(this);
        String address = ReleaseConfig.SERVER.isEmpty() ? getPreferences(MODE_PRIVATE).getString("server", "") : ReleaseConfig.SERVER;

        if (address.isEmpty()) showSetup(address); else showApp(address);

    }



    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private LinearLayout column() {

        LinearLayout layout = new LinearLayout(this);

        layout.setOrientation(LinearLayout.VERTICAL);

        layout.setBackgroundColor(BG);

        return layout;

    }

    private TextView text(String value, int size) {

        TextView view = new TextView(this);

        view.setText(value);

        view.setTextColor(BLUE);

        view.setTextSize(size);

        view.setPadding(0, dp(8), 0, dp(8));

        return view;

    }

    private Button button(String label) {

        Button b = new Button(this);

        b.setText(label);

        b.setAllCaps(false);

        b.setTextSize(17);

        b.setMinHeight(dp(56));

        return b;

    }

    private void showSetup(String old) {

        closeWeb();

        ScrollView scroll = new ScrollView(this);

        LinearLayout content = column();

        content.setPadding(dp(24), dp(24), dp(24), dp(24));

        scroll.setBackgroundColor(BG);

        scroll.addView(content);

        content.addView(text("Conectar o Cuidali", 28));

        content.addView(text("Informe o endereço da API do Cuidali para entrar.", 19));

        TextView label = text("Endereço do servidor", 18);

        EditText field = new EditText(this);

        field.setId(View.generateViewId());

        label.setLabelFor(field.getId());

        content.addView(label);

        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);

        field.setSingleLine(true);

        field.setHint("https://api.exemplo.com");

        field.setText(old);

        field.setMinHeight(dp(56));

        content.addView(field);

        content.addView(text("Para uma demonstração, use o IP do computador na mesma rede Wi-Fi. Em HTTP local, use somente dados fictícios.", 16));

        TextView status = text("", 17);

        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);

        content.addView(status);

        Button connect = button("Testar conexão e continuar");

        content.addView(connect);

        Button back = button("Voltar ao Cuidali");

        if (!old.isEmpty()) {

            content.addView(back);

            back.setOnClickListener(v -> showApp(old));

        }

        connect.setOnClickListener(v -> {

            String address;

            try { address = normalize(field.getText().toString()); }

            catch (IllegalArgumentException e) { status.setText(e.getMessage()); return; }

            field.setEnabled(false); connect.setEnabled(false); back.setEnabled(false);

            status.setText("Verificando servidor…");

            worker.submit(() -> {

                boolean available = healthy(address);

                runOnUiThread(() -> {

                    if (isFinishing() || isDestroyed()) return;

                    if (available) {

                        ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(field.getWindowToken(), 0);

                        getPreferences(MODE_PRIVATE).edit().putString("server", address).apply();

                        showApp(address);

                    } else {

                        status.setText("Não foi possível conectar à API do Cuidali. Confira o endereço, a rede e se o servidor está ativo.");

                        field.setEnabled(true); connect.setEnabled(true); back.setEnabled(true);

                    }

                });

            });

        });

        content.setFocusableInTouchMode(true);

        setContentView(scroll);

        content.requestFocus();

    }



    static String normalize(String value) {

        Matcher m = ADDRESS.matcher(value.trim());

        if (!m.matches()) throw new IllegalArgumentException("Use somente o endereço do servidor, com http:// ou https://.");

        String scheme = m.group(1).toLowerCase(Locale.ROOT), host = m.group(2).toLowerCase(Locale.ROOT);

        for (String label : host.split("\\.", -1))

            if (!label.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"))

                throw new IllegalArgumentException("Nome do servidor inválido.");

        int port = m.group(3) == null ? -1 : Integer.parseInt(m.group(3));

        if (port == 0 || port > 65535) throw new IllegalArgumentException("Porta inválida.");

        if (scheme.equals("http") && !isPrivate(host))

            throw new IllegalArgumentException("Use HTTPS. HTTP só é permitido para demonstração em rede local.");

        return scheme + "://" + host + (port < 0 || (scheme.equals("http") && port == 80) || (scheme.equals("https") && port == 443) ? "" : ":" + port);

    }

    private static boolean isPrivate(String host) {

        if (host.equals("localhost")) return true;

        String[] pieces = host.split("\\.");

        if (pieces.length != 4) return false;

        int[] n = new int[4];

        for (int i = 0; i < 4; i++) {

            if (!pieces[i].matches("0|[1-9][0-9]{0,2}")) return false;

            n[i] = Integer.parseInt(pieces[i]);

            if (n[i] > 255) return false;

        }

        return n[0] == 10 || n[0] == 127 || (n[0] == 192 && n[1] == 168) || (n[0] == 172 && n[1] >= 16 && n[1] <= 31);

    }

    private static boolean healthy(String address) {

        HttpURLConnection connection = null;

        try {

            connection = (HttpURLConnection) new URL(address + "/health").openConnection();

            connection.setInstanceFollowRedirects(false);

            connection.setConnectTimeout(5000); connection.setReadTimeout(5000);

            if (connection.getResponseCode() != 200) return false;

            try (java.io.InputStream in = connection.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

                byte[] buffer = new byte[1024];

                for (int n; (n = in.read(buffer)) != -1;) {

                    if (out.size() + n > 4096) return false;

                    out.write(buffer, 0, n);

                }

                JSONObject json = new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));

                return "ok".equals(json.optString("status")) && !json.optString("timezone").isEmpty();

            }

        } catch (Exception e) { return false; }

        finally { if (connection != null) connection.disconnect(); }

    }



    private void showApp(String address) {

        closeWeb();

        activeServer=address;

        LinearLayout layout = column();

        Button settings = button("Configurar servidor");

        settings.setOnClickListener(v -> new AlertDialog.Builder(this)

            .setTitle("Configurar servidor")

            .setMessage("Ao abrir a configuração, será necessário entrar na sua conta novamente.")

            .setNegativeButton("Cancelar", null)

            .setPositiveButton("Continuar", (dialog, which) -> showSetup(address)).show());

        if(ReleaseConfig.SERVER.isEmpty())layout.addView(settings);

        web = new WebView(this);

        web.addJavascriptInterface(new NativeBridge(), "CuidaliNative");

        web.setWebChromeClient(new android.webkit.WebChromeClient(){

            @Override public boolean onJsConfirm(WebView view,String url,String message,android.webkit.JsResult result){new AlertDialog.Builder(MainActivity.this).setTitle("Cuidali").setMessage(message).setNegativeButton("Cancelar",(d,w)->result.cancel()).setPositiveButton("Confirmar",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}

            @Override public boolean onJsAlert(WebView view,String url,String message,android.webkit.JsResult result){new AlertDialog.Builder(MainActivity.this).setTitle("Cuidali").setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.confirm()).show();return true;}

        });

        WebSettings options = web.getSettings();

        options.setJavaScriptEnabled(true);

        options.setAllowFileAccess(false);

        options.setAllowContentAccess(false);

        options.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        options.setSupportMultipleWindows(false);

        options.setTextZoom(getResources().getConfiguration().fontScale == 1f ? 100 :

            Math.round(getResources().getConfiguration().fontScale * 100));

        layout.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));

        Uri origin = Uri.parse(address);

        web.setWebViewClient(new WebViewClient() {

            private boolean sameOrigin(Uri uri) {

                return origin.getScheme().equals(uri.getScheme()) && origin.getAuthority().equals(uri.getAuthority());

            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {

                Uri uri = req.getUrl();

                if (req.isForMainFrame() && "tel".equals(uri.getScheme()) && uri.getSchemeSpecificPart().matches("\\+?[0-9]{8,15}")) {

                    try { startActivity(new Intent(Intent.ACTION_DIAL, uri)); }

                    catch (ActivityNotFoundException e) {

                        new AlertDialog.Builder(MainActivity.this).setMessage("Discador indisponível neste aparelho.").setPositiveButton("OK", null).show();

                    }

                    return true;

                }

                return !sameOrigin(uri) || !ENTRY.equals(uri.getPath());

            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {

                Uri uri = req.getUrl();

                if (!sameOrigin(uri)) return response(403, "Forbidden");

                String path = uri.getPath();

                if (path == null || path.contains("..")) return response(404, "Not Found");

                if (req.isForMainFrame() && !ENTRY.equals(path)) return response(403, "Forbidden");

                if (ENTRY.equals(path)) return asset("index.html");

                if (path.startsWith("/_expo/") || path.startsWith("/assets/")) return asset(path.substring(1));

                if (path.equals("/health") || path.equals("/me") || path.equals("/notifications") || path.matches("/(auth|elders|links|link-codes)(/.*)?")) return null;

                return response(404, "Not Found");

            }

        });

        setContentView(layout);

        web.loadUrl(address + ENTRY);

    }

    private WebResourceResponse asset(String path) {

        String type = path.endsWith(".html") ? "text/html" : path.endsWith(".js") ? "application/javascript" :

            path.endsWith(".css") ? "text/css" : path.endsWith(".png") ? "image/png" : "application/octet-stream";

        try {

            Map<String, String> headers = new HashMap<>();

            headers.put("Cache-Control", "no-store");

            headers.put("X-Content-Type-Options", "nosniff");

            if (path.equals("index.html")) headers.put("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'");

            return new WebResourceResponse(type, "UTF-8", 200, "OK", headers, getAssets().open("app/" + path));

        } catch (IOException e) { return response(404, "Not Found"); }

    }

    private static WebResourceResponse response(int status, String label) {

        return new WebResourceResponse("text/plain", "UTF-8", status, label, Collections.emptyMap(),

            new ByteArrayInputStream(label.getBytes(StandardCharsets.UTF_8)));

    }



    public final class NativeBridge {
        @android.webkit.JavascriptInterface public void openDialer(String phone){if(!phone.matches("\\+?[0-9]{8,15}"))return;runOnUiThread(()->{try{startActivity(new Intent(Intent.ACTION_DIAL,Uri.parse("tel:"+phone)));}catch(ActivityNotFoundException e){new AlertDialog.Builder(MainActivity.this).setMessage("Discador indisponível neste aparelho.").setPositiveButton("OK",null).show();}});}

        @android.webkit.JavascriptInterface public String restoreSession(){try{return SecureSession.load(MainActivity.this);}catch(Exception e){return "";}}

        @android.webkit.JavascriptInterface public void setMonitoring(boolean enabled){runOnUiThread(()->{getSharedPreferences("care",0).edit().putBoolean("enabled",enabled).apply();if(enabled){if(android.os.Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},78);else startCare();}else NativeNotifications.disable(MainActivity.this);});}

        @android.webkit.JavascriptInterface public void speak(String text) {runOnUiThread(()->{if(voiceReady)voice.speak(text.substring(0,Math.min(text.length(),4000)),android.speech.tts.TextToSpeech.QUEUE_FLUSH,null,"assistant");});}

        @android.webkit.JavascriptInterface public void listen() {runOnUiThread(()->{

            Intent intent=new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE,"pt-BR");intent.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT,"Como o Cuidali pode ajudar?");

            try{startActivityForResult(intent,77);}catch(ActivityNotFoundException e){new AlertDialog.Builder(MainActivity.this).setMessage("Entrada por voz indisponível. Use o campo de mensagem.").setPositiveButton("OK",null).show();}

        });}

        @android.webkit.JavascriptInterface public void openCalendar(String title,String location,String start){runOnUiThread(()->{try{

            java.text.SimpleDateFormat fmt=new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",Locale.US);fmt.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));long time=fmt.parse(start).getTime();Intent i=new Intent(Intent.ACTION_INSERT,android.provider.CalendarContract.Events.CONTENT_URI);i.putExtra(android.provider.CalendarContract.Events.TITLE,title);i.putExtra(android.provider.CalendarContract.Events.EVENT_LOCATION,location);i.putExtra(android.provider.CalendarContract.EXTRA_EVENT_BEGIN_TIME,time);i.putExtra(android.provider.CalendarContract.EXTRA_EVENT_END_TIME,time+3600000);startActivity(i);

        }catch(Exception e){new AlertDialog.Builder(MainActivity.this).setMessage("Não foi possível abrir a agenda neste aparelho.").setPositiveButton("OK",null).show();}});}

        @android.webkit.JavascriptInterface public void configureSession(String token){

            if(!token.isEmpty()&&!token.matches("[a-f0-9]{64}"))return;

            try{SecureSession.save(MainActivity.this,token);}catch(Exception e){return;}

            runOnUiThread(()->{

                if(token.isEmpty()){NativeNotifications.disable(MainActivity.this);return;}

                getSharedPreferences("care",0).edit().putString("server",activeServer).putString("user",Integer.toHexString(token.hashCode())).apply();

                new AlertDialog.Builder(MainActivity.this).setTitle("Receber avisos de cuidado?").setMessage("Receba pedidos de ajuda e lembretes mesmo quando o Cuidali estiver fechado. Você pode desativar os avisos a qualquer momento.").setNegativeButton("Agora não",(d,w)->{getSharedPreferences("care",0).edit().putBoolean("enabled",false).apply();NativeNotifications.disable(MainActivity.this);}).setPositiveButton("Ativar avisos",(d,w)->{

                    if(android.os.Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},78);

                    else startCare();

                }).show();

            });

        }

    }

    private void startCare(){NativeNotifications.enable(this);}
    @Override protected void onResume(){super.onResume();if(getSharedPreferences("care",0).getBoolean("enabled",false))NativeNotifications.enable(this);}

    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==78&&results.length>0&&results[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)startCare();}

    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==77&&result==RESULT_OK&&data!=null&&web!=null){java.util.ArrayList<String> text=data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);if(text!=null&&!text.isEmpty())web.evaluateJavascript("window.dispatchEvent(new CustomEvent('cuidali-speech',{detail:"+JSONObject.quote(text.get(0))+"}));",null);}}



    private void closeWeb() {

        if (web == null) return;

        web.stopLoading();

        if (web.getParent() instanceof LinearLayout) ((LinearLayout) web.getParent()).removeView(web);

        web.destroy();

        web = null;

    }

    @Override protected void onDestroy() {

        closeWeb();

        if(voice!=null){voice.stop();voice.shutdown();}

        worker.shutdownNow();

        super.onDestroy();

    }

}

