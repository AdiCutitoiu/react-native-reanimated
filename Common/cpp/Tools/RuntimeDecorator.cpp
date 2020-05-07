//
//  RuntimeDecorator.cpp
//  DoubleConversion
//
//  Created by Szymon Kapala on 31/03/2020.
//

#include "RuntimeDecorator.h"
#include <unordered_map>
#include <memory>
#include "Logger.h"

void RuntimeDecorator::addNativeObjects(jsi::Runtime &rt, std::shared_ptr<ApplierRegistry> applierRegistry, UpdaterFunction updater) {
  auto callback = [](
      jsi::Runtime &rt,
      const jsi::Value &thisValue,
      const jsi::Value *args,
      size_t count
      ) -> jsi::Value {
    const jsi::Value *value = &args[0];
    if (value->isString()) {
      Logger::log(value->getString(rt).utf8(rt).c_str());
    } else if (value->isNumber()) {
      Logger::log(value->getNumber());
    } else if (value->isUndefined()) {
      Logger::log("undefined");
    } else {
      Logger::log("unsupported value type");
    }
    return jsi::Value::undefined();
    };
  jsi::Value log = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "_log"), 1, callback);
	rt.global().setProperty(rt, "_log", log);


  auto clb = [updater](
      jsi::Runtime &rt,
      const jsi::Value &thisValue,
      const jsi::Value *args,
      size_t count
      ) -> jsi::Value {
    const auto viewTag = args[0].asNumber();
    const auto params = args[1].asObject(rt);
    updater(rt, viewTag, params);
    return jsi::Value::undefined();
  };
  jsi::Value updateProps = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "_updateProps"), 2, clb);
  rt.global().setProperty(rt, "_updateProps", updateProps);


  auto clb2 = [applierRegistry](
      jsi::Runtime &rt,
      const jsi::Value &thisValue,
      const jsi::Value *args,
      size_t count
      ) -> jsi::Value {
    std::shared_ptr<jsi::Function> body;
    jsi::Function fun = args[0].asObject(rt).asFunction(rt);
    std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));
    applierRegistry->registerAnimationFrameCallback(funPtr);
    return jsi::Value::undefined();
  };
  jsi::Value requestAnimationFrame = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "_requestAnimationFrame"), 1, clb2);
  rt.global().setProperty(rt, "_requestAnimationFrame", requestAnimationFrame);

}
