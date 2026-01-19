import type { LabItem } from '../types';
import ContinueLabSessionButton from './buttons/continue-lab-session-button';
import StartLabSessionButton from './buttons/start-lab-session-button';
import StopLabSessionButton from './buttons/stop-lab-session-button';

function StudentLabActionsCell({ lab }: { lab: LabItem }) {
  if (lab.sessionId) {
    return (
      <div className="flex items-center justify-center gap-1">
        <ContinueLabSessionButton sessionId={lab.sessionId} />
        <StopLabSessionButton lab={lab} />
      </div>
    );
  }

  return <StartLabSessionButton lab={lab} />;
}

export default StudentLabActionsCell;
