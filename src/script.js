/**
 * import dependencies
 */
import * as THREE from 'three'
import GUI from 'lil-gui'
import {  OrbitControls } from 'three/examples/jsm/Addons.js'

import Stats from 'three/addons/libs/stats.module.js';
import MarchingCubes from './Marching Cubes/MarchingCubes.js';


const gui = new GUI()


//create canvas
const canvas = document.querySelector('.webgl')

//create scene
const scene = new THREE.Scene()
scene.background = new THREE.Color("#68d7f0");

const cubeTextureLoader= new THREE.CubeTextureLoader()
const environmentMap= cubeTextureLoader.load([
    `/environment/clear/px.png`,
    `/environment/clear/nx.png`,
    `/environment/clear/py.png`,
    `/environment/clear/ny.png`,
    `/environment/clear/pz.png`,
    `/environment/clear/nz.png`,]
)
scene.background=environmentMap
scene.environment=environmentMap
/**
 * Handle sizes and resize
 */
const sizes= 
{
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize',()=>
    {
        sizes.width=window.innerWidth
        sizes.height=window.innerHeight

        //update camera
        camera.aspect= sizes.width/sizes.height
        camera.updateProjectionMatrix()
        
        //update renderer
        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(Math.min(2,window.devicePixelRatio))


    })



//#region Camera
/**
 * add a camera
 */

const camera= new THREE.PerspectiveCamera(75,sizes.width/sizes.height, 0.1 , 100)
camera.position.set(2,5,5)
camera.lookAt(new THREE.Vector3(0,0,0))
scene.add(camera)
//#endregion

//#region misc
/**
 * stats
 */
let stats = new Stats();
document.body.appendChild( stats.dom );


//#endregion

/**
 * Lights
 */


//#region three.js essentials
const hemiLight = new THREE.HemisphereLight( "#c600ee", "#0024ee", 2 );
// hemiLight.groundColor.setHSL( 0.6, 1, 0.6 );
// hemiLight.color.setHSL( 0.095, 1, 0.75 );
hemiLight.position.set( 0, 50, 0 );
scene.add( hemiLight );

const light = new THREE.DirectionalLight(0xFFFFFF, 1);
light.position.set(0, 5, 5);
light.target.position.set(-5, 0, 0);
light.castShadow=true
scene.add(light,light.target);


/**
 * add controls
 */
const controls = new OrbitControls(camera, canvas)
controls.enableDamping=true


/**
 * add renderer
 */
const renderer= new THREE.WebGLRenderer({
    canvas:canvas,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio))
renderer.shadowMap.enabled = true

//#endregion

const marchingCubes= new MarchingCubes(60,0.5,20,scene)
marchingCubes.showDebug(scene,gui)


/**
 * annimaiton loop
 */
const tick =()=>
    {
        controls.update()
        stats.update()
        // ra
        renderer.render(scene,camera)
        //tick
        window.requestAnimationFrame(tick)
    }

    tick()