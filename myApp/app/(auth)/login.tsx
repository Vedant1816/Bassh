import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ThemedButton } from "@/components/ui/ThemedButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import supabasePublic from "@/_services/supabase-public";
import { withAuthHeaders } from "@/_services/auth-fetch";
import { fetchWithFallback } from "@/_services/api-config";
import { redirectToRoleHome } from "@/_services/user-role";
import { Colors, HeaderGradient, HeaderGradientLocations } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

const CURTAIN_HEIGHT_RATIO = 1;

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();

  const [isSignupOpen, setIsSignupOpen] = useState(true);
  const slideAnim = useState(new Animated.Value(1))[0];
  const curtainHeight = SCREEN_HEIGHT * CURTAIN_HEIGHT_RATIO;

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

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
    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      setLoginError(error.message);
      return;
    }



    await redirectToRoleHome(router);
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setLoginError("");
      setSignupError("");

      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "bassh",
        path: "auth/callback",
      });

      const { data, error } = await supabasePublic.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setLoginError(error.message);
        setGoogleLoading(false);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (result.type === "success") {
          // Supabase returns tokens in URL hash fragment
          const url = new URL(result.url);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const queryParams = new URLSearchParams(url.search);

          // Try hash fragment first (Supabase default), then query params
          const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabasePublic.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              setLoginError(sessionError.message);
              setGoogleLoading(false);
              return;
            }



            // Check if user exists, if not create profile
            const {
              data: { user },
            } = await supabasePublic.auth.getUser();

            if (user) {
              try {
                // Check if profile exists
                const checkRes = await fetchWithFallback(
                  "/api/users",
                  await withAuthHeaders({ method: "GET" })
                );

                if (checkRes.status === 404) {
                  // NEW USER SIGNUP -> Go to onboarding
                  await fetchWithFallback(
                    "/api/users",
                    await withAuthHeaders({
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email: user.email,
                        role: "user",
                      }),
                    })
                  );
                  router.replace("/onboarding/about-you");
                  return;
                }
              } catch (err) {
              }
            }

            await redirectToRoleHome(router);
          } else {
            setLoginError("Failed to retrieve authentication tokens");
          }
        } else if (result.type === "cancel") {
          // User cancelled, don't show error
        } else {
          setLoginError("Google sign in failed");
        }
      }
    } catch (error: any) {
      setLoginError(error.message || "Failed to sign in with Google");
    } finally {
      setGoogleLoading(false);
    }
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
      }
    } catch {
      // If profile creation fails, user can still continue onboarding
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
          {/* LOGIN (BACKGROUND) */}
          <Animated.View
            pointerEvents={isSignupOpen ? "none" : "auto"}
            style={[
              styles.formContainer,
              {
                height: SCREEN_HEIGHT,
                transform: [{ translateY: loginTranslateY }],
                opacity: loginOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={[...HeaderGradient]}
              locations={[...HeaderGradientLocations]}
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
                <Pressable
                  style={styles.backButton}
                  onPress={() => router.replace("/(auth)")}
                >
                  <Text style={styles.backIcon}>‹</Text>
                </Pressable>
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
                  placeholderTextColor={Colors.dark.textSecondary}
                  style={styles.input}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={Colors.dark.textSecondary}
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

              {/* Google Sign In Button */}
              <View style={styles.socialAuthContainer}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Pressable
                  style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={Colors.dark.text} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={Colors.dark.text} />
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
            <View style={styles.bottomContainer}>
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

          {/* SIGNUP CURTAIN */}
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
              colors={[...HeaderGradient]}
              locations={[...HeaderGradientLocations]}
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
                    placeholderTextColor={Colors.dark.textSecondary}
                    style={styles.input}
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                  <TextInput
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor={Colors.dark.textSecondary}
                    secureTextEntry
                    style={styles.input}
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                  />
                  <TextInput
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.dark.textSecondary}
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

                {/* Google Sign In Button */}
                <View style={styles.socialAuthContainer}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <Pressable
                    style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={Colors.dark.text} />
                    ) : (
                      <>
                        <Ionicons name="logo-google" size={20} color={Colors.dark.text} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
              <View style={styles.bottomContainer}>
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
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    position: "absolute",
    width: "100%",
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
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark.text,
    textAlign: "center",
  },
  titleSection: {
    marginBottom: 40,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.dark.text,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  inputsWrap: {
    gap: 16,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  error: {
    color: Colors.dark.error,
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
  curtainError: {
    color: Colors.dark.error,
    fontSize: 13,
    marginTop: 14,
    textAlign: "center",
  },
  linkWrap: {
    marginBottom: 16,
    alignItems: "center",
  },
  linkLabel: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  link: {
    color: Colors.dark.primary,
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
  sendButton: {
    height: 56,
    borderRadius: 28,
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
    opacity: 0.3,
  },

  /* Curtain */
  curtainPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    zIndex: 10,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  socialAuthContainer: {
    marginTop: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
  },
});
