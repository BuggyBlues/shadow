import { useQuery } from '@tanstack/react-query'
import { Cpu, Server } from 'lucide-react'
import { api, type RuntimeInfo } from '@/lib/api'

export function RuntimesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['runtimes'],
    queryFn: api.runtimes,
  })

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Runtimes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Available agent runtimes and their default images
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-3 py-1.5 transition-colors"
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="text-center text-gray-500 text-sm py-8">Loading runtimes...</div>
      )}
      {error && (
        <div className="text-center text-red-400 text-sm py-8">Failed to load runtimes</div>
      )}

      {data && data.length === 0 && (
        <div className="py-12 text-center">
          <Server size={32} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">No runtimes found</p>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Cpu size={13} /> Available runtimes
            </div>
            <p className="text-2xl font-semibold">{data.length}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((rt: RuntimeInfo) => (
              <div
                key={rt.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={16} className="text-blue-400" />
                  <h3 className="text-sm font-semibold">{rt.name}</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">ID:</span>
                    <span className="font-mono text-gray-400">{rt.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Image:</span>
                    <span className="font-mono text-gray-400 truncate">{rt.defaultImage}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
