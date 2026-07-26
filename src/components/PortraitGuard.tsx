import React, { useEffect, useState } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';

export const PortraitGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check window dimensions
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#121212] flex flex-col items-center justify-center p-6 text-center text-white select-none touch-none animate-fade-in safe-pt safe-pb safe-pl safe-pr">
      <div className="relative mb-6 flex items-center justify-center">
        <Smartphone size={72} className="text-gray-500 animate-pulse" />
        <RotateCw size={36} className="text-[#FF5A36] absolute -top-2 -right-2 animate-spin" style={{ animationDuration: '3s' }} />
      </div>

      <h1 className="text-xl font-bold mb-2 tracking-wide text-gray-100">
        画面を横向きにしてください
      </h1>

      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
        本アプリはスマートフォン・タブレットの<span className="text-[#FF5A36] font-bold">横画面（Landscape）</span>専用です。
        端末の自動回転をオンにして横向きでご利用ください。
      </p>

      <div className="mt-8 px-4 py-2 bg-[#222222] border border-[#3A3A3A] rounded-full text-[11px] text-gray-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-ping" />
        横向きに倒すと自動で編集画面が開きます
      </div>
    </div>
  );
};
