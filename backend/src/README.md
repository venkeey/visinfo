# Backend Source Directory

This directory contains the core server logic for the VisInfo backend, an Express.js server that powers poll creation, response collection, and AI-driven analysis and visualization.

## Directory Structure

### Core Application
- **`app.ts`** - Express application setup with middleware configuration (CORS, security, auth)
- **`server.ts`** - Server entry point and startup logic

### Controllers
Controllers handle HTTP request/response logic:
- **`ExportController.ts`** - Handles data export functionality
- **`PollController.ts`** - Poll creation, retrieval, and management
- **`ResponseController.ts`** - Poll response submission and retrieval
- **`ResultsController.ts`** - Results aggregation and analysis

### Models & Types
Data models and TypeScript type definitions:
- **`models/`** - Database models (Poll, Response, User, HierarchyNode)
- **`types/`** - TypeScript type definitions

### Services
Business logic and integrations:

#### AI Services (`ai/`)
- **`providers/`** - AI provider implementations (OpenAI, Gemini, OpenRouter)
- **`services/`**
  - `embeddingService.ts` - Text embedding generation
  - `labelingService.ts` - AI-powered labeling
- **`config/`** - AI configuration and provider setup

#### Core Services (`services/`)
- **`ClassificationService.ts`** - AI classification of poll responses
- **`ClusteringService.ts`** - Response clustering and grouping
- **`SemanticSimilarityService.ts`** - Semantic similarity analysis
- **`ExportService.ts`** - Data export formatting
- **`cacheService.ts`** - Redis-based caching
- **`deduplicationService.ts`** - Duplicate response handling
- **`hierarchyService.ts`** - Hierarchical organization of data
- **`processingOrchestrator.ts`** - Orchestrates processing pipelines

#### Clustering (`services/clustering/`)
- **`kmeans.ts`** - K-means clustering algorithm
- **`hdbscan.ts`** - HDBSCAN clustering implementation
- **`types.ts`** - Clustering type definitions
- **`utils.ts`** - Clustering utilities

### Data Access
- **`repositories/`** - Data access layer
  - `pollRepository.ts` - Poll queries and operations
  - `responseRepository.ts` - Response queries and operations
  - `classificationResultRepository.ts` - Classification result storage

### Routes & Middleware
- **`routes/`** - API route definitions (v1)
- **`middleware/`**
  - `auth.ts` - API key authentication
  - `errorHandler.ts` - Global error handling
  - `rateLimiter.ts` - Rate limiting
  - `validation.ts` - Input validation (Zod schemas)

### Infrastructure
- **`config/`** - Configuration files (database config)
- **`database/`** - Database connection setup
- **`queue/`** - Job queue management (Bull/Redis)
  - `pollQueue.ts` - Poll processing queue
  - `worker.ts` - Queue job workers
  - `config.ts` - Queue configuration
- **`websocket/`** - WebSocket connection handling for real-time updates

### Utilities
- **`utils/`** - Helper functions and utilities

## Key Features

### Poll Management
Create, retrieve, and manage polls with support for multiple response types and custom options.

### AI-Powered Analysis
- Response classification using large language models
- Semantic clustering of similar responses
- Embeddings-based similarity analysis
- Support for multiple AI providers (OpenAI, Gemini, OpenRouter)

### Background Processing
Job queue powered by Bull and Redis for:
- Long-running analysis tasks
- Batch processing
- Asynchronous operations

### Real-time Updates
WebSocket integration for live updates on poll status and analysis results.

### Data Export
Export poll results in multiple formats with AI-generated insights.

### Security
- API key authentication
- Rate limiting
- CORS protection
- Helmet security headers

## Configuration

Environment variables should be set in `.env`:
- Database connection (PostgreSQL)
- Redis connection for caching and queue
- API keys for AI providers
- Frontend URL for CORS

## Technology Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **Caching & Queue**: Redis (Bull for job queue)
- **Real-time**: Socket.io
- **Validation**: Zod
- **Security**: Helmet, express-rate-limit
- **AI Integration**: OpenAI, Google Gemini, OpenRouter APIs

