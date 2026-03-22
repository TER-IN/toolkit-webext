// ============================================
// TERIN Toolkit — JWT Cryptography Utilities
// ============================================
// JWT signing and verification using the Web Crypto API.

export type HmacAlg = "HS256" | "HS384" | "HS512";
export type RsaAlg = "RS256" | "RS384" | "RS512";
export type Alg = HmacAlg | RsaAlg;
export type SecretEncoding = "utf8" | "base64" | "base64url" | "hex";

export interface VerifyResult {
    kind: "signature-verified" | "invalid-signature" | "unsupported-algorithm" | "invalid-key-format" | "verification-error";
    alg?: string;
    reason?: string;
}

export const SUPPORTED_VERIFY_ALGS: Alg[] = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"];
export const SUPPORTED_SIGN_ALGS: Alg[] = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"];

export function isHmacAlg(alg: string): alg is HmacAlg {
    return alg === "HS256" || alg === "HS384" || alg === "HS512";
}

export function isRsaAlg(alg: string): alg is RsaAlg {
    return alg === "RS256" || alg === "RS384" || alg === "RS512";
}

export function isSupportedAlg(alg: string): alg is Alg {
    return isHmacAlg(alg) || isRsaAlg(alg);
}

function getHashForAlg(alg: Alg): "SHA-256" | "SHA-384" | "SHA-512" {
    switch (alg) {
        case "HS256":
        case "RS256":
            return "SHA-256";
        case "HS384":
        case "RS384":
            return "SHA-384";
        case "HS512":
        case "RS512":
            return "SHA-512";
    }
}

function bufferSourceToUint8Array(input: BufferSource): Uint8Array {
    if (input instanceof Uint8Array) {
        return input;
    }

    if (input instanceof ArrayBuffer) {
        return new Uint8Array(input);
    }

    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

export function base64UrlEncodeBytes(input: BufferSource): string {
    const bytes = bufferSourceToUint8Array(input);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function decodeBase64(base64: string): Uint8Array | null {
    let normalized = base64.replace(/\s+/g, "");
    const remainder = normalized.length % 4;

    if (remainder > 0) {
        normalized += "=".repeat(4 - remainder);
    }

    try {
        const binary = atob(normalized);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
    } catch {
        return null;
    }
}

export function base64UrlDecodeToBytes(value: string): Uint8Array | null {
    return decodeBase64(value.replace(/-/g, "+").replace(/_/g, "/"));
}

export function decodeSecretInput(secret: string, encoding: SecretEncoding): Uint8Array | null {
    switch (encoding) {
        case "utf8":
            return new TextEncoder().encode(secret);
        case "base64":
            return decodeBase64(secret);
        case "base64url":
            return base64UrlDecodeToBytes(secret);
        case "hex": {
            const normalized = secret.replace(/\s+/g, "");

            if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
                return null;
            }

            const bytes = new Uint8Array(normalized.length / 2);
            for (let index = 0; index < normalized.length; index += 2) {
                bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
            }
            return bytes;
        }
    }
}

function extractPemBody(pem: string, expectedLabel: "PUBLIC KEY" | "PRIVATE KEY"): Uint8Array {
    const match = pem.match(new RegExp(`-----BEGIN ${expectedLabel}-----([\\s\\S]+?)-----END ${expectedLabel}-----`));

    if (!match?.[1]) {
        throw new Error(`Expected PEM block: ${expectedLabel}`);
    }

    const bytes = decodeBase64(match[1]);
    if (!bytes) {
        throw new Error("Failed to decode PEM body");
    }

    return bytes;
}

export function pemToSpkiBytes(pem: string): Uint8Array {
    return extractPemBody(pem.trim(), "PUBLIC KEY");
}

export function pemToPkcs8Bytes(pem: string): Uint8Array {
    return extractPemBody(pem.trim(), "PRIVATE KEY");
}

export async function importHmacKey(secretBytes: BufferSource, alg: HmacAlg): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        bufferSourceToUint8Array(secretBytes),
        { name: "HMAC", hash: getHashForAlg(alg) },
        false,
        ["sign", "verify"],
    );
}

export async function importRsaPublicKey(spkiBytes: BufferSource, alg: RsaAlg): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "spki",
        bufferSourceToUint8Array(spkiBytes),
        { name: "RSASSA-PKCS1-v1_5", hash: getHashForAlg(alg) },
        false,
        ["verify"],
    );
}

export async function importRsaPrivateKey(pkcs8Bytes: BufferSource, alg: RsaAlg): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "pkcs8",
        bufferSourceToUint8Array(pkcs8Bytes),
        { name: "RSASSA-PKCS1-v1_5", hash: getHashForAlg(alg) },
        false,
        ["sign"],
    );
}

function createSigningInput(headerBase64Url: string, payloadBase64Url: string): Uint8Array {
    return new TextEncoder().encode(`${headerBase64Url}.${payloadBase64Url}`);
}

async function signWithHmac(alg: HmacAlg, secretBytes: Uint8Array, data: Uint8Array): Promise<string> {
    const cryptoKey = await importHmacKey(secretBytes, alg);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    return base64UrlEncodeBytes(signature);
}

async function signWithRsa(alg: RsaAlg, privateKeyPem: string, data: Uint8Array): Promise<string> {
    const privateKey = await importRsaPrivateKey(pemToPkcs8Bytes(privateKeyPem), alg);
    const signature = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, privateKey, data);
    return base64UrlEncodeBytes(signature);
}

async function verifyWithHmac(
    alg: HmacAlg,
    secretBytes: Uint8Array,
    data: Uint8Array,
    signature: Uint8Array,
): Promise<boolean> {
    const cryptoKey = await importHmacKey(secretBytes, alg);
    return crypto.subtle.verify("HMAC", cryptoKey, signature, data);
}

async function verifyWithRsa(
    alg: RsaAlg,
    publicKeyPem: string,
    data: Uint8Array,
    signature: Uint8Array,
): Promise<boolean> {
    const publicKey = await importRsaPublicKey(pemToSpkiBytes(publicKeyPem), alg);
    return crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, publicKey, signature, data);
}

export async function verifyJwtSignature(params: {
    alg: string;
    headerBase64Url: string;
    payloadBase64Url: string;
    signatureBase64Url: string;
    secretBytes?: Uint8Array;
    publicKeyPem?: string;
}): Promise<VerifyResult> {
    const { alg, headerBase64Url, payloadBase64Url, signatureBase64Url, secretBytes, publicKeyPem } = params;

    if (!isSupportedAlg(alg)) {
        return { kind: "unsupported-algorithm", alg };
    }

    const signatureBytes = base64UrlDecodeToBytes(signatureBase64Url);
    if (!signatureBytes) {
        return { kind: "verification-error", reason: "Failed to decode JWT signature bytes" };
    }

    const data = createSigningInput(headerBase64Url, payloadBase64Url);

    try {
        if (isHmacAlg(alg)) {
            if (!secretBytes) {
                return { kind: "invalid-key-format", reason: "Secret key is required for HMAC verification" };
            }

            const valid = await verifyWithHmac(alg, secretBytes, data, signatureBytes);
            return valid ? { kind: "signature-verified" } : { kind: "invalid-signature" };
        }

        if (!publicKeyPem?.trim()) {
            return { kind: "invalid-key-format", reason: "Public key PEM is required for RSA verification" };
        }

        const valid = await verifyWithRsa(alg, publicKeyPem, data, signatureBytes);
        return valid ? { kind: "signature-verified" } : { kind: "invalid-signature" };
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const kind = /pem|key|pkcs8|spki|format|decode|import/i.test(reason) ? "invalid-key-format" : "verification-error";
        return { kind, reason };
    }
}

export async function generateJwt(params: {
    headerJson: string;
    payloadJson: string;
    alg: Alg;
    secretBytes?: Uint8Array;
    privateKeyPem?: string;
}): Promise<{ token: string; error: null } | { token: null; error: string }> {
    const { headerJson, payloadJson, alg, secretBytes, privateKeyPem } = params;

    let parsedHeader: Record<string, unknown>;
    let parsedPayload: Record<string, unknown>;

    try {
        parsedHeader = JSON.parse(headerJson);
    } catch {
        return { token: null, error: "Header is not valid JSON" };
    }

    try {
        parsedPayload = JSON.parse(payloadJson);
    } catch {
        return { token: null, error: "Payload is not valid JSON" };
    }

    const header = {
        ...parsedHeader,
        typ: typeof parsedHeader.typ === "string" ? parsedHeader.typ : "JWT",
        alg,
    };

    const headerBase64Url = base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(header)));
    const payloadBase64Url = base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(parsedPayload)));
    const data = createSigningInput(headerBase64Url, payloadBase64Url);

    try {
        const signature = isHmacAlg(alg)
            ? await signWithHmac(alg, secretBytes ?? new Uint8Array(), data)
            : await signWithRsa(alg, privateKeyPem ?? "", data);

        return {
            token: `${headerBase64Url}.${payloadBase64Url}.${signature}`,
            error: null,
        };
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return {
            token: null,
            error: /pem|key|pkcs8|decode|import/i.test(reason)
                ? `Invalid signing key: ${reason}`
                : `Signing failed: ${reason}`,
        };
    }
}
