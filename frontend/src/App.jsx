import { useState, useEffect, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './components/Dashboard'
import GPUMonitor from './components/GPUMonitor'
import AIDataCenter from './components/AIDataCenter'
import ControlCenter from './components/ControlCenter'
import WaterComputePlanner from './components/WaterComputePlanner'
import VGPUManager from './components/VGPUManager'
import VMInspector from './components/VMInspector'
import GraphicsViewer from './components/GraphicsViewer'
import ComputeComparison from './components/ComputeComparison'
import Logs from './components/Logs'
import AIComparisonAgent from './components/AIComparisonAgent'
import {
  LayoutDashboard, Server, Box, GitCompare,
  Image as ImageIcon, FileText, Settings,
  HelpCircle, Bell, Search, Cpu as CpuIcon, Activity, Network, Droplet,
  Sun, Moon, Monitor
} from 'lucide-react'

const queryClient = new QueryClient()

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  //  Theme State 
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
    { id: 'gpu_monitor', name: 'GPU Monitor', icon: Activity, component: GPUMonitor },
    { id: 'ai_data_center', name: 'AI Data Center', icon: Network, component: AIDataCenter },
    { id: 'control_center', name: 'Control Center', icon: Monitor, component: ControlCenter },
    { id: 'water_resource', name: 'Water & Resource', icon: Droplet, component: WaterComputePlanner },
    { id: 'comparison', name: 'Speed Comparison', icon: GitCompare, component: ComputeComparison },
    { id: 'vgpu', name: 'vGPU Manager', icon: Server, component: VGPUManager },
    { id: 'vm_inspector', name: 'VM Inspector', icon: Box, component: VMInspector },
    { id: 'graphics', name: 'Graphics Viewer', icon: ImageIcon, component: GraphicsViewer },
    { id: 'logs', name: 'Logs', icon: FileText, component: Logs },
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--black)', color: 'var(--text-primary)', overflow: 'hidden' }}>

        {/*  Left Sidebar  */}
        <aside style={{
          width: '260px',
          background: 'var(--dark-gray)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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

          {/* Page Content */}
          <main style={{ flex: 1, overflowY: 'auto', background: 'var(--black)' }}>
            {ActiveComponent && <ActiveComponent />}
          </main>
          <AIComparisonAgent activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </QueryClientProvider>
  )
}

export default App