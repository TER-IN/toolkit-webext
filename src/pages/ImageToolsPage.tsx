// ============================================
// TERIN Toolkit — Image Tools Dashboard Page
// ============================================

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ImageToolsPage() {
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);
    const [bgColor, setBgColor] = useState("#cccccc");
    const [textColor, setTextColor] = useState("#909090");
    const [text, setText] = useState("");
    const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const drawPlaceholder = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Ensure canvas physical size matches the input size
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw text
        const displayText = text.trim() || `${width}x${height}`;
        
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Approximate a good font size based on dimension
        const fontSize = Math.max(12, Math.floor(Math.min(width, height) / 5));
        ctx.font = `bold ${fontSize}px sans-serif`;

        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2);
    }, [width, height, bgColor, textColor, text]);

    // Redraw whenever inputs change
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

        // ClipboardItem only supports PNG in most browsers
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ "image/png": blob })
                    ]);
                    // Show small success indication maybe?
                } catch (err) {
                    console.error("Failed to copy image to clipboard", err);
                }
            }
        }, "image/png");
    };

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full gap-6">
                <div className="shrink-0">
                    <h1 className="text-2xl font-bold tracking-tight">Image Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Generate placeholder images locally using Canvas.
                    </p>
                </div>

                <div className="grid md:grid-cols-[300px_1fr] gap-6 flex-1 min-h-0">
                    {/* Controls */}
                    <div className="space-y-6 overflow-y-auto p-1">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                Options
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="img-width">Width</Label>
                                    <Input 
                                        id="img-width" 
                                        type="number" 
                                        min={1} 
                                        max={5000} 
                                        value={width} 
                                        onChange={(e) => setWidth(Number(e.target.value))} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="img-height">Height</Label>
                                    <Input 
                                        id="img-height" 
                                        type="number" 
                                        min={1} 
                                        max={5000} 
                                        value={height} 
                                        onChange={(e) => setHeight(Number(e.target.value))} 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bg-color">Background</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="bg-color" 
                                            type="color" 
                                            className="w-12 p-1 cursor-pointer"
                                            value={bgColor} 
                                            onChange={(e) => setBgColor(e.target.value)} 
                                        />
                                        <Input 
                                            type="text" 
                                            value={bgColor} 
                                            onChange={(e) => setBgColor(e.target.value)} 
                                            className="uppercase font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="text-color">Text Color</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            id="text-color" 
                                            type="color" 
                                            className="w-12 p-1 cursor-pointer"
                                            value={textColor} 
                                            onChange={(e) => setTextColor(e.target.value)} 
                                        />
                                        <Input 
                                            type="text" 
                                            value={textColor} 
                                            onChange={(e) => setTextColor(e.target.value)} 
                                            className="uppercase font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="img-text">Custom Text (Optional)</Label>
                                <Input 
                                    id="img-text" 
                                    placeholder="Leave empty for dimensions"
                                    value={text} 
                                    onChange={(e) => setText(e.target.value)} 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Download Format</Label>
                                <Select value={format} onValueChange={(val: any) => setFormat(val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="image/png">PNG</SelectItem>
                                        <SelectItem value="image/jpeg">JPEG</SelectItem>
                                        <SelectItem value="image/webp">WEBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button className="flex-1" onClick={handleDownload}>
                                            <Download className="mr-2 h-4 w-4" /> Download
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Save image to disk</TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="secondary" className="flex-1" onClick={handleCopy}>
                                            <Copy className="mr-2 h-4 w-4" /> Copy
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy PNG to clipboard</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="flex flex-col border rounded-lg overflow-hidden bg-muted/20 min-h-[300px]">
                        <div className="bg-muted px-4 py-2 border-b text-sm font-medium flex items-center justify-between">
                            <span>Preview</span>
                            <span className="text-muted-foreground text-xs font-mono">{width} x {height}</span>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTVlNWU1Ii8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2Y1ZjVmNSIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmNWY1ZjUiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2U1ZTVlNSIvPjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjMjIyMjIyIi8+PHJlY3QgeD0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzMzMzMzMyIvPjxyZWN0IHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiMzMzMzMzMiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzIyMjIyMiIvPjwvc3ZnPg==')]">
                            <canvas 
                                ref={canvasRef} 
                                className="max-w-full shadow-md object-contain"
                                style={{ maxHeight: "100%" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
