import { supabaseEnv } from "@/lib/supabase/env";

const BUCKET = "edition-images";

/** Public URL of an image in the edition-images bucket. */
export function editionImageUrl(path: string): string {
  return `${supabaseEnv().url}/storage/v1/object/public/${BUCKET}/${path}`;
}
