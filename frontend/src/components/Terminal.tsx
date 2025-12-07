'use client';

interface LogEntry {
  message: string;
  type: string;
  timestamp: Date;
}

export function Terminal({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="bg-[#0d0d12] border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-sm text-gray-500 ml-2">System Log</span>
      </div>
      <div className="p-4 h-48 overflow-y-auto font-mono text-sm">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`py-1 ${
              log.type === 'success' ? 'text-green-400' :
              log.type === 'error' ? 'text-danger' :
              log.type === 'warning' ? 'text-warning' :
              log.type === 'highlight' ? 'text-accent font-semibold' :
              'text-gray-500'
            }`}
          >
            {'>'} {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
