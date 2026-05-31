export type InputType = 'enter' | 'yn' | 'scale' | 'choice'

export interface Prompt {
  headline: string | null
  text: string
  input_type: InputType
  choices: string[] | null
}

export interface StepRequest {
  script: string
  answers: string[]
}

export interface ExceptionType {
  name: string
  label: string
}

export interface ExceptionInfo {
  name: string
  label: string
  note: string
}

export interface StepResponse {
  prompt: Prompt | null
  done: boolean
  error: string | null
  exception: ExceptionInfo | null
}

export interface RunnerState {
  script: string
  answers: string[]
  currentPrompt: Prompt | null
  done: boolean
}

export interface LogEntry {
  timestamp: number
  stepIndex: number
  prompt: Prompt
  answer: string
  decision?: 'continue' | 'stop'
}
