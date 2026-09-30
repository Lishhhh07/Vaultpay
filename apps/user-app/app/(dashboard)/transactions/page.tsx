import { P2PTransactions } from "../../../components/p2ptransactions";

export default async function() {
    return (
        <div className="w-screen p-8">
            <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
                Transactions
            </div>

            <P2PTransactions />
        </div>
    );
}