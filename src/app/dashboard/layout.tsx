import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topnav } from "@/components/dashboard/Topnav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("users").select("name, role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
  ]);
  if (profileError) console.error("dashboard: failed to load profile", profileError, "user:", user.id);
  if (subscriptionError) console.error("dashboard: failed to load subscription", subscriptionError, "user:", user.id);

  return <div className="flex min-h-screen bg-[#070a12] text-white">
    <Sidebar isAdmin={profile?.role === "admin"} />
    <div className="min-w-0 flex-1">
      <Topnav name={profile?.name ?? user.email ?? "User"} plan={profile?.role === "admin" ? "admin" : subscription?.plan ?? "free"} creditsRemaining={profile?.role === "admin" ? Infinity : subscription?.credits_remaining ?? 0} />
      <main className="mx-auto w-full max-w-[1600px] p-5 lg:p-7">{children}</main>
    </div>
  </div>;
}
