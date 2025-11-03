# Agent Collaboration Workflow - User Guide

## Overview

The RustPresenter project uses a multi-agent collaboration system powered by GitHub Copilot to analyze issues and plan implementations. This system ensures that all aspects of a feature or bug fix are thoroughly reviewed by specialized experts before implementation begins.

## Key Changes from Previous Version

### ✅ What's Fixed

1. **No More Workflow Failures**: Removed the non-existent `github/copilot-agent-action@v1` reference
2. **No Automatic PR Creation**: Workflows no longer trigger automatically on issue creation
3. **Manual Control**: All agent invocations are now manual via GitHub Copilot interface
4. **Two New Agents**: Added GitHub Workflow Expert and Project Manager agents

### 🔄 How It Works Now

#### Before (Broken)
- Issue opened → Automatic workflow trigger → Agents try to run via non-existent action → **FAILURE**
- PR created automatically without proper review

#### Now (Fixed)
- Issue opened → Manual agent invocation via Copilot → Each agent analyzes → Project Manager synthesizes → **Manual PR creation**

## How to Use the Collaboration System

### Step 1: Create an Issue

Create a GitHub issue describing the feature, bug, or improvement.

### Step 2: Trigger Collaboration (Optional)

You can manually trigger the collaboration info workflow to post helpful information to the issue:

```bash
# Via GitHub CLI
gh workflow run issue-agent-collaboration.yml -f issue_number=123

# Or via GitHub Web UI
# Navigate to: Actions → Issue Agent Collaboration → Run workflow
```

This will post a comment explaining the collaboration process.

### Step 3: Invoke Agents

Use GitHub Copilot to invoke each agent in sequence. You can do this through:

#### Option A: GitHub Copilot Workspace
1. Open the issue in GitHub Copilot Workspace
2. Reference the agent definition files (`.github/agents/*.md`)
3. Ask Copilot to analyze the issue using each agent's perspective

#### Option B: IDE with GitHub Copilot
1. Open your IDE with GitHub Copilot enabled
2. Create a prompt that references the agent definition
3. Include the issue details in your prompt

Example prompt format:
```
Using the agent definition in .github/agents/Backend-Expert.md, analyze the following issue:

Issue Title: [TITLE]
Issue Description: [DESCRIPTION]

Please provide your Backend Expert analysis considering:
- Backend architecture implications
- API design considerations
- Database and data flow concerns
- Performance and scalability
```

### Step 4: Follow the Collaboration Sequence

Invoke agents in this recommended order:

#### Phase 1: Initial Analysis
1. **Backend Expert** → Backend architecture, API design, database concerns
2. **Integration Architect** → Component integration, cross-system communication

#### Phase 2: Frontend & UX
3. **Frontend Expert** → Frontend implementation, component architecture
4. **UX Designer** → User experience, interface design

#### Phase 3: Specialized Systems
5. **Media Systems Engineer** → Audio/video processing, FFmpeg, DMX lighting
6. **Cross-Platform Systems Expert** → Platform-specific considerations (Windows/Linux/macOS)

#### Phase 4: Quality & Workflow
7. **QA Testing Expert** → Testing strategy, quality assurance
8. **GitHub Workflow Expert** → CI/CD, workflow configurations (if applicable)

#### Phase 5: Coordination
9. **Project Manager** → Synthesize feedback, create implementation plan

### Step 5: Review and Implement

After the Project Manager provides the final summary:
1. Review the consolidated implementation plan
2. Identify any conflicts or concerns
3. Make decisions on the approach
4. **Then and only then** create a PR to implement the changes

## Agent Descriptions

### 🔧 Backend Expert
- **Focus**: Node.js, Rust, Tauri
- **Reviews**: API design, database schema, authentication, performance
- **Use When**: Issue involves server-side logic, data storage, or backend APIs

### 🔗 Integration Architect
- **Focus**: System integration, API contracts
- **Reviews**: How components communicate, data flow between services
- **Use When**: Issue spans multiple systems or requires API changes

### 🎨 Frontend Expert
- **Focus**: ReactJS, HTML, CSS, TailwindCSS
- **Reviews**: Component architecture, state management, UI implementation
- **Use When**: Issue involves user interface or frontend logic

### 👤 UX Designer
- **Focus**: User experience, accessibility
- **Reviews**: Usability, interface design, user workflows
- **Use When**: Issue affects how users interact with the application

### 🎬 Media Systems Engineer
- **Focus**: Audio/video processing, FFmpeg, DMX
- **Reviews**: Media pipelines, audio transposition, lighting control
- **Use When**: Issue involves multimedia or lighting systems

### 💻 Cross-Platform Systems Expert
- **Focus**: Windows, Linux, macOS compatibility
- **Reviews**: Platform-specific issues, system dependencies
- **Use When**: Issue has platform-specific considerations

### ✅ QA Testing Expert
- **Focus**: Testing strategy, quality assurance
- **Reviews**: Test coverage, edge cases, test automation
- **Use When**: Any issue (should almost always be involved)

### ⚙️ GitHub Workflow Expert
- **Focus**: GitHub Actions, CI/CD, workflows
- **Reviews**: Workflow syntax, action usage, pipeline optimization
- **Use When**: Issue involves GitHub Actions or CI/CD

### 📋 Project Manager
- **Focus**: Coordination, synthesis, planning
- **Reviews**: All agent feedback, creates unified plan
- **Use When**: After all other agents have provided feedback

## Best Practices

### DO ✅
- Invoke agents in the recommended sequence
- Let each agent read previous comments before analyzing
- Have the Project Manager create the final synthesis
- Create PRs only after the Project Manager has finalized the plan
- Document which agents were consulted in the PR description

### DON'T ❌
- Skip agents that are relevant to the issue
- Create PRs before agent analysis is complete
- Ignore conflicts between agent recommendations
- Rush through the process

## Troubleshooting

### Workflow Fails to Run
**Problem**: GitHub Actions workflow fails  
**Solution**: Ensure you're using `workflow_dispatch` trigger with `issue_number` input

### Agent Doesn't Respond as Expected
**Problem**: Agent response doesn't match expectations  
**Solution**: 
- Verify you're referencing the correct agent definition file
- Include more context in your prompt
- Check that the issue description is clear and detailed

### Conflicting Recommendations
**Problem**: Different agents suggest different approaches  
**Solution**: 
- Let the Project Manager agent synthesize the feedback
- The PM will identify conflicts and recommend a path forward
- Sometimes human judgment is needed - that's okay!

### Not Sure Which Agents to Use
**Problem**: Unclear which agents are relevant  
**Solution**: 
- Start with Backend Expert and Integration Architect
- They will often tag other agents that should be involved
- When in doubt, consult the Project Manager

## Examples

### Example 1: Simple Bug Fix

For a simple backend bug:
1. **Backend Expert** - Analyzes the bug and proposes fix
2. **QA Testing Expert** - Suggests tests to prevent regression
3. **Project Manager** - Confirms approach and creates summary
4. Create PR

### Example 2: New Feature

For a new feature spanning frontend and backend:
1. **Backend Expert** - Designs API and data models
2. **Integration Architect** - Plans API contracts
3. **Frontend Expert** - Plans UI components
4. **UX Designer** - Reviews user experience
5. **QA Testing Expert** - Designs test strategy
6. **Project Manager** - Creates comprehensive implementation plan
7. Create PR

### Example 3: Workflow Issue

For a GitHub Actions problem:
1. **GitHub Workflow Expert** - Analyzes workflow failure
2. **Cross-Platform Systems Expert** - Checks if platform-specific (if relevant)
3. **Project Manager** - Confirms fix approach
4. Create PR

## FAQ

**Q: Do I have to use all agents for every issue?**  
A: No, only use agents relevant to the issue. Simple bug fixes may only need 1-2 agents.

**Q: Can I use agents in a different order?**  
A: Yes, but the recommended sequence ensures each agent has proper context from previous analyses.

**Q: What if an agent's recommendation doesn't make sense?**  
A: Re-invoke the agent with clarifying questions, or have the Project Manager synthesize conflicting views.

**Q: How long should the collaboration take?**  
A: For simple issues: 15-30 minutes. For complex features: 1-2 hours. The time investment prevents costly implementation mistakes.

**Q: Can I skip the Project Manager?**  
A: For very simple issues (1-2 agents), you can. For anything complex, the PM's synthesis is valuable.

## Support

If you encounter issues with the agent collaboration system:
1. Check the **GitHub Workflow Expert** agent definition
2. Review the `.github/agents/README.md` file
3. Open an issue describing the problem
4. Tag `@m-burgess` for assistance
