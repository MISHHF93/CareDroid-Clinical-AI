# Deployment Guide

## Local Development

Run `npm run dev` for frontend or `npm run dev:fullstack` for the local full-stack helper.

## Validation

Run `npm run lint`, `npm run typecheck:frontend`, `npm run test:run:frontend`, and `npm run build`.

## Backend

Use `npm run backend:build` and backend scripts in `backend/package.json` when validating API changes.

## Notes

Do not commit local secrets. Keep `.env.example` current when adding new environment variables.

