# Webma complete upgrade manifest

## Existing product preserved

No existing users, projects, websites, generated code, AI data, files, or database rows are intentionally deleted or reset.

## Added/improved in this package

### Frontend
- Premium landing page messaging retained and documented
- Visual/Code editor mode switch
- Desktop/tablet/mobile preview controls
- Visual element selection inside live preview
- Selected-element context panel
- Context-aware AI editing
- AI suggestion shortcut
- Undo / redo buttons and keyboard shortcuts
- Explicit Save button and save status
- Better editor toolbar
- New-tab preview

### AI
- Structured site specification requested during generation
- Stronger responsive/accessibility/security generation rules
- Default component export compatibility requirement
- Selected-element context sent to targeted AI edits
- Existing provider fallback architecture preserved

### Backend
- AI edit checkpoints before changes
- Theme-change checkpoints before changes
- Safe manual checkpoint endpoint
- Deployment provider deployment ID tracking
- Vercel deployment status polling
- Per-user Vercel OAuth token support for status checks
- Generated component export normalization
- lucide-react included in generated deploy/export package dependencies

### Database
- Additive deployment provider ID column
- Deployment indexes
- Existing data untouched
- Migration included separately from base schema

### Documentation
- Production-readiness checklist
- Gap analysis
- Final upgrade manifest
- Updated README
- Updated environment example

## Verification performed here

- Final ZIP archive created successfully
- ZIP integrity test passed
- Repository contains no node_modules or build artifacts

## Verification not possible in this execution environment

`npm install` could not finish before the execution timeout, so a full dependency-backed TypeScript/build test was not possible here. The GitHub Actions CI included in the repository remains the authoritative build/test gate.
