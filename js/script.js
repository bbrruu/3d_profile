// 全域變數
let scene, camera, renderer, controls;
let heroScene, heroCamera, heroRenderer, heroControls;
let modalScene, modalCamera, modalRenderer, modalControls;
let currentModel = null;
let isAutoRotating = true;

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initHero3D();
    initMainViewer();
    initEventListeners();
    initScrollAnimations();
});

// 初始化首頁3D場景
function initHero3D() {
    const container = document.getElementById('hero-model-container');
    if (!container) return;

    // 場景設置
    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    heroRenderer.setSize(container.clientWidth, container.clientHeight);
    heroRenderer.setClearColor(0x000000, 0);
    heroRenderer.shadowMap.enabled = true;
    heroRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(heroRenderer.domElement);

    // 控制器
    heroControls = new THREE.OrbitControls(heroCamera, heroRenderer.domElement);
    heroControls.enableDamping = true;
    heroControls.dampingFactor = 0.05;
    heroControls.autoRotate = true;
    heroControls.autoRotateSpeed = 1;

    // 燈光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    heroScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    heroScene.add(directionalLight);

    // 創建展示用的幾何體
    createHeroGeometry();

    // 相機位置
    heroCamera.position.set(5, 5, 5);
    heroCamera.lookAt(0, 0, 0);

    // 渲染循環
    function animateHero() {
        requestAnimationFrame(animateHero);
        heroControls.update();
        heroRenderer.render(heroScene, heroCamera);
    }
    animateHero();

    // 響應式調整
    window.addEventListener('resize', () => {
        if (container.clientWidth > 0) {
            heroCamera.aspect = container.clientWidth / container.clientHeight;
            heroCamera.updateProjectionMatrix();
            heroRenderer.setSize(container.clientWidth, container.clientHeight);
        }
    });

    // 自動載入FBX模型到首頁展示
    setTimeout(() => {
        console.log('檢查FBXLoader是否可用...');
        if (typeof THREE.FBXLoader === 'undefined') {
            console.error('FBXLoader未載入，嘗試備用方案...');
            createHeroGeometry(); // 回退到幾何體展示
            return;
        }
        console.log('FBXLoader已載入，正在載入首頁FBX模型...');
        loadModel('models/3D_sample.fbx', heroScene, heroCamera, heroRenderer);
    }, 2000); // 增加延遲到2秒確保所有庫都載入
}

// 創建首頁展示幾何體
function createHeroGeometry() {
    const group = new THREE.Group();

    // 主要立方體
    const geometry1 = new THREE.BoxGeometry(2, 2, 2);
    const material1 = new THREE.MeshLambertMaterial({ 
        color: 0x3498db,
        transparent: true,
        opacity: 0.8
    });
    const cube = new THREE.Mesh(geometry1, material1);
    cube.position.set(0, 0, 0);
    cube.castShadow = true;
    group.add(cube);

    // 環繞的小球
    for (let i = 0; i < 8; i++) {
        const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const sphereMaterial = new THREE.MeshLambertMaterial({ 
            color: Math.random() * 0xffffff 
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        const angle = (i / 8) * Math.PI * 2;
        sphere.position.set(
            Math.cos(angle) * 3,
            Math.sin(i * 0.5) * 2,
            Math.sin(angle) * 3
        );
        sphere.castShadow = true;
        group.add(sphere);
    }

    heroScene.add(group);

    // 添加動畫
    function animateGeometry() {
        group.rotation.y += 0.01;
        group.children.forEach((child, index) => {
            if (index > 0) { // 跳過主立方體
                child.rotation.x += 0.02;
                child.rotation.y += 0.03;
            }
        });
        requestAnimationFrame(animateGeometry);
    }
    animateGeometry();
}

// 初始化主要3D查看器
function initMainViewer() {
    const container = document.getElementById('model-viewer');
    if (!container) return;

    // 場景設置
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xf0f0f0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    // 燈光設置
    setupLighting(scene);

    // 添加網格地板
    addGridFloor(scene);

    // 相機位置
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // 渲染循環
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // 響應式調整
    window.addEventListener('resize', () => {
        if (container.clientWidth > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    });
}

// 設置燈光
function setupLighting(targetScene) {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    targetScene.add(ambientLight);

    // 主方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    targetScene.add(directionalLight);

    // 補充光源
    const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
    light2.position.set(-10, 5, -5);
    targetScene.add(light2);
}

// 添加網格地板
function addGridFloor(targetScene) {
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xcccccc);
    targetScene.add(gridHelper);
}

// 載入3D模型
function loadModel(modelPath, targetScene, targetCamera, targetRenderer) {
    if (!modelPath) {
        console.error('模型路徑為空');
        return;
    }

    console.log('開始載入模型:', modelPath);
    console.log('目標場景:', targetScene ? '已設定' : '未設定');
    console.log('Three.js 版本:', THREE.REVISION);
    console.log('FBXLoader 可用:', typeof THREE.FBXLoader !== 'undefined');

    // 獲取文件擴展名
    const extension = modelPath.split('.').pop().toLowerCase();
    console.log('檔案擴展名:', extension);
    
    // 顯示載入提示
    showLoadingIndicator();

    // 根據文件擴展名選擇載入器
    if (extension === 'fbx') {
        if (typeof THREE.FBXLoader === 'undefined') {
            console.error('FBXLoader 未載入！');
            hideLoadingIndicator();
            showErrorMessage('FBXLoader 未載入，請重新整理頁面或檢查網路連線');
            return;
        }

        console.log('創建 FBXLoader 實例...');
        const loader = new THREE.FBXLoader();
        console.log('FBXLoader 實例已創建，開始載入:', modelPath);
        
        // 添加超時處理
        const timeoutId = setTimeout(() => {
            console.error('FBX 載入超時 (30秒)');
            hideLoadingIndicator();
            showErrorMessage('模型載入超時，請檢查網路連線或模型檔案大小');
        }, 30000); // 30秒超時
        
        loader.load(
            modelPath,
            function(object) {
                clearTimeout(timeoutId); // 清除超時計時器
                console.log('✅ FBX 模型載入成功:', object);
                console.log('模型類型:', object.type);
                console.log('子物件數量:', object.children.length);
                // 移除之前的模型
                if (currentModel) {
                    targetScene.remove(currentModel);
                    console.log('移除舊模型');
                }

                currentModel = object;
                
                // 調整模型大小和位置
                const box = new THREE.Box3().setFromObject(currentModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                console.log('模型原始尺寸:', size);
                console.log('模型原始中心:', center);
                
                // 縮放模型以適應視窗
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                currentModel.scale.setScalar(scale);
                
                // 重新計算縮放後的邊界框和中心點
                const scaledBox = new THREE.Box3().setFromObject(currentModel);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                
                // 正確置中模型 - 將縮放後的中心移動到原點(0,0,0)
                currentModel.position.set(
                    -scaledCenter.x,
                    -scaledCenter.y,
                    -scaledCenter.z
                );
                
                console.log('縮放比例:', scale);
                console.log('縮放後中心:', scaledCenter);
                console.log('最終位置:', currentModel.position);
                
                // 啟用陰影和修復材質
                let materialCount = 0;
                let fixedCount = 0;
                
                currentModel.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        materialCount++;
                        
                        console.log(`檢查網格: ${child.name || 'unnamed'}, 材質: ${child.material ? child.material.type : 'none'}`);
                        
                        // 檢查和修復材質 - 保持原始顏色
                        if (!child.material) {
                            // 如果沒有材質，添加藍色默認材質（符合模型師說的藍色）
                            child.material = new THREE.MeshLambertMaterial({
                                color: 0x4a90e2, // 藍色
                                transparent: false
                            });
                            console.log(`為網格添加藍色材質:`, child.name || 'unnamed');
                            fixedCount++;
                        } else {
                            // 保持原始顏色，只轉換材質類型以支援光照
                            if (child.material.type === 'MeshBasicMaterial') {
                                // 將BasicMaterial轉換為Lambert以支援光照，保持原始顏色
                                let originalColor;
                                try {
                                    originalColor = child.material.color && child.material.color.clone ? 
                                        child.material.color.clone() : new THREE.Color(0x4a90e2);
                                } catch (e) {
                                    originalColor = new THREE.Color(0x4a90e2);
                                    console.warn('無法複製原始顏色，使用預設藍色:', e);
                                }
                                
                                child.material = new THREE.MeshLambertMaterial({
                                    color: originalColor,
                                    transparent: child.material.transparent || false,
                                    opacity: child.material.opacity || 1.0
                                });
                                console.log(`材質已轉換為Lambert，保持原色 (#${originalColor.getHexString()}):`, child.name || 'unnamed');
                                fixedCount++;
                            } else if (child.material.color) {
                                // 檢查原始顏色，只有在太暗時才調整為藍色
                                const color = child.material.color;
                                if (color.r < 0.1 && color.g < 0.1 && color.b < 0.1) {
                                    // 設為藍色（符合模型師描述）
                                    color.setHex(0x4a90e2);
                                    console.log(`調整暗色材質為藍色:`, child.name || 'unnamed');
                                    fixedCount++;
                                } else {
                                    // 保持原始顏色
                                    console.log(`保持原始顏色 (#${color.getHexString()}):`, child.name || 'unnamed');
                                }
                            }
                            
                            // 確保材質有顏色屬性
                            if (!child.material.color) {
                                child.material.color = new THREE.Color(0x4a90e2); // 默認藍色
                                console.log('為材質添加藍色屬性:', child.name || 'unnamed');
                                fixedCount++;
                            }
                        }
                        
                        console.log(`網格材質詳情: ${child.name || 'unnamed'} - 類型: ${child.material.type}, 顏色: #${child.material.color.getHexString()}`);
                    }
                });

                console.log(`FBX載入完成: 處理了 ${materialCount} 個網格, 修復了 ${fixedCount} 個材質`);
                targetScene.add(currentModel);
                hideLoadingIndicator();
            },
            function(progress) {
                const percentage = progress.total > 0 ? (progress.loaded / progress.total * 100) : 0;
                console.log('FBX載入進度: ' + percentage.toFixed(1) + '% (' + progress.loaded + '/' + progress.total + ' bytes)');
                updateLoadingProgress(progress.loaded, progress.total, '正在載入FBX模型...');
            },
            function(error) {
                clearTimeout(timeoutId); // 清除超時計時器
                console.error('❌ 載入FBX模型時發生錯誤:', error);
                console.error('錯誤詳情:', error.message || error);
                console.error('模型路徑:', modelPath);
                hideLoadingIndicator();
                showErrorMessage('無法載入FBX模型: ' + (error.message || '未知錯誤'));
            }
        );
    } else if (extension === 'obj') {
        const loader = new THREE.OBJLoader();
        
        loader.load(
            modelPath,
            function(object) {
                // 移除之前的模型
                if (currentModel) {
                    targetScene.remove(currentModel);
                }

                currentModel = object;
                
                // 調整模型大小和位置
                const box = new THREE.Box3().setFromObject(currentModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                console.log('OBJ模型原始尺寸:', size);
                console.log('OBJ模型原始中心:', center);
                
                // 縮放模型以適應視窗
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                currentModel.scale.setScalar(scale);
                
                // 重新計算縮放後的邊界框和中心點
                const scaledBox = new THREE.Box3().setFromObject(currentModel);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                
                // 正確置中模型
                currentModel.position.set(
                    -scaledCenter.x,
                    -scaledCenter.y,
                    -scaledCenter.z
                );
                
                console.log('OBJ縮放比例:', scale);
                console.log('OBJ最終位置:', currentModel.position);
                
                // 為OBJ模型添加材質（OBJ通常沒有材質資訊）
                let materialCount = 0;
                
                currentModel.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        materialCount++;
                        
                        // OBJ檔案通常沒有材質，添加預設材質
                        if (!child.material || child.material.type === 'MeshBasicMaterial') {
                            child.material = new THREE.MeshLambertMaterial({
                                color: 0x8B4513, // 棕色，適合兔子模型
                                transparent: false,
                                opacity: 1.0
                            });
                            console.log(`為OBJ網格添加棕色材質: ${child.name || 'unnamed'}`);
                        }
                        
                        console.log(`OBJ網格: ${child.name || 'unnamed'}, 材質: ${child.material.type}, 顏色: #${child.material.color.getHexString()}`);
                    }
                });

                console.log(`OBJ載入完成: 處理了 ${materialCount} 個網格`);
                targetScene.add(currentModel);
                hideLoadingIndicator();
            },
            function(progress) {
                const percentage = progress.total > 0 ? (progress.loaded / progress.total * 100) : 0;
                console.log('OBJ載入進度: ' + percentage.toFixed(1) + '%');
                updateLoadingProgress(progress.loaded, progress.total, '正在載入OBJ模型...');
            },
            function(error) {
                console.error('載入OBJ模型時發生錯誤:', error);
                hideLoadingIndicator();
                showErrorMessage('無法載入OBJ模型，請檢查檔案格式。');
            }
        );
    } else {
        // 使用GLTF載入器處理其他格式
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            modelPath,
            function(gltf) {
                // 移除之前的模型
                if (currentModel) {
                    targetScene.remove(currentModel);
                }

                currentModel = gltf.scene;
                
                // 調整模型大小和位置
                const box = new THREE.Box3().setFromObject(currentModel);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // 縮放模型以適應視窗
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                currentModel.scale.setScalar(scale);
                
                // 重新計算縮放後的邊界框和中心點
                const scaledBox = new THREE.Box3().setFromObject(currentModel);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                
                // 正確置中模型 - 將縮放後的中心移動到原點(0,0,0)
                currentModel.position.set(
                    -scaledCenter.x,
                    -scaledCenter.y,
                    -scaledCenter.z
                );
                
                // 啟用陰影
                currentModel.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                targetScene.add(currentModel);
                hideLoadingIndicator();
            },
            function(progress) {
                const percentage = progress.total > 0 ? (progress.loaded / progress.total * 100) : 0;
                console.log('GLTF載入進度: ' + percentage.toFixed(1) + '%');
                updateLoadingProgress(progress.loaded, progress.total, '正在載入GLTF模型...');
            },
            function(error) {
                console.error('載入模型時發生錯誤:', error);
                hideLoadingIndicator();
                showErrorMessage('無法載入3D模型，請檢查檔案格式。');
            }
        );
    }
}

// 顯示載入提示
function showLoadingIndicator() {
    console.log('顯示載入提示...');
    const indicator = document.createElement('div');
    indicator.id = 'loading-indicator';
    indicator.innerHTML = `
        <div class="spinner"></div>
        <p id="loading-text">正在載入模型...</p>
        <div class="progress-container">
            <div class="progress-bar">
                <div id="progress-fill" class="progress-fill"></div>
            </div>
            <span id="progress-text">0%</span>
        </div>
    `;
    indicator.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        padding: 25px;
        border-radius: 12px;
        text-align: center;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        min-width: 250px;
    `;
    
    // 添加CSS動畫
    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .progress-container {
            margin-top: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .progress-bar {
            flex: 1;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2980b9);
            width: 0%;
            transition: width 0.3s ease;
        }
        #progress-text {
            font-size: 12px;
            color: #666;
            min-width: 35px;
        }
        #loading-text {
            margin: 10px 0;
            color: #333;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
    
    const container = document.getElementById('model-viewer') || document.getElementById('hero-model-container');
    if (container) {
        container.appendChild(indicator);
        console.log('載入提示已添加到容器:', container.id);
    } else {
        console.error('找不到載入提示容器');
        // 備用方案：添加到body
        document.body.appendChild(indicator);
        console.log('載入提示已添加到body');
    }
}

// 更新載入進度
function updateLoadingProgress(loaded, total, status = '') {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const loadingText = document.getElementById('loading-text');
    
    if (progressFill && progressText) {
        const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
        progressFill.style.width = percentage + '%';
        progressText.textContent = percentage + '%';
        
        if (loadingText && status) {
            loadingText.textContent = status;
        }
    }
}

// 隱藏載入提示
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// 顯示錯誤訊息
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #e74c3c;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 1000;
    `;
    errorDiv.textContent = message;
    document.getElementById('model-viewer').appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// 初始化事件監聽器
function initEventListeners() {
    // 導航欄響應式選單
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // 平滑滾動導航
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // 關閉手機選單
                if (navMenu) navMenu.classList.remove('active');
            }
        });
    });

    // 檔案上傳處理
    const fileInput = document.getElementById('model-upload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // 預設模型按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modelPath = this.getAttribute('data-model');
            loadModel(modelPath, scene, camera, renderer);
        });
    });

    // 查看3D模型按鈕
    document.querySelectorAll('.view-3d-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const modelPath = this.getAttribute('data-model');
            openModelModal(modelPath);
        });
    });

    // 線框模式切換
    const wireframeToggle = document.getElementById('wireframe');
    if (wireframeToggle) {
        wireframeToggle.addEventListener('change', function() {
            toggleWireframe(this.checked);
        });
    }

    // 自動旋轉切換
    const autoRotateToggle = document.getElementById('auto-rotate');
    if (autoRotateToggle) {
        autoRotateToggle.addEventListener('change', function() {
            isAutoRotating = this.checked;
            if (controls) controls.autoRotate = this.checked;
            if (heroControls) heroControls.autoRotate = this.checked;
        });
    }

    // 聯絡表單處理
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

    // 模態框關閉
    const modal = document.getElementById('model-modal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModelModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModelModal();
            }
        });
    }
}

// 檔案上傳處理
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    const supportedFormats = ['glb', 'gltf', 'obj', 'fbx'];
    
    if (!supportedFormats.includes(fileExtension)) {
        showErrorMessage('不支援的檔案格式。請使用 GLB, GLTF, OBJ 或 FBX 格式。');
        return;
    }

    const url = URL.createObjectURL(file);
    loadModel(url, scene, camera, renderer);
}

// 切換線框模式
function toggleWireframe(enabled) {
    if (currentModel) {
        currentModel.traverse(function(child) {
            if (child.isMesh) {
                child.material.wireframe = enabled;
            }
        });
    }
}

// 開啟模型模態框
function openModelModal(modelPath) {
    console.log('🔍 開啟模型模態框:', modelPath);
    const modal = document.getElementById('model-modal');
    if (!modal) {
        console.error('找不到模態框元素 #model-modal');
        return;
    }

    modal.style.display = 'block';
    console.log('模態框已顯示');
    
    // 初始化模態框3D場景
    setTimeout(() => {
        console.log('初始化模態框3D查看器...');
        initModalViewer();
        console.log('載入模型到模態框:', modelPath);
        loadModel(modelPath, modalScene, modalCamera, modalRenderer);
    }, 100);
}

// 關閉模型模態框
function closeModelModal() {
    const modal = document.getElementById('model-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // 清理模態框渲染器
        if (modalRenderer) {
            const container = document.getElementById('modal-viewer');
            if (container && modalRenderer.domElement) {
                container.removeChild(modalRenderer.domElement);
            }
            modalRenderer.dispose();
            modalRenderer = null;
        }
    }
}

// 初始化模態框3D查看器
function initModalViewer() {
    console.log('📦 初始化模態框3D查看器...');
    const container = document.getElementById('modal-viewer');
    if (!container) {
        console.error('找不到模態框查看器容器 #modal-viewer');
        return;
    }

    console.log('模態框容器尺寸:', container.clientWidth, 'x', container.clientHeight);

    // 清理之前的內容
    container.innerHTML = '';

    // 場景設置
    modalScene = new THREE.Scene();
    modalCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    modalRenderer = new THREE.WebGLRenderer({ antialias: true });
    
    modalRenderer.setSize(container.clientWidth, container.clientHeight);
    modalRenderer.setClearColor(0xf0f0f0);
    modalRenderer.shadowMap.enabled = true;
    container.appendChild(modalRenderer.domElement);

    console.log('模態框渲染器尺寸設定:', container.clientWidth, 'x', container.clientHeight);

    // 控制器
    modalControls = new THREE.OrbitControls(modalCamera, modalRenderer.domElement);
    modalControls.enableDamping = true;
    modalControls.dampingFactor = 0.05;

    // 燈光設置
    setupLighting(modalScene);
    addGridFloor(modalScene);

    // 相機位置
    modalCamera.position.set(5, 5, 5);
    modalCamera.lookAt(0, 0, 0);

    // 渲染循環
    function animateModal() {
        if (modalRenderer) {
            requestAnimationFrame(animateModal);
            modalControls.update();
            modalRenderer.render(modalScene, modalCamera);
        }
    }
    animateModal();
}

// 處理聯絡表單
function handleContactForm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        service: formData.get('service'),
        message: formData.get('message')
    };

    // 這裡可以添加實際的表單提交邏輯
    console.log('表單資料:', data);
    
    // 顯示成功訊息
    showSuccessMessage('訊息已送出！我們將盡快與您聯絡。');
    
    // 重置表單
    event.target.reset();
}

// 顯示成功訊息
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        z-index: 2000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// 初始化滾動動畫
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 觀察需要動畫的元素
    document.querySelectorAll('.portfolio-item, .service-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s, transform 0.6s';
        observer.observe(el);
    });
}

// 創建示例3D模型（如果沒有實際模型檔案）
function createSampleModels() {
    // 這個函數可以用來創建一些基本的3D幾何體作為展示
    const group = new THREE.Group();
    
    // 創建一個彩色立方體
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({ color: 0x3498db });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    group.add(cube);
    
    return group;
}

// 處理視窗大小變化
window.addEventListener('resize', function() {
    // 首頁3D場景
    if (heroRenderer && heroCamera) {
        const heroContainer = document.getElementById('hero-model-container');
        if (heroContainer && heroContainer.clientWidth > 0) {
            heroCamera.aspect = heroContainer.clientWidth / heroContainer.clientHeight;
            heroCamera.updateProjectionMatrix();
            heroRenderer.setSize(heroContainer.clientWidth, heroContainer.clientHeight);
        }
    }
    
    // 主要3D查看器
    if (renderer && camera) {
        const viewerContainer = document.getElementById('model-viewer');
        if (viewerContainer && viewerContainer.clientWidth > 0) {
            camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
        }
    }
    
    // 模態框3D查看器
    if (modalRenderer && modalCamera) {
        const modalContainer = document.getElementById('modal-viewer');
        if (modalContainer && modalContainer.clientWidth > 0) {
            modalCamera.aspect = modalContainer.clientWidth / modalContainer.clientHeight;
            modalCamera.updateProjectionMatrix();
            modalRenderer.setSize(modalContainer.clientWidth, modalContainer.clientHeight);
        }
    }
});

// 鍵盤快捷鍵
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'Escape':
            closeModelModal();
            break;
        case 'w':
        case 'W':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                const wireframeToggle = document.getElementById('wireframe');
                if (wireframeToggle) {
                    wireframeToggle.checked = !wireframeToggle.checked;
                    toggleWireframe(wireframeToggle.checked);
                }
            }
            break;
        case 'r':
        case 'R':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                const autoRotateToggle = document.getElementById('auto-rotate');
                if (autoRotateToggle) {
                    autoRotateToggle.checked = !autoRotateToggle.checked;
                    isAutoRotating = autoRotateToggle.checked;
                    if (controls) controls.autoRotate = isAutoRotating;
                    if (heroControls) heroControls.autoRotate = isAutoRotating;
                }
            }
            break;
    }
});
