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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E91E8C" />
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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="business-outline" size={40} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.title}>No Club Associated</Text>
            <Text style={styles.description}>
              You need to join a club to access staff features
            </Text>
            <Pressable
              style={styles.primaryButtonWrapper}
              onPress={() => router.push("/staff/join-club")}
            >
              <LinearGradient
                colors={["#E91E8C", "#DB1A85"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>Join a Club</Text>
              </LinearGradient>
            </Pressable>
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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#E91E8C"
            />
          }
        >
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={40} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={styles.title}>Verification Pending</Text>
              <Text style={styles.description}>
                Your request to join <Text style={styles.highlight}>{staffStatus.club_name}</Text> is
                under review
              </Text>

              <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Club:</Text>
                  <Text style={styles.statusValue}>{staffStatus.club_name}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Role:</Text>
                  <Text style={styles.statusValue}>{staffStatus.post || "Staff"}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>What&apos;s Next?</Text>
                <Text style={styles.infoText}>
                  Your club manager will review your request. You&apos;ll receive a notification once
                  approved. Pull down to refresh for updates.
                </Text>
              </View>

              <Pressable style={styles.secondaryButton} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={20} color="#E91E8C" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Check Status Again</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.bottomSpacer} />
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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={styles.gradientBackground}
        />
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="close-circle-outline" size={40} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.title}>Request Rejected</Text>
            <Text style={styles.description}>
              Your request to join <Text style={styles.highlight}>{staffStatus.club_name}</Text> was
              not approved
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Please contact your club manager for more information or try joining a different club.
              </Text>
            </View>
            <Pressable
              style={styles.primaryButtonWrapper}
              onPress={() => router.push("/staff/join-club")}
            >
              <LinearGradient
                colors={["#E91E8C", "#DB1A85"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>Join Different Club</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
        <View style={styles.homeIndicator}>
          <View style={styles.homeIndicatorBar} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#8B0045", "#2D0A1F", "#000000"]}
        locations={[0, 0.4, 1]}
        style={styles.gradientBackground}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#E91E8C"
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome, Staff Member</Text>
            <Text style={styles.clubNameText}>{staffStatus.club_name}</Text>
            <Text style={styles.roleText}>{staffStatus.post}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginRight: 6 }} />
              <Text style={styles.approvedBadgeText}>Verified</Text>
            </View>

            <Text style={styles.sectionTitle}>Staff Actions</Text>

            <Pressable
              style={styles.actionButton}
              onPress={() => router.push("/staff/scan-qr")}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name="qr-code-outline" size={28} color="rgba(255,255,255,0.8)" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Scan QR Code</Text>
                <Text style={styles.actionDescription}>
                  Verify customer bookings at entry
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>
        </View>
        <View style={styles.bottomSpacer} />
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
    backgroundColor: "#000000",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  clubNameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  highlight: {
    color: "#E91E8C",
    fontWeight: "600",
  },
  statusCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pendingBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  pendingBadgeText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "600",
  },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  approvedBadgeText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 22,
  },
  primaryButtonWrapper: {
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  secondaryButtonText: {
    color: "#E91E8C",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  actionIconWrap: {
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  bottomSpacer: { height: 80 },
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
  },
});
