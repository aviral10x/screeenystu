import { useMemo } from 'react';
import { type TitleCardConfig, type IntroStyle } from '@/stores/intro-outro-store';

interface TitleCardProps {
  config: TitleCardConfig;
  /** Progress through the animation, 0.0 to 1.0 */
  progress: number;
}

/**
 * Animated title card for intro/outro sequences.
 */
export function TitleCard({ config, progress }: TitleCardProps) {
  if (!config.enabled) return null;

  const animStyle = useMemo(() => {
    return getAnimationStyle(config.style as IntroStyle, progress);
  }, [config.style, progress]);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
      style={{
        backgroundColor: config.backgroundColor,
        opacity: animStyle.containerOpacity,
      }}
    >
      {/* Title */}
      <h1
        className="font-bold text-center max-w-2xl px-8 leading-tight"
        style={{
          color: config.textColor,
          fontSize: `${config.fontSize}px`,
          opacity: animStyle.textOpacity,
          transform: animStyle.textTransform,
          transition: 'none',
        }}
      >
        {config.style === 'typewriter'
          ? config.title.slice(0, Math.floor(config.title.length * Math.min(1, progress * 2)))
          : config.title}
        {config.style === 'typewriter' && progress < 0.5 && (
          <span className="inline-block w-0.5 h-8 bg-current ml-1 animate-pulse" />
        )}
      </h1>

      {/* Subtitle */}
      {config.subtitle && (
        <p
          className="mt-4 text-center max-w-xl px-8"
          style={{
            color: config.textColor,
            fontSize: `${Math.max(14, config.fontSize * 0.45)}px`,
            opacity: animStyle.subtitleOpacity,
            transform: animStyle.subtitleTransform,
            transition: 'none',
          }}
        >
          {config.subtitle}
        </p>
      )}
    </div>
  );
}

function getAnimationStyle(style: IntroStyle, progress: number) {
  const eased = progress * progress * (3 - 2 * progress); // smoothstep

  switch (style) {
    case 'fade':
      return {
        containerOpacity: progress < 0.15 ? eased / 0.15 : progress > 0.85 ? (1 - eased) / 0.15 : 1,
        textOpacity: progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1,
        textTransform: 'none',
        subtitleOpacity: progress < 0.3 ? (progress - 0.1) / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1,
        subtitleTransform: 'none',
      };

    case 'slide-up':
      return {
        containerOpacity: progress < 0.1 ? progress / 0.1 : progress > 0.9 ? (1 - progress) / 0.1 : 1,
        textOpacity: 1,
        textTransform: `translateY(${(1 - Math.min(1, progress * 3)) * 40}px)`,
        subtitleOpacity: Math.max(0, (progress - 0.2) * 2),
        subtitleTransform: `translateY(${(1 - Math.min(1, (progress - 0.1) * 3)) * 30}px)`,
      };

    case 'zoom-in':
      const zoomScale = 0.5 + eased * 0.5;
      return {
        containerOpacity: progress < 0.1 ? progress / 0.1 : progress > 0.85 ? (1 - progress) / 0.15 : 1,
        textOpacity: 1,
        textTransform: `scale(${zoomScale})`,
        subtitleOpacity: Math.max(0, (progress - 0.3) * 2),
        subtitleTransform: `scale(${0.8 + eased * 0.2})`,
      };

    case 'typewriter':
      return {
        containerOpacity: progress < 0.05 ? progress / 0.05 : progress > 0.9 ? (1 - progress) / 0.1 : 1,
        textOpacity: 1,
        textTransform: 'none',
        subtitleOpacity: progress > 0.5 ? (progress - 0.5) * 2 : 0,
        subtitleTransform: 'none',
      };

    default:
      return {
        containerOpacity: 1,
        textOpacity: 1,
        textTransform: 'none',
        subtitleOpacity: 1,
        subtitleTransform: 'none',
      };
  }
}
