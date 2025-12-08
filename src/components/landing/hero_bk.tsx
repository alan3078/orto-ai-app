'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';

export function Hero() {
  return (
    <section className='relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50'>
      {/* Background decoration */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50' />
        <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50' />
      </div>

      <div className='container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative z-10'>
        <div className='max-w-4xl mx-auto text-center'>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-8'
          >
            <Sparkles className='h-4 w-4' />
            <span>AI-Powered Roster Generation</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6'
          >
            Smart Scheduling for{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'>
              Healthcare Teams
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto'
          >
            Orto AI automatically generates optimized staff rosters that respect constraints,
            preferences, and compliance requirements. Save hours of manual scheduling work.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className='flex flex-col sm:flex-row items-center justify-center gap-4'
          >
            <Button size='lg' asChild className='text-base px-8'>
              <Link href={ROUTES.AUTH.LOGIN}>
                Get Started
                <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>
            <Button size='lg' variant='outline' asChild className='text-base px-8'>
              <Link href={ROUTES.SECTIONS.FEATURES}>Learn More</Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className='mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto'
          >
            <div className='flex flex-col items-center'>
              <div className='flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3'>
                <Clock className='h-6 w-6' />
              </div>
              <div className='text-3xl font-bold text-gray-900'>90%</div>
              <div className='text-sm text-gray-600'>Time Saved</div>
            </div>
            <div className='flex flex-col items-center'>
              <div className='flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-3'>
                <Calendar className='h-6 w-6' />
              </div>
              <div className='text-3xl font-bold text-gray-900'>500+</div>
              <div className='text-sm text-gray-600'>Rosters Generated</div>
            </div>
            <div className='flex flex-col items-center'>
              <div className='flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3'>
                <Sparkles className='h-6 w-6' />
              </div>
              <div className='text-3xl font-bold text-gray-900'>99%</div>
              <div className='text-sm text-gray-600'>Constraint Compliance</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
