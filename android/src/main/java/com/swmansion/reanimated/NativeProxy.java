package com.swmansion.reanimated;

import androidx.annotation.Nullable;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.JSIModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleRegistry;

import java.util.Collection;

public class NativeProxy implements JSIModule, TurboModuleRegistry {

  static {
    System.loadLibrary("reanimated");
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  public NativeProxy(ReactApplicationContext context) {
    mHybridData = initHybrid(context.getJavaScriptContextHolder().get(), new Scheduler());
    installJSIBindings();
  }

  private native HybridData initHybrid(long jsContext, Scheduler scheduler);
  private native void installJSIBindings();

  @Override
  public void initialize() {

  }

  @Override
  public void onCatalystInstanceDestroy() {
    mHybridData.resetNative();
  }

  @Override
  public @Nullable TurboModule getModule(String moduleName) {
    return null;
  }

  @Override
  public Collection<TurboModule> getModules() {
    return null;
  }

  @Override
  public boolean hasModule(String moduleName) {
    return false;
  }
}
