//
// Created by Szymon Kapala on 2020-02-11.
//

#ifndef REANIMATEDEXAMPLE_SHAREDDOUBLE_H
#define REANIMATEDEXAMPLE_SHAREDDOUBLE_H

#include "SharedValue.h"
#include "ApplierRegistry.h"
#include "WorkletRegistry.h"

class SharedDouble : public SharedValue {
  std::weak_ptr<ApplierRegistry> applierRegistry;
  std::weak_ptr<SharedValueRegistry> sharedValueRegistry;
  std::weak_ptr<WorkletRegistry> workletRegistry;
  jsi::Value parameter;
  jsi::Value animation;
  public:
    double value;
    int id;
    int bindedApplierId = -1;
    SharedDouble(int id,
                 double value,
                 std::shared_ptr<ApplierRegistry> applierRegistry,
                 std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
                 std::shared_ptr<WorkletRegistry> workletRegistry);
    jsi::Value asValue(jsi::Runtime &rt) const override;
    jsi::Value asParameter(jsi::Runtime &rt, std::shared_ptr<SharedValue> sv) override;
    void setNewValue(std::shared_ptr<SharedValue> sv) override;
    std::vector<int> getSharedValues() override;
    std::shared_ptr<SharedValue> copy() override;
    void willUnregister(jsi::Runtime &rt) override;
    ~SharedDouble();
};

#endif //REANIMATEDEXAMPLE_SHAREDDOUBLE_H
