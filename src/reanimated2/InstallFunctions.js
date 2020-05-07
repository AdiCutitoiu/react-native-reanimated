export function installFunctions(innerNativeModule) {
  function install(path, fun) {
    innerNativeModule.workletEval(path, `(${fun.asString})`);
  }

  /**
   * install assign
   * updates every field in [left] object with values for [right] object(for those which exist in both)
   */
  install('Reanimated.assign', function(left, right) {
    'worklet';
    if (right == null) return;
    if (typeof right === 'object' && !right.value) {
      for (let key of Object.keys(right)) {
        if (left[key]) {
          Reanimated.assign(left[key], right[key]);
        }
      }
    } else if (Array.isArray(right)) {
      for (let i; i < right.length; i++) {
        Reanimated.assign(left[i], right[i]);
      }
    } else {
      if (left.set) {
        if (right.value) {
          left.set(right.value);
        } else {
          left.set(right);
        }
      }
    }
  });

  // would be great if we could avoid this
  install('Reanimated.myunwrap', function(obj) {
    'worklet';
    if (Array.isArray(obj)) {
      const res = [];
      for (let ele of obj) {
        res.push(Reanimated.myunwrap(ele));
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
          res[propName] = Reanimated.myunwrap(value[propName]);
        }
      });
      return res;
    }

    return value;
  });

  install('Reanimated.cancelAnimation', function(value) {
    'worklet';
    const previousAnimation = value._animation;
    if (previousAnimation) {
      previousAnimation.cancelled = true;
      value._animation = null;
    }
  });
  global.Reanimated.cancelAnimation = function(value) {
    // do nothing
  };

  install('Reanimated.setter', function(value) {
    'worklet';
    const previousAnimation = this._animation;
    if (previousAnimation) {
      previousAnimation.cancelled = true;
      this._animation = null;
    }
    if (typeof value === 'object' && value !== null && value.animation) {
      // animated set
      const animation = value;
      const step = timestamp => {
        if (animation.cancelled) {
          animation.callback && animation.callback(false /* finished */);
          return;
        }
        const finished = value.animation(animation, timestamp);
        animation.timestamp = timestamp;
        this._value = animation.current;
        if (finished) {
          animation.callback && animation.callback(true /* finished */);
        } else {
          _requestAnimationFrame(step);
        }
      };

      if (previousAnimation) {
        animation.current = previousAnimation.current;
        animation.velocity = previousAnimation.velocity;
        animation.timestamp = previousAnimation.timestamp;
      } else {
        animation.current = this.value;
        animation.velocity = 0;
      }

      this._animation = animation;
      _requestAnimationFrame(step);
    } else {
      this._value = value;
    }
  });

  install('Reanimated.delay', function(delayMs, nextAnimation) {
    'worklet';

    function delay(animation, now) {
      const { startTime, started } = animation;

      if (!startTime) {
        animation.startTime = now;
        return false;
      }
      if (now - startTime > delayMs) {
        if (!started) {
          nextAnimation.current = animation.current;
          nextAnimation.velocity = animation.velocity;
          nextAnimation.timestamp = animation.timestamp;
        }
        const finished = nextAnimation.animation(nextAnimation, now);
        nextAnimation.timestamp = now;
        animation.current = nextAnimation.current;
        animation.velocity = nextAnimation.velocity;
        return finished;
      }
      return false;
    }
    return {
      animation: delay,
      velocity: 0,
      started: false,
      current: nextAnimation.current,
    };
  });
  global.Reanimated.delay = (delayMs, nextAnimation) => {
    return nextAnimation;
  };

  install('Reanimated.withTiming', function(toValue, userConfig, callback) {
    'worklet';

    function inOut(easing) {
      return t => {
        if (t < 0.5) {
          return easing(t * 2) / 2;
        }
        return 1 - easing((1 - t) * 2) / 2;
      };
    }

    function quad(t) {
      return t * t;
    }

    const config = {
      duration: 300,
      easing: inOut(quad),
      ...userConfig,
    };

    function timing(animation, now) {
      const { progress, startTime, current } = animation;

      if (!startTime) {
        animation.startTime = now;
        return false;
      }

      const runtime = now - startTime;

      if (runtime >= config.duration) {
        animation.current = toValue;
        return true;
      }

      const newProgress = config.easing(runtime / config.duration);

      const dist =
        ((toValue - current) * (newProgress - progress)) / (1 - progress);
      animation.current += dist;
      animation.progress = newProgress;
      return false;
    }
    return {
      animation: timing,
      velocity: 0,
      progress: 0,
      current: toValue,
      callback,
    };
  });
  global.Reanimated.withTiming = (toValue, config = undefined) => {
    return toValue;
  };

  install('Reanimated.withSpring', function(toValue, userConfig, callback) {
    'worklet';

    const config = {
      damping: 10,
      mass: 1,
      stiffness: 100,
      overshootClamping: false,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
      ...userConfig,
    };

    function spring(animation, now) {
      const { timestamp = now, current, velocity } = animation;

      const deltaTime = Math.min(now - timestamp, 64);

      const c = config.damping;
      const m = config.mass;
      const k = config.stiffness;

      const v0 = -velocity;
      const x0 = toValue - current;

      const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
      const omega0 = Math.sqrt(k / m); // undamped angular frequency of the oscillator (rad/ms)
      const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay

      const t = deltaTime / 1000;

      const sin1 = Math.sin(omega1 * t);
      const cos1 = Math.cos(omega1 * t);

      // under damped
      const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
      const underDampedFrag1 =
        underDampedEnvelope *
        (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);

      const underDampedPosition = toValue - underDampedFrag1;
      // This looks crazy -- it's actually just the derivative of the oscillation function
      const underDampedVelocity =
        zeta * omega0 * underDampedFrag1 -
        underDampedEnvelope *
          (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

      // critically damped
      const criticallyDampedEnvelope = Math.exp(-omega0 * t);
      const criticallyDampedPosition =
        toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

      const criticallyDampedVelocity =
        criticallyDampedEnvelope *
        (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);

      const isOvershooting = () => {
        if (config.overshootClamping && config.stiffness != 0) {
          return current < toValue ? current > toValue : current < toValue;
        } else {
          return false;
        }
      };

      const isVelocity = Math.abs(velocity) < config.restSpeedThreshold;
      const isDisplacement =
        config.stiffness == 0 ||
        Math.abs(toValue - current) < config.restDisplacementThreshold;

      if (zeta < 1) {
        animation.current = underDampedPosition;
        animation.velocity = underDampedVelocity;
      } else {
        animation.current = criticallyDampedPosition;
        animation.velocity = criticallyDampedVelocity;
      }

      if (isOvershooting() || (isVelocity && isDisplacement)) {
        if (config.stiffness != 0) {
          animation.velocity = 0;
          animation.current = toValue;
        }
        return true;
      }
    }

    return {
      animation: spring,
      velocity: config.velocity || 0,
      current: toValue,
      callback,
    };
  });
  global.Reanimated.withSpring = (toValue, config = undefined) => {
    return toValue;
  };

  /**
   * install withWorklet
   * connects shared double(sd) with worklet
   * passed worklet keeps changing [sd] value until it is finished or [sd].set is called
   * IMPORTANT: first worklet parameter must be a binded [sd]
   * IMPORTANT: when setting binded [sd] inside provided worklet use forceSet instead of set
   * IMPORTANT: first argument to the worklet passed as an argument here is provided automatically(and that's [sd])
   */
  install('Reanimated.withWorklet', function(worklet, params, initial) {
    'worklet';
    params = [0].concat(params);
    return {
      value: { applierId: worklet.start.apply(undefined, params) },
    };
  });

  global.Reanimated.withWorklet = (worklet, params, initial) => {
    return initial ? initial : 0;
  };

  // install withWorkletCopy
  install('Reanimated.withWorkletCopy', function(worklet, params, initial) {
    'worklet';
    params = [0].concat(params);
    return {
      value: { applierId: worklet.startTentatively.apply(undefined, params) },
    };
  });

  global.Reanimated.withWorkletCopy = (worklet, params, initial) => {
    return initial ? initial : 0;
  };

  // install memory
  install('Reanimated.memory', function(context) {
    'worklet';
    const applierId = context.applierId;
    if (!Reanimated.container[applierId]) {
      Reanimated.container[applierId] = {};
    }
    return Reanimated.container[applierId];
  });

  install('console.log', function(data) {
    'worklet';

    function stringRepresentation(obj) {
      if (Array.isArray(obj)) {
        let result = '[]';
        if (obj.length > 0) {
          result = '[';
          for (let item of obj) {
            const next = item.__baseType === true ? item.value : item;
            result += stringRepresentation(next);
            result += ',';
          }
          result = result.substr(0, result.length - 1) + ']';
        }
        return result;
      } else if (typeof obj === 'object' && obj.__baseType === undefined) {
        const keys = Object.keys(obj);
        let result = '{}';
        if (keys.length > 0) {
          result = '{';
          for (let key of keys) {
            if (key === 'id') {
              continue;
            }
            const next =
              obj[key].__baseType === true ? obj[key].value : obj[key];
            result += key + ':' + stringRepresentation(next);
            result += ',';
          }
          result = result.substr(0, result.length - 1) + '}';
        }
        return result;
      }
      return obj.__baseType === true ? obj.value : obj;
    }
    _log(stringRepresentation(data));
  });

  // clamp
  const clamp = function(x, values) {
    'worklet';
    const diffs = values.map(it => Math.abs(it - x));
    const index = diffs.indexOf(Math.min.apply(Math, diffs));
    return values[index];
  };

  global.Reanimated.clamp = clamp;
  install('Reanimated.clamp', clamp);

  // interpolate
  const internalInterpolate = function(x, l, r, ll, rr, type) {
    'worklet';
    if (r - l === 0) return ll;
    const progress = (x - l) / (r - l);
    const val = ll + progress * (rr - ll);
    const coef = rr >= ll ? 1 : -1;

    if (coef * val < coef * ll || coef * val > coef * rr) {
      switch (type) {
        case Extrapolate.IDENTITY:
          return x;
        case Extrapolate.CLAMP:
          if (coef * val < coef * ll) {
            return ll;
          }
          return rr;
        case Extrapolate.EXTEND:
        default:
          return val;
      }
    }
    return val;
  };
  global.Reanimated.internalInterpolate = internalInterpolate;
  install('Reanimated.internalInterpolate', internalInterpolate);

  const interpolate = function(x, input, output, type) {
    'worklet';
    const length = input.length;
    let narrowedInput = [];
    if (x < input[0]) {
      narrowedInput = [input[0], input[1], output[0], output[1]];
    } else if (x > input[length - 1]) {
      narrowedInput = [
        input[length - 2],
        input[length - 1],
        output[length - 2],
        output[length - 1],
      ];
    } else {
      for (let i = 1; i < length; ++i) {
        if (x <= input[i]) {
          narrowedInput = [input[i - 1], input[i], output[i - 1], output[i]];
          break;
        }
      }
    }
    return Reanimated.internalInterpolate.apply(
      Reanimated,
      [x].concat(narrowedInput).concat(type)
    );
  };

  global.Reanimated.interpolate = interpolate;
  install('Reanimated.interpolate', interpolate);
}

export function installConstants(innerNativeModule) {
  const install = (path, obj) => {
    // in hermes global is binded to this in eval
    const globalAlias = Platform.OS === 'android' ? 'this' : 'global';
    eval(globalAlias + '.' + path + '=' + obj);
    innerNativeModule.workletEval(path, obj);
  };

  // event worklet constants
  install('Reanimated', '{}');
  install('Reanimated.container', '{}');
  install('Reanimated.START', '2');
  install('Reanimated.ACTIVE', '4');
  install('Reanimated.END', '5');

  // Extrapolate
  install('Extrapolate', '{}');
  install('Extrapolate.EXTEND', '0');
  install('Extrapolate.CLAMP', '1');
  install('Extrapolate.IDENTITY', '2');
}
