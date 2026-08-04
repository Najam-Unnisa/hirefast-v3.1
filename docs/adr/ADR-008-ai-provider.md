# ADR-008: AI Provider Abstraction

## Status

Accepted

## Decision

`IAIProvider` + `OpenAIProvider` + `AIService` facade. Business logic must not import OpenAI SDK directly.

## Consequences

(+) Swap/add Gemini/Claude later  
(−) Still need prompt registry, retries, cost controls
