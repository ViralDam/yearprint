import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="One account for every edition: your scores and your leaderboard name, kept together. Playing as a guest? Today's game comes with you."
    >
      <SignUpForm />
    </AuthCard>
  );
}
