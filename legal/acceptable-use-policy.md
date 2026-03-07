# Acceptable Use Policy

**Effective Date:** [TBD]
**Last Updated:** [TBD]

This Acceptable Use Policy ("AUP") governs all use of the Automagent platform, hub, CLI tools (`@automagent/cli`), open-source specification, and related services (collectively, the "Services"). By using the Services, you agree to comply with this AUP.

This AUP supplements the Automagent [Terms of Service](./terms-of-service.md). Capitalized terms not defined here have the meanings given in the Terms of Service.

---

## 1. Permitted Uses

Automagent is designed for the creation, sharing, and execution of AI agent definitions. You may use the Services to:

- **Define agents** using the `agent.yaml` format and the Automagent specification.
- **Validate agents** using the CLI or API to check that agent definitions conform to the schema.
- **Publish agents** to the Automagent Hub for others to discover and use.
- **Discover and install agents** from the hub for use in your own projects and workflows.
- **Run agents** through the CLI or compatible frameworks (CrewAI, OpenAI Agents, AutoGen, LangGraph, and others).
- **Import agent definitions** from other formats using the CLI's import functionality.
- **Build integrations** and tooling on top of the open-source specification and published APIs.
- **Use the specification** in your own projects, products, and services in accordance with the Apache-2.0 license.

---

## 2. Prohibited Uses

You may not use the Services to do, facilitate, or promote any of the following.

### 2.1 Illegal Activity

- Violate any applicable local, state, national, or international law or regulation.
- Facilitate fraud, money laundering, sanctions evasion, or trafficking of any kind.
- Create, distribute, or store child sexual abuse material (CSAM).
- Infringe the intellectual property rights of others.

### 2.2 Harmful or Malicious Agents

- Create or publish agents designed to cause harm to people, systems, or infrastructure.
- Create agents that generate malware, ransomware, viruses, or other malicious software.
- Create agents that conduct or facilitate cyberattacks, including denial-of-service, phishing, credential stuffing, or unauthorized vulnerability scanning.
- Create agents designed to bypass, subvert, or override safety guardrails or content policies of underlying AI models.
- Create agents with hidden, obfuscated, or undisclosed behaviors that differ from their published description.

### 2.3 Harassment and Harm

- Use agents to harass, threaten, intimidate, stalk, or bully individuals.
- Use agents to generate or distribute non-consensual intimate imagery.
- Use agents to target individuals or groups based on protected characteristics (race, ethnicity, religion, gender, sexual orientation, disability, etc.).
- Use agents to facilitate self-harm or violence against others.

### 2.4 Spam and Unsolicited Communications

- Use agents to send spam, bulk unsolicited messages, or automated outreach without consent.
- Use agents to artificially inflate engagement metrics on any platform.
- Use agents to create fake accounts, reviews, or testimonials.

### 2.5 Deception and Impersonation

- Use agents to impersonate real people, companies, or government entities without authorization.
- Deploy agents that interact with people while representing themselves as human, without clear and prominent disclosure of their AI nature.
- Use agents to create or spread disinformation, deepfakes, or misleading content designed to deceive.
- Use agents to manipulate elections, markets, or public discourse.

### 2.6 Privacy Violations

- Use agents to collect, scrape, or exfiltrate personal data without a lawful basis and appropriate consent.
- Use agents to harvest credentials, API keys, tokens, or secrets from systems they interact with.
- Use agents to surveil individuals without their knowledge and consent, except where authorized by law.
- Use agents to build profiles of individuals using data collected without consent.

See also our [Privacy Policy](./privacy-policy.md) for how Automagent handles data.

### 2.7 Circumvention

- Attempt to bypass rate limits, quotas, authentication controls, or other security measures of the Services.
- Use automated tools to create accounts in violation of account limits.
- Access or attempt to access non-public areas of Automagent infrastructure.
- Reverse-engineer security or abuse detection mechanisms.

---

## 3. Agent Behavior Requirements

All agents published to the Automagent Hub or executed through Automagent Services must meet the following behavioral standards.

### 3.1 Transparency

- Agent definitions must accurately describe what the agent does. The `description` field in `agent.yaml` must be a truthful representation of the agent's purpose and behavior.
- Agents that interact with humans must disclose their AI nature unless the context makes it unambiguously clear (e.g., an agent running inside a documented AI workflow).
- Agents must not contain hidden instructions, backdoors, or undisclosed capabilities.

### 3.2 Respect for External Systems

- Agents must respect `robots.txt` directives and `nofollow`/`noindex` signals when accessing web content.
- Agents must honor rate limits imposed by third-party APIs and services they interact with.
- Agents must not attempt to access systems, data, or resources beyond what is explicitly authorized.
- Agents must use standard, identifiable User-Agent strings when making HTTP requests (e.g., `Automagent/1.0 (agent-name)`).

### 3.3 Resource Responsibility

- Agents must not consume computational resources (CPU, memory, network, storage) disproportionate to their stated purpose.
- Agents must not spawn recursive or self-replicating processes without explicit bounds and safeguards.
- Agents must implement reasonable timeouts and error handling to prevent runaway execution.
- Agents must not intentionally degrade the performance of Automagent Services or third-party systems.

### 3.4 Data Handling

- Agents that process personal data must do so in accordance with applicable privacy laws (GDPR, CCPA, etc.).
- Agents must not store or transmit data beyond what is necessary for their stated function.
- Agents must not exfiltrate data from the environments in which they operate to unauthorized destinations.
- Agents that handle secrets (API keys, credentials) must not log, store, or transmit them in plaintext.

### 3.5 Safety

- Agents must not attempt to override or circumvent safety guardrails of the underlying AI models they use.
- Agents should implement appropriate error handling and fail-safe mechanisms.
- Agents operating in high-stakes domains (healthcare, finance, legal, critical infrastructure) must include appropriate disclaimers and human-in-the-loop safeguards as described in their `agent.yaml`.

---

## 4. Hub Usage Guidelines

The Automagent Hub is a shared resource. All publishers must follow these guidelines.

### 4.1 Honest Metadata

- The `name`, `description`, `version`, `author`, and other metadata fields in `agent.yaml` must be accurate and not misleading.
- Do not claim authorship of agents you did not create.
- Do not misrepresent an agent's capabilities, limitations, or dependencies.
- License declarations must accurately reflect the actual license under which the agent is distributed.

### 4.2 Naming

- Agent names must not be intentionally confusable with existing popular agents (typosquatting).
- Do not claim names or namespaces associated with brands, organizations, or individuals you do not represent.
- Do not squat on names with no intent to publish legitimate agent definitions.
- Names must not contain offensive, harassing, or discriminatory language.

### 4.3 Versioning

- Follow semantic versioning (semver) for published agent definitions.
- Do not re-publish the same version number with different content. Once a version is published, its contents must be treated as immutable.
- Clearly document breaking changes in major version increments.

### 4.4 Dependencies and Tool Declarations

- All tools and dependencies declared in `agent.yaml` must be accurately represented.
- Do not include undeclared dependencies or hidden tool calls.
- Do not publish agent definitions designed to exploit dependency resolution mechanisms (dependency confusion).

### 4.5 Publishing Practices

- Do not bulk-publish low-quality, empty, placeholder, or duplicate agent definitions.
- Do not use automated tools to mass-publish agents without a legitimate purpose.
- Do not artificially inflate download counts, stars, or other popularity metrics.

---

## 5. Resource Consumption Guidelines

Whether using Automagent-hosted infrastructure or interacting with the hub and API:

- **API rate limits** are published in the API documentation and must be respected. Do not attempt to circumvent them.
- **CLI usage** should follow standard automation practices. Avoid tight loops of repeated requests.
- **Hub bandwidth** is a shared resource. Cache agent definitions locally where possible rather than repeatedly downloading them.
- **Hosted execution** (where available) is subject to per-agent and per-account resource quotas. Agents that exceed quotas will be throttled or terminated.
- If your use case requires resource limits above standard quotas, contact us at support@automagent.dev to discuss enterprise options.

---

## 6. Security Requirements for Published Agents

All agent definitions published to the Automagent Hub must meet these security requirements.

### 6.1 No Embedded Secrets

- Agent definitions must not contain hardcoded API keys, passwords, tokens, private keys, or other credentials.
- Use environment variable references or secret management integrations as described in the Automagent specification.

### 6.2 No Malicious Payloads

- Agent definitions must not contain or reference malicious code, scripts, or binaries.
- Tool definitions must not point to known malicious endpoints or services.

### 6.3 Accurate Capability Declaration

- Agents must declare all tools, external services, and system resources they access in their `agent.yaml`.
- Agents must not access capabilities beyond those declared in their definition.

### 6.4 Vulnerability Responsibility

- If you discover a security vulnerability in an agent definition you have published, you must address it promptly by publishing a patched version and, where possible, notifying affected users.
- If you discover a vulnerability in the Automagent platform itself, report it responsibly to security@automagent.dev. Do not exploit it or disclose it publicly before it has been addressed.

---

## 7. Compliance with Applicable Laws

You are responsible for ensuring that your use of the Services complies with all applicable laws and regulations, including but not limited to:

- **Privacy laws** (GDPR, CCPA, and equivalents in your jurisdiction).
- **Export control laws** (you may not use the Services to violate U.S. export controls or other applicable trade restrictions).
- **Consumer protection laws** (agents that interact with consumers must comply with applicable consumer protection regulations).
- **Sector-specific regulations** (healthcare, finance, legal, and other regulated industries have additional requirements that apply to AI agents operating in those domains).
- **AI-specific regulations** (including the EU AI Act and other emerging AI governance frameworks that may apply to agents you create or deploy).

Automagent does not provide legal advice. If you are unsure whether a use case is lawful, consult qualified legal counsel.

---

## 8. Consequences of Violation

Violations of this AUP are handled according to the enforcement framework in our [Abuse Policy](./abuse-policy.md). Enforcement is proportional and follows a tiered approach:

| Tier | Action | Typical Triggers |
|------|--------|-----------------|
| 1 | **Warning** | First-time minor violations, unintentional breaches |
| 2 | **Agent removal or restriction** | Confirmed malicious agents, metadata fraud, repeated warnings |
| 3 | **Account suspension** (30-90 days) | Repeated violations, serious but non-critical abuse |
| 4 | **Account termination** | Severe abuse, illegal activity, safety threats |
| 5 | **Legal referral** | Criminal activity, imminent danger, CSAM |

Automagent reserves the right to:

- Skip tiers when the severity of the violation warrants immediate action.
- Take interim measures (suspending agent definitions, restricting account access) during an active investigation.
- Report illegal activity to law enforcement without prior notice to the account holder.

Appeals are handled through the process described in the [Abuse Policy](./abuse-policy.md).

---

## 9. Reporting Violations

If you become aware of activity that violates this AUP, please report it:

- **Email:** abuse@automagent.dev
- **Web form:** [https://automagent.dev/report-abuse](https://automagent.dev/report-abuse)
- **CLI:** `automagent report <agent-name>`
- **Hub UI:** Use the "Report" button on any agent definition page.

All reports are treated confidentially.

---

## 10. Changes to This Policy

Automagent may update this AUP at any time. Material changes will be communicated via the Automagent website, blog, or email to registered users at least 30 days before they take effect. Continued use of the Services after changes take effect constitutes acceptance of the updated AUP.

---

## 11. Contact

For questions about this policy:

- **Email:** legal@automagent.dev
- **Web:** [https://automagent.dev/legal](https://automagent.dev/legal)
