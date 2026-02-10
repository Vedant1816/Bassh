import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { authFetch } from '@/_services/auth-fetch';

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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return; // Prevent multiple scans
    
    setScanned(true);
    console.log('📱 [STAFF] QR Code scanned:', data);

    // Check if it's a valid booking QR
    if (!data.startsWith('BOOKING:')) {
      Alert.alert('Invalid QR Code', 'This is not a valid Bassh booking QR code.');
      setScanned(false);
      return;
    }

    // Call API to validate booking
    await validateBooking(data);
  };

  const validateBooking = async (qrData: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch('/api/staff/scan-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_data: qrData }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        switch (result.code) {
          case 'BOOKING_NOT_FOUND':
            setError('❌ Booking not found. Invalid QR code.');
            break;
          case 'BOOKING_NOT_CONFIRMED':
            setError('❌ Booking is not confirmed. Payment may be pending.');
            break;
          case 'PAYMENT_NOT_COMPLETED':
            setError('❌ Payment not completed for this booking.');
            break;
          case 'ALREADY_ENTERED':
            setError('⚠️ Already entered! This QR code has been used.');
            break;
          case 'QR_ALREADY_USED':
            setError('⚠️ QR code already scanned!');
            break;
          default:
            setError(result.error || 'Failed to validate booking');
        }
        
        Alert.alert('Validation Failed', result.error || 'Invalid booking');
        setScanned(false);
        setLoading(false);
        return;
      }

      // Success - show booking details
      if (result.success && result.booking) {
        setBooking(result.booking);
        console.log('✅ [STAFF] Booking validated:', result.booking);
      }

    } catch (err: any) {
      console.error('❌ [STAFF] Validation error:', err);
      setError('Network error. Please check your connection.');
      Alert.alert('Error', 'Failed to validate booking. Please try again.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEntry = async () => {
    if (!booking) return;

    Alert.alert(
      'Confirm Entry',
      `Allow entry for ${booking.participant_count} participant(s)?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            await markEntry();
          },
        },
      ]
    );
  };

  const markEntry = async () => {
    if (!booking) return;

    setLoading(true);

    try {
      const response = await authFetch('/api/staff/mark-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: booking.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('Error', result.error || 'Failed to mark entry');
        setLoading(false);
        return;
      }

      // Success!
      Alert.alert(
        '✅ Entry Confirmed',
        `${booking.participant_count} participant(s) allowed entry`,
        [
          {
            text: 'Scan Next',
            onPress: () => {
              setBooking(null);
              setScanned(false);
              setError(null);
            },
          },
        ]
      );

    } catch (err: any) {
      console.error('❌ [STAFF] Mark entry error:', err);
      Alert.alert('Error', 'Failed to mark entry. Please try again.');
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
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!booking && !loading && (
        <>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>Position the QR code within the frame</Text>
          
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.scanFrame} />
              </View>
            </CameraView>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Validating booking...</Text>
        </View>
      )}

      {booking && !loading && (
        <ScrollView style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>✅ Valid Booking</Text>

          {/* Event Info */}
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

          {/* Club Info */}
          {booking.club && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue</Text>
              <Text style={styles.infoText}>{booking.club.name}</Text>
              <Text style={styles.infoSubtext}>{booking.club.address}</Text>
            </View>
          )}

          {/* Booking Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <Text style={styles.infoText}>
              Total: ₹{booking.total_amount}
            </Text>
            <Text style={styles.infoSubtext}>
              {booking.participant_count} participant(s)
            </Text>
            <Text style={styles.infoSubtext}>
              Status: {booking.status}
            </Text>
          </View>

          {/* Customer Info */}
          {booking.customer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booked By</Text>
              <Text style={styles.infoText}>{booking.customer.name}</Text>
              <Text style={styles.infoSubtext}>{booking.customer.phone}</Text>
            </View>
          )}

          {/* Participants */}
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

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirmEntry}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                ✓ Confirm Entry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleScanAnother}
            >
              <Text style={styles.buttonText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    margin: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FF3B30',
    margin: 20,
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  detailsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  participantCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  participantInfo: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});