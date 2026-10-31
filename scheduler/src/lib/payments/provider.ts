export type CreateOrderInput = {
  amountPaise: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
};

export type ProviderOrder = { orderId: string; amount: number; currency: string };

export interface PaymentProvider {
  readonly name: string;
  readonly publicKey: string;
  createOrder(input: CreateOrderInput): Promise<ProviderOrder>;
  verifyCheckoutSignature(p: { orderId: string; paymentId: string; signature: string }): boolean;
}