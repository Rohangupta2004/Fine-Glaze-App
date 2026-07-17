import { Alert, Platform } from 'react-native';

export function showAlert(
  title: string,
  message?: string,
  buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[],
  options?: { cancelable?: boolean; onDismiss?: () => void }
) {
  if (Platform.OS === 'web') {
    const formattedMessage = message ? `${title}\n\n${message}` : title;
    
    if (buttons && buttons.length > 0) {
      // If there's more than one button, and one is 'cancel', we can use confirm()
      const hasCancel = buttons.some(b => b.style === 'cancel' || b.text.toLowerCase() === 'cancel');
      if (hasCancel && buttons.length >= 2) {
        const confirmed = window.confirm(formattedMessage);
        if (confirmed) {
          const confirmBtn = buttons.find(b => b.style !== 'cancel' && b.text.toLowerCase() !== 'cancel');
          if (confirmBtn?.onPress) confirmBtn.onPress();
        } else {
          const cancelBtn = buttons.find(b => b.style === 'cancel' || b.text.toLowerCase() === 'cancel');
          if (cancelBtn?.onPress) cancelBtn.onPress();
        }
        return;
      }
    }
    
    // Otherwise just alert and trigger the first button's onPress if it exists
    window.alert(formattedMessage);
    if (buttons?.[0]?.onPress) {
      buttons[0].onPress();
    }
  } else {
    // Note: React Native's Alert.alert requires specific button shapes.
    // The cast to any handles the slight divergence in AlertButton vs our simple shape.
    Alert.alert(title, message, buttons as any, options);
  }
}
