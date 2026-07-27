import LegalPage from "@/components/LegalPage";

export default function SecurityPolicyPage() {
  return (
    <LegalPage title="Security and Vulnerability Reporting" updated="July 27, 2026">
      <p>We take the security of Cube Lab 3D seriously and welcome reports from security researchers and users. This page explains how to report a suspected vulnerability and what to expect in return.</p>

      <h2>1. How to Report</h2>
      <p>Before public launch, this page will publish a dedicated security contact address and, where offered, an encryption key. Until then, please submit reports through the Contact page with the subject “Security Report.” Include enough detail to reproduce the issue, such as affected URLs, steps, and impact.</p>

      <h2>2. Good-Faith Research</h2>
      <p>We will not pursue legal action against researchers who act in good faith, avoid privacy violations and service disruption, and follow this Policy. Good-faith research does not authorize accessing, modifying, or deleting other users’ data beyond what is necessary to demonstrate a vulnerability.</p>

      <h2>3. Please Do Not</h2>
      <ul>
        <li>Access, download, or alter data that does not belong to you beyond the minimum needed to prove an issue.</li>
        <li>Run denial-of-service, spam, or high-volume automated attacks against production systems.</li>
        <li>Use social engineering, physical attacks, or target other users or staff.</li>
        <li>Publicly disclose a vulnerability before we have had a reasonable opportunity to remediate it.</li>
      </ul>

      <h2>4. What to Expect</h2>
      <p>We aim to acknowledge valid reports, keep you informed of remediation progress where appropriate, and credit researchers who wish to be recognized. We prioritize fixes based on severity and risk to users.</p>

      <h2>5. Scope</h2>
      <p>This Policy covers the Cube Lab 3D application and its official domains. Third-party services we rely on are governed by their own security programs and policies. Reports about third-party providers should also be sent to the relevant provider.</p>

      <h2>6. Data Protection Concerns</h2>
      <p>If your report involves personal data, please avoid collecting or retaining more than necessary. For privacy questions unrelated to a vulnerability, use the <a href="/data-rights">Data Rights</a> page.</p>

      <h2>7. Changes</h2>
      <p>We may update this Policy as our security program matures. A formal disclosure program and contact details will be finalized before public launch.</p>
    </LegalPage>
  );
}
