import Animated, {
  useSharedValue,
  useWorklet,
  useEventWorklet,
  Worklet,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState, useRef } from 'react';

export default function RotatingSquare(props) {
  const randomWidth = useSharedValue(1);
  const randomTranslate = useSharedValue(100);

  const style = useAnimatedStyle(
    input => {
      'worklet';
      const { randomWidth, randomTranslate } = input;

      return {
        transform: [
          {
            translateX: Reanimated.withSpring(randomTranslate),
          },
        ],
        width: Reanimated.withSpring(Math.round(randomWidth * 120)),
        // opacity: Reanimated.withSpring(randomOpacity),
      };
    },
    { randomWidth, randomTranslate }
  );

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
          { width: 1, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomTranslate.set(Math.random() * 200);
          randomWidth.set(Math.random());
        }}
      />
    </View>
  );
}
