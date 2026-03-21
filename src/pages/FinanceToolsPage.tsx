import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Plus,
    Trash2,
    Pencil,
    RefreshCw,
    BarChart,
    DollarSign,
    Euro,
    Wallet,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { useFinanceStore, type PortfolioAction, type SupportedImportChain, type CryptoTransaction } from "@/stores/useFinanceStore";
import { prefetchTransaction } from "@/lib/tx-import";
import { SegmentedControl } from "@/components/ui/segmented-control";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];

const SUPPORTED_ASSETS = [
    "BTC", "ETH", "PAXG", "SOL", "AVAX", "TAO", "DOT", "SUI", "DOGE", "USDT", "USDC", "EURC", "EURT"
];

const SUPPORTED_CHAINS: { value: SupportedImportChain; label: string }[] = [
    { value: "ethereum", label: "Ethereum" },
    { value: "avalanche-c", label: "Avalanche C-Chain" },
    { value: "bitcoin", label: "Bitcoin" },
    { value: "solana", label: "Solana" },
    { value: "sui", label: "Sui" },
    { value: "polkadot", label: "Polkadot" },
    { value: "bittensor", label: "Bittensor" },
    { value: "dogecoin", label: "Dogecoin" },
];

const ACTION_OPTIONS = [
    { value: "buy", label: "Buy" },
    { value: "sell", label: "Sell" },
    { value: "transfer", label: "Transfer" },
];

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const SUB_TOOLS: SubTool[] = [
    {
        id: "crypto-portfolio",
        label: "Crypto Portfolio",
        description:
            "Crypto portfolio tracking & analysis",
        icon: Wallet,
    },
];

export function FinanceToolsPage() {
    const {
        transactions,
        loadTransactions,
        isLoading,
        addTransaction,
        updateTransaction,
        removeTransaction,
        displayCurrency,
        setDisplayCurrency,
    } = useFinanceStore();

    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);

    // Live prices in USD
    const [pricesUsd, setPricesUsd] = useState<Record<string, number>>({});
    const [eurToUsdRate, setEurToUsdRate] = useState<number>(1.08); // 1 EUR = X USD, fallback
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Dialog state
    const [newAction, setNewAction] = useState<PortfolioAction>("buy");
    const [newSymbol, setNewSymbol] = useState("BTC");
    const [newQuantity, setNewQuantity] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newCurrency, setNewCurrency] = useState<"USD" | "EUR">(displayCurrency);
    const [newDate, setNewDate] = useState<number | null>(null);
    const [newFee, setNewFee] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [newChain, setNewChain] = useState<SupportedImportChain | "">("");
    const [newTxHash, setNewTxHash] = useState("");
    const [newRecipientAddress, setNewRecipientAddress] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Import state
    const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [importError, setImportError] = useState("");
    const [importWarnings, setImportWarnings] = useState<string[]>([]);
    const [showImportSection, setShowImportSection] = useState(false);

    // Delete confirmation state
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleteConfirmSymbol, setDeleteConfirmSymbol] = useState<string>("");

    // Edit transaction state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [editAction, setEditAction] = useState<PortfolioAction>("buy");
    const [editSymbol, setEditSymbol] = useState("");
    const [editQuantity, setEditQuantity] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editCurrency, setEditCurrency] = useState<"USD" | "EUR">("USD");
    const [editDate, setEditDate] = useState<number | null>(null);
    const [editFee, setEditFee] = useState("");
    const [editNotes, setEditNotes] = useState("");

    // Filter/Sort state for ledger
    type SortField = "date" | "action" | "symbol" | "quantity" | "pricePerCoin" | "total";
    type SortDirection = "asc" | "desc";
    const [ledgerSearch, setLedgerSearch] = useState("");
    const [ledgerActionFilter, setLedgerActionFilter] = useState<PortfolioAction | "all">("all");
    const [ledgerSymbolFilter, setLedgerSymbolFilter] = useState<string>("all");
    const [ledgerSortField, setLedgerSortField] = useState<SortField>("date");
    const [ledgerSortDirection, setLedgerSortDirection] = useState<SortDirection>("desc");

    const activeTool = SUB_TOOLS.find((tool) => tool.id === activeToolId) ?? SUB_TOOLS[0];
    const ActiveToolIcon = activeTool.icon;

    const handleToolChange = useCallback((toolId: string) => {
        setActiveToolId(toolId);
    }, []);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    useEffect(() => {
        if (!isDialogOpen) {
            setNewCurrency(displayCurrency);
        }
    }, [isDialogOpen, displayCurrency]);

    // Computed total
    const computedTotal = useMemo(() => {
        const qty = parseFloat(newQuantity) || 0;
        const price = parseFloat(newPrice) || 0;
        return qty * price;
    }, [newQuantity, newPrice]);

    // Easiest is to normalize everything based on the current EUR/USD rate for simplicity when calculating aggregated metrics.
    const holdingsUsd = useMemo(() => {
        const result: Record<string, { quantity: number; investedUsd: number }> = {};

        Object.values(transactions).forEach((tx) => {
            const txCurrency = tx.currency || "USD";
            // Normalizing transaction price to USD using current exchange rate
            const priceInUsd = txCurrency === "EUR" ? tx.pricePerCoin * eurToUsdRate : tx.pricePerCoin;

            if (!result[tx.symbol]) {
                result[tx.symbol] = { quantity: 0, investedUsd: 0 };
            }

            if (tx.action === "buy" || tx.action === "transfer") {
                result[tx.symbol].quantity += tx.quantity;
                result[tx.symbol].investedUsd += tx.quantity * priceInUsd;
            } else if (tx.action === "sell") {
                result[tx.symbol].quantity -= tx.quantity;
                // reduce invested proportionally
                const avgBuyPrice =
                    result[tx.symbol].quantity > 0
                        ? result[tx.symbol].investedUsd / (result[tx.symbol].quantity + tx.quantity)
                        : 0;
                result[tx.symbol].investedUsd -= tx.quantity * avgBuyPrice;
            }
        });

        // Remove zero or negative dust
        Object.keys(result).forEach((sym) => {
            if (result[sym].quantity <= 0.00000001) {
                delete result[sym];
            }
        });

        return result;
    }, [transactions, eurToUsdRate]);

    const activeSymbols = Object.keys(holdingsUsd);

    const refreshPrices = async () => {
        setIsRefreshing(true);
        const newPrices: Record<string, number> = { ...pricesUsd };
        let newEurUsd = eurToUsdRate;

        try {
            // Fetch EUR/USD rate. Binance ticker EURUSDT = Price of 1 EUR in USDT (e.g., 1.08)
            const eurRes = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT");
            if (eurRes.ok) {
                const data = await eurRes.json();
                newEurUsd = parseFloat(data.price);
                setEurToUsdRate(newEurUsd);
            }
        } catch (e) {
            console.error("Failed to fetch EUR/USDT", e);
        }

        for (const sym of activeSymbols) {
            try {
                if (["USDT", "USDC", "DAI", "BUSD"].includes(sym.toUpperCase())) {
                    newPrices[sym] = 1;
                    continue;
                }

                const res = await fetch(
                    `https://api.binance.com/api/v3/ticker/price?symbol=${sym.toUpperCase()}USDT`
                );
                if (res.ok) {
                    const data = await res.json();
                    newPrices[sym] = parseFloat(data.price);
                }
            } catch (e) {
                console.error("Failed to fetch price for", sym, e);
            }
        }

        setPricesUsd(newPrices);
        setIsRefreshing(false);
    };

    // Auto-refresh prices on load
    useEffect(() => {
        if (activeSymbols.length > 0) {
            refreshPrices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(activeSymbols)]);

    const handleAddTransaction = async () => {
        if (!newSymbol || !newQuantity || !newPrice) return;

        await addTransaction({
            action: newAction,
            symbol: newSymbol.toUpperCase(),
            quantity: parseFloat(newQuantity),
            pricePerCoin: parseFloat(newPrice),
            currency: newCurrency,
            date: newDate || Date.now(),
            fee: newFee ? parseFloat(newFee) : undefined,
            notes: newNotes || undefined,
            source: newTxHash ? "hash-import" : "manual",
            chain: newChain || undefined,
            txHash: newTxHash || undefined,
        });

        // Reset form
        setNewAction("buy");
        setNewSymbol("BTC");
        setNewQuantity("");
        setNewPrice("");
        setNewCurrency(displayCurrency);
        setNewDate(null);
        setNewFee("");
        setNewNotes("");
        setNewChain("");
        setNewTxHash("");
        setNewRecipientAddress("");
        setImportStatus("idle");
        setImportError("");
        setImportWarnings([]);
        setIsDialogOpen(false);
    };

    // Open edit dialog with transaction data
    const openEditDialog = (tx: CryptoTransaction) => {
        setEditingTxId(tx.id);
        setEditAction(tx.action);
        setEditSymbol(tx.symbol);
        setEditQuantity(tx.quantity.toString());
        setEditPrice(tx.pricePerCoin.toString());
        setEditCurrency(tx.currency);
        setEditDate(tx.date);
        setEditFee(tx.fee?.toString() ?? "");
        setEditNotes(tx.notes ?? "");
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTxId || !editSymbol || !editQuantity || !editPrice) return;

        await updateTransaction(editingTxId, {
            action: editAction,
            symbol: editSymbol.toUpperCase(),
            quantity: parseFloat(editQuantity),
            pricePerCoin: parseFloat(editPrice),
            currency: editCurrency,
            date: editDate || Date.now(),
            fee: editFee ? parseFloat(editFee) : undefined,
            notes: editNotes || undefined,
        });

        // Reset form
        setEditingTxId(null);
        setEditAction("buy");
        setEditSymbol("");
        setEditQuantity("");
        setEditPrice("");
        setEditCurrency("USD");
        setEditDate(null);
        setEditFee("");
        setEditNotes("");
        setIsEditDialogOpen(false);
    };

    const handleAutoFill = async () => {
        if (!newChain || !newTxHash) {
            setImportStatus("error");
            setImportError("Please select a chain and enter a transaction hash.");
            return;
        }

        setImportStatus("loading");
        setImportError("");
        setImportWarnings([]);

        const result = await prefetchTransaction(newChain, newTxHash, undefined, newRecipientAddress || undefined);

        if (result.warnings && result.warnings.length > 0) {
            setImportWarnings(result.warnings);
        }

        if (result.symbol) setNewSymbol(result.symbol);
        if (result.quantity !== undefined) setNewQuantity(result.quantity.toString());
        if (result.date) setNewDate(result.date);
        if (result.action) setNewAction(result.action);

        if (result.symbol || result.quantity || result.date) {
            setImportStatus("success");
            setTimeout(() => setImportStatus("idle"), 3000);
        } else {
            setImportStatus("error");
            setImportError(result.warnings[0] || "Could not extract any data from this transaction.");
        }
    };

    if (isLoading) return null;

    // Helper to format currency
    const CurrencyIcon = displayCurrency === "EUR" ? Euro : DollarSign;
    const currencyPrefix = displayCurrency === "EUR" ? "€" : "$";

    // Convert USD value to Display Currency value
    const convertToDisplay = (usdValue: number) => {
        if (displayCurrency === "USD") return usdValue;
        // USD -> EUR (e.g., 1 EUR = 1.08 USD, so 1 USD = 1/1.08 EUR)
        return usdValue / eurToUsdRate;
    };

    let totalValueDisp = 0;
    let totalInvestedDisp = 0;

    const tableData = activeSymbols.map((sym) => {
        const item = holdingsUsd[sym];
        const currentPriceUsd = pricesUsd[sym] || 0;

        // Everything calculated in USD first
        const valueUsd = item.quantity * currentPriceUsd;
        const avgBuyUsd = item.quantity > 0 ? item.investedUsd / item.quantity : 0;
        const pnlUsd = valueUsd - item.investedUsd;
        const pnlPercent = item.investedUsd > 0 ? (pnlUsd / item.investedUsd) * 100 : 0;

        // Convert to display metrics
        const valueDisp = convertToDisplay(valueUsd);
        const investedDisp = convertToDisplay(item.investedUsd);
        const currentPriceDisp = convertToDisplay(currentPriceUsd);
        const avgBuyDisp = convertToDisplay(avgBuyUsd);
        const pnlDisp = convertToDisplay(pnlUsd);

        totalValueDisp += valueDisp;
        totalInvestedDisp += investedDisp;

        return {
            sym,
            quantity: item.quantity,
            investedDisp,
            currentPriceDisp,
            valueDisp,
            avgBuyDisp,
            pnlDisp,
            pnlPercent,
        };
    });

    // Best performer = asset with highest PnL percentage
    const bestPerformer = tableData.reduce((best, current) =>
        current.pnlPercent > (best?.pnlPercent ?? -Infinity) ? current : best
    , null as (typeof tableData)[0] | null);

    tableData.sort((a, b) => b.valueDisp - a.valueDisp);

    const totalPnlDisp = totalValueDisp - totalInvestedDisp;
    const totalPnlPercent = totalInvestedDisp > 0 ? (totalPnlDisp / totalInvestedDisp) * 100 : 0;

    const chartData = tableData
        .filter((d) => d.valueDisp > 0)
        .map((d) => ({
            name: d.sym,
            value: d.valueDisp,
            percent: totalValueDisp > 0 ? (d.valueDisp / totalValueDisp) * 100 : 0,
        }));

    // Line chart data: cumulative portfolio value over time
    const lineChartData = (() => {
        const sortedTxs = Object.values(transactions).sort((a, b) => a.date - b.date);

        let runningHoldings: Record<string, number> = {};
        const dataPoints: { date: string; timestamp: number; totalValue: number }[] = [];

        for (const tx of sortedTxs) {
            if (!runningHoldings[tx.symbol]) {
                runningHoldings[tx.symbol] = 0;
            }

            if (tx.action === "buy" || tx.action === "transfer") {
                runningHoldings[tx.symbol] += tx.quantity;
            } else if (tx.action === "sell") {
                runningHoldings[tx.symbol] -= tx.quantity;
            }

            let totalVal = 0;
            for (const [sym, qty] of Object.entries(runningHoldings)) {
                if (qty > 0.00000001) {
                    const price = pricesUsd[sym] || 0;
                    totalVal += qty * price;
                }
            }

            dataPoints.push({
                date: new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                timestamp: tx.date,
                totalValue: totalVal,
            });
        }

        return dataPoints;
    })();

    // Unique symbols for filter dropdown
    const ledgerSymbols = Array.from(new Set(Object.values(transactions).map((tx) => tx.symbol))).sort();

    // Filtered and sorted ledger transactions
    const filteredLedgerTxs = (() => {
        let txs = Object.values(transactions);

        if (ledgerSearch) {
            const search = ledgerSearch.toLowerCase();
            txs = txs.filter(
                (tx) =>
                    tx.symbol.toLowerCase().includes(search) ||
                    tx.notes?.toLowerCase().includes(search) ||
                    tx.txHash?.toLowerCase().includes(search)
            );
        }

        if (ledgerActionFilter !== "all") {
            txs = txs.filter((tx) => tx.action === ledgerActionFilter);
        }

        if (ledgerSymbolFilter !== "all") {
            txs = txs.filter((tx) => tx.symbol === ledgerSymbolFilter);
        }

        txs.sort((a, b) => {
            let cmp = 0;
            switch (ledgerSortField) {
                case "date":
                    cmp = a.date - b.date;
                    break;
                case "action":
                    cmp = a.action.localeCompare(b.action);
                    break;
                case "symbol":
                    cmp = a.symbol.localeCompare(b.symbol);
                    break;
                case "quantity":
                    cmp = a.quantity - b.quantity;
                    break;
                case "pricePerCoin":
                    cmp = a.pricePerCoin - b.pricePerCoin;
                    break;
                case "total":
                    cmp = a.quantity * a.pricePerCoin - b.quantity * b.pricePerCoin;
                    break;
            }
            return ledgerSortDirection === "asc" ? cmp : -cmp;
        });

        return txs;
    })();

    // Helper for formatting date to datetime-local expected format
    const formatDateTimeLocal = (ts: number | null) => {
        if (!ts) return "";
        const d = new Date(ts);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        return localISOTime;
    };

    return (
        <TooltipProvider>
            <div className="max-w-7xl mx-auto space-y-6 pb-20">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Finance Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Portfolio tracking & analysis, indicators, financial calculations, and more.
                    </p>
                </div>

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

                <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <ActiveToolIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">{activeTool.label}</p>
                            <p className="text-xs text-muted-foreground">{activeTool.description}</p>
                        </div>
                    </div>

                    {activeToolId === "crypto-portfolio" && (
                        <div className="space-y-2 sm:min-w-[220px]">
                            <Label className="text-xs text-muted-foreground">Display Currency</Label>
                            <Select
                                value={displayCurrency}
                                onValueChange={(value: "USD" | "EUR") => setDisplayCurrency(value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Display currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {activeToolId === "crypto-portfolio" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                                    <CurrencyIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {currencyPrefix}
                                        {totalValueDisp.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Total Invested: {currencyPrefix}
                                        {totalInvestedDisp.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Net Profit / Loss</CardTitle>
                                    {totalPnlDisp >= 0 ? (
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-rose-500" />
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className={`text-2xl font-bold ${totalPnlDisp >= 0 ? "text-emerald-500" : "text-rose-500"
                                            }`}
                                    >
                                        {totalPnlDisp >= 0 ? "+" : ""}
                                        {currencyPrefix}
                                        {totalPnlDisp.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {totalPnlDisp >= 0 ? "+" : ""}
                                        {totalPnlPercent.toFixed(2)}% All Time
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Best Performer</CardTitle>
                                    <BarChart className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {bestPerformer ? (
                                        <>
                                            <div className="text-2xl font-bold">{bestPerformer.sym}</div>
                                            <p className={`text-xs font-semibold mt-1 ${bestPerformer.pnlPercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                                {bestPerformer.pnlPercent >= 0 ? "+" : ""}
                                                {bestPerformer.pnlPercent.toFixed(2)}%
                                            </p>
                                        </>
                                    ) : (
                                        <div className="text-2xl font-bold text-muted-foreground">--</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <Card className="xl:col-span-2 flex flex-col min-h-[400px]">
                                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Holdings</CardTitle>
                                        <CardDescription>
                                            Live prices via Binance API.
                                        </CardDescription>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={refreshPrices}
                                            disabled={isRefreshing || activeSymbols.length === 0}
                                        >
                                            <RefreshCw
                                                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""
                                                    }`}
                                            />
                                        </Button>

                                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="gap-2">
                                                    <Plus className="h-4 w-4" /> Add Tx
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Add Transaction</DialogTitle>
                                                    <DialogDescription>
                                                        Enter your crypto transaction details manually or auto-fill from an on-chain transaction.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                                                    {/* Action Segmented Control - spans full width on mobile, 1 col on larger */}
                                                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                                        <Label className="text-xs text-muted-foreground">Action</Label>
                                                        <SegmentedControl
                                                            value={newAction}
                                                            onValueChange={(v) => setNewAction(v as PortfolioAction)}
                                                            options={ACTION_OPTIONS}
                                                            className="w-full justify-center"
                                                        />
                                                    </div>

                                                    {/* Asset Selector */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="symbol">Asset</Label>
                                                        <Select value={newSymbol} onValueChange={setNewSymbol}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select asset" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {SUPPORTED_ASSETS.map((asset) => (
                                                                    <SelectItem key={asset} value={asset}>
                                                                        {asset}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Quantity */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="quantity">Quantity</Label>
                                                        <Input
                                                            id="quantity"
                                                            type="number"
                                                            step="any"
                                                            value={newQuantity}
                                                            onChange={(e) => setNewQuantity(e.target.value)}
                                                            placeholder="0.05"
                                                        />
                                                    </div>

                                                    {/* Price per Coin */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="price">Price per Coin</Label>
                                                        <Input
                                                            id="price"
                                                            type="number"
                                                            step="any"
                                                            value={newPrice}
                                                            onChange={(e) => setNewPrice(e.target.value)}
                                                            placeholder="50000"
                                                        />
                                                    </div>

                                                    {/* Currency */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="currency">Currency</Label>
                                                        <Select value={newCurrency} onValueChange={(v: "USD" | "EUR") => setNewCurrency(v)}>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Date & Time */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="date">Date & Time</Label>
                                                        <Input
                                                            id="date"
                                                            type="datetime-local"
                                                            value={formatDateTimeLocal(newDate)}
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    setNewDate(new Date(e.target.value).getTime());
                                                                } else {
                                                                    setNewDate(null);
                                                                }
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Fee (optional) */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor="fee">Fee (optional)</Label>
                                                        <Input
                                                            id="fee"
                                                            type="number"
                                                            step="any"
                                                            value={newFee}
                                                            onChange={(e) => setNewFee(e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>

                                                    {/* Computed Total - spans full width */}
                                                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                                        <div className="rounded-lg bg-muted/50 p-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-muted-foreground">Total</span>
                                                                <span className="text-lg font-semibold">
                                                                    {newCurrency === "EUR" ? "€" : "$"}
                                                                    {computedTotal.toLocaleString(undefined, {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2,
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Notes (optional) - spans full width */}
                                                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                                        <Label htmlFor="notes">Notes (optional)</Label>
                                                        <Textarea
                                                            id="notes"
                                                            value={newNotes}
                                                            onChange={(e) => setNewNotes(e.target.value)}
                                                            placeholder="Add notes..."
                                                            className="resize-none h-16 break-words"
                                                        />
                                                    </div>

                                                    {/* Import Section - spans full width */}
                                                    <div className="space-y-3 md:col-span-2 lg:col-span-3">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full justify-between"
                                                            onClick={() => setShowImportSection(!showImportSection)}
                                                        >
                                                            <span className="text-xs">Auto-fill from transaction</span>
                                                            {showImportSection ? (
                                                                <ChevronUp className="h-3 w-3" />
                                                            ) : (
                                                                <ChevronDown className="h-3 w-3" />
                                                            )}
                                                        </Button>

                                                        {showImportSection && (
                                                            <div className="space-y-3 rounded-lg border p-3">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="chain">Chain</Label>
                                                                    <Select
                                                                        value={newChain}
                                                                        onValueChange={(v) => setNewChain(v as SupportedImportChain)}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select chain" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {SUPPORTED_CHAINS.map((chain) => (
                                                                                <SelectItem key={chain.value} value={chain.value}>
                                                                                    {chain.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label htmlFor="txhash">TX Hash / Digest</Label>
                                                                    <Input
                                                                        id="txhash"
                                                                        value={newTxHash}
                                                                        onChange={(e) => setNewTxHash(e.target.value)}
                                                                        placeholder="Enter transaction hash"
                                                                        className="font-mono text-xs"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label htmlFor="recipient" className="text-xs text-muted-foreground">
                                                                        Recipient Address <span className="font-normal">(optional, for BTC)</span>
                                                                    </Label>
                                                                    <Input
                                                                        id="recipient"
                                                                        value={newRecipientAddress}
                                                                        onChange={(e) => setNewRecipientAddress(e.target.value)}
                                                                        placeholder="bc1... (optional)"
                                                                        className="font-mono text-xs"
                                                                    />
                                                                </div>

                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="w-full"
                                                                    onClick={handleAutoFill}
                                                                    disabled={importStatus === "loading" || !newChain || !newTxHash}
                                                                >
                                                                    {importStatus === "loading" ? (
                                                                        <>
                                                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                                            Fetching...
                                                                        </>
                                                                    ) : (
                                                                        "Auto-fill"
                                                                    )}
                                                                </Button>

                                                                {/* Import Status */}
                                                                {importStatus !== "idle" && (
                                                                    <div className={`rounded-md p-2 text-xs ${
                                                                        importStatus === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                                                        importStatus === "error" ? "bg-destructive/10 text-destructive" :
                                                                        "bg-muted"
                                                                    }`}>
                                                                        <div className="flex items-start gap-2">
                                                                            {importStatus === "success" && <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />}
                                                                            {importStatus === "error" && <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />}
                                                                            {importStatus === "loading" && <Loader2 className="h-3 w-3 mt-0.5 shrink-0 animate-spin" />}
                                                                            <div className="flex-1">
                                                                                {importStatus === "success" && "Fields updated from transaction data."}
                                                                                {importStatus === "error" && importError}
                                                                                {importStatus === "loading" && "Fetching transaction..."}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Warnings */}
                                                                {importWarnings.length > 0 && (
                                                                    <div className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-600 dark:text-amber-400">
                                                                        <div className="flex items-start gap-2">
                                                                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                                                            <div className="flex-1 space-y-1">
                                                                                {importWarnings.map((warning, i) => (
                                                                                    <p key={i}>{warning}</p>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Save Button */}
                                                    <Button
                                                        onClick={handleAddTransaction}
                                                        className="w-full"
                                                        disabled={!newSymbol || !newQuantity || !newPrice}
                                                    >
                                                        Save Transaction
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardHeader>

                                <CardContent className="flex-1 overflow-x-auto">
                                    {tableData.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center p-8 border border-dashed rounded-lg bg-muted/20">
                                            <Wallet className="h-10 w-10 text-muted-foreground/50 mb-3" />
                                            <p className="text-muted-foreground font-medium">
                                                No assets yet.
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                                Add your first buy transaction to start tracking your
                                                portfolio&apos;s performance securely.
                                            </p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Asset</TableHead>
                                                    <TableHead className="text-right">Price</TableHead>
                                                    <TableHead className="text-right">Holdings</TableHead>
                                                    <TableHead className="text-right">
                                                        Total Value
                                                    </TableHead>
                                                    <TableHead className="text-right">PnL</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tableData.map((row) => (
                                                    <TableRow key={row.sym}>
                                                        <TableCell className="font-semibold">
                                                            {row.sym}
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums">
                                                            {row.currentPriceDisp > 0
                                                                ? `${currencyPrefix}${row.currentPriceDisp.toLocaleString(
                                                                    undefined,
                                                                    {
                                                                        maximumFractionDigits:
                                                                            row.currentPriceDisp < 1
                                                                                ? 4
                                                                                : 2,
                                                                    }
                                                                )}`
                                                                : "..."}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="tabular-nums font-medium">
                                                                {row.quantity.toLocaleString(undefined, {
                                                                    maximumFractionDigits: 6,
                                                                })}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground tabular-nums opacity-70">
                                                                Avg: {currencyPrefix}
                                                                {row.avgBuyDisp.toLocaleString(
                                                                    undefined,
                                                                    {
                                                                        maximumFractionDigits:
                                                                            row.avgBuyDisp < 1
                                                                                ? 4
                                                                                : 2,
                                                                    }
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium tabular-nums">
                                                            {currencyPrefix}
                                                            {row.valueDisp.toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            })}
                                                        </TableCell>
                                                        <TableCell
                                                            className={`text-right font-medium tabular-nums ${row.pnlDisp >= 0
                                                                ? "text-emerald-500"
                                                                : "text-rose-500"
                                                                }`}
                                                        >
                                                            {row.pnlDisp >= 0 ? "+" : ""}
                                                            {currencyPrefix}
                                                            {row.pnlDisp.toLocaleString(undefined, {
                                                                maximumFractionDigits: 2,
                                                            })}
                                                            <span className="block text-xs mt-0.5">
                                                                {row.pnlDisp >= 0 ? "+" : ""}
                                                                {row.pnlPercent.toFixed(2)}%
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>Allocation ({displayCurrency})</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                                    {chartData.length > 0 ? (
                                        <div className="w-full h-72">
                                            <ResponsiveContainer width="100%" height={288}>
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ percent }: { percent?: number }) => `${(percent ?? 0).toFixed(0)}%`}
                                                        labelLine={false}
                                                    >
                                                        {chartData.map((_, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={
                                                                    CHART_COLORS[
                                                                    index % CHART_COLORS.length
                                                                    ]
                                                                }
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip
                                                        formatter={(value: any, _name: any, entry: any) => {
                                                            const percent = entry?.payload?.percent;
                                                            const displayValue = currencyPrefix + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
                                                            const displayPercent = percent !== undefined && !isNaN(percent) ? ` (${percent.toFixed(1)}%)` : "";
                                                            return `${displayValue}${displayPercent}`;
                                                        }}
                                                        contentStyle={{
                                                            backgroundColor: "#1a1a1a",
                                                            borderColor: "#333",
                                                            borderRadius: "8px",
                                                            color: "#fff",
                                                        }}
                                                    />
                                                    <Legend
                                                        verticalAlign="bottom"
                                                        height={36}
                                                        formatter={(value: any) => (
                                                            <span
                                                                style={{
                                                                    color: "hsl(var(--foreground))",
                                                                }}
                                                            >
                                                                {value}
                                                            </span>
                                                        )}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground flex items-center justify-center p-8">
                                            No data to display.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="flex flex-col xl:col-span-3">
                                <CardHeader>
                                    <CardTitle>Portfolio History</CardTitle>
                                    <CardDescription>Cumulative value over time.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                                    {lineChartData.length > 1 ? (
                                        <div className="w-full h-72">
                                            <ResponsiveContainer width="100%" height={288}>
                                                <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={{ fontSize: 11, fill: "#888888" }}
                                                        stroke="#888888"
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 11, fill: "#888888" }}
                                                        stroke="#888888"
                                                        tickFormatter={(val) => `${currencyPrefix}${(val / 1000).toFixed(0)}k`}
                                                    />
                                                    <RechartsTooltip
                                                        formatter={(value: any) => [
                                                            `${currencyPrefix}${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                                                            "Portfolio Value",
                                                        ]}
                                                        contentStyle={{
                                                            backgroundColor: "#1a1a1a",
                                                            borderColor: "#333",
                                                            borderRadius: "8px",
                                                            color: "#fff",
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="totalValue"
                                                        stroke="#3b82f6"
                                                        strokeWidth={2}
                                                        dot={false}
                                                        activeDot={{ r: 4 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground flex items-center justify-center p-8">
                                            {lineChartData.length === 1
                                                ? "Need at least 2 transactions to show history."
                                                : "No data to display."}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Transaction Ledger</CardTitle>
                                        <CardDescription>Your complete transaction history.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Filter & Sort Controls */}
                                <div className="flex flex-wrap gap-2 mb-4 items-center">
                                    {/* Search */}
                                    <div className="relative min-w-[160px] flex-1 max-w-xs">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            value={ledgerSearch}
                                            onChange={(e) => setLedgerSearch(e.target.value)}
                                            placeholder="Search symbol, notes..."
                                            className="pl-8 h-8 text-xs"
                                        />
                                    </div>

                                    {/* Action Filter */}
                                    <Select
                                        value={ledgerActionFilter}
                                        onValueChange={(v) => setLedgerActionFilter(v as PortfolioAction | "all")}
                                    >
                                        <SelectTrigger className="w-[110px] h-8 text-xs">
                                            <SelectValue placeholder="Action" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="buy">Buy</SelectItem>
                                            <SelectItem value="sell">Sell</SelectItem>
                                            <SelectItem value="transfer">Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Symbol Filter */}
                                    <Select value={ledgerSymbolFilter} onValueChange={setLedgerSymbolFilter}>
                                        <SelectTrigger className="w-[100px] h-8 text-xs">
                                            <SelectValue placeholder="Asset" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Assets</SelectItem>
                                            {ledgerSymbols.map((sym) => (
                                                <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => {
                                                        if (ledgerSortField === "date") setLedgerSortDirection(d => d === "asc" ? "desc" : "asc");
                                                        else { setLedgerSortField("date"); setLedgerSortDirection("desc"); }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1">Date {ledgerSortField === "date" && (ledgerSortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => {
                                                        if (ledgerSortField === "action") setLedgerSortDirection(d => d === "asc" ? "desc" : "asc");
                                                        else { setLedgerSortField("action"); setLedgerSortDirection("desc"); }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1">Type {ledgerSortField === "action" && (ledgerSortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => {
                                                        if (ledgerSortField === "symbol") setLedgerSortDirection(d => d === "asc" ? "desc" : "asc");
                                                        else { setLedgerSortField("symbol"); setLedgerSortDirection("desc"); }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1">Asset {ledgerSortField === "symbol" && (ledgerSortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                                                    onClick={() => {
                                                        if (ledgerSortField === "quantity") setLedgerSortDirection(d => d === "asc" ? "desc" : "asc");
                                                        else { setLedgerSortField("quantity"); setLedgerSortDirection("desc"); }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-end gap-1">Amount {ledgerSortField === "quantity" && (ledgerSortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                                                    onClick={() => {
                                                        if (ledgerSortField === "pricePerCoin") setLedgerSortDirection(d => d === "asc" ? "desc" : "asc");
                                                        else { setLedgerSortField("pricePerCoin"); setLedgerSortDirection("desc"); }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-end gap-1">Price {ledgerSortField === "pricePerCoin" && (ledgerSortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                                                </TableHead>
                                                <TableHead 
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors text-right"
                                                    onClick={() => {
                                                        if (ledgerSortField === "total") setLedgerSortDirection(d => d === "asc" ? "desc" : "asc");
                                                        else { setLedgerSortField("total"); setLedgerSortDirection("desc"); }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-end gap-1">Total {ledgerSortField === "total" && (ledgerSortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</div>
                                                </TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLedgerTxs.map((tx) => {
                                                const txCurPrefix =
                                                    tx.currency === "EUR" ? "€" : "$";

                                                    return (
                                                        <TableRow key={tx.id}>
                                                            <TableCell className="text-sm">
                                                                {new Date(tx.date).toLocaleDateString()}{" "}
                                                                {new Date(tx.date).toLocaleTimeString(
                                                                    [],
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    }
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <span
                                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                                        tx.action === "buy"
                                                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                                            : tx.action === "sell"
                                                                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                                                            : "bg-secondary text-secondary-foreground"
                                                                    }`}
                                                                >
                                                                    {tx.action.toUpperCase()}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="font-semibold">
                                                                {tx.symbol}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {tx.quantity}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {txCurPrefix}
                                                                {tx.pricePerCoin.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums font-medium">
                                                                {txCurPrefix}
                                                                {(
                                                                    tx.quantity * tx.pricePerCoin
                                                                ).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => openEditDialog(tx)}
                                                                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setDeleteConfirmId(tx.id);
                                                                            setDeleteConfirmSymbol(tx.symbol);
                                                                        }}
                                                                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                            {Object.keys(transactions).length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={7}
                                                        className="text-center text-muted-foreground py-6"
                                                    >
                                                        No transactions found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete Transaction</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete the {deleteConfirmSymbol} transaction? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (deleteConfirmId) {
                                        removeTransaction(deleteConfirmId);
                                        setDeleteConfirmId(null);
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Transaction Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Transaction</DialogTitle>
                            <DialogDescription>
                                Update your transaction details.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                            {/* Action Segmented Control */}
                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                <Label className="text-xs text-muted-foreground">Action</Label>
                                <SegmentedControl
                                    value={editAction}
                                    onValueChange={(v) => setEditAction(v as PortfolioAction)}
                                    options={ACTION_OPTIONS}
                                    className="w-full justify-center"
                                />
                            </div>

                            {/* Asset Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-symbol">Asset</Label>
                                <Select value={editSymbol} onValueChange={setEditSymbol}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select asset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SUPPORTED_ASSETS.map((asset) => (
                                            <SelectItem key={asset} value={asset}>
                                                {asset}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-quantity">Quantity</Label>
                                <Input
                                    id="edit-quantity"
                                    type="number"
                                    step="any"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                />
                            </div>

                            {/* Price per Coin */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-price">Price per Coin</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    step="any"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                />
                            </div>

                            {/* Currency */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-currency">Currency</Label>
                                <Select value={editCurrency} onValueChange={(v: "USD" | "EUR") => setEditCurrency(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date & Time */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-date">Date & Time</Label>
                                <Input
                                    id="edit-date"
                                    type="datetime-local"
                                    value={formatDateTimeLocal(editDate)}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setEditDate(new Date(e.target.value).getTime());
                                        } else {
                                            setEditDate(null);
                                        }
                                    }}
                                />
                            </div>

                            {/* Fee (optional) */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-fee">Fee (optional)</Label>
                                <Input
                                    id="edit-fee"
                                    type="number"
                                    step="any"
                                    value={editFee}
                                    onChange={(e) => setEditFee(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Notes (optional) */}
                            <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                <Label htmlFor="edit-notes">Notes (optional)</Label>
                                <Textarea
                                    id="edit-notes"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="resize-none h-16 break-words"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit}>
                                Save Changes
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}