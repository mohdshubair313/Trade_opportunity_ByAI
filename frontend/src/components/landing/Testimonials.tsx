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
    <section className="py-24 px-4" ref={ref}>
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold">
            Trusted by <GradientText>Industry Leaders</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            See what our customers say about their experience with TradeInsight AI
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <GlowCard className="h-full">
                {/* Quote icon */}
                <Quote className="h-8 w-8 text-primary/20 mb-4" />

                {/* Content */}
                <p className="text-muted-foreground mb-6">
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
