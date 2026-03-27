/**
 * Monte Carlo Outcome Simulator
 *
 * A polished, Monte Carlo simulator for traders.
 * Models thousands of possible equity-curve outcomes based on
 * configurable R-based trading assumptions.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  Save,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  Dice5,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  type MonteCarloConfig,
  type SimulationRun,
  type AggregateStats,
  type HistogramBin,
  type Insight,
  DEFAULT_CONFIG,
  validateConfig,
  runMonteCarloSimulation,
  computeAggregateStats,
  buildEndingBalanceHistogram,
  buildDrawdownHistogram,
  sampleEquityCurves,
  generateInsights,
  formatCurrency,
  formatPercent,
  formatR,
} from "@/lib/finance/monte-carlo";
import { BUILT_IN_PRESETS, type MonteCarloPreset } from "@/lib/finance/monte-carlo-presets";
import { useMonteCarloStore, type CustomPreset } from "@/stores/useMonteCarloStore";

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function InsightBadge({ insight }: { insight: Insight }) {
  const config = {
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };
  const icons = {
    info: <Info className="h-3.5 w-3.5" />,
    warning: <AlertTriangle className="h-3.5 w-3.5" />,
    danger: <XCircle className="h-3.5 w-3.5" />,
    success: <CheckCircle2 className="h-3.5 w-3.5" />,
  };
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${config[insight.level]}`}>
      <span className="shrink-0 mt-0.5">{icons[insight.level]}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{insight.title}</p>
        <p className="text-xs mt-0.5 opacity-80">{insight.body}</p>
      </div>
    </div>
  );
}

function MetricsCard({
  label,
  value,
  subValue,
  trend,
  tooltip,
}: {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  tooltip?: string;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
      ? "text-rose-500"
      : "text-muted-foreground";

  const card = (
    <Card className="flex-1 min-w-0">
      <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground truncate">
          {label}
        </CardTitle>
        {TrendIcon && <TrendIcon className={`h-3.5 w-3.5 shrink-0 ${trendColor}`} />}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xl font-bold tabular-nums truncate">{value}</p>
        {subValue && (
          <p className={`text-xs mt-0.5 tabular-nums ${trendColor}`}>{subValue}</p>
        )}
      </CardContent>
    </Card>
  );

  if (!tooltip) return card;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function EquityCurveChart({
  curves,
  startingBalance,
}: {
  curves: { curve: { tradeIndex: number; equity: number }[]; label: string; color: string }[];
  startingBalance: number;
}) {
  const allData = useMemo(() => {
    if (curves.length === 0) return [];
    const maxLen = Math.max(...curves.map((c) => c.curve.length));
    const result: Record<string, number | string>[] = [];

    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, number | string> = { tradeIndex: i };
      for (const curve of curves) {
        if (i < curve.curve.length) {
          point[curve.label] = curve.curve[i]!.equity;
        }
      }
      result.push(point);
    }
    return result;
  }, [curves]);

  if (allData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={allData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="tradeIndex"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          stroke="hsl(var(--border))"
          tickFormatter={(v) => `T${v}`}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          stroke="hsl(var(--border))"
          tickFormatter={(v) => formatCurrency(v)}
          width={70}
        />
        <RechartsTooltip
          formatter={(value: any) => [formatCurrency(Number(value)), ""]}
          labelFormatter={(label) => `Trade ${label}`}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
            fontSize: "12px",
          }}
        />
        <ReferenceLine
          y={startingBalance}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          label={{ value: "Start", position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
        />
        {curves.map((curve) => (
          <Line
            key={curve.label}
            type="monotone"
            dataKey={curve.label}
            stroke={curve.color}
            strokeWidth={1.2}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function HistogramChart({
  bins,
  color = "#6366f1",
}: {
  bins: HistogramBin[];
  color?: string;
}) {
  if (bins.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data to display.
      </div>
    );
  }
  const display = bins.slice(0, 25); // cap for readability

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={display} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          stroke="hsl(var(--border))"
          interval={Math.floor(display.length / 6)}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          stroke="hsl(var(--border))"
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          width={40}
        />
        <RechartsTooltip
          formatter={(_value: any, _name: any, entry: any) => [
            `${(entry?.payload as HistogramBin)?.count ?? 0} runs (${((entry?.payload as HistogramBin)?.percent ?? 0).toFixed(1)}%)`,
            "Count",
          ]}
          labelFormatter={(_: any, entries) => {
            const payload = entries?.[0]?.payload as HistogramBin | undefined;
            return payload?.label ?? "";
          }}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
            fontSize: "12px",
          }}
        />
        <Bar dataKey="percent" fill={color} radius={[2, 2, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DrawdownThresholdCard({
  threshold,
  probability,
}: {
  threshold: number;
  probability: number;
}) {
  const color =
    probability > 50
      ? "bg-red-500"
      : probability > 25
      ? "bg-amber-500"
      : probability > 10
      ? "bg-yellow-500"
      : "bg-emerald-500";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">&gt;{threshold}% DD</span>
        <span className="text-sm font-semibold tabular-nums">{probability.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(100, probability)}%` }}
        />
      </div>
    </div>
  );
}

function ConfigRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <div className="min-w-[160px] shrink-0">
        <Label className="text-xs font-medium">{label}</Label>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NumberField({
  value,
  onChange,
  min,
  max,
  step = "any",
  placeholder,
  disabled,
  suffix,
  className,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
  disabled?: boolean;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : parseFloat(v));
        }}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className={`pr-8 ${className ?? ""}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  action,
  onToggle,
  collapsed,
}: {
  title: string;
  action?: React.ReactNode;
  onToggle?: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {onToggle && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
      {action}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function MonteCarloSimulator() {
  const { customPresets, loadPresets, saveCustomPreset, renameCustomPreset, deleteCustomPreset, saveLastConfig } =
    useMonteCarloStore();

  const [config, setConfig] = useState<MonteCarloConfig>({ ...DEFAULT_CONFIG });
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [stats, setStats] = useState<AggregateStats | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [activeTab, setActiveTab] = useState("curves");

  // Preset management
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamePresetId, setRenamePresetId] = useState<string>("");
  const [renamePresetName, setRenamePresetName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePresetId, setDeletePresetId] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);

  const isDistributed = config.outcomeModel === "distributed";

  // Load persisted state on mount
  useEffect(() => {
    loadPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore last config after load
  useEffect(() => {
    if (!useMonteCarloStore.getState().isLoading) {
      const stored = useMonteCarloStore.getState().lastConfig;
      setConfig(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMonteCarloStore.getState().isLoading]);

  const allPresets = useMemo(() => {
    const builtIn: (MonteCarloPreset & { isBuiltIn: true })[] = BUILT_IN_PRESETS.map((p) => ({
      ...p,
      isBuiltIn: true,
    }));
    const custom: (CustomPreset & { isBuiltIn: false })[] = Object.values(customPresets).map((p) => ({
      ...p,
      isBuiltIn: false,
    }));
    return [...builtIn, ...custom];
  }, [customPresets]);

  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = allPresets.find((p) => p.id === presetId);
    if (preset) {
      setConfig({ ...preset.config });
    }
  }, [allPresets]);

  const handleRunSimulation = useCallback(async () => {
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) return;

    setIsRunning(true);
    setHasRun(false);

    // Run in a micro-task to allow UI to update first
    await new Promise<void>((resolve) => setTimeout(resolve, 10));

    try {
      const results = runMonteCarloSimulation(config);
      const aggStats = computeAggregateStats(results, config);
      setRuns(results);
      setStats(aggStats);
      setHasRun(true);
      setActiveTab("curves");
      await saveLastConfig(config);
    } finally {
      setIsRunning(false);
    }
  }, [config, saveLastConfig]);

  const handleSavePreset = async () => {
    if (!savePresetName.trim()) return;
    await saveCustomPreset(savePresetName.trim(), config);
    setSavePresetName("");
    setIsSaveDialogOpen(false);
  };

  const handleRenamePreset = async () => {
    if (!renamePresetName.trim() || !renamePresetId) return;
    await renameCustomPreset(renamePresetId, renamePresetName.trim());
    setIsRenameDialogOpen(false);
    setRenamePresetId("");
    setRenamePresetName("");
  };

  const handleDeletePreset = async () => {
    if (!deletePresetId) return;
    await deleteCustomPreset(deletePresetId);
    if (selectedPresetId === deletePresetId) setSelectedPresetId("");
    setIsDeleteDialogOpen(false);
    setDeletePresetId("");
  };

  const updateConfig = useCallback(<K extends keyof MonteCarloConfig>(
    key: K,
    value: MonteCarloConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSelectedPresetId(""); // clear preset selection when manually editing
  }, []);

  const handleUpdateNumber = (key: keyof MonteCarloConfig) => (v: number | undefined) => {
    updateConfig(key, v as never);
  };

  // Chart data
  const equityCurves = useMemo(
    () => (hasRun ? sampleEquityCurves(runs, 20) : []),
    [hasRun, runs]
  );

  const endingHistogram = useMemo(
    () => (hasRun ? buildEndingBalanceHistogram(runs, 20) : []),
    [hasRun, runs]
  );

  const drawdownHistogram = useMemo(
    () => (hasRun ? buildDrawdownHistogram(runs, 12) : []),
    [hasRun, runs]
  );

  const insights = useMemo<Insight[]>(
    () => (stats ? generateInsights(stats, config) : []),
    [stats, config]
  );

  const validationErrors = useMemo(() => validateConfig(config), [config]);

  const fieldError = (field: string) =>
    validationErrors.find((e) => e.field === field)?.message;

  // Break-even rate display helper
  const lossRate = isDistributed
    ? 100 - config.winRatePercent - config.breakEvenRatePercent
    : 100 - config.winRatePercent;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          <div>
            <h2 className="text-lg font-semibold">Monte Carlo Outcome Simulator</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Models thousands of possible equity paths based on your trading assumptions.
              Does not predict markets — it reveals the distribution of plausible outcomes
              if your edge assumptions hold.
            </p>
          </div>
          <Button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className="gap-2 shrink-0"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "Running..." : "Run Simulation"}
          </Button>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-1">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              Please fix configuration errors
            </div>
            {validationErrors.map((e) => (
              <p key={e.field} className="text-xs text-red-500/80 pl-6">
                • {e.message}
              </p>
            ))}
          </div>
        )}

        {/* Main layout: config left, results right */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ── Config Panel ── */}
          <div className="xl:col-span-2 space-y-4">
            {/* Presets */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Presets</CardTitle>
                  <div className="flex gap-1">
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Save current as preset">
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Save Preset</DialogTitle>
                          <DialogDescription>Give your preset a memorable name.</DialogDescription>
                        </DialogHeader>
                        <Input
                          value={savePresetName}
                          onChange={(e) => setSavePresetName(e.target.value)}
                          placeholder="e.g. My Aggressive Strategy"
                          className="mt-2"
                          onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
                        />
                        <DialogFooter className="mt-4">
                          <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleSavePreset} disabled={!savePresetName.trim()}>Save</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={selectedPresetId} onValueChange={handlePresetSelect}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select a preset or configure below" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILT_IN_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="truncate">{p.name}</span>
                      </SelectItem>
                    ))}
                    {Object.values(customPresets).length > 0 && (
                      <>
                        <Separator className="my-1" />
                        {Object.values(customPresets).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">(custom)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {selectedPresetId && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    {allPresets.find((p) => p.id === selectedPresetId)?.description}
                  </p>
                )}
                {selectedPresetId && customPresets[selectedPresetId] && (
                  <div className="flex gap-2 pl-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => {
                        setRenamePresetId(selectedPresetId);
                        setRenamePresetName(customPresets[selectedPresetId]?.name ?? "");
                        setIsRenameDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setDeletePresetId(selectedPresetId);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Core Assumptions */}
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader title="Core Assumptions" />
              </CardHeader>
              <CardContent className="space-y-3">
                <ConfigRow label="Starting Balance" description="Initial account size">
                  <NumberField
                    value={config.startingBalance}
                    onChange={handleUpdateNumber("startingBalance")}
                    min={1}
                    suffix="$"
                    placeholder="10000"
                  />
                </ConfigRow>
                <ConfigRow label="Risk per Trade" description="% of equity risked per trade">
                  <NumberField
                    value={config.riskPerTradePercent}
                    onChange={handleUpdateNumber("riskPerTradePercent")}
                    min={0.01}
                    max={100}
                    suffix="%"
                    placeholder="1"
                  />
                </ConfigRow>
                <ConfigRow label="Number of Trades">
                  <NumberField
                    value={config.tradeCount}
                    onChange={handleUpdateNumber("tradeCount")}
                    min={1}
                    step="1"
                    placeholder="100"
                  />
                </ConfigRow>
                <ConfigRow label="Simulations" description="More = slower but smoother">
                  <NumberField
                    value={config.simulationCount}
                    onChange={handleUpdateNumber("simulationCount")}
                    min={100}
                    max={50000}
                    step="1"
                    placeholder="5000"
                  />
                </ConfigRow>
                <Separator />
                <ConfigRow label="Win Rate">
                  <NumberField
                    value={config.winRatePercent}
                    onChange={handleUpdateNumber("winRatePercent")}
                    min={0}
                    max={100}
                    suffix="%"
                    placeholder="45"
                  />
                </ConfigRow>
                <ConfigRow label="Break-Even Rate" description="Trades that return exactly 0R">
                  <NumberField
                    value={config.breakEvenRatePercent}
                    onChange={handleUpdateNumber("breakEvenRatePercent")}
                    min={0}
                    max={100}
                    suffix="%"
                    placeholder="0"
                  />
                </ConfigRow>
                {lossRate >= 0 && (
                  <p className="text-[10px] text-muted-foreground pl-[168px]">
                    Implied loss rate: {lossRate.toFixed(1)}%
                  </p>
                )}
                <ConfigRow label="Avg Win (R)">
                  <NumberField
                    value={config.averageWinR}
                    onChange={handleUpdateNumber("averageWinR")}
                    min={0.01}
                    suffix="R"
                    placeholder="2"
                  />
                </ConfigRow>
                <ConfigRow label="Avg Loss (R)">
                  <NumberField
                    value={config.averageLossR}
                    onChange={handleUpdateNumber("averageLossR")}
                    min={0.01}
                    suffix="R"
                    placeholder="1"
                  />
                </ConfigRow>
                {fieldError("winRatePercent") && (
                  <p className="text-xs text-destructive pl-[168px]">{fieldError("winRatePercent")}</p>
                )}
              </CardContent>
            </Card>

            {/* Sizing & Mechanics */}
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader title="Position Sizing" />
              </CardHeader>
              <CardContent className="space-y-3">
                <ConfigRow label="Sizing Mode">
                  <Select
                    value={config.positionSizingMode}
                    onValueChange={(v) => updateConfig("positionSizingMode", v as MonteCarloConfig["positionSizingMode"])}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">
                        <div>
                          <p className="font-medium text-xs">Fixed</p>
                          <p className="text-muted-foreground text-[10px]">Risk % of starting balance each trade</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="compounding">
                        <div>
                          <p className="font-medium text-xs">Compounding</p>
                          <p className="text-muted-foreground text-[10px]">Risk % of current equity each trade</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigRow>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">Include Fees</Label>
                    <p className="text-[10px] text-muted-foreground">Subtract cost per trade</p>
                  </div>
                  <Switch
                    checked={config.includeFees}
                    onCheckedChange={(v) => updateConfig("includeFees", v)}
                  />
                </div>
                {config.includeFees && (
                  <ConfigRow label="Fee per Trade">
                    <NumberField
                      value={config.feePerTradePercent}
                      onChange={handleUpdateNumber("feePerTradePercent")}
                      min={0}
                      max={10}
                      suffix="%"
                      placeholder="0"
                    />
                  </ConfigRow>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">Include Slippage</Label>
                    <p className="text-[10px] text-muted-foreground">Symmetrical cost on every trade</p>
                  </div>
                  <Switch
                    checked={config.includeSlippage}
                    onCheckedChange={(v) => updateConfig("includeSlippage", v)}
                  />
                </div>
                {config.includeSlippage && (
                  <ConfigRow label="Slippage per Trade">
                    <NumberField
                      value={config.slippagePerTradePercent}
                      onChange={handleUpdateNumber("slippagePerTradePercent")}
                      min={0}
                      max={10}
                      suffix="%"
                      placeholder="0"
                    />
                  </ConfigRow>
                )}
              </CardContent>
            </Card>

            {/* Outcome Modeling */}
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Outcome Model"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowDistribution(!showDistribution)}
                    >
                      {showDistribution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showDistribution ? "Hide" : "Show"} ranges
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <ConfigRow label="Model Type">
                  <Select
                    value={config.outcomeModel}
                    onValueChange={(v) => updateConfig("outcomeModel", v as MonteCarloConfig["outcomeModel"])}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="binary">
                        <div>
                          <p className="font-medium text-xs">Binary</p>
                          <p className="text-muted-foreground text-[10px]">Fixed winR / lossR every time</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="distributed">
                        <div>
                          <p className="font-medium text-xs">Distributed</p>
                          <p className="text-muted-foreground text-[10px]">Sample R within configurable range</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </ConfigRow>

                {showDistribution && isDistributed && (
                  <div className="space-y-3 pl-2 border-l-2 border-muted rounded-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <ConfigRow label="Win R Min">
                        <NumberField
                          value={config.winRMin}
                          onChange={handleUpdateNumber("winRMin")}
                          min={0}
                          suffix="R"
                          placeholder={String(config.averageWinR)}
                        />
                      </ConfigRow>
                      <ConfigRow label="Win R Max">
                        <NumberField
                          value={config.winRMax}
                          onChange={handleUpdateNumber("winRMax")}
                          min={0}
                          suffix="R"
                          placeholder={String(config.averageWinR)}
                        />
                      </ConfigRow>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ConfigRow label="Loss R Min">
                        <NumberField
                          value={config.lossRMin}
                          onChange={handleUpdateNumber("lossRMin")}
                          min={0}
                          suffix="R"
                          placeholder={String(config.averageLossR)}
                        />
                      </ConfigRow>
                      <ConfigRow label="Loss R Max">
                        <NumberField
                          value={config.lossRMax}
                          onChange={handleUpdateNumber("lossRMax")}
                          min={0}
                          suffix="R"
                          placeholder={String(config.averageLossR)}
                        />
                      </ConfigRow>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Risk Controls */}
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Advanced Risk Controls"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                      {showAdvanced ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showAdvanced ? "Hide" : "Show"}
                    </Button>
                  }
                />
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">Stop at Zero</Label>
                      <p className="text-[10px] text-muted-foreground">Halt simulation if equity hits $0</p>
                    </div>
                    <Switch
                      checked={config.stopSimulationAtZero}
                      onCheckedChange={(v) => updateConfig("stopSimulationAtZero", v)}
                    />
                  </div>
                  <ConfigRow label="Max Drawdown Cutoff" description="Optional ruin trigger (e.g. 80%)">
                    <NumberField
                      value={config.maxDrawdownCutoffPercent}
                      onChange={handleUpdateNumber("maxDrawdownCutoffPercent")}
                      min={1}
                      max={99}
                      suffix="%"
                      placeholder="None"
                    />
                  </ConfigRow>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">Reduce Risk After DD</Label>
                      <p className="text-[10px] text-muted-foreground">Lower position size after drawdown trigger</p>
                    </div>
                    <Switch
                      checked={config.reduceRiskAfterDrawdown}
                      onCheckedChange={(v) => updateConfig("reduceRiskAfterDrawdown", v)}
                    />
                  </div>
                  {config.reduceRiskAfterDrawdown && (
                    <>
                      <ConfigRow label="DD Trigger %">
                        <NumberField
                          value={config.reducedRiskTriggerDrawdownPercent}
                          onChange={handleUpdateNumber("reducedRiskTriggerDrawdownPercent")}
                          min={1}
                          max={99}
                          suffix="%"
                          placeholder="20"
                        />
                      </ConfigRow>
                      <ConfigRow label="Reduced Risk %">
                        <NumberField
                          value={config.reducedRiskPerTradePercent}
                          onChange={handleUpdateNumber("reducedRiskPerTradePercent")}
                          min={0.01}
                          max={20}
                          suffix="%"
                          placeholder="0.5"
                        />
                      </ConfigRow>
                    </>
                  )}
                  <Separator />
                  <ConfigRow label="Random Seed" description="Leave blank for random each run">
                    <Input
                      value={config.randomSeed ?? ""}
                      onChange={(e) => updateConfig("randomSeed", e.target.value || undefined)}
                      placeholder="e.g. my-secret-seed"
                      className="text-xs h-8 font-mono"
                    />
                  </ConfigRow>
                </CardContent>
              )}
            </Card>
          </div>

          {/* ── Results Panel ── */}
          <div className="xl:col-span-3 space-y-4">
            {!hasRun ? (
              /* Empty state */
              <Card className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <Dice5 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-medium">No simulation results yet.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Configure your trading assumptions on the left and click{" "}
                  <strong>Run Simulation</strong> to model thousands of equity paths.
                </p>
                <div className="mt-6 space-y-2 text-left max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground">Quick start:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                    <li>Select a preset from the dropdown to load sensible defaults</li>
                    <li>Adjust win rate, avg win R, and avg loss R to match your strategy</li>
                    <li>Click Run to see the outcome distribution</li>
                  </ul>
                </div>
              </Card>
            ) : (
              <>
                {/* Key Metrics */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <MetricsCard
                      label="Median Ending"
                      value={formatCurrency(stats.percentile50)}
                      subValue={`Mean: ${formatCurrency(stats.mean)}`}
                      tooltip="Median (50th percentile) ending balance across all simulations"
                    />
                    <MetricsCard
                      label="Prob. of Profit"
                      value={`${stats.probabilityOfProfit.toFixed(0)}%`}
                      trend={stats.probabilityOfProfit > 50 ? "up" : stats.probabilityOfProfit > 35 ? "neutral" : "down"}
                      tooltip="Percentage of simulations that ended above starting balance"
                    />
                    <MetricsCard
                      label="Prob. of Ruin"
                      value={`${stats.probabilityOfRuin.toFixed(2)}%`}
                      trend={stats.probabilityOfRuin > 5 ? "down" : stats.probabilityOfRuin > 1 ? "neutral" : "up"}
                      tooltip="Percentage of simulations that hit ruin (balance zero or drawdown cutoff)"
                    />
                    <MetricsCard
                      label="Median Max DD"
                      value={`${stats.medianMaxDrawdown.toFixed(1)}%`}
                      trend={stats.medianMaxDrawdown > 30 ? "down" : stats.medianMaxDrawdown > 15 ? "neutral" : "up"}
                      tooltip="Median peak-to-trough drawdown across all simulations"
                    />
                    <MetricsCard
                      label="Worst Max DD"
                      value={`${stats.worstMaxDrawdown.toFixed(1)}%`}
                      tooltip="Largest peak-to-trough drawdown observed across all simulations"
                    />
                    <MetricsCard
                      label="Median Losing Streak"
                      value={`${stats.medianLongestLosingStreak.toFixed(0)} trades`}
                      tooltip="Median longest consecutive losing streak across all simulations"
                    />
                  </div>
                )}

                {/* Percentile table */}
                {stats && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Balance Percentiles</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                          { label: "5th", value: stats.percentile10 },
                          { label: "25th", value: stats.percentile25 },
                          { label: "50th (Med)", value: stats.percentile50 },
                          { label: "75th", value: stats.percentile75 },
                          { label: "95th", value: stats.percentile90 },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground">{label}</span>
                            <span className="text-sm font-semibold tabular-nums">{formatCurrency(value)}</span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {formatPercent(((value - config.startingBalance) / config.startingBalance) * 100)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Charts */}
                <Card>
                  <div className="px-6 pt-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="curves" className="text-xs gap-1">
                          <Activity className="h-3 w-3" /> Equity Curves
                        </TabsTrigger>
                        <TabsTrigger value="ending" className="text-xs gap-1">
                          <BarChart3 className="h-3 w-3" /> Ending Balance
                        </TabsTrigger>
                        <TabsTrigger value="drawdown" className="text-xs gap-1">
                          <TrendingDown className="h-3 w-3" /> Drawdown
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="curves" className="mt-3">
                      {equityCurves.length > 0 ? (
                        <>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            Showing {equityCurves.length} sample runs. Gray dashed line = starting balance.
                          </p>
                          <EquityCurveChart curves={equityCurves} startingBalance={config.startingBalance} />
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                          No curve data available.
                        </div>
                      )}
                      </TabsContent>
                      <TabsContent value="ending" className="mt-3">
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Distribution of ending balances across {config.simulationCount.toLocaleString()} simulations.
                        </p>
                        <HistogramChart bins={endingHistogram} color="#6366f1" />
                      </TabsContent>
                      <TabsContent value="drawdown" className="mt-3">
                        <p className="text-[10px] text-muted-foreground mb-2">
                          Distribution of maximum drawdowns per simulation.
                        </p>
                        <HistogramChart bins={drawdownHistogram} color="#f59e0b" />
                      </TabsContent>
                    </Tabs>
                  </div>
                </Card>

                {/* Risk threshold summary */}
                {stats && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Drawdown Risk Thresholds</CardTitle>
                      <CardDescription className="text-xs">
                        Probability of exceeding each drawdown level at any point during the simulation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[10, 20, 30, 50].map((threshold) => (
                        <DrawdownThresholdCard
                          key={threshold}
                          threshold={threshold}
                          probability={stats.probabilityExceedingDrawdown[threshold] ?? 0}
                        />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Expectancy & Derived Stats */}
                {stats && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Strategy Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground">Expectancy (R/trade)</span>
                          <span className={`text-sm font-semibold tabular-nums ${stats.expectancyR >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {formatR(stats.expectancyR)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground">Reward:Risk Ratio</span>
                          <span className="text-sm font-semibold tabular-nums">{stats.rewardRiskRatio.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground">Return/Trade (avg)</span>
                          <span className="text-sm font-semibold tabular-nums">{formatPercent(stats.returnMean)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground">Worst Losing Streak</span>
                          <span className="text-sm font-semibold tabular-nums">{stats.worstLongestLosingStreak.toFixed(0)} trades</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Insights Panel */}
                {insights.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Interpretation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {insights.map((insight, i) => (
                        <InsightBadge key={i} insight={insight} />
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Sanity check note */}
                {stats && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> Monte Carlo does not predict market behavior — it models outcome
                      distributions if your input assumptions are accurate. Sequence risk (the order of wins and
                      losses) significantly affects real trading results even when expectancy is positive. These
                      results are based on idealized random sampling and do not account for market regimes,
                      changing volatility, or execution reality.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename Preset</DialogTitle>
            </DialogHeader>
            <Input
              value={renamePresetName}
              onChange={(e) => setRenamePresetName(e.target.value)}
              placeholder="New preset name"
              onKeyDown={(e) => e.key === "Enter" && handleRenamePreset()}
            />
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRenamePreset} disabled={!renamePresetName.trim()}>Rename</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Preset</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeletePreset}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
