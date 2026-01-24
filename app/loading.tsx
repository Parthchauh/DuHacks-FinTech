import { AnimatedLoader } from "@/components/ui/AnimatedLoader";

export default function Loading() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
            <AnimatedLoader size="lg" color="primary" />
            <p className="text-slate-500 font-medium animate-pulse">Loading OptiWealth...</p>
        </div>
    );
}
