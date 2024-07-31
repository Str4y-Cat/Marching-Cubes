    uniform vec3 uColorGrass;
    uniform vec3 uColorStone;
    uniform vec3 uColorGrassLow;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main()
    {
        // vec4 textureColor= texture2D(uTexture,vUv);
        // textureColor.rgb*= vElevation*2.0 +0.5;

        //  vec3 xTangent = dFdx( viewPosition );
        // vec3 yTangent = dFdy( viewPosition );
        // vec3 faceNormal = normalize( cross( xTangent, yTangent ) );

        float height= vPosition.y;
        height= smoothstep(0.2,0.8,height/5.0);
        vec3 grassColor= mix(uColorGrassLow,uColorGrass,height);
        float dotProduct= dot(vec3(0,1,0),vNormal);
        dotProduct=abs(dotProduct);
        dotProduct= pow(dotProduct,5.0);

        vec3 color= mix(uColorStone,grassColor,dotProduct);

        // gl_FragColor=textureColor;
        // gl_FragColor=vec4(vec3(dotProduct),1.0);
        gl_FragColor=vec4(color,1.0);
    }