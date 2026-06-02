declare module "earcut" {
  export default function earcut(
    data: number[] | Float64Array | Float32Array,
    holeIndices?: number[] | null,
    dim?: number,
  ): number[];
}
