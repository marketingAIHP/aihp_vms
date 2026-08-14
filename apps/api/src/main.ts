import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 300;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 20;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
let rateLimitRequestCount = 0;

function validateRuntimeConfig() {
  const required = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((name) => !process.env[name]?.trim());

  if (!process.env.SUPABASE_SECRET_KEY?.trim() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port number.");
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function getAllowedOrigins() {
  const configured = process.env.CORS_ORIGIN
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured?.length) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CORS_ORIGIN must be configured in production.");
  }

  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://127.0.0.1:8081"
  ];
}

function setSecurityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (process.env.NODE_ENV === "production") {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

function applyRateLimit(request: Request, response: Response, next: NextFunction) {
  const now = Date.now();
  const authPath = request.path === "/api/auth/login" || request.path === "/api/auth/refresh";
  const maximum = authPath ? AUTH_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS;
  const scope = authPath ? request.path : "global";
  const key = `${request.ip || "unknown"}:${scope}`;
  const current = requestBuckets.get(key);

  rateLimitRequestCount += 1;
  if (rateLimitRequestCount % 500 === 0) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) {
        requestBuckets.delete(bucketKey);
      }
    }
  }

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  if (current.count >= maximum) {
    response.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
    response.status(429).json({ message: "Too many requests. Please try again later." });
    return;
  }

  current.count += 1;
  next();
}

async function bootstrap() {
  validateRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.enableShutdownHooks();
  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true
  });
  app.use(setSecurityHeaders);
  app.use(applyRateLimit);
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
