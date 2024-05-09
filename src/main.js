import * as util from "./util.js";
import vertexSource from "./marble.vert";
import fragmentSource from "./marble.frag";

import loop from "raf-loop";
import drawTriangle from "a-big-triangle";
import createShader from "gl-shader";
import createTexture from "gl-texture2d";
import createFBO from "gl-fbo";
import { vec2 } from "gl-matrix";
import ControlKit from "controlkit";
import Stats from "stats.js";
import shuffle from "lodash.shuffle";
import { getData, getDataFromLocalJson } from "./data.js";

// For storing the mouse coordinates.
let mouse = vec2.create();

// For storing whether the left mouse button is currently held down.
let isMouseDown = false;

// Operation data to send to the shader describing the most recently added operations
let operations = [];

// Initialize canvas and GL context.
const canvas = document.querySelector("#render-canvas");
const gl = util.getGLContext(canvas);

canvas.width = 1024;
canvas.height = 1024;

let bounds = canvas.getBoundingClientRect();

// Initialize the shader.
const shader = createShader(gl, vertexSource, fragmentSource);
shader.bind();
shader.uniforms.operationCount = operations.length;
shader.uniforms.resolution = [canvas.width, canvas.height];

// Create some framebuffers. The active framebuffer's texture is sent to the shader to be used as a background.
// Old operations that get pushed out of the operations array get drawn to the background so they don't disappear.
const framebuffers = [
  createFBO(gl, [canvas.width, canvas.height], { depth: false }),
  createFBO(gl, [canvas.width, canvas.height], { depth: false }),
];

// Index of the active framebuffer.
let framebufferIndex = 0;

// An empty texture to replace the background for debugging.
const emptyTexture = createTexture(gl, [canvas.width, canvas.height]);
// Load the data from the local JSON file.
// collect the data into a map
const data = getDataFromLocalJson();
const img_paths = new Map();
data.forEach((obj) => {
  if (!img_paths.has(obj.imageUrl)) {
    img_paths.set(obj.imageUrl, []);
  }
  img_paths.get(obj.imageUrl).push(obj);
});
const img_urls = Array.from(img_paths.keys());
// console.log(img_urls);

let affectColors = [
  "rgb(157,246,76)",

  "rgb(37,176,21)",

  "rgb(116,249,251)",

  "rgb(27,60,241)",

  "rgb(114,20,241)",

  "rgb(229,50,190)",

  "rgb(233,51,35)",

  "rgb(240,196,66)",
];

let affectColorsHex = [
  "#9df64c",
  "#25b015",
  "#74f9fb",
  "#1b3cf1",
  "#7214f1",
  "#e532be",
  "#e93323",
  "#f0c442",
];

var affectList = [
  "hopeful",

  "happy",

  "fearful",

  "bored",

  "sad",

  "disgusted",

  "angry",

  "interested",
];

const label_hex = new Map();

for (let i = 0; i < affectList.length; i++) {
  label_hex.set(affectList[i], affectColorsHex[i]);
}

// Smoothing value for animating drops when they are created.
const viscosity = 5;

// This needs to match MAX_OPS in marble.frag
const maxOperations = 32;

// Create a new stats object for debugging.
const stats = new Stats();

// Add debug options to the window so you can access them from the developer console.
window.debugOptions = {
  showStats: () => {
    stats.showPanel(1);
    document.body.appendChild(stats.dom);
  },
  background: true,
  foreground: true,
};

// Create an object to hold GUI control options.
const options = {
  operationPalette: [
    "drop-small",
    "drop-large",
    "spray-small",
    "spray-large",
    "comb-small",
    "comb-large",
    "smudge",
  ],
  colorPalette: [
    "#5EC88D",
    "#2AA4BF",
    "#5558E8",
    "#551297",
    "#B41C29",
    "#EA663D",
    "#F6D364",
  ],
  imageURL: img_urls,
  // combFrequency: 1,
};

options.color = options.colorPalette[0];
options.operation = options.operationPalette[0];
options.image = options.imageURL[0];
options.combObj = { combFreq: 0.5, combScale: 0.5, range: [0, 1] };
options.dropScale = { dropScale: 0.1, range: [0, 0.5] };
options.pathSoomthness = { pathSoomthness: 100, range: [1, 1000] };

function adjustOrdinates(point) {
  const [x, y] = point;
  const nx = (x * bounds.width) / 800;
  const ny = (y * bounds.height) / 800;
  const res = [nx + bounds.left, ny + bounds.top];
  // console.log(res);
  return res;
}
// Initialize the controls.
const controls = new ControlKit();
const panel = controls.addPanel({ width: 250 });
panel.addSelect(options, "operationPalette", {
  label: "Tool",
  target: "operation",
});
panel.addColor(options, "color", {
  label: "Color",
  colorMode: "hex",
  presets: "colorPalette",
});

panel.addSlider(options.combObj, "combFreq", "range");
panel.addSlider(options.combObj, "combScale", "range");
panel.addSlider(options.dropScale, "dropScale", "range");
panel.addSlider(options.pathSoomthness, "pathSoomthness", "range");
panel.addSelect(options, "imageURL", {
  label: "ImageURL",
  onChange: (value) => {
    reset();
    console.log(options.imageURL[value]);
    const paths = img_paths.get(options.imageURL[value]);
    // const url = options.image;
    // const paths = img_paths.get(url);
    // console.log(paths);
    let timeout = 0;
    for (let i = 0; i < paths.length; i++) {
      // draw each path
      const path = paths[i];
      console.log(path);
      const intensity = path.intensity;
      const interval = path.duration;
      const color = label_hex.get(path.label);

      const curve = path.path;
      const start = curve[0];

      // addDrop at the first point
      // addComb at the first point
      setTimeout(() => {
        mouse = adjustOrdinates([start.x, start.y]);
        options.color = color;
        let position = util.getPositionInBounds(bounds, mouse);
        addDrop(position, options.dropScale.dropScale * intensity);
        // position = util.getPositionInBounds(bounds, mouse);
        // addComb(position, options.combObj.combFreq);
      }, timeout);

      for (let j = 1; j < curve.length; j++) {
        const prev = curve[j - 1];
        const cur = curve[j];
        timeout += options.pathSoomthness.pathSoomthness;
        setTimeout(() => {
          mouse = adjustOrdinates([prev.x, prev.y]);
          let position = util.getPositionInBounds(bounds, mouse);
          addComb(position, options.combObj.combFreq);
          mouse = adjustOrdinates([cur.x, cur.y]);
          const op = operations[0];
          position = util.getPositionInBounds(bounds, mouse);
          op.end = position;
        }, timeout);
      }

      // const end = curve[curve.length - 1];

      // // console.log(end);

      // setTimeout(() => {
      //   // mouse = [end.x, end.y];
      //   mouse = adjustOrdinates([end.x, end.y]);
      //   options.color = color;
      //   let position = util.getPositionInBounds(bounds, mouse);
      //   addDrop(position, 0.1 * intensity);
      //   mouse = adjustOrdinates([start.x, start.y]);
      //   position = util.getPositionInBounds(bounds, mouse);
      //   addComb(position, options.combObj.combFreq);
      // }, 3000 * i);

      // // make the comb smooth
      // const slope = (end.y - start.y) / (end.x - start.x);
      // const temp_end_x =
      //   options.combObj.combScale * (end.x - start.x) + start.x;
      // // const temp_end_y = slope * (temp_end_x - start.x) + start.y;
      // // start from the start point of the path
      // const samples = interval / 100;
      // for (let j = 0; j < samples; j++) {
      //   const x = start.x + (temp_end_x - start.x) * (j / samples);
      //   const y = start.y + slope * (x - start.x);
      //   setTimeout(() => {
      //     // mouse = [x, y];
      //     mouse = adjustOrdinates([x, y]);
      //     const op = operations[0];
      //     const position = util.getPositionInBounds(bounds, mouse);
      //     op.end = position;
      //   }, 3000 * i + 500 + (2400 / interval) * j);
      // }
    }
  },
});
panel.addButton("reset", reset);
panel.addButton("info", () => {
  window.location.href = "https://glitch.com/~marbled-paper";
});

/*
  Create a new operation object.
*/
function createOperation() {
  return {
    type: -1,
    color: [0, 0, 0, 0],
    start: [0, 0],
    end: [0, 0],
    scale: 0,
  };
}

/*
  Replace the oldest operation with a new blank one, and draw the old one to the background.
*/
function shiftOperations() {
  // Cycle operations.
  const op = operations.pop();
  operations.unshift(op);

  // Swap framebuffers.
  const previous = framebuffers[framebufferIndex];
  const next = framebuffers[(framebufferIndex ^= 1)];

  // Draw the old operation to the background.
  next.bind();
  shader.uniforms.backgroundTexture = previous.color[0].bind();
  shader.uniforms.operationCount = 1;
  shader.uniforms.operations = operations;
  drawTriangle(gl);

  return op;
}

/*
  Add a new drop operation.
*/
function addDrop(start, scale) {
  const op = shiftOperations();
  op.type = 0;
  op.color = util.toFloatColor(options.color);
  op.start = [...start];
  op.end = [...start];
  op.end[0] += scale;
  op.scale = 0;
  return op;
}

/*
  Add a new comb operation.
*/
function addComb(start, scale) {
  const op = shiftOperations();
  op.type = 1;
  op.color = util.toFloatColor(options.color);
  op.start = [...start];
  op.end = [...start];
  op.scale = scale;
  return op;
}

/*
  Shuffle the colors, clear the canvas and framebuffers, and empty the operations array.
*/
function reset() {
  const palette = shuffle(options.colorPalette);
  options.color = palette[1];

  const images = shuffle(options.imageURL);
  options.image = images[1];

  gl.clearColor(...util.toFloatColor("#000000")); // fix the bg color to be black
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  framebuffers[0].bind();
  gl.clear(gl.COLOR_BUFFER_BIT);
  framebuffers[1].bind();
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (let i = 0; i < maxOperations; i++) {
    operations[i] = createOperation();
  }
}

/*
  Handle mousedown events.
*/
canvas.addEventListener("mousedown", (e) => {
  if (event.button !== 0) {
    isMouseDown = false;
    return;
  }
  // console.log(e);

  const position = util.getPositionInBounds(bounds, mouse);
  // console.log(position);

  if (options.operation === "drop-small") {
    addDrop(position, util.randomInRange(0.025, 0.1));
  } else if (options.operation === "drop-large") {
    addDrop(position, util.randomInRange(0.1, 0.2));
  } else if (options.operation === "comb-small") {
    addComb(position, util.randomInRange(0.1, 0.3));
  } else if (options.operation === "comb-large") {
    addComb(position, util.randomInRange(3, 6));
  } else if (options.operation === "smudge") {
    addComb(position, 0);
  }

  isMouseDown = true;
});

/*
  Handle mousemove events.
*/
document.addEventListener("mousemove", () => {
  mouse[0] = event.clientX;
  mouse[1] = event.clientY;

  if (isMouseDown) {
    const op = operations[0];
    const position = util.getPositionInBounds(bounds, mouse);

    if (options.operation === "comb-small") {
      op.end = position;
    } else if (options.operation === "comb-large") {
      op.end = position;
    } else if (options.operation === "smudge") {
      op.end = position;
    }
  }
});

/*
  Handle mousemove events.
*/
document.addEventListener("mouseup", () => {
  isMouseDown = false;
});

/*
  Handle resize events.
*/
window.addEventListener("resize", () => {
  bounds = canvas.getBoundingClientRect();
});

/*
  Define the render loop.
*/
const engine = loop(() => {
  stats.begin();

  // Spray drops if the mouse is held down and a spray tool is selected.
  if (isMouseDown) {
    const position = util.getPositionInBounds(bounds, mouse);
    const offset = vec2.random(vec2.create(), Math.random());

    if (options.operation === "spray-small") {
      vec2.scaleAndAdd(position, position, offset, 0.1);
      addDrop(position, util.randomInRange(0.005, 0.015));
    } else if (options.operation === "spray-large") {
      vec2.scaleAndAdd(position, position, offset, 0.3);
      addDrop(position, util.randomInRange(0.01, 0.02));
    }
  }

  // Animate the scale of each drop animation up to 1.
  for (let op of operations) {
    if (op.type === 0) {
      op.scale += (1 - op.scale) / viscosity;
    }
  }

  // Fill the entire canvas with the output of the shader.
  util.unbindFBO(gl);
  shader.uniforms.backgroundTexture = window.debugOptions.background
    ? framebuffers[framebufferIndex].color[0].bind()
    : emptyTexture.bind();
  shader.uniforms.operationCount = window.debugOptions.foreground
    ? operations.length
    : 0;
  shader.uniforms.operations = operations;
  drawTriangle(gl);

  stats.end();
});

// Let's go!
reset();

// hard code: visiualization for the iamgeUrl:
// const url =
//   "https://image-affect.s3.ca-central-1.amazonaws.com/lsw68fia4lku08bw3xm";
// const paths = img_paths.get(url);
// // const url = options.image;
// // const paths = img_paths.get(url);
// // console.log(paths);
// for (let i = 0; i < paths.length; i++) {
//   // draw each path
//   const path = paths[i];
//   console.log(path);
//   const intensity = path.intensity;
//   const interval = path.duration;
//   const color = label_hex.get(path.label);

//   const curve = path.path;
//   const end = curve[curve.length - 1];
//   const start = curve[0];

//   // console.log(end);

//   setTimeout(() => {
//     mouse = [end.x, end.y];
//     options.color = color;
//     const position = util.getPositionInBounds(bounds, mouse);
//     addDrop(position, 0.1 * intensity);
//     addComb(position, 0.1 * intensity);
//   }, 3000 * i);

//   // make the comb smooth
//   const slope = (end.y - start.y) / (end.x - start.x);
//   // start from the end point of the path
//   const samples = interval / 100;
//   for (let j = 0; j < samples; j++) {
//     const x = end.x + (start.x - end.x) * (j / samples);
//     const y = end.y + slope * (x - end.x);
//     setTimeout(() => {
//       mouse = [x, y];
//       const op = operations[0];
//       const position = util.getPositionInBounds(bounds, mouse);
//       op.end = position;
//     }, 3000 * i + 1000 + (interval * j) / 2000);
//   }
// }

// const clickEvent = new MouseEvent("mousedown", {
//   screenX: 600,
//   screenY: 600,
// });
// mouse = [600, 600];
// canvas.dispatchEvent(clickEvent);
// setTimeout(() => {
//   mouse = [500, 500];
//   canvas.dispatchEvent(clickEvent);
// }, 2000);
// mouse = [200, 200];

// const clickEvent2 = new MouseEvent("mouseup", {
//   screenX: 600,
//   screenY: 600,
// });
// canvas.dispatchEvent(clickEvent2);

engine.start();
