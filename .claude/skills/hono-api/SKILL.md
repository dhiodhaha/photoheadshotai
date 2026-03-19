---
name: hono-api
description: Use this skill when working with the Hono API framework. Triggers include mentions of API routes, endpoints, Hono router, Zod validation, HTTP handlers, middleware, API services, or backend development tasks. Use for creating routes, validation schemas, services, and following API best practices.
---

# Hono API Skill

Expert guidance for building REST APIs with Hono framework, covering folder structure, routing patterns, validation with Zod, service layer design, and TypeScript integration with Prisma.

## Quick Reference

**Technology Stack:**
- Hono (lightweight web framework)
- Zod (schema validation)
- Prisma ORM (database layer)
- TypeScript (type safety)
- @hono/zod-validator (validation middleware)

**Key Principles:**
- Method chaining for routes
- Zod validation for all inputs
- Simple functions for services (no classes)
- Let exceptions bubble up naturally
- snake_case for API responses
- Envelope pattern for responses

---

## Folder Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # SQL migrations
│
├── src/
│   ├── generated/prisma/      # Auto-generated (DO NOT EDIT)
│   │   ├── client.ts
│   │   ├── enums.ts
│   │   └── models.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── cors.ts            # CORS configuration
│   │   └── error-handler.ts   # Global error handling
│   │
│   ├── modules/               # Domain modules
│   │   ├── posts/
│   │   │   ├── router.ts      # Route definitions
│   │   │   ├── schema.ts      # Zod validation schemas
│   │   │   ├── service.ts     # Database operations
│   │   │   ├── actions-schema.ts   # Action-specific schemas (optional)
│   │   │   └── actions-service.ts  # Action-specific services (optional)
│   │   ├── users/
│   │   ├── comments/
│   │   └── voting/
│   │
│   ├── utils/
│   │   ├── prisma.ts          # Prisma client setup
│   │   ├── formatters.ts      # Response formatters
│   │   └── validators.ts      # Custom validators
│   │
│   ├── exceptions.ts          # HTTP exceptions
│   ├── index.ts               # Main entry point
│   └── types.ts               # Shared TypeScript types
```

---

## File Naming Conventions

### File Names

| File Type | Convention | Example |
|-----------|------------|---------|
| **Router** | `router.ts` | `posts/router.ts` |
| **Schema** | `schema.ts` | `posts/schema.ts` |
| **Service** | `service.ts` | `posts/service.ts` |
| **Actions** | `actions-*.ts` | `actions-schema.ts`, `actions-service.ts` |
| **Middleware** | `kebab-case.ts` | `auth.ts`, `error-handler.ts` |

### Function Names (Services)

| Operation | Convention | Example |
|-----------|------------|---------|
| **Get single** | `get<Entity>` | `getPost`, `getUser` |
| **Get multiple** | `list<Entity>` | `listPosts`, `listComments` |
| **Create** | `create<Entity>` | `createPost`, `createComment` |
| **Update** | `update<Entity>` | `updatePost`, `updateUser` |
| **Delete** | `delete<Entity>` | `deletePost`, `deleteComment` |
| **Upsert** | `upsert<Entity>` | `upsertVote` |
| **Custom action** | `<verb><Entity>` | `publishPost`, `flagPost` |

---

## Import/Export Patterns

### Import Rules

**NO file extensions on any imports:**

```typescript
// ✅ Correct - no extensions
import { Hono } from "hono";
import { createPost } from "./service";

// ❌ Wrong - don't add extensions
import { createPost } from "./service.ts";  // NO
```

### Import Order

```typescript
// 1. Third-party packages
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// 2. Generated Prisma types (type-only imports)
import type { PostWhereInput, PostModel } from "../../generated/prisma/models";
import { PostStatus } from "../../generated/prisma/enums";

// 3. Local utilities and types
import type { Context } from "../../types";
import { prisma } from "../../utils/prisma";

// 4. Local module imports (relative paths)
import { createPostSchema, updatePostSchema } from "./schema";
import { createPost, updatePost, getPost } from "./service";

// 5. Exceptions
import { NotFoundError, UnauthorizedError, ForbiddenError } from "../../exceptions";
```

### Export Pattern

**Always use named exports (never default exports):**

```typescript
// ✅ Correct - named exports
export const postsRouter = new Hono<Context>().get(...);
export function getPost(id: string) { ... }
export const createPostSchema = z.object({ ... });

// ❌ Wrong - default exports
export default postsRouter;  // NO
```

---

## Router Pattern (Method Chaining)

### Basic Router

```typescript
// modules/posts/router.ts

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Context } from "../../types";
import { NotFoundError } from "../../exceptions";
import {
  createPostSchema,
  updatePostSchema,
  listPostsQuerySchema
} from "./schema";
import {
  createPost,
  updatePost,
  getPost,
  listPosts,
  deletePost
} from "./service";

export const postsRouter = new Hono<Context>()
  // List posts
  .get("/", zValidator("query", listPostsQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const { posts, total } = await listPosts(query);

    return c.json({
      data: posts.map(formatPost),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        has_more: query.page * query.limit < total,
      },
    });
  })

  // Create post
  .post("/", zValidator("json", createPostSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const body = c.req.valid("json");
    const post = await createPost({
      ...body,
      userId: user.id,
    });

    return c.json({ data: formatPost(post) }, 201);
  })

  // Get single post
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const post = await getPost(id);

    if (!post) throw new NotFoundError("Post");

    return c.json({ data: formatPost(post) });
  })

  // Update post
  .patch("/:id", zValidator("json", updatePostSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const id = c.req.param("id");
    const body = c.req.valid("json");

    const post = await getPost(id);
    if (!post) throw new NotFoundError("Post");

    const isOwner = post.userId === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) throw new ForbiddenError();

    const updated = await updatePost(id, body);
    return c.json({ data: formatPost(updated) });
  })

  // Delete post
  .delete("/:id", async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const id = c.req.param("id");
    const post = await getPost(id);

    if (!post) throw new NotFoundError("Post");

    const isOwner = post.userId === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) throw new ForbiddenError();

    await deletePost(id);
    return c.body(null, 204);
  });
```

---

## Route Handler Pattern (7 Steps)

**Every route handler follows these steps:**

```typescript
router.get("/:id", async (c) => {
  // 1. Get user from context (if authenticated)
  const user = c.get("user");

  // 2. Check authentication if required
  if (!user) throw new UnauthorizedError();

  // 3. Get URL params/query/body
  const id = c.req.param("id");
  const query = c.req.valid("query");  // If using validator
  const body = c.req.valid("json");    // If using validator

  // 4. Fetch data from service
  const post = await getPost(id);

  // 5. Check existence
  if (!post) throw new NotFoundError("Post");

  // 6. Check permissions (if needed)
  const isOwner = post.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) throw new ForbiddenError();

  // 7. Format and return response
  return c.json({ data: formatPost(post) });
});
```

---

## Validation with Zod

### Schema Patterns

```typescript
// modules/posts/schema.ts

import { z } from "zod";

// Create schema
export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().min(1).max(5000),
  category_id: z.string().uuid().optional(),
});

// Update schema (all fields optional)
export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.enum(["open", "in_progress", "completed", "closed"]).optional(),
  is_flagged: z.boolean().optional(),
});

// Query schema (pagination + filters)
export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["open", "in_progress", "completed", "closed"]).optional(),
  category_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort_by: z.enum(["recent", "popular", "votes"]).default("recent"),
});

// Type inference
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
```

### Validation Middleware

```typescript
// Validate JSON body
.post("/", zValidator("json", createPostSchema), async (c) => {
  const body = c.req.valid("json");  // Type-safe!
})

// Validate query parameters
.get("/", zValidator("query", listPostsQuerySchema), async (c) => {
  const query = c.req.valid("query");  // Type-safe!
})

// Validate form data
.post("/upload", zValidator("form", uploadSchema), async (c) => {
  const form = c.req.valid("form");
})

// Validate URL parameters
.get("/:id", zValidator("param", idParamSchema), async (c) => {
  const params = c.req.valid("param");
})
```

---

## Service Pattern

### Basic Service

```typescript
// modules/posts/service.ts

import { prisma } from "../../utils/prisma";
import type { PostWhereInput, PostModel } from "../../generated/prisma/models";
import { PostStatus } from "../../generated/prisma/enums";

// Get single post
export async function getPost(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { votes: true, comments: true } },
    },
  });
}

// List posts with filters
export async function listPosts(options: {
  page: number;
  limit: number;
  status?: string;
  categoryId?: string;
  search?: string;
}) {
  const { page, limit, status, categoryId, search } = options;

  const where: PostWhereInput = {
    AND: [
      status ? { status: status as PostStatus } : {},
      categoryId ? { categoryId } : {},
      search ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {},
    ],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { votes: true, comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total };
}

// Create post
export async function createPost(data: {
  userId: string;
  title: string;
  description: string;
  categoryId?: string;
}) {
  return prisma.post.create({
    data: {
      userId: data.userId,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      status: PostStatus.open,
      isFlagged: false,
    },
    include: {
      user: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });
}

// Update post
export async function updatePost(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    status: PostStatus;
    isFlagged: boolean;
  }>
) {
  return prisma.post.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  });
}

// Delete post
export async function deletePost(id: string) {
  return prisma.post.delete({ where: { id } });
}
```

---

## Response Formatting

### Envelope Pattern

```typescript
// Single item
{
  "data": {
    "id": "uuid",
    "title": "Post title",
    "is_flagged": false
  }
}

// List with pagination
{
  "data": [
    { "id": "uuid", "title": "Post 1" },
    { "id": "uuid", "title": "Post 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "has_more": true
  }
}
```

### Formatter Functions

```typescript
// Format post response (camelCase → snake_case)
function formatPost(post: PostModel & {
  user?: { id: string; name: string };
  category?: { id: string; name: string };
  _count?: { votes: number; comments: number };
}) {
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    status: post.status,
    is_flagged: post.isFlagged,                    // camelCase → snake_case
    vote_count: post._count?.votes ?? 0,           // computed field
    comment_count: post._count?.comments ?? 0,     // computed field
    created_at: post.createdAt.toISOString(),      // Date → ISO string
    updated_at: post.updatedAt.toISOString(),

    author: post.user ? {
      id: post.user.id,
      name: post.user.name,
    } : null,

    category: post.category ? {
      id: post.category.id,
      name: post.category.name,
    } : null,
  };
}
```

### Status Codes

```typescript
// 200 OK - Successful GET/PATCH
return c.json({ data: post });

// 201 Created - Successful POST
return c.json({ data: post }, 201);

// 204 No Content - Successful DELETE
return c.body(null, 204);

// 401 Unauthorized
throw new UnauthorizedError();

// 403 Forbidden
throw new ForbiddenError();

// 404 Not Found
throw new NotFoundError("Post");

// 409 Conflict
throw new ConflictError("Post with this title already exists");

// 422 Unprocessable Entity
throw new ValidationError([
  { field: "title", message: "Title is already taken" }
]);
```

---

## Error Handling

### Available Exceptions

```typescript
// exceptions.ts exports these:

// 401 Unauthorized
throw new UnauthorizedError();

// 403 Forbidden
throw new ForbiddenError();

// 404 Not Found
throw new NotFoundError("Post");

// 409 Conflict
throw new ConflictError();

// 422 Unprocessable Entity
throw new ValidationError([
  { field: "email", message: "Email already exists" }
]);
```

### Error Handling Pattern

**Let exceptions bubble up naturally:**

```typescript
// ✅ CORRECT - Let exceptions propagate
export const postsRouter = new Hono<Context>()
  .get("/:id", async (c) => {
    const post = await getPost(id);
    if (!post) throw new NotFoundError("Post");
    return c.json({ data: post });
  });

// ❌ WRONG - Don't catch at router level
export const postsRouter = new Hono<Context>()
  .get("/:id", async (c) => {
    try {  // NO!
      const post = await getPost(id);
      return c.json({ data: post });
    } catch (error) {
      return c.json({ error: "Failed" }, 500);
    }
  });
```

---

## Best Practices

### ✅ DO

1. **Use method chaining for routers**
2. **Use Zod schemas for ALL input validation**
3. **Import types from generated Prisma**
4. **Use zValidator middleware**
5. **Throw HTTPException for errors**
6. **Use NO extension on local imports**
7. **Return responses in envelope**
8. **Use 201 for creation, 204 for deletion**
9. **Use snake_case in API responses**
10. **Use simple functions for services**
11. **Let exceptions bubble up**
12. **Use Promise.all for parallel queries**
13. **Format responses consistently**
14. **Check permissions after fetching**
15. **Use type inference from Zod**

### ❌ DON'T

1. **Never use `any` type**
2. **Never create class-based services**
3. **Never use manual validation**
4. **Never wrap service calls in try-catch at router level**
5. **Never use console.log for errors**
6. **Never return raw database objects**
7. **Never add file extensions to imports**
8. **Never use default exports**
9. **Never skip input validation**
10. **Never return different response shapes**

---

## Templates

### Router Template

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Context } from "../../types";
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError
} from "../../exceptions";
import { createSchema, updateSchema, listQuerySchema } from "./schema";
import { create, update, get, list, del } from "./service";

export const router = new Hono<Context>()
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const { items, total } = await list(query);

    return c.json({
      data: items.map(format),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        has_more: query.page * query.limit < total,
      },
    });
  })

  .post("/", zValidator("json", createSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const body = c.req.valid("json");
    const item = await create({ ...body, userId: user.id });

    return c.json({ data: format(item) }, 201);
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const item = await get(id);

    if (!item) throw new NotFoundError("Resource");

    return c.json({ data: format(item) });
  })

  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const id = c.req.param("id");
    const body = c.req.valid("json");

    const item = await get(id);
    if (!item) throw new NotFoundError("Resource");

    if (item.userId !== user.id) throw new ForbiddenError();

    const updated = await update(id, body);
    return c.json({ data: format(updated) });
  })

  .delete("/:id", async (c) => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();

    const id = c.req.param("id");
    const item = await get(id);

    if (!item) throw new NotFoundError("Resource");
    if (item.userId !== user.id) throw new ForbiddenError();

    await del(id);
    return c.body(null, 204);
  });

function format(item: any) {
  return {
    id: item.id,
    created_at: item.createdAt.toISOString(),
  };
}
```

### Service Template

```typescript
import { prisma } from "../../utils/prisma";
import type { WhereInput } from "../../generated/prisma/models";

export async function get(id: string) {
  return prisma.entity.findUnique({
    where: { id },
    include: {
      // relations
    },
  });
}

export async function list(options: {
  page: number;
  limit: number;
}) {
  const { page, limit } = options;
  const where: WhereInput = {};

  const [items, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.entity.count({ where }),
  ]);

  return { items, total };
}

export async function create(data: {
  userId: string;
  name: string;
}) {
  return prisma.entity.create({
    data,
  });
}

export async function update(id: string, data: Partial<{
  name: string;
}>) {
  return prisma.entity.update({
    where: { id },
    data,
  });
}

export async function del(id: string) {
  return prisma.entity.delete({ where: { id } });
}
```

### Schema Template

```typescript
import { z } from "zod";

export const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
```

---

## Conclusion

This skill covers the essential patterns and practices for building REST APIs with Hono. Key principles:

1. **Method chaining** - Clean, fluent router definitions
2. **Zod validation** - Type-safe input validation for all endpoints
3. **Simple functions** - No classes, pure service functions
4. **Type safety** - Import Prisma types, never use `any`
5. **Error handling** - Let exceptions bubble up naturally
6. **Response format** - Consistent envelope with snake_case
7. **7-step handler** - Structured approach to route handlers
8. **NO extensions** - Import without `.ts` extensions

For Hono specifics, refer to https://hono.dev/docs/