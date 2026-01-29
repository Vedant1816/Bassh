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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { redirectToRoleHome } from "@/_services/user-role";
import { Colors } from "@/constants/Colors";

const { height: INITIAL_HEIGHT } = Dimensions.get("window");
const CURTAIN_HEIGHT_RATIO = 1;

/* Signup curtain: dark pink at top → lighter toward bottom */
const SIGNUP_GRADIENT_COLORS = [
  "#701a3a",
  "#9d174d",
  Colors.dark.primaryDark,
  Colors.dark.primary,
  Colors.dark.primaryLight,
] as const;

const LOGIN_BUTTON_GRADIENT = [
  Colors.dark.primaryLight,
  Colors.dark.primary,
  Colors.dark.primaryDark,
] as const;

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

    /* Create user profile (from signup.tsx) */
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

    /* Redirect to onboarding (signup flow – same as signup.tsx) */
    router.replace("/onboarding/about-you" as Parameters<typeof router.replace>[0]);
    setSignupLoading(false);
  };

  const loginTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 72],
  });

  const curtainTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-curtainHeight, 0],
  });

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* LOGIN (BACKGROUND) */}
          <Animated.View
            style={[
              styles.formContainer,
              { transform: [{ translateY: loginTranslateY }] },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formCard}>
                <Text style={styles.loginTitle}>Welcome back</Text>
                <Text style={styles.loginSubtitle}>
                  Sign in to continue to BASSH
                </Text>

                <TextInput
                  placeholder="Email"
                  placeholderTextColor={Colors.dark.textTertiary}
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />

                <TextInput
                  placeholder="Password"
                  placeholderTextColor={Colors.dark.textTertiary}
                  secureTextEntry
                  style={styles.input}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                  onPress={handleLogin}
                >
                  <LinearGradient
                    colors={[...LOGIN_BUTTON_GRADIENT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>Sign in</Text>
                  </LinearGradient>
                </Pressable>

                {loginError ? (
                  <Text style={styles.error} numberOfLines={2}>
                    {loginError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => toggleCurtain(true)}
                  style={({ pressed }) => [
                    styles.createAccountWrap,
                    pressed && styles.createAccountWrapPressed,
                  ]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.createAccountLabel}>
                    Don't have an account?{" "}
                    <Text style={styles.createAccountLink}>Create account</Text>
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>

          {/* CURTAIN (SIGNUP) – full screen pink gradient */}
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
              colors={[...SIGNUP_GRADIENT_COLORS]}
              locations={[0, 0.28, 0.55, 0.8, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.curtainGradient}
            >
              <ScrollView
                contentContainerStyle={[
                  styles.curtainContent,
                  { paddingTop: insets.top + 32 },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.curtainLogo}>BASSH</Text>
                <Text style={styles.curtainTagline}>Create your account</Text>

                <TextInput
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  style={styles.curtainInput}
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />

                <TextInput
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  secureTextEntry
                  style={styles.curtainInput}
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                />

                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  secureTextEntry
                  style={styles.curtainInput}
                  value={signupConfirmPassword}
                  onChangeText={setSignupConfirmPassword}
                />

                <Pressable
                  style={({ pressed }) => [
                    styles.curtainButton,
                    pressed && styles.curtainButtonPressed,
                    signupLoading && styles.curtainButtonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={signupLoading}
                >
                  <Text style={styles.curtainButtonText}>
                    {signupLoading ? "Creating…" : "Sign up"}
                  </Text>
                </Pressable>

                {signupError ? (
                  <Text style={styles.curtainError} numberOfLines={2}>
                    {signupError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => toggleCurtain(false)}
                  style={styles.switchWrap}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.switchText}>
                    Already have an account?{" "}
                    <Text style={styles.switchTextBold}>Sign in</Text>
                  </Text>
                </Pressable>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    position: "absolute",
    width: "100%",
    height: INITIAL_HEIGHT,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  formCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 28,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  loginTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    marginBottom: 28,
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  error: {
    color: Colors.dark.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: 14,
    paddingHorizontal: 8,
  },
  createAccountWrap: {
    marginTop: 28,
    alignItems: "center",
  },
  createAccountWrapPressed: {
    opacity: 0.7,
  },
  createAccountLabel: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  createAccountLink: {
    color: Colors.dark.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  /* Curtain – full screen pink gradient */
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
    flex: 1,
    width: "100%",
  },
  curtainContent: {
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  curtainLogo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 2,
  },
  curtainTagline: {
    fontSize: 17,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: 28,
  },
  curtainInput: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  curtainButton: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  curtainButtonPressed: {
    opacity: 0.9,
  },
  curtainButtonDisabled: {
    opacity: 0.7,
  },
  curtainButtonText: {
    color: Colors.dark.primary,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  curtainError: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 8,
  },
  switchWrap: {
    marginTop: 24,
    alignItems: "center",
  },
  switchText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },
  switchTextBold: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
