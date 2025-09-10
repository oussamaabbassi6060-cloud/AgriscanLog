"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function MvpNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-sm border-b z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              AgriScan
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link href="/" className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link href="/features" className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                Features
              </Link>
              <Link href="/demo" className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                Demo
              </Link>
              <Link href="/contact" className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium">
                Contact
              </Link>
              <Link href="/dashboard" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                Dashboard
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:text-primary focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background border-b">
            <Link href="/" className="text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
              Home
            </Link>
            <Link href="/features" className="text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
              Features
            </Link>
            <Link href="/demo" className="text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
              Demo
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary block px-3 py-2 rounded-md text-base font-medium">
              Contact
            </Link>
            <Link href="/dashboard" className="bg-primary text-primary-foreground block px-3 py-2 rounded-md text-base font-medium">
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
