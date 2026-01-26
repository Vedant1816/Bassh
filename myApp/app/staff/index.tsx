import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { authFetch } from "@/_services/auth-fetch";

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
      const res = await authFetch("/api/staff/status", {
        method: "GET",
      });

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
      console.error("❌ Check staff status error:", err);
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // No club association - redirect to join club
  if (!staffStatus?.club_id) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.icon}>🏢</Text>
          <Text style={styles.title}>No Club Associated</Text>
          <Text style={styles.description}>
            You need to join a club to access staff features
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/staff/join-club")}
          >
            <Text style={styles.buttonText}>Join a Club</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Status: Pending - show verification pending screen
  if (staffStatus.status === "pending") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#EC4899"
          />
        }
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.pendingIcon}>⏳</Text>
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
            <Text style={styles.infoTitle}>📌 What's Next?</Text>
            <Text style={styles.infoText}>
              • Your club manager will review your request{"\n"}
              • You'll receive a notification once approved{"\n"}
              • Pull down to refresh this page for updates
            </Text>
          </View>

          <Pressable style={styles.secondaryButton} onPress={handleRefresh}>
            <Text style={styles.secondaryButtonText}>
              🔄 Check Status Again
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Status: Rejected - show rejection screen
  if (staffStatus.status === "rejected") {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.rejectedIcon}>❌</Text>
          <Text style={styles.title}>Request Rejected</Text>
          <Text style={styles.description}>
            Your request to join <Text style={styles.highlight}>{staffStatus.club_name}</Text> was
            not approved
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Please contact your club manager for more information or try
              joining a different club.
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/staff/join-club")}
          >
            <Text style={styles.buttonText}>Join Different Club</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Status: Approved - show staff dashboard
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#EC4899"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, Staff Member! 👋</Text>
        <Text style={styles.clubNameText}>{staffStatus.club_name}</Text>
        <Text style={styles.roleText}>{staffStatus.post}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.approvedBadge}>
          <Text style={styles.approvedBadgeText}>✓ Verified</Text>
        </View>

        <Text style={styles.sectionTitle}>Staff Actions</Text>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/staff/scan-qr")}
        >
          <Text style={styles.actionIcon}>📱</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Scan QR Code</Text>
            <Text style={styles.actionDescription}>
              Verify customer bookings at entry
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </Pressable>

        {/* Add more staff actions here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  clubNameText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#EC4899",
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: "#6B7280",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 12,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#111111",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.3)",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 16,
  },
  pendingIcon: {
    fontSize: 80,
  },
  rejectedIcon: {
    fontSize: 64,
    textAlign: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  highlight: {
    color: "#EC4899",
    fontWeight: "600",
  },
  statusCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#333333",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: "#6B7280",
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
    paddingVertical: 4,
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
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#EC4899",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  secondaryButtonText: {
    color: "#EC4899",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333333",
  },
  actionIcon: {
    fontSize: 32,
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
    color: "#6B7280",
  },
  actionArrow: {
    fontSize: 24,
    color: "#6B7280",
  },
});