import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { redirectToRoleHome } from "@/_services/user-role";

const { height: INITIAL_HEIGHT } = Dimensions.get("window");
const CURTAIN_HEIGHT_RATIO = 1;

/* Same gradient as onboarding/otp.tsx */
const GRADIENT_COLORS = ["#8B0045", "#2D0A1F", "#000000"] as const;
const GRADIENT_LOCATIONS = [0, 0.4, 1] as const;

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const [isSignupOpen, setIsSignupOpen] = useState(true);
  const slideAnim = useState(new Animated.Value(1))[0];
  const curtainHeight = SCREEN_HEIGHT * CURTAIN_HEIGHT_RATIO;

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const toggleCurtain = (openSignup: boolean) => {
    Keyboard.dismiss();
    Animated.spring(slideAnim, {
      toValue: openSignup ? 1 : 0,
      useNativeDriver: true,
      tension: 55,
      friction: 12,
      velocity: openSignup ? 0 : 2,
    }).start();
    setIsSignupOpen(openSignup);
    setLoginError("");
    setSignupError("");
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginError("Email and password required");
      return;
    }
    setLoginError("");
    const { error } = await supabasePublic.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      setLoginError(error.message);
      return;
    }
    await redirectToRoleHome(router);
  };

  const handleSignup = async () => {
    if (!signupEmail?.trim() || !signupPassword || !signupConfirmPassword) {
      setSignupError("Please fill in email, password, and confirm password");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Password and confirm password do not match");
      return;
    }
    setSignupError("");
    setSignupLoading(true);

    const { error } = await supabasePublic.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword.trim(),
    });

    if (error) {
      setSignupError(error.message);
      setSignupLoading(false);
      return;
    }

    try {
      const res = await fetchWithFallback(
        "/api/users",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: signupEmail.trim(),
            role: "user",
          }),
        })
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[Signup] Profile creation failed:", err);
      }
    } catch (e) {
      console.warn("[Signup] API unreachable, continuing anyway");
    }

    router.replace("/onboarding/about-you" as Parameters<typeof router.replace>[0]);
    setSignupLoading(false);
  };

  const loginTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 72],
  });

  const loginOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const curtainTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-curtainHeight, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* LOGIN (BACKGROUND) – same theme as otp */}
          <Animated.View
            pointerEvents={isSignupOpen ? "none" : "auto"}
            style={[
              styles.formContainer,
              {
                transform: [{ translateY: loginTranslateY }],
                opacity: loginOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={[...GRADIENT_COLORS]}
              locations={[...GRADIENT_LOCATIONS]}
              style={[styles.gradientBackground, { height: SCREEN_HEIGHT * 0.5 }]}
            />
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: insets.top + 60 || 60 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.backButton} />
                <Text style={styles.headerTitle}>Welcome back</Text>
              </View>
              <View style={styles.titleSection}>
                <Text style={styles.title}>Sign in to BASSH</Text>
                <Text style={styles.subtitle}>
                  Enter your email and password to continue
                </Text>
              </View>
              <View style={styles.inputsWrap}>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  secureTextEntry
                  style={styles.input}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />
              </View>
              {loginError ? (
                <Text style={styles.error} numberOfLines={2}>
                  {loginError}
                </Text>
              ) : null}
              <Pressable
                onPress={() => toggleCurtain(true)}
                style={styles.linkWrap}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.linkLabel}>
                  Don't have an account?{" "}
                  <Text style={styles.link}>Create account</Text>
                </Text>
              </Pressable>
            </ScrollView>
            <View style={styles.bottomContainer}>
              <ThemedButton
                onPress={handleLogin}
                style={styles.sendButton}
                textStyle={styles.buttonText}
              >
                Sign in
              </ThemedButton>
              <View style={styles.homeIndicator} />
            </View>
          </Animated.View>

          {/* SIGNUP CURTAIN – same gradient + UI as otp */}
          <Animated.View
            style={[
              styles.curtainPanel,
              {
                height: curtainHeight,
                transform: [{ translateY: curtainTranslateY }],
              },
            ]}
          >
            <LinearGradient
              colors={[...GRADIENT_COLORS]}
              locations={[...GRADIENT_LOCATIONS]}
              style={[styles.curtainGradient, { height: SCREEN_HEIGHT * 0.5 }]}
            />
            <View style={styles.curtainContentWrap}>
              <ScrollView
                contentContainerStyle={[
                  styles.curtainScroll,
                  { paddingTop: insets.top + 60 || 60 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.header}>
                  <View style={styles.backButton} />
                  <Text style={styles.headerTitle}>BASSH</Text>
                </View>
                <View style={styles.titleSection}>
                  <Text style={styles.title}>Create your account</Text>
                  <Text style={styles.subtitle}>
                    Enter your details to get started
                  </Text>
                </View>
                <View style={styles.inputsWrap}>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                  <TextInput
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    secureTextEntry
                    style={styles.input}
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                  />
                  <TextInput
                    placeholder="Confirm password"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    secureTextEntry
                    style={styles.input}
                    value={signupConfirmPassword}
                    onChangeText={setSignupConfirmPassword}
                  />
                </View>
                {signupError ? (
                  <Text style={styles.curtainError} numberOfLines={2}>
                    {signupError}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => toggleCurtain(false)}
                  style={styles.linkWrap}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.linkLabel}>
                    Already have an account?{" "}
                    <Text style={styles.link}>Sign in</Text>
                  </Text>
                </Pressable>
              </ScrollView>
              <View style={styles.bottomContainer}>
                <ThemedButton
                  onPress={handleSignup}
                  disabled={signupLoading}
                  loading={signupLoading}
                  style={styles.sendButton}
                  textStyle={styles.buttonText}
                >
                  {signupLoading ? "Creating…" : "Sign up"}
                </ThemedButton>
                <View style={styles.homeIndicator} />
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    position: "absolute",
    width: "100%",
    height: INITIAL_HEIGHT,
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 32,
    width: "100%",
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  titleSection: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  inputsWrap: {
    gap: 14,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(233, 30, 140, 0.3)",
  },
  error: {
    color: "#F87171",
    fontSize: 13,
    marginTop: 14,
  },
  curtainError: {
    color: "#F87171",
    fontSize: 13,
    marginTop: 14,
  },
  linkWrap: {
    marginTop: 24,
  },
  linkLabel: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
  },
  link: {
    color: "#E91E8C",
    fontWeight: "600",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  buttonWrapper: {
    marginBottom: 16,
  },
  sendButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  homeIndicator: {
    height: 5,
    width: 134,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 12,
  },

  /* Curtain */
  curtainPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  curtainGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  curtainContentWrap: {
    flex: 1,
    width: "100%",
  },
  curtainScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
});
