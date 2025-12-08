'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';

function FloatingCard({
  children,
  className,
  delay = 0,
  x = 0,
  y = 0,
  rotate = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
  rotate?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: [0, -10, 0],
        rotate: [rotate - 2, rotate + 2, rotate - 2],
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay },
        rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay },
      }}
      className={`absolute ${className}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const yMiddle = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const yForeground = useTransform(scrollYProgress, [0, 1], ['0%', '10%']);

  return (
    <section
      ref={ref}
      className='relative min-h-[110vh] flex items-center justify-center overflow-hidden bg-slate-50'
    >
      {/* Layer 0: Background Gradients */}
      <motion.div style={{ y: yBackground }} className='absolute inset-0 z-0'>
        <div className='absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.1),transparent_50%)]' />
        <div className='absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-100/40 rounded-full blur-3xl' />
        <div className='absolute top-1/3 left-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl' />
      </motion.div>

      {/* Layer 1: The "Forest" of Schedules (Back) */}
      <motion.div style={{ y: yMiddle }} className='absolute inset-0 z-10 pointer-events-none'>
        {/* Abstract Roster Cards scattered like trees */}
        <FloatingCard x={10} y={20} rotate={-5} delay={0.2} className='hidden lg:block'>
          <div className='bg-white p-4 rounded-xl shadow-lg border border-slate-100 w-48 opacity-60 blur-[1px]'>
            <div className='h-2 w-12 bg-blue-200 rounded mb-2' />
            <div className='space-y-2'>
              <div className='h-2 w-full bg-slate-100 rounded' />
              <div className='h-2 w-3/4 bg-slate-100 rounded' />
            </div>
          </div>
        </FloatingCard>

        <FloatingCard x={85} y={15} rotate={5} delay={0.4} className='hidden lg:block'>
          <div className='bg-white p-4 rounded-xl shadow-lg border border-slate-100 w-48 opacity-60 blur-[1px]'>
            <div className='flex gap-2 mb-2'>
              <div className='h-6 w-6 rounded-full bg-purple-100' />
              <div className='h-2 w-16 bg-slate-200 rounded self-center' />
            </div>
            <div className='h-2 w-full bg-slate-100 rounded' />
          </div>
        </FloatingCard>

        <FloatingCard x={5} y={60} rotate={3} delay={0.6} className='hidden lg:block'>
          <div className='bg-white p-3 rounded-lg shadow-md border border-slate-100 w-40 opacity-40 blur-[2px]'>
            <div className='grid grid-cols-4 gap-1'>
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-sm ${i % 3 === 0 ? 'bg-green-200' : 'bg-slate-100'}`}
                />
              ))}
            </div>
          </div>
        </FloatingCard>

        <FloatingCard x={90} y={70} rotate={-3} delay={0.8} className='hidden lg:block'>
          <div className='bg-white p-4 rounded-xl shadow-lg border border-slate-100 w-52 opacity-50 blur-[1px]'>
            <div className='flex justify-between items-center mb-2'>
              <div className='h-2 w-10 bg-slate-200 rounded' />
              <div className='h-4 w-4 bg-green-100 rounded-full' />
            </div>
            <div className='h-20 bg-slate-50 rounded border border-dashed border-slate-200' />
          </div>
        </FloatingCard>
      </motion.div>

      {/* Layer 2: Main Content (Focus) */}
      <motion.div style={{ y: yForeground }} className='container mx-auto px-4 relative z-20'>
        <div className='max-w-5xl mx-auto text-center'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm font-medium mb-8'
          >
            <span className='flex h-2 w-2 rounded-full bg-green-500 animate-pulse' />
            AI-Powered Roster Engine
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className='text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8'
          >
            Bring order to the <br />
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-gradient-x bg-[length:200%_auto]'>
              scheduling chaos
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className='text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed'
          >
            Orto AI transforms complex healthcare staffing requirements into perfectly balanced
            rosters. Navigate constraints with ease.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className='flex flex-col sm:flex-row items-center justify-center gap-4'
          >
            <Button
              size='lg'
              className='h-14 px-8 text-lg rounded-full bg-slate-900 hover:bg-slate-800 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1'
              asChild
            >
              <Link href={ROUTES.AUTH.LOGIN}>
                Start Scheduling
                <ArrowRight className='ml-2 h-5 w-5' />
              </Link>
            </Button>
            <Button
              size='lg'
              variant='outline'
              className='h-14 px-8 text-lg rounded-full border-slate-300 hover:bg-slate-50'
              asChild
            >
              <Link href={ROUTES.SECTIONS.FEATURES}>View Demo</Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Layer 3: Foreground Elements (Closest) */}
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], ['0%', '-20%']) }}
        className='absolute inset-0 z-30 pointer-events-none overflow-hidden'
      >
        {/* Clear, sharp elements in the foreground */}
        <FloatingCard x={15} y={65} rotate={-10} delay={0.5} className='hidden xl:block'>
          <div className='bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 w-64 transform hover:scale-105 transition-transform duration-300'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600'>
                <Users size={20} />
              </div>
              <div>
                <div className='text-sm font-bold text-slate-800'>Staff Coverage</div>
                <div className='text-xs text-green-600 font-medium'>100% Met</div>
              </div>
            </div>
            <div className='h-2 bg-slate-100 rounded-full overflow-hidden'>
              <div className='h-full w-full bg-green-500' />
            </div>
          </div>
        </FloatingCard>

        <FloatingCard x={75} y={30} rotate={10} delay={0.7} className='hidden xl:block'>
          <div className='bg-white p-5 rounded-2xl shadow-2xl border border-slate-100 w-64 transform hover:scale-105 transition-transform duration-300'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600'>
                <Sparkles size={20} />
              </div>
              <div>
                <div className='text-sm font-bold text-slate-800'>AI Optimization</div>
                <div className='text-xs text-purple-600 font-medium'>Processing...</div>
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex justify-between text-xs text-slate-500'>
                <span>Constraints</span>
                <span>Checking</span>
              </div>
              <div className='h-1.5 bg-slate-100 rounded-full overflow-hidden'>
                <div className='h-full w-3/4 bg-purple-500 animate-pulse' />
              </div>
            </div>
          </div>
        </FloatingCard>
      </motion.div>

      {/* Bottom fade to merge with next section */}
      <div className='absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent z-20' />
    </section>
  );
}
