import { v4 as uuid } from "uuid";
import { SignJWT, importPKCS8 } from "jose";
import { $fetch, FetchError } from "ohmyfetch";

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
  }
) {
  if (!options.host) {
    options.host = APPLE_HOST;
  }
  if (!options.endpoint) {
    options.endpoint = APPLE_DEVICE_CHECK_ENDPOINT;
  }
  const { iss, kid, privateKey } = credentials;

  let jwt;
  try {
    const key = await importPKCS8(privateKey, ALGORITHM);

    jwt = await new SignJWT({
      iss,
      iat: Math.floor(Date.now() / 1000),
    })
      .setProtectedHeader({ alg: ALGORITHM, kid, typ: "JWT" })
      .sign(key);
  } catch (err) {
    throw new Error(`Error during signature, invalid key?`);
  }

  const environment = options.isDevelopment ? "api.development" : "api";

  let status: number | undefined;

  try {
    ({ status } = await $fetch.raw(
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
    ));
  } catch (error) {
    if (error && (error as FetchError).response) {
      status = (error as FetchError).response!.status;
    }
  }

  return { isValid: status === 200, statusCode: status };
};

export { validateToken };
