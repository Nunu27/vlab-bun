import { PageHeading } from '@frontend/components/page-heading';
import { Button } from '@frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@frontend/components/ui/card';
import { Field, FieldError, FieldLabel } from '@frontend/components/ui/field';
import { Input } from '@frontend/components/ui/input';
import api from '@frontend/lib/api';
import { privateRoute } from '@frontend/lib/middlewares';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import TopologyEditor from './-module/topology';
import { useTopologyStore } from './-module/topology/hook';
import { TopologyProvider } from './-module/topology/provider';

export const Route = createFileRoute('/_dashboard/lab/create')({
  staticData: {
    breadcrumbs: [{ title: 'Labs', url: '/lab' }, { title: 'Create Lab' }],
  },
  beforeLoad: privateRoute(['lecturer']),
  component: CreateLabPage,
});

function CreateLabPage() {
  return (
    <TopologyProvider>
      <CreateLabForm />
    </TopologyProvider>
  );
}

function CreateLabForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const store = useTopologyStore();

  const nodes = store.use.nodes();
  const edges = store.use.edges();
  const { reset } = store.use.actions();

  useEffect(() => {
    reset();
  }, [reset]);

  const createLab = api.lab.post.useMutation({
    onSuccess: ({ message }) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['lab', 'pagination'] });
      navigate({ to: '/lab' });
    },
  });

  const handleSave = () => {
    if (!name) {
      setNameError('Lab name is required');
      return;
    }
    setNameError(null);

    const topology = {
      nodes: nodes.map((node) => {
        const newNode = { ...node };
        delete newNode.selected;
        return newNode;
      }),
      edges: edges.map((edge) => {
        const newEdge = { ...edge };
        delete newEdge.selected;
        return newEdge;
      }),
    };

    createLab.mutate({ name, topology });
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeading title="Create Lab" subtitle="Design your network topology" />

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Lab identification and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Field className="max-w-sm">
              <FieldLabel htmlFor="lab-name" required>
                Lab Name
              </FieldLabel>
              <Input
                type="text"
                id="lab-name"
                placeholder="Enter lab name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value) setNameError(null);
                }}
                aria-invalid={!!nameError}
              />
              {nameError && <FieldError>{nameError}</FieldError>}
            </Field>
          </CardContent>
        </Card>

        {/* Topology Editor */}
        <Card className="flex h-200 flex-col overflow-hidden pb-0">
          <CardHeader className="border-b">
            <CardTitle>Network Topology</CardTitle>
            <CardDescription>
              Drag and drop devices to design the network
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <TopologyEditor />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/lab' })}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createLab.isPending}>
            {createLab.isPending ? 'Creating...' : 'Create Lab'}
          </Button>
        </div>
      </div>
    </div>
  );
}
