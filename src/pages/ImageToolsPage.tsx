// ============================================
// TERIN Toolkit — Image Tools Dashboard Page
// ============================================

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const SUB_TOOLS: SubTool[] = [
    {
        id: "placeholder-generator",
        label: "Placeholder Generator",
        description:
            "Generate placeholder images with custom dimensions, colors, text, and format.",
        icon: ImageIcon,
    },
];

export function ImageToolsPage() {
    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);

    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [bgColor, setBgColor] = useState("#cccccc");
    const [textColor, setTextColor] = useState("#909090");
    const [text, setText] = useState("");
    const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const activeTool = SUB_TOOLS.find((t) => t.id === activeToolId)!;

    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
    }, []);

    const drawPlaceholder = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const displayText = text.trim() || `${width}x${height}`;

        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const fontSize = Math.max(12, Math.floor(Math.min(width, height) / 5));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);
    }, [width, height, bgColor, textColor, text]);

    useEffect(() => {
        drawPlaceholder();
    }, [drawPlaceholder]);

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dataUrl = canvas.toDataURL(format);
        const a = document.createElement("a");
        a.href = dataUrl;

        const ext = format.split("/")[1];
        a.download = `placeholder-${width}x${height}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleCopy = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob(async (blob) => {
            if (!blob) return;

            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ "image/png": blob }),
                ]);
            } catch (err) {
                console.error("Failed to copy image to clipboard", err);
            }
        }, "image/png");
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Image Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manipulate, edit and generate images, and more.
                    </p>
                </div>

                {/* Tool selector */}
                <div className="flex flex-wrap gap-2">
                    {SUB_TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = tool.id === activeToolId;

                        return (
                            <Tooltip key={tool.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleToolChange(tool.id)}
                                        className="shrink-0"
                                    >
                                        <Icon className="mr-2 h-4 w-4" />
                                        {tool.label}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{tool.description}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                {/* Active tool description */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <activeTool.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">{activeTool.label}</p>
                        <p className="text-xs text-muted-foreground">
                            {activeTool.description}
                        </p>
                    </div>
                </div>

                {/* Active tool content */}
                {activeToolId === "placeholder-generator" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4 rounded-lg border p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="img-width">Width</Label>
                                    <Input
                                        id="img-width"
                                        type="number"
                                        min={1}
                                        value={width}
                                        onChange={(e) => setWidth(Number(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="img-height">Height</Label>
                                    <Input
                                        id="img-height"
                                        type="number"
                                        min={1}
                                        value={height}
                                        onChange={(e) => setHeight(Number(e.target.value) || 1)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="img-text">Text</Label>
                                <Input
                                    id="img-text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Leave empty to use dimensions"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bg-color">Background Color</Label>
                                    <Input
                                        id="bg-color"
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="h-10 p-1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="text-color">Text Color</Label>
                                    <Input
                                        id="text-color"
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="h-10 p-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Format</Label>
                                <Select
                                    value={format}
                                    onValueChange={(value: "image/png" | "image/jpeg" | "image/webp") =>
                                        setFormat(value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="image/png">PNG</SelectItem>
                                        <SelectItem value="image/jpeg">JPEG</SelectItem>
                                        <SelectItem value="image/webp">WEBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button onClick={handleDownload}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                                <Button variant="outline" onClick={handleCopy}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy PNG
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <Label className="mb-3 block">Preview</Label>
                            <div className="flex items-center justify-center rounded-lg border bg-muted/20 p-4 overflow-auto">
                                <canvas
                                    ref={canvasRef}
                                    className="max-w-full h-auto rounded border shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}