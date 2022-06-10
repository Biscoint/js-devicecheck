import { v4 as uuid } from "uuid";
import { SignJWT, importPKCS8 } from "jose";
import { $fetch } from "ohmyfetch";

interface AppleDeviceCheckCredentials {
  iss: string;
  kid: string;
  privateKey: string;
}

interface AppleDeviceCheckOptions {
  isDevelopment?: boolean;
  host?: string;
  endpoint?: string;
}

const ALGORITHM = "ES256";
const APPLE_HOST = "devicecheck.apple.com";
const APPLE_DEVICE_CHECK_ENDPOINT = "/v1/validate_device_token";

const validateToken = async function (
  deviceToken: string,
  credentials: AppleDeviceCheckCredentials,
  options: AppleDeviceCheckOptions = {
    isDevelopment: false,
    host: APPLE_HOST,
    endpoint: APPLE_DEVICE_CHECK_ENDPOINT,
  }
) {
  const { iss, kid, privateKey } = credentials;

  const jwtPayload = {
    iss,
    iat: Math.floor(Date.now() / 1000),
  };

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: ALGORITHM, kid })
    .sign(await importPKCS8(privateKey, ALGORITHM));

  const environment = options.isDevelopment ? "api.development" : "api";

  const response = await $fetch(
    `https://${environment}.${options.host}${options.endpoint}`,
    {
      method: "POST",
      body: JSON.stringify({
        device_token: deviceToken,
        transaction_id: uuid(),
        timestamp: Date.now(),
      }),
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    }
  );

  return { isValid: response.status === 200, statusCode: response.status };
};

export { validateToken };
