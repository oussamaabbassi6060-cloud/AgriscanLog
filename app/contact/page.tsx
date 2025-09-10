"use client"

import { MvpNavbar } from '@/components/mvp-navbar';
import { MvpFooter } from '@/components/mvp-footer';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <MvpNavbar />
      <div className="min-h-screen py-20 bg-gradient-to-br from-background to-muted">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Get in <span className="text-gradient">Touch</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ready to revolutionize your farming with AI? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card-feature text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl mb-4 mx-auto">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email</h3>
              <p className="text-muted-foreground">info@agriscan.ai</p>
            </div>

            <div className="card-feature text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-secondary to-tertiary rounded-2xl mb-4 mx-auto">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Phone</h3>
              <p className="text-muted-foreground">+1 (555) 123-4567</p>
            </div>

            <div className="card-feature text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-tertiary to-accent rounded-2xl mb-4 mx-auto">
                <MapPin className="h-8 w-8 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Office</h3>
              <p className="text-muted-foreground">Agricultural Innovation Hub<br />Silicon Valley, CA</p>
            </div>
          </div>
        </div>
      </div>
      <MvpFooter />
    </div>
  );
}
