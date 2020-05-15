#ifndef EventHandler_h
#define EventHandler_h

#include <string>
#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

class EventHandlerRegistry;

class EventHandler {
  friend EventHandlerRegistry;

private:
  jsi::Function handler;
  unsigned long id;
  std::string eventName;

public:
  EventHandler(unsigned long id,
               std::string eventName,
               jsi::Function &&handler): id(id), eventName(eventName), handler(std::move(handler)) {}
  void process(jsi::Runtime &rt, jsi::Value &eventValue);
};

}

#endif /* EventHandler_h */
