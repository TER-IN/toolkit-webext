import { useState, useRef, useCallback } from "react";
import {
    ArrowUpDown, Shuffle, ListPlus, WrapText, Hash, Filter, Repeat, Search, 
    AlignLeft, AlignRight, Eraser, Upload, Copy, Check, Trash2, ChevronUp, ChevronDown, ArrowDownAZ,
    ArrowLeftRight, FileDiff, Plus, Minus
} from "lucide-react";
import { useMemo } from "react";
import { diffWordsWithSpace, diffLines } from "diff";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
    reverseList, randomizeList, sortList, addTextToEachLine, convertTabsToSpaces, convertSpacesToTabs,
    removeLineBreaks, removeEmptyLines, countLines, filterLines, repeatText, findAndReplace,
    countWords, countLetters, removeDuplicateLines
} from "@/lib/string-tools";

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: any;
    defaultOptions?: any;
    renderOptions?: (options: any, setOptions: (updates: any) => void) => React.ReactNode;
    transform: (input: string, options?: any) => string;
}

const SUB_TOOLS: SubTool[] = [
    { id: "text-compare", label: "Text Compare", description: "Find the differences between two blocks of text.", icon: FileDiff, transform: () => "" },
    { id: "reverse-list", label: "Reverse List", description: "Sort a list in reverse order.", icon: ArrowUpDown, transform: reverseList },
    { id: "randomize-list", label: "List Randomizer", description: "Arrange the items of a list in random order.", icon: Shuffle, transform: randomizeList },
    { id: "sort-list", label: "Sort List", description: "Sort a list in alphabetical order.", icon: ArrowDownAZ, transform: sortList },
    { 
        id: "add-text", label: "Add Text to Each Line", description: "Append constant or variable text to each line.", icon: ListPlus,
        defaultOptions: { prefix: "", suffix: "" },
        renderOptions: (options, setOptions) => (
            <div className="flex gap-4 items-center mb-4">
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Prefix</Label><Input value={options.prefix} onChange={e=>setOptions({prefix:e.target.value})} placeholder="e.g. -> " /></div>
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Suffix</Label><Input value={options.suffix} onChange={e=>setOptions({suffix:e.target.value})} placeholder="e.g. ," /></div>
            </div>
        ),
        transform: (s, opts) => addTextToEachLine(s, opts.prefix, opts.suffix)
    },
    {
        id: "convert-tabs", label: "Convert Tabs to Spaces", description: "Convert tabs to the specified number of spaces.", icon: AlignLeft,
        defaultOptions: { spacesCount: 4 },
        renderOptions: (options, setOptions) => (
            <div className="grid gap-1.5 w-full max-w-xs mb-4"><Label>Spaces per tab</Label><Input type="number" value={options.spacesCount} onChange={e=>setOptions({spacesCount:parseInt(e.target.value)||0})} /></div>
        ),
        transform: (s, opts) => convertTabsToSpaces(s, opts.spacesCount)
    },
    {
        id: "convert-spaces", label: "Convert Spaces to Tabs", description: "Convert the specified number of spaces to tabs.", icon: AlignRight,
        defaultOptions: { spacesCount: 4 },
        renderOptions: (options, setOptions) => (
            <div className="grid gap-1.5 w-full max-w-xs mb-4"><Label>Spaces to tab logic</Label><Input type="number" value={options.spacesCount} onChange={e=>setOptions({spacesCount:parseInt(e.target.value)||0})} /></div>
        ),
        transform: (s, opts) => convertSpacesToTabs(s, opts.spacesCount)
    },
    { id: "remove-line-breaks", label: "Remove Line Breaks", description: "Remove incorrect line breaks.", icon: WrapText, transform: removeLineBreaks },
    { id: "remove-empty", label: "Remove Empty Lines", description: "Delete blank lines.", icon: Trash2, transform: removeEmptyLines },
    { id: "count-lines", label: "Count Lines", description: "Get the number of lines.", icon: Hash, transform: (s) => String(countLines(s)) },
    {
        id: "filter-lines", label: "Filter Lines", description: "Filter the lines of a list or text.", icon: Filter,
        defaultOptions: { search: "", matchMode: "contains", caseSensitive: false },
        renderOptions: (options, setOptions) => (
            <div className="flex gap-4 items-end mb-4 flex-wrap">
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Search Term</Label><Input value={options.search} onChange={e=>setOptions({search:e.target.value})} /></div>
                <div className="grid gap-1.5 w-40">
                    <Label>Mode</Label>
                    <Select value={options.matchMode} onValueChange={v=>setOptions({matchMode:v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="contains">Contains</SelectItem><SelectItem value="not_contains">Does not contain</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={options.caseSensitive} onCheckedChange={v=>setOptions({caseSensitive:v})} /><Label>Case Sensitive</Label></div>
            </div>
        ),
        transform: (s, opts) => filterLines(s, opts.search, opts.matchMode, opts.caseSensitive)
    },
    {
        id: "repeat-text", label: "Repeat Text", description: "Repeat a text multiple times.", icon: Repeat,
        defaultOptions: { count: 2, separator: "" },
        renderOptions: (options, setOptions) => (
             <div className="flex gap-4 items-center mb-4">
                <div className="grid gap-1.5 w-24"><Label>Times</Label><Input type="number" value={options.count} onChange={e=>setOptions({count:parseInt(e.target.value)||0})} /></div>
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Separator</Label><Input value={options.separator} onChange={e=>setOptions({separator:e.target.value})} /></div>
            </div>
        ),
        transform: (s, opts) => repeatText(s, opts.count, opts.separator)
    },
    {
        id: "find-replace", label: "Find and Replace", description: "Search and replace text.", icon: Search,
        defaultOptions: { find: "", replace: "", useRegex: false, caseSensitive: false },
        renderOptions: (options, setOptions) => (
             <div className="flex gap-4 items-end mb-4 flex-wrap">
                <div className="grid gap-1.5 w-full max-w-sm"><Label>Find</Label><Input value={options.find} onChange={e=>setOptions({find:e.target.value})} /></div>
                <div className="grid gap-1.5 w-full max-w-sm"><Label>Replace With</Label><Input value={options.replace} onChange={e=>setOptions({replace:e.target.value})} /></div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={options.useRegex} onCheckedChange={v=>setOptions({useRegex:v})} /><Label>Regex</Label></div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={options.caseSensitive} onCheckedChange={v=>setOptions({caseSensitive:v})} /><Label>Case Sensitive</Label></div>
            </div>
        ),
        transform: (s, opts) => findAndReplace(s, opts.find, opts.replace, opts.useRegex, opts.caseSensitive)
    },
    { id: "count-words", label: "Count Words", description: "Get the number of words.", icon: Hash, transform: (s) => String(countWords(s)) },
    { id: "count-letters", label: "Count Letters", description: "Get the number of letters.", icon: Hash, transform: (s) => String(countLetters(s)) },
    { id: "remove-dupe", label: "Remove Duplicate Lines", description: "Delete repeated lines.", icon: Eraser, transform: removeDuplicateLines }
];

const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.xml,.html,.htm,.log,.yaml,.yml,.toml,.ini,.cfg,.conf,.css,.js,.ts,.tsx,.jsx,.py,.sh,.bat,.sql";

export function TextAndListToolsPage() {
    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [copied, setCopied] = useState(false);
    const [isInputVisible, setIsInputVisible] = useState(true);
    
    // Text Compare State
    const [leftText, setLeftText] = useState("");
    const [rightText, setRightText] = useState("");
    const [compareMode, setCompareMode] = useState<"words" | "lines">("words");

    const diffResult = useMemo(() => {
        if (!leftText && !rightText) return [];
        return compareMode === "words"
            ? diffWordsWithSpace(leftText, rightText)
            : diffLines(leftText, rightText);
    }, [leftText, rightText, compareMode]);

    const additions = diffResult.filter(part => part.added).length;
    const deletions = diffResult.filter(part => part.removed).length;
    
    // Maintain options for tools that need them
    const [toolOptions, setToolOptions] = useState<Record<string, any>>(() => {
        const defaults: Record<string, any> = {};
        SUB_TOOLS.forEach(t => {
            if (t.defaultOptions) defaults[t.id] = { ...t.defaultOptions };
        });
        return defaults;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeTool = SUB_TOOLS.find((t) => t.id === activeToolId)!;

    const handleOptionsChange = useCallback((updates: any) => {
        setToolOptions(prev => ({
            ...prev,
            [activeToolId]: { ...prev[activeToolId], ...updates }
        }));
    }, [activeToolId]);

    const handleTransform = useCallback(() => {
        if (!input.trim() && input.length === 0) {
            setOutput("");
            return;
        }
        try {
            const result = activeTool.transform(input, toolOptions[activeToolId]);
            setOutput(result);
        } catch (err) {
            setOutput(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    }, [input, activeTool, toolOptions, activeToolId]);

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

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
             const text = ev.target?.result;
             if (typeof text === "string") {
                 setInput(text);
                 setOutput("");
             }
        };
        reader.readAsText(file);
        e.target.value = "";
    }, []);

    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
        setOutput("");
    }, []);

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Text & List Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Measure and manipulate text strings and lists.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 bg-muted/20 p-2 rounded-lg items-start content-start">
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
                                <TooltipContent side="bottom">{tool.description}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

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

                {activeTool.renderOptions && activeTool.renderOptions(toolOptions[activeToolId] || activeTool.defaultOptions, handleOptionsChange)}

                {activeToolId === "text-compare" ? (
                    <div className="flex flex-col gap-6 mt-4">
                        <div className="flex items-center gap-4 shrink-0">
                            <Select value={compareMode} onValueChange={(val: any) => setCompareMode(val)}>
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
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await navigator.clipboard.writeText(leftText); }}>
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
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => { await navigator.clipboard.writeText(rightText); }}>
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
                                    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all">
                                        {diffResult.map((part, i) => {
                                            if (part.added) return <span key={i} className="bg-green-500/20 text-green-700 dark:text-green-300">{part.value}</span>;
                                            if (part.removed) return <span key={i} className="bg-red-500/20 text-red-700 dark:text-red-300 line-through opacity-70">{part.value}</span>;
                                            return <span key={i}>{part.value}</span>;
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="string-input">Input</Label>
                                <div className="flex gap-2">
                                    <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileUpload} className="hidden" />
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload File</Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Load a text file into the input area</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={handleClear} disabled={!input && !output}><Trash2 className="mr-2 h-4 w-4" />Clear</Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Clear input and output</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsInputVisible(!isInputVisible)}>
                                                {isInputVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{isInputVisible ? "Collapse input" : "Expand input"}</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                            {isInputVisible && (
                                <Textarea id="string-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste or type your text here…" className="min-h-[150px] font-mono text-sm" />
                            )}
                        </div>

                        <Button onClick={handleTransform}>
                             Run Tool ({activeTool.label})
                        </Button>

                        {output !== "" && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Output</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={handleCopy}>
                                                {copied ? <><Check className="mr-2 h-4 w-4 text-green-500" />Copied!</> : <><Copy className="mr-2 h-4 w-4" />Copy</>}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Copy output to clipboard</TooltipContent>
                                    </Tooltip>
                                </div>
                                <Textarea value={output} readOnly className="min-h-[150px] font-mono text-sm bg-muted/30" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </TooltipProvider>
    );
}
