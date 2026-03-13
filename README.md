# ScreenCraft

A macOS-first screen recording and lightweight video editing application.

## Architecture

- **Desktop App**: Tauri 2 + React + TypeScript
- **Core Engine**: Rust (project model, command stack, timeline, export)
- **Native Layer**: Swift (ScreenCaptureKit, AVFoundation, CoreAudio)
- **Backend**: Fastify + TypeScript + Postgres + S3
- **Shared Packages**: TypeScript libraries for schemas, types, config

## Prerequisites

- macOS 14+ (Sonoma or later)
- Xcode 15+ with command line tools
- Rust 1.75+ (`rustup`)
- Node.js 20+ 
- pnpm 9+ (`npm install -g pnpm`)
- Docker & Docker Compose (for backend services)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build Rust crates
cargo build

# Run desktop app in dev mode
cd apps/desktop
pnpm tauri dev

# Run backend (requires Docker)
cd apps/share-api
docker compose up -d
pnpm dev
```

## Project Structure

```
apps/desktop          # Tauri 2 desktop application
apps/share-api        # Fastify share/upload backend
packages/project-schema  # Zod schemas for project model
packages/media-types     # Shared media type definitions
packages/config          # Shared constants
crates/project-model     # Rust data model types
crates/core-engine       # Command stack, timeline ops
crates/export-engine     # Export pipeline
crates/job-runner        # Background job queue
native/swift-capture     # Swift ScreenCaptureKit bridge
```

## Development

See each package's README for specific development instructions.

## License

MIT
