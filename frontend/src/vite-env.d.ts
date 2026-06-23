/// <reference types="vite/client" />

declare const __GIT_COMMIT__: string

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}
