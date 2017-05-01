const THREE = require('three')
const Ammo = require('exports-loader?window.Ammo!script-loader!lib/ammo')

const DIRECTION_LEFT = -1
const DIRECTION_RIGHT = 1

const Detector = require('lib/detector')
if (!Detector.webgl) {
  document.body.className += ' no-webgl'
}

const {
  textureLoader,
  renderer,
  scene,
  camera,
  rigidBodies
} = require('./world')

var collisionConfiguration
var dispatcher
var broadphase
var solver
var softBodySolver
var physicsWorld

var pos = new THREE.Vector3()
var quat = new THREE.Quaternion()
var transformAux1 = new Ammo.btTransform()
var quatAux1 = new THREE.Quaternion()
var vecAux1 = new THREE.Vector3()

const gravityConstant = -9.8
const margin = 0.05;

const clock = new THREE.Clock()

var quadcopter

init()
animate()

function animate() {
  requestAnimationFrame(animate)
  render()
}

function init() {
  initGraphics()
  initPhysics()
  createObjects()

  const container = document.getElementById('container')
  container.innerHTML = ''
  container.appendChild(renderer.domElement)
}

function initGraphics() {
  var ambientLight = new THREE.AmbientLight(0xdedede, 0.8)
  scene.add(ambientLight)

  var light = new THREE.DirectionalLight(0xffffff, 0.5)
  light.position.set(-10, 1, 5)
  light.castShadow = true

  scene.add(light)
}

function initPhysics() {
  collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration()
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration)
  broadphase = new Ammo.btDbvtBroadphase()
  solver = new Ammo.btSequentialImpulseConstraintSolver()
  softBodySolver = new Ammo.btDefaultSoftBodySolver()
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver)
  physicsWorld.setGravity( new Ammo.btVector3( 0, gravityConstant, 0 ) )
  physicsWorld.getWorldInfo().set_m_gravity( new Ammo.btVector3( 0, gravityConstant, 0 ) )
}

function createObjects() {
  // Ground
  pos.set(0, - 0.5, 0)
  quat.set(0, 0, 0, 1)

  var ground = createParalellepiped(180, 1, 180, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ))
  ground.castShadow = true
  ground.receiveShadow = true
  textureLoader.load('textures/grid.png', function( texture ) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(40, 40)
    ground.material.map = texture
    ground.material.needsUpdate = true
  })

  // Rotor
  pos.set(0, 0, 0)
  quadcopter = createParalellepiped(3, 0.1, 3, 30, pos, quat, new THREE.MeshPhongMaterial( { color: 0x8fc49d } ))
  quadcopter.castShadow = true

  scene.add(camera)

  const padding = 0.1
  createRotor('BL', -(2 - padding), 0.05, (2 - padding), DIRECTION_LEFT, quat, quadcopter)
  createRotor('BR', -(2 - padding), 0.05, -(2 - padding), DIRECTION_RIGHT, quat, quadcopter)
  createRotor('FR', (2 - padding), 0.05, -(2 - padding), DIRECTION_LEFT, quat, quadcopter)
  createRotor('FL', (2 - padding), 0.05, (2 - padding), DIRECTION_RIGHT, quat, quadcopter)
}

function createRotor(name, x, y, z, dir, quat, target) {
  pos.set(x, y, z)
  var pivotA = new Ammo.btVector3(x, y, z)
  var pivotB = new Ammo.btVector3(0, -0.1 * 0.5, 0)
  const axis = new Ammo.btVector3(0, 1, 0)
  const rotor = createParalellepiped(1.5, 0.1, 0.1, 1, pos, quat, new THREE.MeshPhongMaterial({color: 0x000000}))
  // rotor.userData.physicsBody.setRestitution(1.0)
  const rotorHinge = new Ammo.btHingeConstraint(target.userData.physicsBody, rotor.userData.physicsBody, pivotA, pivotB, axis, true)
  physicsWorld.addConstraint(rotorHinge, true)

  rotor.userData.hinge = rotorHinge
  rotor.userData.power = 0
  rotor.userData.direction = dir
  rotor.userData.x = x
  rotor.userData.z = z
  target.userData['rotor' + name] = rotor

  return {
    rotor,
    rotorHinge
  }
}

function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {
  const threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1 ), material)
  const shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ))
  shape.setMargin(margin)

  createRigidBody(threeObject, shape, mass, pos, quat)
  return threeObject
}

function render() {
  var deltaTime = clock.getDelta()
  updatePhysics(deltaTime)

  camera.position.x = quadcopter.position.x
  camera.position.y = quadcopter.position.y + 14
  camera.position.z = quadcopter.position.z + 14

  renderer.render(scene, camera)
}

function updateRotor(quadcopter, q, rotor) {
  const data = rotor.userData
  const power = data.power
  data.hinge.enableAngularMotor(true, data.direction * 1.5 * power, 1)

  vecAux1.set(0, power, 0)
  quatAux1.set(q.x(), q.y(), q.z(), q.w())
  vecAux1.applyQuaternion(quatAux1)

  quadcopter.userData.physicsBody.applyForce(new Ammo.btVector3(vecAux1.x, vecAux1.y, vecAux1.z), new Ammo.btVector3(data.x, 0.0, data.z))
}

function updatePhysics(deltaTime) {
  quadcopter.userData.physicsBody.getMotionState().getWorldTransform(transformAux1)
  const quadcopterRotation = transformAux1.getRotation()

  updateRotor(quadcopter, quadcopterRotation, quadcopter.userData.rotorBL)
  updateRotor(quadcopter, quadcopterRotation, quadcopter.userData.rotorBR)
  updateRotor(quadcopter, quadcopterRotation, quadcopter.userData.rotorFL)
  updateRotor(quadcopter, quadcopterRotation, quadcopter.userData.rotorFR)

  // Step world
  physicsWorld.stepSimulation(deltaTime, 10)

  // Update rigid bodies
  for (var i = 0, il = rigidBodies.length; i < il; i++) {
    var objThree = rigidBodies[i]
    var objPhys = objThree.userData.physicsBody
    var ms = objPhys.getMotionState()
    if (ms) {
      ms.getWorldTransform(transformAux1)
      var p = transformAux1.getOrigin()
      var q = transformAux1.getRotation()
      objThree.position.set(p.x(), p.y(), p.z())
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w())
    }
  }
}

function createRigidBody(threeObject, physicsShape, mass, pos, quat) {
  threeObject.position.copy( pos )
  threeObject.quaternion.copy( quat )

  const transform = new Ammo.btTransform()
  transform.setIdentity()
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z))
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w))

  const motionState = new Ammo.btDefaultMotionState(transform)
  const localInertia = new Ammo.btVector3(0, 0, 0)
  physicsShape.calculateLocalInertia(mass, localInertia)

  const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia)
  const body = new Ammo.btRigidBody(rbInfo)
  body.setRestitution(0.1)
  threeObject.userData.physicsBody = body
  scene.add(threeObject)

  if (mass > 0) {
    rigidBodies.push(threeObject)
    // Disable deactivation
    body.setActivationState(4)
  }
  physicsWorld.addRigidBody(body)
  return body;
}

document.addEventListener('keypress', onDocumentKeyDown,false)

function changePower(rotors, delta) {
  rotors.forEach((rotor) => {
    rotor.userData.power += delta
    rotor.userData.power = Math.max(0, Math.min(rotor.userData.power, 100))
  })
}

var forward = 0

function onDocumentKeyDown(e) {
  var rotors = [
    quadcopter.userData.rotorBR,
    quadcopter.userData.rotorFR,
    quadcopter.userData.rotorBL,
    quadcopter.userData.rotorFL
  ]


  if (e.keyCode == 105) {
    e.preventDefault()

    if (forward < 5) {
      changePower(rotors.slice(0, 2), -1)
      forward++
    }
  }

  if (e.keyCode == 107) {
    e.preventDefault()

    if (forward > -5) {
      changePower(rotors.slice(2), -1)
      forward--
    }
  }

  if (e.keyCode == 119) {
    e.preventDefault()
    changePower(rotors, 15)
  }

  if (e.keyCode == 115) {
    e.preventDefault()
    changePower(rotors, -15)
  }
}

window.addEventListener('resize', onWindowResize, false)

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize( window.innerWidth, window.innerHeight )
}
