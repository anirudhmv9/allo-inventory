# Allo Inventory Reservation System

A multi-warehouse inventory reservation platform built using Next.js App Router, Prisma, Supabase PostgreSQL, and Upstash Redis.

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Upstash Redis
- Tailwind CSS
- Zod

## Features

- Multi-warehouse inventory management
- Inventory reservation system
- Redis distributed locking for concurrency safety
- Reservation confirmation and release
- Automatic reservation expiry
- Race-condition-safe stock reservation
- Real-time stock updates

## APIs

### Products
- GET /api/products

### Warehouses
- GET /api/warehouses

### Reservations
- POST /api/reservations
- POST /api/reservations/:id/confirm
- POST /api/reservations/:id/release

## Concurrency Handling

Redis distributed locking is used to prevent overselling during simultaneous reservation requests.

Lock flow:
1. Acquire Redis lock
2. Check inventory availability
3. Create reservation
4. Update reserved units
5. Release lock

This guarantees that only one reservation operation can modify inventory for a product and warehouse at a time.

## Reservation Expiry

Expired reservations are automatically released using a cron endpoint.

## Vercel Deployment Link : https://allo-inventory-ztgm.vercel.app/

## Local Setup

Install dependencies:

```bash
npm install

