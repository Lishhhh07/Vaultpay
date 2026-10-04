import crypto from "crypto";
import db from "@repo/db/client";
import { settleToBank } from "../src/settle";

async function main() {
  const merchant = await db.merchant.findUniqueOrThrow({ where: { email: "merchant@demo.com" } });
  const bank =
    (await db.bankAccount.findFirst({ where: { merchantId: merchant.id } })) ??
    (await db.bankAccount.create({
      data: {
        merchantId: merchant.id, holderName: "Test", accountNoEnc: "TEST", last4: "4321",
        ifsc: "HDFC0001234", fingerprint: "test-" + crypto.randomUUID(),
      },
    }));

  const setBal = (amount: number) =>
    db.merchantBalance.update({ where: { merchantId: merchant.id }, data: { amount, locked: 0 } });
  const bal = async () =>
    (await db.merchantBalance.findUniqueOrThrow({ where: { merchantId: merchant.id } })).amount;
  const settle = (amount: number, key = crypto.randomUUID()) =>
    settleToBank({ merchantId: merchant.id, bankAccountId: bank.id, amount, idempotencyKey: key });

  let failed = false;
  const check = (name: string, cond: boolean, detail: string) => {
    console.log(`${cond ? "PASS" : "FAIL"}  ${name}  ${detail}`);
    if (!cond) failed = true;
  };

  // 8 parallel ₹3,000 settlements from ₹10,000: exactly 3 may succeed
  await setBal(1_000_000);
  const r1 = await Promise.all(Array.from({ length: 8 }, () => settle(300_000)));
  const ok1 = r1.filter((r) => r.ok).length;
  check("no overdraw", ok1 === 3 && (await bal()) === 100_000, `ok=${ok1} balance=${await bal()}`);

  // same key 5 times in parallel: debited once
  await setBal(1_000_000);
  const key = crypto.randomUUID();
  const r2 = await Promise.all(Array.from({ length: 5 }, () => settle(10_000, key)));
  const fresh = r2.filter((r) => r.ok && !r.replayed).length;
  check("idempotent", fresh === 1 && (await bal()) === 990_000, `fresh=${fresh} balance=${await bal()}`);

  console.log(failed ? "\nSOME TESTS FAILED" : "\nALL TESTS PASSED");
  await db.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });