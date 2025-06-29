"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { fetchUserUrls } from "@/app/dashboard/actions";
import { createClient } from "@/lib/supabase/supabase-client";

export interface UserUrl {
  id: number;
  short_url: string;
  long_url: string;
  created_at: string;
  visits?: number;
}

interface UrlContextType {
  userUrls: UserUrl[];
  setUserUrls: React.Dispatch<React.SetStateAction<UserUrl[]>>;
  refreshUrls: () => Promise<void>;
  removeUrl: (id: number) => void;
  addUrl: (url: UserUrl) => void;
  isRefreshing: boolean;
  user: User | null;
  isLoadingUser: boolean;
}

const UrlContext = createContext<UrlContextType | undefined>(undefined);

export function useUrls() {
  const context = useContext(UrlContext);
  if (context === undefined) {
    throw new Error("useUrls must be used within a UrlProvider");
  }
  return context;
}

interface UrlProviderProps {
  children: React.ReactNode;
}

export function UrlProvider({ children }: UrlProviderProps) {
  console.log("🚀 UrlProvider component is mounting!");
  console.log("🌍 Environment check:", {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
  });

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userUrls, setUserUrls] = useState<UserUrl[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      console.log("🔐 Starting user fetch...");
      try {
        const supabase = createClient();
        console.log("🔐 Supabase client created");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        console.log("🔐 User fetch result:", user ? "User found" : "No user");

        if (user && user.id) {
          console.log("🔐 User ID:", user.id);
          setUser(user);

          console.log("📚 Starting URLs fetch...");
          const urls = await fetchUserUrls(user.id);
          console.log("📚 URLs fetch result:", urls);

          setUserUrls(urls || []);
        }
      } catch (error) {
        console.error("❌ Error in user fetch:", error);
      } finally {
        console.log("✅ Setting isLoadingUser to false");
        setIsLoadingUser(false);
      }
    };
    getUser();
  }, []);

  const refreshUrls = async () => {
    if (!user?.id) return;

    setIsRefreshing(true);
    try {
      const urls = await fetchUserUrls(user.id);
      setUserUrls(urls || []);
    } catch (error) {
      console.error("Failed to refresh URLs:", error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  };

  const removeUrl = (id: number) => {
    setUserUrls((prev) => prev.filter((url) => url.id !== id));
  };

  const addUrl = (url: UserUrl) => {
    setUserUrls((prev) => [url, ...prev]);
  };

  const value: UrlContextType = {
    userUrls,
    setUserUrls,
    refreshUrls,
    removeUrl,
    addUrl,
    isRefreshing,
    user,
    isLoadingUser,
  };

  return <UrlContext.Provider value={value}>{children}</UrlContext.Provider>;
}
