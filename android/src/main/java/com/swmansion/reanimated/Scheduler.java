package com.swmansion.reanimated;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;

public class Scheduler {

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public Scheduler() {
    mHybridData = initHybrid();
  }

  private native HybridData initHybrid();

//  private static WeakReference<ReactContext> mReactContext;
//  private static WeakReference<Handler> mHandler;
//
//  static void setContext(ReactContext reactContext) {
//    mReactContext = new WeakReference<>(reactContext);
//  }
//
//  static void setHandler(Handler handler) {
//    mHandler = new WeakReference<>(handler);
//  }
//
//  static native void triggerUI();
//
//  static native void triggerJS();
//
//  static boolean scheduleTriggerOnUI() {
//    if (mReactContext.get() == null || mHandler.get() == null) {
//      return false;
//    }
//    mHandler.get().post(new Runnable() {
//      @Override
//      public void run() {
//        triggerUI();
//      }
//    });
//    return true;
//  }
//
//  static boolean scheduleTriggerOnJS() {
//    if (mReactContext.get() == null) {
//      return false;
//    }
//    mReactContext.get().runOnJSQueueThread(new Runnable() {
//      @Override
//      public void run() {
//        triggerJS();
//      }
//    });
//    return true;
//  }

}
