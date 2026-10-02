   import db from "@repo/db/client";
import { redirect } from "next/navigation";
   export const dynamic = "force-dynamic";


    export default async function Page() {
     const plans = await db.soundboxPlan.findMany({
       where: { active: true },
       orderBy: { price: "asc" },
     });

     return (
       <main className="p-8">
         <h1 className="text-3xl font-bold text-[#6a51a6] mb-6">Paytm for Business</h1>
         <ul className="space-y-2">
           {plans.map((p) => (
             <li key={p.id}>
               {p.name}: ₹{(p.price / 100).toLocaleString("en-IN")}
             </li>
           ))}
         </ul>
       </main>
     );
   }