import type { ChainImporter, ImportPrefillResult } from "./types";
import { StorageManager } from "@/lib/storage";

const ALCHEMY_NETWORKS: Record<string, string> = {
    "ethereum": "eth-mainnet",
    "avalanche-c": "avalanche-mainnet",
};

export const alchemyEvmImporter: ChainImporter = {
    chain: "ethereum",

    async importTransaction(txHash: string, _apiKey?: string): Promise<ImportPrefillResult> {
        const warnings: string[] = [];

        try {
            // Validate EVM hash format (0x followed by 64 hex chars)
            if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
                return {
                    chain: "ethereum",
                    txHash,
                    warnings: ["Invalid EVM transaction hash format. Expected 0x followed by 64 hex characters."],
                };
            }

            const apiKey = await StorageManager.get<string>("alchemy_api_key", "");
            if (!apiKey) {
                return {
                    chain: "ethereum",
                    txHash,
                    warnings: ["Alchemy API key not found. Please add it in Settings."],
                };
            }

            // Try Ethereum first, then Avalanche
            let result: ImportPrefillResult | null = null;
            let lastError: string | null = null;

            for (const [chainId, network] of Object.entries(ALCHEMY_NETWORKS)) {
                const url = `https://${network}.g.alchemy.com/v2/${apiKey}`;

                // Get transaction receipt
                const receiptResponse = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_getTransactionReceipt",
                        params: [txHash],
                        id: 1,
                    }),
                });

                if (!receiptResponse.ok) {
                    lastError = `HTTP error: ${receiptResponse.status}`;
                    continue;
                }

                const receiptData = await receiptResponse.json();
                const receipt = receiptData.result;

                if (!receipt) {
                    lastError = `Transaction not found on ${chainId}`;
                    continue;
                }

                // Get block timestamp
                const blockResponse = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_getBlockByNumber",
                        params: [receipt.blockNumber, false],
                        id: 2,
                    }),
                });

                const blockData = await blockResponse.json();
                const timestampHex = blockData.result?.timestamp ?? "0x0";
                const timestampMs = parseInt(timestampHex, 16) * 1000;

                // Extract value (in wei for Ethereum, avax for Avalanche)
                const valueHex = receipt.value ?? "0x0";
                const valueWei = BigInt(valueHex);
                const divisor = BigInt(1e18);
                const nativeValue = Number(valueWei / divisor) + Number(valueWei % divisor) / Number(divisor);

                // Determine symbol based on chain
                const symbol = chainId === "ethereum" ? "ETH" : "AVAX";

                // If value is 0, this might be a token transfer or contract interaction
                if (nativeValue === 0) {
                    warnings.push("Transaction has 0 native value. This may be a token transfer, swap, or contract interaction. Please verify the amount manually.");
                }

                // Check for logs indicating ERC-20 transfers (simplified)
                // In a full implementation, you'd decode logs to find token transfers
                if (receipt.logs && receipt.logs.length > 0) {
                    warnings.push("This transaction contains contract logs. Token transfer amount could not be automatically determined. Please fill manually.");
                }

                result = {
                    chain: chainId as "ethereum" | "avalanche-c",
                    txHash,
                    symbol,
                    quantity: nativeValue > 0 ? nativeValue : undefined,
                    date: timestampMs,
                    action: nativeValue > 0 ? "buy" : undefined,
                    warnings,
                };
                break;
            }

            if (result) {
                return result;
            }

            return {
                chain: "ethereum",
                txHash,
                warnings: [lastError ?? "Transaction not found on supported networks."],
            };
        } catch (err) {
            return {
                chain: "ethereum",
                txHash,
                warnings: [`Failed to fetch transaction: ${err instanceof Error ? err.message : "Unknown error"}. Please fill manually.`],
            };
        }
    },
};
