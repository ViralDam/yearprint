import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { RenameForm } from "@/components/auth/forms";
import { StatsPanel } from "@/components/board/stats-panel";
import { signOut } from "@/lib/auth/actions";
import { getViewer } from "@/lib/auth/viewer";
import { getMyStats } from "@/lib/game/data";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Your account" subtitle="Fetching your file…">
          {null}
        </AuthCard>
      }
    >
      <Account />
    </Suspense>
  );
}

async function Account() {
  const viewer = await getViewer();

  if (!viewer || viewer.isGuest) {
    return (
      <AuthCard
        title="You're reading as a guest"
        subtitle="Guests can play every edition, but only accounts appear on the leaderboard. Create one and today's game comes with you."
      >
        <div className="flex flex-col gap-2.5">
          <Link href="/signup" className="btn-accent text-center">
            Create an account
          </Link>
          <Link href="/signin" className="btn-outline text-center">
            Sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={viewer.displayName ?? "Your account"}
      subtitle={viewer.email ? `Signed in as ${viewer.email}` : "Signed in"}
    >
      <Stats />
      <RenameForm current={viewer.displayName ?? ""} />
      <form action={signOut} className="mt-5 border-t-[1.5px] border-rule/30 pt-5">
        <button type="submit" className="btn-outline w-full">
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}

async function Stats() {
  const stats = await getMyStats();
  if (!stats) return null;
  return (
    <div className="mb-6 border-b-[1.5px] border-rule/30 pb-5">
      <h2 className="mb-3 font-display text-[21px] font-black">Your record</h2>
      <StatsPanel stats={stats} />
    </div>
  );
}
