# FrameNe Dashboard

This repository contains the Figma-generated React dashboard, reorganized into a standard Vite + React + TypeScript project structure for local VS Code development.

The original design source is available on [Figma](https://www.figma.com/design/46SKS6fqE7Yqu00WfTx5oz/Family-Management-Dashboard).

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build.
- `npm run preview` previews the production build locally.
- `npm run typecheck` runs TypeScript type checking.

## Project Structure

- `src/app`: application shell, context, and page-level UI
- `src/services/frameNe`: API client wrappers based on `FrameNe_API合约文档.md`
- `src/mocks`: local mock data used to preserve the current design and interactions
- `src/types`: app domain types and backend API contract types
- `src/config`: runtime environment configuration

## API Integration Notes

- The UI still defaults to mock data so the Figma design remains fully runnable out of the box.
- Photos and calendar data now have dedicated API-ready service wrappers.
- Family members, rewards, and tasks remain local mock state because the current backend contract does not define those endpoints yet.
- Set `VITE_USE_MOCK_DATA=false` together with the API variables in `.env` to start pulling supported data from the backend.
