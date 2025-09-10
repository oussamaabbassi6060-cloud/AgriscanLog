"use client"

import { MvpNavbar } from '@/components/mvp-navbar';
import { MvpFooter } from '@/components/mvp-footer';
import { Shield, Zap, Users, Microscope } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: Microscope,
      title: 'AI-Powered Detection',
      description: 'Advanced machine learning algorithms trained on thousands of plant images for accurate disease identification.',
    },
    {
      icon: Zap,
      title: 'Real-Time Analysis',
      description: 'Get instant results in seconds. Simply upload an image and receive comprehensive disease analysis.',
    },
    {
      icon: Shield,
      title: '95% Accuracy Rate',
      description: 'Industry-leading accuracy in detecting over 40 different plant diseases across multiple crop types.',
    },
    {
      icon: Users,
      title: 'Farmer-Friendly',
      description: 'Intuitive interface designed for farmers of all technical levels with clear, actionable recommendations.',
    },
  ];

  return (
    <div className="min-h-screen">
      <MvpNavbar />
      <div className="min-h-screen py-20 bg-gradient-to-br from-background to-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Powerful <span className="text-gradient">Features</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover how our AI-powered platform revolutionizes plant disease detection and crop management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card-feature group">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl mb-4 group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <MvpFooter />
    </div>
  );
}
