import { Button } from '@frontend/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@frontend/components/ui/dialog';
import { cn } from '@frontend/lib/utils';
import type { DeviceInterface } from '@vlab/shared/schemas/rest';
import { Network } from 'lucide-react';

interface InterfaceWithConnection extends DeviceInterface {
  connected: boolean;
}

interface InterfaceModalProps {
  isOpen: boolean;
  title: string;
  interfaces: InterfaceWithConnection[];
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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select a network interface to connect.
          </DialogDescription>
        </DialogHeader>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
          {interfaces.map((iface) => (
            <Button
              key={iface.name}
              variant="secondary"
              appearance="ghost"
              disabled={iface.connected}
              onClick={() => onSelect(iface.name)}
              className={cn(
                'h-auto w-full justify-between px-4 py-3',
                iface.connected && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-3">
                <Network
                  size={16}
                  className={cn(
                    iface.connected ? 'text-muted-foreground' : 'text-primary',
                  )}
                />
                <span className="font-medium">{iface.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
