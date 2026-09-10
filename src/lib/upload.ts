import type { LocalSupabase } from "@/lib/supabase/client";
import { MAX_FILE_SIZE, ALLOWED_DOCUMENT_TYPES } from "@/constants";

export interface UploadedFile {
  url: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
}

export const BUCKET = "barangay-attachments";

function uniqueName(file: File, folder: string): string {
  const stamp = Date.now();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_") || `scan_${stamp}`;
  const ext = safeName.split(".").pop()?.toLowerCase();
  const stem = safeName.slice(0, safeName.length - (ext ? `.${ext}`.length : 0));
  const finalExt =
    ext && /^(jpg|jpeg|png|webp|pdf)$/.test(ext) ? ext : file.type === "application/pdf" ? "pdf" : "jpg";
  return `${folder}/${stamp}_${stem}.${finalExt}`;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE * 2) {
    return `File "${file.name}" exceeds the 10MB limit.`;
  }
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return `File "${file.name}" must be a JPG, PNG, or PDF.`;
  }
  return null;
}

export async function uploadFile(
  supabase: LocalSupabase,
  file: File,
  folder: string
): Promise<UploadedFile> {
  const validationError = validateFile(file);
  if (validationError) throw new Error(validationError);

  const path = uniqueName(file, folder);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: publicData.publicUrl,
    path,
    name: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

export async function uploadFiles(
  supabase: LocalSupabase,
  files: File[],
  folder: string
): Promise<UploadedFile[]> {
  const results: UploadedFile[] = [];
  for (const file of files) {
    results.push(await uploadFile(supabase, file, folder));
  }
  return results;
}

/** Given a public URL value, return the storage path (or null if not ours). */
export function storagePathFromUrl(value: string, bucket: string = BUCKET): string | null {
  const markers = [`/storage/v1/object/public/${bucket}/`, `/api/local/files/${bucket}/`];
  for (const marker of markers) {
    const idx = value.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(value.slice(idx + marker.length));
    }
  }
  return null;
}

export async function deleteFile(
  supabase: LocalSupabase,
  urlOrPath: string
): Promise<void> {
  const path = urlOrPath.includes("/storage/v1/object/public/") || urlOrPath.includes("/api/local/files/")
    ? storagePathFromUrl(urlOrPath)
    : urlOrPath;
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}