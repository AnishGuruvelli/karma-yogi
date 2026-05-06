import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { YogiIcon } from '@/components/YogiIcon';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 500);
    }, 1600);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(160deg, oklch(0.55 0.25 290), oklch(0.50 0.22 270), oklch(0.45 0.20 255))',
          }}
        >
          {/* Soft radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, oklch(0.65 0.20 280 / 40%) 0%, transparent 70%)',
            }}
          />

          {/* Icon card */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex flex-col items-center"
          >
            <div
              className="flex h-28 w-28 items-center justify-center rounded-3xl mb-6"
              style={{
                background: 'oklch(0.60 0.20 280 / 50%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid oklch(1 0 0 / 15%)',
                boxShadow: '0 8px 32px oklch(0.40 0.20 270 / 30%), inset 0 1px 0 oklch(1 0 0 / 10%)',
              }}
            >
              <YogiIcon size={56} className="text-white" />
            </div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl font-bold tracking-tight"
              style={{ color: 'oklch(1 0 0)' }}
            >
              Karma Yogi
            </motion.h1>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-3 h-0.5 w-16 rounded-full"
              style={{ background: 'oklch(1 0 0 / 40%)' }}
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-3 text-sm font-medium tracking-widest uppercase"
              style={{ color: 'oklch(1 0 0 / 70%)' }}
            >
              Show Up. Let It Compound.
            </motion.p>
          </motion.div>

          {/* Bottom dots indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="absolute bottom-12 flex gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full"
                style={{ background: 'oklch(1 0 0 / 40%)' }}
                animate={{
                  background: [
                    'oklch(1 0 0 / 40%)',
                    'oklch(1 0 0 / 90%)',
                    'oklch(1 0 0 / 40%)',
                  ],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
