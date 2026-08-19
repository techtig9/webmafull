import { NextResponse } from "next/server";
import { verifyPaddleWebhook, planForPriceId } from "@/lib/paddle";
import { PLAN_CREDITS } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { sendPaymentFailedEmail } from "@/lib/email";

// Paddle webhooks must be verified from the RAW request body — never JSON.parse
// before checking the signature, or the HMAC will never match.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paddle-Signature");

  if (!verifyPaddleWebhook(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceRoleClient();

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.updated": {
      const sub = event.data;
      const priceId = sub.items?.[0]?.price?.id;
      const plan = priceId ? planForPriceId(priceId) : null;
      if (!plan) break;

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_customer_id", sub.customer_id)
        .maybeSingle();

      if (existing) {
        const isNewCycle = sub.status === "active" && event.event_type === "subscription.updated";
        await supabase
          .from("subscriptions")
          .update({
            plan,
            status: sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
            provider: "paddle",
            paddle_subscription_id: sub.id,
            renews_at: sub.next_billed_at ?? sub.current_billing_period?.ends_at,
            ...(isNewCycle ? { credits_remaining: PLAN_CREDITS[plan], credits_allowance: PLAN_CREDITS[plan] } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", existing.user_id);

        await writeAuditLog({
          actorId: null,
          actorRole: "system",
          action: `paddle.${event.event_type}`,
          targetId: existing.user_id,
          metadata: { plan, status: sub.status, paddleSubscriptionId: sub.id },
        });
      }
      break;
    }

    case "subscription.canceled": {
      const sub = event.data;
      const { data: canceledSub } = await supabase
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("paddle_subscription_id", sub.id)
        .select("user_id")
        .maybeSingle();

      if (canceledSub) {
        await writeAuditLog({
          actorId: null,
          actorRole: "system",
          action: "paddle.subscription.canceled",
          targetId: canceledSub.user_id,
          metadata: { paddleSubscriptionId: sub.id },
        });
      }
      break;
    }

    case "transaction.completed": {
      const txn = event.data;
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_customer_id", txn.customer_id)
        .maybeSingle();
      if (existing) {
        await supabase.from("payments").upsert(
          {
            user_id: existing.user_id,
            paddle_transaction_id: txn.id,
            amount: Number(txn.details?.totals?.total ?? 0) / 100,
            currency: txn.currency_code ?? "USD",
            status: "completed",
          },
          { onConflict: "paddle_transaction_id" }
        );
      }
      break;
    }

    case "transaction.payment_failed": {
      const txn = event.data;
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_customer_id", txn.customer_id)
        .maybeSingle();
      if (existing) {
        await supabase.from("payments").upsert(
          {
            user_id: existing.user_id,
            paddle_transaction_id: txn.id,
            amount: Number(txn.details?.totals?.total ?? 0) / 100,
            currency: txn.currency_code ?? "USD",
            status: "failed",
          },
          { onConflict: "paddle_transaction_id" }
        );
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", existing.user_id);

        const { data: userRow } = await supabase
          .from("users")
          .select("email, name")
          .eq("id", existing.user_id)
          .single();
        if (userRow) {
          await sendPaymentFailedEmail(userRow.email, userRow.name).catch((err) =>
            console.error("dunning email failed", err)
          );
        }
      }
      break;
    }

    default:
      break; // Unhandled event types are safely ignored.
  }

  return NextResponse.json({ received: true });
          }
