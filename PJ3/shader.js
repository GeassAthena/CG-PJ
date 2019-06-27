/**
 * Created by 17637 on 2019/6/16.
 */
let VSHADER_SOURCE =
    `attribute vec4 a_Position;
             attribute vec2 a_TexCoord;
             attribute vec4 a_Normal;
             uniform mat4 u_ModelMatrix;
             uniform mat4 u_MvpMatrix;
             uniform mat4 u_NormalMatrix;
             uniform vec3 u_PointLightColor;
             uniform vec3 u_PointLightPosition;
             uniform vec3 u_LightDirection;
             uniform vec4 u_Eye;
             varying vec2 v_TexCoord;
             varying vec4 v_Color;
             varying float v_Dist;
             void main(){
                 gl_Position = u_MvpMatrix * a_Position;
                 vec3 normal = normalize(vec3(u_NormalMatrix)); 
                 
                 vec4 vertexPosition = u_ModelMatrix * a_Position;
                 vec3 pointLightDirection = normalize(u_PointLightPosition - vec3(vertexPosition));
                 
                 float pointnDotL = max(dot(normal,pointLightDirection), 0.0);
                 vec3 pointDiffuse = u_PointLightColor * pointnDotL;
                 
                 v_Color = vec4(pointDiffuse, 1.0);
                 
                 v_TexCoord = a_TexCoord;
                 v_Dist = distance(u_ModelMatrix * a_Position, u_Eye);
             }`;

// Fragment shader program
let FSHADER_SOURCE=
    `#ifdef GL_ES
             precision mediump float;
             #endif
             uniform sampler2D u_Sampler;
             varying vec2 v_TexCoord;  
             varying vec4 v_Color;
             varying float v_Dist;
             uniform vec2 u_FogDist;
             void main() {
                 vec3 fogColor = vec3(0.2,0.2,0.2);
                 float fogFactor = clamp((u_FogDist.y - v_Dist)/(u_FogDist.y - u_FogDist.x),0.0,1.0);
                 vec3 color = mix(fogColor, vec3(v_Color), fogFactor);
                 gl_FragColor = texture2D(u_Sampler, v_TexCoord)+v_Color;
             }`;