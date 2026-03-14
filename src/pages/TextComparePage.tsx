// ============================================
// TERIN Toolkit — Text Compare Page
// ============================================

import { useState, useMemo } from "react";
import { diffWordsWithSpace, diffLines } from "diff";
import { Copy, Plus, Minus, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function TextComparePage() {
    const [leftText, setLeftText] = useState("");
    const [rightText, setRightText] = useState("");
    const [mode, setMode] = useState<"words" | "lines">("words");

    const diffResult = useMemo(() => {
        if (!leftText && !rightText) return [];
        return mode === "words"
            ? diffWordsWithSpace(leftText, rightText)
            : diffLines(leftText, rightText);
    }, [leftText, rightText, mode]);

    const additions = diffResult.filter(part => part.added).length;
    const deletions = diffResult.filter(part => part.removed).length;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="shrink-0">
                <h1 className="text-2xl font-bold tracking-tight">Text Compare</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Find the differences between two blocks of text.
                </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Comparison Mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="words">Word Level</SelectItem>
                        <SelectItem value="lines">Line Level</SelectItem>
                    </SelectContent>
                </Select>
                
                {diffResult.length > 0 && (
                    <div className="flex gap-2">
                        <Badge variant="outline" className="text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20">
                            <Plus className="mr-1 h-3 w-3" />
                            {additions} Additions
                        </Badge>
                        <Badge variant="outline" className="text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20">
                            <Minus className="mr-1 h-3 w-3" />
                            {deletions} Deletions
                        </Badge>
                    </div>
                )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-4 min-h-[50vh]">
                <div className="flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground px-1">
                        Original Text
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(leftText)}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <Textarea 
                        className="flex-1 resize-none font-mono text-sm leading-relaxed p-4 bg-muted/30"
                        placeholder="Paste original text here..."
                        value={leftText}
                        onChange={e => setLeftText(e.target.value)}
                        spellCheck={false}
                    />
                </div>

                <div className="flex flex-col gap-2 relative">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground px-1">
                        Modified Text
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(rightText)}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <Textarea 
                        className="flex-1 resize-none font-mono text-sm leading-relaxed p-4 bg-muted/30"
                        placeholder="Paste modified text here..."
                        value={rightText}
                        onChange={e => setRightText(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="shrink-0 border rounded-lg bg-card overflow-hidden flex flex-col min-h-[25vh]">
                <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Differences</span>
                </div>
                {diffResult.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
                        Enter text above to see the differences.
                    </div>
                ) : (
                    <ScrollArea className="flex-1 p-4 bg-background">
                        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap word-break-all">
                            {diffResult.map((part, i) => {
                                if (part.added) {
                                    return (
                                        <span key={i} className="bg-green-500/20 text-green-700 dark:text-green-300">
                                            {part.value}
                                        </span>
                                    );
                                }
                                if (part.removed) {
                                    return (
                                        <span key={i} className="bg-red-500/20 text-red-700 dark:text-red-300 line-through opacity-70">
                                            {part.value}
                                        </span>
                                    );
                                }
                                return <span key={i}>{part.value}</span>;
                            })}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
