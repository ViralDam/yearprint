import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to pick up your scores and your place on the leaderboard. Any games you played as a guest come with you."
    >
      <SignInForm />
    </AuthCard>
  );
}
