import { useEffect, useRef } from 'react';

import WorkletEventHandler from './WorkletEventHandler';
import { startMapper, stopMapper, makeMutable, makeRemote } from './core';

export function useSharedValue(init) {
  const ref = useRef(null);
  if (ref.current === null) {
    ref.current = makeMutable(init);
  }
  return ref.current;
}

export function useMapper(fun, inputs = [], outputs = []) {
  useEffect(() => {
    const mapperId = startMapper(fun, inputs, outputs);
    return () => {
      stopMapper(mapperId);
    };
  }, []);
}

export function useEvent(handler) {
  const initRef = useRef(null);

  if (initRef.current === null) {
    initRef.current = new WorkletEventHandler(handler);
  }

  return initRef.current;
}

function prepareAnimation(animatedProp, lastAnimation, lastValue) {
  'worklet';
  function prepareAnimation(animatedProp, lastAnimation, lastValue) {
    if (Array.isArray(animatedProp)) {
      animatedProp.forEach((prop, index) =>
        prepareAnimation(
          prop,
          lastAnimation && lastAnimation[index],
          lastValue && lastValue[index]
        )
      );
      return animatedProp;
    }
    if (typeof animatedProp === 'object' && animatedProp.animation) {
      const animation = animatedProp;

      let value = animation.current;
      if (lastValue !== undefined) {
        if (typeof lastValue === 'object') {
          if (lastValue.value !== undefined) {
            // previously it was a shared value
            value = lastValue.value;
          } else if (lastValue.animation !== undefined) {
            // it was an animation before, copy its state
            value = lastAnimation.current;
          }
        } else {
          // previously it was a plan value, just set it as starting point
          value = lastValue;
        }
      }

      animation.callStart = timestamp => {
        animation.start(animation, value, timestamp, lastAnimation);
      };
    } else if (typeof animatedProp === 'object') {
      // it is a object
      Object.keys(animatedProp).forEach(key =>
        prepareAnimation(
          animatedProp[key],
          lastAnimation && lastAnimation[key],
          lastValue && lastValue[key]
        )
      );
    }
  }
  return prepareAnimation(animatedProp, lastAnimation, lastValue);
}

function runAnimations(animation, timestamp, key, result) {
  'worklet';
  function runAnimations(animation, timestamp, key, result) {
    if (Array.isArray(animation)) {
      result[key] = [];
      return animation.every((entry, index) =>
        runAnimations(entry, timestamp, index, result[key])
      );
    } else if (typeof animation === 'object' && animation.animation) {
      if (animation.callStart) {
        animation.callStart(timestamp);
        animation.callStart = null;
      }
      const finished = animation.animation(animation, timestamp);
      animation.timestamp = timestamp;
      if (finished) {
        animation.finished = true;
      }
      result[key] = animation.current;
      return finished;
    } else if (typeof animation === 'object') {
      result[key] = {};
      return Object.keys(animation).every(k =>
        runAnimations(animation[k], timestamp, k, result[key])
      );
    } else {
      result[key] = animation;
      return true;
    }
  }
  return runAnimations(animation, timestamp, key, result);
}

// TODO: recirsive worklets aren't supported yet
function isAnimated(prop) {
  'worklet';
  function isAnimated(prop) {
    if (Array.isArray(prop)) {
      return prop.some(isAnimated);
    }
    if (typeof prop === 'object') {
      if (prop.animation) {
        return true;
      }
      return Object.keys(prop).some(key => isAnimated(prop[key]));
    }
    return false;
  }
  return isAnimated(prop);
}

function styleDiff(oldStyle, newStyle) {
  'worklet';
  const diff = {};
  Object.keys(oldStyle).forEach(key => {
    if (newStyle[key] === undefined) {
      diff[key] = null;
    }
  });
  Object.keys(newStyle).forEach(key => {
    const value = newStyle[key];
    const oldValue = oldStyle[key];

    if (isAnimated(value)) {
      // do nothing
      return;
    }
    if (
      oldValue !== value &&
      JSON.stringify(oldValue) !== JSON.stringify(value)
    ) {
      // I'd use deep equal here but that'd take additional work and this was easier
      diff[key] = value;
      return;
    }
  });
  return diff;
}

function styleUpdater(viewTag, updater, state) {
  'worklet';
  const animations = state.animations || {};

  const newValues = updater() || {};
  let oldValues = state.last;

  // extract animated props
  let hasAnimations = false;
  Object.keys(animations).forEach(key => {
    const value = newValues[key];
    if (!isAnimated(value)) {
      delete animations[key];
    }
  });
  Object.keys(newValues).forEach(key => {
    const value = newValues[key];
    if (isAnimated(value)) {
      prepareAnimation(value, animations[key], oldValues[key]);
      animations[key] = value;
      hasAnimations = true;
    }
  });

  function frame(timestamp) {
    const { animations, last, isAnimationCancelled } = state;
    if (isAnimationCancelled) {
      state.isAnimationRunning = false;
      return;
    }

    const updates = {};
    let allFinished = true;
    Object.keys(animations).forEach(propName => {
      const finished = runAnimations(
        animations[propName],
        timestamp,
        propName,
        updates
      );
      if (finished) {
        last[propName] = updates[propName];
        delete animations[propName];
      } else {
        allFinished = false;
      }
    });

    if (Object.keys(updates).length) {
      _updateProps(viewTag.value, updates);
    }

    if (!allFinished) {
      requestAnimationFrame(frame);
    } else {
      state.isAnimationRunning = false;
    }
  }

  if (hasAnimations) {
    state.animations = animations;
    if (!state.isAnimationRunning) {
      state.isAnimationCancelled = false;
      state.isAnimationRunning = true;
      requestAnimationFrame(frame);
    }
  } else {
    state.isAnimationCancelled = true;
    state.animations = {};
  }

  // calculate diff
  const diff = styleDiff(oldValues, newValues);
  state.last = Object.assign({}, oldValues, newValues);

  if (Object.keys(diff).length !== 0) {
    _updateProps(viewTag.value, diff);
  }
}

export function useAnimatedStyle(updater) {
  const viewTag = useSharedValue(-1);

  const initRef = useRef(null);
  if (initRef.current === null) {
    const initial = updater();
    initRef.current = {
      initial,
      remoteState: makeRemote({ last: initial }),
      inputs: Object.values(updater._closure),
    };
  }
  const { initial, remoteState, inputs, outputs } = initRef.current;

  useMapper(() => {
    'worklet';
    styleUpdater(viewTag, updater, remoteState);
  }, inputs);

  return {
    viewTag,
    initial,
  };
}

// TODO: we should make sure that when useAP is used we are not assigning styles
// when you need styles to animated you should always use useAS
export const useAnimatedProps = useAnimatedStyle;

export function useDerivedValue(processor) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    initRef.current = {
      sharedValue: makeMutable(processor()),
      inputs: Object.values(processor._closure),
    };
  }

  const { sharedValue, inputs } = initRef.current;

  useMapper(
    () => {
      'worklet';
      sharedValue.value = processor();
    },
    inputs,
    [sharedValue]
  );

  return sharedValue;
}

export function useAnimatedGestureHandler(handlers) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    initRef.current = {
      context: makeRemote({}),
    };
  }
  const { context } = initRef.current;

  return useEvent(event => {
    'worklet';
    const UNDETERMINED = 0;
    const FAILED = 1;
    const BEGAN = 2;
    const CANCELLED = 3;
    const ACTIVE = 4;
    const END = 5;

    if (event.oldState === UNDETERMINED && handlers.onStart) {
      handlers.onStart(event, context);
    }
    if (event.state === ACTIVE && handlers.onActive) {
      handlers.onActive(event, context);
    }
    if (event.oldState === ACTIVE && event.state === END && handlers.onEnd) {
      handlers.onEnd(event, context);
    }
    if (
      event.oldState === ACTIVE &&
      event.state === FAILED &&
      handlers.onFail
    ) {
      handlers.onFail(event, context);
    }
    if (
      event.oldState === ACTIVE &&
      event.state === CANCELLED &&
      handlers.onCancel
    ) {
      handlers.onCancel(event, context);
    }
    if (event.oldState === ACTIVE && handlers.onFinish) {
      handlers.onFinish(
        event,
        context,
        event.state === CANCELLED || event.state === FAILED
      );
    }
  });
}
