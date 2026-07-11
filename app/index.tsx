import { Redirect } from 'expo-router';

export default function Index() {
  // Root layout handles all routing logic
  return <Redirect href="/(auth)/welcome" />;
}
