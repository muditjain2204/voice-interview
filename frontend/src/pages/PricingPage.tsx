import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Check, Zap, Star, Crown, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
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
      // 1. Try Razorpay order creation first
      let orderRes;
      try {
        orderRes = await axios.post('/api/v1/payments/create-order', {
          plan: planId,
        });
      } catch (err: any) {
        // If razorpay order creation is unavailable, try fallback checkout session
        if (err.response?.status === 503 || err.response?.status === 404) {
          const fallbackRes = await axios.post('/api/v1/payments/create-checkout', {
            plan: planId,
          });
          if (fallbackRes.data?.url) {
            window.location.href = fallbackRes.data.url;
            return;
          }
        }
        throw err;
      }

      const orderData = orderRes.data;

      // 2. If it's a Razorpay order
      if (orderData?.orderId && orderData?.keyId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error('Could not load payment gateway. Please check your internet connection.');
          return;
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'VoiceInterview AI',
          description: `${orderData.name} — ${orderData.credits} Interview Credits`,
          order_id: orderData.orderId,
          prefill: {
            name: user.name || '',
            email: user.email || '',
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async (response: any) => {
            const verifyToast = toast.loading('Verifying payment...');
            try {
              const verifyRes = await axios.post('/api/v1/payments/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              });

              toast.dismiss(verifyToast);

              if (verifyRes.data?.success) {
                toast.success(`🎉 ${orderData.name} activated! Added ${orderData.credits} interview credits.`);
                await refreshUser();
                navigate('/dashboard');
              } else {
                toast.error('Payment verification failed.');
              }
            } catch (vErr: any) {
              toast.dismiss(verifyToast);
              toast.error(vErr.response?.data?.error || 'Payment verification failed');
            }
          },
          modal: {
            ondismiss: () => {
              toast('Payment cancelled', { icon: 'ℹ️' });
            },
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.on('payment.failed', (resp: any) => {
          toast.error(`Payment failed: ${resp.error?.description || 'Transaction unsuccessful'}`);
        });
        razorpayInstance.open();
      } else if (orderData?.url) {
        // Fallback direct URL redirect
        window.location.href = orderData.url;
      } else {
        toast.error('Unable to initialize payment session.');
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
      priceDisplay: '₹0',
      priceUsd: '$0',
      description: 'Get started with AI mock interviews',
      features: [
        '2 free interviews per month',
        'Basic AI feedback & score breakdown',
        'Standard interview roles',
        'Voice conversation with AI',
        'Community support',
      ],
      icon: <Star className="w-6 h-6" />,
      color: 'gray',
      cta: user ? 'Current Plan' : 'Sign Up Free',
    },
    {
      name: 'Pro',
      priceDisplay: '₹1,999',
      priceUsd: '$29',
      description: 'For serious job seekers and prep',
      features: [
        '20 interviews per month',
        'Detailed AI technical feedback & tips',
        'All 15+ tech roles & company simulations',
        'Webcam AI proctoring analytics',
        'Custom difficulty (Easy, Medium, Hard)',
        'Priority interview processing',
        'Email support',
      ],
      icon: <Zap className="w-6 h-6" />,
      color: 'indigo',
      cta: 'Upgrade to Pro',
      popular: true,
    },
    {
      name: 'Enterprise',
      priceDisplay: '₹4,999',
      priceUsd: '$99',
      description: 'For power users and teams',
      features: [
        '100 interviews per month',
        'Premium Deep AI analysis & metric scoring',
        'All roles, companies & custom prompts',
        'Comprehensive proctoring integrity report',
        'Unlimited retakes & scheduling',
        'Priority 24/7 dedicated support',
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Subscription Plans</h1>
              <p className="mt-2 text-gray-600">
                Choose the right plan to accelerate your technical interview preparation
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full self-start">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secure Razorpay Checkout • Instant Activation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
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
                  <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">
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

              <p className="text-gray-600 mb-6 text-sm">{plan.description}</p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-gray-900">
                  {plan.priceDisplay}
                </span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>

              <ul className="space-y-3.5 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.name.toLowerCase())}
                className={`w-full py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                disabled={
                  user?.subscriptionTier === plan.name.toLowerCase() ||
                  loadingPlan === plan.name.toLowerCase()
                }
              >
                {loadingPlan === plan.name.toLowerCase() ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Initializing Payment...
                  </>
                ) : user?.subscriptionTier === plan.name.toLowerCase() ? (
                  'Active Plan'
                ) : (
                  plan.cta
                )}
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
                q: 'How does payment work with Razorpay?',
                a: 'You can pay instantly using UPI, credit/debit cards, Net Banking, or wallets. Once completed, your credits are added immediately without any delay.',
              },
              {
                q: 'What happens when I run out of interview credits?',
                a: 'You can upgrade your subscription tier at any time to get additional interview credits. Unused credits rollover with active subscriptions.',
              },
              {
                q: 'Do interviews count toward my scores and progress report?',
                a: 'Yes! All completed interviews generate an in-depth AI breakdown evaluating communication, technical accuracy, code logic, and proctoring feedback.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-xs">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}