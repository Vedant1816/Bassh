import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Staff signup is merged into staff-login. Redirect to staff-login with signup open.
 */
export default function StaffSignupRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff-login?signup=1");
  }, [router]);
  return null;
}
