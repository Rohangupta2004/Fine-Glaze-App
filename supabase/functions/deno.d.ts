// Deno typings for IDE TypeScript Server compatibility in mixed Node/Deno codebase
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Response | Promise<Response>, options?: any): void;
}

declare module "https://*" {
  export const serve: any;
  export const createClient: any;
  export const utils: any;
  export const write: any;
  const _default: any;
  export default _default;
}
