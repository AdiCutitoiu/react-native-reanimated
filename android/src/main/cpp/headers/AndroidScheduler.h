#pragma once

#include "Scheduler.h"

#include <jni.h>
#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>

namespace reanimated {

using namespace facebook;

class AndroidScheduler : public jni::HybridClass<AndroidScheduler>, Scheduler {
  public:
   static auto constexpr kJavaDescriptor = "Lcom/swmansion/reanimated/Scheduler;";
   static jni::local_ref<jhybriddata> initHybrid(jni::alias_ref<jhybridobject> jThis);
   static void registerNatives();

   void scheduleOnUI(std::function<void()> job) override;
   void scheduleOnJS(std::function<void()> job) override;
   void triggerUI() override;
   void triggerJS() override;

   ~AndroidScheduler() {};

  private:
   friend HybridBase;
   jni::global_ref<AndroidScheduler::javaobject> javaPart_;

   explicit AndroidScheduler(jni::alias_ref<AndroidScheduler::jhybridobject> jThis);
};

}
