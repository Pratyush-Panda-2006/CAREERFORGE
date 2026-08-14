import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col justify-between overflow-x-hidden">
      {/* Background Video (z-index 0) */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source
            src="https://zxdefgavgwfxastwmmjm.supabase.co/storage/v1/object/public/assets/cinematic.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Bottom Masked Blur Overlay (z-index 1, no dark gradient) */}
      <div className="fixed inset-0 w-full h-full bottom-blur-mask z-1 pointer-events-none" />

      {/* Persistent Floating Navbar (z-index 50) */}
      <Navbar />

      {/* Dynamic Page Views */}
      <main className="relative z-10 flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
