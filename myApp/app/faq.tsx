import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

const FAQS = [
  { question: "How to get refund ?", answer: "Refunds are processed based on the cancellation policy of the event or club. If your booking is eligible, the refund amount will be credited to your original payment method or Bassh wallet within 5–7 working days." },
  { question: "When will I receive my refund?", answer: "Once approved, refunds are usually processed within 5–7 business days. Wallet refunds may reflect instantly." },
  { question: "Can I cancel my booking?", answer: "Yes, you can cancel your booking before the event starts. Cancellation availability depends on the club or event policy." },
  { question: "Are discounts refundable?", answer: "Discounts applied during booking are non-refundable and cannot be reused once the booking is cancelled." },
];

export default function FaqScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "FAQ",
          headerTitleStyle: {
            color: Colors.dark.text,
            fontWeight: "700",
            fontSize: 16,
          },
          headerStyle: { backgroundColor: Colors.dark.background },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
            </Pressable>
          ),
        }}
      />
      <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>All Questions</Text>
        {FAQS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <View key={index} style={styles.card}>
              <TouchableOpacity style={styles.cardHeader} activeOpacity={0.8} onPress={() => toggle(index)}>
                <Text style={styles.question}>{item.question}</Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#fff" />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.answerBox}>
                  <Text style={styles.answer}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
        <Text style={styles.contactText}>
          Feel free to <Text style={styles.contactHighlight}>Contact us</Text>
        </Text>
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#000000",
  },
  backButton: { padding: 8, marginLeft: 8 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#0F0F0F",
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  question: {
    fontSize: 16,
    fontWeight: "400",
    color: "#FFFFFF",
    flex: 1,
  },
  answerBox: {
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  answer: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  contactText: {
    marginTop: 20,
    fontSize: 15,
    color: "#666666",
  },
  contactHighlight: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
