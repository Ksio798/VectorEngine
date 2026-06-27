export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export interface Point2D {
  x: number;
  y: number;
}

export const EPS = 1e-10;

export const mat3 = {
  /**
   * Единичная матрица.
   * Она не меняет точку или фигуру.
   */
  identity(): Mat3 {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
  },

  /**
   * Умножение двух матриц 3x3.
   * Формат хранения: row-major.
   *
   * result = a * b
   */
  multiply(a: Mat3, b: Mat3): Mat3 {
    const result: Mat3 = [
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;

        for (let k = 0; k < 3; k++) {
          sum += a[r * 3 + k] * b[k * 3 + c];
        }

        result[r * 3 + c] = sum;
      }
    }

    return result;
  },

  /**
   * Матрица перемещения.
   *
   * tx – смещение по X
   * ty – смещение по Y
   */
  translate(tx: number, ty: number): Mat3 {
    return [
      1, 0, tx,
      0, 1, ty,
      0, 0, 1,
    ];
  },

  /**
   * Матрица масштабирования.
   *
   * sx – масштаб по X
   * sy – масштаб по Y
   */
  scale(sx: number, sy: number): Mat3 {
    return [
      sx, 0,  0,
      0,  sy, 0,
      0,  0,  1,
    ];
  },

  /**
   * Матрица поворота.
   *
   * rad – угол в радианах
   */
  rotate(rad: number): Mat3 {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return [
      cos, -sin, 0,
      sin,  cos, 0,
      0,    0,   1,
    ];
  },

  /**
   * Собирает итоговую матрицу трансформации.
   *
   * Порядок:
   * 1. scale
   * 2. rotate
   * 3. translate
   *
   * Математически:
   * M = T * R * S
   */
  fromTransform(
    tx: number,
    ty: number,
    rotationRad: number,
    sx: number,
    sy: number
  ): Mat3 {
    const t = mat3.translate(tx, ty);
    const r = mat3.rotate(rotationRad);
    const s = mat3.scale(sx, sy);

    return mat3.multiply(t, mat3.multiply(r, s));
  },

  /**
   * Применяет матрицу к точке.
   *
   * x' = m00 * x + m01 * y + m02
   * y' = m10 * x + m11 * y + m12
   */
  transformPoint(m: Mat3, x: number, y: number): Point2D {
    return {
      x: m[0] * x + m[1] * y + m[2],
      y: m[3] * x + m[4] * y + m[5],
    };
  },

  /**
   * Инвертирует аффинную матрицу 3x3.
   *
   * Работает для матриц вида:
   * [ a, b, tx ]
   * [ c, d, ty ]
   * [ 0, 0, 1  ]
   *
   * Если матрица вырожденная, возвращает null.
   */
  invert(m: Mat3): Mat3 | null {
    const a = m[0];
    const b = m[1];
    const tx = m[2];

    const c = m[3];
    const d = m[4];
    const ty = m[5];

    const det = a * d - b * c;

    if (Math.abs(det) < EPS) {
      return null;
    }

    const invDet = 1 / det;

    return [
      d * invDet,
      -b * invDet,
      (b * ty - d * tx) * invDet,

      -c * invDet,
      a * invDet,
      (c * tx - a * ty) * invDet,

      0,
      0,
      1,
    ];
  },
};