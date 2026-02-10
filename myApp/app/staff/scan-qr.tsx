import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, Camera } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { authFetch } from "@/_services/auth-fetch";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Participant {
  name: string;
  gender: string;
  age: number;
  email?: string;
}

interface BookingDetails {
  id: string;
  status: string;
  entry_status: string;
  qr_used: boolean;
  total_amount: number;
  booking_date: string;
  booking_time: string;
  participants: Participant[];
  participant_count: number;
  event: {
    name: string;
    date: string;
    time: string;
    age_limit: number;
    dj_name?: string;
  } | null;
  club: {
    name: string;
    address: string;
  } | null;
  customer: {
    name: string;
    phone: string;
    email?: string;
  } | null;
}

export default function ScanQRScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    if (!data.startsWith("BOOKING:")) {
      setError("This is not a valid Bassh booking QR code.");
      setScanned(false);
      setCameraKey((k) => k + 1);
      return;
    }
    await validateBooking(data);
  };

  const validateBooking = async (qrData: string) => {
    setLoading(true);
    setError(null);
    let didSucceed = false;

    try {
      const response = await authFetch("/api/staff/scan-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: qrData }),
      });

      const result = await response.json();

      if (!response.ok) {
        switch (result.code) {
          case "BOOKING_NOT_FOUND":
            setError("Booking not found. Invalid QR code.");
            break;
          case "WRONG_CLUB":
            setError("This QR code is for a different venue.");
            break;
          case "WRONG_DATE":
            setError("This QR code is not valid for today.");
            break;
          case "STAFF_NOT_FOUND":
          case "STAFF_NO_CLUB":
            setError(result.error || "Staff access not configured.");
            break;
          case "BOOKING_NOT_CONFIRMED":
            setError("Booking is not confirmed. Payment may be pending.");
            break;
          case "PAYMENT_NOT_COMPLETED":
            setError("Payment not completed for this booking.");
            break;
          case "ALREADY_ENTERED":
            setError("Already entered. This QR code has been used.");
            break;
          case "QR_ALREADY_USED":
            setError("QR code already scanned.");
            break;
          default:
            setError(result.error || "Failed to validate booking");
        }
        return;
      }

      if (result.success && result.booking) {
        setBooking(result.booking);
        didSucceed = true;
      }
    } catch (err: any) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      if (!didSucceed) {
        setScanned(false);
        setCameraKey((k) => k + 1);
      }
    }
  };

  const handleConfirmEntry = async () => {
    if (!booking) return;
    Alert.alert(
      "Confirm Entry",
      `Allow entry for ${booking.participant_count} participant(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: async () => await markEntry() },
      ]
    );
  };

  const markEntry = async () => {
    if (!booking) return;
    setLoading(true);

    try {
      const response = await authFetch("/api/staff/mark-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert("Error", result.error || "Failed to mark entry");
        setLoading(false);
        return;
      }

      Alert.alert(
        "Entry Confirmed",
        `${booking.participant_count} participant(s) allowed entry`,
        [
          {
            text: "Scan Next",
            onPress: () => {
              setBooking(null);
              setScanned(false);
              setError(null);
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", "Failed to mark entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanAnother = () => {
    setBooking(null);
    setScanned(false);
    setError(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Permission required...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[...HeaderGradient]}
          locations={[...HeaderGradientLocations]}
          style={styles.background}
        />
        <View style={[styles.content, { paddingTop: insets.top + 100 }]}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={40} color={Colors.dark.text} />
            </View>
            <Text style={styles.title}>Camera Access</Text>
            <Text style={styles.description}>
              Bassh needs camera permission to scan booking QR codes
            </Text>
            <ThemedButton
              onPress={requestCameraPermission}
              style={{ width: "100%" }}
            >
              Grant Permission
            </ThemedButton>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {!booking && !loading && (
        <>
          <LinearGradient
            colors={[...HeaderGradient]}
            locations={[...HeaderGradientLocations]}
            style={styles.background}
          />
          <View style={[styles.header, { top: insets.top + 16 }]}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Entry Scanner</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={[styles.scanContent, { paddingTop: insets.top + 80 }]}>
            <Text style={styles.scanTitle}>Ready to Scan</Text>
            <Text style={styles.scanSubtitle}>Position the QR code within the frame</Text>

            <View style={styles.cameraContainer}>
              <CameraView
                key={cameraKey}
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              >
                <View style={styles.overlay}>
                  <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.cornerTopLeft]} />
                    <View style={[styles.corner, styles.cornerTopRight]} />
                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                    <View style={[styles.corner, styles.cornerBottomRight]} />
                  </View>
                </View>
              </CameraView>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning" size={20} color="#FFFFFF" style={{ marginRight: 12 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <LinearGradient
            colors={[...HeaderGradient]}
            locations={[...HeaderGradientLocations]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
            <Text style={styles.loadingFullText}>Verifying Booking...</Text>
          </View>
        </View>
      )}

      {booking && !loading && (
        <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
          <LinearGradient
            colors={[...HeaderGradient]}
            locations={[...HeaderGradientLocations]}
            style={styles.detailsBackground}
          />
          <View style={[styles.detailsInner, { paddingTop: insets.top + 40 }]}>
            <View style={styles.validBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.dark.success} style={{ marginRight: 8 }} />
              <Text style={styles.validBadgeText}>Verified Booking</Text>
            </View>

            <View style={styles.detailsCard}>
              {booking.event && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Event</Text>
                  <Text style={styles.mainInfoText}>{booking.event.name}</Text>
                  <Text style={styles.subInfoText}>
                    {booking.event.date} • {booking.event.time}
                  </Text>
                </View>
              )}

              {booking.customer && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Customer</Text>
                  <Text style={styles.mainInfoText}>{booking.customer.name}</Text>
                  <Text style={styles.subInfoText}>{booking.customer.phone}</Text>
                </View>
              )}

              <View style={[styles.section, styles.noBorder]}>
                <Text style={styles.sectionLabel}>Access Details</Text>
                <View style={styles.accessRow}>
                  <View style={styles.accessItem}>
                    <Text style={styles.accessValue}>{booking.participant_count}</Text>
                    <Text style={styles.accessLabel}>Guests</Text>
                  </View>
                  <View style={styles.accessDivider} />
                  <View style={styles.accessItem}>
                    <Text style={styles.accessValue}>₹{booking.total_amount}</Text>
                    <Text style={styles.accessLabel}>Amount</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.participantsHeading}>Guest List</Text>
            {booking.participants.map((p, index) => (
              <View key={index} style={styles.participantRow}>
                <View style={styles.participantIndex}>
                  <Text style={styles.indexText}>{index + 1}</Text>
                </View>
                <View style={styles.participantMain}>
                  <Text style={styles.pName}>{p.name}</Text>
                  <Text style={styles.pInfo}>
                    {p.gender} • {p.age} yrs
                  </Text>
                </View>
                {p.email ? <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.3)" /> : null}
              </View>
            ))}

            <View style={styles.actionArea}>
              <ThemedButton
                onPress={handleConfirmEntry}
                style={styles.confirmButton}
              >
                Confirm Entry
              </ThemedButton>

              <Pressable style={styles.cancelLink} onPress={handleScanAnother}>
                <Text style={styles.cancelText}>Scan Another</Text>
              </Pressable>
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.dark.textSecondary,
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
    height: 44,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "300",
    marginLeft: -4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerRight: { width: 32 },
  scanContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scanTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 40,
    textAlign: "center",
  },
  cameraContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 240,
    height: 240,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: Colors.dark.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.error,
    padding: 16,
    borderRadius: 20,
    marginTop: 24,
    width: "100%",
    shadowColor: Colors.dark.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  errorText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingFullText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 20,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  detailsContent: { flexGrow: 1 },
  detailsBackground: { ...StyleSheet.absoluteFillObject },
  detailsInner: {
    paddingHorizontal: 24,
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  validBadgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.dark.success,
  },
  detailsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 32,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  noBorder: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  mainInfoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subInfoText: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  accessRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  accessItem: {
    flex: 1,
    alignItems: "center",
  },
  accessValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark.primary,
    marginBottom: 2,
  },
  accessLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: "700",
  },
  accessDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  participantsHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 16,
    paddingLeft: 4,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  participantIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  indexText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  participantMain: {
    flex: 1,
  },
  pName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pInfo: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  actionArea: {
    marginTop: 32,
    alignItems: "center",
  },
  confirmButton: {
    width: "100%",
    height: 60,
  },
  cancelLink: {
    marginTop: 20,
    padding: 10,
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bottomSpacer: { height: 60 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
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
});
