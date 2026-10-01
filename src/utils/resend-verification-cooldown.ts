import crypto from "node:crypto"
import type { ILockingModule, MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Per-customer cooldown for the store-side "resend verification mail" route.
//
// Implemented as a self-expiring lock in Medusa's Locking Module (always
// registered): acquiring is an atomic "set if absent, with TTL", so
// concurrent requests can't both pass. Shared across instances when the
// Redis locking provider is configured (medusa-config, with REDIS_URL);
// otherwise the in-memory provider makes it per-process.

export const RESEND_VERIFICATION_COOLDOWN_SECONDS = 60

const keyFor = (customerId: string) => `kiji:resend-verification:${customerId}`

export type CooldownClaim =
  | { ok: true; release: () => Promise<void> }
  // The lock's remaining TTL isn't queryable, so this is an upper bound.
  | { ok: false; retryAfterSeconds: number }

// Claims the cooldown slot for a customer. Call `release()` if the send
// fails so the customer can retry immediately.
export async function claimResendVerificationCooldown(
  container: MedusaContainer,
  customerId: string,
): Promise<CooldownClaim> {
  const locking = container.resolve<ILockingModule>(Modules.LOCKING)
  const key = keyFor(customerId)
  const ownerId = crypto.randomUUID()

  try {
    await locking.acquire(key, {
      ownerId,
      expire: RESEND_VERIFICATION_COOLDOWN_SECONDS,
    })
  } catch (err) {
    // Both providers signal "already held" with this message; anything else
    // (e.g. Redis unreachable) is a real error.
    if (err instanceof Error && err.message.startsWith("Failed to acquire lock")) {
      return { ok: false, retryAfterSeconds: RESEND_VERIFICATION_COOLDOWN_SECONDS }
    }
    throw err
  }

  return {
    ok: true,
    release: async () => {
      await locking.release(key, { ownerId })
    },
  }
}
