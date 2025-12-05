import { Button } from '@frontend/components/ui/button';
import { useRouteContext } from '@tanstack/react-router';

function TestConnectionButton() {
  const send = useRouteContext({
    from: '__root__',
    select: (ctx) => ctx.ws.send,
  });

  const handleTestDevice = () => {
    send(
      'device/test',
      {
        name: 'test',
        kind: 'mikrotik_ros',
        image: 'test-image',
        env: {},
        resources: {},
        connection: {
          type: 'ssh',
          data: {
            port: 22,
          },
        },
        interfaces: [],
      },
      {
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
      },
    );
  };

  return (
    <Button onClick={handleTestDevice} type="button">
      TestConnectionButton
    </Button>
  );
}

export default TestConnectionButton;
