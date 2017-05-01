const THREE = require('three')

const createWorld = () => {
  const textureLoader = new THREE.TextureLoader()
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000)
  camera.position.x = 0
  camera.position.y = 15
  camera.position.z = 15
  camera.lookAt({x: 0, y: 0, z: 0})


  const renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(0xbfd1e5)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true

  return {
    textureLoader,
    camera,
    scene,
    renderer,
    rigidBodies: []
  }
}

module.exports = createWorld()
module.exports.createWorld = createWorld
