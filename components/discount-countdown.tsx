"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface DiscountCountdownProps {
    targetDate: string; // ISO or date string
    onExpire?: () => void;
}

export default function DiscountCountdown({ targetDate, onExpire }: DiscountCountdownProps) {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

    useEffect(() => {
        const target = new Date(targetDate).getTime();

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                if (onExpire) {
                    onExpire();
                }
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            });
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onExpire]);

    if (!timeLeft) {
        return <div className="text-xs text-gray-450 font-semibold animate-pulse">Calculating early bird...</div>;
    }

    if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
        return <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">Early bird price has expired</span>;
    }

    return (
        <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-ighub-orange text-xs font-extrabold px-3 py-2 rounded-2xl animate-pulse">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
                Early Bird ends in: {timeLeft.days > 0 && `${timeLeft.days}d `}
                {String(timeLeft.hours).padStart(2, "0")}h:
                {String(timeLeft.minutes).padStart(2, "0")}m:
                {String(timeLeft.seconds).padStart(2, "0")}s
            </span>
        </div>
    );
}
