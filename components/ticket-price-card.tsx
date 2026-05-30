"use client";

import { useState } from "react";
import DiscountCountdown from "./discount-countdown";
import { Ticket } from "lucide-react";

interface TicketPriceCardProps {
    basePrice: number;
    discountPrice: number;
    discountClosesAt?: string | null;
}

export default function TicketPriceCard({ basePrice, discountPrice, discountClosesAt }: TicketPriceCardProps) {
    const hasDiscountClosesAt = !!discountClosesAt;
    const isDiscountActiveInitially = hasDiscountClosesAt 
        ? new Date(discountClosesAt).getTime() > Date.now()
        : true; // Active indefinitely if requires payment is true but no discount closing date is set

    const [isDiscountActive, setIsDiscountActive] = useState(isDiscountActiveInitially);

    const handleExpire = () => {
        setIsDiscountActive(false);
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:border-gray-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-ighub-purple rounded-2xl shrink-0">
                    <Ticket className="w-6 h-6" />
                </div>
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Registration Ticket Price
                    </span>
                    
                    <div className="flex items-baseline gap-2 mt-1">
                        {isDiscountActive && discountPrice > 0 ? (
                            <>
                                <span className="text-2xl font-black text-ighub-purple">
                                    ₦{discountPrice.toLocaleString()}
                                </span>
                                {basePrice > discountPrice && (
                                    <span className="text-xs text-gray-400 line-through font-semibold">
                                        ₦{basePrice.toLocaleString()}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="text-2xl font-black text-ighub-purple">
                                ₦{basePrice.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Display Countdown only when discount is active and has a set deadline */}
            {isDiscountActive && discountClosesAt && (
                <div className="shrink-0 w-full sm:w-auto">
                    <DiscountCountdown targetDate={discountClosesAt} onExpire={handleExpire} />
                </div>
            )}
        </div>
    );
}
