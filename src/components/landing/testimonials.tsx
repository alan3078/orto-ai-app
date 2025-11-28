'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Nurse Unit Manager',
    organization: 'St. Mary\'s Hospital',
    image: null,
    content: 'Orto AI has transformed how we manage our nursing rosters. What used to take me an entire day now takes minutes. The system respects all our complex constraints automatically.',
    rating: 5,
  },
  {
    name: 'Dr. James Chen',
    role: 'Director of Nursing',
    organization: 'Metro Health Network',
    image: null,
    content: 'The fairness in shift distribution has improved dramatically. Staff satisfaction is up, and we\'ve seen a significant reduction in last-minute scheduling conflicts.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Workforce Coordinator',
    organization: 'Sunrise Care Facility',
    image: null,
    content: 'Finally, a scheduling tool that understands healthcare. The AI considers everything from skill mix to personal preferences. Our team loves it.',
    rating: 5,
  },
  {
    name: 'Michael Thompson',
    role: 'Clinical Operations Manager',
    organization: 'Regional Medical Center',
    image: null,
    content: 'The compliance features alone are worth it. We no longer worry about accidentally violating rest period requirements or labor regulations.',
    rating: 5,
  },
  {
    name: 'Lisa Park',
    role: 'Head Nurse',
    organization: 'Community Health Clinic',
    image: null,
    content: 'I was skeptical about AI scheduling at first, but Orto AI exceeded all expectations. It even handles our rotating night shift patterns perfectly.',
    rating: 5,
  },
  {
    name: 'David Williams',
    role: 'HR Manager',
    organization: 'Valley General Hospital',
    image: null,
    content: 'The analytics dashboard gives us insights we never had before. We can now make data-driven decisions about staffing levels and patterns.',
    rating: 5,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5 },
  },
}

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-gray-50">
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
            Trusted by Healthcare Professionals
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See what nursing teams across the country are saying about Orto AI.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 h-8 w-8 text-gray-100" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-600 mb-6 relative z-10">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {testimonial.role} • {testimonial.organization}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
