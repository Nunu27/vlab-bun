import { clsx, type ClassValue } from 'clsx';
import type { Treaty } from '@elysiajs/eden';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BaseResponse {
  success: boolean;
  message?: string;
}

interface ErrorHandlerConfig<TData> {
  showToast?: {
    onSuccess?: boolean;
    onError?: boolean;
  };
  callback?: (result: TData) => void | Promise<void>;
}

export async function errorHandler<
  T extends Record<number, unknown>,
  TResponse extends Treaty.TreatyResponse<T>,
  TData extends Treaty.Data<TResponse>,
>(promise: Promise<TResponse>, config: ErrorHandlerConfig<TData> = {}) {
  const { showToast = {}, callback } = config;

  try {
    const { data, error } = await promise;

    if (error) {
      const response = error.value as BaseResponse;
      throw new Error(response.message || 'An error occurred');
    }

    if (showToast.onSuccess ?? true) {
      const response = data as BaseResponse;

      if (response.message) {
        toast.success(response.message);
      }
    }

    await callback?.(data as TData);
  } catch (error) {
    if (showToast.onError ?? true) {
      toast.error((error as Error).message);
    }
  }
}
