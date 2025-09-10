"use client"

import Link from 'next/link'
import { Github, Twitter, Linkedin, Mail } from 'lucide-react'

export function MvpFooter() {
  return (
    <footer className="bg-background border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold text-primary mb-4 block">
              AgriScan
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              Revolutionizing agriculture with AI-powered disease detection. 
              Helping farmers protect their crops and increase yields.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/" className="text-muted-foreground hover:text-primary block">
                Home
              </Link>
              <Link href="/features" className="text-muted-foreground hover:text-primary block">
                Features
              </Link>
              <Link href="/demo" className="text-muted-foreground hover:text-primary block">
                Demo
              </Link>
              <Link href="/contact" className="text-muted-foreground hover:text-primary block">
                Contact
              </Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Support</h3>
            <div className="space-y-2">
              <Link href="#" className="text-muted-foreground hover:text-primary block">
                Documentation
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary block">
                Help Center
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary block">
                Privacy Policy
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary block">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2024 AgriScan. All rights reserved.
            </p>
            <p className="text-muted-foreground text-sm mt-4 md:mt-0">
              Built with ❤️ for farmers worldwide
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
