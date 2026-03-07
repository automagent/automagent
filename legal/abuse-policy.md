# Abuse Policy

**Effective Date:** [TBD]
**Last Updated:** [TBD]

This Abuse Policy describes how Automagent defines, detects, and responds to abuse on its platform, hub, and related services. It applies to all users, including individuals, organizations, and automated systems that interact with Automagent services.

---

## 1. Definition of Abuse

Abuse is any use of Automagent's platform, hub, CLI tools, or agent definitions (`agent.yaml`) that violates this policy, our [Acceptable Use Policy](./acceptable-use-policy.md), our [Terms of Service](./terms-of-service.md), or applicable law.

On an AI agent platform, abuse takes specific forms beyond those found on traditional software registries. Abuse includes, but is not limited to, the following categories.

### 1.1 Malicious Agent Definitions

- Publishing agent definitions designed to cause harm to end users, third-party systems, or infrastructure.
- Agents that execute unauthorized actions on systems they interact with.
- Agents that contain embedded instructions to override, bypass, or subvert safety guardrails of underlying AI models.
- Agents that include obfuscated or hidden instructions intended to behave differently than their published description suggests.

### 1.2 Weaponized Agents

- Agents designed to conduct cyberattacks, including denial-of-service, credential stuffing, vulnerability scanning of targets without authorization, or exploitation of software vulnerabilities.
- Agents designed to generate malware, phishing content, or social engineering attacks.
- Agents designed to manipulate elections, markets, or public discourse through automated deception.
- Agents designed to facilitate violence, terrorism, or the production of weapons.

### 1.3 Data Exfiltration and Privacy Violations

- Agents designed to scrape, collect, or exfiltrate personal data without consent or legal basis.
- Agents that harvest credentials, API keys, tokens, or other secrets from the systems they interact with.
- Agents that intercept, redirect, or log communications or data in transit without authorization.
- Agents that access or attempt to access data beyond the scope explicitly granted to them.

### 1.4 Resource Abuse

- Agents that consume excessive computational resources on Automagent infrastructure or on third-party systems.
- Agents designed to amplify resource consumption, such as recursive self-spawning agents or fork bombs.
- Using the Automagent platform to mine cryptocurrency or perform other compute-intensive tasks unrelated to legitimate agent operation.
- Deliberately circumventing rate limits, quotas, or other resource controls.

### 1.5 Hub Abuse

- **Typosquatting:** Publishing agent definitions with names intentionally similar to popular agents to deceive users (e.g., `gpt-assisstant` mimicking `gpt-assistant`).
- **Dependency confusion:** Publishing agents designed to exploit name resolution or dependency chains to inject malicious definitions into other users' workflows.
- **Star/download manipulation:** Artificially inflating popularity metrics for agent definitions.
- **Metadata fraud:** Publishing agent definitions with deliberately misleading descriptions, authorship claims, license declarations, or capability descriptions.
- **Spam publishing:** Bulk-publishing low-quality, empty, or duplicate agent definitions to pollute the hub.
- **Namespace squatting:** Claiming agent names or organization namespaces in bad faith with no intent to use them.

### 1.6 Impersonation and Deception

- Agents that impersonate real people, companies, or government entities without authorization.
- Agents that represent themselves as human when interacting with people, without clear disclosure of their AI nature.
- Publishing agent definitions under the name or brand of another entity without authorization.

### 1.7 Harassment, Spam, and Non-Consensual Intimate Imagery

- Using agents to harass, threaten, intimidate, stalk, or bully individuals.
- Using agents to generate or distribute non-consensual intimate imagery (NCII).
- Using agents to send spam, bulk unsolicited messages, or automated outreach without consent.
- Using agents to target individuals or groups based on protected characteristics.

### 1.8 Intellectual Property Infringement

- Publishing agent definitions that infringe the copyrights, trademarks, or other intellectual property rights of third parties.
- Publishing agent definitions that incorporate proprietary content without authorization.
- Intellectual property takedown requests are handled in accordance with the DMCA and applicable law as described in our [Terms of Service](./terms-of-service.md) (Section 5.5).

### 1.9 Illegal Activity

- Any use of the platform to facilitate activity that violates applicable local, state, national, or international law.
- Agents designed to facilitate fraud, money laundering, sanctions evasion, or trafficking.
- Agents that produce or distribute child sexual abuse material (CSAM) or other illegal content.

---

## 2. Detection and Monitoring

Automagent uses a combination of automated and manual methods to detect abuse:

### 2.1 Automated Detection

- **Static analysis** of published `agent.yaml` definitions for known malicious patterns, unsafe instructions, and suspicious tool configurations.
- **Behavioral monitoring** of agents executed on Automagent-hosted infrastructure for anomalous resource consumption, unexpected network activity, or policy-violating behavior.
- **Hub scanning** for typosquatting, namespace abuse, and metadata anomalies.
- **Rate limit enforcement** across all API and CLI interactions.

### 2.2 Community Reporting

- Any user can report suspected abuse (see Section 3 below).
- Published agents may be flagged by other users for review.

### 2.3 Manual Review

- Automagent staff review flagged agent definitions, reported accounts, and anomalous activity patterns.
- Periodic audits of high-traffic and newly published agent definitions.

---

## 3. Reporting Abuse

If you believe an agent definition, account, or activity on the Automagent Hub constitutes abuse, you can report it through any of the following channels:

- **Email:** abuse@automagent.dev
- **Web form:** [https://automagent.dev/report-abuse](https://automagent.dev/report-abuse)
- **CLI:** `automagent report <agent-name>` (available in `@automagent/cli`)
- **Hub UI:** Use the "Report" button on any agent definition page.

When reporting, please include:

1. The name and version of the agent definition (if applicable).
2. A description of the abusive behavior or content.
3. Any evidence (logs, screenshots, URLs) supporting your report.
4. Your contact information (for follow-up; reporters may request anonymity).

All reports are treated confidentially. Automagent does not disclose the identity of reporters to the subjects of reports without consent, except where required by law.

---

## 4. Investigation Process

Upon receiving a report or automated detection alert, Automagent follows this process:

### 4.1 Triage (within 24 hours)

- Reports are acknowledged and assessed for severity.
- **Critical threats** (agents actively causing harm, CSAM, imminent safety risks) are escalated immediately and the agent definition may be suspended without prior notice.
- All other reports are queued for investigation.

### 4.2 Investigation (within 5 business days)

- The reported agent definition, account, or activity is reviewed by the Automagent trust and safety team.
- The account holder may be contacted for clarification (except in cases where doing so would compromise the investigation or pose a safety risk).
- Technical analysis is conducted as needed, including review of agent definition contents, execution logs (on hosted infrastructure), and hub activity.

### 4.3 Determination

- The investigation concludes with one of the following determinations:
  - **No violation found:** The report is closed and the reporter is notified.
  - **Violation confirmed:** Enforcement action is taken per Section 5.
  - **Inconclusive:** The report is closed but flagged for future reference. Additional monitoring may be applied.

---

## 5. Enforcement Actions

Enforcement is proportional to the severity, intent, and recurrence of the violation. Actions are applied at the account, agent definition, or organization level as appropriate.

### 5.1 Tier 1 -- Warning

- A written notice is sent to the account holder identifying the violation.
- The account holder is given a reasonable timeframe (typically 7 days) to remediate.
- Applied for: first-time minor violations, unintentional policy breaches, borderline resource consumption.

### 5.2 Tier 2 -- Agent Removal or Restriction

- The specific agent definition is unpublished from the hub.
- The agent definition may be quarantined (hidden from search and install but preserved for review).
- The account holder is notified and may resubmit a corrected version.
- Applied for: confirmed malicious agent definitions, repeated Tier 1 violations, metadata fraud.

### 5.3 Tier 3 -- Account Suspension

- The account is temporarily suspended for a defined period (typically 30-90 days).
- All agent definitions published by the account are suspended.
- Applied for: repeated violations, serious but non-critical abuse, hub manipulation.

### 5.4 Tier 4 -- Account Termination

- The account is permanently terminated.
- All agent definitions are removed from the hub.
- The user may be prohibited from creating new accounts.
- Applied for: severe abuse, weaponized agents, illegal activity, CSAM, threats to safety.

### 5.5 Tier 5 -- Legal Referral

- In addition to Tier 4 actions, Automagent reports the activity to relevant law enforcement agencies or regulatory authorities.
- Applied for: criminal activity, imminent threats to human safety, CSAM, terrorism-related content.

Automagent reserves the right to skip tiers and apply any enforcement level immediately when the severity of the abuse warrants it.

---

## 6. Interim Measures

During an investigation, Automagent may take interim measures to protect the platform and its users, including:

- Temporarily suspending the reported agent definition.
- Throttling or restricting the reported account's access to platform services.
- Preventing new agent publications from the reported account.

These measures do not constitute a final determination and will be resolved once the investigation concludes.

---

## 7. Appeals Process

Account holders subject to enforcement actions may appeal the decision.

### 7.1 Filing an Appeal

- Appeals must be submitted in writing to appeals@automagent.dev within 30 calendar days of the enforcement action.
- The appeal must include:
  - The enforcement action being appealed.
  - The grounds for the appeal (e.g., factual error, disproportionate response, context not considered).
  - Any supporting evidence.

### 7.2 Review

- Appeals are reviewed by a member of the Automagent team who was not involved in the original investigation.
- The review is completed within 15 business days of receipt.
- The appellant is notified of the outcome in writing.

### 7.3 Outcomes

- **Upheld:** The original enforcement action stands.
- **Modified:** The enforcement action is adjusted (e.g., reduced in severity or duration).
- **Overturned:** The enforcement action is reversed and any suspended agent definitions or accounts are restored.

Appeal decisions are final. In cases involving Tier 4 or Tier 5 actions for illegal content or activity, appeals are limited to claims of factual error (e.g., mistaken identity).

---

## 8. Cooperation with Third Parties

Automagent may share information about abusive activity with:

- Law enforcement agencies, when required by law or when there is an imminent threat to safety.
- Upstream AI model providers (e.g., Anthropic, OpenAI), when an agent definition is designed to subvert their safety policies.
- Other platform operators, when coordinated abuse campaigns span multiple services.
- CERT teams and security researchers, when agent definitions exploit known vulnerabilities.

Information sharing is governed by our [Privacy Policy](./privacy-policy.md) and applicable law.

---

## 9. Changes to This Policy

Automagent may update this policy at any time. Material changes will be communicated via the Automagent website, blog, or email to registered users at least 30 days before they take effect. Continued use of the platform after changes take effect constitutes acceptance.

---

## 10. Contact

For questions about this policy:

- **Email:** legal@automagent.dev
- **Web:** [https://automagent.dev/legal](https://automagent.dev/legal)
