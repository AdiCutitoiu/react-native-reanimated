#ifndef Shareable_h
#define Shareable_h

#include <string>
#include <mutex>
#include <unordered_map>
#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

class NativeReanimatedModule;

enum ValueType {
  UndefinedType,
  NullType,
  BoolType,
  NumberType,
  StringType,
  ObjectType, /* frozen object, can only be set and never modified */
  ArrayType, /* frozen array, can only be set and never modified */
  RemoteObjectType, /* object that can be instantiated on host side and modified on the remote (worklet) side */
  MutableValueType, /* object with 'value' property that can be updated and read from any thread */
  HostFunctionType, /* function that will be executed asynchronously on the host runtime */
  WorkletFunctionType, /* function that gets run on the UI thread */
};

class FrozenObject;
class MutableValue;
class RemoteObject;

class ShareableValue: public std::enable_shared_from_this<ShareableValue> {
private:
  NativeReanimatedModule *module;
  bool boolValue;
  double numberValue;
  std::string stringValue;
  std::shared_ptr<jsi::Function> hostFunction;
  jsi::Runtime *hostRuntime;
  std::shared_ptr<FrozenObject> frozenObject;
  std::shared_ptr<RemoteObject> remoteObject;
  std::vector<std::shared_ptr<ShareableValue>> frozenArray;

//  std::unique_ptr<jsi::Value> hostValue;
//  std::unique_ptr<jsi::Value> remoteValue;

  jsi::Value toJSValue(jsi::Runtime &rt);

  jsi::Object createHost(jsi::Runtime &rt, std::shared_ptr<jsi::HostObject> host);

  ShareableValue(NativeReanimatedModule *module): module(module) {};
  void adapt(jsi::Runtime &rt, const jsi::Value &value, ValueType objectType);

public:
  ValueType type = UndefinedType;
  std::shared_ptr<MutableValue> mutableValue;
  static std::shared_ptr<ShareableValue> adapt(jsi::Runtime &rt, const jsi::Value &value, NativeReanimatedModule *module, ValueType objectType = UndefinedType);
  jsi::Value getValue(jsi::Runtime &rt);

};

class ShareableHostProxyObject: public jsi::HostObject {
public:
  std::shared_ptr<ShareableValue> shareableValue;
  std::shared_ptr<jsi::HostObject> host;

  ShareableHostProxyObject(std::shared_ptr<ShareableValue> shareableValue,
                           std::shared_ptr<jsi::HostObject> host):
    shareableValue(shareableValue), host(host) {};

  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
};

class MutableValue : public jsi::HostObject, std::enable_shared_from_this<MutableValue> {
  private:
  NativeReanimatedModule *module;
  std::mutex readWriteMutex;
  std::shared_ptr<ShareableValue> value;
  std::weak_ptr<ShareableValue> weakSelf;
  jsi::Value animation;
  jsi::Value setter;
  std::vector<std::pair<unsigned long, std::function<void()>>> listeners;

  public:
  MutableValue(jsi::Runtime &rt, const jsi::Value &initial, NativeReanimatedModule *module, std::weak_ptr<ShareableValue> weakSelf);

  public:
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  unsigned long addListener(std::function<void()> listener);
  void removeListener(unsigned long listenerId);
};

class FrozenObject : public jsi::HostObject {
  private:
  std::unordered_map<std::string, std::shared_ptr<ShareableValue>> map;
  NativeReanimatedModule *module;

  public:

  FrozenObject(jsi::Runtime &rt, const jsi::Object &object, NativeReanimatedModule *module);

  // set is not available as the object is "read only" (to avoid locking)

  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);

  std::shared_ptr<jsi::Object> shallowClone(jsi::Runtime &rt);
};

class RemoteObject: public jsi::HostObject {
private:
  std::shared_ptr<jsi::Object> backing;
public:
  RemoteObject(std::shared_ptr<jsi::Object> backing): backing(backing) {}
  void set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value);
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name);
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt);
};

}

#endif /* Shareable_h */
