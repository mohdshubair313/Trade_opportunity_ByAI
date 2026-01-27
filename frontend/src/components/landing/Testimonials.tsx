"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";
import { GradientText } from "@/components/animations/AnimatedText";
import { GlowCard } from "@/components/animations/AnimatedCard";

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Import/Export Manager",
    company: "GlobalTrade India",
    image: "/avatars/avatar-1.png",
    content:
      "TradeInsight AI has transformed how we identify market opportunities. The AI analysis is incredibly accurate and saves us hours of research.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Business Analyst",
    company: "TechVentures Pvt Ltd",
    image: "/avatars/avatar-2.png",
    content:
      "The sector-specific insights are invaluable. We've discovered several export opportunities in the pharmaceutical sector that we would have missed.",
    rating: 5,
  },
  {
    name: "Amit Patel",
    role: "Director of Strategy",
    company: "InnovateCorp",
    image: "/avatars/avatar-3.png",
    content:
      "Fast, accurate, and comprehensive. The reports are professional-grade and perfect for board presentations and strategic planning.",
    rating: 5,
  },
  {
    name: "Sneha Reddy",
    role: "Market Research Lead",
    company: "AgriTech Solutions",
    image: "/avatars/avatar-4.png",
    content:
      "As someone in the agriculture sector, finding relevant market intelligence was always challenging. TradeInsight AI makes it effortless.",
    rating: 5,
  },
];

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 px-4 relative overflow-hidden" ref={ref}>
      {/* Background effects */}
      <div className="absolute inset-0 dot-pattern opacity-5" />
      <motion.div
        className="absolute top-0 left-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      </motion.div>

      <div className="container mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.span
            className="text-primary text-sm font-semibold tracking-wider uppercase"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Testimonials
          </motion.span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            Trusted by <GradientText>Industry Leaders</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            See what our customers say about their experience with TradeInsight AI
          </p>
        </motion.div>

        {/* Testimonials Grid with Parallax Effects */}
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.15,
                type: "spring",
                stiffness: 80
              }}
              whileHover={{ 
                y: -8,
                scale: 1.02
              }}
            >
              <GlowCard 
                className="h-full relative overflow-hidden"
                glowColor={index % 2 === 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(59, 130, 246, 0.6)"}
              >
                {/* Floating quote icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
                >
                  <Quote className="h-8 w-8 text-primary/20 mb-4" />
                </motion.div>

                {/* Content with fade-in animation */}
                <motion.p 
                  className="text-muted-foreground mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                >
                  &quot;{testimonial.content}&quot;
                </motion.p>

                {/* Rating with stagger animation */}
                <motion.div 
                  className="flex gap-1 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
                >
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.15 + 0.4 + i * 0.1 }}
                    >
                      <Star
                        className="h-4 w-4 fill-yellow-500 text-yellow-500"
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Author with slide-up animation */}
                <motion.div 
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.5 }}
                >
                  <motion.div 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white font-semibold"
                    whileHover={{ 
                      scale: 1.1,
                      rotate: 5
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {testimonial.name.charAt(0)}
                  </motion.div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </motion.div>

                {/* Decorative elements */}
                <motion.div 
                  className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-primary/10 rounded-tr-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.6 }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-primary/10 rounded-bl-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.7 }}
                />
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
