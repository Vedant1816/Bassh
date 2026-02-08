import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, PrimaryGradient } from "@/constants/Colors";

const PINK_PRIMARY = "#FF007E";

interface Discount {
    id: string;
    discount_type: string;
    discount_value: number;
    min_purchase: number;
    max_discount: number | null;
    code: string | null;
    name: string;
    description: string | null;
}

interface CouponsModalProps {
    visible: boolean;
    onClose: () => void;
    discounts: Discount[];
    clubName: string;
}

export function CouponsModal({ visible, onClose, discounts, clubName }: CouponsModalProps) {
    const getDiscountDesc = (discount: Discount) => {
        if (discount.max_discount != null) {
            return `Get upto ₹${discount.max_discount} off`;
        }
        if (discount.discount_type === "percentage") {
            return `Get ${discount.discount_value}% off`;
        }
        return `Get ₹${discount.discount_value} off`;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Available Coupons</Text>
                            <Text style={styles.modalSubtitle}>{clubName}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Colors.dark.text} />
                        </Pressable>
                    </View>

                    {/* Coupons List */}
                    <ScrollView style={styles.couponsScroll} showsVerticalScrollIndicator={false}>
                        {discounts.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="pricetag-outline" size={48} color={Colors.dark.textSecondary} />
                                <Text style={styles.emptyText}>No coupons available</Text>
                            </View>
                        ) : (
                            discounts.map((discount) => (
                                <Pressable key={discount.id} style={styles.couponCard}>
                                    {/* Watermark icon on right side */}
                                    <View style={styles.couponWatermark}>
                                        <Ionicons
                                            name="pricetag"
                                            size={60}
                                            color="rgba(255, 255, 255, 0.08)"
                                            style={styles.couponWatermarkIcon}
                                        />
                                    </View>

                                    <View style={styles.couponContent}>
                                        <View style={styles.couponLeft}>
                                            <Ionicons
                                                name="pricetag"
                                                size={24}
                                                color={PINK_PRIMARY}
                                                style={styles.couponIcon}
                                            />
                                            <View style={styles.couponTextContainer}>
                                                <Text style={styles.couponName}>{discount.name}</Text>
                                                <Text style={styles.couponDescription}>
                                                    {getDiscountDesc(discount)}
                                                </Text>
                                                {discount.code && (
                                                    <Text style={styles.couponCode}>Code: {discount.code}</Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Min Purchase Badge */}
                                        <View style={styles.minPurchaseContainer}>
                                            <Text style={styles.minPurchaseLabel}>Min</Text>
                                            <Text style={styles.minPurchaseValue}>₹{discount.min_purchase}</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "flex-end",
    },

    modalContainer: {
        backgroundColor: Colors.dark.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "85%",
        paddingTop: 24,
    },

    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        marginBottom: 20,
    },

    modalTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.dark.text,
        marginBottom: 4,
    },

    modalSubtitle: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
    },

    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.dark.surface,
        justifyContent: "center",
        alignItems: "center",
    },

    couponsScroll: {
        paddingHorizontal: 24,
    },

    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        gap: 12,
    },

    emptyText: {
        fontSize: 16,
        color: Colors.dark.textSecondary,
    },

    // Coupon Card - Matching PayBillModal design
    couponCard: {
        width: "100%",
        minHeight: 82,
        borderRadius: 12,
        backgroundColor: "rgba(45, 45, 45, 0.95)",
        overflow: "hidden",
        position: "relative",
        marginBottom: 12,
    },

    couponWatermark: {
        position: "absolute",
        right: 60,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },

    couponWatermarkIcon: {
        transform: [{ rotate: "-15deg" }],
    },

    couponContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 16,
        paddingRight: 12,
        paddingVertical: 16,
    },

    couponLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },

    couponIcon: {
        transform: [{ rotate: "90deg" }],
    },

    couponTextContainer: {
        gap: 4,
        flex: 1,
    },

    couponName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    couponDescription: {
        fontSize: 14,
        color: "#9A9A9A",
    },

    couponCode: {
        fontSize: 12,
        color: PINK_PRIMARY,
        fontWeight: "600",
        letterSpacing: 0.5,
        marginTop: 2,
    },

    minPurchaseContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: "rgba(180, 180, 180, 0.6)",
        minWidth: 70,
    },

    minPurchaseLabel: {
        fontSize: 10,
        color: "#9A9A9A",
        fontWeight: "500",
        marginBottom: 2,
    },

    minPurchaseValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});
