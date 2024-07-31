/**
 * cpu implementation of the marching cubes algorithm
 * adapted from https://paulbourke.net/geometry/#polygonise/
 */
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

import * as THREE from 'three'
import * as NOISE  from 'simplex-noise'
import Performance from '../performance/Performance';
import vertexShader from '../shaders/mountain/vertex.glsl'
import fragmentShader from '../shaders/mountain/fragment.glsl'

 export default class MarchingCubes
 {
    constructor(size,rez, tileSize,scene)
    {
        this.debug={
            size:size,
            rez:rez,
            tileSize:tileSize,
            envMesh:[],
            tileDivisions:[],
            pointMesh:[]
        }
        
        this.perform= new Performance()

        this.noise3D = NOISE.createNoise3D();

        this.options=
        {
            octaves:3,
            lacunarity:2.0,
            gain:0.5,
            amplitude:5,
            frequency:0.064
        }


        this.#constants()
        this.scene= scene
        this.march(size,rez,tileSize,scene)
    }

    /**
     * sets up the lookup tables
     */
    #constants()
    {
         this.edgeTable=[
            0x0  , 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
            0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
            0x190, 0x99 , 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
            0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
            0x230, 0x339, 0x33 , 0x13a, 0x636, 0x73f, 0x435, 0x53c,
            0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
            0x3a0, 0x2a9, 0x1a3, 0xaa , 0x7a6, 0x6af, 0x5a5, 0x4ac,
            0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
            0x460, 0x569, 0x663, 0x76a, 0x66 , 0x16f, 0x265, 0x36c,
            0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
            0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff , 0x3f5, 0x2fc,
            0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
            0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55 , 0x15c,
            0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
            0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc ,
            0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
            0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
            0xcc , 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
            0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
            0x15c, 0x55 , 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
            0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
            0x2fc, 0x3f5, 0xff , 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
            0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
            0x36c, 0x265, 0x16f, 0x66 , 0x76a, 0x663, 0x569, 0x460,
            0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
            0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa , 0x1a3, 0x2a9, 0x3a0,
            0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
            0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33 , 0x339, 0x230,
            0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
            0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99 , 0x190,
            0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
            0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0   ];
    
            this.triTable =
            [[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
            [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
            [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
            [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
            [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
            [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
            [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
            [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
            [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
            [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
            [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
            [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
            [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
            [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
            [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
            [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
            [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
            [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
            [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
            [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
            [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
            [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
            [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
            [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
            [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
            [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
            [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
            [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
            [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
            [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
            [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
            [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
            [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
            [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
            [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
            [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
            [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
            [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
            [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
            [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
            [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
            [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
            [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
            [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
            [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
            [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
            [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
            [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
            [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
            [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
            [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
            [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
            [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
            [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
            [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
            [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
            [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
            [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
            [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
            [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
            [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
            [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
            [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
            [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
            [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
            [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
            [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
            [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
            [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
            [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
            [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
            [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
            [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
            [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
            [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
            [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
            [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
            [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
            [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
            [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
            [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
            [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
            [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
            [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
            [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
            [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
            [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
            [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
            [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
            [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
            [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
            [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
            [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
            [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
            [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
            [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
            [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
            [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
            [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
            [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
            [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
            [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
            [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
            [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
            [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
            [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
            [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
            [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
            [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
            [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
            [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
            [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
            [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
            [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
            [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
            [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
            [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
            [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
            [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
            [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
            [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
            [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
            [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
            [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
            [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
            [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
            [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
            [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
            [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
            [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
            [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
            [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
            [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
            [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
            [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
            [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
            [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
            [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
            [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
            [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
            [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
            [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
            [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
            [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
            [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
            [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
            [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
            [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
            [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
            [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
            [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
            [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
            [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
            [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
            [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
            [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
            [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
            [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
            [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
            [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
            [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
            [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
            [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
            [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
            [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
            [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
            [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
            [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
            [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
            [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
            [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
            [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
            [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
            [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
            [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
            [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
            [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
            [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
            [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
            [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]];
    
    }
    
    /**
     * Given a grid cell and an isolevel, calculate the triangular
     * facets required to represent the isosurface through the cell.
     * 
     * @param {Object} grid grid object. {p: three.vector3[8], val: int[8] }
     * @param {int} isolevel 
     * @returns triangle coordinates
     */
    #polygonise(grid,isolevel)
    {
        const triangles=[]
        let i,ntriang,cubeindex;
        const vertlist=[]

        /*
            Determine the index into the edge table which
            tells us which vertices are inside of the surface
        */
        cubeindex = 0;

        for(let i= 0; i<8; i++)
        {
            if (grid.val[i] < isolevel) cubeindex |= 2**i;
        }

        /* Cube is entirely in/out of the surface */
        if (this.edgeTable[cubeindex] == 0)
            return null;

        /* Find the vertices where the surface intersects the cube */
        if (this.edgeTable[cubeindex] & 1)
            vertlist[0] =
                this.#VertexInterp(isolevel,grid.p[0],grid.p[1],grid.val[0],grid.val[1]);
        if (this.edgeTable[cubeindex] & 2)
            vertlist[1] =
                this.#VertexInterp(isolevel,grid.p[1],grid.p[2],grid.val[1],grid.val[2]);
        if (this.edgeTable[cubeindex] & 4)
            vertlist[2] =
                this.#VertexInterp(isolevel,grid.p[2],grid.p[3],grid.val[2],grid.val[3]);
        if (this.edgeTable[cubeindex] & 8)
            vertlist[3] =
                this.#VertexInterp(isolevel,grid.p[3],grid.p[0],grid.val[3],grid.val[0]);
        if (this.edgeTable[cubeindex] & 16)
            vertlist[4] =
                this.#VertexInterp(isolevel,grid.p[4],grid.p[5],grid.val[4],grid.val[5]);
        if (this.edgeTable[cubeindex] & 32)
            vertlist[5] =
                this.#VertexInterp(isolevel,grid.p[5],grid.p[6],grid.val[5],grid.val[6]);
        if (this.edgeTable[cubeindex] & 64)
            vertlist[6] =
                this.#VertexInterp(isolevel,grid.p[6],grid.p[7],grid.val[6],grid.val[7]);
        if (this.edgeTable[cubeindex] & 128)
            vertlist[7] =
                this.#VertexInterp(isolevel,grid.p[7],grid.p[4],grid.val[7],grid.val[4]);
        if (this.edgeTable[cubeindex] & 256)
            vertlist[8] =
                this.#VertexInterp(isolevel,grid.p[0],grid.p[4],grid.val[0],grid.val[4]);
        if (this.edgeTable[cubeindex] & 512)
            vertlist[9] =
                this.#VertexInterp(isolevel,grid.p[1],grid.p[5],grid.val[1],grid.val[5]);
        if (this.edgeTable[cubeindex] & 1024)
            vertlist[10] =
                this.#VertexInterp(isolevel,grid.p[2],grid.p[6],grid.val[2],grid.val[6]);
        if (this.edgeTable[cubeindex] & 2048)
            vertlist[11] =
                this.#VertexInterp(isolevel,grid.p[3],grid.p[7],grid.val[3],grid.val[7]);

        /* Create the triangle */
        ntriang = 0;
        for (i=0;this.triTable[cubeindex][i]!=-1;i+=3) {
            const triangle=[]
            triangle.push(vertlist[this.triTable[cubeindex][i  ]])
            triangle.push(vertlist[this.triTable[cubeindex][i+1]])
            triangle.push(vertlist[this.triTable[cubeindex][i+2]])
            
            triangles.push(triangle)
            ntriang++;
        }
        return(triangles);
    }

    /**
     * Linearly interpolate the position where an isosurface cuts
     * an edge between two vertices, each with their own scalar value
     * 
     * @param {int} isolevel 
     * @param {vec3} p1 position 1
     * @param {vec3} p2 position 2
     * @param {int} valp1 density value for position 1
     * @param {int} valp2 density value for position 2
     * @returns 
     */
    #VertexInterp(isolevel,p1,p2,valp1,valp2)
    {
        // double mu;
        // XYZ p;
        let mu;
        const p= new THREE.Vector3()

        //min difference
        if (Math.abs(isolevel-valp1) < 0.00001)
            return(p1);
        if (Math.abs(isolevel-valp2) < 0.00001)
            return(p2);
        if (Math.abs(valp1-valp2) < 0.00001)
            return(p1);

        //interpolate position
        mu = (isolevel - valp1) / (valp2 - valp1);
        p.x = p1.x + mu * (p2.x - p1.x);
        p.y = p1.y + mu * (p2.y - p1.y);
        p.z = p1.z + mu * (p2.z - p1.z);
        
        return(p);
    }

    /**
     * creates a chunked marching squares environment
     * 
     * @param {*} size 
     * @param {*} rez 
     * @param {*} tileSize 
     * @param {*} scene 
     */
    march(size,rez,tileSize,scene)
    {
        
        // this.perform.timer('heightMinMax')
        const heightMinMax= {...this.#getMinMaxHeight(size,rez,0.5)}
        // this.perform.timer('heightMinMax')
        
        const tileArr= this.#tileArr(size,tileSize)

        this.perform.timer('generate whole mesh')
        tileArr.forEach(tile => {

            // this.perform.timer('grid')
            const lookUp= this.#createGrid(tile,heightMinMax,rez)
            // this.perform.timer('grid')

            // this.perform.timer('create triangles')
            const vec3Verts= this.#createTriangles(tile,heightMinMax,rez,lookUp.density)
            // this.perform.timer('create triangles')
            if(this.debug.showPoints)
            {
                this.#createTestPoints(lookUp)
            }

            const vertices= new Float32Array(vec3Verts.length*9)

            for (let i = 0; i < vec3Verts.length; i++) {
                const i9=i*9
                const tri1=vec3Verts[i][0]
                const tri2=vec3Verts[i][1]
                const tri3=vec3Verts[i][2]
    
    
                vertices[i9+0]=tri1.x
                vertices[i9+1]=tri1.y
                vertices[i9+2]=tri1.z
    
                vertices[i9+3]=tri2.x
                vertices[i9+4]=tri2.y
                vertices[i9+5]=tri2.z
    
                vertices[i9+6]=tri3.x
                vertices[i9+7]=tri3.y
                vertices[i9+8]=tri3.z
            }

            // this.perform.timer('create geometry')
            this.debug.envMesh.push(this.#createGeometry(vertices,scene))
            // this.perform.timer('create geometry')
            

        });
        this.perform.timer('generate whole mesh')
        
    }

    /**
     * Gets the max and min y value of the current density function. Checks for the point where there are no more values >isoValue (max) or <isoValue (min)
     * @param {*} size 
     * @param {*} rez 
     * @param {*} iso 
     * @returns 
     */
    #getMinMaxHeight(size,rez,iso)
    {
        const height= size/2
        const MIN={x:-size/2,z:-size/2}
        const MAX={x:size/2,z:size/2}

        // console.log('height',height)
        const minMax=
        {
            min:0,
            max:0
        }

        // console.log(min,max,height)
        const containsDensePoint = (min,max,rez,iso,y,greater=false)=>{
            for (let x=min.x;x<=max.x;x+=rez) 
                {
                    x=Math.round(x*100)/100

                    
                    for (let z=min.z;z<=max.z;z+=rez) 
                        {
                            const density=this.#density(x,y,z,this.options)
                            if(greater)
                            {
                                if(density>iso){return true}
                            }
                            else
                            if(density<iso){return true}
                            
                        }  
                }  
                return false
            }  

        for(let y=0;y<=height;y+=rez)
            {
                y=Math.round(y*100)/100
                minMax.max=y

                if(!containsDensePoint(MIN,MAX,rez,iso,y))
                {
                    break
                }
            
                    
            }

        for(let y=0;y>=-height;y-=rez)
            {
                
                y=Math.round(y*100)/100
                minMax.min=y

                if(!containsDensePoint(MIN,MAX,rez,iso,y,true))
                {
                    break
                }
            
                    
            }
            console.log(minMax)
        return minMax
    }

    /**
     * creates an indexed buffer geometry from a vertices array
     * @param {*} vertices 
     * @param {*} scene 
     * @returns 
     */
    #createGeometry(vertices,scene)
    {
        // this.perform.timer('create naive geometry')
        const geometryUnmerged = new THREE.BufferGeometry();
        geometryUnmerged.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        // this.perform.timer('create naive geometry')

        // this.perform.timer('create merged geometry')
        const geometry= BufferGeometryUtils.mergeVertices(geometryUnmerged)
        // this.perform.timer('create merged geometry')
        
        geometry.computeVertexNormals () 
        const material = new THREE.MeshStandardMaterial({color:"#f4926a"}  );
        // const material = new THREE.ShaderMaterial({
        //     vertexShader:vertexShader,
        //     fragmentShader:fragmentShader,
        //     uniforms:
        //     {
        //         uColorStone: new THREE.Uniform(new THREE.Color("#6f6333")),
        //         uColorGrass: new THREE.Uniform(new THREE.Color("#ffffff")),
        //         uColorGrassLow: new THREE.Uniform(new THREE.Color("#65c448"))

        //     }
        // })

        const mesh = new THREE.Mesh( geometry, material );
        mesh.material.flatShading = true
        mesh.receiveShadow = true;
        // mesh.castShadow = true;
        scene.add(mesh)
        return mesh
    }

    

    /**
     * calculates a 2d array of chunk values based on the size and tilesize
     * @param {*} size 
     * @param {*} tileSize 
     * @returns 
     */
    #tileArr(size,tileSize)
    {
        const tileArr=[]
        for(let z= -size/2; z<size/2;z+=tileSize)
        {
            for(let x= -size/2; x<size/2;x+=tileSize)
                {
                    tileArr.push(
                        {
                            min:{x,z},
                            max:{x:x+tileSize,z:z+tileSize},
                        }
                    )

                }
        }
        return tileArr
    }

    /**
     * Creates a density lookup table the supplied chunk
     * 
     * @param {*} {min,max}
     * @param {*} heightMinMax max and min height object 
     * @param {*} rez resolution 
     * @returns lookup table object
     */
    #createGrid({min,max},heightMinMax,rez)
    {
        
        this.#debugTile(min,max,heightMinMax)
        const lookupTable= this.#createLookup(min,max,heightMinMax,rez)
        return lookupTable

    }

    /**
     * create density lookup table
     * 
     * @param {object} min 
     * @param {object} max 
     * @param {object} height 
     * @param {int} rez 
     * @returns 
     */
    #createLookup(min,max,height,rez)
    {
        const density={}
        const positions=[]
        // console.log(min,max)

        for(let x=min.x;x<=max.x;x+=rez)
            {
               
                x=Math.round(x*100)/100
                density[x]={}
            
                for (let y=height.min;y<=height.max;y+=rez) 
                {
                    y=Math.round(y*100)/100
                    density[x][y]={}

                    for (let z=min.z;z<=max.z;z+=rez) 
                        {
                            // console.log(this.options)
                            density[x][y][z]=this.#density(x,y,z,this.options)
                            // console.log(this.#density(x,y,z,this.options))
                            positions.push({x:x,y:y,z:z})
                        }  
                }  
            }

        return {density,positions}
    }

    /**
     * creates array containing triangle vertices for current chunk
     * 
     * @param {*} tile 
     * @param {*} height 
     * @param {*} rez 
     * @param {*} lookup 
     * @returns 
     */
    #createTriangles({min,max},height,rez,lookup)
    {
        
        const triangles=[]

        for(let y=height.min;y<height.max;y+=rez)
            {
                for (let x=min.x;x<max.x;x+=rez) 
                {
                    for (let z=min.z;z<max.z;z+=rez) 
                        {
                            //remove floating point errors
                            const X= Math.round((x+rez)*100)/100
                            const Y= Math.round((y+rez)*100)/100
                            const Z= Math.round((z+rez)*100)/100

                            //convert to triangle array
                            try {
                            const trianglesCell=this.#polygonise(
                                {
                                    p:
                                    [
                                        {x:x,y:y,z:z},
                                        {x:X,y:y,z:z},
                                        {x:X,y:y,z:Z},
                                        {x:x,y:y,z:Z},
                                        {x:x,y:Y,z:z},
                                        {x:X,y:Y,z:z},
                                        {x:X,y:Y,z:Z},
                                        {x:x,y:Y,z:Z},
                                    ],
                                    val:
                                    [
                                        lookup[x][y][z],
                                        lookup[X][y][z],
                                        lookup[X][y][Z],
                                        lookup[x][y][Z],
                                        lookup[x][Y][z],
                                        lookup[X][Y][z],
                                        lookup[X][Y][Z],
                                        lookup[x][Y][Z],
                                    ]
                                },0)

                            if(trianglesCell)
                            {
                                triangles.push(...trianglesCell)
                            }

                            } catch (error) {
                                console.log("Position not able to be converted to triangle",x,y,z)
                                
                                
                                throw("broken mesh")
                            }
                            
                        }  
                }  
            }

        return triangles
    }

    

    /**
     * density function for the marching cubes function
     * 
     * @param {*} x 
     * @param {*} y 
     * @param {*} z 
     * @returns 
     */
    #density(x,y,z, options)
    {   
        // console.log(options)
        // if(!options){options={}}
        // if(!options.octaves){options.octaves=3}
        // if(!options.lacunarity){options.lacunarity=2.0}
        // if(!options.gain){options.gain=0.5}
        // if(!options.amplitude){options.amplitude=5}
        // if(!options.frequency){options.frequency=0.001}
        // warp = noiseVol2.Sample( TrilinearRepeat, ws*0.004 ).xyz; 
        let density=y

        // const warp =this.noise3D(x*0.004,y*0.004,z*0.004)
        // x += warp * 8;
        // y += warp * 8;
        // z += warp * 8;


        
        //FIXME; create a dedicated function for this
        // density+= this.noise3D(x*4.03,y*4.03,z*4.03)*0.25
        // density+= this.noise3D(x*1.96,y*1.96,z*1.96)*0.5
        // density+= this.noise3D(x*1.01,y*1.01,z*1.01)*1
        //1
        // density+= this.noise3D(x*0.04,y*0.04,z*0.04)*2
        // density+= this.noise3D(x*0.1,y*0.1,z*0.1)*2
        // density+= this.noise3D(x*0.01,y*0.01,z*0.01)*5
       
        const  octaves = options.octaves;
        let lacunarity = options.lacunarity;
        let gain =options.gain;
        //
        // Initial values
        let amplitude = options.amplitude;
        let frequency = options.frequency;
        //
        // Loop of octaves
        // console.log('---------------------')

        for (let i = 0; i < octaves; i++) {
            density += amplitude * this.noise3D(x*frequency,y*frequency,z*frequency);
            frequency *= lacunarity;
            amplitude *= gain;
            // console.log(frequency,amplitude,density)
        }

        //2
        // density+= this.noise3D(x*0.2,y*0.2,z*0.2)*2
        // density+= this.noise3D(x*0.8,y*0.8,z*0.8)*0.2

        // density+= this.noise3D(x*0.1,y*0.1,z*0.1)*14
        // density+= this.noise3D(x*0.01,y*0.01,z*0.01)*7

        //3
        // density+= this.noise3D(x*1,y*0.5,z*1)*3
        // density+= this.noise3D(x*0.1,y*0.1,z*0.1)*7



        // if(y<=-2)
        //     {
        //         density=1
        //     }
        // density+= this.noise.perlin3(x,y,z)
        // this.perform.counter('density')
        density= Math.round(density*1000)/1000
        return density
    }

    /**
     * removes and opens memory for all meshes in the array
     * @param {*} arr 
     * @param {*} scene 
     */
    #destroyMesh(arr,scene)
    {
        arr.forEach(mesh=>
            {
                mesh.geometry.dispose()
                mesh.material.dispose()
                scene.remove(mesh)
            }
        )
    }
    /**
     * debug method. draws a box based on the max,min and height 
     * 
     * @param {*} min 
     * @param {*} max 
     * @param {*} height 
     */
    #debugTile(min,max,height)
    {
        const MIN=new THREE.Vector3(min.x,height.min,min.z)
        const MAX=new THREE.Vector3(max.x,height.max,max.z)
        
        const box3= new THREE.Box3(MIN,MAX)
        const helper = new THREE.Box3Helper(box3,'red')
        this.debug.tileDivisions.push(helper)
    }

    #createTestPoints(lookUp)
    {

        const material= new THREE.PointsMaterial({vertexColors:true,size:0.1*this.debug.rez,transparent:true})
        const geometry= new THREE.BufferGeometry()
        // console.log(lookUp)
        


        const arr= new Float32Array(lookUp.positions.length * 3)
        const colors= new Float32Array(lookUp.positions.length * 3)

        const colorInside= new THREE.Color("#fff000")
        const colorOutside= new THREE.Color("black")

        
        // console.log(lookUp)
        for (let i = 0; i < lookUp.positions.length; i++) {
            const i3=i*3

            const x=lookUp.positions[i].x
            const y=lookUp.positions[i].y
            const z=lookUp.positions[i].z


            arr[i3+0]=lookUp.positions[i].x
            arr[i3+1]=lookUp.positions[i].y
            arr[i3+2]=lookUp.positions[i].z
            
            
            let density=0
            if(lookUp.density[x])
            {
                if(lookUp.density[x][y])
                    {
                        if(lookUp.density[x][y][z])
                            {
                                density=lookUp.density[x][y][z]
                                
                            }
                    }
            }
            density=density<0.5?1:0
            const mixedColor= colorInside.clone()
            mixedColor.lerp(colorOutside,density)

            colors[i3+0]=mixedColor.r
            colors[i3+1]=mixedColor.g
            colors[i3+2]=mixedColor.b
            
            
        }
        
        const positions= new THREE.BufferAttribute(arr,3)
        geometry.setAttribute('position',positions)

        geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colors,3)
        )

        const mesh = new THREE.Points(geometry,material)
        this.debug.pointMesh.push(mesh)
        this.scene.add(mesh)
    }

    

    /**
     * sets up the debug view if its wanted
     * 
     * @param {*} scene 
     * @param {*} gui 
     */
    showDebug(scene,gui)
    {
        this.debug.showChunks=true
        this.debug.showPoints=false
        this.debug.showMesh=true

        const folder= gui.addFolder('Marching Cubes')

        this.debug.tileDivisions.forEach(tileMesh=>
            {
                scene.add(tileMesh)
            }
        )

        folder.add(this.debug,'showPoints').name('Show Cells').onChange(bool=>
            {
                if(bool)
                    {
                        this.#destroyMesh(this.debug.envMesh,scene)
                        this.#destroyMesh(this.debug.tileDivisions,scene)
                        this.debug.tileDivisions=[]
                        this.march(this.debug.size,this.debug.rez,this.debug.tileSize,scene)
                    }
                else
                    {
                        this.#destroyMesh(this.debug.pointMesh,scene)
                        this.scene.remove(this.debug.pointMesh)
                    }
            }
        )

        //update rez
        folder.add(this.debug,'rez').name("Mesh Resolution").min(0.1).max(10).step(0.1).onFinishChange((num)=>
        {
            this.#destroyMesh(this.debug.envMesh,scene)
            this.#destroyMesh(this.debug.tileDivisions,scene)
            this.debug.tileDivisions=[]

            this.#destroyMesh(this.debug.pointMesh,scene)
            
            this.march(this.debug.size,num,this.debug.tileSize,scene)
        })

        //change size
        folder.add(this.debug,'size').name('Mesh Size').min(1).max(100).step(1).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.debug.tileDivisions=[]

                this.#destroyMesh(this.debug.pointMesh,scene)
                
                this.march(num,this.debug.rez,this.debug.tileSize,scene)
            })

        //change chunk size
        folder.add(this.debug,'tileSize').name("Chunk Size").min(1).max(50).step(1).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.#destroyMesh(this.debug.pointMesh,scene)
                this.debug.tileDivisions=[]
                
                this.march(this.debug.size,this.debug.rez,num,scene)
                this.debug.tileDivisions.forEach(tileMesh=>
                    {
                        scene.add(tileMesh)
                    }
                )
            })

        //show chunks
        folder.add(this.debug,'showChunks').name('Show Chunks').onChange(bool=>
            {
                if(bool)
                    {
                        this.debug.tileDivisions.forEach(tileMesh=>
                            {
                                scene.add(tileMesh)
                            }
                        )
                    }
                else
                    {
                        this.#destroyMesh(this.debug.tileDivisions,scene)

                    }
            }
        )

        const densityFolder= gui.addFolder('density')
        
        //change chunk size
        // this.options=
        // {
        //     octaves:3,
        //     lacunarity:2.0,
        //     gain:0.5,
        //     amplitude:5,
        //     frequency:0.001
        // }
        
        densityFolder.add(this.options,'octaves').name("Octaves").min(1).max(10).step(1).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.#destroyMesh(this.debug.pointMesh,scene)
                this.debug.tileDivisions=[]
                
                this.march(this.debug.size,this.debug.rez,this.debug.tileSize,scene)

                
            })
        densityFolder.add(this.options,'lacunarity').name("lacunarity").min(0.1).max(2).step(0.001).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.#destroyMesh(this.debug.pointMesh,scene)
                this.debug.tileDivisions=[]
                
                this.march(this.debug.size,this.debug.rez,this.debug.tileSize,scene)

                
            })
        densityFolder.add(this.options,'gain').name("gain").min(0.1).max(2).step(0.001).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.#destroyMesh(this.debug.pointMesh,scene)
                this.debug.tileDivisions=[]
                
                this.march(this.debug.size,this.debug.rez,this.debug.tileSize,scene)

                
            })
        densityFolder.add(this.options,'amplitude').name("amplitude").min(1).max(20).step(0.1).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.#destroyMesh(this.debug.pointMesh,scene)
                this.debug.tileDivisions=[]
                
                this.march(this.debug.size,this.debug.rez,this.debug.tileSize,scene)
                
            })
        densityFolder.add(this.options,'frequency').name("frequency").min(0.0001).max(0.5).step(0.001).onFinishChange((num)=>
            {
                this.#destroyMesh(this.debug.envMesh,scene)
                this.#destroyMesh(this.debug.tileDivisions,scene)
                this.#destroyMesh(this.debug.pointMesh,scene)
                this.debug.tileDivisions=[]
                
                this.march(this.debug.size,this.debug.rez,this.debug.tileSize,scene)

                
            })
    }

    // #debugDensity()
    // {


        
    // }
 }
