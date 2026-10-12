interface Props { onClose: () => void }

const ROWS = [
  { role: 'Original Game',    name: "It's a Funny Old Game",          note: '1996' },
  { role: 'Developed By',     name: 'Anguilla Software International Ltd.', note: '' },
  { role: 'Published By',     name: '21st Century Entertainment Ltd.', note: '' },
  { role: 'Reimagined By',    name: 'Ronen Zuberblat',                note: '' },
  { role: 'Development',      name: 'Claude Code',                    note: 'Anthropic' },
  { role: 'Design',           name: 'Claude Design',                  note: 'Anthropic' },
  { role: 'Art',              name: 'Gemini',                         note: 'Google' },
];

export function CreditsModal({ onClose }: Props) {

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(4,6,12,0.78)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, borderRadius: 20, overflow: 'hidden',
          background: '#0f1628', border: '1px solid #2a3656',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
          fontFamily: "Barlow, 'Segoe UI', sans-serif",
          color: '#e8edf7',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 32px 20px',
          background: 'linear-gradient(90deg, rgba(200,245,61,0.10), transparent 70%)',
          borderBottom: '1px solid #1c2640',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c8f53d', marginBottom: 6 }}>Credits</div>
          <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: 2, lineHeight: 1 }}>
            It's a Funny Old Game
          </div>
        </div>

        {/* Rows */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ROWS.map(({ role, name, note }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ width: 130, flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4b5675' }}>{role}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#e8edf7' }}>{name}</span>
                {note && <span style={{ fontSize: 12, color: '#5a6585', marginLeft: 8 }}>{note}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 32px 28px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              height: 44, minWidth: 140, padding: '0 22px',
              borderRadius: 12, border: 0,
              background: '#c8f53d', color: '#070b16',
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 20, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
