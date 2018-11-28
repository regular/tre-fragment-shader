const h = require('mutant/html-element')
const RenderShader = require('.')
require('brace/theme/solarized_dark')

const vertexShader = `
precision mediump float;
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragmentShader = `
precision mediump float;
varying vec2 uv;
void main() {
  gl_FragColor = vec4(uv, 0, 1);
}
`
const renderShader = RenderShader({
  ace_theme: 'ace/theme/solarized_dark'
})

const kv = {
  key: 'fake_key',
  value: {
    content: {
      vertexShader,
      fragmentShader 
    }
  }
}

document.body.appendChild(
  renderShader(kv, {
    where: 'editor'
  })
)
