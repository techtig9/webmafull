# Backup & Restore

Supabase takes automatic daily backups (7-day retention on the free tier,
longer on paid tiers — check Project Settings → Database → Backups).

## To restore
1. Supabase Dashboard → Database → Backups
2. Pick a backup point → Restore
3. This restores into a NEW project — confirm data, then swap connection
   strings (NEXT_PUBLIC_SUPABASE_URL etc.) once verified.

## Before going live
Upgrade to a paid Supabase tier for Point-in-Time Recovery (PITR) —
daily backups alone mean you could lose up to 24h of data in an incident.
