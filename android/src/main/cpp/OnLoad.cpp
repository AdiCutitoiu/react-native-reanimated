#include <fb/fbjni.h>

#include "NativeProxy.h"
#include "AndroidScheduler.h"
#include "Logger.h"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  Logger::log("HELLO\n");
  return facebook::jni::initialize(vm, [] {
    reanimated::NativeProxy::registerNatives();
    reanimated::AndroidScheduler::registerNatives();
  });
}