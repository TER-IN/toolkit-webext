// ============================================
// TERIN Toolkit — JWT Debugger Utilities
// ============================================

function normalizeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const remainder = normalized.length % 4;
    return remainder === 0 ? normalized : `${normalized}${"=".repeat(4 - remainder)}`;
}

function base64UrlDecodeToUtf8(value: string): string {
    const binary = atob(normalizeBase64Url(value));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

export interface JwtHeader {
    alg?: string;
    typ?: string;
    kid?: string;
    [key: string]: unknown;
}

export interface JwtPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    iat?: number;
    nbf?: number;
    jti?: string;
    [key: string]: unknown;
}

export interface DecodedJwt {
    header: JwtHeader;
    payload: JwtPayload;
    signature: string;
    raw: {
        header: string;
        payload: string;
        signature: string;
    };
}

export type JwtStatus =
    | { kind: "valid-format" }
    | { kind: "malformed"; reason: string }
    | { kind: "expired"; expiredAt: Date }
    | { kind: "not-yet-active"; activatesAt: Date };

export function decodeJwt(token: string): DecodedJwt | null {
    const parts = token.trim().split(".");
    if (parts.length !== 3) {
        return null;
    }

    const [rawHeader, rawPayload, rawSignature] = parts;

    try {
        const header = JSON.parse(base64UrlDecodeToUtf8(rawHeader)) as JwtHeader;
        const payload = JSON.parse(base64UrlDecodeToUtf8(rawPayload)) as JwtPayload;

        return {
            header,
            payload,
            signature: rawSignature,
            raw: {
                header: rawHeader,
                payload: rawPayload,
                signature: rawSignature,
            },
        };
    } catch {
        return null;
    }
}

export function parseAndValidate(token: string): {
    decoded: DecodedJwt | null;
    error: string | null;
} {
    if (!token.trim()) {
        return { decoded: null, error: "Paste an encoded JWT to decode it." };
    }

    const parts = token.trim().split(".");
    if (parts.length !== 3) {
        return {
            decoded: null,
            error: `Invalid JWT structure: expected 3 parts separated by ".", got ${parts.length}.`,
        };
    }

    const decoded = decodeJwt(token);
    if (!decoded) {
        return {
            decoded: null,
            error: "Failed to Base64URL decode or parse the JWT header/payload JSON.",
        };
    }

    return { decoded, error: null };
}

export function getJwtAlgorithm(decoded: DecodedJwt): string {
    return typeof decoded.header.alg === "string" ? decoded.header.alg : "unknown";
}

export function formatTimestamp(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
    });
}

export function getCommonClaims(decoded: DecodedJwt): Array<{
    key: string;
    label: string;
    value: string;
    isTimestamp: boolean;
}> {
    const claims: Array<{
        key: string;
        label: string;
        value: string;
        isTimestamp: boolean;
    }> = [];

    const { payload } = decoded;

    if (payload.iss !== undefined) {
        claims.push({ key: "iss", label: "iss", value: String(payload.iss), isTimestamp: false });
    }
    if (payload.sub !== undefined) {
        claims.push({ key: "sub", label: "sub", value: String(payload.sub), isTimestamp: false });
    }
    if (payload.aud !== undefined) {
        claims.push({
            key: "aud",
            label: "aud",
            value: Array.isArray(payload.aud) ? payload.aud.join(", ") : String(payload.aud),
            isTimestamp: false,
        });
    }
    if (typeof payload.exp === "number") {
        claims.push({ key: "exp", label: "exp", value: formatTimestamp(payload.exp), isTimestamp: true });
    }
    if (typeof payload.iat === "number") {
        claims.push({ key: "iat", label: "iat", value: formatTimestamp(payload.iat), isTimestamp: true });
    }
    if (typeof payload.nbf === "number") {
        claims.push({ key: "nbf", label: "nbf", value: formatTimestamp(payload.nbf), isTimestamp: true });
    }
    if (payload.jti !== undefined) {
        claims.push({ key: "jti", label: "jti", value: String(payload.jti), isTimestamp: false });
    }

    return claims;
}

export function getJwtStatus(decoded: DecodedJwt): JwtStatus {
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (typeof decoded.payload.exp === "number" && decoded.payload.exp < nowSeconds) {
        return { kind: "expired", expiredAt: new Date(decoded.payload.exp * 1000) };
    }

    if (typeof decoded.payload.nbf === "number" && decoded.payload.nbf > nowSeconds) {
        return { kind: "not-yet-active", activatesAt: new Date(decoded.payload.nbf * 1000) };
    }

    return { kind: "valid-format" };
}

export function prettyPrintJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}
