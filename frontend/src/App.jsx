import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './components/Dashboard'
import VGPUManager from './components/VGPUManager'
import VMInspector from './components/VMInspector'
import ComputeLab from './components/ComputeLab'
import AIInference from './components/AIInference'
import GraphicsViewer from './components/GraphicsViewer'
import SchedulerView from './components/SchedulerView'
import Logs from './components/Logs'
import { 
  LayoutDashboard, Server, Box, Cpu, Brain, 
  Image as ImageIcon, Briefcase, FileText, Settings, 
  HelpCircle, Bell, Search, Cpu as CpuIcon
} from 'lucide-react'

const queryClient = new QueryClient()

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'vgpu', name: 'vGPU Manager', icon: Server, component: VGPUManager },
    { id: 'vm_inspector', name: 'VM Inspector', icon: Box, component: VMInspector },
    { id: 'compute', name: 'Compute Lab', icon: Cpu, component: ComputeLab },
    { id: 'ai', name: 'AI Inference', icon: Brain, component: AIInference },
    { id: 'graphics', name: 'Graphics Viewer', icon: ImageIcon, component: GraphicsViewer },
    { id: 'scheduler', name: 'Scheduler', icon: Briefcase, component: SchedulerView },
    { id: 'logs', name: 'Logs', icon: FileText, component: Logs },
  ]

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--black)', color: 'var(--text-primary)', overflow: 'hidden' }}>

        {/* Left Sidebar */}
        <aside style={{ width: '260px', background: 'var(--dark-gray)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', shrink: 0 }}>
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <CpuIcon size={24} color="var(--accent)" />
            <span style={{ fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)', fontSize: '1.1rem' }}>V-GPU</span>
          </div>

          <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', uppercase: 'true', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>WORKSPACE</div>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
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
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={16} color={isActive ? 'var(--accent)' : 'currentColor'} />
                  {tab.name}
                </button>
              );
            })}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <button style={{
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
              fontSize: '0.85rem'
            }}>
              <Settings size={16} />
              Settings
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
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
            shrink: 0
          }}>
            {/* Search workspace input */}
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
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
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
                boxShadow: '0 0 10px rgba(118, 185, 0, 0.3)'
              }}>
                US
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main style={{ flex: 1, overflowY: 'auto', background: 'var(--black)' }}>
            {ActiveComponent && <ActiveComponent />}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  )
}

export default App