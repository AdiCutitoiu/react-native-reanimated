import React, { useEffect, useRef, useCallback, useState } from 'react';
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

function Something() {
  function secondWorklet() {
    'worklet';
    _log('gello');
  }

  function run() {
    runOnUI(secondWorklet)();
  }
  return <Button title="RUN ME" onPress={run} />;
}

const App = () => {
  const [show, setShow] = useState(false);
  return (
    <View style={{ alignContent: 'center', justifyContent: 'center', flex: 1 }}>
      <Button title="Yolo" onPress={() => setShow(!show)} />
      {show && <Something />}
    </View>
  );
};

import SzymonStartStop from './testComponents/SzymonStartStopScreen';
// import DragTest from './testComponents/DragTest';
// import LiquidSwipe from './LiquidSwipe';

export default SzymonStartStop;
// export default DragTest;
// export default LiquidSwipe;
// export default createApp(ExampleApp);
