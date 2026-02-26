import React from "react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="privacy-policy-page">
      <h1>Privacy Policy</h1>
      <p>
        Last updated: February 26, 2026
      </p>

      <p>
        RegoDog respects your privacy. This policy explains what information we
        collect, how we use it, and the choices you have.
      </p>

      <h2>Information We Collect</h2>
      <p>
        We may collect information you provide directly, such as account details
        and messages. We may also collect basic technical information like
        browser type, device information, and usage data.
      </p>

      <h2>How We Use Information</h2>
      <p>
        We use information to operate and improve the site, provide requested
        features, communicate with you, and help keep the platform secure.
      </p>

      <h2>Sharing of Information</h2>
      <p>
        We do not sell personal information. We may share information with
        service providers who help run the site, or when required by law.
      </p>

      <h2>Cookies and Similar Technologies</h2>
      <p>
        We may use cookies and similar technologies to remember preferences,
        analyze traffic, and improve user experience.
      </p>

      <h2>Data Security</h2>
      <p>
        We use reasonable safeguards to protect information, but no online
        service can guarantee absolute security.
      </p>

      <h2>Your Choices</h2>
      <p>
        You may contact us to request access, correction, or deletion of your
        personal information, subject to applicable law.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions, contact us at
        {" "}
        <a href="mailto:rjneiman@gmail.com">rjneiman@gmail.com</a>.
      </p>
    </div>
  );
};

export default PrivacyPolicy;
