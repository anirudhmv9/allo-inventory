import Link from "next/link";
import { ReservationCheckout } from "@/components/reservation-checkout";

type ReservationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400"
          >
            ← Back to products
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reservation checkout
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Confirm your purchase before the reservation expires.
          </p>
        </div>
      </header>

      <main className="px-4 py-10 sm:px-6 lg:px-8">
        <ReservationCheckout reservationId={id} />
      </main>
    </div>
  );
}
