import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isTemplateLocked } from "@/lib/templates";
import { TemplateCard } from "@/components/dashboard/TemplateCard";

export default async function TemplatesContent() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createServiceRoleClient();

  const { data: templates } = await admin
    .from("templates")
    .select("id, category, name, tier_required, thumbnail")
    .order("category");

  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const userPlan = subscription?.plan ?? "free";

  const grouped: Record<string, NonNullable<typeof templates>> = {};

  for (const template of templates ?? []) {
    if (!grouped[template.category]) {
      grouped[template.category] = [];
    }

    grouped[template.category].push(template);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">
        Templates
      </h1>

      <p className="mt-1 text-sm text-ink/50">
        Locked templates unlock as you upgrade your plan.
      </p>

      <div className="mt-8 space-y-10">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 font-display font-bold">
              {category}
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((template) => (
                <TemplateCard
                  key={template.id}
                  id={template.id}
                  name={template.name}
                  tierRequired={template.tier_required}
                  thumbnail={template.thumbnail}
                  locked={isTemplateLocked(
                    template.tier_required,
                    userPlan,
                    isAdmin
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
