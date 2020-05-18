package com.swmansion.reanimated;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.LinkedHashMap;
import java.util.Map;

public class ReanimatedPackage extends TurboReactPackage {

  @Override
  public NativeModule getModule(String name, ReactApplicationContext reactContext) {
    if (name == ReanimatedModule.NAME) {
      return new ReanimatedModule(reactContext);
    }
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return new ReactModuleInfoProvider() {
      @Override
      public Map<String, ReactModuleInfo> getReactModuleInfos() {
        Map<String, ReactModuleInfo> infos = new LinkedHashMap<>();
        infos.put(ReanimatedModule.NAME, new ReactModuleInfo(
                ReanimatedModule.NAME,
                ReanimatedModule.class.getCanonicalName(),
                true,
                true,
                false,
                false,
                true));
        return infos;
      }
    };
  }
}
