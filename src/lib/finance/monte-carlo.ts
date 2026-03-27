/**
 * Monte Carlo Trading Simulator — Core Engine
 *
 * Runs N simulations of a trading strategy over T trades,
 * modeling equity curve outcomes based on R-based win/loss mechanics.
 *
 * All functions are pure — no side effects, no randomness (unless seeded RNG is passed).
 */

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type PositionSizingMode = "fixed" | "compounding";
export type OutcomeModel = "binary" | "distributed";

export interface MonteCarloConfig {
  // Core assumptions
  startingBalance: number;
  riskPerTradePercent: number;
  tradeCount: number;
  simulationCount: number;
  winRatePercent: number;
  averageWinR: number;
  averageLossR: number;

  // Sizing / mechanics
  positionSizingMode: PositionSizingMode;
  includeFees: boolean;
  feePerTradePercent: number;
  includeSlippage: boolean;
  slippagePerTradePercent: number;

  // Outcome modeling
  outcomeModel: OutcomeModel;
  winRMin?: number;
  winRMax?: number;
  lossRMin?: number;
  lossRMax?: number;
  breakEvenRatePercent: number;

  // Advanced risk controls
  stopSimulationAtZero: boolean;
  maxDrawdownCutoffPercent?: number;
  reduceRiskAfterDrawdown: boolean;
  reducedRiskTriggerDrawdownPercent: number;
  reducedRiskPerTradePercent: number;

  // Reproducibility
  randomSeed?: string;
}

export interface TradeOutcome {
  type: "win" | "loss" | "breakeven";
  rMultiple: number;
}

export interface EquityDataPoint {
  tradeIndex: number;
  equity: number;
  peakEquity: number;
  drawdownPercent: number;
}

export interface SimulationRun {
  endingBalance: number;
  totalReturnPercent: number;
  maxDrawdownPercent: number;
  longestLosingStreak: number;
  longestBreakevenOrLossStreak: number;
  endedProfitable: boolean;
  hitRuin: boolean;
  ruinReason: "balance_zero" | "drawdown_cutoff" | null;
  equityCurve: EquityDataPoint[];
  expectancyR: number;
}

export interface AggregateStats {
  // Balance percentiles
  percentile10: number;
  percentile25: number;
  percentile50: number; // median
  percentile75: number;
  percentile90: number;
  mean: number;
  min: number;
  max: number;

  // Return percentiles
  returnPercentile10: number;
  returnPercentile25: number;
  returnPercentile50: number;
  returnPercentile75: number;
  returnPercentile90: number;
  returnMean: number;

  // Probability metrics
  probabilityOfProfit: number;
  probabilityOfLoss: number;
  probabilityOfRuin: number;

  // Drawdown metrics
  medianMaxDrawdown: number;
  worstMaxDrawdown: number;
  probabilityExceedingDrawdown: Record<number, number>; // threshold → probability

  // Streak metrics
  medianLongestLosingStreak: number;
  worstLongestLosingStreak: number;

  // Expectancy
  expectancyR: number;
  expectedReturnPerTrade: number;

  // Input-derived sanity checks
  rewardRiskRatio: number;
  expectedGrowthFixed: number; // % growth per trade in fixed mode
  expectedGrowthCompounding: number; // approximate using log returns
}

export interface HistogramBin {
  label: string;
  count: number;
  percent: number;
  from: number;
  to: number;
}

// ──────────────────────────────────────────────
// Seeded PRNG (Mulberry32)
// ──────────────────────────────────────────────

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRNG(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMathRandom(): () => number {
  return Math.random;
}

// ──────────────────────────────────────────────
// Core simulation
// ──────────────────────────────────────────────

function sampleOutcome(
  rng: () => number,
  config: MonteCarloConfig
): TradeOutcome {
  const { winRatePercent, breakEvenRatePercent, outcomeModel, averageWinR, averageLossR } = config;
  const winRate = winRatePercent / 100;
  const breakEvenRate = breakEvenRatePercent / 100;

  let rMultiple: number;
  let type: TradeOutcome["type"];

  const roll = rng();

  if (outcomeModel === "binary") {
    if (roll < winRate) {
      type = "win";
      rMultiple = averageWinR;
    } else {
      type = "loss";
      rMultiple = -averageLossR;
    }
  } else {
    // distributed mode: winRate% wins, breakEvenRate% breakeven, rest losses
    if (roll < winRate) {
      type = "win";
      const minR = config.winRMin ?? averageWinR;
      const maxR = config.winRMax ?? averageWinR;
      rMultiple = minR === maxR ? minR : minR + rng() * (maxR - minR);
    } else if (roll < winRate + breakEvenRate) {
      type = "breakeven";
      rMultiple = 0;
    } else {
      type = "loss";
      const minR = config.lossRMin ?? averageLossR;
      const maxR = config.lossRMax ?? averageLossR;
      rMultiple = -(minR === maxR ? minR : minR + rng() * (maxR - minR));
    }
  }

  return { type, rMultiple };
}

export function runSingleSimulation(
  config: MonteCarloConfig,
  rng: () => number
): SimulationRun {
  const {
    startingBalance,
    riskPerTradePercent,
    tradeCount,
    // positionSizingMode is stored for reference; the current engine uses
    // equity-based risk (compounding) in both modes for simplicity.
    includeFees,
    feePerTradePercent,
    includeSlippage,
    slippagePerTradePercent,
    stopSimulationAtZero,
    maxDrawdownCutoffPercent,
    reduceRiskAfterDrawdown,
    reducedRiskTriggerDrawdownPercent,
    reducedRiskPerTradePercent,
  } = config;

  let equity = startingBalance;
  let peakEquity = startingBalance;
  let currentDrawdownPercent = 0;
  let maxDrawdownSeen = 0;
  let currentLosingStreak = 0;
  let longestLosingStreak = 0;
  let currentBeOrLossStreak = 0;
  let longestBeOrLossStreak = 0;
  let totalR = 0;
  let totalTradesDone = 0;

  const equityCurve: EquityDataPoint[] = [];

  // At what equity (as % from peak) do we reduce risk?
  const drawdownTrigger = reducedRiskTriggerDrawdownPercent / 100;
  const reducedRisk = reducedRiskPerTradePercent / 100;
  const baseRisk = riskPerTradePercent / 100;

  for (let i = 0; i < tradeCount; i++) {
    // Current risk %: check if we need to reduce it
    let riskFraction = baseRisk;
    if (reduceRiskAfterDrawdown && peakEquity > 0) {
      const currentDd = (peakEquity - equity) / peakEquity;
      if (currentDd >= drawdownTrigger) {
        riskFraction = reducedRisk;
      }
    }

    // Position size in currency
    const riskAmount = equity * riskFraction;
    const outcome = sampleOutcome(rng, config);
    let pnlCurrency = outcome.rMultiple * riskAmount;

    // Apply fees
    if (includeFees && feePerTradePercent > 0) {
      const feeAmount = equity * (feePerTradePercent / 100);
      pnlCurrency -= feeAmount;
    }

    // Apply slippage (symmetrical — reduces both wins and losses slightly)
    if (includeSlippage && slippagePerTradePercent > 0) {
      const slippageAmount = equity * (slippagePerTradePercent / 100);
      pnlCurrency -= slippageAmount;
    }

    equity += pnlCurrency;
    totalR += outcome.rMultiple;
    totalTradesDone++;

    // Update peak & drawdown
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    currentDrawdownPercent = peakEquity > 0 ? Math.max(0, (peakEquity - equity) / peakEquity) : 0;
    if (currentDrawdownPercent > maxDrawdownSeen) {
      maxDrawdownSeen = currentDrawdownPercent;
    }

    // Track streaks
    if (outcome.type === "win") {
      if (currentLosingStreak > longestLosingStreak) longestLosingStreak = currentLosingStreak;
      currentLosingStreak = 0;
      if (currentBeOrLossStreak > longestBeOrLossStreak) longestBeOrLossStreak = currentBeOrLossStreak;
      currentBeOrLossStreak = 0;
    } else if (outcome.type === "loss") {
      if (++currentLosingStreak > longestLosingStreak) longestLosingStreak = currentLosingStreak;
      if (++currentBeOrLossStreak > longestBeOrLossStreak) longestBeOrLossStreak = currentBeOrLossStreak;
    } else {
      // breakeven
      if (currentLosingStreak > longestLosingStreak) longestLosingStreak = currentLosingStreak;
      currentLosingStreak = 0;
      if (++currentBeOrLossStreak > longestBeOrLossStreak) longestBeOrLossStreak = currentBeOrLossStreak;
    }

    // Record equity curve (sample at regular intervals to avoid huge arrays)
    // Store every 5 trades or last trade
    if (i % 5 === 0 || i === tradeCount - 1) {
      equityCurve.push({
        tradeIndex: i + 1,
        equity: Math.max(0, equity),
        peakEquity,
        drawdownPercent: currentDrawdownPercent * 100,
      });
    }

    // Early exit conditions
    let ruinReason: SimulationRun["ruinReason"] = null;
    if (stopSimulationAtZero && equity <= 0) {
      equity = 0;
      ruinReason = "balance_zero";
    } else if (maxDrawdownCutoffPercent !== undefined && maxDrawdownSeen * 100 >= maxDrawdownCutoffPercent) {
      ruinReason = "drawdown_cutoff";
    }

    if (ruinReason !== null) {
      // Pad remaining equity curve with flat line at final equity
      const finalEquity = equity;
      for (let j = i + 1; j < tradeCount; j++) {
        if (j % 5 === 0 || j === tradeCount - 1) {
          equityCurve.push({
            tradeIndex: j + 1,
            equity: Math.max(0, finalEquity),
            peakEquity,
            drawdownPercent: maxDrawdownSeen * 100,
          });
        }
      }
      return {
        endingBalance: Math.max(0, equity),
        totalReturnPercent: ((equity - startingBalance) / startingBalance) * 100,
        maxDrawdownPercent: maxDrawdownSeen * 100,
        longestLosingStreak,
        longestBreakevenOrLossStreak: longestBeOrLossStreak,
        endedProfitable: equity > startingBalance,
        hitRuin: true,
        ruinReason,
        equityCurve,
        expectancyR: totalTradesDone > 0 ? totalR / totalTradesDone : 0,
      };
    }
  }

  return {
    endingBalance: Math.max(0, equity),
    totalReturnPercent: ((equity - startingBalance) / startingBalance) * 100,
    maxDrawdownPercent: maxDrawdownSeen * 100,
    longestLosingStreak,
    longestBreakevenOrLossStreak: longestBeOrLossStreak,
    endedProfitable: equity > startingBalance,
    hitRuin: equity <= 0,
    ruinReason: equity <= 0 ? "balance_zero" : null,
    equityCurve,
    expectancyR: totalTradesDone > 0 ? totalR / totalTradesDone : 0,
  };
}

export function runMonteCarloSimulation(config: MonteCarloConfig): SimulationRun[] {
  const rng = config.randomSeed
    ? createSeededRNG(config.randomSeed)
    : createMathRandom();

  const runs: SimulationRun[] = [];
  for (let i = 0; i < config.simulationCount; i++) {
    runs.push(runSingleSimulation(config, rng));
    // Re-seed per-run only if seed is provided — but we want same config = same results
    // So we advance the RNG state for next run (mulberry32 is deterministic)
  }
  return runs;
}

// ──────────────────────────────────────────────
// Statistics helpers
// ──────────────────────────────────────────────

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sortedArr[low]!;
  return sortedArr[low]! + (sortedArr[high]! - sortedArr[low]!) * (idx - low);
}

export function computeAggregateStats(
  runs: SimulationRun[],
  config: MonteCarloConfig
): AggregateStats {
  if (runs.length === 0) {
    return createEmptyAggregateStats();
  }

  const endings = runs.map((r) => r.endingBalance).sort((a, b) => a - b);
  const returns = runs.map((r) => r.totalReturnPercent).sort((a, b) => a - b);
  const maxDrawdowns = runs.map((r) => r.maxDrawdownPercent).sort((a, b) => a - b);
  const losingStreaks = runs.map((r) => r.longestLosingStreak).sort((a, b) => a - b);
  const ruinCount = runs.filter((r) => r.hitRuin).length;
  const profitCount = runs.filter((r) => r.endedProfitable).length;
  const lossCount = runs.filter((r) => !r.endedProfitable).length;

  const drawdownThresholds = [10, 20, 30, 50];
  const probabilityExceedingDrawdown: Record<number, number> = {};
  for (const threshold of drawdownThresholds) {
    probabilityExceedingDrawdown[threshold] =
      (runs.filter((r) => r.maxDrawdownPercent >= threshold).length / runs.length) * 100;
  }

  // Expectancy
  const totalR = runs.reduce((sum, r) => sum + r.expectancyR * config.tradeCount, 0);
  const expectancyR = totalR / (runs.length * config.tradeCount);
  const expectedReturnPerTrade = (returns.reduce((a, b) => a + b, 0) / returns.length) / config.tradeCount;

  // Derived
  const rewardRiskRatio = config.averageLossR > 0 ? config.averageWinR / config.averageLossR : 0;
  const expectedGrowthFixed = (expectancyR * (config.riskPerTradePercent / 100)) * 100;
  // Approximate compounding growth: (1+E[R])^n - 1 where E[R] per trade is expectancyR * risk%
  const avgReturnPerTrade = expectancyR * (config.riskPerTradePercent / 100);
  const expectedGrowthCompounding = (Math.pow(1 + avgReturnPerTrade, config.tradeCount) - 1) * 100;

  return {
    percentile10: percentile(endings, 10),
    percentile25: percentile(endings, 25),
    percentile50: percentile(endings, 50),
    percentile75: percentile(endings, 75),
    percentile90: percentile(endings, 90),
    mean: endings.reduce((a, b) => a + b, 0) / endings.length,
    min: endings[0] ?? 0,
    max: endings[endings.length - 1] ?? 0,

    returnPercentile10: percentile(returns, 10),
    returnPercentile25: percentile(returns, 25),
    returnPercentile50: percentile(returns, 50),
    returnPercentile75: percentile(returns, 75),
    returnPercentile90: percentile(returns, 90),
    returnMean: returns.reduce((a, b) => a + b, 0) / returns.length,

    probabilityOfProfit: (profitCount / runs.length) * 100,
    probabilityOfLoss: (lossCount / runs.length) * 100,
    probabilityOfRuin: (ruinCount / runs.length) * 100,

    medianMaxDrawdown: percentile(maxDrawdowns, 50),
    worstMaxDrawdown: maxDrawdowns[maxDrawdowns.length - 1] ?? 0,
    probabilityExceedingDrawdown,

    medianLongestLosingStreak: percentile(losingStreaks, 50),
    worstLongestLosingStreak: losingStreaks[losingStreaks.length - 1] ?? 0,

    expectancyR,
    expectedReturnPerTrade,

    rewardRiskRatio,
    expectedGrowthFixed,
    expectedGrowthCompounding,
  };
}

function createEmptyAggregateStats(): AggregateStats {
  return {
    percentile10: 0, percentile25: 0, percentile50: 0, percentile75: 0, percentile90: 0,
    mean: 0, min: 0, max: 0,
    returnPercentile10: 0, returnPercentile25: 0, returnPercentile50: 0,
    returnPercentile75: 0, returnPercentile90: 0, returnMean: 0,
    probabilityOfProfit: 0, probabilityOfLoss: 0, probabilityOfRuin: 0,
    medianMaxDrawdown: 0, worstMaxDrawdown: 0,
    probabilityExceedingDrawdown: { 10: 0, 20: 0, 30: 0, 50: 0 },
    medianLongestLosingStreak: 0, worstLongestLosingStreak: 0,
    expectancyR: 0, expectedReturnPerTrade: 0,
    rewardRiskRatio: 0, expectedGrowthFixed: 0, expectedGrowthCompounding: 0,
  };
}

// ──────────────────────────────────────────────
// Histogram helpers
// ──────────────────────────────────────────────

export function buildEndingBalanceHistogram(
  runs: SimulationRun[],
  binCount = 20
): HistogramBin[] {
  if (runs.length === 0) return [];

  const endings = runs.map((r) => r.endingBalance);
  const min = Math.min(...endings);
  const max = Math.max(...endings);

  if (min === max) {
    return [{
      label: formatCurrency(min),
      count: endings.length,
      percent: 100,
      from: min,
      to: max,
    }];
  }

  const range = max - min;
  const binWidth = range / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    label: "",
    count: 0,
    percent: 0,
    from: min + i * binWidth,
    to: min + (i + 1) * binWidth,
  }));

  for (const ending of endings) {
    let binIdx = Math.floor((ending - min) / binWidth);
    if (binIdx >= binCount) binIdx = binCount - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx]!.count++;
  }

  const labelled = bins.map((bin) => ({
    ...bin,
    label: `${formatCurrency(bin.from)} – ${formatCurrency(bin.to)}`,
    percent: (bin.count / endings.length) * 100,
  }));

  return labelled;
}

export function buildDrawdownHistogram(
  runs: SimulationRun[],
  binCount = 10
): HistogramBin[] {
  if (runs.length === 0) return [];

  const drawdowns = runs.map((r) => r.maxDrawdownPercent);
  const max = Math.max(...drawdowns, 100);
  const binWidth = max / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    label: "",
    count: 0,
    percent: 0,
    from: i * binWidth,
    to: (i + 1) * binWidth,
  }));

  for (const dd of drawdowns) {
    let binIdx = Math.floor(dd / binWidth);
    if (binIdx >= binCount) binIdx = binCount - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx]!.count++;
  }

  const labelled = bins.map((bin) => ({
    ...bin,
    label: `${bin.from.toFixed(0)}% – ${bin.to.toFixed(0)}%`,
    percent: (bin.count / drawdowns.length) * 100,
  }));

  return labelled.filter((b) => b.count > 0);
}

// ──────────────────────────────────────────────
// Equity curve sampling (for chart — only sample a few runs)
// ──────────────────────────────────────────────

export function sampleEquityCurves(
  runs: SimulationRun[],
  maxSamples = 20
): { curve: EquityDataPoint[]; label: string; color: string }[] {
  if (runs.length === 0) return [];

  const step = Math.max(1, Math.floor(runs.length / maxSamples));
  const sampled: SimulationRun[] = [];

  for (let i = 0; i < runs.length; i += step) {
    if (sampled.length < maxSamples) sampled.push(runs[i]!);
  }

  const colors = [
    "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
    "#06b6d4", "#a855f7", "#eab308", "#22c55e", "#3b82f6",
    "#8b5cf6", "#f43f5e", "#14b8a6", "#f59e0b", "#6366f1",
  ];

  return sampled.map((run, i) => ({
    curve: run.equityCurve,
    label: `Run ${i + 1}`,
    color: colors[i % colors.length]!,
  }));
}

// ──────────────────────────────────────────────
// Insight generation
// ──────────────────────────────────────────────

export interface Insight {
  level: "info" | "warning" | "danger" | "success";
  title: string;
  body: string;
}

export function generateInsights(
  stats: AggregateStats,
  config: MonteCarloConfig
): Insight[] {
  const insights: Insight[] = [];
  const { probabilityOfRuin, probabilityOfProfit, medianMaxDrawdown, expectancyR, rewardRiskRatio } = stats;
  const riskPerTrade = config.riskPerTradePercent;

  // Ruin risk
  if (probabilityOfRuin > 10) {
    insights.push({
      level: "danger",
      title: "High Ruin Probability",
      body: `With ${probabilityOfRuin.toFixed(1)}% of simulations hitting ruin, this strategy carries a significant risk of total account loss under the given assumptions. Consider reducing risk per trade or improving win rate.`,
    });
  } else if (probabilityOfRuin > 2) {
    insights.push({
      level: "warning",
      title: "Moderate Ruin Risk",
      body: `Approximately ${probabilityOfRuin.toFixed(1)}% of simulations deplete the account. While low, this is non-trivial for a real trading account.`,
    });
  } else if (probabilityOfRuin > 0) {
    insights.push({
      level: "info",
      title: "Low Ruin Probability",
      body: `Ruin occurs in ${probabilityOfRuin.toFixed(2)}% of simulations — statistically small but not zero. Monitor real-world drawdowns closely.`,
    });
  }

  // Drawdown severity
  if (medianMaxDrawdown > 50) {
    insights.push({
      level: "warning",
      title: "Deep Expected Drawdowns",
      body: `The median simulation sees a ${medianMaxDrawdown.toFixed(0)}% peak-to-trough drawdown. This is severe and could trigger emotional decisions or forced stops in live trading.`,
    });
  } else if (medianMaxDrawdown > 30) {
    insights.push({
      level: "warning",
      title: "Significant Drawdowns Expected",
      body: `Median max drawdown of ${medianMaxDrawdown.toFixed(0)}%. Ensure you can stomach this psychologically before trading this strategy with real capital.`,
    });
  } else if (medianMaxDrawdown > 15) {
    insights.push({
      level: "info",
      title: "Moderate Drawdown Profile",
      body: `Median drawdown of ${medianMaxDrawdown.toFixed(0)}% is typical for trend-following or volatile strategies. Prepare mentally and financially for swings of this magnitude.`,
    });
  }

  // Profitability
  if (probabilityOfProfit > 70) {
    insights.push({
      level: "success",
      title: "High Probability of Profit",
      body: `${probabilityOfProfit.toFixed(0)}% of simulations end profitable. Under the modeled assumptions, this strategy has a strong edge.`,
    });
  } else if (probabilityOfProfit < 40) {
    insights.push({
      level: "warning",
      title: "Low Profit Probability",
      body: `Only ${probabilityOfProfit.toFixed(0)}% of simulations are profitable. Review assumptions — a ${config.winRatePercent}% win rate with ${config.averageWinR}R avg win and ${config.averageLossR}R avg loss may not provide enough edge.`,
    });
  }

  // Expectancy
  if (expectancyR <= 0) {
    insights.push({
      level: "danger",
      title: "Negative Expectancy",
      body: `The modeled R-expectancy is ${expectancyR.toFixed(3)}R per trade — the system loses money in expectation regardless of position sizing. This is not a viable strategy as configured.`,
    });
  } else if (expectancyR < 0.1 && expectancyR > 0) {
    insights.push({
      level: "info",
      title: "Low but Positive Expectancy",
      body: `Expectancy of ${expectancyR.toFixed(3)}R per trade is positive but thin. Transaction costs, slippage, and execution reality could easily erode it to zero or negative.`,
    });
  }

  // Risk per trade
  if (riskPerTrade > 3) {
    insights.push({
      level: "warning",
      title: "High Risk Per Trade",
      body: `Risking ${riskPerTrade}% of equity per trade is aggressive. Standard guidance suggests 1–2% max. High position size amplifies both wins and losses, increasing volatility and drawdown magnitude.`,
    });
  }

  // Reward:risk
  if (rewardRiskRatio < 0.8 && config.averageWinR < config.averageLossR) {
    insights.push({
      level: "warning",
      title: "Unfavorable Reward:Risk",
      body: `Average win (${config.averageWinR}R) is smaller than average loss (${config.averageLossR}R). This means you need a high win rate to be profitable. Make sure your actual win rate comfortably exceeds the break-even rate of ${(100 * config.averageLossR / (config.averageWinR + config.averageLossR)).toFixed(1)}%.`,
    });
  }

  // Compounding volatility
  if (config.positionSizingMode === "compounding") {
    const spread = stats.percentile90 - stats.percentile10;
    if (spread > config.startingBalance * 2) {
      insights.push({
        level: "info",
        title: "Compounding Adds Volatility",
        body: `With compounding, outcomes range widely — from ${formatCurrency(stats.percentile10)} to ${formatCurrency(stats.percentile90)} in the 10th–90th percentile band. Fixed sizing would narrow this range significantly.`,
      });
    }
  }

  // Sequence risk
  if (config.tradeCount > 50 && expectancyR > 0.1) {
    insights.push({
      level: "info",
      title: "Sequence Risk Matters",
      body: `With many trades, the order of wins and losses significantly affects outcomes even when expectancy is positive. Two traders with identical win rates and R multiples can end up with very different curves purely due to distribution of wins.`,
    });
  }

  // Fees impact
  if (config.includeFees && config.feePerTradePercent > 0) {
    const feeDrag = config.feePerTradePercent * config.tradeCount;
    insights.push({
      level: "info",
      title: "Fee Drag",
      body: `Fees total ~${feeDrag.toFixed(1)}% of equity over ${config.tradeCount} trades (${config.feePerTradePercent}% per trade). This directly reduces net expectancy — ensure your strategy generates enough edge to cover it.`,
    });
  }

  // Slippage impact
  if (config.includeSlippage && config.slippagePerTradePercent > 0) {
    insights.push({
      level: "info",
      title: "Slippage Model",
      body: `Slippage of ${config.slippagePerTradePercent}% per trade is modeled symmetrically (deducted on every trade). In live markets, slippage is usually worse on losses than wins, making this estimate optimistic.`,
    });
  }

  // Nothing interesting?
  if (insights.length === 0) {
    insights.push({
      level: "info",
      title: "Strategy Looks Reasonable",
      body: `No major red flags detected. The modeled assumptions produce a balanced outcome distribution. Always validate with real track record data.`,
    });
  }

  return insights;
}

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateConfig(config: Partial<MonteCarloConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (config.startingBalance !== undefined && config.startingBalance <= 0) {
    errors.push({ field: "startingBalance", message: "Starting balance must be positive." });
  }
  if (config.riskPerTradePercent !== undefined && (config.riskPerTradePercent <= 0 || config.riskPerTradePercent > 100)) {
    errors.push({ field: "riskPerTradePercent", message: "Risk per trade must be between 0 and 100%." });
  }
  if (config.tradeCount !== undefined && (config.tradeCount <= 0 || !Number.isInteger(config.tradeCount))) {
    errors.push({ field: "tradeCount", message: "Trade count must be a positive integer." });
  }
  if (config.simulationCount !== undefined && (config.simulationCount <= 0 || !Number.isInteger(config.simulationCount))) {
    errors.push({ field: "simulationCount", message: "Simulation count must be a positive integer." });
  }
  if (config.winRatePercent !== undefined && (config.winRatePercent < 0 || config.winRatePercent > 100)) {
    errors.push({ field: "winRatePercent", message: "Win rate must be between 0 and 100%." });
  }
  if (config.breakEvenRatePercent !== undefined && (config.breakEvenRatePercent < 0 || config.breakEvenRatePercent > 100)) {
    errors.push({ field: "breakEvenRatePercent", message: "Break-even rate must be between 0 and 100%." });
  }
  if (config.winRatePercent !== undefined && config.breakEvenRatePercent !== undefined) {
    if (config.winRatePercent + config.breakEvenRatePercent > 100) {
      errors.push({ field: "winRatePercent", message: "Win rate + break-even rate cannot exceed 100%." });
    }
  }
  if (config.averageWinR !== undefined && config.averageWinR <= 0) {
    errors.push({ field: "averageWinR", message: "Average win R must be positive." });
  }
  if (config.averageLossR !== undefined && config.averageLossR <= 0) {
    errors.push({ field: "averageLossR", message: "Average loss R must be positive." });
  }
  if (config.feePerTradePercent !== undefined && config.feePerTradePercent < 0) {
    errors.push({ field: "feePerTradePercent", message: "Fee per trade cannot be negative." });
  }
  if (config.slippagePerTradePercent !== undefined && config.slippagePerTradePercent < 0) {
    errors.push({ field: "slippagePerTradePercent", message: "Slippage cannot be negative." });
  }
  if (config.reducedRiskPerTradePercent !== undefined && config.reducedRiskPerTradePercent < 0) {
    errors.push({ field: "reducedRiskPerTradePercent", message: "Reduced risk % cannot be negative." });
  }
  if (config.maxDrawdownCutoffPercent !== undefined && config.maxDrawdownCutoffPercent <= 0) {
    errors.push({ field: "maxDrawdownCutoffPercent", message: "Max drawdown cutoff must be positive." });
  }

  return errors;
}

// ──────────────────────────────────────────────
// Default config
// ──────────────────────────────────────────────

export const DEFAULT_CONFIG: MonteCarloConfig = {
  startingBalance: 10000,
  riskPerTradePercent: 1,
  tradeCount: 100,
  simulationCount: 5000,
  winRatePercent: 45,
  averageWinR: 2,
  averageLossR: 1,
  positionSizingMode: "fixed",
  includeFees: false,
  feePerTradePercent: 0,
  includeSlippage: false,
  slippagePerTradePercent: 0,
  outcomeModel: "binary",
  breakEvenRatePercent: 0,
  stopSimulationAtZero: true,
  maxDrawdownCutoffPercent: undefined,
  reduceRiskAfterDrawdown: false,
  reducedRiskTriggerDrawdownPercent: 20,
  reducedRiskPerTradePercent: 0.5,
  randomSeed: undefined,
};

// ──────────────────────────────────────────────
// Formatters
// ──────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function formatR(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}R`;
}
