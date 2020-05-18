#include <memory>
#include <string>

#include <fb/fbjni.h>
#include <jsi/jsi.h>

#include "NativeProxy.h"

using namespace facebook;
using namespace react;

namespace reanimated {

NativeProxy::NativeProxy(
  jni::alias_ref<NativeProxy::javaobject> jThis,
  jsi::Runtime* rt
):
  javaPart_(jni::make_global(jThis)),
  runtime_(rt)
  {}

jni::local_ref<NativeProxy::jhybriddata> NativeProxy::initHybrid(
  jni::alias_ref<jhybridobject> jThis,
  jlong jsContext
) {
  //auto jsCallInvoker = jsCallInvokerHolder->cthis()->getJSCallInvoker();

  return makeCxxInstance(jThis, (jsi::Runtime *) jsContext);
}

void NativeProxy::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", NativeProxy::initHybrid)
  });
}

}