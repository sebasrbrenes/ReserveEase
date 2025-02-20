import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

const features = [
    "Unlimited Bookings",
    "Customer Management",
    "Analytics Dashboard",
    "Email Notifications",
    "Calendar Integration",
    "24/7 Support",
    "Mobile-First Design",
    "Security & Privacy"
];

const PricingPlans = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-2xl font-bold leading-7 text-indigo-600">Pricing</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Choose the perfect plan for your business
                    </p>
                </div>
                <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Monthly Plan */}
                    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 ring-1 ring-gray-200 xl:p-6 hover:shadow-xl transition duration-300">
                        <div>
                            <div className="flex items-center justify-between gap-x-4">
                                <h3 className="text-lg font-bold text-gray-900">Monthly</h3>
                                <p className="rounded-full bg-indigo-600/10 px-2 py-0.5 text-xs font-semibold leading-5 text-indigo-600">
                                    Most Popular
                                </p>
                            </div>
                            <p className="mt-3 flex items-baseline gap-x-1">
                                <span className="text-3xl font-bold tracking-tight text-gray-900">$29</span>
                                <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                            </p>
                            <ul role="list" className="mt-5 space-y-2.5">
                                {features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <CheckIcon className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                                        <span className="text-sm leading-6 text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => window.location.href = "https://reserveease.lemonsqueezy.com/buy/565b5c42-8c4e-485c-8a3f-750dd32d65e6?checkout[discount_code]=K5OTU1OQ"}
                            className="mt-8 block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                        >
                            Get started - Monthly Plan
                        </button>
                    </div>

                    {/* Annual Plan */}
                    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 ring-1 ring-gray-200 xl:p-6 hover:shadow-xl transition duration-300">
                        <div>
                            <div className="flex items-center justify-between gap-x-4">
                                <h3 className="text-lg font-bold text-gray-900">Annual</h3>
                                <p className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-semibold leading-5 text-green-600">
                                    Save up to $90
                                </p>
                            </div>
                            <p className="mt-3 flex items-baseline gap-x-1">
                                <span className="text-3xl font-bold tracking-tight text-gray-900">$260</span>
                                <span className="text-sm font-semibold leading-6 text-gray-600">/year</span>
                            </p>
                            <ul role="list" className="mt-5 space-y-2.5">
                                {features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <CheckIcon className="h-6 w-5 flex-none text-indigo-600" aria-hidden="true" />
                                        <span className="text-sm leading-6 text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <button
                            onClick={() => window.location.href = "https://reserveease.lemonsqueezy.com/buy/071b0899-152c-45e7-80e3-2feb67aeec73?checkout[discount_code]=A5MTGXMW"}
                            className="mt-8 block w-full rounded-md bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                        >
                            Get started - Annual Plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPlans;
