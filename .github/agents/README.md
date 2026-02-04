# GitHub Copilot Agent Collaboration

This directory contains specialized GitHub Copilot agents for collaborative issue analysis and implementation planning.

## Available Agents

### Backend Expert
**File**: `Backend-Expert.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: Node.js, Rust, Tauri, API design, database integration, authentication, performance optimization

### Frontend Expert
**File**: `Frontend-Expert.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: HTML, CSS, ReactJS, TailwindCSS, component architecture, responsive design

### Integration Architect
**File**: `Integration-Architect.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: API design, cross-system communication, deployment pipelines, architecture coordination

### UX Designer
**File**: `UX-Designer.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: User experience, interface design, usability, accessibility

### Media Systems Engineer
**File**: `Media-Systems-Engineer.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: Audio/video processing, FFmpeg, DMX lighting control, media pipelines

### Cross-Platform Systems Expert
**File**: `Cross-Platform-Systems-Expert.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: Windows/Linux/macOS setup, FFmpeg configuration, MIDI routing, Tauri dependencies

### QA Testing Expert
**File**: `QA-Testing-Expert.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: Unit testing, integration testing, test automation, quality assurance

### GitHub Workflow Expert
**File**: `GitHub-Workflow-Expert.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: GitHub Actions, workflow syntax, CI/CD, debugging, permissions

### Project Manager
**File**: `Project-Manager.md`
**Workflow**: `.github/workflows/comprehensive-agent-workflow.yml` (consolidated)
**Specialization**: Multi-agent coordination, synthesizing feedback, implementation planning, PR creation

## How to Use

### Manual Invocation (Recommended)

These agents are designed to be used through the GitHub Copilot interface within your IDE or through GitHub Copilot Workspace.

1. **Open the issue** you want analyzed
2. **Use GitHub Copilot** to invoke specific agents
3. **Reference agent definitions** from `.github/agents/` directory
4. **Follow the collaboration sequence** described below

### Collaboration Workflow

The recommended sequence for multi-agent collaboration:

#### Phase 1: Initial Analysis
1. **Backend Expert** - Analyzes backend architecture and API design
2. **Integration Architect** - Reviews component integration

#### Phase 2: Frontend & UX
3. **Frontend Expert** - Evaluates frontend implementation
4. **UX Designer** - Provides user experience perspective

#### Phase 3: Specialized Systems
5. **Media Systems Engineer** - Reviews audio/video processing
6. **Cross-Platform Systems Expert** - Analyzes platform-specific concerns

#### Phase 4: Quality & Workflow
7. **QA Testing Expert** - Defines testing strategy
8. **GitHub Workflow Expert** - Reviews CI/CD configurations

#### Phase 5: Coordination
9. **Project Manager** - Synthesizes all feedback and creates implementation plan

### GitHub Actions Workflow

The workflow at `.github/workflows/issue-agent-collaboration.yml` can be manually triggered to post collaboration information to an issue:

```bash
# Trigger via GitHub CLI
gh workflow run issue-agent-collaboration.yml -f issue_number=<ISSUE_NUMBER>

# Or trigger via GitHub UI
# Actions → Issue Agent Collaboration → Run workflow
```

**Note**: This workflow does NOT automatically create PRs. PRs should only be created after:
- All relevant agents have provided their analysis
- The Project Manager has synthesized feedback into a plan
- The implementation approach has been reviewed and approved

## Important Notes

- **No Automatic PR Creation**: Unlike previous versions, PRs are not automatically created when issues are opened
- **Manual Agent Invocation**: Agents are invoked through GitHub Copilot, not through automated GitHub Actions
- **Workflow Placeholders**: Individual agent workflow files serve as documentation and can be extended in the future
- **Action Reference**: The previous `github/copilot-agent-action@v1` reference has been removed as it's not a public action

## Extending the System

To add new specialized agents:

1. Create an agent definition in `.github/agents/<Agent-Name>.md`
2. Create a corresponding workflow in `.github/workflows/agent-<agent-name>.yml`
3. Update this README with the new agent's information
4. Update the collaboration workflow if the agent should be part of the standard sequence

## Troubleshooting

### Workflow Failures
If you encounter workflow failures:
1. Check the **GitHub Workflow Expert** agent definition
2. Verify YAML syntax in workflow files
3. Ensure required permissions are granted
4. Review GitHub Actions logs for specific error messages

### Agent Not Responding
If an agent doesn't respond as expected:
1. Verify you're using the agent through GitHub Copilot interface
2. Check that the agent definition file exists in `.github/agents/`
3. Ensure your prompt is clear and includes necessary context
4. Reference the agent's specialization areas for appropriate tasks
