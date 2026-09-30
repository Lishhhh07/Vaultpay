"use client"

import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { TextInput } from "@repo/ui/textinput";
import { createOnRampTransaction } from "../app/lib/actions/createOnRamptxn";

const SUPPORTED_BANKS = [{
    name: "HDFC Bank",
    redirectUrl: "https://netbanking.hdfcbank.com"
}, {
    name: "Axis Bank",
    redirectUrl: "https://www.axisbank.com/"
}];

export const AddMoney = () => {
    const [redirectUrl, setRedirectUrl] = useState(
        SUPPORTED_BANKS[0]?.redirectUrl
    );
    const [amount, setAmount] = useState(0);
    const [provider, setProvider] = useState(
        SUPPORTED_BANKS[0]?.name
    );

    return (
        <Card title="Add Money">
            <div className="w-full">

                <TextInput
                    label={"Amount"}
                    placeholder={"Amount"}
                    onChange={(value) => {
                        setAmount(Number(value));
                    }}
                />

                <div className="py-4 text-left">
                    Bank
                </div>

                <Select
                    onSelect={(value) => {
                        setRedirectUrl(
                            SUPPORTED_BANKS.find(
                                x => x.name === value
                            )?.redirectUrl || ""
                        );

                        setProvider(
                            SUPPORTED_BANKS.find(
                                x => x.name === value
                            )?.name || ""
                        );
                    }}
                    options={SUPPORTED_BANKS.map(x => ({
                        key: x.name,
                        value: x.name
                    }))}
                />

                <div className="flex justify-center pt-4">

                    <Button onClick={async () => {

                        const result = await createOnRampTransaction(
                            amount * 100,
                            typeof provider === "string"
                                ? provider
                                : ""
                        );

                        await fetch(
                            "http://localhost:3003/hdfcWebhook",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    token: result.token,
                                    user_identifier: "1",
                                    amount: String(amount * 100),
                                }),
                            }
                        );

                        window.location.href =
                            redirectUrl || "";
                    }}>
                        Add Money
                    </Button>

                </div>
            </div>
        </Card>
    );
};