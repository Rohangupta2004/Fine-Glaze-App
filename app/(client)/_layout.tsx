import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function ClientLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
