#include <memory>
#include <string>

#include <fb/fbjni.h>
#include <jsi/jsi.h>
#include <hermes/hermes.h>

#include "NativeProxy.h"
#include "NativeReanimatedModule.h"
#include "AndroidScheduler.h"

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

  auto propUpdater = [this](jsi::Runtime &rt, int viewTag, const jsi::Object &props) {
    this->updateProps(rt, viewTag, props);
  };

  auto requestRender = [this](std::function<void(double)> onRender) {
    this->requestRender(std::move(onRender));
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
}

void NativeProxy::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", NativeProxy::initHybrid),
    makeNativeMethod("installJSIBindings", NativeProxy::installJSIBindings),
  });
}

void NativeProxy::requestRender(std::function<void(double)> onRender) {
  static auto method = javaPart_
    ->getClass()
    ->getMethod<void(AnimationFrameCallback::javaobject)>("requestRender");
  method(javaPart_.get(), AnimationFrameCallback::newObjectCxxArgs(std::move(onRender)).get());
}

struct PropsMap : jni::JavaClass<PropsMap, JMap<JString,JObject>> {
  static constexpr auto kJavaDescriptor =
      "Ljava/util/HashMap;";

  static local_ref<PropsMap> create() {
    return newInstance();
  }

  void put(const std::string &key, jni::local_ref<JObject> object) {
    static auto method = getClass()
        ->getMethod<jobject(jni::local_ref<JObject>,jni::local_ref<JObject>)>("put");
    method(self(), jni::make_jstring(key), object);
  }
};

static jni::local_ref<PropsMap> ConvertToPropsMap(jsi::Runtime& rt, const jsi::Object &props) {
  auto map = PropsMap::create();

  auto propNames = props.getPropertyNames(rt);
  for (size_t i = 0, size = propNames.size(rt); i < size; i++) {
    auto jsiKey = propNames.getValueAtIndex(rt, i).asString(rt);
    auto value = props.getProperty(rt, jsiKey);
    auto key = jsiKey.utf8(rt);
    if (value.isUndefined() || value.isNull()) {
      map->put(key, nullptr);
    } else if (value.isBool()) {
      map->put(key, jni::autobox(value.getBool()));
    } else if (value.isNumber()) {
      map->put(key, jni::autobox(value.asNumber()));
    } else if (value.isString()) {
      map->put(key, jni::make_jstring(value.asString(rt).utf8(rt)));
    } else if (value.isObject()) {

    }
  }

  return map;
}

void NativeProxy::updateProps(jsi::Runtime &rt, int viewTag, const jsi::Object &props) {
  auto method = javaPart_
    ->getClass()
    ->getMethod<void(int,JMap<JString,JObject>::javaobject)>("updateProps");
  method(javaPart_.get(), viewTag, ConvertToPropsMap(rt, props).get());
}

}