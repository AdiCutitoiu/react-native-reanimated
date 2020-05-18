package com.swmansion.reanimated;

import com.facebook.react.bridge.NativeMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import androidx.annotation.Nullable;

public class NativeProxy {

  static {
    System.loadLibrary("reanimated");
  }

  public static native void nativeInstall(long runtimePtr);

  public static native void onEvent();

  public static native void clear();

  public static void install(long runtimePtr) {

  }

  static class EventHijacker implements RCTEventEmitter {
    @Override
    public void receiveEvent(int targetTag, String eventName, @Nullable WritableMap event) {
      String eventHash = String.valueOf(targetTag) + eventName;
      String eventAsString = ((NativeMap)event).toString();
      NativeProxy.eventHash = eventHash;
      NativeProxy.eventAsString = eventAsString;
    }

    @Override
    public void receiveTouches(String eventName, WritableArray touches, WritableArray changedIndices) {
      //TODO what should be here ?
    }
  }

  public static native Object getSharedValue(int id);

}
