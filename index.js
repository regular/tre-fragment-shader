const h = require('mutant/html-element')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const drawTriangle = require('a-big-triangle')
const createShader = require('gl-shader')
const ace = require('brace')
const setStyle = require('module-styles')('tre-glsl')
require('brace/mode/glsl')

setStyle(`
  .tre-glsl-editor {
    display: grid;
    grid-template-columns: 170px auto;
    grid-template-rows: auto;
    grid-auto-flow: column;
  }
  .tre-glsl-editor pre.editor {
    width: 90%;
    min-height: 200px;
    padding: 0;
    margin: 0;
  }
`)

const vertexShader = `
precision mediump float;
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

module.exports = function RenderShader(opts) {
  opts = opts || {}
  
  function makeCanvas(kv, ctx) {
    const canvas = h('canvas', {
      style: {
        width: '100%',
        height: '100%',
        //position: 'absolute',
        left: 0,
        top: 0
      },
      hooks: [ el => {
        setup(el)
        return cleanup
      }]
    })

    function setup(canvas) {
      const {width, height} = canvas.parentElement.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
      const gl = canvas.getContext('webgl')
      ctx.gl = gl
      createNode(kv, ctx)
      draw(ctx)
    }

    function cleanup(canvas) {
      disposeNode(ctx)
    }

    return canvas
  }
  
  function createNode(kv, ctx) {
    const content = kv.value && kv.value.content || {}
    if (!content) return
    const {fragmentShader} = content
    if (!fragmentShader) return

    ctx.shader = createShader(ctx.gl, vertexShader, fragmentShader)
    console.log('shader type', ctx.shader.type)
  }
  function disposeNode(ctx) {
    ctx.shader.dispose()
    ctx.shader = null
  }

  function draw(ctx) {
    const {gl} = ctx
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, width, height)

    const clearColor = opts.clearColor || [0,0,0,0]
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3])
    gl.clear(gl.COLOR_BUFFER_BIT)

    ctx.shader.bind()
    drawTriangle(ctx.gl)
  }

  return function renderShader(kv, ctx) {
    ctx = ctx || {}
    const content = kv.value && kv.value.content || {}

    if (ctx.where == 'editor') {
      //const code = content.fragmentShader
      const contentObs = ctx.contentObs || Value(content)
      const syntaxError = Value('')
      const fragSrc = computed(contentObs, c => c.fragmentShader)
      const pre = h('pre.editor', fragSrc())

      const editor = ace.edit(pre)
      if (opts.ace_theme) editor.setTheme(opts.ace_theme)
      editor.session.setMode('ace/mode/glsl')

      editor.session.on('change', Changes(editor, ctx, 600, (err, src) => {
        syntaxError.set(err && err.message)
        if (!err) {
          const content = Object.assign({}, contentObs())
          content.fragmentShader = src
          contentObs.set(content)
          draw(ctx)
        }
      }))

      return h('.tre-glsl-editor', [
        h('.canvas-container', {
          style: {
            width: '169px',
            height: '120px'
          }
        }, makeCanvas(kv, ctx)),
        h('div', [
          pre,
          syntaxError
        ])
      ])
    }
    return makeCanvas(kv, ctx)
  }
}

// -- utils

function Changes(editor, ctx, ms, cb) {
  return debounce(ms, ()=>{
    const v = editor.session.getValue() 
    try {
      if (ctx.shader) {
        console.log('Updating shader ...')
        ctx.shader.update(vertexShader, v)
        console.log('... done')
      }
    } catch(err) {
      console.error('... failed', err)
      return cb(err)
    }
    cb(null, v)
  })
}

// TODO: use debounce module
function debounce(ms, f) {
  let timerId

  return function() {
    if (timerId) clearTimeout(timerId)
    timerId = setTimeout(()=>{
      timerid = null
      f()
    }, ms)
  }
}

