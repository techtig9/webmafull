import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight, FolderKanban, Globe2, LayoutTemplate, Plus, Sparkles, Zap } from "lucide-react";

function Stat({ label, value, icon: Icon, accent = "violet" }: { label: string; value: string | number; icon: typeof FolderKanban; accent?: "violet" | "signal2" | "amber" }) {
  const accentClass = accent === "signal2" ? "bg-signal2/10 text-signal2" : accent === "amber" ? "bg-amber/10 text-amber" : "bg-violet/10 text-violet";
  return <div className="saas-card p-5">
    <div className="flex items-center justify-between"><span className="text-xs text-white/40">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClass}`}><Icon size={15} /></span></div>
    <div className="mt-4 font-display text-2xl font-bold tracking-tight">{value}</div>
  </div>;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: projects }, { count: totalProjects }, { count: published }, { count: drafts }, { data: subscription }] = await Promise.all([
    supabase.from("projects").select("id, name, status, description, updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(6),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "deployed"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user!.id).neq("status", "deployed"),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user!.id).single(),
  ]);
  const firstName = (user?.user_metadata?.name || user?.email || "there").split(" ")[0];

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet/[0.16] via-[#11162a] to-[#0b0f1c] p-6 lg:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet/20 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-3 py-1 text-[11px] font-medium text-violet"><Sparkles size={12} />AI website builder</div>
          <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">Welcome back, {firstName}. <span className="text-white/40">What are we building?</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">Start from a prompt, open a project, or use a template. Your websites, versions and deployment controls stay in one workspace.</p>
        </div>
        <Button href="/dashboard/generator"><Plus size={16} />Create website</Button>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Total projects" value={totalProjects ?? 0} icon={FolderKanban} />
      <Stat label="Published" value={published ?? 0} icon={Globe2} accent="signal2" />
      <Stat label="Drafts" value={drafts ?? 0} icon={Zap} accent="amber" />
      <Stat label="AI credits remaining" value={subscription?.credits_remaining ?? 0} icon={Sparkles} accent="violet" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="saas-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><h2 className="font-display font-semibold">Recent projects</h2><p className="mt-1 text-xs text-white/35">Continue where you left off.</p></div><Link href="/dashboard/projects" className="flex items-center gap-1 text-xs font-medium text-violet hover:text-white">View all <ArrowUpRight size={13} /></Link></div>
        {!projects?.length ? <div className="p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/10 text-violet"><Sparkles size={20} /></div><p className="mt-4 font-medium">Your workspace is ready.</p><p className="mt-1 text-sm text-white/40">Create your first website with AI.</p><Button href="/dashboard/generator" className="mt-5">Start building</Button></div> :
          <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">{projects.map(p => <Link key={p.id} href={`/dashboard/generator?project=${p.id}`} className="group bg-[#0d111d] p-5 transition hover:bg-[#11172a]"><div className="mb-5 flex h-28 items-end overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-br from-violet/15 via-signal/5 to-white/[0.02] p-3"><div className="w-full"><div className="h-2 w-1/2 rounded-full bg-white/15"/><div className="mt-2 h-2 w-3/4 rounded-full bg-white/10"/><div className="mt-4 h-5 w-20 rounded-md bg-violet/60"/></div></div><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.name}</p><p className="mt-1 line-clamp-1 text-xs text-white/35">{p.description || "Website project"}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${p.status === "deployed" ? "bg-signal2/10 text-signal2" : "bg-white/[0.06] text-white/40"}`}>{p.status}</span></div><p className="mt-4 text-[10px] text-white/25">Updated {new Date(p.updated_at).toLocaleDateString()}</p></Link>)}</div>}
      </div>

      <div className="space-y-5">
        <div className="saas-card p-5"><div className="flex items-center gap-2"><Sparkles size={15} className="text-violet"/><h2 className="font-display font-semibold">Quick actions</h2></div><div className="mt-4 space-y-2">
          <Link href="/dashboard/generator" className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 hover:border-violet/30"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/10 text-violet"><Plus size={15}/></span><div><p className="text-xs font-semibold">Create website</p><p className="text-[10px] text-white/30">Start from a prompt</p></div></Link>
          <Link href="/dashboard/templates" className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 hover:border-violet/30"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal2/10 text-signal2"><LayoutTemplate size={15}/></span><div><p className="text-xs font-semibold">Use a template</p><p className="text-[10px] text-white/30">Customize a starting point</p></div></Link>
          <Link href="/dashboard/generator" className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 hover:border-violet/30"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10 text-amber"><Sparkles size={15}/></span><div><p className="text-xs font-semibold">AI assistant</p><p className="text-[10px] text-white/30">Edit an existing project</p></div></Link>
        </div></div>
        <div className="saas-card p-5"><div className="flex items-center justify-between"><span className="text-xs text-white/40">Current plan</span><span className="rounded-full bg-violet/10 px-2 py-1 text-[10px] capitalize text-violet">{subscription?.plan ?? "free"}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet to-signal"/></div><p className="mt-2 text-[10px] text-white/30">{subscription?.credits_remaining ?? 0} AI credits remaining</p><Link href="/dashboard/billing" className="mt-4 block text-xs font-semibold text-violet hover:text-white">Manage plan →</Link></div>
      </div>
    </section>
  </div>;
}
