// @refresh reset
import React, { useEffect, useRef, useLayoutEffect, memo } from 'react';
import { View, findNodeHandle } from 'react-native';
import SharedValue from './SharedValue';
import Worklet from './Worklet';
import WorkletEventHandler from './WorkletEventHandler';
import NativeModule from './NativeReanimated';

function isShareable(obj) {
  if (obj instanceof SharedValue) {
    return true;
  }

  // We don't wrap array in SharedValue because we cannot override [] operator.
  // We add propery instead
  if (Array.isArray(obj)) {
    if (obj.sharedArray) {
      return true;
    }
  }

  if (obj instanceof SharedValue) {
    return true;
  }

  return false;
}

// returns [obj, release]
function makeShareable(obj) {
  const toRelease = [];

  if (isShareable(obj)) {
    return [obj, () => {}];
  }

  if (Array.isArray(obj)) {
    obj = obj.slice();
    let i = 0;
    for (let element of obj) {
      const [res, release] = makeShareable(element);
      obj[i] = res;
      toRelease.push(release);
      i++;
    }

    const sharedArray = SharedValue.create(obj);
    toRelease.push(() => {
      sharedArray.release();
    });

    obj.id = sharedArray.id;
    obj.sharedArray = sharedArray;
  } else if (typeof obj === 'object' && !(obj instanceof Worklet)) {
    obj = Object.assign({}, obj);

    for (let property in obj) {
      const [res, release] = makeShareable(obj[property]);
      obj[property] = res;
      toRelease.push(release);
    }
    obj = SharedValue.create(obj);
    toRelease.push(() => {
      obj.release();
    });
  } else {
    let workletHolder = null;
    if (typeof obj === 'function' && obj.isWorklet == null) {
      obj = new Worklet(obj);
      workletHolder = obj;
    }
    obj = SharedValue.create(obj);
    const release = obj.release.bind(obj);
    toRelease.push(function() {
      release();
      if (workletHolder != null) {
        workletHolder.release();
      }
    });
  }

  const release = () => {
    for (let rel of toRelease) {
      rel();
    }
  };

  return [obj, release];
}

function transformArgs(args) {
  const toRelease = [];
  for (let i = 0; i < args.length; i++) {
    const [sv, release] = makeShareable(args[i]);
    args[i] = sv;
    toRelease.push(release);
  }

  return () => {
    for (let release of toRelease) {
      release();
    }
  };
}

function commonCode(body, args, createRes) {
  const res = useRef(null);
  const releaseObj = useRef(null);

  const init = function() {
    let argsCopy = [];
    if (args !== undefined) {
      if (Array.isArray(args)) {
        argsCopy = isShareable(args) ? args : args.slice();
      } else if (typeof args === 'object' && args !== null) {
        if (isShareable(args)) {
          argsCopy = [args];
        } else {
          // force object copy operation
          argsCopy = [
            { ...args, __________reanimated_object_unreachable_field_name: 0 },
          ];
          delete argsCopy[0][
            '__________reanimated_object_unreachable_field_name'
          ];
        }
      }
    }
    let shouldReleaseWorklet = false;
    if (typeof body === 'function') {
      shouldReleaseWorklet = true;
      body = new Worklet(body);
    }
    const release = transformArgs(argsCopy);
    let releaseApplierHolder = { get: () => {} };

    res.current = createRes(releaseApplierHolder, body, argsCopy);

    res.current.start = res.current;
    res.current.startMapping = res.current;
    res.current.setListener = fun => {
      body.setListener(fun);
    };
    res.current.isWorklet = true;
    res.current.body = body;
    res.current.args = argsCopy;
    res.current.stop = () => {
      releaseApplierHolder.get();
    };
    return { shouldReleaseWorklet, releaseApplierHolder, release, body };
  };

  if (res.current == null) {
    releaseObj.current = init();
  }

  useEffect(() => {
    return () => {
      if (!releaseObj.current) return;
      console.log('clear common code');
      releaseObj.current.releaseApplierHolder.get();
      releaseObj.current.release();
      if (releaseObj.current.shouldReleaseWorklet) {
        releaseObj.current.body.release();
      }
      res.current = null;
    };
  }, []);

  return res.current;
}

export function useWorklet(body, args) {
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      releaseApplierHolder.get = body.apply(argsCopy);
    };
  });
}

export function useMapper(body, args) {
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      releaseApplierHolder.get = body.registerAsMapper(argsCopy);
    };
  });
}

export function useDerivedValue(body, inputs) {
  const initial = sanitize(body(unwrap(inputs)) || 0);
  const derived = useSharedValue(initial);
  const mapper = useMapper(
    (inputs, derived, body) => {
      'worklet';
      derived.value = body(Reanimated.myunwrap(inputs));
    },
    [inputs, derived, body]
  );
  mapper();
  return derived;
}

export function useAnimatedProcessor(body, inputs, outputs) {
  const mapper = useMapper(
    (inputs, outputs, body) => {
      'worklet';
      body(Reanimated.myunwrap(inputs), outputs);
    },
    [inputs, outputs, body]
  );
  mapper();
}

export function useAnimatedEventHandler(handler, argsDict) {
  const eventWorklet = useEventWorklet(
    function(handler, args) {
      'worklet';
      handler(this.event, args, Reanimated.memory(this));
    },
    [handler, argsDict]
  );
  return eventWorklet;
}

export function useAnimatedGestureHandler(handlers, argsDict) {
  const eventWorklet = useEventWorklet(
    function(handlers, args) {
      'worklet';
      const event = this.event;
      const context = Reanimated.memory(this);

      const UNDETERMINED = 0;
      const FAILED = 1;
      const BEGAN = 2;
      const CANCELLED = 3;
      const ACTIVE = 4;
      const END = 5;

      if (event.oldState === UNDETERMINED && handlers.onStart) {
        handlers.onStart(event, args, context);
      }
      if (event.state === ACTIVE && handlers.onActive) {
        handlers.onActive(event, args, context);
      }
      if (event.oldState === ACTIVE && event.state === END && handlers.onEnd) {
        handlers.onEnd(event, args, context);
      }
      if (
        event.oldState === ACTIVE &&
        event.state === FAILED &&
        handlers.onFail
      ) {
        handlers.onFail(event, args, context);
      }
      if (
        event.oldState === ACTIVE &&
        event.state === CANCELLED &&
        handlers.onCancel
      ) {
        handlers.onCancel(event, args, context);
      }
      if (event.oldState === ACTIVE && handlers.onFinish) {
        handlers.onFinish(
          event,
          args,
          context,
          event.state === CANCELLED || event.state === FAILED
        );
      }
    },
    [handlers, argsDict]
  );
  return eventWorklet;
}

export function useEventWorklet(body, args) {
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return new WorkletEventHandler(body, argsCopy);
  });
}

export function useSharedValue(initial) {
  const sv = useRef(null);
  let release = () => {};

  const init = () => {
    [sv.current, release] = makeShareable(initial);
    return release;
  };

  if (sv.current == null) {
    release = init();
  }

  useEffect(() => {
    return () => {
      if (sv.current) {
        release();
        sv.current = null;
      }
    };
  }, []);

  return sv.current;
}

function unwrap(obj) {
  if (Array.isArray(obj)) {
    const res = [];
    for (let ele of obj) {
      res.push(unwrap(ele));
    }
    return res;
  }

  // I don't understand why I need to do this but some objects have value prop and other
  // don't.
  const value = obj.initialValue === undefined ? obj : obj.initialValue;
  if (typeof value === 'object') {
    const res = {};
    Object.keys(value).forEach(propName => {
      if (propName !== 'id') {
        res[propName] = unwrap(value[propName]);
      }
    });
    return res;
  }

  return value;
}

function sanitize(obj) {
  if (Array.isArray(obj)) {
    const res = [];
    for (let ele of obj) {
      res.push(sanitize(ele));
    }
    return res;
  }

  const value =
    obj === null || obj === undefined || obj.value === undefined
      ? obj
      : obj.value;
  if (typeof value === 'object' && value !== null) {
    if (value.animation) {
      return sanitize(value.toValue);
    }
    const res = {};
    Object.keys(value).forEach(key => {
      if (key !== 'id') {
        res[key] = sanitize(value[key]);
      }
    });
    return res;
  }
  return value;
}

const styleUpdater = new Worklet(function(input) {
  'worklet';
  const memory = Reanimated.memory(this);
  const animations = memory.animations || {};
  const { viewTag, isInstalled } = input;

  const newValues = input.body(Reanimated.myunwrap(input.input)) || {};
  let oldValues = memory.last || Reanimated.myunwrap(input.initial);

  function isAnimated(prop) {
    if (typeof prop === 'object') {
      if (prop.animation) {
        return true;
      }
      return Object.keys(prop).some(key => isAnimated(prop[key]));
    }
    if (Array.isArray(prop)) {
      return prop.some(isAnimated);
    }
    return false;
  }

  function styleDiff(oldStyle, newStyle) {
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
      animatedProp.finished = false;
      animatedProp.velocity = 0;
      if (lastValue !== undefined) {
        if (typeof lastValue === 'object') {
          if (lastValue.value !== undefined) {
            // previously it was a shared value
            animatedProp.current = lastValue.value;
          } else if (lastValue.animation !== undefined) {
            // it was an animation before, copy its state
            animatedProp.current = lastAnimation.current;
            animatedProp.velocity = lastAnimation.velocity;
            animatedProp.timestamp = lastAnimation.timestamp;
          }
        } else {
          // previously it was a plan value, just set it as starting point
          animatedProp.current = lastValue;
        }
      }
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

  function runAnimations(animation, timestamp, key, result) {
    if (Array.isArray(animation)) {
      result[key] = [];
      return animation.every((entry, index) =>
        runAnimations(entry, timestamp, index, result[key])
      );
    } else if (typeof animation === 'object' && animation.animation) {
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

  function frame(timestamp) {
    const { animations, last, isAnimationCancelled } = memory;
    if (isAnimationCancelled || !isInstalled.value) {
      memory.isAnimationRunning = false;
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
      _requestAnimationFrame(frame);
    } else {
      memory.isAnimationRunning = false;
    }
  }

  if (hasAnimations) {
    memory.animations = animations;
    if (!memory.isAnimationRunning) {
      memory.isAnimationCancelled = false;
      memory.isAnimationRunning = true;
      _requestAnimationFrame(frame);
    }
  } else {
    memory.isAnimationCancelled = true;
    memory.animations = {};
  }

  // calculate diff
  const diff = styleDiff(oldValues, newValues);
  memory.last = Object.assign({}, oldValues, newValues);

  if (Object.keys(diff).length !== 0) {
    _updateProps(input.viewTag.value, diff);
  }
});

export function useAnimatedProps(body, input) {
  return useAnimatedStyle(body, input);
}

export function useAnimatedStyle(body, input) {
  const viewTag = useSharedValue(-1);

  const isInstalled = useSharedValue(1);
  const initial = sanitize(body(unwrap(input)) || {});

  const mapper = useMapper(styleUpdater, [
    {
      input,
      initial,
      body,
      viewTag,
      isInstalled,
    },
    {},
  ]);

  useEffect(() => {
    mapper.startMapping();
    return () => {
      isInstalled.set(0);
    };
  }, []);

  return {
    viewTag,
    initial,
  };
}

export function removeSharedObjsAndArrays(obj) {
  if (Array.isArray(obj)) {
    const res = [];
    for (let element of obj) {
      res.push(removeSharedObjsAndArrays(element));
    }
    return res;
  }

  if (typeof obj === 'object') {
    if (obj instanceof SharedValue) {
      if (obj.initialValue.isObject) {
        const res = {};
        for (let propName of obj.initialValue.propNames) {
          res[propName] = removeSharedObjsAndArrays(obj[propName]);
        }
        return res;
      }
      return obj;
    } else {
      let res = {};
      for (let propName of Object.keys(obj)) {
        res[propName] = removeSharedObjsAndArrays(obj[propName]);
      }
      return res;
    }
  }

  return obj;
}

export function install(path, val) {
  if (
    !['string', 'number', 'boolean', 'function'].includes(typeof val) &&
    val !== undefined
  ) {
    return;
  }
  if (typeof val === 'function') {
    NativeModule.workletEval(path, `(${val.asString})`);
    return;
  }
  if (val === undefined) {
    val = '{}';
  } else {
    val = typeof val === 'string' ? `"${val}"` : val.toString();
  }
  NativeModule.workletEval(path, val);
}
