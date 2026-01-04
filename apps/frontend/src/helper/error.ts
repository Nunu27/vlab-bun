import type { Treaty } from '@elysiajs/eden';
import { redirect } from '@tanstack/react-router';
import { toast } from 'sonner';

interface BaseResponse {
  success: boolean;
  message?: string;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An error occurred';
}

export function getErrorMessageFromApi(error: unknown) {
  return (error as BaseResponse).message || 'An error occurred';
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
      const { status, value } = error;

      if (
        status === 401 &&
        (value as BaseResponse).message === 'Unauthorized'
      ) {
        await cookieStore.delete('session');
        toast.error('Session expired');
        throw redirect({ to: '/login' });
      }

      throw new Error(getErrorMessageFromApi(value));
    }

    if (showToast.onSuccess ?? true) {
      const response = data as BaseResponse;

      if (response.message) {
        toast.success(response.message);
      }
    }

    await callback?.(data as TData);
  } catch (error) {
    console.error(error);
    if (showToast.onError ?? true) {
      toast.error(getErrorMessage(error));
    }
  }
}
