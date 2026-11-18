import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";

const buttonClass =
  "max-w-[170px] truncate rounded-[3px] bg-gold px-3 py-[7px] font-sans text-[12.5px] font-extrabold tracking-[0.03em] text-[#221c11] hover:brightness-108";

/** Header account button: "Sign in" for guests, the player's name otherwise. */
export async function AccountButton() {
  const viewer = await getViewer();
  if (!viewer || viewer.isGuest) {
    return (
      <Link href="/signin" className={buttonClass}>
        Sign in
      </Link>
    );
  }
  const name = viewer.displayName ?? "Account";
  return (
    <Link href="/account" className={buttonClass} title={`Signed in as ${name}`}>
      {name}
    </Link>
  );
}

export function AccountButtonFallback() {
  return (
    <span className={`${buttonClass} invisible`} aria-hidden="true">
      Sign in
    </span>
  );
}
