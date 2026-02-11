import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_S87ed3mUSlzztX",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "H7Q9tiHomxudW0mxfDR36Htp",
});