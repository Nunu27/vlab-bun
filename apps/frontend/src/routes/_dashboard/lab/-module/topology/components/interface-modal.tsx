import { Network, X } from 'lucide-react';
import type { LabDeviceInterface } from '../types';

interface InterfaceModalProps {
  isOpen: boolean;
  title: string;
  interfaces: LabDeviceInterface[];
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function InterfaceModal({
  isOpen,
  title,
  interfaces,
  onSelect,
  onClose,
}: InterfaceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm duration-200">
      <div className="dark:bg-card w-full max-w-md scale-100 transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
        <div className="dark:border-border dark:bg-muted/50 flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="dark:text-card-foreground text-lg font-semibold text-gray-800">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="dark:text-muted-foreground dark:hover:text-foreground text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {interfaces.map((iface) => (
            <button
              key={iface.name}
              disabled={iface.connected}
              onClick={() => onSelect(iface.name)}
              className={`mb-1 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all ${
                iface.connected
                  ? 'dark:bg-muted/50 cursor-not-allowed bg-gray-50 opacity-50'
                  : 'dark:hover:bg-primary/10 dark:hover:text-primary cursor-pointer hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Network
                  size={16}
                  className={
                    iface.connected
                      ? 'dark:text-muted-foreground text-gray-400'
                      : 'dark:text-primary text-blue-500'
                  }
                />
                <span className="dark:text-foreground font-medium">
                  {iface.name}
                </span>
              </div>
              {iface.connected ? (
                <span className="dark:text-destructive text-xs font-semibold tracking-wider text-red-500 uppercase">
                  Used
                </span>
              ) : (
                <span className="text-xs font-semibold tracking-wider text-green-600 uppercase dark:text-green-500">
                  Available
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
