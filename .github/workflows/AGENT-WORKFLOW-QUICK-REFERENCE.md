# Comprehensive Agent Workflow - Quick Reference

## 🚀 Quick Start

### Run the Workflow
1. Go to **Actions** tab → **Comprehensive Multi-Agent Development Workflow**
2. Click **Run workflow**
3. Enter:
   - **Feature Request**: "Add new scheduler UI component"
   - **Project Context**: "Must follow MVVM pattern"
4. Click **Run workflow**

## 📋 Agent Flow (7 Phases)

```
Phase 1: Product Owner Planning    → Creates vision & scope
Phase 2: Project Manager Planning   → Creates detailed plans
Phase 3: Backend Implementation     → Implements backend with helpers
Phase 4: Frontend Implementation    → Implements UI with helpers
Phase 5: QA Testing                 → Comprehensive testing
Phase 6: Project Manager Validation → Checks plan adherence
Phase 7: Product Owner Approval     → Final vision check
```

## 🤖 All Agents Used

### Primary Flow Agents
1. **Product-owner.md** - Vision, scope, acceptance criteria
2. **Project-Manager.md** - Planning, coordination, validation
3. **Backend-Expert.md** - Backend implementation
4. **Frontend-Expert.md** - Frontend implementation
5. **QA-Testing-Expert.md** - Testing and quality assurance

### Helper Agents (Backend Phase)
- **Cross-Platform-Systems-Expert.md** - OS-specific concerns
- **Integration-Architect.md** - Component integration
- **Node.js Expert.agent.md** - Node.js best practices
- **OOP-Design-Expert.md** - Design patterns
- **Typescript-Expert.agent.md** - TypeScript implementation

### Helper Agents (Frontend Phase)
- **Node.js Expert.agent.md** - Build tooling
- **Typescript-Expert.agent.md** - TypeScript implementation
- **UX-Designer.md** - UI/UX design

## 📦 Artifacts Generated

Each run creates 8 artifacts:
1. `01-product-owner-plan.md` - High-level vision
2. `02-project-manager-plans.md` - Detailed plans
3. `03-backend-report.md` - Backend implementation
4. `04-frontend-report.md` - Frontend implementation
5. `05-qa-report.md` - Test results
6. `06-pm-validation.md` - Validation review
7. `07-product-owner-approval.md` - Final approval
8. `complete-workflow-summary/` - All artifacts

## ✅ Quality Gates

| Gate | Agent | Decision Point |
|------|-------|----------------|
| Vision | Product Owner | Scope & vision alignment |
| Planning | Project Manager | Detailed plans created |
| Implementation | Backend/Frontend | Code follows MVVM |
| Testing | QA Expert | All tests pass |
| Validation | Project Manager | Work matches plan? |
| Approval | Product Owner | Work matches vision? |

## 🔄 Feedback Loops

### Loop 1: Plan Adherence
```
QA Testing → PM Validation
              ↓
         Does work match plan?
              ↓
         NO → Create fix plan → Backend → Frontend → QA
         YES → Continue
```

### Loop 2: Vision Alignment
```
PM Validation → Product Owner
                    ↓
            Work matches vision?
                    ↓
            NO → New plan → PM → Backend → Frontend → QA → PM
            YES → Complete! ✅
```

## 🎯 When to Use

### ✅ Use for:
- New feature development
- Multi-component features
- MVVM architecture changes
- Features needing QA validation

### ❌ Don't use for:
- Quick bug fixes
- Documentation only
- Minor tweaks
- Emergency hotfixes

## 📊 Workflow Inputs

| Input | Required | Description | Example |
|-------|----------|-------------|---------|
| feature_request | Yes | High-level feature description | "Add MIDI controller support" |
| project_context | No | Additional context/constraints | "Must work on all platforms" |

## 🔍 Monitoring Execution

1. **Actions Tab** → Your workflow run
2. **Jobs Graph** → Visual job flow
3. **Job Logs** → Detailed execution logs
4. **Artifacts** → Download generated documents

## 🛠️ Customization Points

### Modify Agent Tasks
Edit job steps in `comprehensive-agent-workflow.yml`:
- Change checklist items
- Add/remove helper agents
- Modify artifact names

### Add Conditional Logic
```yaml
if: github.event.inputs.project_context == 'urgent'
```

### Skip Phases
Add conditions to skip phases for simple features

### Add Notifications
```yaml
- name: Notify Team
  uses: slack-action@v1
```

## 🧪 Testing the Workflow

### Test Run Command
```bash
# From Actions tab
Run workflow → Enter test inputs → Monitor execution
```

### Validate Outputs
1. Check all 7 phases complete
2. Download and review artifacts
3. Verify job dependencies work
4. Check artifact upload/download

## 📝 MVVM Compliance

All phases enforce MVVM architecture:

| Layer | Responsibility | Validated By |
|-------|----------------|--------------|
| Model | Domain logic | Backend Expert |
| ViewModel | State management | Backend Expert |
| View | React UI | Frontend Expert |

## 🆘 Troubleshooting

### Workflow Won't Start
- ✓ Check required inputs provided
- ✓ Verify workflow permissions
- ✓ Check YAML syntax

### Phase Fails
- ✓ Review job logs
- ✓ Check artifact upload success
- ✓ Verify checkout step

### Missing Artifacts
- ✓ Ensure phase completed
- ✓ Check upload-artifact steps
- ✓ Verify artifact retention

## 💡 Tips

1. **Use Descriptive Feature Requests** - Clear requests lead to better plans
2. **Provide Context** - Help agents understand constraints
3. **Review Artifacts** - Check planning docs before implementation
4. **Follow MVVM** - All agents enforce this pattern
5. **Use Helper Agents** - They provide specialized expertise

## 📚 Related Documentation

- **Full Documentation**: `.github/workflows/README-AGENT-WORKFLOW.md`
- **Workflow File**: `.github/workflows/comprehensive-agent-workflow.yml`
-- **Agent Definitions**: `.github/agents/*.md`
-- **Per-agent Workflows**: none (use consolidated `.github/workflows/comprehensive-agent-workflow.yml` or manual Copilot invocation)

## 🎓 Example Feature Request

### Good Example ✅
```
Feature: Add audio crossfade support
Context: Must work with existing multitrack player, 
         follow MVVM pattern, support all audio formats
```

### Poor Example ❌
```
Feature: Fix stuff
Context: (empty)
```

## 🔗 Integration with GitHub Copilot

This workflow is a **structural framework**. Actual implementation:

1. **Run workflow** → Generates planning documents
2. **Use Copilot** → With agent files in `.github/agents/`
3. **Follow checklists** → From workflow artifacts
4. **Update artifacts** → With implementation results

---

**Quick Help**: Run workflow → Review artifacts → Use agents → Implement → Test → Validate → Approve

**Version**: 1.0.0 | **Last Updated**: 2026-01-28
