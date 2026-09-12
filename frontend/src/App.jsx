import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetricsProvider } from './contexts/MetricsContext'
import {
  LayoutDashboard, Server, Box, GitCompare,
  Image as ImageIcon, FileText, Settings,
  HelpCircle, Bell, Search, Cpu as CpuIcon, Activity, Network, Droplet,
  Sun, Moon, Monitor, Bot, Layers
} from 'lucide-react'

// Dashboard is eagerly loaded (visible on startup)
import Dashboard from './components/Dashboard'

// All other tab components are lazy-loaded — defers parsing/execution of ~500KB
// of JS until the user actually navigates to each tab. Previously all 13 components
// were statically imported, blocking initial page render.
const GPUMonitor = lazy(() => import('./components/GPUMonitor'))
const AIDataCenter = lazy(() => import('./components/AIDataCenter'))
const ControlCenter = lazy(() => import('./components/ControlCenter'))
const WaterComputePlanner = lazy(() => import('./components/WaterComputePlanner'))
const VGPUManager = lazy(() => import('./components/VGPUManager'))
const VMInspector = lazy(() => import('./components/VMInspector'))
const GraphicsViewer = lazy(() => import('./components/GraphicsViewer'))
const ComputeComparison = lazy(() => import('./components/ComputeComparison'))
const Logs = lazy(() => import('./components/Logs'))
const AIComparisonAgent = lazy(() => import('./components/AIComparisonAgent'))
const ProjectAIChatbot = lazy(() => import('./components/ProjectAIChatbot'))
const VirtualizationTopology = lazy(() => import('./components/VirtualizationTopology'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000, // 10s TTL prevents refetch floods on tab change
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Lightweight loading spinner shown while lazy components load
function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-muted)',
      fontSize: '0.9rem',
      gap: '0.75rem'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2px solid var(--border)',
        borderTop: '2px solid var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['dashboard']))

  // Preload lazy tab modules in background so tab switching is instantaneous
  useEffect(() => {
    const preloadTabs = () => {
      import('./components/GPUMonitor')
      import('./components/AIDataCenter')
      import('./components/ControlCenter')
      import('./components/WaterComputePlanner')
      import('./components/VGPUManager')
      import('./components/VMInspector')
      import('./components/GraphicsViewer')
      import('./components/ComputeComparison')
      import('./components/Logs')
      import('./components/ProjectAIChatbot')
      import('./components/VirtualizationTopology')
    }
    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        const handle = window.requestIdleCallback(preloadTabs)
        return () => window.cancelIdleCallback(handle)
      } else {
        const timer = setTimeout(preloadTabs, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  // Keep visited tabs in cache so switching is 0ms and retains state
  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev
      const next = new Set(prev)
      next.add(activeTab)
      return next
    })
  }, [activeTab])

  //  Theme State — default to dark mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vgpu-theme') || 'dark'
  })

  // Apply theme to root element on mount + change
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    localStorage.setItem('vgpu-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  const isDark = theme === 'dark'

  //  Navigation Tabs 
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'vgpu', name: 'vGPU Manager', icon: Server, component: VGPUManager },
    { id: 'project_chatbot', name: 'Project AI Assistant', icon: Bot, component: ProjectAIChatbot },
    { id: 'gpu_monitor', name: 'GPU Monitor', icon: Activity, component: GPUMonitor },
    { id: 'ai_data_center', name: 'AI Power Supply', icon: Network, component: AIDataCenter },
    { id: 'control_center', name: 'Control Center', icon: Monitor, component: ControlCenter },
    { id: 'water_resource', name: 'Water & Resource', icon: Droplet, component: WaterComputePlanner },
    { id: 'comparison', name: 'Speed Comparison', icon: GitCompare, component: ComputeComparison },
    { id: 'vm_inspector', name: 'VM Inspector', icon: Box, component: VMInspector },
    { id: 'graphics', name: 'Graphics Viewer', icon: ImageIcon, component: GraphicsViewer },
    { id: 'logs', name: 'Logs', icon: FileText, component: Logs },
    { id: 'topology', name: 'Virtualization Architecture', icon: Layers, component: VirtualizationTopology },
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <QueryClientProvider client={queryClient}>
      <MetricsProvider>
        <div style={{ display: 'flex', height: '100vh', background: 'var(--black)', color: 'var(--text-primary)', overflow: 'hidden', position: 'relative' }}>
          {/* Liquid Glass Background Blobs */}
          <div className="liquid-blob-container">
            <div className="liquid-blob blob-purple"></div>
            <div className="liquid-blob blob-blue"></div>
            <div className="liquid-blob blob-pink"></div>
          </div>

          {/*  Left Sidebar  */}
          <aside style={{
            width: '260px',
            background: 'var(--dark-gray)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}>
            {/* Logo */}
            <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <CpuIcon size={24} color="var(--accent)" />
              <span style={{ fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', fontSize: '1.1rem' }}>V-GPU</span>
            </div>

            {/* Nav Items */}
            <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
                WORKSPACE
              </div>
              {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: isActive ? 'var(--gray)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'var(--sidebar-hover)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <Icon size={16} color={isActive ? 'var(--accent)' : 'currentColor'} />
                    {tab.name}
                  </button>
                )
              })}
            </nav>

            {/* Sidebar Footer */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {/* Pill toggle track */}
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    display: 'inline-block',
                    width: '36px',
                    height: '20px',
                    borderRadius: '999px',
                    background: isDark ? 'var(--light-gray)' : 'var(--accent)',
                    transition: 'background 0.22s ease',
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '3px',
                      left: isDark ? '3px' : '17px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: isDark ? '#888' : '#fff',
                      transition: 'left 0.22s ease, background 0.22s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                    }} />
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isDark ? <Moon size={14} /> : <Sun size={14} />}
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <button
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                }}
              >
                <Settings size={16} />
                Settings
              </button>
            </div>
          </aside>

          {/*  Main Content Area  */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 2 }}>

            {/* Top Header */}
            <header style={{
              height: '56px',
              background: 'var(--dark-gray)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 2rem',
              flexShrink: 0,
            }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', width: '320px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem' }} />
                <input
                  type="text"
                  placeholder="Search workspace..."
                  style={{
                    width: '100%',
                    padding: '0.45rem 1rem 0.45rem 2.2rem',
                    background: 'var(--gray)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Header Right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

                {/* Theme toggle icon button in header */}
                <button
                  onClick={toggleTheme}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  style={{
                    background: 'var(--gray)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                  <HelpCircle size={18} />
                </button>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', position: 'relative' }}>
                  <Bell size={18} />
                  <span style={{ position: 'absolute', top: '-1px', right: '-1px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--red)' }} />
                </button>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  boxShadow: '0 0 10px var(--accent-glow)',
                }}>
                  US
                </div>
              </div>
            </header>

            {/* Page Content — Keep visited tabs alive in DOM with display: contents / none */}
            <main style={{ flex: 1, overflowY: 'auto', background: 'var(--black)', position: 'relative' }}>
              <Suspense fallback={<LoadingSpinner />}>
                {tabs.map(tab => {
                  if (!visitedTabs.has(tab.id)) return null
                  const Component = tab.component
                  const isActive = activeTab === tab.id
                  return (
                    <div
                      key={tab.id}
                      style={{
                        display: isActive ? 'contents' : 'none',
                      }}
                    >
                      <Component theme={theme} isActive={isActive} />
                    </div>
                  )
                })}
              </Suspense>
            </main>
            <Suspense fallback={null}>
              <AIComparisonAgent setActiveTab={setActiveTab} />
            </Suspense>
          </div>
        </div>
      </MetricsProvider>
    </QueryClientProvider>
  )
}

export default App