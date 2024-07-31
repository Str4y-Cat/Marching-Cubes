
// attribute vec3 position;
// attribute vec2 uv;

// varying vec2 vUv;

// varying float vElevation;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;


void main()
{
    vec4 modelPosition=modelMatrix * vec4(position,1.0);
    gl_Position= projectionMatrix * viewMatrix * modelPosition;
    vUv=uv;
    vNormal=normal;
    vPosition=modelPosition.xyz;

    
}