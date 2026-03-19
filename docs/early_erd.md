erDiagram
    USER ||--o{ CREDIT_TRANSACTION : "makes"
    USER ||--o{ SOURCE_IMAGE : "uploads"
    USER ||--o{ GENERATION_JOB : "requests"
    SOURCE_IMAGE ||--o{ GENERATION_JOB : "used_in"
    GENERATION_JOB ||--o{ GENERATED_HEADSHOT : "produces"

    USER {
        string id PK
        string email
        string name
        string provider "Google, LinkedIn"
        int current_credits
        datetime created_at
    }

    CREDIT_TRANSACTION {
        string id PK
        string user_id FK
        int amount "Can be positive (topup) or negative (usage)"
        string transaction_type "Topup, Generation, Refund"
        datetime created_at
    }

    SOURCE_IMAGE {
        string id PK
        string user_id FK
        string file_url
        string file_name
        boolean has_face_detected
        datetime uploaded_at
    }

    GENERATION_JOB {
        string id PK
        string user_id FK
        string source_image_id FK
        string style_prompt "e.g., Corporate Suit, Modern Office"
        string status "Pending, Processing, Completed, Failed"
        int cost_credits
        datetime started_at
        datetime completed_at
    }

    GENERATED_HEADSHOT {
        string id PK
        string generation_job_id FK
        string result_url
        boolean is_deleted
        datetime created_at
    }
