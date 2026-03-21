import type { ChainImporter, ImportPrefillResult } from "./types";

// Dust threshold in satoshis (below this is economically unspendable)
// Use a slightly higher threshold to filter out dust outputs at the boundary
const DUST_THRESHOLD = 600;

// API endpoints to try (mempool.space first, blockstream.info as fallback)
const BTC_API_ENDPOINTS = [
    { base: "https://mempool.space/api/tx", name: "mempool.space" },
    { base: "https://blockstream.info/api/tx", name: "blockstream.info" },
];

async function fetchBtcTx(txHash: string): Promise<{ data: any; source: string } | null> {
    for (const endpoint of BTC_API_ENDPOINTS) {
        try {
            const response = await fetch(`${endpoint.base}/${txHash}`);
            if (response.ok) {
                const data = await response.json();
                return { data, source: endpoint.name };
            }
        } catch {
            // Try next endpoint
        }
    }
    return null;
}

export const bitcoinImporter: ChainImporter = {
    chain: "bitcoin",

    async importTransaction(txHash: string, _apiKey?: string, recipientAddress?: string): Promise<ImportPrefillResult> {
        const warnings: string[] = [];

        try {
            // Validate BTC txid format (64 hex chars, no 0x prefix)
            if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
                return {
                    chain: "bitcoin",
                    txHash,
                    warnings: ["Invalid Bitcoin transaction ID format. Expected 64 hex characters."],
                };
            }

            // Try API endpoints
            const result = await fetchBtcTx(txHash);
            if (!result) {
                return {
                    chain: "bitcoin",
                    txHash,
                    warnings: ["Transaction not found on Bitcoin mainnet. It may not be indexed yet or is on testnet."],
                };
            }

            const { data } = result;

            // Extract date from confirmed status or use current time if unconfirmed
            const date = data.status?.confirmed
                ? (data.status.block_time ?? Math.floor(Date.now() / 1000)) * 1000
                : Date.now();

            if (!data.status?.confirmed) {
                warnings.push("Transaction is unconfirmed. Date is set to now. Please verify.");
            }

            // Coinbase transactions are mining rewards, not typical transfers
            if (data.vin?.[0]?.is_coinbase) {
                warnings.push("This is a coinbase transaction (mining reward). Amount represents mining income. Please fill manually if tracking as a transfer.");
                return {
                    chain: "bitcoin",
                    txHash,
                    symbol: "BTC",
                    date,
                    warnings,
                };
            }

            // Filter vouts to get meaningful outputs (skip OP_RETURN and dust)
            const allVouts = data.vout || [];

            // If recipient address is provided, try to find the matching output
            if (recipientAddress) {
                const matchingVout = allVouts.find((vout: { scriptpubkey_address?: string; value: number; scriptpubkey_type: string }) =>
                    vout.scriptpubkey_address === recipientAddress &&
                    vout.scriptpubkey_type !== "op_return" &&
                    vout.value > DUST_THRESHOLD
                );

                if (matchingVout) {
                    const satoshis = matchingVout.value;
                    const btcAmount = satoshis / 100_000_000;
                    return {
                        chain: "bitcoin",
                        txHash,
                        symbol: "BTC",
                        quantity: btcAmount,
                        date,
                        warnings: warnings.length > 0 ? warnings : [],
                    };
                } else {
                    warnings.push("The provided address was not found in this transaction's outputs. Please verify the address.");
                }
            }

            // No address provided or no match - fall back to output counting heuristic
            const meaningfulVouts = allVouts.filter((vout: { scriptpubkey_type: string; value: number }) =>
                vout.scriptpubkey_type !== "op_return" && vout.value > DUST_THRESHOLD
            );

            if (meaningfulVouts.length === 0) {
                warnings.push("No meaningful outputs found in this transaction. Please fill manually.");
                return {
                    chain: "bitcoin",
                    txHash,
                    symbol: "BTC",
                    date,
                    warnings,
                };
            }

            // If exactly one meaningful output, we can reasonably infer the amount
            if (meaningfulVouts.length === 1) {
                const satoshis = meaningfulVouts[0].value;
                const btcAmount = satoshis / 100_000_000;

                return {
                    chain: "bitcoin",
                    txHash,
                    symbol: "BTC",
                    quantity: btcAmount,
                    date,
                    warnings: warnings.length > 0 ? warnings : [],
                };
            }

            // Multiple meaningful outputs - ambiguous without wallet context
            warnings.push(`Transaction has ${meaningfulVouts.length} outputs. Cannot determine which is the received amount. Provide a recipient address to auto-fill the correct output.`);
            return {
                chain: "bitcoin",
                txHash,
                symbol: "BTC",
                date,
                warnings,
            };
        } catch (err) {
            return {
                chain: "bitcoin",
                txHash,
                warnings: [`Failed to fetch transaction: ${err instanceof Error ? err.message : "Unknown error"}. Please fill manually.`],
            };
        }
    },
};
