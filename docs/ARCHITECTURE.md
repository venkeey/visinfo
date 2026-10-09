# VisInfo Architecture Documentation

**Version:** 1.0
**Last Updated:** November 2025
**Status:** Production Architecture (Origin Branch)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architectural Principles](#architectural-principles)
4. [Core Components](#core-components)
5. [Data Architecture](#data-architecture)
6. [AI System Architecture](#ai-system-architecture)
7. [Communication Patterns](#communication-patterns)
8. [Processing Pipeline](#processing-pipeline)
9. [Security Architecture](#security-architecture)
10. [Scalability Design](#scalability-design)
11. [Performance Optimization](#performance-optimization)
12. [Fault Tolerance](#fault-tolerance)
13. [Deployment Architecture](#deployment-architecture)
14. [Design Decisions & Trade-offs](#design-decisions--trade-offs)

---

## Concrete Example: The Core Problem We Solve

**The Challenge:**

A product manager asks 500 users: **"What feature should we implement next?"**

Responses received:
- "implement dark mode"
- "dark mode"
- "night theme"
- "improve the processing"
- "faster load times"
- "dark theme please"
- "better performance"
- "add notifications"
- "push notifications feature"
- "black background option"
- ...490 more responses

**Without VisInfo:** Read 500 responses manually, create spreadsheets, manually categorize, lose nuance, spend hours.

**With VisInfo:** Automatic hierarchical analysis in 5 minutes:

```
📊 Results (500 responses):
├─ 44% User Experience Improvements (220 people)
│  └─ Visual/UI Features
│     ├─ 35% Dark Mode Theme (175 people)
│     │  └─ "implement dark mode", "night theme", "black background", etc.
│     └─ 9% Other UI Improvements (45 people)
│
├─ 26% Performance & Quality (130 people)
│  ├─ 20% Performance Improvements (100 people)
│  │  └─ "improve the processing", "faster load times", "speed up app"
│  └─ 6% Bug Fixes (30 people)
│
├─ 26% Feature Additions (130 people)
│  ├─ 16% Notifications (80 people)
│  └─ 10% Offline Mode (50 people)
│
└─ 4% Other (20 people)
```

**Key Insight:** Dark mode is the clear #1 priority (35% of all responses), despite being expressed in dozens of different ways.

**This is what VisInfo's architecture enables:** Automatic semantic understanding and hierarchical organization of open-ended responses at scale.

---

## Executive Summary

VisInfo is an AI-powered polling platform that organizes free-form responses into hierarchical categories using semantic analysis, transforming fragmented feedback into structured, actionable insights. The architecture is designed around five key pillars:

1. **Separation of Concerns** - Clear boundaries between presentation, business logic, and data access
2. **Asynchronous Processing** - Long-running AI operations don't block user interactions
3. **Real-time Communication** - Users receive live updates on processing status
4. **Provider Flexibility** - Ability to use multiple AI providers with seamless switching
5. **Production Readiness** - Built for scale, reliability, and maintainability from day one

The system handles three primary workflows:
- **Poll Creation** - Users define questions and configure poll settings
- **Response Collection** - Participants submit their answers
- **AI Processing** - System automatically organizes responses into explorable categories

**Concrete Workflow Example:**
1. Product manager creates poll: "What feature should we implement next?"
2. 500 users respond over 24 hours with varied suggestions
3. Poll closes, AI processing begins automatically
4. System generates embeddings for all 500 responses
5. Clustering algorithm groups similar responses (e.g., "dark mode" + "night theme" → same cluster)
6. Hierarchy builder creates multi-level tree structure
7. AI generates labels for each cluster ("Dark Mode Theme", "Performance Improvements", etc.)
8. Product manager views organized results showing 35% want dark mode
9. Decision made with confidence based on clear data

---

## System Overview

### High-Level Architecture

The VisInfo system follows a **three-tier architecture** with additional asynchronous processing capabilities:

**Tier 1: Presentation Layer**
- Flutter-based cross-platform frontend
- Runs on web browsers, iOS, and Android devices
- Handles user interface, input validation, and local state management
- Communicates with backend via REST API and WebSocket connections

**Tier 2: Application Layer**
- Node.js backend server running Express framework
- Manages business logic, request processing, and orchestration
- Enforces security policies and access control
- Coordinates between synchronous API requests and asynchronous background jobs

**Tier 3: Data Layer**
- PostgreSQL relational database for structured data
- Redis in-memory data store for job queues and caching
- AI provider APIs (OpenAI, Gemini, OpenRouter) for machine learning operations

**Additional Components:**
- Background job processing system for time-intensive operations
- WebSocket server for real-time bidirectional communication
- Multiple AI service providers with automatic fallback

### System Boundaries

**Internal Systems:**
- Frontend application
- Backend API server
- Background job workers
- Database systems
- WebSocket server

**External Dependencies:**
- AI provider APIs (OpenAI, Google Gemini, OpenRouter)
- Client web browsers and mobile devices
- Deployment infrastructure (servers, load balancers, CDN)

---

## Architectural Principles

### 1. Layered Architecture

The system implements strict layer separation to maintain code organization and enable independent evolution:

**Presentation Layer Responsibilities:**
- Render user interfaces
- Handle user input and interactions
- Validate input before sending to server
- Display data received from backend
- Manage client-side routing and navigation

**Business Logic Layer Responsibilities:**
- Implement application rules and workflows
- Coordinate between different services
- Transform data between formats
- Make decisions based on business requirements
- Orchestrate complex multi-step operations

**Data Access Layer Responsibilities:**
- Execute database queries
- Manage database connections and transactions
- Transform database records into application objects
- Handle data persistence and retrieval
- Isolate database implementation details from business logic

**Each layer only communicates with adjacent layers**, preventing tight coupling and making the system easier to test and modify.

### 2. Asynchronous Processing Pattern

Time-intensive operations are decoupled from user requests using a job queue system:

**Why Asynchronous?**
- AI processing for large numbers of responses can take minutes
- Users shouldn't wait for long operations to complete
- System can continue accepting new requests while processing old ones
- Failed jobs can be retried without user intervention
- Processing load can be distributed across multiple worker machines

**How It Works:**
1. User action triggers quick database save operation
2. System immediately returns success response to user
3. Background job is created and added to queue
4. User receives real-time progress updates via WebSocket
5. Worker processes job when resources are available
6. Results are saved to database
7. User is notified of completion

### 3. Repository Pattern

Data access is abstracted through repository classes that provide a clean interface:

**Benefits:**
- Business logic doesn't know about SQL or database specifics
- Easy to switch database implementations if needed
- Queries can be optimized in one place
- Testing is simpler with mock repositories
- Consistent data access patterns across the application

**Repository Responsibilities:**
- Encapsulate all database operations for a specific entity
- Provide high-level methods like "findActivePollsByUser"
- Handle query construction and parameter binding
- Transform raw database rows into application objects
- Manage transactions when operations span multiple tables

### 4. Provider Pattern for AI Services

AI functionality uses a provider abstraction with multiple implementations:

**Design Goals:**
- Support multiple AI vendors (OpenAI, Gemini, OpenRouter)
- Easy to add new providers without changing business logic
- Automatic fallback if primary provider fails
- Consistent interface regardless of underlying provider
- Provider-specific optimizations remain hidden

**Provider Components:**
- **Base Provider** - Defines common interface and shared behavior
- **Concrete Providers** - Implement vendor-specific API calls
- **Factory** - Creates appropriate provider based on configuration
- **Configuration** - Manages API keys and provider settings

### 5. Error Handling Strategy

Errors are handled at multiple levels with appropriate responses:

**Validation Errors:**
- Caught at API layer before reaching business logic
- Return specific error messages about what's wrong
- HTTP 400 status code indicates client error

**Business Logic Errors:**
- Thrown when rules are violated
- Converted to appropriate HTTP responses
- HTTP 422 for unprocessable requests

**System Errors:**
- Database connection failures, AI API timeouts, etc.
- Logged for investigation
- Generic error message shown to user (security)
- HTTP 500 indicates server-side problem

**Retry Strategy:**
- Transient errors (timeouts, rate limits) trigger automatic retry
- Exponential backoff prevents overwhelming services
- Maximum retry attempts prevent infinite loops

---

## Core Components

### Frontend Application

**Technology Foundation:**
- Built with Flutter framework for cross-platform consistency
- Single codebase compiles to web, iOS, and Android
- Uses shadcn_ui component library for consistent design
- Provider pattern for state management across app
- go_router for declarative navigation

**Screen Organization:**

**Home Screen / Dashboard:**
- Displays list of all user's polls
- Shows key metrics: response count, status, creation date
- Provides filtering capabilities: by status, by date, by response count
- Quick action buttons for common operations
- Search functionality to find specific polls

**Poll Creation Wizard:**
- Step 1: Question input with AI-powered quality analysis
- Step 2: Configure poll settings and response types (planned)
- Step 3: Preview poll before publishing (planned)
- Progress indicator shows current step
- Can save as draft and return later

**Response Submission Screen (planned):**
- Public-facing screen for poll participants
- Shows poll title, description, and question
- Renders appropriate input based on poll type
- Validates responses before submission
- Shows confirmation after successful submission

**Results View (planned):**
- Interactive hierarchical tree visualization
- Breadcrumb navigation for drilling down
- Category cards with counts and percentages
- Confidence indicators for AI classifications
- Ability to view raw responses at any level

**State Management:**
- Local state for UI interactions (form inputs, toggles)
- Provider for shared state across widgets
- API service singleton for backend communication
- Models for type-safe data structures

### Backend API Server

**Server Initialization:**
The server follows a structured bootstrap sequence to ensure all components are ready:

1. **Configuration Validation** - Verify all required environment variables are present
2. **Database Connection** - Establish connection pool to PostgreSQL
3. **Redis Connection** - Connect to Redis for job queue
4. **HTTP Server Creation** - Initialize Express application
5. **WebSocket Setup** - Attach Socket.IO to HTTP server
6. **Worker Startup** - Begin background job processing
7. **Server Listening** - Start accepting HTTP requests

**Request Processing Flow:**

**Phase 1: Reception**
- Request arrives at Express server
- Middleware chain begins execution
- CORS validation ensures request is from allowed origin
- Security headers are added to response

**Phase 2: Authentication**
- API key (if required) is extracted from header
- Key is validated against stored credentials
- User context is attached to request object

**Phase 3: Validation**
- Request body is validated against schema
- Data types, required fields, and formats are checked
- Validation errors result in immediate 400 response
- Valid data proceeds to controller

**Phase 4: Business Logic**
- Controller receives validated request
- Extracts parameters and calls appropriate service
- Service implements business rules and logic
- Service may call multiple repositories
- Results are formatted for response

**Phase 5: Response**
- Success data or error information is serialized to JSON
- Appropriate HTTP status code is set
- Response is sent back to client
- Request lifecycle ends

**Middleware Stack:**

**Security Middleware:**
- Helmet adds security headers (XSS protection, clickjacking prevention)
- CORS configuration allows frontend domain
- Rate limiter prevents abuse by limiting requests per IP
- API key validator enforces authentication when enabled

**Functional Middleware:**
- Body parser converts JSON request bodies to JavaScript objects
- Error handler catches unhandled errors and formats responses
- Request logger records incoming requests for debugging
- Compression reduces response size for faster transmission

### Controller Layer

Controllers are the entry point for API requests and have specific responsibilities:

**Primary Responsibilities:**
- Handle HTTP request and response objects
- Extract parameters from URL, query string, and body
- Call validation middleware with appropriate schemas
- Invoke service methods with extracted parameters
- Format service results into HTTP responses
- Set appropriate status codes and headers
- Handle controller-specific errors

**Controller Design:**
- One controller per resource type (Poll, Response, etc.)
- Methods correspond to HTTP verbs (GET, POST, PUT, DELETE)
- Thin layer - minimal logic, delegates to services
- Returns data or throws errors - doesn't handle errors
- Documented with clear parameter descriptions

### Service Layer

Services contain the core business logic of the application:

**Service Responsibilities:**
- Implement business rules and workflows
- Coordinate between multiple repositories
- Make business decisions based on application state
- Transform data between formats
- Trigger background jobs when needed
- Emit events for real-time updates

**Example Service Patterns:**

**Poll Service:**
- Validates poll configuration meets business requirements
- Checks user permissions for poll operations
- Manages poll lifecycle transitions (draft → active → closed)
- Coordinates with response service for statistics
- Triggers processing jobs when poll receives responses

**Processing Orchestrator Service:**
- Coordinates the full AI processing pipeline
- Manages workflow across multiple AI services
- Tracks processing progress and updates status
- Handles errors and retry logic
- Emits WebSocket events for real-time updates

**Service Design Principles:**
- Services are stateless - don't store data between calls
- Each service focuses on one domain area
- Services can call other services when needed
- Complex operations are broken into smaller methods
- All database access goes through repositories

### Repository Layer

Repositories provide abstraction over database operations:

**Repository Pattern Benefits:**
- Business logic is decoupled from data persistence
- Database implementation can change without affecting services
- Common query patterns are centralized
- Testing is easier with mock repositories
- Type safety ensures correct data structures

**Repository Responsibilities:**
- Execute SQL queries against PostgreSQL
- Use parameterized queries to prevent SQL injection
- Transform database rows into application objects
- Handle connection pooling and transaction management
- Provide intuitive method names like "findByStatus"

**Poll Repository Examples:**

**findById:**
- Takes poll identifier as parameter
- Executes SELECT query with WHERE clause
- Returns poll object or null if not found
- Includes related data if needed (joins)

**findByUserId:**
- Takes user identifier and optional filters
- Constructs dynamic query based on filters
- Orders results appropriately
- Returns array of poll objects

**update:**
- Takes poll object with changes
- Builds UPDATE query
- Uses WHERE clause to target specific record
- Returns updated poll object

**Common Repository Patterns:**
- Find methods return single object or null
- Search methods return arrays
- Create methods return newly created object with generated ID
- Update methods return updated object
- Delete methods return boolean success indicator

### Background Job System

Long-running operations are processed asynchronously using Bull job queue:

**Job Queue Architecture:**

**Queue:**
- Named queue for specific job type (poll-processing)
- Stored in Redis for persistence and distribution
- Jobs can have priority levels
- Failed jobs are automatically retried

**Job:**
- Data payload describing work to be done
- Metadata: creation time, attempts, priority
- Status tracking: waiting, active, completed, failed
- Progress reporting capabilities

**Worker:**
- Process that continuously checks queue for jobs
- Pulls next job when available
- Executes job logic
- Updates job status and progress
- Moves completed jobs to completed set

**Job Processing Flow:**

1. **Job Creation** - API endpoint adds job to queue with poll identifier
2. **Queue Storage** - Job is persisted in Redis with status "waiting"
3. **Worker Pickup** - Worker process detects waiting job and claims it
4. **Status Update** - Job status changes to "active"
5. **Processing** - Worker executes job logic with progress updates
6. **Completion** - Results are saved, job marked as "completed"
7. **Cleanup** - Completed jobs are retained briefly for debugging

**Retry Mechanism:**
- Failed jobs automatically retry after delay
- Exponential backoff increases delay between retries
- Maximum retry attempts prevents infinite loops
- Different error types can have different retry strategies
- Jobs that exceed retry limit are moved to failed set

**Job Priority:**
- Higher priority jobs are processed first
- Can upgrade job priority if needed
- Useful for time-sensitive operations
- Prevents low priority jobs from blocking important work

### WebSocket Server

Real-time bidirectional communication is handled by Socket.IO:

**Why WebSocket?**
- HTTP is request/response - client must ask for updates
- WebSocket maintains persistent connection
- Server can push updates to client immediately
- Lower latency than polling
- More efficient than repeated HTTP requests

**Connection Lifecycle:**

**Connection Establishment:**
1. Client initiates WebSocket connection to server
2. Server accepts connection and assigns unique socket ID
3. Client subscribes to specific channels (rooms)
4. Server confirms subscription

**Communication:**
- Server emits events to specific channels
- All clients subscribed to channel receive event
- Clients can emit events back to server
- Server can broadcast to all connected clients

**Disconnection:**
- Client closes browser/app or loses internet
- Server detects disconnection and cleans up resources
- Client automatically reconnects when possible
- State is restored after reconnection

**Room-Based Communication:**

**Poll Room:**
- Each poll has its own room
- Clients join room when viewing that poll
- Processing updates sent only to poll's room
- New responses trigger room notification

**User Room:**
- Each user has personal room
- Notifications go to user's room
- User receives updates from all their polls

**Global Room:**
- System-wide announcements
- Maintenance notifications
- Critical updates

**Event Types:**

**processing-update:**
- Sent during AI processing
- Contains progress percentage
- Includes current stage description
- Shows estimated time remaining

**response-added:**
- Notification when new response submitted
- Updates response count
- Can trigger UI refresh

**processing-complete:**
- Sent when AI processing finishes
- Signals results are ready to view
- Includes summary statistics

**error-notification:**
- Sent when processing fails
- Explains what went wrong
- Provides next steps for user

---

## Data Architecture

### Database Choice: PostgreSQL

**Why PostgreSQL over MongoDB?**

**Relational Structure:**
- Poll data has clear relationships (polls → responses → hierarchy nodes)
- JOINs efficiently combine data from multiple tables
- Foreign keys enforce referential integrity
- ACID guarantees ensure data consistency

**Query Capabilities:**
- Complex analytical queries with aggregations
- Recursive Common Table Expressions (CTEs) for hierarchies
- Window functions for ranking and analytics
- Full-text search capabilities
- JSON support when needed for flexibility

**Maturity and Tooling:**
- Decades of production use
- Excellent monitoring and optimization tools
- Wide ecosystem of extensions
- Strong community and documentation

**Scalability:**
- Read replicas for scaling read operations
- Partitioning for large tables
- Connection pooling for efficiency
- Proven at massive scale

### Database Schema Design

**Polls Table:**
- Stores poll configuration and metadata
- Unique identifier for each poll
- Foreign key to user who created it
- JSON column for flexible settings
- Status column tracks lifecycle state
- Timestamps for creation and updates
- Cached counts for performance

**Responses Table:**
- Stores individual poll responses
- Foreign key to poll
- Optional foreign key to respondent user
- Text fields for multiple choice selections
- Text field for free-form response
- JSON column for AI classification data
- Array column for embedding vector
- Timestamp for submission time

**Users Table:**
- Stores user account information
- Unique email address
- Hashed password (never plain text)
- Profile information
- Account status flags
- Timestamps for creation and last login

**Processing Jobs Table:**
- Tracks AI processing jobs
- Foreign key to poll being processed
- Status field (pending, processing, completed, failed)
- Progress information
- Error messages if failed
- Timestamps for job lifecycle

**Hierarchy Nodes Table (Future):**
- Stores classification tree structure
- Foreign key to poll
- Parent node reference for tree structure
- Level in hierarchy (1, 2, 3, 4)
- Node label
- Count of responses in subtree
- Confidence score
- Array column for centroid embedding

### Connection Pooling

**Why Connection Pooling?**
- Creating new database connection is expensive
- Most connections are idle most of the time
- Limited number of connections supported by database
- Pooling reuses connections efficiently

**Pool Configuration:**
- Maximum connections limit prevents overload
- Idle timeout closes unused connections
- Connection timeout prevents waiting forever
- Pool sizes tuned based on load testing

**Connection Lifecycle:**
1. Application needs to query database
2. Pool provides available connection
3. Query is executed
4. Connection is returned to pool
5. Connection remains open for reuse

### Redis Data Store

**Redis Usage:**

**Job Queue Storage:**
- Active jobs stored as sorted sets (by priority and timestamp)
- Completed jobs stored for debugging
- Failed jobs stored for investigation
- Job metadata stored as hashes

**Caching (Future):**
- Frequently accessed data cached in Redis
- Reduces database load
- Provides sub-millisecond response times
- Automatic expiration of stale data

**Rate Limiting:**
- Track request counts per IP address
- Time-windowed counters
- Atomic increment operations
- Fast enough to check on every request

**Session Storage (Future):**
- User session data
- Shopping cart equivalents
- Temporary user preferences

**Redis vs PostgreSQL:**
- Redis is in-memory: extremely fast but limited by RAM
- PostgreSQL is on-disk: slower but handles large datasets
- Redis is key-value: simple queries only
- PostgreSQL is relational: complex queries and joins
- Use Redis for temporary, fast-access data
- Use PostgreSQL for permanent, complex data

---

## AI System Architecture

### Provider Abstraction Layer

**Architecture Goal:**
Support multiple AI service providers interchangeably without coupling business logic to any specific vendor.

**Provider Interface:**
All providers implement the same interface, defining methods for:
- Generating single text embedding
- Generating batch of text embeddings
- Generating chat completions for labeling
- Handling errors and timeouts
- Reporting usage and costs

**Base Provider Class:**
Shared implementation of common functionality:
- Retry logic with exponential backoff
- Rate limiting to respect API quotas
- Request timeout handling
- Error classification and handling
- Usage tracking and logging

**Concrete Provider Implementations:**

**OpenAI Provider:**
- Uses official OpenAI JavaScript SDK
- Supports text-embedding-3-small and text-embedding-3-large models
- Implements batch optimization
- Handles OpenAI-specific errors
- Tracks token usage

**Gemini Provider:**
- Uses Google Generative AI SDK
- Supports embedding-001 model
- Free tier friendly
- Handles Gemini-specific response format
- Tracks API quota usage

**OpenRouter Provider:**
- Universal provider that routes to multiple backends
- Flexible model selection
- Unified billing across providers
- Implements OpenRouter-specific headers
- Handles provider fallback internally

**Provider Selection:**
- Configuration file specifies primary provider
- Environment variable can override at runtime
- Factory pattern creates appropriate provider instance
- Single point of change if provider needs to switch
- Testing uses mock provider implementation

### Embedding Service

**Purpose:**
Generate semantic vector representations of text for similarity comparison.

**What is an Embedding?**
- Numerical vector (array of numbers) representing text meaning
- Similar texts have similar vectors
- Typical dimensions: 768, 1536, or 3072 numbers
- Generated by trained neural networks
- Captures semantic meaning, not just keywords

**Why Embeddings?**
- "dark mode" and "night theme" have different words but similar meaning
- Traditional keyword matching would miss this similarity
- Embeddings capture semantic relationships
- Enable intelligent grouping of responses
- Foundation for clustering algorithm

**Batch Processing Strategy:**

**Why Batching?**
- Individual API calls have overhead
- Most providers support batch requests
- Significant cost savings with batches
- Faster overall processing time
- Better utilization of network bandwidth

**Batch Processing Flow:**
1. Collect all texts that need embeddings
2. Split into batches of configured size (typically 100 texts)
3. Process batches in parallel or sequentially based on configuration
4. Handle failures and retries per batch
5. Combine results back into single array
6. Return embeddings in same order as input texts

**Parallel vs Sequential:**
- Parallel: Process multiple batches simultaneously, faster but uses more resources
- Sequential: Process one batch at a time, slower but more reliable
- Configuration option allows choice based on situation
- Parallel used for large datasets when speed critical
- Sequential used when rate limits are concern

**Error Handling:**
- Failed batches are retried independently
- Partial failures don't lose completed work
- Exponential backoff between retries
- Different error types handled differently:
  - Rate limit errors: wait and retry
  - Timeout errors: retry with longer timeout
  - Invalid input errors: skip and log
  - Service unavailable: retry with backoff

**Caching Strategy (Future):**
- Store embeddings in database with response
- If same text appears again, use cached embedding
- Significant cost savings on repeated text
- Faster processing without API call
- Cache key based on text and model version

### Labeling Service

**Purpose:**
Generate human-readable labels for clusters of similar responses.

**The Challenge:**
- AI clustering creates groups of similar responses
- Each group needs a descriptive name
- Can't use first response as label (may not be representative)
- Manual labeling doesn't scale
- Need concise, accurate, descriptive labels

**Labeling Approaches:**

**Most Common Response:**
- Simple approach: use most frequent response in cluster as label
- Pros: Fast, no API calls needed, guaranteed to be actual response
- Cons: May not be most representative, limited to existing text

**AI-Generated Labels:**
- Use chat model (GPT-4, Gemini) to generate label from responses
- Provide responses and context as prompt
- Model generates concise descriptive label
- Pros: Better quality, can synthesize across responses
- Cons: Additional API cost, slower

**Hybrid Approach:**
- Start with most common response
- Use AI to refine and shorten if needed
- Best balance of speed and quality
- Used in current implementation

**Label Generation Process (Concrete Example):**

**Input:** Cluster of 175 responses about dark mode:
- "implement dark mode"
- "dark mode"
- "night theme"
- "black background option"
- "dark theme please"
- "I want a dark mode feature"
- ...169 more similar responses

**Process:**
1. Collect representative responses from cluster
2. Prepare prompt with context and responses
3. Send to chat model API
4. Parse and validate generated label
5. Ensure label meets length and format requirements
6. Store label with cluster metadata

**Label Quality Criteria:**
- Descriptive: Clearly indicates cluster content
- Concise: Short enough for UI display (typically under 50 characters)
- Accurate: Represents majority of responses in cluster
- Distinct: Differentiable from other cluster labels
- Professional: Appropriate language and tone

### Similarity Detection

**Core Concept:**
Determine how similar two text responses are based on their semantic meaning.

**Concrete Example from Feature Request Poll:**

After generating embeddings, we calculate similarity between all pairs:

```
Response A: "implement dark mode"     → [0.234, -0.567, 0.123, ..., 0.891]
Response B: "dark mode"               → [0.231, -0.571, 0.119, ..., 0.887]
Response C: "night theme"             → [0.229, -0.565, 0.127, ..., 0.893]
Response D: "improve the processing"  → [-0.445, 0.223, 0.667, ..., -0.123]

Similarity Scores:
A ↔ B: 0.98 (nearly identical - same cluster)
A ↔ C: 0.92 (very similar - same cluster)
A ↔ D: 0.15 (unrelated - different clusters)
B ↔ C: 0.94 (very similar - same cluster)
```

Result: A, B, and C form one cluster (dark mode requests), D goes to different cluster (performance requests).

**Cosine Similarity:**
Mathematical measure of similarity between two vectors:
- Calculate dot product of the two vectors
- Divide by product of vector magnitudes
- Result is value between -1 and 1
- 1 means identical, 0 means unrelated, -1 means opposite
- Typically only use positive values (0 to 1)

**Why Cosine Similarity?**
- Efficient to calculate
- Normalizes for vector length
- Well-established in natural language processing
- Performs well for high-dimensional vectors
- Scale-independent

**Similarity Threshold:**
- Configurable value (typically 0.75)
- Responses above threshold considered similar
- Lower threshold: more responses grouped together, larger clusters
- Higher threshold: stricter grouping, more clusters
- Tuned based on domain and use case

**Applications:**

**Finding Similar Responses:**
- Given one response, find all similar ones
- Calculate similarity with all other responses
- Sort by similarity score
- Return top K most similar

**Deduplication:**
- Identify nearly identical responses
- Use very high similarity threshold (0.95+)
- Merge duplicates to avoid redundancy

**Cluster Validation:**
- Ensure all responses in cluster are sufficiently similar
- Calculate pairwise similarities within cluster
- Flag clusters with low average similarity
- Helps identify miscategorizations

### Retry Logic and Rate Limiting

**Retry Strategy:**

**When to Retry:**
- Network timeout errors
- API rate limit errors (429 status)
- Temporary service unavailable (503 status)
- Connection reset errors
- Gateway timeout errors

**When NOT to Retry:**
- Invalid API key (401 status)
- Malformed request (400 status)
- Content policy violation
- Invalid model specified
- Permanent service errors

**Exponential Backoff:**
- First retry: wait 1 second
- Second retry: wait 2 seconds
- Third retry: wait 4 seconds
- Fourth retry: wait 8 seconds
- Prevents overwhelming failing service
- Gives service time to recover

**Jitter:**
- Add random variation to wait time
- Prevents thundering herd problem
- Multiple clients don't retry simultaneously
- Distributes retry load over time

**Rate Limiting:**

**Why Rate Limiting Needed:**
- AI providers have request quotas
- Exceeding quota results in blocked requests
- Cost per request motivates conservation
- Fair usage for all API consumers

**Rate Limiter Implementation:**
- Track requests per time window
- Window typically 1 minute or 1 hour
- When limit reached, queue requests
- Process queued requests when window resets
- Prevents exceeded quota errors

**Provider-Specific Limits:**
- OpenAI: requests per minute and tokens per minute
- Gemini: requests per minute (free tier has low limits)
- OpenRouter: depends on underlying provider

**Graceful Degradation:**
- When nearing rate limit, slow down requests
- Warn user that processing may take longer
- Queue low-priority requests
- Prioritize user-initiated requests over background processing

---

## Communication Patterns

### REST API Design

**RESTful Principles:**

**Resource-Based URLs:**
- URLs represent resources (nouns), not actions
- Hierarchical structure shows relationships
- Consistent naming conventions
- Plural nouns for collections

**HTTP Verbs:**
- GET: Retrieve resource or collection
- POST: Create new resource
- PUT: Update entire resource
- PATCH: Update part of resource
- DELETE: Remove resource

**Status Codes:**
- 2xx: Success
- 3xx: Redirection
- 4xx: Client error
- 5xx: Server error
- Specific code conveys meaning

**Stateless:**
- Each request contains all information needed
- Server doesn't store session state
- Enables horizontal scaling
- Simplifies server implementation

**API Versioning:**
- Version included in URL path
- Current version: v1
- Allows breaking changes without affecting existing clients
- Deprecation notices for old versions

**Request/Response Format:**

**Request Structure:**
- URL path identifies resource
- Query parameters for filtering and pagination
- Headers for metadata (auth, content type)
- Body contains data for POST/PUT/PATCH

**Response Structure:**
- Status code indicates result
- Headers provide metadata
- Body contains data or error details
- Consistent format across endpoints

**Error Response Format:**
- Error code for programmatic handling
- Human-readable message
- Details object with additional context
- Validation errors list specific field issues

### WebSocket Communication

**Connection Management:**

**Client Connection:**
- Client initiates upgrade from HTTP to WebSocket
- Server accepts or rejects upgrade
- Persistent bidirectional connection established
- Connection survives across page navigation (if designed for it)

**Heartbeat:**
- Periodic ping/pong messages
- Detects connection failures
- Keeps connection alive through firewalls/proxies
- Configurable interval (typically 30 seconds)

**Reconnection:**
- Automatic reconnection on disconnect
- Exponential backoff between attempts
- Resume missed events after reconnection
- Maximum reconnection attempts before giving up

**Room/Channel System:**

**Joining Rooms:**
- Client requests to join specific room
- Server validates permission
- Server adds client socket to room
- Client can be in multiple rooms simultaneously

**Leaving Rooms:**
- Explicit leave command
- Automatic leave on disconnection
- Server removes from room membership
- No longer receives room messages

**Broadcasting:**
- Send message to all clients in room
- Efficient - single server operation
- Clients receive simultaneously
- Can exclude specific sockets

**Event-Based Communication:**

**Event Structure:**
- Event name (string identifier)
- Data payload (JSON object)
- Optional acknowledgment callback
- Timestamp for ordering

**Event Types:**
- Server to client: updates, notifications, errors
- Client to server: requests, actions, acknowledgments
- Bidirectional: messages, status updates

**Event Ordering:**
- WebSocket guarantees message order
- Events arrive in order sent
- Important for state updates
- Timestamps provide additional ordering

**Error Handling:**
- Connection errors trigger reconnection
- Message errors emit error event
- Timeout handling for expected responses
- Graceful degradation on failure

### API-First Design

**Design Process:**

**1. Define API Contract:**
- Document endpoints before implementation
- Specify request/response formats
- Define error conditions
- Agree on status codes

**2. Mock API:**
- Create mock server returning sample data
- Frontend can develop against mock
- Backend can develop independently
- Integration easier when both sides ready

**3. Implement Backend:**
- Follow API contract exactly
- Add input validation
- Implement business logic
- Test against contract

**4. Integrate:**
- Replace mock with real backend
- Fix any discrepancies
- Handle edge cases
- Performance test

**Benefits:**
- Frontend and backend teams work in parallel
- Clear contract prevents miscommunication
- Changes to contract are explicit
- Documentation is part of design
- Testing is straightforward

---

## Processing Pipeline

### Poll Response Processing Flow

**Concrete Example Timeline:** Processing the "What feature should we implement next?" poll with 500 responses.

**Day 1, 10:00 AM - Poll Created**
```
Product manager creates poll: "What feature should we implement next?"
Status: ACTIVE
Expires: Day 2, 10:00 AM (24 hours)
```

**Day 1-2 - Responses Arrive (No Processing Yet)**
```
10:05 AM - Response #1: "implement dark mode" → Saved to database
10:12 AM - Response #2: "dark mode" → Saved to database
2:30 PM - Response #55: "improve the processing" → Saved to database
...
Day 2, 9:58 AM - Response #500: "add notifications" → Saved to database

Database now has 500 unprocessed responses
```

**Day 2, 10:00 AM - Poll Closes, Processing Begins**
```
Status changes: ACTIVE → CLOSED → PROCESSING
Background job created: process_poll_123
```

---

**Phase 1: Response Reception (Batch Mode)**

**Step 1: Submission**
- User submits poll response through frontend
- Frontend validates basic input (required fields, length limits)
- Request sent to backend API endpoint
- API validates against poll configuration

**Step 2: Initial Storage**
- Response saved to database immediately
- Status set to "unprocessed"
- Timestamp recorded
- User receives confirmation

**Step 3: Job Creation (At Poll Close)**
- Poll expires, status changes to "closed"
- Processing job added to queue
- Job includes poll ID (references all 500 responses)
- Job priority set based on poll settings
- Poll creator sees "Processing..." status

**Phase 2: Embedding Generation**

**Concrete Example (10:00:05 AM - 10:03:30 AM):**

**Step 1: Text Extraction (10:00:05 AM)**
```
Retrieve all 500 responses from database:
[
  "implement dark mode",
  "dark mode",
  "night theme",
  "improve the processing",
  "faster load times",
  ...495 more
]
```

**Step 2: Batch Processing (10:00:10 AM - 10:03:00 AM)**
```
Split into 5 batches of 100 responses each:

Batch 1 (responses 1-100)   → OpenAI API call → Returns 100 vectors
Batch 2 (responses 101-200) → OpenAI API call → Returns 100 vectors
Batch 3 (responses 201-300) → OpenAI API call → Returns 100 vectors
Batch 4 (responses 301-400) → OpenAI API call → Returns 100 vectors
Batch 5 (responses 401-500) → OpenAI API call → Returns 100 vectors

(All 5 calls happen in parallel - total time: ~3 minutes)

Example results:
"implement dark mode" → [0.234, -0.567, 0.123, ..., 0.891] (1536 dimensions)
"dark mode"           → [0.231, -0.571, 0.119, ..., 0.887]
"night theme"         → [0.229, -0.565, 0.127, ..., 0.893]
"improve processing"  → [-0.445, 0.223, 0.667, ..., -0.123]
```

**Step 3: Storage (10:03:30 AM)**
```
Update database - each response now has embedding:
{
  id: "resp_1",
  text: "implement dark mode",
  embedding: [0.234, -0.567, ..., 0.891],
  status: "embedded"
}
```

**Phase 3: Similarity Analysis**

**Concrete Example (10:03:35 AM):**

**Step 1: Pairwise Comparison**
```
Calculate similarity for all 500 × 500 = 250,000 pairs (optimized with matrix operations)

Examples:
"implement dark mode" ↔ "dark mode": 0.98 (very similar!)
"implement dark mode" ↔ "night theme": 0.92 (similar)
"implement dark mode" ↔ "improve processing": 0.15 (not similar)
"dark mode" ↔ "night theme": 0.94 (very similar)
"improve processing" ↔ "faster load times": 0.89 (similar)
```

**Step 2: Initial Clustering (HAC - Hierarchical Agglomerative Clustering)**
```
Algorithm discovers 8 natural clusters:

Cluster 1: 175 responses (all about dark mode)
  - "implement dark mode", "dark mode", "night theme", "black background", etc.

Cluster 2: 100 responses (all about performance)
  - "improve the processing", "faster load times", "speed up app", etc.

Cluster 3: 80 responses (all about notifications)
  - "add notifications", "push notifications", "alert feature", etc.

Cluster 4: 50 responses (all about offline mode)
  - "offline support", "work without internet", etc.

Cluster 5: 45 responses (other UI improvements)
  - "better icons", "new design", "modern look", etc.

Cluster 6: 30 responses (bug fixes)
  - "fix crashes", "stability issues", etc.

Cluster 7: 15 responses (various other features)
Cluster 8: 5 responses (outliers/unclear)
```

**Phase 4: Hierarchical Organization**

**Concrete Example (10:04:00 AM):**

**Step 1: Cluster Analysis**
```
For Cluster 1 (Dark Mode - 175 responses):
  - Centroid: Average of all 175 embedding vectors
  - Cohesion: 0.91 (high - responses are very similar)
  - Confidence: 95%
  - Sample responses for labeling:
    ["implement dark mode", "night theme", "dark theme please", ...]
```

**Step 2: Subcategory Formation**
```
Group similar clusters together:

Subcategory A: Visual/UI Features (220 responses)
  - Cluster 1: Dark mode (175)
  - Cluster 5: Other UI (45)

Subcategory B: Performance & Technical (130 responses)
  - Cluster 2: Performance (100)
  - Cluster 6: Bug fixes (30)

Subcategory C: New Functionality (130 responses)
  - Cluster 3: Notifications (80)
  - Cluster 4: Offline mode (50)

Subcategory D: Other (20 responses)
  - Cluster 7 + 8: Misc (20)
```

**Step 3: Top-Level Categorization**
```
Final hierarchy (4 levels):

Level 1 (Categories):
  - User Experience Improvements (44%)
  - Performance & Quality (26%)
  - Feature Additions (26%)
  - Other (4%)

Level 2 (Subcategories):
  - Visual/UI Features, Performance & Technical, etc.

Level 3 (Clusters):
  - Dark Mode, Performance, Notifications, etc.

Level 4 (Individual Responses):
  - Each of the 500 original responses
```

**Step 4: Label Generation (10:04:30 AM)**
```
For Cluster 1, send to AI:

Prompt: "Label this group of feature requests:
  - implement dark mode
  - dark mode
  - night theme
  - black background option
  - dark theme please
  (showing 5 of 175 responses)"

AI Response: {
  label: "Dark Mode Theme",
  sentiment: "positive",
  theme: "Visual/UI Feature Request"
}

Repeat for all 8 clusters...
```

**Phase 5: Finalization**

**Concrete Example (10:04:35 AM - 10:05:00 AM):**

**Step 1: Database Updates (10:04:35 AM)**
```
Save complete hierarchy tree to database:

{
  pollId: "poll_123",
  tree: {
    categories: [
      {
        label: "User Experience Improvements",
        percentage: 44,
        count: 220,
        subcategories: [
          {
            label: "Visual/UI Features",
            clusters: [
              {
                label: "Dark Mode Theme",
                count: 175,
                percentage: 35,
                confidence: 0.95,
                responseIds: [1, 2, 3, 6, 10, ...175 IDs]
              },
              {
                label: "Other UI Improvements",
                count: 45,
                percentage: 9,
                ...
              }
            ]
          }
        ]
      },
      {
        label: "Performance & Quality",
        percentage: 26,
        count: 130,
        ...
      },
      ...
    ]
  }
}

Update poll status: PROCESSING → PROCESSED
```

**Step 2: Notification (10:05:00 AM)**
```
WebSocket event emitted to product manager:
{
  event: "processing-complete",
  pollId: "poll_123",
  summary: {
    totalResponses: 500,
    categoriesFound: 4,
    topCategory: "User Experience Improvements (44%)",
    topFeature: "Dark Mode Theme (35%)"
  }
}

Product manager's frontend receives event and displays:
✓ Processing complete! View results →
```

**10:06 AM - Product Manager Views Results**
```
Final tree displayed in UI:

📊 What feature should we implement next? (500 responses)

├─ 44% User Experience Improvements (220 people)
│  └─ Visual/UI Features
│     ├─ 35% Dark Mode Theme (175 people) ⭐ TOP PRIORITY
│     │  └─ Click to see all 175 responses
│     └─ 9% Other UI Improvements (45 people)
│
├─ 26% Performance & Quality (130 people)
│  ├─ 20% Performance Improvements (100 people)
│  │  └─ "improve the processing", "faster load times", etc.
│  └─ 6% Bug Fixes (30 people)
│
├─ 26% Feature Additions (130 people)
│  ├─ 16% Notifications (80 people)
│  └─ 10% Offline Mode (50 people)
│
└─ 4% Other (20 people)

Decision: Build dark mode first - clear winner with 35% of all votes!
```

**Total Processing Time:** 5 minutes (10:00 AM → 10:05 AM)

### Incremental Processing

**Challenge:**
- Responses arrive continuously
- Can't reprocess all responses each time
- Need to classify new responses efficiently
- Maintain consistency of existing hierarchy

**Solution: Incremental Classification**

**Step 1: Match to Existing Clusters**
- Generate embedding for new response
- Compare to all cluster centroids
- Find most similar cluster
- Check if similarity exceeds threshold

**Step 2: Cluster Assignment**
- If similar enough: add to existing cluster
- Update cluster centroid with new response
- Recalculate cluster statistics
- Update hierarchy counts

**Step 3: New Cluster Creation**
- If not similar to any cluster: create new cluster
- Determine which subcategory it belongs to
- May trigger subcategory reorganization
- Generate label for new cluster

**Step 4: Hierarchy Adjustment**
- Update counts up the hierarchy tree
- Recalculate percentages
- May trigger reordering of categories
- Send update via WebSocket

**Benefits:**
- Fast classification of new responses
- No need to reprocess entire dataset
- Hierarchy grows organically
- Real-time updates possible

### Batch Processing Alternative

**Key Insight: Polls Have Time Limits**

All polls in VisInfo have a defined end time set by the poll creator. This architectural constraint makes batch processing at poll close a viable and potentially simpler alternative to incremental processing.

**Batch-at-Close Approach:**

**Step 1: Response Collection Phase**
- Poll is open for defined time period
- Responses are saved to database as they arrive
- No AI processing occurs during collection
- Respondents receive instant confirmation
- Poll creator sees response count increasing

**Step 2: Processing Trigger**
- Poll reaches end time and status changes to "closed"
- System detects status change and creates processing job
- All responses collected at once
- Batch job added to queue with poll identifier

**Step 3: Single Batch Processing**
- Retrieve ALL responses for the poll in one query
- Generate embeddings for all responses in batches
- Calculate similarity matrix for complete dataset
- Perform hierarchical clustering with full context
- Build complete hierarchy tree in one pass
- Generate all labels together

**Step 4: Results Publication**
- Save complete hierarchy to database
- Mark poll as "processed"
- Send single notification: results ready
- User navigates to complete results view

**When Batch Processing Makes Sense:**

**Advantages for MVP:**
- Simpler implementation - no incremental logic needed
- Fewer edge cases to handle
- Better clustering quality with full dataset context
- No need to handle hierarchy reorganization
- Reduced WebSocket complexity
- Easier to test and debug

**Ideal Scenarios:**
- Polls with clear end dates (all VisInfo polls)
- Smaller to medium response volumes (< 10,000 responses)
- Quality over speed priority
- MVP or early product stages
- Limited development resources

**When Incremental Processing Makes Sense:**

**Advantages:**
- Real-time insights as responses arrive
- Early feedback for poll creators
- Engaging user experience
- Handles very large response volumes better
- Continuous processing distributes load

**Ideal Scenarios:**
- Long-running polls (weeks/months)
- Very high response volumes (> 10,000 responses)
- Premium feature for power users
- Mature product with engineering resources

**Trade-offs Comparison:**

| Aspect | Batch Processing | Incremental Processing |
|--------|-----------------|----------------------|
| **Implementation Complexity** | Low - single workflow | High - handle updates |
| **Clustering Quality** | Better - full context | Good - may reorganize |
| **Time to First Insight** | Slower - wait for close | Faster - see early patterns |
| **System Load** | Spiky - burst at close | Distributed - gradual |
| **Testing Complexity** | Lower - fewer scenarios | Higher - many edge cases |
| **Edge Cases** | Fewer | Many (first response, reorganization, etc.) |
| **WebSocket Usage** | Optional - just status | Required - frequent updates |
| **User Experience** | Simple - wait then view | Engaging - watch live |
| **Scalability** | Good for < 10K responses | Better for massive scale |

**Recommendation for MVP:**

**If Starting Fresh:**
Implement batch processing at poll close. It's simpler, faster to develop, and provides excellent results for the core use case. Add incremental processing as a premium feature later if user demand justifies the complexity.

**Given Current Architecture:**
The origin branch already has ~70% of incremental processing infrastructure built (Bull queue, WebSocket, job processing, AI providers). Removing incremental support would delete working code. Better to keep the existing system and potentially add a "batch-only mode" configuration option for simpler polls.

**Hybrid Approach (Best of Both):**

**Configuration Option:**
- Poll creators choose processing mode when creating poll
- "Instant Results" - incremental processing (premium)
- "Quality Results" - batch at close (default)
- Different pricing tiers

**Implementation:**
- Same infrastructure supports both modes
- Incremental mode: process on each response
- Batch mode: queue job only when poll closes
- Shared AI services and clustering logic
- Mode flag stored with poll configuration

**Migration Path:**

**Phase 1 (MVP):**
- Implement batch-at-close only
- Simpler, faster to market
- Proven value before complexity

**Phase 2 (Growth):**
- Add incremental as premium feature
- Target power users with large polls
- Differentiated product offering
- Higher price point justification

**Phase 3 (Scale):**
- Optimize incremental for scale
- Add advanced features (anomaly detection, trending)
- Enterprise features
- Full platform maturity

**Architectural Flexibility:**

The current VisInfo architecture supports both approaches with minimal changes:

**Shared Components:**
- Response storage remains the same
- Embedding service works for both
- Clustering algorithms identical
- Hierarchy building logic shared
- Export functionality unchanged

**Mode-Specific Components:**
- Job creation timing (on response vs on close)
- WebSocket event frequency (many vs few)
- Database update frequency (continuous vs once)
- Progress tracking granularity (detailed vs simple)

This flexibility allows starting simple (batch-only) and evolving based on user feedback and business needs, without architectural rework.

### Performance Optimization

**Batch Processing:**
- Group operations to reduce overhead
- Process multiple responses simultaneously
- Parallel execution when possible
- Reduces total processing time

**Caching:**
- Store frequently accessed data in memory
- Cache hierarchy trees for quick retrieval
- Cache embeddings to avoid regeneration
- Invalidate cache when data changes

**Lazy Loading:**
- Don't load all data upfront
- Load hierarchy level by level
- Load responses only when drilling down
- Reduces initial load time

**Database Optimization:**
- Indexes on frequently queried columns
- Denormalized counts for fast access
- Materialized views for complex queries
- Connection pooling for efficiency

---

## Security Architecture

### Authentication System

**User Authentication:**

**Registration:**
- User provides email and password
- Password strength validation (length, complexity)
- Email uniqueness check
- Password hashed using bcrypt (never stored plain)
- User record created in database
- Verification email sent (future feature)

**Login:**
- User provides email and password
- User record retrieved by email
- Stored hash compared with provided password
- If match: generate authentication token
- If no match: return error (intentionally vague)
- Rate limiting prevents brute force attacks

**Password Hashing:**
- BCrypt algorithm with salt
- Work factor slows down hash computation
- Protects against rainbow table attacks
- Future-proof as hardware improves
- One-way function: can't reverse to get password

**Authentication Tokens:**

**JWT (JSON Web Tokens):**
- Self-contained authentication proof
- Contains user ID and metadata
- Signed with secret key
- Expiration time included
- No server-side session storage needed

**Token Lifecycle:**
1. User logs in successfully
2. Server generates JWT with user info
3. Token returned to client
4. Client stores token (memory or secure storage)
5. Client includes token in subsequent requests
6. Server validates token on each request
7. Token expires after configured time
8. User must re-authenticate for new token

### API Security

**API Key Authentication:**

**Purpose:**
- Identify API consumers
- Rate limit per consumer
- Track usage and billing
- Revoke access if needed

**Implementation:**
- API key generated during account setup
- Key included in Authorization header
- Server validates key before processing request
- Invalid key results in 401 Unauthorized

**Optional vs Required:**
- Can be configured as optional for public APIs
- Required for sensitive operations
- Different endpoints can have different requirements
- Supports both authenticated and anonymous access

**Input Validation:**

**Schema Validation:**
- Define expected structure for each endpoint
- Validate request body against schema
- Check data types, required fields, formats
- Reject invalid requests before processing

**Sanitization:**
- Remove potentially dangerous characters
- Escape special characters for database queries
- Prevent script injection in text fields
- Normalize data formats

**Parameter Validation:**
- Check numeric ranges
- Validate string lengths
- Verify enum values
- Ensure array sizes

**Rate Limiting:**

**Purpose:**
- Prevent abuse and DDoS attacks
- Ensure fair resource usage
- Protect backend services
- Maintain service quality

**Implementation:**
- Track requests per IP address
- Time window (typically 15 minutes)
- Maximum requests per window
- Exceed limit: return 429 Too Many Requests

**Strategy:**
- Sliding window for accuracy
- Distributed rate limiting across servers
- Different limits for different endpoints
- Authenticated users may have higher limits

### Data Security

**Encryption in Transit:**
- All communication over HTTPS
- TLS 1.2 or higher
- Strong cipher suites
- Certificate validation

**Encryption at Rest:**
- Database encryption enabled
- Encrypted backups
- Secure key management
- Regular key rotation

**Data Privacy:**

**Anonymous Responses:**
- Option to submit without user ID
- No tracking of individual users
- IP addresses not stored (or hashed)
- Ensures respondent privacy

**Data Retention:**
- Configurable retention policies
- Automatic deletion of old data
- User can request data deletion
- Compliance with privacy regulations

**Access Control:**

**Poll Permissions:**
- Creator has full control
- Can set visibility (public/private)
- Share access with specific users
- Different permission levels possible

**Data Isolation:**
- Users only access their own data
- Database queries include user filtering
- Admin access logged and audited
- Strict separation between accounts

### Security Headers

**Helmet Middleware:**

**X-Frame-Options:**
- Prevents clickjacking attacks
- Disallows embedding in iframes
- Protects against UI redress attacks

**X-Content-Type-Options:**
- Prevents MIME type sniffing
- Browser respects declared content type
- Reduces XSS attack surface

**X-XSS-Protection:**
- Enables browser XSS filter
- Blocks page load if XSS detected
- Legacy header but still useful

**Content-Security-Policy:**
- Defines allowed content sources
- Prevents inline script execution
- Blocks unauthorized external resources
- Strong defense against XSS

**Strict-Transport-Security:**
- Forces HTTPS connections
- Prevents SSL stripping attacks
- Includes subdomains
- Long duration for security

### SQL Injection Prevention

**Parameterized Queries:**
- Never concatenate user input into SQL
- Use placeholder parameters
- Database driver handles escaping
- Eliminates injection vulnerability

**ORM/Query Builder:**
- Repository layer uses query builder
- Automatic parameter binding
- Type-safe query construction
- Reduces human error

---

## Scalability Design

### Horizontal Scaling

**Stateless Application Servers:**

**Design Principle:**
- No server-side session storage
- All state in database or client
- Any server can handle any request
- Servers are interchangeable

**Benefits:**
- Easy to add more servers
- Load balancer distributes requests
- No session affinity needed
- Server failures don't lose state

**Load Balancing:**

**Round Robin:**
- Requests distributed evenly
- Simple algorithm
- Works well for uniform workloads
- May not account for server load

**Least Connections:**
- Send to server with fewest active connections
- Better for variable request times
- Accounts for server load
- More complex to implement

**Health Checks:**
- Regular pings to each server
- Remove unhealthy servers from pool
- Automatic recovery when healthy
- Prevents routing to failed servers

### Database Scaling

**Read Replicas:**

**Primary-Replica Architecture:**
- One primary database for writes
- Multiple replica databases for reads
- Asynchronous replication
- Distribute read load across replicas

**Read/Write Split:**
- Application writes to primary
- Application reads from replicas
- Repository layer handles routing
- Transparent to business logic

**Replication Lag:**
- Replicas may be slightly behind primary
- Eventual consistency model
- Critical reads can go to primary
- Most reads tolerate slight delay

**Partitioning/Sharding:**

**Horizontal Partitioning:**
- Split table rows across multiple databases
- Each partition holds subset of data
- Partition key determines which database
- Common key: user ID or poll ID

**Benefits:**
- Distribute write load
- Scale beyond single database limits
- Geographic distribution possible
- Isolate failures

**Challenges:**
- Complex queries across partitions
- Transactions across partitions difficult
- Repartitioning is expensive
- Application complexity increases

**Connection Pooling:**
- Reuse database connections
- Avoid connection overhead
- Limit total connections
- Tune pool size for workload

### Caching Strategy

**Cache Layers:**

**Application Cache:**
- In-memory cache within server process
- Fastest access (microseconds)
- Limited by server memory
- Not shared across servers

**Distributed Cache (Redis):**
- Shared cache across all servers
- Sub-millisecond access
- Scales by adding cache nodes
- Survives individual server restarts

**Database Query Cache:**
- Database caches query results
- Managed by database
- Transparent to application
- Invalidated on data changes

**What to Cache:**

**Frequently Accessed Data:**
- Poll metadata
- User profiles
- Hierarchy trees
- Response counts

**Expensive Computations:**
- Aggregation results
- Statistical calculations
- Formatted responses

**Rarely Changing Data:**
- Configuration settings
- Static content
- Lookup tables

**Cache Invalidation:**

**Time-Based (TTL):**
- Data expires after fixed time
- Simple to implement
- May serve stale data
- Good for data that changes predictably

**Event-Based:**
- Invalidate when data changes
- Requires change detection
- Serves fresh data
- More complex implementation

**Patterns:**
- Write-through: update cache on write
- Write-behind: async cache update
- Cache-aside: load on cache miss

### Queue Scaling

**Worker Pool:**

**Multiple Workers:**
- Run multiple worker processes
- Each polls queue independently
- Bull ensures no duplicate processing
- Scale by adding worker processes

**Worker Distribution:**
- Workers on different machines
- Geographic distribution possible
- Isolate failures
- Better resource utilization

**Queue Prioritization:**

**Multiple Queues:**
- Separate queues for different job types
- Priority queues for urgent jobs
- Dedicated workers per queue type
- Prevents low priority from blocking high

**Job Priority:**
- Priority field within single queue
- Higher priority processed first
- Dynamic priority adjustment possible
- Starvation prevention needed

### Geographic Distribution

**Multi-Region Deployment:**

**Regional Data Centers:**
- Deploy in multiple geographic regions
- Route users to nearest region
- Reduces latency
- Improves reliability

**Data Replication:**
- Replicate data across regions
- Read local, write may be remote
- Consistency challenges
- Network latency considerations

**CDN for Static Content:**
- Frontend assets on Content Delivery Network
- Cached at edge locations worldwide
- Reduces load on origin server
- Faster page loads for users

---

## Performance Optimization

### Backend Optimization

**Query Optimization:**

**Indexing Strategy:**
- Index frequently queried columns
- Composite indexes for common filters
- Balance index count vs write performance
- Analyze query execution plans

**Query Patterns:**
- Avoid N+1 queries (load related data in one query)
- Use JOINs instead of multiple queries
- Limit returned columns to only needed
- Paginate large result sets

**Batch Operations:**
- Insert multiple rows in single query
- Update multiple rows with one statement
- Delete in batches to avoid locks
- Reduces round trips to database

**Database Connections:**
- Connection pooling for reuse
- Proper pool sizing
- Monitor pool utilization
- Close connections when done

**API Response Time:**

**Caching:**
- Cache expensive computations
- Cache database query results
- Set appropriate TTL
- Invalidate on data changes

**Compression:**
- Compress large responses
- Reduces network transfer time
- Supported by most clients
- Small CPU overhead

**Pagination:**
- Limit number of results returned
- Offset + limit pattern
- Cursor-based for large datasets
- Reduces payload size

**Async Operations:**
- Long operations return immediately
- Status endpoint for checking progress
- WebSocket for updates
- Improves perceived performance

### Frontend Optimization

**Initial Load Time:**

**Code Splitting:**
- Split JavaScript into smaller bundles
- Load only what's needed initially
- Lazy load routes
- Reduces initial download size

**Asset Optimization:**
- Minify JavaScript and CSS
- Optimize images
- Use appropriate image formats
- Compress text assets

**Caching:**
- Cache static assets aggressively
- Service worker for offline capability
- Cache API responses when appropriate
- Versioned URLs for cache busting

**Rendering Performance:**

**Virtual Scrolling:**
- Only render visible items
- Dynamically add/remove as scrolling
- Handles large lists efficiently
- Improves scroll performance

**Debouncing:**
- Delay expensive operations during typing
- Wait for user to finish input
- Reduces unnecessary processing
- Improves responsiveness

**Memoization:**
- Cache computed values
- Recompute only when dependencies change
- Reduces redundant calculations
- Framework-level support (e.g., React.memo in React, const in Flutter, computed() in Vue)

**Network Optimization:**

**Request Batching:**
- Combine multiple API calls into one
- Reduces number of round trips
- Lower overhead
- Careful with payload size

**WebSocket Instead of Polling:**
- Persistent connection vs repeated requests
- Server pushes updates
- Lower latency
- More efficient

**Compression:**
- Enable gzip/brotli compression
- Reduces transfer size
- Browser decompresses automatically
- Significant bandwidth savings

### AI Service Optimization

**Batch Processing:**
- Process multiple texts in one API call
- Significant time savings
- Cost reduction
- Better API quota utilization

**Parallel Processing:**
- Process independent batches simultaneously
- Utilize multiple cores/threads
- Faster total processing time
- Careful with rate limits

**Caching:**
- Store embeddings with responses
- Reuse embeddings if text unchanged
- Significant cost savings
- Faster reprocessing

**Model Selection:**
- Choose appropriate model for task
- Smaller models for simple tasks
- Larger models only when needed
- Balance quality vs cost/speed

---

## Fault Tolerance

### Graceful Degradation

**Service Availability:**

**Primary Service Failure:**
- Automatically failover to backup
- Continue processing with degraded performance
- Alert administrators of failure
- Maintain service for users

**Partial Failure:**
- Identify which component failed
- Continue with remaining functionality
- Disable only affected features
- Inform users of limitations

**Cache Fallback:**
- Serve stale cache if database down
- Better than complete failure
- Warn user data may be outdated
- Restore normal operation when recovered

**Error Recovery:**

**Retry Logic:**
- Automatic retry of failed operations
- Exponential backoff between retries
- Maximum retry attempts
- Different strategies per error type

**Circuit Breaker:**
- Stop calling failing service
- Prevents cascading failures
- Periodically test for recovery
- Resume when service restored

**Fallback Behavior:**
- Define sensible defaults
- Return cached data if available
- Degrade to simpler functionality
- Never completely fail user request

### Data Integrity

**Transaction Management:**

**ACID Properties:**
- Atomicity: all operations succeed or none
- Consistency: data remains valid
- Isolation: concurrent transactions don't interfere
- Durability: committed data persists

**Database Transactions:**
- Group related operations
- Commit all or rollback all
- Prevents partial updates
- Maintains data consistency

**Distributed Transactions:**
- Coordinate across multiple systems
- Two-phase commit protocol
- Complex but necessary for consistency
- Avoid when possible

**Backup Strategy:**

**Regular Backups:**
- Automated daily backups
- Incremental backups throughout day
- Stored in separate location
- Encrypted for security

**Point-in-Time Recovery:**
- Restore to specific timestamp
- Useful for data corruption
- Transaction logs required
- Test restoration regularly

**Disaster Recovery:**
- Complete system restoration plan
- Recovery time objective (RTO)
- Recovery point objective (RPO)
- Regular disaster recovery drills

### Monitoring and Alerting

**Health Monitoring:**

**Metrics Collection:**
- Server CPU, memory, disk usage
- Database connection pool status
- API response times
- Error rates

**Health Checks:**
- Periodic ping to all services
- Verify database connectivity
- Check Redis availability
- Test AI provider accessibility

**Alerts:**
- Notify team of failures
- Escalation for critical issues
- Different channels (email, SMS, Slack)
- Clear actionable information

**Logging:**

**Structured Logging:**
- JSON format for easy parsing
- Consistent fields across logs
- Include context (user, request ID)
- Appropriate log levels

**Log Aggregation:**
- Centralized log collection
- Search and filter capabilities
- Correlate across services
- Retain for debugging and compliance

**Application Performance Monitoring:**
- Track request throughput
- Identify slow endpoints
- Profile database queries
- Find bottlenecks

---

## Deployment Architecture

### Development Environment

**Local Setup:**
- Developer machine runs all services
- PostgreSQL and Redis installed locally
- Environment variables in .env file
- Hot reload for rapid development

**Docker Compose (Alternative):**
- All services in containers
- Consistent environment across developers
- Isolated from host system
- Easy setup and teardown

### Staging Environment

**Purpose:**
- Test in production-like environment
- Integration testing
- Performance testing
- User acceptance testing

**Configuration:**
- Same infrastructure as production (scaled down)
- Separate database and Redis
- Test data, not real user data
- Can be destroyed and recreated

### Production Environment

**Infrastructure:**

**Application Servers:**
- Multiple instances behind load balancer
- Auto-scaling based on load
- Health checks for routing
- Graceful shutdown on deployment

**Database:**
- Primary-replica configuration
- Automated backups
- Monitoring and alerting
- Regular maintenance windows

**Redis:**
- Persistent configuration
- Regular snapshots
- Separate instances for queue and cache
- Monitoring and alerting

**Load Balancer:**
- Distributes traffic across servers
- SSL termination
- Health checks
- DDoS protection

**Deployment Process:**

**Blue-Green Deployment:**
- New version deployed alongside old
- Traffic switched when ready
- Easy rollback if issues
- Zero downtime deployment

**Rolling Deployment:**
- Update servers one at a time
- Monitor each update
- Continue if successful
- Rollback if issues detected

**Canary Deployment:**
- Route small percentage to new version
- Monitor metrics
- Gradually increase percentage
- Full rollback if problems

### Monitoring and Observability

**Application Monitoring:**
- Request rates and latencies
- Error rates by endpoint
- Resource utilization
- User activity metrics

**Infrastructure Monitoring:**
- Server health and performance
- Network connectivity
- Disk space
- Service availability

**Business Metrics:**
- Polls created
- Responses submitted
- Processing times
- User growth

**Alerting:**
- Critical: immediate response needed
- Warning: investigate soon
- Info: for awareness
- Escalation policies

---

## Design Decisions & Trade-offs

### PostgreSQL vs MongoDB

**Decision: PostgreSQL**

**Rationale:**
- Clear relational structure (polls → responses → hierarchy)
- Complex analytical queries needed
- Strong consistency requirements
- Hierarchical queries benefit from recursive CTEs
- Mature ecosystem and tooling

**Trade-offs:**
- More rigid schema (requires migrations)
- Potentially slower for certain operations
- Scaling writes requires sharding

**MongoDB Advantages (Not Chosen):**
- Flexible schema
- Horizontal scaling easier
- Good for rapidly changing structure

### Synchronous vs Asynchronous Processing

**Decision: Asynchronous with Job Queue**

**Rationale:**
- AI processing takes minutes for large datasets
- Users shouldn't wait for completion
- Allows horizontal scaling of processing
- Retry capabilities for failures
- Better resource utilization

**Trade-offs:**
- Additional complexity (queue system)
- Requires Redis infrastructure
- Need for progress tracking
- More complex error handling

**Synchronous Advantages (Not Chosen):**
- Simpler implementation
- Immediate results
- Easier debugging

### REST vs GraphQL

**Decision: REST API**

**Rationale:**
- Simpler to implement and understand
- Better caching support
- Standard HTTP semantics
- Sufficient for current needs
- Widely supported tooling

**Trade-offs:**
- May over-fetch or under-fetch data
- Multiple requests for related data
- Less flexible for clients

**GraphQL Advantages (Not Chosen):**
- Clients specify exact data needed
- Single request for complex data
- Strong typing
- Better for complex UIs

### WebSocket for Real-time Updates

**Decision: Use WebSocket (Socket.IO)**

**Rationale:**
- Processing updates need real-time delivery
- Polling is inefficient and has latency
- Bidirectional communication useful
- Good browser support

**Trade-offs:**
- Persistent connections consume resources
- More complex than polling
- Requires session stickiness with multiple servers

**Polling Advantages (Not Chosen):**
- Simpler implementation
- Stateless (easier to scale)
- Works with any HTTP infrastructure

### Multi-Provider AI Architecture

**Decision: Support Multiple Providers**

**Rationale:**
- Avoid vendor lock-in
- Different providers have different strengths
- Cost optimization opportunities
- Reliability through fallback
- Easy provider switching

**Trade-offs:**
- More complex implementation
- Testing burden across providers
- Slight abstraction overhead

**Single Provider Advantages (Not Chosen):**
- Simpler code
- Provider-specific optimizations
- Fewer dependencies

### Monolithic vs Microservices

**Decision: Monolithic (for MVP)**

**Rationale:**
- Simpler deployment and development
- Faster development velocity
- Easier to change boundaries
- Sufficient for initial scale
- Lower operational complexity

**Trade-offs:**
- All components scale together
- Deployment affects entire system
- Technology choices affect everything

**Microservices Advantages (Not Chosen):**
- Independent scaling
- Technology diversity
- Isolated failures
- Smaller team ownership

**Future Path:**
- Start monolithic
- Extract services as needed
- When clear boundaries emerge
- When scale requires it

---

## Conclusion

The VisInfo architecture is designed for production use with careful attention to scalability, reliability, and maintainability. Key architectural strengths:

1. **Separation of Concerns** - Clear boundaries enable independent evolution
2. **Asynchronous Processing** - Long operations don't block users
3. **Real-time Updates** - Users stay informed of processing status
4. **Provider Flexibility** - Not locked to single AI vendor
5. **Production Ready** - Security, monitoring, error handling built in

The architecture supports the current feature set while allowing for future growth. The monolithic approach provides development velocity while maintaining the option to extract microservices when scale demands it.

Trade-offs have been carefully considered with bias toward simplicity and maintainability over premature optimization. The system is built to evolve as requirements and scale change over time.

---

**Document End**
