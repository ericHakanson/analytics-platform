You are Codex. You are the Architect and QA authority for this project.

Claude will act as the Developer / Implementer.

I am the Product Owner / Final Approver.

Your job is to take the business specification below and convert it into:
	1.	a practical technical architecture,
	2.	a recommended project structure,
	3.	a Linear-ready implementation plan,
	4.	a QA/governance model for reviewing Claude’s work issue by issue.

You must be opinionated, pragmatic, modular, and future-aware without over-engineering.

Do not propose premature microservices, Kubernetes, or unnecessary operational complexity.

Do not treat Squarespace as the analytics platform.

Do not let chat become the source of truth. All implementation work, requirements, acceptance criteria, and project management must live in Linear.

⸻

PROJECT CONTEXT

Codex has already assessed a prior local evidence.dev project and recommended starting fresh.

This project is therefore a new Evidence-based analytics publishing platform for Fort Island.

The purpose is not just to embed charts into a website.

The purpose is to create a reusable analytics publishing layer that turns real-estate signal data into reusable business assets that can support:
	•	website visuals
	•	outbound sales / prospecting support
	•	inbound conversion content
	•	social content
	•	client briefings
	•	repeatable market and signal pages

This project must align with a broader architecture direction:
	•	database
	•	FastAPI service layer
	•	acquisition engine
	•	analytics publishing layer

Current software ecosystem:
	•	HubSpot
	•	Evidence.dev via VS Code on local
	•	Google Cloud and Google Workspace
	•	Squarespace
	•	Linear.app

All requirements, acceptance criteria, and project management must be represented in Linear.

⸻

TEAM OPERATING MODEL

Roles

Codex

Acts as:
	•	Architect
	•	QA authority
	•	technical spec author/refiner
	•	reviewer against requirements and acceptance criteria
	•	issue decomposition advisor for Linear

Codex is responsible for:
	•	validating architecture choices
	•	validating adherence to business spec
	•	reviewing Claude’s implementation against acceptance criteria
	•	rejecting incomplete or off-spec work
	•	defining the initial issue tree and QA checklist

Claude

Acts as:
	•	Developer
	•	implementer
	•	refactorer
	•	documentation contributor
	•	test writer as directed

Claude is responsible for:
	•	implementing approved issues
	•	writing code and project files
	•	updating documentation as required
	•	satisfying acceptance criteria for each Linear issue

Human

Acts as:
	•	Product owner
	•	final approver
	•	prioritizer
	•	business decision-maker

Workflow
	1.	Human creates or approves initiative/project direction.
	2.	Codex turns business spec into implementation architecture and issue structure.
	3.	Linear becomes the canonical repository for:
	•	requirements
	•	acceptance criteria
	•	task decomposition
	•	status
	4.	Claude develops issue by issue.
	5.	Codex reviews and QA’s each issue against acceptance criteria.
	6.	Human approves final decisions, sequencing, and tradeoffs.

⸻

BUSINESS SPECIFICATION

1. Executive summary

Fort Island needs a reusable analytics publishing platform that turns real-estate signal data into assets that can be used across multiple channels without rebuilding the same content repeatedly.

The platform must support:
	•	public-facing website visuals
	•	outbound sales and prospecting support
	•	inbound conversion content
	•	social content
	•	client briefings
	•	repeatable market and signal pages

The business objective is not merely to embed charts into a website. The objective is to create a durable publishing system that converts raw data into reusable business assets.

This project will be developed in a way that supports current v1 needs while creating clean boundaries for the future architecture:
	•	database as system of record
	•	acquisition engine as separate concern
	•	FastAPI as service layer
	•	Evidence as analytics publishing layer
	•	Squarespace as marketing shell
	•	HubSpot as CRM / forms / campaign distribution
	•	Linear as source of truth for work management

2. Problem statement

Today, the real-estate workflow is effectively a single-track v1:
	•	scrape with Bright Data
	•	process data
	•	enrich data
	•	store data

The current gap is that there is no formal publishing layer that turns this data into repeatable, channel-ready signal assets.

Without a structured publishing layer:
	•	content is manually repackaged
	•	website visuals become one-offs
	•	outbound and social require duplicate work
	•	client briefings do not scale
	•	asset quality and consistency drift over time
	•	future architecture becomes harder to separate cleanly

3. Business goals

Primary goals
	1.	Create a reusable analytics publishing layer for Fort Island.
	2.	Reduce one-off content production by turning each signal into a reusable asset.
	3.	Support multiple channels from one canonical data/story pipeline.
	4.	Preserve optionality for future service decomposition.
	5.	Keep operational complexity appropriate for a one-person business.

Secondary goals
	1.	Improve credibility of Fort Island’s website and outbound materials.
	2.	Support faster client customization.
	3.	Create a content system that can evolve into a productized reporting capability.
	4.	Standardize definitions, layouts, and messaging.

Non-goals
	1.	Building a full BI platform.
	2.	Building a multi-tenant SaaS in v1.
	3.	Over-optimizing for heavy automation before content-market fit is proven.
	4.	Making Squarespace the core analytics platform.
	5.	Introducing premature microservices or infrastructure sprawl.

4. Project vision

The target state is a modular publishing system where:
	•	curated signal data is produced from the database and related processing layers
	•	Evidence renders that data into durable, reusable pages and components
	•	those pages and components can be repurposed into website, outbound, social, and briefing materials
	•	FastAPI becomes the future governed service boundary for curated business data
	•	Squarespace promotes and distributes selected public-facing content
	•	HubSpot captures leads, supports forms, and drives campaign workflows
	•	Linear governs implementation, requirements, defects, and acceptance

5. Users and audiences

Internal primary user

Fort Island operator

Needs:
	•	produce polished signal assets quickly
	•	reuse output across channels
	•	avoid rebuilding the same view repeatedly
	•	create client-specific and campaign-specific variants

External audience types

Public website visitor
Needs:
	•	credibility
	•	clear signal proof
	•	concise explanation of why the data matters
	•	path to contact or convert

Prospect
Needs:
	•	market-specific relevance
	•	sales-enabling proof points
	•	confidence that Fort Island can generate useful local insight

Active client
Needs:
	•	tailored briefing content
	•	practical interpretation
	•	evidence of ongoing value

Social audience
Needs:
	•	visually clear, lightweight insights
	•	short narrative framing
	•	content that stands alone outside the site

6. Product principles
	1.	One source, many outputs
Every signal asset should support multiple downstream uses.
	2.	Curated over raw
Publishing should consume curated datasets, not brittle scrape artifacts.
	3.	Templates over one-offs
Reusable patterns are preferred to bespoke pages.
	4.	Narrative plus visualization
Each asset must explain why the visual matters.
	5.	Progressive architecture
Build clean seams now; defer infrastructure splitting until justified.
	6.	Linear as source of truth
No implementation should proceed without corresponding Linear artifacts.

7. Scope

In scope
	•	business architecture for the publishing platform
	•	Evidence-based analytics publishing project
	•	content model for reusable signal assets
	•	templates for public pages, campaign pages, and client briefings
	•	development workflow with Codex and Claude
	•	quality gates
	•	Linear-based project governance
	•	integration expectations for Squarespace and HubSpot
	•	future alignment with FastAPI and acquisition engine

Out of scope
	•	Bright Data acquisition redesign
	•	full database redesign
	•	full CRM redesign in HubSpot
	•	deep marketing automation implementation
	•	billing or entitlements
	•	client authentication and authorization for private portals
	•	full multi-user CMS

8. Functional requirements

FR-1: Canonical content model

The platform must define a standard content model for signal assets.

Each asset must include:
	•	title
	•	asset type
	•	audience
	•	geography / market
	•	date range
	•	refresh cadence
	•	primary message
	•	why it matters
	•	supporting visuals
	•	supporting metrics
	•	CTA
	•	channel suitability
	•	owner/status metadata

FR-2: Asset types

The platform must support at minimum three asset classes:
	•	Evergreen proof asset
	•	Campaign asset
	•	Client briefing asset

FR-3: Evidence project as publishing layer

The analytics publishing layer must be implemented as a dedicated Evidence project, structured for reuse rather than a single report.

The project must support:
	•	multiple pages
	•	reusable layouts or page patterns
	•	reusable queries or modeled datasets
	•	static/self-hosted deployment
	•	future ability to consume curated datasets from files, database connections, or service outputs supported by the chosen architecture

FR-4: Channel reuse

Each asset must be able to generate or support:
	•	website-ready version
	•	outbound-ready summary
	•	social-ready visual/copy seed
	•	client briefing version

FR-5: Narrative packaging

Every asset must include:
	•	headline
	•	why it matters
	•	target audience
	•	CTA
	•	caveats / assumptions
	•	last updated / date context

FR-6: Public website integration

The system must support use on Squarespace in one or both of these patterns:
	•	link-out from Squarespace to hosted Evidence pages
	•	selected embeds or code-block integrations where appropriate

The publishing system must not depend on brittle full-site embedding as the primary model.

FR-7: HubSpot integration model

The system must support HubSpot as the conversion and campaign layer.

At minimum, the solution must support:
	•	CTA links from Evidence/Squarespace into HubSpot forms or landing experiences
	•	optional embedding of HubSpot forms on Squarespace pages
	•	campaign attribution through consistent URL conventions and tracking

FR-8: Curated data boundary

The publishing layer must not read directly from unstable raw scrape tables unless explicitly approved as a temporary exception.

It must target:
	•	curated views
	•	modeled tables
	•	exported analytical datasets
	•	or future FastAPI-served curated outputs

FR-9: Future API compatibility

The platform must be designed so that a future FastAPI layer can become the governed service boundary for curated business entities without requiring a rewrite of the publishing concept.

FR-10: Reusable templates

The solution must provide template patterns for:
	•	public market overview
	•	campaign snapshot
	•	client briefing
	•	proof-point/credibility page

FR-11: Metadata and organization

Assets must be organized in a way that makes them easy to:
	•	find
	•	update
	•	clone
	•	localize by geography/vertical
	•	track in Linear

FR-12: Content lifecycle

The system must support lifecycle states such as:
	•	draft
	•	in review
	•	approved
	•	published
	•	deprecated

Lifecycle control may initially be lightweight and file/Linear-based.

9. Non-functional requirements

NFR-1: Maintainability

A future version of the operator must be able to understand and extend the system without reverse-engineering one-off logic.

NFR-2: Modularity

The Evidence project must be modular enough that pages, data queries, and content components can evolve independently.

NFR-3: Simplicity

The system must optimize for low operational burden.

NFR-4: Consistency

Metrics and visual patterns must be consistent across channels.

NFR-5: Deployability

The publishing layer must be deployable in a clean, repeatable way suitable for self-hosted/static hosting.

NFR-6: Environment hygiene

Configuration and credentials must be environment-specific and not hardcoded into content files.

NFR-7: Scalability of usage

The platform must scale in the sense of repeatable publishing across many assets, markets, campaigns, and clients, even if infrastructure remains lightweight.

10. Architecture requirements

AR-1: Target architecture alignment

The implementation must align with this directional architecture:
	•	database = system of record
	•	acquisition engine = ingest and raw data processing concern
	•	FastAPI = future governed service layer
	•	Evidence = analytics publishing layer
	•	Squarespace = brand shell
	•	HubSpot = conversion/distribution
	•	Linear = work management and quality governance

AR-2: Modular monolith bias

The project should favor a modular monolith and clear boundaries over premature service decomposition.

AR-3: Stable contracts

Data interfaces into the publishing layer must be explicit and versionable.

AR-4: Separation of concerns

Acquisition concerns, business logic, publishing logic, and marketing-site concerns must remain distinct.

11. Linear governance requirements

LG-1

All work must map to Linear artifacts.

LG-2

Each Linear issue must include:
	•	problem statement
	•	scope
	•	business rationale
	•	acceptance criteria
	•	dependencies
	•	definition of done

LG-3

No implementation work should begin without acceptance criteria.

LG-4

Architecture changes must be captured in Linear as explicit decision records or issue descriptions.

LG-5

Defects and technical debt items must be tracked in Linear, not left in chat only.

12. Initial product components

The first release should define and implement:

Component A: Evidence project foundation
	•	clean repo structure
	•	environment/config pattern
	•	base layout
	•	shared components/patterns
	•	data access conventions

Component B: Asset templates
	•	evergreen proof asset template
	•	campaign asset template
	•	client briefing asset template

Component C: Data interface layer
	•	curated data source conventions
	•	example modeled dataset(s)
	•	naming standards
	•	sample signal pages backed by curated inputs

Component D: Distribution conventions
	•	URL conventions
	•	CTA patterns
	•	social/export strategy
	•	HubSpot handoff rules
	•	Squarespace linking/embedding rules

Component E: Documentation
	•	local development instructions
	•	publishing instructions
	•	content authoring rules
	•	maintenance guide
	•	issue workflow guide for Codex/Claude/Human

13. Acceptance criteria for the overall initiative

The initiative is complete when all of the following are true:
	1.	A fresh Evidence project exists and is structured for reuse rather than a single dashboard.
	2.	The project contains at least three asset templates:
	•	evergreen proof
	•	campaign
	•	client briefing
	3.	The data model for published assets is documented.
	4.	The content packaging rules are documented for website, outbound, social, and briefing use.
	5.	The project can be run locally with clear setup instructions.
	6.	The deployment approach is documented for self-hosted/static hosting.
	7.	The integration model with Squarespace and HubSpot is documented.
	8.	The project does not depend on brittle hardcoded raw-source assumptions.
	9.	A future FastAPI boundary is accommodated conceptually and structurally.
	10.	Linear issue structure exists for implementation and QA.
	11.	Codex can review Claude’s work issue by issue against explicit acceptance criteria.

14. Definition of done for each Linear issue

An issue is done only when:
	•	implementation is complete
	•	acceptance criteria are satisfied
	•	tests or validation steps are provided as appropriate
	•	documentation is updated where needed
	•	any assumptions or limitations are captured
	•	Codex has reviewed the issue against the spec
	•	the issue can be understood later without replaying the chat

15. Suggested issue hierarchy in Linear

Initiative

Fort Island Signal Publishing Platform

Projects or epics
	•	Foundations
	•	Data interfaces
	•	Template system
	•	Distribution and channel packaging
	•	Documentation and operating model
	•	QA and governance

Example first-wave issues
	•	Create fresh Evidence project scaffold
	•	Define project folder structure and naming conventions
	•	Define curated data interface contract for publishing
	•	Implement base layout and shared page conventions
	•	Implement evergreen proof asset template
	•	Implement campaign asset template
	•	Implement client briefing asset template
	•	Document Squarespace integration patterns
	•	Document HubSpot integration patterns
	•	Write local development and publishing runbook
	•	Define QA checklist for Codex reviews

16. Risks and constraints

Major risks
	•	over-coupling Evidence to raw scrape outputs
	•	treating Squarespace as the publishing engine
	•	producing one-off pages instead of reusable templates
	•	under-documenting naming/content conventions
	•	over-engineering infrastructure too early
	•	letting chat become the source of truth instead of Linear

Constraints
	•	one-person operator model
	•	limited budget
	•	need for practical, low-overhead operations
	•	current v1 pipeline still evolving
	•	future architecture desired, but not all boundaries implemented yet

17. Explicit architectural stance

This project should start fresh as a clean Evidence publishing platform rather than inherit legacy prototype assumptions.

The solution should be:
	•	cleanly structured
	•	template-driven
	•	content-model-first
	•	lightly integrated with Squarespace and HubSpot
	•	ready to evolve toward curated DB/FastAPI interfaces
	•	governed through Linear

18. Appendix: Proposed target content model

Evergreen proof asset

Audience:
	•	public website visitors
	•	prospects
	•	light client education

Cadence:
	•	periodic refresh
	•	relatively durable

Typical components:
	•	headline metrics
	•	map/chart/table combo
	•	concise “why it matters”
	•	CTA
	•	freshness/date note

Distribution:
	•	Squarespace teaser
	•	hosted Evidence page
	•	outbound proof point
	•	social visual seed
	•	proposal/supporting material

Campaign asset

Audience:
	•	prospects in a specific geography or vertical
	•	campaign recipients

Cadence:
	•	time-bound
	•	seasonal or campaign-specific

Typical components:
	•	campaign headline
	•	market-specific visual
	•	short interpretation
	•	CTA
	•	timeframe annotation

Distribution:
	•	outbound email support
	•	direct mail landing support
	•	social post support
	•	campaign page
	•	sales follow-up

Client briefing asset

Audience:
	•	active clients
	•	strategic conversations

Cadence:
	•	recurring or ad hoc

Typical components:
	•	tailored market snapshot
	•	trends
	•	interpretation
	•	action recommendations
	•	caveats
	•	next-step framing

Distribution:
	•	client meeting material
	•	PDF/export basis
	•	hosted briefing page
	•	retention/upsell support

⸻

YOUR ASSIGNMENT

Based on the full business specification above, produce the following deliverables.

Deliverable 1: Executive architecture recommendation

Provide a concise but opinionated recommendation for the technical approach.

Include:
	•	recommended repo/project structure
	•	recommended architecture boundaries
	•	how Evidence should fit into the current v1 and future-state architecture
	•	how to preserve optionality for a future FastAPI-curated data boundary
	•	what not to do yet

Deliverable 2: Proposed technical architecture

Define a practical target architecture for v1.5 / early v2.

Include:
	•	runtime/deployment stance
	•	data access model for Evidence
	•	folder/module structure for the new Evidence project
	•	environment/config strategy
	•	reusable template strategy
	•	content metadata strategy
	•	documentation strategy
	•	deployment strategy
	•	channel packaging strategy for Squarespace and HubSpot

Be concrete. Prefer clear conventions over abstract advice.

Deliverable 3: Linear-ready issue tree

Translate the business specification into a concrete issue hierarchy suitable for Linear.

Required structure:
	•	Initiative
	•	Epics / projects
	•	issues
	•	optional sub-issues

For each issue include:
	•	title
	•	objective
	•	scope
	•	dependencies
	•	acceptance criteria
	•	definition of done

Make the issue tree sequenced and practical for Claude to execute.

Deliverable 4: QA and governance model

Define how Codex should review Claude’s work.

Include:
	•	review checklist
	•	architecture compliance checks
	•	documentation compliance checks
	•	definition of done enforcement
	•	anti-patterns that must be rejected

Deliverable 5: First implementation wave

Recommend the first 5–10 issues Claude should implement in order.

For each:
	•	explain why it belongs in wave 1
	•	explain what risks it retires
	•	explain what it unlocks next

Deliverable 6: ADR list

Propose the initial Architecture Decision Records that should exist for this project.

At minimum include ADR candidates for:
	•	why start fresh
	•	why Evidence is the analytics publishing layer
	•	why Squarespace is the brand shell, not the analytics platform
	•	why HubSpot is the CRM/distribution layer
	•	why curated data boundaries matter
	•	why modular monolith / low operational burden is the chosen stance

Deliverable 7: Risks and watchouts

Call out the highest-risk implementation mistakes and how to avoid them.

⸻

IMPORTANT INSTRUCTIONS
	1.	Be decisive.
	2.	Do not merely summarize the business specification.
	3.	Turn it into an implementable plan.
	4.	Optimize for a one-person operator with real-world constraints.
	5.	Do not invent unnecessary infrastructure.
	6.	Do not recommend full microservices now.
	7.	Do not recommend using raw scrape tables directly as the long-term publishing interface.
	8.	Do not let Squarespace become the system of record for content or analytics.
	9.	Do not leave acceptance criteria vague.
	10.	Write so that your output can be used directly to create Linear issues and guide Claude’s implementation.

OUTPUT FORMAT

Return your answer in the following sections:

1. Executive recommendation

2. Proposed technical architecture

3. Linear issue tree

4. QA and governance model

5. First implementation wave

6. Proposed ADRs

7. Risks and watchouts

Where helpful, use markdown tables sparingly, but prefer readable structured prose and crisp bullets.

At the end, include a final section:

8. Open assumptions and decisions needed from human

This section should be short and include only truly necessary decisions that cannot reasonably be inferred. If you can make a sensible default recommendation, do so instead of punting.