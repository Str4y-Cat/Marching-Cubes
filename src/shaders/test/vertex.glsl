
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
// uniform vec2 uFrequency;
// uniform float uTime;

// attribute float aRandom;
attribute vec3 position;
// attribute vec2 uv;

// varying vec2 vUv;

varying float vElevation;


void main()
{
    vec4 modelPosition= modelMatrix* vec4(position,1.0);
    // float elevation= sin(modelPosition.x *uFrequency.x - uTime)* 0.1;
    elevation= modelPosition.y;

    // // vDepth=normalize(modelPosition.z);
    // // modelPosition.z +=elevation;
    
    // vec4 viewPosition= viewMatrix*modelPosition;
    // vec4 projectedPosition=projectionMatrix * viewPosition;

    // gl_Position= projectedPosition;
    // gl_Position= projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0);
    // vUv=uv;
    vElevation=elevation;
}