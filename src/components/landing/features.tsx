'use client';

import { motion } from 'framer-motion';
import { Brain, Calendar, Shield, Zap, Users, BarChart3, Clock, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Optimization',
    description:
      'Our intelligent algorithm considers hundreds of constraints to generate the perfect roster every time.',
    color: 'blue',
  },
  {
    icon: Calendar,
    title: 'Flexible Scheduling',
    description:
      'Support for day shifts, night shifts, rotating patterns, and custom shift definitions.',
    color: 'purple',
  },
  {
    icon: Shield,
    title: 'Compliance Built-in',
    description: 'Automatically enforce labor laws, rest periods, and organizational policies.',
    color: 'green',
  },
  {
    icon: Zap,
    title: 'Instant Generation',
    description: 'Generate complete monthly rosters in seconds, not hours of manual work.',
    color: 'yellow',
  },
  {
    icon: Users,
    title: 'Staff Preferences',
    description: 'Respect individual preferences, availability, and work-life balance needs.',
    color: 'pink',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Track fairness metrics, coverage gaps, and scheduling efficiency over time.',
    color: 'indigo',
  },
];

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  purple: 'bg-purple-100 text-purple-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  pink: 'bg-pink-100 text-pink-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function Features() {
  return (
    <section id='features' className='py-24 bg-white'>
      <div className='container mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='text-center mb-16'
        >
          <h2 className='text-3xl sm:text-4xl font-bold text-gray-900 mb-4'>
            Everything You Need for Smart Scheduling
          </h2>
          <p className='text-lg text-gray-600 max-w-2xl mx-auto'>
            Orto AI combines powerful optimization with an intuitive interface to make roster
            management effortless.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true }}
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className='relative p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 bg-white group'
              >
                <div
                  className={`w-12 h-12 rounded-xl ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className='h-6 w-6' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>{feature.title}</h3>
                <p className='text-gray-600'>{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Additional Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className='mt-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 sm:p-12'
        >
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 items-center'>
            <div>
              <h3 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>
                Why Healthcare Teams Love Orto AI
              </h3>
              <p className='text-gray-600 mb-6'>
                Built specifically for the complexities of healthcare scheduling, Orto AI
                understands the unique challenges of managing nursing rosters.
              </p>
              <ul className='space-y-3'>
                {[
                  'Handles complex shift patterns automatically',
                  'Ensures fair distribution of weekend duties',
                  'Respects minimum rest periods between shifts',
                  'Supports part-time and casual staff',
                ].map((item) => (
                  <li key={item} className='flex items-center gap-3'>
                    <CheckCircle className='h-5 w-5 text-green-500 flex-shrink-0' />
                    <span className='text-gray-700'>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className='flex items-center justify-center'>
              <div className='relative'>
                <div className='w-64 h-64 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl'>
                  <Clock className='h-24 w-24 text-white' />
                </div>
                <div className='absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-4'>
                  <div className='text-sm font-medium text-gray-600'>Average time saved</div>
                  <div className='text-2xl font-bold text-gray-900'>8 hours/week</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
