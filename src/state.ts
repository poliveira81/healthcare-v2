/**
 * This file implements a state machine to manage the asynchronous app generation and deployment process.
 */

// The various states the generation and deployment process can be in.
export type ProcessState =
  | 'idle'
  | 'generating_queued'
  | 'generating_in_progress'
  | 'generation_complete'
  | 'publishing_in_progress'
  | 'publishing_complete'
  | 'error';

// The events that can cause a state transition.
export type ProcessEvent =
  | 'START_GENERATION'
  | 'GENERATION_STARTED'
  | 'GENERATION_FINISHED'
  | 'START_PUBLISHING'
  | 'PUBLISHING_FINISHED'
  | 'RESET'
  | 'FAIL';

// A simple data store for the state machine to hold relevant IDs.
export interface StateMachineData {
  appId?: string;
  deploymentId?: string;
  appUrl?: string;
  error?: string;
}

class StateMachine {
  public currentState: ProcessState = 'idle';
  private data: StateMachineData = {};

  // Defines the valid transitions between states.
  private transitions: Record<ProcessState, Partial<Record<ProcessEvent, ProcessState>>> = {
    idle: { START_GENERATION: 'generating_queued' },
    generating_queued: { GENERATION_STARTED: 'generating_in_progress', FAIL: 'error' },
    generating_in_progress: { GENERATION_FINISHED: 'generation_complete', FAIL: 'error' },
    generation_complete: { START_PUBLISHING: 'publishing_in_progress', FAIL: 'error' },
    publishing_in_progress: { PUBLISHING_FINISHED: 'publishing_complete', FAIL: 'error' },
    publishing_complete: { RESET: 'idle' },
    error: { RESET: 'idle' },
  };

  /**
   * Transitions the state machine to a new state based on an event.
   * @param event The event that triggers the transition.
   */
  public transition(event: ProcessEvent): void {
    const nextState = this.transitions[this.currentState]?.[event];
    if (nextState) {
      this.currentState = nextState;
      console.log(`State transitioned to: ${this.currentState}`);
      // Reset data when the process is reset from a final or error state.
      if (event === 'RESET') {
        this.data = {};
      }
    } else {
      console.warn(`Invalid transition from ${this.currentState} with event ${event}`);
    }
  }

  /**
   * Stores data related to the current process.
   * @param data The data to store.
   */
  public setData(data: Partial<StateMachineData>): void {
    this.data = { ...this.data, ...data };
  }

  /**
   * Retrieves the currently stored data.
   */
  public getData(): StateMachineData {
    return this.data;
  }
}

// Export a singleton instance of the state machine.
export const stateMachine = new StateMachine();
