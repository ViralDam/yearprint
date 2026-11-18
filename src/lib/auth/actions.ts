"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  message?: string;
  /** Echoed back so the form keeps what the player typed. */
  values?: Record<string, string>;
}

const email = z.email("Enter a valid email address.");
const password = z.string().min(6, "Your password needs at least 6 characters.").max(72);
const displayName = z
  .string()
  .trim()
  .min(2, "Choose a display name of at least 2 characters.")
  .max(30, "Keep your display name to 30 characters.")
  .regex(/^[\p{L}\p{N} ._'-]+$/u, "Use letters, numbers, spaces and . _ - ' only.");

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

function text(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * Creates an account. A guest is converted in place (same user, so today's
 * game comes along); anyone else gets a brand-new account.
 */
export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { displayName: text(form, "displayName"), email: text(form, "email") };
  const parsed = z
    .object({ displayName, email, password })
    .safeParse({ ...values, password: text(form, "password") });
  if (!parsed.success) return { error: firstIssue(parsed.error), values };
  const { data: input } = parsed;

  const supabase = await createClient();
  const { data: available } = await supabase.rpc("display_name_available", {
    p_name: input.displayName,
  });
  if (!available) return { error: "That display name is taken — try another.", values };

  const { data: claims } = await supabase.auth.getClaims();
  const isGuest = claims?.claims?.is_anonymous === true;

  if (isGuest) {
    const linked = await supabase.auth.updateUser({
      email: input.email,
      data: { display_name: input.displayName },
    });
    if (linked.error) {
      return {
        error: isEmailTaken(linked.error)
          ? "An account already uses that email. Sign in instead — your game will come with you."
          : "We couldn't create your account. Please try again.",
        values,
      };
    }
    if (!linked.data.user?.email) {
      return {
        message: "Check your inbox to confirm your email, then come back to set a password.",
        values,
      };
    }
    const secured = await supabase.auth.updateUser({ password: input.password });
    if (secured.error) {
      return { error: "Your email is saved, but setting the password failed. Try again.", values };
    }
    // The access token still says is_anonymous: true until it's re-issued.
    await supabase.auth.refreshSession();
    // The profile trigger may have run before the name arrived; make sure it's set.
    await supabase.rpc("set_display_name", { p_name: input.displayName });
  } else {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) {
      return {
        error: isEmailTaken(error)
          ? "An account already uses that email. Sign in instead."
          : "We couldn't create your account. Please try again.",
        values,
      };
    }
    if (!data.session) {
      return { message: "Check your inbox to confirm your email, then sign in.", values };
    }
  }

  redirect("/play");
}

/**
 * Signs in to an existing account. A guest's games move across first
 * (except editions the account already played).
 */
export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: text(form, "email") };
  const parsed = z
    .object({ email, password: z.string().min(1, "Enter your password.") })
    .safeParse({ ...values, password: text(form, "password") });
  if (!parsed.success) return { error: firstIssue(parsed.error), values };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  let ticket: string | null = null;
  if (claims?.claims?.is_anonymous === true) {
    const { data } = await supabase.rpc("create_merge_ticket");
    ticket = data ?? null;
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match an account.", values };

  if (ticket) await supabase.rpc("redeem_merge_ticket", { p_token: ticket });
  redirect("/play");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function renameAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { displayName: text(form, "displayName") };
  const parsed = displayName.safeParse(values.displayName);
  if (!parsed.success) return { error: firstIssue(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_display_name", { p_name: parsed.data });
  if (error) {
    return {
      error:
        error.message === "display_name_taken"
          ? "That display name is taken — try another."
          : "We couldn't save that name. Please try again.",
      values,
    };
  }
  refresh();
  return { message: `You're now ${data}.`, values: { displayName: data ?? parsed.data } };
}

function isEmailTaken(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered|already exists/i.test(error.message ?? "")
  );
}
