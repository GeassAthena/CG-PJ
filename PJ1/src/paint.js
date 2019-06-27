//该函数在一个canvas上绘制一个点
//其中cxt是从canvas中获得的一个2d上下文context
//    x,y分别是该点的横纵坐标
//    color是表示颜色的整形数组，形如[r,g,b]
//    color在这里会本转化为表示颜色的字符串，其内容也可以是：
//        直接用颜色名称:   "red" "green" "blue"
//        十六进制颜色值:   "#EEEEFF"
//        rgb分量表示形式:  "rgb(0-255,0-255,0-255)"
//        rgba分量表示形式:  "rgba(0-255,1-255,1-255,透明度)"
//由于canvas本身没有绘制单个point的接口，所以我们通过绘制一条短路径替代
function drawPoint(cxt, x, y, color) {
    //建立一条新的路径
    cxt.beginPath();
    //设置画笔的颜色
    cxt.strokeStyle = "rgb(" + color[0] + "," +
        +color[1] + "," +
        +color[2] + ")";
    //设置路径起始位置
    cxt.moveTo(x, y);
    //在路径中添加一个节点
    cxt.lineTo(x + 1, y + 1);
    //用画笔颜色绘制路径
    cxt.stroke();
}

//绘制线段的函数绘制一条从(x1,y1)到(x2,y2)的线段，cxt和color两个参数意义与绘制点的函数相同，
function drawLine(cxt, x1, y1, x2, y2, color) {

    cxt.beginPath();
    cxt.strokeStyle = "rgba(" + color[0] + "," +
        +color[1] + "," +
        +color[2] + "," +
        +255 + ")";
    //这里线宽取1会有色差，但是类似半透明的效果有利于debug，取2效果较好
    cxt.lineWidth = 1;
    cxt.moveTo(x1, y1);
    cxt.lineTo(x2, y2);
    cxt.stroke();
}




function initCanvas() {
    let c = document.getElementById("myCanvas");
    c.width = canvasSize.maxX;
    c.height = canvasSize.maxY;
    let cxt = c.getContext("2d");

//将canvas坐标整体偏移0.5，用于解决宽度为1个像素的线段的绘制问题，具体原理详见project文档
    cxt.translate(0.5, 0.5);
    for (let i in polygon) {
        let colors = vertex_color[polygon[i][0]];
        paint(polygon[i], colors, cxt)
    }
    for (let i in vertex_pos) {
        drawCircle(cxt, vertex_pos[i][0], vertex_pos[i][1], 10);
    }
    // addEvents();
}

//画圆
function drawCircle(cxt, x, y, r) {
    cxt.beginPath();
    cxt.strokeStyle = 'black';
    cxt.arc(x, y, r, 0, Math.PI * 2, true);
    cxt.fillStyle = 'red';
    cxt.fill();
    cxt.stroke();
}

//找寻四边形最小和最大的y值
function findYMax(polygon1) {
    let yMax = 0;
    for (let i in polygon1) {
        if (vertex_pos[polygon1[i]][1] > yMax) {
            yMax = vertex_pos[polygon1[i]][1];
        }
    }
    return yMax
}

function findYMin(polygon1) {
    let yMin = 0;
    for (let i in polygon1) {
        if (vertex_pos[polygon1[i]][1] < yMin) {
            yMin = vertex_pos[polygon1[i]][1];
        }
    }
    return yMin;
}

//得到任意两点的距离
function getDistance(p1, p2) {
    return Math.sqrt(Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2));
}

function paint(polygon1, colors, cxt) {

//四边形端点
    let points = [];
    let point;
    for (let i in polygon1) {
        let x = vertex_pos[polygon1[i]][0];
        let y = vertex_pos[polygon1[i]][1];
        point = [x,y];
        points.push(point);
    }

    
    let edges = [];
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        let k, x, y_min, y_max;
        if (points[j][1] > points[i][1]) {
            k = (points[j][0] - points[i][0]) / (points[j][1] - points[i][1]);
            x = points[i][0];
            y_min = points[i][1];
            y_max = points[j][1];
        } else {
            k = (points[i][0] - points[j][0]) / (points[i][1] - points[j][1]);
            x = points[j][0];
            y_min = points[j][1];
            y_max = points[i][1];
        }
        let edge = [y_min, x, k, y_max];

        //若k不是无穷的，则添加到边集中，否则直接绘出
        if (isFinite(k)) {
            edges.push(edge);
        } else {
            drawLine(cxt, points[j][0], points[j][1], points[i][0], points[i][1], colors);
        }
        // console.log(edges);
    }

    //确定多边形的上界和下界
    let top = findYMin(polygon1);
    let bottom = findYMax(polygon1);
    // console.log(top,bottom)

    //线性扫描，从上界到下界，按照每个像素点移动，不计算临界（上下界）
    for (let i = top + 1; i < bottom; i++) {

        //y与每条边的交点集合
        let intersections = [];
        for (let j in edges) {
            if (edges[j][0] <= i && edges[j][3] > i) {
                edges[j][1] += edges[j][2];
                intersections.push(edges[j][1]);
            }
        }

        //交点排序，按照x的升序
        intersections.sort(function (a, b) {
            return a - b;
        });

        //得到的交点集合，肯定能保证其是偶数的值，每两个交点配对，绘出直线
        for (let j = 0; j < intersections.length - 1; j += 2) {
            drawLine(cxt, intersections[j], i, intersections[j + 1], i, colors);
        }
    }

    //绘出所有的顶点，在循环外绘出，这样可以确保顶点在最上层


}
/*添加相应事件*/
function addEvents() {
    let movingVertex = undefined;//确定被移动的点
    let myCanvas = document.getElementById("myCanvas");

//鼠标左键按下事件，光标与点的距离小于10px，那么就能确定要移动的点
    myCanvas.addEventListener("mousedown", function (e) {
        let pos = [event.offsetX, event.offsetY];
        for (let i = 0; i < vertex_pos.length; i++) {
            if (getDistance(pos, vertex_pos[i]) <= 10) {
                movingVertex = i;
                console.log(i)
                return;
            }
        }
    });

//鼠标左键松开事件
    myCanvas.addEventListener("mouseup", function () {
        console.log("up")
        movingVertex = undefined;
    });

//鼠标移动事件
    myCanvas.addEventListener("mousemove", function () {
        if (movingVertex === undefined)
            return;
        vertex_pos[movingVertex] = [event.offsetX, event.offsetY, 0];
        initCanvas();
    });

//鼠标离开画布事件
    myCanvas.addEventListener("mouseleave", function () {
        movingVertex = undefined;
    });
}

initCanvas();
addEvents();
