import usePageMeta from '../lib/usePageMeta.js'
import PageHero from '../components/PageHero.jsx'

const sections = [
  {
    title: '1. Introduction',
    body: 'Welcome to FlyupLine.com. By accessing our website, mobile applications, or any related services (collectively referred to as "FlyupLine.com" or "our website"), you agree to comply with these Terms and Conditions. Our platform aims to provide users with travel information and facilitate the booking of travel-related products and services.',
  },
  {
    title: '2. Booking and Payment',
    items: [
      'All flight bookings are subject to availability and confirmation by the airline or travel provider.',
      'Prices are subject to change until payment is completed and booking is confirmed.',
      'Full payment is required at the time of booking unless stated otherwise.',
      'We are not responsible for any fees, currency exchange differences, or additional charges imposed by banks or payment providers.',
    ],
  },
  {
    title: '3. Travel Information',
    body: 'Travelers are responsible for understanding and complying with all legal travel requirements, including passport, visa, and health regulations. FlyupLine.com is not liable for any consequences resulting from non-compliance with these requirements.',
  },
  {
    title: '4. Cancellations, Changes, and Refunds',
    items: [
      'Cancellation and refund policies vary by airline and service provider. Customers are responsible for reviewing these policies before booking.',
      'Change requests, including flight rescheduling or passenger details modifications, may incur additional charges as determined by the airline.',
      'Refund eligibility is based on the airline’s policies and may take time to process.',
      'FlyUp Line does not guarantee refunds for cancellations outside of our control.',
    ],
  },
  {
    title: '5. Responsibilities of the Customer',
    items: [
      'Provide accurate personal and travel information at the time of booking.',
      'Ensure that all travel documents (passport, visa, etc.) are valid before departure.',
      'Arrive at the airport with sufficient time to complete check-in and security procedures.',
      'Adhere to the airline’s baggage policies, terms, and conditions.',
    ],
  },
  {
    title: '6. Limitation of Liability',
    items: [
      'FlyUp Line acts as an intermediary between customers and airlines; we are not responsible for flight delays, cancellations, baggage loss, or service disruptions caused by third parties.',
      'We are not liable for any costs incurred due to missed flights, denied boarding, or other travel interruptions beyond our control.',
      'Any disputes regarding airline services must be resolved directly with the airline.',
    ],
  },
  {
    title: '7. Fees and Payments',
    items: [
      'Your credit card statement may show multiple charges from different entities, but the total amount will not exceed the confirmed booking price.',
      'Depending on your payment method, exchange rate variations and international transaction fees may apply.',
    ],
  },
  {
    title: '8. Baggage and Seat Selection Requests',
    items: [
      'Additional baggage requests are subject to airline approval and availability.',
      'Seat selection is not guaranteed and may be altered by the airline at any time.',
    ],
  },
  {
    title: '9. Unaccompanied Minors Policy',
    items: [
      'FlyupLine.com does not sell tickets directly to minors under 18.',
      'Specific policies apply to unaccompanied minors under 16 years old.',
      'Airline policies regarding unaccompanied minors vary, including age restrictions, direct flight requirements, and additional service fees.',
      'Guardians must confirm policies with the airline, ensure all required documents are provided, and accompany the minor through the check-in process.',
    ],
  },
  {
    title: '10. Intellectual Property',
    items: [
      'All content on this website, including text, graphics, logos, and images, is owned by FlyUp Line and is protected by copyright and trademark laws.',
      'You may not copy, reproduce, or distribute any content without prior written consent.',
    ],
  },
  {
    title: '11. Privacy and Data Protection',
    body: 'We collect and use personal information in accordance with our Privacy Policy. By using our services, you consent to our data collection practices.',
  },
  {
    title: '12. Modifications to Terms',
    body: 'FlyUp Line reserves the right to update or modify these Terms and Conditions at any time. Continued use of our services after changes indicates acceptance of the updated terms.',
  },
  {
    title: '13. Complaints and Feedback',
    items: [
      'If you have a complaint or feedback regarding our services, you may contact us through our contact page.',
      'Our team is committed to providing timely and effective responses.',
      'Please provide all relevant details, such as your booking reference and a clear description of the issue, to facilitate resolution.',
    ],
  },
  {
    title: '14. Final Notes',
    items: [
      'We strongly advise confirming your flight details with the airline at least 24-72 hours before departure.',
      'For assistance, please contact our customer service team.',
      'By using FlyupLine.com, you acknowledge and accept these Terms and Conditions. We encourage you to review them periodically for updates.',
    ],
  },
]

export default function TermsConditions() {
  usePageMeta(
    'Terms & Conditions — FlyUp Line',
    'The terms that apply when you request quotes and book flights through FlyUp Line, including payments, cancellations, and customer responsibilities.'
  )
  return (
    <>
      <PageHero title="Terms & Conditions" />
      <div className="container section-tight">
        <div className="prose">
          {sections.map(({ title, body, items }) => (
            <div key={title}>
              <h4>{title}</h4>
              {body && <p>{body}</p>}
              {items && (
                <ul>
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
