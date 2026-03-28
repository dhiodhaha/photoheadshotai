# Workflow Guidelines: Photoheadshot

- **Code Style**:
  - Use TypeScript for all logic.
  - Consistent imports: `#/*` maps to `./src/*`.
  - Prefer using existing components in `src/components/ui`.
- **Formatting & Linting**:
  - Uses Biome for formatting and linting.
  - Run `pnpm lint:fix` before committing.
  - Husky hooks are configured for pre-commit checks.
- **Database**:
  - Always use `prisma generate` after schema changes.
  - Use `prisma db push` for development schema synchronization.
  - Use `prisma migrate dev` for production-ready migrations.
