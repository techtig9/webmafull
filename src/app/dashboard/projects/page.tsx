import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

export default async function ProjectsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, archived, updated_at")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const active = projects?.filter((p) => !p.archived) ?? [];
  const archived = projects?.filter((p) => p.archived) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Projects</h1>
        <Button href="/dashboard/generator">New project</Button>
      </div>

      {!active.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">No projects yet — generate your first website to see it here.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/40">
            Archived ({archived.length})
          </h2>
          <div className="mt-4 grid gap-4 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
