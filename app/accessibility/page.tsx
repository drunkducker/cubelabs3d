import LegalPage from "@/components/LegalPage";

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility Statement">
      <p>Cube Lab 3D is committed to making its websites, games, cube-solving tools, and account features usable by people with disabilities.</p>

      <h2>Our Goal</h2>
      <p>We aim to design and test the Services using recognized accessibility practices, including keyboard access, visible focus states, semantic structure, sufficient contrast, reduced-motion support, meaningful labels, touch-friendly controls, and compatibility with assistive technologies.</p>

      <h2>Known Limitations</h2>
      <p>Interactive 3D controls, visual cube-state entry, embedded videos, advertisements, and third-party content may present accessibility challenges. We will provide alternative controls or text instructions where reasonably possible and will not rely exclusively on color to communicate critical information.</p>

      <h2>Feedback and Assistance</h2>
      <p>If you encounter an accessibility barrier, contact us through the Contact page and identify the page, feature, device, browser, assistive technology, and problem encountered. We will make reasonable efforts to respond and provide an accessible alternative.</p>

      <h2>Ongoing Work</h2>
      <p>Accessibility is an ongoing process. Before public launch, the homepage, solver, authentication flow, consent controls, legal pages, and account-deletion process should be tested with automated tools, keyboard-only navigation, screen readers, zoom, and reduced-motion settings.</p>
    </LegalPage>
  );
}
