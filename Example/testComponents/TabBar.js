import React from 'react';
import Animated, {
  useSharedValue,
  useEventWorklet,
  useAnimatedProcessor,
  useAnimatedStyle,
  useDerivedValue,
  useSpring,
  useMapper,
} from 'react-native-reanimated';
import {
  View,
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCoffee,
  faTrash,
  faUser,
  faList,
  faReply,
} from '@fortawesome/free-solid-svg-icons';
import Svg, { Path } from 'react-native-svg';
import * as shape from 'd3-shape';

const { width, height } = Dimensions.get('window');

let tabs = [
  {
    name: 'coffee',
    item: faCoffee,
  },
  {
    name: 'list',
    item: faList,
  },
  {
    name: 'reply',
    item: faReply,
  },
  {
    name: 'trash',
    item: faTrash,
  },
  {
    name: 'user',
    item: faUser,
  },
];

const tabWidth = width / tabs.length;

const getPath = () => {
  const tab = shape.line().curve(shape.curveBasis)([
    [0, 0],
    [tabWidth / 4, 0],
    [tabWidth / 2, 8],
    [tabWidth, 80],
    [(tabWidth / 2) * 3, 8],
    [(tabWidth / 4) * 7, 0],
    [tabWidth * 2, 0],
  ]);
  return `${tab}`;
};
const d = getPath();

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 64,
    zIndex: 2,
  },
  activeIcon: {
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

function Button({
  item,
  index,
  activeIndex,
  width,
  position,
  indicatorPosition,
}) {
  const staticIconStyle = useAnimatedStyle(
    ({ position, indicatorPosition, width }) => {
      'worklet';
      const visibility = Reanimated.interpolate(
        indicatorPosition,
        [
          position - width / 2,
          position - width / 8,
          position + width / 8,
          position + width / 2,
        ],
        [1, 0, 0, 1],
        Extrapolate.CLAMP
      );
      return {
        opacity: visibility,
        transform: [{ translateY: 10 * (1 - visibility) }],
      };
    },
    { position, indicatorPosition, width }
  );

  return (
    <TouchableWithoutFeedback onPress={() => activeIndex.set(index)}>
      <View style={styles.tab}>
        <Animated.View style={staticIconStyle}>
          <FontAwesomeIcon icon={item} color="black" size={25} />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

function ActiveIcon({ item, index, activeIndex, width }) {
  const circleIconStyle = useAnimatedStyle(
    ({ index, activeIndex }) => {
      'worklet';
      const isActive = index === activeIndex;
      const yOffset = isActive ? 0 : 80;
      return {
        transform: [
          {
            translateY: Reanimated.delay(
              isActive ? 150 : 0,
              Reanimated.withTiming(yOffset)
            ),
          },
        ],
      };
    },
    { activeIndex, index }
  );

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: width,
          top: -8,
          left: width / 2,
          height: 64,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 5,
        },
        circleIconStyle,
      ]}>
      <View style={styles.activeIcon}>
        <FontAwesomeIcon icon={item} color="black" size={25} />
      </View>
    </Animated.View>
  );
}

const Bar = () => {
  const activeIndex = useSharedValue(0);

  const indicatorPosition = useDerivedValue(
    ({ activeIndex, tabWidth }) => {
      'worklet';
      return Reanimated.withTiming(activeIndex * tabWidth + tabWidth / 2, {
        duration: 500,
      });
    },
    { activeIndex, tabWidth }
  );

  const indicatorStyle = useAnimatedStyle(
    input => {
      'worklet';
      return {
        transform: [{ translateX: input.indicatorPosition }],
      };
    },
    { indicatorPosition }
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[{ position: 'absolute', left: -tabWidth }, indicatorStyle]}>
        {tabs.map((tab, index) => (
          <ActiveIcon
            index={index}
            activeIndex={activeIndex}
            item={tab.item}
            width={tabWidth}
          />
        ))}
        <Svg width={tabWidth * 2} height={64}>
          <Path fill="red" {...{ d }} />
        </Svg>
      </Animated.View>
      {tabs.map((tab, index) => {
        const position = tabWidth * index + tabWidth / 2; // item center
        return (
          <Button
            index={index}
            activeIndex={activeIndex}
            item={tab.item}
            width={tabWidth}
            indicatorPosition={indicatorPosition}
            position={position}
          />
        );
      })}
    </View>
  );
};

const tabBarStyles = StyleSheet.create({
  container: {
    width,
    height,
    flex: 1,
    backgroundColor: 'red',
  },
  dummyPusher: {
    flex: 1,
    height: 300,
  },
});

const TabBar = () => {
  return (
    <View style={tabBarStyles.container}>
      <View style={tabBarStyles.dummyPusher} />
      <Bar />
    </View>
  );
};

export default TabBar;
