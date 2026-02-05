import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import supabase from '@/_services/supabase-public';

interface UserProfile {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.replace('/(auth)');
        return;
      }

      const { data: customerData, error } = await supabase
        .from('customers')
        // Use customers schema fields (avoid legacy/absent columns like `name`)
        .select('first_name, last_name, username, email, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(customerData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getDisplayName = (): string | null => {
    const first = profile?.first_name?.trim();
    const last = profile?.last_name?.trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (profile?.username?.trim()) return profile.username.trim();
    if (profile?.email?.trim()) return profile.email.trim();
    return null;
  };

  const displayName = getDisplayName();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Update Name Card */}
        <TouchableOpacity
          style={styles.nameCard}
          activeOpacity={0.7}
          onPress={() => router.push('/onboarding/about-you')}
        >
          <View style={styles.nameCardContent}>
            <Ionicons name="person-circle-outline" size={48} color="#666666" />
            <View style={styles.nameTextContainer}>
              <Text style={styles.nameTitle}>Update your name</Text>
              <Text style={styles.nameSubtitle}>
                {displayName || 'Not set yet'}
              </Text>
            </View>
          </View>
          <Ionicons name="pencil" size={20} color="#666666" />
        </TouchableOpacity>

        {/* All Bookings Section */}
        <Text style={styles.sectionHeader}>All Bookings</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/bookings')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Table bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/events')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="musical-notes-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Events</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Payments Section */}
        <Text style={styles.sectionHeader}>Payments</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItemNoPress}>
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="card-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Payments</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.subMenuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/transactions')}
          >
            <View style={styles.subMenuItemLeft}>
              <View style={styles.subIconContainer}>
                <Ionicons name="receipt-outline" size={18} color="#999999" />
              </View>
              <Text style={styles.subMenuItemText}>All transactions</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Manage Section */}
        <Text style={styles.sectionHeader}>Manage</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to reviews
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="star-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Your reviews</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to reminders
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Party reminders</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <Text style={styles.sectionHeader}>Support</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to FAQ
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Frequently asked questions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to contact
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Contact US</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* More Section */}
        <Text style={styles.sectionHeader}>More</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to settings
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Account settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to feedback
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>Feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => {
              // Navigate to about
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.menuItemText}>About us</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#000000',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  nameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F0F0F',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  nameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  nameTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nameSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  menuGroup: {
    backgroundColor: '#0F0F0F',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemNoPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#1A1A1A',
    marginLeft: 56,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 56,
    paddingRight: 16,
    backgroundColor: '#0A0A0A',
  },
  subMenuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subMenuItemText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#CCCCCC',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  bottomSpace: {
    height: 40,
  },
});