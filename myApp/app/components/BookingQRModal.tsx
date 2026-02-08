import { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
    ActivityIndicator,
    Share,
    Animated,
    Dimensions,
    Platform,
    Image,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";

import { Colors } from "@/constants/Colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = SCREEN_WIDTH * 0.45;

/** Same as booking/[id].tsx: qr_code is a pre-rendered image (data URL). Otherwise we generate QR from booking.id. */
function isQRCodeImage(value: string | null | undefined): boolean {
    return Boolean(value && typeof value === "string" && value.trim().startsWith("data:"));
}

type BookingData = {
    id: string;
    qr_code: string;
    booking_type?: "event" | "club" | "unknown";
    event_name: string;
    club_name?: string;
    event_date: string;
    event_time: string;
    venue_name: string;
    venue_address: string;
    ticket_type: string;
    ticket_count: number;
    total_price: number;
    status: string;
    confirmation_code: string;
};

type BookingQRModalProps = {
    visible: boolean;
    onClose: () => void;
    booking: BookingData | null;
};

export function BookingQRModal({ visible, onClose, booking }: BookingQRModalProps) {
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const qrRef = useRef<any>(null);

    // Animations
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible) {
            // Reset animations
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
            slideAnim.setValue(50);

            // Entrance animation
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 50,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Pulse animation for QR
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.02,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    /** Same as booking/[id].tsx getQRFile: write qr_code (image) to file and return path. */
    const getQRFileFromImage = async (): Promise<string> => {
        if (!booking?.qr_code) throw new Error("QR not available");
        if (!FileSystem.documentDirectory) throw new Error("File system unavailable");

        let base64 = booking.qr_code;
        if (base64.includes(";base64,")) {
            base64 = base64.split(";base64,")[1];
        }
        const fileUri = FileSystem.documentDirectory + `booking_${booking.id}_qr.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });
        return fileUri;
    };

    const handleShare = async () => {
        if (!booking) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            if (isQRCodeImage(booking.qr_code)) {
                const fileUri = await getQRFileFromImage();
                const canShare = await Sharing.isAvailableAsync();
                if (!canShare) {
                    Alert.alert("Sharing not available on this device");
                    return;
                }
                await Sharing.shareAsync(fileUri, {
                    mimeType: "image/png",
                    dialogTitle: "Share QR Code",
                    UTI: "public.png",
                });
            } else {
                await Share.share({
                    message: `🎉 My Booking Confirmation\n\n` +
                        `📍 ${booking.event_name}\n` +
                        `🏢 ${booking.venue_name}\n` +
                        `📅 ${formatDate(booking.event_date)} at ${booking.event_time}\n` +
                        `🎫 ${booking.ticket_count}x ${booking.ticket_type}\n` +
                        `✅ Confirmation: ${booking.confirmation_code}\n\n` +
                        `See you there! 🎊`,
                    title: `Booking: ${booking.event_name}`,
                });
            }
        } catch (error: any) {
            console.error("Share error:", error);
            Alert.alert("Share failed", error?.message ?? "Something went wrong");
        }
    };

    const handleDownload = async () => {
        if (!booking) return;

        try {
            setSaving(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
                Alert.alert("Sharing is not available on this device.");
                setSaving(false);
                return;
            }

            if (isQRCodeImage(booking.qr_code)) {
                const fileUri = await getQRFileFromImage();
                await Sharing.shareAsync(fileUri, {
                    mimeType: "image/png",
                    dialogTitle: "Save QR code",
                });
                setSaveSuccess(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(() => setSaveSuccess(false), 2000);
                setSaving(false);
            } else if (qrRef.current) {
                qrRef.current.toDataURL(async (data: string) => {
                    const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
                    if (!dir) {
                        setSaving(false);
                        return;
                    }
                    const filename = `booking_${booking.confirmation_code}_qr.png`;
                    const filepath = `${dir}${filename}`;

                    await FileSystem.writeAsStringAsync(filepath, data, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    await Sharing.shareAsync(filepath, {
                        mimeType: "image/png",
                        dialogTitle: "Save QR code",
                    });

                    setSaveSuccess(true);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                    setTimeout(() => {
                        setSaveSuccess(false);
                    }, 2000);

                    setSaving(false);
                });
            } else {
                setSaving(false);
            }
        } catch (error) {
            console.error("Download error:", error);
            setSaving(false);
        }
    };

    if (!booking) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose}>
                <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
            </Pressable>

            <View style={styles.centeredContainer} pointerEvents="box-none">
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            opacity: opacityAnim,
                            transform: [
                                { scale: scaleAnim },
                                { translateY: slideAnim },
                            ],
                        },
                    ]}
                >
                    {/* Green Gradient Background */}
                    <LinearGradient
                        colors={[Colors.dark.success, Colors.dark.successDim, "#006837"]}
                        locations={[0, 0.5, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBackground}
                    />

                    {/* Decorative Elements */}
                    <View style={styles.decorCircle1} />
                    <View style={styles.decorCircle2} />
                    <View style={styles.decorLine} />

                    {/* Close Button */}
                    <Pressable
                        style={styles.closeButton}
                        onPress={handleClose}
                        hitSlop={12}
                    >
                        <Ionicons name="close" size={24} color="rgba(255,255,255,0.9)" />
                    </Pressable>

                    {/* Success Badge */}
                    <View style={styles.successBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.dark.success} />
                        <Text style={styles.successBadgeText}>Confirmed</Text>
                    </View>

                    {/* QR Code Section — same logic as booking/[id].tsx: image URI or generated from id */}
                    <Animated.View
                        style={[
                            styles.qrContainer,
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    >
                        <View style={styles.qrInner}>
                            {isQRCodeImage(booking.qr_code) ? (
                                <Image
                                    source={{ uri: booking.qr_code }}
                                    style={[styles.qrImage, { width: QR_SIZE, height: QR_SIZE }]}
                                    resizeMode="contain"
                                />
                            ) : (
                                <QRCode
                                    value={booking.id}
                                    size={QR_SIZE}
                                    backgroundColor="white"
                                    color="#1A1A2E"
                                    getRef={(ref) => (qrRef.current = ref)}
                                />
                            )}
                        </View>
                        <View style={styles.qrCornerTL} />
                        <View style={styles.qrCornerTR} />
                        <View style={styles.qrCornerBL} />
                        <View style={styles.qrCornerBR} />
                    </Animated.View>

                    {/* Confirmation Code */}
                    <View style={styles.confirmationRow}>
                        <Text style={styles.confirmationLabel}>Confirmation</Text>
                        <Text style={styles.confirmationCode}>{booking.confirmation_code}</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <View style={styles.dividerCircleLeft} />
                        <View style={styles.dividerCircleRight} />
                    </View>

                    {/* Booking Info - conditionally rendered based on booking type */}
                    <View style={styles.infoSection}>
                        <Text style={styles.eventName} numberOfLines={2}>
                            {booking.booking_type === "club"
                                ? (booking.club_name || booking.event_name)
                                : booking.event_name}
                        </Text>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="location" size={16} color={Colors.dark.success} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>
                                    {booking.booking_type === "club" ? "Club" : "Venue"}
                                </Text>
                                <Text style={styles.infoValue} numberOfLines={1}>
                                    {booking.venue_name}
                                </Text>
                                <Text style={styles.infoSubValue} numberOfLines={1}>
                                    {booking.venue_address}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons name="calendar" size={16} color={Colors.dark.success} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>
                                    {booking.booking_type === "club" ? "Entry Date" : "Date & Time"}
                                </Text>
                                <Text style={styles.infoValue}>
                                    {formatDate(booking.event_date)}
                                </Text>
                                {booking.event_time && booking.event_time !== "00:00:00" && (
                                    <Text style={styles.infoSubValue}>{booking.event_time}</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <Ionicons
                                    name={booking.booking_type === "club" ? "people" : "ticket"}
                                    size={16}
                                    color={Colors.dark.success}
                                />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>
                                    {booking.booking_type === "club" ? "Entry" : "Tickets"}
                                </Text>
                                <Text style={styles.infoValue}>
                                    {booking.ticket_count}x {booking.ticket_type}
                                </Text>
                                <Text style={styles.infoSubValue}>
                                    Total: {formatCurrency(booking.total_price)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.shareButton,
                                pressed && styles.actionButtonPressed,
                            ]}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-outline" size={20} color={Colors.dark.success} />
                            <Text style={styles.shareButtonText}>Share</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.downloadButton,
                                pressed && styles.actionButtonPressed,
                                saveSuccess && styles.downloadButtonSuccess,
                            ]}
                            onPress={handleDownload}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : saveSuccess ? (
                                <>
                                    <Ionicons name="checkmark" size={20} color="white" />
                                    <Text style={styles.downloadButtonText}>Saved!</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="download-outline" size={20} color="white" />
                                    <Text style={styles.downloadButtonText}>Save QR</Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    {/* Footer Note */}
                    <Text style={styles.footerNote}>
                        Show this QR code at the venue entrance
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    centeredContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        width: "100%",
        maxWidth: 380,
        backgroundColor: "#0D1F17", // Keeping this dark green as it's specific to the success card look
        borderRadius: 28,
        paddingTop: 24,
        paddingBottom: 20,
        paddingHorizontal: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.dark.successBorder,
        shadowColor: Colors.dark.success,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 20,
    },
    gradientBackground: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 180,
        opacity: 0.15,
    },
    decorCircle1: {
        position: "absolute",
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.dark.successBg,
    },
    decorCircle2: {
        position: "absolute",
        top: 60,
        left: -30,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(34, 197, 94, 0.05)",
    },
    decorLine: {
        position: "absolute",
        top: 100,
        right: 30,
        width: 60,
        height: 2,
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        transform: [{ rotate: "45deg" }],
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    successBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        backgroundColor: Colors.dark.successBg,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 20,
    },
    successBadgeText: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.dark.success,
        letterSpacing: 0.5,
    },
    qrContainer: {
        alignSelf: "center",
        padding: 16,
        position: "relative",
    },
    qrInner: {
        padding: 16,
        backgroundColor: "white",
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    qrImage: {
        borderRadius: 8,
        backgroundColor: "#fff",
    },
    qrCornerTL: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 24,
        height: 24,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: Colors.dark.success,
        borderTopLeftRadius: 8,
    },
    qrCornerTR: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 24,
        height: 24,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: Colors.dark.success,
        borderTopRightRadius: 8,
    },
    qrCornerBL: {
        position: "absolute",
        bottom: 0,
        left: 0,
        width: 24,
        height: 24,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: Colors.dark.success,
        borderBottomLeftRadius: 8,
    },
    qrCornerBR: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: Colors.dark.success,
        borderBottomRightRadius: 8,
    },
    confirmationRow: {
        alignItems: "center",
        marginTop: 8,
        marginBottom: 16,
    },
    confirmationLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.dark.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    confirmationCode: {
        fontSize: 20,
        fontWeight: "800",
        color: Colors.dark.success,
        letterSpacing: 3,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
    divider: {
        height: 24,
        position: "relative",
        marginVertical: 8,
    },
    dividerLine: {
        position: "absolute",
        top: 11,
        left: 20,
        right: 20,
        height: 2,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: Colors.dark.successBorder,
    },
    dividerCircleLeft: {
        position: "absolute",
        left: -30,
        top: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
    },
    dividerCircleRight: {
        position: "absolute",
        right: -30,
        top: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
    },
    infoSection: {
        gap: 14,
    },
    eventName: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.dark.text,
        textAlign: "center",
        marginBottom: 8,
        lineHeight: 24,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.dark.successBg,
        alignItems: "center",
        justifyContent: "center",
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.dark.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.dark.text,
        lineHeight: 20,
    },
    infoSubValue: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        marginTop: 1,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    actionButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    shareButton: {
        backgroundColor: Colors.dark.successBg,
        borderWidth: 1,
        borderColor: Colors.dark.successBorder,
    },
    shareButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.dark.success,
    },
    downloadButton: {
        backgroundColor: Colors.dark.success,
    },
    downloadButtonSuccess: {
        backgroundColor: Colors.dark.successDim,
    },
    downloadButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.dark.text,
    },
    footerNote: {
        fontSize: 11,
        color: Colors.dark.textSecondary,
        textAlign: "center",
        marginTop: 16,
    },
});