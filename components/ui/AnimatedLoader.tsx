import { cn } from "@/lib/utils";

interface AnimatedLoaderProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    color?: "primary" | "white";
}

export function AnimatedLoader({ className, size = "md", color = "white" }: AnimatedLoaderProps) {
    const sizeClasses = {
        sm: "h-5 w-5",
        md: "h-8 w-8",
        lg: "h-12 w-12"
    };

    const colorClasses = {
        primary: "border-primary",
        white: "border-white"
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
            <div className={cn(
                "absolute inset-0 rounded-full border-2 border-t-transparent animate-spin",
                colorClasses[color]
            )} />
            <div className={cn(
                "absolute inset-1 rounded-full border-2 border-b-transparent animate-spin animation-delay-150 opacity-70",
                colorClasses[color]
            )} />
        </div>
    );
}
