import hexRgb from 'hex-rgb'

export function getGLContext(canvas) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

    if (!gl) {
      throw Error('Unable to initialize WebGL. Maybe your browser doesn\'t support it.')
    }

    return gl
}

export function getPositionInBounds(bounds, position) {
    const [x, y] = position
    const nx = (x - bounds.left) / bounds.width
    const ny = -(y - bounds.bottom) / bounds.height
    return [nx, ny]
}

export function randomInRange(min, max) {
    return Math.random() * (max - min) + min
}

export function toFloatColor(c) {
  return hexRgb(c, {format: 'array'}).map(x => x / 255)
}

export function unbindFBO(gl) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}
