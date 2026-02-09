import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { authFetch } from "@/_services/auth-fetch";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";
import supabasePublic from "@/_services/supabase-public";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface StaffStatus {
  id: string;
  club_id: string | null;
  club_name: string | null;
  status: "pending" | "approved" | "rejected";
  post: string | null;
}

export default function StaffDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffStatus, setStaffStatus] = useState<StaffStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    checkStaffStatus();
  }, []);

  const checkStaffStatus = async () => {
    try {
      const res = await authFetch("/api/staff/status", { method: "GET" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to check status");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStaffStatus(data.staff);
      setLoading(false);
    } catch (err: any) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkStaffStatus();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.background}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!staffStatus?.club_id) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.background}
        />
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="business-outline" size={40} color={Colors.dark.text} />
            </View>
            <Text style={styles.title}>No Club Associated</Text>
            <Text style={styles.description}>
              You need to join a club to access staff features
            </Text>
            <ThemedButton
              onPress={() => router.push("/staff/join-club")}
              style={styles.mainButton}
            >
              Join a Club
            </ThemedButton>
          </View>
        </View>
        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      </View>
    );
  }

  if (staffStatus.status === "pending") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.background}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.primary}
            />
          }
        >
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={40} color={Colors.dark.text} />
              </View>
              <Text style={styles.title}>Verification Pending</Text>
              <Text style={styles.description}>
                Your request to join <Text style={styles.highlight}>{staffStatus.club_name}</Text> is
                under review
              </Text>

              <View style={styles.statusDisplay}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Club</Text>
                  <Text style={styles.statusValue}>{staffStatus.club_name}</Text>
                </View>
                <View style={[styles.statusRow, styles.lastRow]}>
                  <Text style={styles.statusLabel}>Status</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>What's Next?</Text>
                <Text style={styles.infoText}>
                  Your club manager will review your request. Pull down to refresh for updates.
                </Text>
              </View>

              <Pressable style={styles.refreshLink} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={20} color={Colors.dark.primary} />
                <Text style={styles.refreshLinkText}>Refresh status</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      </View>
    );
  }

  if (staffStatus.status === "rejected") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.background}
        />
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, styles.rejectedCircle]}>
              <Ionicons name="close-circle-outline" size={40} color={Colors.dark.error} />
            </View>
            <Text style={styles.title}>Request Rejected</Text>
            <Text style={styles.description}>
              Your request to join <Text style={styles.highlight}>{staffStatus.club_name}</Text> was
              not approved
            </Text>
            <ThemedButton
              onPress={() => router.push("/staff/join-club")}
              style={styles.mainButton}
            >
              Try Different Club
            </ThemedButton>
          </View>
        </View>
        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      </View>
    );
  }

  const handleLogout = async () => {
    await supabasePublic.auth.signOut();
    router.replace("/(auth)/staff-login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[...HeaderGradient]}
        locations={[...HeaderGradientLocations]}
        style={styles.background}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.mainHeader}>
            <View>
              <Text style={styles.welcomeLabel}>Welcome,</Text>
              <Text style={styles.staffName}>{staffStatus.club_name}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 12 }}>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
              <Pressable
                onPress={handleLogout}
                style={{ flexDirection: "row", alignItems: "center", opacity: 0.8 }}
                hitSlop={8}
              >
                <Ionicons name="log-out-outline" size={18} color={Colors.dark.error} />
                <Text style={{
                  color: Colors.dark.error,
                  marginLeft: 4,
                  fontWeight: "600",
                  fontSize: 14
                }}>Logout</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.roleCard}>
            <Text style={styles.roleLabel}>Current Role</Text>
            <Text style={styles.roleValue}>{staffStatus.post || "Staff Member"}</Text>
          </View>

          <Text style={styles.sectionHeading}>Management Actions</Text>

          <Pressable
            style={styles.actionCard}
            onPress={() => router.push("/staff/scan-qr")}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
              style={styles.actionGradient}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="qr-code-outline" size={28} color={Colors.dark.primary} />
              </View>
              <View style={styles.actionTextContent}>
                <Text style={styles.actionTitle}>Scan QR Code</Text>
                <Text style={styles.actionDesc}>
                  Validate guest entry and bookings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.homeIndicator}>
        <View style={styles.homeIndicatorBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    paddingHorizontal: 24,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  mainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  welcomeLabel: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  staffName: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.dark.text,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  verifiedText: {
    color: Colors.dark.success,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  roleCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 32,
  },
  roleLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: "700",
  },
  roleValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 16,
    paddingLeft: 4,
  },
  actionCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(219, 39, 119, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionTextContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  rejectedCircle: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  highlight: {
    color: Colors.dark.primary,
    fontWeight: "700",
  },
  statusDisplay: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: "600",
  },
  statusValue: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: "700",
  },
  pendingBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    width: "100%",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  mainButton: {
    width: "100%",
    height: 56,
  },
  refreshLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshLinkText: {
    color: Colors.dark.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  homeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 34,
    alignItems: "center",
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    opacity: 0.3,
  },
});
