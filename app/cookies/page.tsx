import LegalPage from "@/components/LegalPage";

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>This Cookie Policy explains how Cube Lab 3D uses cookies, local storage, software development kits, pixels, tags, and similar technologies (“Cookies”) in connection with the Services.</p>

      <h2>1. What Cookies Are</h2>
      <p>Cookies are small files or identifiers stored on or accessed from your device. Some are necessary for a website to work; others remember preferences, measure performance, prevent abuse, or support advertising.</p>

      <h2>2. Categories We May Use</h2>
      <ul>
        <li><strong>Strictly necessary:</strong> security, load balancing, authentication, session continuity, consent records, and core functionality.</li>
        <li><strong>Preferences:</strong> language, theme, accessibility settings, cube preferences, and guest progress.</li>
        <li><strong>Analytics:</strong> page performance, feature usage, crashes, traffic sources, and aggregated engagement.</li>
        <li><strong>Advertising and affiliate:</strong> ad delivery, frequency limits, attribution, fraud prevention, and measuring affiliate referrals.</li>
      </ul>

      <h2>3. Consent and Controls</h2>
      <p>Nonessential Cookies are disabled until you provide consent. You may grant, reject, or withdraw consent by category at any time through <a href="/cookies/settings">Cookie Settings</a>. You can also use browser or device controls, although blocking necessary Cookies may prevent parts of the Services from working.</p>

      <h2>4. Global Privacy Signals</h2>
      <p>Where legally required and technically supported, we honor recognized opt-out preference signals, such as Global Privacy Control, for activities treated as a sale, sharing, or targeted advertising. When we detect such a signal, advertising and data-sharing Cookies are pre-set to off unless you explicitly turn them on.</p>

      <h2>5. Third Parties</h2>
      <p>Hosting, analytics, authentication, embedded video, advertising, affiliate, and security providers may place or access Cookies subject to their own policies, and only within the categories you have allowed. The current first-party Cookie inventory — naming each key, provider, purpose, duration, and category — is published on the <a href="/cookies/settings">Cookie Settings</a> page and must be extended before any new storage-writing service is enabled.</p>

      <h2>6. Retention</h2>
      <p>Session Cookies expire when the session ends. Persistent Cookies remain for a defined period or until deleted. We will configure retention periods to be proportionate to each purpose.</p>

      <h2>7. Updates and Contact</h2>
      <p>We may update this Policy as technologies or legal requirements change. Questions may be submitted through the Contact or Data Rights page.</p>
    </LegalPage>
  );
}
