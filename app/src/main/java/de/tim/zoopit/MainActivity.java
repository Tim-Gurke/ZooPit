package de.tim.zoopit;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.widget.Toast;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    private String pendingExport;
    private static final int EXPORT = 41, IMPORT = 42;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(247,245,239));
        getWindow().setNavigationBarColor(Color.rgb(247,245,239));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(247,245,239));
        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        if(android.os.Build.VERSION.SDK_INT>=26)s.setSafeBrowsingEnabled(true);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return !"file".equals(request.getUrl().getScheme());
            }
        });
        setContentView(web);
        loadGame(getIntent());
    }
    private void loadGame(Intent intent) {
        String url="file:///android_asset/index.html";
        Uri data=intent==null?null:intent.getData();
        if(data!=null){
            String code=data.getQueryParameter("join");
            if(code!=null&&code.matches("[A-Za-z0-9-]{8,13}"))url+="?join="+Uri.encode(code);
        }
        web.loadUrl(url);
    }
    @Override protected void onNewIntent(Intent intent) {super.onNewIntent(intent);setIntent(intent);loadGame(intent);}
    @Override protected void onPause() {
        if(web!=null)web.evaluateJavascript("window.ZooPitNativePause&&window.ZooPitNativePause()", value -> {web.onPause();web.pauseTimers();});
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if(web!=null){web.resumeTimers();web.onResume();web.evaluateJavascript("window.ZooPitNativeResume&&window.ZooPitNativeResume()",null);}
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.ZooPitBack?window.ZooPitBack():false", value -> {
            if(!"true".equals(value))MainActivity.super.onBackPressed();
        });
    }
    private void message(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_SHORT).show());}
    public final class Bridge {
        @JavascriptInterface public void copy(String text) {
            runOnUiThread(()->{ClipboardManager c=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);c.setPrimaryClip(ClipData.newPlainText("ZooPit",text));});
        }
        @JavascriptInterface public void share(String text) {
            runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,text);startActivity(Intent.createChooser(i,"ZooPit-iade teilen"));});
        }
        @JavascriptInterface public void exportBackup(String data) {
            if(data==null||data.length()>5000000)return;
            pendingExport=data;
            runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,"ZooPit-Spielstand-"+new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).format(new Date())+".json");startActivityForResult(i,EXPORT);});
        }
        @JavascriptInterface public void importBackup() {
            runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain"});startActivityForResult(i,IMPORT);});
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null){pendingExport=null;return;}
        Uri uri=data.getData();
        try{
            if(request==EXPORT&&pendingExport!=null){
                try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){out.write(pendingExport.getBytes(StandardCharsets.UTF_8));}
                pendingExport=null;message("Spielstand gesichert.");
            } else if(request==IMPORT) {
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                try(InputStream in=getContentResolver().openInputStream(uri)){
                    byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){bytes.write(buf,0,n);if(bytes.size()>5000000)throw new Exception("Datei zu groß");}
                }
                String raw=new String(bytes.toByteArray(),StandardCharsets.UTF_8);
                web.evaluateJavascript("window.ZooPitImport("+JSONObject.quote(raw)+")",null);
            }
        }catch(Exception e){pendingExport=null;message("Die Sicherung konnte nicht gelesen oder geschrieben werden.");}
    }
}
