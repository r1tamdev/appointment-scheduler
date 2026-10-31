export type OutgoingMessage={
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface NotificationChannel{
  readonly name: "EMAIL" | "SMS" | "WHATSAPP";
  send(message: OutgoingMessage): Promise<{ providerRef: string}>;
}