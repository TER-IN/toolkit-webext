import { create } from "zustand";
import { StorageManager } from "@/lib/storage";

export type PortfolioAction = "buy" | "sell" | "transfer";
export type DisplayCurrency = "USD" | "EUR";
export type SupportedImportChain =
    | "ethereum"
    | "avalanche-c"
    | "bitcoin"
    | "solana"
    | "sui"
    | "polkadot"
    | "bittensor"
    | "dogecoin";
export type TransactionSource = "manual" | "hash-import";

export interface CryptoTransaction {
    id: string;
    action: PortfolioAction;
    symbol: string;
    quantity: number;
    pricePerCoin: number;
    currency: DisplayCurrency;
    date: number;
    fee?: number;
    notes?: string;
    source?: TransactionSource;
    chain?: SupportedImportChain;
    txHash?: string;
}

// Legacy transaction type for migration detection
interface LegacyCryptoTransaction {
    id: string;
    assetId?: string;
    symbol: string;
    type?: "buy" | "sell";
    amount?: number;
    pricePerCoin: number;
    currency?: DisplayCurrency;
    date: number;
}

interface FinanceState {
    transactions: Record<string, CryptoTransaction>;
    displayCurrency: DisplayCurrency;
    isLoading: boolean;
    // Actions
    addTransaction: (tx: Omit<CryptoTransaction, "id" | "date"> & { date?: number }) => Promise<void>;
    updateTransaction: (id: string, tx: Partial<Omit<CryptoTransaction, "id" | "date"> & { date?: number }>) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    setDisplayCurrency: (currency: DisplayCurrency) => Promise<void>;
    loadTransactions: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
    transactions: {},
    displayCurrency: "USD",
    isLoading: true,
    
    addTransaction: async (tx) => {
        const id = crypto.randomUUID();
        const date = tx.date || Date.now();
        const newTx = { ...tx, id, date };
        
        set((state) => {
            const newTransactions = { ...state.transactions, [id]: newTx };
            StorageManager.set("crypto_transactions", newTransactions);
            return { transactions: newTransactions };
        });
    },
    
    removeTransaction: async (id) => {
        set((state) => {
            const newTransactions = { ...state.transactions };
            delete newTransactions[id];
            StorageManager.set("crypto_transactions", newTransactions);
            return { transactions: newTransactions };
        });
    },

    updateTransaction: async (id, tx) => {
        set((state) => {
            if (!state.transactions[id]) return state;
            const updatedTx = { ...state.transactions[id], ...tx };
            const newTransactions = { ...state.transactions, [id]: updatedTx };
            StorageManager.set("crypto_transactions", newTransactions);
            return { transactions: newTransactions };
        });
    },

    setDisplayCurrency: async (currency) => {
        set({ displayCurrency: currency });
        await StorageManager.set("finance_display_currency", currency);
    },
    
    loadTransactions: async () => {
        const data = await StorageManager.get<Record<string, CryptoTransaction | LegacyCryptoTransaction>>("crypto_transactions", {});
        const displayCur = await StorageManager.get<DisplayCurrency>("finance_display_currency", "USD");

        // Migration: detect and convert old-format transactions
        let needsMigration = false;
        const migratedData: Record<string, CryptoTransaction> = {};

        for (const [id, tx] of Object.entries(data)) {
            if ("type" in tx || "amount" in tx) {
                // Migrate old format to new
                const legacy = tx as LegacyCryptoTransaction;
                migratedData[id] = {
                    id: legacy.id,
                    action: legacy.type ?? "buy",
                    symbol: legacy.symbol,
                    quantity: legacy.amount ?? 0,
                    pricePerCoin: legacy.pricePerCoin,
                    currency: legacy.currency ?? "USD",
                    date: legacy.date,
                };
                needsMigration = true;
            } else {
                migratedData[id] = tx as CryptoTransaction;
            }
        }

        // Persist migrated data if needed
        if (needsMigration) {
            await StorageManager.set("crypto_transactions", migratedData);
        }

        set({ transactions: migratedData, displayCurrency: displayCur, isLoading: false });
    }
}));
