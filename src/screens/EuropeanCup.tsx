import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { img } from '../utils/images';
import { getTeamById } from '../data/teams';
import { Layout } from '../components/Layout';

const FIREWORK_COLORS = ['#f5c76b', '#f5c76b', '#c8f53d', '#ffffff', '#ffef96', '#ffd93d', '#ff9d97'];

interface Particle { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number; }

function burst(x: number, y: number): Particle[] {
  return Array.from({ length: 45 + Math.floor(Math.random() * 20) }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5;
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)], size: 2 + Math.random() * 3 };
  });
}

function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let particles: Particle[] = [];
    let animId: number;
    let fired = 0;
    const total = 10;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < total; i++) {
      timers.push(setTimeout(() => {
        const x = canvas.width * (0.15 + Math.random() * 0.7);
        const y = canvas.height * (0.1 + Math.random() * 0.45);
        particles.push(...burst(x, y));
        fired++;
      }, i * 380 + Math.random() * 160));
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.vx *= 0.98; p.alpha -= 0.013;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      if (fired < total || particles.length > 0) animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animId); timers.forEach(clearTimeout); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }} />;
}

const GOLD = '#f5c76b';
const GOLD_BG = 'rgba(245,199,107,0.1)';
const GOLD_BORDER = 'rgba(245,199,107,0.35)';

function Wappen({ teamId, size = 28 }: { teamId: number; size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={img(`wappen${String(teamId).padStart(2, '0')}.png`)}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated' }}
      />
    </div>
  );
}

function TeamRow({
  teamId, isMe, score, winner, eliminated,
}: { teamId: number; isMe?: boolean; score?: number; winner?: boolean; eliminated?: boolean }) {
  const team = getTeamById(teamId);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      height: 44, padding: '0 12px',
      background: isMe ? '#131c33' : 'transparent',
    }}>
      <Wappen teamId={teamId} size={28} />
      <span style={{
        display: 'flex', alignItems: 'center', gap: 6, flexGrow: 1,
        fontWeight: isMe ? 700 : 500, fontSize: 15,
        color: eliminated ? '#3a4768' : isMe ? '#c8f53d' : '#8d99b5',
        textDecoration: eliminated ? 'line-through' : 'none',
      }}>
        {team?.name ?? '?'}
        {isMe && (
          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#c8f53d', color: '#070b16', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>
            YOU
          </span>
        )}
      </span>
      {winner && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8f53d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
      {score !== undefined && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: isMe ? '#ffffff' : '#6b7797', minWidth: 16, textAlign: 'right' }}>
          {score}
        </span>
      )}
    </div>
  );
}

function SemiGroup({ label, teamIds, myId, myWon }: { label: string; teamIds: [number, number]; myId?: number; myWon?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#6b7797' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid #2a3656', background: '#0a0f1d' }}>
        <TeamRow
          teamId={teamIds[0]}
          isMe={teamIds[0] === myId}
          winner={myWon !== undefined && teamIds[0] === myId ? myWon : undefined}
          eliminated={myWon !== undefined && teamIds[0] === myId ? !myWon : undefined}
        />
        <div style={{ height: 1, background: '#1c2640' }} />
        <TeamRow
          teamId={teamIds[1]}
          isMe={teamIds[1] === myId}
          winner={myWon !== undefined && teamIds[1] === myId ? myWon : undefined}
          eliminated={myWon !== undefined && teamIds[1] === myId ? !myWon : undefined}
        />
      </div>
    </div>
  );
}

export function EuropeanCup() {
  const navigate = useNavigate();
  const { managedTeamId, managerName, portrait, europeanCup, startNewSeason, playEuropeanCupMatch } = useGameStore();

  if (!europeanCup) return null;

  const { round, semiOpponentId, finalOpponentId, otherSemiIds, semiResult, finalResult, lastMatchReport } = europeanCup;

  const myTeam = getTeamById(managedTeamId)!;
;

  const done = round === 'done';
  const wonCup = finalResult === 'win';
  const inFinal = round === 'final';
  const eliminatedInSemi = done && semiResult === 'loss';

  // Scores from last match
  const homeId = lastMatchReport?.fixture.homeTeamId;
  const myScore = lastMatchReport
    ? (homeId === managedTeamId ? lastMatchReport.fixture.homeGoals : lastMatchReport.fixture.awayGoals)
    : undefined;
  const oppScore = lastMatchReport
    ? (homeId === managedTeamId ? lastMatchReport.fixture.awayGoals : lastMatchReport.fixture.homeGoals)
    : undefined;
  const lastOppId = lastMatchReport
    ? (homeId === managedTeamId ? lastMatchReport.fixture.awayTeamId : lastMatchReport.fixture.homeTeamId)
    : null;

  const lastWasFinal = lastOppId === finalOpponentId;
  const matchLabel = lastWasFinal ? 'Final' : 'Semi-Final';

  // Scorers
  const myGoalEvents = lastMatchReport?.events.filter(e => e.type === 'goal' && e.teamId === managedTeamId) ?? [];
  const oppGoalEvents = lastMatchReport?.events.filter(e => e.type === 'goal' && e.teamId !== managedTeamId) ?? [];
  const myScorers = myGoalEvents.map(e => `${e.playerName} ${e.minute}'`).join(' · ');
  const oppScorers = oppGoalEvents.map(e => `${e.playerName} ${e.minute}'`).join(' · ');

  // Final bracket scores
  const finalMyScore = (lastWasFinal && myScore !== undefined) ? myScore : undefined;
  const finalOppScore = (lastWasFinal && oppScore !== undefined) ? oppScore : undefined;

  // Upcoming match details
  const upcomingOpponentId = round === 'semi' ? semiOpponentId : finalOpponentId;
  const upcomingLabel = round === 'semi' ? 'Semi-Final' : 'Final';

  // Prize
  const semiPrize = semiResult === 'win' ? 150_000 : semiResult === 'loss' ? 50_000 : 0;
  const finalPrize = finalResult === 'win' ? 500_000 : finalResult === 'loss' ? 100_000 : 0;

  const moodSuffix = wonCup ? '_1' : (eliminatedInSemi || finalResult === 'loss') ? '_3' : '_2';

  const handlePlay = () => playEuropeanCupMatch();
  const handleNewSeason = () => {
    startNewSeason();
    const phase = useGameStore.getState().phase;
    navigate(phase === 'sacked' ? '/sacked' : '/season');
  };

  return (
    <>
    {wonCup && <Fireworks />}
    <Layout lockNav>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '400px minmax(0, 1fr)',
        gap: 20,
        padding: '20px 28px 20px',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}>

        {/* ── Left panel ── */}
        <section style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 20, padding: '24px 28px',
          borderRadius: 20, overflow: 'hidden',
          background: `radial-gradient(ellipse 80% 50% at 50% 38%, rgba(245,199,107,0.2), rgba(15,22,40,0) 70%), #0f1628`,
          border: `1px solid ${GOLD_BORDER}`,
        }}>
          {/* Trophy image */}
          <div style={{
            width: 240, height: 240, borderRadius: 20, overflow: 'hidden',
            border: `3px solid ${GOLD}`,
            boxShadow: `0 0 0 8px rgba(245,199,107,0.1), 0 24px 60px rgba(0,0,0,0.55)`,
            flexShrink: 0,
          }}>
            <img src={img('efucup.png')} alt="European Football Cup trophy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD }}>
              Continental Competition
            </div>
            <h1 style={{
              margin: 0,
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 48, lineHeight: 0.9,
              textTransform: 'uppercase', color: '#e8edf7',
            }}>
              European<br />Football Cup
            </h1>
          </div>

          {/* Manager pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 16px 8px 8px',
            borderRadius: 999,
            background: GOLD_BG,
            border: `1px solid ${GOLD_BORDER}`,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <img src={img(`${portrait}${moodSuffix}.png`)} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{myTeam.name} · {managerName}</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
                {wonCup ? 'Cup Winners' : eliminatedInSemi ? 'Eliminated' : finalResult === 'loss' ? 'Runners-up' : inFinal ? 'In the Final' : 'Semi-Finalist'}
              </div>
            </div>
          </div>
        </section>

        {/* ── Right panel ── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflow: 'hidden' }}>

          {/* Match card: result (done) or upcoming (not done) */}
          <div style={{ flexShrink: 0, padding: '16px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, marginBottom: 12 }}>
              {done ? `${matchLabel} · Full time` : `${upcomingLabel} · Up next`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 20 }}>
              {/* Home (my team) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 28, textTransform: 'uppercase', lineHeight: 1, color: done ? '#c8f53d' : '#e8edf7' }}>
                    {myTeam.name}
                  </div>
                  {done && myScorers && (
                    <div style={{ fontSize: 12, color: '#ff9d97' }}>{myScorers}</div>
                  )}
                </div>
                <Wappen teamId={managedTeamId} size={52} />
              </div>
              {/* Score */}
              <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 64, lineHeight: 0.9, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {done ? (
                  <>
                    {myScore}
                    <span style={{ color: '#3a4768', fontSize: 40 }}> – </span>
                    <span style={{ color: '#8d99b5' }}>{oppScore}</span>
                  </>
                ) : (
                  <span style={{ color: '#3a4768', fontSize: 36 }}>vs</span>
                )}
              </div>
              {/* Away (opponent) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Wappen teamId={done ? lastOppId! : upcomingOpponentId} size={52} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>
                    {getTeamById(done ? lastOppId! : upcomingOpponentId)?.name}
                  </div>
                  {done && oppScorers && (
                    <div style={{ fontSize: 12, color: GOLD }}>{oppScorers}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Road to the trophy */}
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, flexShrink: 0 }}>
              Road to the trophy
            </div>
            <div style={{
              flexGrow: 1,
              display: 'grid',
              gridTemplateColumns: `minmax(0,1fr) 40px minmax(0,1fr) ${wonCup ? '40px 180px' : ''}`,
              alignItems: 'center',
              gap: 0,
              minHeight: 0,
            }}>
              {/* Semis column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <SemiGroup
                  label="SEMI-FINAL 1"
                  teamIds={otherSemiIds}
                />
                <SemiGroup
                  label="SEMI-FINAL 2"
                  teamIds={[managedTeamId, semiOpponentId]}
                  myId={managedTeamId}
                  myWon={semiResult === null ? undefined : semiResult === 'win'}
                />
              </div>

              {/* Bracket connector
                  SF group = label(~15px) + gap(6px) + rows(89px) = 110px
                  2 groups + 22px gap = 242px total
                  SF1 divider at: 15+6+44 = 65px
                  SF2 divider at: 110+22+15+6+44 = 197px
                  bracket height: 132px, horizontal midpoint: 131px */}
              <div style={{ position: 'relative', width: 40, height: 242, flexShrink: 0 }}>
                <div style={{ position: 'absolute', left: 0, top: 65, width: 20, height: 132, border: '2px solid #2a3656', borderLeft: 0, borderRadius: '0 8px 8px 0' }} />
                <div style={{ position: 'absolute', left: 20, right: 0, top: 131, height: 2, background: '#2a3656' }} />
              </div>

              {/* Final column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#6b7797' }}>FINAL</div>
                <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: `1px solid ${wonCup ? GOLD_BORDER : '#2a3656'}`, background: '#0a0f1d' }}>
                  {/* SF1 winner on top */}
                  <TeamRow
                    teamId={finalOpponentId}
                    score={finalOppScore}
                    eliminated={finalResult === 'win'}
                  />
                  <div style={{ height: 1, background: '#1c2640' }} />
                  {/* SF2 winner (player) on bottom */}
                  {(semiResult === 'win' || done) && !eliminatedInSemi ? (
                    <TeamRow
                      teamId={managedTeamId} isMe
                      score={finalMyScore}
                      winner={finalResult === 'win'}
                    />
                  ) : (
                    <div style={{ height: 44, display: 'flex', alignItems: 'center', paddingLeft: 12, color: '#3a4768', fontSize: 14 }}>TBD</div>
                  )}
                </div>
              </div>

              {/* Gold connector + Champions box (only when won) */}
              {wonCup && (
                <>
                  <div style={{ height: 2, background: GOLD }} />
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '16px 12px', borderRadius: 14,
                    background: GOLD_BG, border: `1px solid ${GOLD_BORDER}`,
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 21h8" /><path d="M12 17v4" />
                      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                      <path d="M17 5h3v2a3 3 0 0 1-3 3" /><path d="M7 5H4v2a3 3 0 0 0 3 3" />
                    </svg>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: GOLD }}>CHAMPIONS</div>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', lineHeight: 1, color: '#c8f53d', textAlign: 'center' }}>
                      {myTeam.name}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Prize cards (once any prize is earned) */}
          {done && (
            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 18px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>
                  {semiResult === 'win' ? 'Semi-final win' : 'Semi-final'}
                </div>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: '#5fd49a' }}>
                  +£{(semiPrize / 1000).toFixed(0)}K
                </div>
              </div>
              {finalResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 18px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>
                    {finalResult === 'win' ? 'Final win' : 'Final'}
                  </div>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: '#5fd49a' }}>
                    +£{(finalPrize / 1000).toFixed(0)}K
                  </div>
                </div>
              )}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 18px', borderRadius: 14,
                background: wonCup ? GOLD_BG : '#0f1628',
                border: wonCup ? `1px solid ${GOLD_BORDER}` : '1px solid #1c2640',
              }}>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: wonCup ? GOLD : '#8d99b5', fontWeight: wonCup ? 700 : 600 }}>
                  Total prize money
                </div>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: wonCup ? GOLD : '#5fd49a' }}>
                  +£{((semiPrize + finalPrize) / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          )}

          {/* CTA button */}
          {done ? (
            <button onClick={handleNewSeason} style={{
              flexShrink: 0, height: 60, borderRadius: 14,
              background: wonCup ? '#c8f53d' : '#60a5fa',
              color: '#070b16', border: 0,
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 22, letterSpacing: '0.14em',
              textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              boxShadow: wonCup ? '0 10px 30px rgba(200,245,61,0.2)' : 'none',
            }}>
              {wonCup ? 'Champions! New Season' : 'New Season'}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          ) : (
            <button onClick={handlePlay} style={{
              flexShrink: 0, height: 60, borderRadius: 14,
              background: GOLD, color: '#070b16', border: 0,
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 22, letterSpacing: '0.14em',
              textTransform: 'uppercase', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            }}>
              Play {upcomingLabel}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </section>
      </div>
    </Layout>
    </>
  );
}
