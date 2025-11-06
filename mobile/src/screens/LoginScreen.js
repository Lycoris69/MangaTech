import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientBackground, HolographicText, GlowButton } from '../components/ui';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      // Save token and user data
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

      // Navigate to Home (TabNavigator will handle it)
      // No need to navigate, AuthContext will update
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Erreur de connexion';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground variant="dark">
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.header}>
          <HolographicText fontSize={48} fontWeight="900" glow>
            MangaTech
          </HolographicText>
          <Text style={styles.subtitle}>
            Welcome Back
          </Text>
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.purple.neon} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.purple.neon} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Login Button */}
          <GlowButton
            title="Login"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          {/* Register Link */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  scrollContent: {
    padding: spacing.xl,
    paddingTop: 60,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  subtitle: {
    fontSize: typography.sizes.lg,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  
  formContainer: {
    width: '100%',
    marginTop: spacing.xs,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 42, 56, 0.8)',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.purple.neon,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.purpleGlow,
  },
  
  inputIcon: {
    marginRight: spacing.sm,
  },
  
  input: {
    flex: 1,
    height: 56,
    fontSize: typography.sizes.lg,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  
  loginButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  
  linkContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  
  linkText: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  
  linkTextBold: {
    color: colors.purple.neon,
    fontWeight: typography.weights.bold,
  },
});
