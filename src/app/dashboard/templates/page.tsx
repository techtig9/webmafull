import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/credits";
import { Lock } from "lucide-react";

const TIER_ORDER: PlanId[] = ["free", "starter", "pro", "business"];

export default async function TemplatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const [{ data: templates }, { data: profile }, { data: sub }] = await Promise.all([
    admin.from("templates").select("id, category, name, tier_required").order("category"),
    admin.from("users").select("role").eq("id", user!.id).single(),
    admin.from("subscriptions").select("plan").eq("user_id", user!.id).single(),
  ]);

  const userTierIndex =
    profile?.role === "admin" ? TIER_ORDER.length - 1 : TIER_ORDER.indexOf((sub?.plan as PlanId) ?? "free");

  const grouped = (templates ?? []).reduce<Record<string, typeof templates>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Templates</h1>
      <p className="mt-1 text-sm text-ink/50">Locked templates unlock as you upgrade your plan.</p>

      <div className="mt-8 space-y-10">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 font-display font-bold">{category}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items!.map((t) => {
                const locked = TIER_ORDER.indexOf(t.tier_required as PlanId) > userTierIndex;
                return (
                  <div
                    key={t.id}
                    className={`glass-panel relative aspect-[4/3] rounded-xl p-4 ${
                      locked ? "opacity-50" : "hover:!border-signal/40"
                    }`}
                  >
                    {locked && (
                      <span className="absolute right-3 top-3 text-ink/40">
                        <Lock size={14} />
                      </span>
                    )}
                    <p className="mt-auto font-medium">{t.name}</p>
                    <p className="font-mono text-xs uppercase text-ink/30">{t.tier_required}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
