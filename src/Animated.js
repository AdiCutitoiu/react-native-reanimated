import { Image, ScrollView, Text, View } from 'react-native';
import Easing from './Easing';
import AnimatedClock from './core/AnimatedClock';
import AnimatedValue from './core/AnimatedValue';
import AnimatedNode from './core/AnimatedNode';
import AnimatedCode from './core/AnimatedCode';
import * as base from './base';
import * as derived from './derived';
import createAnimatedComponent from './createAnimatedComponent';
import decay from './animations/decay';
import timing from './animations/timing';
import spring from './animations/spring';
import TimingAnimation from './animations/TimingAnimation';
import SpringAnimation from './animations/SpringAnimation';
import DecayAnimation from './animations/DecayAnimation';
import { custom } from './ReanimatedModule';
import {
  addWhitelistedNativeProps,
  addWhitelistedUIProps,
} from './ConfigHelper';
import backwardCompatibleAnimWrapper from './animations/backwardCompatibleAnimWrapper';
import {
  Transition,
  Transitioning,
  createTransitioningComponent,
} from './Transitioning';
import SpringUtils from './animations/SpringUtils';

const decayWrapper = backwardCompatibleAnimWrapper(decay, DecayAnimation);
const timingWrapper = backwardCompatibleAnimWrapper(timing, TimingAnimation);
const springWrapper = backwardCompatibleAnimWrapper(spring, SpringAnimation);
const Animated = {
  // components
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  Image: createAnimatedComponent(Image),
  ScrollView: createAnimatedComponent(ScrollView),
  Code: AnimatedCode,
  createAnimatedComponent,

  // classes
  Clock: AnimatedClock,
  Value: AnimatedValue,
  Node: AnimatedNode,

  // operations
  ...base,
  ...derived,

  // animations
  decay: decayWrapper,
  timing: timingWrapper,
  spring: springWrapper,
  SpringUtils,

  // configuration
  addWhitelistedNativeProps,
  addWhitelistedUIProps,

  custom,
};

export default Animated;

// operations
export * from './base';
export * from './derived';

import Worklet from './reanimated2/Worklet';
import SharedValue from './reanimated2/SharedValue';
import WorkletEventHandler from './reanimated2/WorkletEventHandler';

import {
  useWorklet,
  useEventWorklet,
  useAnimatedGestureHandler,
  useAnimatedProcessor,
  useSharedValue,
  useMapper,
  useAnimatedStyle,
  install,
} from './reanimated2/Hooks';
import RegistersState from './reanimated2/RegistersState';
import useSpring from './reanimated2/helpingHooks/Spring';

export {
  Easing,
  Transitioning,
  Transition,
  createTransitioningComponent,
  // classes
  AnimatedClock as Clock,
  AnimatedValue as Value,
  AnimatedNode as Node,
  // animations
  decayWrapper as decay,
  timingWrapper as timing,
  springWrapper as spring,
  SpringUtils,
  // Reanimated 2.0
  Worklet,
  SharedValue,
  WorkletEventHandler,
  useWorklet,
  useEventWorklet,
  useAnimatedProcessor,
  useAnimatedGestureHandler,
  useMapper,
  useSharedValue,
  useAnimatedStyle,
  RegistersState,
  useSpring,
  install,
};
