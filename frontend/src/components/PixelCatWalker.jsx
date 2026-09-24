import { useEffect, useState, useRef, useCallback } from 'react'

/**
 * CatWalker — An interactive cozy blue kitten that wanders around the screen.
 * 
 * Features:
 *   - Wanders randomly around the entire screen (not just left-right)
 *   - Click/tap the cat → it reacts (jumps, shows hearts, spins, meows)
 *   - Animated tail that sways naturally
 *   - Cat face is clearly visible (larger size)
 *   - Smooth enter/exit animations
 *   - Paw print trail
 */

const STYLE_ID = 'cat-walker-styles'
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    /* Walking bounce */
    @keyframes catStepBounce {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    
    /* Body waddle while walking */
    @keyframes catWaddleWalk {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(3deg); }
      75% { transform: rotate(-3deg); }
    }
    
    /* Squash & stretch per step */
    @keyframes catStepSquish {
      0%, 100% { transform: scaleX(1) scaleY(1); }
      50% { transform: scaleX(1.04) scaleY(0.96); }
    }
    
    /* Tail sway animation */
    @keyframes tailSway {
      0%, 100% { transform: rotate(-20deg) scaleX(1); }
      30% { transform: rotate(15deg) scaleX(1.05); }
      60% { transform: rotate(-10deg) scaleX(0.95); }
    }
    
    /* Tail sway when idle (slower, lazier) */
    @keyframes tailSwayIdle {
      0%, 100% { transform: rotate(-15deg); }
      50% { transform: rotate(10deg); }
    }
    
    /* Reaction: Jump */
    @keyframes catJump {
      0% { transform: translateY(0) scale(1); }
      20% { transform: translateY(0) scale(0.9, 1.1); }
      40% { transform: translateY(-50px) scale(1.05, 0.95); }
      60% { transform: translateY(-50px) scale(1); }
      80% { transform: translateY(0) scale(1.1, 0.9); }
      100% { transform: translateY(0) scale(1); }
    }
    
    /* Reaction: Spin */
    @keyframes catSpin {
      0% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(90deg) scale(1.1); }
      50% { transform: rotate(180deg) scale(1); }
      75% { transform: rotate(270deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }
    
    /* Reaction: Wiggle */
    @keyframes catWiggle {
      0%, 100% { transform: rotate(0deg); }
      10% { transform: rotate(-12deg); }
      20% { transform: rotate(12deg); }
      30% { transform: rotate(-10deg); }
      40% { transform: rotate(10deg); }
      50% { transform: rotate(-6deg); }
      60% { transform: rotate(6deg); }
      70% { transform: rotate(-3deg); }
      80% { transform: rotate(3deg); }
    }
    
    /* Floating hearts / emojis */
    @keyframes floatUp {
      0% { opacity: 1; transform: translateY(0) scale(0.5); }
      50% { opacity: 1; transform: translateY(-40px) scale(1.2); }
      100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
    }
    
    /* Enter animation */
    @keyframes catPopIn {
      0% { opacity: 0; transform: scale(0) translateY(30px); }
      60% { opacity: 1; transform: scale(1.15) translateY(-8px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    
    /* Exit animation */
    @keyframes catPopOut {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0) translateY(30px); }
    }
    
    /* Paw prints */
    @keyframes pawFadeOut {
      0% { opacity: 0.45; }
      100% { opacity: 0; }
    }
    
    /* Idle breathing */
    @keyframes catBreathe {
      0%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(1.03); }
    }
    
    /* Purr vibration */
    @keyframes catPurr {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-1px); }
      75% { transform: translateX(1px); }
    }
    
    .cat-walker-container {
      cursor: pointer !important;
      user-select: none;
      -webkit-user-select: none;
    }
    .cat-walker-container:active {
      cursor: grabbing !important;
    }
  `
  document.head.appendChild(style)
}

// Cat behavior states
const STATES = {
  WALKING: 'walking',
  IDLE: 'idle',
  REACTING: 'reacting',
}

// Reaction types when clicked
const REACTIONS = ['jump', 'spin', 'wiggle', 'purr']
const REACTION_EMOJIS = ['❤️', '✨', '💕', '😻', '💫', '🐟', '🧶']

function CatWalker({ isWalking: isEnabled }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [catState, setCatState] = useState(STATES.IDLE)
  const [position, setPosition] = useState({ x: 200, y: window.innerHeight - 160 })
  const [direction, setDirection] = useState(1) // 1 = facing right, -1 = facing left
  const [reaction, setReaction] = useState(null)
  const [floatingEmojis, setFloatingEmojis] = useState([])
  const [prints, setPrints] = useState([])

  const posRef = useRef({ x: 200, y: window.innerHeight - 160 })
  const targetRef = useRef({ x: 400, y: window.innerHeight - 160 })
  const animRef = useRef(null)
  const stateTimerRef = useRef(null)
  const lastPrintRef = useRef(0)
  const reactionTimeoutRef = useRef(null)

  // Inject styles on mount
  useEffect(() => { injectStyles() }, [])

  // Show/hide based on parent toggle
  useEffect(() => {
    if (isEnabled) {
      setExiting(false)
      setVisible(true)
      setCatState(STATES.IDLE)
      // Start walking after a brief idle
      stateTimerRef.current = setTimeout(() => {
        pickNewTarget()
        setCatState(STATES.WALKING)
      }, 800)
    } else if (visible) {
      setExiting(true)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current)
      const timer = setTimeout(() => {
        setVisible(false)
        setExiting(false)
        setPrints([])
      }, 500)
      return () => clearTimeout(timer)
    }
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current)
    }
  }, [isEnabled])

  // Pick a random target point on screen for the cat to walk to
  const pickNewTarget = useCallback(() => {
    const margin = 120
    const maxX = window.innerWidth - margin
    const maxY = window.innerHeight - margin
    const minY = window.innerHeight * 0.4 // Keep cat in lower portion
    targetRef.current = {
      x: margin + Math.random() * (maxX - margin),
      y: minY + Math.random() * (maxY - minY),
    }
  }, [])

  // Main animation loop
  useEffect(() => {
    if (!visible || exiting || catState !== STATES.WALKING) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      return
    }

    const speed = 1.2 // pixels per frame (~72px/sec at 60fps)

    const step = () => {
      const pos = posRef.current
      const target = targetRef.current
      const dx = target.x - pos.x
      const dy = target.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 5) {
        // Reached target — idle for a bit, then pick a new target
        setCatState(STATES.IDLE)
        stateTimerRef.current = setTimeout(() => {
          pickNewTarget()
          setCatState(STATES.WALKING)
        }, 1500 + Math.random() * 2500)
        return
      }

      // Move towards target
      const nx = dx / dist
      const ny = dy / dist
      posRef.current = {
        x: pos.x + nx * speed,
        y: pos.y + ny * speed,
      }

      // Face the direction of movement
      if (Math.abs(dx) > 2) {
        setDirection(dx > 0 ? 1 : -1)
      }

      setPosition({ ...posRef.current })

      // Drop paw prints every ~60px
      const now = Date.now()
      if (now - lastPrintRef.current > 400) {
        lastPrintRef.current = now
        setPrints(prev => [
          ...prev.slice(-12),
          { id: now, x: posRef.current.x + 40, y: posRef.current.y + 100 },
        ])
      }

      animRef.current = requestAnimationFrame(step)
    }

    animRef.current = requestAnimationFrame(step)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [visible, exiting, catState, pickNewTarget])

  // Clean up old paw prints
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 3000
      setPrints(prev => prev.filter(p => p.id > cutoff))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Handle cat click — trigger a reaction!
  const handleCatClick = useCallback((e) => {
    e.stopPropagation()

    if (catState === STATES.REACTING) return

    // Pick a random reaction
    const rxn = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]
    setReaction(rxn)
    setCatState(STATES.REACTING)

    // Spawn floating emojis
    const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)]
    const newEmojis = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => ({
      id: Date.now() + i,
      emoji,
      x: posRef.current.x + 20 + Math.random() * 60,
      y: posRef.current.y - 10,
      delay: i * 0.15,
    }))
    setFloatingEmojis(prev => [...prev, ...newEmojis])

    // Clear floating emojis after animation
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => !newEmojis.find(n => n.id === e.id)))
    }, 1500)

    // After reaction, go back to walking
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
    reactionTimeoutRef.current = setTimeout(() => {
      setReaction(null)
      pickNewTarget()
      setCatState(STATES.WALKING)
    }, 900)
  }, [catState, pickNewTarget])

  if (!visible) return null

  const isWalking = catState === STATES.WALKING
  const isIdle = catState === STATES.IDLE
  const isReacting = catState === STATES.REACTING

  // Pick the right reaction animation
  let reactionAnim = 'none'
  if (isReacting && reaction) {
    const animMap = {
      jump: 'catJump 0.7s ease-in-out',
      spin: 'catSpin 0.7s ease-in-out',
      wiggle: 'catWiggle 0.8s ease-in-out',
      purr: 'catPurr 0.1s ease-in-out 6',
    }
    reactionAnim = animMap[reaction] || 'none'
  }

  return (
    <>
      {/* Main cat container */}
      <div
        className="cat-walker-container"
        onClick={handleCatClick}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999,
          pointerEvents: 'auto',
          // Enter/exit animations
          animation: exiting
            ? 'catPopOut 0.5s ease-in forwards'
            : (visible ? 'catPopIn 0.5s ease-out' : 'none'),
        }}
      >
        {/* Reaction layer */}
        <div style={{
          animation: isReacting ? reactionAnim : 'none',
          transformOrigin: 'center bottom',
        }}>
          {/* Bounce layer (walking step) */}
          <div style={{
            animation: isWalking ? 'catStepBounce 0.35s ease-in-out infinite' : 'none',
          }}>
            {/* Waddle layer */}
            <div style={{
              animation: isWalking ? 'catWaddleWalk 0.7s ease-in-out infinite' : 'none',
              transformOrigin: 'center bottom',
            }}>
              {/* Squish layer */}
              <div style={{
                animation: isWalking
                  ? 'catStepSquish 0.35s ease-in-out infinite'
                  : isIdle
                    ? 'catBreathe 2.5s ease-in-out infinite'
                    : 'none',
                transformOrigin: 'center bottom',
              }}>
                {/* Cat image + tail wrapper */}
                <div style={{
                  position: 'relative',
                  transform: `scaleX(${direction})`, // flip based on direction
                  transition: 'transform 0.3s ease',
                  filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.2))',
                }}>
                  {/* Cat Image — full body with tail already in illustration */}
                  <img
                    src="/assets/cat.png"
                    alt="Cute tabby kitten"
                    style={{
                      width: '120px',
                      height: '120px',
                      objectFit: 'contain',
                      display: 'block',
                      pointerEvents: 'none',
                    }}
                    draggable={false}
                  />

                  {/* Interaction hint — subtle glow on hover */}
                  <div style={{
                    position: 'absolute',
                    inset: '10px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(222,184,135,0.2) 0%, transparent 70%)',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    pointerEvents: 'none',
                  }}
                  className="cat-glow"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* "Pet me!" tooltip on hover */}
        <div style={{
          position: 'absolute',
          top: '-28px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          opacity: 0,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        }}
        className="cat-tooltip"
        >
          {isIdle ? '😺 Pet me!' : isWalking ? '🐱 Catch me!' : '😻 Meow!'}
        </div>
      </div>

      {/* Floating reaction emojis */}
      {floatingEmojis.map(em => (
        <div
          key={em.id}
          style={{
            position: 'fixed',
            left: `${em.x}px`,
            top: `${em.y}px`,
            fontSize: '20px',
            pointerEvents: 'none',
            zIndex: 100000,
            animation: `floatUp 1.2s ease-out ${em.delay}s forwards`,
            opacity: 0,
            animationFillMode: 'forwards',
          }}
        >
          {em.emoji}
        </div>
      ))}

      {/* Paw print trail */}
      {prints.map(print => {
        const age = Date.now() - print.id
        return (
          <div
            key={print.id}
            style={{
              position: 'fixed',
              left: `${print.x}px`,
              top: `${print.y}px`,
              fontSize: '10px',
              pointerEvents: 'none',
              zIndex: 99998,
              animation: 'pawFadeOut 3s ease-out forwards',
              color: 'rgba(180, 140, 90, 0.45)',
              transform: `rotate(${-15 + Math.random() * 30}deg)`,
            }}
          >
            🐾
          </div>
        )
      })}

      {/* Extra CSS for hover effects via a small style tag */}
      <style>{`
        .cat-walker-container:hover .cat-tooltip {
          opacity: 1 !important;
        }
        .cat-walker-container:hover .cat-glow {
          opacity: 1 !important;
        }
      `}</style>
    </>
  )
}

export default CatWalker
