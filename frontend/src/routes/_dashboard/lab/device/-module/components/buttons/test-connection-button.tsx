import { Button } from '@frontend/components/ui/button';
import { useRouteContext } from '@tanstack/react-router';
import { withForm, type DeviceFormData } from '../../hooks/use-device-form';

const TestConnectionButton = withForm({
  defaultValues: {} as DeviceFormData,
  render: function Render({ form }) {
    const send = useRouteContext({
      from: '__root__',
      select: (ctx) => ctx.ws.send,
    });

    const handleTestDevice = () => {
      const value = form.state.values;

      send('device/test', value, {
        message: (data) => {
          console.log('Message:', data);
        },
        token: (data) => {
          console.log('Token:', data);
        },
        error: (data) => {
          console.log('Error:', data);
        },
        done: () => {
          console.log('Done');
        },
      });
    };

    return (
      <Button onClick={handleTestDevice} type="button">
        TestConnectionButton
      </Button>
    );
  },
});

export default TestConnectionButton;
