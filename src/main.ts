import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { testData } from "./data";

import { TrajectoryInterpolator } from "./trajectoryUtils";
import type { Point } from "./trajectoryUtils";
import Plotly from "plotly.js-dist-min";
import BSpline from "b-spline";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div id="trajectory-result"></div>
  </div>
`;

// 数据转换
const points = testData.positions.map((p: any) => ({
  ts: p.ts,
  x: p.pos.x,
  y: p.pos.y,
  z: p.pos.z,
  type: p.type,
}));

const degree: number = 3; // 三次 B-spline
const n = points.length - 1;
const knotVector = Array(n + degree + 2)
  .fill(0)
  .map((_, i) => i / (n + degree + 1)); // 均匀节点向量

// 3. 采样曲线
const count: number = 100;
const xs: number[] = [];
const ys: number[] = [];
const zs: number[] = [];

for (let i = 0; i <= count; i++) {
  const t = i / count;
  xs.push(
    BSpline(
      t,
      degree,
      points.map((p) => p.x),
      knotVector
    )
  );
  ys.push(
    BSpline(
      t,
      degree,
      points.map((p) => p.y),
      knotVector
    )
  );
  zs.push(
    BSpline(
      t,
      degree,
      points.map((p) => p.z),
      knotVector
    )
  );
}

// 展示部分结果
const resultDiv = document.getElementById("trajectory-result");

if (resultDiv) {
  // Plotly 3D 散点图
  const trace = {
    x: xs as number[],
    y: ys as number[],
    z: zs as number[],
    mode: "markers+lines",
    type: "scatter3d",
    marker: { size: 3, color: zs, colorscale: "Viridis", opacity: 0.8 },
    line: { color: "rgba(100,100,200,0.5)" },
  };
  const layout = {
    title: "轨迹三维展示",
    autosize: true,
    height: 500,
    margin: { l: 0, r: 0, b: 0, t: 40 },
    scene: {
      xaxis: { title: "X" },
      yaxis: { title: "Y" },
      zaxis: { title: "Z" },
    },
  };
  resultDiv.innerHTML = "";
  const plotDiv = document.createElement("div");
  plotDiv.id = "plotly-trajectory";
  resultDiv.appendChild(plotDiv);
  Plotly.newPlot(plotDiv, [trace], layout);
}
