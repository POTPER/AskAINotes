import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ExcavationMonitoringSystem } from './ExcavationMonitoringSystem.js';
import { GB50497Validator } from './GB50497Validator.js';

class App {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.monitoringSystem = null;
        this.validator = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.placingSensor = false;
        this.currentSensorType = 'horizontal-displacement';
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        // 创建相机
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(50, 30, 50);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // 设置渲染器输出编码（兼容不同THREE.js版本）
        if (THREE.sRGBEncoding !== undefined) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        } else if (THREE.SRGBColorSpace !== undefined) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        
        const container = document.getElementById('canvas-container');
        container.appendChild(this.renderer.domElement);

        // 创建控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2;

        // 添加光照
        this.setupLighting();

        // 创建监测系统
        this.monitoringSystem = new ExcavationMonitoringSystem(this.scene);
        this.validator = new GB50497Validator();

        // 生成默认基坑
        console.log('正在初始化基坑监测系统...');
        try {
            this.generateExcavation();
            console.log('基坑模型生成成功');
        } catch (error) {
            console.error('基坑模型生成失败:', error);
        }
    }

    setupLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);

        // 辅助光源
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
        this.scene.add(hemisphereLight);
    }

    setupEventListeners() {
        // 窗口大小调整
        window.addEventListener('resize', () => this.onWindowResize());

        // 鼠标事件
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));

        // UI控制事件
        document.getElementById('generate-pit').addEventListener('click', () => this.generateExcavation());
        document.getElementById('reset-view').addEventListener('click', () => this.resetView());
        document.getElementById('place-sensor').addEventListener('click', () => this.toggleSensorPlacement());
        document.getElementById('clear-sensors').addEventListener('click', () => this.clearAllSensors());
        document.getElementById('validate-layout').addEventListener('click', () => this.validateSensorLayout());
        
        // 传感器类型选择
        document.getElementById('sensor-type').addEventListener('change', (e) => {
            this.currentSensorType = e.target.value;
        });

        // 基坑参数变化
        ['pit-type', 'safety-level', 'pit-depth', 'pit-length', 'pit-width'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateExcavationParameters());
        });
    }

    generateExcavation() {
        const pitType = document.getElementById('pit-type').value;
        const safetyLevel = parseInt(document.getElementById('safety-level').value);
        const depth = parseFloat(document.getElementById('pit-depth').value);
        const length = parseFloat(document.getElementById('pit-length').value);
        const width = parseFloat(document.getElementById('pit-width').value);

        const config = {
            type: pitType,
            safetyLevel: safetyLevel,
            dimensions: { length, width, depth }
        };

        this.monitoringSystem.generateExcavation(config);
        this.resetView();
    }

    updateExcavationParameters() {
        // 实时更新基坑参数，但不重新生成模型
        const config = this.getCurrentConfig();
        this.monitoringSystem.updateParameters(config);
    }

    getCurrentConfig() {
        return {
            type: document.getElementById('pit-type').value,
            safetyLevel: parseInt(document.getElementById('safety-level').value),
            dimensions: {
                length: parseFloat(document.getElementById('pit-length').value),
                width: parseFloat(document.getElementById('pit-width').value),
                depth: parseFloat(document.getElementById('pit-depth').value)
            }
        };
    }

    resetView() {
        const config = this.getCurrentConfig();
        const { length, width } = config.dimensions;
        const maxDim = Math.max(length, width);
        
        this.camera.position.set(maxDim * 0.8, maxDim * 0.6, maxDim * 0.8);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    toggleSensorPlacement() {
        this.placingSensor = !this.placingSensor;
        const button = document.getElementById('place-sensor');
        
        if (this.placingSensor) {
            button.textContent = '退出布置模式';
            button.classList.remove('btn-primary');
            button.classList.add('btn-danger');
            this.renderer.domElement.style.cursor = 'crosshair';
        } else {
            button.textContent = '布置传感器模式';
            button.classList.remove('btn-danger');
            button.classList.add('btn-primary');
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    onMouseClick(event) {
        if (!this.placingSensor) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.monitoringSystem.getInteractableObjects());
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            const success = this.monitoringSystem.placeSensor(this.currentSensorType, point);
            
            if (success) {
                this.updateSensorList();
                // 可选：播放成功音效或显示提示
                this.showNotification('传感器布置成功', 'success');
            } else {
                this.showNotification('无法在此位置布置传感器', 'error');
            }
        }
    }

    onMouseMove(event) {
        if (!this.placingSensor) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.monitoringSystem.getInteractableObjects());
        
        if (intersects.length > 0) {
            this.renderer.domElement.style.cursor = 'crosshair';
        } else {
            this.renderer.domElement.style.cursor = 'not-allowed';
        }
    }

    clearAllSensors() {
        this.monitoringSystem.clearAllSensors();
        this.updateSensorList();
        this.showNotification('所有传感器已清除', 'info');
    }

    updateSensorList() {
        const sensors = this.monitoringSystem.getSensors();
        const sensorCount = document.getElementById('sensor-count');
        const sensorList = document.getElementById('sensor-list');

        sensorCount.textContent = `已布置传感器: ${sensors.length} 个`;

        if (sensors.length === 0) {
            sensorList.innerHTML = '<div class="loading">暂无传感器</div>';
            return;
        }

        const sensorTypeNames = {
            'horizontal-displacement': '围护墙顶部水平位移',
            'vertical-displacement': '围护墙顶部竖向位移',
            'deep-horizontal': '深层水平位移',
            'support-force': '支撑轴力',
            'anchor-force': '锚杆轴力',
            'water-level': '地下水位',
            'ground-settlement': '周边地表竖向位移'
        };

        sensorList.innerHTML = sensors.map((sensor, index) => `
            <div class="sensor-item">
                <span>${sensorTypeNames[sensor.type] || sensor.type}</span>
                <button onclick="app.removeSensor(${index})" class="btn btn-danger" style="padding: 2px 8px; font-size: 12px;">删除</button>
            </div>
        `).join('');
    }

    removeSensor(index) {
        this.monitoringSystem.removeSensor(index);
        this.updateSensorList();
    }

    validateSensorLayout() {
        const config = this.getCurrentConfig();
        const sensors = this.monitoringSystem.getSensors();
        
        const validationResults = this.validator.validateLayout(config, sensors);
        this.displayValidationResults(validationResults);
    }

    displayValidationResults(results) {
        const container = document.getElementById('validation-results');
        
        if (results.isValid) {
            container.innerHTML = `
                <div class="validation-result validation-success">
                    <h4>✅ 验证通过</h4>
                    <p>传感器布置符合 GB50497-2019 标准要求</p>
                </div>
            `;
        } else {
            const warnings = results.warnings || [];
            const errors = results.errors || [];
            
            let html = '';
            
            if (errors.length > 0) {
                html += `
                    <div class="validation-result validation-error">
                        <h4>❌ 不符合规范要求</h4>
                        <ul>
                            ${errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (warnings.length > 0) {
                html += `
                    <div class="validation-result validation-warning">
                        <h4>⚠️ 建议改进</h4>
                        <ul>
                            ${warnings.map(warning => `<li>${warning}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
    }

    showNotification(message, type = 'info') {
        // 简单的通知系统
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transition: all 0.3s ease;
        `;
        
        switch (type) {
            case 'success':
                notification.style.background = '#28a745';
                break;
            case 'error':
                notification.style.background = '#dc3545';
                break;
            case 'warning':
                notification.style.background = '#ffc107';
                notification.style.color = '#000';
                break;
            default:
                notification.style.background = '#17a2b8';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.monitoringSystem.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// 等待DOM加载完成后再初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化应用...');
    window.app = new App();
});
