
export interface BoundingBox {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 normalized range
  label?: string;
}

export interface RedactionResult {
  boxes: BoundingBox[];
}
