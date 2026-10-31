import { createRazorpayProvider } from "./razorpay";
import type { PaymentProvider } from "./provider";

export function getPaymentProvider(): PaymentProvider {
  return createRazorpayProvider();
}