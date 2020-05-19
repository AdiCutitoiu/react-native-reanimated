#include <memory>
#include <string>

#include <fb/fbjni.h>
#include <jsi/jsi.h>
#include <hermes/hermes.h>

#include "NativeProxy.h"
#include "NativeReanimatedModule.h"
#include "AndroidScheduler.h"
#include <android/log.h>

using namespace facebook;
using namespace react;

namespace reanimated {

NativeProxy::NativeProxy(
  jni::alias_ref<NativeProxy::javaobject> jThis,
  jsi::Runtime* rt,
  std::shared_ptr<Scheduler> scheduler
):
  javaPart_(jni::make_global(jThis)),
  runtime_(rt),
  scheduler_(scheduler)
  {}

jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
  jni::alias_ref<jhybridobject> jThis,
  jlong jsContext,
  jni::alias_ref<AndroidScheduler::javaobject> androidScheduler
) {
  auto scheduler = androidScheduler->cthis()->getScheduler();
  return makeCxxInstance(jThis, (jsi::Runtime *)jsContext, scheduler);
}

void NativeProxy::installJSIBindings() {

  auto propUpdater = [](jsi::Runtime &rt, int viewTag, const jsi::Object &props) {
    //
  };

  auto requestRender = [](std::function<void(double)> onRender) {
    //
  };

  std::unique_ptr<jsi::Runtime> animatedRuntime = facebook::hermes::makeHermesRuntime();

  auto module = std::make_shared<NativeReanimatedModule>(nullptr,
                                                         scheduler_,
                                                         std::move(animatedRuntime),
                                                         requestRender,
                                                         propUpdater);

  runtime_->global().setProperty(
    *runtime_,
    jsi::PropNameID::forAscii(*runtime_, "__reanimatedModuleProxy"),
    jsi::Object::createFromHostObject(*runtime_, module));
  __android_log_print(ANDROID_LOG_ERROR, "Yolo", "PROXY INSTALLED");
}

void NativeProxy::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", NativeProxy::initHybrid),
    makeNativeMethod("installJSIBindings", NativeProxy::installJSIBindings),
  });
}

}