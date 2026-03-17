import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Plus,
    Trash2,
    RefreshCw,
    BarChart,
    DollarSign,
    Euro,
    Wallet,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { useFinanceStore } from "@/stores/useFinanceStore";
import { StorageManager } from "@/lib/storage";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"];

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
    const [newSymbol, setNewSymbol] = useState("BTC");
    const [newType, setNewType] = useState<"buy" | "sell">("buy");
    const [newAmount, setNewAmount] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newCurrency, setNewCurrency] = useState<"USD" | "EUR">(displayCurrency);
    const [newDate, setNewDate] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Etherscan Import
    const [importUrl, setImportUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);

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

    // Easiest is to normalize everything based on the current EUR/USD rate for simplicity when calculating aggregated metrics.
    const holdingsUsd = useMemo(() => {
        const result: Record<string, { amount: number; investedUsd: number }> = {};

        Object.values(transactions).forEach((tx) => {
            const txCurrency = tx.currency || "USD";
            // Normalizing transaction price to USD using current exchange rate
            const priceInUsd = txCurrency === "EUR" ? tx.pricePerCoin * eurToUsdRate : tx.pricePerCoin;

            if (!result[tx.symbol]) {
                result[tx.symbol] = { amount: 0, investedUsd: 0 };
            }

            if (tx.type === "buy") {
                result[tx.symbol].amount += tx.amount;
                result[tx.symbol].investedUsd += tx.amount * priceInUsd;
            } else {
                result[tx.symbol].amount -= tx.amount;
                // reduce invested proportionally
                const avgBuyPrice =
                    result[tx.symbol].amount > 0
                        ? result[tx.symbol].investedUsd / (result[tx.symbol].amount + tx.amount)
                        : 0;
                result[tx.symbol].investedUsd -= tx.amount * avgBuyPrice;
            }
        });

        // Remove zero or negative dust
        Object.keys(result).forEach((sym) => {
            if (result[sym].amount <= 0.00000001) {
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
        if (!newSymbol || !newAmount || !newPrice) return;

        await addTransaction({
            assetId: newSymbol.toLowerCase(),
            symbol: newSymbol.toUpperCase(),
            type: newType,
            amount: parseFloat(newAmount),
            pricePerCoin: parseFloat(newPrice),
            currency: newCurrency,
            date: newDate || Date.now(),
        });

        setNewAmount("");
        setNewPrice("");
        setNewDate(null);
        setImportUrl("");
        setIsDialogOpen(false);
    };

    const handleEtherscanImport = async () => {
        if (!importUrl) return;

        const match = importUrl.match(/0x[a-fA-F0-9]{64}/);
        if (!match) {
            alert("Could not find a valid transaction hash in the URL.");
            return;
        }

        const txHash = match[0];
        const apiKey = await StorageManager.get("etherscan_api_key", "");

        if (!apiKey) {
            alert("No Etherscan API Key found. Please add it first in Settings.");
            return;
        }

        setIsImporting(true);

        try {
            // Get TX value using Etherscan API V2
            // V2 requires chainid=1 for Ethereum mainnet
            const res = await fetch(
                `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`
            );
            const data = await res.json();

            if (data.result && data.result.value) {
                const valueEth = parseInt(data.result.value, 16) / 1e18;
                if (valueEth > 0) {
                    setNewSymbol("ETH");
                    setNewAmount(valueEth.toString());
                    setNewType("buy"); // Assumption, can be changed manually
                } else {
                    alert(
                        "This transaction has 0 ETH value (likely a token transfer/swap). The Date has been auto-filled, but you must enter your token Symbol and Amount manually."
                    );
                }
            } else {
                alert(
                    "Failed to find details for this transaction: " +
                    (data.result || data.message || "Unknown error")
                );
            }

            // Get Block Timestamp
            if (data.result && data.result.blockTimestamp) {
                // Etherscan V2 sometimes includes blockTimestamp in the transaction proxy response
                setNewDate(parseInt(data.result.blockTimestamp, 16) * 1000);
            } else if (data.result && data.result.blockNumber) {
                // Fallback
                const blockHex = data.result.blockNumber;
                const blockRes = await fetch(
                    `https://api.etherscan.io/v2/api?chainid=1&module=block&action=getblockreward&blockno=${parseInt(
                        blockHex,
                        16
                    )}&apikey=${apiKey}`
                );
                const blockData = await blockRes.json();
                if (blockData.result && blockData.result.timeStamp) {
                    setNewDate(parseInt(blockData.result.timeStamp, 10) * 1000);
                }
            }

            // Historical price is intentionally left manual
        } catch (e) {
            alert("Error communicating with Etherscan API.");
            console.error(e);
        } finally {
            setIsImporting(false);
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
        const valueUsd = item.amount * currentPriceUsd;
        const avgBuyUsd = item.amount > 0 ? item.investedUsd / item.amount : 0;
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
            amount: item.amount,
            investedDisp,
            currentPriceDisp,
            valueDisp,
            avgBuyDisp,
            pnlDisp,
            pnlPercent,
        };
    });

    tableData.sort((a, b) => b.valueDisp - a.valueDisp);

    const totalPnlDisp = totalValueDisp - totalInvestedDisp;
    const totalPnlPercent = totalInvestedDisp > 0 ? (totalPnlDisp / totalInvestedDisp) * 100 : 0;

    const chartData = tableData
        .filter((d) => d.valueDisp > 0)
        .map((d) => ({ name: d.sym, value: d.valueDisp }));

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
                                    {tableData.length > 0 ? (
                                        <>
                                            <div className="text-2xl font-bold">{tableData[0]?.sym}</div>
                                            <p className="text-xs font-semibold mt-1 text-emerald-500">
                                                +{tableData[0]?.pnlPercent.toFixed(2)}%
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
                                            Live prices via Binance API. 100% local calculation.
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
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Add Transaction</DialogTitle>
                                                    <DialogDescription>
                                                        Enter the details of your crypto transaction
                                                        manually or auto-fill via Etherscan URL.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="flex gap-2 mb-2 items-center">
                                                    <Input
                                                        placeholder="Etherscan TX URL (e.g. https://etherscan.io/tx/...)"
                                                        value={importUrl}
                                                        onChange={(e) => setImportUrl(e.target.value)}
                                                        className="flex-1 text-xs h-8"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={handleEtherscanImport}
                                                        disabled={isImporting || !importUrl}
                                                        className="h-8"
                                                    >
                                                        {isImporting ? (
                                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            "Auto-fill"
                                                        )}
                                                    </Button>
                                                </div>

                                                <Separator />

                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="type" className="text-right">
                                                            Type
                                                        </Label>
                                                        <Select
                                                            value={newType}
                                                            onValueChange={(v: "buy" | "sell") =>
                                                                setNewType(v)
                                                            }
                                                        >
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Select Type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="buy">Buy</SelectItem>
                                                                <SelectItem value="sell">Sell</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="symbol" className="text-right">
                                                            Symbol
                                                        </Label>
                                                        <Input
                                                            id="symbol"
                                                            value={newSymbol}
                                                            onChange={(e) =>
                                                                setNewSymbol(e.target.value)
                                                            }
                                                            className="col-span-3 uppercase"
                                                            placeholder="BTC"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="amount" className="text-right">
                                                            Amount
                                                        </Label>
                                                        <Input
                                                            id="amount"
                                                            type="number"
                                                            step="any"
                                                            value={newAmount}
                                                            onChange={(e) =>
                                                                setNewAmount(e.target.value)
                                                            }
                                                            className="col-span-3"
                                                            placeholder="0.05"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label
                                                            htmlFor="transaction_currency"
                                                            className="text-right"
                                                        >
                                                            Currency
                                                        </Label>
                                                        <Select
                                                            value={newCurrency}
                                                            onValueChange={(v: "USD" | "EUR") =>
                                                                setNewCurrency(v)
                                                            }
                                                        >
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Select Currency" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="date" className="text-right">
                                                            Date & Time
                                                        </Label>
                                                        <Input
                                                            id="date"
                                                            type="datetime-local"
                                                            value={formatDateTimeLocal(newDate)}
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    setNewDate(
                                                                        new Date(
                                                                            e.target.value
                                                                        ).getTime()
                                                                    );
                                                                } else {
                                                                    setNewDate(null);
                                                                }
                                                            }}
                                                            className="col-span-3"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="price" className="text-right">
                                                            Price
                                                        </Label>
                                                        <Input
                                                            id="price"
                                                            type="number"
                                                            step="any"
                                                            value={newPrice}
                                                            onChange={(e) =>
                                                                setNewPrice(e.target.value)
                                                            }
                                                            className="col-span-3"
                                                            placeholder="50000"
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={handleAddTransaction}
                                                    className="w-full"
                                                >
                                                    Save Transaction
                                                </Button>
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
                                                                {row.amount.toLocaleString(undefined, {
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
                                        <div className="w-full h-full min-h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={chartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={70}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
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
                                                        formatter={(value: any) =>
                                                            `${currencyPrefix}${Number(
                                                                value
                                                            ).toLocaleString(undefined, {
                                                                maximumFractionDigits: 2,
                                                            })}`
                                                        }
                                                        contentStyle={{
                                                            backgroundColor: "hsl(var(--card))",
                                                            borderColor: "hsl(var(--border))",
                                                            borderRadius: "8px",
                                                            color: "hsl(var(--foreground))",
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
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction Ledger</CardTitle>
                                <CardDescription>Your complete history.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Asset</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.values(transactions)
                                                .sort((a, b) => b.date - a.date)
                                                .map((tx) => {
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
                                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${tx.type === "buy"
                                                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                                                        }`}
                                                                >
                                                                    {tx.type.toUpperCase()}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="font-semibold">
                                                                {tx.symbol}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {tx.amount}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {txCurPrefix}
                                                                {tx.pricePerCoin.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right tabular-nums font-medium">
                                                                {txCurPrefix}
                                                                {(
                                                                    tx.amount * tx.pricePerCoin
                                                                ).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        removeTransaction(tx.id)
                                                                    }
                                                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
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
            </div>
        </TooltipProvider>
    );
}