import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_SITEMAP_PATH = path.resolve("dist/client/sitemap.xml");
const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const BATCH_ENDPOINT = "https://indexing.googleapis.com/batch";
const URL_NOTIFICATION_PATH = "/v3/urlNotifications:publish";
const MAX_BATCH_SIZE = 100;

type NotificationType = "URL_UPDATED" | "URL_DELETED";

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type CliOptions = {
  sitemapPath: string;
  type: NotificationType;
  batchSize: number;
  limit?: number;
  dryRun: boolean;
  startAt: number;
};

function printUsage(): void {
  console.log(`Usage:
  npm run indexing:batch -- [options]

Options:
  --sitemap <path>       Path to a local sitemap.xml file
  --type <updated|deleted>
                        Notification type to send (default: updated)
  --batch-size <1-100>  URLs per batch request (default: 100)
  --limit <number>      Only send the first N URLs after --start-at
  --start-at <number>   Skip the first N URLs in the sitemap (default: 0)
  --dry-run             Parse and print batches without sending requests
  --help                Show this message

Environment:
  GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/absolute/or/relative/path/to/service-account.json
  or
  GOOGLE_SERVICE_ACCOUNT_JSON='{"client_email":"...","private_key":"..."}'
`);
}

function parseCliArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    sitemapPath: DEFAULT_SITEMAP_PATH,
    type: "URL_UPDATED",
    batchSize: MAX_BATCH_SIZE,
    dryRun: false,
    startAt: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    switch (arg) {
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        return options;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--sitemap":
        if (!nextValue) {
          throw new Error("Missing value for --sitemap");
        }
        options.sitemapPath = path.resolve(nextValue);
        index += 1;
        break;
      case "--type":
        if (!nextValue) {
          throw new Error("Missing value for --type");
        }
        if (nextValue !== "updated" && nextValue !== "deleted") {
          throw new Error('Expected --type to be "updated" or "deleted"');
        }
        options.type = nextValue === "deleted" ? "URL_DELETED" : "URL_UPDATED";
        index += 1;
        break;
      case "--batch-size":
        if (!nextValue) {
          throw new Error("Missing value for --batch-size");
        }
        options.batchSize = parseIntegerOption("--batch-size", nextValue);
        if (options.batchSize < 1 || options.batchSize > MAX_BATCH_SIZE) {
          throw new Error("--batch-size must be between 1 and 100");
        }
        index += 1;
        break;
      case "--limit":
        if (!nextValue) {
          throw new Error("Missing value for --limit");
        }
        options.limit = parseIntegerOption("--limit", nextValue);
        if (options.limit < 1) {
          throw new Error("--limit must be greater than 0");
        }
        index += 1;
        break;
      case "--start-at":
        if (!nextValue) {
          throw new Error("Missing value for --start-at");
        }
        options.startAt = parseIntegerOption("--start-at", nextValue);
        if (options.startAt < 0) {
          throw new Error("--start-at must be 0 or greater");
        }
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function parseIntegerOption(name: string, rawValue: string): number {
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for ${name}: ${rawValue}`);
  }
  return parsed;
}

async function readServiceAccountCredentials(): Promise<ServiceAccountCredentials> {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH?.trim();

  let parsed: Partial<ServiceAccountCredentials> | null = null;

  if (inlineJson) {
    parsed = JSON.parse(inlineJson) as Partial<ServiceAccountCredentials>;
  } else if (keyPath) {
    const fileContents = await fs.readFile(path.resolve(keyPath), "utf8");
    parsed = JSON.parse(fileContents) as Partial<ServiceAccountCredentials>;
  } else {
    throw new Error(
      "Missing service account credentials. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_JSON.",
    );
  }

  const clientEmail = parsed.client_email?.trim();
  const privateKey = parsed.private_key?.replace(/\\n/g, "\n").trim();

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Service account credentials must include client_email and private_key.",
    );
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
    token_uri: parsed.token_uri?.trim() || TOKEN_ENDPOINT,
  };
}

async function readUrlsFromSitemap(sitemapPath: string): Promise<string[]> {
  const xml = await fs.readFile(sitemapPath, "utf8");
  const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/gsi))
    .map((match) => decodeXmlEntities(match[1]?.trim() ?? ""))
    .filter((value) => isValidHttpUrl(value));

  return Array.from(new Set(urls));
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildJwtAssertion(credentials: ServiceAccountCredentials): string {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: credentials.client_email,
    scope: INDEXING_SCOPE,
    aud: credentials.token_uri ?? TOKEN_ENDPOINT,
    iat: nowInSeconds,
    exp: nowInSeconds + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .end()
    .sign(credentials.private_key);

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(
  credentials: ServiceAccountCredentials,
): Promise<string> {
  const assertion = buildJwtAssertion(credentials);
  const tokenUri = credentials.token_uri ?? TOKEN_ENDPOINT;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Unable to obtain OAuth token (${response.status}): ${truncate(bodyText)}`,
    );
  }

  const tokenResponse = JSON.parse(bodyText) as { access_token?: string };
  if (!tokenResponse.access_token) {
    throw new Error("OAuth token response did not include access_token.");
  }

  return tokenResponse.access_token;
}

function createBatches(urls: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < urls.length; index += batchSize) {
    batches.push(urls.slice(index, index + batchSize));
  }
  return batches;
}

async function sendBatch(
  urls: string[],
  type: NotificationType,
  accessToken: string,
): Promise<{ successCount: number; failureCount: number }> {
  const boundary = `batch_${crypto.randomUUID()}`;
  const body = urls
    .map((url, index) => {
      const payload = JSON.stringify({ url, type });
      return [
        `--${boundary}`,
        "Content-Type: application/http",
        "Content-Transfer-Encoding: binary",
        `Content-ID: <item-${index + 1}>`,
        "",
        `POST ${URL_NOTIFICATION_PATH} HTTP/1.1`,
        "Content-Type: application/json",
        "Accept: application/json",
        "",
        payload,
        "",
      ].join("\r\n");
    })
    .concat(`--${boundary}--`)
    .join("\r\n");

  const response = await fetch(BATCH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/mixed; boundary=${boundary}`,
    },
    body,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Batch request failed (${response.status}): ${truncate(responseText)}`,
    );
  }

  const statusCodes = Array.from(responseText.matchAll(/HTTP\/1\.1 (\d{3})/g)).map(
    (match) => Number.parseInt(match[1] ?? "0", 10),
  );

  if (statusCodes.length === 0) {
    return {
      successCount: urls.length,
      failureCount: 0,
    };
  }

  const successCount = statusCodes.filter((statusCode) => statusCode < 400).length;
  return {
    successCount,
    failureCount: statusCodes.length - successCount,
  };
}

function truncate(value: string, maxLength = 300): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const sitemapPath = path.resolve(options.sitemapPath);
  const sitemapUrls = await readUrlsFromSitemap(sitemapPath);

  if (sitemapUrls.length === 0) {
    throw new Error(`No URLs found in sitemap: ${sitemapPath}`);
  }

  const selectedUrls = sitemapUrls.slice(options.startAt);
  const limitedUrls =
    typeof options.limit === "number"
      ? selectedUrls.slice(0, options.limit)
      : selectedUrls;

  if (limitedUrls.length === 0) {
    throw new Error("No URLs selected after applying --start-at/--limit.");
  }

  console.log(
    `Loaded ${sitemapUrls.length} URLs from ${sitemapPath}. Selected ${limitedUrls.length} URLs starting at index ${options.startAt}.`,
  );

  const batches = createBatches(limitedUrls, options.batchSize);

  if (options.dryRun) {
    console.log(
      `Dry run: ${batches.length} batch(es) would be sent as ${options.type}.`,
    );
    batches.forEach((batch, index) => {
      console.log(`Batch ${index + 1}: ${batch.length} URL(s)`);
      batch.forEach((url) => console.log(`  ${url}`));
    });
    return;
  }

  const credentials = await readServiceAccountCredentials();
  const accessToken = await getAccessToken(credentials);

  let totalSuccess = 0;
  let totalFailure = 0;

  for (const [index, batch] of batches.entries()) {
    console.log(
      `Sending batch ${index + 1}/${batches.length} with ${batch.length} URL(s)...`,
    );
    const result = await sendBatch(batch, options.type, accessToken);
    totalSuccess += result.successCount;
    totalFailure += result.failureCount;
    console.log(
      `Batch ${index + 1} complete: ${result.successCount} success, ${result.failureCount} failed.`,
    );
  }

  console.log(
    `Finished. Successful notifications: ${totalSuccess}. Failed notifications: ${totalFailure}.`,
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Unknown indexing batch error.",
  );
  process.exitCode = 1;
});
