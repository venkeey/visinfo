# AI-Assisted Question Design

## Overview

The quality of poll questions directly impacts the quality of AI-processed results. VisInfo's AI Question Designer helps poll creators craft questions that produce groupable, analyzable responses.

## The Core Insight

**If AI will process the responses, design the question to work with AI from the start.**

Bad questions produce ungroupable chaos. Good questions produce structured, actionable insights.

## Question Quality Spectrum

### ❌ Ungroupable Questions

**Too Broad:**
```
"What do you think about our product?"

Responses:
- "It's great!" (sentiment)
- "Crashes on Android" (bug report)
- "I want dark mode" (feature request)
- "Customer support was rude" (service issue)
- "Pricing is too high" (business model)

❌ AI cannot meaningfully group - responses span completely different domains
```

**Too Ambiguous:**
```
"How can we improve?"

Problem: Users don't know what to focus on
- Technical improvements?
- Customer service?
- Pricing?
- Features?

❌ Produces scattered, unactionable responses
```

**Leading/Biased:**
```
"Why do you love our amazing product?"

❌ Biases responses, excludes negative feedback
```

### ✅ Groupable Questions

**Focused Domain:**
```
"What feature would most improve your experience?"

✓ Clear scope: features only
✓ AI can group: "dark mode", "dark theme", "night mode"
✓ Actionable: product team knows what to build
```

**Specific Problem Space:**
```
"What frustrates you most when using [product]?"

✓ Clear scope: pain points
✓ AI can group similar frustrations
✓ Actionable: prioritize fixes
```

**Scoped Comparison:**
```
"What's the main reason you chose [our product] over alternatives?"

✓ Clear scope: competitive advantages
✓ AI can identify themes
✓ Actionable: marketing insights
```

## The AI Question Design Flow

### Step 1: Intent Discovery

**System asks creator:**
```
What do you want to learn from this poll?

[  ] Features users want
[  ] Problems users experience
[  ] Reasons for user behavior
[  ] Opinions on a specific topic
[  ] Satisfaction/sentiment
[  ] Other: _____________
```

### Step 2: AI Suggests Focused Questions

**Creator selects: "Features users want"**

**AI suggests:**
```
Recommended questions:

1. "What feature would most improve your experience with [product]?"
   ✓ Highly groupable
   ✓ Produces actionable feature requests

2. "If you could add one feature to [product], what would it be?"
   ✓ Forces prioritization
   ✓ Clear scope

3. "What's missing from [product] that you need?"
   ✓ Reveals gaps
   ✓ Groupable by feature category
```

### Step 3: Preview AI Categorization

**Creator selects question #1**

**AI shows preview:**
```
Expected response categories:

High probability:
📊 UI/UX Improvements (25-35% typical)
📊 Performance Enhancements (15-25% typical)
📊 Integration Requests (10-20% typical)
📊 Platform Support (10-15% typical)

This question typically produces 4-6 main categories
with 2-3 levels of subcategorization.

Groupability score: 8.5/10 ✓
```

### Step 4: Refinement Suggestions

**If question needs improvement:**
```
Your question: "What do you think we should work on?"

⚠️ Issues detected:
- Too vague - responses may span multiple domains
- "Think" and "should" allow opinion vs. personal need
- No clear scope or context

Suggested improvements:
→ "What feature would most improve [product] for you?"
→ "What problem with [product] should we fix first?"
→ "What would make you use [product] more often?"

Or refine your question:
[What do you think we should work on?           ]
                                            [Get Feedback]
```

### Step 5: Set Expectations for Participants

**Final question preview:**
```
Your poll question:
"What feature would most improve your experience with our app?"

Shown to participants:
┌─────────────────────────────────────────┐
│ What feature would most improve your    │
│ experience with our app?                │
│                                         │
│ 💡 Tip: Be specific! Examples:         │
│ - "Dark mode for night usage"          │
│ - "Offline access to saved items"      │
│ - "Faster search with filters"         │
│                                         │
│ Your response will be grouped with     │
│ similar suggestions.                   │
└─────────────────────────────────────────┘

[Launch Poll] [Edit Question]
```

## AI Quality Scoring System

The AI evaluates questions on multiple dimensions:

### Groupability Score (0-10)

**Components:**
- **Scope clarity** (0-3): Is the domain clear?
- **Response predictability** (0-3): Can we anticipate response types?
- **Semantic distance** (0-2): How similar will responses be?
- **Actionability** (0-2): Will results inform decisions?

**Examples:**

```
"What do you think?" → Score: 2/10
- Scope: 0 (completely unclear)
- Predictability: 0 (anything goes)
- Semantic distance: 0 (huge variation)
- Actionability: 1 (maybe some insights)

"What feature do you want?" → Score: 8.5/10
- Scope: 3 (clear: features)
- Predictability: 3 (can anticipate categories)
- Semantic distance: 2 (similar phrasing)
- Actionability: 2 (directly actionable)
```

### Real-time Feedback

As creator types, show live feedback:

```
[What do you think about our product?          ]

⚠️ Groupability: 3/10
Issues:
- Too broad - combines features, bugs, service, pricing
- "Think about" allows any type of response
Suggestion: Focus on one area (features, problems, or experience)
```

```
[What feature would improve the app?           ]

✓ Groupability: 8/10
Looks good! This question will produce groupable responses.
Predicted categories: 4-6 main themes
```

## Question Templates by Use Case

### Product Development

```
✓ "What feature would most improve [product]?"
✓ "What's missing from [product] that you need?"
✓ "If you could add one thing to [product], what would it be?"
✓ "What would make [product] indispensable for you?"
```

### Problem Discovery

```
✓ "What frustrates you most about [product]?"
✓ "What prevents you from using [product] more often?"
✓ "What problem with [product] should we fix first?"
✓ "When does [product] not work as you expect?"
```

### User Research

```
✓ "What's the main reason you use [product]?"
✓ "Why did you choose [product] over alternatives?"
✓ "What's the most valuable thing [product] does for you?"
✓ "What made you start using [product]?"
```

### Experience Improvement

```
✓ "What would make [product] easier to use?"
✓ "What's confusing about [product]?"
✓ "Where do you get stuck when using [product]?"
✓ "What takes too long in [product]?"
```

## Advanced: Domain-Specific Optimization

### For Technical Products

**Generic:**
"What feature do you want?"

**Optimized for technical audience:**
"What API, integration, or technical capability should we prioritize?"

Result: More specific, technical responses that group well

### For Consumer Apps

**Generic:**
"How can we improve?"

**Optimized for consumer audience:**
"What would make [app] more fun/useful/easy for you?"

Result: Responses focused on UX and value, not technical details

### For B2B/Enterprise

**Generic:**
"What do you need?"

**Optimized for business buyers:**
"What capability would help your team achieve [outcome] faster?"

Result: ROI-focused, team-level needs that group by business function

## Anti-Patterns to Avoid

### ❌ Multiple Questions in One

```
"What features do you want and what bugs are bothering you?"

Problem: Mixing domains - responses will be split
Better: Run as two separate polls
```

### ❌ Yes/No with Explanation

```
"Do you like our product? Why or why not?"

Problem: Free-form part is either very positive or very negative
Better: "What do you like most/least?" (separate polls)
```

### ❌ Hypotheticals

```
"If we added dark mode, would you use it?"

Problem: Hypothetical preferences unreliable, also not free-form
Better: "What UI improvement would you use most?"
```

### ❌ Asking for Solutions Instead of Problems

```
"What color should the button be?"

Problem: Users aren't designers - prescriptive answers
Better: "What's confusing about the checkout process?"
(Let designers solve the real problem)
```

## Measuring Question Effectiveness

### Post-Poll Metrics

After poll closes, show creator:

```
Question Performance Report

Your question: "What feature would most improve the app?"

📊 Response Quality
- Groupability: 8.7/10 (predicted 8.5)
- Categories generated: 5 main, 14 sub
- Average cluster size: 12 responses
- Outliers: 3% (within normal range)

✓ High-confidence groupings: 87%
⚠️ Medium-confidence: 11%
❌ Low-confidence: 2%

💡 Insights:
- Question performed as expected
- Clear winner emerged: "Dark Mode" (23%)
- All categories actionable for product team

[View Full Results]
```

### Learning Loop

Track which question patterns produce best results:

```
Your question patterns over time:

Most successful: "What feature would..." (avg groupability: 8.9)
Least successful: "What do you think about..." (avg: 4.2)

💡 Keep using focused, action-oriented questions
```

## Implementation Notes

### Technical Requirements

1. **Real-time question analysis**
   - Parse question as user types
   - Identify scope, domain, clarity
   - Score groupability

2. **Template library**
   - Store proven question patterns
   - Tag by domain, use case, audience
   - Track effectiveness metrics

3. **Preview engine**
   - Simulate likely response categories
   - Based on historical data from similar questions
   - Show confidence ranges

4. **User guidance system**
   - Detect issues (too broad, ambiguous, etc.)
   - Suggest specific improvements
   - Explain why suggestions help

### UX Principles

- **Educate, don't dictate**: Explain why focused questions work better
- **Show, don't tell**: Preview expected categorization
- **Learn from data**: Improve suggestions based on actual poll results
- **Progressive disclosure**: Basic users get simple suggestions, advanced users get detailed metrics

## Success Criteria

A well-designed question produces:

✓ **4-8 main categories** (not too scattered, not too homogeneous)
✓ **2-4 levels of depth** (enough hierarchy to drill down)
✓ **>80% high-confidence groupings** (AI is certain)
✓ **<5% outliers** (most responses fit patterns)
✓ **Clear actionability** (results inform decisions)

## Conclusion

AI-assisted question design is the **upstream solution** that makes downstream AI processing effective. By helping creators ask better questions, we ensure:

1. Responses are naturally groupable
2. Results are actionable
3. AI processing is confident and accurate
4. Users trust the categorization

This feature is not just helpful - it's **essential** for VisInfo's value proposition.
