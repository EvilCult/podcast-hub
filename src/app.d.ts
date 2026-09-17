// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }
}
declare module 'aplayer' {
    const APlayer: any;
    export default APlayer;
}

declare module 'APlayer' {
    const APlayer: any;
    export default APlayer;
}

export {};
