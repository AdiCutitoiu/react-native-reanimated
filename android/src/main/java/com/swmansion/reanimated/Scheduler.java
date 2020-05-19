package com.swmansion.reanimated;

import android.util.Log;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;

import java.util.concurrent.atomic.AtomicBoolean;

public class Scheduler {

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;
  private final ReactApplicationContext mContext;

  private AtomicBoolean mJSTriggerEnqueued = new AtomicBoolean(false);
  private final Runnable mJSThreadRunnable = new Runnable() {
    @Override
    public void run() {
      mJSTriggerEnqueued.set(false);
      triggerJS();
    }
  };

  private AtomicBoolean mUITriggerEnqueued = new AtomicBoolean(false);
  private final Runnable mUIThreadRunnable = new Runnable() {
    @Override
    public void run() {
      mUITriggerEnqueued.set(false);
      triggerUI();
    }
  };

  public Scheduler(ReactApplicationContext context) {
    mHybridData = initHybrid();
    mContext = context;
  }

  private native HybridData initHybrid();

  private native void triggerUI();

  private native void triggerJS();

  @DoNotStrip
  private void scheduleOnUI() {
    if (!mUITriggerEnqueued.getAndSet(true)) {
      mContext.runOnJSQueueThread(mUIThreadRunnable);
    }
  }

  @DoNotStrip
  private void scheduleOnJS() {
    if (!mJSTriggerEnqueued.getAndSet(true)) {
      mContext.runOnJSQueueThread(mJSThreadRunnable);
    }
  }

}
