import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// 场景初始化
const scene = new THREE.Scene();

// 加载背景图（假设背景图为浅色图片）
scene.background =new THREE.Color(0xf0ffff);

// 相机设置
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight * 0.75,
  0.1,
  3000
);
camera.position.set(0, 600, 800);
camera.lookAt(0, 0, 0);

// 渲染器（75% 窗口大小）
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth * 0.75, window.innerHeight * 0.75);
document.body.appendChild(renderer.domElement);

// 居中显示
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.left = '50%';
renderer.domElement.style.top = '50%';
renderer.domElement.style.transform = 'translate(-50%, -50%)';

// CSS2D渲染器（用于电子屏幕）
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth * 0.75, window.innerHeight * 0.75);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.left = '50%';
labelRenderer.domElement.style.top = '50%';
labelRenderer.domElement.style.transform = 'translate(-50%, -50%)';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

// 轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.update();

// 光源
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(300, 500, 400);
scene.add(directionalLight);

// 流水线组
const productionLine = new THREE.Group();
scene.add(productionLine);

// 路径定义：N型曲线
const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-300, 0, 0),
  new THREE.Vector3(-200, 0, 200),
  new THREE.Vector3(-100, 0, 0),
  new THREE.Vector3(0, 0, 200),
  new THREE.Vector3(100, 0, 0),
  new THREE.Vector3(200, 0, 200),
  new THREE.Vector3(300, 0, 0)
]);

// 绘制路径（传送带）
const points = curve.getPoints(100);
const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
const pathMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
const pathLine = new THREE.Line(pathGeometry, pathMaterial);
productionLine.add(pathLine);

// 工作站数量
const stationCount = 10;
const stations = [];

for (let i = 0; i < stationCount; i++) {
  const t = i / (stationCount - 1); // 均匀分布
  const pos = curve.getPointAt(t);

  // 创建工作站
  const stationGeo = new THREE.BoxGeometry(30, 10, 30);
  const stationMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const station = new THREE.Mesh(stationGeo, stationMat);
  station.position.copy(pos);
  productionLine.add(station);

  // 屏幕平面
  const screenGeo = new THREE.PlaneGeometry(30, 20);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x97FFFF, side: THREE.DoubleSide });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(pos.x, 30, pos.z);
  screen.lookAt(new THREE.Vector3(pos.x, 30, pos.z + 1)); // 正对前进方向
  productionLine.add(screen);

  // 文字标签
  const label = document.createElement('div');
  label.className = 'station-label';
  label.innerHTML = `<strong>工作站 ${i + 1}</strong><br>型号: ABC123<br>序列号: SN${String(i).padStart(3, '0')}`;
  label.style.marginTop = '-1em';
  label.style.color = 'white';
  label.style.fontSize = '14px';
  label.style.fontFamily = 'Arial';
  label.style.backgroundColor = 'rgba(0,0,0,0.6)';
  label.style.padding = '8px';
  label.style.borderRadius = '4px';

  const labelObject = new CSS2DObject(label);
  labelObject.position.set(pos.x, 35, pos.z);
  productionLine.add(labelObject);

  // 添加机械臂（简单模拟）
  const armGroup = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 10), new THREE.MeshStandardMaterial({ color: 0xaaaaaa }));
  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), new THREE.MeshStandardMaterial({ color: 0x999999 }));
  const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(5, 25, 5), new THREE.MeshStandardMaterial({ color: 0x888888 }));

  upperArm.position.y = 15;
  lowerArm.position.y = -12.5;

  armGroup.add(base);
  armGroup.add(upperArm);
  armGroup.add(lowerArm);

  armGroup.position.set(pos.x, 5, pos.z - 30);
  productionLine.add(armGroup);

  stations.push({
    index: i,
    position: pos,
    label: label
  });
}

// 托盘队列
const pallets = [];
const palletCount = 5;

for (let i = 0; i < palletCount; i++) {
  const geo = new THREE.BoxGeometry(10, 5, 10);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(curve.getPointAt(i / stationCount));
  productionLine.add(mesh);
  pallets.push({
    mesh,
    currentStation: 0,
    progress: i / stationCount,
    speed: 0.002 + Math.random() * 0.001
  });
}

// 托盘动画逻辑
function animatePallets() {
  for (let p of pallets) {
    p.progress += p.speed;
    if (p.progress >= 1) p.progress = 0;

    const targetStation = Math.floor(p.progress * stationCount);
    if (targetStation !== p.currentStation) {
      p.currentStation = targetStation;
      // 更新所有标签状态
      for (let s of stations) {
        s.label.innerHTML = `<strong>工作站 ${s.index + 1}</strong><br>型号: ABC123<br>序列号: SN${String(s.index).padStart(3, '0')}<br><span style="color:${s.index === p.currentStation ? '#00ff00' : '#ffffff'}">${s.index === p.currentStation ? '运行中' : '空闲'}</span>`;
      }
    }

    const pos = curve.getPointAt(p.progress);
    p.mesh.position.copy(pos);
  }
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  animatePallets();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// 响应窗口变化
window.addEventListener('resize', () => {
  const width = window.innerWidth * 0.75;
  const height = window.innerHeight * 0.75;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);

  renderer.domElement.style.left = '50%';
  renderer.domElement.style.top = '50%';
  renderer.domElement.style.transform = 'translate(-50%, -50%)';

  labelRenderer.domElement.style.left = '50%';
  labelRenderer.domElement.style.top = '50%';
  labelRenderer.domElement.style.transform = 'translate(-50%, -50%)';
});