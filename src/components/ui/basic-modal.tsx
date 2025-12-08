'use client';

import { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface BasicModalProps {
  // Dialog state
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Content
  title: string;
  description?: string;
  children?: ReactNode;

  // Actions
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;

  // Variants
  variant?: 'default' | 'destructive';

  // States
  loading?: boolean;
  disabled?: boolean;

  // Customization
  showCancel?: boolean;
  showConfirm?: boolean;
  showCloseButton?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function BasicModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
  disabled = false,
  showCancel = true,
  showConfirm = true,
  showCloseButton = true,
  maxWidth = 'lg',
}: BasicModalProps) {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClass} showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children && <div className='py-4'>{children}</div>}

        {(showCancel || showConfirm) && (
          <DialogFooter>
            {showCancel && (
              <Button variant='outline' onClick={handleCancel} disabled={loading || disabled}>
                {cancelText}
              </Button>
            )}
            {showConfirm && (
              <Button variant={variant} onClick={handleConfirm} disabled={loading || disabled}>
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Loading...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
