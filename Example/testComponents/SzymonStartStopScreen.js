import Animated, {
  useSharedValue,
  useWorklet,
  useEventWorklet,
  useMapper,
  Worklet,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState, useRef } from 'react';

export default function RotatingSquare(props) {
  // const randomWidth = useSharedValue(1);
  // const randomTranslate = useSharedValue(100);
  const randomOpacity = useSharedValue(1);
  const anything = useSharedValue(1);

  const style = useAnimatedStyle(
    input => {
      'worklet';
      const { randomWidth, randomTranslate } = input;
      const { randomOpacity } = input;

      return {
        // transform: [
        //   {
        //     translateX: Reanimated.withSpring(randomTranslate),
        //   },
        // ],
        // width: Reanimated.withSpring(Math.round(randomWidth * 120)),
        opacity: randomOpacity,
      };
    },
    { randomOpacity }
    // { randomWidth, randomTranslate }
  );

  const mapper = useMapper(
    (input, output) => {
      'worklet';
      output.randomOpacity.value = Reanimated.withSpring(Math.random());
    },
    [{ anything }, { randomOpacity }]
  );
  mapper();

  return (
    <View
      style={{
        flex: 1,
        borderColor: 'black',
        borderWidth: 2,
        flexDirection: 'column',
      }}>
      <Animated.View
        style={[
          { width: 100, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          // randomTranslate.set(Math.random() * 200);
          // randomWidth.set(Math.random());
          anything.set(Math.random());
        }}
      />
    </View>
  );
}
