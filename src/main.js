import * as util from './util.js'
import vertexSource from './marble.vert'
import fragmentSource from './marble.frag'

import loop from 'raf-loop'
import drawTriangle from 'a-big-triangle'
import createShader from 'gl-shader'
import createTexture from 'gl-texture2d'
import createFBO from 'gl-fbo'
import { vec2 } from 'gl-matrix'
import ControlKit from 'controlkit'
import Stats from 'stats.js'
import shuffle from 'lodash.shuffle'

// Smoothing value for animating drops when they are created.
const viscosity = 5

// This needs to match MAX_OPS in marble.frag
const maxOperations = 32

// Create a new stats object for debugging.
const stats = new Stats()

// Add debug options to the window so you can access them from the developer console.
window.debugOptions = {
  showStats: () => {
    stats.showPanel(1)
    document.body.appendChild(stats.dom)
  },
  background: true,
  foreground: true,
}

// Create an object to hold GUI control options.
const options = {
  operationPalette: ['drop-small', 'drop-large', 'spray-small', 'spray-large', 'comb-small', 'comb-large', 'smudge'],
  colorPalette: ['#5EC88D', '#2AA4BF', '#5558E8', '#551297', '#B41C29', '#EA663D', '#F6D364']
}

options.color = options.colorPalette[0]
options.operation = options.operationPalette[0]

// Initialize the controls.
const controls = new ControlKit()
const panel = controls.addPanel({ width: 250 })
panel.addSelect(options, 'operationPalette', { label: 'Tool', target: 'operation' })
panel.addColor(options, 'color', { label: 'Color', colorMode: 'hex', presets: 'colorPalette', })
panel.addButton('reset', reset)
panel.addButton('info', () => {
  window.location.href = 'https://glitch.com/~marbled-paper'
})

// For storing the mouse coordinates.
let mouse = vec2.create()

// For storing whether the left mouse button is currently held down.
let isMouseDown = false

// Operation data to send to the shader describing the most recently added operations
let operations = []

// Initialize canvas and GL context.
const canvas = document.querySelector('#render-canvas')
const gl = util.getGLContext(canvas)

canvas.width = 1024
canvas.height = 1024

let bounds = canvas.getBoundingClientRect()

// Initialize the shader.
const shader = createShader(gl, vertexSource, fragmentSource)
shader.bind()
shader.uniforms.operationCount = operations.length
shader.uniforms.resolution = [canvas.width, canvas.height]

// Create some framebuffers. The active framebuffer's texture is sent to the shader to be used as a background.
// Old operations that get pushed out of the operations array get drawn to the background so they don't disappear.
const framebuffers = [
  createFBO(gl, [canvas.width, canvas.height], { depth: false }),
  createFBO(gl, [canvas.width, canvas.height], { depth: false })
]

// Index of the active framebuffer.
let framebufferIndex = 0

// An empty texture to replace the background for debugging.
const emptyTexture = createTexture(gl, [canvas.width, canvas.height])

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
  }
}

/*
  Replace the oldest operation with a new blank one, and draw the old one to the background.
*/
function shiftOperations() {
  
  // Cycle operations.
  const op = operations.pop()
  operations.unshift(op)

  // Swap framebuffers.
  const previous = framebuffers[framebufferIndex]
  const next = framebuffers[framebufferIndex ^= 1]
  
  // Draw the old operation to the background.
  next.bind()
  shader.uniforms.backgroundTexture = previous.color[0].bind()
  shader.uniforms.operationCount = 1
  shader.uniforms.operations = operations
  drawTriangle(gl)

  return op
}

/*
  Add a new drop operation.
*/
function addDrop(start, scale) {
  const op = shiftOperations()
  op.type = 0
  op.color = util.toFloatColor(options.color)
  op.start = [...start]
  op.end = [...start]
  op.end[0] += scale
  op.scale = 0
  return op
}

/*
  Add a new comb operation.
*/
function addComb(start, scale) {
  const op = shiftOperations()
  op.type = 1
  op.color = util.toFloatColor(options.color)
  op.start = [...start]
  op.end = [...start]
  op.scale = scale
  return op
}

/*
  Shuffle the colors, clear the canvas and framebuffers, and empty the operations array.
*/
function reset() {
  const palette = shuffle(options.colorPalette)
  options.color = palette[1]

  gl.clearColor(...util.toFloatColor(palette[0]))
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT)

  framebuffers[0].bind()
  gl.clear(gl.COLOR_BUFFER_BIT)
  framebuffers[1].bind()
  gl.clear(gl.COLOR_BUFFER_BIT)

  for (let i = 0; i < maxOperations; i++) {
    operations[i] = createOperation()
  }
}

/*
  Handle mousedown events.
*/
canvas.addEventListener('mousedown', () => {
  if (event.button !== 0) {
    isMouseDown = false
    return
  }

  const position = util.getPositionInBounds(bounds, mouse)

  if (options.operation === 'drop-small') {
    addDrop(position, util.randomInRange(0.025, 0.1))
  } else if (options.operation === 'drop-large') {
    addDrop(position, util.randomInRange(0.1, 0.2))
  } else if (options.operation === 'comb-small') {
    addComb(position, util.randomInRange(0.1, 0.3))
  } else if (options.operation === 'comb-large') {
    addComb(position, util.randomInRange(0.3, 0.6))
  } else if (options.operation === 'smudge') {
    addComb(position, 0)
  }

  isMouseDown = true
})

/*
  Handle mousemove events.
*/
document.addEventListener('mousemove', () => {
  mouse[0] = event.clientX
  mouse[1] = event.clientY

  if (isMouseDown) {
    const op = operations[0]
    const position = util.getPositionInBounds(bounds, mouse)

    if (options.operation === 'comb-small') {
      op.end = position
    } else if (options.operation === 'comb-large') {
      op.end = position
    } else if (options.operation === 'smudge') {
      op.end = position
    }
  }
})

/*
  Handle mousemove events.
*/
document.addEventListener('mouseup', () => {
  isMouseDown = false
})

/*
  Handle resize events.
*/
window.addEventListener('resize', () => {
  bounds = canvas.getBoundingClientRect()
})

/*
  Define the render loop.
*/
const engine = loop(() => {
  stats.begin()
  
  // Spray drops if the mouse is held down and a spray tool is selected.
  if (isMouseDown) {
    const position = util.getPositionInBounds(bounds, mouse)
    const offset = vec2.random(vec2.create(), Math.random())

    if (options.operation === 'spray-small') {
      vec2.scaleAndAdd(position, position, offset, 0.1)
      addDrop(position, util.randomInRange(0.005, 0.015))
    } else if (options.operation === 'spray-large') {
      vec2.scaleAndAdd(position, position, offset, 0.3)
      addDrop(position, util.randomInRange(0.01, 0.02))
    }
  }

  // Animate the scale of each drop animation up to 1.
  for (let op of operations) {
    if (op.type === 0) {
      op.scale += (1 - op.scale) / viscosity
    }
  }

  // Fill the entire canvas with the output of the shader.
  util.unbindFBO(gl)
  shader.uniforms.backgroundTexture = window.debugOptions.background ? framebuffers[framebufferIndex].color[0].bind() : emptyTexture.bind()
  shader.uniforms.operationCount = window.debugOptions.foreground ? operations.length : 0
  shader.uniforms.operations = operations
  drawTriangle(gl)
  
  stats.end()
})


// Let's go!
reset()
engine.start()
