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
  showSuccessMessage?: boolean;
  callback?: (result: TData) => void | Promise<void>;
}

export async function errorHandler<
  T extends Record<number, unknown>,
  TResponse extends Treaty.TreatyResponse<T>,
  TData extends Treaty.Data<TResponse>,
>(promise: Promise<TResponse>, config: ErrorHandlerConfig<TData> = {}) {
  try {
    const { data, error } = await promise;

    if (error) {
      const response = error.value as BaseResponse;
      throw new Error(response.message || 'An error occurred');
    }

    if (config.showSuccessMessage ?? true) {
      const response = data as BaseResponse;

      if (response.message) {
        toast.success(response.message);
      }
    }

    await config.callback?.(data as TData);
  } catch (error) {
    toast.error((error as Error).message);
  }
}
