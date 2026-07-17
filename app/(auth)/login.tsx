import React, { useState } from 'react';
import {
   View,
   Text,
   StyleSheet,
   Image,
   KeyboardAvoidingView,
   Platform,
   ScrollView,
   Switch,
 } from 'react-native';
 import { useRouter } from 'expo-router';
 import { useSafeAreaInsets } from 'react-native-safe-area-context';
 import { useTranslation } from 'react-i18next';
 import { LinearGradient } from 'expo-linear-gradient';
 
 import { GradientButton, Input } from '../../src/components';
 import { useAuthStore } from '../../src/stores/authStore';
 import { colors } from '../../src/theme/colors';
 import { typography, fontFamily } from '../../src/theme/typography';
 import { spacing } from '../../src/theme/spacing';
 
 export default function LoginScreen() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { t } = useTranslation();
   const signIn = useAuthStore((s) => s.signIn);
 
   const [phone, setPhone] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [rememberDevice, setRememberDevice] = useState(true);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
 
   const handleLogin = async () => {
     if (!phone.trim() || !password.trim()) {
       setError('Please enter phone number and password');
       return;
     }
 
     setError('');
     setLoading(true);
 
     try {
       const result = await signIn(phone.trim(), password);
       if (result.error) {
         setError(result.error);
       } else {
         // Auth store handles navigation through root layout guard
       }
     } catch (e: any) {
       setError(e.message || 'Login failed');
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <KeyboardAvoidingView
       style={styles.flex}
       behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
     >
       <LinearGradient
         colors={[colors.authBg, colors.neutral[100]]}
         start={{ x: 0, y: 0 }}
         end={{ x: 0, y: 1 }}
         style={StyleSheet.absoluteFill}
       />
       <ScrollView
         contentContainerStyle={[
           styles.container,
           { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
         ]}
         keyboardShouldPersistTaps="handled"
       >
         {/* Logo */}
         <View style={styles.logoContainer}>
           <Image
             source={require('../../assets/images/logo.png')}
             style={styles.logo}
             resizeMode="contain"
           />
         </View>
 
         {/* Title */}
         <Text style={styles.title}>{t('auth.login')}</Text>
 
         {/* Error */}
         {error ? (
           <View style={styles.errorContainer}>
             <Text style={styles.errorText}>{error}</Text>
           </View>
         ) : null}
 
         {/* Form */}
         <View style={styles.form}>
           <Input
             label={t('auth.phoneNumber')}
             icon="call-outline"
             placeholder="9876543210"
             value={phone}
             onChangeText={setPhone}
             keyboardType="phone-pad"
             autoComplete="tel"
             maxLength={10}
             theme="dark"
           />
 
           <Input
             label={t('auth.password')}
             icon="lock-closed-outline"
             placeholder="••••••••"
             value={password}
             onChangeText={setPassword}
             secureTextEntry={!showPassword}
             rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
             onRightIconPress={() => setShowPassword(!showPassword)}
             autoComplete="password"
             theme="dark"
           />
 
           {/* Remember device */}
           <View style={styles.rememberRow}>
             <Text style={styles.rememberText}>{t('auth.rememberDevice')}</Text>
             <Switch
               value={rememberDevice}
               onValueChange={setRememberDevice}
               trackColor={{ false: '#3D332C', true: colors.secondary }}
               thumbColor={rememberDevice ? colors.white : colors.neutral[500]}
             />
           </View>
         </View>
 
         {/* Login button */}
         <GradientButton
           title={t('auth.login')}
           onPress={handleLogin}
           loading={loading}
           fullWidth
           size="lg"
         />
       </ScrollView>
     </KeyboardAvoidingView>
   );
 }
 
 const styles = StyleSheet.create({
   flex: {
     flex: 1,
     backgroundColor: colors.authBg,
   },
   container: {
     flexGrow: 1,
     paddingHorizontal: spacing['2xl'],
   },
   logoContainer: {
     alignItems: 'center',
     marginBottom: spacing['3xl'],
   },
   logo: {
     width: 100,
     height: 100,
   },
   title: {
     ...typography.h3,
     color: colors.authText,
     textAlign: 'center',
     marginBottom: spacing['2xl'],
     fontFamily: fontFamily.semiBold,
   },
   errorContainer: {
     backgroundColor: 'rgba(239, 68, 68, 0.15)',
     padding: spacing.md,
     borderRadius: 8,
     marginBottom: spacing.lg,
     borderWidth: 1,
     borderColor: 'rgba(239, 68, 68, 0.3)',
   },
   errorText: {
     ...typography.bodySmall,
     color: '#FCA5A5',
     textAlign: 'center',
   },
   form: {
     marginBottom: spacing['2xl'],
   },
   rememberRow: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     marginTop: spacing.xs,
   },
   rememberText: {
     ...typography.bodyMedium,
     fontFamily: fontFamily.medium,
     color: colors.neutral[300],
   },
 });
