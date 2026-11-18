"use client";

import Link from "next/link";
import { useActionState } from "react";
import { renameAccount, signIn, signUp, type FormState } from "@/lib/auth/actions";
import { rememberGuestChoice } from "@/lib/auth/guest-choice";
import { Field, FormMessage } from "./auth-card";

const altClass = "mt-4 text-center font-sans text-[13.5px] leading-[1.7] text-ink-soft";
const linkClass = "font-bold text-accent";

export function SignUpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  return (
    <>
      <form action={action} noValidate>
        <Field
          label="Display name"
          name="displayName"
          autoComplete="nickname"
          placeholder="How the leaderboard will know you"
          defaultValue={state.values?.displayName}
          hint="2–30 characters. Shown on the leaderboard."
        />
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
        />
        <FormMessage error={state.error} message={state.message} />
        <button type="submit" disabled={pending} className="btn-accent w-full">
          {pending ? "Setting the type…" : "Create account & play"}
        </button>
      </form>
      <p className={altClass}>
        Already have an account?{" "}
        <Link href="/signin" className={linkClass}>
          Sign in
        </Link>
        <br />
        Just looking?{" "}
        <Link href="/play" onClick={rememberGuestChoice} className={linkClass}>
          Play as a guest
        </Link>
      </p>
    </>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <>
      <form action={action} noValidate>
        <Field
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
        />
        <FormMessage error={state.error} message={state.message} />
        <button type="submit" disabled={pending} className="btn-accent w-full">
          {pending ? "Checking the files…" : "Sign in"}
        </button>
      </form>
      <p className={altClass}>
        No account yet?{" "}
        <Link href="/signup" className={linkClass}>
          Create one
        </Link>
        <br />
        Just looking?{" "}
        <Link href="/play" onClick={rememberGuestChoice} className={linkClass}>
          Play as a guest
        </Link>
      </p>
    </>
  );
}

export function RenameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renameAccount, {});
  return (
    <form action={action} noValidate>
      <Field
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        defaultValue={state.values?.displayName ?? current}
        hint="2–30 characters. Shown on the leaderboard."
      />
      <FormMessage error={state.error} message={state.message} />
      <button type="submit" disabled={pending} className="btn-ink w-full">
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
