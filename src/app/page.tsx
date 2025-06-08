import { createClient } from "@/lib/supabase/supabase-server";
import { LandingPage } from "@/components/landing-page";
import { Dashboard } from "@/components/dashboard/dashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return <Dashboard user={user} />;
  }

  return <LandingPage />;
}
