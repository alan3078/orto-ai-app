'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Linkedin, Twitter, Github } from 'lucide-react';
import { ROUTES } from '@/lib/routes';

const footerLinks = {
  product: {
    title: 'Product',
    links: [
      { label: 'Features', href: ROUTES.SECTIONS.FEATURES },
      { label: 'Pricing', href: ROUTES.SECTIONS.PRICING },
      { label: 'Testimonials', href: ROUTES.SECTIONS.TESTIMONIALS },
      { label: 'Demo', href: ROUTES.AUTH.LOGIN },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Press', href: '#' },
    ],
  },
  resources: {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Help Center', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Cookie Policy', href: '#' },
      { label: 'GDPR', href: '#' },
    ],
  },
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' },
];

export function Footer() {
  return (
    <footer id='contact' className='bg-gray-900 text-gray-300'>
      {/* Main footer content */}
      <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <div className='grid grid-cols-1 lg:grid-cols-6 gap-12'>
          {/* Brand and contact */}
          <div className='lg:col-span-2'>
            <Link href='/' className='flex items-center gap-2 mb-6'>
              <Image src='/logo.png' alt='Orto AI' width={36} height={36} className='h-9 w-9' />
              <span className='text-xl font-bold text-white'>Orto AI</span>
            </Link>
            <p className='text-gray-400 mb-6 max-w-sm'>
              AI-powered roster generation for healthcare teams. Save time, ensure compliance, and
              keep your staff happy.
            </p>
            <div className='space-y-3'>
              <a
                href='mailto:hello@orto.ai'
                className='flex items-center gap-3 text-gray-400 hover:text-white transition-colors'
              >
                <Mail className='h-4 w-4' />
                <span>hello@orto.ai</span>
              </a>
              <a
                href='tel:+1234567890'
                className='flex items-center gap-3 text-gray-400 hover:text-white transition-colors'
              >
                <Phone className='h-4 w-4' />
                <span>+1 (234) 567-890</span>
              </a>
              <div className='flex items-center gap-3 text-gray-400'>
                <MapPin className='h-4 w-4' />
                <span>Sydney, Australia</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className='text-white font-semibold mb-4'>{section.title}</h4>
              <ul className='space-y-3'>
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className='text-gray-400 hover:text-white transition-colors text-sm'
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className='border-t border-gray-800'>
        <div className='container mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
            <p className='text-gray-500 text-sm'>
              © {new Date().getFullYear()} Orto AI. All rights reserved.
            </p>
            <div className='flex items-center gap-4'>
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className='w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-all'
                  >
                    <Icon className='h-4 w-4' />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
