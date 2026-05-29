import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        // Placeholder for Paystack Webhook
        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error("Paystack Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
