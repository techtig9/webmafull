import { GeneratorFlow } from "@/components/generator/GeneratorFlow";
import { createClient } from "@/lib/supabase/server";
import { deriveSections, resolvePages } from "@/lib/preview";

export default async function GeneratorPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  let initialProject = null;

  if (searchParams.project) {
    const supabase = createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, description, seo_title, seo_description")
      .eq("id", searchParams.project)
      .single();

    if (project) {
      const { data: version } = await supabase
        .from("project_versions")
        .select("files, pages")
        .eq("project_id", project.id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (version) {
        const files = version.files as Record<string, string>;
        initialProject = {
          projectId: project.id,
          name: project.name,
          description: project.description ?? "",
          seoTitle: project.seo_title ?? "",
          seoDescription: project.seo_description ?? "",
          files,
          sections: deriveSections(files),
          pages: resolvePages(files, version.pages as ReturnType<typeof resolvePages> | null),
        };
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet">Webma AI</p><h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Website builder</h1><p className="mt-1 text-xs text-white/35">Generate a new website or open an existing project and edit it with AI.</p></div></div>
      <GeneratorFlow initialProject={initialProject} />
    </div>
  );
        }
