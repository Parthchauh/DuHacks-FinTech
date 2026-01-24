
import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass-card';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "rounded-xl border bg-card text-card-foreground shadow-sm",
                variant === 'glass-card' && "glass-card border-white/20 shadow-xl",
                className
            )}
            {...props}
        />
    )
)
Card.displayName = "Card"

export { Card }
