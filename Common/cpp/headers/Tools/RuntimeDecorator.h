//
//  RuntimeDecorator.hpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 31/03/2020.
//

#ifndef RuntimeDecorator_h
#define RuntimeDecorator_h

#include <stdio.h>
#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

using UpdaterFunction = std::function<void(jsi::Runtime &rt, int viewTag, const jsi::Object& object)>;
using RequestFrameFunction = std::function<void(std::function<void(double)>)>;

class RuntimeDecorator {
public:
  static void addNativeObjects(jsi::Runtime &rt, UpdaterFunction updater, RequestFrameFunction requestFrame);
};

}

#endif /* RuntimeDecorator_h */
