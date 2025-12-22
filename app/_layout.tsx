import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Define your screens here */}
      <Stack.Screen name="index" />
    </Stack>
  );
}
