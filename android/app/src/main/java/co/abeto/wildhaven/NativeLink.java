package co.abeto.wildhaven;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

public final class NativeLink {
  private static final int PORT = 28765;
  private static final UUID SERVICE = UUID.fromString("3d38bd53-8e37-45eb-a990-9b7ceafcd917");
  private final Context context;
  private final WebView web;
  private final List<Peer> peers = new CopyOnWriteArrayList<>();
  private volatile boolean running;
  private ServerSocket lanServer;
  private BluetoothServerSocket bluetoothServer;

  NativeLink(Context context, WebView web) { this.context=context; this.web=web; }

  @JavascriptInterface public String capabilities() { return "{\"lan\":true,\"bluetooth\":true,\"offline\":true}"; }
  @JavascriptInterface public int appVersionCode() { return BuildConfig.VERSION_CODE; }
  @JavascriptInterface public void openUpdate(String url) {
    try {
      Uri uri=Uri.parse(url);
      if (!"https".equals(uri.getScheme()) || !"github.com".equals(uri.getHost())) return;
      Intent intent=new Intent(Intent.ACTION_VIEW,uri); intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); context.startActivity(intent);
    } catch(Exception e) { error(e); }
  }

  @JavascriptInterface public String hostLan() {
    stop(); running=true;
    new Thread(() -> {
      try { lanServer=new ServerSocket(PORT); ready(); while(running) { Socket s=lanServer.accept(); add(s.getInputStream(),s.getOutputStream()); } }
      catch(Exception e) { if(running) error(e); }
    },"wildhaven-lan-host").start();
    return localAddress();
  }

  @JavascriptInterface public void joinLan(String address) {
    stop(); running=true;
    new Thread(() -> { try { Socket s=new Socket(); s.connect(new InetSocketAddress(address.trim(),PORT),7000); add(s.getInputStream(),s.getOutputStream()); ready(); } catch(Exception e){error(e);} },"wildhaven-lan-join").start();
  }

  @JavascriptInterface public String pairedBluetooth() {
    JSONArray result=new JSONArray();
    try {
      BluetoothAdapter adapter=BluetoothAdapter.getDefaultAdapter();
      if(adapter!=null) for(BluetoothDevice d:adapter.getBondedDevices()) result.put(new JSONObject().put("name",d.getName()).put("address",d.getAddress()));
    } catch(Exception e) { error(e); }
    return result.toString();
  }

  @JavascriptInterface public void hostBluetooth() {
    stop(); running=true;
    new Thread(() -> { try { BluetoothAdapter a=BluetoothAdapter.getDefaultAdapter(); bluetoothServer=a.listenUsingRfcommWithServiceRecord("Wildhaven",SERVICE); ready(); while(running){BluetoothSocket s=bluetoothServer.accept(); add(s.getInputStream(),s.getOutputStream());} } catch(Exception e){if(running)error(e);} },"wildhaven-bt-host").start();
  }

  @JavascriptInterface public void joinBluetooth(String address) {
    stop(); running=true;
    new Thread(() -> { try { BluetoothAdapter a=BluetoothAdapter.getDefaultAdapter(); BluetoothSocket s=a.getRemoteDevice(address).createRfcommSocketToServiceRecord(SERVICE); a.cancelDiscovery(); s.connect(); add(s.getInputStream(),s.getOutputStream()); ready(); } catch(Exception e){error(e);} },"wildhaven-bt-join").start();
  }

  @JavascriptInterface public void send(String message) {
    byte[] line=(message+"\n").getBytes(StandardCharsets.UTF_8);
    for(Peer p:peers) try { synchronized(p.out){p.out.write(line);p.out.flush();} } catch(Exception e){peers.remove(p);}
  }

  @JavascriptInterface public void stop() {
    running=false;
    try{if(lanServer!=null)lanServer.close();}catch(Exception ignored){}
    try{if(bluetoothServer!=null)bluetoothServer.close();}catch(Exception ignored){}
    for(Peer p:peers)try{p.in.close();p.out.close();}catch(Exception ignored){}
    peers.clear();
  }

  private void add(InputStream in,OutputStream out) {
    Peer peer=new Peer(in,out); peers.add(peer); ready();
    new Thread(() -> { try { BufferedReader r=new BufferedReader(new InputStreamReader(in,StandardCharsets.UTF_8)); String line; while(running&&(line=r.readLine())!=null) emit("message",line); } catch(Exception e){if(running)error(e);} finally{peers.remove(peer);} },"wildhaven-peer").start();
  }
  private void ready(){emit("status","connected");}
  private void error(Exception e){emit("error",e.getClass().getSimpleName()+": "+e.getMessage());}
  private void emit(String type,String value){String js="window.dispatchEvent(new CustomEvent('wildhaven-native-"+type+"',{detail:"+JSONObject.quote(value)+"}))";web.post(()->web.evaluateJavascript(js,null));}
  private String localAddress(){try{WifiManager w=(WifiManager)context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);int x=w.getConnectionInfo().getIpAddress();return String.format(Locale.US,"%d.%d.%d.%d",x&255,(x>>8)&255,(x>>16)&255,(x>>24)&255);}catch(Exception e){return "";}}
  private static final class Peer { final InputStream in; final OutputStream out; Peer(InputStream i,OutputStream o){in=i;out=o;} }
}
