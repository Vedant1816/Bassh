import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    Pressable,
    Modal,
    RefreshControl,
    StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "@/constants/Colors";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { BookingQRModal } from "./BookingQRModal";

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

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    metadata?: {
        booking_id?: string;
        event_id?: string;
        event_name?: string;
    };
    // Enriched booking data from backend
    booking?: BookingData;
};

type NotificationsModalProps = {
    visible: boolean;
    onClose: () => void;
};

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
    const insets = useSafeAreaInsets();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // QR Modal state
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetchWithFallback(
                "/api/notifications/send-all",
                await withAuthHeaders({ method: "GET" })
            );
            const json = await res.json();
            if (res.ok) {
                const sortedNotifications = (json.notifications || []).sort(
                    (a: NotificationItem, b: NotificationItem) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setNotifications(sortedNotifications);
                setUnreadCount(json.unreadCount || 0);
            }
        } catch (err) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            setLoading(true);
            fetchNotifications();
        }
    }, [visible, fetchNotifications]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const markAllAsRead = async () => {
        try {
            await fetchWithFallback(
                "/api/notifications/send-all",
                await withAuthHeaders({
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ markAllRead: true }),
                })
            );
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (err) {
        }
    };

    const handleNotificationPress = (item: NotificationItem) => {
        // Check if it's a booking notification with booking data
        if ((item.type === "booking" || item.type === "booking_confirmation") && item.booking) {
            setSelectedBooking(item.booking);
            // Close notification modal first, then open QR modal after animation completes
            onClose();
            setTimeout(() => {
                setQrModalVisible(true);
            }, 400);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "booking":
            case "booking_confirmation":
                return "ticket-outline";
            case "promo":
                return "pricetag-outline";
            case "event":
                return "calendar-outline";
            default:
                return "notifications-outline";
        }
    };

    const renderNotification = ({ item }: { item: NotificationItem }) => {
        const isBookingNotification =
            (item.type === "booking" || item.type === "booking_confirmation") && item.booking;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.notificationCard,
                    !item.is_read && styles.notificationUnread,
                    isBookingNotification && styles.notificationBooking,
                    pressed && styles.notificationPressed,
                ]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={[
                    styles.notificationIconContainer,
                    isBookingNotification && styles.notificationIconBooking,
                ]}>
                    <Ionicons
                        name={getNotificationIcon(item.type)}
                        size={20}
                        color={isBookingNotification ? "#00D26A" : Colors.dark.primary}
                    />
                </View>
                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.notificationTime}>
                            {formatTime(item.created_at)}
                        </Text>
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.message}
                    </Text>
                    {isBookingNotification && (
                        <View style={styles.viewTicketBadge}>
                            <Ionicons name="qr-code-outline" size={12} color="#00D26A" />
                            <Text style={styles.viewTicketText}>
                                {item.booking?.booking_type === "club"
                                    ? "Tap to view entry pass"
                                    : "Tap to view ticket"}
                            </Text>
                        </View>
                    )}
                </View>
                {
                    !item.is_read && <View style={[
                        styles.unreadDot,
                        isBookingNotification && styles.unreadDotGreen,
                    ]} />
                }
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="rgba(255,255,255,0.3)"
                    style={styles.chevronIcon}
                />
            </Pressable >
        );
    };

    return (
        <>
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    {/* Tappable backdrop to dismiss */}
                    <Pressable style={styles.modalBackdrop} onPress={onClose} />

                    {/* Bottom sheet content */}
                    <View style={styles.modalContainer}>
                        <LinearGradient
                            colors={["rgba(139, 0, 69, 0.4)", "rgba(45, 10, 31, 0.6)", Colors.dark.background]}
                            locations={[0, 0.4, 0.8]}
                            style={styles.gradientBackground}
                        />

                        {/* Swipe Indicator - tappable to dismiss */}
                        <Pressable onPress={onClose} style={styles.swipeIndicatorArea}>
                            <View style={styles.swipeIndicator} />
                        </Pressable>

                        {/* Header */}
                        <View style={styles.headerRow}>
                            <Text style={styles.screenTitle}>Notifications</Text>
                            {unreadCount > 0 && (
                                <Pressable onPress={markAllAsRead} style={styles.markReadButton}>
                                    <Text style={styles.markReadText}>Mark all read</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Content */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={Colors.dark.primary} />
                                <Text style={styles.loadingText}>Loading notifications...</Text>
                            </View>
                        ) : notifications.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons
                                        name="notifications-off-outline"
                                        size={48}
                                        color={Colors.dark.primary}
                                    />
                                </View>
                                <Text style={styles.emptyTitle}>No notifications yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    When you receive notifications, they'll appear here
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={(item) => item.id}
                                renderItem={renderNotification}
                                contentContainerStyle={styles.listContainer}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={handleRefresh}
                                        tintColor={Colors.dark.primary}
                                    />
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Booking QR Modal */}
            <BookingQRModal
                visible={qrModalVisible}
                onClose={() => setQrModalVisible(false)}
                booking={selectedBooking}
            />
        </>
    );
}

// Notification Bell Button Component
type NotificationBellProps = {
    onPress: () => void;
    unreadCount?: number;
};

export function NotificationBell({ onPress, unreadCount = 0 }: NotificationBellProps) {
    return (
        <Pressable style={styles.bellButton} onPress={onPress}>
            <Ionicons name="notifications-outline" size={22} color={Colors.dark.text} />
            {unreadCount > 0 && <View style={styles.badge} />}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // Modal overlay
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "transparent",
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    // Modal container - reduced height
    modalContainer: {
        height: "60%",
        backgroundColor: Colors.dark.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
    },
    gradientBackground: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    swipeIndicatorArea: {
        paddingVertical: 12,
        alignItems: "center",
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        borderRadius: 2,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: Colors.dark.text,
    },
    markReadButton: {
        alignSelf: "flex-end",
        marginRight: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 20,
    },
    markReadText: {
        fontSize: 14,
        color: Colors.dark.primary,
        fontWeight: "600",
    },

    // Loading & Empty states
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        gap: 16,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(219, 68, 148, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: Colors.dark.text,
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        textAlign: "center",
        lineHeight: 20,
    },

    // Header
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 16,
    },

    // List styles
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },

    // Notification card
    notificationCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.dark.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    notificationPressed: {
        backgroundColor: "rgba(255,255,255,0.05)",
        transform: [{ scale: 0.98 }],
    },
    notificationUnread: {
        backgroundColor: "rgba(219, 68, 148, 0.08)",
        borderColor: "rgba(219, 68, 148, 0.3)",
    },
    notificationBooking: {
        backgroundColor: "rgba(0, 210, 106, 0.06)",
        borderColor: "rgba(0, 210, 106, 0.3)",
    },
    notificationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(219, 68, 148, 0.15)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    notificationIconBooking: {
        backgroundColor: "rgba(0, 210, 106, 0.15)",
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.dark.text,
        flex: 1,
        marginRight: 8,
    },
    notificationTime: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
    },
    notificationMessage: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        lineHeight: 20,
    },
    viewTicketBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: "rgba(0, 210, 106, 0.1)",
        borderRadius: 6,
        alignSelf: "flex-start",
    },
    viewTicketText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#00D26A",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF3B30",
        position: "absolute",
        top: 14,
        right: 14,
    },
    unreadDotGreen: {
        backgroundColor: "#00D26A",
    },
    chevronIcon: {
        marginLeft: 8,
    },

    // Bell button
    bellButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.dark.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
    },
    badge: {
        position: "absolute",
        top: 8,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF3B30",
        borderWidth: 1,
        borderColor: Colors.dark.surface,
    },
    badgeText: {
        display: "none",
    },
});