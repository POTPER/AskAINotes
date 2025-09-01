import * as THREE from 'three';

export class ExcavationMonitoringSystem {
    constructor(scene) {
        this.scene = scene;
        this.excavationGroup = new THREE.Group();
        this.sensorGroup = new THREE.Group();
        this.interactableObjects = [];
        this.sensors = [];
        this.config = null;
        
        this.scene.add(this.excavationGroup);
        this.scene.add(this.sensorGroup);
        
        this.initMaterials();
        this.createGround();
    }

    initMaterials() {
        // 土体材料
        this.soilMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.8
        });

        // 岩体材料
        this.rockMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x696969,
            transparent: true,
            opacity: 0.9
        });

        // 围护墙材料
        this.wallMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xCCCCCC,
            shininess: 30
        });

        // 支撑材料
        this.supportMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4169E1,
            shininess: 50
        });

        // 传感器材料
        this.sensorMaterials = {
            'horizontal-displacement': new THREE.MeshPhongMaterial({ color: 0xFF0000 }),
            'vertical-displacement': new THREE.MeshPhongMaterial({ color: 0x00FF00 }),
            'deep-horizontal': new THREE.MeshPhongMaterial({ color: 0x0000FF }),
            'support-force': new THREE.MeshPhongMaterial({ color: 0xFFFF00 }),
            'anchor-force': new THREE.MeshPhongMaterial({ color: 0xFF00FF }),
            'water-level': new THREE.MeshPhongMaterial({ color: 0x00FFFF }),
            'ground-settlement': new THREE.MeshPhongMaterial({ color: 0xFFA500 })
        };

        // 地面材料
        this.groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x90EE90,
            transparent: true,
            opacity: 0.7
        });
    }

    createGround() {
        // 创建地面
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const ground = new THREE.Mesh(groundGeometry, this.groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 添加网格
        const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xAAAAAA);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    }

    generateExcavation(config) {
        console.log('开始生成基坑模型:', config);
        this.config = config;
        this.clearExcavation();
        
        const { length, width, depth } = config.dimensions;
        console.log('基坑尺寸:', { length, width, depth });
        
        // 创建基坑主体
        this.createExcavationPit(length, width, depth);
        
        // 根据基坑类型创建不同的地质结构
        switch (config.type) {
            case 'soil':
                this.createSoilLayers(length, width, depth);
                break;
            case 'rock':
                this.createRockLayers(length, width, depth);
                break;
            case 'soil-rock':
                this.createSoilRockLayers(length, width, depth);
                break;
        }
        
        try {
            // 创建围护结构
            this.createRetainingWalls(length, width, depth);
            console.log('围护结构创建完成');
            
            // 创建支撑系统
            this.createSupportSystem(length, width, depth, config.safetyLevel);
            console.log('支撑系统创建完成');
            
            // 创建周边环境
            this.createSurroundingEnvironment(length, width);
            console.log('周边环境创建完成');
            
            console.log('基坑模型生成完成，共有', this.excavationGroup.children.length, '个子对象');
        } catch (error) {
            console.error('创建基坑结构时出错:', error);
        }
    }

    createExcavationPit(length, width, depth) {
        // 创建基坑开挖空间的可视化边界
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(length, depth, width));
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
        line.position.set(0, -depth/2, 0);
        this.excavationGroup.add(line);
    }

    createSoilLayers(length, width, depth) {
        const layers = [
            { height: depth * 0.3, color: 0xD2691E, name: '填土层' },
            { height: depth * 0.4, color: 0xCD853F, name: '粘土层' },
            { height: depth * 0.3, color: 0x8B4513, name: '砂土层' }
        ];

        let currentY = 0;
        layers.forEach((layer, index) => {
            const geometry = new THREE.BoxGeometry(length + 10, layer.height, width + 10);
            const material = new THREE.MeshLambertMaterial({ 
                color: layer.color,
                transparent: true,
                opacity: 0.6
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, currentY - layer.height/2, 0);
            mesh.receiveShadow = true;
            mesh.userData = { type: 'soil-layer', name: layer.name };
            
            this.excavationGroup.add(mesh);
            currentY -= layer.height;
        });
    }

    createRockLayers(length, width, depth) {
        const geometry = new THREE.BoxGeometry(length + 10, depth, width + 10);
        const mesh = new THREE.Mesh(geometry, this.rockMaterial);
        mesh.position.set(0, -depth/2, 0);
        mesh.receiveShadow = true;
        mesh.userData = { type: 'rock-layer', name: '岩体' };
        
        this.excavationGroup.add(mesh);
    }

    createSoilRockLayers(length, width, depth) {
        // 上部土层
        const soilHeight = depth * 0.6;
        const soilGeometry = new THREE.BoxGeometry(length + 10, soilHeight, width + 10);
        const soilMesh = new THREE.Mesh(soilGeometry, this.soilMaterial);
        soilMesh.position.set(0, -soilHeight/2, 0);
        soilMesh.receiveShadow = true;
        soilMesh.userData = { type: 'soil-layer', name: '土层' };
        this.excavationGroup.add(soilMesh);

        // 下部岩层
        const rockHeight = depth * 0.4;
        const rockGeometry = new THREE.BoxGeometry(length + 10, rockHeight, width + 10);
        const rockMesh = new THREE.Mesh(rockGeometry, this.rockMaterial);
        rockMesh.position.set(0, -soilHeight - rockHeight/2, 0);
        rockMesh.receiveShadow = true;
        rockMesh.userData = { type: 'rock-layer', name: '岩层' };
        this.excavationGroup.add(rockMesh);
    }

    createRetainingWalls(length, width, depth) {
        const wallThickness = 0.8;
        const wallHeight = depth + 2; // 围护墙高出地面
        
        // 四面围护墙
        const walls = [
            { pos: [length/2 + wallThickness/2, wallHeight/2 - 1, 0], size: [wallThickness, wallHeight, width] },
            { pos: [-length/2 - wallThickness/2, wallHeight/2 - 1, 0], size: [wallThickness, wallHeight, width] },
            { pos: [0, wallHeight/2 - 1, width/2 + wallThickness/2], size: [length, wallHeight, wallThickness] },
            { pos: [0, wallHeight/2 - 1, -width/2 - wallThickness/2], size: [length, wallHeight, wallThickness] }
        ];

        walls.forEach((wall, index) => {
            const geometry = new THREE.BoxGeometry(...wall.size);
            const mesh = new THREE.Mesh(geometry, this.wallMaterial);
            mesh.position.set(...wall.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { type: 'retaining-wall', id: index };
            
            this.excavationGroup.add(mesh);
            this.interactableObjects.push(mesh);
        });

        // 冠梁
        this.createCrownBeam(length, width);
    }

    createCrownBeam(length, width) {
        const beamSize = 0.6;
        const beamPositions = [
            [length/2 + 0.4, 1 + beamSize/2, 0, length + 0.8, beamSize, beamSize],
            [-length/2 - 0.4, 1 + beamSize/2, 0, length + 0.8, beamSize, beamSize],
            [0, 1 + beamSize/2, width/2 + 0.4, beamSize, beamSize, width + 0.8],
            [0, 1 + beamSize/2, -width/2 - 0.4, beamSize, beamSize, width + 0.8]
        ];

        beamPositions.forEach((pos, index) => {
            const geometry = new THREE.BoxGeometry(pos[3], pos[4], pos[5]);
            const mesh = new THREE.Mesh(geometry, this.wallMaterial);
            mesh.position.set(pos[0], pos[1], pos[2]);
            mesh.castShadow = true;
            mesh.userData = { type: 'crown-beam', id: index };
            
            this.excavationGroup.add(mesh);
            this.interactableObjects.push(mesh);
        });
    }

    createSupportSystem(length, width, depth, safetyLevel) {
        if (safetyLevel === 3 && depth < 8) return; // 三级基坑较浅时可能不需要支撑

        const supportLevels = Math.min(Math.floor(depth / 4), 3); // 最多3层支撑
        
        for (let level = 0; level < supportLevels; level++) {
            const y = -2 - level * (depth / (supportLevels + 1));
            
            // 水平支撑
            this.createHorizontalSupports(length, width, y, level);
            
            // 立柱
            if (level === 0) {
                this.createColumns(length, width, depth);
            }
        }
    }

    createHorizontalSupports(length, width, y, level) {
        const supportRadius = 0.3;
        const supportPositions = [];

        // 根据基坑大小确定支撑布置
        if (length > 20 || width > 20) {
            // 大型基坑：十字形支撑
            supportPositions.push(
                { start: [-length/2, y, 0], end: [length/2, y, 0] },
                { start: [0, y, -width/2], end: [0, y, width/2] }
            );
        } else {
            // 中小型基坑：对角支撑
            supportPositions.push(
                { start: [-length/2 + 2, y, -width/2 + 2], end: [length/2 - 2, y, width/2 - 2] },
                { start: [-length/2 + 2, y, width/2 - 2], end: [length/2 - 2, y, -width/2 + 2] }
            );
        }

        supportPositions.forEach((support, index) => {
            const start = new THREE.Vector3(...support.start);
            const end = new THREE.Vector3(...support.end);
            const distance = start.distanceTo(end);
            
            const geometry = new THREE.CylinderGeometry(supportRadius, supportRadius, distance);
            const mesh = new THREE.Mesh(geometry, this.supportMaterial);
            
            // 计算支撑的位置和旋转
            const midPoint = start.clone().add(end).multiplyScalar(0.5);
            mesh.position.copy(midPoint);
            
            const direction = end.clone().sub(start).normalize();
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
            mesh.setRotationFromQuaternion(quaternion);
            
            mesh.castShadow = true;
            mesh.userData = { type: 'support', level: level, id: index };
            
            this.excavationGroup.add(mesh);
            this.interactableObjects.push(mesh);
        });
    }

    createColumns(length, width, depth) {
        const columnRadius = 0.4;
        const columnPositions = [
            [0, 0, 0], // 中心立柱
        ];

        // 根据基坑大小添加更多立柱
        if (length > 25 || width > 25) {
            columnPositions.push(
                [-length/4, 0, -width/4],
                [length/4, 0, -width/4],
                [-length/4, 0, width/4],
                [length/4, 0, width/4]
            );
        }

        columnPositions.forEach((pos, index) => {
            const geometry = new THREE.CylinderGeometry(columnRadius, columnRadius, depth + 2);
            const mesh = new THREE.Mesh(geometry, this.supportMaterial);
            mesh.position.set(pos[0], -depth/2, pos[2]);
            mesh.castShadow = true;
            mesh.userData = { type: 'column', id: index };
            
            this.excavationGroup.add(mesh);
            this.interactableObjects.push(mesh);
        });
    }

    createSurroundingEnvironment(length, width) {
        // 创建周边建筑物（简化表示）
        const buildingPositions = [
            { pos: [length/2 + 15, 6, width/2 + 10], size: [8, 12, 6] },
            { pos: [-length/2 - 12, 4, -width/2 - 8], size: [6, 8, 5] },
            { pos: [length/2 + 20, 8, -width/2 - 15], size: [10, 16, 8] }
        ];

        buildingPositions.forEach((building, index) => {
            const geometry = new THREE.BoxGeometry(...building.size);
            const material = new THREE.MeshLambertMaterial({ 
                color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.1, 0.3, 0.6)
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...building.pos);
            mesh.position.y = building.size[1] / 2;
            mesh.castShadow = true;
            mesh.userData = { type: 'building', id: index };
            
            this.excavationGroup.add(mesh);
        });

        // 创建道路
        this.createRoads(length, width);
    }

    createRoads(length, width) {
        const roadWidth = 8;
        const roadThickness = 0.2;
        
        // 主要道路
        const roads = [
            { pos: [0, roadThickness/2, width/2 + 15], size: [length + 40, roadThickness, roadWidth] },
            { pos: [length/2 + 15, roadThickness/2, 0], size: [roadWidth, roadThickness, width + 40] }
        ];

        roads.forEach((road, index) => {
            const geometry = new THREE.BoxGeometry(...road.size);
            const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...road.pos);
            mesh.receiveShadow = true;
            mesh.userData = { type: 'road', id: index };
            
            this.excavationGroup.add(mesh);
            this.interactableObjects.push(mesh);
        });
    }

    placeSensor(type, position) {
        // 检查位置是否合适
        if (!this.isValidSensorPosition(type, position)) {
            return false;
        }

        const sensorGeometry = new THREE.SphereGeometry(0.5, 8, 6);
        const sensorMaterial = this.sensorMaterials[type] || this.sensorMaterials['horizontal-displacement'];
        
        const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial);
        sensor.position.copy(position);
        sensor.castShadow = true;
        sensor.userData = { 
            type: type, 
            position: position.clone(),
            timestamp: Date.now()
        };

        this.sensorGroup.add(sensor);
        this.sensors.push({
            type: type,
            position: position.clone(),
            mesh: sensor,
            id: this.sensors.length
        });

        return true;
    }

    isValidSensorPosition(type, position) {
        // 基本的位置验证逻辑
        const { length, width, depth } = this.config.dimensions;
        
        // 检查是否在基坑范围内或周边合理距离
        const maxDistance = Math.max(length, width) * 2;
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        
        if (distance > maxDistance) return false;

        // 根据传感器类型进行特定验证
        switch (type) {
            case 'horizontal-displacement':
            case 'vertical-displacement':
                // 应布置在围护墙顶部
                return Math.abs(position.y - 1) < 2;
                
            case 'ground-settlement':
                // 应布置在地表
                return Math.abs(position.y) < 1;
                
            case 'water-level':
                // 可以布置在基坑内部或周边
                return true;
                
            default:
                return true;
        }
    }

    removeSensor(index) {
        if (index >= 0 && index < this.sensors.length) {
            const sensor = this.sensors[index];
            this.sensorGroup.remove(sensor.mesh);
            this.sensors.splice(index, 1);
            
            // 更新剩余传感器的ID
            this.sensors.forEach((s, i) => s.id = i);
        }
    }

    clearAllSensors() {
        this.sensors.forEach(sensor => {
            this.sensorGroup.remove(sensor.mesh);
        });
        this.sensors = [];
    }

    clearExcavation() {
        this.excavationGroup.clear();
        this.interactableObjects = [];
    }

    updateParameters(config) {
        this.config = config;
    }

    getSensors() {
        return this.sensors.map(sensor => ({
            type: sensor.type,
            position: sensor.position,
            id: sensor.id
        }));
    }

    getInteractableObjects() {
        return this.interactableObjects;
    }

    update() {
        // 传感器动画效果
        this.sensors.forEach((sensor, index) => {
            if (sensor.mesh) {
                sensor.mesh.rotation.y += 0.01;
                // 简单的呼吸效果
                const scale = 1 + Math.sin(Date.now() * 0.003 + index) * 0.1;
                sensor.mesh.scale.setScalar(scale);
            }
        });
    }
}
