package com.pawlegends.dogworld;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * PAW LEGENDS: DOG WORLD — Android kabugu.
 * Oyunun tamami assets/www icindeki HTML5/JS projesidir; bu sinif onu WebView'de
 * calistirir, kayitlari (localStorage) acik tutar ve geri tusunu oyun icindeki
 * ekran gecmisine baglar. Hicbir ucuncu parti kutuphane kullanilmaz.
 */
public class MainActivity extends Activity {

    private WebView web;
    private boolean gameLoaded = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                             WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#070a12"));

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: oyun kaydi
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);   // ses/muzik
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            s.setAllowUniversalAccessFromFileURLs(true);   // file:// altinda XHR (ses dosyalari)
            s.setAllowFileAccessFromFileURLs(true);
        }

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                gameLoaded = true;
                view.loadUrl("javascript:(function(){try{window.__PAW_ANDROID__=true;"
                        + "document.addEventListener('backbutton',function(){if(window.PL&&PL.ui)PL.ui.back();});}catch(e){}})();");
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "Oyun dosyalari yuklenemedi", Toast.LENGTH_LONG).show();
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                return true;   // konsol spamini engelle
            }
        });

        setContentView(web);
        // build_apk.sh -A android/www verdigi icin oyun dosyalari APK icinde assets/ kokunde durur
        web.loadUrl("file:///android_asset/index.html");
    }

    /** Geri tusu: oyunda onceki ekrana don, hub'da isem cikis onayi sor. */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (gameLoaded) {
                web.evaluateJavascript(
                    "(function(){try{if(window.PL&&PL.ui&&PL.ui.currentScreen){var c=PL.ui.currentScreen();"
                  + "if(c&&c!=='hub'&&c!=='login'){PL.ui.back();return 'nav';}return 'exit';}return 'exit';}"
                  + "catch(e){return 'exit';}})();",
                    new android.webkit.ValueCallback<String>() {
                        @Override public void onReceiveValue(String value) {
                            if (value != null && value.contains("nav")) return;
                            confirmExit();
                        }
                    });
                return true;
            }
            confirmExit();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void confirmExit() {
        web.evaluateJavascript(
            "(function(){try{if(window.PL&&PL.game&&PL.game.save)PL.game.save();}catch(e){}})();", null);
        new android.app.AlertDialog.Builder(this)
            .setTitle("PAW LEGENDS")
            .setMessage("Oyundan çıkılsın mı? İlerlemen kaydedildi.")
            .setPositiveButton("Çık", (d, w) -> { finish(); })
            .setNegativeButton("Vazgeç", null)
            .show();
    }

    @Override protected void onPause() {
        super.onPause();
        if (web != null) {
            web.evaluateJavascript("(function(){try{if(window.PL&&PL.game&&PL.game.save)PL.game.save();}catch(e){}})();", null);
            web.onPause();
        }
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); web = null; }
        super.onDestroy();
    }

    /** JS -> Java koprusu (titreşim/uzun suren islemler icin). */
    private class Bridge {
        @JavascriptInterface
        public String platform() { return "android"; }

        @JavascriptInterface
        public void toast(final String msg) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
        }
    }
}
