import { useState } from 'react';

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
      {
        "question": "What is ReserveEase?",
        "answer": "ReserveEase is an all-in-one booking and reservation management platform that simplifies scheduling for service-based businesses. Whether you run a salon, clinic, consultancy, or any other service-oriented business, ReserveEase streamlines appointments, reduces no-shows, and helps you manage your time effectively."
      },
      {
        "question": "How much does ReserveEase cost?",
        "answer": "We offer a variety of pricing plans designed to meet the needs of businesses of all sizes. Visit our Pricing page for a detailed breakdown of our packages, features, and any special offers currently available."
      },
      {
        "question": "Can I try ReserveEase before committing?",
        "answer": "Absolutely! ReserveEase comes with a risk-free free trial of 14 days that lets you explore all of its features. Sign up today and see firsthand how ReserveEase can transform your scheduling process—no commitment required."
      },
      {
        "question": "Is my data secure with ReserveEase?",
        "answer": "Yes, data security is our top priority. We use industry-leading encryption and robust security protocols to ensure your business and customer information is always safe and private. You can focus on growing your business knowing your data is protected."
      },
      {
        "question": "Do I need technical knowledge to use ReserveEase?",
        "answer": "Not at all! ReserveEase is designed with user-friendliness in mind. Its intuitive interface makes setup and management a breeze, even if you're not tech-savvy. Plus, our extensive support systems is always available to help every step of the way."
      },
      {
        "question": "Can I integrate ReserveEase with my existing website?",
        "answer": "Yes, integration is simple. You can add our personalized and unique booking page to your website or social media using the provided URL. It will redirect your clients to the ReserveEase booking page so they can easily book your services."
      }    
  ];

  const toggleAccordion = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-gray-900 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-100 mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-300">Have questions? We're here to help.</p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div key={index} className="mb-4">
              <button
                className="w-full px-6 py-4 text-left bg-blue-950 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-900"
                onClick={() => toggleAccordion(index)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-100">{faq.question}</span>
                  <span 
                    className={`transform transition-transform duration-300 ease-in-out text-gray-300 ${
                      activeIndex === index ? 'rotate-180' : 'rotate-0'
                    }`}
                  >
                    ▼
                  </span>
                </div>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    activeIndex === index ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="text-gray-300 font-normal text-base">
                    {faq.answer}
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
