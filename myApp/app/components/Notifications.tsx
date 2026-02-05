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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { fetchWithFallback } from "@/_services/api-config";
import { withAuthHeaders } from "@/_services/auth-fetch";

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

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetchWithFallback(
                "/api/notifications/send-all",
                await withAuthHeaders({ method: "GET" })
            );
            const json = await res.json();
            if (res.ok) {
                setNotifications(json.notifications || []);
                setUnreadCount(json.unreadCount || 0);
            }
        } catch (err) {
            console.error("❌ Notification fetch failed", err);
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
            console.error("❌ Failed to mark all as read", err);
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

    const renderNotification = ({ item }: { item: NotificationItem }) => (
        <Pressable
            style={[
                styles.notificationCard,
                !item.is_read && styles.notificationUnread,
            ]}
        >
            <View style={styles.notificationIconContainer}>
                <Ionicons
                    name={getNotificationIcon(item.type)}
                    size={22}
                    color={Colors.dark.primary}
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
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={Colors.dark.text} />
                    </Pressable>
                    <Text style={styles.modalTitle}>Notifications</Text>
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
                        <Ionicons
                            name="notifications-off-outline"
                            size={64}
                            color={Colors.dark.textSecondary}
                        />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptySubtitle}>
                            You're all caught up! Check back later.
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
        </Modal>
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
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.dark.text,
    },
    markReadButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
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
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.dark.text,
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        textAlign: "center",
    },

    // List styles
    listContainer: {
        padding: 16,
        gap: 12,
    },

    // Notification card
    notificationCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: Colors.dark.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    notificationUnread: {
        backgroundColor: "rgba(219, 68, 148, 0.08)",
        borderColor: Colors.dark.primary,
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
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.dark.primary,
        position: "absolute",
        top: 14,
        right: 14,
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
        top: 2,
        right: 2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.dark.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.dark.text,
    },
});