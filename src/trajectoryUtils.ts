import CubicSpline from "cubic-spline-ts";

export type Point = {
  ts: number;
  x: number;
  y: number;
  z: number;
  type: "node" | "pred" | "spline";
};

export class TrajectoryInterpolator {
  private points: Point[];
  private nodes: Point[];
  private preds: Point[];
  private startTs: number;
  private endTs: number;

  constructor(points: Point[], setp = 0.02) {
    // 合并并清洗数据
    this.points = this.cleanData(points);
    this.nodes = this.points.filter((item) => item.type === "node");
    this.preds = this.points.filter((item) => item.type === "pred");
    this.points.sort((a, b) => a.ts - b.ts);
    this.startTs = this.nodes[this.nodes.length - 1].ts;
    this.endTs = this.preds[0].ts;
  }

  /** 数据清洗：去重、排序、检查严格递增 */
  private cleanData(data: Point[]): Point[] {
    const uniqueMap = new Map<number, Point>();
    data.forEach((p) => uniqueMap.set(p.ts, p));

    const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.ts - b.ts);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].ts <= sorted[i - 1].ts) {
        throw new Error("时间序列 ts 不严格递增");
      }
    }
    return sorted;
  }

  interpolateMissRange(): Point[] {
    const missingRange: number[] = [];
    for (let t = this.startTs; t <= this.endTs; t += 0.5) {
      missingRange.push(t);
    }
    return this.interpolate(missingRange);
  }

  /** 插值缺失区间 */
  interpolate(missingRange: number[]): Point[] {
    const ts = this.points.map((p) => p.ts);
    const xs = this.points.map((p) => p.x);
    const ys = this.points.map((p) => p.y);
    const zs = this.points.map((p) => p.z);

    const fX = new CubicSpline(ts, xs);
    const fY = new CubicSpline(ts, ys);
    const fZ = new CubicSpline(ts, zs);

    const missingPoints = missingRange.map((t) => ({
      ts: t,
      x: fX.at(t),
      y: fY.at(t),
      z: fZ.at(t),
      type: "spline" as const,
    }));
    return missingPoints;
  }

  // /** 构造三次样条插值函数 */
  // private cubicSpline(xs: number[], ys: number[]): (t: number) => number {
  //   const n = xs.length;
  //   const a = ys.slice();
  //   const b = new Array(n - 1).fill(0);
  //   const d = new Array(n - 1).fill(0);
  //   const h = new Array(n - 1);

  //   for (let i = 0; i < n - 1; i++) {
  //     h[i] = xs[i + 1] - xs[i];
  //   }

  //   const alpha = new Array(n - 1).fill(0);
  //   for (let i = 1; i < n - 1; i++) {
  //     alpha[i] =
  //       (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
  //   }

  //   const c = new Array(n).fill(0);
  //   const l = new Array(n).fill(0);
  //   const mu = new Array(n).fill(0);
  //   const z = new Array(n).fill(0);

  //   l[0] = 1;
  //   mu[0] = 0;
  //   z[0] = 0;

  //   for (let i = 1; i < n - 1; i++) {
  //     l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
  //     mu[i] = h[i] / l[i];
  //     z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  //   }

  //   l[n - 1] = 1;
  //   z[n - 1] = 0;
  //   c[n - 1] = 0;

  //   for (let j = n - 2; j >= 0; j--) {
  //     c[j] = z[j] - mu[j] * c[j + 1];
  //     b[j] = (a[j + 1] - a[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
  //     d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  //   }

  //   return (t: number): number => {
  //     if (t < xs[0] || t > xs[n - 1]) {
  //       throw new Error("超出插值范围");
  //     }
  //     let i = xs.findIndex((x, idx) => t < xs[idx + 1]) - 1;
  //     if (i < 0) i = n - 2;
  //     const dt = t - xs[i];
  //     return a[i] + b[i] * dt + c[i] * dt * dt + d[i] * dt * dt * dt;
  //   };
  // }

  /** 合并所有点 */
  getFullTrajectory(missingRange: number[]): Point[] {
    const missing = this.interpolate(missingRange);
    const all = [...this.points, ...missing].sort((a, b) => a.ts - b.ts);

    // 物理约束检查
    if (all.some((p) => p.z < 0)) {
      console.warn("警告：部分 Z 值为负数，可能不符合物理约束！");
    }
    return all;
  }

  /** 合并所有点 */
  getFullMissTrajectory(): Point[] {
    const missingRange: number[] = [];
    for (let t = this.startTs; t <= this.endTs; t += 0.5) {
      missingRange.push(t);
    }
    return this.getFullTrajectory(missingRange);
  }
}

// // ================== 使用示例 ==================
// const tStart = Array.from({ length: 60 }, (_, i) => i);
// const tEnd = Array.from({ length: 20 }, (_, i) => i + 80);

// const startPoints: Point[] = tStart.map((t) => ({
//   ts: t,
//   x: Math.sin(t / 10),
//   y: Math.cos(t / 10),
//   z: Math.max(0, 10 - (t % 20)), // 模拟高度
// }));

// const endPoints: Point[] = tEnd.map((t) => ({
//   ts: t,
//   x: Math.sin(t / 10),
//   y: Math.cos(t / 10),
//   z: Math.max(0, 10 - (t % 20)),
// }));

// const interpolator = new TrajectoryInterpolator(startPoints, endPoints);
// const fullTrajectory = interpolator.getFullTrajectory(
//   Array.from({ length: 20 }, (_, i) => i + 60) // 缺失区间 [60..79]
// );

// console.log(fullTrajectory);
