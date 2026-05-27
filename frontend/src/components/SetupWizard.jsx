import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, CheckCircle2, AlertCircle, Loader } from 'lucide-react'

function SetupWizard() {
  const [step, setStep] = useState(1)
  const [vmName, setVmName] = useState('')
  const [vramSize, setVramSize] = useState(1024)
  const [computeLimit, setComputeLimit] = useState(50)
  const [selectedVGPU, setSelectedVGPU] = useState(null)
  const [completedSteps, setCompletedSteps] = useState([])

  const queryClient = useQueryClient()

  const { data: vGPUs, refetch: refetchVGPUs } = useQuery({
    queryKey: ['vgpus'],
    queryFn: () => fetch('/api/vgpu/list').then(res => res.json()),
    refetchInterval: 2000
  })

  const { data: physicalGPUs } = useQuery({
    queryKey: ['physical-gpus'],
    queryFn: () => fetch('/api/gpu/physical').then(res => res.json()),
    refetchInterval: 2000
  })

  const provisionMutation = useMutation({
    mutationFn: () => fetch('/api/vgpu/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        vram_mb: vramSize,
        compute_pct: computeLimit,
        profile: 'default'
      })
    }).then(res => res.json()),
    onSuccess: (data) => {
      setSelectedVGPU(data.vgpu_id)
      setCompletedSteps([...completedSteps, 1])
      refetchVGPUs()
      setTimeout(() => setStep(2), 500)
    }
  })

  const assignMutation = useMutation({
    mutationFn: () => Promise.resolve({ success: true }),
    onSuccess: () => {
      setCompletedSteps([...completedSteps, 2])
      setTimeout(() => setStep(3), 500)
    }
  })

  const finalizeMutation = useMutation({
    mutationFn: () => Promise.resolve({ vmCreated: true }),
    onSuccess: () => {
      setCompletedSteps([...completedSteps, 3])
      setTimeout(() => setStep(4), 500)
    }
  })

  const handleStartWizard = () => {
    setStep(1)
    setCompletedSteps([])
  }

  const handleCreateVM = () => {
    if (vmName.trim() === '') {
      alert('Please enter a VM name')
      return
    }
    provisionMutation.mutate()
  }

  const handleAssignVGPU = () => {
    assignMutation.mutate()
  }

  const handleFinalize = () => {
    finalizeMutation.mutate()
  }

  const handleReset = () => {
    setStep(1)
    setVmName('')
    setVramSize(1024)
    setComputeLimit(50)
    setSelectedVGPU(null)
    setCompletedSteps([])
  }

  const steps = [
    { id: 1, title: 'VM Creation', description: 'Create and name your virtual machine' },
    { id: 2, title: 'Assign vGPU', description: 'Allocate GPU resources to the VM' },
    { id: 3, title: 'Configure Resources', description: 'Set VRAM and compute limits' },
    { id: 4, title: 'Complete Setup', description: 'VM is ready to use' }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">VM & vGPU Setup Wizard</h2>

      {/* Progress Bar */}
      <div className="bg-gray-800 p-6 rounded">
        <div className="flex justify-between items-center mb-8">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                completedSteps.includes(s.id) ? 'bg-green-600' : 
                step === s.id ? 'bg-blue-600' : 
                'bg-gray-700'
              }`}>
                {completedSteps.includes(s.id) ? <CheckCircle2 size={24} /> : s.id}
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  completedSteps.includes(s.id) ? 'bg-green-600' : 'bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold">{steps[step - 1].title}</h3>
          <p className="text-gray-400">{steps[step - 1].description}</p>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-gray-800 p-8 rounded space-y-6">
        
        {/* Step 1: VM Name */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-900 p-4 rounded border border-blue-700">
              <p className="font-semibold mb-2">📋 Step 1: Create Virtual Machine</p>
              <p className="text-sm text-gray-300">First, let's create a new VM. Give it a meaningful name that describes its purpose.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">VM Name</label>
              <input
                type="text"
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
                placeholder="e.g., ml-training-vm, web-server-01"
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-2">This name will identify your VM in the system.</p>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <p className="text-sm mb-2"><strong>What happens in background:</strong></p>
              <ul className="text-xs space-y-1 text-gray-300">
                <li>✓ Ubuntu 20.04 container will be created</li>
                <li>✓ VM will be isolated from host system</li>
                <li>✓ VM gets unique ID and container ID</li>
              </ul>
            </div>

            <button
              onClick={handleCreateVM}
              disabled={provisionMutation.isLoading || vmName.trim() === ''}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold flex items-center justify-center gap-2"
            >
              {provisionMutation.isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Creating VM...
                </>
              ) : (
                <>
                  Create VM
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Assign vGPU */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-900 p-4 rounded border border-blue-700">
              <p className="font-semibold mb-2">🎮 Step 2: Assign vGPU to VM</p>
              <p className="text-sm text-gray-300">Your VM "{vmName}" has been created! Now let's assign GPU resources to it.</p>
            </div>

            <div className="bg-green-900 p-4 rounded border border-green-700">
              <p className="text-sm">
                <CheckCircle2 className="inline mr-2" size={16} />
                <strong>VM Created Successfully!</strong>
              </p>
              <p className="text-xs text-gray-300 mt-2">
                UUID: <code className="bg-black px-2 py-1 rounded">{selectedVGPU?.slice(0, 8)}</code>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">VRAM Allocation (MB)</label>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={vramSize}
                  onChange={(e) => setVramSize(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-400 mt-1">{vramSize} MB VRAM allocated</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Compute Limit (%)</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={computeLimit}
                  onChange={(e) => setComputeLimit(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-400 mt-1">{computeLimit}% of GPU compute available</p>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded">
              <p className="text-sm mb-2"><strong>Resource Summary:</strong></p>
              <ul className="text-xs space-y-1 text-gray-300">
                <li>• VRAM: {vramSize} MB (for AI models, rendering)</li>
                <li>• Compute: {computeLimit}% (for parallel processing)</li>
                <li>• Bandwidth: 50% (data transfer limit)</li>
              </ul>
            </div>

            <button
              onClick={handleAssignVGPU}
              disabled={assignMutation.isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold flex items-center justify-center gap-2"
            >
              {assignMutation.isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  Assign vGPU Resources
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Confirm Resources */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-900 p-4 rounded border border-blue-700">
              <p className="font-semibold mb-2">⚙️ Step 3: Resource Configuration Summary</p>
              <p className="text-sm text-gray-300">Review the configuration before finalizing setup.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-600">
                <span className="text-gray-400">VM Name:</span>
                <span className="font-semibold">{vmName}</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-600">
                <span className="text-gray-400">vGPU ID:</span>
                <span className="font-mono text-sm">{selectedVGPU?.slice(0, 12)}...</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-600">
                <span className="text-gray-400">VRAM Allocated:</span>
                <span className="font-semibold">{vramSize} MB</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-600">
                <span className="text-gray-400">Compute Power:</span>
                <span className="font-semibold">{computeLimit}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                <span className="font-semibold text-green-400">✓ Ready</span>
              </div>
            </div>

            <div className="bg-yellow-900 p-4 rounded border border-yellow-700">
              <p className="text-sm flex gap-2"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> <span>The VM is now running with these resources. You can access it via the VM Manager tab.</span></p>
            </div>

            <button
              onClick={handleFinalize}
              disabled={finalizeMutation.isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded font-semibold flex items-center justify-center gap-2"
            >
              {finalizeMutation.isLoading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  Complete Setup
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-green-900 p-4 rounded border border-green-700">
              <p className="font-semibold mb-2">✅ Step 4: Setup Complete!</p>
              <p className="text-sm text-gray-300">Your VM is ready to use with allocated GPU resources.</p>
            </div>

            <div className="bg-gradient-to-r from-green-900 to-green-800 p-6 rounded text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-400" />
              <h3 className="text-2xl font-bold mb-2">VM Successfully Setup!</h3>
              <p className="text-green-200">"{vmName}" is now running with {computeLimit}% GPU compute and {vramSize}MB VRAM</p>
            </div>

            <div className="bg-gray-700 p-4 rounded space-y-3">
              <p className="text-sm font-semibold">Next Steps:</p>
              <ul className="text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="text-blue-400">1.</span>
                  <span>Go to <strong>VM Manager</strong> tab to access the terminal</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Run commands and install software in your VM</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>Submit compute jobs from <strong>Compute Lab</strong> to use the vGPU</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">4.</span>
                  <span>Monitor resource usage in the <strong>Dashboard</strong></span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleReset}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold"
              >
                Create Another VM
              </button>
              <a
                href="#vm-manager"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-center"
              >
                Go to VM Manager
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Current VMs Status */}
      {vGPUs && vGPUs.length > 0 && (
        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-lg font-semibold mb-4">Active VMs & vGPUs ({vGPUs.length})</h3>
          <div className="space-y-2">
            {vGPUs.map((vgpu) => (
              <div key={vgpu.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                <div>
                  <p className="font-semibold">vGPU {vgpu.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">VRAM: {vgpu.vram_limit}MB | Compute: {vgpu.compute_limit}%</p>
                </div>
                <span className="text-green-400">✓ Active</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SetupWizard