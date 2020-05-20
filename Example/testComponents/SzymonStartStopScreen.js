import Animated, {
  useSharedValue,
  useMapper,
  withTiming,
  withSpring,
  delay,
  loop,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { View, Button } from 'react-native';
import React, { useState, useRef } from 'react';

const wtf = { a: 1 };

export default function RotatingSquare(props) {
  const randomWidth = useSharedValue(10);
  // const randomTranslate = useSharedValue(100);
  // const randomOpacity = useSharedValue(50);
  // const anything = useSharedValue(1);
  const [enabled, setEnabled] = useState(false);

  // const style = useAnimatedStyle(() => {
  //   'worklet';
  //   return {
  //     width: enabled ? 300 : 100,
  //   };
  // });

  // const width = useSharedValue(20);

  // useMapper(() => {
  //   'worklet';
  //   _log('mapper ' + ss.value);
  // }, [ss]);

  const style = useAnimatedStyle(() => {
    _log('helo');
    return {
      width: loop(withTiming(randomWidth.value)),
    };
  });

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
          // width.value = Math.random() * 200 + 20;
          // randomTranslate.set(Math.random() * 200);
          randomWidth.value = Math.random() * 350;
          // anything.set(Math.random());
        }}
      />
    </View>
  );
}
