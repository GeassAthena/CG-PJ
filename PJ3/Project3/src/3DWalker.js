//保存所有的加载对象
let loaders = [];

// 记录时间，方便计算运动的轨迹
let last = 0;

function main() {
    let canvas = document.getElementById('myCanvas');

    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the context of gl');
        return;
    }
    init(gl);
}

function init(gl) {

    getLoaders(gl);

    Camera.init();

    addEvent();

    //用动画和Camera实现漫游
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

        for (let loader of loaders) {
            loader.render(now);
        }

        window.requestAnimationFrame(tick);
    };
    tick();


}

// 添加键盘的事件，根据需求文档
function addEvent() {
    let keys = new Map();
    keys.set('W', 'moveUp');
    keys.set('S', 'moveDown');
    keys.set('A', 'moveLeft');
    keys.set('D', 'moveRight');
    keys.set('J', 'rotateLeft');
    keys.set('K', 'rotateRight');
    keys.set('F', 'pointLight');

    //给每一个键添加一个状态，这样就可以进行组合键操作，其中F即控制相机移动点光源是点击开启，点击关闭的
    keys.forEach(() => {
        window.addEventListener('keydown', (e) => {
            let key = String.fromCharCode(e.which);
            if (!keys.get(key))
                return;
            if (key === 'F') {
                Camera.state[keys.get(key)] = !Camera.state[keys.get(key)];
            } else
                Camera.state[keys.get(key)] = 1;
        });

        window.addEventListener('keyup', (e) => {
            let key = String.fromCharCode(e.which);
            if (!keys.get(key))
                return;
            if (key === 'F')
                return;
            Camera.state[keys.get(key)] = 0;
        });
    });


}

// 加载scene.js中的环境场景和obj目录下的对象
function getLoaders(gl) {
    let floorLoader = new TextureLoader(floorRes, {
        'gl': gl,
        'textureIndex': 0
    }).init();
    loaders.push(floorLoader);

    let boxLoader = new TextureLoader(boxRes, {
        'gl': gl,
        'textureIndex': 1
    }).init();
    loaders.push(boxLoader);


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

        loaders.push(loader);
    }
}