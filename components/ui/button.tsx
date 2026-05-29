import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline";
    fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", fullWidth = false, children, ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:pointer-events-none px-6 py-3 tracking-wide";

        const variants = {
            primary: "bg-ighub-green text-white rounded-full hover:bg-ighub-orange",
            secondary: "bg-ighub-purple text-white rounded-full hover:bg-ighub-black",
            outline: "border-2 border-ighub-black text-ighub-black rounded-md hover:bg-ighub-black hover:text-white",
        };

        const widthStyle = fullWidth ? "w-full" : "";

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";