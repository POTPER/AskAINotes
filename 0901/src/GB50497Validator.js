/**
 * GB50497-2019 建筑基坑工程监测技术标准验证器
 * 根据规范要求验证传感器布置的合理性
 */
export class GB50497Validator {
    constructor() {
        // 根据GB50497-2019标准定义监测项目要求
        this.monitoringRequirements = {
            soil: {
                1: { // 一级基坑
                    required: [
                        'horizontal-displacement',  // 围护墙顶部水平位移
                        'vertical-displacement',    // 围护墙顶部竖向位移
                        'deep-horizontal',         // 深层水平位移
                        'support-force',           // 支撑轴力
                        'water-level',             // 地下水位
                        'ground-settlement'        // 周边地表竖向位移
                    ],
                    recommended: ['anchor-force'], // 锚杆轴力
                    optional: ['wall-internal-force', 'pore-pressure', 'soil-pressure']
                },
                2: { // 二级基坑
                    required: [
                        'horizontal-displacement',
                        'vertical-displacement',
                        'deep-horizontal',
                        'support-force',
                        'water-level',
                        'ground-settlement'
                    ],
                    recommended: ['anchor-force'],
                    optional: ['wall-internal-force', 'pore-pressure']
                },
                3: { // 三级基坑
                    required: [
                        'horizontal-displacement',
                        'vertical-displacement',
                        'water-level'
                    ],
                    recommended: ['deep-horizontal', 'support-force', 'ground-settlement'],
                    optional: ['anchor-force']
                }
            },
            rock: {
                1: {
                    required: [
                        'horizontal-displacement',
                        'vertical-displacement',
                        'anchor-force',
                        'ground-settlement'
                    ],
                    recommended: ['water-level'],
                    optional: []
                },
                2: {
                    required: [
                        'horizontal-displacement',
                        'ground-settlement'
                    ],
                    recommended: ['vertical-displacement', 'anchor-force', 'water-level'],
                    optional: []
                },
                3: {
                    required: ['horizontal-displacement'],
                    recommended: ['ground-settlement'],
                    optional: ['vertical-displacement', 'anchor-force']
                }
            },
            'soil-rock': {
                // 土岩组合基坑按土质基坑和岩体基坑要求组合
                1: {
                    required: [
                        'horizontal-displacement',
                        'vertical-displacement',
                        'deep-horizontal',
                        'support-force',
                        'anchor-force',
                        'water-level',
                        'ground-settlement'
                    ],
                    recommended: [],
                    optional: ['wall-internal-force', 'pore-pressure']
                },
                2: {
                    required: [
                        'horizontal-displacement',
                        'vertical-displacement',
                        'deep-horizontal',
                        'support-force',
                        'water-level',
                        'ground-settlement'
                    ],
                    recommended: ['anchor-force'],
                    optional: []
                },
                3: {
                    required: [
                        'horizontal-displacement',
                        'vertical-displacement',
                        'water-level'
                    ],
                    recommended: ['deep-horizontal', 'support-force', 'ground-settlement'],
                    optional: ['anchor-force']
                }
            }
        };

        // 传感器布置要求（基于规范第5章）
        this.layoutRequirements = {
            'horizontal-displacement': {
                minPointsPerSide: 3,  // 每边不少于3点
                preferredLocations: ['middle', 'corner'], // 中部、阳角处
                description: '围护墙顶部水平位移监测点'
            },
            'vertical-displacement': {
                minPointsPerSide: 3,
                preferredLocations: ['middle', 'corner'],
                description: '围护墙顶部竖向位移监测点'
            },
            'deep-horizontal': {
                minPoints: 2, // 每侧中部、阳角处
                maxSpacing: 50, // 边长大于50m时适当增设
                description: '深层水平位移监测点'
            },
            'support-force': {
                minPointsPerLevel: 2, // 每层支撑至少2个监测点
                description: '支撑轴力监测点'
            },
            'ground-settlement': {
                monitoringRange: 3, // 1-3倍基坑深度范围
                description: '周边地表竖向位移监测点'
            },
            'water-level': {
                minPoints: 2, // 基坑中央和周边
                description: '地下水位监测点'
            }
        };
    }

    /**
     * 验证传感器布置是否符合GB50497-2019标准
     * @param {Object} config 基坑配置
     * @param {Array} sensors 已布置的传感器
     * @returns {Object} 验证结果
     */
    validateLayout(config, sensors) {
        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
            compliance: {}
        };

        // 获取该类型基坑的监测要求
        const requirements = this.monitoringRequirements[config.type][config.safetyLevel];
        if (!requirements) {
            results.errors.push(`未找到${config.type}类型${config.safetyLevel}级基坑的监测要求`);
            results.isValid = false;
            return results;
        }

        // 检查必测项目
        results.compliance.required = this.checkRequiredSensors(requirements.required, sensors, results);
        
        // 检查建议测量项目
        results.compliance.recommended = this.checkRecommendedSensors(requirements.recommended, sensors, results);

        // 检查传感器布置的合理性
        results.compliance.layout = this.checkSensorLayout(config, sensors, results);

        // 检查传感器数量是否合理
        results.compliance.quantity = this.checkSensorQuantity(config, sensors, results);

        // 检查监测范围
        results.compliance.range = this.checkMonitoringRange(config, sensors, results);

        // 根据基坑深度检查是否需要监测
        this.checkMonitoringNecessity(config, results);

        // 汇总验证结果
        results.isValid = results.errors.length === 0;

        return results;
    }

    checkRequiredSensors(requiredTypes, sensors, results) {
        const sensorTypes = sensors.map(s => s.type);
        const compliance = {};

        requiredTypes.forEach(type => {
            const count = sensorTypes.filter(t => t === type).length;
            compliance[type] = count;

            if (count === 0) {
                results.errors.push(`缺少必测项目：${this.getSensorTypeName(type)}`);
            } else if (count < this.getMinimumSensorCount(type)) {
                results.warnings.push(`${this.getSensorTypeName(type)}数量不足，建议增加至${this.getMinimumSensorCount(type)}个以上`);
            }
        });

        return compliance;
    }

    checkRecommendedSensors(recommendedTypes, sensors, results) {
        const sensorTypes = sensors.map(s => s.type);
        const compliance = {};

        recommendedTypes.forEach(type => {
            const count = sensorTypes.filter(t => t === type).length;
            compliance[type] = count;

            if (count === 0) {
                results.suggestions.push(`建议增加：${this.getSensorTypeName(type)}`);
            }
        });

        return compliance;
    }

    checkSensorLayout(config, sensors, results) {
        const { length, width, depth } = config.dimensions;
        const layoutResults = {};

        // 检查围护墙顶部位移监测点布置
        this.checkWallDisplacementLayout(sensors, length, width, results, layoutResults);

        // 检查深层水平位移监测点
        this.checkDeepHorizontalLayout(sensors, length, width, results, layoutResults);

        // 检查地表沉降监测点
        this.checkGroundSettlementLayout(sensors, length, width, depth, results, layoutResults);

        return layoutResults;
    }

    checkWallDisplacementLayout(sensors, length, width, results, layoutResults) {
        const wallSensors = sensors.filter(s => 
            s.type === 'horizontal-displacement' || s.type === 'vertical-displacement'
        );

        layoutResults.wallDisplacement = {
            total: wallSensors.length,
            distribution: this.analyzeSensorDistribution(wallSensors, length, width)
        };

        if (wallSensors.length < 12) { // 4边 × 3点/边
            results.warnings.push('围护墙位移监测点数量偏少，建议每边至少布置3个监测点');
        }

        // 检查是否在关键位置（中部、阳角）布置
        const criticalPositions = this.identifyCriticalPositions(wallSensors, length, width);
        if (criticalPositions.missingMiddle > 0) {
            results.warnings.push(`有${criticalPositions.missingMiddle}边缺少中部监测点`);
        }
        if (criticalPositions.missingCorner > 0) {
            results.warnings.push(`有${criticalPositions.missingCorner}个阳角缺少监测点`);
        }
    }

    checkDeepHorizontalLayout(sensors, length, width, results, layoutResults) {
        const deepSensors = sensors.filter(s => s.type === 'deep-horizontal');
        
        layoutResults.deepHorizontal = {
            total: deepSensors.length,
            distribution: this.analyzeSensorDistribution(deepSensors, length, width)
        };

        const maxEdgeLength = Math.max(length, width);
        const recommendedCount = maxEdgeLength > 50 ? 6 : 4; // 大于50m的边适当增设

        if (deepSensors.length < recommendedCount) {
            results.warnings.push(`深层水平位移监测点建议增加至${recommendedCount}个`);
        }
    }

    checkGroundSettlementLayout(sensors, length, width, depth, results, layoutResults) {
        const settlementSensors = sensors.filter(s => s.type === 'ground-settlement');
        
        layoutResults.groundSettlement = {
            total: settlementSensors.length,
            range: this.calculateMonitoringRange(settlementSensors, length, width)
        };

        const requiredRange = depth * 2; // 建议监测范围为2倍基坑深度
        const actualRange = layoutResults.groundSettlement.range;

        if (actualRange < requiredRange) {
            results.warnings.push(`地表沉降监测范围不足，建议扩大至基坑边线外${requiredRange}m`);
        }

        if (settlementSensors.length < 8) {
            results.warnings.push('周边地表沉降监测点数量偏少，建议在重要保护对象周边加密布置');
        }
    }

    checkSensorQuantity(config, sensors, results) {
        const { length, width, depth } = config.dimensions;
        const perimeter = 2 * (length + width);
        const area = length * width;

        // 基于基坑规模的传感器密度建议
        const recommendedDensity = this.calculateRecommendedDensity(config);
        const actualDensity = sensors.length / perimeter;

        return {
            total: sensors.length,
            density: actualDensity,
            recommended: recommendedDensity,
            adequate: actualDensity >= recommendedDensity * 0.8
        };
    }

    checkMonitoringRange(config, sensors, results) {
        const { length, width, depth } = config.dimensions;
        const maxDistance = Math.max(length, width) * 1.5; // 1-3倍基坑深度

        const outsideSensors = sensors.filter(sensor => {
            const distance = Math.sqrt(sensor.position.x ** 2 + sensor.position.z ** 2);
            return distance > Math.max(length, width) / 2;
        });

        const coverage = {
            total: sensors.length,
            outside: outsideSensors.length,
            maxDistance: Math.max(...sensors.map(s => 
                Math.sqrt(s.position.x ** 2 + s.position.z ** 2)
            ), 0),
            recommendedMaxDistance: maxDistance
        };

        if (coverage.outside < sensors.length * 0.3) {
            results.warnings.push('建议在基坑周边环境中布置更多监测点');
        }

        return coverage;
    }

    checkMonitoringNecessity(config, results) {
        const { depth } = config.dimensions;

        // 根据3.0.1条检查是否需要监测
        if (config.safetyLevel <= 2) {
            // 一、二级基坑必须监测
            results.suggestions.push('该基坑属于一、二级基坑，必须实施监测');
        } else if (depth >= 5) {
            // 开挖深度≥5m的基坑需要监测
            results.suggestions.push('基坑开挖深度≥5m，应实施监测');
        } else {
            results.suggestions.push('基坑开挖深度<5m且为三级基坑，可根据现场情况决定是否监测');
        }
    }

    // 辅助方法
    getSensorTypeName(type) {
        const names = {
            'horizontal-displacement': '围护墙顶部水平位移',
            'vertical-displacement': '围护墙顶部竖向位移',
            'deep-horizontal': '深层水平位移',
            'support-force': '支撑轴力',
            'anchor-force': '锚杆轴力',
            'water-level': '地下水位',
            'ground-settlement': '周边地表竖向位移'
        };
        return names[type] || type;
    }

    getMinimumSensorCount(type) {
        const minimums = {
            'horizontal-displacement': 8,
            'vertical-displacement': 8,
            'deep-horizontal': 4,
            'support-force': 4,
            'anchor-force': 2,
            'water-level': 2,
            'ground-settlement': 6
        };
        return minimums[type] || 1;
    }

    analyzeSensorDistribution(sensors, length, width) {
        // 分析传感器在基坑周边的分布情况
        const distribution = {
            north: 0, south: 0, east: 0, west: 0,
            corners: 0, middle: 0
        };

        sensors.forEach(sensor => {
            const { x, z } = sensor.position;
            
            // 判断位置
            if (Math.abs(x - length/2) < 2) distribution.east++;
            else if (Math.abs(x + length/2) < 2) distribution.west++;
            else if (Math.abs(z - width/2) < 2) distribution.north++;
            else if (Math.abs(z + width/2) < 2) distribution.south++;

            // 判断是否在角部或中部
            const isCorner = (Math.abs(Math.abs(x) - length/2) < 3) && 
                           (Math.abs(Math.abs(z) - width/2) < 3);
            const isMiddle = (Math.abs(x) < length/4) || (Math.abs(z) < width/4);

            if (isCorner) distribution.corners++;
            if (isMiddle) distribution.middle++;
        });

        return distribution;
    }

    identifyCriticalPositions(sensors, length, width) {
        // 识别关键位置的传感器布置情况
        const sides = [
            { name: 'east', sensors: [] },
            { name: 'west', sensors: [] },
            { name: 'north', sensors: [] },
            { name: 'south', sensors: [] }
        ];

        // 将传感器分配到各边
        sensors.forEach(sensor => {
            const { x, z } = sensor.position;
            if (Math.abs(x - length/2) < 2) sides[0].sensors.push(sensor);
            else if (Math.abs(x + length/2) < 2) sides[1].sensors.push(sensor);
            else if (Math.abs(z - width/2) < 2) sides[2].sensors.push(sensor);
            else if (Math.abs(z + width/2) < 2) sides[3].sensors.push(sensor);
        });

        let missingMiddle = 0;
        let missingCorner = 0;

        sides.forEach(side => {
            if (side.sensors.length < 3) missingMiddle++;
        });

        // 检查四个角点
        const corners = [
            [length/2, width/2], [-length/2, width/2],
            [-length/2, -width/2], [length/2, -width/2]
        ];

        corners.forEach(corner => {
            const hasCornerSensor = sensors.some(sensor => {
                const distance = Math.sqrt(
                    (sensor.position.x - corner[0]) ** 2 + 
                    (sensor.position.z - corner[1]) ** 2
                );
                return distance < 5;
            });
            if (!hasCornerSensor) missingCorner++;
        });

        return { missingMiddle, missingCorner };
    }

    calculateMonitoringRange(sensors, length, width) {
        // 计算监测范围
        const pitCenter = [0, 0];
        const pitBoundary = Math.max(length, width) / 2;

        const maxDistance = Math.max(...sensors.map(sensor => {
            const distance = Math.sqrt(sensor.position.x ** 2 + sensor.position.z ** 2);
            return distance - pitBoundary;
        }), 0);

        return maxDistance;
    }

    calculateRecommendedDensity(config) {
        // 根据基坑规模和安全等级计算建议的传感器密度
        const { safetyLevel } = config;
        const baseDensity = {
            1: 0.8,  // 一级基坑
            2: 0.6,  // 二级基坑
            3: 0.4   // 三级基坑
        };

        return baseDensity[safetyLevel] || 0.5;
    }
}
