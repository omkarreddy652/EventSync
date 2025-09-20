import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

const PublicLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
               
                <span className="ml-2 text-xl font-semibold text-primary-800">EventSync</span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <Link to="/about" className="text-neutral-600 hover:text-primary-800 transition-colors">
                About
              </Link>
              <Link to="/contact" className="text-neutral-600 hover:text-primary-800 transition-colors">
                Contact
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button onClick={() => navigate('/register')}>
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-primary-800 text-white border-t border-neutral-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              
              <span className="ml-2 text-lg font-medium text-white">EventSync</span>
            </div>

            <div className="flex space-x-6">
              <a href="#" className="text-neutral-300 hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="text-neutral-300 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="text-neutral-300 hover:text-white transition-colors">
                Support
              </a>
            </div>

            <div className="mt-4 md:mt-0">
              <p className="text-neutral-400 text-sm">
                © 2025 EventSync. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;