#pragma once

//#include <ReactCommon/CallInvokerHolder.h>
//#include <ReactCommon/JavaTurboModule.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <memory>
#include <unordered_map>

namespace reanimated {

using namespace facebook;

class NativeProxy : public jni::HybridClass<NativeProxy> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis,
      jlong jsContext);
  static void registerNatives();

 private:
  friend HybridBase;
  jni::global_ref<NativeProxy::javaobject> javaPart_;
  jsi::Runtime *runtime_;
//  std::shared_ptr<CallInvoker> jsCallInvoker_;
//  std::shared_ptr<CallInvoker> nativeCallInvoker_;

  explicit NativeProxy(
      jni::alias_ref<NativeProxy::jhybridobject> jThis,
      jsi::Runtime *rt);
      //std::shared_ptr<CallInvoker> jsCallInvoker,
      //std::shared_ptr<CallInvoker> nativeCallInvoker);
};


}
