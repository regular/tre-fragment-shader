const h = require('mutant/html-element')
const RenderShader = require('.')
require('brace/theme/solarized_dark')

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
      fragmentShader 
    }
  }
}

document.body.appendChild(
  renderShader(kv, {
    where: 'editor'
  })
)
