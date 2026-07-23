import type { HomeSection } from '@/lib/services/settings.service'

interface Props { config: HomeSection['config'] }

export function AnnouncementBar({ config }: Props) {
  const messages = config?.messages?.filter(Boolean) ?? ['Welcome to our store!']
  const speed = config?.speed ?? 40
  const bg = config?.bgColor ?? '#1e40af'
  const color = config?.textColor ?? '#ffffff'

  // Duplicate messages for seamless loop
  const items = [...messages, ...messages]
  const duration = items.length * (100 / speed)

  return (
    <div
      className="relative overflow-hidden py-2.5 text-sm font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: `ticker ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {items.map((msg, i) => (
          <span key={i} className="inline-flex items-center gap-6 px-8">
            <span className="inline-block h-1.5 w-1.5 rounded-full opacity-60" style={{ backgroundColor: color }} />
            {msg}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
