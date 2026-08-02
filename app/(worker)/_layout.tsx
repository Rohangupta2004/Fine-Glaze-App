import React from 'react';
import { Stack } from 'expo-router';
import { useOutboxSync } from '../../src/hooks/useOutboxSync';

export default function WorkerLayout() {
  useOutboxSync();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}

