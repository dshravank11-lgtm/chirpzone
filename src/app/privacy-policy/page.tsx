
// src/app/privacy-policy/page.tsx

import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>

      <h2 className="text-2xl font-semibold mb-3 mt-6">Your Rights: Data Access and Deletion</h2>
      <p className="mb-2">You have the right to request the deletion of your personal data. At ChirpZone, we provide two ways to do this:</p>

      <h3 className="text-lg font-medium mb-2 mt-4">Account Deletion:</h3>
      <p className="mb-2">You can delete your account directly within your profile settings. This will initiate an automated process to remove your personal information from our active databases.</p>

      <h3 className="text-lg font-medium mb-2 mt-4">Manual Request:</h3>
      <p className="mb-2">You may also email us at <a href="mailto:dshravan.k11@gmail.com" className="text-blue-500 hover:underline">dshravan.k11@gmail.com</a> or <a href="mailto:parthmar97@gmail.com" className="text-blue-500 hover:underline">parthmar97@gmail.com</a> with the subject line "Data Deletion Request." We will verify your identity and process your request within 30 days (GDPR) or 45 days (CCPA).</p>

      <h3 className="text-lg font-medium mb-2 mt-4">Note on Firebase Data:</h3>
      <p className="mb-2">As we use Google Firebase, some data (such as backups or server logs) may persist for up to 180 days in Google’s systems after deletion from our live database, in accordance with Google's data processing terms.</p>

      <h2 className="text-2xl font-semibold mb-3 mt-6">Service Providers</h2>
      <p className="mb-2">We use Google Firebase to host ChirpZone and manage authentication. Google may collect certain device identifiers and usage data. You can find Google’s Privacy terms here: <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">https://firebase.google.com/support/privacy</a>.</p>
    </div>
  );
};

export default PrivacyPolicyPage;