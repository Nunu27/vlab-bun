import type { LabItem } from '../../student-columns';
import { ContinueSessionButton } from './continue-session-button';
import { StartSessionButton } from './start-session-button';
import { StopSessionButton } from './stop-session-button';

export function StudentLabActions({ lab }: { lab: LabItem }) {
  if (lab.sessionId) {
    return (
      <div className="flex gap-2">
        <ContinueSessionButton lab={lab} />
        <StopSessionButton lab={lab} />
      </div>
    );
  }

  return <StartSessionButton lab={lab} />;
}
