const THREE = require('three')
const Ammo = require('exports-loader?window.Ammo!script-loader!lib/ammo')

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

const gravityConstant = -9.8
const margin = 0.05;

const clock = new THREE.Clock()

var body
var motorPower = 11
var rotorHinge

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

  camera.lookAt(new THREE.Vector3(0, 0, 0))

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

  var ground = createParalellepiped( 40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) )
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
  pos.set(3, 0, 0)
  body = createParalellepiped(1, 1, 1, 1, pos, quat, new THREE.MeshPhongMaterial({color: 0x606060}))
  body.castShadow = true
  body.receiveShadow = true

  body.userData.physicsBody.setDamping(0, 1)

  pos.set(3, 1.1, 0)
  var pivotA = new Ammo.btVector3(0, 1 * 0.5, 0)
  var pivotB = new Ammo.btVector3(0, -0.1 * 0.5, 0)
  const axis = new Ammo.btVector3(0, 1, 0)
  const rotor = createParalellepiped(2.5, 0.1, 0.1, 1, pos, quat, new THREE.MeshPhongMaterial({color: 0x000000}))
  rotor.userData.physicsBody.setDamping(0, 0)
  rotorHinge = new Ammo.btHingeConstraint(body.userData.physicsBody, rotor.userData.physicsBody, pivotA, pivotB, axis, true)
  physicsWorld.addConstraint(rotorHinge, true)

  // setInterval(() => {
  //   body.userData.physicsBody.applyCentralForce(new Ammo.btVector3(0, 500, 0))
  // }, 3000)
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
  renderer.render(scene, camera)
}

function updatePhysics(deltaTime) {
  body.userData.physicsBody.applyCentralForce(new Ammo.btVector3(0, 20, 0))
  rotorHinge.enableAngularMotor(true, 1.5 * 30, 50)

  // Step world
  physicsWorld.stepSimulation( deltaTime, 10 )

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
  body.setRestitution(0.4)
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

window.addEventListener('resize', onWindowResize, false)

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize( window.innerWidth, window.innerHeight )
}
