"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
    targetDate: string; // ISO string or parsable date string
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
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
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            });
        };

        // Calculate immediately on mount
        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    // Prevent hydration layout flashing
    if (!timeLeft) {
        return <div className="h-32 w-full max-w-md mx-auto" />;
    }

    // Configuration for the SVG rings
    const radius = 42;
    const circumference = 2 * Math.PI * radius; // ~263.89

    // Map the time blocks to their max values for percentage calculation and assign IGHub colors
    const timeBlocks = [
        { label: "Days", value: timeLeft.days, max: 365, stroke: "stroke-ighub-purple" },
        { label: "Hours", value: timeLeft.hours, max: 24, stroke: "stroke-ighub-orange" },
        { label: "Minutes", value: timeLeft.minutes, max: 60, stroke: "stroke-ighub-green" },
        { label: "Seconds", value: timeLeft.seconds, max: 60, stroke: "stroke-ighub-black" },
    ];

    return (
        <div className="w-full max-w-lg mx-auto bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 text-center mb-6">
                Registration Closes In
            </p>

            <div className="grid grid-cols-4 gap-3 place-items-center">
                {timeBlocks.map((block, idx) => {
                    // Calculate how much of the ring should be filled
                    const percentage = (block.value / block.max) * 100;
                    const strokeDashoffset = circumference - (percentage / 100) * circumference;

                    return (
                        <div key={idx} className="relative w-full max-w-[80px] aspect-square flex items-center justify-center">

                            {/* Background Track Circle */}
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="none"
                                    strokeWidth="6"
                                    className="stroke-gray-200"
                                />

                                {/* Foreground Progress Circle */}
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="none"
                                    strokeWidth="6"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className={`transition-all duration-1000 ease-linear ${block.stroke}`}
                                />
                            </svg>

                            {/* Centered Text */}
                            <div className="flex flex-col items-center justify-center z-10 pt-1">
                                <span className="text-xl sm:text-2xl font-black text-ighub-black leading-none">
                                    {String(block.value).padStart(2, "0")}
                                </span>
                                <span className="text-[10px] sm:text-xs font-medium text-gray-500 mt-1">
                                    {block.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}