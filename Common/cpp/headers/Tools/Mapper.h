#ifndef Mapper_h
#define Mapper_h

#include <stdio.h>
#include <jsi/jsi.h>
#include "Shareable.h"
#include "NativeReanimatedModule.h"

namespace reanimated {

using namespace facebook;

class MapperRegistry;

class Mapper {
  friend MapperRegistry;
private:
  jsi::Function mapper;
  std::vector<std::shared_ptr<MutableValue>> inputs;
  std::vector<std::shared_ptr<MutableValue>> outputs;
  unsigned long id;
  bool dirty = true;

public:
  Mapper(NativeReanimatedModule *module,
         unsigned long id,
         jsi::Function &&mapper,
         std::vector<std::shared_ptr<MutableValue>> inputs,
         std::vector<std::shared_ptr<MutableValue>> outputs);
  void execute(jsi::Runtime &rt);
};

}

#endif /* Mapper_h */
