import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Harmon's Distinctive Homes",
  description:
    "Learn how DistinctHomes.com collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Harmon's Distinctive Homes"
              width={150}
              height={42}
              priority
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 font-[family-name:var(--font-playfair)]">
          Privacy Policy
        </h1>
        <p className="text-gray-500 mb-10">Last Updated: January 1st, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <p>
            DistinctHomes.com (&ldquo;DistinctHomes,&rdquo; &ldquo;we,&rdquo;
            &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a digital advertising
            media owned and operated by Harmon Worldwide, LLC. We are committed
            to protecting your privacy and safeguarding any personal information
            you provide while using our website.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and
            protect information obtained through DistinctHomes.com (the
            &ldquo;Site&rdquo;).
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              1. Information We Collect
            </h2>

            <h3 className="text-lg font-medium text-gray-900 mb-3">
              A. Information You Voluntarily Provide
            </h3>
            <p>We may collect personal information when you:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Subscribe to newsletters or updates</li>
              <li>Submit an inquiry or contact form</li>
              <li>
                Request information about a property, agent, or advertiser
              </li>
              <li>Communicate with us directly</li>
            </ul>
            <p className="mt-4">This information may include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Any additional information you choose to submit</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">
              B. Automatically Collected Information
            </h3>
            <p>
              When you visit our Site, we may automatically collect certain
              non-personal information, including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>IP address</li>
              <li>Browser type and device information</li>
              <li>Pages viewed and time spent on the Site</li>
              <li>Referring website or source</li>
            </ul>
            <p className="mt-4">
              This information is used for analytics, security, and site
              performance optimization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              2. How We Use Your Information
            </h2>
            <p>We may use collected information to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Respond to inquiries or requests</li>
              <li>Deliver newsletters or content you have opted into</li>
              <li>Improve website performance and user experience</li>
              <li>Monitor site usage and trends</li>
              <li>Support advertising and promotional analytics</li>
            </ul>
            <p className="mt-4 font-medium">
              DistinctHomes.com does not sell, rent, or trade your personal
              information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              3. Media Portal &amp; Third-Party Relationships
            </h2>
            <p>
              DistinctHomes.com is a media and advertising platform, not a real
              estate brokerage.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>
                Property listings and related information are provided by
                third-party sources, including real estate brokerages, agents,
                advertisers, or data providers.
              </li>
              <li>
                Any inquiry submitted through a listing may be shared with the
                applicable listing agent, brokerage, or advertiser for response
                purposes.
              </li>
              <li>
                We are not responsible for the privacy practices of third-party
                websites, brokerages, advertisers, or linked platforms.
              </li>
            </ul>
            <p className="mt-4">
              We encourage users to review the privacy policies of any
              third-party websites they engage with.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              4. Cookies &amp; Tracking Technologies
            </h2>
            <p>
              DistinctHomes.com may use cookies and similar technologies to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Analyze website traffic</li>
              <li>Understand user behavior</li>
              <li>Improve content relevance</li>
              <li>Support advertising and promotional efforts</li>
            </ul>
            <p className="mt-4">
              You may choose to disable cookies through your browser settings;
              however, some features of the Site may not function properly as a
              result.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              5. Advertising &amp; Analytics
            </h2>
            <p>
              We may work with third-party advertising platforms and analytics
              providers (such as social media platforms or website analytics
              tools) to measure performance and deliver relevant content. These
              providers may use cookies or similar technologies in accordance
              with their own privacy policies.
            </p>
            <p className="mt-4">
              DistinctHomes.com does not control how third parties collect or
              use your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              6. Data Security
            </h2>
            <p>
              We implement reasonable administrative, technical, and physical
              safeguards designed to protect your information. However, no method
              of transmission over the internet or electronic storage is
              completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              7. Children&apos;s Privacy
            </h2>
            <p>
              DistinctHomes.com is not intended for children under the age of
              13. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              8. Your Choices
            </h2>
            <p>You may:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Opt out of marketing communications at any time</li>
              <li>
                Request access, correction, or deletion of your personal
                information by contacting us
              </li>
            </ul>
            <p className="mt-4">
              Requests can be submitted using the contact information below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              9. Changes to This Privacy Policy
            </h2>
            <p>
              We reserve the right to update this Privacy Policy at any time.
              Changes will be posted on this page with an updated &ldquo;Last
              Updated&rdquo; date. Your continued use of the Site constitutes
              acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              10. Contact Information
            </h2>
            <p>
              If you have questions about this Privacy Policy or our data
              practices, please contact:
            </p>
            <div className="mt-4 bg-gray-50 rounded-lg p-6">
              <p className="font-semibold text-gray-900">
                Harmon Worldwide, LLC
              </p>
              <p className="mt-1">
                Email:{" "}
                <a
                  href="mailto:info@harmonworldwide.net"
                  className="text-[#0c87f2] hover:underline"
                >
                  info@harmonworldwide.net
                </a>
              </p>
              <p className="mt-1">
                Website:{" "}
                <a
                  href="https://distincthomes.com"
                  className="text-[#0c87f2] hover:underline"
                >
                  DistinctHomes.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; 2026 Harmon&apos;s Distinctive Homes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
