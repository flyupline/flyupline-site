import { Link } from 'react-router-dom'
import usePageMeta from '../lib/usePageMeta.js'
import PageHero from '../components/PageHero.jsx'

const sections = [
  {
    title: '1. Information We Collect',
    lead: 'When you use our services, we may collect the following types of information:',
    items: [
      'Personal Information: Name, email address, phone number, billing address, passport details, and other travel-related details.',
      'Payment Information: Credit or debit card details, billing address, and payment verification data.',
      'Technical Information: IP address, browser type, operating system, and other usage details collected through cookies and tracking technologies.',
      'Communications: Any messages, feedback, or inquiries you send us via email, chat, or forms on our website.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    lead: 'We use the information we collect for various purposes, including:',
    items: [
      'Processing and managing your flight bookings and travel requests.',
      'Communicating with you regarding your travel plans, confirmations, and support inquiries.',
      'Providing customer service and resolving any issues related to our services.',
      'Sending promotional offers, newsletters, and updates (you can opt out at any time).',
      'Enhancing our website functionality and user experience.',
      'Complying with legal and regulatory obligations.',
    ],
  },
  {
    title: '3. Sharing Your Information',
    lead: 'We do not sell or rent your personal data. However, we may share your information with:',
    items: [
      'Payment processors to securely handle transactions.',
      'Legal authorities if required to comply with laws, regulations, or legal processes.',
      'Marketing and analytics providers to improve our services and user experience.',
    ],
  },
  {
    title: '4. Data Security',
    body: 'We implement industry-standard security measures to protect your personal data from unauthorized access, disclosure, or loss. However, no online transmission is completely secure, so we encourage you to take precautions when sharing sensitive information.',
  },
  {
    title: '5. Your Rights and Choices',
    lead: 'Depending on your location, you may have rights regarding your personal data, including:',
    items: [
      'Accessing, updating, or deleting your personal information.',
      'Opting out of promotional emails and communications.',
      'Requesting information on how we process your data.',
    ],
    contactItem: true,
  },
  {
    title: '6. Cookies and Tracking Technologies',
    body: 'Our website uses cookies to improve user experience, track analytics, and enhance site functionality. You can manage your cookie preferences through your browser settings.',
  },
  {
    title: '7. Third-Party Links',
    body: 'Our website may contain links to third-party websites. We are not responsible for their privacy practices, and we encourage you to review their policies before providing personal data.',
  },
  {
    title: '8. Changes to This Privacy Policy',
    body: 'We may update this policy from time to time to reflect changes in our practices or legal requirements. Any updates will be posted on this page with the revised effective date.',
  },
]

export default function PrivacyPolicy() {
  usePageMeta(
    'Privacy Policy — FlyUp Line',
    'How FlyUp Line collects, uses, and protects your personal information when you request flight quotes and book travel with us.'
  )
  return (
    <>
      <PageHero title="Privacy Policy" />
      <div className="container section-tight">
        <div className="prose">
          <p>
            <strong>Introduction — </strong>
            Welcome to FlyUp Line. Your privacy is important to us, and we are committed to
            protecting the personal information you share with us. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you visit our
            website and use our services.
          </p>

          {sections.map(({ title, lead, body, items, contactItem }) => (
            <div key={title}>
              <h4>{title}</h4>
              {lead && <p>{lead}</p>}
              {body && <p>{body}</p>}
              {items && (
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {contactItem && (
                    <li>To exercise these rights, contact us via our <Link to="/contact">contact page</Link>.</li>
                  )}
                </ul>
              )}
            </div>
          ))}

          <h4>9. Contact Us</h4>
          <p>
            If you have any questions about this Privacy Policy or how we handle your data,
            please reach out via our <Link to="/contact">contact page</Link>.
          </p>
        </div>
      </div>
    </>
  )
}
