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

  // Ramp
  pos.set(3, 10, 0)
  quat.setFromAxisAngle( new THREE.Vector3(0, 0, 1), 30 * Math.PI / 180)
  var obstacle = createParalellepiped(10, 1, 4, 1, pos, quat, new THREE.MeshPhongMaterial({ color: 0x606060 }))
  obstacle.castShadow = true
  obstacle.receiveShadow = true
}

function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {
  var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1 ), material)
  var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5 ))
  shape.setMargin(margin)

  createRigidBody(threeObject, shape, mass, pos, quat)
  return threeObject
}

function render() {
  var deltaTime = clock.getDelta()
  updatePhysics(deltaTime)
  renderer.render(scene, camera)
}

function updatePhysics( deltaTime ) {
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
  var transform = new Ammo.btTransform()
  transform.setIdentity()
  transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) )
  transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) )
  var motionState = new Ammo.btDefaultMotionState( transform )
  var localInertia = new Ammo.btVector3( 0, 0, 0 )
  physicsShape.calculateLocalInertia( mass, localInertia )
  var rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia )
  var body = new Ammo.btRigidBody( rbInfo )
  threeObject.userData.physicsBody = body
  scene.add( threeObject )

  if ( mass > 0 ) {
    rigidBodies.push( threeObject );
    // Disable deactivation
    body.setActivationState( 4 );
  }
  physicsWorld.addRigidBody( body );
  return body;
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}
