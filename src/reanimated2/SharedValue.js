import NativeModule from './NativeReanimated';
import Worklet from './Worklet';
import AnimatedNode from '../core/AnimatedNode';
import ReanimatedModule from '../ReanimatedModule';

export default class SharedValue extends AnimatedNode {
  static idCounter = 0;

  static create(value) {
    return NativeModule.createSharedValue(value);
  }

  constructor(value, data) {
    const newId = SharedValue.idCounter++;
    super(
      {
        type: 'shared',
        sharedValueId: newId,
        initialValue: value,
      },
      []
    );

    this.id = newId;
    this.initialValue = value;
    this._data = data;

    NativeModule.registerSharedValue(this.id, this.initialValue);
    this.callbacks = {};
    this.currentUid = 0;
    this.maxCallbacks = 1e9;
  }

  async get() {
    const uid = this.generateUid();
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.callbacks[uid] = value => {
        // without setTimeout with timout 0 VM executes resolve before registering the Promise
        setTimeout(() => {
          delete _this.callbacks[uid];
          resolve(value);
        }, 0);
      };
      NativeModule.getSharedValueAsync(_this.id, _this.callbacks[uid]);
    });
  }

  set(newValue) {
    NativeModule.setSharedValue(this.id, newValue);
    ReanimatedModule.triggerRender();
  }

  release() {
    NativeModule.unregisterSharedValue(this.id);
  }

  toString() {
    return `AnimatedValue, id: ${this.__nodeID}`;
  }

  generateUid() {
    if (Object.keys(this.callbacks).length > this.maxCallbacks) {
      throw 'too many callbacks';
    }
    while (this.callbacks[this.currentUid] !== undefined) {
      ++this.currentUid;
      this.currentUid %= this.maxCallbacks;
    }
    return this.currentUid;
  }
}
