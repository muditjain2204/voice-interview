import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Check, Zap, Star, Crown, ArrowLeft, Loader2 } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    if (planId === 'free') {
      if (!user) {
        navigate('/signup');
      }
      return;
    }

    if (!user) {
      toast.error('Please sign in first to upgrade');
      navigate('/login');
      return;
    }

    setLoadingPlan(planId);
    try {
      const response = await axios.post('/api/v1/payments/create-checkout', {
        plan: planId,
      });

      if (response.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Payment service unavailable';
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: 0,
      description: 'Get started with AI interviews',
      features: [
        '2 free interviews per month',
        'Basic feedback & analysis',
        'Limited roles (5 roles)',
        'Standard response time',
        'Community support',
      ],
      icon: <Star className="w-6 h-6" />,
      color: 'gray',
      cta: user ? 'Current Plan' : 'Sign Up Free',
    },
    {
      name: 'Pro',
      price: 29,
      description: 'For serious interview preparation',
      features: [
        '20 interviews per month',
        'Advanced AI feedback',
        'All roles & companies (15+ roles)',
        'Camera proctoring analytics',
        'Custom difficulty levels',
        'Priority response time',
        'Email support',
      ],
      icon: <Zap className="w-6 h-6" />,
      color: 'indigo',
      cta: 'Get Pro',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 99,
      description: 'For teams and power users',
      features: [
        'Unlimited interviews',
        'Premium AI feedback & analysis',
        'All roles & companies',
        'Advanced proctoring analytics',
        'Custom difficulty levels',
        'Priority support',
        'Team collaboration features',
        'Custom integrations',
        'Dedicated account manager',
      ],
      icon: <Crown className="w-6 h-6" />,
      color: 'purple',
      cta: 'Get Enterprise',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Pricing Plans</h1>
          <p className="mt-2 text-gray-600">
            Choose the perfect plan for your interview preparation
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border-2 transition-all ${
                plan.popular
                  ? 'border-indigo-600 bg-white shadow-2xl scale-105'
                  : 'border-gray-200 bg-white shadow-sm hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.color === 'indigo'
                      ? 'bg-indigo-100 text-indigo-600'
                      : plan.color === 'purple'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              </div>

              <p className="text-gray-600 mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500">/month</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.name.toLowerCase())}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                disabled={user?.subscriptionTier === plan.name.toLowerCase() || loadingPlan === plan.name.toLowerCase()}
              >
                {loadingPlan === plan.name.toLowerCase() ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : user?.subscriptionTier === plan.name.toLowerCase()
                  ? 'Current Plan'
                  : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of the billing period.',
              },
              {
                q: 'What happens when I run out of credits?',
                a: 'You can upgrade your plan or purchase additional interview credits. Free plan users get 2 interviews per month.',
              },
              {
                q: 'Is there a free trial for Pro/Enterprise?',
                a: 'Yes, we offer a 7-day free trial for the Pro plan. No credit card required.',
              },
              {
                q: 'Do the interviews count toward my score?',
                a: 'Yes, all interviews are scored and analyzed. You can track your progress over time in the Results section.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}