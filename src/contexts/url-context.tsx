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
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userUrls, setUserUrls] = useState<UserUrl[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get user on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.id) {
          setUser(user);
          // Fetch user URLs after getting user
          const urls = await fetchUserUrls(user.id);
          setUserUrls(urls || []);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
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
