/**
 * Created by 17637 on 2019/5/8.
 */
// 图形顶点着色器
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'varying vec4 v_Color;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'void main() {\n' +
    '  gl_Position = u_ModelMatrix * a_Position;\n' +
    '  v_Color = a_Color;\n' +
    '}\n';

// 图形片元着色器
const FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

// 网格顶点着色器
const LINE_VSHADER_SOURCE =
    `attribute vec4 a_Position;
     uniform mat4 u_ModelMatrix;
     void main(){
        gl_Position = u_ModelMatrix * a_Position;
     }`;

// 网格片元着色器
const LINE_FSHADER_SOURCE =
    `#ifdef GL_ES
     precision mediump float;
     #endif
     void main(){
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
     }`;

//两个program，分别用于画边和图形
let gl_program;
let line_program;

//config.js中vertex_pos的copy
let vertex_pos_copy = vertex_pos;
let data = [];
let isRotating = false; //旋转状态
let isEditing = true; //编辑状态
let isLine = false;  //网格显示
let rid;             //保存动画id，用于暂停

let g_last = Date.now();  //动画计时点
const ANGLE_STEP = 45.0;  //每秒旋转角度
const SCALE_STEP = 0.2;   //每秒变换倍数

function main() {
    //按配置文件设置canvas大小
    let c = document.getElementById("webgl");
    c.width = canvasSize.maxX;
    c.height = canvasSize.maxY;
    //初始化canvas，绘制图形
    initCanvas();
	let a = "a";
	data.push(a)
	console.log(data[0]);
	
}

function initCanvas() {
    let canvas = document.getElementById("webgl");
    let vertexArray = getVerteices(false);
    let vertexArray_line = getVerteices(true);

    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log("Failed to get the rendering context for WebGl");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl_program = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    line_program = createProgram(gl, LINE_VSHADER_SOURCE, LINE_FSHADER_SOURCE);


    let u_ModelMatrix = gl.getUniformLocation(gl_program, 'u_ModelMatrix');
    let u_ModelMatrix_line = gl.getUniformLocation(line_program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
    }
    if (!u_ModelMatrix_line) {
        console.log('Failed to get the storage location of u_ModelMatrix_line');
        return;
    }

    let currentAngle = 0.0; //旋转角度
    let currentScale = 1.0; //变换的比例
    let modelMatrix = new Matrix4();//矩阵模型

    let tick = function () {
        let res = animate(currentAngle, currentScale);  // 按时间更新旋转角度和大小
        currentAngle = res[0];
        currentScale = res[1];
        modelMatrix.setRotate(currentAngle, 0, 0, 1);            //旋转变换
        modelMatrix.scale(currentScale, currentScale, 1);        //大小变换
        draw(gl, vertexArray, modelMatrix, u_ModelMatrix);
        drawLine(gl, vertexArray_line, modelMatrix, u_ModelMatrix_line);
        rid = requestAnimationFrame(tick, canvas);              // 成帧动画
    };

    draw(gl, vertexArray, modelMatrix, u_ModelMatrix);

    //键盘事件
    document.onkeydown = function (ev) {
        if (ev.keyCode === 84) {   //T
            isEditing = false;
            isRotating = !isRotating;
            if (!isRotating) {
                window.cancelAnimationFrame(rid); //动画暂停
            } else {
                g_last = Date.now();   //更新时间计数
                tick();
            }
        } else if (ev.keyCode === 69) {  //E
            window.cancelAnimationFrame(rid);
            currentAngle = 0;
            currentScale = 1.0;
            isLine = true;
            isEditing = true;
            isRotating = false;
            modelMatrix.setRotate(currentAngle, 0, 0, 1);
            modelMatrix.scale(currentScale, currentScale, 1);
            vertexArray = getVerteices(false);
            vertexArray_line = getVerteices(true);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            draw(gl, vertexArray, modelMatrix, u_ModelMatrix);
            drawLine(gl, vertexArray_line, modelMatrix, u_ModelMatrix_line);
        } else if (ev.keyCode === 66) {   //B
            isLine = !isLine;
            if (isLine) {
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                draw(gl, vertexArray, modelMatrix, u_ModelMatrix);
                drawLine(gl, vertexArray_line, modelMatrix, u_ModelMatrix_line);
            } else {
                gl.clearColor(0.0, 0.0, 0.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                draw(gl, vertexArray, modelMatrix, u_ModelMatrix);
            }
        } else{}
    };

    //拖动事件
    let addMouseEvent = function () {
        let cVertex = undefined;
        let canvas = document.getElementById("webgl");

        //鼠标点击
        canvas.addEventListener("mousedown", function () {
            let pos = [event.offsetX, event.offsetY];
            for (let i in vertex_pos_copy) {
                if (getDistance(pos, vertex_pos_copy[i]) <= 8) {
                    cVertex = i;
                    console.log(cVertex);
                    return;
                }
            }
        });

        //鼠标松开
        canvas.addEventListener("mouseup", function () {
            console.log("up")
            cVertex = undefined;
        });

        //鼠标移动事件
        canvas.addEventListener("mousemove", function () {
            if (cVertex === undefined || isEditing === false)
                return;
            //记录顶点坐标变换并更新
            vertex_pos_copy[cVertex] = [event.offsetX, event.offsetY, 0];
            vertexArray = getVerteices(false);
            vertexArray_line = getVerteices(true);
            //重新绘制
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            draw(gl, vertexArray, modelMatrix, u_ModelMatrix);
            drawLine(gl, vertexArray_line, modelMatrix, u_ModelMatrix_line);
        });

        //鼠标离开画布事件
        canvas.addEventListener("mouseleave", function () {
            cVertex = undefined;
        });
    };
    addMouseEvent();
}

//转换坐标,得到顶点数组,line = true为画线顶点数组，false为画图形的顶点数组
function getVerteices(line) {
    let vertexArray = [];
    let vertex_gl_pos = new Array(vertex_pos_copy.length);//坐标转换

    //顶点坐标从canvas转换到webgl坐标
    for (let i in vertex_pos_copy) {
        let x = vertex_pos_copy[i][0] * 2 / 700 - 1.0;
        let y = -vertex_pos_copy[i][1] * 2 / 700 + 1.0;
        vertex_gl_pos[i] = [x, y];
    }

    for (let i in polygon) {
        vertexArray[i] = [];
        for (let j in polygon[i]) {
            let temp = polygon[i][j];
            vertexArray[i].push(vertex_gl_pos[temp][0]);
            vertexArray[i].push(vertex_gl_pos[temp][1]);
            if (!line) { //画图形时添加颜色数据进入数组
                vertexArray[i].push(vertex_color[temp][0] / 255);
                vertexArray[i].push(vertex_color[temp][1] / 255);
                vertexArray[i].push(vertex_color[temp][2] / 255);
            }
        }
        if (line) { //画网格线时用到6个顶点，即每个四边形顶点数组中下标顺序为0，1，2，3，0，2的六个点，这里把额外的两个点添加进去
            vertexArray[i].push(vertex_gl_pos[polygon[i][0]][0]);
            vertexArray[i].push(vertex_gl_pos[polygon[i][0]][1]);
            vertexArray[i].push(vertex_gl_pos[polygon[i][2]][0]);
            vertexArray[i].push(vertex_gl_pos[polygon[i][2]][1]);
        }
    }
    return vertexArray;
}

//初始化画图形的VertexBuffer
function initVertexBuffers(gl, vertexArray) {

    let vertices = new Float32Array(vertexArray);
    let n = vertexArray.length / 5;              //顶点数为数组长度 / 5

    let a_Position = gl.getAttribLocation(gl_program, 'a_Position');
    if (a_Position < 0) {
        console.log("failed");
        return -1;
    }
    let a_Color = gl.getAttribLocation(gl_program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }

    let vertexBuffer = gl.createBuffer();  //创建缓冲区
    if (!vertexBuffer) {
        console.log("Failed to create vertex buffer!");
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); //绑定缓冲区
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); //向缓冲区写入数据

    //将缓冲区对象分配给attribute变量
    let FSIZE = vertices.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
    gl.enableVertexAttribArray(a_Color);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return n;
}

//初始化画网格线的VertexBuffer
function initVertexBuffer_line(gl, vertexArray) {

    let vertices = new Float32Array(vertexArray);
    let n = vertexArray.length / 2;  //顶点数为数组长度 / 2
    let a_Position = gl.getAttribLocation(line_program, 'a_Position');
    if (a_Position < 0) {
        console.log("failed");
        return -1;
    }

    let vertexBuffer = gl.createBuffer();                      //创建缓冲区
    if (!vertexBuffer) {
        console.log("Failed to create vertex buffer!");
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);              //绑定缓冲区
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);  //向缓冲区写入数据

    // let FSIZE = vertices.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return n;
}

//绘画并填充颜色
function draw(gl, vertexArray, modelMatrix, u_ModelMatrix) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(gl_program);
    for (let i in vertexArray) {
        let n = initVertexBuffers(gl, vertexArray[i]);
        // Pass the rotation matrix to the vertex shader
        gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, n); //mode = TRIANGLE_FAN
    }
}

//绘画三角形网格线
function drawLine(gl, vertexArray, modelMatrix, u_ModelMatrix_line) {
    if (isLine) {
        gl.useProgram(line_program);  //切换program
        for (let i in vertexArray) {
            let n = initVertexBuffer_line(gl, vertexArray[i]);
            gl.uniformMatrix4fv(u_ModelMatrix_line, false, modelMatrix.elements);
            gl.drawArrays(gl.LINE_LOOP, 0, n);  //mode = LINE_LOOP
        }
    }
}

//根据示例中动画代码改写
function animate(angle, scale) {
    // Calculate the elapsed time
    let now = Date.now();
    let elapsed = now - g_last;
    g_last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    let newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    let newScale = scale;
    newAngle %= 360;
    if (newAngle <= 180) {
        newScale = scale - (SCALE_STEP * elapsed) / 1000.0;
    } else {
        newScale = scale + (SCALE_STEP * elapsed) / 1000.0;
    }
    return [newAngle, newScale];
}

//得到任意两点的距离，用于判断鼠标点击的点和图形顶点的距离是否符合拖动条件
function getDistance(p1, p2) {
    return Math.sqrt(Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2));
}

