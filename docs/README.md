# VisInfo - AI-Powered Free-Form Polls

An AI-powered polling platform that organizes free-form responses into hierarchical categories using semantic analysis, transforming fragmented feedback into structured, actionable insights.

## 🎯 Problem Statement

### The Core Problem: Response Fragmentation

When collecting free-form feedback, **the same idea appears in many variations**, fragmenting results and hiding the true signal:

**Real-world example:**
- Customer feedback: "dark mode" (47 responses), "dark theme" (23), "night mode" (12), "darker UI" (8)
- In reports: These look like 4 separate, low-priority requests
- In reality: ONE feature with 90 votes

**This happens constantly in:**
- Product feature requests
- Employee feedback surveys
- Community input and voting
- User research at scale (100+ responses)

**The pain points:**
- Manual categorization takes hours and doesn't scale
- Different analysts categorize inconsistently
- Small variations fragment the data
- Decision-makers miss critical signals in the noise
- Valuable feedback gets lost in the long tail

### Why Traditional Solutions Fall Short

**Multiple choice polls**: Force-fit users into predefined boxes, missing unexpected insights

**Pure free-form**: Generates rich data but becomes unmanageable without structure

**Manual analysis**: Time-consuming, inconsistent, and doesn't scale beyond small datasets

## 💡 Our Solution: AI-Powered Question Design + Hierarchical Analysis

VisInfo solves response fragmentation with two breakthrough features:

### 1. AI-Assisted Question Design
**The insight**: If AI will process responses, help creators ask better questions upfront.

- Guide creators to write focused, groupable questions
- Preview how AI will categorize potential responses
- Suggest refinements for ambiguous questions
- Set clear expectations for participants

**Example:**
```
Creator types: "What do you think about our app?"
❌ Too broad - responses will be ungroupable

AI suggests: "What feature would most improve your experience?"
✓ Focused, categorizable responses
```

### 2. Hierarchical Classification with Drill-Down to Roots
**The game-changer**: Nothing is lost - everything is organized and explorable.

**Different stakeholders view at different depths:**
- **Executives**: See top-level priorities (Performance: 127 votes, UI: 90 votes)
- **Product Managers**: Drill into categories (Loading Speed: 68, Crashes: 35, Battery: 24)
- **Engineers**: Drill to raw responses ("crashes on Samsung Galaxy S21")

**Every response is traceable** from category → subcategory → cluster → individual words

This combines:
- ✅ Quantitative insights at the top (counts, percentages, priorities)
- ✅ Qualitative richness at the bottom (actual words, context, nuance)
- ✅ Full transparency (audit trail from any number to source)
- ✅ Flexibility (consume data at the depth you need)

## ✨ Key Features

### For Poll Creators
- **AI Question Designer**: Get guided to write better, more focused questions
  - Real-time feedback on question quality
  - Preview of how AI will categorize responses
  - Suggested improvements for ambiguous questions
- **Multi-level Results View**: Explore results at any depth
  - Executive summary (top categories)
  - Detailed breakdown (subcategories)
  - Raw responses (actual user words)
- **Interactive Classification Tree**: Click to drill down from categories to individual responses
- **Confidence Indicators**: See where AI is certain vs. uncertain about groupings
- **Smart Export**: Export at any level (summary, detailed, or complete raw data)
- **Outlier Detection**: Automatically flag unique responses that don't fit patterns

### For Poll Participants
- **Natural Expression**: Submit responses without being limited to predefined options
- **Transparency**: See where your response was categorized in the tree
- **Trust Building**: View grouped responses to understand how AI clustered
- **Results Access**: View aggregated results after poll completion

### AI Processing Engine
- **Semantic Similarity Detection**: Understands meaning, not just text matches
  - "dark mode" = "dark theme" = "night mode"
- **Hierarchical Clustering (HAC)**: Builds category trees automatically using Hierarchical Agglomerative Clustering
  - Performance → Loading Speed → Slow Startup → "app takes forever to load"
- **Automatic Subclassification**: Creates meaningful subcategories within categories
- **Confidence Scoring**: Flags uncertain groupings for human review
- **Outlier Identification**: Surfaces unique responses that don't fit patterns
- **Smart Aggregation**: Rolls up counts at each level of the hierarchy
- **AI Provider Support**: Pluggable architecture supporting OpenAI, Google Gemini, AWS Bedrock, and other providers

## 🛠 Technology Stack

- **Framework**: Flutter (Cross-platform mobile and web)
- **Language**: Dart
- **Backend**: Node.js with Express.js (TypeScript recommended)
  - RESTful API for poll management
  - AI processing service (using external AI APIs)
  - Database for storing polls and responses
- **AI/ML Integration**:
  - **Multi-provider support** (OpenAI, Google Gemini, AWS Bedrock, others)
  - Natural Language Processing for semantic analysis via API
  - Embedding generation for similarity detection
  - HAC (Hierarchical Agglomerative Clustering) for hierarchical categorization
  - Confidence scoring for grouping accuracy
  - Sentiment analysis via AI API

## 🚀 Getting Started

### First-Time Flutter Setup

**New to Flutter?** If this is your first time setting up Flutter, please follow our comprehensive [First-Time Setup Guide](FIRST_TIME_SETUP.md) which covers:
- Installing Flutter SDK on Windows, macOS, and Linux
- Setting up Android Studio and Xcode
- Configuring environment variables
- IDE setup (VS Code and Android Studio)
- Troubleshooting common issues

### Prerequisites

- Flutter SDK (3.16.0 or higher)
- Dart SDK
- Android Studio / Xcode (for mobile development)
- VS Code or Android Studio (recommended IDE)

> **Note**: If you haven't installed Flutter yet, see [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) for detailed installation instructions.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd visinfo
```

2. Install Flutter dependencies:
```bash
cd frontend
flutter pub get
```

3. Run the Flutter application:
```bash
flutter run
```

4. Install backend dependencies (optional):
```bash
cd ../backend
npm install
```

5. Run the backend server:
```bash
npm run dev
```

### Platform-Specific Setup

#### Android
- Ensure Android SDK is installed
- Configure `android/local.properties` with your SDK path

#### iOS
- Ensure Xcode is installed
- Run `pod install` in the `ios` directory (if using CocoaPods)

#### Web
- No additional setup required
- Run with `flutter run -d chrome`

#### Desktop (Windows/Linux/macOS)
- Follow Flutter desktop setup instructions for your platform

## 📱 Project Structure

```
visinfo/
├── frontend/                 # Flutter application
│   └── lib/
│       ├── main.dart         # Application entry point
│       ├── models/           # Data models
│       │   ├── poll.dart
│       │   └── response.dart
│       ├── screens/          # UI screens
│       │   ├── home_screen.dart
│       │   ├── create_poll_screen.dart
│       │   ├── poll_detail_screen.dart
│       │   └── results_screen.dart
│       ├── services/         # Business logic
│       │   ├── poll_service.dart
│       │   └── ai_processing_service.dart
│       ├── widgets/          # Reusable widgets
│       │   ├── poll_card.dart
│       │   └── response_input.dart
│       └── utils/            # Utilities
│           ├── constants.dart
│           └── helpers.dart
└── backend/                  # Node.js backend
    └── src/
        ├── server.ts
        ├── app.ts
        ├── routes/
        ├── controllers/
        ├── services/
        ├── models/
        ├── middleware/
        ├── utils/
        └── types/
```

## 🏗 Architecture Overview

### Core Components

1. **Poll Management**
   - Create, read, update, and delete polls
   - Poll configuration (title, description, duration, visibility)

2. **Response Collection**
   - Free-form text input
   - Response validation
   - Real-time submission

3. **AI Processing Engine**
   - Text preprocessing
   - Embedding generation
   - Similarity calculation
   - Clustering algorithm
   - Hierarchical classification tree generation
   - Result aggregation

4. **Results Visualization**
   - Grouped response display
   - Hierarchical classification tree/flowchart
   - Statistics and analytics
   - Trend visualization
   - Export functionality

## 🔄 Workflow

1. **Poll Creation**: User creates a poll with a free-form question
2. **Response Collection**: Participants submit their free-form responses
3. **AI Processing**: 
   - Responses are sent to the AI processing service
   - Semantic embeddings are generated
   - Similar responses are clustered together
   - Results are aggregated
4. **Results Display**: Poll creator views processed results with grouped responses
5. **Classification Tree Generation**: AI creates hierarchical tree/flowchart showing main categories, subcategories, and individual responses
6. **Analytics**: Insights and trends are displayed in an easy-to-understand format

## 🎨 Example Use Cases

### Real-World Scenario: Product Feature Prioritization

**Question (AI-optimized)**: "What feature would most improve your experience with our app?"

**Responses Collected** (847 total):
```
"app takes forever to load"
"slow startup time"
"crashes on Samsung Galaxy"
"dark mode please"
"need better search"
"iOS app needed"
...and 841 more
```

### Hierarchical Results View

#### Level 1: Executive View (Top Categories)
```
📊 Poll Results: 847 responses

[+] Performance Issues (127) ━━━━━━━━━━━━━━ 15%
[+] Feature Requests (234) ━━━━━━━━━━━━━━━━━━━━ 28%
[+] UI Improvements (90) ━━━━━━━━━━ 11%
[+] Platform Support (89) ━━━━━━━━━ 11%
[+] Integration Requests (76) ━━━━━━━ 9%
...
```
**Use case**: CEO sees "Performance is our #1 issue" → prioritizes engineering resources

---

#### Level 2: Product Manager View (Subcategories)
*Clicks "Performance Issues"*
```
[-] Performance Issues (127)
  [+] Loading Speed (68) ━━━━━━━━━━━━━ 54% of performance
  [+] Crashes (35) ━━━━━ 28%
  [+] Battery Drain (24) ━━━ 19%
```
**Use case**: PM identifies "Loading speed affects 68 users - prioritize this sprint"

---

#### Level 3: Engineering View (Specific Issues)
*Clicks "Loading Speed"*
```
[-] Loading Speed (68)
  [+] Slow Startup (31) ━━━━━━ 46%
  [+] Page Transitions (22) ━━━━ 32%
  [+] Image Loading (15) ━━ 22%
```
**Use case**: Engineering lead assigns tickets for each issue

---

#### Level 4: Developer View (Raw Responses)
*Clicks "Slow Startup"*
```
[-] Slow Startup (31 responses)
  💬 "app takes forever to load" (12 similar) ✓ High confidence
  💬 "slow startup time" (9 similar) ✓ High confidence
  💬 "launches too slow" (7 similar) ✓ High confidence
  💬 "opening the app is sluggish" (3 similar) ✓ High confidence
```

*Clicks "app takes forever to load" to see actual submissions*
```
Viewing cluster: "app takes forever to load" (12 responses)

1. "app takes forever to load"
2. "takes too long to open"
3. "forever to start up"
4. "way too slow to launch"
5. "startup is painfully slow on my Pixel 6"  ⚠️ Device-specific
6. "loading time is ridiculous"
7. "app launch takes 10+ seconds"  ⚠️ Specific timing
8. "slow to open every time"
...
```
**Use case**: Developer sees "Pixel 6" mentioned - investigates device-specific issues

---

### Key Benefits Demonstrated

1. **No Information Loss**: From "127 performance issues" down to "Pixel 6" device specifics
2. **Stakeholder-Appropriate Depth**: Everyone consumes at the level they need
3. **Audit Trail**: Any number traces back to source responses
4. **Confidence Indicators**: Flags uncertain groupings for human review
5. **Actionable Insights**: Clear priorities at every level

### Another Example: Simple Feature Request

**Question**: "What feature would you like next?"

**Response fragmentation problem solved:**
```
[+] Dark Mode (90 responses) ━━━━━━━━━━━━ 28%
    ├─ "dark mode" (47)
    ├─ "dark theme" (23)
    ├─ "night mode" (12)
    └─ "darker UI" (8)
```

**Without VisInfo**: 4 separate requests with low individual counts
**With VisInfo**: Clear winner with 90 votes (28% of all responses)

## 🔮 Future Enhancements

### Core Features
- [ ] **Human-in-the-Loop Review**: Manual adjustment of AI groupings with learning
- [ ] **Confidence Thresholds**: Set minimum confidence for auto-grouping
- [ ] **Multi-language Support**: Semantic similarity across languages
- [ ] **Sentiment Analysis Layer**: Add sentiment dimension to hierarchical view
- [ ] **Time-series Analysis**: Track how categories emerge over poll duration

### Question Design Improvements
- [ ] **Question Templates Library**: Pre-optimized questions for common use cases
- [ ] **A/B Question Testing**: Compare effectiveness of different question phrasings
- [ ] **Domain-Specific Optimization**: Tuned suggestions for product, HR, research contexts

### Advanced Analytics
- [ ] **Trend Identification**: Spot emerging patterns as responses come in
- [ ] **Cross-poll Analysis**: Compare results across multiple related polls
- [ ] **Demographic Segmentation**: Drill-down by user segments (if metadata provided)
- [ ] **Export to Research Tools**: Integration with qualitative analysis software

### Collaboration & Workflow
- [ ] **Team Collaboration**: Multiple analysts can review and adjust classifications
- [ ] **Approval Workflow**: Review uncertain groupings before finalizing results
- [ ] **Annotation System**: Add notes and tags to clusters
- [ ] **Version History**: Track how classification evolves with human adjustments

### Trust & Transparency
- [ ] **Explainable AI**: Show why responses were grouped together
- [ ] **User Feedback Loop**: Let participants verify their categorization
- [ ] **Quality Metrics**: Inter-rater reliability, consistency scores
- [ ] **Audit Logs**: Complete trail of AI + human decisions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[Specify your license here]

## 📧 Contact

[Add contact information]

---

**Note**: This project is in active development. Features and architecture may change as the project evolves.

