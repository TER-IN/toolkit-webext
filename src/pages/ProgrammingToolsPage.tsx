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
    Minus,
    Key,
    Shield,
    PenLine,
    AlertTriangle,
    Loader2,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import js_beautify from "js-beautify";
import { format as sqlFormatter } from "sql-formatter";

import { cn } from "@/lib/utils";
import {
    parseAndValidate,
    getJwtAlgorithm,
    getCommonClaims,
    getJwtStatus,
    prettyPrintJson,
} from "@/lib/jwt";
import {
    verifyJwtSignature,
    generateJwt,
    decodeSecretInput,
    SUPPORTED_SIGN_ALGS,
    isHmacAlg,
    isRsaAlg,
    type Alg,
    type SecretEncoding,
    type VerifyResult,
} from "@/lib/jwt-crypto";
import { getJwtExamplePreset, JWT_EXAMPLE_PRESETS, type JwtExamplePreset } from "@/lib/jwt-examples";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    {
        id: "jwt-debugger",
        label: "JWT Debugger",
        description: "Decode, verify, and generate JSON Web Tokens.",
        icon: Key,
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
    const [tableAlign, setTableAlign] = useState<("left" | "center" | "right")[]>(Array(3).fill("left"));

    // JWT Decoder specific state
    const [jwtInput, setJwtInput] = useState("");
    const [jwtCopied, setJwtCopied] = useState<"header" | "payload" | "signature" | null>(null);

    // JWT Verify (inline, lives in Decoder tab)
    const [jwtSecret, setJwtSecret] = useState("");
    const [jwtSecretEncoding, setJwtSecretEncoding] = useState<SecretEncoding>("utf8");
    const [jwtPublicKey, setJwtPublicKey] = useState("");
    const [jwtVerifyResult, setJwtVerifyResult] = useState<VerifyResult | null>(null);
    const [jwtVerifyLoading, setJwtVerifyLoading] = useState(false);

    // JWT Encode specific state
    const [jwtGenAlg, setJwtGenAlg] = useState<Alg>("HS256");
    const [jwtGenSecret, setJwtGenSecret] = useState("");
    const [jwtGenSecretEncoding, setJwtGenSecretEncoding] = useState<SecretEncoding>("utf8");
    const [jwtGenPrivateKey, setJwtGenPrivateKey] = useState("");
    const [jwtGenHeader, setJwtGenHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
    const [jwtGenPayload, setJwtGenPayload] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "admin": true,\n  "iat": 1516239022\n}');
    const [jwtGenOutput, setJwtGenOutput] = useState("");
    const [jwtGenError, setJwtGenError] = useState<string | null>(null);
    const [jwtGenLoading, setJwtGenLoading] = useState(false);
    const [jwtExampleLoading, setJwtExampleLoading] = useState(false);

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

    // ---- JWT sub-tab state ----
    const [jwtActiveTab, setJwtActiveTab] = useState("decoder");

    const jwtParsed = parseAndValidate(jwtInput);
    const jwtDecoded = jwtParsed.decoded;
    const jwtAlgorithm = jwtDecoded ? getJwtAlgorithm(jwtDecoded) : null;
    const jwtClaims = jwtDecoded ? getCommonClaims(jwtDecoded) : [];
    const jwtStatus = jwtDecoded
        ? getJwtStatus(jwtDecoded)
        : jwtParsed.error
            ? { kind: "malformed" as const, reason: jwtParsed.error }
            : null;
    const jwtVerifyUsesSecret = jwtAlgorithm ? isHmacAlg(jwtAlgorithm) : false;
    const jwtVerifyUsesRsa = jwtAlgorithm ? isRsaAlg(jwtAlgorithm) : false;
    const jwtCanEncode = isHmacAlg(jwtGenAlg) ? Boolean(jwtGenSecret) : Boolean(jwtGenPrivateKey.trim());

    const renderJwtJsonPanel = (label: string, value: string, part: "header" | "payload") => (
        <div className="rounded-xl border bg-card/70">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <Label className="text-sm font-medium">{label}</Label>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={async () => {
                                await navigator.clipboard.writeText(value);
                                setJwtCopied(part);
                                setTimeout(() => setJwtCopied(null), 2000);
                            }}
                        >
                            {jwtCopied === part ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy {label.toLowerCase()}</TooltipContent>
                </Tooltip>
            </div>
            <pre className="overflow-auto p-4 text-xs font-mono text-[#f8f8f2] bg-[#272822] rounded-b-xl">
                <code dangerouslySetInnerHTML={{ __html: Prism.highlight(value, Prism.languages.json, "json") }} />
            </pre>
        </div>
    );

    const renderJwtVerifyResult = () => {
        if (!jwtVerifyResult) return null;

        const resultStyles: Record<VerifyResult["kind"], string> = {
            "signature-verified": "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400",
            "invalid-signature": "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
            "unsupported-algorithm": "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
            "invalid-key-format": "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
            "verification-error": "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
        };

        const titleMap: Record<VerifyResult["kind"], string> = {
            "signature-verified": "Signature verified",
            "invalid-signature": "Invalid signature",
            "unsupported-algorithm": "Unsupported algorithm",
            "invalid-key-format": "Invalid key format",
            "verification-error": "Verification error",
        };

        const detail =
            jwtVerifyResult.kind === "unsupported-algorithm"
                ? jwtVerifyResult.alg
                : jwtVerifyResult.reason;

        return (
            <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", resultStyles[jwtVerifyResult.kind])}>
                {jwtVerifyResult.kind === "signature-verified" ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                    <div className="font-medium">{titleMap[jwtVerifyResult.kind]}</div>
                    {detail ? <div className="text-xs opacity-90">{detail}</div> : null}
                </div>
            </div>
        );
    };

    const applyJwtExampleToEncoder = (preset: JwtExamplePreset) => {
        setJwtGenAlg(preset.alg);
        setJwtGenHeader(preset.header);
        setJwtGenPayload(preset.payload);
        setJwtGenSecret(preset.secret ?? "");
        setJwtGenSecretEncoding(preset.secretEncoding ?? "utf8");
        setJwtGenPrivateKey(preset.privateKeyPem ?? "");
        setJwtGenError(null);
    };

    const loadJwtExampleIntoDecoder = async (id: JwtExamplePreset["id"]) => {
        const preset = getJwtExamplePreset(id);
        setJwtExampleLoading(true);

        try {
            const result = await generateJwt({
                headerJson: preset.header,
                payloadJson: preset.payload,
                alg: preset.alg,
                secretBytes: preset.secret ? decodeSecretInput(preset.secret, preset.secretEncoding ?? "utf8") ?? undefined : undefined,
                privateKeyPem: preset.privateKeyPem,
            });

            if (result.error || !result.token) {
                setJwtVerifyResult({ kind: "verification-error", reason: result.error ?? "Failed to generate example token" });
                return;
            }

            setJwtInput(result.token);
            setJwtSecret(preset.secret ?? "");
            setJwtSecretEncoding(preset.secretEncoding ?? "utf8");
            setJwtPublicKey(preset.publicKeyPem ?? "");
            setJwtVerifyResult(null);
        } finally {
            setJwtExampleLoading(false);
        }
    };

    const handleVerifyInline = async () => {
        if (!jwtDecoded || !jwtAlgorithm) {
            return;
        }

        setJwtVerifyLoading(true);
        setJwtVerifyResult(null);

        try {
            const result = await verifyJwtSignature({
                alg: jwtAlgorithm,
                headerBase64Url: jwtDecoded.raw.header,
                payloadBase64Url: jwtDecoded.raw.payload,
                signatureBase64Url: jwtDecoded.raw.signature,
                secretBytes: jwtVerifyUsesSecret ? decodeSecretInput(jwtSecret, jwtSecretEncoding) ?? undefined : undefined,
                publicKeyPem: jwtVerifyUsesRsa ? jwtPublicKey : undefined,
            });

            if (jwtVerifyUsesSecret && !jwtSecret.trim()) {
                setJwtVerifyResult({ kind: "invalid-key-format", reason: "Secret key is required for HMAC verification" });
            } else {
                setJwtVerifyResult(result);
            }
        } catch (error) {
            setJwtVerifyResult({
                kind: "verification-error",
                reason: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setJwtVerifyLoading(false);
        }
    };

    const handleEncode = async () => {
        setJwtGenLoading(true);
        setJwtGenError(null);
        setJwtGenOutput("");

        const secretBytes = isHmacAlg(jwtGenAlg) ? decodeSecretInput(jwtGenSecret, jwtGenSecretEncoding) : null;
        if (isHmacAlg(jwtGenAlg) && !secretBytes) {
            setJwtGenError(`Failed to decode secret using ${jwtGenSecretEncoding} encoding.`);
            setJwtGenLoading(false);
            return;
        }

        const result = await generateJwt({
            headerJson: jwtGenHeader,
            payloadJson: jwtGenPayload,
            alg: jwtGenAlg,
            secretBytes: secretBytes ?? undefined,
            privateKeyPem: isRsaAlg(jwtGenAlg) ? jwtGenPrivateKey : undefined,
        });

        if (result.error || !result.token) {
            setJwtGenError(result.error ?? "Unable to encode JWT.");
        } else {
            setJwtGenOutput(result.token);
        }

        setJwtGenLoading(false);
    };

    const injectClaim = (claim: string, value: string | number) => {
        try {
            const parsed = JSON.parse(jwtGenPayload) as Record<string, unknown>;
            parsed[claim] = value;
            setJwtGenPayload(JSON.stringify(parsed, null, 2));
            setJwtGenError(null);
        } catch {
            setJwtGenError("Payload must be valid JSON before adding common claims.");
        }
    };

    const renderJwtStatusBadge = () => {
        if (!jwtStatus) return null;

        if (jwtStatus.kind === "valid-format") {
            return <Badge className="border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">Valid format</Badge>;
        }

        if (jwtStatus.kind === "expired") {
            return <Badge className="border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400">Expired</Badge>;
        }

        if (jwtStatus.kind === "not-yet-active") {
            return <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Not yet active</Badge>;
        }

        return <Badge className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">Malformed</Badge>;
    };

    const renderJwtDecoderTab = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold">JWT Decoder</h3>
                    <p className="text-sm text-muted-foreground">Decode and verify JWTs.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select onValueChange={(value: JwtExamplePreset["id"]) => void loadJwtExampleIntoDecoder(value)}>
                        <SelectTrigger className="w-[190px]">
                            <SelectValue placeholder="Load example" />
                        </SelectTrigger>
                        <SelectContent>
                            {JWT_EXAMPLE_PRESETS.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => { setJwtInput(""); setJwtVerifyResult(null); }} disabled={!jwtInput}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="min-w-0 space-y-4">
                    <div className="min-w-0 rounded-xl border bg-card/70">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <Label htmlFor="jwt-input" className="text-sm font-medium">Encoded JWT</Label>
                            {jwtExampleLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                        </div>
                        <Textarea
                            id="jwt-input"
                            value={jwtInput}
                            onChange={(event) => {
                                setJwtInput(event.target.value);
                                setJwtVerifyResult(null);
                            }}
                            placeholder="Paste an encoded JWT"
                            className="min-h-[240px] min-w-0 break-all rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                            spellCheck={false}
                        />
                    </div>

                    <div className="min-w-0 rounded-xl border bg-card/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">JWT Signature Verification</Label>
                        </div>

                        {jwtVerifyUsesSecret ? (
                            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                                <Input
                                    type="password"
                                    value={jwtSecret}
                                    onChange={(event) => {
                                        setJwtSecret(event.target.value);
                                        setJwtVerifyResult(null);
                                    }}
                                    placeholder="Secret"
                                    className="font-mono text-sm"
                                />
                                <Select value={jwtSecretEncoding} onValueChange={(value: SecretEncoding) => setJwtSecretEncoding(value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="utf8">UTF-8</SelectItem>
                                        <SelectItem value="base64">Base64</SelectItem>
                                        <SelectItem value="base64url">Base64URL</SelectItem>
                                        <SelectItem value="hex">Hex</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleVerifyInline} disabled={jwtVerifyLoading || !jwtDecoded}>
                                    {jwtVerifyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                    Verify
                                </Button>
                            </div>
                        ) : jwtVerifyUsesRsa ? (
                            <div className="space-y-3">
                                <Textarea
                                    value={jwtPublicKey}
                                    onChange={(event) => {
                                        setJwtPublicKey(event.target.value);
                                        setJwtVerifyResult(null);
                                    }}
                                    placeholder="-----BEGIN PUBLIC KEY-----"
                                    className="min-h-[140px] min-w-0 break-all font-mono text-xs"
                                    spellCheck={false}
                                />
                                <Button onClick={handleVerifyInline} disabled={jwtVerifyLoading || !jwtDecoded}>
                                    {jwtVerifyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                                    Verify
                                </Button>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                                Unsupported algorithm for verification.
                            </div>
                        )}

                        <div className="mt-3">{renderJwtVerifyResult()}</div>
                    </div>
                </div>

                <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {jwtAlgorithm ? <Badge variant="outline" className="font-mono">{jwtAlgorithm}</Badge> : null}
                        {renderJwtStatusBadge()}
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                        Decoded claims are not trusted until the JWT signature is verified.
                    </div>

                    {jwtParsed.error ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                            {jwtParsed.error}
                        </div>
                    ) : null}

                    {jwtDecoded ? (
                        <>
                            {renderJwtJsonPanel("Decoded Header", prettyPrintJson(jwtDecoded.header), "header")}
                            {renderJwtJsonPanel("Decoded Payload", prettyPrintJson(jwtDecoded.payload), "payload")}

                            <div className="min-w-0 rounded-xl border bg-card/70">
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <Label className="text-sm font-medium">JWT Signature</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={async () => {
                                                    await navigator.clipboard.writeText(jwtDecoded.signature);
                                                    setJwtCopied("signature");
                                                    setTimeout(() => setJwtCopied(null), 2000);
                                                }}
                                            >
                                                {jwtCopied === "signature" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Copy signature</TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="px-4 py-3">
                                    <code className="text-xs font-mono break-all text-muted-foreground">{jwtDecoded.signature}</code>
                                </div>
                            </div>

                            <div className="rounded-xl border bg-card/70 p-4">
                                <Label className="text-sm font-medium">Common Claims</Label>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {jwtClaims.length > 0 ? jwtClaims.map((claim) => (
                                        <div key={claim.key} className="rounded-lg border bg-background/70 px-3 py-2">
                                            <div className="text-xs font-medium text-muted-foreground">{claim.label}</div>
                                            <div className="mt-1 break-all font-mono text-xs">{claim.value}</div>
                                        </div>
                                    )) : (
                                        <div className="text-sm text-muted-foreground">No common registered claims found.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center">
                            <Key className="mb-3 h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Paste an encoded JWT to inspect its header, payload, and signature.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderJwtEncoderTab = () => {
        const nowSeconds = Math.floor(Date.now() / 1000);

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">JWT Encoder</h3>
                        <p className="text-sm text-muted-foreground">Compose header and payload JSON, then sign with HMAC or RSA.</p>
                    </div>
                    <Select onValueChange={(value: JwtExamplePreset["id"]) => applyJwtExampleToEncoder(getJwtExamplePreset(value))}>
                        <SelectTrigger className="w-[210px]">
                            <SelectValue placeholder="Generate example" />
                        </SelectTrigger>
                        <SelectContent>
                            {JWT_EXAMPLE_PRESETS.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                    <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="min-w-0 rounded-xl border bg-card/70">
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <Label htmlFor="jwt-enc-header" className="text-sm font-medium">Header</Label>
                                    <span className="text-xs text-muted-foreground">`alg` is forced to match the selected algorithm</span>
                                </div>
                                <Textarea
                                    id="jwt-enc-header"
                                    value={jwtGenHeader}
                                    onChange={(event) => {
                                        setJwtGenHeader(event.target.value);
                                        setJwtGenError(null);
                                    }}
                                    className="min-h-[220px] rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0"
                                    spellCheck={false}
                                />
                            </div>

                            <div className="rounded-xl border bg-card/70">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                                    <Label htmlFor="jwt-enc-payload" className="text-sm font-medium">Payload</Label>
                                    <div className="flex flex-wrap gap-1">
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("iss", "")} type="button">iss</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("sub", "")} type="button">sub</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("aud", "")} type="button">aud</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("exp", nowSeconds + 3600)} type="button">exp</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("iat", nowSeconds)} type="button">iat</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("nbf", nowSeconds)} type="button">nbf</Button>
                                        <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => injectClaim("jti", crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))} type="button">jti</Button>
                                    </div>
                                </div>
                                <Textarea
                                    id="jwt-enc-payload"
                                    value={jwtGenPayload}
                                    onChange={(event) => {
                                        setJwtGenPayload(event.target.value);
                                        setJwtGenError(null);
                                    }}
                                    className="min-h-[220px] rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0"
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border bg-card/70">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                                <Label className="text-sm font-medium">Sign JWT</Label>
                                <div className="flex items-center gap-3">
                                    <div className="min-w-[160px] space-y-2">
                                        <Label htmlFor="jwt-enc-alg">Algorithm</Label>
                                        <Select value={jwtGenAlg} onValueChange={(value: Alg) => setJwtGenAlg(value)}>
                                            <SelectTrigger id="jwt-enc-alg">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SUPPORTED_SIGN_ALGS.map((alg) => (
                                                    <SelectItem key={alg} value={alg}>{alg}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {isRsaAlg(jwtGenAlg) ? (
                                        <div className="min-w-[140px] space-y-2">
                                            <Label>Private Key Format</Label>
                                            <Input value="PEM" readOnly className="font-mono text-sm" />
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="p-4">
                                {isHmacAlg(jwtGenAlg) ? (
                                    <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                                        <div className="space-y-2">
                                            <Label htmlFor="jwt-enc-secret">Sign JWT: Secret</Label>
                                            <Input
                                                id="jwt-enc-secret"
                                                type="password"
                                                value={jwtGenSecret}
                                                onChange={(event) => {
                                                    setJwtGenSecret(event.target.value);
                                                    setJwtGenError(null);
                                                }}
                                                placeholder="your-secret"
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="jwt-enc-secret-encoding">Secret Encoding</Label>
                                            <Select value={jwtGenSecretEncoding} onValueChange={(value: SecretEncoding) => setJwtGenSecretEncoding(value)}>
                                                <SelectTrigger id="jwt-enc-secret-encoding">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="utf8">UTF-8</SelectItem>
                                                    <SelectItem value="base64">Base64</SelectItem>
                                                    <SelectItem value="base64url">Base64URL</SelectItem>
                                                    <SelectItem value="hex">Hex</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="jwt-enc-private-key">Sign JWT: Private Key</Label>
                                        <Textarea
                                            id="jwt-enc-private-key"
                                            value={jwtGenPrivateKey}
                                            onChange={(event) => {
                                                setJwtGenPrivateKey(event.target.value);
                                                setJwtGenError(null);
                                            }}
                                            placeholder="-----BEGIN PRIVATE KEY-----"
                                            className="min-h-[180px] font-mono text-xs"
                                            spellCheck={false}
                                        />
                                        <div className="text-xs text-muted-foreground">RSA examples use demo keys embedded in the extension.</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {jwtGenError ? (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                                {jwtGenError}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleEncode} disabled={jwtGenLoading || !jwtCanEncode}>
                                {jwtGenLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
                                Encode
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card/70">
                            <div className="flex items-center justify-between border-b px-4 py-3">
                                <Label className="text-sm font-medium">JWT Signature / Encoded JWT</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            if (jwtGenOutput) {
                                                await navigator.clipboard.writeText(jwtGenOutput);
                                            }
                                        }}
                                        disabled={!jwtGenOutput}
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (jwtGenOutput) {
                                                setJwtInput(jwtGenOutput);
                                                setJwtActiveTab("decoder");
                                            }
                                        }}
                                        disabled={!jwtGenOutput}
                                    >
                                        Load into Decoder
                                    </Button>
                                </div>
                            </div>
                            <div className="min-h-[420px] bg-[#272822] p-4">
                                {jwtGenOutput ? (
                                    <code className="break-all font-mono text-xs text-[#f8f8f2]">{jwtGenOutput}</code>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-center text-sm text-[#f8f8f2]/65">
                                        Encoded JWT output appears here after signing.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderJwtTool = () => (
        <Tabs value={jwtActiveTab} onValueChange={setJwtActiveTab} orientation="horizontal" className="space-y-4">
            <TabsList variant="line" className="border-b p-0">
                <TabsTrigger value="decoder" className="rounded-none px-4 text-sm">
                    <Key className="h-4 w-4" />
                    JWT Decoder
                </TabsTrigger>
                <TabsTrigger value="encoder" className="rounded-none px-4 text-sm">
                    <PenLine className="h-4 w-4" />
                    JWT Encoder
                </TabsTrigger>
            </TabsList>

            <TabsContent value="decoder">{renderJwtDecoderTab()}</TabsContent>
            <TabsContent value="encoder">{renderJwtEncoderTab()}</TabsContent>
        </Tabs>
    );

    return (
        <TooltipProvider>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Programming Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Syntax highlighting, JSON formatting, Markdown preview, and more developer utilities.
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

                {/* Shared Input area (Used by most tools, but not JWT decoder) */}
                {activeToolId !== "markdown-table-generator" && activeToolId !== "jwt-debugger" && (
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
                {activeToolId === "jwt-debugger" && renderJwtTool()}

            </div>
        </TooltipProvider>
    );
}
