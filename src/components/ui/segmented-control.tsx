import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SegmentedControlProps {
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}

export function SegmentedControl({ value, onValueChange, options, className }: SegmentedControlProps) {
    return (
        <div className={cn("inline-flex items-center rounded-md bg-muted p-0.5 gap-0.5", className)}>
            {options.map((option) => (
                <Button
                    key={option.value}
                    variant={value === option.value ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onValueChange(option.value)}
                    className={cn(
                        "rounded-sm px-3 py-1 h-7 text-xs font-medium transition-all",
                        value === option.value && "shadow-xs"
                    )}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
