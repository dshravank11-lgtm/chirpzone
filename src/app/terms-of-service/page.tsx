
import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">ChirpZone Terms of Service</h1>

      <h2 className="text-2xl font-semibold mb-3 mt-6">Account Suspension and Termination (Banning Policy)</h2>
      <p className="mb-2">
        ChirpZone reserves the right to suspend or permanently ban accounts that violate our Community Guidelines or these Terms.
      </p>

      <h2 className="text-2xl font-semibold mb-3 mt-6">Grounds for Banning</h2>
      <p className="mb-2">
        Includes but is not limited to: harassment, illegal activity, botting, or repeated violations of content policies.
      </p>

      <h2 className="text-2xl font-semibold mb-3 mt-6">Data Retention After a Ban</h2>
      <p className="mb-2">
        If an account is banned, we may retain certain "identifiers" (like your email hash or IP address) to prevent you from creating new accounts. This is processed under the legal basis of "Legitimate Interest" (GDPR) and "Security/Fraud Prevention" (CCPA). All other non-essential personal data will be deleted or anonymized within 30 days of the ban.
      </p>

      <h2 className="text-2xl font-semibold mb-3 mt-6">Appeals</h2>
      <p className="mb-2">
        If you believe your account was banned in error, you may contact <a href="mailto:dshravan.k11@gmail.com" className="text-blue-500 hover:underline">dshravan.k11@gmail.com</a> or <a href="mailto:parthmar97@gmail.com" className="text-blue-500 hover:underline">parthmar97@gmail.com</a> to file an appeal and request a review.
      </p>
    </div>
  );
};

export default TermsOfServicePage;