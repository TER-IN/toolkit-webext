import type { Alg, SecretEncoding } from "@/lib/jwt-crypto";

export interface JwtExamplePreset {
    id: "hs256" | "rs256";
    label: string;
    alg: Alg;
    header: string;
    payload: string;
    secret?: string;
    secretEncoding?: SecretEncoding;
    privateKeyPem?: string;
    publicKeyPem?: string;
}

const sharedPayload = {
    sub: "1234567890",
    name: "John Doe",
    admin: true,
    iat: 1516239022,
};

export const JWT_EXAMPLE_PRESETS: JwtExamplePreset[] = [
    {
        id: "hs256",
        label: "HS256 example",
        alg: "HS256",
        header: JSON.stringify(
            {
                alg: "HS256",
                typ: "JWT",
            },
            null,
            2,
        ),
        payload: JSON.stringify(sharedPayload, null, 2),
        secret: "your-256-bit-secret",
        secretEncoding: "utf8",
    },
    {
        id: "rs256",
        label: "RS256 example",
        alg: "RS256",
        header: JSON.stringify(
            {
                alg: "RS256",
                typ: "JWT",
            },
            null,
            2,
        ),
        payload: JSON.stringify(sharedPayload, null, 2),
        privateKeyPem: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCd9hio5AMENRx0
Hb/frl8nz7gna45KUsbw3CgmiNHa5bHo+H9g3LaF5sFDzpjwLaYF9vWG+Bde7fSB
qmOIeJ8sUaL/D+CZNc+LcPIzxAFPALO/drqDbabswnnzniLKkwgOg4uoGMvUnQSV
AWCGFw5pB6kMGh0HKQY3WgDhBm/G71gEtgplvSSPPLC2tKxbNv+z7omoOrmFQNA0
IiMfL5L/qE1GPcictqmOcxMdLuZ6yHTGujfZ7UktkKIvoW8pTkdGvH0LbYhm0Zt8
lOz5acnL5pyvGa2Vz8eCXsPIDArOBoH82MShUecJK3uPqAILguzJLNW1lS5UHIAV
7hKw2HppAgMBAAECggEABRbgzm/n6yQTw6fR5CuJNZOfMcbzfaXLMty3CZ8i0CA9
Mj3vwF+lcleVWRbQQucc8v1/sD6bUH55yvk3TdZME5iZmAlLYbL+r0CUpHy/fuEC
tEEngH9L5OjdrBmc3O/DOft8nbjXIrrV4v/5ZmHvtQwvWEcERyl9Vv3LgDSNwqgr
yBLcj9pswaeq6TXFUE+i4BIdjo4J6C9UwHPydEp52qyOMO2+ejzW60iYdMxPUPb4
Yyxd7W/Mm9fgF1ZbLjdo47sr3VDYw5tIUiONNoPh5wgV0qV8+RbybGblzzdSF2bQ
PsmUTWWPJIEcqpGhQabypPuj1RexYUiKMTfEnNMSoQKBgQDRr9nsiUbT6YltcAqa
JQHBNAcyROHJJGof+HKbJmvXCeN/B1v76XZ5WPyzBHIXLZf583oS2xIi89VfPvjT
n0pmIOwAJQBEshdwQ/QlwrEZMRt49C6SDmtEvHU+QyHHe1Mvz9TFbxXoPc9WwOUe
7lesD7If2pOyUgE/tDVwOn5/CQKBgQDA2ZF5D9+5Pbjkc7zqcNAIbW0RKQe+gcv2
IMblXLV4mp+jHKe6SMZqZgGrYikeDZH0BV3yZGavJu+4X8ZlCzLsG5Zu8vrM9/vQ
Jn47q5qbgm5ekYDFodJ7jCN1P9V1ZJB6OlUrlmoPph/AXCKFHrXOu8IsKTtZSVGI
red5MdWYYQKBgBGVpbjoakArPZMn6juzDsqdCl102Vp860lzFGled3y5H5Lvkw81
LPJQPCDnJoo7EJuth3c9V/AGcsZiCYv1t8+Iw0Hf2H3qUXzgtgDUqvVp4Nvr3lvx
SZ2iEFMAXjzUYs2HqFhGUJgBVvn3gz9szX1oc4+oTOqPZftpqXGX9jPBAoGAXP4M
yeW/qeF7cJ3msN3pUscBWs8ALvsD0RGJFzyXPSrCY7MDpi5FjzTVBUF2Nkmw4Yxc
+u8zHK6X1b5JOpwl1/iNl76O9Zt2z65gHIHpMae5dNyQzbv0dSLkTjuTwOHXUTkj
rLsBNb6TfPxwoORoIuIjBYx0U9+o81F4VtaS+sECgYBAtA7PNtBIZv7WECBky25I
jm2XOl69M7r/phw7ieSpFcWzsn7R6DCBU+liVufCTx6SMAI/6QOkwmGO1l0CkYDi
eeqAbUHImLoRLoV+BxueNQBSD1hSXF9iHGWC/zwNJT9jsRgW14ECRIwlZyGN8p3O
hbUQPXrusE788Fd8RUDOCg==
-----END PRIVATE KEY-----`,
        publicKeyPem: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnfYYqOQDBDUcdB2/365f
J8+4J2uOSlLG8NwoJojR2uWx6Ph/YNy2hebBQ86Y8C2mBfb1hvgXXu30gapjiHif
LFGi/w/gmTXPi3DyM8QBTwCzv3a6g22m7MJ5854iypMIDoOLqBjL1J0ElQFghhcO
aQepDBodBykGN1oA4QZvxu9YBLYKZb0kjzywtrSsWzb/s+6JqDq5hUDQNCIjHy+S
/6hNRj3InLapjnMTHS7mesh0xro32e1JLZCiL6FvKU5HRrx9C22IZtGbfJTs+WnJ
y+acrxmtlc/Hgl7DyAwKzgaB/NjEoVHnCSt7j6gCC4LsySzVtZUuVByAFe4SsNh6
aQIDAQAB
-----END PUBLIC KEY-----`,
    },
];

export function getJwtExamplePreset(id: JwtExamplePreset["id"]): JwtExamplePreset {
    const preset = JWT_EXAMPLE_PRESETS.find((item) => item.id === id);

    if (!preset) {
        throw new Error(`Unknown JWT example preset: ${id}`);
    }

    return preset;
}
