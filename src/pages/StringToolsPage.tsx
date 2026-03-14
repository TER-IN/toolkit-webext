// ============================================
// TERIN Toolkit — String Tools Dashboard Page
// ============================================
// 7 sub-tools: String Length, Upper Case, Lower Case, Title Case,
// Sentence Case, Remove Accents, Remove Extra Spaces.
// Supports textarea input, file upload, and copy-to-clipboard.

import { useState, useRef, useCallback } from "react";
import {
    Ruler,
    ArrowUpAZ,
    ArrowDownAZ,
    CaseSensitive,
    ALargeSmall,
    Eraser,
    RemoveFormatting,
    Upload,
    Copy,
    Check,
    Trash2,
    ChevronUp,
    ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import {
    getStringLength,
    toUpperCase,
    toLowerCase,
    toTitleCase,
    toSentenceCase,
    removeAccents,
    removeExtraSpaces,
} from "@/lib/string-tools";

// ---- Sub-tool definitions ----

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Apply the transformation. Returns a string result. */
    transform: (input: string) => string;
}

const SUB_TOOLS: SubTool[] = [
    {
        id: "string-length",
        label: "String Length",
        description: "Count the number of characters in a string.",
        icon: Ruler,
        transform: (s) => String(getStringLength(s)),
    },
    {
        id: "upper-case",
        label: "Upper Case",
        description: "Convert text to UPPER CASE.",
        icon: ArrowUpAZ,
        transform: toUpperCase,
    },
    {
        id: "lower-case",
        label: "Lower Case",
        description: "Convert text to lower case.",
        icon: ArrowDownAZ,
        transform: toLowerCase,
    },
    {
        id: "title-case",
        label: "Title Case",
        description: "Capitalise The First Letter Of Each Word.",
        icon: CaseSensitive,
        transform: toTitleCase,
    },
    {
        id: "sentence-case",
        label: "Sentence Case",
        description: "Capitalise the first letter of each sentence.",
        icon: ALargeSmall,
        transform: toSentenceCase,
    },
    {
        id: "remove-accents",
        label: "Remove Accents",
        description: "Strip diacritical marks (e.g. café → cafe).",
        icon: Eraser,
        transform: removeAccents,
    },
    {
        id: "remove-spaces",
        label: "Remove Extra Spaces",
        description: "Collapse multiple spaces into one and trim edges.",
        icon: RemoveFormatting,
        transform: removeExtraSpaces,
    },
];

// ---- Accepted file types for upload ----
const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.xml,.html,.htm,.log,.yaml,.yml,.toml,.ini,.cfg,.conf,.css,.js,.ts,.tsx,.jsx,.py,.sh,.bat,.sql";

export function StringToolsPage() {
    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);
    const [isInputVisible, setIsInputVisible] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTool = SUB_TOOLS.find((t) => t.id === activeToolId)!;

    // ---- Handlers ----

    const handleTransform = useCallback(() => {
        if (!input.trim()) {
            setOutput("");
            return;
        }
        try {
            const result = activeTool.transform(input);
            setOutput(result);
        } catch (err) {
            setOutput(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    }, [input, activeTool]);

    const handleCopy = useCallback(async () => {
        if (!output) return;
        await navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [output]);

    const handleClear = useCallback(() => {
        setInput("");
        setOutput("");
    }, []);

    const handleFileUpload = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target?.result;
                if (typeof text === "string") {
                    setInput(text);
                    setOutput(""); // reset output when new file is loaded
                }
            };
            reader.readAsText(file);

            // Reset file input so same file can be re-uploaded
            e.target.value = "";
        },
        [],
    );

    // Reset output when switching tools
    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
        setOutput("");
    }, []);

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">String Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Transform, measure, and clean up text strings.
                    </p>
                </div>

                {/* Tool selector — horizontal scrollable button group */}
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
                    {(() => {
                        const Icon = activeTool.icon;
                        return (
                            <>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{activeTool.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {activeTool.description}
                                    </p>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* Input area */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="string-input">Input</Label>
                        <div className="flex gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_FILE_TYPES}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload File
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Load a text file into the input area
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClear}
                                        disabled={!input && !output}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Clear
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Clear input and output</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setIsInputVisible(!isInputVisible)}
                                    >
                                        {isInputVisible ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {isInputVisible ? "Collapse input" : "Expand input"}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                    {isInputVisible && (
                        <Textarea
                            id="string-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste or type your text here…"
                            className="min-h-[150px] font-mono text-sm"
                        />
                    )}
                </div>

                {/* Transform button */}
                <Button onClick={handleTransform} disabled={!input.trim()}>
                    Transform
                </Button>

                {/* Output area */}
                {output && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Output</Label>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="mr-2 h-4 w-4 text-green-500" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy output to clipboard</TooltipContent>
                            </Tooltip>
                        </div>
                        <Textarea
                            value={output}
                            readOnly
                            className="min-h-[150px] font-mono text-sm bg-muted/30"
                        />
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
