import Animated, {
  useSharedValue,
  useWorklet,
  useEventWorklet,
  Worklet,
  useAnimatedStyle,
  ReanimatedView,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState, useRef } from 'react';

export default function RotatingSquare(props) {
  const randomOpacity = useSharedValue(1);
  const randomTranslate = useSharedValue(100);

  const style = useAnimatedStyle(
    input => {
      'worklet';
      const { randomOpacity, randomTranslate } = input;

      return {
        transform: [
          {
            translateX: Reanimated.withSpring(randomTranslate),
          },
        ],
        width: Reanimated.withSpring(Math.round(randomOpacity * 120)),
        // opacity: Reanimated.withSpring(randomOpacity),
      };
    },
    { randomOpacity, randomTranslate }
  );

  return (
    <View
      style={{
        flex: 1,
        borderColor: 'black',
        borderWidth: 2,
        flexDirection: 'column',
      }}>
      <ReanimatedView
        style={[
          { width: 80, height: 80, backgroundColor: 'black', margin: 30 },
          style,
        ]}
      />
      <Button
        title="toggle"
        onPress={() => {
          randomTranslate.set(Math.random() * 200);
          randomOpacity.set(Math.random());
        }}
      />
    </View>
  );
}
