'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/routes'

const plans = [
  {
    name: 'Free',
    description: 'Get started with basic scheduling',
    price: '$0',
    period: '/month',
    features: [
      'Up to 10 staff members',
      'Basic roster generation',
      'Community support',
      'Standard constraints',
      '7-day history',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For professional healthcare teams',
    price: '$99',
    period: '/month',
    features: [
      'Unlimited staff members',
      'Advanced AI optimization',
      'Priority support',
      'Custom shift patterns',
      'Unlimited history',
      'Analytics dashboard',
      'API access',
      'Multi-facility support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your organization. All plans include a 14-day free trial.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              className={cn(
                'relative rounded-2xl p-8 transition-all duration-300',
                plan.popular
                  ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl scale-105'
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className={cn(
                  'text-xl font-bold mb-2',
                  plan.popular ? 'text-white' : 'text-gray-900'
                )}>
                  {plan.name}
                </h3>
                <p className={cn(
                  'text-sm',
                  plan.popular ? 'text-gray-300' : 'text-gray-600'
                )}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className={cn(
                  'text-4xl font-bold',
                  plan.popular ? 'text-white' : 'text-gray-900'
                )}>
                  {plan.price}
                </span>
                <span className={cn(
                  'text-sm',
                  plan.popular ? 'text-gray-300' : 'text-gray-600'
                )}>
                  {plan.period}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={cn(
                      'h-5 w-5 flex-shrink-0 mt-0.5',
                      plan.popular ? 'text-green-400' : 'text-green-500'
                    )} />
                    <span className={cn(
                      'text-sm',
                      plan.popular ? 'text-gray-200' : 'text-gray-600'
                    )}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                asChild
                className={cn(
                  'w-full',
                  plan.popular
                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                    : ''
                )}
                variant={plan.popular ? 'secondary' : 'default'}
              >
                <Link href={ROUTES.AUTH.LOGIN}>{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-600">
            Have questions?{' '}
            <Link href={ROUTES.SECTIONS.CONTACT} className="text-blue-600 hover:text-blue-700 font-medium">
              Contact our sales team
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
