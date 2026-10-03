import { headers } from "next/headers";
import db from "@repo/db/client";
import { clientIpFrom } from "./client-ip";

export async function audit(p: {
  actorId: number;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const h = headers();
    await db.auditLog.create({
      data: {
        actorType: "MERCHANT",
        actorId: p.actorId,
        action: p.action,
        metadata: (p.metadata ?? {}) as any,
        ip: clientIpFrom((n) => h.get(n)),
      },
    });
  } catch {
    console.error("audit write failed");
  }
}