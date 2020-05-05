import React from 'react';
import { Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useWorklet,
  useEventWorklet,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import ReanimatedModule from '../../src/ReanimatedModule';
import { useAnimatedStyle } from '../../src/reanimated2/Hooks';

function DragTest() {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler(
    {
      onStart: (_, params, ctx) => {
        'worklet';
        ctx.startX = params.transX.value;
        ctx.startY = params.transY.value;
      },
      onActive: (event, params, ctx) => {
        'worklet';
        params.transX.value = ctx.startX + event.translationX;
        params.transY.value = ctx.startY + event.translationY;
      },
      onEnd: (_, params) => {
        'worklet';
        params.transX.value = Reanimated.withSpring(0);
        params.transY.value = Reanimated.withSpring(0);
      },
    },
    { transX, transY }
  );

  const stylez = useAnimatedStyle(
    ({ transX, transY }) => {
      'worklet';
      return {
        transform: [
          {
            translateX: transX,
          },
          {
            translateY: transY,
          },
        ],
      };
    },
    {
      transX,
      transY,
    }
  );

  return (
    <View style={{ flex: 1, margin: 50 }}>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        onHandlerStateChange={gestureHandler}>
        <Animated.View
          style={[
            {
              width: 40,
              height: 40,
              backgroundColor: 'black',
            },
            stylez,
          ]}
        />
      </PanGestureHandler>
    </View>
  );
}

export default DragTest;
