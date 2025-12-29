export enum SignalPhase {
  FLATLINE = 'FLATLINE',
  INTERFERENCE = 'INTERFERENCE',
  HARMONY = 'HARMONY',
}

export interface AnimationState {
  phase: SignalPhase;
  text: string;
  subText: string;
  color: string;
}