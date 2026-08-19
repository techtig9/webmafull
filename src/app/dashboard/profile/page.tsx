"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data: profile } = await supabase.from("users").select("name").eq("id", user.id).single();
      setName(profile?.name ?? "");

      const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).single();
      setPlan(sub?.plan ?? "free");
    })();
  }, [supabase]);

  async function saveName() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("users").update({ name }).eq("id", user!.id);
    setSaving(false);
    setNotice("Profile updated.");
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setNotice("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    setNotice(error ? error.message : "Password updated.");
    setNewPassword("");
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      {notice && <p className="mt-3 text-sm text-signal">{notice}</p>}

      <div className="glass-panel mt-6 space-y-6 rounded-2xl p-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Name</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring flex-1 rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
            <Button variant="secondary" onClick={saveName} disabled={saving}>
              Save
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Email</label>
          <input
            value={email}
            disabled
            className="w-full rounded-lg border border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-sm text-ink/50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">New password</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="focus-ring flex-1 rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
            <Button variant="secondary" onClick={changePassword} disabled={saving}>
              Update
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Plan</label>
          <p className="rounded-lg border border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-sm capitalize">{plan}</p>
        </div>
      </div>
    </div>
  );
}
