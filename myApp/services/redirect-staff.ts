import { Router } from "expo-router";

export async function redirectStaff(router: Router) {
  // Redirect to staff index which will check status and redirect accordingly
  router.replace("/staff");
}