import crypto from "node:crypto";
import Razorpay from "razorpay";
import type { PaymentProvider } from "./provider";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function createRazorpayProvider(): PaymentProvider {
    const keyId = requireEnv("RAZORPAY_API_KEY");
    const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
  
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

  return {
    name: "razorpay",
    publicKey: keyId,

    async createOrder({ amountPaise, currency, receipt, notes }) {
      const order = await client.orders.create({
        amount: amountPaise,
        currency,
        receipt,
        notes,
      });
      return { orderId: order.id, amount: Number(order.amount), currency: order.currency };
    },

    verifyCheckoutSignature({ orderId, paymentId, signature }) {
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },
  };
}