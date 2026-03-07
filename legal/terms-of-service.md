# Terms of Service

**Effective Date:** [TBD]
**Last Updated:** [TBD]

Welcome to Automagent. These Terms of Service ("Terms") govern your access to and use of the Automagent platform, including the automagent.dev website, the hosted agent hub, the `@automagent/cli` command-line tool, the `agent.yaml` specification and documentation, and any related APIs and services (collectively, the "Service"). The Service is operated by Automagent ("Automagent," "we," "us," or "our").

By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.

---

## 1. Acceptance of Terms

By creating an account, publishing an agent definition, accessing the hub, using the CLI to interact with hosted services, or otherwise using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, our [Privacy Policy](./privacy-policy.md), our [Acceptable Use Policy](./acceptable-use-policy.md), and our [Abuse Policy](./abuse-policy.md), each of which is incorporated by reference.

If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms, and "you" refers to both you individually and that organization.

---

## 2. Description of Service

Automagent provides the following:

1. **Open Specification.** An open standard for defining AI agents using `agent.yaml` files (human-readable YAML backed by a JSON Schema for machine validation). The specification is licensed under the Apache License 2.0.

2. **Command-Line Interface (CLI).** The `@automagent/cli` package, which enables users to initialize, validate, run, and import agent definitions locally. The CLI is open-source software licensed under the Apache License 2.0.

3. **Hosted Agent Hub.** A hosted hub (similar in concept to npm for packages) where users can publish, discover, and consume agent definitions. The hub includes governance, testing, search, and enterprise features.

4. **Website and Documentation.** The automagent.dev website, which provides documentation, guides, and access to the hub and related tools.

5. **APIs.** Programmatic interfaces for interacting with the hub and related platform services.

The Service is framework-neutral and is designed to work with a variety of AI agent frameworks, including but not limited to CrewAI, OpenAI Agents SDK, AutoGen, and LangGraph. Automagent does not itself provide or host AI models; it provides a definition, orchestration, and distribution layer for agent configurations.

---

## 3. Accounts

### 3.1 Registration

To publish agent definitions or access certain features of the Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date.

### 3.2 Account Security

You are responsible for maintaining the confidentiality of your account credentials, including any API keys or access tokens. You are responsible for all activity that occurs under your account. You must notify us immediately at the contact information listed in Section 18 if you become aware of any unauthorized use of your account.

### 3.3 Age Requirements

You must be at least 16 years of age to use the Service. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.

### 3.4 One Person or Entity Per Account

Accounts are for individual persons or single legal entities. Sharing account credentials among multiple people or organizations is not permitted. Organizations requiring multiple users should create separate accounts for each individual.

---

## 4. User Content and Agent Definitions

### 4.1 Ownership

You retain all ownership rights in the agent definitions (`agent.yaml` files), documentation, metadata, and any other content you create and submit through the Service ("User Content"). Automagent does not claim ownership of your User Content.

### 4.2 License Grant to Automagent

By publishing User Content to the hub or otherwise making it available through the Service, you grant Automagent a worldwide, non-exclusive, royalty-free license to host, store, reproduce, display, distribute, and make available your User Content solely as necessary to operate, maintain, and provide the Service. This includes caching, indexing, and serving your agent definitions to other users of the hub.

If you publish an agent definition with a specific open-source or other license, that license governs how other users may use your agent definition. Automagent does not alter or override the license you choose for your User Content.

### 4.3 Responsibility for User Content

You are solely responsible for the User Content you publish through the Service. You represent and warrant that:

- You have the right to publish the User Content and grant the licenses described in these Terms.
- Your User Content does not infringe or misappropriate any third party's intellectual property, privacy, or other rights.
- Your User Content does not contain malicious code, credentials, secrets, or personally identifiable information that you do not have the right to share.
- Your User Content complies with all applicable laws and with our Acceptable Use Policy.

### 4.4 Content Review

Automagent may, but is not obligated to, review, monitor, or scan User Content for compliance with these Terms. We reserve the right to remove or disable access to any User Content that we believe, in our sole discretion, violates these Terms or applicable law.

---

## 5. Hub and Publishing

### 5.1 Publishing Agent Definitions

When you publish an agent definition to the hosted hub, it becomes discoverable by other users of the Service. You are responsible for ensuring that your published definitions are accurate, functional, and compliant with these Terms.

### 5.2 Namespace and Naming Policies

Agent definition names and namespaces (including scoped names such as `@org/agent-name`) are allocated on a first-come, first-served basis. We reserve the right to:

- Reclaim namespaces that infringe trademarks or are confusingly similar to well-known names.
- Reclaim namespaces that are squatted (registered but not used in good faith).
- Reassign or retire namespaces at our discretion to protect the integrity of the hub.

Disputes over namespace ownership will be resolved at Automagent's sole discretion.

### 5.3 Immutability of Published Versions

Once a specific version of an agent definition is published, its contents should be treated as immutable. You may publish new versions but may not silently alter published versions. Automagent may enforce version immutability at the platform level.

### 5.4 Unpublishing and Takedown

You may unpublish your agent definitions, subject to the following:

- If other published agent definitions depend on your definition, we may retain a copy for a reasonable period to avoid breaking downstream users.
- We may remove or disable access to any agent definition at any time if we receive a valid legal complaint (such as a DMCA takedown notice), if the definition violates these Terms, or for any other reason at our sole discretion.

### 5.5 Takedown Requests

If you believe that an agent definition published on the hub infringes your intellectual property rights or violates applicable law, please contact us using the information in Section 18. We will review and respond to valid takedown requests in accordance with applicable law, including the Digital Millennium Copyright Act (DMCA) where applicable.

---

## 6. Open-Source Components

### 6.1 Scope

The `agent.yaml` specification (including the JSON Schema) and the `@automagent/cli` package are open-source software released under the Apache License 2.0. Your use of those components is governed by the Apache License 2.0, not by these Terms.

### 6.2 Hosted Services

These Terms govern your use of the hosted platform, hub, website, APIs, and any other non-open-source services provided by Automagent. Where there is a conflict between the Apache License 2.0 and these Terms with respect to the hosted services, these Terms control.

### 6.3 Contributions

Contributions to Automagent's open-source repositories are governed by the applicable open-source license and any contributor license agreement (CLA) we may require.

---

## 7. API and CLI Usage

### 7.1 Programmatic Access

You may access the hub and platform services programmatically through our APIs and CLI. All programmatic access is subject to these Terms.

### 7.2 Rate Limits

We impose rate limits on API and CLI requests to ensure fair use and platform stability. Current rate limits are published in our documentation. We reserve the right to adjust rate limits at any time. If you exceed applicable rate limits, your requests may be throttled or temporarily blocked.

### 7.3 Fair Use

You agree not to:

- Circumvent or attempt to circumvent rate limits or other technical restrictions.
- Use automated means to scrape, mirror, or bulk-download the contents of the hub beyond what is necessary for normal use of the Service.
- Use the API in a manner that degrades the experience for other users.

### 7.4 Authentication

Certain API and CLI operations (such as publishing) require authentication. You must keep your API keys and tokens secure and must not share them publicly or embed them in published agent definitions.

---

## 8. Agent Execution

### 8.1 Definition Layer, Not Execution Layer

Automagent is primarily a definition, validation, and distribution platform for AI agent configurations. When you use the `@automagent/cli` or other tools to execute an agent defined in an `agent.yaml` file, the agent runs in your local environment or your chosen infrastructure, using AI models and services that you configure and are responsible for.

### 8.2 No Responsibility for Agent Behavior

Automagent does not control and is not responsible for the runtime behavior of agents defined using the `agent.yaml` specification. This includes, but is not limited to:

- The outputs, decisions, or actions taken by an AI agent at runtime.
- The behavior of third-party AI models (such as those from OpenAI, Anthropic, or others) invoked by an agent.
- The behavior of tools, plugins, or integrations that an agent definition references.
- Any consequences arising from the deployment or execution of an agent in any environment.

### 8.3 User Responsibility

You are solely responsible for:

- Reviewing and understanding agent definitions before executing them.
- Ensuring that agents you run comply with applicable laws and regulations.
- Implementing appropriate safeguards, monitoring, and human oversight for agents you deploy.
- Any costs, damages, or liabilities arising from the execution of agents you run, whether you authored the agent definition or obtained it from the hub.

---

## 9. Intellectual Property

### 9.1 Automagent's Intellectual Property

The Automagent name, logo, website design, and the proprietary components of the hosted platform and hub are the intellectual property of Automagent. Except for the open-source components described in Section 6, you may not use Automagent's trademarks, logos, or branding without our prior written consent.

### 9.2 User Intellectual Property

As stated in Section 4.1, you retain ownership of your User Content. Nothing in these Terms transfers ownership of your intellectual property to Automagent.

### 9.3 Open-Source Distinction

The open-source specification and CLI tools are available under the Apache License 2.0 and may be used, modified, and distributed in accordance with that license. The hosted hub, platform features, and proprietary tooling are not covered by the Apache License 2.0 and are subject to these Terms.

### 9.4 Feedback

If you provide us with feedback, suggestions, or ideas regarding the Service, you grant us a perpetual, worldwide, royalty-free, irrevocable license to use, modify, and incorporate that feedback into the Service without obligation to you.

---

## 10. Privacy

Your use of the Service is subject to our [Privacy Policy](./privacy-policy.md), which describes how we collect, use, and protect your information, including information related to your account, your use of the hub and CLI, and any telemetry data. Please review the Privacy Policy carefully.

---

## 11. Prohibited Conduct

You agree not to use the Service to:

- Publish agent definitions that are designed to cause harm, facilitate illegal activity, or violate the rights of others.
- Distribute malware, phishing configurations, or agent definitions that exploit vulnerabilities in AI models or systems.
- Impersonate other users, organizations, or agent authors.
- Interfere with the operation of the Service or circumvent security measures.
- Violate any applicable law or regulation.

For a complete description of prohibited uses, please refer to our [Acceptable Use Policy](./acceptable-use-policy.md) and our [Abuse Policy](./abuse-policy.md). Violations may result in account suspension or termination as described in Section 15.

---

## 12. Disclaimers

### 12.1 "As-Is" Service

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

### 12.2 No Guarantee of Availability

We do not guarantee that the hub, APIs, or any part of the Service will be available at all times or without interruption. We may perform maintenance, updates, or changes that temporarily affect availability.

### 12.3 No Warranty on Agent Definitions

Automagent does not warrant, endorse, or guarantee the accuracy, safety, reliability, or fitness for any purpose of agent definitions published to the hub by third-party users. You use third-party agent definitions at your own risk.

### 12.4 No Warranty on Agent Behavior

Automagent makes no warranties regarding the behavior, outputs, or consequences of running any AI agent, whether defined using the `agent.yaml` specification or otherwise. AI agents may produce unexpected, inaccurate, or harmful results. You are solely responsible for evaluating and managing the risks of agent execution.

---

## 13. Limitation of Liability

### 13.1 Exclusion of Damages

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AUTOMAGENT, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY.

### 13.2 Cap on Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, AUTOMAGENT'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID TO AUTOMAGENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100).

### 13.3 Basis of the Bargain

THE LIMITATIONS IN THIS SECTION REFLECT A REASONABLE ALLOCATION OF RISK AND ARE A FUNDAMENTAL PART OF THE BASIS OF THE BARGAIN BETWEEN YOU AND AUTOMAGENT. THE SERVICE WOULD NOT BE PROVIDED WITHOUT THESE LIMITATIONS.

---

## 14. Indemnification

You agree to indemnify, defend, and hold harmless Automagent and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:

1. Your use of the Service.
2. Your User Content, including any agent definitions you publish.
3. The execution, deployment, or operation of any AI agent that you run, configure, or distribute, regardless of whether you authored the underlying agent definition.
4. Your violation of these Terms or any applicable law.
5. Your infringement or misappropriation of any third party's rights.

---

## 15. Termination

### 15.1 Termination by You

You may stop using the Service and close your account at any time by contacting us or using account settings (where available). Closing your account does not automatically remove published agent definitions; you should unpublish them before closing your account if you wish them to be removed.

### 15.2 Termination by Automagent

We may suspend or terminate your access to the Service at any time, with or without notice, if:

- You violate these Terms, the Acceptable Use Policy, or the Abuse Policy.
- Your use of the Service poses a security risk or legal liability to Automagent or other users.
- We are required to do so by law.
- We discontinue the Service or any material part of it.

### 15.3 Effect of Termination

Upon termination:

- Your right to access the Service (including the hub and APIs) ceases immediately.
- We may delete your account data in accordance with our Privacy Policy.
- Published agent definitions may be removed or retained at our discretion, subject to Section 5.4.
- Sections 4.2 (License Grant), 8 (Agent Execution), 9 (Intellectual Property), 12 (Disclaimers), 13 (Limitation of Liability), 14 (Indemnification), 17 (Governing Law), and this Section 15.3 survive termination.

---

## 16. Changes to Terms

We may modify these Terms from time to time. When we make material changes, we will:

- Update the "Last Updated" date at the top of this document.
- Notify registered users via email or through the Service at least thirty (30) days before the changes take effect.
- Post the revised Terms on automagent.dev.

Your continued use of the Service after the effective date of revised Terms constitutes your acceptance of the changes. If you do not agree to the revised Terms, you must stop using the Service.

---

## 17. Governing Law

These Terms shall be governed by and construed in accordance with the laws of [JURISDICTION — STATE/COUNTRY], without regard to its conflict-of-law principles. Any disputes arising under these Terms shall be resolved exclusively in the courts located in [JURISDICTION — CITY, STATE/COUNTRY], and you consent to the personal jurisdiction of such courts.

---

## 18. Contact Information

If you have questions about these Terms, need to report a violation, or wish to submit a takedown request, please contact us at:

**Automagent**
- **Email:** legal@automagent.dev
- **Website:** [https://automagent.dev](https://automagent.dev)

---

*These Terms of Service are effective as of [TBD].*
