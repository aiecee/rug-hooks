export interface CheckerResults {
  name: string;
  success: boolean;
  fails?: Array<string>;
}

export interface RunOptions {
  [option: string]: any;
}

export interface Checker {
  run: (options?: RunOptions) => Promise<CheckerResults>;
}
