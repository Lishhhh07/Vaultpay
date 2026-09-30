import { getP2PTransfers } from "../app/lib/actions/p2pTransfer";

export async function P2PTransactions() {
    const transfers = await getP2PTransfers();

    return (
        <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">
                Transaction History
            </h2>

            <div className="space-y-3">
                {transfers.map((transaction) => (
                    <div
                        key={transaction.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                    >
                        <div>
                            <p className="font-semibold">
                                {transaction.fromUser.name ||
                                    transaction.fromUser.number}
                                {" → "}
                                {transaction.toUser.name ||
                                    transaction.toUser.number}
                            </p>

                            <p className="text-sm text-gray-500">
                                {new Date(
                                    transaction.timestamp
                                ).toLocaleString()}
                            </p>

                            <p className="text-xs text-gray-400">
                                Transaction ID: {transaction.id}
                            </p>
                        </div>

                        <p className="font-bold">
                            ₹{transaction.amount / 100}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}