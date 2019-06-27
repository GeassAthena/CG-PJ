/**
 * Created by 17637 on 2019/6/16.
 */

let box_program;
let floor_program;
let obj_loaders = [];
let box_data = [];
let floor_data = [];
let last = 0;

function main() {
    // Retrieve <canvas> element
    let canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    box_program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    if (!box_program){
        console.log('Failed to create box texture program');
        return;
    }
    floor_program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    if (!floor_program){
        console.log('Failed to create floor texture program');
        return;
    }

    gl.enable(gl.DEPTH_TEST);
    init_gl(gl);
}

function init_gl(gl) {
    initTexture(floorRes, gl, 0, floor_program, floor_data);
    initTexture(boxRes, gl, 1, box_program, box_data);
    loadObj(gl);
    Camera.init();

    let tick = (now) => {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let elapsed = now - last;
        last = now;

        let posX = (Camera.state.moveUp - Camera.state.moveDown) * MOVE_VELOCITY * elapsed / 1000;
        let posY = (Camera.state.moveRight - Camera.state.moveLeft) * MOVE_VELOCITY * elapsed / 1000;
        let rotX = (Camera.state.rotateUp - Camera.state.rotateDown) * ROT_VELOCITY * elapsed / 1000 / 180 * Math.PI;
        let rotY = (Camera.state.rotateRight - Camera.state.rotateLeft) * ROT_VELOCITY * elapsed / 1000 / 180 * Math.PI;
        if (posX || posY)
            Camera.move(posX, posY);
        if (rotX || rotY)
            Camera.rotate(rotX, rotY);

        draw_scene(gl, floor_program, floorRes, 0);
        draw_scene(gl, box_program, boxRes, 1);

        for (let obj in obj_loaders) {
            obj.render(now);
        }

        document.getElementById("m1").innerText = Camera.eye.elements.toString();
        document.getElementById("m2").innerText = Camera.at.elements.toString();
        window.requestAnimationFrame(tick);
    };
    tick();

}

function initTexture(obj, gl, textureIndex, program, data) {
    let a_Position = gl.getAttribLocation(program, 'a_Position');
    data.push(a_Position);
    let a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    data.push(a_TexCoord);
    let u_MvpMatrix = gl.getUniformLocation(program, 'u_MvpMatrix');
    data.push(u_MvpMatrix);
    let u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    data.push(u_NormalMatrix);
    let u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    data.push(u_ModelMatrix);
    let u_Eye = gl.getUniformLocation(program, 'u_Eye');
    data.push(u_Eye);
    let u_FogDist = gl.getUniformLocation(program, 'u_FogDist');
    data.push(u_FogDist);

    let texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture object');
        return false;
    }
    let u_Sampler = gl.getUniformLocation(program, 'u_Sampler');
    data.push(u_Sampler);
    let image = new Image();
    image.onload = () => {
        loadTexture(program, image, u_Sampler, textureIndex);
    }
    image.src = obj.texImagePath;

}

function loadTexture(program, image, u_sampler, textureIndex) {
    gl.useProgram(program);
    gl.pixelStorei(gl.UNPACK_FILP_Y_WEBGL, 1); //对纹理图像进行y轴反转
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.uniformli(u_sampler, textureIndex);
}

function draw_scene(gl, program, obj, data, textureIndex) {
    gl.useProgram(program);
    let vertexBuffer = gl.createBuffer();
    let vertexTexCoordBuffer = gl.createBuffer();
    let vertexIndexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ArrayBuffer, vertexBuffer);
    gl.bufferData(gl.ArrayBuffer, new Float32Array(obj.vertex), gl.STATIC_DRAW);
    gl.vertexAttribPointer(data[0], 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(data[0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(obj.texCoord), gl.STATIC_DRAW);
    gl.vertexAttribPointer(data[1], 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(data[1]);

    //纹理
    let t = 'TEXTURE' + textureIndex;
    gl.activeTexture(gl[t]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(obj.index), gl.STATIC_DRAW);

    //相机
    let u_PointLightColor = gl.getUniformLocation(program, 'u_PointLightColor');
    let u_PointLightPosition = gl.getUniformLocation(program, 'u_PointLightPosition');
    if (Camera.state.pointLight) {
        gl.uniform3fv(u_PointLightColor, new Vector3(scenePointLightColor).elements);
        gl.uniform3fv(u_PointLightPosition, Camera.eye.elements);
    } else {
        gl.uniform3fv(u_PointLightColor, new Vector3([0, 0, 0]).elements);
        gl.uniform3fv(u_PointLightPosition, new Vector3([0, 0, 0]).elements);
    }

    let normalMatrix = new Matrix4();
    let modelMatrix = new Matrix4();
    modelMatrix.translate(obj.translate[0], obj.translate[1], obj.translate[2]);
    modelMatrix.scale(obj.scale[0], obj.scale[1], obj.scale[2]);
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(data[3], false, normalMatrix.elements);
    gl.uniformMatrix4fv(data[4], false, modelMatrix.elements);

    let mvpMatrix = Camera.getMvpMatrix();
    mvpMatrix.multiply(modelMatrix);
    gl.uniformMatrix4fv(data[2], false, mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLE_STRIP, obj.index.length, gl.UNSIGNED_SHORT, 0);
}
function loadObj(gl) {
    for (let object of ObjectList) {
        let loader = new ObjectLoader(object, {
            'gl': gl
        }).init();

        // 通过正余弦的周期函数，让其做一个圆周运动
        if (object.objFilePath.indexOf('bird') > 0) {
            loader.nextTick = (now) => {
                let rotate = (now / 1000 * 120) % 360;
                let trans = (now / 500);
                loader.o.transform[1].content[0] = rotate;
                loader.o.transform[0].content[0] = Math.sin(trans) * 5;
                loader.o.transform[0].content[1] = Math.cos(trans) * 3 + 10;
                loader.o.transform[0].content[2] = Math.sin(trans) * 4 + 10;
            }
        }
        obj_loaders.push(loader);
    }
}