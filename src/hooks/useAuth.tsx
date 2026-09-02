"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { UserRole } from "@/types/enums";

interface AuthState {
  user: User | null;
  profile: { id: string; role: UserRole; first_name: string; last_name: string; email: string; avatar_url: string | null } | null;
  loading: boolean;
  isAdmin: boolean;
  isResident: boolean;
  isCaptain: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isResident: false,
  isCaptain: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(supabase, session.user.id);
      }
      setLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(supabase, session.user.id);
      } else {
        setProfile(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (supabase: any, userId: string) => {
    const { data } = await supabase
      .from("users")
      .select("id, role, first_name, last_name, email, avatar_url")
      .eq("id", userId)
      .single();

    if (data) setProfile(data);
  };

  const role = profile?.role;
  const isResident = role === "resident";
  const isAdmin = !!role && role !== "resident";
  const isCaptain = role === "captain";

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isResident, isCaptain }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
