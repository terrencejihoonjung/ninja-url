import { createClient } from "@/lib/supabase/supabase-server";
import { LandingPage } from "@/components/landing-page/landing-page";
import { redirect } from "next/navigation";

interface HomeProps {
  searchParams: Promise<{ url?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { url } = await searchParams;
  const prefilledUrl = url ? decodeURIComponent(url) : undefined;

  if (user) {
    redirect(prefilledUrl ? `/dashboard?url=${prefilledUrl}` : "/dashboard");
  }

  return <LandingPage />;
}
