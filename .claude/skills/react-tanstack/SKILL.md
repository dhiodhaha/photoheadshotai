---
name: react-tanstack
description: Use this skill when working with React and TanStack Router. Triggers include mentions of React components, routes, hooks, TanStack Router, file-based routing, component patterns, or frontend development tasks. Use for creating components, routes, custom hooks, and following React best practices.
---

# React + TanStack Router Skill

Expert guidance for building React applications with TanStack Router, covering folder structure, naming conventions, component patterns, custom hooks, and styling with tailwind-variants.

## Quick Reference

**Technology Stack:**
- React 18+ with TypeScript
- TanStack Router (file-based routing)
- tailwind-variants for component styling
- Lucide React for icons

**Key Principles:**
- Named exports only (no default exports)
- No file extensions in imports
- Presentational components + custom hooks pattern
- Configuration objects for styling variants
- Barrel exports via `index.ts`

---

## Folder Structure

```
apps/platform/
├── src/
│   ├── components/            # Shared/global components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── layout.tsx
│   │
│   ├── modules/               # Domain-based modules
│   │   ├── posts/
│   │   │   ├── components/    # Post-specific components
│   │   │   │   ├── post-card.tsx
│   │   │   │   ├── post-list.tsx
│   │   │   │   └── post-form.tsx
│   │   │   └── hooks/         # Post-specific hooks
│   │   │       ├── use-posts.ts
│   │   │       ├── use-post-filtering.ts
│   │   │       └── index.ts   # Barrel export
│   │   ├── voting/
│   │   │   ├── components/
│   │   │   │   └── vote-control.tsx
│   │   │   └── hooks/
│   │   │       ├── use-voting.ts
│   │   │       └── index.ts
│   │   └── users/
│   │       ├── components/
│   │       └── hooks/
│   │
│   ├── routes/                # TanStack Router file-based routes
│   │   ├── __root.tsx         # Root layout (wraps all routes)
│   │   ├── index.tsx          # Home page (/)
│   │   ├── posts/
│   │   │   ├── index.tsx      # Posts list (/posts)
│   │   │   ├── $id.tsx        # Post detail (/posts/:id)
│   │   │   ├── $id.edit.tsx   # Edit post (/posts/:id/edit)
│   │   │   └── new.tsx        # New post (/posts/new)
│   │   └── users/
│   │       ├── index.tsx      # Users list (/users)
│   │       └── $id.tsx        # User profile (/users/:id)
│   │
│   ├── lib/                   # Utilities and shared logic
│   │   ├── mock-data.ts       # Mock/seed data
│   │   ├── utils.ts           # Helper functions
│   │   └── constants.ts       # App constants
│   │
│   ├── router.tsx             # Router configuration
│   ├── main.tsx               # App entry point
│   └── styles.css             # Global styles
```

---

## File Naming Conventions

### File Names

| File Type | Convention | Example |
|-----------|------------|---------|
| **Components** | `kebab-case.tsx` | `post-card.tsx`, `vote-control.tsx` |
| **Hooks** | `use-<n>.ts` | `use-posts.ts`, `use-voting.ts` |
| **Routes** | TanStack conventions | `index.tsx`, `$id.tsx`, `$id.edit.tsx` |
| **Utils** | `kebab-case.ts` | `mock-data.ts`, `date-utils.ts` |
| **Barrel exports** | `index.ts` | `hooks/index.ts` |
| **Types** | `kebab-case.ts` | `types.ts`, `post-types.ts` |

### Export Names

| Entity | Convention | Example |
|--------|------------|---------|
| **Components** | `PascalCase` | `PostCard`, `VoteControl` |
| **Hooks** | `camelCase` with `use` prefix | `usePosts`, `useVoting` |
| **Interfaces** | `PascalCase` | `PostCardProps`, `UsePostsReturn` |
| **Types** | `PascalCase` | `SortOption`, `VoteDirection` |
| **Constants** | `SCREAMING_SNAKE_CASE` | `MAX_POSTS`, `DEFAULT_PAGE_SIZE` |

---

## Import/Export Patterns

### Import Rules

**NO file extensions on any imports:**

```typescript
// ✅ Correct - no extensions
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { useState } from "react";

// ❌ Wrong - don't add extensions
import { usePosts } from "../modules/posts/hooks.ts";  // NO
```

### Import Order

```typescript
// 1. React and React-related
import { useState, useCallback, useEffect } from "react";

// 2. Third-party libraries
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

// 3. Absolute imports (from modules)
import { usePosts, usePostFiltering } from "../modules/posts/hooks";
import type { Post, SortOption } from "../modules/posts/hooks";

// 4. Relative imports (siblings/children)
import { VoteControl } from "./vote-control";
import { PostCard } from "./post-card";

// 5. Mock data and utilities
import { mockPosts } from "../../../lib/mock-data";
import { formatDate } from "../../../lib/utils";
```

### Export Patterns

**Always use named exports (never default exports):**

```typescript
// ✅ Correct - named exports
export function PostCard({ post }: PostCardProps) { ... }
export function usePosts() { ... }
export interface Post { ... }
export type SortOption = "recent" | "popular" | "votes";

// ❌ Wrong - default exports
export default function PostCard() { ... }  // NO
export default usePosts;  // NO
```

### Barrel Exports

**Create `index.ts` in module folders to re-export:**

```typescript
// modules/posts/hooks/index.ts

// Export types first
export type { Post, SortOption, FilterOptions } from "./use-posts";
export type { UsePostFilteringReturn } from "./use-post-filtering";

// Then export hooks
export { usePosts } from "./use-posts";
export { usePostFiltering } from "./use-post-filtering";
```

---

## Component Patterns

### Standard Component Pattern

```typescript
// modules/posts/components/post-card.tsx

interface PostCardProps {
  post: {
    id: string;
    title: string;
    description: string;
    author: {
      name: string;
      avatar?: string;
    };
    voteCount: number;
    commentCount: number;
    createdAt: Date;
  };
  onVote?: (direction: "up" | "down") => void;
}

export function PostCard({ post, onVote }: PostCardProps) {
  // Component logic (minimal - delegate to hooks)
  const handleVote = (direction: "up" | "down") => {
    onVote?.(direction);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-lg font-semibold">{post.title}</h3>
      <p className="text-sm text-muted-foreground">{post.description}</p>

      <div className="mt-4 flex items-center gap-4">
        <VoteControl
          voteCount={post.voteCount}
          onVote={handleVote}
        />
        <span className="text-sm text-muted-foreground">
          {post.commentCount} comments
        </span>
      </div>
    </div>
  );
}
```

**Key principles:**
- Props interface with `Props` suffix
- Destructure props in function signature
- Keep logic minimal (delegate to hooks)
- Use optional callbacks with `?` (e.g., `onVote?.(...)`)
- Internal handlers: `handle<Event>` (handleVote, handleClick)
- Callback props: `on<Event>` (onVote, onClick, onChange)

### Configuration Object Pattern

```typescript
// modules/posts/components/status-badge.tsx

const statusConfig = {
  open: {
    label: "Open",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/10 hover:bg-blue-500/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/10 hover:bg-yellow-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/10 text-green-500 border-green-500/10 hover:bg-green-500/20",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/10 hover:bg-gray-500/20",
  },
} as const;

interface StatusBadgeProps {
  status: keyof typeof statusConfig;
  onClick?: () => void;
}

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${config.className}`}
    >
      {config.label}
    </button>
  );
}
```

---

## Custom Hook Patterns

### Standard Hook Pattern

```typescript
// modules/posts/hooks/use-posts.ts

import { useState, useCallback, useMemo } from "react";

// Export types first
export interface Post {
  id: string;
  title: string;
  description: string;
  status: PostStatus;
  voteCount: number;
  commentCount: number;
  createdAt: Date;
}

export type SortOption = "recent" | "popular" | "votes";
export type PostStatus = "open" | "in_progress" | "completed" | "closed";

// Hook options interface
interface UsePostsOptions {
  initialSort?: SortOption;
}

// Hook return interface
interface UsePostsReturn {
  posts: Post[];
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  isLoading: boolean;
  error: Error | null;
}

export function usePosts(options: UsePostsOptions = {}): UsePostsReturn {
  const { initialSort = "recent" } = options;

  const [posts, setPosts] = useState<Post[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "popular":
          return b.commentCount - a.commentCount;
        case "votes":
          return b.voteCount - a.voteCount;
        default:
          return 0;
      }
    });
  }, [posts, sortBy]);

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
  }, []);

  return {
    posts: sortedPosts,
    sortBy,
    setSortBy: handleSortChange,
    isLoading,
    error,
  };
}
```

---

## UI Component Pattern (tailwind-variants)

```typescript
// components/ui/button.tsx

import { tv, type VariantProps } from "tailwind-variants";
import type { ButtonHTMLAttributes } from "react";

const buttonStyles = tv({
  base: "inline-flex items-center justify-center rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground hover:opacity-90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
      outline: "bg-transparent border border-border text-foreground hover:bg-muted",
      ghost: "bg-transparent text-foreground hover:bg-muted",
      destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
    },
    size: {
      sm: "px-3 py-1.5 text-sm h-8",
      md: "px-4 py-2 text-base h-10",
      lg: "px-6 py-3 text-lg h-12",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

export type ButtonProps = VariantProps<typeof buttonStyles> &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean;
  };

export function Button({
  children,
  variant,
  size,
  className,
  isLoading,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="mr-2">Loading...</span>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
```

---

## Route Patterns

### Basic Route

```typescript
// routes/index.tsx

import { createFileRoute } from "@tanstack/react-router";
import { usePosts } from "../modules/posts/hooks";
import { PostList } from "../modules/posts/components/post-list";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { posts, isLoading } = usePosts();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Posts</h1>
      <PostList posts={posts} />
    </div>
  );
}
```

### Route with Params

```typescript
// routes/posts/$id.tsx

import { createFileRoute } from "@tanstack/react-router";
import { usePost } from "../../modules/posts/hooks";
import { PostDetail } from "../../modules/posts/components/post-detail";

export const Route = createFileRoute("/posts/$id")({
  component: PostDetailPage,
});

function PostDetailPage() {
  const { id } = Route.useParams();
  const { post, isLoading, error } = usePost(id);

  if (isLoading) {
    return <div>Loading post...</div>;
  }

  if (error || !post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <PostDetail post={post} />
    </div>
  );
}
```

### Root Layout

```typescript
// routes/__root.tsx

import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />  {/* Child routes render here */}
      </main>
      <Footer />
    </div>
  );
}
```

---

## Best Practices

### ✅ DO

1. **Use kebab-case for all file names**
2. **Use PascalCase for component names**
3. **Use camelCase with `use` prefix for hooks**
4. **Create barrel exports via `index.ts`**
5. **Use TypeScript interfaces for props with `Props` suffix**
6. **Use `handle<Event>` for internal handlers**
7. **Use `on<Event>` for callback props**
8. **Use tailwind-variants for component styling**
9. **Use configuration objects for variant styling**
10. **Keep components presentational (data via props)**
11. **Use custom hooks for business logic**
12. **Use optional chaining for callback props**
13. **Memoize expensive computations**
14. **Use `useCallback` for functions passed as props**
15. **Implement optimistic updates for better UX**

### ❌ DON'T

1. **Never add file extensions to imports**
2. **Never use default exports**
3. **Never mix component logic with data fetching**
4. **Never use `any` type**
5. **Never hardcode styles in JSX**
6. **Never mutate state directly**
7. **Never forget dependencies in hooks**
8. **Never use inline functions for callbacks**
9. **Never access DOM directly (use refs if needed)**
10. **Never use nested ternaries in JSX**

---

## Templates

### Hook Template

```typescript
import { useState, useCallback } from "react";

export interface Entity {
  id: string;
}

interface UseEntityOptions {
  initialValue?: string;
}

interface UseEntityReturn {
  entities: Entity[];
  isLoading: boolean;
  error: Error | null;
}

export function useEntity(options: UseEntityOptions = {}): UseEntityReturn {
  const { initialValue = "" } = options;

  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return {
    entities,
    isLoading,
    error,
  };
}
```

### Component Template

```typescript
interface ComponentNameProps {
  title: string;
  items: Array<{ id: string; name: string }>;
  onItemClick?: (id: string) => void;
}

export function ComponentName({
  title,
  items,
  onItemClick
}: ComponentNameProps) {
  const handleClick = (id: string) => {
    onItemClick?.(id);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="grid gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className="p-2 rounded border hover:bg-muted transition-colors"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Route Template

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useEntity } from "../../modules/<module>/hooks";
import { EntityList } from "../../modules/<module>/components/entity-list";

export const Route = createFileRoute("/<path>")({
  component: PageName,
});

function PageName() {
  const { entities, isLoading, error } = useEntity();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Page Title</h1>
      <EntityList entities={entities} />
    </div>
  );
}
```

---

## Conclusion

This skill covers the essential patterns and practices for building React applications with TanStack Router. Key principles:

1. **File naming** - kebab-case for files, PascalCase for components, camelCase for hooks
2. **No default exports** - Always use named exports
3. **No file extensions** - Never add `.ts` or `.tsx` to imports
4. **Barrel exports** - Use `index.ts` for clean imports
5. **Separation of concerns** - Components render, hooks contain logic
6. **Configuration objects** - For styling variants and mappings
7. **Type safety** - Always define interfaces for props and hook returns
8. **Memoization** - Use `useMemo` and `useCallback` appropriately

For TanStack Router specifics, refer to https://tanstack.com/router/latest/docs/framework/react/overview