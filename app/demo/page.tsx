"use client"

import { MvpNavbar } from '@/components/mvp-navbar';
import { MvpFooter } from '@/components/mvp-footer';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <MvpNavbar />
      <div className="min-h-screen py-20 bg-gradient-to-br from-background to-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Live <span className="text-gradient">Demo</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience our AI-powered plant disease detection in action. Upload an image and see instant results.
          </p>
          
          <div className="bg-card rounded-2xl p-12 shadow-strong mb-8">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-16 text-center">
              <h3 className="text-2xl font-semibold text-muted-foreground mb-4">Demo Coming Soon</h3>
              <p className="text-muted-foreground mb-6">
                Our interactive demo is currently being prepared. Get started with the full application to try our AI disease detection.
              </p>
              <Link href="/auth">
                <Button className="btn-hero text-lg px-8 py-4">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <MvpFooter />
    </div>
  );
}
