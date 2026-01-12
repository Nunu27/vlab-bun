import { useDebounceValue } from 'usehooks-ts';

export function useActionState<TData>(data: TData) {
  const [oldData] = useDebounceValue(data, 150);

  return { open: !!data, data: data ?? oldData };
}
