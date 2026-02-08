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
          colors={["#8B0045", "#2D0A1F", "#000000"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E91E8C" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
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
              <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.8)" />
            </View>
            <Text style={styles.title}>No access to camera</Text>
            <Text style={styles.description}>
              Grant camera permission to scan booking QR codes
            </Text>
            <Pressable style={styles.primaryButtonWrapper} onPress={requestCameraPermission}>
              <LinearGradient
                colors={["#E91E8C", "#DB1A85"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>Grant Permission</Text>
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

      {!booking && !loading && (
        <>
          <LinearGradient
            colors={["#8B0045", "#2D0A1F", "transparent"]}
            locations={[0, 0.3, 0.6]}
            style={styles.gradientTop}
          />
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.headerRight} />
          </View>

          <Text style={styles.scanTitle}>Scan QR Code</Text>
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
                <View style={styles.scanFrame} />
              </View>
            </CameraView>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <LinearGradient
            colors={["#8B0045", "#2D0A1F", "#000000"]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E91E8C" />
            <Text style={styles.loadingText}>Validating booking...</Text>
          </View>
        </View>
      )}

      {booking && !loading && (
        <ScrollView style={styles.detailsContainer} contentContainerStyle={styles.detailsContent}>
          <LinearGradient
            colors={["#8B0045", "#2D0A1F", "#000000"]}
            locations={[0, 0.2, 0.5]}
            style={styles.detailsGradient}
          />
          <View style={styles.detailsInner}>
            <View style={styles.validBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" style={{ marginRight: 8 }} />
              <Text style={styles.validBadgeText}>Valid Booking</Text>
            </View>

            {booking.event && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Event</Text>
                <Text style={styles.infoText}>{booking.event.name}</Text>
                <Text style={styles.infoSubtext}>
                  {booking.event.date} at {booking.event.time}
                </Text>
                {booking.event.dj_name && (
                  <Text style={styles.infoSubtext}>DJ: {booking.event.dj_name}</Text>
                )}
              </View>
            )}

            {booking.club && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Venue</Text>
                <Text style={styles.infoText}>{booking.club.name}</Text>
                <Text style={styles.infoSubtext}>{booking.club.address}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Details</Text>
              <Text style={styles.infoText}>Total: ₹{booking.total_amount}</Text>
              <Text style={styles.infoSubtext}>{booking.participant_count} participant(s)</Text>
              <Text style={styles.infoSubtext}>Status: {booking.status}</Text>
            </View>

            {booking.customer && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Booked By</Text>
                <Text style={styles.infoText}>{booking.customer.name}</Text>
                <Text style={styles.infoSubtext}>{booking.customer.phone}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Participants</Text>
              {booking.participants.map((p, index) => (
                <View key={index} style={styles.participantCard}>
                  <Text style={styles.participantName}>
                    {index + 1}. {p.name}
                  </Text>
                  <Text style={styles.participantInfo}>
                    {p.gender} • {p.age} years
                  </Text>
                  {p.email && (
                    <Text style={styles.participantInfo}>{p.email}</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.buttonContainer}>
              <Pressable
                style={styles.primaryButtonWrapper}
                onPress={handleConfirmEntry}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#E91E8C", "#DB1A85"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButton}
                >
                  <Ionicons name="checkmark" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Confirm Entry</Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleScanAnother}>
                <Ionicons name="close" size={20} color="#E91E8C" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Cancel</Text>
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
    backgroundColor: "#000000",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  header: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 2,
    gap: 12,
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
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: { width: 32 },
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
  },
  primaryButtonWrapper: { marginTop: 8 },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  homeIndicator: {
    position: "absolute",
    bottom: 34,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  scanTitle: {
    position: "absolute",
    top: 120,
    left: 24,
    right: 24,
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    zIndex: 2,
  },
  scanSubtitle: {
    position: "absolute",
    top: 158,
    left: 24,
    right: 24,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    zIndex: 2,
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 20,
    margin: 20,
    marginTop: 200,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#E91E8C",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  errorText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 18,
    marginTop: 16,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  detailsContent: { flexGrow: 1 },
  detailsGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.4,
  },
  detailsInner: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  validBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22C55E",
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 2,
  },
  participantCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  participantInfo: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 28,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  secondaryButtonText: {
    color: "#E91E8C",
    fontSize: 17,
    fontWeight: "600",
  },
  bottomSpacer: { height: 40 },
});
