import ImageInput from '@frontend/components/input/image-input';
import { ComboBox } from '@frontend/components/ui/combobox';
import { Field, FieldError, FieldLabel } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import type { FileMetadata } from '@frontend/hooks/use-file-upload';
import api from '@frontend/lib/api';
import { getErrorMessageFromApi } from '@frontend/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const deviceKinds = [
  'nokia_srlinux',
  'nokia_sros',
  'nokia_srsim',
  'arista_ceos',
  'arista_veos',
  'juniper_crpd',
  'juniper_vmx',
  'juniper_vqfx',
  'juniper_vsrx',
  'juniper_vjunosrouter',
  'juniper_vjunosswitch',
  'juniper_vjunosevolved',
  'juniper_cjunosevolved',
  'cisco_xrd',
  'cisco_xrv',
  'cisco_xrv9k',
  'cisco_csr1000v',
  'cisco_n9kv',
  'cisco_c8000',
  'cisco_c8000v',
  'cisco_cat9kv',
  'cisco_iol',
  'cisco_ftdv',
  'cumulus_cvx',
  'aruba_aoscx',
  'sonic-vs',
  'sonic-vm',
  'dell_ftosv',
  'dell_sonic',
  'mikrotik_ros',
  'huawei_vrp',
  'ipinfusion_ocnos',
  'paloalto_panos',
  'fortinet_fortigate',
  'checkpoint_cloudguard',
  '6wind_vsr',
  'keysight_ixia-c-one',
  'arrcus_arcos',
  'fdio_vpp',
  'rare',
  'vyosnetworks_vyos',
  'generic_vm',
  'linux',
  'freebsd',
  'openwrt',
  'openbsd',
  'k8s-kind',
  'bridge',
  'ovs-bridge',
  'ext-container',
  'host',
] as const;

interface DeviceBasicInfoFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  initialFile?: FileMetadata | null;
}

export function DeviceBasicInfoForm({
  form,
  initialFile,
}: DeviceBasicInfoFormProps) {
  const [categorySearch, setCategorySearch] = useState('');
  const [kindSearch, setKindSearch] = useState('');

  const {
    data: categoryData,
    fetchNextPage,
    hasNextPage,
    isFetching: isLoadingCategories,
  } = useInfiniteQuery({
    queryKey: ['device-category', 'pagination', categorySearch],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await api['device-category'].pagination.post({
        page: pageParam,
        perPage: 20,
        search: categorySearch || undefined,
      });

      if (result.error) {
        throw new Error(getErrorMessageFromApi(result.error.value));
      }

      return result.data.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.page < lastPage.pageInfo.totalPages) {
        return lastPage.pageInfo.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  const categoryOptions = useMemo(() => {
    return (
      categoryData?.pages.flatMap((page) =>
        page.items.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      ) ?? []
    );
  }, [categoryData]);

  const kindOptions = useMemo(() => {
    return deviceKinds
      .filter((kind) => kind.toLowerCase().includes(kindSearch.toLowerCase()))
      .map((kind) => ({
        value: kind,
        label: kind,
      }));
  }, [kindSearch]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <div className="md:row-span-2">
        <form.Field name="icon">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(field: any) => (
            <Field>
              <FieldLabel htmlFor={field.name} required>
                Device Icon
              </FieldLabel>
              <ImageInput
                initialFile={initialFile}
                errors={field.state.meta.errors}
                onImageChange={(file: File | FileMetadata | null) =>
                  initialFile
                    ? field.handleChange(
                        (file instanceof File ? file : undefined) as
                          | File
                          | undefined,
                      )
                    : field.handleChange(file as File)
                }
              />
            </Field>
          )}
        </form.Field>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field name="name">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(field: any) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field>
                  <FieldLabel htmlFor={field.name} required>
                    Device Name
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g., Cisco Router 1"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="image">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(field: any) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field>
                  <FieldLabel htmlFor={field.name} required>
                    Docker Image
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g., cisco/ios:latest"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field name="kind">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(field: any) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field>
                  <FieldLabel htmlFor={field.name} required>
                    Device Kind
                  </FieldLabel>
                  <ComboBox
                    options={kindOptions}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value ?? '')}
                    placeholder="Select device kind"
                    searchPlaceholder="Search device kinds..."
                    emptyMessage="No device kind found."
                    width="w-full"
                    allowClear
                    onSearchChange={setKindSearch}
                    shouldFilter={false}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="categoryId">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(field: any) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field>
                  <FieldLabel htmlFor={field.name} required>
                    Category
                  </FieldLabel>
                  <ComboBox
                    options={categoryOptions}
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value ?? '')}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                    emptyMessage="No category found."
                    width="w-full"
                    allowClear
                    isLoading={isLoadingCategories}
                    hasMore={hasNextPage ?? false}
                    onLoadMore={() => fetchNextPage()}
                    onSearchChange={setCategorySearch}
                    shouldFilter={false}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>
      </div>
    </div>
  );
}
