import AppLoadingPage from '@frontend/components/pages/app-loading-page';
import { Button } from '@frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@frontend/components/ui/card';
import { Field, FieldGroup } from '@frontend/components/ui/field';
import { useAppForm } from '@frontend/hooks/use-app-form';
import { guestRoute } from '@frontend/lib/middlewares';
import { useAuthStore } from '@frontend/stores/auth-store';
import { Compile } from '@sinclair/typemap';
import { createFileRoute } from '@tanstack/react-router';
import { LoginRequest } from '@vlab/shared/schemas';
import { FlaskConicalIcon } from 'lucide-react';

const validator = Compile(LoginRequest);

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Login - vLab' }] }),
  beforeLoad: guestRoute(),
  pendingComponent: AppLoadingPage,
  component: RouteComponent,
});

function RouteComponent() {
  const { login } = useAuthStore.use.actions();

  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: { onSubmit: validator },
    onSubmit: ({ value }) => login(value),
  });

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-4 text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl font-bold">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FlaskConicalIcon className="size-4" />
                </div>
                vLab
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit();
                }}
              >
                <FieldGroup>
                  <form.AppField name="email">
                    {(field) => (
                      <field.TextField
                        label="Email"
                        placeholder="m@example.com"
                        required
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="password">
                    {(field) => (
                      <field.TextField
                        label="Password"
                        type="password"
                        required
                      />
                    )}
                  </form.AppField>
                  <form.AppForm>
                    <Field>
                      <form.SubmitButton label="Login" />
                      <Button variant="outline" type="button" asChild>
                        <a href="/api/auth/cas">Login with CAS</a>
                      </Button>
                    </Field>
                  </form.AppForm>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
