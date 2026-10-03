import crypto from "crypto";
import db from "@repo/db/client";
import { payMerchant } from "../src/payMerchant";

async function main() {
  const alice = await db.user.findUniqueOrThrow({ where: { number: "1111111111" } });
  const merchant = await db.merchant.findUniqueOrThrow({ where: { email: "merchant@demo.com" } });
  const merchantBal = () =>
    db.merchantBalance.findUniqueOrThrow({ where: { merchantId: merchant.id } }).then((b) => b.amount);

  let failed = false;
  const check = (name: string, cond: boolean, detail: string) => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}  ${detail}`);
    if (!cond) failed = true;
  };

  // T1 10 parallel ₹20 payments from a ₹100 wallet then exactly 5 may succeed
  await db.balance.update({ where: { userId: alice.id }, data: { amount: 10000, locked: 0 } });
  const m0 = await merchantBal();
  const r1 = await Promise.all(
    Array.from({ length: 10 }, () =>
      payMerchant({ userId: alice.id, merchantId: merchant.id, amount: 2000, idempotencyKey: crypto.randomUUID() })
    )
  );
  const ok1 = r1.filter((r) => r.ok).length;
  const aliceAfter1 = (await db.balance.findUniqueOrThrow({ where: { userId: alice.id } })).amount;
  check("no overspend", ok1 === 5, `successes=${ok1} (expected 5)`);
  check("wallet never negative", aliceAfter1 === 0, `alice=${aliceAfter1}`);
  check("merchant credited exactly", (await merchantBal()) - m0 === ok1 * 2000, `delta=${(await merchantBal()) - m0}`);

  // Test 2: same idempotency key sent 8 times in parallel but  charged exactly once
  await db.balance.update({ where: { userId: alice.id }, data: { amount: 10000, locked: 0 } });
  const m1 = await merchantBal();
  const key = crypto.randomUUID();
  const r2 = await Promise.all(
    Array.from({ length: 8 }, () =>
      payMerchant({ userId: alice.id, merchantId: merchant.id, amount: 1000, idempotencyKey: key })
    )
  );
  const fresh = r2.filter((r) => r.ok && !r.replayed).length;
  const replays = r2.filter((r) => r.ok && r.replayed).length;
  check("charged once", fresh === 1 && replays === 7, `fresh=${fresh} replays=${replays}`);
  check("merchant credited once", (await merchantBal()) - m1 === 1000, `delta=${(await merchantBal()) - m1}`);

  // Test 3: reusing a key with a different amount is rejected
  const r3 = await payMerchant({ userId: alice.id, merchantId: merchant.id, amount: 5000, idempotencyKey: key });
  check("key reuse rejected", !r3.ok && r3.code === "KEY_REUSED", JSON.stringify(r3.ok ? "ok" : r3.code));

  console.log(failed ? "\nSOME TESTS FAILED" : "\nALL TESTS PASSED");
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });