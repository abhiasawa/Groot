import { logger } from "@/lib/logger";
import type { LLMProvider } from "../types";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

/**
 * LLM Provider Factory with circuit breaker and fallback chain.
 *
 * Priority order: configured AI_PROVIDER → fallback providers
 * Circuit breaker: opens after 3 consecutive failures, resets after 60s
 */

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitStates: Map<string, CircuitState> = new Map();
const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 60_000;

function getCircuitState(provider: string): CircuitState {
  if (!circuitStates.has(provider)) {
    circuitStates.set(provider, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return circuitStates.get(provider)!;
}

function recordSuccess(provider: string): void {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.isOpen = false;
}

function recordFailure(provider: string): void {
  const state = getCircuitState(provider);
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= FAILURE_THRESHOLD) {
    state.isOpen = true;
    logger.warn({ provider, failures: state.failures }, "Circuit breaker opened");
  }
}

function isCircuitOpen(provider: string): boolean {
  const state = getCircuitState(provider);
  if (!state.isOpen) return false;

  // Check if reset timeout has passed
  if (Date.now() - state.lastFailure > RESET_TIMEOUT_MS) {
    state.isOpen = false;
    state.failures = 0;
    logger.info({ provider }, "Circuit breaker reset");
    return false;
  }

  return true;
}

/**
 * Create a provider instance by name.
 */
function createProvider(name: string): LLMProvider | null {
  try {
    switch (name) {
      case "anthropic": {
        return new AnthropicProvider() as LLMProvider;
      }
      case "openai": {
        return new OpenAIProvider() as LLMProvider;
      }
      default:
        logger.warn({ name }, "Unknown LLM provider");
        return null;
    }
  } catch (error) {
    logger.error({ error, name }, "Failed to create LLM provider");
    return null;
  }
}

/**
 * Get the fallback chain based on the configured primary provider.
 */
function getFallbackChain(): string[] {
  const primary = process.env.AI_PROVIDER ?? "openai";
  const all = ["anthropic", "openai"];
  return [primary, ...all.filter((p) => p !== primary)];
}

let cachedProvider: LLMProvider | null = null;
let cachedProviderName: string | null = null;

/**
 * Get the active LLM provider. Uses circuit breaker with fallback.
 * Throws only if ALL providers are unavailable.
 */
export function getLLMProvider(): LLMProvider {
  const chain = getFallbackChain();

  for (const name of chain) {
    if (isCircuitOpen(name)) {
      logger.debug({ provider: name }, "Circuit open, trying next");
      continue;
    }

    // Use cached provider if it matches
    if (cachedProvider && cachedProviderName === name) {
      return wrapWithCircuitBreaker(cachedProvider, name);
    }

    const provider = createProvider(name);
    if (provider) {
      cachedProvider = provider;
      cachedProviderName = name;
      return wrapWithCircuitBreaker(provider, name);
    }
  }

  throw new Error("No LLM providers available. Check API keys and circuit breaker status.");
}

/**
 * Wrap a provider with circuit breaker logic.
 */
function wrapWithCircuitBreaker(provider: LLMProvider, name: string): LLMProvider {
  return {
    name: provider.name,
    async generateResponse(systemPrompt, messages, options) {
      try {
        const result = await provider.generateResponse(systemPrompt, messages, options);
        recordSuccess(name);
        return result;
      } catch (error) {
        recordFailure(name);
        // Try fallback
        const chain = getFallbackChain();
        const nextIndex = chain.indexOf(name) + 1;
        if (nextIndex < chain.length) {
          const fallbackName = chain[nextIndex]!;
          if (!isCircuitOpen(fallbackName)) {
            logger.warn({ from: name, to: fallbackName }, "Falling back to next provider");
            const fallback = createProvider(fallbackName);
            if (fallback) {
              const result = await fallback.generateResponse(systemPrompt, messages, options);
              recordSuccess(fallbackName);
              return result;
            }
          }
        }
        throw error;
      }
    },
  };
}
