declare module "cubejs" {
  export default class Cube {
    static initSolver(): void;
    static fromString(facelets: string): Cube;
    cp: number[];
    co: number[];
    ep: number[];
    eo: number[];
    solve(): string;
    move(arg: string): this;
    isSolved(): boolean;
  }
}
