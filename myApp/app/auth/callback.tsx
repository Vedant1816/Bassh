import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import supabasePublic from '@/_services/supabase-public';
import { redirectToRoleHome } from '@/_services/user-role';

export default function AuthCallback() {
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const handleTokens = async () => {
            // Tokens can be in query params or hash (which expo-router might put in params)
            const accessToken = params.access_token as string;
            const refreshToken = params.refresh_token as string;

            if (accessToken && refreshToken) {
                try {
                    const { error } = await supabasePublic.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (!error) {
                        await redirectToRoleHome(router);
                        return;
                    }
                } catch (e) {
                    // Fallback to login
                }
            }

            // If no tokens or error, redirect to login
            const timeout = setTimeout(() => {
                router.replace('/(auth)/login');
            }, 1500);

            return () => clearTimeout(timeout);
        };

        handleTokens();
    }, [params]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
