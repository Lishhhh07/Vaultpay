import crypto from "crypto";
export function walletSeed() {
    const rupees = Number(process.env.WELCOME_BONUS_RUPEES ?? "0");
    const bonus = Number.isFinite(rupees) && rupees > 0 && rupees <= 10000 ? Math.round(rupees * 100) : 0;
    return {
        Balance: { create: { amount: bonus, locked: 0 } },
        ...(bonus > 0
            ? {
                OnRampTransaction: {
                    create: {
                        amount: bonus,
                        status: "Success" as const,
                        startTime: new Date(),
                        provider: "Welcome bonus",
                        token: crypto.randomUUID(),
                    },
                },
            }
            : {}),
    };
}