# VisInfo System Design

## 1. High-Level Architecture
VisInfo is designed as a scalable, multi-tier application that bridges raw unstructured user feedback with actionable structured insights through AI-driven processing.

The system adopts a **Serverless Event-Driven** architecture to ensure infinite scalability and cost-efficiency:

- **Client Layer (Frontend)**: A unified **Flutter** application hosted on **S3 + CloudFront**, acting as the data collection terminal and insight explorer.
- **Service Layer (Backend)**: **AWS Lambda** functions behind **API Gateway** handle secure API requests.
- **Ingestion & Orchestration**: **AWS Step Functions** orchestrate the complex AI pipeline, managing state between ingestion, embedding, and clustering.
- **Data Layer**: 
  - **S3**: Raw data lake for massive ingestion.
  - **DynamoDB**: High-speed metadata and state storage.
  - **PostgreSQL (RDS)**: Relational storage for final structured hierarchy trees.
- **Intelligence Layer**: Direct integration with **AWS Bedrock** for Embeddings (Titan) and LLM operations (Claude).

```mermaid
graph TD
    User[End User/PM] -->|Interacts| Client[Flutter Frontend]
    Sources[External Sources: Jira/Zendesk] -->|Push Data| Ingest[API Gateway + Lambda]
    Client -->|REST| Gateway[API Gateway]
    Ingest --> Gateway
    
    subgraph "Serverless Backend"
        Gateway -->|Trigger| Workflow[AWS Step Functions]
        Workflow -->|Orchestrate| IngestionLambda[Ingestion Lambda]
        Workflow -->|Orchestrate| ClusterLambda[Clustering Lambda (Python)]
        
        IngestionLambda -->|Store Raw| S3[(Amazon S3)]
        IngestionLambda -->|Store Meta| DDB[(DynamoDB)]
        
        ClusterLambda -->|Save Tree| RDS[(RDS PostgreSQL)]
    end
    
    subgraph "AI Services"
        Workflow -->|Generate Vectors| BedrockEmbed[Bedrock (Titan)]
        ClusterLambda -->|HAC Algo| LocalCompute[Lambda Compute]
        Workflow -->|Label & Sum| BedrockLLM[Bedrock (Claude)]
    end
```

---

## 2. Major Components

### A. Frontend (Flutter)
- **Unified Interface**: Adaptive UI for both **Data Collection** (Surveys) and **Data Analysis**.
- **Interactive Tree Visualizer**: A recursive rendering engine supporting **Hierarchical Drill-Down** (Executive → Manager → Team Lead views).
- **Configuration Panel**: Allows users to adjust **Outlier Settings** and **Confidence Thresholds** in real-time.


### B. Backend Services
-   **Security & Gateway**: **AWS API Gateway** manages authentication, rate limiting, and request routing.
-   **Orchestration Engine**: **AWS Step Functions** workflows manage the end-to-end data pipeline, replacing traditional background job workers.
-   **Integration Lambda**: **AWS Lambda** functions that handle specific business logic like **Export to Action Plans** (pushing to Jira) or data normalization.

### C. AI & Data Engine
-   **Embedding Service**: Direct calls to **AWS Bedrock (Titan)** to generate 1536-dimensional vectors. No local model management required.
-   **Clustering Engine**: **AWS Lambda (Python)** functions running **HDBSCAN** and **HAC** algorithms. Optimized for "cold start" performance to handle sporadic analysis loads.
-   **Hierarchy Builder**: A state-aware process within Step Functions that aggregates labeled clusters into a persistent tree structure in **RDS**.

---

## 3. System & User Flows

### Primary Data Flow (The "Insight Pipeline")
1.  **Multi-Source Ingestion**: Raw text (from surveys or API) is received and stored in PostgreSQL.
2.  **Vectorization**: System batches responses and generates embedding vectors for **Semantic Understanding**.
3.  **Clustering**: Vectors are clustered. **Outlier Settings** determine how aggressive the system is in excluding noise.
4.  **Labeling & Scoring**: The LLM labels clusters and assigns a **Confidence Score** (0-100%) based on cluster density and cohesion.
5.  **Tree Construction**: Clusters are grouped into a **Multi-Resolution Hierarchy**.
6.  **Export**: Approved insights are pushed to external tools via the Integration Service.

### User Journey
1.  **Ingest**: Product Manager imports 500 support tickets + 200 survey responses.
2.  **Process**: VisInfo detects 8 major themes.
3.  **Analyze**:
    *   **Executive**: Views top 3 issues (Multi-resolution: Low).
    *   **PM**: Drills down into "Checkout Failures".
    *   **Tuning**: PM notices too many "Other" items, adjusts **Outlier Settings** to be more inclusive. Re-clusters in seconds.
4.  **Action**: PM selects the "Payment Gateway Timeout" cluster and clicks **"Export to Jira"**.

---

## 4. AWS Integration Strategy
VisInfo leverages AWS to provide a robust, production-grade infrastructure suitable for scaling from hundreds to millions of responses.

### Compute & Hosting
-   **Backend**: Serverless architecture using **AWS Lambda** for scalable event-driven processing.
-   **Frontend**: Hosted via **Amazon CloudFront + S3** for global low-latency delivery.

### Data Persistence
-   **Data Storage**: **Amazon S3** for raw response storage and **Amazon DynamoDB** for fast access to metadata and state.
-   **Results Storage**: **Amazon RDS (PostgreSQL)** for structured classification trees and relational data.

### Data Ingestion & Orchestration
-   **Ingestion**: **Amazon API Gateway + AWS Lambda** to securely accept survey and ticket data.
-   **Orchestration**: **AWS Step Functions** to coordinate the multi-step AI pipeline (Ingest -> Vectorize -> Cluster -> Label).

### AI & Machine Learning (Bedrock Integration)
-   **Text Embeddings**: **AWS Bedrock (Titan)** for converting text to 1536-dimensional vectors.
-   **Label Generation**: **AWS Bedrock (Claude Sonnet)** for accurate and apt naming of clusters.
-   **Clustering Compute**: **AWS Lambda** (Python runtime) execution for running HAC/HDBSCAN algorithms.

---

## 5. Technical Logic

### Semantic Density Clustering & Outliers
VisInfo uses a hybrid approach of **HDBSCAN** (for density-based clustering) and **HAC (Hierarchical Agglomerative Clustering)** (for structural hierarchy). By mapping text to a vector space, "Login is slow" and "Auth takes forever" are grouped. The **Outlier Settings** parameter controls the `min_samples` and `epsilon` of the algorithm, allowing users to choose between "Core themes only" (High precision/High outliers) or "Include everything" (High recall/Low outliers).

### Multi-Resolution Analysis
The system persists the full hierarchical tree (linkage matrix). This allows **Multi-Resolution Analysis** without re-running distinct clustering jobs. Users can "slice" the tree at different stability thresholds to see broader categories (Executive View) or granular clusters (Developer View).

### Confidence Scoring
Every cluster is assigned a confidence score derived from:
1.  **Density**: How close the vectors are in 1536-dimensional space.
2.  **Cohesion**: The silhouette score of the cluster.
3.  **LLM Verification**: The LLM provides a "certainty" rating when generating the label.
Score = `(Density_Score * 0.4) + (Silhouette * 0.4) + (LLM_Rating * 0.2)`.

### Recursive Summarization
To build the hierarchy:
1.  **Leaf Nodes**: LLM labels raw comments.
2.  **Branch Nodes**: LLM labels child clusters.
Logic ensures that "Login Errors" and "Timeouts" roll up to "Technical Stability".

---

## 6. Scaling Strategy: From Serverless to EC2
While Serverless provides excellent burst handling, cost efficiency at massive, meaningful scale for long-running AI jobs may eventually require dedicated compute.

### Transition Trigger
Move to EC2 when:
- **Consistent Load**: Traffic becomes constant 24/7 rather than bursty.
- **Compute Intensity**: Clustering jobs consistently exceed Lambda's 15-minute timeout.
- **Cost Crossover**: Monthly Lambda bill exceeds the cost of reserved instances.

### Hybrid Architecture Plan
1.  **Frontend/API**: Remain on **Serverless (API Gateway)** for infinite scale handling of lightweight requests.
2.  **AI Workers**: Migrate the **Clustering Engine** to **Amazon EC2 Auto Scaling Groups*.
    -  **Spot Instances**: Use Spot Fleets for the worker nodes to reduce AI processing costs by up to 90%.
    -  **Queue-Based Scaling**: Scale the EC2 fleet based on the depth of the SQS/Redis job queue.
3.  **Containerization**: Wrap the Python clustering algorithms in Docker containers to deploy on **Amazon ECS** or **EKS** for orchestrated management.
