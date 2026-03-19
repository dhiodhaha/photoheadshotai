---
name: prisma-orm
description: Use this skill when working with Prisma ORM. Triggers include mentions of database operations, schema changes, migrations, Prisma queries, model definitions, or database-related tasks. Use for creating services, writing queries, schema design, migrations, and following Prisma best practices.
---

# Prisma ORM Skill

Expert guidance for working with Prisma ORM, covering schema design, migrations, query patterns, and TypeScript integration with PostgreSQL.

## Quick Reference

**Technology Stack:**
- Prisma ORM (v7.3.0+) with new Prisma Client API
- PostgreSQL 15+
- `@prisma/adapter-pg` (native PostgreSQL driver)
- Custom output to `src/generated/prisma`
- SQL-based migrations with Prisma Migrate

**Key Files:**
- `prisma/schema.prisma` - Schema definition (source of truth)
- `prisma.config.ts` - Prisma configuration
- `src/utils/prisma.ts` - Prisma client singleton
- `src/generated/prisma/` - Auto-generated (DO NOT EDIT)

---

## Folder Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma              # Schema definition (source of truth)
│   └── migrations/
│       ├── migration_lock.toml    # Migration state
│       └── YYYYMMDDHHMMSS_description/
│           └── migration.sql      # SQL migration
├── prisma.config.ts               # Prisma configuration
├── src/
│   ├── generated/prisma/          # Auto-generated (DO NOT EDIT)
│   │   ├── client.ts              # PrismaClient export
│   │   ├── enums.ts               # TypeScript enums
│   │   └── models.ts              # Type definitions
│   └── utils/
│       └── prisma.ts              # Prisma client singleton
```

---

## Schema Overview

### Core Patterns

**Models** - Database tables represented as TypeScript types
**Enums** - Predefined value sets for type safety
**Relations** - Foreign key relationships between models

### Example Schema Structure

```prisma
// Enums
enum Role {
  customer
  admin
}

enum PostStatus {
  open
  in_progress
  completed
  closed
}

enum VoteDirection {
  up
  down
}

// Models
model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email     String   @unique
  name      String
  role      Role     @default(customer)
  createdAt DateTime @default(now()) @map("created_at")

  posts    Post[]
  comments Comment[]
  votes    Vote[]

  @@map("users")
}

model Post {
  id          String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String     @db.Uuid @map("user_id")
  title       String
  description String     @db.Text
  status      PostStatus @default(open)
  isFlagged   Boolean    @default(false) @map("is_flagged")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @default(now()) @map("updated_at")

  user     User      @relation(fields: [userId], references: [id])
  comments Comment[]
  votes    Vote[]

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("posts")
}

model Vote {
  id        String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String        @db.Uuid @map("user_id")
  postId    String        @db.Uuid @map("post_id")
  direction VoteDirection
  createdAt DateTime      @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])
  post Post @relation(fields: [postId], references: [id])

  @@unique([userId, postId])
  @@index([userId])
  @@index([postId])
  @@map("votes")
}
```

---

## Configuration

### Schema Configuration (prisma.config.ts)

```typescript
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({
  path: "../../.env",
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

### Prisma Client Setup (src/utils/prisma.ts)

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export { prisma };
```

---

## Naming Conventions

### Database Layer (PostgreSQL)
| Pattern | Example | Note |
|---------|---------|------|
| **Tables** | `snake_case` | `users`, `posts`, `comment_votes` |
| **Columns** | `snake_case` | `user_id`, `created_at`, `is_flagged` |
| **Foreign Keys** | `table_column_fkey` | `posts_user_id_fkey` |
| **Indexes** | `table_column_idx` | `posts_user_id_idx` |
| **Enums** | `PascalCase` | `Role`, `PostStatus` |

### Schema Layer (Prisma)
| Pattern | Example | Note |
|---------|---------|------|
| **Model names** | `PascalCase` | `User`, `Post`, `CommentVote` |
| **Field names** | `camelCase` | `userId`, `categoryId`, `isFlagged` |
| **Enum names** | `PascalCase` | `Role`, `VoteDirection` |
| **Enum values** | `snake_case` | `in_progress`, `status_change` |
| **Map attributes** | `@map("snake_case")` | Maps camelCase to snake_case |

### TypeScript Layer (Generated)
| Pattern | Example | Usage |
|---------|---------|-------|
| **Model types** | `Model` suffix | `UserModel`, `PostModel` |
| **Input types** | `ModelWhereInput`, `ModelCreateInput` | Query/builder types |
| **Enum types** | Same as schema | `Role`, `PostStatus` |

---

## Model Patterns

### Primary Keys
All entities use UUID with PostgreSQL's `gen_random_uuid()`:
```prisma
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
```

### Timestamps
Consistent timestamp pattern:
```prisma
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @default(now()) @map("updated_at")  // Where applicable
```

### Relations
Foreign keys with explicit indexes:
```prisma
userId String @db.Uuid @map("user_id")
user   User   @relation(fields: [userId], references: [id])

@@index([userId])
```

### Table Mapping
Always use `@@map` to ensure snake_case table names:
```prisma
model User {
  // ... fields
  @@map("users")
}
```

---

## Indexes

### Primary Keys
All tables have `PRIMARY KEY` on `id` field (auto-created by `@id`).

### Foreign Key Indexes
Every foreign key has an explicit index for JOIN performance:
```prisma
@@index([userId])
@@index([postId])
```

### Unique Constraints
Composite unique constraints for relationships:
```prisma
@@unique([userId, postId])  // One vote per user per post
```

### Query Indexes
Additional indexes for common query patterns:
```prisma
@@index([status])      // Filter by status
@@index([isFlagged])   // Filter flagged items
@@index([createdAt])   // Sort by date
```

---

## Import Patterns

### Standard Imports

```typescript
// Import the singleton prisma client
import { prisma } from "../../utils/prisma.js";

// Import types from generated models (no extension)
import type { PostWhereInput, PostModel } from "../../generated/prisma/models.js";

// Import enums
import { PostStatus, Role } from "../../generated/prisma/enums.js";
```

**CRITICAL:** Generated files are imported WITHOUT the `.js` extension in the source, even though they exist as `.js` files.

---

## Service Function Patterns

### List (with pagination)
```typescript
export async function listPosts(options: {
  where?: PostWhereInput;
  skip?: number;
  take?: number;
}) {
  const [entities, total] = await Promise.all([
    prisma.post.findMany({
      where: options.where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.count({ where: options.where }),
  ]);

  return { entities, total };
}
```

### Get Single Entity
```typescript
export async function getPost(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      user: true,
      category: true,
      _count: { select: { votes: true, comments: true } },
    },
  });
}
```

### Create Entity
```typescript
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
    },
  });
}
```

### Update Entity
```typescript
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
  });
}
```

### Delete Entity
```typescript
export async function deletePost(id: string) {
  return prisma.post.delete({
    where: { id },
  });
}
```

### Upsert (for votes)
```typescript
export async function upsertVote(data: {
  userId: string;
  postId: string;
  direction: VoteDirection;
}) {
  return prisma.vote.upsert({
    where: {
      userId_postId: {
        userId: data.userId,
        postId: data.postId,
      },
    },
    update: { direction: data.direction },
    create: {
      userId: data.userId,
      postId: data.postId,
      direction: data.direction,
    },
  });
}
```

---

## Query Patterns

### Relations

**Include related data:**
```typescript
const post = await prisma.post.findUnique({
  where: { id },
  include: {
    user: true,
    category: true,
    comments: {
      include: { user: true },
      orderBy: { createdAt: "desc" },
    },
    votes: true,
  },
});
```

**Count relations:**
```typescript
const posts = await prisma.post.findMany({
  include: {
    _count: {
      select: {
        votes: true,
        comments: true,
      },
    },
  },
});
```

**Select specific fields:**
```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

### Filtering

**Compound filters:**
```typescript
const posts = await prisma.post.findMany({
  where: {
    AND: [
      { status: PostStatus.open },
      { isFlagged: false },
      {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      },
    ],
  },
});
```

**Filter by relation:**
```typescript
const posts = await prisma.post.findMany({
  where: {
    category: {
      name: "Feature Request",
    },
    votes: {
      some: {
        direction: VoteDirection.up,
      },
    },
  },
});
```

---

## Transactions

### Multiple Related Writes

```typescript
export async function createPostWithAttachments(data: {
  userId: string;
  title: string;
  description: string;
  attachments: Array<{ url: string; filename: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    // Create post
    const post = await tx.post.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        status: PostStatus.open,
      },
    });

    // Create attachments
    if (data.attachments.length > 0) {
      await tx.attachment.createMany({
        data: data.attachments.map((att) => ({
          postId: post.id,
          url: att.url,
          filename: att.filename,
        })),
      });
    }

    // Return post with attachments
    return tx.post.findUnique({
      where: { id: post.id },
      include: { attachments: true },
    });
  });
}
```

---

## Database Scripts

### Available Commands

```bash
# Generate Prisma Client from schema
pnpm db:generate

# Run migrations in development
pnpm db:migrate

# Create a new migration
pnpm prisma migrate dev --name description_of_change

# Seed the database with test data
pnpm db:seed

# Reset database (WARNING: destructive)
pnpm prisma migrate reset

# View database in Prisma Studio
pnpm prisma studio
```

### Migration Workflow

1. **Update `prisma/schema.prisma`** with changes
2. **Create migration**: `pnpm prisma migrate dev --name add_user_avatar`
3. **Review migration SQL** in `prisma/migrations/` directory
4. **Apply to production**: `pnpm prisma migrate deploy`
5. **Regenerate client**: `pnpm db:generate`

---

## Best Practices

### ✅ DO

1. **Use `@map()` for all fields** to ensure snake_case in database
2. **Add `@@index()` for every foreign key**
3. **Use `@@unique()` for composite constraints**
4. **Import types from generated files**
5. **Use transactions for related operations**
6. **Let Prisma handle connection pooling** via the adapter
7. **Use `_count` for relation counts** (more efficient)
8. **Use `select` to minimize data transfer**
9. **Validate inputs before database operations**
10. **Handle errors appropriately**

### ❌ DON'T

1. **Never edit files in `generated/prisma/`** - regenerate instead
2. **Never use `any` type** for Prisma inputs/outputs
3. **Never write manual SQL migrations** - use `prisma migrate dev`
4. **Never create multiple PrismaClient instances** - use singleton
5. **Never use `select: true` without explicit fields**
6. **Never forget to regenerate client** after schema changes
7. **Never use raw queries without proper typing**
8. **Never hardcode database URLs** - use environment variables
9. **Never spread untrusted input directly**
10. **Never ignore Prisma errors** - they contain important information

---

## Common Prisma Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `P2002` | Unique constraint violation | Check for duplicates before insert |
| `P2003` | Foreign key constraint failed | Ensure referenced entity exists |
| `P2025` | Record not found | Use `findUnique` and handle null |
| `P2016` | Query interpretation error | Check query syntax and types |
| `P2024` | Connection timeout | Check database connectivity |

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Generate client | `pnpm db:generate` |
| Create migration | `pnpm prisma migrate dev --name <n>` |
| Apply migrations | `pnpm db:migrate` |
| Reset database | `pnpm prisma migrate reset` |
| Seed database | `pnpm db:seed` |
| Open Prisma Studio | `pnpm prisma studio` |
| Validate schema | `pnpm prisma validate` |
| Format schema | `pnpm prisma format` |

---

## Conclusion

This skill covers the essential patterns and practices for working with Prisma ORM. Key principles:

1. **Follow naming conventions** - camelCase in schema, snake_case in database
2. **Index foreign keys** - Always add `@@index()` for JOINs
3. **Use type safety** - Import generated types, avoid `any`
4. **Optimize queries** - Use `_count`, `select`, parallel execution
5. **Handle errors** - Check Prisma error codes, provide clear messages
6. **Use transactions** - For related operations that must succeed together
7. **Never edit generated files** - Always regenerate from schema

For more information, refer to https://www.prisma.io/docs/
