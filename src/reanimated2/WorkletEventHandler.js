import NativeModule from './NativeReanimated';

export default class WorkletEventHandler {
  constructor(worklet) {
    this.worklet = worklet;
  }

  registerForEvent(viewTag, eventName) {
    this.registrationId = NativeModule.registerEventHandler(
      viewTag + eventName,
      this.worklet
    );
  }

  unregisterFromEvent() {
    NativeModule.unregisterEventHandler(this.registrationId);
  }
}
