import React, { useState } from 'react';
import { 
  View, 
  ScrollView,
  Text, 
  Switch,
  StyleSheet, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground, NeonCard, GlowButton } from '../components/ui';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

export default function SettingsScreen({ navigation }) {
  const [autoScroll, setAutoScroll] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [downloadOnWifi, setDownloadOnWifi] = useState(true);
  
  const SettingRow = ({ icon, title, description, value, onValueChange, type = 'toggle' }) => (
    <NeonCard glowColor="none" gradient={false} style={styles.settingCard}>
      <View style={styles.settingRow}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={24} color={colors.purple.neon} />
        </View>
        
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
        
        {type === 'toggle' && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ 
              false: colors.gray, 
              true: colors.purple.dark 
            }}
            thumbColor={value ? colors.purple.neon : colors.lightGray}
          />
        )}
        
        {type === 'arrow' && (
          <Ionicons name="chevron-forward" size={24} color={colors.text.tertiary} />
        )}
      </View>
    </NeonCard>
  );
  
  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
  
  return (
    <GradientBackground variant="dark">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Reading Settings */}
          <SettingSection title="Reading">
            <SettingRow
              icon="book-outline"
              title="Auto Scroll"
              description="Automatically scroll through pages"
              value={autoScroll}
              onValueChange={setAutoScroll}
            />
            
            <TouchableOpacity>
              <SettingRow
                icon="speedometer-outline"
                title="Scroll Speed"
                description="Adjust auto-scroll speed"
                type="arrow"
              />
            </TouchableOpacity>
          </SettingSection>
          
          {/* Appearance */}
          <SettingSection title="Appearance">
            <SettingRow
              icon="moon-outline"
              title="Dark Mode"
              description="Use dark theme"
              value={darkMode}
              onValueChange={setDarkMode}
            />
            
            <TouchableOpacity>
              <SettingRow
                icon="color-palette-outline"
                title="Theme Color"
                description="Purple & Cyan"
                type="arrow"
              />
            </TouchableOpacity>
          </SettingSection>
          
          {/* Notifications */}
          <SettingSection title="Notifications">
            <SettingRow
              icon="notifications-outline"
              title="Push Notifications"
              description="Get notified of new chapters"
              value={notifications}
              onValueChange={setNotifications}
            />
          </SettingSection>
          
          {/* Downloads */}
          <SettingSection title="Downloads">
            <SettingRow
              icon="wifi-outline"
              title="Download on WiFi Only"
              description="Save mobile data"
              value={downloadOnWifi}
              onValueChange={setDownloadOnWifi}
            />
            
            <TouchableOpacity>
              <SettingRow
                icon="folder-outline"
                title="Manage Downloads"
                description="View and delete downloaded chapters"
                type="arrow"
              />
            </TouchableOpacity>
          </SettingSection>
          
          {/* Account */}
          <SettingSection title="Account">
            <TouchableOpacity>
              <SettingRow
                icon="person-outline"
                title="Profile"
                description="Manage your account"
                type="arrow"
              />
            </TouchableOpacity>
            
            <TouchableOpacity>
              <SettingRow
                icon="shield-checkmark-outline"
                title="Privacy"
                description="Control your data"
                type="arrow"
              />
            </TouchableOpacity>
          </SettingSection>
          
          {/* About */}
          <SettingSection title="About">
            <TouchableOpacity>
              <SettingRow
                icon="information-circle-outline"
                title="About MangaTech"
                description="Version 1.0.0"
                type="arrow"
              />
            </TouchableOpacity>
          </SettingSection>
          
          {/* Logout */}
          <View style={styles.logoutContainer}>
            <GlowButton
              title="Logout"
              variant="outline"
              onPress={() => console.log('Logout')}
            />
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  
  headerTitle: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.black,
    color: colors.text.primary,
  },
  
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  
  section: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  settingCard: {
    marginBottom: spacing.sm,
  },
  
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.darkGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  
  settingContent: {
    flex: 1,
  },
  
  settingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  
  settingDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  
  logoutContainer: {
    marginVertical: spacing.xl,
    marginBottom: spacing.xxl,
  },
});
