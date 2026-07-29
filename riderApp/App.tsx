// import React from 'react';
// import {Provider} from 'react-redux';
// import {StripeProvider} from '@stripe/stripe-react-native';

// import {store} from './src/redux/store';
// import RootNavigator from './src/navigations/rootNavigator';

// export default function App() {
//   return (
//     <Provider store={store}>
//       <StripeProvider
//         publishableKey="pk_test_51Tvwa1JLX7OGBdTDUdxdaVeHyOOQ2qTXb0XfgGkFlcwsZ3OUNTQERY0FQ3AaNxUz7wKptyOSfNDuX6tbCrFFFyi300ZjPLRlTj">
//         <RootNavigator />
//       </StripeProvider>
//     </Provider>
//   );
// }

import React from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigations/rootNavigator';
import { store } from './src/redux/store';

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;