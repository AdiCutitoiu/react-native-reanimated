import React, { useEffect, useRef, useCallback } from 'react';
import {
  Text,
  View,
  YellowBox,
  NativeModules,
  Platform,
  Button,
} from 'react-native';

import { withTiming, runOnUI, makeShareable } from 'react-native-reanimated';

const width = 1700;

function callback() {
  console.log('CALLBAKC');
}

const thirdWorklet = () => {
  'worklet';
  callback();
};

function secondWorklet() {
  'worklet';
  thirdWorklet();
}

function run() {
  runOnUI(secondWorklet)();
}

const App = () => {
  return (
    <View style={{ alignContent: 'center', justifyContent: 'center', flex: 1 }}>
      <Button title="Yolo" onPress={run} />
    </View>
  );
};

// import SzymonStartStop from './testComponents/SzymonStartStopScreen';
// import DragTest from './testComponents/DragTest';
import LiquidSwipe from './LiquidSwipe';

// export default App;
// export default DragTest;
export default LiquidSwipe;
// export default createApp(ExampleApp);
