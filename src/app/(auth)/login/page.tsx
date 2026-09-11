"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppShellSkeleton from "@/components/skeletons/AppShellSkeleton";

type LoginForm = z.infer<typeof loginSchema>;

const SPLASH_MS = 1500;
const SKELETON_AT = 650;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [splash, setSplash] = useState<{ name: string | null; go: string; role: "admin" | "resident" } | null>(null);
  const [skeleton, setSkeleton] = useState(false);
  const splashTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (splashTimer.current) clearTimeout(splashTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!splash) return;
    setSkeleton(false);
    const skeletonTimer = setTimeout(() => setSkeleton(true), SKELETON_AT);
    splashTimer.current = setTimeout(() => {
      clearTimeout(skeletonTimer);
      router.push(splash.go);
      router.refresh();
    }, SPLASH_MS);
  }, [splash, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const msg = error.message ?? "";
      setError(msg === "Invalid login credentials" ? "Invalid email or password." : msg || "Unable to login. Please try again.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, first_name")
      .eq("email", data.email)
      .single();

    const redirectTo = searchParams.get("redirectedFrom");
    const go = redirectTo ?? (profile?.role === "resident" ? "/resident/dashboard" : "/admin/dashboard");
    setSplash({ name: profile?.first_name ?? null, go, role: profile?.role === "resident" ? "resident" : "admin" });
  };

  if (splash) {
    if (skeleton) {
      return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <AppShellSkeleton variant={splash.role} />
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 splash-icon">
          <Building2 className="h-9 w-9 text-white" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900 splash-rise">
          Welcome back{splash.name ? `, ${splash.name}` : ""}!
        </h2>
        <p className="mt-1 text-sm text-gray-500 splash-rise" style={{ animationDelay: "0.15s" }}>
          We&apos;re happy to see you again
        </p>
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
          <Building2 className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to BarangayConnect</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Link href="/reset-password" className="text-sm text-blue-600 hover:text-blue-700">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Account provided by the barangay office? Sign in with the credentials they gave you.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}