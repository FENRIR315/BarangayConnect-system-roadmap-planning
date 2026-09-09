"use client";

import * as React from "react";
import { Camera, FileText, Loader2, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { uploadFiles, deleteFile, validateFile } from "@/lib/upload";

interface FileUploadProps {
  /** storage sub-folder, e.g. "residents/{id}" or "me" */
  folder: string;
  /** controlled list of already-uploaded public URLs */
  value?: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  accept?: string;
  capture?: boolean;
  compact?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").pop();
    return decodeURIComponent(seg || "file");
  } catch {
    return url.slice(url.lastIndexOf("/") + 1);
  }
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) || url.includes("/image/");
}

export function FileUpload({
  folder,
  value = [],
  onChange,
  multiple = true,
  accept = "image/jpeg,image/png,image/webp,application/pdf",
  capture = false,
  compact = false,
  label,
  hint,
  className,
}: FileUploadProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<number | null>(null);

  const supabaseRef = React.useRef(createClient());

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    for (const f of list) {
      const err = validateFile(f);
      if (err) {
        setError(err);
        return;
      }
    }

    const remaining = multiple ? value.slice() : [];
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFiles(supabaseRef.current, list, folder);
      onChange(
        multiple
          ? [...remaining, ...uploaded.map((u) => u.url)]
          : [uploaded[uploaded.length - 1].url]
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  async function removeAt(idx: number) {
    setRemoving(idx);
    setError(null);
    const url = value[idx];
    try {
      await deleteFile(supabaseRef.current, url);
    } catch {
      // non-fatal: still remove from the list
    } finally {
      const next = value.filter((_, i) => i !== idx);
      onChange(next);
      setRemoving(null);
    }
  }

  React.useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        handleFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, multiple, folder]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors",
          dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100",
          compact ? "py-3" : "py-6"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            Uploading scan{value.length ? " or document" : ""}...
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-center rounded-full bg-blue-100 p-2 text-blue-600">
              <Upload className="h-5 w-5" />
            </div>
            <p className={cn("text-sm font-medium text-gray-700", compact && "text-xs")}>
              Click to browse, drag &amp; drop, or paste
            </p>
            <p className={cn("mt-1 text-xs text-gray-500", compact && "text-[11px]")}>
              JPG, PNG, or PDF up to 10MB — works with your scanner&apos;s saved files
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Choose File
              </Button>
              {capture && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="mr-1 h-3.5 w-3.5" /> Scan / Photo
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              multiple={multiple}
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((url, idx) => (
            <li
              key={`${url}-${idx}`}
              className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
                {isImageUrl(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {fileNameFromUrl(url)}
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View file
                </a>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={removing === idx}
                onClick={() => removeAt(idx)}
                aria-label="Remove file"
              >
                {removing === idx ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}