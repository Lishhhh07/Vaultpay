"use client"
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Center } from "@repo/ui/center";
import { TextInput } from "@repo/ui/textinput";
import { useState } from "react";
import { p2pTransfer } from "../app/lib/actions/p2pTransfer";

export function SendCard() {
    const [number, setNumber] = useState("");
    const [amount, setAmount] = useState("");
    const [pin, setPin] = useState("");
    return <div className="h-[90vh]">
        <Center>
            <Card title="Send">
                <div className="min-w-72 pt-2">
                    <TextInput placeholder={"Number"} label="Number" onChange={(value) => {
                        setNumber(value)
                    }} />
                    <TextInput placeholder={"Amount"} label="Amount" onChange={(value) => {
                        setAmount(value)
                    }} />
                    <div className="pt-2">
                        <label className="block mb-2 text-sm font-medium text-gray-900">Transaction PIN</label>
                        <input type="password" inputMode="numeric" maxLength={6} autoComplete="off" value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5" />
                    </div>  
                    <div className="pt-4 flex justify-center">
                   <Button onClick={async () => {
                        const res = await p2pTransfer(number, Math.round(Number(amount) * 100), pin)
                        setPin("")
                        alert(res.message)
                    }}>Send</Button>
                    </div>
                </div>
            </Card>
        </Center>
    </div>
}