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
    console.log('init common code');
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
  console.log('useWorklet');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      console.log('startAnimation');
      releaseApplierHolder.get = body.apply(argsCopy);
    };
  });
}

export function useMapper(body, args) {
  console.log('useMapper');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return () => {
      releaseApplierHolder.get = body.registerAsMapper(argsCopy);
    };
  });
}

export function useEventWorklet(body, args) {
  console.log('useEventWorklet');
  return commonCode(body, args, (releaseApplierHolder, body, argsCopy) => {
    return new WorkletEventHandler(body, argsCopy);
  });
}

export function useSharedValue(initial) {
  console.log('useShared');
  const sv = useRef(null);
  let release = () => {};

  const init = () => {
    console.log('init');
    [sv.current, release] = makeShareable(initial);
    return release;
  };

  if (sv.current == null) {
    release = init();
  }

  useEffect(() => {
    console.log('sharedValue useEffect');

    return () => {
      if (sv.current) {
        release();
        sv.current = null;
      }
      console.log('clear');
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

export function ReanimatedView(props) {
  const animatedStyle = props.style.filter(
    style => style.viewTag !== undefined
  );
  const processedStyle = props.style.map(style => {
    if (style.viewTag) {
      // animated
      return style.initial;
    } else {
      return style;
    }
  });

  const ref = useRef(null);
  useEffect(() => {
    const viewTag = findNodeHandle(ref.current);
    animatedStyle.forEach(style => {
      style.viewTag.set(viewTag);
    });
  }, [ref]);

  return <View {...props} style={processedStyle} ref={ref} />;
}

const animationUpdater7 = new Worklet(function(viewTag, styleApplierId) {
  'worklet';
  const styleUpdaterMemory = Reanimated.container[styleApplierId.value];
  const { animations, last } = styleUpdaterMemory;

  function runAnimations(animation, key, result) {
    if (Array.isArray(animation)) {
      result[key] = [];
      return animation.every((entry, index) =>
        runAnimations(entry, index, result[key])
      );
    } else if (typeof animation === 'object' && animation.animation) {
      const finished = animation.animation(animation);
      if (finished) {
        animation.finished = true;
      }
      result[key] = animation.current;
      return finished;
    } else if (typeof animation === 'object') {
      result[key] = {};
      return Object.keys(animation).every(k =>
        runAnimations(animation[k], k, result[key])
      );
    } else {
      result[key] = animation;
      return true;
    }
  }

  const updates = {};
  let allFinished = true;
  Object.keys(animations).forEach(propName => {
    const finished = runAnimations(animations[propName], propName, updates);
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
  return allFinished;
});

const styleUpdater7 = new Worklet(function(input, applierId) {
  'worklet';
  const memory = Reanimated.memory(this);
  const animations = memory.animations || {};

  // would be great if we could avoid this
  function unwrap(obj) {
    if (Array.isArray(obj)) {
      const res = [];
      for (let ele of obj) {
        res.push(unwrap(ele));
      }
      return res;
    }

    // I don't understand why I need to do this but some objects have value and others
    // don't.
    const value = obj.value === undefined ? obj : obj.value;
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

  const newValues = input.body(unwrap(input.input));
  let oldValues = memory.last || unwrap(input.initial);

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

  if (hasAnimations) {
    memory.animations = animations;
    applierId.set(this.applierId);
    input.animation.start();
  } else {
    input.animation.stop();
    memory.animations = {};
  }

  // calculate diff
  const diff = styleDiff(oldValues, newValues);
  memory.last = Object.assign({}, oldValues, newValues);

  if (Object.keys(diff).length !== 0) {
    console.log('UP ' + JSON.stringify(diff));
    _updateProps(input.viewTag.value, diff);
  }
});

export function useAnimatedStyle(body, input) {
  const viewTag = useSharedValue(-1);
  const sharedBody = useSharedValue(body);
  const sharedInput = useSharedValue(input);
  const wtf = useSharedValue(-1);
  const animation = useWorklet(animationUpdater7, [viewTag, wtf]);

  console.log('DDDD', unwrap(input));
  const initial = sanitize(body(unwrap(input)));

  const sharedInitial = useSharedValue(initial);

  const mapper = useMapper(styleUpdater7, [
    {
      input: sharedInput,
      initial: sharedInitial,
      body: sharedBody,
      animation,
      viewTag,
    },
    wtf,
  ]);

  useEffect(() => {
    mapper.startMapping();
  }, []);

  return {
    viewTag,
    mapper,
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
