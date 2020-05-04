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
#import "ApplierRegistry.h"

using namespace facebook;

using UpdaterFunction = std::function<void(jsi::Runtime &rt, int viewTag, const jsi::Object& object)>;

class RuntimeDecorator {
public:
  static void addNativeObjects(jsi::Runtime &rt, std::shared_ptr<ApplierRegistry> applierRegistry, UpdaterFunction updater);
};

#endif /* RuntimeDecorator_h */
