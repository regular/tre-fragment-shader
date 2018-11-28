const h = require('mutant/html-element')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const drawTriangle = require('a-big-triangle')
const createShader = require('gl-shader')
const ace = require('brace')
const setStyle = require('module-styles')('tre-glsl')

require('brace/mode/glsl')

setStyle(`
  .tre-glsl-editor .active {
    background: blue;
  }
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


module.exports = function RenderShader(opts) {
  opts = opts || {}

  function makeEditor(contentObs, draw, ctx) {
    const pre = h('pre.editor')
    const syntaxError = Value('')

    const editor = ace.edit(pre)
    if (opts.ace_theme) editor.setTheme(opts.ace_theme)

    const activeTab = Value()

    const tab1 = tab('Vertex Shader', 'vertexShader')
    const tab2 = tab('Fragment Shader', 'fragmentShader')
    tab1.activate()
    return [
      tab1, tab2,
      pre, syntaxError
    ]

    function tab(title, prop) {
      const session = ace.createEditSession(contentObs()[prop], 'ace/mode/glsl')

      function updateShader() {
        if (!ctx.shader) return
        const o = Object.assign({}, contentObs())
        o[prop] = session.getValue()
        ctx.shader.update(o.vertexShader, o.fragmentShader)
        console.log('shader types', ctx.shader.types)
      }

      session.on('change', Changes(session, updateShader, 600, (err, src) => {
        syntaxError.set(err && err.message)
        if (!err) {
          const content = Object.assign({}, contentObs())
          content[prop] = src
          contentObs.set(content)
          draw(ctx)
        }
      }))
      let tab
      tab = h('button', {
        classList: computed(activeTab, at => at == tab ? ['active'] : []),
        'ev-click': e => {
          tab.activate()
        }
      }, title)
      tab.activate = function activate() {
        activeTab.set(tab)
        editor.setSession(session)
      }
      return tab
    }
  }

  
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
    const {fragmentShader, vertexShader} = content
    if (!fragmentShader || !vertexShader) return

    ctx.shader = createShader(ctx.gl, vertexShader, fragmentShader)
    console.log('shader types', ctx.shader.types)
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
      return h('.tre-glsl-editor', [
        h('.canvas-container', {
          style: {
            width: '169px',
            height: '120px'
          }
        }, makeCanvas(kv, ctx)),
        h('div', makeEditor(contentObs, draw, ctx))
      ])
    }
    return makeCanvas(kv, ctx)
  }
}

// -- utils

function Changes(session, updateShader, ms, cb) {
  return debounce(ms, ()=>{
    const v = session.getValue() 
    try {
      updateShader()
    } catch(err) {
      if (err.constructor.name == 'GLError') {
        console.error('... failed', err.rawError)
        const m = err.rawError.match(/ERROR\:\s+([0-9]+)\:([0-9]+)\:\s*(.*)/)
        if (m) {
          let [_, column, row, text] = m
          row = Number(row) - 1
          column = Number(column)
          session.setAnnotations([{
            row, column, text,
            type: "error" // also warning and information
          }])
        }
        console.log(m)
        
        return cb(err)
      } else throw(err)
    }
    session.clearAnnotations()
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

