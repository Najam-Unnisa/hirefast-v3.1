# ADR-001: Modular Monolith

## Status

Accepted

## Context

HireFast needs multiple domains (auth, assessments, evaluation, gamification, admin) with a small early team.

## Decision

Ship a modular monolith on Express + TypeScript with feature modules (controller/service/repository), not microservices.

## Consequences

(+) Simpler deploy, transactions, DX  
(−) Requires discipline to keep module boundaries; risk of “big ball of mud” if folders stay empty while features are bolted onto routes
