"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: '#060810' }}>

      {/* Orb 1 — azul principal */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '20%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)',
        animation: 'orb1 18s ease-in-out infinite',
        filter: 'blur(40px)',
      }} />

      {/* Orb 2 — índigo */}
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,60,235,0.25) 0%, transparent 70%)',
        animation: 'orb2 22s ease-in-out infinite',
        filter: 'blur(50px)',
      }} />

      {/* Orb 3 — ciano tech */}
      <div style={{
        position: 'absolute',
        bottom: '0%',
        left: '-5%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        animation: 'orb3 26s ease-in-out infinite',
        filter: 'blur(60px)',
      }} />

      {/* Noise texture sutil */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }} />

      <style>{`
        @keyframes orb1 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(60px, 40px) scale(1.08); }
          66%  { transform: translate(-30px, 60px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orb2 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(-80px, 30px) scale(1.05); }
          66%  { transform: translate(40px, -50px) scale(1.1); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes orb3 {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(50px, -40px) scale(1.06); }
          66%  { transform: translate(-20px, 30px) scale(0.97); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
    </div>
  );
}
