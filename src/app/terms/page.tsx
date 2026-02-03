import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Harmon's Distinctive Homes",
  description:
    "Terms of Use for DistinctHomes.com, a digital media and advertising platform owned by Harmon Worldwide, LLC.",
};

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="text-gray-500 mb-10">Last Updated: January 1st, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <p>
            Welcome to DistinctHomes.com (the &ldquo;Site&rdquo;). This website
            is owned and operated by Harmon Worldwide, LLC. By accessing or
            using this Site, you agree to be bound by these Terms of Use.
          </p>
          <p>
            If you do not agree with these Terms, please do not use the Site.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              1. Nature of the Site (Media Disclaimer)
            </h2>
            <p>
              DistinctHomes.com is a digital media and advertising platform. We
              are not a real estate brokerage, agent, or Multiple Listing
              Service (MLS).
            </p>
            <p className="mt-4">DistinctHomes.com does not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Represent buyers or sellers</li>
              <li>Facilitate real estate transactions</li>
              <li>Provide real estate, legal, or financial advice</li>
            </ul>
            <p className="mt-4">
              All property listings, images, and related information are
              provided by third parties, including real estate brokerages,
              agents, advertisers, or data providers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              2. Use of the Site
            </h2>
            <p>
              You agree to use DistinctHomes.com only for lawful purposes and
              in a manner consistent with these Terms.
            </p>
            <p className="mt-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Site for fraudulent or misleading purposes</li>
              <li>Attempt to access restricted areas or systems</li>
              <li>
                Copy, scrape, harvest, or republish Site content without
                permission
              </li>
              <li>Interfere with the operation or security of the Site</li>
            </ul>
            <p className="mt-4">
              We reserve the right to restrict or terminate access to the Site
              at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              3. Listings &amp; Information Disclaimer
            </h2>
            <p>
              All listings and information displayed on the Site are deemed
              reliable but not guaranteed.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-4">
              <li>
                Prices, availability, features, and status may change without
                notice
              </li>
              <li>DistinctHomes.com does not verify listing data</li>
              <li>
                Users must independently verify all information before relying
                on it
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              4. Third-Party Content &amp; Links
            </h2>
            <p>
              The Site may contain links to third-party websites,
              advertisements, or content.
            </p>
            <p className="mt-4">DistinctHomes.com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Does not control third-party websites</li>
              <li>
                Is not responsible for their content, accuracy, or privacy
                practices
              </li>
              <li>Does not endorse any third-party products or services</li>
            </ul>
            <p className="mt-4">
              Use of third-party websites is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              5. Advertising &amp; Sponsored Content
            </h2>
            <p>
              DistinctHomes.com may feature paid advertising, sponsored
              listings, or promotional content.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-4">
              <li>Placement or visibility does not imply endorsement</li>
              <li>
                Advertising relationships do not create agency or brokerage
                relationships
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              6. Intellectual Property
            </h2>
            <p>
              All content on DistinctHomes.com, including text, graphics,
              logos, layout, and design, is owned by or licensed to Harmon
              Worldwide, LLC, unless otherwise stated.
            </p>
            <p className="mt-4">You may not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Reproduce, distribute, or modify Site content</li>
              <li>
                Use content for commercial purposes without written permission
              </li>
            </ul>
            <p className="mt-4">
              Third-party trademarks and images remain the property of their
              respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              7. User Submissions
            </h2>
            <p>
              Any information submitted through the Site (including contact
              forms or inquiries) must be accurate and lawful.
            </p>
            <p className="mt-4">By submitting information, you:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Grant DistinctHomes.com the right to use the information to
                respond to inquiries
              </li>
              <li>
                Acknowledge that submissions may be shared with relevant
                advertisers, agents, or brokers
              </li>
            </ul>
            <p className="mt-4">
              You are responsible for the content you submit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              8. No Warranties
            </h2>
            <p>
              The Site is provided &ldquo;as is&rdquo; and &ldquo;as
              available.&rdquo;
            </p>
            <p className="mt-4">
              DistinctHomes.com makes no warranties, express or implied,
              regarding:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Accuracy or reliability of content</li>
              <li>Availability or performance of the Site</li>
              <li>Suitability of information for any purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              9. Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, Harmon Worldwide, LLC and
              DistinctHomes.com shall not be liable for any damages arising
              from:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-4">
              <li>Use or inability to use the Site</li>
              <li>Errors or omissions in listings or content</li>
              <li>Third-party actions or content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify and hold harmless Harmon Worldwide, LLC
              from any claims, damages, or expenses arising from:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-4">
              <li>Your use of the Site</li>
              <li>Violation of these Terms</li>
              <li>Misuse of Site content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              11. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and interpreted in accordance
              with the laws of the State of Ohio, without regard to conflict of
              law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              12. Changes to These Terms
            </h2>
            <p>
              We reserve the right to modify these Terms of Use at any time.
              Updates will be posted on this page with an updated &ldquo;Last
              Updated&rdquo; date.
            </p>
            <p className="mt-4">
              Continued use of the Site constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              13. Contact Information
            </h2>
            <p>
              For questions regarding these Terms of Use, please contact:
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
