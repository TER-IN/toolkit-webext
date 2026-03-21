import type { SupportedImportChain, PortfolioAction } from "@/stores/useFinanceStore";

export type { SupportedImportChain, PortfolioAction };

export interface ImportPrefillResult {
    chain: SupportedImportChain;
    txHash: string;
    symbol?: string;
    quantity?: number;
    pricePerCoin?: number;
    date?: number;
    action?: PortfolioAction;
    notes?: string;
    warnings: string[];
}

export interface ChainImporter {
    chain: SupportedImportChain;
    /**
     * Attempt to fetch transaction details from on-chain data.
     * Returns a prefill result (never throws).
     * Optional recipientAddress can be provided to filter outputs for BTC.
     */
    importTransaction(txHash: string, apiKey?: string, recipientAddress?: string): Promise<ImportPrefillResult>;
}
