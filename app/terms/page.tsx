import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Mobile Salon Terms and Conditions of Use — Kenya",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-[var(--ms-plum)]">{title}</h2>
      <div className="space-y-4 text-base leading-8 text-[var(--ms-charcoal)]">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-soft-bg)] px-4 py-10 text-[var(--ms-charcoal)]">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-10 overflow-hidden rounded-[32px] bg-[var(--ms-plum)] px-8 py-10 text-white shadow-[0_24px_80px_rgba(58,24,58,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Legal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight">
            Terms & Conditions of Use
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Effective Date: [To be inserted by Mobile Salon]
            <br />
            Last Updated: [To be inserted by Mobile Salon]
          </p>
          <p className="mt-5 rounded-[18px] bg-white/10 px-5 py-4 text-sm leading-7 text-white/80">
            Please read these Terms carefully before using the Mobile Salon platform. By accessing or using any part of the Platform, or by creating an account, you confirm that you have read, understood, and agreed to be bound by these Terms. If you do not agree, you must not use the Platform.
          </p>
        </div>

        {/* Content card */}
        <div className="rounded-[32px] border border-[var(--ms-border)] bg-white px-8 py-10 shadow-[0_18px_60px_rgba(13,27,42,0.08)]">

          <Section title="1. About Mobile Salon">
            <p>
              Mobile Salon is a digital marketplace platform operated by Mobile Salon Limited, a company registered in Kenya ("Mobile Salon", "we", "us", "our"). The Platform connects clients seeking beauty services, beauty professionals offering services, salons and spas, beauty product shops, and delivery service providers.
            </p>
            <p>
              <strong>Mobile Salon is a technology intermediary only.</strong> We do not provide beauty services, sell beauty products, or provide delivery services directly. We provide the technology platform through which independent parties transact.
            </p>
          </Section>

          <Section title="2. Account Registration and Role Selection">
            <p>
              To access most features of the Platform, you must register an account and select an account role: Client, Professional, Salon, Shop, or Delivery. Your role determines your access rights, the features available to you, and your obligations under these Terms.
            </p>
            <p>
              Your chosen role is permanent and cannot be changed after registration. If you require a different role, you must register a separate account using a different email address.
            </p>
            <p>
              You must be at least 18 years of age to create an account. By registering, you confirm that all information you provide is true, accurate, current, and complete. You are responsible for maintaining the confidentiality of your account credentials. You accept full responsibility for all activities that occur under your account.
            </p>
          </Section>

          <Section title="3. User Content and Listings">
            <p>
              You are solely responsible for all content you upload, post, publish, or transmit through the Platform, including but not limited to: product listings, photos, descriptions, prices, service portfolios, reviews, and messages ("User Content").
            </p>
            <p>You represent and warrant that:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>you have all necessary rights to your User Content;</li>
              <li>your User Content is accurate, truthful, and not misleading;</li>
              <li>your User Content does not infringe any third-party intellectual property rights;</li>
              <li>your User Content does not contain counterfeit, prohibited, or illegal items;</li>
              <li>all products listed comply with Kenya Bureau of Standards (KEBS) regulations and any applicable product safety laws.</li>
            </ul>
            <p>
              Mobile Salon reserves the right to remove any User Content at any time, without notice, if we determine it violates these Terms or any applicable law. Mobile Salon is not obligated to monitor User Content but may do so at our discretion.
            </p>
          </Section>

          <Section title="4. Prohibited Conduct">
            <p>You agree not to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>post false, misleading, or fraudulent product listings or service descriptions;</li>
              <li>list or sell counterfeit, replica, or infringing products;</li>
              <li>misrepresent your qualifications, credentials, or identity;</li>
              <li>engage in price manipulation, review fraud, or any deceptive trading practices;</li>
              <li>use the Platform to harass, threaten, or harm any other user;</li>
              <li>attempt to circumvent the Platform's payment system to conduct off-platform transactions;</li>
              <li>upload malware, viruses, or harmful code;</li>
              <li>scrape, crawl, or systematically collect data from the Platform;</li>
              <li>create multiple accounts for the purpose of circumventing restrictions;</li>
              <li>use the Platform to facilitate any activity that is unlawful under Kenyan law or any applicable international law.</li>
            </ul>
            <p>
              Violation of this section may result in immediate account suspension, permanent banning, and where warranted, referral to the relevant Kenyan authorities including the Director of Public Prosecutions or the Communications Authority of Kenya.
            </p>
          </Section>

          <Section title="5. Payment Terms">
            <p>
              All transactions on the Platform are conducted in Kenyan Shillings (KES) unless otherwise stated. By making a payment through the Platform, you authorise Mobile Salon to process the transaction on your behalf through our designated payment processors (including Safaricom M-Pesa via the Daraja API and Stripe).
            </p>
            <p>
              All payments made through the Platform are final and non-refundable except as specifically provided in these Terms or as required by applicable law, including the Consumer Protection Act, 2012 (Cap 507).
            </p>
            <p>
              Mobile Salon applies a commission on marketplace transactions as specified in the applicable commission schedule. This commission is deducted from the seller's payout and is non-negotiable. By selling on the Platform, you explicitly agree to the applicable commission deduction.
            </p>
            <p>
              You are responsible for all applicable taxes on your earnings from the Platform, including VAT and income tax, in accordance with the Kenya Revenue Authority (KRA) requirements. Mobile Salon will issue transaction records but is not responsible for your tax compliance.
            </p>
          </Section>

          <Section title="6. Escrow and Payout Terms">
            <p>
              For product purchases on the Counter marketplace, payments are held in escrow by Mobile Salon until the buyer confirms receipt of goods, or until the automatic release period (72 hours after confirmed delivery) expires.
            </p>
            <p>
              Mobile Salon acts as a payment intermediary only in this process and does not guarantee the quality, safety, or accuracy of any product. Mobile Salon's decision in all disputes is final. Mobile Salon will not be liable for delays in payout caused by issues with third-party payment processors including Safaricom or Stripe.
            </p>
            <p>
              Sellers must maintain a valid and active M-Pesa number registered in their name for payouts. Mobile Salon reserves the right to withhold payment if fraud or policy violation is suspected pending investigation.
            </p>
          </Section>

          <Section title="7. No Delivery Services">
            <div className="rounded-[18px] border border-[var(--ms-border)] bg-[var(--ms-soft-bg)] px-5 py-4">
              <p className="font-semibold text-[var(--ms-navy)]">IMPORTANT</p>
              <p className="mt-2">
                Mobile Salon does not provide delivery services. The Platform may facilitate connections between Shops with Shop+ subscriptions and independent Delivery account holders, but Mobile Salon is not a party to any delivery transaction.
              </p>
              <p className="mt-3">
                Delivery partners are independent contractors. Mobile Salon makes no warranties regarding delivery timelines, product condition upon delivery, or the conduct of delivery partners. If a product is damaged, lost, delayed, or not delivered, the matter is between the buyer, the seller, and the delivery partner.
              </p>
              <p className="mt-3">
                Mobile Salon will provide dispute facilitation but accepts no financial liability for delivery failures. By completing a product purchase, you acknowledge and accept this limitation.
              </p>
            </div>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              Mobile Salon provides the Platform on an "as is" and "as available" basis without warranty of any kind. To the maximum extent permitted by Kenyan law, Mobile Salon expressly disclaims all warranties, express or implied, including but not limited to: implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
            <p>Mobile Salon shall not be liable for:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>any indirect, incidental, special, consequential, or punitive damages;</li>
              <li>loss of profits, revenue, data, goodwill, or other intangible losses;</li>
              <li>any damage arising from your use or inability to use the Platform;</li>
              <li>any damage arising from unauthorised access to or alteration of your data;</li>
              <li>any damage arising from the conduct of third parties on the Platform, including other users, service providers, shops, or delivery partners.</li>
            </ul>
            <p>
              In no event shall Mobile Salon's total aggregate liability for any claim exceed the amount paid by you to Mobile Salon in the 12-month period preceding the claim, or KES 10,000, whichever is lower. Nothing in these Terms excludes liability for death or personal injury caused by Mobile Salon's gross negligence, or liability for fraud.
            </p>
          </Section>

          <Section title="9. User Liability — Products and Services">
            <p>You, as a user of the Platform, accept full and sole liability for:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>any product you list, sell, or supply through the Platform;</li>
              <li>any service you offer or provide through the Platform;</li>
              <li>any harm, injury, loss, or damage suffered by any person as a result of a product you sold or a service you provided;</li>
              <li>any false, misleading, or inaccurate description you publish;</li>
              <li>any violation of consumer protection laws, product safety laws, or trading standards that arise from your activity on the Platform;</li>
              <li>any dispute, legal action, or regulatory penalty arising from your use of the Platform.</li>
            </ul>
            <p>
              By using the Platform, you agree to indemnify, defend, and hold harmless Mobile Salon Limited, its directors, officers, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with your use of the Platform, your User Content, your violation of these Terms, or your violation of any rights of another party.
            </p>
          </Section>

          <Section title="10. Intellectual Property">
            <p>
              All intellectual property rights in the Platform — including software, design, trademarks, logos, and content created by Mobile Salon — belong exclusively to Mobile Salon Limited.
            </p>
            <p>
              You grant Mobile Salon a non-exclusive, royalty-free, worldwide licence to use, display, and distribute your User Content solely for the purpose of operating and promoting the Platform. This licence terminates when you delete your content or your account.
            </p>
            <p>
              You may not reproduce, distribute, modify, or create derivative works of any Mobile Salon content without express written permission.
            </p>
          </Section>

          <Section title="11. Privacy and Data Protection">
            <p>
              Mobile Salon processes your personal data in accordance with the <strong>Kenya Data Protection Act, 2019</strong> (Act No. 24 of 2019) and our Privacy Policy, which forms part of these Terms by reference.
            </p>
            <p>
              By using the Platform, you consent to the collection, processing, and storage of your personal data as described in the Privacy Policy. You have the right to access, correct, and request deletion of your personal data. Requests should be directed to our data protection officer at{" "}
              <a href="mailto:privacy@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                privacy@mobilesalon.co.ke
              </a>.
            </p>
            <p>
              Mobile Salon will not sell your personal data to third parties. We may share data with service providers, payment processors, and law enforcement when legally required.
            </p>
          </Section>

          <Section title="12. Reviews and Ratings">
            <p>
              Reviews and ratings submitted through the Platform must be genuine, based on a real transaction or interaction, and comply with these Terms. Fake reviews — whether positive reviews of your own services or negative reviews of competitors — are strictly prohibited and may result in account suspension and legal action.
            </p>
            <p>
              Mobile Salon reserves the right to remove any review it determines to be false, manipulative, or in violation of these Terms. Users who submit false reviews may be held civilly liable for defamation under the <strong>Defamation Act (Cap 36) of Kenya</strong>.
            </p>
          </Section>

          <Section title="13. Account Suspension and Termination">
            <p>Mobile Salon may suspend or terminate your account at any time, with or without notice, if:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>you violate these Terms;</li>
              <li>we suspect fraud, misrepresentation, or illegal activity;</li>
              <li>you fail to pay applicable subscription fees;</li>
              <li>a court order or regulatory authority requires us to do so;</li>
              <li>we determine in our sole discretion that your presence on the Platform is harmful to other users or the Platform.</li>
            </ul>
            <p>
              Upon termination, your right to access the Platform ceases immediately. Mobile Salon is not liable to you or any third party for any consequences of account termination.
            </p>
          </Section>

          <Section title="14. Dispute Resolution">
            <p>
              Any dispute arising out of or in connection with these Terms shall first be submitted to Mobile Salon's internal dispute resolution process. If unresolved within 30 days, disputes shall be referred to mediation before the <strong>Nairobi Centre for International Arbitration (NCIA)</strong>.
            </p>
            <p>
              If mediation fails, disputes shall be resolved by arbitration under the <strong>Arbitration Act, Cap 49 of Kenya</strong>. The seat of arbitration shall be Nairobi. The language of arbitration shall be English. The arbitrator's decision shall be final and binding.
            </p>
            <p>
              Nothing in this clause prevents Mobile Salon from seeking injunctive or other equitable relief from a competent Kenyan court.
            </p>
          </Section>

          <Section title="15. Governing Law">
            <p>
              These Terms are governed by and construed in accordance with the laws of Kenya. Both parties submit to the non-exclusive jurisdiction of the courts of Kenya for any matter not covered by the arbitration clause above.
            </p>
            <p>Applicable legislation includes but is not limited to:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>the Consumer Protection Act, 2012;</li>
              <li>the Kenya Data Protection Act, 2019;</li>
              <li>the Computer Misuse and Cybercrimes Act, 2018;</li>
              <li>the Communications Authority of Kenya Act;</li>
              <li>the Business Registration Act, 2015;</li>
              <li>the KRA Acts governing taxation; and</li>
              <li>any other applicable Kenyan statute or regulation.</li>
            </ul>
          </Section>

          <Section title="16. Changes to These Terms">
            <p>
              Mobile Salon reserves the right to modify these Terms at any time. Changes take effect 14 days after notice is posted on the Platform or sent to your registered email. Continued use of the Platform after the effective date constitutes acceptance of the revised Terms.
            </p>
            <p>
              These Terms are intended to address not only present circumstances but also future technological, legal, and commercial developments. Where these Terms do not explicitly address a specific situation, the spirit and intent of these Terms — to protect the integrity of the Platform, the safety of users, and the fair operation of commerce — shall govern. Mobile Salon's interpretation of these Terms in any such situation shall be final.
            </p>
          </Section>

          <Section title="17. Contact">
            <div className="rounded-[18px] bg-[var(--ms-soft-bg)] px-5 py-5">
              <p className="font-semibold text-[var(--ms-navy)]">Mobile Salon Limited</p>
              <p className="mt-1 text-[var(--ms-mauve)]">Nairobi, Kenya</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  Legal:{" "}
                  <a href="mailto:legal@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    legal@mobilesalon.co.ke
                  </a>
                </p>
                <p>
                  Data protection:{" "}
                  <a href="mailto:privacy@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    privacy@mobilesalon.co.ke
                  </a>
                </p>
                <p>
                  Payment disputes:{" "}
                  <a href="mailto:payments@mobilesalon.co.ke" className="text-[var(--ms-rose)] underline">
                    payments@mobilesalon.co.ke
                  </a>
                </p>
              </div>
            </div>
          </Section>

        </div>

        {/* Back nav */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--ms-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--ms-mauve)] transition hover:border-[var(--ms-rose)] hover:text-[var(--ms-navy)]"
          >
            ← Back to Home
          </Link>
          <p className="text-xs text-[var(--ms-mauve)]">
            Mobile Salon Limited · Nairobi, Kenya
          </p>
        </div>
      </div>
    </main>
  );
}
