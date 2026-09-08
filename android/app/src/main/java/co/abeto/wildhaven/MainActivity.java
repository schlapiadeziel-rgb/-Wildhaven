package co.abeto.wildhaven;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
  private static final String GAME_URL = "https://wildhaven-isle.fhdp7dk4fc.chatgpt.site";
  private WebView game;

  @SuppressLint("SetJavaScriptEnabled")
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    Window window = getWindow();
    window.setStatusBarColor(Color.TRANSPARENT);
    window.setNavigationBarColor(Color.TRANSPARENT);
    window.getDecorView().setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
      View.SYSTEM_UI_FLAG_FULLSCREEN |
      View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
      View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
      View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
      View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    );

    game = new WebView(this);
    game.setBackgroundColor(Color.rgb(19, 45, 50));
    game.getSettings().setJavaScriptEnabled(true);
    game.getSettings().setDomStorageEnabled(true);
    game.getSettings().setMediaPlaybackRequiresUserGesture(false);
    game.getSettings().setBuiltInZoomControls(false);
    game.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        if ("https".equals(request.getUrl().getScheme()) && "wildhaven-isle.fhdp7dk4fc.chatgpt.site".equals(request.getUrl().getHost())) return false;
        return true;
      }
    });
    setContentView(game);
    game.loadUrl(GAME_URL);
  }

  @Override public void onBackPressed() {
    if (game != null && game.canGoBack()) game.goBack();
    else super.onBackPressed();
  }
}
