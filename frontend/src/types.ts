export type InputType = 'enter' | 'yn' | 'scale' | 'choice' | 'text' | 'long_text' | 'enter_structured'

export interface Choice {
  label: string
  description: string | null
}

export interface StructuredItem {
  icon: string
  label: string
  value: string
}

export interface Prompt {
  headline: string | null
  text: string
  input_type: InputType
  choices: Choice[] | null
  items?: StructuredItem[] | null   // enter_structured screens: icon/label/value tiles
  intro?: string | null             // optional lead-in line above the tiles (enter_structured) or the field (text/long_text)
  allow_custom?: boolean   // choice screens: also accept a typed answer
  phase: number
  phase_title: string | null
  phase_description: string | null
}

export interface StepRequest {
  script: string
  answers: string[]
  seed: number
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

export type LogEntry =
  | { type: 'start';            timestamp: number }
  | { type: 'step_show';        timestamp: number; stepIndex: number; prompt: Prompt }
  | { type: 'step_answer';      timestamp: number; stepIndex: number; prompt: Prompt; answer: string }
  | { type: 'exception_select'; timestamp: number; exceptionName: string; exceptionLabel: string }
  | { type: 'exception';        timestamp: number; exceptionName: string; exceptionLabel: string; note: string; decision: 'continue' | 'stop' }
  | { type: 'finish';           timestamp: number }
  | { type: 'clip_start';      timestamp: number; clip: number }
  | { type: 'clip_end';        timestamp: number; clip: number }
