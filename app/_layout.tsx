import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter_28pt-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter_28pt-Bold.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter_28pt-Medium.ttf'),
    'Inter-Light': require('../assets/fonts/Inter_28pt-Light.ttf'),
    'Inter-Italic': require('../assets/fonts/Inter_28pt-Italic.ttf'),
    'Inter-Black': require('../assets/fonts/Inter_28pt-Black.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter_28pt-SemiBold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          headerTitle: 'Home',
        }}
      />
      <Stack.Screen
        name="serveMode"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}