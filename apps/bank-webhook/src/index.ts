import "dotenv/config";
import express from "express";
import crypto from "crypto";
import db from "@repo/db/client";

const SECRET = process.env.BANK_WEBHOOK_SECRET;
if (!SECRET || SECRET.length < 32) {
    throw new Error("BANK_WEBHOOK_SECRET missing or too short (min 32 chars)");
}
const app = express();
app.use(express.json({
    limit: "10kb",
    verify: (req: any, _res, buf) => { req.rawBody = buf.toString("utf8"); }
}));
function hasValidSignature(req: any): boolean {
    const ts = req.header("x-timestamp");
    const sig = req.header("x-signature");
    if (!ts || !sig || typeof req.rawBody !== "string") return false;
    const age = Math.abs(Date.now() - Number(ts));
    if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
    const expected = crypto.createHmac("sha256", SECRET!)
        .update(`${ts}.${req.rawBody}`).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post("/hdfcWebhook", async (req, res) => {
    if (!hasValidSignature(req)) {
        return res.status(401).json({ message: "Invalid signature" });
    }

    const { token, amount } = req.body ?? {};
    if (typeof token !== "string" || token.length === 0 || token.length > 100) {
        return res.status(400).json({ message: "Invalid token" });
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const txn = await tx.onRampTransaction.findUnique({ where: { token } });
            if (!txn) return "not_found" as const;
            if (amount !== undefined && Number(amount) !== txn.amount) return "mismatch" as const;

            const claimed = await tx.onRampTransaction.updateMany({
                where: { token, status: "Processing" },
                data: { status: "Success" },
            });
            if (claimed.count === 0) return "already_processed" as const;

            await tx.balance.update({
                where: { userId: txn.userId },
                data: { amount: { increment: txn.amount } },
            });
            return "captured" as const;
        });

        if (result === "not_found") return res.status(404).json({ message: "Unknown token" });
        if (result === "mismatch") return res.status(400).json({ message: "Amount mismatch" });
        return res.json({ message: result === "captured" ? "Captured" : "Already processed" });
    } catch (e) {
        console.error("Webhook error");
        return res.status(500).json({ message: "Error while processing webhook" });
    }
});

app.get("/health", (_req, res) => {
    res.send("ok");
});

const PORT = Number(process.env.PORT ?? 3003);
app.listen(PORT, () => console.log(`bank-webhook listening on ${PORT}`));