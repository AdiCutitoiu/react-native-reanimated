import React from 'react';
import { Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate2,
  Extrapolate,
} from 'react-native-reanimated';
//import { Feather as Icon } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
const size = 50;

export default ({ progress, y }) => {
  const style = useAnimatedStyle(() => {
    return {
      opacity: interpolate2(
        progress.value,
        [0, 0.1],
        [1, 0],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          translateX: interpolate2(
            progress.value,
            [0, 0.4],
            [width - size - 8, 0]
          ),
        },
        {
          translateY: y.value - size / 2,
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}>
      <Text>(</Text>
      {/*<Icon name="chevron-left" color="black" size={40} />*/}
    </Animated.View>
  );
};
