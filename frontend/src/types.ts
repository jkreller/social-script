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

export interface StepResponse {
  prompt: Prompt | null
  done: boolean
  error: string | null
}

export interface RunnerState {
  script: string
  answers: string[]
  currentPrompt: Prompt | null
  done: boolean
}
