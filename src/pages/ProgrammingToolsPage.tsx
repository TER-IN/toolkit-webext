// ============================================
// TERIN Toolkit — Programming Tools Dashboard Page
// ============================================
// Sub-tools: Syntax Highlighter, JSON formatter, etc.
// Uses a tabbed layout similar to StringToolsPage.

import { useState, useRef, useCallback } from "react";
import {
    Code2,
    Braces,
    Upload,
    Copy,
    Check,
    Trash2,
    ChevronUp,
    ChevronDown,
    FileText,
    Table2,
    FileCode2,
    Database,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Plus,
    Minus
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import js_beautify from "js-beautify";
import { format as sqlFormatter } from "sql-formatter";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import Prism from "prismjs";
// We import common languages for syntax highlighting
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup"; // HTML/XML
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";
// Themes - let's use a nice dark theme by default, maybe Tomorrow Night or Okaidia
import "prismjs/themes/prism-okaidia.css"; 

// ---- Sub-tool definitions ----

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const SUB_TOOLS: SubTool[] = [
    {
        id: "syntax-highlighter",
        label: "Syntax Highlighter",
        description: "Highlight code snippets with beautiful themes.",
        icon: Code2,
    },
    {
        id: "json-formatter",
        label: "JSON Formatter & Validator",
        description: "Format and validate JSON. Identifies syntax errors.",
        icon: Braces,
    },
    {
        id: "markdown-preview",
        label: "Markdown Preview",
        description: "Live preview of GitHub Flavored Markdown.",
        icon: FileText,
    },
    {
        id: "markdown-table-generator",
        label: "Markdown Table Generator",
        description: "Visually create and format Markdown tables.",
        icon: Table2,
    },
    {
        id: "html-formatter",
        label: "HTML Formatter & Validator",
        description: "Format and validate raw HTML structure.",
        icon: FileCode2,
    },
    {
        id: "sql-formatter",
        label: "SQL Formatter",
        description: "Format SQL queries beautifully.",
        icon: Database,
    },
];

// ---- Accepted file types for upload ----
const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.json,.xml,.html,.htm,.log,.yaml,.yml,.toml,.ini,.cfg,.conf,.css,.js,.ts,.tsx,.jsx,.py,.sh,.bat,.sql";

export function ProgrammingToolsPage() {
    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);
    const [input, setInput] = useState("");
    const [copied, setCopied] = useState(false);
    const [isInputVisible, setIsInputVisible] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Syntax Highlighter specific state
    const [syntaxLang, setSyntaxLang] = useState("javascript");

    // Markdown Table specific state
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const [tableData, setTableData] = useState<string[][]>(Array(3).fill(null).map(() => Array(3).fill("")));
    const [tableAlign, setTableAlign] = useState<("left"| "center" | "right")[]>(Array(3).fill("left"));

    const activeTool = SUB_TOOLS.find((t) => t.id === activeToolId)!;

    // ---- Handlers ----

    const handleClear = useCallback(() => {
        setInput("");
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
                }
            };
            reader.readAsText(file);

            // Reset file input so same file can be re-uploaded
            e.target.value = "";
        },
        [],
    );

    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
    }, []);

    const handleCopyInput = useCallback(async () => {
        if (!input) return;
        await navigator.clipboard.writeText(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [input]);

    // ---- Tool Renderers ----

    const renderSyntaxHighlighter = () => {
        // We use dangerouslySetInnerHTML for Prism output
        const highlightedCode = (() => {
            try {
                if (!input) return "";
                const grammar = Prism.languages[syntaxLang];
                if (!grammar) return input; // fallback to plain if lang not found
                return Prism.highlight(input, grammar, syntaxLang);
            } catch (err) {
                return input; // in case of syntax crash, fallback to raw text
            }
        })();

        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="space-y-2 flex-1 max-w-[300px]">
                        <Label>Language</Label>
                        <Select value={syntaxLang} onValueChange={setSyntaxLang}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="javascript">JavaScript / JSON</SelectItem>
                                <SelectItem value="typescript">TypeScript</SelectItem>
                                <SelectItem value="python">Python</SelectItem>
                                <SelectItem value="markup">HTML / XML</SelectItem>
                                <SelectItem value="css">CSS</SelectItem>
                                <SelectItem value="bash">Bash / Shell</SelectItem>
                                <SelectItem value="sql">SQL</SelectItem>
                                <SelectItem value="markdown">Markdown</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Preview
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyInput}>
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    </div>
                    {/* Syntax Highlighted Box */}
                    <div className="relative rounded-lg border bg-[#272822] overflow-hidden min-h-[150px]">
                        <pre className="p-4 m-0 h-full text-sm font-mono overflow-auto text-[#f8f8f2]">
                            {input ? (
                                <code
                                    className={`language-${syntaxLang}`}
                                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                                />
                            ) : (
                                <span className="opacity-50 italic">Type code above to see highlighting...</span>
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

    const renderJsonFormatter = () => {
        let formattedJson = "";
        let errorMsg = "";
        let isValid = false;
        
        if (input.trim()) {
            try {
                const parsed = JSON.parse(input);
                formattedJson = JSON.stringify(parsed, null, 4);
                isValid = true;
            } catch (err) {
                errorMsg = err instanceof Error ? err.message : "Invalid JSON";
            }
        }

        const handleCopyFormatted = async () => {
            if (!formattedJson) return;
            await navigator.clipboard.writeText(formattedJson);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <div className="space-y-4">
                {input.trim() && (
                    <div className={cn(
                        "p-4 text-sm rounded-md border",
                        isValid 
                            ? "text-green-500 bg-green-500/10 border-green-500/20" 
                            : "text-red-500 bg-red-500/10 border-red-500/20"
                    )}>
                        {isValid ? "✅ Valid JSON" : `❌ Invalid JSON: ${errorMsg}`}
                    </div>
                )}
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Formatted JSON Output
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyFormatted} disabled={!formattedJson}>
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    </div>
                    {/* JSON Output Box */}
                    <div className="relative rounded-lg border bg-[#272822] overflow-hidden min-h-[150px]">
                        <pre className="p-4 m-0 h-full text-sm font-mono overflow-auto text-[#f8f8f2]">
                            {formattedJson ? (
                                <code
                                    className="language-json"
                                    dangerouslySetInnerHTML={{ __html: Prism.highlight(formattedJson, Prism.languages.json, "json") }}
                                />
                            ) : (
                                <span className="opacity-50 italic">Waiting for valid JSON input...</span>
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

    const renderMarkdownPreview = () => {
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                    Live Preview
                </div>
                <div className="relative rounded-lg border bg-card overflow-hidden min-h-[150px] p-6 max-w-none prose prose-sm dark:prose-invert">
                    {input ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {input}
                        </ReactMarkdown>
                    ) : (
                        <span className="opacity-50 text-muted-foreground italic">Type markdown above to see the live preview...</span>
                    )}
                </div>
            </div>
        );
    };

    const renderMarkdownTableGenerator = () => {
        const updateCell = (r: number, c: number, val: string) => {
            const newData = [...tableData];
            newData[r] = [...newData[r]];
            newData[r][c] = val;
            setTableData(newData);
        };
        const updateAlign = (c: number, align: "left" | "center" | "right") => {
            const newAlign = [...tableAlign];
            newAlign[c] = align;
            setTableAlign(newAlign);
        };

        const addRow = () => {
            setTableRows(tableRows + 1);
            setTableData([...tableData, Array(tableCols).fill("")]);
        };
        const removeRow = () => {
             if (tableRows <= 1) return;
             setTableRows(tableRows - 1);
             setTableData(tableData.slice(0, tableRows - 1));
        };
        const addCol = () => {
            setTableCols(tableCols + 1);
            setTableData(tableData.map(row => [...row, ""]));
            setTableAlign([...tableAlign, "left"]);
        };
        const removeCol = () => {
             if (tableCols <= 1) return;
             setTableCols(tableCols - 1);
             setTableData(tableData.map(row => row.slice(0, tableCols - 1)));
             setTableAlign(tableAlign.slice(0, tableCols - 1));
        };

        const generateMarkdown = () => {
            // max lengths
            const colWidths = Array(tableCols).fill(3);
            for (let r = 0; r < tableRows; r++) {
               for (let c = 0; c < tableCols; c++) {
                   colWidths[c] = Math.max(colWidths[c], (tableData[r][c] || "").length);
               }
            }
            
            let md = "";
            for (let r = 0; r < tableRows; r++) {
                md += "|";
                for (let c = 0; c < tableCols; c++) {
                    const pad = colWidths[c];
                    const val = tableData[r][c] || "";
                    let cellStr = ` ${val.padEnd(pad, " ")} |`;
                    md += cellStr;
                }
                md += "\n";
                // separator
                if (r === 0) {
                    md += "|";
                    for (let c = 0; c < tableCols; c++) {
                        const align = tableAlign[c];
                        let dashes = "-".repeat(colWidths[c] + 2);
                        if (align === "center") dashes = ":" + "-".repeat(colWidths[c]) + ":";
                        else if (align === "right") dashes = "-".repeat(colWidths[c] + 1) + ":";
                        else dashes = "-" + "-".repeat(colWidths[c]) + "-";
                        
                        md += dashes + "|";
                    }
                    md += "\n";
                }
            }
            return md.trim();
        };

        const mdOutput = generateMarkdown();

        return (
            <div className="space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                   <div className="flex gap-2 items-center">
                       <span className="text-sm font-medium">Rows: {tableRows}</span>
                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={removeRow}><Minus className="h-4 w-4" /></Button>
                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={addRow}><Plus className="h-4 w-4" /></Button>
                   </div>
                   <div className="flex gap-2 items-center">
                       <span className="text-sm font-medium">Cols: {tableCols}</span>
                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={removeCol}><Minus className="h-4 w-4" /></Button>
                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={addCol}><Plus className="h-4 w-4" /></Button>
                   </div>
                   <Button variant="outline" size="sm" onClick={() => setTableData(Array(tableRows).fill(null).map(() => Array(tableCols).fill("")))}>Clear Table</Button>
                </div>
                
                <div className="overflow-x-auto border rounded-lg max-w-full">
                    <table className="w-full text-sm">
                        <thead className="bg-muted break-normal whitespace-pre">
                           <tr>
                             {Array(tableCols).fill(null).map((_, c) => (
                                 <th key={c} className="p-2 border-b border-r last:border-r-0 min-w-[150px]">
                                     <div className="flex gap-1 justify-center mb-2">
                                        <Button variant={tableAlign[c] === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => updateAlign(c, "left")}><AlignLeft className="h-3 w-3" /></Button>
                                        <Button variant={tableAlign[c] === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => updateAlign(c, "center")}><AlignCenter className="h-3 w-3" /></Button>
                                        <Button variant={tableAlign[c] === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => updateAlign(c, "right")}><AlignRight className="h-3 w-3" /></Button>
                                     </div>
                                     <input 
                                         type="text" 
                                         value={tableData[0]?.[c] || ""} 
                                         onChange={e => updateCell(0, c, e.target.value)}
                                         placeholder="Header"
                                         className="w-full p-1 border rounded text-center bg-background"
                                     />
                                 </th>
                             ))}
                           </tr>
                        </thead>
                        <tbody>
                            {tableData.slice(1).map((row, r) => (
                                <tr key={r + 1} className="border-b last:border-0">
                                   {row.map((_val, c) => (
                                       <td key={c} className="p-2 border-r last:border-r-0">
                                            <input 
                                                 type="text" 
                                                 value={tableData[r + 1][c] || ""} 
                                                 onChange={e => updateCell(r + 1, c, e.target.value)}
                                                 className="w-full p-1 border rounded"
                                             />
                                       </td>
                                   ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Output Markdown
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                            await navigator.clipboard.writeText(mdOutput);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}>
                             {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    </div>
                    <div className="relative rounded-lg border bg-[#272822] overflow-hidden min-h-[150px]">
                        <pre className="p-4 m-0 h-full text-sm font-mono overflow-auto text-[#f8f8f2]">
                            <code className="language-markdown" dangerouslySetInnerHTML={{ __html: Prism.highlight(mdOutput, Prism.languages.markdown, "markdown") }} />
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

    const renderHtmlFormatter = () => {
        let formattedHtml = "";
        let errorMsg = "";
        
        if (input.trim()) {
            try {
                // Check if js_beautify is imported directly or has .html
                const beautify = js_beautify.html || js_beautify;
                formattedHtml = beautify(input, {
                    indent_size: 4,
                    wrap_line_length: 120,
                    preserve_newlines: true
                });
            } catch (err) {
                errorMsg = err instanceof Error ? err.message : "Error formatting HTML";
            }
        }

        const handleCopyFormatted = async () => {
            if (!formattedHtml) return;
            await navigator.clipboard.writeText(formattedHtml);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <div className="space-y-4">
                {errorMsg && (
                    <div className="p-4 text-sm rounded-md border text-red-500 bg-red-500/10 border-red-500/20">
                        {`❌ Error: ${errorMsg}`}
                    </div>
                )}
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Formatted HTML Output
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyFormatted} disabled={!formattedHtml}>
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    </div>
                    <div className="relative rounded-lg border bg-[#272822] overflow-hidden min-h-[150px]">
                        <pre className="p-4 m-0 h-full text-sm font-mono overflow-auto text-[#f8f8f2]">
                            {formattedHtml ? (
                                <code
                                    className="language-markup"
                                    dangerouslySetInnerHTML={{ __html: Prism.highlight(formattedHtml, Prism.languages.markup, "markup") }}
                                />
                            ) : (
                                <span className="opacity-50 italic">Waiting for HTML input...</span>
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

    const renderSqlFormatter = () => {
        let formattedSql = "";
        let errorMsg = "";
        
        if (input.trim()) {
            try {
                formattedSql = sqlFormatter(input, { language: 'sql', tabWidth: 4 });
            } catch (err) {
                errorMsg = err instanceof Error ? err.message : "Error formatting SQL";
            }
        }

        const handleCopyFormatted = async () => {
            if (!formattedSql) return;
            await navigator.clipboard.writeText(formattedSql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <div className="space-y-4">
                {errorMsg && (
                    <div className="p-4 text-sm rounded-md border text-red-500 bg-red-500/10 border-red-500/20">
                        {`❌ Invalid SQL: ${errorMsg}`}
                    </div>
                )}
                
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                        Formatted SQL Output
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyFormatted} disabled={!formattedSql}>
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                    </div>
                    <div className="relative rounded-lg border bg-[#272822] overflow-hidden min-h-[150px]">
                        <pre className="p-4 m-0 h-full text-sm font-mono overflow-auto text-[#f8f8f2]">
                            {formattedSql ? (
                                <code
                                    className="language-sql"
                                    dangerouslySetInnerHTML={{ __html: Prism.highlight(formattedSql, Prism.languages.sql, "sql") }}
                                />
                            ) : (
                                <span className="opacity-50 italic">Waiting for SQL input...</span>
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Programming Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Developer utilities like syntax highlighting, formatting, and validation.
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

                {/* Shared Input area (Used by most tools) */}
                {activeToolId !== "markdown-table-generator" && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="code-input">Input Code</Label>
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
                                <TooltipContent>Load file into input area</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClear}
                                        disabled={!input}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Clear
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Clear input</TooltipContent>
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
                            id="code-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste or type your code here…"
                            className="min-h-[150px] font-mono text-sm"
                            spellCheck={false}
                        />
                    )}
                </div>
                )}

                {/* Tool specific rendering */}
                {activeToolId === "syntax-highlighter" && renderSyntaxHighlighter()}
                {activeToolId === "json-formatter" && renderJsonFormatter()}
                {activeToolId === "markdown-preview" && renderMarkdownPreview()}
                {activeToolId === "markdown-table-generator" && renderMarkdownTableGenerator()}
                {activeToolId === "html-formatter" && renderHtmlFormatter()}
                {activeToolId === "sql-formatter" && renderSqlFormatter()}

            </div>
        </TooltipProvider>
    );
}
