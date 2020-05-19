#include <memory>
#include <string>

#include <fb/fbjni.h>
#include <jsi/jsi.h>
#include <hermes/hermes.h>

#include "AndroidScheduler.h"

using namespace facebook;
using namespace react;

namespace reanimated {

void AndroidScheduler::scheduleOnUI(std::function<void()> job) {
}

void AndroidScheduler::scheduleOnJS(std::function<void()> job) {
}

void AndroidScheduler::triggerUI() {
}

void AndroidScheduler::triggerJS() {
}

AndroidScheduler::AndroidScheduler(
  jni::alias_ref<AndroidScheduler::javaobject> jThis
):
  javaPart_(jni::make_global(jThis))
  {}

jni::local_ref<AndroidScheduler::jhybriddata> AndroidScheduler::initHybrid(
  jni::alias_ref<jhybridobject> jThis
) {
  return makeCxxInstance(jThis);
}

void AndroidScheduler::registerNatives() {
  registerHybrid({
    makeNativeMethod("initHybrid", AndroidScheduler::initHybrid),
  });
}

}