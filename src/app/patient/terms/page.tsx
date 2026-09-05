export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Terms of Service</h1>
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p><b>Last updated:</b> August 2025</p>
          <p>By accessing or using Nurturee's platform, you agree to be bound by these Terms of Service. Please read them carefully.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">Use of Services</h3>
          <p>Nurturee provides a platform connecting patients with healthcare providers. We facilitate appointment booking, telemedicine consultations, and related healthcare services. We do not provide medical advice directly.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">User Responsibilities</h3>
          <p>You are responsible for providing accurate information, keeping your account credentials secure, and using the platform in compliance with applicable laws. You must not misuse the platform or attempt to disrupt its operation.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">Healthcare Disclaimer</h3>
          <p>The information provided on our platform is for general informational purposes. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">Contact Us</h3>
          <p>If you have questions about these Terms, please contact us at support@nurturee.in.</p>
        </div>
        <a href="/patient/login" className="inline-block mt-8 text-cyan-600 hover:underline">&larr; Back to Login</a>
      </div>
    </div>
  );
}
