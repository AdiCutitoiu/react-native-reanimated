package com.swmansion.reanimated;

import androidx.annotation.Nullable;

import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.JSIModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.turbomodule.core.interfaces.TurboModuleRegistry;

import java.util.Collection;
import java.util.Map;

public class NativeProxy implements JSIModule, TurboModuleRegistry {

  static {
    System.loadLibrary("reanimated");
  }

  @DoNotStrip
  public static class AnimationFrameCallback implements NodesManager.OnAnimationFrame {

    @DoNotStrip
    private final HybridData mHybridData;

    @DoNotStrip
    private AnimationFrameCallback(HybridData hybridData) {
      mHybridData = hybridData;
    }

    @Override
    public native void onAnimationFrame(double timestampMs);
  }

  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;
  private final NodesManager mNodesManager;

  public NativeProxy(ReactApplicationContext context) {
    mHybridData = initHybrid(context.getJavaScriptContextHolder().get(), new Scheduler(context));
    mNodesManager = context.getNativeModule(ReanimatedModule.class).getNodesManager();
    installJSIBindings();
  }

  private native HybridData initHybrid(long jsContext, Scheduler scheduler);
  private native void installJSIBindings();

  @DoNotStrip
  private void requestRender(AnimationFrameCallback callback) {
    mNodesManager.postOnAnimation(callback);
  }

  @DoNotStrip
  private void updateProps(int viewTag, Map<String, Object> props) {
    mNodesManager.updateProps(viewTag, props);
  }

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
