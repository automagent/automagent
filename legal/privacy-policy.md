# Privacy Policy

**Effective Date:** [TBD]
**Last Updated:** [TBD]

## 1. Introduction

Automagent ("we," "us," or "our") operates the Automagent platform, which includes the automagent.dev website, the Automagent Hub, and the `@automagent/cli` command-line tool. Automagent provides an open standard for defining AI agents via `agent.yaml` files, along with tooling and a hosted hub for publishing, discovering, and managing agent definitions.

This Privacy Policy explains what information we collect, how we use it, and what choices you have. It applies to all Automagent services: the website, the hub, the CLI (where applicable), and our APIs.

The Automagent specification itself is open source under the Apache-2.0 license. This policy covers the hosted platform and services we operate, not the open-source spec in isolation.

This Privacy Policy is part of, and incorporated into, our [Terms of Service](./terms-of-service.md). Please also review our [Acceptable Use Policy](./acceptable-use-policy.md) and [Abuse Policy](./abuse-policy.md).

---

## 2. Information We Collect

### 2.1 Account Information

When you create an Automagent account, we collect:

- Email address
- Username
- Display name (optional)
- Organization or team name (if applicable)
- Authentication credentials (passwords are hashed; OAuth tokens are stored encrypted)

### 2.2 Agent Definitions and Hub Data

When you publish an agent definition to the Automagent Hub, we store:

- The `agent.yaml` file and any associated metadata
- Package name, version, description, author, and tags
- README or documentation files included with the publication
- Publication timestamps and version history

**Important:** Agent definitions published to the hub are **public by default**. This is by design — the hub functions like a public package manager for agent definitions. See Section 4 for details on public vs. private agents.

### 2.3 CLI Telemetry (Opt-In)

The `@automagent/cli` runs locally on your machine. By default, it does **not** send telemetry data. If you opt in to telemetry, we collect:

- CLI version and command invoked (e.g., `init`, `validate`, `run`, `import`)
- Whether the command succeeded or failed (error codes, not error messages)
- Operating system and architecture
- Node.js version

We do **not** collect through telemetry:

- The contents of your `agent.yaml` files
- File paths, directory names, or file system information
- Environment variables, API keys, or secrets
- Model prompts, responses, or any data exchanged with AI providers
- Any personally identifiable information

You can opt out of telemetry at any time. See Section 9 for details.

### 2.4 Website Usage Data

When you visit automagent.dev, we may collect:

- IP address (anonymized where feasible)
- Browser type and version
- Pages visited and time spent
- Referring URL
- Device type and screen resolution

We use cookies and similar technologies for website analytics and essential functionality (such as keeping you logged in). We do not use third-party advertising trackers.

### 2.5 API and Service Logs

When you interact with the Automagent Hub API, we log:

- API endpoints called and HTTP methods
- Request timestamps
- IP address
- Authentication identity (your account)
- Response status codes and latency

These logs are used for rate limiting, abuse detection, debugging, and service reliability. They are retained for a limited period as described in Section 7.

### 2.6 Payment Information

If you subscribe to a paid tier, payment is processed by a third-party payment processor (e.g., Stripe). We do **not** store your full credit card number, bank account details, or other sensitive payment credentials on our servers. We receive and store:

- A payment processor customer identifier
- Billing name and address
- Subscription plan and status
- Transaction history (amounts and dates)

## 3. How We Use Information

We use the information we collect to:

- **Provide and operate the platform** — host your account, publish and serve agent definitions, process API requests
- **Ensure security and prevent abuse** — detect unauthorized access, enforce rate limits, investigate violations of our terms
- **Improve the platform** — analyze aggregate usage patterns to inform product decisions, fix bugs, and improve performance
- **Communicate with you** — send account-related notifications (e.g., email verification, password resets, security alerts), and, where you have opted in, product updates or announcements
- **Process payments** — manage billing for commercial tiers
- **Comply with legal obligations** — respond to lawful requests from authorities, enforce our terms

We do **not** sell your personal information. We do not use your data to train AI models.

## 4. Agent Definition Data

### 4.1 Public Agents

When you publish an `agent.yaml` to the Automagent Hub, the following are publicly visible to anyone:

- The full agent definition file (`agent.yaml` contents)
- Package name, version, description, and tags
- Author username and any listed contributors
- Publication date and version history
- README or documentation included with the package

This is intentional. The hub is a public directory of agent definitions, similar to how npm hosts public packages. Do not include secrets, API keys, private endpoints, or confidential information in agent definitions you publish.

### 4.2 Private Agents

Paid tiers may offer private agent definitions. Private agents are visible only to members of your organization or team. The same data is stored, but access is restricted by your organization's settings.

### 4.3 Metadata and Discovery

We may index and surface metadata from published agent definitions — such as tool references, MCP server declarations, model configurations, and capability tags — to power search, discovery, and compatibility features in the hub.

## 5. CLI and Local Usage

The `@automagent/cli` is a local tool that runs on your machine. Here is what does and does not leave your machine when using each command:

- **`automagent init`** — Runs entirely locally. No network requests are made.
- **`automagent validate`** — Runs locally by default. If the CLI fetches a remote schema for validation, it makes an HTTPS request to our servers to retrieve the schema definition only — your `agent.yaml` contents are not transmitted.
- **`automagent publish`** — Transmits your agent definition and metadata to the Automagent Hub over HTTPS.
- **`automagent run`** — Sends your agent definition (including model configuration, instructions, and tool definitions) **directly to the AI model provider** you have configured (e.g., Anthropic, OpenAI). This data goes to the provider, not to Automagent servers. You are subject to the provider's own privacy policy and terms for that data. Automagent does not intercept, store, or relay the content of these requests.
- **`automagent import`** — May make network requests to fetch external agent definitions or framework configurations. The content of the import source is processed locally.

If you have opted in to CLI telemetry, the limited telemetry data described in Section 2.3 is sent to our servers regardless of which command you run.

## 6. Data Sharing and Third Parties

We share information only in the following circumstances:

### 6.1 AI Model Providers

When you use `automagent run`, your agent definition and prompts are sent directly to your configured AI model provider (e.g., Anthropic, OpenAI, or others). We do not control and are not responsible for how those providers handle your data. Review the provider's privacy policy before use.

### 6.2 Payment Processors

We use third-party payment processors (e.g., Stripe) to handle billing. They receive the payment information necessary to process your transactions and are bound by their own privacy policies and PCI-DSS compliance obligations.

### 6.3 Infrastructure Providers

We use cloud infrastructure providers (e.g., hosting, CDN, database services) to operate the platform. These providers process data on our behalf under contractual obligations to protect your information.

### 6.4 Abuse Investigations

In connection with abuse investigations conducted under our [Abuse Policy](./abuse-policy.md), we may share relevant account information, agent definition metadata, and activity logs with law enforcement agencies, upstream AI model providers, other platform operators, or security researchers as described in the Abuse Policy (Section 8). We limit such disclosures to the information reasonably necessary for the investigation.

### 6.5 Legal Requirements

We may disclose information if required by law, regulation, legal process, or governmental request, or if we believe disclosure is necessary to protect the rights, property, or safety of Automagent, our users, or the public.

### 6.6 Business Transfers

In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control.

We do **not** sell personal information to third parties. We do not share personal information with third parties for their marketing purposes.

## 7. Data Retention

- **Account information** is retained for the duration of your account. Upon account deletion, we remove your personal information within 30 days, except where retention is required by law.
- **Published agent definitions** that are public remain available in the hub even after account deletion, as they are part of the public record (similar to published open-source packages). You may unpublish specific versions before deleting your account.
- **Private agent definitions** are deleted when you delete your account or remove them from the hub.
- **API and service logs** are retained for up to 90 days for operational purposes, then deleted or anonymized.
- **CLI telemetry data** is retained in aggregate form. Individual telemetry records are deleted or anonymized within 90 days.
- **Payment records** are retained as required by applicable tax and financial regulations.

## 8. Data Security

We implement reasonable technical and organizational measures to protect your information, including:

- Encryption in transit (TLS/HTTPS for all API and web traffic)
- Encryption at rest for stored data
- Access controls and authentication for internal systems
- Regular security reviews and dependency updates
- Hashed and salted passwords (we never store plaintext passwords)
- Rate limiting and abuse detection on APIs

No method of transmission or storage is completely secure. While we strive to protect your information, we cannot guarantee absolute security.

## 9. Your Rights

Depending on your jurisdiction, you may have the following rights regarding your personal information:

- **Access** — Request a copy of the personal information we hold about you.
- **Correction** — Request correction of inaccurate or incomplete information.
- **Deletion** — Request deletion of your account and personal information, subject to the retention policies in Section 7.
- **Export** — Download your published agent definitions and account data.
- **Opt out of telemetry** — Disable CLI telemetry at any time by running `automagent config set telemetry false` or by setting the environment variable `AUTOMAGENT_TELEMETRY=false`.
- **Withdraw consent** — Where we rely on consent, you may withdraw it at any time.
- **Object to processing** — Object to certain processing activities where applicable under law.

To exercise these rights, contact us using the information in Section 13. We will respond within a reasonable timeframe and in accordance with applicable law.

## 10. International Data Transfers

Automagent is operated from [jurisdiction TBD]. If you access the platform from outside this jurisdiction, your information may be transferred to and processed in countries that may have different data protection laws than your own. We take steps to ensure that your information receives an adequate level of protection wherever it is processed.

[This section will be updated with specific transfer mechanisms (e.g., Standard Contractual Clauses, adequacy decisions) as the platform's infrastructure is finalized.]

## 11. Children's Privacy

Automagent is not directed at children under the age of 16. We do not knowingly collect personal information from children under 16. If you believe we have inadvertently collected information from a child under 16, please contact us and we will promptly delete it.

## 12. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes, we will:

- Update the "Last Updated" date at the top of this page
- Post a notice on automagent.dev
- Send an email notification to registered users for significant changes at least 30 days before they take effect

We encourage you to review this policy periodically. Your continued use of the platform after changes are posted constitutes acceptance of the updated policy.

## 13. Contact Information

If you have questions about this Privacy Policy or wish to exercise your rights, contact us at:

- **Email:** privacy@automagent.dev
- **Website:** [https://automagent.dev/legal](https://automagent.dev/legal)
- **Mailing Address:** [TBD]

For data protection inquiries in the European Union, you may also contact our Data Protection Officer at dpo@automagent.dev.
