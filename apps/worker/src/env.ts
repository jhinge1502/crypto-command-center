import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const shellProvidedKeys = new Set(Object.keys(process.env));

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const file = readFileSync(filePath, "utf8");

  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!shellProvidedKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

function loadWorkerEnv() {
  const cwd = process.cwd();
  const candidatePaths = [
    path.resolve(cwd, ".env"),
    path.resolve(cwd, ".env.local"),
    path.resolve(cwd, "..", ".env"),
    path.resolve(cwd, "..", ".env.local"),
    path.resolve(cwd, "..", "..", ".env"),
    path.resolve(cwd, "..", "..", ".env.local")
  ];

  candidatePaths.forEach(loadEnvFile);
}

loadWorkerEnv();

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
] as const;

type RequiredKey = (typeof required)[number];

function getEnv(key: RequiredKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export const env = {
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  coinbaseApiBaseUrl:
    process.env.COINBASE_API_BASE_URL ?? "https://api.coinbase.com/v2/prices",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? "300000")
};
