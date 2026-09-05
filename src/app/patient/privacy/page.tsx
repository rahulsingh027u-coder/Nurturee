export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
        <div className="prose prose-sm text-gray-600 space-y-4">
          <p><b>Last updated:</b> August 2025</p>
          <p>Nurturee ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our healthcare platform.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">Information We Collect</h3>
          <p>We collect information you provide directly, such as your name, phone number, email address, and health-related information when you book appointments or communicate with healthcare providers.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">How We Use Your Information</h3>
          <p>Your information is used to provide and improve our services, facilitate appointments, communicate with you, and ensure the security of our platform. We never sell your personal data to third parties.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">Data Security</h3>
          <p>We implement industry-standard security measures to protect your data. All communications are encrypted, and access to personal health information is strictly controlled.</p>
          <h3 className="text-lg font-semibold text-gray-700 mt-6">Contact Us</h3>
          <p>If you have questions about this Privacy Policy, please contact us at support@nurturee.in.</p>
        </div>
        <a href="/patient/login" className="inline-block mt-8 text-cyan-600 hover:underline">&larr; Back to Login</a>
      </div>
    </div>
  );
}
