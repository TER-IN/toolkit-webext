import { create } from "zustand";
import { StorageManager } from "@/lib/storage";

export interface CryptoTransaction {
    id: string;
    assetId: string; // e.g., 'bitcoin', 'ethereum' (CoinGecko ID)
    symbol: string;  // e.g., 'BTC', 'ETH'
    type: 'buy' | 'sell';
    amount: number;
    pricePerCoin: number; // in the transaction currency
    currency?: "USD" | "EUR"; // default USD
    date: number; // timestamp
}

interface FinanceState {
    transactions: Record<string, CryptoTransaction>;
    displayCurrency: "USD" | "EUR";
    isLoading: boolean;
    // Actions
    addTransaction: (tx: Omit<CryptoTransaction, "id" | "date"> & { date?: number }) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    setDisplayCurrency: (currency: "USD" | "EUR") => Promise<void>;
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
    
    setDisplayCurrency: async (currency) => {
        set({ displayCurrency: currency });
        await StorageManager.set("finance_display_currency", currency);
    },
    
    loadTransactions: async () => {
        const data = await StorageManager.get<Record<string, CryptoTransaction>>("crypto_transactions", {});
        const displayCur = await StorageManager.get<"USD" | "EUR">("finance_display_currency", "USD");
        set({ transactions: data, displayCurrency: displayCur, isLoading: false });
    }
}));
