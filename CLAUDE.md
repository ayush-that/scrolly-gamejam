# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Solana dApp scaffold built with Next.js, providing wallet integration, state management, and example components for building Solana applications. Uses the Solana Wallet Adapter ecosystem for wallet connectivity.

## Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Architecture

### Context Provider Hierarchy

The app wraps all components in a nested context structure (`src/contexts/ContextProvider.tsx`):

```
NetworkConfigurationProvider → AutoConnectProvider → WalletContextProvider
```

- **NetworkConfigurationProvider**: Manages Solana network selection (devnet/testnet/mainnet)
- **AutoConnectProvider**: Handles wallet auto-connect persistence
- **WalletContextProvider**: Sets up Solana wallet adapter with `ConnectionProvider` and `WalletProvider`

### State Management

Uses Zustand with Immer for state management:

- `useNotificationStore` - Toast notification queue
- `useUserSOLBalanceStore` - User's SOL balance tracking

### Path Resolution

TypeScript `baseUrl` is set to `./src`, so imports use absolute paths from src:

```typescript
import { notify } from "utils/notifications"; // resolves to src/utils/notifications
```

### Styling

- Tailwind CSS with JIT mode
- DaisyUI component library with custom "solana" theme defined in `tailwind.config.js`
- Wallet adapter styles imported via `require('@solana/wallet-adapter-react-ui/styles.css')`

### Page/View Pattern

Pages in `src/pages/` are thin wrappers that render corresponding views from `src/views/`. This separates Next.js routing metadata from component logic.
