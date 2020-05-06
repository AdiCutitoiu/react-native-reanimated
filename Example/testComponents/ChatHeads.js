import React from 'react';
import { Text, View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useWorklet,
  useEventWorklet,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  useAnimatedProcessor,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import ReanimatedModule from '../../src/ReanimatedModule';

const { width, height } = Dimensions.get('window');

function ChatHeads({ followers, children }) {
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
      onEnd: (event, params) => {
        'worklet';
        const width = params.width.value - 100 - 40; // minus margins & width
        const height = params.height.value - 100 - 40; // minus margins & height
        const toss = 0.2;
        function clamp(value, min, max) {
          return Math.min(Math.max(value, min), max);
        }
        const targetX = clamp(
          params.transX.value + toss * event.velocityX,
          0,
          width
        );
        const targetY = clamp(
          params.transY.value + toss * event.velocityY,
          0,
          height
        );

        const top = targetY;
        const bottom = height - targetY;
        const left = targetX;
        const right = width - targetX;
        const minDistance = Math.min(top, bottom, left, right);
        let snapX = targetX;
        let snapY = targetY;
        console.log(
          'DDD' +
            JSON.stringify([
              params.transX.value,
              params.transY.value,
              targetX,
              targetY,
              top,
              bottom,
              left,
              right,
            ])
        );
        switch (minDistance) {
          case top:
            snapY = 0;
            break;
          case bottom:
            snapY = height;
            break;
          case left:
            snapX = 0;
            break;
          case right:
            snapX = width;
            break;
        }
        params.transX.value = Reanimated.withSpring(snapX, {
          velocity: event.velocityX,
        });
        params.transY.value = Reanimated.withSpring(snapY, {
          velocity: event.velocityY,
        });
      },
    },
    { transX, transY, width, height }
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

  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.length > 1 && (
        <Followers
          children={childrenArray.slice(1)}
          transX={transX}
          transY={transY}
        />
      )}
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        onHandlerStateChange={gestureHandler}>
        <Animated.View style={[styles.headContainer, stylez]}>
          {childrenArray[0]}
        </Animated.View>
      </PanGestureHandler>
    </>
  );
}

function Followers({ transX, transY, children }) {
  const myTransX = useSharedValue(Math.random() * 10);
  const myTransY = useSharedValue(Math.random() * 10);

  useAnimatedProcessor(
    ({ transX, transY }, { myTransX, myTransY }) => {
      'worklet';
      myTransX.value = Reanimated.withSpring(transX);
      myTransY.value = Reanimated.withSpring(transY);
    },
    { transX, transY },
    { myTransX, myTransY }
  );

  const stylez = useAnimatedStyle(
    ({ myTransX, myTransY }) => {
      'worklet';
      return {
        transform: [
          {
            translateX: myTransX,
          },
          {
            translateY: myTransY,
          },
        ],
      };
    },
    {
      myTransX,
      myTransY,
    }
  );

  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.length > 1 && (
        <Followers
          children={childrenArray.slice(1)}
          transX={myTransX}
          transY={myTransY}
        />
      )}
      <Animated.View style={[styles.headContainer, stylez]}>
        {childrenArray[0]}
      </Animated.View>
    </>
  );
}

function Main() {
  return (
    <View style={{ flex: 1, margin: 50 }}>
      <ChatHeads>
        <View style={[styles.head, { backgroundColor: 'black' }]} />
        <View style={[styles.head, { backgroundColor: 'blue' }]} />
        <View style={[styles.head, { backgroundColor: 'green' }]} />
        <View style={[styles.head, { backgroundColor: 'yellow' }]} />
      </ChatHeads>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    width: 40,
    height: 40,
  },
  headContainer: {
    position: 'absolute',
  },
});

export default Main;
