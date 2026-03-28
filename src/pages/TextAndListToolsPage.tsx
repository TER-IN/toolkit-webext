import { useState, useRef, useCallback } from "react";
import {
    ArrowUpDown, Shuffle, ListPlus, WrapText, Hash, Filter, Repeat, Search,
    AlignLeft, AlignRight, Eraser, Upload, Copy, Check, Trash2, ChevronUp, ChevronDown, ArrowDownAZ,
    ArrowLeftRight, FileDiff, Plus, Minus, FileText
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
import {
    generateLoremIpsum,
    DEFAULT_LOREM_OPTIONS,
    LOREM_PRESETS,
    type LoremGeneratorOptions,
    type LoremMode,
    type ListStyle,
    type HtmlWrapper,
    type LineBreakStyle,
} from "@/lib/lorem-ipsum";
import { useLoremIpsumStore } from "@/stores/useLoremIpsumStore";

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
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Prefix</Label><Input value={options.prefix} onChange={e => setOptions({ prefix: e.target.value })} placeholder="e.g. -> " /></div>
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Suffix</Label><Input value={options.suffix} onChange={e => setOptions({ suffix: e.target.value })} placeholder="e.g. ," /></div>
            </div>
        ),
        transform: (s, opts) => addTextToEachLine(s, opts.prefix, opts.suffix)
    },
    {
        id: "convert-tabs", label: "Convert Tabs to Spaces", description: "Convert tabs to the specified number of spaces.", icon: AlignLeft,
        defaultOptions: { spacesCount: 4 },
        renderOptions: (options, setOptions) => (
            <div className="grid gap-1.5 w-full max-w-xs mb-4"><Label>Spaces per tab</Label><Input type="number" value={options.spacesCount} onChange={e => setOptions({ spacesCount: parseInt(e.target.value) || 0 })} /></div>
        ),
        transform: (s, opts) => convertTabsToSpaces(s, opts.spacesCount)
    },
    {
        id: "convert-spaces", label: "Convert Spaces to Tabs", description: "Convert the specified number of spaces to tabs.", icon: AlignRight,
        defaultOptions: { spacesCount: 4 },
        renderOptions: (options, setOptions) => (
            <div className="grid gap-1.5 w-full max-w-xs mb-4"><Label>Spaces to tab logic</Label><Input type="number" value={options.spacesCount} onChange={e => setOptions({ spacesCount: parseInt(e.target.value) || 0 })} /></div>
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
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Search Term</Label><Input value={options.search} onChange={e => setOptions({ search: e.target.value })} /></div>
                <div className="grid gap-1.5 w-40">
                    <Label>Mode</Label>
                    <Select value={options.matchMode} onValueChange={v => setOptions({ matchMode: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="contains">Contains</SelectItem><SelectItem value="not_contains">Does not contain</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={options.caseSensitive} onCheckedChange={v => setOptions({ caseSensitive: v })} /><Label>Case Sensitive</Label></div>
            </div>
        ),
        transform: (s, opts) => filterLines(s, opts.search, opts.matchMode, opts.caseSensitive)
    },
    {
        id: "repeat-text", label: "Repeat Text", description: "Repeat a text multiple times.", icon: Repeat,
        defaultOptions: { count: 2, separator: "" },
        renderOptions: (options, setOptions) => (
            <div className="flex gap-4 items-center mb-4">
                <div className="grid gap-1.5 w-24"><Label>Times</Label><Input type="number" value={options.count} onChange={e => setOptions({ count: parseInt(e.target.value) || 0 })} /></div>
                <div className="grid gap-1.5 w-full max-w-xs"><Label>Separator</Label><Input value={options.separator} onChange={e => setOptions({ separator: e.target.value })} /></div>
            </div>
        ),
        transform: (s, opts) => repeatText(s, opts.count, opts.separator)
    },
    {
        id: "find-replace", label: "Find and Replace", description: "Search and replace text.", icon: Search,
        defaultOptions: { find: "", replace: "", useRegex: false, caseSensitive: false },
        renderOptions: (options, setOptions) => (
            <div className="flex gap-4 items-end mb-4 flex-wrap">
                <div className="grid gap-1.5 w-full max-w-sm"><Label>Find</Label><Input value={options.find} onChange={e => setOptions({ find: e.target.value })} /></div>
                <div className="grid gap-1.5 w-full max-w-sm"><Label>Replace With</Label><Input value={options.replace} onChange={e => setOptions({ replace: e.target.value })} /></div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={options.useRegex} onCheckedChange={v => setOptions({ useRegex: v })} /><Label>Regex</Label></div>
                <div className="flex items-center gap-2 pb-2"><Switch checked={options.caseSensitive} onCheckedChange={v => setOptions({ caseSensitive: v })} /><Label>Case Sensitive</Label></div>
            </div>
        ),
        transform: (s, opts) => findAndReplace(s, opts.find, opts.replace, opts.useRegex, opts.caseSensitive)
    },
    { id: "count-words", label: "Count Words", description: "Get the number of words.", icon: Hash, transform: (s) => String(countWords(s)) },
    { id: "count-letters", label: "Count Letters", description: "Get the number of letters.", icon: Hash, transform: (s) => String(countLetters(s)) },
    { id: "remove-dupe", label: "Remove Duplicate Lines", description: "Delete repeated lines.", icon: Eraser, transform: removeDuplicateLines },
    { id: "lorem-ipsum", label: "Lorem Ipsum", description: "Generate placeholder text in multiple formats.", icon: FileText, transform: () => "" }
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

    // Lorem Ipsum State
    const { lastOptions: storedLoremOptions, saveOptions: saveLoremOptions } = useLoremIpsumStore();
    const [loremOptions, setLoremOptions] = useState<LoremGeneratorOptions>(storedLoremOptions);
    const [loremResult, setLoremResult] = useState<{ text: string; wordCount: number; characterCount: number; paragraphCount?: number; sentenceCount?: number; estimatedReadingMinutes: number } | null>(null);
    const [loremCopied, setLoremCopied] = useState(false);

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

    // Lorem Ipsum handlers
    const handleLoremOptionsChange = useCallback((updates: Partial<LoremGeneratorOptions>) => {
        const newOpts = { ...loremOptions, ...updates };
        setLoremOptions(newOpts);
    }, [loremOptions]);

    const handleGenerateLorem = useCallback(() => {
        const result = generateLoremIpsum(loremOptions);
        setLoremResult(result);
        saveLoremOptions(loremOptions);
    }, [loremOptions, saveLoremOptions]);

    const handleLoremCopy = useCallback(async () => {
        if (!loremResult) return;
        await navigator.clipboard.writeText(loremResult.text);
        setLoremCopied(true);
        setTimeout(() => setLoremCopied(false), 2000);
    }, [loremResult]);

    const handleLoremClear = useCallback(() => {
        setLoremResult(null);
    }, []);

    const handleLoremDownload = useCallback((ext: 'txt' | 'html' | 'md') => {
        if (!loremResult) return;
        let filename = `lorem-ipsum.${ext}`;
        let content = loremResult.text;

        if (ext === 'html' && loremOptions.mode === 'html') {
            content = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Lorem Ipsum</title>\n</head>\n<body>\n${loremResult.text}\n</body>\n</html>`;
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [loremResult, loremOptions.mode]);

    const applyLoremPreset = useCallback((presetId: string) => {
        const preset = LOREM_PRESETS.find(p => p.id === presetId);
        if (preset) {
            const newOpts = { ...DEFAULT_LOREM_OPTIONS, ...preset.options };
            setLoremOptions(newOpts);
        }
    }, []);

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Text & List Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Filter lines, convert linebreaks, reverse arrays, compare text, and more.
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

                {activeToolId === "lorem-ipsum" ? (
                    <LoremIpsumTool
                        options={loremOptions}
                        result={loremResult}
                        copied={loremCopied}
                        onOptionsChange={handleLoremOptionsChange}
                        onGenerate={handleGenerateLorem}
                        onCopy={handleLoremCopy}
                        onClear={handleLoremClear}
                        onDownload={handleLoremDownload}
                        onApplyPreset={applyLoremPreset}
                    />
                ) : activeToolId === "text-compare" ? (
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

// ---- Lorem Ipsum Tool Component ----

interface LoremIpsumToolProps {
    options: LoremGeneratorOptions;
    result: { text: string; wordCount: number; characterCount: number; paragraphCount?: number; sentenceCount?: number; estimatedReadingMinutes: number } | null;
    copied: boolean;
    onOptionsChange: (updates: Partial<LoremGeneratorOptions>) => void;
    onGenerate: () => void;
    onCopy: () => void;
    onClear: () => void;
    onDownload: (ext: 'txt' | 'html' | 'md') => void;
    onApplyPreset: (presetId: string) => void;
}

function LoremIpsumTool({
    options,
    result,
    copied,
    onOptionsChange,
    onGenerate,
    onCopy,
    onClear,
    onDownload,
    onApplyPreset,
}: LoremIpsumToolProps) {
    const modeHelperText: Record<LoremMode, string> = {
        paragraphs: `${options.count} paragraph${options.count !== 1 ? 's' : ''} of lorem ipsum`,
        sentences: `${options.count} sentence${options.count !== 1 ? 's' : ''}`,
        words: `${options.count} word${options.count !== 1 ? 's' : ''}`,
        lists: `${options.count} list item${options.count !== 1 ? 's' : ''}`,
        html: `${options.count} HTML paragraph${options.count !== 1 ? 's' : ''}`,
        markdown: `${options.count} markdown paragraph${options.count !== 1 ? 's' : ''}`,
    };

    return (
        <div className="space-y-6">
            {/* Presets */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Presets</Label>
                <div className="flex flex-wrap gap-2">
                    {LOREM_PRESETS.map((preset) => (
                        <Button
                            key={preset.id}
                            variant="outline"
                            size="sm"
                            onClick={() => onApplyPreset(preset.id)}
                        >
                            {preset.name}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Options Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Mode */}
                <div className="space-y-2">
                    <Label htmlFor="lorem-mode">Mode</Label>
                    <Select
                        value={options.mode}
                        onValueChange={(v: LoremMode) => onOptionsChange({ mode: v })}
                    >
                        <SelectTrigger id="lorem-mode">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paragraphs">Paragraphs</SelectItem>
                            <SelectItem value="sentences">Sentences</SelectItem>
                            <SelectItem value="words">Words</SelectItem>
                            <SelectItem value="lists">Lists</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                            <SelectItem value="markdown">Markdown</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Count */}
                <div className="space-y-2">
                    <Label htmlFor="lorem-count">
                        {options.mode === 'paragraphs' ? 'Paragraphs' :
                         options.mode === 'sentences' ? 'Sentences' :
                         options.mode === 'words' ? 'Words' :
                         options.mode === 'lists' ? 'Items' : 'Count'}
                    </Label>
                    <Input
                        id="lorem-count"
                        type="number"
                        min={1}
                        max={1000}
                        value={options.count}
                        onChange={(e) => onOptionsChange({ count: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)) })}
                    />
                </div>

                {/* List Style (only for lists mode) */}
                {options.mode === 'lists' && (
                    <div className="space-y-2">
                        <Label htmlFor="lorem-list-style">List Style</Label>
                        <Select
                            value={options.listStyle}
                            onValueChange={(v: ListStyle) => onOptionsChange({ listStyle: v })}
                        >
                            <SelectTrigger id="lorem-list-style">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="markdown-unordered">Markdown Unordered</SelectItem>
                                <SelectItem value="plain-unordered">Plain Unordered</SelectItem>
                                <SelectItem value="plain-ordered">Plain Ordered</SelectItem>
                                <SelectItem value="html">HTML List</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* HTML Wrapper (only for html mode) */}
                {options.mode === 'html' && (
                    <div className="space-y-2">
                        <Label htmlFor="lorem-html-wrapper">Wrapper</Label>
                        <Select
                            value={options.htmlWrapper}
                            onValueChange={(v: HtmlWrapper) => onOptionsChange({ htmlWrapper: v })}
                        >
                            <SelectTrigger id="lorem-html-wrapper">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Wrapper</SelectItem>
                                <SelectItem value="div">div</SelectItem>
                                <SelectItem value="article">article</SelectItem>
                                <SelectItem value="section">section</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Line Break Style (for paragraphs, sentences, lists, markdown) */}
                {(options.mode === 'paragraphs' || options.mode === 'lists' || options.mode === 'markdown') && (
                    <div className="space-y-2">
                        <Label htmlFor="lorem-linebreak">Line Breaks</Label>
                        <Select
                            value={options.lineBreakStyle}
                            onValueChange={(v: LineBreakStyle) => onOptionsChange({ lineBreakStyle: v })}
                        >
                            <SelectTrigger id="lorem-linebreak">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="double">Double</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Advanced Options */}
            <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Advanced Options
                </summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="lorem-min-words">Min Words/Sentence</Label>
                        <Input
                            id="lorem-min-words"
                            type="number"
                            min={1}
                            max={50}
                            value={options.minWordsPerSentence}
                            onChange={(e) => onOptionsChange({ minWordsPerSentence: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lorem-max-words">Max Words/Sentence</Label>
                        <Input
                            id="lorem-max-words"
                            type="number"
                            min={options.minWordsPerSentence}
                            max={100}
                            value={options.maxWordsPerSentence}
                            onChange={(e) => onOptionsChange({ maxWordsPerSentence: Math.max(options.minWordsPerSentence, Math.min(100, parseInt(e.target.value) || options.minWordsPerSentence)) })}
                        />
                    </div>
                    {options.mode === 'paragraphs' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="lorem-min-sent">Min Sentences/Paragraph</Label>
                                <Input
                                    id="lorem-min-sent"
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={options.minSentencesPerParagraph}
                                    onChange={(e) => onOptionsChange({ minSentencesPerParagraph: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lorem-max-sent">Max Sentences/Paragraph</Label>
                                <Input
                                    id="lorem-max-sent"
                                    type="number"
                                    min={options.minSentencesPerParagraph}
                                    max={30}
                                    value={options.maxSentencesPerParagraph}
                                    onChange={(e) => onOptionsChange({ maxSentencesPerParagraph: Math.max(options.minSentencesPerParagraph, Math.min(30, parseInt(e.target.value) || options.minSentencesPerParagraph)) })}
                                />
                            </div>
                        </>
                    )}
                </div>
            </details>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                    <Switch
                        id="lorem-start-classic"
                        checked={options.startClassic}
                        onCheckedChange={(v) => onOptionsChange({ startClassic: v })}
                    />
                    <Label htmlFor="lorem-start-classic" className="text-sm">Start with classic lorem ipsum</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch
                        id="lorem-capitalize"
                        checked={options.capitalizeSentences}
                        onCheckedChange={(v) => onOptionsChange({ capitalizeSentences: v })}
                    />
                    <Label htmlFor="lorem-capitalize" className="text-sm">Capitalize sentences</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch
                        id="lorem-punctuation"
                        checked={options.includePunctuation}
                        onCheckedChange={(v) => onOptionsChange({ includePunctuation: v })}
                    />
                    <Label htmlFor="lorem-punctuation" className="text-sm">Include punctuation</Label>
                </div>
            </div>

            {/* Helper Text */}
            <p className="text-xs text-muted-foreground">
                {modeHelperText[options.mode]}
            </p>

            {/* Generate Button */}
            <div className="flex gap-2">
                <Button onClick={onGenerate}>
                    Generate
                </Button>
                {result && (
                    <Button variant="outline" onClick={onClear}>
                        Clear
                    </Button>
                )}
            </div>

            {/* Output */}
            {result && (
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>{result.wordCount} word{result.wordCount !== 1 ? 's' : ''}</span>
                        <span>{result.characterCount} character{result.characterCount !== 1 ? 's' : ''}</span>
                        {result.paragraphCount !== undefined && (
                            <span>{result.paragraphCount} paragraph{result.paragraphCount !== 1 ? 's' : ''}</span>
                        )}
                        {result.sentenceCount !== undefined && (
                            <span>{result.sentenceCount} sentence{result.sentenceCount !== 1 ? 's' : ''}</span>
                        )}
                        <span>~{result.estimatedReadingMinutes} min read</span>
                    </div>

                    {/* Output Area */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Output</Label>
                            <div className="flex gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={onCopy}>
                                            {copied ? (
                                                <><Check className="mr-2 h-4 w-4 text-green-500" />Copied!</>
                                            ) : (
                                                <><Copy className="mr-2 h-4 w-4" />Copy</>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy to clipboard</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => onDownload('txt')} disabled={!result.text}>
                                            Download .txt
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download as text file</TooltipContent>
                                </Tooltip>
                                {options.mode === 'html' && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => onDownload('html')} disabled={!result.text}>
                                                Download .html
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Download as HTML file</TooltipContent>
                                    </Tooltip>
                                )}
                                {options.mode === 'markdown' && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => onDownload('md')} disabled={!result.text}>
                                                Download .md
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Download as Markdown file</TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                        <Textarea
                            value={result.text}
                            readOnly
                            className="min-h-[250px] font-mono text-sm bg-muted/30"
                            aria-label="Lorem ipsum output"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
