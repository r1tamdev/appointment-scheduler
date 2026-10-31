const styles: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-gray-100 text-gray-600",
  AVAILABLE: "bg-green-100 text-green-800",
  HELD: "bg-amber-100 text-amber-800",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  PROCESSED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}